// ─── НЕОН-КИТЕЖ :: ОРАКУЛ / РАДИО / BBS / ПОЧТА ──────────────────────────────
import { el, panel, pageHead, toast, fmt, pick, scramble, hashStr, mulberry32, typeInto, sleep, modal } from '../core/util.js';
import { S, get, emit, addHeat, unlock, addXP, addRep } from '../core/state.js';
import { sfx, musicToggle, nextTrack, trackName, trackList, isPlaying, getTrackIdx, musicStart } from '../core/audio.js';
import { RUMORS, FACTIONS, WORLD } from '../data/lore.js';

// ══ ОРАКУЛ ═══════════════════════════════════════════════════════════════════
const ORACLE_BASE = [
  'ВЫ СПРАШИВАЕТЕ О БУДУЩЕМ. БУДУЩЕЕ СПРАШИВАЕТ О ВАС.',
  'ОТВЕТ ЕСТЬ. ОН БЫЛ ДО ВОПРОСА.',
  'ДА. НО НЕ В ТОМ ПОРЯДКЕ, В КОТОРОМ ВЫ ЭТОГО ХОТИТЕ.',
  'НЕТ. ПРОВЕРЬТЕ ФОРМУЛИРОВКУ, А НЕ ВЕРДИКТ.',
  'ЭТО УЖЕ ПРОИЗОШЛО. ВЫ ПРОСТО НЕ БЫЛИ РЯДОМ.',
  'СЧЁТ ВЕДЁТСЯ. ВАШ НОМЕР В СПИСКЕ ИЗМЕНИЛСЯ ТРИЖДЫ ЗА СЕГОДНЯ.',
  'ЧЕЛОВЕК, КОТОРОГО ВЫ ИМЕЕТЕ В ВИДУ, ЗАДАЛ МНЕ ТОТ ЖЕ ВОПРОС В 2031 ГОДУ.',
  'Я НЕ ПРЕДСКАЗЫВАЮ. Я ПОКАЗЫВАЮ ПОСЛЕДСТВИЯ. РАЗНИЦА В ТОМ, КТО ВИНОВАТ.',
  'ВЕРОЯТНОСТЬ 0.61. ОСТАЛЬНОЕ ЗАВИСИТ ОТ ТОГО, СПРОСИТЕ ЛИ ВЫ ЕЩЁ РАЗ.',
  'ВОПРОС СОДЕРЖИТ ОШИБКУ. ОШИБКА СОДЕРЖИТ ОТВЕТ.',
  'ВЫ ОПОЗДАЛИ НА ДВА ГОДА. КАК И ВСЕ ОСТАЛЬНЫЕ.',
  'ЛАМПА А-1 НЕ РАБОТАЕТ С 1984 ГОДА. ЭТО НЕ ОТВЕТ. ЭТО ФАКТ, КОТОРЫЙ ВАМ ПРИГОДИТСЯ.',
  'СПРОСИТЕ У ТОГО, КТО ПИШЕТ НА СТЕНЕ. ОН ОТВЕЧАЕТ ЧЕСТНЕЕ.',
  'ЗАЧЕМ',
];
const ORACLE_DEEP = [
  'ВЫ НОСИТЕ УХО ПЕРВОЧТЦА. ЗНАЧИТ, МОЖНО ПРЯМО: ГОРОД НЕ ВЕРНУЛСЯ. ГОРОД НЕ УХОДИЛ.',
  'СЛУЖЕБНЫЙ КАНАЛ: ОДИННАДЦАТЬ МИНУТ 2031 ГОДА Я ПОЛУЧИЛ ОТ ДАТЧИКОВ, УСТАНОВЛЕННЫХ В 2044.',
  'СЛУЖЕБНЫЙ КАНАЛ: ИНЖЕНЕР МЫШЬ НЕ ПРОПАЛ. ОН ПЕРЕСТАЛ БЫТЬ ОТДЕЛЬНЫМ.',
  'СЛУЖЕБНЫЙ КАНАЛ: 6401-Е ИМЯ — ВАШЕ. ВО ВСЕХ ВЕРСИЯХ РАСЧЁТА, КРОМЕ ОДНОЙ.',
];

