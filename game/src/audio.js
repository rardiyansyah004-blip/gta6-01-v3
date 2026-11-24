// All sound is synthesised in the browser: five radio stations as looping
// WebAudio patterns (bass + lead + hats, each in its own scale and tempo),
// an engine hum that follows the car's speed, a two-tone siren while wanted,
// and short bleeps for shots, pickups, crashes, crew joins and chapter intros.
// No audio files, no network.
import { RADIO } from './config.js';

export function createAudio() {
  const A = {
    ctx: null, station: 0, muted: false, step: 0, nextNote: 0,
    engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null,
    ensure() {
      if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
      try {
        A.ctx = new (window.AudioContext || window.webkitAudioContext)();
        A.master = A.ctx.createGain();
        A.master.gain.value = 0.5;
        A.master.connect(A.ctx.destination);
        A.engineOsc = A.ctx.createOscillator();
        A.engineOsc.type = 'sawtooth';
        A.engineOsc.frequency.value = 55;
        A.engineGain = A.ctx.createGain();
        A.engineGain.gain.value = 0;
        A.engineOsc.connect(A.engineGain);
        A.engineGain.connect(A.master);
        A.engineOsc.start();
        A.sirenOsc = A.ctx.createOscillator();
        A.sirenOsc.type = 'triangle';
        A.sirenOsc.frequency.value = 700;
        A.sirenGain = A.ctx.createGain();
        A.sirenGain.gain.value = 0;
        A.sirenOsc.connect(A.sirenGain);
        A.sirenGain.connect(A.master);
        A.sirenOsc.start();
      } catch { A.ctx = null; }
    },
    stationInfo() { return RADIO[A.station]; },
    nextStation() { A.station = (A.station + 1) % RADIO.length; A.step = 0; },
    toggleMute() { A.muted = !A.muted; if (A.master) A.master.gain.value = A.muted ? 0 : 0.5; },
    blip(freq, dur, type, vol) {
      if (!A.ctx || A.muted) return;
      try {
        const o = A.ctx.createOscillator();
        const g = A.ctx.createGain();
        o.type = type || 'square';
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol || 0.12, A.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, A.ctx.currentTime + dur);
        o.connect(g); g.connect(A.master);
        o.start(); o.stop(A.ctx.currentTime + dur);
      } catch {}
    },
    shot() { A.blip(180, 0.09, 'square', 0.16); },
    pickup() { A.blip(660, 0.12, 'sine', 0.14); A.blip(990, 0.16, 'sine', 0.12); },
    // Crew cue: a rising two-note chime when a crew member joins, plus a
    // low chapter sting for chapter intros (played from the banner code).
    crewCue() { A.blip(523, 0.14, 'triangle', 0.16); setTimeout(() => A.blip(784, 0.22, 'triangle', 0.16), 140); },
    chapterSting() { A.blip(196, 0.3, 'sawtooth', 0.12); setTimeout(() => A.blip(294, 0.4, 'sawtooth', 0.12), 180); },
    crash() { A.blip(70, 0.25, 'sawtooth', 0.2); },
    fail() { A.blip(220, 0.3, 'sawtooth', 0.14); A.blip(160, 0.4, 'sawtooth', 0.14); },
    tick(G, dt) {
      if (!A.ctx || A.muted) return;
      const p = G.player;
      // Engine follows speed; siren wails while wanted.
      if (A.engineGain) A.engineGain.gain.value = p.onFoot ? 0 : 0.02 + Math.min(0.06, Math.abs(p.speed) / 6000);
      if (A.engineOsc) A.engineOsc.frequency.value = 50 + Math.abs(p.speed) * 0.12;
      if (A.sirenGain) {
        A.sirenGain.gain.value = p.wanted > 0 ? 0.018 : 0;
        if (A.sirenOsc) A.sirenOsc.frequency.value = 650 + Math.sin(G.time * 4) * 180;
      }
      // Radio sequencer: one 16th-note step per tick.
      const st = RADIO[A.station];
      const stepDur = 60 / st.bpm / 4;
      A.nextNote -= dt;
      if (A.nextNote > 0) return;
      A.nextNote = stepDur;
      const s = A.step % 16;
      A.step += 1;
      const scale = st.scale;
      const deg = scale[Math.floor(A.step / 2) % scale.length];
      const note = st.root * Math.pow(2, deg / 12) * (s % 8 === 0 ? 2 : 1);
      if (s % 4 === 0) A.note(st.root / 2, stepDur * 3.5, 'sine', 0.16); // bass
      if (s % 2 === 0) A.note(note, stepDur * 0.9, st.wave, 0.05); // lead
      if (s % 4 === 2) A.note(note * 2, stepDur * 0.5, 'square', 0.02); // sparkle
    },
    note(freq, dur, type, vol) {
      if (!A.ctx) return;
      try {
        const o = A.ctx.createOscillator();
        const g = A.ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(vol, A.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, A.ctx.currentTime + dur);
        o.connect(g); g.connect(A.master);
        o.start(); o.stop(A.ctx.currentTime + dur);
      } catch {}
    },
  };
  return A;
}
