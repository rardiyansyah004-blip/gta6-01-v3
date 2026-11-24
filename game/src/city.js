// The city itself: a road grid, district-flavoured blocks, buildings with
// lit windows, palms, neon, docks, boats, traffic lights and the fixed spots
// (safehouse, garage, gun shop, mission anchors) the rest of the game uses.
import { WORLD, DISTRICTS, PALETTE } from './config.js';

const ROAD_GAP = 300;
const ROAD_W = 46;

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  return DISTRICTS[0];
}

// Index of the district containing (x, y), for standing lookups keyed by
// district name in game state (G.standing[districtName]).
export function districtIndexAt(x, y) {
  for (let i = 0; i < DISTRICTS.length; i += 1) {
    const d = DISTRICTS[i];
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return i;
  }
  return 0;
}

export function districtNameAt(x, y) { return districtAt(x, y).name; }

export function buildCity(rng) {
  const roadsV = [];
  const roadsH = [];
  for (let x = ROAD_GAP; x < WORLD.w; x += ROAD_GAP) roadsV.push(x);
  for (let y = ROAD_GAP; y < WORLD.h; y += ROAD_GAP) roadsH.push(y);

  // Traffic lights on the avenue crossings (every second grid line).
  const lights = [];
  for (const x of roadsV) for (const y of roadsH) {
    if ((x / ROAD_GAP + y / ROAD_GAP) % 2 === 0) lights.push({ x, y, phase: rng.range(0, 6), nsGreen: rng.chance(0.5) });
  }

  const buildings = [];
  const props = [];
  const blockColors = ['#2e3442', '#333a4d', '#2a3040', '#3a3247', '#2f3d33', '#40342a'];
  for (let bx = 0; bx < WORLD.w / ROAD_GAP; bx += 1) {
    for (let by = 0; by < WORLD.h / ROAD_GAP; by += 1) {
      const x0 = bx * ROAD_GAP + ROAD_W / 2 + 14;
      const y0 = by * ROAD_GAP + ROAD_W / 2 + 14;
      const d = districtAt(x0 + 100, y0 + 100);
      if (d.beach && by >= 8) { // sand strip along the shore
        props.push({ type: 'sand', x: x0, y: y0, w: ROAD_GAP - 60, h: ROAD_GAP - 60 });
        for (let p = 0; p < 3; p += 1) props.push({ type: 'palm', x: rng.range(x0, x0 + 220), y: rng.range(y0, y0 + 220) });
        continue;
      }
      if (d.docks && bx >= 9) { // container yard by the water
        for (let c = 0; c < 4; c += 1) props.push({ type: 'container', x: x0 + rng.range(0, 160), y: y0 + c * 56, color: rng.pick(['#b45309', '#0e7490', '#991b1b', '#166534']) });
        props.push({ type: 'crane', x: x0 + 110, y: y0 + 20 });
        continue;
      }
      const n = d.towers ? 2 : rng.int(2, 4);
      for (let i = 0; i < n; i += 1) {
        const w = rng.range(52, d.towers ? 120 : 96);
        const h = rng.range(52, d.towers ? 150 : 96);
        const x = rng.range(x0, x0 + ROAD_GAP - 60 - w);
        const y = rng.range(y0, y0 + ROAD_GAP - 60 - h);
        const tall = d.towers && rng.chance(0.5);
        buildings.push({
          x, y, w, h, tall, color: rng.pick(blockColors),
          floors: tall ? rng.int(6, 12) : rng.int(1, 3),
          lit: rng.range(0.25, 0.7), district: d.name,
          neon: d.neon && rng.chance(0.4) ? rng.pick(['#ff5da2', '#4fc3f7', '#ffd166', '#a3e635']) : null,
        });
      }
      if (d.neon && rng.chance(0.7)) props.push({ type: 'neon', x: x0 + rng.range(0, 200), y: y0 + rng.range(0, 200), color: rng.pick(['#ff5da2', '#4fc3f7', '#ffd166']) });
      if (d.marina && rng.chance(0.6)) props.push({ type: 'boat', x: x0 + rng.range(0, 180), y: y0 + rng.range(0, 180) });
      if (rng.chance(0.5)) props.push({ type: 'palm', x: rng.range(x0, x0 + 220), y: rng.range(y0, y0 + 220) });
      if (rng.chance(0.4)) props.push({ type: 'lamp', x: x0 + 8, y: y0 + 8 });
    }
  }

  // Water along the west edge (shore) and the south-east harbour basin.
  const water = [
    { x: -40, y: 1500, w: 90, h: 1240 },
    { x: 3150, y: 2250, w: 490, h: 490 },
  ];

  const spots = {
    safehouse: { x: 450, y: 450, label: 'Safehouse' },
    garage: { x: 2850, y: 450, label: 'Garage' },
    gunshop: { x: 450, y: 2250, label: 'Ammu-Nation' },
    start: { x: 450, y: 450 },
  };
  return { roadsV, roadsH, lights, buildings, props, water, spots, roadW: ROAD_W };
}

export function onRoad(city, x, y) {
  for (const rx of city.roadsV) if (Math.abs(x - rx) < city.roadW / 2 + 8) return true;
  for (const ry of city.roadsH) if (Math.abs(y - ry) < city.roadW / 2 + 8) return true;
  return false;
}

export function collideBuildings(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) {
      const dxl = x + r - b.x, dxr = b.x + b.w - (x - r);
      const dyt = y + r - b.y, dyb = b.y + b.h - (y - r);
      const m = Math.min(dxl, dxr, dyt, dyb);
      if (m === dxl) x = b.x - r; else if (m === dxr) x = b.x + b.w + r;
      else if (m === dyt) y = b.y - r; else y = b.y + b.h + r;
    }
  }
  return { x: Math.max(30, Math.min(WORLD.w - 30, x)), y: Math.max(30, Math.min(WORLD.h - 30, y)) };
}

export function randomRoadPoint(city, rng) {
  if (rng.chance(0.5)) return { x: rng.pick(city.roadsV) + rng.range(-10, 10), y: rng.range(200, WORLD.h - 200), vertical: true };
  return { x: rng.range(200, WORLD.w - 200), y: rng.pick(city.roadsH) + rng.range(-10, 10), vertical: false };
}

export function lightState(light, t) {
  const cycle = (t + light.phase) % 12;
  return cycle < 5 ? (light.nsGreen ? 'ns' : 'ew') : cycle < 6 ? 'amber' : (light.nsGreen ? 'ew' : 'ns');
}

export { PALETTE };
