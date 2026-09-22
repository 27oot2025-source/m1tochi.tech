// ─── НЕОН-КИТЕЖ :: синтезатор 1980-х (WebAudio, без файлов) ──────────────────
import { get } from './state.js';

let ctx = null, master = null, musicGain = null, sfxGain = null;
let seqTimer = null, playing = false, trackIdx = 0;
let audioBroken = false, pendingVolume = 0.35;

// Возвращает AudioContext или null. Звук — украшение, а не условие работы:
// если браузер не даёт WebAudio, интерфейс обязан продолжать жить.
function ac() {
  if (audioBroken) return null;
  if (!ctx) {
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) { audioBroken = true; return null; }
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = pendingVolume; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.45; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9; sfxGain.connect(master);
    } catch (e) { audioBroken = true; ctx = null; return null; }
  }
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
  return ctx;
}
export function setVolume(v) { pendingVolume = v; if (ac() && master) master.gain.value = v; }
export function unlockAudio() { ac(); }
export function audioAvailable() { return !audioBroken; }

function on() { return get().settings.sound; }

// ─── SFX ─────────────────────────────────────────────────────────────────────
function blip(freq, dur = 0.06, type = 'square', vol = 0.12, slide = 0) {
  if (!on()) return;
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g); g.connect(sfxGain); o.start(); o.stop(c.currentTime + dur + 0.02);
}

function noise(dur = 0.2, vol = 0.12, freq = 1200, q = 1) {
  if (!on()) return;
  const c = ac(); if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(sfxGain); src.start();
}

export const sfx = {
  key: () => blip(880 + Math.random() * 300, 0.025, 'square', 0.05),
  click: () => { blip(1200, 0.04, 'square', 0.1, -400); },
  nav: () => { blip(520, 0.05, 'triangle', 0.1); setTimeout(() => blip(780, 0.07, 'triangle', 0.09), 45); },
  ok: () => { [660, 880, 1320].forEach((f, i) => setTimeout(() => blip(f, 0.09, 'square', 0.09), i * 70)); },
  bad: () => { blip(180, 0.28, 'sawtooth', 0.14, -120); noise(0.25, 0.08, 400, 0.7); },
  coin: () => { blip(1046, 0.06, 'square', 0.1); setTimeout(() => blip(1568, 0.14, 'square', 0.09), 60); },
  alarm: () => { [0, 1, 2].forEach((i) => setTimeout(() => { blip(440, 0.18, 'sawtooth', 0.12, 260); }, i * 220)); },
  boot: () => { noise(0.5, 0.06, 300, 0.4); blip(110, 0.7, 'sine', 0.08, 220); },
  hit: () => { noise(0.12, 0.16, 220, 0.8); blip(90, 0.16, 'square', 0.12, -40); },
  power: () => { blip(220, 0.5, 'sawtooth', 0.1, 900); },
  type: () => blip(1500 + Math.random() * 500, 0.012, 'square', 0.03),
};

// ─── Синтвейв-секвенсор ──────────────────────────────────────────────────────
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const TRACKS = [
  {
    name: 'НОЧНОЙ ПАТРУЛЬ',  bpm: 104, root: 45,
    bass: [0, 0, 7, 0, 5, 5, 3, 3],
    lead: [12, 15, 19, 22, 19, 15, 17, 12, 12, 15, 19, 24, 22, 19, 15, 12],
    pad: [0, 5, 3, 7],
  },
  {
    name: 'ДОЖДЬ НАД КОМБИНАТОМ', bpm: 92, root: 41,
    bass: [0, 0, 3, 3, 5, 5, 7, 10],
    lead: [12, 14, 15, 19, 17, 15, 14, 12, 10, 12, 15, 17, 19, 22, 19, 15],
    pad: [0, 3, 7, 10],
  },
  {
    name: 'ЗЕРКАЛО ГОВОРИТ', bpm: 118, root: 48,
    bass: [0, 7, 0, 7, 3, 10, 3, 10],
    lead: [19, 22, 24, 26, 24, 22, 19, 17, 15, 17, 19, 22, 24, 22, 19, 15],
    pad: [0, 4, 7, 11],
  },
  {
    name: 'ПЕПЕЛЬНЫЙ РАССВЕТ', bpm: 84, root: 43,
    bass: [0, 0, 0, 5, 3, 3, 7, 7],
    lead: [12, 12, 15, 17, 19, 17, 15, 12, 10, 12, 14, 15, 17, 15, 12, 10],
    pad: [0, 5, 9, 12],
  },
];
export function trackName() { return TRACKS[trackIdx].name; }
export function trackList() { return TRACKS.map((t) => t.name); }
export function isPlaying() { return playing; }

