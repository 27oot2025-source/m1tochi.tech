// ─── НЕОН-КИТЕЖ :: ПРОФИЛЬ / НАСТРОЙКИ / ЖУРНАЛ ──────────────────────────────
import { el, panel, pageHead, bar, toast, fmt, modal, confirmBox, clamp, pick } from '../core/util.js';
import { S, get, emit, reset, exportSave, importSave, LEVELS, ACHIEVEMENTS, unlock, addHeat } from '../core/state.js';
import { sfx, setVolume, musicToggle, isPlaying } from '../core/audio.js';
import { FACTIONS } from '../data/lore.js';
import { ITEMS } from '../data/items.js';
import { CONTRACTS } from '../data/contracts.js';
import { CODEX } from '../data/lore.js';

const HANDLES_A = ['ТИХИЙ', 'ХОЛОДНЫЙ', 'МОКРЫЙ', 'СОЛЁНЫЙ', 'ПЕПЕЛЬНЫЙ', 'ЛАМПОВЫЙ', 'НОЧНОЙ', 'ФЕРРИТОВЫЙ'];
const HANDLES_B = ['ШЛЮЗ', 'КАБЕЛЬ', 'ЗОНТ', 'СОМ', 'МОРЗЕ', 'КОНТУР', 'ПОНТОН', 'ВЕНЕЦ'];

