// ─── НЕОН-КИТЕЖ :: разделы мира ──────────────────────────────────────────────
import { el, panel, pageHead, tagRow, bar, toast, pick, scramble } from '../core/util.js';
import { S, get, emit, unlock, addRep } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { WORLD, TIMELINE, FACTIONS, DISTRICTS, CHARACTERS, CODEX, RUMORS } from '../data/lore.js';

// ══ МИР ══════════════════════════════════════════════════════════════════════
export function viewWorld() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('ДОСЬЕ ГОРОДА · ДОПУСК 2', WORLD.city, WORLD.motto));

  const hero = el('div', { class: 'worldhero' },
    el('div', { class: 'worldhero__grid' }),
    el('div', { class: 'worldhero__txt' },
      el('div', { class: 'worldhero__year', text: WORLD.year }),
      el('div', { class: 'worldhero__cap', text: 'ЯРУСОВ: 9   ·   НАСЕЛЕНИЕ: 1 240 000   ·   СОЛНЦЕ: ВИДНО С 9-ГО' })));
  v.append(hero);

  v.append(panel('ОСНОВАНИЕ / ПРЕАМБУЛА',
    ...WORLD.premise.trim().split('\n\n').map((t) => el('p', { class: 'p lore', text: t.replace(/\n/g, ' ') }))));

  v.append(el('div', { class: 'grid g3' },
    kpi('ЯРУСОВ', '9', 'от гидроузла до Венца'),
    kpi('ВЛАЖНОСТЬ', '91%', 'дождь идёт снизу'),
    kpi('ЛАМП В ЗАЛЕ', '14 000', 'одна не работает с 1984'),
    kpi('ИМЕН НА СТЕНЕ', '6 401', 'на одно больше, чем погибших'),
    kpi('СРЕДНИЙ ХРОМ', '19%', 'доля металла в теле'),
    kpi('СРОК ДЕКЕРА', '4 года', 'средняя карьера')));

  v.append(panel('ТРИ ПРАВИЛА НЕОН-КИТЕЖА',
    el('ol', { class: 'rules' },
      el('li', {}, el('b', { text: 'ЗЕРКАЛО всё ещё считает. ' }), 'Никто не знает, что именно, и никто не рискнул выключить.'),
      el('li', {}, el('b', { text: 'Пакт трёх кабелей нерушим. ' }), 'Можно отключить свою магистраль. Нельзя — чужую.'),
      el('li', {}, el('b', { text: 'Нагрев не остывает сам. ' }), 'КОРПНАДЗОР ничего не забывает, он просто занят другими.'))));

  const rumorBox = el('p', { class: 'p rumor', text: pick(RUMORS) });
  v.append(panel('СЛУХИ НИЖНЕГО ЯРУСА',
    rumorBox,
    el('button', {
      class: 'btn btn--sm', onclick: () => { sfx.click(); scramble(rumorBox, pick(RUMORS), 500); },
    }, 'ПОСЛУШАТЬ ЕЩЁ')));

  return v;
}
function kpi(l, v, h) {
  return el('div', { class: 'kpi' },
    el('div', { class: 'kpi__v', text: v }),
    el('div', { class: 'kpi__l', text: l }),
    el('div', { class: 'kpi__h', text: h }));
}

// ══ ХРОНОЛОГИЯ ═══════════════════════════════════════════════════════════════
export function viewTimeline() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('АРХИВ m1tochi · ЛЕНТА ВРЕМЕНИ', 'ХРОНОЛОГИЯ',
    'От объекта 40-бис до сегодняшней ночи. Часть записей восстановлена из повреждённых лент.'));

  const tl = el('div', { class: 'tl' });
  TIMELINE.forEach((e, i) => {
    const node = el('article', { class: 'tl__item', style: { animationDelay: i * 60 + 'ms' } },
      el('div', { class: 'tl__year', text: e.y }),
      el('div', { class: 'tl__dot' }),
      el('div', { class: 'tl__card' },
        el('h3', { class: 'tl__title', text: e.t }),
        el('p', { class: 'p', text: e.d })));
    tl.append(node);
  });
  v.append(tl);

  v.append(panel('ПРИМЕЧАНИЕ АРХИВАРИУСА 7',
    el('p', { class: 'p', text: '«Хронология собрана из 31 источника, из которых 12 противоречат друг другу. Противоречия сохранены намеренно: устранить их означало бы выбрать версию. Я не уполномочен выбирать версию.»' })));
  return v;
}

