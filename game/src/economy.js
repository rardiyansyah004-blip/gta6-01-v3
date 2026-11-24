// Money, respect, the gun shop, the garage and the save slots. A job pays
// cash and respect; cash buys better guns, ammo, armour and faster cars.
import { WEAPONS, RANKS, RANK_AT, TUNE_PRICE, TUNE_MAX, SAVE_KEY, SAVE_VER } from './config.js';
import { dispatch } from './actors.js';

export function rankName(respect) {
  let r = 0;
  for (let i = 0; i < RANK_AT.length; i += 1) if (respect >= RANK_AT[i]) r = i;
  return RANKS[r];
}

export function rankProgress(respect) {
  const i = RANKS.indexOf(rankName(respect));
  if (i >= RANKS.length - 1) return 1;
  return (respect - RANK_AT[i]) / (RANK_AT[i + 1] - RANK_AT[i]);
}

export function buyWeapon(G, idx) {
  const p = G.player;
  const w = WEAPONS[idx];
  if (idx === p.weapon) return 'You already carry the ' + w.name;
  if (p.money < w.price) return `Need $${w.price} for the ${w.name} — you have $${p.money}`;
  p.money -= w.price;
  p.weapon = idx;
  if (p.ammo[idx] <= 0) p.ammo[idx] = w.ammo;
  dispatch(G, `Ammu-Nation: ${w.name} purchased for $${w.price}`);
  return `${w.name} equipped`;
}

export function buyAmmo(G) {
  const p = G.player;
  const w = WEAPONS[p.weapon];
  const price = 120;
  if (p.money < price) return `Ammo is $${price} — you have $${p.money}`;
  p.money -= price;
  p.ammo[p.weapon] += w.ammo;
  return `${w.name} ammo +${w.ammo}`;
}

export function buyArmor(G) {
  const p = G.player;
  if (p.armor >= 100) return 'Armour already full';
  if (p.money < 300) return `Armour is $300 — you have $${p.money}`;
  p.money -= 300;
  p.armor = 100;
  return 'Body armour fitted — 100';
}

export function buyTune(G) {
  const p = G.player;
  if (p.onFoot) return 'Get in a car first — tunes go on the ride, not on you';
  if (p.tunes >= TUNE_MAX) return 'Already maxed — 3 tunes, +45% top speed';
  if (p.money < TUNE_PRICE) return `A tune is $${TUNE_PRICE} — you have $${p.money}`;
  p.money -= TUNE_PRICE;
  p.tunes += 1;
  dispatch(G, `Garage: tune ${p.tunes}/3 fitted — top speed +${p.tunes * 15}%`);
  return `Tune ${p.tunes}/3 fitted`;
}

export function healAtSafehouse(G) {
  const p = G.player;
  p.health = 100;
  p.heat = Math.max(0, p.heat - 30);
  dispatch(G, 'Safehouse: patched up, heat cooling off');
}

function snapshot(G) {
  const p = G.player;
  return {
    ver: SAVE_VER, money: p.money, respect: p.respect, health: p.health, armor: p.armor,
    weapon: p.weapon, ammo: p.ammo, tunes: p.tunes, completed: G.completed,
    x: p.x, y: p.y, time: G.time,
  };
}

export function saveSlot(G, slot) {
  try {
    window.localStorage.setItem(SAVE_KEY + slot, JSON.stringify(snapshot(G)));
    return true;
  } catch { return false; }
}

export function loadSlot(G, slot) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY + slot);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.ver !== SAVE_VER) return null;
    return s;
  } catch { return null; }
}

export function slotSummaries() {
  const out = [];
  for (let i = 1; i <= 3; i += 1) {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY + i);
      if (!raw) { out.push(null); continue; }
      const s = JSON.parse(raw);
      if (s.ver !== SAVE_VER) { out.push(null); continue; }
      out.push({ jobs: s.completed.filter(Boolean).length, money: s.money, respect: s.respect });
    } catch { out.push(null); }
  }
  return out;
}

export function applySave(G, s) {
  const p = G.player;
  p.money = s.money; p.respect = s.respect; p.health = s.health; p.armor = s.armor;
  p.weapon = s.weapon; p.ammo = s.ammo; p.tunes = s.tunes;
  G.completed = s.completed.slice();
  p.x = s.x; p.y = s.y;
  p.onFoot = true; p.car = -1; p.speed = 0;
  G.time = s.time;
}
