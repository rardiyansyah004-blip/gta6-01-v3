// Twelve story jobs for Lena Cruz, each a different kind of work: steals,
// timed courier runs, a getaway, takedowns, taxi fares, a street race, a
// three-wave defence, repos, an escort, a night shift under heat, a bank job
// and a five-star finale. One mission runs at a time; finishing it pays cash
// and respect, and the next job unlocks.
import { WORLD, CARS } from './config.js';
import { randomRoadPoint } from './city.js';
import { addHeat, dispatch, hurtPlayer } from './actors.js';

function marker(G, x, y, r = 46) { G.mission.marker = { x, y, r }; }
function farPoint(G, minDist = 700) {
  for (let i = 0; i < 20; i += 1) {
    const p = randomRoadPoint(G.city, G.rng);
    if (Math.hypot(p.x - G.player.x, p.y - G.player.y) > minDist) return p;
  }
  return randomRoadPoint(G.city, G.rng);
}
function spawnHostiles(G, n, near) {
  for (let i = 0; i < n; i += 1) {
    const a = G.rng.range(0, Math.PI * 2);
    // Each hostile is anchored to its post: it engages near the post and
    // walks back to it when the player leaves, so the fight stays where the
    // mission says it is instead of wandering across the city.
    G.hostiles.push({ x: near.x + Math.cos(a) * G.rng.range(120, 220), y: near.y + Math.sin(a) * G.rng.range(120, 220), ax: near.x, ay: near.y, hp: 2, shootCd: G.rng.range(0.5, 1.9) });
  }
}
function updateHostiles(G, dt) {
  const p = G.player;
  for (const h of [...G.hostiles]) {
    const dx = p.x - h.x, dy = p.y - h.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > 320) { // too far from the player: walk back to the post
      const adx = h.ax - h.x, ady = h.ay - h.y;
      const ad = Math.hypot(adx, ady) || 1;
      if (ad > 30) { h.x += (adx / ad) * 110 * dt; h.y += (ady / ad) * 110 * dt; }
    } else if (d > 260) { h.x += (dx / d) * 120 * dt; h.y += (dy / d) * 120 * dt; }
    else if (d < 120) { h.x -= (dx / d) * 60 * dt; h.y -= (dy / d) * 60 * dt; }
    h.shootCd -= dt;
    if (h.shootCd <= 0 && d < 320) {
      h.shootCd = 1.9;
      G.effects.push({ type: 'muzzle', x: h.x, y: h.y, t: 0.08, angle: Math.atan2(dy, dx) });
      if (G.rng.chance(0.4)) hurtPlayer(G, 5);
    }
  }
}

