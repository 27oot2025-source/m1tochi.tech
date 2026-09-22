/* ============================================================
   ВОЛЬТГРАД-88 · приложение
   ============================================================ */
(function () {
  'use strict';
  const D = () => VOLT.DATA;

  /* ================= СОСТОЯНИЕ ================= */
  const KEY = 'volt88_state_v1';
  const DEF = {
    credits: 50000,
    inventory: [],
    cart: [],
    profile: null,
    secrets: [],
    visited: [],
    sound: true,
    crt: false,
    keyUnlocked: false,
    decryptedDocs: [],
  };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, DEF);
      const s = JSON.parse(raw);
      return Object.assign({}, DEF, s);
    } catch (e) { return Object.assign({}, DEF); }
  }
  window.VOLT_STATE = load();
  const S = window.VOLT_STATE;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  const $ = id => document.getElementById(id);
  const fmt = n => Number(n).toLocaleString('ru-RU');
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ================= ТОСТЫ ================= */
  function toast(title, text, type) {
    const box = $('toasts');
    const t = document.createElement('div');
    t.className = 'toast ' + (type || '');
    t.innerHTML = '<div class="t-title">' + esc(title) + '</div>' + esc(text);
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 450); }, 4600);
  }

  /* ================= ТИПЕРАЙТЕР ================= */
  const tw = new Map();
  function typewrite(el, text, speed) {
    if (!el) return;
    if (tw.has(el)) clearInterval(tw.get(el));
    let i = 0;
    el.textContent = '';
    const t = setInterval(() => {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(t); tw.delete(el); }
    }, speed || 18);
    tw.set(el, t);
  }

  /* ================= ВКЛАДКИ ================= */
  const TABS = [
    ['home', '⌂ ГЛАВНАЯ'], ['lore', '📼 ЛОР'], ['corps', '⬢ КОРПОРАЦИИ'],
    ['districts', '▦ РАЙОНЫ'], ['news', '☰ ЭФИР'], ['market', '🛒 РЫНОК'],
    ['terminal', '⌁ ТЕРМИНАЛ'], ['radio', '♫ РАДИО'], ['dossier', '🪪 ДОСЬЕ'],
    ['wanted', '☗ РОЗЫСК'], ['glossary', '✎ ГЛОССАРИЙ'], ['secrets', '🔐 СЕКРЕТЫ'],
    ['system', '⚙ СИСТЕМА'],
  ];

  function showTab(id, noHistory) {
    const panel = $('tab-' + id);
    if (!panel) return;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    panel.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    const intro = panel.querySelector('[data-intro]');
    if (intro) typewrite(intro, intro.dataset.intro);
    if (id === 'terminal') setTimeout(() => TERMINAL.focus(), 300);
    if (id === 'districts' && !window._districtInit) { window._districtInit = true; selectDistrict('neon'); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!noHistory && location.hash !== '#' + id) {
      try { history.replaceState(null, '', '#' + id); } catch (e) {}
    }
    // слежение за посещением
    if (!S.visited.includes(id)) {
      S.visited.push(id);
      save();
      if (S.visited.length >= TABS.length) unlockSecret('tour');
    }
  }

  function buildNav() {
    const nav = $('nav');
    nav.innerHTML = TABS.map(([id, label]) =>
      '<button class="nav-btn" data-tab="' + id + '">' + label + '</button>').join('');
    nav.querySelectorAll('.nav-btn').forEach(b => {
      b.addEventListener('click', () => { SFX.nav(); showTab(b.dataset.tab); });
      b.addEventListener('mouseenter', () => SFX.hover());
    });
    document.querySelectorAll('[data-goto]').forEach(btn => {
      btn.addEventListener('click', () => { SFX.nav(); showTab(btn.dataset.goto.replace('tab-', '')); });
    });
  }

  /* ================= ЧАСЫ / ЭФИР ================= */
  let ether = 87;
  function startClock() {
    const tick = () => {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      const t = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
      const c = $('city-clock'); if (c) c.textContent = t;
      ether = Math.max(58, Math.min(99, ether + (Math.random() - 0.48) * 3));
      const e = Math.round(ether);
      const el = $('ether-load'); if (el) { el.textContent = e + '%'; el.classList.toggle('hot', e > 92); }
      const h = $('home-ether'); if (h) h.textContent = e + '%';
    };
    tick();
    setInterval(tick, 1000);
  }

  function startTicker() {
    const items = D().news.slice(0, 8).map(n =>
      '<span class="ticker-item"><b>[ЭФИР]</b> ' + esc(n.title) + '</span>');
    $('ticker-track').innerHTML = items.join('') + items.join('');
  }

  /* ================= ГЛАВНАЯ ================= */
  function renderHome() {
    $('home-stats').innerHTML = [
      ['НАСЕЛЕНИЕ', '2 100 000', 'все — клиенты', ''],
      ['КОРПОРАЦИИ', '6', 'официально', 'mag'],
      ['РАЙОНЫ', '6', 'из них 1 молчит', ''],
      ['В РОЗЫСКЕ', '4', 'один — не человек', 'yel'],
      ['СВЕТ', '12 КР', 'за Вт·ч (белый +40%)', 'yel'],
      ['НАГРУЗКА ЭФИРА', '<span id="home-ether">87%</span>', 'live-телеметрия', 'mag'],
    ].map(([l, v, n, c]) =>
      '<div class="stat-card ' + (c || '') + '"><div class="stat-label">' + l + '</div><div class="stat-value">' + v + '</div><div class="stat-note">' + n + '</div></div>'
    ).join('');

    $('home-news').innerHTML = D().news.slice(0, 4).map(n =>
      '<div class="hn-item"><div class="hn-title">' + esc(n.title) + '</div><div class="hn-meta">' + n.date + ' · ' + esc(n.tag) + '</div></div>'
    ).join('');

    renderHomeDossier();
  }
  function renderHomeDossier() {
    const el = $('home-dossier');
    const badge = $('home-profile-badge');
    if (!S.profile) {
      badge.textContent = 'ДОСЬЕ ПУСТО';
      el.innerHTML = '<div class="hd-empty">Город видит в тебе «гостя». Синхронизируй досье — и город назовет тебя по имени.<br><br><button class="btn btn-ghost btn-sm" data-goto="tab-dossier">СОЗДАТЬ ДОСЬЕ →</button></div>';
      el.querySelector('[data-goto]').addEventListener('click', () => { SFX.nav(); showTab('dossier'); });
      return;
    }
    const p = S.profile;
    badge.textContent = p.name.toUpperCase();
    const rows = Object.entries(p.stats).map(([k, v]) =>
      '<div class="hd-row"><span>' + D().statNames[k] + '</span><span class="bar"><i data-w="' + (v * 10) + '"></i></span><span>' + v + '</span></div>'
    ).join('');
    el.innerHTML = '<div class="hd-name">' + esc(p.name) + '</div><div class="hd-class">класс: ' + esc(p.className) + ' · синхронизировано ' + esc(p.syncedAt) + '</div><div class="hd-rows">' + rows + '</div>';
    requestAnimationFrame(() => el.querySelectorAll('.bar i').forEach(i => i.style.width = i.dataset.w + '%'));
  }

  /* ================= ЛОР ================= */
  function renderLore() {
    $('lore-timeline').innerHTML = D().timeline.map((t, i) =>
      '<div class="tl-item' + (i === 7 ? ' open' : '') + '" data-i="' + i + '">' +
      '<div class="tl-year">' + t.year + '</div>' +
      '<div class="tl-title">' + esc(t.title) + (t.tag ? '<span class="tl-tag">' + esc(t.tag) + '</span>' : '') +
      (i === 0 ? '' : ' <span class="tl-hint">· раскрыть</span>') + '</div>' +
      '<div class="tl-text">' + esc(t.text) + '</div></div>'
    ).join('');
    document.querySelectorAll('.tl-item').forEach(el => {
      el.addEventListener('click', () => {
        el.classList.toggle('open');
        el.querySelector('.tl-hint') && (el.querySelector('.tl-hint').textContent = el.classList.contains('open') ? '· свернуть' : '· раскрыть');
        SFX.tick();
      });
    });

    $('lore-docs').innerHTML = D().docs.map(doc =>
      '<div class="doc" data-id="' + doc.id + '">' +
      '<h4>' + esc(doc.title) + ' <span class="dim small">[' + esc(doc.phase) + ']</span></h4>' +
      '<div class="doc-body doc-enc"></div>' +
      '<div class="doc-actions"><button class="btn btn-sm btn-mag doc-btn">ДЕШИФРОВАТЬ</button><span class="doc-status"></span></div>' +
      '</div>'
    ).join('');

    document.querySelectorAll('.doc').forEach(card => {
      const doc = D().docs.find(x => x.id === card.dataset.id);
      const bodyEl = card.querySelector('.doc-body');
      const btn = card.querySelector('.doc-btn');
      const status = card.querySelector('.doc-status');
      // шифр на экране
      const CH = '▓▒░#%&@$01ХСЕТЬ01';
      bodyEl.textContent = Array.from({ length: doc.text.length }, () => CH[Math.floor(Math.random() * CH.length)]).join('').replace(/\n/g, '\n');
      btn.addEventListener('click', () => {
        btn.disabled = true;
        SFX.decode();
        let i = 0;
        const t = setInterval(() => {
          i += 2;
          const done = doc.text.slice(0, i);
          const rest = bodyEl.textContent.slice(i);
          bodyEl.textContent = done + rest;
          if (i % 6 === 0) SFX.tick();
          if (i >= doc.text.length) {
            clearInterval(t);
            bodyEl.classList.remove('doc-enc');
            bodyEl.classList.add('doc-decrypted');
            status.textContent = '✓ ДЕШИФРОВАНО';
            if (!S.decryptedDocs.includes(doc.id)) { S.decryptedDocs.push(doc.id); save(); }
            if (S.decryptedDocs.length >= D().docs.length) {
              addCredits(2500);
              toast('СЕТЬ ЗАМЕТИЛА ВНИМАНИЕ', 'Все три документа прочитаны. Доплата за сочувствие: +2 500 КР.', 'mag');
            }
          }
        }, 24);
      });
    });
  }

  /* ================= КОРПОРАЦИИ ================= */
  function renderCorps() {
    $('corps-grid').innerHTML = D().corps.map(c =>
      '<div class="corp ' + c.color + '">' +
      '<div class="corp-top"><div class="corp-logo">' + c.mono + '</div>' +
      '<div><div class="corp-name">' + esc(c.name) + '</div><div class="corp-sector">' + esc(c.sector) + '</div></div></div>' +
      '<div class="corp-motto">' + esc(c.motto) + '</div>' +
      '<div class="corp-desc">' + esc(c.desc) + '</div>' +
      '<div class="corp-assets">' + c.assets.map(a => '<span class="corp-asset">' + esc(a) + '</span>').join('') + '</div>' +
      '<div class="threat"><span>УГРОЗА</span><span class="threat-bar"><i data-w="' + (c.threat * 10) + '"></i></span><span>' + c.threat + '/10</span></div>' +
      '</div>'
    ).join('');
    requestAnimationFrame(() => document.querySelectorAll('.threat-bar i').forEach(i => i.style.width = i.dataset.w + '%'));
  }

  /* ================= РАЙОНЫ ================= */
  function centroid(pts) {
    let x = 0, y = 0;
    pts.forEach(p => { x += p[0]; y += p[1]; });
    return [Math.round(x / pts.length), Math.round(y / pts.length)];
  }

  function renderMap() {
    const svg = $('city-map');
    let html = '';
    // вода
    html += '<path class="map-water" d="M 40 470 L 750 470 L 750 400 Q 600 380 520 430 Q 420 470 380 445 Q 200 460 40 470 Z"/>';
    html += '<text x="560" y="462" class="map-label sub">СЕВЕРНАЯ ВОДА</text>';
    // дороги
    html += '<path class="map-road" d="M 20 250 L 740 200"/>';
    html += '<path class="map-road" d="M 240 40 L 470 300"/>';
    html += '<path class="map-road" d="M 100 320 L 720 430"/>';
    // зоны
    D().districts.forEach(d => {
      const pts = d.map;
      const [cx, cy] = centroid(pts);
      html += '<g class="map-zone" data-id="' + d.id + '">' +
        '<polygon points="' + pts.map(p => p.join(',')).join(' ') + '"></polygon>' +
        '<text x="' + cx + '" y="' + cy + '" class="map-label" text-anchor="middle">' + esc(d.name.toUpperCase()) + '</text>' +
        '<text x="' + cx + '" y="' + (cy + 14) + '" class="map-label sub" text-anchor="middle">' + esc(d.alias) + '</text>' +
        '</g>';
    });
    // камеры
    [['neon'], ['needle'], ['harbor'], ['garden']].forEach(([id], i) => {
      const d = D().districts.find(x => x.id === id);
      const [cx, cy] = centroid(d.map);
      html += '<circle class="map-pulse" cx="' + cx + '" cy="' + (cy - 26) + '" r="3" style="animation-delay:' + (i * 0.4) + 's"/>';
    });
    svg.innerHTML = html;
    svg.querySelectorAll('.map-zone').forEach(z => {
      z.addEventListener('click', () => { SFX.nav(); selectDistrict(z.dataset.id); });
    });
    $('map-legend').innerHTML = D().districts.map(d =>
      '<button class="legend-chip" data-id="' + d.id + '">' + esc(d.name) + '</button>').join('');
    document.querySelectorAll('.legend-chip').forEach(c =>
      c.addEventListener('click', () => { SFX.nav(); selectDistrict(c.dataset.id); }));
  }

  function selectDistrict(id) {
    const d = D().districts.find(x => x.id === id);
    if (!d) return;
    document.querySelectorAll('.map-zone').forEach(z => z.classList.toggle('active', z.dataset.id === id));
    document.querySelectorAll('.legend-chip').forEach(c => c.classList.toggle('active', c.dataset.id === id));
    const info = $('district-info');
    const media = d.img
      ? '<img class="di-img" src="' + d.img + '" alt="' + esc(d.name) + '">'
      : '<div class="di-corr">КАМЕРА: ДАННЫЕ ПОВРЕЖДЕНЫ<br><span class="small">сектор закрыт сетью. попробуйте позже. он не будет позже.</span></div>';
    info.innerHTML =
      media +
      '<div class="di-name">' + esc(d.name) + '</div>' +
      '<div class="di-alias">' + esc(d.alias) + '</div>' +
      '<div class="di-metrics">' +
      '<div class="di-metric"><div class="v">' + d.safe + '/10</div><div class="l">БЕЗОПАСНОСТЬ</div></div>' +
      '<div class="di-metric"><div class="v">' + d.neon + '/10</div><div class="l">НЕОНА</div></div>' +
      '<div class="di-metric"><div class="v">' + d.ether + '/10</div><div class="l">ЭФИРА</div></div>' +
      '</div>' +
      '<div class="di-desc">' + esc(d.desc) + '</div>' +
      '<div class="di-places">' + d.places.map(p => '<div class="di-place">' + esc(p) + '</div>').join('') + '</div>';
  }

  /* ================= НОВОСТИ ================= */
  const norm = s => String(s).toLowerCase().replace(/ё/g, 'е');
  let newsTag = 'all', newsQuery = '';
  function renderNews() {
    const tags = ['all', ...new Set(D().news.map(n => n.tag))];
    $('news-tags').innerHTML = tags.map(t =>
      '<button class="news-tag' + (t === newsTag ? ' active' : '') + '" data-tag="' + esc(t) + '">' + (t === 'all' ? 'ВСЕ' : esc(t)) + '</button>').join('');
    document.querySelectorAll('.news-tag').forEach(b =>
      b.addEventListener('click', () => { SFX.nav(); newsTag = b.dataset.tag; renderNews(); }));
    renderNewsList();
  }
  function renderNewsList() {
    const q = norm(newsQuery);
    const list = D().news.filter(n =>
      (newsTag === 'all' || n.tag === newsTag) &&
      (!q || norm(n.title + ' ' + n.text).includes(q)));
    $('news-feed').innerHTML = list.length ? list.map(n =>
      '<div class="news-item' + (n.hot ? ' hot' : '') + (n.classified ? ' classified' : '') + '">' +
      '<div class="ni-meta"><span>' + n.date + ' · КАНАЛ 3</span><span class="ni-tag ' + n.cls + '">' + esc(n.tag) + '</span></div>' +
      '<div class="ni-title">' + esc(n.title) + '</div>' +
      '<div class="ni-text">' + esc(n.text) + '</div></div>'
    ).join('') : '<div class="news-empty">в эфире пусто. странный город, в котором пустой эфир. проверьте настройки. город следит за настройками.</div>';
  }

  /* ================= РЫНОК ================= */
  function cartQty(id) { return S.cart.filter(x => x === id).length; }
  function cartTotal() { return S.cart.reduce((sum, id) => sum + (D().shop.find(i => i.id === id) || {}).price, 0); }

  function renderMarket() {
    $('market-items').innerHTML = D().shop.map(it => {
      const locked = it.locked && !S.keyUnlocked;
      return '<div class="item' + (locked ? ' locked' : '') + '">' +
        '<div class="item-icon">' + it.icon + '</div>' +
        '<div class="item-name">' + esc(it.name) + '</div>' +
        '<div class="item-price">' + fmt(it.price) + ' КР</div>' +
        '<div class="item-desc">' + esc(it.desc) + '</div>' +
        (locked
          ? '<div class="item-lock-note">🔒 заблокировано. в сети ходит старый код клавиатуры.</div><button class="btn btn-ghost" disabled>НЕ ТВОЙ</button>'
          : '<button class="btn" data-add="' + it.id + '">В КОРЗИНУ</button>') +
        '</div>';
    }).join('');
    document.querySelectorAll('[data-add]').forEach(b =>
      b.addEventListener('click', () => {
        S.cart.push(b.dataset.add);
        save(); SFX.nav(); renderCart();
        toast('КОРЗИНА', '«' + D().shop.find(i => i.id === b.dataset.add).name + '» — у торговца.', '');
      }));
    renderCart();
    renderInventory();
  }

  function renderCart() {
    const cart = $('cart');
    if (!S.cart.length) {
      cart.innerHTML = '<div class="cart-empty">пусто. как карманы у гостя.</div>';
    } else {
      const byId = {};
      S.cart.forEach(id => byId[id] = (byId[id] || 0) + 1);
      cart.innerHTML = Object.entries(byId).map(([id, q]) => {
        const it = D().shop.find(x => x.id === id);
        return '<div class="cart-line"><span>' + it.icon + ' ' + esc(it.name) + (q > 1 ? ' ×' + q : '') + '</span>' +
          '<span><b>' + fmt(it.price * q) + '</b> КР <button data-rm="' + id + '" title="убрать">✖</button></span></div>';
      }).join('');
      cart.querySelectorAll('[data-rm]').forEach(b =>
        b.addEventListener('click', () => {
          S.cart.splice(S.cart.indexOf(b.dataset.rm), 1);
          save(); SFX.tick(); renderCart();
        }));
    }
    const total = cartTotal();
    $('cart-total').textContent = fmt(total) + ' КР';
    $('credits-display').textContent = fmt(S.credits) + ' КР';
    $('btn-buy').disabled = !S.cart.length || total > S.credits;
    if (total > S.credits) $('btn-buy').textContent = 'НЕ ХВАТАЕТ ' + fmt(total - S.credits) + ' КР';
    else $('btn-buy').textContent = 'ОПЛАТИТЬ И ЗАБРАТЬ';
  }

  function renderInventory() {
    const inv = $('inventory');
    if (!S.inventory.length) {
      inv.innerHTML = '<span class="inv-empty">ничего нет. у гостя пустые руки.</span>';
    } else {
      inv.innerHTML = S.inventory.map(x =>
        '<span class="inv-chip">' + x.icon + ' ' + esc(x.name) + (x.qty > 1 ? ' ×' + x.qty : '') + '</span>').join('');
    }
    $('inv-count').textContent = S.inventory.length + ' поз.';
  }

  function doBuy() {
    const total = cartTotal();
    if (!S.cart.length || total > S.credits) { SFX.error(); return; }
    S.credits -= total;
    S.cart.forEach(id => {
      const it = D().shop.find(x => x.id === id);
      const found = S.inventory.find(x => x.id === id);
      if (found) found.qty++;
      else S.inventory.push({ id: it.id, name: it.name, icon: it.icon, qty: 1 });
    });
    const bought = S.cart.length;
    S.cart = [];
    save();
    SFX.buy();
    toast('ОПЛАТА ПРИНЯТА', fmt(total) + ' КР списано. ' + bought + ' поз. в инвентаре. торговец кивнул. Это много.', 'green');
    renderCart(); renderInventory(); renderMarket();
    if (!S.secrets.includes('buy')) unlockSecret('buy');
  }

  function addCredits(n) {
    S.credits += n;
    save();
    $('credits-display') && ($('credits-display').textContent = fmt(S.credits) + ' КР');
  }

  /* ================= РАДИО ================= */
  function renderRadio() {
    const tr = D().tracks;
    $('radio-count').textContent = tr.length + ' передачей';
    $('radio-tracks').innerHTML = tr.map((t, i) =>
      '<button class="rt" data-i="' + i + '"><span class="rt-num">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<span><span class="rt-name">' + esc(t.name) + '</span><br><span class="rt-meta">' + esc(t.meta) + '</span></span>' +
      '<span class="rt-bpm">' + t.bpm + ' BPM</span></button>').join('');
    document.querySelectorAll('.rt').forEach(b =>
      b.addEventListener('click', () => {
        const ok = RADIO.toggle(+b.dataset.i);
        if (ok) { SFX.playStart(); if (!S.secrets.includes('radio')) unlockSecret('radio'); }
        else SFX.playStop();
        updateRadioUI();
      }));
    $('btn-radio-play').addEventListener('click', () => {
      const ok = RADIO.toggle(RADIO.playing ? undefined : (RADIO.trackIdx));
      if (RADIO.playing) { SFX.playStart(); if (!S.secrets.includes('radio')) unlockSecret('radio'); }
      else SFX.playStop();
      updateRadioUI();
    });
    $('btn-radio-next').addEventListener('click', () => { RADIO.next(); SFX.nav(); updateRadioUI(); });
    $('btn-radio-prev').addEventListener('click', () => { RADIO.prev(); SFX.nav(); updateRadioUI(); });
    $('radio-vol').addEventListener('input', () => { RADIO.setVolume(); SFX.tick(); });
    startVULoop();
  }

  function updateRadioUI() {
    const p = RADIO.playing;
    const btn = $('btn-radio-play');
    btn.textContent = p ? '⏸' : '▶';
    btn.classList.toggle('playing', p);
    const now = $('radio-now');
    if (!p) now.textContent = 'ВЫБОР ПЕРЕДАЧИ…';
    else {
      const t = D().tracks[RADIO.trackIdx];
      now.textContent = '♪ ' + t.name + ' — ' + t.key;
    }
    document.querySelectorAll('.rt').forEach((n, i) => n.classList.toggle('active', p && i === RADIO.trackIdx));
  }

  let vuRaf = null;
  function startVULoop() {
    if (vuRaf) return;
    const cv = $('vu-canvas');
    const cx2 = cv.getContext('2d');
    const N = 48;
    function draw() {
      vuRaf = requestAnimationFrame(draw);
      const w = cv.width, h = cv.height;
      cx2.clearRect(0, 0, w, h);
      const an = RADIO.getAnalyser();
      let data = null;
      if (an) {
        const arr = new Uint8Array(an.frequencyBinCount);
        an.getByteFrequencyData(arr);
        data = arr;
      }
      const bw = w / N;
      for (let i = 0; i < N; i++) {
        let v;
        if (data) {
          const idx = Math.floor(i / N * data.length * 0.7);
          v = data[idx] / 255;
        } else {
          v = RADIO.playing ? (0.25 + 0.2 * Math.sin(Date.now() / 300 + i * 0.7)) : 0.03;
        }
        const bh = Math.max(2, v * (h - 8));
        const x = i * bw + 1, y = h - bh - 2;
        cx2.fillStyle = 'rgba(0,240,255,' + (0.35 + v * 0.65) + ')';
        cx2.fillRect(x, y, bw - 2, bh);
        cx2.fillStyle = 'rgba(255,43,214,' + (0.3 + v * 0.7) + ')';
        cx2.fillRect(x, y - 3, bw - 2, 2);
      }
      // лента
      const tape = $('radio-tape-progress');
      if (tape) {
        const prog = RADIO.playing ? ((RADIO.step % RADIO.STEPS) / RADIO.STEPS) * 100 : 0;
        tape.style.width = prog + '%';
      }
    }
    draw();
  }

  /* ================= ДОСЬЕ ================= */
  let selectedClass = 'runner';
  function renderDossier() {
    const grid = $('class-grid');
    grid.innerHTML = D().classes.map(c =>
      '<button class="class-card' + (c.id === selectedClass ? ' selected' : '') + '" data-c="' + c.id + '">' +
      '<span class="cc-icon">' + c.icon + '</span>' +
      '<span class="cc-name">' + esc(c.name) + '</span>' +
      '<span class="cc-desc">' + esc(c.desc) + '</span>' +
      '<span class="cc-stats">ХАК ' + c.stats.hak + ' · БОЙ ' + c.stats.boj + ' · ХАР ' + c.stats.har + ' · УДА ' + c.stats.ud + '</span>' +
      '</button>').join('');
    grid.querySelectorAll('.class-card').forEach(b =>
      b.addEventListener('click', () => {
        selectedClass = b.dataset.c;
        SFX.nav();
        grid.querySelectorAll('.class-card').forEach(x => x.classList.toggle('selected', x === b));
      }));

    if (S.profile) {
      $('dossier-name').value = S.profile.name;
      selectedClass = S.profile.classId || 'runner';
      grid.querySelectorAll('.class-card').forEach(x => x.classList.toggle('selected', x.dataset.c === selectedClass));
    }

    $('btn-sync').addEventListener('click', () => {
      const name = ($('dossier-name').value || 'НЕТ-ИМЕНИ').trim().slice(0, 16).toUpperCase() || 'НЕТ-ИМЕНИ';
      const cls = D().classes.find(c => c.id === selectedClass) || D().classes[0];
      const d = new Date();
      const p2 = n => String(n).padStart(2, '0');
      S.profile = {
        name, className: cls.name, classId: cls.id,
        stats: { ...cls.stats, life: 3 + Math.floor(Math.random() * 7) },
        syncedAt: p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + '.88',
      };
      save();
      SFX.unlock();
      toast('СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА', 'Город знает тебя как «' + name + '». Тариф на имя: бессрочно.', 'mag');
      renderDossierStats();
      renderHomeDossier();
      renderTopbarName();
      TERMINAL.resetPrompt();
      if (!S.secrets.includes('dossier')) unlockSecret('dossier');
    });
    renderDossierStats();
  }

  function renderDossierStats() {
    const el = $('dossier-stats');
    const st = $('dossier-status');
    if (!S.profile) {
      st.textContent = 'НЕ СИНХРОНИЗИРОВАНО';
      el.innerHTML = '<div class="dim">параметры появятся после синхронизации. сеть уже приготовила графу для твоего имени.</div>';
      return;
    }
    st.textContent = 'АКТИВНО';
    const rows = Object.entries(S.profile.stats).map(([k, v]) =>
      '<div class="ds-row"><span>' + D().statNames[k] + '</span><span class="ds-bar"><i data-w="' + (v * 10) + '"></i></span><span class="ds-val">' + v + '</span></div>'
    ).join('');
    el.innerHTML = rows;
    requestAnimationFrame(() => el.querySelectorAll('.ds-bar i').forEach(i => i.style.width = i.dataset.w + '%'));
    $('dossier-note').textContent = '«' + S.profile.name + '» из класса «' + S.profile.className + '». Сеть считает твои параметры и делает вид, что не может. Тариф на имя: бессрочно.';
  }

  function renderTopbarName() {
    let el = $('topbar-name');
    if (!S.profile) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'topbar-name';
      el.className = 'panel-badge';
      el.style.cssText = 'color:var(--mag);border-color:rgba(255,43,214,0.5);cursor:pointer';
      el.title = 'Ваше досье';
      $('topbar-status').insertBefore(el, $('topbar-status').firstChild);
      el.addEventListener('click', () => { SFX.nav(); showTab('dossier'); });
    }
    el.textContent = '🪪 ' + S.profile.name;
  }

  /* ================= РОЗЫСК ================= */
  function renderWanted() {
    $('wanted-grid').innerHTML = D().wanted.map(w =>
      '<div class="poster">' +
      '<div class="poster-head">РОЗЫСК</div>' +
      '<div class="poster-sub">БОРЕАЛЬ-ПОРТ · ГОРОДСКОЙ СОВЕТ · СЕКТОР 9</div>' +
      (w.img
        ? '<img class="poster-photo" src="' + w.img + '" alt="' + esc(w.name) + '">'
        : '<div class="poster-photo x"></div>') +
      '<div class="poster-name">' + esc(w.name) + '</div>' +
      '<div class="poster-alias">' + esc(w.alias) + '</div>' +
      '<ul class="poster-crimes">' + w.crimes.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>' +
      '<div class="poster-bounty"><span class="l">НАГРАДА</span><span class="v">' + fmt(w.bounty) + ' КР</span></div>' +
      '<div class="poster-foot"><span class="poster-status">СТАТУС: ' + esc(w.status) + '</span>' +
      '<button class="btn btn-sm btn-ghost" data-report="' + w.id + '">СООБЩЕНИЕ →</button></div>' +
      '</div>'
    ).join('');
    document.querySelectorAll('[data-report]').forEach(b =>
      b.addEventListener('click', () => {
        SFX.error();
        const w = D().wanted.find(x => x.id === b.dataset.report);
        toast('СИГНАЛ ОТПРАВЛЕН', 'Сообщение о «' + w.name + '» ушло… никому. конкретно. Город сам решит.', 'red');
      }));
  }

  /* ================= ГЛОССАРИЙ ================= */
  let glossQuery = '';
  function renderGlossary() {
    const q = norm(glossQuery);
    const list = D().glossary.filter(g => !q || norm(g.t + ' ' + g.d).includes(q));
    $('glossary-count').textContent = list.length + ' / ' + D().glossary.length + ' терминов';
    $('glossary-list').innerHTML = list.length ? list.map(g =>
      '<div class="gl"><div class="gl-term">' + esc(g.t) + '</div><div class="gl-def">' + esc(g.d) + '</div></div>'
    ).join('') : '<div class="news-empty">такого слова в городе нет. если оно где-то есть — это хуже, чем «лед».</div>';
  }

  /* ================= СЕКРЕТЫ ================= */
  function renderSecrets() {
    const all = D().secrets;
    const found = S.secrets.length;
    $('secrets-count').textContent = found + '/' + all.length;
    $('secrets-fill').style.width = (found / all.length * 100) + '%';
    $('secrets-grid').innerHTML = all.map(s => {
      const has = S.secrets.includes(s.id);
      return '<div class="secret' + (has ? ' found' : ' locked') + (s.final ? ' s-final' : '') + '">' +
        '<div class="secret-top"><span class="secret-name">' + (has ? esc(s.name) : '??? — СЛЕД НЕ НАЙДЕН') + '</span>' +
        '<span class="secret-icon">' + (has ? s.icon : '?') + '</span></div>' +
        '<div class="secret-hint">' + (has ? esc(s.desc) : esc(s.hint)) + '</div></div>';
    }).join('');
    const fin = $('secrets-final');
    if (S.secrets.includes('final')) {
      fin.classList.remove('hidden');
      $('secrets-final-text').textContent = D().finalText;
    } else {
      fin.classList.add('hidden');
    }
  }

  function unlockSecret(id) {
    if (S.secrets.includes(id)) return;
    S.secrets.push(id);
    save();
    const s = D().secrets.find(x => x.id === id);
    if (id !== 'final') { SFX.unlock(); toast('СЛЕД ПОЛУЧЕН: ' + s.name, s.desc, 'mag'); }
    renderSecrets();
    // финал: все шесть обычных следов собраны
    if (id !== 'final') {
      const others = D().secrets.filter(x => !x.final);
      if (others.every(x => S.secrets.includes(x.id))) {
        S.secrets.push('final');
        save();
        renderSecrets();
        finale();
      }
    }
  }

  function finale() {
    SFX.flash();
    const fl = $('white-flash');
    fl.classList.remove('on');
    void fl.offsetWidth;
    fl.classList.add('on');
    setTimeout(() => fl.classList.remove('on'), 3700);
    setTimeout(() => {
      if (!S.keyUnlocked) {
        S.keyUnlocked = true; save();
        renderMarket();
        toast('ТОВАР РАЗБЛОКИРОВАН', 'Ключ «РАССВЕТ» появился на базарной улице. 500 000 КР. Сеть смотрит, как ты его берешь.', 'mag');
      }
      toast('УРОВЕНЬ ДОСТУПА: РАССВЕТ', 'Ты видел небо без счетчиков. Теперь оно видит тебя.', 'green');
    }, 2200);
    renderSecrets();
  }

  /* ================= KONAMI ================= */
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kIdx = 0;
  // b/a принимаются и в русской раскладке (и/ф)
  const LAYOUT = { b: ['b', 'и'], a: ['a', 'ф'] };
  function keyMatches(k, expected) {
    if (LAYOUT[expected]) return LAYOUT[expected].includes(k);
    return k === expected;
  }
  function onKey(e) {
    const k = (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
    if (keyMatches(k, KONAMI[kIdx])) {
      kIdx++;
      if (kIdx === KONAMI.length) {
        kIdx = 0;
        konamiHit();
      }
    } else {
      kIdx = keyMatches(k, KONAMI[0]) ? 1 : 0;
    }
  }
  function konamiHit() {
    SFX.secret();
    toggleMatrix(true);
    setTimeout(() => toggleMatrix(false), 2600);
    if (!S.secrets.includes('konami')) unlockSecret('konami');
    if (!S.keyUnlocked) {
      S.keyUnlocked = true; save();
      renderMarket();
      toast('СТАРИННЫЙ КОД РАБОТАЕТ', 'Ключ «РАССВЕТ» разблокирован в «Рынке». Кто-то внутри сети кивнул.', 'mag');
    } else {
      toast('СТАРИННЫЙ КОД', 'Код 1986 года. Он всегда работал. Пугающе. Иди в «Секреты».', 'mag');
    }
  }

  /* ================= МАТРИЦА ================= */
  let matrixOn = false, matrixRaf = null, matrixCols = null;
  function toggleMatrix(force) {
    const want = typeof force === 'boolean' ? force : !matrixOn;
    matrixOn = want;
    const cv = $('matrix-canvas');
    cv.classList.toggle('on', matrixOn);
    if (matrixOn) {
      cv.width = innerWidth; cv.height = innerHeight;
      const fs = 16;
      matrixCols = Array.from({ length: Math.floor(innerWidth / fs) }, () => Math.random() * -50);
      const CH = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01ХВГДЖЗКЛМНОПРСТУФЦЧШЩЭЮЯ▓▒░';
      const cx3 = cv.getContext('2d');
      function drawM() {
        if (!matrixOn) return;
        matrixRaf = requestAnimationFrame(drawM);
        cx3.fillStyle = 'rgba(0,0,0,0.12)';
        cx3.fillRect(0, 0, cv.width, cv.height);
        cx3.font = fs + 'px monospace';
        for (let i = 0; i < matrixCols.length; i++) {
          const ch = CH[Math.floor(Math.random() * CH.length)];
          const y = matrixCols[i] * fs;
          cx3.fillStyle = Math.random() > 0.975 ? '#c8fff0' : 'rgba(0,255,170,0.75)';
          cx3.fillText(ch, i * fs, y);
          matrixCols[i] = y > cv.height && Math.random() > 0.975 ? -5 : matrixCols[i] + 1;
        }
      }
      drawM();
    } else if (matrixRaf) {
      cancelAnimationFrame(matrixRaf);
      matrixRaf = null;
    }
  }
  addEventListener('resize', () => {
    if (matrixOn) { const cv = $('matrix-canvas'); cv.width = innerWidth; cv.height = innerHeight; }
  });

  /* ================= BOOT ================= */
  const BOOT_LINES = [
    'ВОЛЬТ-OS 8.8.8 · СИНТЕЗКОРП (c) 1988',
    'проверка памяти: 640K ………… OK',
    'эфирный канал: сектор-9 …… ПОДКЛЮЧЕНО',
    'светомер: тариф активен (12 КР/Вт·ч)',
    'счетчик посетителя: ПУЛЬСИРУЕТ',
    'лицензия: гость · допуск «эфир»',
    'предупреждение: 65-й маяк не числится в реестре',
    'предупреждение: в 03:33 не смотрите на север',
    'допуск: ВЫДАН',
  ];
  let bootDone = false;
  function finishBoot() {
    if (bootDone) return;
    bootDone = true;
    const b = $('boot');
    b.classList.add('done');
    setTimeout(() => b.remove(), 900);
    // применяем сохраненные настройки
    document.body.classList.toggle('crt-on', S.crt);
    $('btn-crt').classList.toggle('active', S.crt);
    showTab(location.hash ? location.hash.replace('#', '').replace('tab-', '') : 'home', true);
  }
  function runBoot() {
    SFX.boot();
    const log = $('boot-log');
    let li = 0, ci = 0;
    const t = setInterval(() => {
      if (li >= BOOT_LINES.length) {
        clearInterval(t);
        setTimeout(finishBoot, 900);
        return;
      }
      const line = BOOT_LINES[li];
      ci += 3;
      if (ci >= line.length) {
        log.textContent += line + '\n';
        if (Math.random() < 0.5) SFX.tick();
        li++; ci = 0;
      } else {
        log.textContent = BOOT_LINES.slice(0, li).join('\n') + (li ? '\n' : '') + line.slice(0, ci);
      }
    }, 26);
    $('boot-skip-btn').addEventListener('click', finishBoot);
    addEventListener('keydown', function bk(e) {
      if (!bootDone && e.key === 'Enter') { removeEventListener('keydown', bk); finishBoot(); }
    });
  }

  /* ================= ИНИЦИАЛИЗАЦИЯ ================= */
  function init() {
    SFX.setEnabled(S.sound);
    $('btn-sound').textContent = S.sound ? '🔊' : '🔇';
    buildNav();
    renderHome();
    renderLore();
    renderCorps();
    renderMap();
    renderNews();
    renderMarket();
    renderRadio();
    renderDossier();
    renderWanted();
    renderGlossary();
    renderSecrets();
    renderTopbarName();
    TERMINAL.start();
    startClock();
    startTicker();

    $('news-filter').addEventListener('input', e => { newsQuery = e.target.value; renderNewsList(); });
    $('glossary-filter').addEventListener('input', e => { glossQuery = e.target.value; renderGlossary(); });
    $('btn-buy').addEventListener('click', doBuy);

    $('btn-sound').addEventListener('click', () => {
      S.sound = !S.sound;
      SFX.setEnabled(S.sound);
      save();
      $('btn-sound').textContent = S.sound ? '🔊' : '🔇';
      if (S.sound) SFX.nav();
    });
    $('btn-crt').addEventListener('click', () => {
      S.crt = !S.crt;
      document.body.classList.toggle('crt-on', S.crt);
      $('btn-crt').classList.toggle('active', S.crt);
      save();
      SFX.nav();
      toast('CRT', S.crt ? 'Режим усиленного кинескопа: сканлайны ×2, дрожание, цвета глубже.' : 'Режим кинескопа: стандарт.', '');
    });

    addEventListener('keydown', onKey);
    addEventListener('click', () => SFX.unlock(), { once: true });
    addEventListener('hashchange', () => {
      const id = location.hash.replace('#', '');
      if (id && $('tab-' + id)) showTab(id, true);
    });

    runBoot();
  }

  window.APP = {
    unlockSecret, addCredits, toggleMatrix, showTab,
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
  else init();
})();
