// ─── НЕОН-КИТЕЖ :: фоновая графика на canvas ─────────────────────────────────
import { get } from './state.js';

export function initBgFx(host) {
  const cv = document.createElement('canvas');
  host.append(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, t = 0, raf;
  const drops = [];
  const sky = [];

  function accent() {
    const s = getComputedStyle(document.documentElement);
    return {
      a: s.getPropertyValue('--accent').trim() || '#ff2ea6',
      b: s.getPropertyValue('--accent2').trim() || '#7cf7ff',
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = window.innerWidth * dpr;
    H = cv.height = window.innerHeight * dpr;
    cv.style.width = window.innerWidth + 'px';
    cv.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = window.innerWidth; H = window.innerHeight;
    drops.length = 0;
    const n = Math.min(140, Math.floor(W / 9));
    for (let i = 0; i < n; i++) drops.push({ x: Math.random() * W, y: Math.random() * H, v: 2 + Math.random() * 6, l: 8 + Math.random() * 22, o: 0.06 + Math.random() * 0.2 });
    sky.length = 0;
    let x = 0;
    while (x < W + 60) {
      const w = 26 + Math.random() * 70;
      const h = 40 + Math.random() * 180;
      sky.push({ x, w, h, lit: Math.random() > 0.35, rows: Math.floor(h / 14), cols: Math.floor(w / 12) });
      x += w + 6 + Math.random() * 14;
    }
  }

  function draw() {
    t += 0.012;
    const { a, b } = accent();
    ctx.clearRect(0, 0, W, H);
    const horizon = H * 0.66;

    // ── силуэт города
    ctx.save();
    sky.forEach((s, i) => {
      const depth = (i % 3) / 3;
      const bh = s.h * (0.6 + depth * 0.5);
      const y = horizon - bh;
      ctx.fillStyle = `rgba(4,2,10,${0.85 - depth * 0.25})`;
      ctx.fillRect(s.x, y, s.w, bh);
      ctx.strokeStyle = hexA(b, 0.1 + depth * 0.05);
      ctx.lineWidth = 1;
      ctx.strokeRect(s.x + .5, y + .5, s.w - 1, bh - 1);
      // окна
      if (s.lit) {
        for (let r = 0; r < s.rows; r++) {
          for (let c = 0; c < s.cols; c++) {
            const seed = Math.sin(i * 12.9 + r * 4.1 + c * 7.3) * 43758.5453;
            const on = (seed - Math.floor(seed)) > 0.68;
            if (!on) continue;
            const flick = Math.sin(t * 3 + i + r * 0.7) > 0.93 ? 0.15 : 0.55;
            ctx.fillStyle = hexA((r + c) % 7 === 0 ? a : b, flick * (0.5 + depth * 0.2));
            ctx.fillRect(s.x + 5 + c * 12, y + 6 + r * 14, 5, 7);
          }
        }
      }
    });
    ctx.restore();

    // ── неоновая сетка-горизонт
    ctx.save();
    ctx.strokeStyle = hexA(a, 0.22);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizon); ctx.lineTo(W, horizon); ctx.stroke();
    // вертикали в перспективе
    const vx = W / 2;
    for (let i = -22; i <= 22; i++) {
      const xEnd = vx + i * (W / 12);
      ctx.strokeStyle = hexA(i % 4 === 0 ? b : a, 0.12);
      ctx.beginPath(); ctx.moveTo(vx + i * 6, horizon); ctx.lineTo(xEnd, H); ctx.stroke();
    }
    // горизонтали с движением
    for (let i = 0; i < 16; i++) {
      const p = ((i + (t * 0.55) % 1) / 16) ** 2.6;
      const y = horizon + p * (H - horizon);
      ctx.strokeStyle = hexA(b, 0.06 + p * 0.16);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.restore();

    // ── дождь (вверх — конденсат снизу, как в лоре)
    ctx.save();
    ctx.lineWidth = 1;
    drops.forEach((d) => {
      const up = d.y > horizon;
      ctx.strokeStyle = hexA(b, d.o);
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + (up ? 0.6 : 1.4), d.y + (up ? -d.l * 0.6 : d.l));
      ctx.stroke();
      d.y += up ? -d.v * 0.5 : d.v;
      if (d.y > H) d.y = -20;
      if (d.y < -30) { d.y = H * (0.66 + Math.random() * 0.34); d.x = Math.random() * W; }
    });
    ctx.restore();

    raf = requestAnimationFrame(draw);
  }

  function hexA(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
  return { stop: () => cancelAnimationFrame(raf) };
}
