// ─── НЕОН-КИТЕЖ :: АРКАДНЫЙ ЗАЛ «ПЕПЕЛЬНИЦА» ─────────────────────────────────
import { el, panel, pageHead, toast, fmt, clamp, rndInt } from '../core/util.js';
import { S, get, emit, addCredits, addXP, unlock } from '../core/state.js';
import { sfx } from '../core/audio.js';

export function viewArcade() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('ЯРУС 5 · СТЁКЛА · ЖЕТОН = 1 ЗАХОД', 'АРКАДА',
    'Три автомата. Собраны из списанных блоков телеметрии. Выигрыш начисляется на чип, проигрыш — на самолюбие.'));

  const best = get().arcade;
  const tabs = el('div', { class: 'shoptabs' });
  const stage = el('div', {});
  const GAMES = [
    { id: 'snake', name: 'КАБЕЛЬ', sub: `рекорд ${best.snake}`, run: gameSnake },
    { id: 'ice', name: 'ЛЕДОКОЛ', sub: `рекорд ${best.ice}`, run: gameIce },
    { id: 'pong', name: 'ШЛЮЗ-84', sub: `рекорд ${best.pong}`, run: gamePong },
  ];
  let active = 'snake';
  let cleanup = null;   // останавливает предыдущий автомат

  GAMES.forEach((g) => tabs.append(el('button', { class: 'shoptab' + (g.id === active ? ' is-on' : ''), onclick: () => { sfx.click(); active = g.id; sync(); } },
    el('b', { text: g.name }), el('span', { class: 'tiny dim', text: g.sub }))));

  function sync() {
    [...tabs.children].forEach((c, i) => c.classList.toggle('is-on', GAMES[i].id === active));
    if (cleanup) { cleanup(); cleanup = null; }
    stage.innerHTML = '';
    const built = GAMES.find((g) => g.id === active).run();
    cleanup = built.stop || null;
    stage.append(built.node);
  }
  // уход с раздела гасит таймеры и слушателей клавиатуры
  v.addEventListener('view:destroy', () => { if (cleanup) cleanup(); });
  v.append(tabs, stage);
  sync();
  return v;
}

function cabinet(title, hint, canvas, controls, scoreEl) {
  return panel(title,
    el('div', { class: 'cab' },
      el('div', { class: 'cab__screen' }, canvas),
      el('div', { class: 'cab__side' },
        scoreEl,
        el('p', { class: 'p small', text: hint }),
        controls)));
}

