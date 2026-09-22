// ─── НЕОН-КИТЕЖ :: БИРЖА «РЁ» + МАГАЗИН + ИНВЕНТАРЬ ──────────────────────────
import { el, panel, pageHead, toast, fmt, fmt2, modal, clamp, confirmBox } from '../core/util.js';
import { S, get, emit, addCredits, spend, addItem, hasItem, addRep, addRyo, unlock, addXP } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { ITEMS, CATS, SHOPS } from '../data/items.js';
import { FACTIONS, DISTRICTS } from '../data/lore.js';

// ══ БИРЖА ════════════════════════════════════════════════════════════════════
const ASSETS = [
  { id: 'ryo', name: 'РЁ', full: 'Теневая единица Синдиката', base: 1800, vol: 0.09 },
  { id: 'ferrit', name: 'ФРТ', full: 'Ферритовая память, тонна', base: 640, vol: 0.05 },
  { id: 'voda', name: 'ВОД', full: 'Питьевая вода, куб', base: 220, vol: 0.03 },
  { id: 'hrom', name: 'ХРМ', full: 'Медицинский хром, кг', base: 3400, vol: 0.07 },
  { id: 'traf', name: 'ТРФ', full: 'Магистральный трафик, Тбит', base: 95, vol: 0.12 },
  { id: 'lenta', name: 'ЛНТ', full: 'Архивная лента, шт', base: 1500, vol: 0.14 },
];

function initMarket() {
  const m = get().market;
  if (m && m.assets) return m;
  const nm = {
    assets: Object.fromEntries(ASSETS.map((a) => [a.id, {
      price: a.base, hist: Array.from({ length: 40 }, () => a.base * (0.92 + Math.random() * 0.16)),
    }])),
    holdings: {}, tick: 0, lastEvent: '',
  };
  S.market = nm;
  return nm;
}

const EVENTS = [
  { t: 'Магистраль перегружена: трафик дорожает.', eff: { traf: 1.3, ryo: 1.12 } },
  { t: 'КОМБИНАТ выбросил на рынок партию памяти.', eff: { ferrit: 0.78 } },
  { t: 'Прорыв на гидроузле: вода в дефиците.', eff: { voda: 1.45 } },
  { t: 'Облава КОРПНАДЗОРА на хромовых барыг.', eff: { hrom: 1.28, ryo: 0.92 } },
  { t: 'Культ скупил все архивные ленты подряд.', eff: { lenta: 1.6 } },
  { t: 'Пакт трёх кабелей подтверждён: рынок успокоился.', eff: { traf: 0.85, ryo: 0.95 } },
  { t: 'Слух: ЗЕРКАЛО запросило дополнительное питание.', eff: { traf: 1.22, lenta: 1.18, hrom: 1.05 } },
  { t: 'Синдикат погасил крупный долг наличными.', eff: { ryo: 1.25 } },
  { t: 'В цеху №6 брак партии имплантов.', eff: { hrom: 0.72 } },
  { t: 'Ночная волна передала прогноз. Рынок ей поверил.', eff: { ryo: 1.08, ferrit: 1.06, voda: 1.04 } },
];

export function tickMarket(force = false) {
  const m = initMarket();
  m.tick++;
  let ev = null;
  if (force || Math.random() < 0.17) ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
  ASSETS.forEach((a) => {
    const st = m.assets[a.id];
    const drift = (a.base - st.price) * 0.03;
    const shock = (Math.random() - 0.5) * 2 * a.vol * st.price;
    let p = st.price + drift + shock;
    if (ev && ev.eff[a.id]) p *= ev.eff[a.id];
    st.price = Math.max(a.base * 0.25, p);
    st.hist.push(st.price);
    if (st.hist.length > 60) st.hist.shift();
  });
  if (ev) m.lastEvent = ev.t;
  emit();
  return ev;
}

