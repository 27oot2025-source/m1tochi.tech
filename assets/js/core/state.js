// ─── НЕОН-КИТЕЖ :: состояние рантайма ────────────────────────────────────────
import { toast, clamp } from './util.js';

const KEY = 'neonkitezh.save.v1';

const DEFAULTS = () => ({
  version: 1,
  createdAt: Date.now(),
  handle: 'ГОСТЬ-00',
  sin: '',
  credits: 1850,
  ryo: 0,            // «рё» — крипта синдикатов
  heat: 8,           // внимание КОРПНАДЗОРА, 0..100
  rep: { pepel: 12, kombinat: 5, zerkalo: 0, sindikat: 3, mitochi: 0 },
  xp: 0,
  level: 1,
  hp: 100,
  ram: 6,
  inventory: {},     // id -> qty
  implants: [],      // id[]
  contracts: { done: [], failed: [], active: null },
  hacks: { runs: 0, wins: 0, best: 0 },
  arcade: { snake: 0, ice: 0, pong: 0 },
  mail: { read: [], deleted: [] },
  bbs: [],           // пользовательские посты
  codexSeen: [],
  achievements: [],
  market: null,      // состояние биржи
  settings: {
    theme: 'neon', crt: true, scan: true, flicker: true, sound: true,
    volume: 0.35, motion: true, boot: true,
  },
  log: [],
});

let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const parsed = JSON.parse(raw);
    return deepMerge(DEFAULTS(), parsed);
  } catch (e) { return DEFAULTS(); }
}

function deepMerge(base, over) {
  if (Array.isArray(base)) return Array.isArray(over) ? over : base;
  if (typeof base !== 'object' || base === null) return over === undefined ? base : over;
  const out = { ...base };
  for (const k of Object.keys(base)) {
    if (over && k in over) out[k] = deepMerge(base[k], over[k]);
  }
  for (const k of Object.keys(over || {})) if (!(k in out)) out[k] = over[k];
  return out;
}

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* переполнение */ }
  }, 180);
}

export const S = new Proxy({}, {
  get: (_, k) => state[k],
  set: (_, k, v) => { state[k] = v; emit(); return true; },
});

export function get() { return state; }
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
export function emit() { save(); subs.forEach((f) => f(state)); }

export function reset() {
  state = DEFAULTS();
  localStorage.removeItem(KEY);
  emit();
}

export function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
export function importSave(str) {
  try {
    const obj = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    state = deepMerge(DEFAULTS(), obj); emit(); return true;
  } catch (e) { return false; }
}

// ─── Экономика и прогресс ────────────────────────────────────────────────────
export function addCredits(n, reason = '') {
  state.credits = Math.max(0, state.credits + n);
  logEvent(`${n >= 0 ? '+' : ''}${n} ₭  ${reason}`);
  emit();
}
export function spend(n) {
  if (state.credits < n) { toast('Недостаточно кредитов на чипе.', 'bad'); return false; }
  state.credits -= n; emit(); return true;
}
export function addRyo(n) { state.ryo = Math.max(0, +(state.ryo + n).toFixed(4)); emit(); }

export function addHeat(n) {
  state.heat = clamp(state.heat + n, 0, 100);
  if (state.heat >= 90) toast('КОРПНАДЗОР: зафиксирован ваш след. Уровень угрозы критический.', 'bad');
  else if (n > 0 && state.heat >= 60) toast('Внимание КОРПНАДЗОРА растёт.', 'warn');
  emit();
}

export const LEVELS = [0, 120, 320, 640, 1100, 1750, 2600, 3700, 5200, 7200, 9800];
export function addXP(n) {
  state.xp += n;
  let lvl = 1;
  for (let i = 0; i < LEVELS.length; i++) if (state.xp >= LEVELS[i]) lvl = i + 1;
  if (lvl > state.level) {
    state.level = lvl;
    state.ram += 1;
    toast(`УРОВЕНЬ ДЕКЕРА ${lvl}. Доступно ОЗУ: ${state.ram} слотов.`, 'good');
    unlock('level' + lvl, `Уровень ${lvl}`);
  }
  emit();
}

export function addRep(faction, n) {
  if (!(faction in state.rep)) state.rep[faction] = 0;
  state.rep[faction] = clamp(state.rep[faction] + n, -100, 100);
  emit();
}

export function addItem(id, qty = 1) {
  state.inventory[id] = (state.inventory[id] || 0) + qty;
  if (state.inventory[id] <= 0) delete state.inventory[id];
  emit();
}
export function hasItem(id, qty = 1) { return (state.inventory[id] || 0) >= qty; }

export function logEvent(text) {
  state.log.unshift({ t: Date.now(), text });
  state.log = state.log.slice(0, 220);
}

export const ACHIEVEMENTS = {
  firstBoot: 'Первая загрузка',
  firstHack: 'Первый взлом',
  iceBreaker: 'Ледокол',
  ghost: 'Призрак сети',
  rich: 'Миллионер трущоб',
  chromed: 'Полный хром',
  lorehound: 'Архивная крыса',
  trader: 'Биржевой хищник',
  oracle: 'Слушающий Зеркало',
  contractor: 'Профессионал',
  arcadeKing: 'Король аркад',
  broke: 'Пустой чип',
  level5: 'Уровень 5',
  radiohead: 'Ночная волна',
};
export function unlock(id, label) {
  if (state.achievements.includes(id)) return;
  state.achievements.push(id);
  toast(`ДОСТИЖЕНИЕ: ${ACHIEVEMENTS[id] || label || id}`, 'good', 5000);
  emit();
}

// автосохранение при уходе
window.addEventListener('beforeunload', () => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
});
