const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = 9333;
const profile = path.join(os.tmpdir(), `flynn-floor12-debug-${process.pid}`);
const pageUrl = new URL('../index.html', `file://${__filename.replaceAll('\\', '/')}`).href;

fs.mkdirSync(profile, { recursive: true });
const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  pageUrl,
], { stdio: 'ignore' });

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connect() {
  let pages;
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      pages = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json());
      if (pages.length) break;
    } catch {}
    await wait(100);
  }
  if (!pages?.length) throw new Error('Chrome debugging endpoint did not start');

  const page = pages.find(candidate => candidate.url.includes('index.html')) || pages[0];
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args.map(arg => arg.value || arg.description || '').join(' ');
      if (message.params.type === 'error' || text.includes('Game loop recovered')) errors.push(text);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  });
  const command = (method, params = {}) => new Promise(resolve => {
    const commandId = ++id;
    pending.set(commandId, resolve);
    socket.send(JSON.stringify({ id: commandId, method, params }));
  });

  await command('Runtime.enable');
  await command('Page.enable');
  await wait(500);
  const setup = await command('Runtime.evaluate', {
    expression: `
      document.getElementById('startBtn').click();
      window.__debugFailures = [];
      for (let run = 0; run < 3; run++) {
        restartGame();
        for (let floor = 1; floor <= TOTAL_FLOORS; floor++) {
          const debugPlatform = platforms.find(platform => platform.floor === floor);
          PL.x = debugPlatform.x + debugPlatform.w / 2 - PL.w / 2;
          PL.y = debugPlatform.y - PL.h;
          PL.vx = 0;
          PL.vy = 0;
          state = 'playing';
          reachFloor(floor);
          cameraX = Math.max(0, Math.min(WORLD_W - W, PL.x - W * 0.38));
          cameraY = Math.max(GOAL_Y - H * 0.35, Math.min(GROUND_Y - H * 0.72, PL.y - H * 0.52));
          try {
            update();
            draw();
            if (state === 'math') closeMath();
            if (state === 'shop') {
              document.getElementById('shopOverlay').classList.remove('active');
              state = 'playing';
            }
          } catch (error) {
            window.__debugFailures.push({ run, floor, message: error.stack || error.message });
          }
        }
      }
      const crumblePlatform = platforms.find(platform => platform.type === 'collapse');
      state = 'playing';
      PL.x = 80;
      PL.y = GROUND_Y - PL.h;
      PL.vx = 0;
      PL.vy = 0;
      PL.onGround = true;
      beginPlatformCrumble(crumblePlatform);
      for (let frame = 0; frame < 100; frame++) {
        try {
          update();
          draw();
        } catch (error) {
          window.__debugFailures.push({ run: 'crumble', floor: crumblePlatform.floor, message: error.stack || error.message });
        }
      }
      window.__debugFailures;
    `,
    awaitPromise: true,
    returnByValue: true,
  });
  if (setup.exceptionDetails) console.log(JSON.stringify(setup.exceptionDetails));
  await wait(1500);
  const status = await command('Runtime.evaluate', {
    expression: `JSON.stringify({state, floor: highestFloorReached, zone: currentZoneId, loopErrorCount, playerX: PL.x, playerY: PL.y, failures: window.__debugFailures})`,
    returnByValue: true,
  });
  console.log(status.result?.result?.value || JSON.stringify(status));
  errors.forEach(error => console.log(error));
  socket.close();
}

connect()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => chrome.kill());
