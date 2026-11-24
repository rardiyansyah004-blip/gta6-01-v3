// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. Screens: title,
// play, paused, busted — plus jobs / gun shop / garage overlays. The game
// moves between them with the keys listed on the title screen.
//
// ?seed=N fixes the city. ?shot=chase|race|city|title (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. window.__game mirrors live state for
// play-testing; window.__debug offers the test hooks the playtest uses.
import { STEP, SAVE_KEY } from './config.js';
import { createRng } from './rng.js';
import { buildCity } from './city.js';
import {
  createPlayer, spawnTraffic, spawnPeds, updatePlayer, updateTraffic,
  updatePeds, updatePolice, trySteal, shoot, punch, dispatch, hurtPlayer,
} from './actors.js';
import { startMission, updateMission, nextMissionIndex, missionCount } from './missions.js';
import { buyWeapon, buyAmmo, buyArmor, buyTune, healAtSafehouse, saveSlot, loadSlot, applySave } from './economy.js';
import { createAudio } from './audio.js';
import { createInput, mouseWorld, ACTION_CONFIRM, ACTION_PAUSE, ACTION_STEAL, ACTION_PUNCH, ACTION_RADIO, ACTION_MUTE, ACTION_TUNE, ACTION_BUY, ACTION_SAVE } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BUSTED } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

function createGame(seedValue) {
  const rng = createRng(seedValue);
  const city = buildCity(rng);
  const G = {
    rng, city, seed: seedValue, time: 0, clock: 17,
    player: createPlayer(city),
    traffic: [], peds: [], cops: [], footCops: [], roadblocks: [],
    hostiles: [], rivals: [], vip: null, heli: null, effects: [],
    dispatch: [], mission: null, completed: Array(12).fill(false),
    banner: null, overlay: null, screen: SCREEN_TITLE,
    lastDistrict: '', districtFlash: 0, healCd: 0, lastBlock: 0,
    audio,
    stepWorld(input, dt) {
      updatePlayer(G, input, dt);
      updateTraffic(G, dt);
      updatePeds(G, dt);
      updatePolice(G, dt);
      updateMission(G, dt);
      for (const e of [...G.effects]) { e.t -= dt; if (e.t <= 0) G.effects.splice(G.effects.indexOf(e), 1); }
      if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
      if (G.districtFlash > 0) G.districtFlash -= dt;
      if (G.healCd > 0) G.healCd -= dt;
    },
    onMissionDone() { saveSlot(G, 1); },
  };
  G.reset = function () {
    const fresh = createGame(G.seed);
    for (const k of Object.keys(fresh)) if (k !== 'reset' && k !== 'stepWorld' && k !== 'onMissionDone') G[k] = fresh[k];
  };
  spawnTraffic(G, 26);
  spawnPeds(G, 40);
  dispatch(G, 'Welcome to Solara Bay — Lena Cruz is back in town');
  dispatch(G, 'SBPD dispatch: all units, quiet night so far');
  return G;
}

const G = createGame(seed);
const renderer = createRenderer(canvas);
const input = createInput(canvas);

window.__errors = [];
window.addEventListener('error', (e) => { window.__errors.push(String(e.message || e.error)); });

function readDebug() {
  const p = G.player;
  return {
    screen: G.screen, overlay: G.overlay, mission: G.mission ? G.mission.idx : -1,
    missionName: G.mission ? G.mission.name : null, missionText: G.mission ? G.mission.text : null,
    marker: G.mission && G.mission.marker ? { x: Math.round(G.mission.marker.x), y: Math.round(G.mission.marker.y) } : null,
    wanted: p.wanted, money: p.money, health: p.health, armor: p.armor,
    weapon: p.weapon, ammo: p.ammo.slice(), x: Math.round(p.x), y: Math.round(p.y),
    onFoot: p.onFoot, car: p.car, speed: Math.round(p.speed),
    cops: G.cops.length, footCops: G.footCops.length, peds: G.peds.length,
    traffic: G.traffic.length, hostiles: G.hostiles.length, heli: !!G.heli,
    roadblocks: G.roadblocks.length, completed: G.completed.filter(Boolean).length,
    time: Math.round(G.time), clock: Math.round(G.clock * 10) / 10, respect: p.respect,
    dispatch: G.dispatch.slice(0, 2).map((d) => d.text),
  };
}

