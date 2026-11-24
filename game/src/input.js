// Keyboard and mouse, read once a frame. WASD/arrows drive and walk, E
// steals or exits a car, Space punches, click shoots, Q changes the radio,
// M mutes, G tunes at the garage, B buys at the gun shop, F quick-saves,
// C cycles the crew focus (wheelman / fixer / gunman) and reports the crew,
// P or Escape pauses, Enter confirms.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_STEAL = 4;
export const ACTION_PUNCH = 8;
export const ACTION_RADIO = 16;
export const ACTION_MUTE = 32;
export const ACTION_TUNE = 64;
export const ACTION_BUY = 128;
export const ACTION_SAVE = 256;
export const ACTION_CREW = 512;

const KEYMAP = {
  Enter: ACTION_CONFIRM, Space: ACTION_CONFIRM | ACTION_PUNCH,
  KeyP: ACTION_PAUSE, Escape: ACTION_PAUSE,
  KeyE: ACTION_STEAL, KeyQ: ACTION_RADIO, KeyM: ACTION_MUTE,
  KeyG: ACTION_TUNE, KeyB: ACTION_BUY, KeyF: ACTION_SAVE, KeyC: ACTION_CREW,
};

export function createInput(canvas) {
  const keys = new Set();
  const actions = { bits: 0 };
  const mouse = { x: 0, y: 0, clicked: false, down: false };
  const pressed = new Set();

  function down(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!pressed.has(e.code)) {
      pressed.add(e.code);
      if (KEYMAP[e.code]) actions.bits |= KEYMAP[e.code];
    }
    keys.add(e.code);
  }
  function up(e) { keys.delete(e.code); pressed.delete(e.code); }
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => { keys.clear(); pressed.clear(); });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => {
    mouse.down = true; mouse.clicked = true;
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });

  return {
    get up() { return keys.has('KeyW') || keys.has('ArrowUp'); },
    get down() { return keys.has('KeyS') || keys.has('ArrowDown'); },
    get left() { return keys.has('KeyA') || keys.has('ArrowLeft'); },
    get right() { return keys.has('KeyD') || keys.has('ArrowRight'); },
    mouse,
    takeActions() { const b = actions.bits; actions.bits = 0; return b; },
    takeClick() { const c = mouse.clicked; mouse.clicked = false; return c; },
  };
}

// World position of the mouse for a camera centred on (cx, cy) with the
// given view size and scale.
export function mouseWorld(input, cam, viewW, viewH, scale) {
  return {
    x: cam.x + (input.mouse.x - viewW / 2) / scale,
    y: cam.y + (input.mouse.y - viewH / 2) / scale,
  };
}
