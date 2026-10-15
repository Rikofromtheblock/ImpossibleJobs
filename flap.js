/* impossible jobs — the moving mark (flap.js)
   One portrait split-flap tile whose LED face spins through futuristic pixel icons, brakes like a
   departures board, lands, holds, and every second landing comes home to the ij monogram.
   Rule: still = monogram (.ij-mono, plain SVG in the page), moving = this tile.

   Markup:  <span class="ij-flap" data-size="56" data-mode="spin" aria-hidden="true"></span>
     data-mode="spin"   spin, brake, land, hold, repeat (default)
     data-mode="static" shows data-icon, no tile (used for the astronaut figures)
     data-mode="armed"  shows data-icon until the page fires "ij:ignition"/"ij:liftoff", then spins (home hero)
     data-icon  starting face (default "ij")      data-hold  ms between spins (default 2600)
     data-spin  ms of spinning (default 2600)      data-delay ms before the first spin (default 900)
   Icons: pink body, cyan "future" detail. Everything is drawn here; no image files. */
(function () {
  'use strict';
  var S = 'fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  var P = 'stroke="#ff5f9e"', C = 'stroke="#00f0c8"';
  var ICONS = {
    rocket:   `<svg viewBox="0 0 32 32" ${S}><path ${P} d="M16 4c5 4 6 10 4 16h-8C10 14 11 8 16 4z"/><circle ${C} cx="16" cy="12" r="2.4"/><path ${P} d="M12 20l-4 4 4 1M20 20l4 4-4 1"/><path stroke="#ffc857" d="M14 22c0 3 1 5 2 7 1-2 2-4 2-7"/></svg>`,
    raygun:   `<svg viewBox="0 0 32 32" ${S}><path ${P} d="M5 12h16l4 3-3 4H14l-2 8H8l1-8H5z"/><circle ${C} cx="20" cy="13" r="1.6"/><path ${C} d="M26 11l3-2M27 15h3M26 19l3 2"/></svg>`,
    saucer:   `<svg viewBox="0 0 32 32" ${S}><ellipse ${P} cx="16" cy="18" rx="12" ry="4"/><path ${P} d="M9 15c1-4 4-6 7-6s6 2 7 6"/><circle ${C} cx="16" cy="12" r="1.5"/><path ${C} d="M11 26l1-3M16 27v-3M21 26l-1-3"/></svg>`,
    robot:    `<svg viewBox="0 0 32 32" ${S}><rect ${P} x="7" y="10" width="18" height="15" rx="4"/><path ${P} d="M16 10V6M12 29v-4M20 29v-4"/><circle ${C} cx="16" cy="5" r="1.5"/><path ${C} d="M12 17h2M18 17h2M12 22h8"/></svg>`,
    satellite:`<svg viewBox="0 0 32 32" ${S}><rect ${P} x="12" y="12" width="8" height="8" rx="1" transform="rotate(45 16 16)"/><path ${P} d="M6 10l6 6M20 16l6 6"/><path ${P} d="M4 8l4-4 4 4-4 4zM20 24l4-4 4 4-4 4z"/><path ${C} d="M16 20v6M13 27h6"/></svg>`,
    planet:   `<svg viewBox="0 0 32 32" ${S}><circle ${P} cx="16" cy="16" r="7"/><path ${C} d="M4 19c4 4 20 4 24-3"/><path ${C} d="M5 14c2-2 6-3 10-3"/></svg>`,
    hover:    `<svg viewBox="0 0 32 32" ${S}><path ${P} d="M5 15c4-4 18-4 22 0-4 4-18 4-22 0z"/><path ${C} d="M9 21l-1 3M16 22v3M23 21l1 3"/><path ${C} d="M12 10l4-4 4 4"/></svg>`,
    telescope:`<svg viewBox="0 0 32 32" ${S}><path ${P} d="M6 14l18-8 2 5-18 8z"/><path ${P} d="M15 15l-3 13M15 15l9 10"/><circle ${C} cx="26" cy="7" r="2"/></svg>`,
    zap:      `<svg viewBox="0 0 32 32" ${S}><path ${P} d="M18 3L8 18h7l-1 11 10-15h-7z"/><path ${C} d="M24 6l3-1M25 11h3"/></svg>`,
    clock:    `<svg viewBox="0 0 32 32" ${S}><circle ${P} cx="16" cy="16" r="11"/><path ${C} d="M16 9v7l5 3"/><path ${P} d="M4 16h-1M29 16h-1"/></svg>`,
    helmet:   `<svg viewBox="0 0 48 48" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="23" r="15" fill="#e8e0f7" stroke="#ff5f9e" stroke-width="2.5"/><path d="M14 23a10 9 0 0 1 20 0v4a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4z" fill="#07030f" stroke="#00f0c8" stroke-width="2"/><path d="M18 22c1-3 3-4 6-4" stroke="#00f0c8" stroke-width="2"/><path d="M14 38h20" stroke="#ff5f9e" stroke-width="2.5"/></svg>`,
    astronaut:`<svg viewBox="0 0 48 48" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4"><rect x="9" y="25" width="8" height="13" rx="3" fill="#2a1a48" stroke="#ff5f9e"/><path d="M17 40a8 8 0 0 1 16 0v3H17z" fill="#e8e0f7" stroke="#ff5f9e"/><circle cx="26" cy="19" r="14" fill="#e8e0f7" stroke="#ff5f9e"/><path d="M22 10a10 10 0 0 1 14 9v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z" fill="#07030f" stroke="#00f0c8" stroke-width="2"/><path d="M25 14c1-1.5 3-2.3 5-2.3" stroke="#00f0c8" stroke-width="2.2"/><circle cx="33" cy="21" r="1.6" fill="#00f0c8" stroke="none"/><path d="M33 36l6 2" stroke="#ff5f9e"/><circle cx="40.5" cy="38.5" r="2.8" fill="#e8e0f7" stroke="#ff5f9e"/><path d="M20 43v2M30 43v2" stroke="#ff5f9e"/></svg>`,
    floater:  `<svg viewBox="0 0 48 48" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4"><g transform="rotate(-25 24 24)"><rect x="9" y="25" width="8" height="13" rx="3" fill="#2a1a48" stroke="#ff5f9e"/><path d="M17 40a8 8 0 0 1 16 0v3H17z" fill="#e8e0f7" stroke="#ff5f9e"/><circle cx="26" cy="19" r="14" fill="#e8e0f7" stroke="#ff5f9e"/><path d="M22 10a10 10 0 0 1 14 9v4a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z" fill="#07030f" stroke="#00f0c8" stroke-width="2"/><path d="M25 14c1-1.5 3-2.3 5-2.3" stroke="#00f0c8" stroke-width="2.2"/><circle cx="33" cy="21" r="1.6" fill="#00f0c8" stroke="none"/><path d="M33 36l7-4" stroke="#ff5f9e"/><circle cx="41" cy="31" r="2.8" fill="#e8e0f7" stroke="#ff5f9e"/><path d="M20 43l-2 3M30 43l2 3" stroke="#ff5f9e"/></g></svg>`,
    ij:       `<svg viewBox="0 0 48 48" fill="none" stroke-linejoin="round"><rect x="10.5" y="6" width="8" height="8" rx="1.5" fill="#ffffff"/><rect x="29.5" y="6" width="8" height="8" rx="1.5" fill="#ff5f9e"/><path d="M14.5 17v20" stroke="#ffffff" stroke-width="6.5"/><path d="M33.5 17v15a8 8 0 0 1-8 8h-3" stroke="#ff5f9e" stroke-width="6.5"/></svg>`,
    antenna:  `<svg viewBox="0 0 32 32" ${S}><path ${P} d="M16 28V14"/><circle ${P} cx="16" cy="12" r="2"/><path ${C} d="M10 9a8 8 0 0 1 12 0M7 5a12 12 0 0 1 18 0"/><path ${P} d="M11 28h10"/></svg>`,
  };

  var ORDER = Object.keys(ICONS), PX = {}, ready = null, R = 24, HOME = ORDER.indexOf('ij');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* rasterise every icon once to a 24x24 grid with hard edges: that's what makes it an LED face */
  function rasterise() {
    if (ready) return ready;
    ready = Promise.all(ORDER.map(function (k) {
      return new Promise(function (res) {
        var svg = ICONS[k].replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" ');
        var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        var img = new Image();
        img.onload = function () {
          try {
            var c = document.createElement('canvas'); c.width = R; c.height = R;
            var ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, R, R);
            var d = ctx.getImageData(0, 0, R, R), a = d.data;
            for (var i = 0; i < a.length; i += 4) a[i + 3] = a[i + 3] < 90 ? 0 : 255;
            ctx.putImageData(d, 0, 0);
            PX[k] = c.toDataURL();
          } catch (e) { PX[k] = null; }                       // fall back to the vector icon
          URL.revokeObjectURL(url); res();
        };
        img.onerror = function () { PX[k] = null; URL.revokeObjectURL(url); res(); };
        img.src = url;
      });
    }));
    return ready;
  }
  function art(k) { return PX[k] ? '<img src="' + PX[k] + '" alt="">' : ICONS[k]; }

  /* a real board: flat out at ~28 flips a second, then a short brake */
  var FAST = 36, BRAKE = [40, 46, 54, 64, 78, 96, 120, 150, 190, 240, 300, 370];
  var BRAKE_MS = BRAKE.reduce(function (a, b) { return a + b; }, 0);
  function schedule(total) { var out = [], sum = 0; while (sum < total - BRAKE_MS) { out.push(FAST); sum += FAST; } return out.concat(BRAKE); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function num(el, k, d) { var v = parseFloat(el.getAttribute(k)); return isNaN(v) ? d : v; }

  function build(el) {
    var size = num(el, 'data-size', 56), mode = el.getAttribute('data-mode') || 'spin';
    var start = ORDER.indexOf(el.getAttribute('data-icon') || 'ij'); if (start < 0) start = HOME;
    if (reduce && mode !== 'static') { mode = 'static-tile'; start = HOME; }   // no motion: the tile simply rests on ij
    el.style.setProperty('--s', size + 'px');
    el.classList.add('flap', 'led');
    if (size < 40) el.classList.add('tiny');
    if (mode === 'static') el.classList.add('bare');            // still = no tile
    if (mode === 'static') { el.innerHTML = '<span class="solo">' + art(ORDER[start]) + '</span>'; return; }   // a still figure has nothing to flip: one unclipped image, so its glow isn't boxed in
    el.innerHTML = '<span class="half t"></span><span class="half b"></span>' +
      '<span class="leaf"><span class="face front"></span><span class="face back"></span></span><span class="seam"></span>';
    var t = el.querySelector('.half.t'), b = el.querySelector('.half.b');
    var leaf = el.querySelector('.leaf'), front = leaf.querySelector('.front'), back = leaf.querySelector('.back');
    var cur = start, busy = false;
    function show(i) { var h = art(ORDER[i]); t.innerHTML = h; b.innerHTML = h; front.innerHTML = h; back.innerHTML = h; }
    show(cur);
    if (mode === 'static' || mode === 'static-tile') return;

    function flipTo(next, dur) {
      return new Promise(function (res) {
        if (busy || next === cur) { res(); return; }
        busy = true;
        var n = art(ORDER[next]), c = art(ORDER[cur]);
        t.innerHTML = n; front.innerHTML = c; back.innerHTML = n; b.innerHTML = c;
        var fin = false;
        function done() { if (fin) return; fin = true; leaf.classList.remove('go'); cur = next; show(cur); busy = false; res(); }
        leaf.style.setProperty('--dur', dur + 'ms');
        leaf.addEventListener('animationend', done, { once: true });
        setTimeout(done, dur + 120);                            // never stall if an animation is suppressed
        void leaf.offsetWidth; leaf.classList.add('go');
      });
    }
    function step(d) { return flipTo((cur + 1) % ORDER.length, d); }

    var visible = true, landings = 0, running = false;
    var hold = num(el, 'data-hold', 2600), spinMs = num(el, 'data-spin', 2600), delay = num(el, 'data-delay', 900);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(el);
    function awake() { return visible && !document.hidden; }

    function loop() {
      if (running) return; running = true;
      (function next() {
        if (!awake()) { setTimeout(next, 400); return; }
        var flips = schedule(spinMs + Math.random() * 700), i = 0;
        (function go() {
          if (i < flips.length) { step(flips[i++]).then(go); return; }
          landings++;
          var land = landings % 2 === 0
            ? (function back() { return cur === HOME ? Promise.resolve() : step(60).then(back); })()   // every second landing comes home
            : Promise.resolve();
          land.then(function () { setTimeout(next, hold); });
        })();
      })();
    }

    if (mode === 'armed') {
      var armed = true;
      var fire = function () { if (!armed) return; armed = false; cur = (cur + 1) % ORDER.length; show(cur); el.classList.remove('launch'); loop(); };   // the pad is empty: the board starts searching
      var lit = false;
      document.addEventListener('ij:ignition', function () { lit = true; el.classList.add('launch'); });
      document.addEventListener('ij:liftoff', fire);
      setTimeout(function () { if (!lit) fire(); }, 9000);      // no launch on this page (or it never started): don't stay on the pad
    } else {
      sleep(delay).then(loop);
    }
  }

  function init() {
    var els = document.querySelectorAll('.ij-flap');
    if (!els.length) return;
    // size every tile now, so the layout (and the hero's launch pad) exists before the faces are drawn
    Array.prototype.forEach.call(els, function (el) { el.style.setProperty('--s', num(el, 'data-size', 56) + 'px'); el.classList.add('flap'); });
    rasterise().then(function () { Array.prototype.forEach.call(els, build); });
  }
  window.IJFlap = { icons: ICONS };
  // loaded at the end of <body>: run now, so the tiles have their size before site.js measures the hero
  if (document.readyState === 'loading' && !document.querySelector('.ij-flap')) document.addEventListener('DOMContentLoaded', init); else init();
})();
