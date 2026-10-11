/* impossible jobs · IJ/OS mission board */
(function () {
  var M = window.MISSIONS || [];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var flapSafe = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/[–—]/g, '-').toUpperCase(); };
  var words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  var statusClass = function (s) { return /final/.test(s) ? 'hs-final' : /last/.test(s) ? 'hs-last' : /board/.test(s) ? 'hs-boarding' : /delay/.test(s) ? 'hs-delayed' : 'hs-classified'; };

  /* ---------- sound: synthesized live, no audio files ---------- */
  var SFX = (function () {
    // board sound effects share the site's audio engine and on/off switch (site.js: IJAudio)
    var last = 0;
    function ready() { var A = window.IJAudio; return A && A.playing ? A : null; }
    function env(g, t, peak, dur) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    function blip(A, f, type, peak, dur, drop, when) {
      var ctx = A.ctx, t = ctx.currentTime + (when || 0), o = ctx.createOscillator(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
      o.type = type; o.frequency.setValueAtTime(f, t); if (drop) o.frequency.exponentialRampToValueAtTime(f * drop, t + dur);
      hp.type = 'highpass'; hp.frequency.value = 700;
      env(g, t, peak, dur); o.connect(hp); hp.connect(g); g.connect(A.fx); o.start(t); o.stop(t + dur + 0.02);
    }
    return {
      tick: function () {
        var A = ready(); if (!A) return; var n = performance.now(); if (n - last < 26) return; last = n;
        var f = 1500 + Math.random() * 2200;
        blip(A, f, 'square', 0.035, 0.022, 0.5);
        if (Math.random() < 0.3) blip(A, f * 1.5, 'triangle', 0.02, 0.03, 0.8);
      },
      settle: function () { var A = ready(); if (!A) return; blip(A, 880, 'sine', 0.05, 0.07, 1, 0); blip(A, 1320, 'sine', 0.045, 0.09, 1, 0.045); },
      open: function () {
        var A = ready(); if (!A) return; var ctx = A.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(1600, t + 0.45);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
        o.connect(g); g.connect(A.fx); o.start(t); o.stop(t + 0.65);
        [523, 784, 1046, 1568].forEach(function (f, i) { blip(A, f, 'square', 0.018, 0.08, 1, 0.42 + i * 0.06); });
      },
      close: function () {
        var A = ready(); if (!A) return; var ctx = A.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(1200, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.32);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
        o.connect(g); g.connect(A.fx); o.start(t); o.stop(t + 0.4);
      }
    };
  })();

  /* ---------- system bar ---------- */
  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function clock() {
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    var t = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + ' · ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' 2046';
    ['sysClock', 'mbClock'].forEach(function (id) { var el = $(id); if (el) el.textContent = t; });
  }
  clock(); setInterval(clock, 1000);
  if ($('sysCount')) $('sysCount').textContent = M.length;
  if ($('sysBoarding')) $('sysBoarding').textContent = M.filter(function (m) { return /board/.test(m.status); }).length;
  var cnt = $('introCount'); if (cnt) cnt.textContent = (words[M.length] || M.length) + ' jobs';

  /* ---------- split-flap engine ---------- */
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  function flapLine(text, cls) {
    var line = document.createElement('div'); line.className = 'fl-line ' + (cls || '');
    var cells = [];
    flapSafe(text).split(' ').forEach(function (word) {
      var w = document.createElement('span'); w.className = 'fw';
      word.split('').forEach(function (ch) {
        var c = document.createElement('span'); c.className = 'fc'; c.innerHTML = '<b> </b>'; c._final = ch; w.appendChild(c); cells.push(c);
      });
      line.appendChild(w);
    });
    line._cells = cells;
    line.setAttribute('aria-hidden', 'true');
    return line;
  }
  var active = [], ticking = false;
  function setCell(c, ch) { SFX.tick(); c.firstChild.textContent = ch; c._tog = !c._tog; c.classList.remove(c._tog ? 'f2' : 'f1'); c.classList.add(c._tog ? 'f1' : 'f2'); }
  function runFlaps(cells, startDelay, done) {
    var now = performance.now();
    cells.forEach(function (c, i) {
      if (reduce) { c.firstChild.textContent = c._final; return; }
      c._left = 5 + Math.floor(Math.random() * 6) + Math.floor(i / 3);
      c._next = now + startDelay + i * 18;
      active.push(c);
    });
    if (reduce) { if (done) done(); return; }
    if (done) setTimeout(done, startDelay + cells.length * 18 + 1300);
    if (!ticking) { ticking = true; requestAnimationFrame(step); }
  }
  function step(t) {
    for (var i = active.length - 1; i >= 0; i--) {
      var c = active[i];
      if (t < c._next) continue;
      if (c._left <= 0) { setCell(c, c._final); active.splice(i, 1); continue; }
      c._left--; c._next = t + 62;
      setCell(c, GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
    }
    if (active.length) requestAnimationFrame(step); else ticking = false;
  }

  /* ---------- build the board ---------- */
  var rowsEl = $('mrows');
  var rows = M.map(function (m, i) {
    var b = document.createElement('button');
    b.className = 'mrow'; b.type = 'button'; b.setAttribute('data-st', m.status); b.setAttribute('data-i', i);
    b.setAttribute('aria-label', 'mission ' + m.num + ': ' + m.title + ', ' + m.company + ', ' + m.board_location.toLowerCase() + '. status: ' + m.status + '. open the mission file');
    var num = flapLine(m.num, 'fl-num'), main = document.createElement('div'), st = flapLine(m.status, 'fl-st');
    main.className = 'mmain';
    var title = flapLine(m.title), sub = flapLine(m.board_company + ' · ' + m.board_location, 'fl-sm');
    main.appendChild(title); main.appendChild(sub);
    b.appendChild(num); b.appendChild(main); b.appendChild(st);
    b.insertAdjacentHTML('beforeend', '<span class="open-hint" aria-hidden="true">open file →</span>');
    b._cells = [].concat(num._cells, title._cells, st._cells, sub._cells);
    b.addEventListener('click', function () { openCard(i, b); });
    rowsEl.appendChild(b);
    return b;
  });
  function flipBoard() {
    rows.forEach(function (r, i) { runFlaps(r._cells, i * 140, function () { r.classList.add('settled'); SFX.settle(); }); });
    // once the board has settled, one random row re-flips every 4 seconds (never the same row twice in a row)
    if (!reduce && rows.length) setTimeout(function () {
      var last = -1;
      setInterval(function () {
        if (document.hidden || current >= 0) return;
        var n = rows.length > 1 ? Math.floor(Math.random() * (rows.length - 1)) : 0;
        if (n >= last && rows.length > 1) n++;          // skip the row that flipped last time
        last = n;
        runFlaps(rows[n]._cells, 0, SFX.settle);
      }, 4000);
    }, rows.length * 140 + 2500);
  }

  /* ---------- opening sequence ---------- */
  var boot = $('boot'), log = $('bootLog'), intro = $('intro'), wrap = $('boardWrap');
  var deep = /^#mission-(\d{3})$/.exec(location.hash);
  var lines = [
    ['IJ/OS v1.0 · establishing uplink to 2046', 'ok'],
    ['decrypting job postings', M.length + ' found'],
    ['verifying impossibility', 'confirmed'],
    ['opening mission board', '']
  ];
  function finishBoot() { boot.classList.add('done'); }
  function showBoard() {
    intro.classList.add('docked');
    setTimeout(function () { wrap.classList.add('on'); flipBoard(); }, reduce ? 0 : 650);
  }
  function startIntro() {
    intro.classList.add('show');
    if (deep) { showBoard(); return; }
    var skip = function () { if (!intro.classList.contains('docked')) showBoard(); };
    setTimeout(skip, 2300);
    addEventListener('wheel', skip, { once: true, passive: true });
    addEventListener('touchmove', skip, { once: true, passive: true });
    addEventListener('keydown', skip, { once: true });
    intro.addEventListener('click', skip, { once: true });
  }
  if (reduce || deep || sessionStorageGet('ij-booted')) { finishBoot(); startIntro(); }
  else {
    var out = '', li = 0;
    (function typeLine() {
      if (li >= lines.length) { setTimeout(function () { finishBoot(); startIntro(); }, 350); return; }
      var L = lines[li], text = L[0], k = 0;
      (function typeChar() {
        if (k <= text.length) { log.innerHTML = out + esc(text.slice(0, k)) + '<span class="cur"></span>'; k += 2; setTimeout(typeChar, 14); return; }
        out += esc(text) + (L[1] ? ' ... <span class="ok">' + esc(L[1]) + '</span>' : '') + '\n';
        log.innerHTML = out + '<span class="cur"></span>'; li++; setTimeout(typeLine, 150);
      })();
    })();
    boot.addEventListener('click', function () { li = lines.length; });
    sessionStorageSet('ij-booted', '1');
  }
  function sessionStorageGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sessionStorageSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  /* ---------- the holographic mission file ---------- */
  var holo = $('holo'), card = $('holoCard'), current = -1, lastRow = null;
  function initials(name) { return name.replace(/^(Dr\.|Cmdr\.|Prof\.)\s+/i, '').split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
  function paras(t) { return String(t || '').split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join(''); }
  function render(m, i) {
    var k = 0, h = function () { return ' class="hl" style="--k:' + (k++) + '"'; };
    var hq = esc(m.headquarters).split('\n');
    var budgetLabel = /budget/i.test(m.turnover_label || '') || m.num === '007' ? 'annual budget' : 'annual turnover';
    var prev = M[(i - 1 + M.length) % M.length], next = M[(i + 1) % M.length];
    card.style.setProperty('--c1', (m.company_colors && m.company_colors[0]) || '#00f0c8');
    card.style.setProperty('--c2', (m.company_colors && m.company_colors[1]) || '#ff5f9e');
    card.innerHTML =
      '<div class="holo-scan" aria-hidden="true"></div>' +
      '<div class="hc-top"><span class="id">mission ' + esc(m.num) + '</span><span class="hc-status ' + statusClass(m.status) + '">' + esc(m.status) + '</span><span class="posted">' + esc(m.posted) + '</span>' +
        '<button class="hc-close" type="button" data-close>close <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg></button></div>' +
      '<div class="hc-in">' +
        '<div class="hc-hero"><div' + h() + '><div class="hc-logo" aria-hidden="true">' + (m.logo_svg || '') + '</div></div>' +
          '<div><p class="hc-co hl" style="--k:' + (k++) + '">' + esc(m.company) + '</p><h2 class="hc-title hl" id="holoTitle" style="--k:' + (k++) + '">' + esc(m.title) + '</h2>' +
          '<div class="hc-tags hl" style="--k:' + (k++) + '">' + (m.tags || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</div></div></div>' +
        '<dl class="hc-facts hl" style="--k:' + (k++) + '"><div><dt>founded</dt><dd>' + esc(m.founded) + '</dd></div>' +
          '<div><dt>headquarters</dt><dd>' + hq[0] + (hq.length > 1 ? '<small>' + hq.slice(1).join(' · ') + '</small>' : '') + '</dd></div>' +
          '<div><dt>' + budgetLabel + '</dt><dd>' + esc(m.turnover) + '</dd></div></dl>' +
        '<p class="hc-desc hl" style="--k:' + (k++) + '">' + esc(m.company_description) + '</p>' +
        '<p class="hc-punch hl" style="--k:' + (k++) + '">' + esc(m.punchline) + '</p>' +
        '<div class="hc-grid">' +
          '<section>' +
            '<h3' + h() + '>about ' + esc(m.company) + '</h3><div' + h() + '>' + paras(m.about_company) + '</div>' +
            '<h3' + h() + '>about the role</h3><div' + h() + '>' + paras(m.about_role) + '</div>' +
            '<h3' + h() + '>responsibilities</h3><ul class="hc-list hl" style="--k:' + (k++) + '">' + (m.responsibilities || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>' +
          '</section>' +
          '<section>' +
            '<h3' + h() + '>requirements</h3><ul class="hc-list hc-req hl" style="--k:' + (k++) + '">' + (m.requirements || []).map(function (r) { return '<li><strong>' + esc(r.skill) + '</strong><span>' + esc(r.sectors) + '</span></li>'; }).join('') + '</ul>' +
            '<h3' + h() + '>nice to have</h3><p class="hc-nice hl" style="--k:' + (k++) + '">' + esc(m.nice_to_have) + '</p>' +
            '<h3' + h() + '>reports to</h3><div class="hc-boss hl" style="--k:' + (k++) + '">' + (m.portrait_svg ? '<div class="hc-avatar hc-portrait" role="img" aria-label="portrait of ' + esc(m.reports_to.name) + '">' + m.portrait_svg + '</div>' : '<div class="hc-avatar" aria-hidden="true">' + esc(initials(m.reports_to.name)) + '</div>') + '<div><strong>' + esc(m.reports_to.name) + '</strong><span>' + esc(m.reports_to.title) + '</span><span>' + esc(m.reports_to.background || '') + '</span></div></div>' +
            '<h3' + h() + '>our values</h3><ol class="hc-values hl" style="--k:' + (k++) + '">' + (m.values || []).map(function (v, j) { return '<li><b>0' + (j + 1) + '</b>' + esc(v) + '</li>'; }).join('') + '</ol>' +
          '</section>' +
        '</div>' +
        '<div class="hc-cta hl" style="--k:' + (k++) + '"><div><p class="big">built for this? <em>apply now.</em></p><p class="small">' + esc(m.slide5_future_line) + ' or send this mission to someone who was.</p></div>' +
          '<div class="hc-actions">' +
            '<a class="hc-apply" href="' + applyHref(m) + '">apply now <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>' +
            '<a class="hc-wa" href="' + whatsappHref(m) + '" target="_blank" rel="noopener"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.3 2.2 2.2 0 00.1-1.3c0-.1-.2-.2-.5-.3z"/></svg>share on whatsapp</a>' +
            '<button class="hc-copy" type="button" data-share>copy link</button>' +
          '</div></div>' +
        '<div class="hc-foot hl" style="--k:' + (k++) + '"><span>this mission is fictional. until it won’t be.</span>' +
          '<div class="hc-nav"><button type="button" data-go="' + ((i - 1 + M.length) % M.length) + '">← ' + esc(prev.num) + '</button><button type="button" data-go="' + ((i + 1) % M.length) + '">' + esc(next.num) + ' →</button></div></div>' +
      '</div>';
  }

  function rectOf(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }
  function openCard(i, fromEl, instant) {
    var m = M[i]; if (!m) return;
    current = i; lastRow = fromEl || rows[i]; SFX.open();
    render(m, i);
    holo.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.classList.add('holo-open');
    card.scrollTop = 0;
    requestAnimationFrame(function () { holo.classList.add('on'); });
    card.classList.remove('materialise'); void card.offsetWidth; card.classList.add('materialise');
    try { history.replaceState(null, '', '#mission-' + m.num); } catch (e) {}
    if (!reduce && !instant && lastRow && card.animate) {
      var a = rectOf(lastRow), b = rectOf(card);
      var dx = a.x - b.x, dy = a.y - b.y, sx = Math.max(0.05, a.w / b.w), sy = Math.max(0.01, a.h / b.h);
      card.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')', opacity: 0, filter: 'brightness(2.4) saturate(0)' },
        { offset: 0.3, transform: 'translate(0px,' + (dy * 0.25) + 'px) scale(1, 0.006)', opacity: 1, filter: 'brightness(2.2)' },
        { offset: 0.42, transform: 'translate(0px,0px) scale(1, 0.006)', opacity: 1, filter: 'brightness(2)' },
        { offset: 0.75, transform: 'perspective(1400px) rotateX(9deg) scale(1, 1.02)', opacity: 0.92, filter: 'brightness(1.25)' },
        { offset: 0.85, opacity: 0.7 },
        { offset: 0.9, opacity: 1 },
        { transform: 'none', opacity: 1, filter: 'none' }
      ], { duration: 1050, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    setTimeout(function () { card.focus({ preventScroll: true }); }, 60);
  }
  function closeCard() {
    if (current < 0) return;
    SFX.close();
    var done = function () { holo.hidden = true; holo.classList.remove('on'); document.documentElement.style.overflow = ''; document.documentElement.classList.remove('holo-open'); card.innerHTML = ''; if (lastRow) lastRow.focus({ preventScroll: true }); };
    try { history.replaceState(null, '', location.pathname); } catch (e) {}
    current = -1;
    holo.classList.remove('on');
    if (!reduce && lastRow && card.animate) {
      var a = rectOf(lastRow), b = rectOf(card);
      var anim = card.animate([
        { transform: 'none', opacity: 1, filter: 'none' },
        { offset: 0.45, transform: 'scale(1, 0.006)', opacity: 1, filter: 'brightness(2.2)' },
        { transform: 'translate(' + (a.x - b.x) + 'px,' + (a.y - b.y) + 'px) scale(' + Math.max(0.05, a.w / b.w) + ', 0.006)', opacity: 0, filter: 'brightness(2.4)' }
      ], { duration: 520, easing: 'cubic-bezier(.6,0,.4,1)' });
      anim.onfinish = done;
    } else done();
  }
  holo.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || e.target.classList.contains('holo-backdrop')) { closeCard(); return; }
    var go = e.target.closest('[data-go]');
    if (go) { var n = +go.getAttribute('data-go'); lastRow = rows[n]; render(M[n], n); current = n; card.scrollTop = 0; card.classList.remove('materialise'); void card.offsetWidth; card.classList.add('materialise'); try { history.replaceState(null, '', '#mission-' + M[n].num); } catch (er) {} return; }
    if (e.target.closest('[data-share]')) share(M[current]);
  });
  document.addEventListener('keydown', function (e) {
    if (current < 0) return;
    if (e.key === 'Escape') closeCard();
    if (e.key === 'ArrowRight') holo.querySelector('[data-go]:last-child').click();
    if (e.key === 'ArrowLeft') holo.querySelector('[data-go]').click();
    if (e.key === 'Tab') {   // keep focus inside the open file
      var f = card.querySelectorAll('button, a[href]'); if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });
  function missionUrl(m) { return location.origin + location.pathname + '#mission-' + m.num; }
  function applyHref(m) {
    var subject = 'Application: mission ' + m.num + ' · ' + m.title + ' (' + m.company + ')';
    var body = 'Hello impossible jobs,\n\nI would like to apply for mission ' + m.num + ': ' + m.title + ' at ' + m.company + '.\n\nWhy I was built for this:\n\n\nWhere I am today (role, sector, years of experience):\n\n\nLink to my profile or CV:\n\n\n' + missionUrl(m);
    return 'mailto:hello@impossiblejobs.org?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  function whatsappHref(m) {
    var text = 'I just found the job you were built for: ' + m.title + ' at ' + m.company + '. ' + m.punchline + ' ' + missionUrl(m);
    return 'https://wa.me/?text=' + encodeURIComponent(text);
  }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('on'); }, 2200); }
  function share(m) {
    var url = missionUrl(m);
    var copy = function () { toast('link copied. send it to them.'); };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(copy, function () { toast(url); }); else toast(url);
  }

  // deep link straight into a mission file
  if (deep) {
    var idx = M.findIndex(function (m) { return m.num === deep[1]; });
    if (idx >= 0) setTimeout(function () { openCard(idx, rows[idx], true); }, 400);
  }
})();
