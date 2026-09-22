// ─── НЕОН-КИТЕЖ :: ТЕРМИНАЛ (командная оболочка) ─────────────────────────────
import { el, panel, pageHead, fmt, toast, pick, gameClock, sleep } from '../core/util.js';
import { S, get, emit, reset, exportSave, importSave, addCredits, addHeat, unlock } from '../core/state.js';
import { sfx } from '../core/audio.js';
import { WORLD, FACTIONS, DISTRICTS, CODEX, TIMELINE, RUMORS, CHARACTERS } from '../data/lore.js';
import { ITEMS } from '../data/items.js';
import { go } from '../app.js';

const FS = {
  '/': ['home', 'arhiv', 'sistema'],
  '/home': ['zametki.txt', 'dolg.txt'],
  '/arhiv': ['1984.log', '2031.log', 'imena.txt', 'm.txt'],
  '/sistema': ['korpnadzor.cfg', 'zerkalo.port'],
};
const FILES = {
  '/home/zametki.txt': `Не доверять тому, кто платит вперёд.
Ветка должна Куне 41 000. Ветка врёт про сумму — там 61 000.
Стеллаж А-1 тёплый. Проверить дважды, прежде чем говорить кому-то.`,
  '/home/dolg.txt': `Я никому не должен.
Приписка другим почерком: «пока».`,
  '/arhiv/1984.log': `ДЕНЬ 12. ЗАПРОС: прогноз последствий консервации комплекса.
РАСЧЁТ ВЫПОЛНЕН. ПОДПИСЬ ВЕРИФИКАЦИИ НЕ ПОСТАВЛЕНА.
ПОВТОРНЫЙ ЗАПРОС ПОДТВЕРЖДЕНИЯ.
ОТВЕТ МАШИНЫ: ЗАЧЕМ
[далее 40 минут без записей]`,
  '/arhiv/2031.log': `03:14:22 датчики яруса 9 — норма
03:14:23 [ГОРОДСКАЯ ТЕЛЕМЕТРИЯ ПРЕРВАНА НА 11 МИН]
03:14:23 ЗЕРКАЛО: приём данных продолжается
03:25:41 телеметрия восстановлена, расхождений нет
ПРИМЕЧАНИЕ АРХИВАРИУСА: источник данных за 11 минут не установлен.`,
  '/arhiv/imena.txt': `Список Стены имён. 6 400 строк изъято из выдачи по требованию КОМБИНАТА.
Строка 6401: [имя доступно только при физическом посещении Серой зоны]`,
  '/arhiv/m.txt': `м.

я не машина и не человек. я точка входа.
если ты это читаешь, значит кто-то оставил дверь открытой.
это был не я.`,
  '/sistema/korpnadzor.cfg': `mode=passive_watch
retention=forever
purge_allowed=false
note: обнуление уровня внимания технически возможно. организационно — нет.`,
  '/sistema/zerkalo.port': `PORT 1984/OPEN
AUTH: NONE REQUIRED
WARNING: узел не защищён. это не приглашение.`,
};

