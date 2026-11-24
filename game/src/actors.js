// Everyone who moves: the player (on foot and behind the wheel), pedestrians
// with daily routines, traffic that obeys the lights, and the SBPD — cruisers
// that chase and ram, roadblocks, foot cops, the Air One helicopter and, at
// five stars, a SWAT van. Wanted is heat: crimes raise it, quiet lowers it.
import { WORLD, CARS, WEAPONS, PALETTE } from './config.js';
import { onRoad, collideBuildings, randomRoadPoint, lightState } from './city.js';

export function createPlayer(city) {
  return {
    x: city.spots.start.x, y: city.spots.start.y, angle: -Math.PI / 2, speed: 0,
    onFoot: true, car: -1, tunes: 0, health: 100, armor: 0, weapon: 0,
    ammo: WEAPONS.map((w) => w.ammo), money: 250, respect: 0,
    heat: 0, wanted: 0, lastCrime: -99, fireCd: 0, punchCd: 0, hurtCd: 0,
    kills: 0, carsStolen: 0, fares: 0,
  };
}

export function spawnTraffic(G, n) {
  for (let i = 0; i < n; i += 1) {
    const p = randomRoadPoint(G.city, G.rng);
    const vertical = G.rng.chance(0.5);
    G.traffic.push({
      x: p.x, y: p.y, angle: vertical ? (G.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (G.rng.chance(0.5) ? 0 : Math.PI),
      speed: G.rng.range(90, 150), model: G.rng.int(0, 4), color: G.rng.pick(['#c0392b', '#2980b9', '#7f8c8d', '#e67e22', '#16a085', '#d7dee8']),
      vertical, dir: G.rng.chance(0.5) ? 1 : -1, lane: G.rng.pick([-11, 11]), stopped: false,
    });
  }
}

export function spawnPeds(G, n) {
  for (let i = 0; i < n; i += 1) {
    const p = randomRoadPoint(G.city, G.rng);
    G.peds.push({
      x: p.x + G.rng.range(-30, 30), y: p.y + G.rng.range(-30, 30),
      tx: p.x, ty: p.y, speed: G.rng.range(35, 70), flee: 0,
      color: G.rng.pick(['#e8b48a', '#c98d5f', '#8a5a3b', '#f0c8a0']), shirt: G.rng.pick(['#e5534b', '#4fc3f7', '#a3e635', '#ffd166', '#c084fc']),
    });
  }
}

function nearestLight(G, x, y, vertical) {
  let best = null; let bd = 1e9;
  for (const l of G.city.lights) {
    const d = Math.hypot(l.x - x, l.y - y);
    if (d < bd) { bd = d; best = l; }
  }
  return bd < 90 ? best : null;
}

export function updateTraffic(G, dt) {
  for (const c of G.traffic) {
    // Red light ahead: stop at the line.
    const light = nearestLight(G, c.x, c.y, c.vertical);
    let target = c.speed;
    if (light) {
      const st = lightState(light, G.time);
      const green = (st === 'ns' && c.vertical) || (st === 'ew' && !c.vertical);
      if (!green && st !== 'amber') target = 0;
    }
    // Car ahead: don't rear-end it.
    for (const o of G.traffic) {
      if (o === c) continue;
      const dx = o.x - c.x, dy = o.y - c.y;
      const ahead = c.vertical ? Math.abs(dx) < 24 && dy * c.dir > 0 && dy * c.dir < 46 : Math.abs(dy) < 24 && dx * c.dir > 0 && dx * c.dir < 46;
      if (ahead) { target = 0; break; }
    }
    c.speed += Math.max(-260 * dt, Math.min(140 * dt, target - c.speed));
    const step = c.speed * dt * (c.vertical ? c.dir : c.dir);
    if (c.vertical) c.y += step; else c.x += step;
    if (c.x < 60 || c.x > WORLD.w - 60 || c.y < 60 || c.y > WORLD.h - 60) {
      const p = randomRoadPoint(G.city, G.rng);
      c.x = p.x; c.y = p.y;
    }
    // Occasionally turn at a junction.
    if (G.rng.chance(0.0012)) {
      const wasV = c.vertical;
      c.vertical = !wasV;
      c.angle = c.vertical ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.dir > 0 ? 0 : Math.PI);
      if (wasV) c.x = Math.round(c.x / 300) * 300; else c.y = Math.round(c.y / 300) * 300;
    }
    c.angle = c.vertical ? (c.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (c.dir > 0 ? 0 : Math.PI);
  }
}

export function updatePeds(G, dt) {
  for (const p of G.peds) {
    if (p.flee > 0) {
      p.flee -= dt;
      p.x += Math.cos(p.fleeAngle) * 150 * dt;
      p.y += Math.sin(p.fleeAngle) * 150 * dt;
      continue;
    }
    const dx = p.tx - p.x, dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) {
      const np = randomRoadPoint(G.city, G.rng);
      p.tx = np.x; p.ty = np.y;
    } else {
      p.x += (dx / d) * p.speed * dt;
      p.y += (dy / d) * p.speed * dt;
    }
    const fixed = collideBuildings(G.city, p.x, p.y, 6);
    p.x = fixed.x; p.y = fixed.y;
  }
}

