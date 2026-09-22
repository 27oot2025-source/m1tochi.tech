// ─── НЕОН-КИТЕЖ :: КОНТРАКТЫ ─────────────────────────────────────────────────
import { el, panel, pageHead, toast, fmt, modal, clamp, sleep, pick } from '../core/util.js';
import { S, get, emit, addCredits, addXP, addHeat, addRep, addItem, spend, unlock, logEvent } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { CONTRACTS, CONTRACT_FLAVOR } from '../data/contracts.js';
import { FACTIONS, DISTRICTS } from '../data/lore.js';
import { ITEMS } from '../data/items.js';

export function viewContracts() {
  const v = el('div', { class: 'view' });
  const done = get().contracts.done;
  v.append(pageHead('БИРЖА ЗАКАЗОВ · ВЕТКА НА СВЯЗИ', 'КОНТРАКТЫ',
    `Восемь дел. У каждого три пути и ни одного правильного. Закрыто: ${done.length}/${CONTRACTS.length}.`));

  v.append(panel('ВЕТКА ПИШЕТ',
    el('p', { class: 'p', text: pick(CONTRACT_FLAVOR) }),
    el('p', { class: 'p small dim', text: 'Выбор в контракте необратим. Репутация фракций меняется сразу и навсегда — как и в городе.' })));

  const grid = el('div', { class: 'grid g2' });
  CONTRACTS.forEach((c) => {
    const isDone = done.includes(c.id);
    const failed = get().contracts.failed.includes(c.id);
    const f = FACTIONS[c.faction];
    const dist = DISTRICTS.find((d) => d.id === c.district);
    const card = el('article', { class: 'contract' + (isDone ? ' is-done' : ''), style: { '--fc': f.color } },
      el('div', { class: 'contract__top' },
        el('span', { class: 'contract__client', text: c.client }),
        el('span', { class: 'contract__diff', text: '◆'.repeat(c.diff) })),
      el('h3', { class: 'contract__title', text: c.title }),
      el('div', { class: 'contract__meta', text: `${dist.name} · оплата ${fmt(c.pay)} ₭ · опыт ${c.xp} · нагрев +${c.heat}` }),
      el('p', { class: 'p small lore', text: c.brief.replace(/\n/g, ' ') }),
      isDone
        ? el('div', { class: 'contract__stamp', text: failed ? 'ПРОВАЛЕН' : 'ЗАКРЫТ' })
        : el('button', { class: 'btn btn--sm btn--wide', onclick: () => openContract(c, () => refresh()) }, 'ВЗЯТЬ ДЕЛО'));
    grid.append(card);
  });
  v.append(grid);

  function refresh() {
    const nv = viewContracts();
    v.replaceWith(nv);
  }
  return v;
}