// ══ ФРАКЦИИ ══════════════════════════════════════════════════════════════════
export function viewFactions() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('ПОЛИТИЧЕСКАЯ КАРТА · ДОПУСК 3', 'ФРАКЦИИ',
    'Пять сил. Ни одна не может победить остальные, и все четверо это знают. Пятая — не комментирует.'));

  const rep = get().rep;
  const grid = el('div', { class: 'grid g2' });
  Object.values(FACTIONS).forEach((f) => {
    const r = rep[f.id] ?? 0;
    const card = el('article', { class: 'fcard', style: { '--fc': f.color } },
      el('header', { class: 'fcard__head' },
        el('div', { class: 'fcard__sigil', text: f.short }),
        el('div', {},
          el('h3', { class: 'fcard__name', text: f.name }),
          el('div', { class: 'fcard__tag', text: f.tagline }))),
      el('p', { class: 'p lore', text: f.desc.replace(/\n/g, ' ') }),
      el('div', { class: 'fcard__row' }, el('span', { class: 'fcard__k', text: 'ДОКТРИНА' }), el('span', { class: 'fcard__val', text: f.doctrine })),
      el('div', { class: 'fcard__row' }, el('span', { class: 'fcard__k', text: 'ЛИДЕР' }), el('span', { class: 'fcard__val', text: f.leader })),
      el('div', { class: 'fcard__row' }, el('span', { class: 'fcard__k', text: 'ЦЕНИТ' }), el('span', { class: 'fcard__val', text: f.likes })),
      el('div', { class: 'fcard__row' }, el('span', { class: 'fcard__k', text: 'НЕ ПРОЩАЕТ' }), el('span', { class: 'fcard__val', text: f.hates })),
      el('div', { class: 'fcard__rep' },
        el('span', { class: 'tiny dim', text: `ВАША РЕПУТАЦИЯ: ${r > 0 ? '+' : ''}${r}` }),
        repBar(r)));
    grid.append(card);
  });
  v.append(grid);

  v.append(panel('КАК ЧИТАТЬ РЕПУТАЦИЮ',
    el('p', { class: 'p', text: 'Репутация меняется от решений в контрактах, покупок у профильных торговцев и поведения в сети. Ниже −40 фракция закрывает доступ к своим товарам. Выше +50 открываются особые предложения и ответы Оракула.' })));
  return v;
}
function repBar(r) {
  const pct = (r + 100) / 2;
  return el('div', { class: 'repbar' },
    el('div', { class: 'repbar__mid' }),
    el('div', { class: 'repbar__fill', style: { width: pct + '%', background: r < 0 ? 'var(--blood)' : 'var(--fc)' } }));
}

// ══ РАЙОНЫ / КАРТА ═══════════════════════════════════════════════════════════
export function viewDistricts() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('ГОРОДСКАЯ СЪЁМКА · НЕТОЧНАЯ', 'ЯРУСЫ И РАЙОНЫ',
    'Карта Серой зоны не совпадает сама с собой. Это проверяли трижды, разными людьми.'));

  const wrap = el('div', { class: 'maplay' });
  const info = el('div', { class: 'mapinfo' });
  const tower = el('div', { class: 'tower' });

  const sorted = [...DISTRICTS].sort((a, b) => b.tier - a.tier);
  sorted.forEach((d) => {
    const f = FACTIONS[d.faction];
    const row = el('button', {
      class: 'tier', style: { '--fc': f.color },
      onclick: () => { sfx.nav(); show(d); [...tower.children].forEach((c) => c.classList.remove('is-sel')); row.classList.add('is-sel'); },
    },
      el('span', { class: 'tier__n', text: d.tier === 0 ? '—' : d.tier }),
      el('span', { class: 'tier__name', text: d.name }),
      el('span', { class: 'tier__tag', text: d.tag }),
      el('span', { class: 'tier__f', text: f.short }));
    tower.append(row);
  });

  function show(d) {
    const f = FACTIONS[d.faction];
    info.innerHTML = '';
    info.append(
      el('div', { class: 'mapinfo__head', style: { '--fc': f.color } },
        el('h3', { text: d.name }),
        el('span', { class: 'tiny', text: `ЯРУС ${d.tier === 0 ? 'НЕ ОПРЕДЕЛЁН' : d.tier} · КОНТРОЛЬ: ${f.name}` })),
      el('p', { class: 'p lore', text: d.desc.replace(/\n/g, ' ') }),
      el('div', { class: 'mapinfo__hook' }, el('span', { class: 'tiny hot', text: 'ЗАЦЕПКА ' }), d.hook),
      el('div', { class: 'grid g2', style: { marginTop: '12px' } },
        el('div', {}, el('div', { class: 'tiny dim', text: 'ОПАСНОСТЬ' }), bar(d.danger, 10, `${d.danger}/10`)),
        el('div', {}, el('div', { class: 'tiny dim', text: 'КАЧЕСТВО СЕТИ' }), bar(d.net, 10, `${d.net}/10`))),
      el('div', { class: 'tiny dim', style: { marginTop: '12px' }, text: 'ОРИЕНТИРЫ' }),
      tagRow(d.landmarks));
  }
  show(sorted[0]);
  tower.firstChild.classList.add('is-sel');

  wrap.append(tower, info);
  v.append(wrap);
  return v;
}