export function viewProfile() {
  const v = el('div', { class: 'view' });
  const g = get();
  v.append(pageHead('ЛИЧНОЕ ДЕЛО · ЗАВЕДЕНО АВТОМАТИЧЕСКИ', 'ПРОФИЛЬ ДЕКЕРА',
    'Всё, что система о вас знает. Всё, что она знает, знает и кто-то ещё.'));

  // ── идентификация
  const handleInp = el('input', { class: 'input', value: g.handle, maxlength: 18 });
  v.append(panel('ИДЕНТИФИКАЦИЯ',
    el('div', { class: 'grid g2' },
      el('label', { class: 'field' }, el('span', { text: 'ПСЕВДОНИМ В СЕТИ' }), handleInp),
      el('label', { class: 'field' }, el('span', { text: 'SIN (СЕТЕВОЙ ИДЕНТИФИКАТОР)' }),
        el('input', { class: 'input', value: g.sin || genSin(), disabled: true }))),
    el('div', { class: 'row' },
      el('button', { class: 'btn btn--sm', onclick: () => { S.handle = handleInp.value.trim() || 'ГОСТЬ-00'; sfx.ok(); toast('Псевдоним обновлён. Старый уже в чьём-то логе.', 'good'); } }, 'СОХРАНИТЬ'),
      el('button', { class: 'btn btn--sm btn--ghost', onclick: () => { handleInp.value = pick(HANDLES_A) + '-' + pick(HANDLES_B); sfx.click(); } }, 'СГЕНЕРИРОВАТЬ'),
      el('button', { class: 'btn btn--sm btn--ghost', onclick: () => { S.sin = genSin(); toast('Новый SIN куплен на чёрном рынке. Нагрев −10.', 'good'); addHeat(-10); } }, 'СМЕНИТЬ SIN (−10 НАГРЕВА)'))));

  function genSin() {
    const s = 'КЖ-' + String(Math.floor(Math.random() * 9000) + 1000) + '-' + String(Math.floor(Math.random() * 90) + 10);
    if (!get().sin) { S.sin = s; }
    return get().sin || s;
  }
  genSin();

  // ── показатели
  const nextXp = LEVELS[g.level] || LEVELS[LEVELS.length - 1];
  const prevXp = LEVELS[g.level - 1] || 0;
  v.append(panel('СОСТОЯНИЕ',
    el('div', { class: 'grid g4' },
      st('УРОВЕНЬ', g.level), st('КРЕДИТЫ', fmt(g.credits) + ' ₭'),
      st('РЁ', g.ryo), st('ОЗУ', g.ram)),
    el('div', { style: { marginTop: '14px' } },
      lbl('ОПЫТ ДЕКЕРА'), bar(g.xp - prevXp, nextXp - prevXp, `${g.xp} / ${nextXp}`),
      lbl('ЦЕЛОСТНОСТЬ ОРГАНИЗМА'), el('div', { class: 'bar bar--good' }, bar(g.hp, 140, g.hp + ' ОЗ').firstChild, el('span', { class: 'bar__label', text: g.hp + ' / 140 ОЗ' })),
      lbl('ВНИМАНИЕ КОРПНАДЗОРА'), el('div', { class: 'bar bar--danger' }, bar(g.heat, 100).firstChild, el('span', { class: 'bar__label', text: g.heat + '%' })))));

  // ── репутация
  const repRows = el('div', { class: 'col' });
  Object.entries(g.rep).forEach(([k, val]) => {
    const f = FACTIONS[k];
    repRows.append(el('div', { class: 'reprow', style: { '--fc': f.color } },
      el('span', { class: 'reprow__n', text: f.name }),
      el('div', { class: 'repbar' }, el('div', { class: 'repbar__mid' }),
        el('div', { class: 'repbar__fill', style: { width: (val + 100) / 2 + '%', background: val < 0 ? 'var(--blood)' : f.color } })),
      el('span', { class: 'reprow__v', text: (val > 0 ? '+' : '') + val }),
      el('span', { class: 'reprow__s', text: repStatus(val) })));
  });
  v.append(panel('ОТНОШЕНИЯ С ФРАКЦИЯМИ', repRows));

  // ── достижения
  const ach = el('div', { class: 'grid g3' });
  Object.entries(ACHIEVEMENTS).forEach(([id, name]) => {
    const has = g.achievements.includes(id);
    ach.append(el('div', { class: 'ach' + (has ? ' is-on' : '') },
      el('span', { class: 'ach__i', text: has ? '★' : '☆' }),
      el('span', { class: 'ach__n', text: has ? name : '???' })));
  });
  v.append(panel(`ДОСТИЖЕНИЯ ${g.achievements.length}/${Object.keys(ACHIEVEMENTS).length}`, ach));

  // ── статистика
  v.append(panel('СВОДКА',
    el('div', { class: 'grid g4' },
      st('ПРОГОНОВ', g.hacks.runs), st('УСПЕШНЫХ', g.hacks.wins),
      st('КОНТРАКТОВ', `${g.contracts.done.length}/${CONTRACTS.length}`),
      st('КОДЕКС', `${g.codexSeen.length}/${CODEX.length}`),
      st('ХРОМА', g.implants.length), st('ПРЕДМЕТОВ', Object.keys(g.inventory).length),
      st('РЕКОРД КАБЕЛЬ', g.arcade.snake), st('РЕКОРД ЛЕДОКОЛ', g.arcade.ice))));

  // ── журнал
  const logBox = el('div', { class: 'logbox' });
  (g.log.length ? g.log : [{ t: Date.now(), text: 'Журнал пуст. Это ненадолго.' }]).slice(0, 60).forEach((l) => {
    const d = new Date(l.t);
    logBox.append(el('div', { class: 'logbox__l' },
      el('span', { class: 'dim', text: `[${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}] ` }), l.text));
  });
  v.append(panel('ЖУРНАЛ СОБЫТИЙ', logBox));

  return v;
}
function st(l, val) { return el('div', { class: 'stat' }, el('div', { class: 'stat__label', text: l }), el('div', { class: 'stat__value', text: val })); }
function lbl(t) { return el('div', { class: 'tiny dim', style: { margin: '12px 0 4px' }, text: t }); }
function repStatus(v) {
  if (v >= 60) return 'СВОЙ';
  if (v >= 25) return 'ДОВЕРИЕ';
  if (v >= 5) return 'ЗНАКОМЫ';
  if (v > -20) return 'НЕЙТРАЛЬНО';
  if (v > -50) return 'НЕДОВОЛЬНЫ';
  return 'ВРАГ';
}

