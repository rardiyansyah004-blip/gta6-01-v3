# Solara Bay — Heat Rising v4

An original open-world crime game for make.fun `gta6-01`, written fresh for
this entry. Lena Cruz came home to Solara Bay with a stolen car and a debt;
twelve jobs in three chapters stand between her and the crown of the Bay.

## The city

A 3600x2700 top-down city in six districts — Crown District, Palmera Shore,
Old Harbor, Marina Yards, Verde Heights and Neon Mile — with a road grid,
traffic lights, lit windows, neon, palms, docks, containers, cranes and
boats. Dusk slides into night as you play.

## Story chapters (v4)

The twelve jobs are staged in three chapters, unlocked in order — a job
opens only when every earlier job is done, so the finale needs chapters 1
and 2 first. A chapter intro banner plays when a chapter opens.

- **Ch. 1 — Coming Home** (jobs 1–4): First Wheels, Courier Run, Getaway,
  Dockside Takedown. Earn your wheels, your name and your first ally.
- **Ch. 2 — Taking the Bay** (jobs 5–8): Taxi Hustle, Street Kings, Harbor
  Heat, Repo Run. Win the streets, hold the harbor, take what is owed.
- **Ch. 3 — Crown of Solara** (jobs 9–12): Getaway Driver, Night Shift, The
  Big Score, Crown of Solara. Five stars, one bank, one crown.

## District standing (v4)

Every district tracks standing (0–100, starts at 50). Finishing a job
there raises it; causing serious heat there lowers it. Standing changes
gameplay: high standing slows wanted gain and cheapens shops in that
district, low standing brings an extra SBPD cruiser and dearer prices.
Standing is shown on the HUD, on the minimap and in the jobs menu, and it
is saved in all three save slots.

## Crew (v4)

Three original allies, each recruited by finishing a specific early job:

- **Rico Vega — Wheelman** (job 1): +12% car top speed in races and getaways.
- **Dex Marlowe — Fixer** (job 2): heat rises 25% slower.
- **Mara Solis — Gunman** (job 4): fights beside you in takedowns and the
  harbour defence, shooting hostiles on overwatch.

Press **C** to cycle crew focus and hear what each member does for you.
Crew is shown on the HUD, the jobs menu and the title screen.

## Systems

- **On foot and by car** — 8 car models with different speed and handling;
  press E to steal a car (the SBPD notices) or step out of one. Heavy
  damage slows the car and shows smoke; a garage tune patches it.
- **Wanted 1–5 stars** — heat from crimes, cooling when quiet. SBPD dispatch
  feed, cruisers that chase and ram, roadblocks at 3+, foot cops at 3+ when
  you are on foot, the Air One helicopter with a searchlight at 4+, and a
  SWAT van at 5.
- **Living city** — traffic that stops at red lights, pedestrians with
  walking routines who flee gunfire, a clock that runs dusk into night.
- **Twelve story jobs** — steals, timed courier runs, a getaway, a dockside
  takedown, taxi fares, a street race against three rivals, a three-wave
  harbour defence, repo runs, a VIP escort, a night shift under heat, a bank
  job and a five-star finale. The street race has a real lose condition (a
  rival finishing all four rings fails the job), rival rubber-banding so the
  race stays close, and a live P1–P4 standings line.
- **Economy** — jobs pay cash and respect (six ranks, Nobody to Queen of
  Solara). Spend it at Ammu-Nation (3 guns + ammo + armour), the garage
  (3 tunes, +15% top speed each) and the safehouse (heal, cool heat).
  Shop prices follow district standing.
- **Radio** — five synthesised WebAudio stations (Q switches, M mutes), an
  engine hum that follows speed and a two-tone siren while wanted, plus a
  crew-join chime.
- **Saves** — three slots on the title screen, F quick-saves, autosave after
  every finished job. Saves now keep district standing and crew.
- **HUD** — money, health, armour, weapon and ammo, wanted stars, mission
  and timer, respect, radio, dispatch feed, district standing, crew, and a
  live minimap with a route line from the player to the mission marker.

## Controls

WASD / arrows drive and walk · E steal / exit car · Click shoot · Space
punch · J jobs · C crew · B gun shop (near Ammu-Nation) · G garage (near the garage) ·
F quick-save · Q radio · M mute · P / Esc pause · 1/2/3 load a save slot.

## Play

Serve it with `node serve.ts` and open http://localhost:8080, or run
`MAKEFUN_OUTPUT_DIR=out node main.ts` to build the dossier. No network
requests, no libraries — plain ES modules and canvas, all sound synthesised.

## Files

- `game/src/config.js` — tuning, districts, cars, weapons, radio, chapters, crew, standing
- `game/src/rng.js` — seeded random (the same seed builds the same city) + shuffle / clamp helpers
- `game/src/city.js` — roads, blocks, buildings, props, traffic lights, district lookup
- `game/src/actors.js` — player, pedestrians, traffic, SBPD, combat, crew ally, car damage
- `game/src/missions.js` — the twelve jobs in three chapters, race rules, Repo Run identity fix
- `game/src/economy.js` — money, respect, district standing, crew, shops, garage, saves
- `game/src/audio.js` — synthesised radio (5 stations), engine, siren, effects, crew cue
- `game/src/input.js` — keyboard and mouse (incl. C crew key)
- `game/src/render.js` — camera, world, HUD, minimap route line, damage smoke, menus
- `game/src/shots.js` — the four staged screenshot scenes
- `game/src/main.js` — boot, loop, screens, debug hooks
