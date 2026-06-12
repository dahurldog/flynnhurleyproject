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

console.log('Startup smoke test passed: Start opens the 163-floor game and animation frames continue.');