export function scarePeds(G, x, y, radius) {
  for (const p of G.peds) {
    if (Math.hypot(p.x - x, p.y - y) < radius) {
      p.flee = 2.5;
      p.fleeAngle = Math.atan2(p.y - y, p.x - x) + G.rng.range(-0.5, 0.5);
    }
  }
}

export function addHeat(G, amount) {
  G.player.heat = Math.min(100, G.player.heat + amount);
  G.player.lastCrime = G.time;
  const w = G.player.heat >= 80 ? 5 : G.player.heat >= 60 ? 4 : G.player.heat >= 40 ? 3 : G.player.heat >= 20 ? 2 : G.player.heat >= 8 ? 1 : 0;
  if (w !== G.player.wanted) {
    G.player.wanted = w;
    if (w > 0) dispatch(G, `SBPD dispatch: ${w}-star wanted — suspect ${w >= 4 ? 'ARMED, Air One tasked' : w >= 3 ? 'roadblocks up' : 'units responding'}`);
    else dispatch(G, 'SBPD dispatch: suspect lost — standing down');
  }
}

export function dispatch(G, text) {
  G.dispatch.unshift({ t: G.time, text });
  if (G.dispatch.length > 5) G.dispatch.length = 5;
}

function spawnCop(G) {
  const a = G.rng.range(0, Math.PI * 2);
  const d = G.rng.range(420, 560);
  const x = Math.max(80, Math.min(WORLD.w - 80, G.player.x + Math.cos(a) * d));
  const y = Math.max(80, Math.min(WORLD.h - 80, G.player.y + Math.sin(a) * d));
  return { x, y, angle: 0, speed: 0, model: 5, ramCd: 0, swat: false };
}

export function updatePolice(G, dt) {
  const p = G.player;
  // Heat cools when quiet; the helicopter pins it at high wanted.
  if (G.time - p.lastCrime > 8) p.heat = Math.max(0, p.heat - (p.wanted >= 4 ? 0.5 : 1.4) * dt);
  const w = p.heat >= 80 ? 5 : p.heat >= 60 ? 4 : p.heat >= 40 ? 3 : p.heat >= 20 ? 2 : p.heat >= 8 ? 1 : 0;
  if (w !== p.wanted) { p.wanted = w; if (w === 0) dispatch(G, 'SBPD dispatch: suspect lost — standing down'); }

  const wantCops = Math.min(p.wanted, 4);
  while (G.cops.length < wantCops) G.cops.push(spawnCop(G));
  while (G.cops.length > wantCops) G.cops.pop();
  const wantSwat = p.wanted >= 5 ? 1 : 0;
  const swat = G.cops.filter((c) => c.swat).length;
  if (swat < wantSwat) { const s = spawnCop(G); s.swat = true; s.model = 6; G.cops.push(s); }
  if (swat > wantSwat) { const i = G.cops.findIndex((c) => c.swat); if (i >= 0) G.cops.splice(i, 1); }

  for (const c of G.cops) {
    const dx = p.x - c.x, dy = p.y - c.y;
    const dist = Math.hypot(dx, dy) || 1;
    const want = Math.atan2(dy, dx);
    let da = want - c.angle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    c.angle += Math.max(-3.4 * dt, Math.min(3.4 * dt, da));
    const top = CARS[c.model].top * (c.swat ? 0.95 : 1.02);
    c.speed = Math.min(top, c.speed + 300 * dt);
    if (dist < 90) c.speed = Math.max(60, c.speed - 200 * dt);
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    const fixed = collideBuildings(G.city, c.x, c.y, 16);
    c.x = fixed.x; c.y = fixed.y;
    c.ramCd -= dt;
    // Ram: contact hurts the player (or their car) and shoves both apart.
    if (dist < 34 && c.ramCd <= 0) {
      c.ramCd = 0.9;
      hurtPlayer(G, c.swat ? 12 : 8);
      c.speed *= 0.4;
      p.speed *= 0.55;
      const push = 26;
      p.x += (dx / dist) * push; p.y += (dy / dist) * push;
      G.effects.push({ type: 'crash', x: p.x, y: p.y, t: 0.4 });
    }
  }

  // Roadblocks at 3+ stars: two static cruisers across the road ahead.
  const wantBlocks = p.wanted >= 3 ? 2 : 0;
  if (G.roadblocks.length < wantBlocks && G.time - (G.lastBlock || 0) > 6) {
    G.lastBlock = G.time;
    const ahead = randomRoadPoint(G.city, G.rng);
    G.roadblocks.push({ x: ahead.x, y: ahead.y, angle: G.rng.chance(0.5) ? 0 : Math.PI / 2, t: 0 });
    dispatch(G, 'SBPD dispatch: roadblock set — spike strip on the avenue');
  }
  if (G.roadblocks.length > wantBlocks) G.roadblocks.length = wantBlocks;
  for (const b of G.roadblocks) {
    b.t += dt;
    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d < 40 && Math.abs(p.speed) > 120) {
      hurtPlayer(G, 10);
      p.speed *= 0.25;
      G.effects.push({ type: 'crash', x: p.x, y: p.y, t: 0.5 });
      G.roadblocks.splice(G.roadblocks.indexOf(b), 1);
      break;
    }
  }

  // Air One at 4+ stars: follows overhead, searchlight pins the player.
  if (p.wanted >= 4) {
    if (!G.heli) { G.heli = { x: p.x - 200, y: p.y - 200, angle: 0, rotor: 0 }; dispatch(G, 'Air One is overhead — searchlight on the suspect'); }
    const h = G.heli;
    h.rotor += dt * 22;
    const dx = p.x - h.x, dy = p.y - h.y;
    const d = Math.hypot(dx, dy) || 1;
    h.x += (dx / d) * 240 * dt; h.y += (dy / d) * 240 * dt;
    h.angle = Math.atan2(dy, dx);
  } else if (G.heli) G.heli = null;

  // Foot cops at 3+ when the player is on foot.
  const wantFoot = p.wanted >= 3 && p.onFoot ? 2 : 0;
  while (G.footCops.length < wantFoot) {
    const a = G.rng.range(0, Math.PI * 2);
    G.footCops.push({ x: p.x + Math.cos(a) * 320, y: p.y + Math.sin(a) * 320, punchCd: 0 });
  }
  while (G.footCops.length > wantFoot) G.footCops.pop();
  for (const f of G.footCops) {
    const dx = p.x - f.x, dy = p.y - f.y;
    const d = Math.hypot(dx, dy) || 1;
    f.x += (dx / d) * 165 * dt; f.y += (dy / d) * 165 * dt;
    f.punchCd -= dt;
    if (d < 26 && f.punchCd <= 0) { f.punchCd = 1.1; hurtPlayer(G, 6); }
  }
}

