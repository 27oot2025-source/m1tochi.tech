// ─── НЕОН-КИТЕЖ :: оболочка и маршрутизация ──────────────────────────────────
import { el, $, $$, toast, fmt, gameClock, modal, pick, sleep, clamp } from './core/util.js';
import { S, get, emit, subscribe, unlock, addHeat } from './core/state.js';
import { sfx, unlockAudio, setVolume, musicToggle, isPlaying, trackName, musicStart } from './core/audio.js';
import { initBgFx } from './core/bgfx.js';
import { BOOT_LINES, RUMORS, WORLD } from './data/lore.js';

import { viewWorld, viewTimeline, viewFactions, viewDistricts, viewPeople, viewCodex } from './views/world.js';
import { viewHack } from './views/hack.js';
import { viewContracts } from './views/contracts.js';
import { viewMarket, viewShop, viewInventory, tickMarket } from './views/market.js';
import { viewArcade } from './views/arcade.js';
import { viewTerminal } from './views/terminal.js';
import { viewOracle, viewRadio, viewBBS, viewMail, unreadCount } from './views/social.js';
import { viewProfile, viewSettings } from './views/profile.js';

// ── Карта разделов ───────────────────────────────────────────────────────────
export const ROUTES = [
  { g: 'ГОРОД', id: 'world', ico: '◈', name: 'НЕОН-КИТЕЖ', build: viewWorld },
  { g: 'ГОРОД', id: 'timeline', ico: '≡', name: 'ХРОНОЛОГИЯ', build: viewTimeline },
  { g: 'ГОРОД', id: 'factions', ico: '⬢', name: 'ФРАКЦИИ', build: viewFactions },
  { g: 'ГОРОД', id: 'districts', ico: '⌗', name: 'ЯРУСЫ', build: viewDistricts },
  { g: 'ГОРОД', id: 'people', ico: '☗', name: 'ДОСЬЕ', build: viewPeople },
  { g: 'ГОРОД', id: 'codex', ico: '❖', name: 'КОДЕКС', build: viewCodex },

  { g: 'РАБОТА', id: 'hack', ico: '#', name: 'ВЗЛОМ ЛЬДА', build: viewHack },
  { g: 'РАБОТА', id: 'contracts', ico: '✎', name: 'КОНТРАКТЫ', build: viewContracts },
  { g: 'РАБОТА', id: 'market', ico: '₿', name: 'БИРЖА', build: viewMarket },
  { g: 'РАБОТА', id: 'shop', ico: '⌂', name: 'МАГАЗИН', build: viewShop },
  { g: 'РАБОТА', id: 'inventory', ico: '▣', name: 'ИНВЕНТАРЬ', build: viewInventory },

  { g: 'СЕТЬ', id: 'terminal', ico: '>', name: 'ТЕРМИНАЛ', build: viewTerminal },
  { g: 'СЕТЬ', id: 'oracle', ico: '◉', name: 'ОРАКУЛ', build: viewOracle },
  { g: 'СЕТЬ', id: 'bbs', ico: '▤', name: 'БУЛЛЕТИН', build: viewBBS },
  { g: 'СЕТЬ', id: 'mail', ico: '✉', name: 'ПОЧТА', build: viewMail, badge: unreadCount },

  { g: 'ДОСУГ', id: 'arcade', ico: '◄', name: 'АРКАДА', build: viewArcade },
  { g: 'ДОСУГ', id: 'radio', ico: '♫', name: 'НОЧНАЯ ВОЛНА', build: viewRadio },

  { g: 'ВЫ', id: 'profile', ico: '☺', name: 'ПРОФИЛЬ', build: viewProfile },
  { g: 'ВЫ', id: 'settings', ico: '⚙', name: 'НАСТРОЙКИ', build: () => viewSettings(applyFx) },
];

let current = null, mainEl = null, sideEl = null;

export function go(id, push = true) {
  const r = ROUTES.find((x) => x.id === id);
  if (!r) { toast('Раздел не найден: ' + id, 'bad'); return; }
  if (current === id && mainEl.firstChild) return;
  // уведомляем старое представление
  if (mainEl.firstChild) mainEl.firstChild.dispatchEvent(new Event('view:destroy'));
  current = id;
  mainEl.innerHTML = '';
  mainEl.append(r.build());
  mainEl.scrollTop = 0;
  syncNav();
  if (push) history.replaceState(null, '', '#' + id);
  document.title = `${r.name} · НЕОН-КИТЕЖ`;
  document.body.classList.remove('nav-open');
  sfx.nav();
}

function syncNav() {
  $$('.navitem').forEach((n) => n.classList.toggle('is-active', n.dataset.id === current));
  $$('.navitem').forEach((n) => {
    const r = ROUTES.find((x) => x.id === n.dataset.id);
    const b = n.querySelector('.navitem__badge');
    const cnt = r?.badge ? r.badge() : 0;
    if (b) { if (cnt) b.textContent = cnt; else b.remove(); }
    else if (cnt) n.append(el('span', { class: 'navitem__badge', text: cnt }));
  });
}

