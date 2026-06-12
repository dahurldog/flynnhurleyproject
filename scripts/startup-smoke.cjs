const fs = require('node:fs');
const vm = require('node:vm');

function element(id = '') {
  return {
    id,
    style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    appendChild() {},
    remove() {},
    focus() {},
    click() { this.onclick?.(); },
    setAttribute() {},
    textContent: '',
    innerHTML: '',
    value: '',
  };
}

const gradient = { addColorStop() {} };
const ctx = new Proxy({}, {
  get(target, prop) {
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
    if (prop === 'measureText') return text => ({ width: String(text).length * 7 });
    if (!(prop in target)) target[prop] = () => {};
    return target[prop];
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
});

const elements = new Map();
const getElement = id => {
  if (!elements.has(id)) elements.set(id, element(id));
  return elements.get(id);
};
const canvas = getElement('gameCanvas');
canvas.width = 480;
canvas.height = 600;
canvas.getContext = () => ctx;
getElement('bgMusic').play = () => Promise.resolve();

const frames = [];
const document = {
  body: element('body'),
  createElement: tag => element(tag),
  getElementById: getElement,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {},
};
const window = {
  addEventListener() {},
  innerWidth: 1024,
  innerHeight: 768,
};
const storage = new Map();
const localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
};

const sandbox = {
  console,
  document,
  window,
  localStorage,
  requestAnimationFrame: callback => {
    frames.push(callback);
    return frames.length;
  },
  cancelAnimationFrame() {},
  setTimeout,
  clearTimeout,
  Date,
  Math,
  Audio: function Audio() { return { play: () => Promise.resolve() }; },
};

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync('game.js', 'utf8'), sandbox, { filename: 'game.js' });

const start = getElement('startBtn');
if (typeof start.onclick !== 'function') throw new Error('Start button handler was not registered');
start.click();

for (let i = 0; i < 8; i++) {
  const frame = frames.shift();
  if (frame) frame();
}

if (getElement('titleScreen').style.display !== 'none') throw new Error('Title screen stayed visible');
if (canvas.style.display !== 'block') throw new Error('Game canvas did not open');
if (!getElement('progressLabel').textContent.includes('/163')) throw new Error('163-floor game did not initialize');

const originalFillRect = ctx.fillRect;
let injectedRenderError = true;
ctx.fillRect = (...args) => {
  if (injectedRenderError) {
    injectedRenderError = false;
    throw new Error('Injected one-frame render failure');
  }
  return originalFillRect(...args);
};
const recoveryFrame = frames.shift();
if (recoveryFrame) recoveryFrame();
ctx.fillRect = originalFillRect;
const postRecoveryFrame = frames.shift();
if (postRecoveryFrame) postRecoveryFrame();
if (vm.runInContext('loopErrorCount', sandbox) !== 1) throw new Error('Game loop watchdog did not record the render failure');
if (!frames.length) throw new Error('Game loop stopped after a one-frame render failure');

const progression = vm.runInContext(`
  (() => {
    const earlyHazards = hazards.filter(hazard => hazard.platform.floor <= 15).length;
    const earlyEnemies = enemies.filter(enemy => {
      const platform = platforms.find(item => item.x === enemy.platX && item.y === enemy.platY);
      return platform && platform.floor <= 15;
    }).length;
    const earlyMovers = platforms.filter(platform => platform.floor <= 15 && platform.moving).length;
    enemies.forEach(enemy => { enemy.dead = true; });
    mathTriggers.forEach(trigger => { trigger.triggered = true; });
    for (let floor = 1; floor <= TOTAL_FLOORS; floor++) {
      const platform = platforms.find(item => item.floor === floor);
      if (!platform) throw new Error('Missing route platform for floor ' + floor);
      PL.x = platform.x + platform.w / 2 - PL.w / 2;
      PL.y = platform.y - PL.h;
      PL.vx = 0;
      PL.vy = 0;
      reachFloor(floor);
      cameraX = Math.max(0, Math.min(WORLD_W - W, PL.x - W * 0.38));
      cameraY = Math.max(GOAL_Y - H * 0.35, Math.min(GROUND_Y - H * 0.72, PL.y - H * 0.52));
      draw();
    }

    const checkpoints = platforms.filter(platform => platform.type === 'checkpoint').map(platform => platform.floor);
    const floorTen = platforms.find(platform => platform.floor === 10);
    PL.checkpointX = floorTen.x + floorTen.w / 2 - PL.w / 2;
    PL.checkpointY = floorTen.y - PL.h;
    const expectedCheckpointY = PL.checkpointY;
    PL.hp = PL.maxHp;
    const beforeFallHp = PL.hp;
    const beforeFallScore = score;
    cameraY = platforms.find(platform => platform.floor === 12).y - H * 0.52;
    PL.y = cameraY + H + 105;
    PL.vy = 8;
    state = 'playing';
    update();
    draw();

    return {
      checkpoints,
      earlyHazards,
      earlyEnemies,
      earlyMovers,
      expectedCheckpointY,
      playerY: PL.y,
      playerScreenY: PL.y - cameraY,
      fallHealthLost: beforeFallHp - PL.hp,
      fallScoreLost: beforeFallScore - score,
      highestFloorReached,
    };
  })()
`, sandbox);