const MISSIONS = [
  {
    name: 'First Wheels', brief: 'Steal a car, then bring it to the garage in Marina Yards.', payout: 400,
    start(G) { G.mission.step = 0; G.mission.text = 'Steal a car — walk up to traffic and press E'; },
    tick(G) {
      if (G.mission.step === 0 && !G.player.onFoot) { G.mission.step = 1; marker(G, G.city.spots.garage.x, G.city.spots.garage.y); G.mission.text = 'Drive it to the garage'; }
      if (G.mission.step === 1 && Math.hypot(G.player.x - G.city.spots.garage.x, G.player.y - G.city.spots.garage.y) < 70) return 'done';
      return null;
    },
  },
  {
    name: 'Courier Run', brief: 'Three drops, one clock. 150 seconds — the crew does not wait.', payout: 900,
    start(G) { G.mission.step = 0; G.mission.timer = 150; G.mission.drops = [farPoint(G), farPoint(G), farPoint(G)]; marker(G, G.mission.drops[0].x, G.mission.drops[0].y); G.mission.text = 'Drop 1 of 3'; },
    tick(G, dt) {
      G.mission.timer -= dt;
      if (G.mission.timer <= 0) return 'fail';
      const d = G.mission.drops[G.mission.step];
      if (Math.hypot(G.player.x - d.x, G.player.y - d.y) < 60) {
        G.mission.step += 1;
        G.player.money += 150;
        dispatch(G, 'Courier: drop confirmed — $150 on the spot');
        if (G.mission.step >= 3) return 'done';
        marker(G, G.mission.drops[G.mission.step].x, G.mission.drops[G.mission.step].y);
        G.mission.text = `Drop ${G.mission.step + 1} of 3`;
      }
      return null;
    },
  },
  {
    name: 'Getaway', brief: 'The SBPD is on you. Lose them — reach the safehouse in one piece.', payout: 800,
    start(G) { addHeat(G, 30); G.mission.step = 0; marker(G, G.city.spots.safehouse.x, G.city.spots.safehouse.y); G.mission.text = 'Reach the safehouse — 2 stars on you'; },
    tick(G) {
      if (Math.hypot(G.player.x - G.city.spots.safehouse.x, G.player.y - G.city.spots.safehouse.y) < 70) return 'done';
      return null;
    },
  },
  {
    name: 'Dockside Takedown', brief: 'Four of the Harbormen crew are waiting at the docks. Clear them out.', payout: 1400,
    start(G) { const d = { x: 3000, y: 2400 }; spawnHostiles(G, 4, d); marker(G, d.x, d.y, 90); G.mission.text = 'Take down 4 hostiles at the docks'; },
    tick(G, dt) {
      updateHostiles(G, dt);
      if (G.hostiles.length === 0) return 'done';
      return null;
    },
  },
  {
    name: 'Taxi Hustle', brief: 'Three fares, three destinations. The meter is running — drive smooth.', payout: 1100,
    start(G) { G.mission.step = 0; G.mission.fares = 0; G.mission.pickup = farPoint(G, 300); marker(G, G.mission.pickup.x, G.mission.pickup.y); G.mission.text = 'Pick up fare 1 of 3'; },
    tick(G) {
      const m = G.mission;
      if (m.step === 0) {
        if (Math.hypot(G.player.x - m.pickup.x, G.player.y - m.pickup.y) < 60) {
          m.step = 1; m.dest = farPoint(G, 500);
          marker(G, m.dest.x, m.dest.y); m.text = 'Drive the fare to the destination';
          dispatch(G, 'Taxi: fare aboard — mind the traffic');
        }
      } else if (Math.hypot(G.player.x - m.dest.x, G.player.y - m.dest.y) < 60) {
        m.fares += 1; G.player.fares += 1;
        const pay = 180 + Math.floor(G.rng.range(0, 120));
        G.player.money += pay;
        dispatch(G, `Taxi: fare paid $${pay}`);
        if (m.fares >= 3) return 'done';
        m.step = 0; m.pickup = farPoint(G, 300);
        marker(G, m.pickup.x, m.pickup.y); m.text = `Pick up fare ${m.fares + 1} of 3`;
      }
      return null;
    },
  },
  {
    name: 'Street Kings', brief: 'Four checkpoints, three rivals, one crown. Beat them to the last ring.', payout: 1800,
    start(G) {
      G.mission.step = 0; G.mission.timer = 150;
      G.mission.rings = [farPoint(G, 600), farPoint(G, 600), farPoint(G, 600), farPoint(G, 600)];
      marker(G, G.mission.rings[0].x, G.mission.rings[0].y);
      G.rivals = G.mission.rings.map((r, i) => ({ x: G.player.x + (i - 1) * 60, y: G.player.y + 60, angle: 0, speed: 0, ring: 0, model: G.rng.int(1, 3), done: false }));
      G.mission.text = 'Race — checkpoint 1 of 4';
    },
    tick(G, dt) {
      const m = G.mission;
      m.timer -= dt;
      if (m.timer <= 0) return 'fail';
      // Rivals chase the rings at a fixed pace.
      for (const r of G.rivals) {
        if (r.done) continue;
        const t = m.rings[r.ring];
        const dx = t.x - r.x, dy = t.y - r.y;
        const d = Math.hypot(dx, dy) || 1;
        r.angle = Math.atan2(dy, dx);
        r.x += (dx / d) * 265 * dt; r.y += (dy / d) * 265 * dt;
        if (d < 50) { r.ring += 1; if (r.ring >= 4) { r.done = true; dispatch(G, 'Street Kings: a rival finished the course'); } }
      }
      const ring = m.rings[m.step];
      if (Math.hypot(G.player.x - ring.x, G.player.y - ring.y) < 60) {
        m.step += 1;
        if (m.step >= 4) return 'done';
        marker(G, m.rings[m.step].x, m.rings[m.step].y);
        m.text = `Race — checkpoint ${m.step + 1} of 4`;
      }
      return null;
    },
  },
  {
    name: 'Harbor Heat', brief: 'Hold the container yard through three waves. They keep coming.', payout: 2200,
    start(G) { G.mission.wave = 0; G.mission.step = 0; const d = { x: 3000, y: 2400 }; spawnHostiles(G, 3, d); marker(G, d.x, d.y, 110); G.mission.text = 'Wave 1 of 3 — hold the yard'; },
    tick(G, dt) {
      updateHostiles(G, dt);
      const m = G.mission;
      if (G.hostiles.length === 0) {
        m.wave += 1;
        if (m.wave >= 3) return 'done';
        spawnHostiles(G, 4, { x: 3000, y: 2400 });
        m.text = `Wave ${m.wave + 1} of 3 — hold the yard`;
        dispatch(G, `Harbor Heat: wave ${m.wave + 1} incoming`);
      }
      return null;
    },
  },
  {
    name: 'Repo Run', brief: 'Two marked rides need collecting. Take them without wrecking them.', payout: 1600,
    start(G) {
      G.mission.step = 0; G.mission.got = 0;
      G.mission.marks = [];
      for (let i = 0; i < 2; i += 1) {
        const p = farPoint(G, 500);
        const car = { x: p.x, y: p.y, angle: 0, speed: 0, model: G.rng.int(0, 4), color: '#ff5da2', vertical: false, dir: 1, lane: 0, stopped: true, marked: true };
        G.traffic.push(car);
        G.mission.marks.push(car);
      }
      marker(G, G.mission.marks[0].x, G.mission.marks[0].y);
      G.mission.text = 'Steal the pink-marked ride 1 of 2';
    },
    tick(G) {
      const m = G.mission;
      if (m.step === 0) {
        const target = m.marks[m.got];
        if (!G.traffic.includes(target) && !G.player.onFoot && G.player.car === target.model) {
          m.step = 1; marker(G, G.city.spots.garage.x, G.city.spots.garage.y); m.text = 'Deliver it to the garage';
        } else if (!G.traffic.includes(target)) { m.step = 1; marker(G, G.city.spots.garage.x, G.city.spots.garage.y); m.text = 'Deliver it to the garage'; }
        marker(G, target.x, target.y);
      } else if (Math.hypot(G.player.x - G.city.spots.garage.x, G.player.y - G.city.spots.garage.y) < 70 && !G.player.onFoot) {
        m.got += 1;
        G.player.money += 300;
        if (m.got >= 2) return 'done';
        m.step = 0;
        marker(G, m.marks[m.got].x, m.marks[m.got].y);
        m.text = 'Steal the pink-marked ride 2 of 2';
      }
      return null;
    },
  },
  {
    name: 'Getaway Driver', brief: 'Escort the VIP sedan through three checkpoints. If it falls behind, the job fails.', payout: 2000,
    start(G) {
      G.mission.step = 0; G.mission.timer = 200;
      G.mission.points = [farPoint(G, 600), farPoint(G, 600), farPoint(G, 600)];
      G.vip = { x: G.player.x - 80, y: G.player.y + 40, angle: 0, speed: 0, model: 7 };
      marker(G, G.mission.points[0].x, G.mission.points[0].y);
      G.mission.text = 'Escort the VIP — checkpoint 1 of 3';
    },
    tick(G, dt) {
      const m = G.mission;
      m.timer -= dt;
      if (m.timer <= 0) return 'fail';
      const v = G.vip;
      const dx = G.player.x - v.x, dy = G.player.y - v.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 60) {
        v.angle = Math.atan2(dy, dx);
        v.x += (dx / d) * Math.min(330, 120 + d * 0.8) * dt;
        v.y += (dy / d) * Math.min(330, 120 + d * 0.8) * dt;
      }
      if (d > 500) return 'fail';
      const pt = m.points[m.step];
      if (Math.hypot(G.player.x - pt.x, G.player.y - pt.y) < 70 && d < 260) {
        m.step += 1;
        if (m.step >= 3) return 'done';
        marker(G, m.points[m.step].x, m.points[m.step].y);
        m.text = `Escort the VIP — checkpoint ${m.step + 1} of 3`;
      }
      return null;
    },
  },
  {
    name: 'Night Shift', brief: 'Four packages, two stars on you, 180 seconds. The city never sleeps.', payout: 1900,
    start(G) { addHeat(G, 25); G.mission.step = 0; G.mission.timer = 180; G.mission.drops = [farPoint(G), farPoint(G), farPoint(G), farPoint(G)]; marker(G, G.mission.drops[0].x, G.mission.drops[0].y); G.mission.text = 'Package 1 of 4 — stay moving'; },
    tick(G, dt) {
      const m = G.mission;
      m.timer -= dt;
      if (m.timer <= 0) return 'fail';
      const d = m.drops[m.step];
      if (Math.hypot(G.player.x - d.x, G.player.y - d.y) < 60) {
        m.step += 1;
        G.player.money += 200;
        if (m.step >= 4) return 'done';
        marker(G, m.drops[m.step].x, m.drops[m.step].y);
        m.text = `Package ${m.step + 1} of 4 — stay moving`;
      }
      return null;
    },
  },
  {
    name: 'The Big Score', brief: 'Grab the Crown Bank cash, then vanish. Four stars the moment you touch it.', payout: 5000,
    start(G) { G.mission.step = 0; marker(G, 1500, 600, 60); G.mission.text = 'Reach Crown Bank and grab the cash'; },
    tick(G) {
      const m = G.mission;
      if (m.step === 0 && Math.hypot(G.player.x - 1500, G.player.y - 600) < 70) {
        m.step = 1; addHeat(G, 70);
        G.player.money += 1500;
        marker(G, G.city.spots.safehouse.x, G.city.spots.safehouse.y);
        m.text = 'Cash grabbed — lose the heat, reach the safehouse';
        dispatch(G, 'SBPD dispatch: bank alarm — Crown Bank, all units');
      }
      if (m.step === 1 && Math.hypot(G.player.x - G.city.spots.safehouse.x, G.player.y - G.city.spots.safehouse.y) < 70) return 'done';
      return null;
    },
  },
  {
    name: 'Crown of Solara', brief: 'Five checkpoints, five stars, one legend. Finish this and the Bay is yours.', payout: 8000,
    start(G) {
      addHeat(G, 80);
      G.mission.step = 0; G.mission.timer = 240;
      G.mission.points = [farPoint(G, 700), farPoint(G, 700), farPoint(G, 700), farPoint(G, 700), farPoint(G, 700)];
      marker(G, G.mission.points[0].x, G.mission.points[0].y);
      G.mission.text = 'Finale — checkpoint 1 of 5';
    },
    tick(G, dt) {
      const m = G.mission;
      m.timer -= dt;
      if (m.timer <= 0) return 'fail';
      const pt = m.points[m.step];
      if (Math.hypot(G.player.x - pt.x, G.player.y - pt.y) < 70) {
        m.step += 1;
        if (m.step >= 5) return 'done';
        marker(G, m.points[m.step].x, m.points[m.step].y);
        m.text = `Finale — checkpoint ${m.step + 1} of 5`;
      }
      return null;
    },
  },
];