export function viewMarket() {
  const m = initMarket();
  const v = el('div', { class: 'view' });
  v.append(pageHead('ТОРГОВЫЙ ТЕРМИНАЛ КАБЕЛЬ-2', 'БИРЖА',
    'Шесть позиций, один слух в час и ни одной гарантии. Куна говорит: покупай, когда все молчат.'));

  const host = el('div', {});
  v.append(host);
  render();

  function render() {
    host.innerHTML = '';
    const walletRow = el('div', { class: 'grid g4' },
      el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: 'КРЕДИТЫ' }), el('div', { class: 'stat__value', text: fmt(get().credits) + ' ₭' })),
      el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: 'ПОРТФЕЛЬ' }), el('div', { class: 'stat__value', text: fmt(portfolio()) + ' ₭' })),
      el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: 'ТИК' }), el('div', { class: 'stat__value', text: m.tick })),
      el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: 'РЁ НА РУКАХ' }), el('div', { class: 'stat__value', text: fmt2(get().ryo) })));
    host.append(walletRow);

    if (m.lastEvent) host.append(panel('ЛЕНТА СОБЫТИЙ', el('p', { class: 'p', text: '▸ ' + m.lastEvent })));

    const table = el('div', { class: 'grid g2' });
    ASSETS.forEach((a) => {
      const st = m.assets[a.id];
      const prev = st.hist[st.hist.length - 2] || st.price;
      const chg = ((st.price - prev) / prev) * 100;
      const own = m.holdings[a.id] || 0;
      const card = el('article', { class: 'asset' },
        el('div', { class: 'asset__head' },
          el('div', {},
            el('h3', { class: 'asset__name', text: a.name }),
            el('div', { class: 'tiny dim', text: a.full })),
          el('div', { class: 'asset__price' },
            el('div', { class: 'asset__p', text: fmt(st.price) + ' ₭' }),
            el('div', { class: 'asset__chg ' + (chg >= 0 ? 'acid' : 'badc'), text: `${chg >= 0 ? '▲' : '▼'} ${Math.abs(chg).toFixed(2)}%` }))),
        spark(st.hist, chg >= 0),
        el('div', { class: 'row' },
          el('span', { class: 'small dim', text: `В ПОРТФЕЛЕ: ${own}` }),
          el('div', { class: 'sp' }),
          el('button', { class: 'btn btn--sm', onclick: () => trade(a, 1, 'buy') }, 'КУПИТЬ'),
          el('button', { class: 'btn btn--sm', onclick: () => trade(a, 10, 'buy') }, '×10'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => trade(a, 1, 'sell') }, 'ПРОДАТЬ'),
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => trade(a, own, 'sell') }, 'ВСЁ')));
      table.append(card);
    });
    host.append(table);

    host.append(el('div', { class: 'row' },
      el('button', { class: 'btn', onclick: () => { sfx.click(); tickMarket(); render(); } }, 'ОБНОВИТЬ КОТИРОВКИ'),
      el('button', { class: 'btn btn--ghost', onclick: () => { sfx.alarm(); const e = tickMarket(true); toast(e.t, 'warn'); render(); } }, 'ЖДАТЬ СЛУХ'),
      el('span', { class: 'small dim', text: 'Котировки также обновляются сами раз в 45 секунд.' })));

    host.append(panel('ПРАВИЛА ТОРГОВЛИ',
      el('p', { class: 'p small', text: 'Цена движется к базовой, но слухи её ломают. Комиссия Синдиката — 2% с продажи. Прибыль свыше 20 000 ₭ за сессию даёт достижение «Биржевой хищник». Разорившимся Куна выдаёт чифир бесплатно.' })));
  }

  function portfolio() {
    return Object.entries(m.holdings).reduce((s, [k, q]) => s + q * (m.assets[k]?.price || 0), 0);
  }

  function trade(a, qty, dir) {
    if (qty <= 0) return;
    const st = m.assets[a.id];
    if (dir === 'buy') {
      const cost = Math.round(st.price * qty);
      if (!spend(cost)) return;
      m.holdings[a.id] = (m.holdings[a.id] || 0) + qty;
      sfx.coin();
      toast(`Куплено ${qty} ${a.name} за ${fmt(cost)} ₭`, 'good');
    } else {
      const own = m.holdings[a.id] || 0;
      if (own < qty) { toast('Нечего продавать.', 'bad'); return; }
      const gross = Math.round(st.price * qty * 0.98);
      m.holdings[a.id] = own - qty;
      addCredits(gross, `продажа ${a.name}`);
      sfx.coin();
      if (a.id === 'ryo') addRep('sindikat', 1);
      toast(`Продано ${qty} ${a.name} за ${fmt(gross)} ₭`, 'good');
      if (get().credits > 60000) unlock('rich');
      if (gross > 20000) unlock('trader');
    }
    st.price *= dir === 'buy' ? 1.004 : 0.996;
    emit(); render();
  }

  return v;
}

function spark(hist, up) {
  const w = 260, h = 46, data = hist.slice(-40);
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1;
  const pts = data.map((p, i) => `${(i / (data.length - 1)) * w},${h - ((p - min) / rng) * (h - 6) - 3}`).join(' ');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('class', 'spark');
  const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  pl.setAttribute('points', pts); pl.setAttribute('fill', 'none');
  pl.setAttribute('stroke', up ? 'var(--acid)' : 'var(--blood)'); pl.setAttribute('stroke-width', '1.5');
  const area = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  area.setAttribute('points', `0,${h} ${pts} ${w},${h}`);
  area.setAttribute('fill', up ? 'rgba(57,255,136,.12)' : 'rgba(255,77,109,.12)');
  svg.append(area, pl);
  return svg;
}