// ══ 1. КАБЕЛЬ (змейка) ═══════════════════════════════════════════════════════
function gameSnake() {
  const N = 22, CELL = 18;
  const cv = el('canvas', { width: N * CELL, height: N * CELL, class: 'gcanvas' });
  const ctx = cv.getContext('2d');
  const scoreEl = el('div', { class: 'gscore' }, 'СЧЁТ: 0');
  let snake, dir, food, timer = null, score = 0, speed = 110, alive = false, walls;

  function reset() {
    snake = [{ x: 10, y: 11 }, { x: 9, y: 11 }, { x: 8, y: 11 }];
    dir = { x: 1, y: 0 }; score = 0; speed = 110; alive = true;
    walls = Array.from({ length: 14 }, () => ({ x: rndInt(2, N - 3), y: rndInt(2, N - 3) }))
      .filter((w) => w.y !== 11);
    placeFood();
    scoreEl.textContent = 'СЧЁТ: 0';
  }
  function placeFood() {
    do { food = { x: rndInt(0, N - 1), y: rndInt(0, N - 1) }; }
    while (snake.some((s) => s.x === food.x && s.y === food.y) || walls.some((w) => w.x === food.x && w.y === food.y));
  }
  function step() {
    const h = { x: (snake[0].x + dir.x + N) % N, y: (snake[0].y + dir.y + N) % N };
    if (snake.some((s) => s.x === h.x && s.y === h.y) || walls.some((w) => w.x === h.x && w.y === h.y)) return die();
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) {
      score += 10; sfx.coin(); placeFood();
      speed = Math.max(55, speed - 3);
      clearInterval(timer); timer = setInterval(step, speed);
      scoreEl.textContent = 'СЧЁТ: ' + score;
    } else snake.pop();
    draw();
  }
  function die() {
    alive = false; clearInterval(timer); sfx.bad();
    const pay = Math.round(score * 1.4);
    addCredits(pay, 'аркада: КАБЕЛЬ'); addXP(Math.round(score / 4));
    if (score > get().arcade.snake) { get().arcade.snake = score; emit(); toast(`НОВЫЙ РЕКОРД: ${score}`, 'good'); }
    if (score >= 200) unlock('arcadeKing');
    scoreEl.innerHTML = `ОБРЫВ КАБЕЛЯ<br>СЧЁТ: ${score} · +${fmt(pay)} ₭`;
    draw(true);
  }
  function draw(dead = false) {
    ctx.fillStyle = '#05020c'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = 'rgba(124,247,255,.08)';
    for (let i = 0; i <= N; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, cv.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(cv.width, i * CELL); ctx.stroke();
    }
    ctx.fillStyle = '#3b2a5e';
    walls.forEach((w) => ctx.fillRect(w.x * CELL + 2, w.y * CELL + 2, CELL - 4, CELL - 4));
    ctx.shadowBlur = 12; ctx.shadowColor = '#ffb703'; ctx.fillStyle = '#ffb703';
    ctx.fillRect(food.x * CELL + 4, food.y * CELL + 4, CELL - 8, CELL - 8);
    snake.forEach((s, i) => {
      ctx.shadowColor = dead ? '#ff4d6d' : '#ff2ea6';
      ctx.fillStyle = dead ? '#ff4d6d' : (i === 0 ? '#7cf7ff' : '#ff2ea6');
      ctx.globalAlpha = 1 - i / (snake.length * 1.8);
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
    });
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
  function key(e) {
    const k = e.key;
    const map = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
      w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } };
    const nd = map[k];
    if (!nd || !alive) return;
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    dir = nd; e.preventDefault();
  }
  window.addEventListener('keydown', key);
  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
    if (Math.abs(dx) > Math.abs(dy)) dir = { x: Math.sign(dx), y: 0 }; else dir = { x: 0, y: Math.sign(dy) };
  });

  const start = el('button', { class: 'btn btn--wide', onclick: () => {
    sfx.power(); reset(); clearInterval(timer); timer = setInterval(step, speed); draw();
  } }, 'ВСТАВИТЬ ЖЕТОН');
  reset(); draw();
  const node = cabinet('АВТОМАТ «КАБЕЛЬ»',
    'Тяните оптоволокно по кабельной шахте. Стены — это несущие конструкции, край карты замыкается сам на себя. Управление: стрелки или WASD, на телефоне — тап по краю экрана.',
    cv, start, scoreEl);
  return { node, stop: () => { alive = false; clearInterval(timer); window.removeEventListener('keydown', key); } };
}