window.__game = readDebug();
window.__debug = {
  startMission: (i) => { startMission(G, i); return G.mission.name; },
  setWanted: (n) => { G.player.heat = [0, 10, 25, 45, 65, 85][n] || 0; G.player.lastCrime = G.time; return G.player.wanted; },
  giveMoney: (n) => { G.player.money += n; return G.player.money; },
  teleport: (x, y) => { G.player.x = x; G.player.y = y; return true; },
  nearestCar: () => {
    let best = null; let bd = 1e9;
    for (const c of G.traffic) { const d = Math.hypot(c.x - G.player.x, c.y - G.player.y); if (d < bd) { bd = d; best = c; } }
    return best ? { d: Math.round(bd), x: Math.round(best.x), y: Math.round(best.y) } : null;
  },
  hostiles: () => G.hostiles.map((h) => ({ x: Math.round(h.x), y: Math.round(h.y), hp: h.hp, d: Math.round(Math.hypot(h.x - G.player.x, h.y - G.player.y)) })),
  hurt: (n) => { G.player.hurtCd = 0; hurtPlayer(G, n); return G.player.health; },
  state: () => readDebug(),
};

function runShot(name) {
  const scene = stageShot(name, G);
  window.__game = readDebug();
  let painted = 0;
  function paint() {
    renderer.draw(G, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function nearSpot(spot, r) {
  return Math.hypot(G.player.x - spot.x, G.player.y - spot.y) < r;
}

function runGame() {
  const inputLocal = input;
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }

  function startNewGame() {
    const fresh = createGame(seed);
    for (const k of Object.keys(fresh)) if (k !== 'reset' && k !== 'stepWorld' && k !== 'onMissionDone') G[k] = fresh[k];
    screen = SCREEN_PLAY;
    G.screen = SCREEN_PLAY;
    announce('Playing. Twelve jobs wait in Solara Bay.');
  }

  function loadGame(slot) {
    const s = loadSlot(G, slot);
    if (!s) return false;
    startNewGame();
    applySave(G, s);
    announce(`Loaded slot ${slot}.`);
    return true;
  }

  function endBusted() {
    screen = SCREEN_BUSTED;
    G.screen = SCREEN_BUSTED;
    announce('Busted. The SBPD took Lena in.');
  }

  function handleTitleKeys(e) {
    if (e.code === 'Enter') startNewGame();
    else if (e.code === 'Digit1') { if (!loadGame(1)) startNewGame(); }
    else if (e.code === 'Digit2') { if (!loadGame(2)) startNewGame(); }
    else if (e.code === 'Digit3') { if (!loadGame(3)) startNewGame(); }
  }

  window.addEventListener('keydown', (e) => {
    if (screen === SCREEN_TITLE) handleTitleKeys(e);
    else if (screen === SCREEN_BUSTED && e.code === 'Enter') {
      G.player.health = 100; G.player.heat = 0; G.player.wanted = 0;
      G.player.x = G.city.spots.safehouse.x; G.player.y = G.city.spots.safehouse.y;
      G.player.onFoot = true; G.player.car = -1; G.mission = null;
      screen = SCREEN_PLAY; G.screen = SCREEN_PLAY;
    }
  });

  function handleActions() {
    const actions = inputLocal.takeActions();
    if (screen === SCREEN_PLAY && G.overlay) {
      if (actions & ACTION_PAUSE) { G.overlay = null; return; }
      if (G.overlay === 'jobs') {
        if (actions & ACTION_CONFIRM) G.overlay = null;
        return;
      }
      if (G.overlay === 'shop' || G.overlay === 'garage') {
        if (actions & (ACTION_BUY | ACTION_PAUSE)) G.overlay = null;
        return;
      }
      return;
    }
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startNewGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; G.screen = SCREEN_PAUSED; announce('Paused.'); }
    else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; G.screen = SCREEN_PLAY; announce('Playing.'); }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_STEAL) {
      const r = trySteal(G);
      if (r === 'stolen') audio.pickup();
      else if (r === 'out') audio.blip(300, 0.08, 'sine', 0.1);
    }
    if (actions & ACTION_PUNCH) { if (punch(G) > 0) audio.blip(140, 0.1, 'square', 0.14); }
    if (actions & ACTION_RADIO) { audio.ensure(); audio.nextStation(); announce('Radio: ' + audio.stationInfo().name); }
    if (actions & ACTION_MUTE) { audio.ensure(); audio.toggleMute(); }
    if (actions & ACTION_SAVE) { if (saveSlot(G, 1)) { announce('Quick-saved to slot 1.'); dispatch(G, 'Progress quick-saved to slot 1'); } }
    if (actions & ACTION_TUNE && nearSpot(G.city.spots.garage, 110)) G.overlay = 'garage';
    if (actions & ACTION_BUY && nearSpot(G.city.spots.gunshop, 110)) G.overlay = 'shop';
  }

  function handleOverlayKeys(e) {
    if (screen !== SCREEN_PLAY || !G.overlay) return;
    if (G.overlay === 'jobs') {
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= missionCount()) {
        startMission(G, n - 1);
        G.overlay = null;
        audio.ensure(); audio.pickup();
      }
      // J toggles the menu (its own listener below); Esc/P closes it via
      // handleActions — never close here, or the same keypress pauses the game.
    } else if (G.overlay === 'shop') {
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= 3) announce(buyWeapon(G, n - 1));
      else if (e.code === 'KeyA') announce(buyAmmo(G));
      else if (e.code === 'KeyV') announce(buyArmor(G));
      // B / Esc close the shop — handled by handleActions (ACTION_BUY /
      // ACTION_PAUSE). Closing here too would reopen it next frame.
    } else if (G.overlay === 'garage') {
      if (e.code === 'KeyG') announce(buyTune(G));
      // Esc closes — handled by handleActions.
    }
  }
  window.addEventListener('keydown', handleOverlayKeys);
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyJ' && screen === SCREEN_PLAY && !G.overlay) G.overlay = 'jobs';
    else if (e.code === 'KeyJ' && screen === SCREEN_PLAY && G.overlay === 'jobs') G.overlay = null;
  });

  function step() {
    if (screen === SCREEN_TITLE) {
      G.stepWorld({ up: false, down: false, left: false, right: false }, STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    audio.ensure();
    audio.tick(G, STEP);
    // Mouse aim: click shoots on foot.
    if (inputLocal.takeClick() && G.player.onFoot && !G.overlay) {
      const w = mouseWorld(inputLocal, G.cam || { x: G.player.x, y: G.player.y }, canvas.width, canvas.height, 0.9);
      if (shoot(G, w.x, w.y) >= 0) audio.shot();
    }
    G.stepWorld(inputLocal, STEP);
    // Safehouse heals and cools heat — but it cannot revive the dead.
    if (G.player.health > 0 && nearSpot(G.city.spots.safehouse, 90) && G.healCd <= 0 && (G.player.health < 100 || G.player.heat > 0)) {
      healAtSafehouse(G);
      G.healCd = 5;
    }
    if (G.player.health <= 0 && screen === SCREEN_PLAY) endBusted();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP) {
      step();
      accumulator -= STEP;
    }
    renderer.draw(G, screen);
    window.__game = readDebug();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; G.screen = SCREEN_PAUSED; }
  });

  announce('Solara Bay. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
