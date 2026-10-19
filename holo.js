/* impossible jobs — holo.js (home page)
   1. source stars: each opens a holographic source card with the job board's materialise animation
      (shoots out of the star as a line of light, unfolds, tilts into place, scans in line by line).
   2. the module rail: a glass tab on the left edge that slides out into the three original module cards
      (pointer tilt and boot sequence come from site.js). */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- data ---------- */
  var REFS = [
    null,
    { pub: 'Gallup', title: 'State of the Global Workplace 2026', year: '2026 (2025 data)', scope: 'global', kind: 'annual report', url: 'https://www.gallup.com/workplace/697904/state-of-the-global-workplace-2026.aspx' },
    { pub: 'McKinsey Health Institute', title: 'Global employee health survey', year: '2023', scope: '30 countries', kind: 'employee survey', url: 'https://www.mckinsey.de/mhi/our-insights/reframing-employee-health-moving-beyond-burnout-to-holistic-health' },
    { pub: 'Microsoft', title: 'Work Trend Index', year: '2023', scope: '31 countries', kind: 'workforce study', url: 'https://www.microsoft.com/en-us/worklab/we-can-not-keep-up-with-work-but-ai-can-help' },
    { pub: 'Deloitte', title: '2025 Gen Z and Millennial Survey', year: '2025', scope: '44 countries', kind: 'annual survey', url: 'https://www.deloitte.com/global/en/about/press-room/deloitte-2025-gen-z-and-millennial-survey.html' },
    { pub: 'Randstad', title: 'Workmonitor 2025', year: '2025', scope: '35 markets', kind: 'workforce survey', url: 'https://www.randstad.com/press/2025/work-life-balance-tops-pay-randstads-workmonitor-reveals/' },
    { pub: 'World Economic Forum', title: 'Future of Jobs Report 2025', year: '2025', scope: 'global', kind: 'jobs report', url: 'https://www.weforum.org/press/2025/01/future-of-jobs-report-2025-78-million-new-job-opportunities-by-2030-but-urgent-upskilling-needed-to-prepare-workforces/' },
    { pub: 'WHO and ILO', title: 'Mental health at work', year: '2022', scope: 'global', kind: 'joint guidance', url: 'https://www.who.int/europe/news/item/28-09-2022-who-and-ilo-call-for-new-measures-to-tackle-mental-health-issues-at-work' }
  ];
  /* ---------- sound (same engine and switch as the rest of the site) ---------- */
  var SFX = (function () {
    function ready() { var A = window.IJAudio; return A && A.playing ? A : null; }
    function blip(A, f, peak, dur, when) {
      var ctx = A.ctx, t = ctx.currentTime + (when || 0), o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(A.fx); o.start(t); o.stop(t + dur + 0.02);
    }
    function sweep(A, a, b, peak, dur) {
      var ctx = A.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(a, t); o.frequency.exponentialRampToValueAtTime(b, t + dur * 0.75);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(A.fx); o.start(t); o.stop(t + dur + 0.05);
    }
    return {
      open: function () { var A = ready(); if (!A) return; sweep(A, 180, 1600, 0.07, 0.6); [523, 784, 1046, 1568].forEach(function (f, i) { blip(A, f, 0.018, 0.08, 0.42 + i * 0.06); }); },
      close: function () { var A = ready(); if (!A) return; sweep(A, 1200, 160, 0.06, 0.36); },
      slide: function () { var A = ready(); if (!A) return; [880, 1320].forEach(function (f, i) { blip(A, f, 0.014, 0.05, i * 0.05); }); }
    };
  })();

  /* ---------- the holographic card ---------- */
  var holo = document.createElement('div');
  holo.className = 'ix-holo'; holo.hidden = true; holo.setAttribute('role', 'dialog'); holo.setAttribute('aria-modal', 'true'); holo.setAttribute('aria-labelledby', 'ixTitle');
  holo.innerHTML = '<div class="ix-backdrop" data-close></div><div class="ix-beam" aria-hidden="true"></div><div class="ix-platform" aria-hidden="true"></div><article class="ix-card" tabindex="-1"></article>';
  document.body.appendChild(holo);
  var card = holo.querySelector('.ix-card'), from = null, isOpen = false, closing = null;

  function rectOf(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.max(r.width, 2), h: Math.max(r.height, 2) }; }
  function closeBtn() { return '<button class="ix-close" type="button" data-close>close <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg></button>'; }

  function show(html, wide, el, instant) {
    var was = isOpen;
    if (closing) { closing.onfinish = null; closing.cancel(); closing = null; }   // reopened mid-close: drop the old exit
    card.className = 'ix-card' + (wide ? ' wide' : '');
    card.style.transform = ''; card.style.setProperty('--hl', 0);
    card.innerHTML = '<span class="ix-scan" aria-hidden="true"></span>' + html;
    if (!was) { from = el; SFX.open(); if (window.IJAudio && IJAudio.duck) IJAudio.duck(true); }
    isOpen = true;
    holo.hidden = false; root.classList.add('ix-open');
    card.scrollTop = 0;
    requestAnimationFrame(function () { holo.classList.add('on'); });
    void card.offsetWidth; card.classList.add('materialise');
    if (!reduce && !instant && !was && from && card.animate) {
      // the job board's materialise sequence, launched from the star or module you clicked
      var a = rectOf(from), b = rectOf(card);
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
  function hide() {
    if (!isOpen) return;
    isOpen = false; SFX.close(); if (window.IJAudio && IJAudio.duck) IJAudio.duck(false);
    holo.classList.remove('on');
    var back = from;
    var done = function () { closing = null; if (isOpen) return; holo.hidden = true; root.classList.remove('ix-open'); card.innerHTML = ''; if (back && back.focus) back.focus({ preventScroll: true }); };
    if (!reduce && back && card.animate && back.getClientRects().length) {
      var a = rectOf(back), b = rectOf(card);
      closing = card.animate([
        { transform: 'none', opacity: 1, filter: 'none' },
        { offset: 0.45, transform: 'scale(1, 0.006)', opacity: 1, filter: 'brightness(2.2)' },
        { transform: 'translate(' + (a.x - b.x) + 'px,' + (a.y - b.y) + 'px) scale(' + Math.max(0.05, a.w / b.w) + ', 0.006)', opacity: 0, filter: 'brightness(2.4)' }
      ], { duration: 520, easing: 'cubic-bezier(.6,0,.4,1)' });
      closing.onfinish = done;
    } else done();
  }
  // the module cards' tilt, on the holographic card too: it leans toward the pointer and catches the light
  if (!reduce && window.matchMedia && matchMedia('(hover: hover)').matches) {
    card.addEventListener('pointermove', function (e) {
      if (!isOpen) return;
      var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.transform = 'perspective(1400px) rotateY(' + ((x - 0.5) * 7) + 'deg) rotateX(' + ((0.5 - y) * 6) + 'deg)';
      card.style.setProperty('--mx', (x * 100) + '%'); card.style.setProperty('--my', (y * 100) + '%'); card.style.setProperty('--hl', 1);
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; card.style.setProperty('--hl', 0); });
  }
  holo.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { hide(); return; }
    var go = e.target.closest('[data-go-ref]'); if (go) { openRef(+go.getAttribute('data-go-ref'), null, true); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) { e.stopPropagation(); hide(); }
    if (isOpen && e.key === 'Tab') {   // keep focus inside the card
      var f = card.querySelectorAll('a[href], button'); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  /* ---------- 1. source cards ---------- */
  // the claim, rebuilt from the page: the statistic's final number (not its counting animation) + the sentence the star ends
  function sentences(t) { var s = t.match(/[^.!?]+[.!?]+/g); return (s || [t]).map(function (x) { return x.trim(); }).filter(Boolean); }
  function claimFor(star) {
    var p = star.closest('p'); if (!p) return '';
    var all = p.querySelectorAll('.ref-star'), idx = Array.prototype.indexOf.call(all, star);
    var clone = p.cloneNode(true), mine = clone.querySelectorAll('.ref-star')[idx];
    var range = document.createRange(); range.setStart(clone, 0); range.setEndBefore(mine);
    var text = range.toString().replace(/\s+/g, ' ').trim(), ss = sentences(text);
    var stat = p.closest('.stat, .people-layout');
    if (stat && !stat.classList.contains('wide')) {
      var n = stat.querySelector('.num, .big-num'), num = '';
      if (n) { var c = n.cloneNode(true); c.querySelectorAll('[data-to]').forEach(function (s) { s.textContent = s.getAttribute('data-to'); }); var pn = c.querySelector('#peopleNum'); if (pn) pn.textContent = '20'; num = c.textContent.replace(/\s+/g, ' ').trim(); }
      return (num ? num + ' ' : '') + ss[0];                   // e.g. "40% of the world's workers felt stressed for much of yesterday."
    }
    if (stat) return text;                                      // the two wide figures: their whole line
    return ss[ss.length - 1];                                   // running text: the sentence the star ends
  }
  function openRef(n, el, step) {
    var r = REFS[n]; if (!r) return;
    var stars = document.querySelectorAll('.ref-star[data-ref="' + n + '"]');
    var claim = el ? claimFor(el) : (stars[0] ? claimFor(stars[0]) : '');
    var uses = stars.length, k = 0, prev = n > 1 ? n - 1 : REFS.length - 1, next = n < REFS.length - 1 ? n + 1 : 1;
    function h() { return ' class="hl" style="--k:' + (k++) + '"'; }
    var html =
      '<div class="ix-top"><span class="id">source ' + pad(n) + '</span><span class="ix-pill ok">verified</span><span class="kind">' + esc(r.kind) + '</span>' + closeBtn() + '</div>' +
      '<div class="ix-in">' +
        '<p class="ix-co hl" style="--k:' + (k++) + '">' + esc(r.pub) + '</p>' +
        '<h2 class="ix-title hl" id="ixTitle" style="--k:' + (k++) + '">' + esc(r.title) + '</h2>' +
        '<dl class="ix-facts hl" style="--k:' + (k++) + '"><div><dt>published</dt><dd>' + esc(r.year) + '</dd></div><div><dt>coverage</dt><dd>' + esc(r.scope) + '</dd></div><div><dt>cited</dt><dd>' + uses + (uses === 1 ? ' time' : ' times') + ' on this page</dd></div></dl>' +
        (claim ? '<div class="ix-claim hl" style="--k:' + (k++) + '"><p class="lbl">' + (el ? 'the claim you clicked' : 'what it backs on this page') + '</p><p class="q">' + esc(claim) + '</p></div>' : '') +
        '<p class="ix-note hl" style="--k:' + (k++) + '">the jobs on this site are fiction. this part isn\u2019t. every number here comes from a published source you can check yourself.</p>' +
        '<div class="ix-actions hl" style="--k:' + (k++) + '"><a class="ix-go" href="' + esc(r.url) + '" target="_blank" rel="noopener">read the source <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 2h7v7M12 2L3 11"/></svg></a></div>' +
        '<div class="ix-foot hl" style="--k:' + (k++) + '"><span>real data \u00b7 source ' + pad(n) + ' of ' + pad(REFS.length - 1) + '</span>' +
          '<div class="ix-nav"><button type="button" data-go-ref="' + prev + '">\u2190 ' + pad(prev) + '</button><button type="button" data-go-ref="' + next + '">' + pad(next) + ' \u2192</button></div></div>' +
      '</div>';
    show(html, false, el, false);
  }
  document.querySelectorAll('.ref-star').forEach(function (s) {
    var n = +s.getAttribute('data-ref'), r = REFS[n];
    if (r) { s.setAttribute('aria-label', 'source ' + n + ': ' + r.pub + ', ' + r.title); s.setAttribute('aria-haspopup', 'dialog'); }
    s.addEventListener('click', function (e) { e.preventDefault(); openRef(n, s); });
  });

  /* ---------- 2. the module rail: a glass tab that slides out into the original module cards ---------- */
  var rail = document.getElementById('mrail');
  if (rail) {
    var tab = rail.querySelector('.mrail-tab'), panel = rail.querySelector('.mrail-panel'), mods = Array.prototype.slice.call(rail.querySelectorAll('.mod'));
    var open = false, closeT = 0, openedAt = 0, pinnedUntil = 0, quietUntil = 0;
    // closing hands focus back to the tab; that focus must not reopen it
    function shut() { pinnedUntil = 0; quietUntil = Date.now() + 400; setOpen(false); tab.focus({ preventScroll: true }); }
    var hover = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
    mods.forEach(function (m) { m.setAttribute('tabindex', '-1'); });
    // four square cards that always fit: measure what the header, the companies ticket and the footer take, give the rest to the squares
    var grid = panel.querySelector('.mod-grid');
    function fitCards() {
      if (!grid) return;
      var gap = 12, maxW = (panel.clientWidth - parseFloat(getComputedStyle(panel).paddingLeft) - parseFloat(getComputedStyle(panel).paddingRight) - gap) / 2;
      panel.style.setProperty('--card', Math.floor(Math.min(230, maxW)) + 'px');
      // the companies ticket and footer follow the squares' width, so their height changes too: settle in a few passes
      for (var pass = 0; pass < 4; pass++) {
        var others = panel.scrollHeight - grid.offsetHeight, room = panel.clientHeight - others;
        var side = Math.floor(Math.max(96, Math.min(230, maxW, (room - gap) / 2)));
        panel.style.setProperty('--card', side + 'px');
      }
    }
    addEventListener('resize', function () { if (open) fitCards(); });
    function setOpen(v) {
      clearTimeout(closeT);
      if (v === open) return;
      open = v; if (v) openedAt = Date.now();
      rail.classList.toggle('open', v); root.classList.toggle('mrail-open', v);
      tab.setAttribute('aria-expanded', v ? 'true' : 'false');
      mods.forEach(function (m) { if (v) m.removeAttribute('tabindex'); else m.setAttribute('tabindex', '-1'); });
      if (v) {
        fitCards();
        SFX.slide(); rail.classList.remove('nudge'); panel.scrollTop = 0;
        // the original boot sequence, every time the cards slide in: status flips offline > booting > online, % counts up, scan line
        mods.forEach(function (m) { if (window.IJBootModule) IJBootModule(m); else { m.classList.remove('in'); void m.offsetWidth; m.classList.add('in'); } });
      }
    }
    // close only if the pointer really is outside (the panel unfolds under a still mouse) and never mid-unfold
    var px = -1, py = -1;
    document.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
    function over() { if (px < 0) return false; var el = document.elementFromPoint(px, py); return !!(el && rail.contains(el)); }
    function later(ms) {
      clearTimeout(closeT);
      closeT = setTimeout(function () {
        if (Date.now() < pinnedUntil || Date.now() - openedAt < 900 || (hover && over())) { later(ms); return; }
        setOpen(false);
      }, ms || 450);
    }
    if (hover) {
      tab.addEventListener('pointerenter', function () { setOpen(true); });
      rail.addEventListener('pointerenter', function () { clearTimeout(closeT); });
      rail.addEventListener('pointerleave', function () { later(500); });
    }
    // a tap focuses (which opens) and then clicks: don't let that same click shut it again
    tab.addEventListener('click', function () { if (open && Date.now() - openedAt < 450) return; setOpen(!open); });
    rail.querySelector('.mrail-close').addEventListener('click', shut);
    rail.addEventListener('focusin', function () { if (Date.now() > quietUntil) setOpen(true); });
    rail.addEventListener('focusout', function (e) { if (!rail.contains(e.relatedTarget)) later(); });
    document.addEventListener('pointerdown', function (e) { if (open && !rail.contains(e.target)) { pinnedUntil = 0; setOpen(false); } });
    // Escape closes the rail first (and only the rail), even when it is open over the menu
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open && !isOpen) { e.stopImmediatePropagation(); shut(); } }, true);

    // visible shortly after the page opens; a one-time nudge per visit so nobody misses it
    var seen = false; try { seen = sessionStorage.getItem('ij-rail-seen') === '1'; } catch (e) {}
    setTimeout(function () {
      root.classList.add('mrail-on');
      if (!seen) {
        try { sessionStorage.setItem('ij-rail-seen', '1'); } catch (e) {}
        var nudge = function () {
          setTimeout(function () { if (!open) rail.classList.add('nudge'); }, 400);
          setTimeout(function () { rail.classList.remove('nudge'); }, 6400);
          removeEventListener('scroll', onFirst);
        };
        var onFirst = function () { if (scrollY > innerHeight * 0.4) nudge(); };
        addEventListener('scroll', onFirst, { passive: true });
      }
    }, location.hash === '#modules' ? 0 : 1600);
    function pinOpen() { root.classList.add('mrail-on'); pinnedUntil = Date.now() + 4000; setOpen(true); }
    window.__ijPinOpen = pinOpen;
    if (location.hash === '#modules') setTimeout(pinOpen, 600);
    // "see the modules" links (hero, menu) open the rail
    document.querySelectorAll('[data-open-dock], a[href="#modules"]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        var wasMenu = root.classList.contains('menu-open');
        if (wasMenu) { var mb = document.getElementById('menuBtn'); if (mb) mb.click(); }
        setTimeout(pinOpen, wasMenu ? 650 : 60);
      }, true);
    });
  }
  // how it works <-> the pass: 'open my pass' opens it; hovering a module card flares its light on the stub
  (function () {
    var leds = document.querySelectorAll('.mrail-leds i');
    document.querySelectorAll('.open-pass').forEach(function (b) { b.addEventListener('click', function () { if (window.__ijPinOpen) window.__ijPinOpen(); }); });
    document.querySelectorAll('.steps .step').forEach(function (s, i) {
      s.addEventListener('mouseenter', function () { if (leds[i]) leds[i].classList.add('lit'); });
      s.addEventListener('mouseleave', function () { if (leds[i]) leds[i].classList.remove('lit'); });
    });
  })();
  window.IJHolo = { openRef: openRef, close: hide, openPass: function () { if (window.__ijPinOpen) window.__ijPinOpen(); } };
})();

