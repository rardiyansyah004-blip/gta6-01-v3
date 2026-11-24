// The four screenshot scenes behind ?shot=chase|race|city|title. Each one
// plays the real rules forward from a fresh seeded world for a fixed number
// of steps, steered by a scripted driver, so the frame is what a real game
// looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { startMission } from './missions.js';
import { addHeat, dispatch, spawnTraffic, spawnPeds } from './actors.js';
import { saveSlot } from './economy.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

const SAMPLE = STEP;

function driveToward(G, tx, ty, seconds) {
  const input = { up: true, down: false, left: false, right: false };
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    const p = G.player;
    const want = Math.atan2(ty - p.y, tx - p.x);
    let da = want - p.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    input.left = da < -0.08;
    input.right = da > 0.08;
    G.stepWorld(input, SAMPLE);
  }
}

function walkToward(G, tx, ty, seconds) {
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    const p = G.player;
    const dx = tx - p.x, dy = ty - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const input = { up: dy < -20, down: dy > 20, left: dx < -20, right: dx > 20 };
    G.stepWorld(input, SAMPLE);
    if (d < 30) break;
  }
}

/**
 * Stage the named scene on a fresh game state and return the screen to draw.
 * chase: five-star finale pursuit (wanted stars + Air One + minimap route
 * + mission objective + damage smoke, all in one frame). race: Street Kings
 * mid-race with Rico Vega's wheelman boost and live standings. city: Lena
 * on foot at a Neon Mile crossing during the taxi job, standing shown.
 * title: title screen with chapters, crew and save slots.
 */
export function stageShot(name, G) {
  G.reset();
  if (name === 'race') {
    G.player.x = 1500; G.player.y = 1500;
    G.player.onFoot = false; G.player.car = 1; G.player.angle = 0;
    G.player.money = 4200; G.player.respect = 8200;
    G.completed = [true, true, true, true, true, false, false, false, false, false, false, false];
    G.crew = ['wheelman', 'fixer']; // Rico Vega is driving the race with you
    G.standing['Neon Mile'] = 72;
    startMission(G, 5);
    driveToward(G, G.mission.marker.x, G.mission.marker.y, 5);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'city') {
    G.player.x = 1650; G.player.y = 1500;
    G.player.onFoot = true; G.player.angle = -Math.PI / 2;
    G.player.money = 3100; G.player.respect = 5200; G.player.weapon = 1;
    G.player.ammo[1] = 60;
    G.completed = [true, true, true, true, false, false, false, false, false, false, false, false];
    G.crew = ['wheelman', 'fixer', 'gunman'];
    G.standing['Neon Mile'] = 68; G.standing['Crown District'] = 61;
    startMission(G, 4);
    spawnPeds(G, 14);
    walkToward(G, 1500, 1500, 2);
    for (let i = 0; i < 120; i += 1) G.stepWorld({ up: false, down: false, left: false, right: false }, SAMPLE);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'title') {
    // Three lived-in save slots for the title screen to show.
    G.completed = [true, true, true, true, false, false, false, false, false, false, false, false];
    G.crew = ['wheelman', 'fixer']; // jobs 1-2 done, so Rico and Dex are in
    G.player.money = 12500; G.player.respect = 8200;
    saveSlot(G, 1);
    G.completed = [true, true, true, true, true, true, true, false, false, false, false, false];
    G.crew = ['wheelman', 'fixer', 'gunman'];
    G.player.money = 28400; G.player.respect = 21000;
    saveSlot(G, 2);
    G.completed = [true, true, true, true, true, true, true, true, true, false, false, false];
    G.crew = ['wheelman', 'fixer', 'gunman'];
    G.player.money = 41200; G.player.respect = 38000;
    saveSlot(G, 3);
    G.completed = [true, true, true, true, false, false, false, false, false, false, false, false];
    G.player.money = 12500; G.player.respect = 8200;
    spawnTraffic(G, 10);
    for (let i = 0; i < 300; i += 1) G.stepWorld({ up: false, down: false, left: false, right: false }, SAMPLE);
    return { screen: SCREEN_TITLE };
  }
  // Default: chase — the five-star finale. Wanted stars, Air One, the
  // minimap route line, the mission objective and damage smoke together.
  G.player.x = 1800; G.player.y = 1500;
  G.player.onFoot = false; G.player.car = 7; G.player.tunes = 3; G.player.angle = 0;
  G.player.money = 52300; G.player.respect = 42000; G.player.armor = 60;
  G.player.damage = 68; // heavy damage: smoke trails off the Stallion
  G.completed = [true, true, true, true, true, true, true, true, true, true, true, false];
  G.crew = ['wheelman', 'fixer', 'gunman'];
  G.standing['Crown District'] = 82;
  addHeat(G, 85);
  startMission(G, 11);
  dispatch(G, 'SBPD dispatch: Air One is overhead — searchlight on the suspect');
  dispatch(G, 'SBPD dispatch: roadblock set — spike strip on the avenue');
  driveToward(G, G.mission.marker.x, G.mission.marker.y, 4);
  return { screen: SCREEN_PLAY };
}