// ══ МАГАЗИН ══════════════════════════════════════════════════════════════════
export function viewShop() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('ТОРГОВЫЕ ТОЧКИ ГОРОДА', 'МАГАЗИН',
    'Пять точек, разные наценки и разные вопросы к покупателю. Репутация меняет цену.'));

  let active = SHOPS[0].id;
  const tabs = el('div', { class: 'shoptabs' });
  const body = el('div', {});
  SHOPS.forEach((s) => {
    tabs.append(el('button', { class: 'shoptab' + (s.id === active ? ' is-on' : ''), onclick: () => { sfx.click(); active = s.id; renderTabs(); render(); } },
      el('b', { text: s.name }),
      el('span', { class: 'tiny dim', text: FACTIONS[s.faction].name })));
  });
  function renderTabs() { [...tabs.children].forEach((c, i) => c.classList.toggle('is-on', SHOPS[i].id === active)); }

  function priceOf(s, item) {
    const rep = get().rep[s.faction] || 0;
    const disc = clamp(rep / 500, -0.1, 0.2);
    return Math.max(10, Math.round(item.price * s.markup * (1 - disc)));
  }

  function render() {
    const s = SHOPS.find((x) => x.id === active);
    const rep = get().rep[s.faction] || 0;
    body.innerHTML = '';
    if (rep <= -40) {
      body.append(panel(s.name, el('p', { class: 'p badc', text: 'Вам здесь не рады. Репутация с этой фракцией ниже −40: обслуживание прекращено. Исправляйте отношения контрактами.' })));
      return;
    }
    body.append(panel(s.name,
      el('p', { class: 'p small', text: s.note }),
      el('div', { class: 'row small' },
        el('span', { class: 'dim', text: `РАЙОН: ${DISTRICTS.find((d) => d.id === s.district).name}` }),
        el('span', { class: 'dim', text: `НАЦЕНКА: ×${s.markup}` }),
        el('span', { class: rep >= 0 ? 'acid' : 'badc', text: `РЕПУТАЦИЯ: ${rep > 0 ? '+' : ''}${rep} (скидка ${Math.round(clamp(rep / 500, -0.1, 0.2) * 100)}%)` }))));

    const grid = el('div', { class: 'grid g3' });
    s.stock.forEach((id) => {
      const it = ITEMS[id];
      const p = priceOf(s, it);
      const owned = get().inventory[id] || 0;
      const isImp = it.cat === 'implant';
      const installed = get().implants.includes(id);
      grid.append(el('article', { class: 'goods', style: { '--gc': CATS[it.cat].color } },
        el('div', { class: 'goods__cat', text: CATS[it.cat].name }),
        el('h3', { class: 'goods__name', text: it.name }),
        el('div', { class: 'goods__rare', text: '★'.repeat(it.rare) + '☆'.repeat(5 - it.rare) }),
        el('p', { class: 'p small', text: it.desc }),
        el('div', { class: 'goods__eff', text: '▸ ' + it.effect }),
        el('div', { class: 'row' },
          el('span', { class: 'goods__price', text: fmt(p) + ' ₭' }),
          el('div', { class: 'sp' }),
          owned ? el('span', { class: 'tiny acid', text: `×${owned}` }) : null,
          installed ? el('span', { class: 'tiny acid', text: 'ВЖИВЛЁН' }) : null),
        el('button', {
          class: 'btn btn--sm btn--wide', disabled: isImp && installed,
          onclick: () => buy(s, it, p),
        }, isImp && installed ? 'УЖЕ У ВАС' : 'КУПИТЬ')));
    });
    body.append(grid);
  }

  function buy(s, it, p) {
    if (!spend(p)) { sfx.bad(); return; }
    sfx.coin();
    addItem(it.id);
    addRep(s.faction, 1);
    if (it.cat === 'implant') {
      get().implants.push(it.id);
      if (it.id === 'imp-pamyat') S.ram = get().ram + 2;
      if (it.id === 'imp-serdce') S.hp = Math.min(140, get().hp + 40);
      if (get().implants.length >= 4) unlock('chromed');
      emit();
    }
    if (it.cat === 'art' && s.faction === 'zerkalo') addRep('zerkalo', 10);
    addXP(10);
    toast(`Приобретено: ${it.name}`, 'good');
    render();
  }

  v.append(tabs, body);
  render();
  return v;
}

