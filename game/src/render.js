// Everything the eye sees: a camera that follows Lena, the city at dusk
// sliding into night, traffic and crowds, the SBPD closing in, the HUD with
// its minimap and dispatch feed, and the title / jobs / shop / pause screens.
import { WORLD, CARS, WEAPONS, RADIO, PALETTE, FONT, DISTRICTS, CHAPTERS, chapterFor, standingLabel } from './config.js';
import { districtAt, lightState } from './city.js';
import { rankName, rankProgress, slotSummaries, standingFor, crewUnlocked } from './economy.js';
import { missionInfo, missionCount, isJobUnlocked } from './missions.js';

const VIEW_W = 1280;
const VIEW_H = 720;
const SCALE = 0.9;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCar(ctx, x, y, angle, model, color, opts = {}) {
  const m = CARS[model];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, -m.w / 2 + 2, -m.h / 2 + 3, m.w, m.h, 6); ctx.fill();
  ctx.fillStyle = color;
  rr(ctx, -m.w / 2, -m.h / 2, m.w, m.h, 6); ctx.fill();
  ctx.fillStyle = 'rgba(20,24,36,0.9)';
  rr(ctx, -m.w * 0.18, -m.h / 2 + 3, m.w * 0.36, m.h - 6, 3); ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(m.w / 2 - 3, -m.h / 2 + 3, 2, 4);
  ctx.fillRect(m.w / 2 - 3, m.h / 2 - 7, 2, 4);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(-m.w / 2 + 1, -m.h / 2 + 3, 2, 4);
  ctx.fillRect(-m.w / 2 + 1, m.h / 2 - 7, 2, 4);
  if (opts.marked) {
    ctx.strokeStyle = '#ff5da2'; ctx.lineWidth = 2;
    ctx.strokeRect(-m.w / 2 - 4, -m.h / 2 - 4, m.w + 8, m.h + 8);
  }
  if (opts.police) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-6, -m.h / 2 + 2, 12, 3);
    const flash = Math.floor(opts.t * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#2f6fed';
    ctx.beginPath(); ctx.arc(-4, 0, 3, 0, 7); ctx.fill();
    ctx.fillStyle = flash ? '#2f6fed' : '#ff3b30';
    ctx.beginPath(); ctx.arc(4, 0, 3, 0, 7); ctx.fill();
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;

  function drawWorld(G) {
    const p = G.player;
    const camX = Math.max(VIEW_W / SCALE / 2, Math.min(WORLD.w - VIEW_W / SCALE / 2, p.x));
    const camY = Math.max(VIEW_H / SCALE / 2, Math.min(WORLD.h - VIEW_H / SCALE / 2, p.y));
    G.cam = { x: camX, y: camY };
    ctx.save();
    ctx.scale(SCALE, SCALE);
    ctx.translate(VIEW_W / SCALE / 2 - camX, VIEW_H / SCALE / 2 - camY);
    const vx0 = camX - VIEW_W / SCALE / 2 - 40, vy0 = camY - VIEW_H / SCALE / 2 - 40;
    const vx1 = camX + VIEW_W / SCALE / 2 + 40, vy1 = camY + VIEW_H / SCALE / 2 + 40;

    // Ground: grass, then water and sand.
    ctx.fillStyle = '#1d4d2e';
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
    for (const w of G.city.water) {
      ctx.fillStyle = PALETTE.water;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = 'rgba(126,224,195,0.5)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(w.x + 20, w.y + 40 + i * 90);
        ctx.lineTo(w.x + w.w - 20, w.y + 40 + i * 90);
        ctx.stroke();
      }
    }
    // Roads.
    ctx.fillStyle = PALETTE.road;
    for (const x of G.city.roadsV) ctx.fillRect(x - G.city.roadW / 2, 0, G.city.roadW, WORLD.h);
    for (const y of G.city.roadsH) ctx.fillRect(0, y - G.city.roadW / 2, WORLD.w, G.city.roadW);
    // Lane dashes.
    ctx.fillStyle = PALETTE.roadLine;
    for (const x of G.city.roadsV) for (let y = 0; y < WORLD.h; y += 60) ctx.fillRect(x - 1, y, 2, 28);
    for (const y of G.city.roadsH) for (let x = 0; x < WORLD.w; x += 60) ctx.fillRect(x, y - 1, 28, 2);
    // Crosswalks at light crossings.
    ctx.fillStyle = 'rgba(238,241,245,0.5)';
    for (const l of G.city.lights) {
      for (let i = -2; i <= 2; i += 1) {
        ctx.fillRect(l.x - 18 + i * 8, l.y - G.city.roadW / 2 + 4, 4, 12);
        ctx.fillRect(l.x - 18 + i * 8, l.y + G.city.roadW / 2 - 16, 4, 12);
      }
    }
    // Buildings with lit windows and neon.
    for (const b of G.city.buildings) {
      if (b.x > vx1 || b.x + b.w < vx0 || b.y > vy1 || b.y + b.h < vy0) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = PALETTE.roof;
      ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
      const cols = Math.max(1, Math.floor(b.w / 16));
      const rows = Math.max(1, Math.floor(b.h / 18));
      for (let cx = 0; cx < cols; cx += 1) for (let cy = 0; cy < rows; cy += 1) {
        const lit = ((cx * 7 + cy * 13 + (b.x | 0)) % 10) / 10 < b.lit;
        ctx.fillStyle = lit ? PALETTE.windowLit : PALETTE.windowDark;
        ctx.fillRect(b.x + 6 + cx * 16, b.y + 6 + cy * 18, 8, 10);
      }
      if (b.neon) {
        ctx.fillStyle = b.neon;
        ctx.fillRect(b.x, b.y - 4, b.w, 4);
        ctx.fillRect(b.x, b.y + b.h, b.w, 4);
      }
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,209,102,0.8)';
        ctx.fillRect(b.x + b.w / 2 - 2, b.y - 10, 4, 10);
        ctx.beginPath(); ctx.arc(b.x + b.w / 2, b.y - 12, 3, 0, 7); ctx.fill();
      }
    }
    // Props: palms, containers, cranes, boats, lamps, neon signs.
    for (const pr of G.city.props) {
      if (pr.x < vx0 || pr.x > vx1 || pr.y < vy0 || pr.y > vy1) continue;
      if (pr.type === 'palm') {
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + 4, pr.y - 18); ctx.stroke();
        ctx.fillStyle = '#2e7d32';
        for (let i = 0; i < 5; i += 1) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath(); ctx.ellipse(pr.x + 4 + Math.cos(a) * 10, pr.y - 20 + Math.sin(a) * 6, 12, 4, a, 0, 7); ctx.fill();
        }
      } else if (pr.type === 'container') {
        ctx.fillStyle = pr.color;
        ctx.fillRect(pr.x, pr.y, 46, 34);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(pr.x, pr.y, 46, 34);
      } else if (pr.type === 'crane') {
        ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y + 40); ctx.lineTo(pr.x, pr.y - 30); ctx.lineTo(pr.x + 60, pr.y - 30); ctx.stroke();
      } else if (pr.type === 'boat') {
        ctx.fillStyle = '#eef1f5';
        ctx.beginPath(); ctx.moveTo(pr.x, pr.y); ctx.lineTo(pr.x + 34, pr.y); ctx.lineTo(pr.x + 26, pr.y + 12); ctx.lineTo(pr.x + 8, pr.y + 12); ctx.closePath(); ctx.fill();
      } else if (pr.type === 'lamp') {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 4, 0, 7); ctx.fill();
      } else if (pr.type === 'neon') {
        ctx.fillStyle = pr.color;
        ctx.fillRect(pr.x, pr.y, 26, 8);
        ctx.fillRect(pr.x + 4, pr.y + 10, 18, 5);
      } else if (pr.type === 'sand') {
        ctx.fillStyle = PALETTE.sand;
        ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
      }
    }
    // Traffic lights.
    for (const l of G.city.lights) {
      const st = lightState(l, G.time);
      const ns = st === 'ns';
      ctx.fillStyle = '#111';
      ctx.fillRect(l.x + 26, l.y - 26, 10, 22);
      ctx.fillStyle = ns ? '#2ecc71' : '#e74c3c';
      ctx.beginPath(); ctx.arc(l.x + 31, l.y - 20, 3.5, 0, 7); ctx.fill();
      ctx.fillStyle = ns ? '#e74c3c' : '#2ecc71';
      ctx.beginPath(); ctx.arc(l.x + 31, l.y - 10, 3.5, 0, 7); ctx.fill();
    }
    // Fixed spots: safehouse, garage, gun shop.
    drawSpot(ctx, G.city.spots.safehouse, '#7ee0a3', 'SAFEHOUSE');
    drawSpot(ctx, G.city.spots.garage, '#ffd166', 'GARAGE');
    drawSpot(ctx, G.city.spots.gunshop, '#ff9f43', 'GUN SHOP');
    // Mission marker: pulsing gold ring + light column.
    if (G.mission && G.mission.marker) {
      const m = G.mission.marker;
      const pulse = 1 + Math.sin(G.time * 4) * 0.12;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r * pulse, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,209,102,0.18)';
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r * pulse, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(255,209,102,0.12)';
      ctx.fillRect(m.x - 6, m.y - 160, 12, 160);
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 15px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('▼', m.x, m.y - 66);
    }
    // Roadblocks.
    for (const b of G.roadblocks) {
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(-34, -8, 68, 16);
      ctx.fillStyle = '#fff';
      for (let i = -3; i <= 3; i += 1) ctx.fillRect(i * 10 - 3, -8, 6, 16);
      ctx.restore();
      drawCar(ctx, b.x - 44, b.y, b.angle, 5, '#2f6fed', { police: true, t: G.time });
      drawCar(ctx, b.x + 44, b.y, b.angle + Math.PI, 5, '#2f6fed', { police: true, t: G.time });
    }
    // Traffic, rivals, VIP.
    for (const c of G.traffic) drawCar(ctx, c.x, c.y, c.angle, c.model, c.color, { marked: !!c.marked });
    for (const r of G.rivals || []) drawCar(ctx, r.x, r.y, r.angle, r.model, '#e5534b');
    if (G.vip) drawCar(ctx, G.vip.x, G.vip.y, G.vip.angle, G.vip.model, '#c084fc');
    // Police cruisers + SWAT.
    for (const c of G.cops) drawCar(ctx, c.x, c.y, c.angle, c.model, c.swat ? '#1f2937' : '#2f6fed', { police: true, t: G.time });
    // Player.
    if (p.onFoot) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.stroke();
      ctx.rotate(p.angle);
      ctx.fillStyle = '#ff5da2';
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.fillRect(4, -3, 10, 6);
      ctx.restore();
      if (p.weapon > 0) {
        ctx.strokeStyle = WEAPONS[p.weapon].color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(p.angle) * 44, p.y + Math.sin(p.angle) * 44); ctx.stroke();
      }
    } else {
      drawCar(ctx, p.x, p.y, p.angle, p.car, CARS[p.car].color, { police: false });
      // Heavy damage smokes: grey puffs drifting off the bonnet, denser
      // the worse the damage (damage 50+). A garage tune clears it.
      if ((p.damage || 0) >= 50) {
        const n = Math.floor(((p.damage || 0) - 40) / 15);
        for (let i = 0; i < n; i += 1) {
          const ph = G.time * 2 + i * 2.1;
          ctx.fillStyle = `rgba(160,165,175,${0.5 + 0.12 * Math.sin(ph)})`;
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(p.angle) * 14 + Math.sin(ph) * 8, p.y + Math.sin(p.angle) * 14 - 12 - (ph % 3) * 8, 8 + (ph % 3) * 3, 0, 7);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(CARS[p.car].name.toUpperCase(), p.x, p.y - 18);
    }
    // Pedestrians, hostiles, foot cops.
    for (const ped of G.peds) {
      ctx.fillStyle = ped.shirt;
      ctx.beginPath(); ctx.arc(ped.x, ped.y, 6, 0, 7); ctx.fill();
      ctx.fillStyle = ped.color;
      ctx.beginPath(); ctx.arc(ped.x, ped.y - 3, 3.5, 0, 7); ctx.fill();
    }
    for (const h of G.hostiles) {
      ctx.fillStyle = '#e5534b';
      ctx.beginPath(); ctx.arc(h.x, h.y, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(h.x - 8, h.y - 14, 16, 3);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(h.x - 8, h.y - 14, 16 * (h.hp / 2), 3);
    }
    if (G.crewAlly) {
      const a = G.crewAlly;
      ctx.fillStyle = '#7ee0a3';
      ctx.beginPath(); ctx.arc(a.x, a.y, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 9px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('MARA', a.x, a.y - 14);
    }
    for (const f of G.footCops) {
      ctx.fillStyle = '#2f6fed';
      ctx.beginPath(); ctx.arc(f.x, f.y, 7, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('PD', f.x, f.y + 3);
    }
    // Air One + searchlight.
    if (G.heli) {
      const h = G.heli;
      ctx.fillStyle = 'rgba(255,255,200,0.10)';
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(p.x - 50, p.y - 50); ctx.lineTo(p.x + 50, p.y + 50);
      ctx.closePath(); ctx.fill();
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.fillStyle = PALETTE.heli;
      ctx.beginPath(); ctx.ellipse(0, 0, 22, 10, h.angle, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(238,241,245,0.8)'; ctx.lineWidth = 2;
      const r = h.rotor % (Math.PI * 2);
      ctx.beginPath(); ctx.moveTo(Math.cos(r) * -30, Math.sin(r) * -30); ctx.lineTo(Math.cos(r) * 30, Math.sin(r) * 30); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('AIR ONE', 0, -16);
      ctx.restore();
    }
    // Effects.
    for (const e of G.effects) {
      if (e.type === 'muzzle') {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath(); ctx.arc(e.x, e.y, 7, 0, 7); ctx.fill();
      } else if (e.type === 'crash' || e.type === 'hit') {
        ctx.fillStyle = e.type === 'crash' ? 'rgba(107,114,128,0.7)' : 'rgba(255,107,107,0.7)';
        ctx.beginPath(); ctx.arc(e.x, e.y, 10 + (0.4 - e.t) * 20, 0, 7); ctx.fill();
      }
    }
    // District label when crossing into a new one.
    const d = districtAt(p.x, p.y);
    if (G.lastDistrict !== d.name) {
      G.lastDistrict = d.name;
      G.districtFlash = 2.5;
    }
    ctx.restore();
    // Night tint.
    const night = G.clock >= 20 || G.clock < 5 ? 0.22 : G.clock >= 19 ? 0.1 : 0;
    if (night > 0) {
      ctx.fillStyle = `rgba(8,10,40,${night})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    return { camX, camY };
  }

  function drawSpot(ctx, s, color, label) {
    ctx.fillStyle = color;
    ctx.fillRect(s.x - 22, s.y - 22, 44, 44);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x - 22, s.y - 22, 44, 44);
    ctx.fillStyle = '#111';
    ctx.font = 'bold 9px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(label, s.x, s.y + 34);
  }

  function drawHUD(G) {
    const p = G.player;
    // Top-left panel: money, health, armour, weapon.
    ctx.fillStyle = 'rgba(20,24,36,0.88)';
    rr(ctx, 12, 12, 300, 86, 8); ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge; ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 22px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText('$' + p.money.toLocaleString(), 24, 40);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '13px ' + FONT;
    const w = WEAPONS[p.weapon];
    ctx.fillText(`${w.name}  •  ${p.ammo[p.weapon]} ammo`, 24, 62);
    ctx.fillStyle = '#333';
    ctx.fillRect(24, 70, 130, 8);
    ctx.fillStyle = p.health > 40 ? PALETTE.good : PALETTE.bad;
    ctx.fillRect(24, 70, 130 * (p.health / 100), 8);
    ctx.fillStyle = '#4f8ef7';
    ctx.fillRect(160, 70, 130 * (p.armor / 100), 8);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '11px ' + FONT;
    ctx.fillText('HP', 158, 66);
    ctx.fillText('ARMOUR', 158, 88);
    // Wanted stars top-centre.
    ctx.fillStyle = 'rgba(20,24,36,0.88)';
    rr(ctx, VIEW_W / 2 - 130, 12, 260, 44, 8); ctx.fill();
    ctx.font = '26px ' + FONT;
    ctx.textAlign = 'center';
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < p.wanted ? '★' : '☆';
    ctx.fillStyle = p.wanted > 0 ? '#ffd166' : PALETTE.muted;
    ctx.fillText(stars, VIEW_W / 2, 44);
    // Mission panel top-centre under the stars.
    if (G.mission) {
      ctx.fillStyle = 'rgba(20,24,36,0.88)';
      rr(ctx, VIEW_W / 2 - 220, 62, 440, 52, 8); ctx.fill();
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 14px ' + FONT;
      ctx.fillText(`JOB ${G.mission.idx + 1}/12 — ${G.mission.name.toUpperCase()}`, VIEW_W / 2, 82);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '13px ' + FONT;
      const timer = G.mission.timer > 0 ? `  •  ${Math.ceil(G.mission.timer)}s` : '';
      ctx.fillText(G.mission.text + timer, VIEW_W / 2, 102);
    } else {
      const next = G.completed.filter(Boolean).length;
      ctx.fillStyle = 'rgba(20,24,36,0.88)';
      rr(ctx, VIEW_W / 2 - 220, 62, 440, 34, 8); ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = '13px ' + FONT;
      ctx.fillText(next >= 12 ? 'All 12 jobs done — the Bay is yours' : `Jobs done ${next}/12 — press J for the jobs menu`, VIEW_W / 2, 84);
    }
    // District standing + crew, under the mission panel.
    {
      const dName = districtAt(p.x, p.y).name;
      const st = standingFor(G, dName);
      const crew = crewUnlocked(G);
      ctx.fillStyle = 'rgba(20,24,36,0.88)';
      rr(ctx, VIEW_W / 2 - 220, 120, 440, 34, 8); ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = '12px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(`${dName}: standing ${st} (${standingLabel(st)}) — shops ${st >= 60 ? 'cheaper' : st <= 30 ? 'dearer' : 'normal'} here`, VIEW_W / 2, 134);
      ctx.fillStyle = crew.length ? PALETTE.good : PALETTE.muted;
      ctx.fillText(crew.length ? `Crew: ${crew.map((c) => c.name).join(' • ')}  (C for roles)` : 'Crew: none yet — finish job 1 to recruit Rico Vega  (C)', VIEW_W / 2, 149);
    }
    // Respect + radio, bottom-left.
    ctx.fillStyle = 'rgba(20,24,36,0.88)';
    rr(ctx, 12, VIEW_H - 64, 300, 52, 8); ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 14px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(rankName(p.respect), 24, VIEW_H - 42);
    ctx.fillStyle = '#333';
    ctx.fillRect(24, VIEW_H - 34, 150, 6);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(24, VIEW_H - 34, 150 * rankProgress(p.respect), 6);
    const st = RADIO[G.audio.station];
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px ' + FONT;
    ctx.fillText(`${G.audio.muted ? 'MUTED' : '♪ ' + st.name + ' — ' + st.genre}  (Q)`, 186, VIEW_H - 30);
    // Dispatch feed, bottom-right above the minimap.
    ctx.textAlign = 'left';
    G.dispatch.forEach((d, i) => {
      ctx.fillStyle = 'rgba(20,24,36,0.8)';
      const y = VIEW_H - 190 + i * 20;
      ctx.font = '12px ' + FONT;
      const tw = ctx.measureText(d.text).width;
      rr(ctx, VIEW_W - 250 - tw, y - 14, tw + 12, 17, 4); ctx.fill();
      ctx.fillStyle = i === 0 ? '#9ecbff' : PALETTE.muted;
      ctx.fillText(d.text, VIEW_W - 244 - tw, y - 1);
    });
    // Banner.
    if (G.banner && G.banner.t > 0) {
      ctx.font = 'bold 18px ' + FONT;
      const bw = Math.min(1160, ctx.measureText(G.banner.text).width + 48);
      ctx.fillStyle = 'rgba(20,24,36,0.92)';
      rr(ctx, VIEW_W / 2 - bw / 2, VIEW_H / 2 - 130, bw, 44, 8); ctx.fill();
      ctx.fillStyle = PALETTE.gold;
      ctx.textAlign = 'center';
      ctx.fillText(G.banner.text, VIEW_W / 2, VIEW_H / 2 - 102);
    }
    // District flash.
    if (G.districtFlash > 0) {
      ctx.fillStyle = `rgba(238,241,245,${Math.min(1, G.districtFlash)})`;
      ctx.font = 'bold 30px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText(districtAt(p.x, p.y).name.toUpperCase(), VIEW_W / 2, 205);
    }
    // Controls hint.
    ctx.fillStyle = 'rgba(20,24,36,0.7)';
    ctx.font = '11px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText('WASD drive/walk • E steal/exit • Click shoot • Space punch • J jobs • B shop • G garage • F save • P pause', VIEW_W - 12, VIEW_H - 8);
  }

  function drawMinimap(G) {
    const mw = 230, mh = 172, mx = VIEW_W - mw - 12, my = 12;
    ctx.fillStyle = 'rgba(20,24,36,0.9)';
    rr(ctx, mx, my, mw, mh, 8); ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge; ctx.stroke();
    const sx = mw / WORLD.w, sy = mh / WORLD.h;
    ctx.fillStyle = '#1d4d2e';
    ctx.fillRect(mx + 4, my + 4, mw - 8, mh - 8);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(mx + 4, my + 4 + 1500 * sy, 90 * sx, mh);
    ctx.strokeStyle = 'rgba(238,241,245,0.35)';
    ctx.lineWidth = 1;
    for (const x of G.city.roadsV) { ctx.beginPath(); ctx.moveTo(mx + 4 + x * sx, my + 4); ctx.lineTo(mx + 4 + x * sx, my + mh - 4); ctx.stroke(); }
    for (const y of G.city.roadsH) { ctx.beginPath(); ctx.moveTo(mx + 4, my + 4 + y * sy); ctx.lineTo(mx + mw - 4, my + 4 + y * sy); ctx.stroke(); }
    const dot = (x, y, color, r = 3) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(mx + 4 + x * sx, my + 4 + y * sy, r, 0, 7); ctx.fill();
    };
    // Route line: dashed gold from the player to the mission marker, so
    // the objective is readable on the minimap at a glance.
    if (G.mission && G.mission.marker) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(mx + 4 + G.player.x * sx, my + 4 + G.player.y * sy);
      ctx.lineTo(mx + 4 + G.mission.marker.x * sx, my + 4 + G.mission.marker.y * sy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    dot(G.city.spots.safehouse.x, G.city.spots.safehouse.y, '#7ee0a3');
    dot(G.city.spots.garage.x, G.city.spots.garage.y, '#ffd166');
    dot(G.city.spots.gunshop.x, G.city.spots.gunshop.y, '#ff9f43');
    if (G.mission && G.mission.marker) dot(G.mission.marker.x, G.mission.marker.y, '#ffd166', 5);
    for (const c of G.cops) dot(c.x, c.y, '#4f8ef7');
    if (G.heli) dot(G.heli.x, G.heli.y, '#9aa5b1', 4);
    for (const c of G.traffic) dot(c.x, c.y, '#8b93a3', 2);
    dot(G.player.x, G.player.y, '#ff5da2', 5);
    // North arrow + district.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(`N ↑  ${districtAt(G.player.x, G.player.y).name} • standing ${standingFor(G, districtAt(G.player.x, G.player.y).name)}`, mx + 6, my + mh - 6);
  }

  function drawTitle(G) {
    ctx.fillStyle = 'rgba(10,12,24,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5da2';
    ctx.font = 'bold 64px ' + FONT;
    ctx.fillText('SOLARA BAY', VIEW_W / 2, 120);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 22px ' + FONT;
    ctx.fillText('HEAT RISING — A VICE COAST STORY', VIEW_W / 2, 152);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '15px ' + FONT;
    ctx.fillText('Lena Cruz came home to Solara Bay with a stolen car and a debt. Twelve jobs stand between her and the crown.', VIEW_W / 2, 184);
    // Save slots.
    const slots = slotSummaries();
    slots.forEach((s, i) => {
      const x = VIEW_W / 2 - 330 + i * 230;
      ctx.fillStyle = 'rgba(20,24,36,0.9)';
      rr(ctx, x, 220, 210, 86, 8); ctx.fill();
      ctx.strokeStyle = PALETTE.panelEdge; ctx.stroke();
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 15px ' + FONT;
      ctx.fillText(`SLOT ${i + 1}`, VIEW_W / 2 - 225 + i * 230, 248);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '13px ' + FONT;
      ctx.fillText(s ? `${s.jobs}/12 jobs • $${s.money.toLocaleString()}` : 'Empty — new story', VIEW_W / 2 - 225 + i * 230, 272);
      ctx.fillText(s ? rankName(s.respect) : 'Press ' + (i + 1) + ' to start', VIEW_W / 2 - 225 + i * 230, 292);
    });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px ' + FONT;
    ctx.fillText('Press 1 / 2 / 3 to load a slot — or Enter for a new story', VIEW_W / 2, 336);
    // Chapter strip: three chapters, progress per chapter.
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 14px ' + FONT;
    ctx.fillText('THREE CHAPTERS  •  ' + crewUnlocked(G).map((c) => `${c.name} (${c.role})`).join('  •  ') + (crewUnlocked(G).length ? '' : 'NO CREW YET'), VIEW_W / 2, 356);
    CHAPTERS.forEach((ch, ci) => {
      const done = ch.jobs.filter((j) => G.completed[j]).length;
      ctx.fillStyle = done === 4 ? PALETTE.good : PALETTE.muted;
      ctx.font = '13px ' + FONT;
      ctx.fillText(`${ch.title} — ${done}/4`, VIEW_W / 2 - 300 + ci * 300, 378);
    });
    // Jobs strip.
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 14px ' + FONT;
    ctx.fillText('TWELVE JOBS', VIEW_W / 2, 406);
    ctx.font = '13px ' + FONT;
    for (let i = 0; i < 12; i += 1) {
      const info = missionInfo(i);
      const x = 90 + (i % 4) * 290;
      const y = 428 + Math.floor(i / 4) * 26;
      ctx.textAlign = 'left';
      ctx.fillStyle = G.completed[i] ? PALETTE.good : PALETTE.text;
      ctx.fillText(`${G.completed[i] ? '✓' : (i + 1) + '.'} ${info.name} — $${info.payout}`, x, y);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px ' + FONT;
    ctx.fillText('6 districts • district standing • 3 crew • 8 cars • 3 guns • 5 radio stations • 5-star SBPD • garage tunes • day into night', VIEW_W / 2, 534);
    ctx.fillText('WASD drive / walk • E steal car • Click shoot • Space punch • J jobs • C crew • B gun shop • G garage • F quick-save', VIEW_W / 2, 558);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 14px ' + FONT;
    ctx.fillText('An original open-world crime game. No Rockstar assets, no real places — Solara Bay is ours.', VIEW_W / 2, 590);
  }

  function drawJobs(G) {
    ctx.fillStyle = 'rgba(10,12,24,0.8)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 30px ' + FONT;
    ctx.fillText('JOBS — PICK YOUR WORK', VIEW_W / 2, 64);
    let row = 0;
    CHAPTERS.forEach((ch, ci) => {
      const done = ch.jobs.filter((j) => G.completed[j]).length;
      const yHead = 88 + row * 36;
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 14px ' + FONT;
      ctx.fillText(`${ch.title} — ${done}/4`, VIEW_W / 2 - 380, yHead);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '12px ' + FONT;
      ctx.fillText(ch.intro, VIEW_W / 2 - 120, yHead);
      row += 1;
      for (const i of ch.jobs) {
        const info = missionInfo(i);
        const locked = !isJobUnlocked(G, i);
        const y = 88 + row * 36;
        ctx.fillStyle = G.completed[i] ? 'rgba(126,224,163,0.15)' : locked ? 'rgba(20,24,36,0.45)' : 'rgba(20,24,36,0.9)';
        rr(ctx, VIEW_W / 2 - 380, y - 16, 760, 30, 6); ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = G.completed[i] ? PALETTE.good : locked ? '#5b6474' : PALETTE.text;
        ctx.font = 'bold 15px ' + FONT;
        ctx.fillText(`${i + 1}. ${info.name} — $${info.payout}`, VIEW_W / 2 - 360, y);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = '13px ' + FONT;
        ctx.fillText(G.completed[i] ? 'DONE' : locked ? 'LOCKED — finish the earlier jobs first' : info.brief, VIEW_W / 2 - 360, y + 13);
        ctx.textAlign = 'right';
        ctx.fillStyle = PALETTE.muted;
        ctx.fillText(G.completed[i] ? '✓' : locked ? '🔒' : 'press ' + (i + 1), VIEW_W / 2 + 360, y);
        row += 1;
      }
    });
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px ' + FONT;
    const crew = crewUnlocked(G);
    ctx.fillText(crew.length ? `Crew: ${crew.map((c) => `${c.name} — ${c.role}: ${c.ability}`).join('  •  ')}` : 'Crew: none yet — finish job 1 (Rico Vega), job 2 (Dex Marlowe), job 4 (Mara Solis)', VIEW_W / 2, 648);
    ctx.fillText(`Standing: ${DISTRICTS.map((d) => `${d.name.split(' ')[0]} ${standingFor(G, d.name)}`).join('  •  ')}`, VIEW_W / 2, 668);
    ctx.fillText('Press a number to start that job • J or Esc to go back', VIEW_W / 2, 690);
  }

  function drawShop(G, kind) {
    ctx.fillStyle = 'rgba(10,12,24,0.8)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    const p = G.player;
    if (kind === 'shop') {
      ctx.fillStyle = '#ff9f43';
      ctx.font = 'bold 30px ' + FONT;
      ctx.fillText('AMMU-NATION', VIEW_W / 2, 110);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '15px ' + FONT;
      ctx.fillText(`Cash: $${p.money.toLocaleString()} — press 1/2/3 to buy, A for ammo ($120), V for armour ($300)`, VIEW_W / 2, 150);
      WEAPONS.forEach((w, i) => {
        const y = 200 + i * 60;
        ctx.fillStyle = 'rgba(20,24,36,0.9)';
        rr(ctx, VIEW_W / 2 - 300, y - 24, 600, 48, 6); ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = p.weapon === i ? PALETTE.gold : PALETTE.text;
        ctx.font = 'bold 16px ' + FONT;
        ctx.fillText(`${i + 1}. ${w.name} — $${w.price}  •  dmg ${w.damage}  •  ammo ${p.ammo[i]}`, VIEW_W / 2 - 280, y + 4);
      });
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '13px ' + FONT;
      ctx.fillText('B or Esc to leave', VIEW_W / 2, 420);
    } else {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = 'bold 30px ' + FONT;
      ctx.fillText('SOLARA GARAGE', VIEW_W / 2, 110);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '15px ' + FONT;
      ctx.fillText(p.onFoot ? 'Get in a car to tune it.' : `Your ${CARS[p.car].name} — tunes ${p.tunes}/3 (+${p.tunes * 15}% top speed)`, VIEW_W / 2, 150);
      ctx.fillText(`Cash: $${p.money.toLocaleString()} — press G to fit a tune ($${500})`, VIEW_W / 2, 180);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '13px ' + FONT;
      ctx.fillText('G or Esc to leave', VIEW_W / 2, 240);
    }
  }

  function drawBusted(G) {
    ctx.fillStyle = 'rgba(10,12,24,0.85)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 54px ' + FONT;
    ctx.fillText('BUSTED', VIEW_W / 2, 260);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '17px ' + FONT;
    ctx.fillText('The SBPD took Lena in. The Bay keeps her car — but not her story.', VIEW_W / 2, 300);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '14px ' + FONT;
    ctx.fillText(`Jobs done ${G.completed.filter(Boolean).length}/12 • $${G.player.money.toLocaleString()} • ${rankName(G.player.respect)}`, VIEW_W / 2, 330);
    ctx.fillText('Press Enter to walk out of the precinct and keep playing', VIEW_W / 2, 380);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10,12,24,0.7)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 40px ' + FONT;
    ctx.fillText('PAUSED', VIEW_W / 2, 340);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '15px ' + FONT;
    ctx.fillText('P or Esc to keep playing', VIEW_W / 2, 380);
  }

  function draw(G, screen) {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (screen === SCREEN_TITLE) {
      drawWorld(G);
      drawTitle(G);
      return;
    }
    drawWorld(G);
    if (screen === SCREEN_PLAY) {
      drawHUD(G);
      drawMinimap(G);
      if (G.overlay === 'jobs') drawJobs(G);
      else if (G.overlay === 'shop') drawShop(G, 'shop');
      else if (G.overlay === 'garage') drawShop(G, 'garage');
    } else if (screen === SCREEN_PAUSED) { drawHUD(G); drawMinimap(G); drawPaused(); }
    else if (screen === SCREEN_BUSTED) { drawHUD(G); drawMinimap(G); drawBusted(G); }
  }

  return { draw, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BUSTED };
}
