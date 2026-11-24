// Every tuning number, colour and name in one place. Solara Bay is a fixed
// 3600x2700 city; the renderer scales the view to the window, so no rule
// below depends on the screen size.
export const STEP = 1 / 60;
export const WORLD = { w: 3600, h: 2700 };

export const DISTRICTS = [
  { name: 'Crown District', x: 1200, y: 300, w: 1200, h: 900, sky: '#2b2350', accent: '#ffd166', towers: true },
  { name: 'Palmera Shore', x: 0, y: 1500, w: 900, h: 1200, sky: '#123a4d', accent: '#7ee0c3', beach: true },
  { name: 'Old Harbor', x: 2400, y: 1800, w: 1200, h: 900, sky: '#1d2f45', accent: '#ff9f43', docks: true },
  { name: 'Marina Yards', x: 2400, y: 300, w: 1200, h: 900, sky: '#14324a', accent: '#4fc3f7', marina: true },
  { name: 'Verde Heights', x: 0, y: 300, w: 900, h: 900, sky: '#1e3a2a', accent: '#a3e635', hills: true },
  { name: 'Neon Mile', x: 900, y: 1200, w: 1500, h: 600, sky: '#3d1a4d', accent: '#ff5da2', neon: true },
];

export const CHAPTERS = [
  { title: 'Ch. 1 — Coming Home', jobs: [0, 1, 2, 3], intro: 'Lena is back in Solara Bay. Earn your wheels, your name and your first ally.' },
  { title: 'Ch. 2 — Taking the Bay', jobs: [4, 5, 6, 7], intro: 'The Bay is up for grabs. Win the streets, hold the harbor, take what is owed.' },
  { title: 'Ch. 3 — Crown of Solara', jobs: [8, 9, 10, 11], intro: 'Five stars, one bank, one crown. Finish this and the Bay is yours.' },
];

export function chapterFor(idx) {
  for (let i = 0; i < CHAPTERS.length; i += 1) if (CHAPTERS[i].jobs.includes(idx)) return i;
  return 0;
}

// Crew: three original allies, each unlocked by finishing a specific early
// job. Wheelman boosts top speed, Gunman fights beside you, Fixer cools heat.
export const CREW = [
  { id: 'wheelman', name: 'Rico Vega', role: 'Wheelman', unlockJob: 0, ability: '+12% car top speed in races and getaways' },
  { id: 'fixer', name: 'Dex Marlowe', role: 'Fixer', unlockJob: 1, ability: 'Heat rises 25% slower — the SBPD looks away longer' },
  { id: 'gunman', name: 'Mara Solis', role: 'Gunman', unlockJob: 3, ability: 'Fights beside you in takedowns and harbour defence' },
];

// District standing 0-100, starts at 50 everywhere. High standing slows
// wanted gain and cheapens shops in that district; low standing does the
// opposite and brings faster police response.
export const STANDING_START = 50;
export const STANDING_JOB_GAIN = 8;
export const STANDING_HEAT_LOSS = 4;
export function standingHeatMult(standing) { return 1.3 - (standing / 100) * 0.6; } // 1.0 at 50, 0.7 at 100, 1.3 at 0
export function standingPriceMult(standing) { return 1.15 - (standing / 100) * 0.3; } // 1.0 at 50, 0.85 at 100, 1.15 at 0
export function standingLabel(standing) {
  return standing >= 75 ? 'Loved' : standing >= 60 ? 'Respected' : standing >= 40 ? 'Known' : standing >= 20 ? 'Watched' : 'Hunted';
}

export const CARS = [
  { name: 'Pinto', top: 300, accel: 210, turn: 2.6, color: '#b8c4cc', w: 34, h: 18 },
  { name: 'Comet', top: 360, accel: 260, turn: 3.0, color: '#e5534b', w: 36, h: 18 },
  { name: 'Vortex GT', top: 430, accel: 320, turn: 3.3, color: '#ffd166', w: 38, h: 19 },
  { name: 'Bison Van', top: 260, accel: 170, turn: 2.2, color: '#8b93a3', w: 44, h: 22 },
  { name: 'Toro Taxi', top: 330, accel: 240, turn: 2.8, color: '#f2c94c', w: 36, h: 18 },
  { name: 'SBPD Cruiser', top: 400, accel: 340, turn: 3.4, color: '#2f6fed', w: 38, h: 19 },
  { name: 'SWAT Van', top: 380, accel: 300, turn: 2.6, color: '#1f2937', w: 46, h: 22 },
  { name: 'Stallion', top: 470, accel: 360, turn: 3.5, color: '#c084fc', w: 38, h: 19 },
];

export const WEAPONS = [
  { name: 'Pistol', damage: 34, rate: 0.28, range: 320, ammo: 24, price: 0, color: '#d7dee8' },
  { name: 'SMG', damage: 18, rate: 0.09, range: 280, ammo: 90, price: 800, color: '#ffd166' },
  { name: 'Rifle', damage: 60, rate: 0.5, range: 520, ammo: 30, price: 2200, color: '#ff9f43' },
];

export const RANKS = ['Nobody', 'Wheelman', 'Hustler', 'Street Royalty', 'Bay Legend', 'Queen of Solara'];
export const RANK_AT = [0, 2500, 7000, 15000, 30000, 55000];

export const RADIO = [
  { name: 'SOL 98.5', genre: 'Sunset Pop', bpm: 112, root: 220, scale: [0, 2, 4, 7, 9], wave: 'triangle' },
  { name: 'BAY FM', genre: 'Neon Synth', bpm: 128, root: 196, scale: [0, 3, 5, 7, 10], wave: 'sawtooth' },
  { name: 'HARBOUR JAZZ', genre: 'Late Jazz', bpm: 84, root: 174, scale: [0, 3, 5, 6, 10], wave: 'sine' },
  { name: 'VICE COAST', genre: 'Bass House', bpm: 124, root: 164, scale: [0, 0, 7, 10, 12], wave: 'square' },
  { name: 'CREW FM', genre: 'Crew Anthems', bpm: 100, root: 146, scale: [0, 2, 5, 7, 10], wave: 'triangle' },
];

export const TUNE_PRICE = 500;
export const TUNE_MAX = 3;
export const TUNE_BONUS = 0.15;

export const PALETTE = {
  water: '#0e3a52', sand: '#c9a86a', grass: '#1d4d2e', road: '#23262e', roadLine: '#c8b45a',
  sidewalk: '#3a3f4a', building: '#2e3442', roof: '#222634', windowLit: '#ffd166',
  windowDark: '#1a1e2a', panel: '#141824', panelEdge: '#2c3345', text: '#eef1f5',
  muted: '#8b93a3', good: '#7ee0a3', bad: '#ff6b6b', gold: '#ffd166', cop: '#4f8ef7',
  heli: '#9aa5b1', ped: '#e8b48a', smoke: '#6b7280',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const SAVE_KEY = 'solara-bay-v4.slot';
export const SAVE_VER = 4;