// ── HUD ──────────────────────────────────────────────────────────────────────
function buildTop() {
  const bar = el('div', { class: 'topbar' });
  const mob = el('button', { class: 'iconbtn mobnav', text: '☰', onclick: () => document.body.classList.toggle('nav-open') });
  const hud = {
    cred: el('span', { class: 'hud__v' }), heat: el('span', { class: 'hud__v' }),
    lvl: el('span', { class: 'hud__v' }), hp: el('span', { class: 'hud__v' }),
    ryo: el('span', { class: 'hud__v' }),
  };
  const mk = (k, node, cls = '') => el('span', { class: 'hud ' + cls }, el('span', { class: 'hud__k', text: k }), node);
  const soundBtn = el('button', { class: 'iconbtn', onclick: () => {
    get().settings.sound = !get().settings.sound; emit();
    soundBtn.classList.toggle('is-on', get().settings.sound);
    soundBtn.textContent = get().settings.sound ? '♪ ЗВУК' : '♪ ТИХО';
  } }, get().settings.sound ? '♪ ЗВУК' : '♪ ТИХО');
  soundBtn.classList.toggle('is-on', get().settings.sound);
  const radioBtn = el('button', { class: 'iconbtn', onclick: () => { unlockAudio(); musicToggle(); syncRadio(); unlock('radiohead'); } }, '▶ ЭФИР');
  function syncRadio() { radioBtn.textContent = isPlaying() ? '■ ЭФИР' : '▶ ЭФИР'; radioBtn.classList.toggle('is-on', isPlaying()); }
  window.addEventListener('radio:change', syncRadio);

  bar.append(mob,
    mk('₭', hud.cred), mk('РЁ', hud.ryo, 'hud--opt'), mk('УР', hud.lvl),
    mk('ОЗ', hud.hp, 'hud--opt'), mk('НАГРЕВ', hud.heat),
    el('div', { class: 'topbar__sp' }),
    el('button', { class: 'iconbtn hud--opt', onclick: () => palette() }, '⌕ CTRL+K'),
    radioBtn, soundBtn);

  function refresh() {
    const g = get();
    hud.cred.textContent = fmt(g.credits);
    hud.ryo.textContent = g.ryo.toFixed(2);
    hud.lvl.textContent = g.level;
    hud.hp.textContent = g.hp;
    hud.heat.textContent = g.heat + '%';
    hud.heat.classList.toggle('is-hot', g.heat > 55);
  }
  subscribe(refresh); refresh(); syncRadio();
  return bar;
}

function buildSide() {
  const side = el('nav', { class: 'side' });
  const groups = [...new Set(ROUTES.map((r) => r.g))];
  groups.forEach((g) => {
    const box = el('div', { class: 'side__group' }, el('div', { class: 'side__gtitle', text: g }));
    ROUTES.filter((r) => r.g === g).forEach((r, i) => {
      box.append(el('button', { class: 'navitem', dataset: { id: r.id }, onclick: () => go(r.id) },
        el('span', { class: 'navitem__ico', text: r.ico }),
        el('span', { text: r.name })));
    });
    side.append(box);
  });
  side.append(el('div', { class: 'side__group' },
    el('div', { class: 'side__gtitle', text: 'СВЯЗЬ' }),
    el('p', { class: 'tiny dim', style: { padding: '0 9px' }, text: 'Узел m1tochi. Доступ бесплатный. Вопросов о себе узел не принимает.' })));
  return side;
}

function buildStatus() {
  const clock = el('b', {});
  const ticker = el('span', {});
  function rollTicker() {
    ticker.textContent = RUMORS.concat([
      `КУРС РЁ: ${fmt(get().market?.assets?.ryo?.price || 1800)} ₭`,
      'ПАКТ ТРЁХ КАБЕЛЕЙ ДЕЙСТВУЕТ',
      'ВЛАЖНОСТЬ 91% · ВЕТЕР НА ВЕНЦЕ 14 М/С',
    ]).sort(() => Math.random() - 0.5).join('   ◆   ');
  }
  rollTicker();
  setInterval(rollTicker, 42000);
  setInterval(() => { clock.textContent = gameClock(); }, 1000);
  clock.textContent = gameClock();
  return el('div', { class: 'status' },
    el('span', {}, 'КАБЕЛЬ-2 '), el('b', { text: 'АКТИВЕН' }),
    el('span', { class: 'status__ticker' }, ticker),
    clock);
}

// ── Эффекты / темы ───────────────────────────────────────────────────────────
export function applyFx() {
  const s = get().settings;
  document.documentElement.dataset.theme = s.theme;
  document.body.dataset.crt = s.crt ? 'on' : 'off';
  document.body.dataset.scan = s.scan ? 'on' : 'off';
  document.body.dataset.flicker = s.flicker ? 'on' : 'off';
  document.body.dataset.motion = s.motion ? 'on' : 'off';
  setVolume(s.volume);
}