// ══ НАСТРОЙКИ ════════════════════════════════════════════════════════════════
export function viewSettings(applyFx) {
  const v = el('div', { class: 'view' });
  v.append(pageHead('КОНФИГУРАЦИЯ ТЕРМИНАЛА', 'НАСТРОЙКИ',
    'Всё сохраняется локально в вашем браузере. Сервера нет — как и у настоящего m1tochi.'));

  const s = get().settings;
  const themes = [
    { id: 'neon', name: 'НЕОН', desc: 'Розово-голубой, как вывески Стёкол' },
    { id: 'amber', name: 'ЯНТАРЬ', desc: 'Монохром терминалов Комбината' },
    { id: 'phosphor', name: 'ФОСФОР', desc: 'Зелёный ЭЛТ машинного зала' },
    { id: 'ice', name: 'ЛЁД', desc: 'Холодный синий, частота КОРПНАДЗОРА' },
  ];
  const themeGrid = el('div', { class: 'grid g4' });
  themes.forEach((t) => {
    themeGrid.append(el('button', { class: 'themecard' + (s.theme === t.id ? ' is-on' : ''), 'data-t': t.id,
      onclick: () => { s.theme = t.id; emit(); applyFx(); sfx.ok(); [...themeGrid.children].forEach((c) => c.classList.toggle('is-on', c.dataset.t === t.id)); } },
      el('div', { class: 'themecard__sw' }),
      el('b', { text: t.name }), el('span', { class: 'tiny dim', text: t.desc })));
  });
  v.append(panel('ЦВЕТОВОЙ РЕЖИМ', themeGrid));

  const toggles = [
    ['crt', 'ЭЛТ-ВИНЬЕТКА', 'Затемнение по краям как у настоящего кинескопа'],
    ['scan', 'СКАНЛАЙНЫ', 'Горизонтальные полосы развёртки'],
    ['flicker', 'МЕРЦАНИЕ', 'Редкие просадки яркости'],
    ['sound', 'ЗВУК', 'Пищалки интерфейса и синтезатор'],
    ['motion', 'АНИМАЦИИ', 'Отключите, если укачивает'],
    ['boot', 'ЗАСТАВКА ЗАГРУЗКИ', 'Показывать ПЗУ-заставку при старте'],
  ];
  const tg = el('div', { class: 'col' });
  toggles.forEach(([k, name, desc]) => {
    const btn = el('button', { class: 'switch' + (s[k] ? ' is-on' : ''), onclick: () => {
      s[k] = !s[k]; emit(); applyFx(); sfx.click();
      btn.classList.toggle('is-on', s[k]); btn.lastChild.textContent = s[k] ? 'ВКЛ' : 'ВЫКЛ';
    } },
      el('span', { class: 'switch__n' }, el('b', { text: name }), el('span', { class: 'tiny dim', text: desc })),
      el('span', { class: 'switch__v', text: s[k] ? 'ВКЛ' : 'ВЫКЛ' }));
    tg.append(btn);
  });
  const vol = el('input', { type: 'range', min: '0', max: '100', value: String(Math.round(s.volume * 100)), class: 'range',
    oninput: (e) => { s.volume = e.target.value / 100; setVolume(s.volume); emit(); } });
  v.append(panel('ЭФФЕКТЫ И ЗВУК', tg, el('label', { class: 'field', style: { marginTop: '12px' } }, el('span', { text: 'ГРОМКОСТЬ' }), vol)));

  const code = el('textarea', { class: 'textarea', placeholder: 'Вставьте код сохранения сюда...' });
  v.append(panel('СОХРАНЕНИЕ',
    el('div', { class: 'row' },
      el('button', { class: 'btn btn--sm', onclick: () => { code.value = exportSave(); code.select(); toast('Код в поле ниже. Скопируйте и храните.', 'good'); } }, 'ЭКСПОРТ'),
      el('button', { class: 'btn btn--sm', onclick: () => { importSave(code.value) ? (toast('Загружено. Обновите страницу.', 'good'), sfx.ok()) : (toast('Код повреждён.', 'bad'), sfx.bad()); } }, 'ИМПОРТ'),
      el('button', { class: 'btn btn--sm btn--danger', onclick: () => confirmBox('СБРОС ПРОФИЛЯ', 'Все кредиты, репутация, контракты и достижения будут стёрты. Архив, разумеется, сохранит копию — но вам её не отдадут. Продолжить?', () => { reset(); location.reload(); }) }, 'СБРОС')),
    code));

  v.append(panel('ГОРЯЧИЕ КЛАВИШИ',
    el('div', { class: 'grid g2' },
      kb('1 … 9', 'быстрый переход по разделам'),
      kb('T', 'терминал'),
      kb('M', 'вкл/выкл эфир Ночной волны'),
      kb('Esc', 'закрыть окно'),
      kb('Ctrl + K', 'командная палитра'),
      kb('?', 'справка'))));

  v.append(panel('О ПРОЕКТЕ',
    el('p', { class: 'p', text: 'НЕОН-КИТЕЖ — вымышленная вселенная и интерактивный терминал. Никаких внешних библиотек, фреймворков и сетевых запросов: вся графика, музыка и логика генерируются прямо в браузере. Музыка синтезируется через WebAudio в реальном времени, фон рисуется на canvas, прогресс хранится в localStorage.' }),
    el('p', { class: 'p small dim', text: 'Любые совпадения с реальными закрытыми городами, вычислительными комплексами и бухгалтериями, пережившими три государства, — случайны.' })));
  return v;
}
function kb(k, d) { return el('div', { class: 'kb' }, el('kbd', { text: k }), el('span', { class: 'small dim', text: d })); }