// ══ 2. ЛЕДОКОЛ (реакция / память) ════════════════════════════════════════════
function gameIce() {
  const W = 396, H = 396;
  const cv = el('canvas', { width: W, height: H, class: 'gcanvas' });
  const ctx = cv.getContext('2d');
  const scoreEl = el('div', { class: 'gscore' }, 'РАУНД 0');
  let seq = [], input = [], showing = false, round = 0, playing = false;
  const PADS = [
    { x: 18, y: 18, c: '#ff2ea6', f: 320 }, { x: 206, y: 18, c: '#7cf7ff', f: 400 },
    { x: 18, y: 206, c: '#39ff88', f: 480 }, { x: 206, y: 206, c: '#ffb703', f: 560 },
  ];
  const SZ = 172;
  let lit = -1;

  function draw() {
    ctx.fillStyle = '#04020a'; ctx.fillRect(0, 0, W, H);
    PADS.forEach((p, i) => {
      const on = lit === i;
      ctx.globalAlpha = on ? 1 : 0.32;
      ctx.shadowBlur = on ? 28 : 0; ctx.shadowColor = p.c;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, SZ, SZ);
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.strokeRect(p.x, p.y, SZ, SZ);
    });
    ctx.fillStyle = '#04020a'; ctx.fillRect(W / 2 - 42, H / 2 - 22, 84, 44);
    ctx.strokeStyle = 'rgba(124,247,255,.4)'; ctx.strokeRect(W / 2 - 42, H / 2 - 22, 84, 44);
    ctx.fillStyle = '#7cf7ff'; ctx.font = '16px monospace'; ctx.textAlign = 'center';
    ctx.fillText(playing ? 'R' + round : 'ЛЁД', W / 2, H / 2 + 6);
  }
  async function flash(i, ms = 380) {
    lit = i; draw();
    const p = PADS[i];
    beep(p.f);
    await new Promise((r) => setTimeout(r, ms));
    lit = -1; draw();
    await new Promise((r) => setTimeout(r, 110));
  }
  function beep(f) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || !get().settings.sound) return;
      const c = new AC(), o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = f; g.gain.value = 0.07;
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.22);
      setTimeout(() => c.close(), 400);
    } catch (e) {}
  }
  async function nextRound() {
    round++; scoreEl.textContent = 'РАУНД ' + round;
    seq.push(rndInt(0, 3)); input = []; showing = true;
    await new Promise((r) => setTimeout(r, 480));
    for (const i of seq) await flash(i, Math.max(190, 400 - round * 14));
    showing = false;
  }
  cv.addEventListener('pointerdown', async (e) => {
    if (!playing || showing) return;
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W, y = ((e.clientY - r.top) / r.height) * H;
    const idx = PADS.findIndex((p) => x >= p.x && x <= p.x + SZ && y >= p.y && y <= p.y + SZ);
    if (idx < 0) return;
    await flash(idx, 160);
    input.push(idx);
    const i = input.length - 1;
    if (input[i] !== seq[i]) return lose();
    if (input.length === seq.length) nextRound();
  });
  function lose() {
    playing = false; sfx.bad();
    const score = (round - 1) * 20;
    const pay = score * 3;
    addCredits(pay, 'аркада: ЛЕДОКОЛ'); addXP(score / 2);
    if (round - 1 > get().arcade.ice) { get().arcade.ice = round - 1; emit(); toast(`НОВЫЙ РЕКОРД: ${round - 1} раундов`, 'good'); }
    if (round >= 10) unlock('arcadeKing');
    scoreEl.innerHTML = `ЛЁД ВЫДЕРЖАЛ<br>РАУНДОВ: ${round - 1} · +${fmt(pay)} ₭`;
    draw();
  }
  const start = el('button', { class: 'btn btn--wide', onclick: () => {
    sfx.power(); seq = []; input = []; round = 0; playing = true; nextRound();
  } }, 'ВСТАВИТЬ ЖЕТОН');
  draw();
  const node = cabinet('АВТОМАТ «ЛЕДОКОЛ»',
    'Защитный контур показывает последовательность импульсов. Повторите её. С каждым раундом ЛЁД думает быстрее, а вы — нет. Кликайте по секторам.',
    cv, start, scoreEl);
  return { node, stop: () => { playing = false; showing = false; } };
}