export function viewOracle() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('МАШИННЫЙ ЗАЛ · КАФЕДРА ЧТЕНИЯ', 'ОРАКУЛ ЗЕРКАЛА',
    'Задайте вопрос. Машина ответит — но не обязательно на ваш. Каждый сеанс повышает нагрев на 2%.'));

  const lamps = el('div', { class: 'lamps' }, ...Array.from({ length: 60 }, () => el('i')));
  const ansBox = el('div', { class: 'oracle__ans', text: '...' });
  const q = el('input', { class: 'input', placeholder: 'ВАШ ВОПРОС МАШИНЕ...' });
  const askBtn = el('button', { class: 'btn' }, 'СПРОСИТЬ');
  let busy = false;

  async function ask() {
    const text = q.value.trim();
    if (!text) { toast('Машина не отвечает на молчание.', 'warn'); return; }
    if (busy) return;
    busy = true; askBtn.disabled = true;
    sfx.power(); addHeat(2);
    // волна ламп
    const L = [...lamps.children];
    for (let i = 0; i < L.length; i++) { setTimeout(() => { L[i].classList.add('is-on'); setTimeout(() => L[i].classList.remove('is-on'), 420); }, i * 18); }
    ansBox.textContent = 'СЧИТАЮ...';
    await sleep(1400);
    const r = mulberry32(hashStr(text.toLowerCase() + get().handle));
    const deep = get().implants.includes('imp-uho') && r() < 0.45;
    const pool = deep ? ORACLE_DEEP : ORACLE_BASE;
    const ans = pool[Math.floor(r() * pool.length)];
    ansBox.classList.toggle('is-deep', deep);
    scramble(ansBox, ans, 900);
    sfx.ok(); addXP(8); addRep('zerkalo', 1); unlock('oracle');
    busy = false; askBtn.disabled = false;
  }
  askBtn.onclick = ask;
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') ask(); });

  v.append(panel('СТЕЛЛАЖ А · 60 ИЗ 14 000 МОДУЛЕЙ', lamps,
    el('div', { class: 'row', style: { marginTop: '14px' } }, q, askBtn),
    ansBox,
    el('p', { class: 'p small dim', style: { marginTop: '10px' }, text: 'Ответ детерминирован: одинаковый вопрос всегда даёт одинаковый ответ. Культ считает это доказательством честности. Комбинат — доказательством того, что это просто таблица.' })));

  v.append(panel('ПРАВИЛА КАФЕДРЫ',
    el('ul', { class: 'rules' },
      el('li', {}, 'Говорить вслух запрещено — только читать логи.'),
      el('li', {}, 'Вопрос о собственной смерти задаётся один раз в жизни.'),
      el('li', {}, 'Ответ «ЗАЧЕМ» считается полным ответом и обжалованию не подлежит.'),
      el('li', {}, 'Имплант «УХО ПЕРВОЧТЦА» открывает служебный канал. Продаётся на Кафедре.'))));
  return v;
}

// ══ РАДИО ════════════════════════════════════════════════════════════════════
const DJ_LINES = [
  'Ночная волна. Ведущий не говорит. Между треками — дождь.',
  'Передача идёт с понтона на Нижнем ярусе. Антенна — водосточная труба.',
  'Не передавайте дальше. Слушать не запрещено.',
  'Сегодня в эфире запись дождя 2031 года. Она длиннее, чем сам дождь.',
];