// ── Командная палитра ────────────────────────────────────────────────────────
function palette() {
  const inp = el('input', { class: 'input', placeholder: 'КУДА ИДЁМ?' });
  const list = el('div', { class: 'palette' });
  const close = modal('БЫСТРЫЙ ПЕРЕХОД', el('div', {}, inp, list), []);
  function render() {
    const q = inp.value.trim().toLowerCase();
    list.innerHTML = '';
    ROUTES.filter((r) => !q || r.name.toLowerCase().includes(q) || r.id.includes(q)).forEach((r) => {
      list.append(el('button', { class: 'palette__i', onclick: () => { close(); go(r.id); } },
        el('span', { class: 'navitem__ico', text: r.ico }), el('b', { text: r.name }),
        el('span', { class: 'tiny dim', text: r.g })));
    });
  }
  inp.addEventListener('input', render);
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const f = list.querySelector('.palette__i'); f?.click(); }
  });
  render();
  setTimeout(() => inp.focus(), 60);
}

// ── Заставка загрузки ────────────────────────────────────────────────────────
async function bootScreen() {
  const out = el('pre', { class: 'boot__out' });
  const skip = el('button', { class: 'boot__skip', text: 'ПРОПУСТИТЬ [ENTER]' });
  const scr = el('div', { class: 'boot' },
    el('div', { class: 'boot__inner' },
      el('div', { class: 'boot__logo' },
        el('div', { class: 'boot__l1', text: 'НЕОН' }),
        el('div', { class: 'boot__l2', text: 'КИТЕЖ' }),
        el('div', { class: 'boot__l3', text: WORLD.year })),
      out, skip));
  document.body.append(scr);
  let skipped = false;
  const finish = () => { skipped = true; };
  skip.onclick = finish;
  const kh = (e) => { if (e.key === 'Enter' || e.key === 'Escape') finish(); };
  window.addEventListener('keydown', kh);

  sfx.boot();
  for (const line of BOOT_LINES) {
    if (skipped) break;
    out.textContent += line + '\n';
    out.scrollTop = out.scrollHeight;
    sfx.key();
    await sleep(line === 'ГОТОВ.' ? 420 : 210);
  }
  if (!skipped) await sleep(500);
  window.removeEventListener('keydown', kh);
  scr.classList.add('is-out');
  setTimeout(() => scr.remove(), 500);
}

// ── Инициализация ────────────────────────────────────────────────────────────
async function init() {
  const shell = el('div', { id: 'shell' });
  const brand = el('div', { class: 'brand' },
    el('div', { class: 'brand__mark', text: 'м.' }),
    el('div', { class: 'brand__txt', html: 'НЕОН·<b>КИТЕЖ</b>' }));
  sideEl = buildSide();
  mainEl = el('main', { class: 'main' });
  shell.append(brand, buildTop(), sideEl, mainEl, buildStatus());

  const bg = el('div', { id: 'bgfx' }, el('div', { class: 'bg-grad' }), el('div', { class: 'bg-sun' }));
  const crt = el('div', { id: 'crt' }, el('div', { class: 'crt-roll' }));
  document.body.append(bg, shell, crt);

  applyFx();
  initBgFx(bg);
  tickMarket();

  const start = (location.hash || '#world').slice(1);
  go(ROUTES.some((r) => r.id === start) ? start : 'world', false);

  if (get().settings.boot) await bootScreen();
  unlock('firstBoot');
  window.addEventListener('mail:change', syncNav);

  // горячие клавиши
  window.addEventListener('keydown', (e) => {
    const inField = /INPUT|TEXTAREA/.test(document.activeElement?.tagName);
    if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); return; }
    if (inField) return;
    if (e.key >= '1' && e.key <= '9') { const r = ROUTES[+e.key - 1]; if (r) go(r.id); }
    if (e.key.toLowerCase() === 't') go('terminal');
    if (e.key.toLowerCase() === 'm') { unlockAudio(); musicToggle(); }
    if (e.key === '?') go('settings');
  });

  // первый клик разблокирует звук
  const once = () => { unlockAudio(); window.removeEventListener('pointerdown', once); };
  window.addEventListener('pointerdown', once);

  // фоновая жизнь мира
  setInterval(() => { tickMarket(); }, 45000);
  setInterval(() => {
    if (Math.random() < 0.35) toast(pick(RUMORS), 'info', 5200);
  }, 95000);
  // нагрев медленно растёт при высокой активности
  setInterval(() => {
    if (get().heat >= 95) {
      addHeat(-30);
      S.credits = Math.max(0, Math.round(get().credits * 0.7));
      toast('КОРПНАДЗОР провёл «сопровождение до выяснения». Штраф списан, внимание сброшено до 65%.', 'bad', 8000);
    }
  }, 30000);

  console.log('%cНЕОН-КИТЕЖ 2087', 'color:#ff2ea6;font-size:20px;font-family:monospace');
  console.log('%cЕсли ты это читаешь — попробуй в терминале команду zerkalo. — м.', 'color:#7cf7ff;font-family:monospace');
}

init();