// ══ ДОСЬЕ ════════════════════════════════════════════════════════════════════
export function viewPeople() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('КАРТОТЕКА · ИЗЪЯТО ИЗ ОБОРОТА', 'ДОСЬЕ',
    'Восемь личных дел. Два из них, вероятно, описывают одного и того же человека.'));

  const grid = el('div', { class: 'grid g2' });
  CHARACTERS.forEach((c) => {
    const f = FACTIONS[c.faction];
    grid.append(el('article', { class: 'dossier', style: { '--fc': f.color } },
      el('div', { class: 'dossier__photo' },
        el('div', { class: 'dossier__noise' }),
        el('span', { class: 'dossier__init', text: c.name.split(' ').map((w) => w[0]).join('').slice(0, 2) })),
      el('div', { class: 'dossier__body' },
        el('h3', { class: 'dossier__name', text: c.name }),
        el('div', { class: 'dossier__role', text: `${c.role} · ${f.short}` }),
        el('blockquote', { class: 'dossier__quote', text: c.line }),
        el('p', { class: 'p small', text: c.bio }))));
  });
  v.append(grid);
  return v;
}

// ══ КОДЕКС ═══════════════════════════════════════════════════════════════════
export function viewCodex() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('БАЗА ЗНАНИЙ · ЧИТАЕТ ВАС В ОТВЕТ', 'КОДЕКС',
    `${CODEX.length} статей. Прочитанные отмечаются. Прочитать все — отдельное достижение.`));

  const cats = ['ВСЕ', ...new Set(CODEX.map((c) => c.cat))];
  let active = 'ВСЕ';
  const filterRow = el('div', { class: 'row', style: { marginBottom: '14px' } });
  const listWrap = el('div', { class: 'codexwrap' });

  const search = el('input', { class: 'input', placeholder: 'ПОИСК ПО АРХИВУ...', style: { maxWidth: '260px' }, oninput: render });
  cats.forEach((c) => {
    const b = el('button', { class: 'chip' + (c === active ? ' is-on' : ''), text: c,
      onclick: () => { sfx.click(); active = c; [...filterRow.querySelectorAll('.chip')].forEach((x) => x.classList.toggle('is-on', x.textContent === c)); render(); } });
    filterRow.append(b);
  });
  filterRow.append(el('div', { class: 'sp' }), search);

  function render() {
    const q = search.value.trim().toLowerCase();
    listWrap.innerHTML = '';
    const items = CODEX.filter((c) => (active === 'ВСЕ' || c.cat === active) &&
      (!q || (c.title + c.body).toLowerCase().includes(q)));
    if (!items.length) listWrap.append(el('p', { class: 'p', text: 'НИЧЕГО НЕ НАЙДЕНО. Архив советует переформулировать.' }));
    items.forEach((c) => {
      const seen = get().codexSeen.includes(c.id);
      const body = el('div', { class: 'acc__body' }, el('p', { class: 'p lore', text: c.body.replace(/\n/g, ' ') }));
      const head = el('button', { class: 'acc__head' + (seen ? ' is-seen' : '') },
        el('span', { class: 'acc__cat', text: c.cat }),
        el('span', { class: 'acc__title', text: c.title }),
        el('span', { class: 'acc__mark', text: seen ? '✓' : '·' }));
      const item = el('article', { class: 'acc' }, head, body);
      head.onclick = () => {
        sfx.click();
        item.classList.toggle('is-open');
        if (item.classList.contains('is-open') && !get().codexSeen.includes(c.id)) {
          get().codexSeen.push(c.id); emit();
          head.classList.add('is-seen'); head.lastChild.textContent = '✓';
          if (get().codexSeen.length >= CODEX.length) unlock('lorehound');
        }
      };
      listWrap.append(item);
    });
    prog.textContent = `ПРОЧИТАНО ${get().codexSeen.length} / ${CODEX.length}`;
  }
  const prog = el('div', { class: 'tiny dim', style: { marginBottom: '8px' } });
  v.append(filterRow, prog, listWrap);
  render();
  return v;
}