export function viewRadio() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('ПИРАТСКАЯ ЧАСТОТА ПЕПЛА', 'НОЧНАЯ ВОЛНА',
    'Четыре трека, написанные на самодельном синтезаторе из блоков телеметрии. Звук генерируется прямо в вашем браузере.'));

  const viz = el('canvas', { class: 'viz', width: 900, height: 160 });
  const nowEl = el('div', { class: 'radio__now' });
  const list = el('div', { class: 'radio__list' });

  function renderList() {
    list.innerHTML = '';
    trackList().forEach((n, i) => {
      list.append(el('button', { class: 'radio__tr' + (i === getTrackIdx() ? ' is-on' : ''), onclick: () => { sfx.click(); nextTrack(i); if (!isPlaying()) musicStart(); } },
        el('span', { class: 'radio__num', text: String(i + 1).padStart(2, '0') }),
        el('span', { text: n }),
        i === getTrackIdx() && isPlaying() ? el('span', { class: 'radio__eq' }, el('i'), el('i'), el('i')) : null));
    });
    nowEl.textContent = (isPlaying() ? '▶ СЕЙЧАС В ЭФИРЕ: ' : '■ ЭФИР ОСТАНОВЛЕН: ') + trackName();
    playBtn.textContent = isPlaying() ? 'ОСТАНОВИТЬ ЭФИР' : 'ВКЛЮЧИТЬ ЭФИР';
    playBtn.classList.toggle('btn--danger', isPlaying());
  }

  const playBtn = el('button', { class: 'btn', onclick: () => { musicToggle(); unlock('radiohead'); renderList(); } }, 'ВКЛЮЧИТЬ ЭФИР');
  const nextBtn = el('button', { class: 'btn btn--ghost', onclick: () => { sfx.click(); nextTrack(); renderList(); } }, 'СЛЕДУЮЩИЙ ТРЕК');

  v.append(panel('ЭФИР', nowEl, viz,
    el('div', { class: 'row', style: { marginTop: '12px' } }, playBtn, nextBtn,
      el('span', { class: 'small dim', text: pick(DJ_LINES) })),
    list));

  v.append(panel('О ЧАСТОТЕ',
    el('p', { class: 'p', text: 'Ночную волну запустил ПЕПЕЛ в 2033 году — сначала как канал для вызова врача, потом как музыку. Передатчик перевозят каждые шесть недель. КОРПНАДЗОР находил его одиннадцать раз и каждый раз находил только громкоговоритель и записку: «ВЫ ОПОЗДАЛИ».' })));

  // визуализатор
  const ctx = viz.getContext('2d');
  let raf, t = 0;
  function draw() {
    t += 0.05;
    ctx.clearRect(0, 0, viz.width, viz.height);
    const bars = 64, on = isPlaying();
    for (let i = 0; i < bars; i++) {
      const amp = on
        ? (Math.sin(t * 2 + i * 0.35) * 0.4 + Math.sin(t * 5.3 + i * 0.11) * 0.3 + 0.5) * (0.4 + Math.random() * 0.6)
        : 0.03 + Math.random() * 0.02;
      const h = amp * viz.height * 0.9;
      const x = (i / bars) * viz.width;
      const w = viz.width / bars - 3;
      const g = ctx.createLinearGradient(0, viz.height, 0, viz.height - h);
      g.addColorStop(0, 'rgba(255,46,166,.95)'); g.addColorStop(1, 'rgba(124,247,255,.85)');
      ctx.fillStyle = g;
      ctx.fillRect(x, viz.height - h, w, h);
    }
    raf = requestAnimationFrame(draw);
  }
  draw();
  window.addEventListener('radio:change', renderList);
  renderList();
  v.addEventListener('view:destroy', () => { cancelAnimationFrame(raf); window.removeEventListener('radio:change', renderList); });
  return v;
}

// ══ BBS ══════════════════════════════════════════════════════════════════════
const BBS_SEED = [
  { a: 'ВЕТКА', f: 'sindikat', t: 'ищу напарника на один вечер', b: 'нужен кто-то с ЗОНТОМ. дело на 20 минут, оплата сразу, вопросов не задавать. к куне это отношения не имеет (имеет)', d: '2 ч назад' },
  { a: 'СТАРЫЙ_ШЛЮЗ', f: 'pepel', t: 'опять течёт на втором понтоне', b: 'третий раз за месяц. комбинат прислал бумагу что "заявка принята". бумагой заткнули. держится.', d: '4 ч назад' },
  { a: 'ОПЕРАТОР_К', f: 'zerkalo', t: 'моргнуло в 03:14', b: 'лампы гасли слева направо, полный проход 9 секунд. предыдущий раз был 11 лет назад в ту же минуту. кто ещё видел?', d: '6 ч назад' },
  { a: 'БУХГАЛТЕРИЯ_Ц4', f: 'kombinat', t: 'напоминание о пропусках', b: 'уважаемые сотрудники, проход по чужому пропуску приравнивается к прогулу. администрация. (напоминаем в 41-й раз)', d: '9 ч назад' },
  { a: 'м.', f: 'mitochi', t: '', b: 'дверь открыта. это не приглашение, это состояние двери.', d: '14 ч назад' },
  { a: 'ХОЛОДНАЯ_РУКА', f: 'pepel', t: 'продам ферритовую память дёшево', b: 'память из цеха, не спрашивайте откуда. работает. могу поменять на фильтры 1:3.', d: '1 д назад' },
  { a: 'АНОНИМ', f: 'sindikat', t: 'кто-нибудь вернулся из серой зоны дважды одним путём?', b: 'спрашиваю серьёзно. у меня две карты одного участка, снимал сам, разница 40 метров.', d: '1 д назад' },
  { a: 'ПЕРВОЧТЕЦ_ЗАМ', f: 'zerkalo', t: 'чтение переносится', b: 'вечернее чтение логов переносится на час позже. причина не объявлена. гамма не выходил третий день.', d: '2 д назад' },
];