function openContract(c, onDone) {
  sfx.nav();
  const f = FACTIONS[c.faction];
  const body = el('div', {});
  body.append(
    el('p', { class: 'p lore', text: c.brief.replace(/\n/g, ' ') }),
    el('div', { class: 'tiny dim', style: { margin: '14px 0 8px' }, text: 'ВЫБЕРИТЕ ПОДХОД — ОТМЕНИТЬ БУДЕТ НЕЛЬЗЯ' }));

  c.choices.forEach((ch) => {
    const risk = Math.round(ch.risk * 100);
    const repTxt = Object.entries(ch.rep || {}).map(([k, vv]) => `${FACTIONS[k].short} ${vv > 0 ? '+' : ''}${vv}`).join('  ');
    body.append(el('button', { class: 'choice', onclick: () => resolve(c, ch) },
      el('div', { class: 'choice__label', text: ch.label }),
      el('div', { class: 'choice__meta' },
        el('span', { class: risk > 40 ? 'badc' : risk > 25 ? 'warnc' : 'acid', text: `РИСК ${risk}%` }),
        ch.cost ? el('span', { class: 'dim', text: `ЗАТРАТЫ ${fmt(ch.cost)} ₭` }) : null,
        ch.payMod ? el('span', { class: 'cool', text: `ОПЛАТА ×${ch.payMod}` }) : null,
        ch.heatMod ? el('span', { class: 'badc', text: `НАГРЕВ ×${ch.heatMod}` }) : null,
        el('span', { class: 'dim', text: repTxt }))));
  });

  const close = modal(`КОНТРАКТ · ${c.title}`, body, [{ label: 'ОТКАЗАТЬСЯ', onClick: (cl) => cl() }]);

  async function resolve(contract, choice) {
    close();
    let risk = choice.risk;
    // модификаторы: репутация с заказчиком и уровень
    risk -= clamp((get().rep[contract.faction] || 0) / 400, -0.1, 0.12);
    risk -= get().level * 0.012;
    if (get().implants.includes('imp-nerv')) risk -= 0.05;
    risk = clamp(risk, 0.05, 0.85);

    if (choice.cost && !spend(choice.cost)) return;

    // сцена выполнения
    const stage = el('div', { class: 'runstage' });
    const line = el('div', { class: 'runstage__line' });
    stage.append(el('div', { class: 'runstage__bars' }, ...Array.from({ length: 12 }, () => el('i'))), line);
    const cl2 = modal('ВЫПОЛНЕНИЕ', stage, []);
    const steps = [
      'Выдвигаюсь на точку...',
      `Район: ${DISTRICTS.find((d) => d.id === contract.district).name}`,
      'Проверка камер и патрулей...',
      choice.label + '...',
      'Обработка результата...',
    ];
    for (const s of steps) { line.textContent = s; sfx.type(); await sleep(620); }

    const ok = Math.random() > risk;
    cl2();
    sfx[ok ? 'ok' : 'bad']();

    const payMod = choice.payMod || 1;
    const heatMod = choice.heatMod || 1;
    const pay = Math.round(contract.pay * payMod * (ok ? 1 : 0.2));
    const xp = Math.round(contract.xp * (ok ? 1 : 0.3));
    const heat = Math.round(contract.heat * heatMod * (ok ? 1 : 1.5));

    addCredits(pay, `контракт: ${contract.title}`);
    addXP(xp);
    addHeat(heat);
    if (ok) {
      Object.entries(choice.rep || {}).forEach(([k, vv]) => addRep(k, vv));
      if (choice.item) { addItem(choice.item); }
      if (choice.itemChance) choice.itemChance.forEach((i) => addItem(i));
    } else {
      Object.entries(choice.rep || {}).forEach(([k, vv]) => addRep(k, Math.round(vv * -0.3)));
    }
    get().contracts.done.push(contract.id);
    if (!ok) get().contracts.failed.push(contract.id);
    logEvent(`Контракт «${contract.title}» — ${ok ? 'закрыт' : 'провален'}`);
    if (get().contracts.done.length >= 4) unlock('contractor');
    emit();

    modal(ok ? 'ДЕЛО ЗАКРЫТО' : 'ДЕЛО ПРОВАЛЕНО',
      el('div', {},
        el('p', { class: 'p lore', text: ok ? choice.okText : choice.failText }),
        el('div', { class: 'grid g3', style: { marginTop: '12px' } },
          el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: 'ОПЛАТА' }), el('div', { class: 'stat__value', text: fmt(pay) + ' ₭' })),
          el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: 'ОПЫТ' }), el('div', { class: 'stat__value', text: '+' + xp })),
          el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: 'НАГРЕВ' }), el('div', { class: 'stat__value badc', text: '+' + heat }))),
        el('p', { class: 'small dim', style: { marginTop: '10px' }, text: 'Последствия записаны в журнал. Фракции уже в курсе.' })),
      [{ label: 'ПРИНЯТО', kind: 'good', onClick: (x) => { x(); onDone(); } }]);
  }
}
