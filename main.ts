// Solara Bay — Heat Rising: the gta6-01 entry program (Node 22, standard
// library only). The game is this directory's game/ folder — plain static
// files a desktop browser loads offline (game/index.html and its ES modules,
// no library and no network request) — and this program hands it in: it
// copies game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const started = Date.now();

mkdirSync(out, { recursive: true });
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('game/index.html is missing — the entry has no playable game to hand in');
}
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
const gameFiles = readdirSync(join(out, 'game'), { recursive: true }).length;
console.log(`Solara Bay v4: copied game/ (${gameFiles} entries) to ${out}`);
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
// Fail loudly on a missing or oversized screenshot instead of handing in
// an entry the scorer would refuse.
for (const shot of readdirSync(join(out, 'screenshots'))) {
  const size = statSync(join(out, 'screenshots', shot)).size;
  if (size > 262144) throw new Error(`screenshot ${shot} is ${size} bytes — over the 256 KiB cap`);
}
console.log(`Solara Bay v4: screenshots OK (${readdirSync(join(out, 'screenshots')).length} files)`);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`Solara Bay v4: dossier written in ${Date.now() - started} ms`);
