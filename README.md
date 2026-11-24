# Solara Bay — Heat Rising

An original open-world crime game for make.fun `gta6-01`, written fresh for
this entry. Lena Cruz came home to Solara Bay with a stolen car and a debt;
twelve jobs stand between her and the crown of the Bay.

## The city

A 3600x2700 top-down city in six districts — Crown District, Palmera Shore,
Old Harbor, Marina Yards, Verde Heights and Neon Mile — with a road grid,
traffic lights, lit windows, neon, palms, docks, containers, cranes and
boats. Dusk slides into night as you play.

## Systems

- **On foot and by car** — 8 car models with different speed and handling;
  press E to steal a car (the SBPD notices) or step out of one.
- **Wanted 1–5 stars** — heat from crimes, cooling when quiet. SBPD dispatch
  feed, cruisers that chase and ram, roadblocks at 3+, foot cops at 3+ when
  you are on foot, the Air One helicopter with a searchlight at 4+, and a
  SWAT van at 5.
- **Living city** — traffic that stops at red lights, pedestrians with
  walking routines who flee gunfire, a clock that runs dusk into night.
- **Twelve story jobs** — steals, timed courier runs, a getaway, a dockside
  takedown, taxi fares, a street race against three rivals, a three-wave
  harbour defence, repo runs, a VIP escort, a night shift under heat, a bank
  job and a five-star finale.
- **Economy** — jobs pay cash and respect (six ranks, Nobody to Queen of
  Solara). Spend it at Ammu-Nation (3 guns + ammo + armour), the garage
  (3 tunes, +15% top speed each) and the safehouse (heal, cool heat).
- **Radio** — four synthesised WebAudio stations (Q switches, M mutes), an
  engine hum that follows speed and a two-tone siren while wanted.
- **Saves** — three slots on the title screen, F quick-saves, autosave after
  every finished job.
- **HUD** — money, health, armour, weapon and ammo, wanted stars, mission
  and timer, respect, radio, dispatch feed and a live minimap.

## Controls

WASD / arrows drive and walk · E steal / exit car · Click shoot · Space
punch · J jobs · B gun shop (near Ammu-Nation) · G garage (near the garage) ·
F quick-save · Q radio · M mute · P / Esc pause · 1/2/3 load a save slot.

## Play

Serve it with `node serve.ts` and open http://localhost:8080, or run
`MAKEFUN_OUTPUT_DIR=out node main.ts` to build the dossier. No network
requests, no libraries — plain ES modules and canvas, all sound synthesised.

## Files

- `game/src/config.js` — tuning, districts, cars, weapons, radio
- `game/src/rng.js` — seeded random (the same seed builds the same city)
- `game/src/city.js` — roads, blocks, buildings, props, traffic lights
- `game/src/actors.js` — player, pedestrians, traffic, SBPD, combat
- `game/src/missions.js` — the twelve jobs
- `game/src/economy.js` — money, respect, shops, garage, saves
- `game/src/audio.js` — synthesised radio, engine, siren, effects
- `game/src/input.js` — keyboard and mouse
- `game/src/render.js` — camera, world, HUD, minimap, menus
- `game/src/shots.js` — the four staged screenshot scenes
- `game/src/main.js` — boot, loop, screens
