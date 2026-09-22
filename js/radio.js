/* ============================================================
   ВОЛЬТГРАД-88 · РАДИО 88.8 · синтез прямого действия
   4-дорожечный секвенсор на Web-Audio: басы, лид, драм, пады
   ============================================================ */
window.RADIO = (function () {
  let ctx = null, out = null, analyser = null, delayNode = null;
  let playing = false;
  let trackIdx = 0;
  let step = 0;              // глобальный шаг (шестнадцатые)
  let nextTime = 0;
  let timer = null;
  const LOOKAHEAD = 0.12;    // сек
  const TICK = 25;           // мс
  const STEPS = 64;          // цикл «кассеты» — 4 такта

  const D = () => VOLT.DATA.tracks;

  function noteFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function ensure() {
    const c = SFX.getAC ? SFX.getAC() : null;
    if (!c) return null;
    ctx = c;
    if (!out) {
      out = ctx.createGain();
      out.gain.value = 0.7;
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      out.connect(analyser);
      analyser.connect(ctx.destination);
      // лента-эхо для лида — «синтезатор 1987 года»
      delayNode = ctx.createDelay(1.0);
      delayNode.delayTime.value = 0.28;
      const fb = ctx.createGain(); fb.gain.value = 0.3;
      const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2400;
      delayNode.connect(damp); damp.connect(fb); fb.connect(delayNode);
      damp.connect(out);
    }
    return ctx;
  }

  function volValue() {
    const el = document.getElementById('radio-vol');
    return el ? el.value / 100 : 0.7;
  }

  function applyVol() {
    if (out) out.gain.setTargetAtTime(volValue(), ctx.currentTime, 0.05);
  }

  /* ---------- голоса ---------- */
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.25);
  }
  function snare(t) {
    const len = Math.floor(ctx.sampleRate * 0.18);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(240, t);
    og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.1);
  }
  function hat(t, open) {
    const len = Math.floor(ctx.sampleRate * (open ? 0.12 : 0.045));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7500;
    const g = ctx.createGain(); g.gain.setValueAtTime(open ? 0.22 : 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.12 : 0.045));
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t);
  }
  function bass(t, midi, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth';
    o.frequency.value = noteFreq(midi);
    f.type = 'lowpass'; f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(260, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.34, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function lead(t, midi, dur) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    const g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'square'; o2.type = 'sawtooth';
    o.frequency.value = noteFreq(midi);
    o2.frequency.value = noteFreq(midi + 7); o2.detune.value = 8;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(5200, t);
    f.frequency.exponentialRampToValueAtTime(900, t + dur * 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); o2.connect(f);
    f.connect(g);
    g.connect(out);
    g.connect(delayNode);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
  function pad(t, midis, dur) {
    midis.forEach(m => {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth';
      o.frequency.value = noteFreq(m);
      o.detune.value = (Math.random() - 0.5) * 14;
      f.type = 'lowpass'; f.frequency.value = 1400;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f); f.connect(g); g.connect(out);
      o.start(t); o.stop(t + dur + 0.1);
    });
  }

  /* ---------- секвенсор ---------- */
  function scheduleStep(stepIdx, when) {
    const tr = D()[trackIdx];
    const s16 = stepIdx % 16;
    const stepDur = 60 / tr.bpm / 4;

    if (tr.kick.includes(s16)) kick(when);
    if (tr.snare.includes(s16)) snare(when);
    if (tr.hat.includes(s16)) hat(when, s16 % 4 === 2);

    const b = tr.bass[s16];
    if (b >= 0) bass(when, tr.root - 12 + b, stepDur * (tr.bpm > 110 ? 1.8 : 2.4));

    const l = tr.lead[s16];
    if (l >= 0) lead(when, tr.root + 12 + l, stepDur * 1.9);

    if (s16 === 0) pad(when, tr.padChord.map(c => tr.root + 12 + c), stepDur * 16);
  }

  function tickLoop() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      scheduleStep(step, nextTime);
      const stepDur = 60 / D()[trackIdx].bpm / 4;
      nextTime += stepDur;
      step++;
    }
  }

  function onStepUI() {
    const el = document.getElementById('radio-now');
    if (el && playing) {
      const tr = D()[trackIdx];
      el.textContent = '♪ ' + tr.name + ' — ' + tr.key;
    }
    document.querySelectorAll('.rt').forEach((n, i) => n.classList.toggle('active', i === trackIdx && playing));
  }

  /* ---------- публичное API ---------- */
  return {
    get playing() { return playing; },
    get trackIdx() { return trackIdx; },
    get step() { return step; },
    get STEPS() { return STEPS; },
    getAnalyser() { return analyser; },
    getVol() { return volValue(); },

    play(i) {
      if (!ensure()) return false;
      if (i !== undefined && i !== null) { trackIdx = i % D().length; step = 0; }
      if (!playing) {
        playing = true;
        nextTime = ctx.currentTime + 0.06;
        timer = setInterval(tickLoop, TICK);
        setTimeout(onStepUI, 40);
      }
      applyVol();
      return true;
    },

    stop() {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      document.querySelectorAll('.rt').forEach(n => n.classList.remove('active'));
    },

    toggle(i) {
      if (playing && (i === undefined || i === trackIdx)) { this.stop(); return false; }
      this.play(i);
      return true;
    },

    next() { this.play((trackIdx + 1) % D().length); },
    prev() { this.play((trackIdx - 1 + D().length) % D().length); },
    setVolume() { applyVol(); },
  };
})();