// ══ ИНВЕНТАРЬ ════════════════════════════════════════════════════════════════
export function viewInventory() {
  const v = el('div', { class: 'view' });
  const inv = get().inventory;
  const keys = Object.keys(inv);
  v.append(pageHead('ЛИЧНЫЙ ЧИП · СОДЕРЖИМОЕ', 'ИНВЕНТАРЬ',
    `Позиций: ${keys.length}. Вживлённого хрома: ${get().implants.length}. Свободного ОЗУ: ${freeRam()} из ${get().ram}.`));

  const host = el('div', {});
  v.append(host);
  render();

  function freeRam() {
    const used = Object.keys(inv).filter((k) => ITEMS[k]?.cat === 'soft').reduce((s, k) => s + (ITEMS[k].ram || 0), 0);
    return get().ram - used;
  }

  function render() {
    host.innerHTML = '';
    const ram = freeRam();
    host.append(panel('НЕЙРО-ОЗУ',
      el('div', { class: 'rambar' }, ...Array.from({ length: get().ram }, (_, i) =>
        el('i', { class: i < get().ram - ram ? 'is-used' : '' }))),
      el('p', { class: 'p small', text: ram < 0 ? 'ПЕРЕГРУЗКА ОЗУ: часть софта работать не будет. Продайте лишнее или вживите ферритовую память.' : 'Каждая программа занимает слоты. Импланты памяти расширяют объём.' })));

    if (!Object.keys(inv).length) {
      host.append(panel('ПУСТО', el('p', { class: 'p', text: 'Чип чист. Это либо осторожность, либо бедность. Загляните в МАГАЗИН.' })));
      return;
    }
    const grid = el('div', { class: 'grid g3' });
    Object.entries(inv).forEach(([id, qty]) => {
      const it = ITEMS[id]; if (!it) return;
      const installed = get().implants.includes(id);
      grid.append(el('article', { class: 'goods', style: { '--gc': CATS[it.cat].color } },
        el('div', { class: 'goods__cat', text: CATS[it.cat].name + (installed ? ' · ВЖИВЛЁН' : '') }),
        el('h3', { class: 'goods__name', text: it.name }),
        el('p', { class: 'p small', text: it.desc }),
        el('div', { class: 'goods__eff', text: '▸ ' + it.effect }),
        el('div', { class: 'row' }, el('span', { class: 'tiny acid', text: `КОЛ-ВО: ${qty}` }), el('div', { class: 'sp' }),
          el('span', { class: 'tiny dim', text: `СБЫТ: ${fmt(Math.round(it.price * 0.55))} ₭` })),
        el('div', { class: 'row' },
          it.cat === 'use' ? el('button', { class: 'btn btn--sm btn--good', onclick: () => useItem(id) }, 'ПРИМЕНИТЬ') : null,
          el('button', { class: 'btn btn--sm btn--ghost', onclick: () => sell(id) }, 'СБЫТЬ'))));
    });
    host.append(grid);
  }

  function sell(id) {
    const it = ITEMS[id];
    const gain = Math.round(it.price * 0.55);
    addItem(id, -1);
    if (get().implants.includes(id) && !get().inventory[id]) {
      S.implants = get().implants.filter((x) => x !== id);
    }
    addCredits(gain, `сбыт ${it.name}`);
    sfx.coin(); toast(`Сбыто за ${fmt(gain)} ₭`, 'good');
    render();
  }

  function useItem(id) {
    const it = ITEMS[id];
    sfx.ok();
    switch (id) {
      case 'use-chifir': S.hp = Math.min(140, get().hp + 10); toast('Чифир пошёл. Руки дрожат, голова ясная.', 'good'); break;
      case 'use-filtr': S.hp = Math.min(140, get().hp + 25); toast('Дышится легче. На пару часов.', 'good'); break;
      case 'use-pautina': S.heat = Math.max(0, get().heat - 25); toast('Логи подчищены. КОРПНАДЗОР пожал плечами.', 'good'); if (get().heat <= 2) unlock('ghost'); break;
      case 'use-ryo': addRyo(1); toast('Расписка обменяна на 1 рё.', 'good'); break;
      case 'use-lenta': {
        const frags = [
          'Лента: «...третий день. Машина ответила на вопрос, который не задавали. Ответ: 6401.»',
          'Лента: «...опись имущества цеха №4. Пункт 19: панель неоновая, 1 шт., списанию не подлежит.»',
          'Лента: «...журнал наблюдений. Объект смотрит вниз. Объект всегда смотрел вниз.»',
          'Лента: «...подпись оператора неразборчива. Строчная буква м с точкой.»',
          'Лента: пустая. Магнитный слой стёрт аккуратно, по кругу, вручную.',
        ];
        modal('АРХИВНАЯ ЛЕНТА', el('p', { class: 'p lore', text: frags[Math.floor(Math.random() * frags.length)] }), [{ label: 'ЗАКРЫТЬ', kind: 'good', onClick: (c) => c() }]);
        addXP(25); break;
      }
      case 'use-zhetоn': toast('Жетон пригодится в АРКАДЕ или на АРЕНЕ.', 'info'); return;
      default: toast('Применить не получилось.', 'bad'); return;
    }
    addItem(id, -1);
    emit(); render();
  }

  return v;
}