// ══ 3. ШЛЮЗ-84 (понг против ИИ) ══════════════════════════════════════════════
function gamePong() {
  const W = 420, H = 300;
  const cv = el('canvas', { width: W, height: H, class: 'gcanvas' });
  const ctx = cv.getContext('2d');
  const scoreEl = el('div', { class: 'gscore' }, '0 : 0');
  let py = H / 2 - 30, ay = H / 2 - 30, bx = W / 2, by = H / 2, vx = 4, vy = 2.4;
  let ps = 0, as = 0, raf = null, running = false;
  const PH = 62, PW = 8;

  function reset(dir = 1) { bx = W / 2; by = H / 2; vx = 4 * dir; vy = (Math.random() * 3 - 1.5) || 2; }
  function loop() {
    if (!running) return;
    bx += vx; by += vy;
    if (by < 5 || by > H - 5) { vy *= -1; sfx.key(); }
    // игрок слева
    if (bx < 24 && bx > 14 && by > py && by < py + PH) { vx = Math.abs(vx) * 1.045; vy += (by - (py + PH / 2)) * 0.05; sfx.click(); }
    if (bx > W - 24 && bx < W - 14 && by > ay && by < ay + PH) { vx = -Math.abs(vx) * 1.045; vy += (by - (ay + PH / 2)) * 0.05; sfx.click(); }
    if (bx < 0) { as++; sfx.bad(); reset(1); update(); }
    if (bx > W) { ps++; sfx.coin(); reset(-1); update(); }
    // ИИ
    const target = by - PH / 2 + (Math.random() - 0.5) * 22;
    ay += clamp(target - ay, -4.6, 4.6);
    ay = clamp(ay, 0, H - PH);
    draw();
    if (ps >= 7 || as >= 7) return end();
    raf = requestAnimationFrame(loop);
  }
  function update() { scoreEl.textContent = `${ps} : ${as}`; }
  function end() {
    running = false; cancelAnimationFrame(raf);
    const win = ps > as;
    const pay = win ? 900 + ps * 60 : 120;
    addCredits(pay, 'аркада: ШЛЮЗ-84'); addXP(win ? 60 : 12);
    if (win) { sfx.ok(); if (ps - as > get().arcade.pong) { get().arcade.pong = ps - as; emit(); } }
    else sfx.bad();
    scoreEl.innerHTML = `${win ? 'ШЛЮЗ ОТКРЫТ' : 'ШЛЮЗ ДЕРЖИТ'}<br>${ps}:${as} · +${fmt(pay)} ₭`;
  }
  function draw() {
    ctx.fillStyle = '#04020a'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(124,247,255,.25)'; ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke(); ctx.setLineDash([]);
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#7cf7ff'; ctx.fillStyle = '#7cf7ff'; ctx.fillRect(14, py, PW, PH);
    ctx.shadowColor = '#ff2ea6'; ctx.fillStyle = '#ff2ea6'; ctx.fillRect(W - 22, ay, PW, PH);
    ctx.shadowColor = '#ffb703'; ctx.fillStyle = '#ffb703'; ctx.fillRect(bx - 4, by - 4, 8, 8);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(217,230,255,.25)'; ctx.font = '40px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`${ps}  ${as}`, W / 2, 44);
  }
  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    py = clamp(((e.clientY - r.top) / r.height) * H - PH / 2, 0, H - PH);
  });
  function key(e) {
    if (e.key === 'ArrowUp' || e.key === 'w') { py = clamp(py - 24, 0, H - PH); e.preventDefault(); }
    if (e.key === 'ArrowDown' || e.key === 's') { py = clamp(py + 24, 0, H - PH); e.preventDefault(); }
  }
  window.addEventListener('keydown', key);
  const start = el('button', { class: 'btn btn--wide', onclick: () => {
    sfx.power(); ps = 0; as = 0; update(); reset(1); running = true; loop();
  } }, 'ВСТАВИТЬ ЖЕТОН');
  draw();
  const node = cabinet('АВТОМАТ «ШЛЮЗ-84»',
    'Тренажёр операторов затопленного шлюза №2, выпуск 1984 года. Игра до семи. Управление — мышь или стрелки. Победа оплачивается заметно лучше поражения.',
    cv, start, scoreEl);
  return { node, stop: () => { running = false; cancelAnimationFrame(raf); window.removeEventListener('keydown', key); } };
}
