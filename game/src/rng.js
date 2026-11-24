// Deterministic seeded random: the same seed always builds the same city,
// the same traffic and the same pedestrians, so screenshots and replays match.
export function createRng(seed) {
  let a = seed >>> 0;
  function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    // Fisher-Yates shuffle that consumes the same seeded stream, so a
    // shuffled list is reproducible for a given seed. Used by the race to
    // vary rival starting order without breaking seeded screenshots.
    shuffle: (arr) => {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    // Pick an entry weighted by its `weight` field (defaults to 1).
    weightedPick: (arr) => {
      let total = 0;
      for (const e of arr) total += e.weight ?? 1;
      let r = next() * total;
      for (const e of arr) { r -= e.weight ?? 1; if (r <= 0) return e; }
      return arr[arr.length - 1];
    },
  };
}

// Plain clamp helper shared by race rubber-banding, standing and damage.
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