export function missionCount() { return MISSIONS.length; }
export function missionInfo(i) { return { name: MISSIONS[i].name, brief: MISSIONS[i].brief, payout: MISSIONS[i].payout }; }

export function startMission(G, idx) {
  const def = MISSIONS[idx];
  G.mission = { idx, name: def.name, step: 0, timer: 0, text: '', marker: null, data: {} };
  G.hostiles = [];
  G.rivals = [];
  G.vip = null;
  def.start(G);
  dispatch(G, `Job ${idx + 1}/12 — ${def.name}: ${def.brief}`);
}

export function updateMission(G, dt) {
  if (!G.mission) return;
  const result = MISSIONS[G.mission.idx].tick(G, dt);
  if (result === 'done') {
    const def = MISSIONS[G.mission.idx];
    G.player.money += def.payout;
    G.player.respect += def.payout;
    G.completed[G.mission.idx] = true;
    dispatch(G, `Job complete — ${def.name}: +$${def.payout}`);
    G.banner = { text: `JOB COMPLETE — ${def.name}  +$${def.payout}`, t: 3 };
    G.mission = null;
    G.hostiles = [];
    G.rivals = [];
    G.vip = null;
    if (typeof G.onMissionDone === 'function') G.onMissionDone();
  } else if (result === 'fail') {
    dispatch(G, `Job failed — ${MISSISONS_NAME(G)}: the crew will remember this`);
    G.banner = { text: 'JOB FAILED — try again from the jobs menu', t: 3 };
    G.mission = null;
    G.hostiles = [];
    G.rivals = [];
    G.vip = null;
  }
}

function MISSISONS_NAME(G) { return G.mission ? G.mission.name : ''; }

export function nextMissionIndex(G) {
  for (let i = 0; i < MISSIONS.length; i += 1) if (!G.completed[i]) return i;
  return -1;
}

export { CARS, WORLD };
