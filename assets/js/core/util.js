// ─── НЕОН-КИТЕЖ :: ядро / утилиты ────────────────────────────────────────────

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(4)) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

// ─── ГСЧ с зерном (детерминированный мир) ────────────────────────────────────
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
export const pick = (arr, r = Math.random) => arr[Math.floor(r() * arr.length)];
export const shuffle = (arr, r = Math.random) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ─── Формат ──────────────────────────────────────────────────────────────────
export const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
export const fmt2 = (n) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const pad = (n, l = 2) => String(n).padStart(l, '0');

export function gameClock(d = new Date()) {
  // Время Неон-Китежа: 2087 год, смещение от реального
  const y = 2087;
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${y} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const GLITCH = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ0123456789#@$%&*/\\|<>[]{}=+~^';
export function scramble(node, finalText, ms = 700) {
  const start = performance.now();
  const chars = finalText.split('');
  function step(now) {
    const t = clamp((now - start) / ms, 0, 1);
    const cut = Math.floor(t * chars.length);
    node.textContent = chars
      .map((c, i) => (i < cut || c === ' ' ? c : GLITCH[Math.floor(Math.random() * GLITCH.length)]))
      .join('');
    if (t < 1) requestAnimationFrame(step);
    else node.textContent = finalText;
  }
  requestAnimationFrame(step);
}

export function typeInto(node, text, speed = 14) {
  return new Promise((resolve) => {
    let i = 0;
    node.textContent = '';
    const id = setInterval(() => {
      node.textContent += text[i++] ?? '';
      if (i >= text.length) { clearInterval(id); resolve(); }
    }, speed);
  });
}

// ─── Тосты / системные сообщения ─────────────────────────────────────────────
export function toast(msg, kind = 'info', ttl = 3800) {
  let host = $('#toasts');
  if (!host) { host = el('div', { id: 'toasts' }); document.body.append(host); }
  const t = el('div', { class: `toast toast--${kind}` },
    el('span', { class: 'toast__tag', text: kind === 'bad' ? 'ОШИБКА' : kind === 'good' ? 'ОК' : kind === 'warn' ? 'ВНИМАНИЕ' : 'СИСТЕМА' }),
    el('span', { class: 'toast__msg', text: msg }));
  host.append(t);
  setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 400); }, ttl);
}

// ─── Модальное окно ──────────────────────────────────────────────────────────
export function modal(title, contentNode, actions = []) {
  const box = el('div', { class: 'modal__box' },
    el('div', { class: 'modal__bar' },
      el('span', { class: 'modal__title', text: title }),
      el('button', { class: 'modal__x', text: '✕', onclick: close })),
    el('div', { class: 'modal__body' }, contentNode),
    actions.length
      ? el('div', { class: 'modal__actions' }, actions.map((a) =>
        el('button', { class: `btn ${a.kind ? 'btn--' + a.kind : ''}`, onclick: () => { a.onClick?.(close); } }, a.label)))
      : null);
  const back = el('div', { class: 'modal' }, box);
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.append(back);
  requestAnimationFrame(() => back.classList.add('is-in'));
  function close() { back.classList.remove('is-in'); setTimeout(() => back.remove(), 250); }
  return close;
}

export function confirmBox(title, text, onYes) {
  modal(title, el('p', { class: 'p', text }), [
    { label: 'ОТМЕНА', onClick: (c) => c() },
    { label: 'ПОДТВЕРДИТЬ', kind: 'danger', onClick: (c) => { c(); onYes(); } },
  ]);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Мини-компоненты разметки ────────────────────────────────────────────────
export function panel(title, ...children) {
  return el('section', { class: 'panel' },
    el('header', { class: 'panel__head' },
      el('span', { class: 'panel__dot' }),
      el('h3', { class: 'panel__title', text: title })),
    el('div', { class: 'panel__body' }, children));
}

export function stat(label, value, hint) {
  return el('div', { class: 'stat' },
    el('div', { class: 'stat__label', text: label }),
    el('div', { class: 'stat__value', text: value }),
    hint ? el('div', { class: 'stat__hint', text: hint }) : null);
}

export function bar(value, max = 100, label = '') {
  const pct = clamp((value / max) * 100, 0, 100);
  return el('div', { class: 'bar' },
    el('div', { class: 'bar__fill', style: { width: pct + '%' } }),
    el('span', { class: 'bar__label', text: label || `${Math.round(pct)}%` }));
}

export function tagRow(tags) {
  return el('div', { class: 'tags' }, tags.map((t) => el('span', { class: 'tag', text: t })));
}

export function pageHead(kicker, title, sub) {
  return el('header', { class: 'phead' },
    el('div', { class: 'phead__kicker', text: kicker }),
    el('h1', { class: 'phead__title glitch', 'data-text': title, text: title }),
    sub ? el('p', { class: 'phead__sub', text: sub }) : null);
}