let step = 0;
function tick() {
  const c = ac(); if (!c) { playing = false; return; }
  const t = TRACKS[trackIdx], now = c.currentTime;
  const beat = 60 / t.bpm / 2;

  // бас
  const bn = t.root + t.bass[step % t.bass.length];
  voice(N(bn), 'sawtooth', beat * 0.9, 0.22, now, 340);
  // барабан
  if (step % 4 === 0) drum(70, 0.16, 0.5);
  if (step % 8 === 4) snare();
  if (step % 2 === 1) hat();
  // лид
  if (step % 2 === 0) {
    const ln = t.root + 12 + t.lead[(step / 2) % t.lead.length];
    voice(N(ln), 'square', beat * 1.4, 0.075, now + 0.01, 2600, true);
  }
  // пад раз в такт
  if (step % 8 === 0) {
    const chord = t.pad.map((i) => N(t.root + 12 + i));
    chord.forEach((f) => voice(f, 'triangle', beat * 7, 0.035, now, 1400));
  }
  step++;
  seqTimer = setTimeout(tick, beat * 1000);
}

function voice(freq, type, dur, vol, at, cutoff = 1200, delay = false) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = type; o.frequency.value = freq;
  f.type = 'lowpass'; f.frequency.setValueAtTime(cutoff, at);
  f.frequency.exponentialRampToValueAtTime(Math.max(160, cutoff * 0.35), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(f); f.connect(g); g.connect(musicGain);
  if (delay) {
    const dl = c.createDelay(); dl.delayTime.value = 0.28;
    const fb = c.createGain(); fb.gain.value = 0.33;
    const wet = c.createGain(); wet.gain.value = 0.5;
    g.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(musicGain);
  }
  o.start(at); o.stop(at + dur + 0.05);
}
function drum(freq, dur, vol) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(freq * 2.6, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, c.currentTime + dur);
  g.gain.setValueAtTime(vol, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  o.connect(g); g.connect(musicGain); o.start(); o.stop(c.currentTime + dur + 0.02);
}
function snare() {
  const c = ac(); if (!c) return;
  const len = Math.floor(c.sampleRate * 0.18);
  const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400;
  const g = c.createGain(); g.gain.value = 0.16;
  s.connect(f); f.connect(g); g.connect(musicGain); s.start();
}
function hat() {
  const c = ac(); if (!c) return;
  const len = Math.floor(c.sampleRate * 0.05);
  const b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
  const g = c.createGain(); g.gain.value = 0.05;
  s.connect(f); f.connect(g); g.connect(musicGain); s.start();
}

export function musicStart() {
  if (playing) return;
  if (!ac()) return;           // без звукового движка эфир просто не включится
  playing = true; step = 0; tick();
  window.dispatchEvent(new Event('radio:change'));
}
export function musicStop() { playing = false; clearTimeout(seqTimer); window.dispatchEvent(new Event('radio:change')); }
export function musicToggle() { playing ? musicStop() : musicStart(); return playing; }
export function nextTrack(i) {
  trackIdx = i === undefined ? (trackIdx + 1) % TRACKS.length : i % TRACKS.length;
  step = 0;
  window.dispatchEvent(new Event('radio:change'));
  return TRACKS[trackIdx].name;
}
export function getTrackIdx() { return trackIdx; }