export function hurtPlayer(G, amount) {
  const p = G.player;
  if (p.hurtCd > 0) return;
  p.hurtCd = 0.5;
  let left = amount;
  if (p.armor > 0) { const absorbed = Math.min(p.armor, left); p.armor -= absorbed; left -= absorbed; }
  p.health -= left;
  G.effects.push({ type: 'hit', x: p.x, y: p.y, t: 0.3 });
  if (p.health <= 0) {
    p.health = 0;
    G.screen = 'busted';
    addHeat(G, -40);
    dispatch(G, 'SBPD dispatch: suspect in custody');
  }
}

export function updatePlayer(G, input, dt) {
  const p = G.player;
  p.fireCd -= dt; p.punchCd -= dt; p.hurtCd -= dt;
  const model = p.onFoot ? null : CARS[p.car];
  if (p.onFoot) {
    const mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const len = Math.hypot(mx, my) || 1;
    const sp = 195;
    p.x += (mx / len) * sp * dt * (mx || my ? 1 : 0);
    p.y += (my / len) * sp * dt * (mx || my ? 1 : 0);
    if (mx || my) p.angle = Math.atan2(my, mx);
    const fixed = collideBuildings(G.city, p.x, p.y, 10);
    p.x = fixed.x; p.y = fixed.y;
    p.speed = (mx || my) ? sp : 0;
  } else {
    const onroad = onRoad(G.city, p.x, p.y);
    const top = model.top * (1 + TUNE_BONUS * p.tunes) * (onroad ? 1 : 0.55);
    const steer = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    if (input.up) p.speed = Math.min(top, p.speed + model.accel * dt);
    else if (input.down) p.speed = Math.max(-90, p.speed - model.accel * 1.4 * dt);
    else p.speed -= Math.sign(p.speed) * Math.min(Math.abs(p.speed), 190 * dt);
    p.angle += steer * model.turn * dt * Math.max(0.35, Math.min(1, Math.abs(p.speed) / 220)) * (p.speed >= 0 ? 1 : -1);
    p.x += Math.cos(p.angle) * p.speed * dt;
    p.y += Math.sin(p.angle) * p.speed * dt;
    const fixed = collideBuildings(G.city, p.x, p.y, 16);
    if (fixed.x !== p.x || fixed.y !== p.y) {
      if (Math.abs(p.speed) > 240) { hurtPlayer(G, 6); G.effects.push({ type: 'crash', x: p.x, y: p.y, t: 0.4 }); }
      p.speed *= 0.45;
    }
    p.x = fixed.x; p.y = fixed.y;
    // Bumping traffic slows both down.
    for (const c of G.traffic) {
      if (Math.hypot(c.x - p.x, c.y - p.y) < 34) {
        p.speed *= 0.92; c.speed *= 0.9;
        if (Math.abs(p.speed) > 200) { G.effects.push({ type: 'crash', x: p.x, y: p.y, t: 0.3 }); }
      }
    }
  }
  G.time += dt;
  G.clock = (17 + G.time / 240) % 24; // dusk slides into night as you play
}

