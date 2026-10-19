/* impossible jobs — theme.js: colour or black & white.
   The choice is remembered (localStorage 'ij-theme') and applied before the page paints by a one-line script in <head>.
   Switching plays "the tear": the page cracks down the middle and the other mode is revealed through the widening gap
   (View Transitions; browsers without them, and reduced motion, switch instantly). */
(function () {
  'use strict';
  var root = document.documentElement, KEY = 'ij-theme', switches = [];
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function current() { return root.getAttribute('data-theme') === 'mono' ? 'mono' : 'color'; }
  function apply(t) {
    if (t === 'mono') root.setAttribute('data-theme', 'mono'); else root.removeAttribute('data-theme');
    try { localStorage.setItem(KEY, t); } catch (e) {}
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', t === 'mono' ? '#ffffff' : '#07030f');
    switches.forEach(function (s) { s.setAttribute('aria-checked', t === 'mono' ? 'true' : 'false'); });
    document.dispatchEvent(new CustomEvent('ij:theme', { detail: t }));
  }
  // a fresh jagged fracture for every tear: the gap opens along it from a hairline to the whole screen
  function tearKeyframes() {
    var N = 22, amp = innerWidth < 700 ? 4.5 : 2.2, jag = [];
    for (var i = 0; i <= N; i++) jag.push(i === 0 || i === N ? 0 : (Math.random() * 2 - 1) * amp * (i % 2 ? 1 : 0.55));
    function poly(w) {
      var L = [], R = [];
      for (var i = 0; i <= N; i++) { var y = (i / N * 100).toFixed(2) + '%'; L.push((50 - w + jag[i]).toFixed(2) + '% ' + y); R.unshift((50 + w + jag[i]).toFixed(2) + '% ' + y); }
      return 'polygon(' + L.concat(R).join(',') + ')';
    }
    var css = '@keyframes ijTearOpen{0%{clip-path:' + poly(0) + '}22%{clip-path:' + poly(0.25) + '}34%{clip-path:' + poly(0.25) + '}100%{clip-path:' + poly(62) + '}}';
    var st = document.getElementById('ijTearKF'); if (!st) { st = document.createElement('style'); st.id = 'ijTearKF'; document.head.appendChild(st); }
    st.textContent = css;
  }
  function crack() {   // the gap's crack, if sound is on
    var A = window.IJAudio; if (!A || !A.playing || !A.ctx) return;
    try {
      var ctx = A.ctx, t = ctx.currentTime + 0.25, len = Math.floor(ctx.sampleRate * 0.4), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      var n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      n.buffer = buf; f.type = 'highpass'; f.frequency.value = 900; g.gain.value = 0.14; n.connect(f); f.connect(g); g.connect(A.fx); n.start(t);
      var o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.setValueAtTime(80, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.5);
      og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.28, t + 0.02); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(og); og.connect(A.fx); o.start(t); o.stop(t + 0.75);
    } catch (e) {}
  }
  function toggle() {
    var next = current() === 'mono' ? 'color' : 'mono';
    if (reduce || !document.startViewTransition) { apply(next); return; }
    tearKeyframes(); crack();
    document.startViewTransition(function () { apply(next); });
  }
  function make(cls) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'theme-switch ' + cls; b.setAttribute('role', 'switch');
    b.setAttribute('aria-label', 'black and white'); b.setAttribute('aria-checked', current() === 'mono' ? 'true' : 'false');
    b.innerHTML = '<span>colour</span><span>b&amp;w</span>';
    b.addEventListener('click', toggle);
    switches.push(b); return b;
  }
  function init() {
    // desktop: in the top bar, just left of the sound button
    var bar = make('bar-switch');
    var inbar = document.querySelector('header.bar .snd, header.sysbar [data-sound-toggle]');   // the drift and the board: their bars are flex rows, so the switch joins them before the sound button
    if (inbar) { bar.classList.add('inbar'); inbar.parentNode.insertBefore(bar, inbar); } else document.body.appendChild(bar);
    var snd = document.querySelector('.snd-float, [data-sound-toggle]');
    function place() {
      if (bar.classList.contains('inbar')) return;
      if (!snd) { bar.style.right = '16px'; return; }
      var r = snd.getBoundingClientRect(); if (!r.width) return;
      bar.style.right = Math.round(innerWidth - r.left + 10) + 'px';
      bar.style.top = Math.round(r.top + (r.height - 48) / 2) + 'px';
    }
    place(); addEventListener('resize', place);
    if (snd && window.ResizeObserver) new ResizeObserver(place).observe(snd);
    // phones: inside the menu, under the section list
    var mnav = document.querySelector('.mnav');   // after the section list (its button styling must not reach the switch)
    if (mnav) mnav.parentNode.insertBefore(make('menu-switch'), mnav.nextSibling);
    if (!mnav) bar.classList.add('solo');   // no menu on this page: the bar switch stays on phones, compact
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta && current() === 'mono') meta.setAttribute('content', '#ffffff');
  }
  window.IJTheme = { get: current, set: apply, toggle: toggle };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