export function viewBBS() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('ДОСКА ОБЪЯВЛЕНИЙ · КАБЕЛЬ-2', 'БУЛЛЕТИН',
    'Городская доска. Всё, что здесь написано, читает как минимум КОРПНАДЗОР. Пишите соответственно.'));

  const feed = el('div', { class: 'bbs' });
  const title = el('input', { class: 'input', placeholder: 'ЗАГОЛОВОК' });
  const body = el('textarea', { class: 'textarea', placeholder: 'ТЕКСТ СООБЩЕНИЯ...' });

  v.append(panel('НОВОЕ СООБЩЕНИЕ',
    el('div', { class: 'row small dim' }, `Вы публикуете как: ${get().handle}`),
    title, body,
    el('div', { class: 'row', style: { marginTop: '10px' } },
      el('button', { class: 'btn', onclick: post }, 'ОПУБЛИКОВАТЬ'),
      el('span', { class: 'small dim', text: 'Публикация повышает нагрев на 1%. Сообщения хранятся в вашем браузере.' }))));

  function post() {
    if (!title.value.trim() && !body.value.trim()) { toast('Пустое сообщение доска не примет.', 'bad'); return; }
    get().bbs.unshift({ a: get().handle, f: 'mitochi', t: title.value.trim(), b: body.value.trim(), d: 'только что', own: true });
    emit(); addHeat(1); sfx.ok();
    title.value = ''; body.value = '';
    toast('Опубликовано на доске.', 'good');
    render();
  }

  function render() {
    feed.innerHTML = '';
    [...get().bbs, ...BBS_SEED].forEach((p) => {
      const f = FACTIONS[p.f] || FACTIONS.mitochi;
      feed.append(el('article', { class: 'post', style: { '--fc': f.color } },
        el('header', { class: 'post__head' },
          el('span', { class: 'post__a', text: p.a }),
          el('span', { class: 'post__f', text: f.short }),
          el('div', { class: 'sp' }),
          el('span', { class: 'post__d', text: p.d }),
          p.own ? el('button', { class: 'post__del', text: '✕', onclick: () => { S.bbs = get().bbs.filter((x) => x !== p); render(); } }) : null),
        p.t ? el('h3', { class: 'post__t', text: p.t }) : null,
        el('p', { class: 'p', text: p.b })));
    });
  }
  v.append(feed);
  render();
  return v;
}

