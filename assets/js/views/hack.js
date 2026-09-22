// ─── НЕОН-КИТЕЖ :: ВЗЛОМ ЛЬДА (мини-игра на сетке) ───────────────────────────
import { el, panel, pageHead, toast, rndInt, pick, clamp, fmt, modal, shuffle } from '../core/util.js';
import { S, get, emit, addCredits, addXP, addHeat, unlock, addItem, logEvent } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { ITEMS } from '../data/items.js';

const NODES = [
  { id: 'data', ch: 'Д', name: 'ДАННЫЕ', good: true },
  { id: 'cred', ch: '₭', name: 'КРЕДИТЫ', good: true },
  { id: 'ice', ch: '#', name: 'ЛЁД', good: false },
  { id: 'trace', ch: '!', name: 'ТРАССИРОВКА', good: false },
  { id: 'root', ch: '◉', name: 'КОРЕНЬ', good: true },
  { id: 'null', ch: '·', name: 'ПУСТО', good: null },
];

const TARGETS = [
  { id: 'kiosk', name: 'ТОРГОВЫЙ КИОСК', diff: 1, size: 4, reward: 220, heat: 3, flavor: 'Автомат с фильтрами на Понтонном рынке. Защита — заводская, 2061 год.' },
  { id: 'cam', name: 'УЗЕЛ КАМЕР ЦЕХА №4', diff: 2, size: 5, reward: 560, heat: 6, flavor: 'Ферритовая память, контроллер древний. Главное — не сжечь.' },
  { id: 'bank', name: 'РАСЧЁТНЫЙ ШЛЮЗ КОМБИНАТА', diff: 3, size: 5, reward: 1300, heat: 12, flavor: 'Сюда стекается зарплата девяти цехов. Пассивный ЛЁД, но много.' },
  { id: 'kuna', name: 'КНИГА ДОЛГОВ КУНЫ', diff: 4, size: 6, reward: 2600, heat: 18, flavor: 'Синдикат не использует ЛЁД. Синдикат использует людей. И всё-таки ЛЁД тоже.' },
  { id: 'nadzor', name: 'АРХИВ КОРПНАДЗОРА', diff: 5, size: 6, reward: 4800, heat: 30, flavor: 'Белый ЛЁД. Изоляция сознания до приезда. Вы точно уверены?' },
  { id: 'zerkalo', name: 'СЛУЖЕБНЫЙ ПОРТ ЗЕРКАЛА', diff: 6, size: 7, reward: 9000, heat: 44, flavor: 'Порт не защищён. Это и пугает. Никто не знает, что считается взломом для машины, которая отражает.' },
];

let game = null;

export function viewHack() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('СЕТЕВОЙ ПРОГОН · КОНСОЛЬ ДЕКЕРА', 'ВЗЛОМ ЛЬДА',
    'Вскрывайте узлы, забирайте данные, не трогайте ЛЁД. Каждая ошибка — это шум, а шум слышит КОРПНАДЗОР.'));

  const board = el('div', { class: 'hackwrap' });
  v.append(board);
  renderMenu(board);
  return v;
}

function loadout() {
  const inv = get().inventory;
  const soft = Object.keys(inv).filter((k) => ITEMS[k]?.cat === 'soft');
  const imp = get().implants;
  return {
    extraTries: (soft.includes('soft-lom') ? 1 : 0) + (imp.includes('imp-glaz') ? 1 : 0),
    heatMul: soft.includes('soft-tihiy') ? 0.65 : 1,
    shield: soft.includes('soft-zont') ? 1 : 0,
    reveal: soft.includes('soft-morze') ? 1 : 0,
    luck: soft.includes('soft-ottepel') ? 0.15 : 0,
    ghost: soft.includes('soft-eho'),
  };
}

