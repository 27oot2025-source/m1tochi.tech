/* ============================================================
   ВОЛЬТГРАД-88 · терминал ВОЛЬТ-OS
   ============================================================ */
window.TERMINAL = (function () {
  const body = () => document.getElementById('term-body');
  const input = () => document.getElementById('term-input');
  let history = [];
  let hIdx = -1;
  let cwd = '~';
  let started = false;
  let secretDone = false;

  function out(html, cls) {
    const d = document.createElement('div');
    d.className = 't-out' + (cls ? ' ' + cls : '');
    d.innerHTML = html;
    body().appendChild(d);
    body().scrollTop = body().scrollHeight;
    return d;
  }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function promptStr() {
    const name = (window.VOLT_STATE && VOLT_STATE.profile && VOLT_STATE.profile.name)
      ? VOLT_STATE.profile.name.toLowerCase().replace(/[^а-яёa-z0-9-]/g, '') || 'волт'
      : 'волт';
    const s = name + '@9:' + cwd + '$';
    const p = document.getElementById('term-prompt');
    if (p) p.textContent = s;
    return s;
  }

  function helpText() {
    return [
      '<span class="t-cyan">ТЕРМИНАЛ ВОЛЬТ-OS 8.8.8 · КОМАНДЫ:</span>',
      '  help              — этот список',
      '  ls                — файлы в текущей директории',
      '  cat <файл>        — прочитать файл',
      '  cd ~|файлы        — сменить директорию (подсказка: ~/.эфир)',
      '  pwd               — где ты (всегда здесь)',
      '  whoami            — кто ты для сети',
      '  date              — время города',
      '  credits           — состояние твоего счета',
      '  news              — последняя сводка эфира',
      '  scan              — сканировать район',
      '  hack <цель>       — попытка взлома (Игла, док, ББ, метка-счетчика)',
      '  matrix            — режим «красного дерева»',
      '  clear             — очистить экран (сеть все запомнит)',
      '  secret            — [не в списке. ты все равно догадался]',
      '  exit              — выйти из города',
    ].join('\n');
  }

  const CMD = {
    help() { out(helpText()); },
    ls() {
      const files = Object.keys(VOLT.DATA.termFiles);
      let list;
      if (cwd === '~') list = files;
      else if (cwd === 'эфир') list = ['секретный_канал.log', ...(secretDone ? ['secret.txt'] : [])];
      else list = [];
      if (!list.length) { out('пусто. слишком пусто.', 't-dim'); return; }
      out(list.map(f => '<span class="t-yel">' + esc(f) + '</span>').join('   '));
    },
    pwd() { out('/город/волтград/сектор-9/терминал' + (cwd === '~' ? '' : '/' + cwd), 't-cyan'); },
    whoami() {
      const p = window.VOLT_STATE && VOLT_STATE.profile;
      if (p && p.name) {
        out('ТЫ: <span class="t-mag">' + esc(p.name) + '</span> · класс: ' + esc(p.className) +
          ' · счет: ' + p.credits + ' КР', 't-white');
        out('сеть отмечает: «оперативник. активен. смотрит.»', 't-dim');
      } else {
        out('волт — идентификатор не синхронизирован. см. вкладку «Досье».', 't-dim');
      }
    },
    date() {
      out(cityTimeString() + ' · лето 1988 · тариф света: 12 КР/Вт·ч (белый: +40%)', 't-cyan');
    },
    credits() {
      const s = window.VOLT_STATE;
      out('СЧЕТ: <span class="t-yel">' + s.credits.toLocaleString('ru-RU') + ' КР</span>' +
        (s.credits < 10000 ? ' · сеть напоминает: свет — товар' : ''), s.credits < 10000 ? 't-red' : 't-white');
    },
    news() {
      const n = VOLT.DATA.news.slice(0, 3);
      out('<span class="t-cyan">ЭФИР · последние сводки:</span>', '');
      n.forEach(x => out('[' + x.date + '] ' + esc(x.title), 't-white'));
      out('…полный поток — вкладка «Эфир».', 't-dim');
    },
    clear() { body().innerHTML = ''; },
    exit() {
      out('выход отклонен.', 't-red');
      out('ты не в терминале. ты в городе. выход — за северной водой.', 't-dim');
      out('совет: он не существует.', 't-dim');
    },
    secret() {
      if (!secretDone) {
        secretDone = true;
        const d = document.createElement('div');
        d.className = 't-out t-mag';
        body().appendChild(d);
        let i = 0;
        const msg = '\n\n>> слово принято.\n>> канал открыт.\n\nПИСЬМО (перехвачено):\n«…выключи свет в 03:33. посмотри на небо…»\n\n>> след получен: ТЕМНОЕ СЛОВО\n>> см. «Кодекс секретов».';
        const t = setInterval(() => {
          d.textContent = msg.slice(0, ++i);
          if (i % 3 === 0) SFX.tick();
          body().scrollTop = body().scrollHeight;
          if (i >= msg.length) {
            clearInterval(t);
            if (window.APP) APP.unlockSecret('word');
          }
        }, 18);
      } else {
        out('слово уже сказано. небо уже видно.', 't-dim');
      }
    },
    matrix() { if (window.APP) APP.toggleMatrix(); },
    konami() { out('↑ ↑ ↓ ↓ ← → ← → B A. старый код. он работает на клавиатуре.', 't-dim'); },
  };

  function cityTimeString() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  function doScan() {
    SFX.scan();
    const districts = VOLT.DATA.districts;
    const pick = districts[Math.floor(Math.random() * districts.length)];
    const lines = [
      'сканирование… ' + pick.name,
      '  камеры: ' + (pick.id === 'dead' ? 'НЕТ СВЯЗИ (забор)' : '4/' + (2 + Math.floor(Math.random() * 4))),
      '  светоизбыточность: ' + (pick.neon * 10) + '%',
      '  эфирная плотность: ' + pick.ether + '/10',
      pick.id === 'dead' ? '  >> аномалия: на 88.8 что-то передает.' :
      pick.id === 'needle' ? '  >> подсвечено: 64 маяка. +1 тень на крыше.' :
      pick.id === 'neon' ? '  >> подсвечено: подвал №7. торговец на месте.' :
      '  >> объектов под наблюдением: ' + (1 + Math.floor(Math.random() * 9)),
    ];
    lines.forEach((l, i) => setTimeout(() => out(l, i === 0 ? 't-cyan' : (l.includes('>>') ? 't-mag' : 't-white')), i * 160));
  }

  function doHack(arg) {
    const t = (arg || '').toLowerCase();
    SFX.scan();
    if (!t) {
      out('usage: hack <цель>. цели: игла, док, бб, счетчик', 't-dim');
      return;
    }
    const seq = [
      'цель: ' + arg,
      '  подключение через темный эфир…',
      '  лёд: ' + (Math.floor(Math.random() * 8) + 3) + ' см',
      '  инъекция…'
    ];
    seq.forEach((l, i) => setTimeout(() => out(l, 't-white'), i * 220));
    const ok = Math.random() < 0.6;
    setTimeout(() => {
      if (t.includes('счетчик') || t.includes('meter')) {
        out('  >> СЧЕТЧИК СЛОМАН. город +1.', 't-grn t-white');
        out('  >> «ШОФЁР» одобряет. (+500 КР)', 't-yel');
        if (window.APP) APP.addCredits(500);
      } else if (ok) {
        if (t.includes('игла') || t.includes('needle')) out('  >> ИГЛА: получен фрагмент протокола «РАССВЕТ». он не полный. он хмурится.', 't-mag');
        else if (t.includes('док')) out('  >> ДОК: база БОРЭАЛЯ мерцает. одна запись: «65-й маяк — для неба».', 't-mag');
        else if (t.includes('бб') || t.includes('бб')) out('  >> ЧЁРНЫЙ ЯЩИК: «мы тоже тебя смотрим. приятных снов.»', 't-mag');
        else out('  >> ЦЕЛЬ ОТВЕРГЛА: «не сегодня. город устал».', 't-mag');
        out('  >> доступ частично получен.', 't-grn');
      } else {
        out('  >> ОТКАЗ. лёд устоял.', 't-red');
        out('  >> сеть отмечает попытку. (вкладка «Досье» знает)', 't-dim');
      }
    }, seq.length * 220 + 120);
  }

  function exec(line) {
    const parts = line.trim().split(/\s+/);
    const cmd = (parts[0] || '').toLowerCase();
    const arg = parts.slice(1).join(' ');
    out('<span class="t-mag">' + esc(promptStr()) + '</span> <span class="t-white">' + esc(line) + '</span>');
    if (!cmd) return;
    if (cmd === 'sudo') { out('волт не входит в группу sudoers. инцидент будет объявлен по свету.', 't-red'); return; }
    if (cmd === 'hack') { doHack(arg); return; }
    if (cmd === 'scan') { doScan(); return; }
    if (cmd === 'cat') {
      const f = arg.replace(/^.*\//, '');
      if (cwd === 'эфир' && (f === 'секретный_канал.log' || f === 'secret.txt')) {
        if (secretDone) out(VOLT.DATA.docs[2].text, 't-mag');
        else out('канал молчит. пока. (команда: secret)', 't-dim');
        return;
      }
      const content = VOLT.DATA.termFiles[f];
      if (!content) { out('cat: ' + esc(f) + ': нет такого файла. город скромен.', 't-red'); return; }
      out(esc(content).split('\n').map(l => '<span class="t-white">' + l + '</span>').join('\n'));
      return;
    }
    if (cmd === 'cd') {
      if (!arg || arg === '~') { cwd = '~'; promptStr(); return; }
      const a = arg.toLowerCase();
      if (a === 'эфир' || a === 'air') { cwd = 'эфир'; out('cd: эфир. глубина: 16 бит.', 't-cyan'); promptStr(); return; }
      out('cd: нет такой директории. город плоский, но закрытый.', 't-red');
      return;
    }
    if (CMD[cmd]) CMD[cmd]();
    else out('команда не найдена: ' + esc(cmd) + '. см. help. или не см. — город умеет читать мысли.', 't-red');
  }

  return {
    start() {
      if (started) return;
      started = true;
      promptStr();
      out('<span class="t-cyan">ВОЛЬТ-OS 8.8.8 (c) 1988 СИНТЕЗКОРП</span>', '');
      out('канал 9 · сектор 9 · свет: тарифицирован', 't-dim');
      out('');
      out('добро пожаловать, гость. введите <span class="t-mag">help</span>.', 't-white');
      out('подсказка: в ~/ есть файлы. в /эфир — тишина. в тишине — command, которой нет в списке.', 't-dim');
      out('');
      const inp = input();
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const v = inp.value;
          inp.value = '';
          if (v.trim()) { history.push(v); hIdx = history.length; }
          exec(v);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (hIdx > 0) { hIdx--; inp.value = history[hIdx] || ''; }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (hIdx < history.length - 1) { hIdx++; inp.value = history[hIdx] || ''; } else { hIdx = history.length; inp.value = ''; }
        }
      });
    },
    focus() { const i = input(); if (i && document.getElementById('tab-terminal').classList.contains('hidden') === false) i.focus(); },
    resetPrompt() { promptStr(); },
  };
})();
