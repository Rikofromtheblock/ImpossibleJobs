(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var root = document.documentElement;

  /* ---------------- menu ---------------- */
  var menuBtn = $('menuBtn'), menu = $('menu');
  var tabs = menu ? Array.prototype.slice.call(menu.querySelectorAll('.mnav button')) : [];
  var panels = menu ? Array.prototype.slice.call(menu.querySelectorAll('.mpanel')) : [];
  var lastFocus = null;
  function select(i) {
    tabs.forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); t.tabIndex = k === i ? 0 : -1; });
    panels.forEach(function (p, k) {
      if (k === i) { p.hidden = false; requestAnimationFrame(function () { requestAnimationFrame(function () { p.classList.add('show'); }); }); }
      else { p.classList.remove('show'); p.hidden = true; }
    });
  }
  function openMenu(open) {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.querySelector('.lbl').textContent = open ? 'close' : 'menu';
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) { lastFocus = document.activeElement; setTimeout(function () { var s = menu.querySelector('[aria-selected="true"]'); if (s) s.focus(); }, 350); }
    else if (lastFocus) { lastFocus.focus(); }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () { openMenu(!root.classList.contains('menu-open')); });
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); var n = (i + 1) % tabs.length; select(n); tabs[n].focus(); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); var p = (i - 1 + tabs.length) % tabs.length; select(p); tabs[p].focus(); }
      });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('menu-open')) openMenu(false); });
    menu.addEventListener('click', function (e) { var a = e.target.closest('a[href^="#"], a[href^="index.html#"]'); if (a) openMenu(false); });
    // deep link: #who, #what, #contact open the menu on that panel
    var deep = { '#who': 0, '#what': 1, '#contact': 2 };
    if (deep.hasOwnProperty(location.hash)) { select(deep[location.hash]); openMenu(true); } else { select(0); }
    document.querySelectorAll('[data-open-menu]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); select(+el.getAttribute('data-open-menu')); openMenu(true); });
    });
  }

  /* ---------------- build people grids ---------------- */
  var personSVG = '<svg class="person" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true"><circle cx="6" cy="3.6" r="3"/><path d="M0.8 16c0-4.2 2.3-7.2 5.2-7.2s5.2 3 5.2 7.2z"/></svg>';
  function grid(el, cls) { if (!el) return []; var h = ''; for (var i = 0; i < 100; i++) h += personSVG.replace('class="person"', 'class="person' + (cls ? ' ' + cls : '') + '"'); el.innerHTML = h; return el.children; }
  var people1 = grid($('people'));
  var people2 = grid($('people2'), 'cy');
  var order = []; for (var i = 0; i < 100; i++) order.push(i);
  var seed = 7; order.sort(function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; });
  var engaged = order.slice(0, 20);
  var rankOf = []; order.forEach(function (v, k) { rankOf[v] = k; });

  /* ---------------- slogan words ---------------- */
  var slogan = $('slogan');
  if (slogan) (function split(node, delay) {
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var s = document.createElement('span'); s.className = 'w'; s.textContent = part;
          s.style.animationDelay = (delay.v += 0.07) + 's'; frag.appendChild(s);
        });
        n.parentNode.replaceChild(frag, n);
      } else if (n.nodeType === 1) { split(n, delay); }
    });
  })(slogan, { v: 0.1 });

  /* ---------------- scrub words ---------------- */
  var wordEls = [];
  var scrubP = $('scrubText');
  if (scrubP) {
    var hot = scrubP.getAttribute('data-hot').split('|');
    var words = scrubP.textContent.trim().split(/\s+/);
    scrubP.innerHTML = '';
    var hotIdx = {};
    hot.forEach(function (phrase) {
      var pw = phrase.split(' ');
      for (var i = 0; i <= words.length - pw.length; i++) {
        if (pw.every(function (w, j) { return words[i + j] === w; })) { for (var k = 0; k < pw.length; k++) hotIdx[i + k] = 1; }
      }
    });
    wordEls = words.map(function (w, i) {
      var s = document.createElement('span'); s.className = 'word' + (hotIdx[i] ? ' hot' : ''); s.textContent = w;
      scrubP.appendChild(s); scrubP.appendChild(document.createTextNode(' ')); return s;
    });
  }

  /* ---------------- reveal + counters + flaps + module boot ---------------- */
  var glyphs = 'abcdefghijklmnopqrstuvwxyz0123456789';
  function flap(el, final, total) {
    if (el._flap) clearInterval(el._flap);
    if (reduce) { el.textContent = final; return; }
    var frame = 0;
    var timer = el._flap = setInterval(function () {
      frame++;
      var settled = Math.floor(final.length * frame / total);
      el.textContent = final.split('').map(function (c, j) {
        if (j < settled || c === ' ' || c === ',' || c === '.' || c === '?') return c;
        return glyphs[Math.floor(Math.random() * glyphs.length)];
      }).join('');
      if (frame >= total) { clearInterval(timer); el.textContent = final; }
    }, 45);
  }
  function flapAll(scope) {
    scope.querySelectorAll('.flap').forEach(function (el, i) { flap(el, el.textContent, 18 + (i % 10) * 2); });
  }
  function bootModule(mod) {
    var run = mod._run = (mod._run || 0) + 1;
    var alive = function () { return mod._run === run; };
    var st = mod.querySelector('.status b'), pct = mod.querySelector('.pct');
    var target = mod.getAttribute('data-status'), w = parseInt(mod.style.getPropertyValue('--w'), 10) || 0;
    var delay = (parseFloat(mod.style.getPropertyValue('--d')) || 0) + 0.45;
    // restart the bar and scan from zero
    mod.classList.remove('in'); void mod.offsetWidth; mod.classList.add('in');
    if (reduce) { if (st) st.textContent = target; if (pct) pct.textContent = w + '%'; return; }
    if (st) {
      st.textContent = 'offline';
      setTimeout(function () { if (alive()) flap(st, 'booting', 14); }, delay * 1000);
      setTimeout(function () { if (alive()) flap(st, target, 16); }, delay * 1000 + 1600);
    }
    if (pct) {
      pct.textContent = '0%';
      var t0 = null;
      setTimeout(function () {
        requestAnimationFrame(function step(t) {
          if (!alive()) return;
          if (!t0) t0 = t;
          var p = clamp((t - t0) / 2200, 0, 1), e = 1 - Math.pow(1 - p, 3);
          pct.textContent = Math.round(w * e) + '%';
          if (p < 1) requestAnimationFrame(step);
        });
      }, delay * 1000);
    }
  }
  function countUp(el) {
    if (el.dataset.done) return; el.dataset.done = 1;
    var to = +el.dataset.to, t0 = null, dur = 1600;
    if (reduce) { el.textContent = to; return; }
    requestAnimationFrame(function step(t) {
      if (!t0) t0 = t;
      var p = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    });
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var t = e.target;
      t.classList.add('in');
      if (t.id === 'board') flapAll(t);
      if (t.classList.contains('mod')) bootModule(t);
      t.querySelectorAll('.count').forEach(countUp);
      io.unobserve(t);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal, #board, .mod:not(.dock .mod)').forEach(function (el) { io.observe(el); });
  document.querySelectorAll('#board .row').forEach(function (r, i) { r.style.setProperty('--d', (i * 0.07) + 's'); });

  // module cards: gentle 3D tilt that follows the pointer
  if (!reduce && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.mod').forEach(function (m) {
      m.addEventListener('pointermove', function (e) {
        var r = m.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        m.style.transform = 'rotateY(' + ((x - 0.5) * 10) + 'deg) rotateX(' + ((0.5 - y) * 8) + 'deg) translateZ(0)';
        m.style.setProperty('--mx', (x * 100) + '%'); m.style.setProperty('--my', (y * 100) + '%');
      });
      m.addEventListener('pointerleave', function () { m.style.transform = ''; });
    });
  }

  /* ---------------- modules dock ---------------- */
  var dock = $('dock'), dockToggle = $('dockToggle');
  var dockState = 'hidden', userMin = true; // minimised by default
  var dockMods = dock ? Array.prototype.slice.call(dock.querySelectorAll('.mod')) : [];
  function setDock(state) {
    if (!dock || state === dockState) return;
    var prev = dockState; dockState = state;
    root.classList.toggle('dock-on', state === 'open');
    root.classList.toggle('dock-min', state === 'min');
    dockToggle.setAttribute('aria-expanded', state === 'open' ? 'true' : 'false');
    dockToggle.querySelector('.lbl').textContent = state === 'open' ? 'minimise' : 'open modules';
    dockToggle.setAttribute('aria-label', state === 'open' ? 'minimise modules' : 'show modules');
    dock.setAttribute('aria-hidden', state === 'hidden' ? 'true' : 'false');
    dockMods.forEach(function (m) { if (state === 'hidden') m.setAttribute('tabindex', '-1'); else m.removeAttribute('tabindex'); });
    // the boot animation runs every time the cards slide into view
    if (state === 'open' && prev !== 'open') dockMods.forEach(bootModule);
    requestAnimationFrame(onScrollSafe);
  }
  function onScrollSafe() { if (typeof onScroll === 'function') onScroll(); }
  function sizeDock() { if (dock) root.style.setProperty('--dock-h', dock.offsetHeight + 'px'); }
  if (dock) {
    sizeDock(); addEventListener('resize', sizeDock);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeDock);
    dock.setAttribute('aria-hidden', 'true');
    dockToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (dockState === 'open') { userMin = true; setDock('min'); } else { userMin = false; setDock('open'); }
    });
    // when minimised, the whole glowing bar opens the modules
    dock.querySelector('.dock-head').addEventListener('click', function () {
      if (dockState === 'min') { userMin = false; setDock('open'); }
    });
    document.querySelectorAll('[data-open-dock]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); if (root.classList.contains('menu-open') && menuBtn) openMenu(false); userMin = false; forceDock = true; setDock('open'); });
    });
  }
  var forceDock = location.hash === '#modules';
  var heat = 0;
  function updateDock(y) {
    if (!dock) return;
    var goal = $('goalSec'), fin = $('final');
    var h = 1;
    if (goal && y > goal.offsetTop - innerHeight * 0.3) h = 2;
    if (fin && y > fin.offsetTop - innerHeight * 0.5) h = 3;
    if (h !== heat) { heat = h; root.setAttribute('data-heat', h); }
    var want = forceDock || y > innerHeight * 0.85;
    if (y > innerHeight * 0.85) forceDock = false;
    if (!want) { setDock('hidden'); return; }
    if (dockState === 'hidden') setDock(userMin ? 'min' : 'open');
  }

  if (reduce) {
    if (dock) { addEventListener('scroll', function () { updateDock(scrollY); }, { passive: true }); updateDock(scrollY); }
    wordEls.forEach(function (w) { w.classList.add('lit'); });
    engaged.forEach(function (i) { if (people1[i]) people1[i].classList.add('on'); });
    for (var r = 0; r < people2.length; r++) people2[r].classList.add('on');
    if ($('peopleNum')) $('peopleNum').textContent = 20;
    if ($('goalNum')) $('goalNum').textContent = 100;
    if ($('gapOut')) $('gapOut').classList.add('in');
    if ($('riftLabel')) $('riftLabel').style.opacity = 1;
    return;
  }

  /* ---------------- scroll-driven scenes ---------------- */
  function prog(el) {
    var r = el.getBoundingClientRect(), span = r.height - innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : (r.top < 0 ? 1 : 0);
  }
  var els = {
    progress: $('progress'), bar: $('bar'), rocket: $('rocket'), logo: $('heroLogo'), sub: $('sub'), hint: $('hint'),
    hero: $('top'), scrub: $('scrub'), peopleSec: $('peopleSec'), peopleNum: $('peopleNum'),
    gapSec: $('gapSec'), sideL: $('sideL'), sideR: $('sideR'), riftLabel: $('riftLabel'), riftBeam: $('riftBeam'), gapOut: $('gapOut'),
    missions: $('missions'), rail: $('rail'), railBar: $('railBar'), railNum: $('railNum'),
    goalSec: $('goalSec'), goalNum: $('goalNum'),
    final: $('final'), fly: $('fly'), glowA: $('glowA'), glowB: $('glowB'), stars: $('stars'), starsFar: $('starsFar'), horizon: $('horizon'),
    year: $('year'), yearNum: $('yearNum'), yearLabel: $('yearLabel')
  };
  var flame = els.rocket ? els.rocket.querySelector('.flame') : null;
  var fixedYear = document.body.getAttribute('data-year');
  var ticking = false;

  function frame() {
    ticking = false;
    var y = scrollY, H = document.documentElement.scrollHeight - innerHeight, gp = H > 0 ? y / H : 0;
    var mobile = innerWidth < 700;

    if (els.progress) els.progress.style.transform = 'scaleX(' + gp + ')';
    updateDock(y);
    els.stars.style.transform = 'translate3d(0,' + (-y * 0.25) + 'px,0)';
    els.starsFar.style.transform = 'translate3d(0,' + (-y * 0.1) + 'px,0)';
    els.glowA.style.transform = 'translate3d(' + (y * 0.03) + 'px,' + (y * 0.12) + 'px,0) scale(' + (1 + y / 6000) + ')';
    els.glowB.style.transform = 'translate3d(' + (-y * 0.04) + 'px,' + (-y * 0.08) + 'px,0)';

    // time machine
    if (els.year) {
      var yr, label, fut;
      if (fixedYear) { yr = +fixedYear; label = 'the future'; fut = 1; els.year.classList.add('on'); }
      else if (els.gapSec && els.goalSec) {
        var gapTop = els.gapSec.offsetTop, goalTop = els.goalSec.offsetTop;
        fut = clamp((y - gapTop) / (goalTop - gapTop), 0, 1);
        yr = Math.round(2026 + 20 * fut);
        label = y < gapTop ? 'today' : (y < goalTop ? 'travelling' : 'the future');
        if (yr === 2026 && y < gapTop) label = 'today';
        els.year.classList.toggle('on', y > innerHeight * 0.6);
      }
      els.yearNum.textContent = yr; els.yearLabel.textContent = label;
      var dy = $('dockYear'); if (dy) { dy.textContent = yr; dy.parentNode.classList.toggle('future', yr > 2026); }
      els.year.classList.toggle('future', yr > 2026);
      els.horizon.style.opacity = fixedYear ? 0.6 : (0.15 + fut * 0.85) * clamp((y - innerHeight) / innerHeight, 0, 1);
      els.horizon.style.backgroundPosition = '0 ' + (y * 0.6) + 'px';
    }

    if (els.hero && els.rocket) {
      var hp = prog(els.hero);
      var lift = clamp((hp - 0.05) / 0.7, 0, 1);
      slogan.style.transform = 'translate3d(0,' + (-hp * 120) + 'px,0) scale(' + (1 - hp * 0.12) + ')';
      slogan.style.opacity = 1 - clamp((hp - 0.25) / 0.6, 0, 1);
      els.sub.style.transform = 'translate3d(0,' + (-hp * 60) + 'px,0)';
      els.sub.style.opacity = hp > 0.01 ? 1 - clamp(hp / 0.5, 0, 1) : '';
      els.hint.style.opacity = hp > 0.01 ? 1 - clamp(hp / 0.15, 0, 1) : '';
      els.logo.querySelector('.wordmark').style.opacity = 1 - clamp((hp - 0.2) / 0.5, 0, 1);
      els.bar.classList.toggle('on', hp > 0.6);
    } else if (els.bar) {
      els.bar.classList.add('on');
    }

    if (els.scrub) {
      var sp = clamp((prog(els.scrub) - 0.05) / 0.85, 0, 1);
      var lit = Math.round(sp * wordEls.length);
      for (var i = 0; i < wordEls.length; i++) wordEls[i].classList.toggle('lit', i < lit);
    }

    if (els.peopleSec) {
      var pp = clamp((prog(els.peopleSec) - 0.1) / 0.6, 0, 1);
      var n1 = Math.round(pp * 20);
      for (var a = 0; a < 20; a++) people1[engaged[a]].classList.toggle('on', a < n1);
      els.peopleNum.textContent = n1;
    }

    if (els.gapSec) {
      var g = clamp((prog(els.gapSec) - 0.08) / 0.6, 0, 1);
      var ge = 1 - Math.pow(1 - g, 2);
      var dist = mobile ? 0 : ge * Math.min(220, innerWidth * 0.16);
      els.sideL.style.transform = 'translate3d(' + (-dist) + 'px,0,0)';
      els.sideR.style.transform = 'translate3d(' + dist + 'px,0,0)';
      els.sideL.classList.toggle('cross', g > 0.35);
      els.riftLabel.style.opacity = clamp((g - 0.45) / 0.35, 0, 1);
      els.riftLabel.style.transform = 'scale(' + (0.8 + 0.2 * clamp((g - 0.45) / 0.35, 0, 1)) + ')';
      els.riftBeam.style.opacity = clamp((g - 0.3) / 0.4, 0, 1) * 0.9;
      els.gapOut.classList.toggle('in', g > 0.85);
    }

    if (els.missions) {
      var mp = prog(els.missions);
      var maxX = els.rail.scrollWidth - innerWidth + 24;
      els.rail.style.transform = 'translate3d(' + (-mp * Math.max(0, maxX)) + 'px,0,0)';
      els.railBar.style.transform = 'scaleX(' + mp + ')';
      els.railNum.textContent = ('0' + Math.min(9, 1 + Math.floor(mp * 9))).slice(-2);
      var cards = els.rail.children;
      for (var c = 0; c < cards.length; c++) {
        var cr = cards[c].getBoundingClientRect();
        cards[c].style.opacity = 1 - clamp(Math.abs((cr.left + cr.width / 2) / innerWidth - 0.45), 0, 1) * 0.6;
      }
    }

    if (els.goalSec) {
      var gl = clamp((prog(els.goalSec) - 0.1) / 0.65, 0, 1);
      var n2 = Math.round(20 + gl * 80);
      for (var b = 0; b < 100; b++) people2[b].classList.toggle('on', rankOf[b] < n2);
      els.goalNum.textContent = n2;
    }

  }

  /* ---------------- the rocket: a real launch, then free flight on its own clock ---------------- */
  (function rocket() {
    var sky = document.querySelector('.sky');
    var layer = document.createElement('div');
    layer.className = 'flyer front'; layer.setAttribute('aria-hidden', 'true');
    var POOL = 170, pts = [];
    for (var i = 0; i < POOL; i++) { var d = document.createElement('i'); d.className = 'pt'; layer.appendChild(d); pts.push({ el: d, life: 0 }); }
    layer.insertAdjacentHTML('beforeend',
      '<svg class="flyer-rocket" viewBox="-4 -2 34 40" fill="none" stroke="#ff5f9e" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path class="fl" d="M10.3 22c0 5 1.6 9 2.7 13 1.1-4 2.7-8 2.7-13z" fill="#ffc857" stroke="#ff8a3d"/>' +
      '<path d="M13 2c5 4 6 10 4 17H9C7 12 8 6 13 2z" fill="#07030f"/>' +
      '<circle cx="13" cy="10" r="2.4" stroke="#00f0c8" fill="rgba(0,240,200,.25)"/>' +
      '<path d="M9 19l-4 4 4 1M17 19l4 4-4 1"/></svg>');
    sky.parentNode.insertBefore(layer, sky.nextSibling);
    var rk = layer.querySelector('.flyer-rocket'), fl = rk.querySelector('.fl');
    var logoRocket = $('rocket');
    var countdown = null;

    if (logoRocket) {
      logoRocket.style.visibility = 'hidden';
      countdown = document.createElement('span'); countdown.className = 'countdown'; countdown.setAttribute('aria-hidden', 'true');
      logoRocket.parentNode.appendChild(countdown);
    }

    var rnd = function (a, b) { return a + Math.random() * (b - a); };
    var wrapA = function (a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    var SIZE = 100, dockH = 0;
    function measure() { SIZE = innerWidth < 700 ? 70 : 100; dockH = dock ? dock.offsetHeight : 0; }
    measure(); addEventListener('resize', measure);
    function dockSpace() { return root.classList.contains('dock-on') ? dockH : root.classList.contains('dock-min') ? 54 : 0; }
    function emit(type, x, y, vx, vy, size, life) {
      for (var i = 0; i < POOL; i++) {
        var p = pts[i];
        if (p.life <= 0) { p.type = type; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.size = size; p.life = p.max = life; p.el.className = 'pt ' + type; return; }
      }
    }

    // flight model: heading + speed, turn rate limited by lateral acceleration (radius = v² / aLat)
    var mode = 'pad', t0 = performance.now(), modeT = 0;
    var x = -500, y = -500, vx = 0, vy = 0, ang = 0, sc = 1, depth = 1, depthT = 1;
    var phi = -Math.PI / 2, v = 0, pad = null, wp = null, route = [], awayFor = 0, liftT = -1, flame = 0;
    // (x, y) is the nozzle. The exhaust direction is the rocket's "down" axis, rotated by ang.
    function tail(d) { var a = ang * Math.PI / 180; return { x: x - Math.sin(a) * d, y: y + Math.cos(a) * d, dx: -Math.sin(a), dy: Math.cos(a) }; }
    function flameLen() { return 0.3835 * SIZE * sc * flame; }

    function padPos() {
      if (!logoRocket) return null;
      var r = logoRocket.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > innerHeight) return null;
      return { x: r.left + r.width * (13 / 26), y: r.top + r.height * (22 / 34), w: r.width };   // the logo rocket's nozzle
    }
    function setMode(m) { mode = m; modeT = 0; }
    function edgePoint(side, w, h, out) {
      // side: 0 left, 1 right, 2 top, 3 bottom
      return side === 0 ? { x: -out, y: rnd(h * 0.15, h * 0.85) } : side === 1 ? { x: w + out, y: rnd(h * 0.15, h * 0.85) }
           : side === 2 ? { x: rnd(w * 0.15, w * 0.85), y: -out } : { x: rnd(w * 0.15, w * 0.85), y: h + out };
    }
    function planPass(w, h) {
      var inSide = Math.floor(Math.random() * 4);
      var others = [0, 1, 2, 3].filter(function (k) { return k !== inSide; });
      var outSide = others[Math.floor(Math.random() * 3)];
      var start = edgePoint(inSide, w, h, 110);
      x = start.x; y = start.y;
      route = [];
      var n = Math.random() < 0.5 ? 1 : 2;                 // one or two turns on screen, then away
      for (var i = 0; i < n; i++) route.push({ x: rnd(w * 0.22, w * 0.78), y: rnd(Math.min(140, h * 0.2), Math.max(160, h * 0.8)), depth: Math.random() < 0.55 ? rnd(0.2, 1) : rnd(-1, -0.2) });
      var exit = edgePoint(outSide, w, h, 320); exit.off = true; exit.depth = rnd(-1, 1);
      route.push(exit);
      wp = route[0]; depthT = wp.depth;
      phi = Math.atan2(wp.y - y, wp.x - x);
      v = w < 700 ? 260 : 420; ang = phi * 180 / Math.PI + 90; sc = 1; depth = depthT;
    }
    function nextWaypoint() { route.shift(); wp = route[0] || null; if (wp) depthT = wp.depth; }

    var last = performance.now();
    function tick(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now; modeT += dt;
      var w = innerWidth, h = innerHeight - dockSpace(), small = w < 700;
      var thrust = 0, shake = 0;

      if (mode === 'pad') {
        pad = padPos();
        if (!pad) { setMode('away'); awayFor = 0.4; }
        else {
          x = pad.x; y = pad.y; ang = 0; sc = pad.w / (SIZE * 0.765);
          var tl = 3.2 - (now - t0) / 1000;
          if (countdown) countdown.textContent = tl > 2.2 ? '' : tl > 1.5 ? 't-3' : tl > 0.8 ? 't-2' : tl > 0.1 ? 't-1' : '';
          if (tl <= 0.1) setMode('ignition');
        }
      } else if (mode === 'ignition') {
        if (countdown) countdown.textContent = 'ignition';
        thrust = Math.min(1, modeT / 0.9); shake = 1.8 * thrust;
        var spread = small ? 0.55 : 1;
        // a ground cloud rolling out across the pad and over the wordmark
        flame = 0.5 + thrust * 1.4;
        for (var k = 0; k < 3; k++) { var tp = tail(flameLen() * rnd(0.55, 0.95)); emit('smoke', tp.x + rnd(-3, 3), tp.y, rnd(-140, 140) * thrust, rnd(-20, 10), rnd(10, 18), rnd(1.4, 2.4)); }
        if (modeT > 1.4) { setMode('ascent'); liftT = now; if (countdown) countdown.textContent = 'liftoff'; }
      } else if (mode === 'ascent') {
        thrust = 1; shake = Math.max(0, 1.6 - modeT * 0.7);
        var acc = 70 + modeT * 160;
        vy -= acc * dt;
        var climbed = pad ? pad.y - y : 0;
        if (climbed > h * 0.12) { var pitch = Math.min(32, (climbed - h * 0.12) / (h * 0.5) * 32); ang += (pitch - ang) * Math.min(1, dt * 2.4); vx = -vy * Math.tan(ang * Math.PI / 180); }
        x += vx * dt; y += vy * dt;
        sc += (1 - sc) * Math.min(1, dt * 0.9);
        flame = 1.9;
        for (var q = 0; q < 2; q++) { var tq = tail(flameLen() * rnd(0.55, 0.95)); emit('smoke', tq.x + rnd(-3, 3), tq.y, tq.dx * rnd(20, 80) + rnd(-40, 40) * Math.abs(tq.dy), tq.dy * rnd(20, 80), rnd(16, 26) * (small ? 0.7 : 1), rnd(1.8, 3)); }
        if (Math.random() < 0.6) { var ts = tail(flameLen() * rnd(0.6, 1)); emit('spark s0', ts.x, ts.y, ts.dx * rnd(80, 160) + rnd(-30, 30) * Math.abs(ts.dy), ts.dy * rnd(80, 160), rnd(5, 8), 0.4); }
        if (modeT > 1.2 && countdown) countdown.style.opacity = 0;
        if (y < -180) { setMode('away'); awayFor = rnd(0.8, 1.6); }
      } else if (mode === 'away') {
        if (modeT > awayFor) { planPass(w, h); setMode('fly'); }
      } else if (mode === 'fly') {
        var cruise = small ? 260 : 420, aLat = small ? 340 : 560, accel = 260;
        if (!wp) planPass(w, h);
        var dx = wp.x - x, dy = wp.y - y, dist = Math.hypot(dx, dy);
        var diff = wrapA(Math.atan2(dy, dx) - phi);
        var vT = cruise * (1 - 0.3 * Math.min(1, Math.abs(diff) / Math.PI));
        v += Math.max(-accel * dt, Math.min(accel * dt, vT - v));
        var omegaMax = aLat / Math.max(v, 80);                 // tighter turns only when slow
        var omega = Math.max(-omegaMax, Math.min(omegaMax, diff * 2.2));
        phi += omega * dt + Math.sin(now / 900) * 0.08 * dt;
        x += Math.cos(phi) * v * dt; y += Math.sin(phi) * v * dt;
        thrust = 0.55 + 0.45 * Math.min(1, v / cruise);
        var radius = v * v / aLat;
        if (!wp.off && (dist < 120 || (dist < radius * 2 && Math.abs(diff) > 1.0))) nextWaypoint();   // no circling
        if (modeT > 5 && wp && !wp.off) { route = [route[route.length - 1]]; wp = route[0]; depthT = wp.depth; }   // time to leave
        var outside = x < -150 || x > w + 150 || y < -150 || y > innerHeight + 150;
        if ((wp && wp.off && outside) || x < -500 || x > w + 500 || y < -500 || y > innerHeight + 500 || modeT > 10) {
          setMode('away'); awayFor = rnd(3, 7); wp = null; route = [];               // rest off-screen before the next pass
        }
        var tA = phi * 180 / Math.PI + 90, df = ((tA - ang + 540) % 360) - 180; ang += df * Math.min(1, dt * 12);
        depth += (depthT - depth) * Math.min(1, dt * 0.9);
        sc += ((1 + 0.3 * depth) - sc) * Math.min(1, dt * 2);
        var rad = (ang + 90) * Math.PI / 180;
        flame = 0.5 + thrust * 0.9;
        if (Math.random() < 0.45) { var tk = tail(flameLen() * rnd(0.6, 1)); emit('spark s' + Math.floor(Math.random() * 3), tk.x, tk.y, tk.dx * 70 + rnd(-25, 25), tk.dy * 70 + rnd(-25, 25), rnd(6, 10) * sc, rnd(0.45, 0.8)); }
      }


      var front = mode !== 'fly' || depth > 0;
      if (front !== layer._front) { layer.classList.toggle('front', front); layer._front = front; }
      var jx = shake ? rnd(-shake, shake) : 0, jy = shake ? rnd(-shake, shake) : 0;
      rk.style.transform = 'translate3d(' + (x - SIZE / 2 + jx).toFixed(1) + 'px,' + (y - SIZE * 1.18 * 0.6 + jy).toFixed(1) + 'px,0) rotate(' + ang.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      rk.style.opacity = mode === 'away' ? 0 : (front ? 1 : 0.72);
      fl.style.opacity = thrust > 0 ? 1 : 0;
      fl.style.transform = 'scaleY(' + (thrust > 0 ? flame + Math.random() * 0.3 : 0.2).toFixed(2) + ')';

      // particles: transforms only, no layout work
      for (var i = 0; i < POOL; i++) {
        var p = pts[i]; if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) { p.el.style.opacity = 0; continue; }
        var kk = p.life / p.max;
        if (p.type === 'smoke') { var damp = Math.pow(0.18, dt); p.vx *= damp; p.vy = p.vy * damp - 8 * dt; p.size += 50 * dt; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.el.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0) scale(' + (p.size / 40).toFixed(3) + ')';
        p.el.style.opacity = (p.type === 'smoke' ? kk * 0.6 : kk).toFixed(3);
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();
})();
