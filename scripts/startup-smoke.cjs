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

const progression = vm.runInContext(`
  (() => {
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
    cameraY = platforms.find(platform => platform.floor === 12).y - H * 0.52;
    PL.y = cameraY + H + 105;
    PL.vy = 8;
    state = 'playing';
    update();
    draw();

    return {
      checkpoints,
      expectedCheckpointY,
      playerY: PL.y,
      playerScreenY: PL.y - cameraY,
      highestFloorReached,
    };
  })()
`, sandbox);

if (!progression.checkpoints.includes(10)) throw new Error('Floor 10 checkpoint was not generated');
if (progression.playerY !== progression.expectedCheckpointY) throw new Error('Player did not respawn after falling below the route');
if (progression.playerScreenY < -20 || progression.playerScreenY > 600) throw new Error('Respawn left the player off-screen');
if (progression.highestFloorReached !== 163) throw new Error('Full tower progression did not render');

console.log('Startup smoke test passed: Start opens, all 163 floors render, and falls respawn on-screen.');