export function trySteal(G) {
  const p = G.player;
  if (!p.onFoot) {
    // Step out of the car.
    p.onFoot = true;
    p.x += Math.cos(p.angle + Math.PI / 2) * 30;
    p.y += Math.sin(p.angle + Math.PI / 2) * 30;
    p.speed = 0;
    return 'out';
  }
  let best = null; let bd = 70;
  for (const c of G.traffic) {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) return null;
  G.traffic.splice(G.traffic.indexOf(best), 1);
  p.car = best.model;
  p.onFoot = false;
  p.angle = best.angle;
  p.speed = 0;
  p.carsStolen += 1;
  addHeat(G, 25);
  dispatch(G, `SBPD dispatch: carjacking reported — ${CARS[p.car].name} taken`);
  scarePeds(G, p.x, p.y, 260);
  return 'stolen';
}

export function shoot(G, tx, ty) {
  const p = G.player;
  if (p.fireCd > 0 || p.onFoot === false) return 0;
  const w = WEAPONS[p.weapon];
  if (p.ammo[p.weapon] <= 0) { p.fireCd = 0.3; dispatch(G, 'Click — magazine empty. Buy ammo at Ammu-Nation.'); return 0; }
  p.fireCd = w.rate;
  p.ammo[p.weapon] -= 1;
  const aim = Math.atan2(ty - p.y, tx - p.x);
  p.angle = aim;
  G.effects.push({ type: 'muzzle', x: p.x + Math.cos(aim) * 18, y: p.y + Math.sin(aim) * 18, t: 0.08, angle: aim });
  scarePeds(G, p.x, p.y, 320);
  addHeat(G, 6);
  let hits = 0;
  const targets = [];
  for (const ped of G.peds) targets.push({ x: ped.x, y: ped.y, kind: 'ped', ref: ped });
  for (const cop of G.footCops) targets.push({ x: cop.x, y: cop.y, kind: 'footcop', ref: cop });
  for (const h of G.hostiles) targets.push({ x: h.x, y: h.y, kind: 'hostile', ref: h });
  for (const t of targets) {
    const dx = t.x - p.x, dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > w.range) continue;
    let da = Math.atan2(dy, dx) - aim;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) < 0.16 && d > 12) {
      hits += 1;
      G.effects.push({ type: 'hit', x: t.x, y: t.y, t: 0.3 });
      if (t.kind === 'ped') { G.peds.splice(G.peds.indexOf(t.ref), 1); p.kills += 1; addHeat(G, 15); }
      else if (t.kind === 'hostile') {
        t.ref.hp -= 1;
        if (t.ref.hp <= 0) { G.hostiles.splice(G.hostiles.indexOf(t.ref), 1); p.kills += 1; addHeat(G, 10); }
      }
      else { G.footCops.splice(G.footCops.indexOf(t.ref), 1); p.kills += 1; addHeat(G, 30); dispatch(G, 'SBPD dispatch: officer down — all units converge'); }
    }
  }
  return hits;
}

export function punch(G) {
  const p = G.player;
  if (p.punchCd > 0 || !p.onFoot) return 0;
  p.punchCd = 0.45;
  let hits = 0;
  for (const ped of [...G.peds]) {
    if (Math.hypot(ped.x - p.x, ped.y - p.y) < 34) {
      G.peds.splice(G.peds.indexOf(ped), 1);
      p.kills += 1; hits += 1; addHeat(G, 12);
      G.effects.push({ type: 'hit', x: ped.x, y: ped.y, t: 0.3 });
    }
  }
  for (const cop of [...G.footCops]) {
    if (Math.hypot(cop.x - p.x, cop.y - p.y) < 34) {
      G.footCops.splice(G.footCops.indexOf(cop), 1);
      p.kills += 1; hits += 1; addHeat(G, 25);
    }
  }
  for (const h of [...G.hostiles]) {
    if (Math.hypot(h.x - p.x, h.y - p.y) < 40) {
      h.hp -= 1;
      if (h.hp <= 0) { G.hostiles.splice(G.hostiles.indexOf(h), 1); p.kills += 1; hits += 1; }
    }
  }
  return hits;
}

export { PALETTE };
