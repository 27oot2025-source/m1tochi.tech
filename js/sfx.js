/* ============================================================
   ВОЛЬТГРАД-88 · звуки интерфейса (Web-Audio)
   ============================================================ */
window.SFX = (function () {
  let ctx = null, master = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    const c = ac();
    if (!c || !enabled) return;
    const t = c.currentTime + (when || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, when, hp) {
    const c = ac();
    if (!c || !enabled) return;
    const t = c.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(vol || 0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = src;
    if (hp) {
      const f = c.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = hp;
      src.connect(f); node = f;
    }
    node.connect(g); g.connect(master);
    src.start(t);
  }

  return {
    enabled,
    get ctx() { return ctx; },
    get master() { return master; },
    getAC() { return ac(); },
    setEnabled(v) { enabled = !!v; },
    unlock() { ac(); },
    // --- эффекты ---
    boot() { tone(180, 0.25, 'sawtooth', 0.12, 0, 60); tone(720, 0.1, 'square', 0.08, 0.3); },
    nav() { tone(880, 0.05, 'square', 0.07); tone(1320, 0.05, 'square', 0.05, 0.05); },
    hover() { tone(1600, 0.02, 'sine', 0.03); },
    buy() { tone(660, 0.09, 'square', 0.12, 0); tone(880, 0.09, 'square', 0.12, 0.09); tone(1320, 0.16, 'square', 0.12, 0.18); },
    error() { tone(160, 0.2, 'sawtooth', 0.14, 0, 80); },
    unlock() { tone(523, 0.1, 'triangle', 0.14, 0); tone(659, 0.1, 'triangle', 0.14, 0.1); tone(784, 0.1, 'triangle', 0.14, 0.2); tone(1046, 0.3, 'triangle', 0.16, 0.3); },
    secret() { tone(220, 0.3, 'sawtooth', 0.1, 0, 440); tone(440, 0.3, 'sawtooth', 0.08, 0.1, 880); noise(0.4, 0.04, 0.2, 3000); },
    scan() { for (let i = 0; i < 8; i++) tone(400 + i * 140, 0.03, 'square', 0.05, i * 0.04); },
    decode() { for (let i = 0; i < 14; i++) tone(200 + Math.random() * 1600, 0.03, 'square', 0.035, i * 0.05); },
    flash() { tone(80, 1.2, 'sine', 0.2, 0, 40); noise(1.2, 0.12, 0, 800); },
    tick() { tone(2000, 0.015, 'square', 0.02); },
    playStart() { tone(440, 0.08, 'square', 0.1); tone(660, 0.08, 'square', 0.1, 0.08); },
    playStop() { tone(660, 0.08, 'square', 0.1); tone(440, 0.12, 'square', 0.1, 0.08); },
  };
})();