function renderMenu(host) {
  host.innerHTML = '';
  const lo = loadout();
  const list = el('div', { class: 'grid g2' });
  TARGETS.forEach((t) => {
    const locked = t.diff > get().level + 1;
    list.append(el('article', { class: 'target' + (locked ? ' is-locked' : '') },
      el('div', { class: 'target__head' },
        el('h3', { text: t.name }),
        el('span', { class: 'target__diff', text: '◆'.repeat(t.diff) })),
      el('p', { class: 'p small', text: t.flavor }),
      el('div', { class: 'row small' },
        el('span', { class: 'acid', text: `+${fmt(t.reward)} ₭` }),
        el('span', { class: 'badc', text: `нагрев +${t.heat}` }),
        el('span', { class: 'dim', text: `сетка ${t.size}×${t.size}` })),
      el('button', {
        class: 'btn btn--sm btn--wide', disabled: locked,
        onclick: () => { sfx.power(); startRun(host, t); },
      }, locked ? `ТРЕБУЕТСЯ УРОВЕНЬ ${t.diff - 1}` : 'НАЧАТЬ ПРОГОН')));
  });

  const stats = get().hacks;
  host.append(
    panel('СНАРЯЖЕНИЕ',
      el('div', { class: 'grid g4' },
        chipStat('ПОПЫТКИ', `+${lo.extraTries}`, 'ЛОМ-3 / ГЛАЗ'),
        chipStat('НАГРЕВ', `×${lo.heatMul}`, 'ТИХИЙ ХОД'),
        chipStat('ЩИТ', lo.shield ? 'ЕСТЬ' : 'НЕТ', 'ЗОНТ'),
        chipStat('ПОДСКАЗКА', lo.reveal ? 'ЕСТЬ' : 'НЕТ', 'МОРЗЕ-9'),
        chipStat('УДАЧА', `+${Math.round(lo.luck * 100)}%`, 'ОТТЕПЕЛЬ'),
        chipStat('ПРИЗРАК', lo.ghost ? 'ЕСТЬ' : 'НЕТ', 'ЭХО')),
      el('p', { class: 'p small', style: { marginTop: '10px' }, text: `Прогонов: ${stats.runs} · Успешных: ${stats.wins} · Рекорд за забег: ${fmt(stats.best)} ₭. Софт покупается в МАГАЗИНЕ и работает пассивно.` })),
    el('h3', { class: 'secttl', text: 'ДОСТУПНЫЕ ЦЕЛИ' }), list);
}
function chipStat(l, v, h) {
  return el('div', { class: 'stat' },
    el('div', { class: 'stat__label', text: l }),
    el('div', { class: 'stat__value', style: { fontSize: '17px' }, text: v }),
    el('div', { class: 'stat__hint', text: h }));
}