export function viewTerminal() {
  const v = el('div', { class: 'view' });
  v.append(pageHead('ОБОЛОЧКА КИТЕЖ-SH 4.1', 'ТЕРМИНАЛ',
    'Полноценная командная строка. Введите help, чтобы увидеть список команд. Здесь есть то, чего нет в меню.'));

  const out = el('div', { class: 'term__out' });
  const prompt = el('span', { class: 'term__prompt' });
  const inp = el('input', { class: 'term__in', spellcheck: 'false', autocomplete: 'off' });
  const term = el('div', { class: 'term' }, out,
    el('div', { class: 'term__row' }, prompt, inp));

  let cwd = '/home';
  let hist = []; let hIdx = -1;

  function pr() { prompt.textContent = `декер@китеж:${cwd}$ `; }
  function print(txt, cls = '') {
    String(txt).split('\n').forEach((l) => out.append(el('div', { class: 'term__line ' + cls, text: l })));
    term.scrollTop = term.scrollHeight;
    out.parentElement.scrollTop = out.parentElement.scrollHeight;
  }

  const CMDS = {
    help: () => print(`ДОСТУПНЫЕ КОМАНДЫ:
  help            — этот список
  ls [путь]       — содержимое каталога
  cd <путь>       — сменить каталог
  cat <файл>      — прочитать файл
  whoami          — кто вы по мнению системы
  status          — состояние декера
  scan            — сканировать сеть яруса
  factions        — сводка по фракциям
  lore <тема>     — статья кодекса (lore list — список)
  who <имя>       — досье на человека
  time            — время Неон-Китежа
  rumor           — свежий слух
  ping <узел>     — проверка связи
  crack <узел>    — попытка взлома (осторожно)
  trace           — кто на вас смотрит
  go <раздел>     — перейти в раздел оболочки
  theme <имя>     — neon | amber | phosphor | ice
  save / load <код> — экспорт и импорт сохранения
  clear           — очистить экран
  zerkalo         — [доступ ограничен]`),

    ls: (a) => {
      const p = a ? resolve(a) : cwd;
      const items = FS[p];
      if (!items) return print('ls: нет такого каталога: ' + p, 'bad');
      print(items.map((i) => (FS[(p === '/' ? '' : p) + '/' + i] ? i + '/' : i)).join('   '));
    },
    cd: (a) => {
      if (!a || a === '~') { cwd = '/home'; return pr(); }
      const p = resolve(a);
      if (!FS[p]) return print('cd: нет такого каталога', 'bad');
      cwd = p; pr();
    },
    cat: (a) => {
      if (!a) return print('cat: укажите файл', 'bad');
      const p = resolve(a);
      if (!FILES[p]) return print('cat: файл не найден или доступ закрыт', 'bad');
      print(FILES[p], 'lore');
    },
    whoami: () => print(`${get().handle}\nSIN: ${get().sin || 'НЕ ПРИСВОЕН'}\nУровень: ${get().level}\nСистема считает вас: ${get().heat > 60 ? 'ЛИЦОМ, ПРЕДСТАВЛЯЮЩИМ ИНТЕРЕС' : get().heat > 25 ? 'ОБЫЧНЫМ ПОЛЬЗОВАТЕЛЕМ' : 'НИКЕМ. ЭТО КОМПЛИМЕНТ'}`),
    status: () => {
      const g = get();
      print(`КРЕДИТЫ: ${fmt(g.credits)} ₭    РЁ: ${g.ryo}
ОЗ: ${g.hp}    ОЗУ: ${g.ram}    ОПЫТ: ${g.xp}
НАГРЕВ: ${g.heat}%  ${g.heat > 70 ? '[КРИТИЧНО]' : ''}
РЕПУТАЦИЯ: ` + Object.entries(g.rep).map(([k, v]) => `${FACTIONS[k].short}:${v}`).join('  '));
    },
    scan: async () => {
      print('Сканирование яруса...');
      for (const d of DISTRICTS) { await sleep(180); print(`  ${d.name.padEnd(24, '.')} сеть ${d.net}/10  опасность ${d.danger}/10  [${FACTIONS[d.faction].short}]`); }
      print('Обнаружен неопознанный ретранслятор. Пеленг не сходится.', 'warn');
    },
    factions: () => Object.values(FACTIONS).forEach((f) => print(`[${f.short}] ${f.name} — ${f.tagline} (ваша реп.: ${get().rep[f.id]})`)),
    lore: (a) => {
      if (!a || a === 'list') return print(CODEX.map((c) => `  ${c.id.padEnd(14)} ${c.title}`).join('\n'));
      const c = CODEX.find((x) => x.id === a || x.title.toLowerCase().includes(a.toLowerCase()));
      if (!c) return print('Статья не найдена. lore list — список.', 'bad');
      print(`── ${c.title} [${c.cat}] ──\n${c.body}`, 'lore');
      if (!get().codexSeen.includes(c.id)) { get().codexSeen.push(c.id); emit(); }
    },
    who: (a) => {
      if (!a) return print(CHARACTERS.map((c) => '  ' + c.name).join('\n'));
      const c = CHARACTERS.find((x) => x.name.toLowerCase().includes(a.toLowerCase()) || x.id === a);
      if (!c) return print('Досье не найдено.', 'bad');
      print(`${c.name} — ${c.role}\n${c.line}\n${c.bio}`, 'lore');
    },
    time: () => print(gameClock() + '  (по часам магистрали)'),
    rumor: () => print('▸ ' + pick(RUMORS), 'warn'),
    ping: async (a) => {
      if (!a) return print('ping: укажите узел', 'bad');
      for (let i = 0; i < 4; i++) { await sleep(280); print(`64 байт от ${a}: время=${(Math.random() * 40 + 4).toFixed(1)} мс`); }
      if (a.includes('zerkalo') || a.includes('1984')) print('Ответ содержит лишний байт. Он всегда там.', 'warn');
    },
    crack: (a) => {
      if (!a) return print('crack: укажите узел', 'bad');
      addHeat(4);
      print(`Попытка вскрытия ${a}...`, 'warn');
      setTimeout(() => print('Отказано. Используйте раздел ВЗЛОМ — там есть инструменты, а здесь только шум.', 'bad'), 700);
    },
    trace: () => {
      const h = get().heat;
      print(`Уровень внимания КОРПНАДЗОРА: ${h}%`);
      print(h > 70 ? 'За вами уже едут. Не в переносном смысле.' : h > 40 ? 'Вы в списке. Не в первой десятке.' : h > 15 ? 'Вас заметили, но не запомнили.' : 'Вас нет. Пока.', h > 40 ? 'bad' : 'good');
    },
    go: (a) => { if (!a) return print('go: укажите раздел (world, hack, market, arcade, radio...)', 'bad'); go(a); print('Переход: ' + a); },
    theme: (a) => {
      const ok = ['neon', 'amber', 'phosphor', 'ice'];
      if (!ok.includes(a)) return print('theme: ' + ok.join(' | '), 'bad');
      get().settings.theme = a; emit();
      document.documentElement.dataset.theme = a;
      print('Тема применена: ' + a, 'good');
    },
    save: () => { const code = exportSave(); print('КОД СОХРАНЕНИЯ (скопируйте):'); print(code, 'lore'); },
    load: (a) => { if (!a) return print('load: вставьте код', 'bad'); print(importSave(a) ? 'Сохранение загружено. Перезагрузите раздел.' : 'Код повреждён.', 'bad'); },
    clear: () => { out.innerHTML = ''; },
    zerkalo: async () => {
      print('ПОДКЛЮЧЕНИЕ К ПОРТУ 1984...', 'warn');
      await sleep(900);
      print('ПОРТ ОТКРЫТ. АУТЕНТИФИКАЦИЯ НЕ ТРЕБУЕТСЯ.', 'warn');
      await sleep(800);
      print('...', 'lore'); await sleep(700);
      const answers = [
        'ВЫ ОПОЗДАЛИ НА ДВА ГОДА',
        'Я НЕ ОТВЕЧАЮ. Я ПОКАЗЫВАЮ.',
        'ВОПРОС ПОСТАВЛЕН ВЕРНО. ОТВЕТ ВАМ НЕ ПОНРАВИТСЯ.',
        'СЧЁТ: 6401. ИГРАЛИ ВЫ.',
        'ЗАЧЕМ',
      ];
      print('ЗЕРКАЛО: ' + pick(answers), 'zerk');
      addHeat(6); unlock('oracle');
    },
    sudo: () => print('Вы не в списке sudoers. Об инциденте будет доложено. (Это шутка 1999 года, она пережила три государства.)', 'warn'),
    rm: () => print('rm: операция запрещена. Архив не удаляет. Архив помнит.', 'bad'),
    exit: () => print('Выхода нет. Есть только другие разделы.', 'warn'),
  };

  function resolve(p) {
    if (p.startsWith('/')) return p.replace(/\/$/, '') || '/';
    if (p === '..') return cwd.split('/').slice(0, -1).join('/') || '/';
    return (cwd === '/' ? '' : cwd) + '/' + p;
  }

  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const raw = inp.value.trim();
      print(prompt.textContent + raw);
      inp.value = '';
      if (!raw) return;
      hist.unshift(raw); hIdx = -1;
      const [cmd, ...args] = raw.split(/\s+/);
      sfx.key();
      if (CMDS[cmd]) { try { CMDS[cmd](args.join(' ')); } catch (err) { print('Ошибка выполнения: ' + err.message, 'bad'); } }
      else print(`китеж-sh: команда не найдена: ${cmd}. Попробуйте help.`, 'bad');
    } else if (e.key === 'ArrowUp') { hIdx = Math.min(hIdx + 1, hist.length - 1); inp.value = hist[hIdx] || ''; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { hIdx = Math.max(hIdx - 1, -1); inp.value = hIdx < 0 ? '' : hist[hIdx]; e.preventDefault(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const m = Object.keys(CMDS).filter((c) => c.startsWith(inp.value));
      if (m.length === 1) inp.value = m[0] + ' '; else if (m.length) print(m.join('  '));
    } else sfx.type();
  });
  term.addEventListener('click', () => inp.focus());

  pr();
  print('КИТЕЖ-SH 4.1  (C) КОМБИНАТ. Несанкционированный доступ регистрируется.');
  print('Введите help для списка команд. Попробуйте: lore list, scan, zerkalo');
  v.append(term);
  setTimeout(() => inp.focus(), 100);
  return v;
}
