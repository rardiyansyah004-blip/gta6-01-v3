// Money, respect, district standing, crew and the gun shop, the garage and
// the save slots. A job pays cash and respect; cash buys better guns, ammo,
// armour and faster cars. Standing is per-district: finishing jobs there
// raises it (slower wanted gain, cheaper shops), causing heat there lowers
// it (faster police response, dearer shops).
import { WEAPONS, RANKS, RANK_AT, TUNE_PRICE, TUNE_MAX, SAVE_KEY, SAVE_VER, DISTRICTS, STANDING_START, standingPriceMult, CREW } from './config.js';
import { dispatch } from './actors.js';
import { districtAt } from './city.js';
import { clamp } from './rng.js';

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

// --- District standing -------------------------------------------------
export function defaultStanding() {
  const s = {};
  for (const d of DISTRICTS) s[d.name] = STANDING_START;
  return s;
}

export function standingFor(G, name) {
  if (!G.standing) G.standing = defaultStanding();
  return G.standing[name] ?? STANDING_START;
}

export function standingHere(G) {
  return standingFor(G, districtAt(G.player.x, G.player.y).name);
}

// Price in the player's current district: high standing = discount.
export function priceHere(G, base) {
  return Math.max(1, Math.round(base * standingPriceMult(standingHere(G))));
}

export function changeStanding(G, name, delta) {
  if (!G.standing) G.standing = defaultStanding();
  const before = G.standing[name] ?? STANDING_START;
  G.standing[name] = clamp(before + delta, 0, 100);
  return G.standing[name];
}

// A finished job lifts standing in the district it was worked in.
export function recordJobStanding(G, jobIdx) {
  const d = districtAt(G.player.x, G.player.y).name;
  const after = changeStanding(G, d, 8);
  dispatch(G, `Standing in ${d}: ${after} — the street remembers a job well done`);
  return after;
}

// --- Crew ---------------------------------------------------------------
export function crewUnlocked(G) {
  return (G.crew || []).map((id) => CREW.find((c) => c.id === id)).filter(Boolean);
}

export function hasCrew(G, id) { return (G.crew || []).includes(id); }

// Unlock the crew member whose unlockJob just finished; returns them or null.
export function unlockCrewForJob(G, jobIdx) {
  const member = CREW.find((c) => c.unlockJob === jobIdx);
  if (!member) return null;
  if (!G.crew) G.crew = [];
  if (G.crew.includes(member.id)) return null;
  G.crew.push(member.id);
  dispatch(G, `Crew: ${member.name} (${member.role}) joined — ${member.ability}`);
  return member;
}

export function buyWeapon(G, idx) {
  const p = G.player;
  const w = WEAPONS[idx];
  if (idx === p.weapon) return 'You already carry the ' + w.name;
  const price = priceHere(G, w.price);
  if (p.money < price) return `Need $${price} for the ${w.name} — you have $${p.money}`;
  p.money -= price;
  p.weapon = idx;
  if (p.ammo[idx] <= 0) p.ammo[idx] = w.ammo;
  dispatch(G, `Ammu-Nation: ${w.name} purchased for $${price} (standing price in ${districtAt(p.x, p.y).name})`);
  return `${w.name} equipped`;
}

export function buyAmmo(G) {
  const p = G.player;
  const w = WEAPONS[p.weapon];
  const price = priceHere(G, 120);
  if (p.money < price) return `Ammo is $${price} — you have $${p.money}`;
  p.money -= price;
  p.ammo[p.weapon] += w.ammo;
  return `${w.name} ammo +${w.ammo}`;
}

export function buyArmor(G) {
  const p = G.player;
  if (p.armor >= 100) return 'Armour already full';
  const price = priceHere(G, 300);
  if (p.money < price) return `Armour is $${price} — you have $${p.money}`;
  p.money -= price;
  p.armor = 100;
  return 'Body armour fitted — 100';
}

export function buyTune(G) {
  const p = G.player;
  if (p.onFoot) return 'Get in a car first — tunes go on the ride, not on you';
  if (p.tunes >= TUNE_MAX) return 'Already maxed — 3 tunes, +45% top speed';
  const price = priceHere(G, TUNE_PRICE);
  if (p.money < price) return `A tune is $${price} — you have $${p.money}`;
  p.money -= price;
  p.tunes += 1;
  p.damage = 0; // a tune visit also patches the bodywork
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
    standing: G.standing || defaultStanding(), crew: G.crew || [],
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
      out.push({ jobs: s.completed.filter(Boolean).length, money: s.money, respect: s.respect, crew: (s.crew || []).length });
    } catch { out.push(null); }
  }
  return out;
}

export function applySave(G, s) {
  const p = G.player;
  p.money = s.money; p.respect = s.respect; p.health = s.health; p.armor = s.armor;
  p.weapon = s.weapon; p.ammo = s.ammo; p.tunes = s.tunes;
  G.completed = s.completed.slice();
  G.standing = s.standing || defaultStanding();
  G.crew = (s.crew || []).slice();
  p.x = s.x; p.y = s.y;
  p.onFoot = true; p.car = -1; p.speed = 0;
  G.time = s.time;
}