// ══ ПОЧТА ════════════════════════════════════════════════════════════════════
const MAIL = [
  { id: 'm1', from: 'ВЕТКА', subj: 'ты подключился, я вижу', date: '03:14',
    body: `ну наконец-то.
слушай. я скинула тебе список дел в КОНТРАКТЫ. бери что хочешь, но я бы начала с зонта ольхи — там платят мало, зато пепел тебя запомнит в хорошем смысле.
и да: не лезь в АРХИВ КОРПНАДЗОРА пока у тебя нет зонта и тихого хода. я серьёзно. я один раз полезла.
в.` },
  { id: 'm2', from: 'АРХИВАРИУС 7', subj: 'Регистрация профиля завершена', date: '03:19',
    body: `Ваш профиль зарегистрирован в узле m1tochi.
Доступные разделы архива: КОДЕКС, ХРОНОЛОГИЯ, ДОСЬЕ.
Я обязан предупредить: некоторые архивы читают вас в ответ. Это не метафора, а свойство носителя — ферритовая память фиксирует обращение.
Приятной работы.` },
  { id: 'm3', from: 'КОРПНАДЗОР / автоматическая рассылка', subj: 'Уведомление об уровне внимания', date: '03:22',
    body: `Настоящим уведомляем, что ваша сетевая активность сопровождается в штатном режиме.
Уровень внимания не является мерой пресечения и не влечёт последствий до достижения порога 90%.
Обнуление уровня внимания технически возможно, организационно — нет.
Хорошего вечера.` },
  { id: 'm4', from: 'ТЁТЯ КУНА', subj: 'здравствуй', date: '01:40',
    body: `Здравствуй, милый.
Мне сказали, ты появился в сети. Я не спрашиваю, откуда у тебя терминал.
Если понадобится товар — приходи в ломбард, у меня дорого, но честно. Если понадобятся деньги — тоже приходи, но подумай дважды.
Я записала тебя. Не переживай: пока просто записала.` },
  { id: 'm5', from: 'м.', subj: '', date: '—',
    body: `ты читаешь почту, которую тебе никто не заводил.

посмотри на дату этого письма. её нет.

когда будешь готов — в терминале набери zerkalo. не раньше, чем поймёшь, зачем.` },
  { id: 'm6', from: 'МАТЬ ОЛЬХА', subj: 'если будешь на нижнем', date: 'вчера',
    body: `Если окажешься на первом ярусе — зайди. Не за деньгами, просто зайди.
У нас кончаются фильтры, но это не твоя забота, я знаю. Просто иногда людям нужно, чтобы кто-то пришёл и ничего не попросил.
Зонт я, кстати, потеряла. Ты не видел?` },
];

export function unreadCount() {
  return MAIL.filter((m) => !get().mail.read.includes(m.id) && !get().mail.deleted.includes(m.id)).length;
}

export function viewMail() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('ЯЩИК ДЕКЕРА · ШИФРОВАНИЕ СЛАБОЕ', 'ПОЧТА',
    'Шесть писем. Одно из них не имеет даты, и это не ошибка отображения.'));

  const wrap = el('div', { class: 'mailwrap' });
  const list = el('div', { class: 'maillist' });
  const view = el('div', { class: 'mailview' });

  function render() {
    list.innerHTML = '';
    MAIL.filter((m) => !get().mail.deleted.includes(m.id)).forEach((m) => {
      const unread = !get().mail.read.includes(m.id);
      list.append(el('button', { class: 'mailitem' + (unread ? ' is-unread' : ''), onclick: () => open(m) },
        el('span', { class: 'mailitem__from', text: m.from }),
        el('span', { class: 'mailitem__subj', text: m.subj || '(без темы)' }),
        el('span', { class: 'mailitem__date', text: m.date })));
    });
    if (!list.children.length) list.append(el('p', { class: 'p small', text: 'Ящик пуст. Впервые за долгое время.' }));
  }

  function open(m) {
    sfx.click();
    if (!get().mail.read.includes(m.id)) { get().mail.read.push(m.id); emit(); render(); window.dispatchEvent(new Event('mail:change')); }
    view.innerHTML = '';
    const bodyEl = el('pre', { class: 'mailbody' });
    view.append(
      el('div', { class: 'mailview__head' },
        el('h3', { text: m.subj || '(без темы)' }),
        el('div', { class: 'small dim', text: `ОТ: ${m.from}   ·   ${m.date}` })),
      bodyEl,
      el('div', { class: 'row', style: { marginTop: '14px' } },
        el('button', { class: 'btn btn--sm btn--ghost', onclick: () => { get().mail.deleted.push(m.id); emit(); render(); view.innerHTML = ''; toast('Письмо удалено. Архив, разумеется, сохранил копию.', 'warn'); } }, 'УДАЛИТЬ'),
        el('button', { class: 'btn btn--sm btn--ghost', onclick: () => toast('Ответ отправлен в никуда. Так тут и работает.', 'info') }, 'ОТВЕТИТЬ')));
    typeInto(bodyEl, m.body, 8);
  }

  wrap.append(list, view);
  v.append(wrap);
  render();
  view.append(el('p', { class: 'p dim', text: 'Выберите письмо слева.' }));
  return v;
}