function startRun(host, target) {
  const lo = loadout();
  const n = target.size;
  const total = n * n;
  const iceCount = Math.round(total * (0.10 + target.diff * 0.028));
  const traceCount = Math.max(1, Math.round(target.diff * 0.7));
  const rootCount = 1;
  const credCount = Math.round(total * 0.12);
  const dataCount = Math.max(3, Math.round(total * 0.16));
  // для победы достаточно большей части фрагментов, а не всех до единого
  const needData = Math.max(2, Math.ceil(dataCount * 0.5));

  const cells = [];
  for (let i = 0; i < iceCount; i++) cells.push('ice');
  for (let i = 0; i < traceCount; i++) cells.push('trace');
  for (let i = 0; i < rootCount; i++) cells.push('root');
  for (let i = 0; i < credCount; i++) cells.push('cred');
  for (let i = 0; i < dataCount; i++) cells.push('data');
  while (cells.length < total) cells.push('null');
  const grid = shuffle(cells);

  // попытки масштабируются от размера сетки, иначе крупные цели непроходимы
  const baseTries = Math.round(total * 0.62) - target.diff + lo.extraTries;
  game = {
    target, n, grid, opened: new Array(total).fill(false),
    tries: Math.max(8, baseTries), maxTries: Math.max(8, baseTries),
    shield: lo.shield, luck: lo.luck, heatMul: lo.heatMul, ghost: lo.ghost,
    loot: 0, data: 0, rooted: false, over: false, revealed: lo.reveal,
  };

  host.innerHTML = '';
  const info = el('div', { class: 'hackhud' });
  const gridEl = el('div', { class: 'hgrid', style: { '--n': n } });
  const logEl = el('div', { class: 'hlog' });
  const trace = el('div', { class: 'tracebar' }, el('div', { class: 'tracebar__fill' }));

  function pushLog(txt, cls = '') {
    logEl.prepend(el('div', { class: 'hlog__line ' + cls, text: '> ' + txt }));
    while (logEl.children.length > 40) logEl.lastChild.remove();
  }

  function refresh() {
    info.innerHTML = '';
    info.append(
      el('div', {}, el('span', { class: 'tiny dim', text: 'ЦЕЛЬ ' }), el('b', { class: 'hot', text: target.name })),
      el('div', {}, el('span', { class: 'tiny dim', text: 'ПОПЫТКИ ' }), el('b', { class: game.tries <= 2 ? 'badc' : 'acid', text: game.tries })),
      el('div', {}, el('span', { class: 'tiny dim', text: 'ДОБЫЧА ' }), el('b', { class: 'cool', text: fmt(game.loot) + ' ₭' })),
      el('div', {}, el('span', { class: 'tiny dim', text: 'ДАННЫЕ ' }), el('b', { class: 'cool', text: `${game.data} / ${needData}` })),
      el('div', {}, el('span', { class: 'tiny dim', text: 'КОРЕНЬ ' }), el('b', { class: game.rooted ? 'acid' : 'dim', text: game.rooted ? 'ВЗЯТ' : '—' })),
      el('div', {}, el('span', { class: 'tiny dim', text: 'ЩИТ ' }), el('b', { class: game.shield ? 'acid' : 'dim', text: game.shield ? 'АКТИВЕН' : '—' })));
    trace.firstChild.style.width = clamp(100 - (game.tries / game.maxTries) * 100, 0, 100) + '%';
  }

  // индексы соседей по 8 направлениям
  function neighbors(i) {
    const x = i % n, y = Math.floor(i / n), out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < n && ny >= 0 && ny < n) out.push(ny * n + nx);
    }
    return out;
  }
  // приписывает к вскрытой клетке счётчик опасных соседей
  function markNear(node, i) {
    const near = neighbors(i).filter((j) => game.grid[j] === 'ice').length;
    if (near) node.append(el('sup', { class: 'hcell__n', text: near }));
  }

  function openCell(i) {
    if (game.over || game.opened[i]) return;
    game.opened[i] = true;
    const kind = game.grid[i];
    const node = gridEl.children[i];
    node.classList.add('is-open', 'k-' + kind);
    node.textContent = NODES.find((x) => x.id === kind).ch;

    if (kind === 'ice') {
      if (game.shield) {
        game.shield = 0; sfx.bad();
        node.classList.add('is-blocked');
        pushLog('ЛЁД! Зонт погасил удар. Зонт сгорел.', 'warn');
      } else {
        game.tries -= 2; sfx.hit();
        S.hp = Math.max(1, get().hp - rndInt(4, 12));
        pushLog('ЧЁРНЫЙ ЛЁД. Обратный удар по импланту. −2 попытки.', 'bad');
      }
    } else if (kind === 'trace') {
      game.tries -= 1; sfx.alarm();
      pushLog('ТРАССИРОВКА. КОРПНАДЗОР сузил область поиска.', 'bad');
    } else if (kind === 'cred') {
      const amt = Math.round(target.reward * (0.08 + Math.random() * 0.1));
      game.loot += amt; sfx.coin();
      markNear(node, i);
      pushLog(`Перехвачен перевод: +${fmt(amt)} ₭`, 'good');
    } else if (kind === 'data') {
      game.data++; sfx.ok();
      markNear(node, i);
      pushLog(`Фрагмент данных скопирован (${game.data}/${needData}).`, 'good');
    } else if (kind === 'root') {
      game.rooted = true; sfx.power();
      pushLog('КОРНЕВОЙ УЗЕЛ ВЗЯТ. Можно выходить с полной выплатой.', 'good');
    } else {
      // пустой узел — зонд: показывает, сколько ЛЬДА в соседних ячейках
      const near = neighbors(i).filter((j) => game.grid[j] === 'ice').length;
      node.textContent = near || '·';
      node.dataset.near = near;
      game.tries -= 1; sfx.click();
      pushLog(near ? `Зонд: рядом ${near} контур(ов) ЛЬДА.` : 'Зонд: вокруг чисто.', near ? 'warn' : 'good');
    }
    refresh();
    if (game.tries <= 0 && !game.over) finish(false);
    else if (game.rooted && game.data >= needData) finish(true);
  }

  for (let i = 0; i < total; i++) {
    const c = el('button', { class: 'hcell', onclick: () => openCell(i) }, '?');
    gridEl.append(c);
  }
  // Морзе-9 подсвечивает один ЛЁД
  if (game.revealed) {
    const idx = game.grid.findIndex((k) => k === 'ice');
    if (idx >= 0) gridEl.children[idx].classList.add('is-hint');
  }

  function finish(win) {
    game.over = true;
    const st = get().hacks;
    st.runs++;
    let pay = game.loot;
    if (win) {
      st.wins++;
      pay += target.reward + game.data * Math.round(target.reward * 0.06);
      sfx.ok();
      unlock('firstHack');
      if (target.diff >= 5) unlock('iceBreaker');
    } else {
      pay = Math.round(pay * 0.35);
      sfx.bad();
    }
    if (pay > st.best) st.best = pay;
    addCredits(pay, `взлом: ${target.name}`);
    addXP(win ? target.diff * 45 : target.diff * 12);
    let heat = target.heat * game.heatMul * (win ? 1 : 1.4);
    if (win && game.ghost) heat -= get().heat * 0.12;
    addHeat(Math.round(heat));
    if (win && Math.random() < 0.25 + game.luck) {
      const drop = pick(['use-chifir', 'use-filtr', 'use-pautina', 'use-lenta']);
      addItem(drop); toast(`Трофей: ${ITEMS[drop].name}`, 'good');
    }
    emit();

    gridEl.classList.add('is-done');
    game.grid.forEach((k, i) => {
      if (!game.opened[i]) {
        const nd = gridEl.children[i];
        nd.classList.add('is-ghost', 'k-' + k);
        nd.textContent = NODES.find((x) => x.id === k).ch;
      }
    });

    modal(win ? 'ПРОГОН ЗАВЕРШЁН' : 'ПРОГОН СОРВАН',
      el('div', {},
        el('p', { class: 'p', text: win
          ? `Вы вышли из узла раньше, чем он вас заметил. Корень взят, ${game.data} фрагментов данных у вас.`
          : `Попытки кончились. Вы выдернули шнур на секунду позже, чем следовало. Часть добычи потеряна, след — нет.` }),
        el('div', { class: 'grid g3' },
          el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: 'ВЫПЛАТА' }), el('div', { class: 'stat__value', text: fmt(pay) + ' ₭' })),
          el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: 'ОПЫТ' }), el('div', { class: 'stat__value', text: '+' + (win ? target.diff * 45 : target.diff * 12) })),
          el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: 'НАГРЕВ' }), el('div', { class: 'stat__value badc', text: '+' + Math.round(heat) })))),
      [{ label: 'К СПИСКУ ЦЕЛЕЙ', kind: 'good', onClick: (c) => { c(); renderMenu(host); } }]);
  }

  const bail = el('button', { class: 'btn btn--ghost btn--sm', onclick: () => {
    if (game.over) return renderMenu(host);
    sfx.click();
    game.over = true;
    const pay = Math.round(game.loot * 0.7);
    addCredits(pay, 'досрочный выход');
    addHeat(Math.round(target.heat * 0.4 * game.heatMul));
    toast(`Вы вышли из сети. Забрали ${fmt(pay)} ₭.`, 'warn');
    renderMenu(host);
  } }, 'ВЫДЕРНУТЬ ШНУР');

  host.append(
    panel('КОНСОЛЬ ПРОГОНА', info, trace,
      el('div', { class: 'hackgrids' }, gridEl, logEl),
      el('div', { class: 'row', style: { marginTop: '12px' } },
        el('span', { class: 'small dim', text: `ЦЕЛЬ: взять корень ◉ и собрать ${needData} фрагментов Д. Избегайте # (ЛЁД) и ! (трассировка).` }),
        el('div', { class: 'sp' }), bail)));
  refresh();
  pushLog(`Подключение к «${target.name}»...`);
  pushLog(target.flavor);
}