if (!progression.checkpoints.includes(10)) throw new Error('Floor 10 checkpoint was not generated');
if (progression.earlyHazards || progression.earlyEnemies || progression.earlyMovers) throw new Error('Early teaching floors contain blocking hazards');
if (progression.playerY !== progression.expectedCheckpointY) throw new Error('Player did not respawn after falling below the route');
if (progression.playerScreenY < -20 || progression.playerScreenY > 600) throw new Error('Respawn left the player off-screen');
if (progression.fallHealthLost !== 0.5 || progression.fallScoreLost !== 50) throw new Error('Fall penalty was not half a heart and 50 points');
if (progression.highestFloorReached !== 163) throw new Error('Full tower progression did not render');

const seesawTest = vm.runInContext(`
  (() => {
    const platformIndex = platforms.findIndex(platform => platform.type === 'seesaw');
    const platform = platforms[platformIndex];
    if (!platform) throw new Error('No seesaw platform was generated');
    state = 'playing';
    PL.x = platform.x + platform.w * 0.22;
    PL.y = platform.y - PL.h;
    PL.vx = 0;
    PL.vy = 0;
    PL.onGround = true;
    PL.seesawPlatIdx = platformIndex;
    platform.tilt = -0.18;
    platform.tiltV = 0;
    cameraX = Math.max(0, Math.min(WORLD_W - W, PL.x - W * 0.38));
    cameraY = Math.max(GOAL_Y - H * 0.35, Math.min(GROUND_Y - H * 0.72, PL.y - H * 0.52));
    let contactLosses = 0;
    let maxTilt = 0;
    let maxSpeed = 0;
    let landSounds = 0;
    const originalLand = SFX.land;
    SFX.land = () => { landSounds++; };
    for (let frame = 0; frame < 180; frame++) {
      update();
      draw();
      if (!PL.onGround) contactLosses++;
      maxTilt = Math.max(maxTilt, Math.abs(platform.tilt));
      maxSpeed = Math.max(maxSpeed, Math.abs(PL.vx));
    }
    SFX.land = originalLand;
    return { contactLosses, maxTilt, maxSpeed, landSounds };
  })()
`, sandbox);

if (seesawTest.contactLosses > 1) throw new Error('Seesaw repeatedly lost player contact');
if (seesawTest.maxTilt > 0.221 || seesawTest.maxSpeed > 2.51) throw new Error('Seesaw movement exceeded safe limits');
if (seesawTest.landSounds > 1) throw new Error('Seesaw repeatedly triggered landing sounds');

const spikeTest = vm.runInContext(`
  (() => {
    const spike = hazards[0];
    if (!spike) throw new Error('No spike hazard was generated');
    const platform = spike.platform;
    const fullHp = PL.maxHp;

    state = 'playing';
    PL.hp = fullHp;
    PL.invincible = 0;
    PL.x = spike.x;
    PL.y = spike.y;
    PL.vx = 0;
    PL.vy = -4;
    PL.onGround = false;
    spike.animTimer = 0;
    spike.extended = false;
    spike.hitThisPhase = false;
    update();
    const jumpThroughHp = PL.hp;

    PL.hp = fullHp;
    PL.invincible = 0;
    PL.x = spike.x;
    PL.y = platform.y - PL.h;
    PL.vx = 0;
    PL.vy = 0;
    PL.onGround = true;
    spike.animTimer = 0;
    spike.extended = false;
    spike.hitThisPhase = false;
    cameraX = Math.max(0, Math.min(WORLD_W - W, PL.x - W * 0.38));
    cameraY = Math.max(GOAL_Y - H * 0.35, Math.min(GROUND_Y - H * 0.72, PL.y - H * 0.52));

    for (let frame = 0; frame < SPIKE_PHASE_FRAMES - 1; frame++) update();
    const safePhase = { hp: PL.hp, extended: spike.extended, timer: spike.animTimer };
    update();
    const raisedPhase = { hp: PL.hp, extended: spike.extended, timer: spike.animTimer };

    return { fullHp, jumpThroughHp, safePhase, raisedPhase };
  })()
`, sandbox);

if (spikeTest.jumpThroughHp !== spikeTest.fullHp) throw new Error('Retracted spike damaged player jumping through it');
if (spikeTest.safePhase.hp !== spikeTest.fullHp || spikeTest.safePhase.extended) throw new Error('Spike was dangerous before two safe seconds elapsed');
if (!spikeTest.raisedPhase.extended || spikeTest.raisedPhase.hp !== spikeTest.fullHp - 1) throw new Error('Spike did not become dangerous after two seconds');

console.log('Regression test passed: all floors render, falls are penalized, seesaws stay smooth, and spikes cycle safely.');
