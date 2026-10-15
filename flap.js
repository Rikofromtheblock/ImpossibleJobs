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

  // the flying rocket (site.js) uses these: the tile's rocket, same pixels, with its flame in LED steps.
  // 32 x 48 units on the same 24-dots-per-32-units grid as the tile, nozzle at (16, 20) like the icon.
  var BODY = `<path ${P} d="M16 4c5 4 6 10 4 16h-8C10 14 11 8 16 4z"/><circle ${C} cx="16" cy="12" r="2.4"/><path ${P} d="M12 20l-4 4 4 1M20 20l4 4-4 1"/>`;
  var SPRITES = {
    // the astronaut, front facing and waving (final section): reads as a person at LED resolution, unlike the side profile
    astrofront: `<svg viewBox="0 0 48 48" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4"><rect x="10" y="20" width="28" height="17" rx="4" fill="#2a1a48" stroke="#ff5f9e"/><path d="M33 7l2.5-3.5" stroke="#ff5f9e"/><circle cx="36" cy="3.4" r="1.8" fill="#00f0c8" stroke="none"/><circle cx="24" cy="15" r="11" fill="#e8e0f7" stroke="#ff5f9e"/><rect x="16" y="9.5" width="16" height="11" rx="5.5" fill="#07030f" stroke="#00f0c8" stroke-width="2"/><path d="M19.5 13.5c.8-1.4 2.2-2 3.8-2" stroke="#00f0c8" stroke-width="2"/><path d="M17 26.5h14" stroke="#ff5f9e"/><rect x="15" y="26" width="18" height="12" rx="4" fill="#e8e0f7" stroke="#ff5f9e"/><rect x="19" y="29" width="10" height="5" rx="1" fill="#2a1a48" stroke="#00f0c8" stroke-width="1.6"/><circle cx="21.5" cy="31.5" r="1" fill="#ff5f9e" stroke="none"/><circle cx="24" cy="31.5" r="1" fill="#ffc857" stroke="none"/><circle cx="26.5" cy="31.5" r="1" fill="#00f0c8" stroke="none"/><path d="M15 29l-4 7" stroke="#ff5f9e"/><circle cx="10.5" cy="37" r="2.6" fill="#e8e0f7" stroke="#ff5f9e"/><path d="M33 29l5-7" stroke="#ff5f9e"/><circle cx="39" cy="20.5" r="2.6" fill="#e8e0f7" stroke="#ff5f9e"/><rect x="16.5" y="37" width="6" height="7" rx="2" fill="#e8e0f7" stroke="#ff5f9e"/><rect x="25.5" y="37" width="6" height="7" rx="2" fill="#e8e0f7" stroke="#ff5f9e"/><path d="M15.5 45.5h8M24.5 45.5h8" stroke="#ff5f9e"/></svg>`,
    rk1: `<svg viewBox="0 0 32 48" ${S}>${BODY}<path stroke="#ffc857" d="M14 22c0 3 1 5 2 7 1-2 2-4 2-7"/></svg>`,
    rk2: `<svg viewBox="0 0 32 48" ${S}>${BODY}<path stroke="#ffc857" d="M13.5 22c0 5 1.2 9 2.5 13 1.3-4 2.5-8 2.5-13"/><path stroke="#ffffff" d="M16 23v5"/></svg>`,
    rk3: `<svg viewBox="0 0 32 48" ${S}>${BODY}<path stroke="#ff8a3d" d="M13 22c0 7 1.4 13 3 19 1.6-6 3-12 3-19"/><path stroke="#ffc857" d="M14.6 23c0 5 .6 9 1.4 13 .8-4 1.4-8 1.4-13"/><path stroke="#ffffff" d="M16 23v4"/></svg>`
  };


  // ---------- the crew: LED neon figures for the menu panels (same 24-dot grid, same glow) ----------
  // each figure: height in units (width is always 32), how far it bobs (px), frame period (ms), and two frames
  var F = 'fill="#e8e0f7" stroke="#ff5f9e"', V = 'fill="#07030f" stroke="#00f0c8"', K = 'fill="#2a1a48" stroke="#ff5f9e"';
  var A = 'stroke="#ffc857"', O = 'stroke="#ff8a3d"', W = 'stroke="#ffffff"';
  function fig(h, body) { return '<svg viewBox="0 0 32 ' + h + '" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>'; }
  function dot(x, y, r, c) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c + '" stroke="none"/>'; }

  // who we are: three astronauts
  var tallBody = `<path ${P} d="M11 4L9 1"/><rect ${K} x="4" y="19" width="6" height="14" rx="2"/><rect ${F} x="9" y="4" width="14" height="13" rx="4.5"/><rect ${V} x="12" y="7" width="10" height="6" rx="2.5"/><path ${P} d="M11 18h10"/><rect ${F} x="9" y="18" width="13" height="15" rx="4"/><path ${C} d="M12 23h7M12 26h4"/><path ${P} d="M21 21l3 8"/><circle ${F} cx="24.5" cy="30.5" r="2"/><path ${A} d="M25 29l4-12M27.5 16.5l3 1.5M26.5 16l-1-2.5"/><rect ${F} x="10" y="32" width="4.5" height="11" rx="2"/><rect ${F} x="16" y="32" width="4.5" height="11" rx="2"/><path ${P} d="M9 44h6M15.5 44h6"/>`;
  var midBody = `<rect ${K} x="2" y="19" width="6" height="10" rx="2"/><circle ${F} cx="13" cy="11" r="8.5"/><path ${V} d="M10 6.5a6.5 6.5 0 0 1 8.5 5.5v1.5a3.5 3.5 0 0 1-3.5 3.5h-2A3.5 3.5 0 0 1 10 13.5z"/><path ${W} d="M13 9c1-.8 2-1 3-1"/><rect ${F} x="7" y="19" width="13" height="11" rx="4"/><path ${A} d="M8 26.5h11"/>${dot(15, 26.5, 1.2, "#ffffff")}<rect ${F} x="8" y="29" width="5" height="6" rx="2"/><rect ${F} x="14" y="29" width="5" height="6" rx="2"/><path ${P} d="M7 36h6M14 36h6"/>`;
  var smallBody = `<rect ${K} x="5" y="13" width="7" height="9" rx="2"/><path ${C} d="M6 15h5"/><circle ${F} cx="18" cy="9" r="6.5"/><path ${V} d="M16 6a4.5 4.5 0 0 1 6 3.5v1a2.5 2.5 0 0 1-2.5 2.5h-1.5A2.5 2.5 0 0 1 16 10.5z"/><rect ${F} x="12" y="15" width="10" height="7.5" rx="3.5"/><path ${P} d="M14 22.5l-1.5 3M20 22.5l1.5 3"/><path ${P} d="M21.5 17l4 -2"/><circle ${F} cx="26.5" cy="14.5" r="1.8"/>`;
  // what we do: scouting the future, posting the mission, claiming it
  var scoutBody = `<rect ${K} x="2" y="20" width="5" height="10" rx="2"/><rect ${F} x="6" y="20" width="10" height="12" rx="3.5"/><rect ${F} x="7" y="31" width="4" height="7" rx="1.8"/><rect ${F} x="11.5" y="31" width="4" height="7" rx="1.8"/><path ${P} d="M22 10l-4 28M22 10l4 28"/><path ${K} d="M16 11.5l11-6.5 2 3.6-11 6.5z"/><circle ${F} cx="10" cy="13" r="7"/><path ${V} d="M9 9.5a5 5 0 0 1 6.5 4v1a2.5 2.5 0 0 1-2.5 2.5H11a2.5 2.5 0 0 1-2.5-2.5z"/><path ${P} d="M15 23l4-9"/>`;
  var robotBody = `<path ${P} d="M16 7V4"/><rect ${K} x="10" y="7" width="12" height="9" rx="3"/><rect ${K} x="9" y="17" width="14" height="11" rx="3"/><path ${P} d="M11 28v4M21 28v4M9 32h6M17 32h6"/><path ${P} d="M22 21l2-2"/><rect ${F} x="20" y="12" width="10" height="8" rx="1"/><path ${C} d="M22.5 15h5M22.5 17.5h3"/>`;
  var flagBody = `<path ${W} d="M24 4v31"/><rect ${K} x="4" y="20" width="5" height="8" rx="2"/><circle ${F} cx="12" cy="14" r="6"/><path ${V} d="M11 11a4 4 0 0 1 5.5 3v1a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2z"/><rect ${F} x="8" y="20" width="10" height="9" rx="3"/><path ${P} d="M17 23h6"/><rect ${F} x="9" y="28" width="3.8" height="6" rx="1.6"/><rect ${F} x="13.5" y="28" width="3.8" height="6" rx="1.6"/><path ${P} d="M3 35h26"/>`;
  // contact: the radio, the mail rocket, the dish
  var radioBody = `<rect ${K} x="3" y="20" width="6" height="11" rx="2"/><circle ${F} cx="14" cy="12" r="7.5"/><path ${V} d="M12.5 8.5a5 5 0 0 1 7 4.5v1a2.5 2.5 0 0 1-2.5 2.5h-2a2.5 2.5 0 0 1-2.5-2.5z"/><rect ${F} x="8" y="20" width="12" height="12" rx="4"/><rect ${F} x="9" y="31" width="4.5" height="8" rx="2"/><rect ${F} x="14.5" y="31" width="4.5" height="8" rx="2"/><path ${P} d="M19 23l3-4"/><rect fill="#2a1a48" stroke="#00f0c8" x="21" y="12" width="4" height="7" rx="1"/><path ${C} d="M23.5 12V9"/>`;
  var mailBody = `<path ${P} fill="#07030f" d="M11 3c5 4 6 10 4 17H7C5 13 6 7 11 3z"/><circle ${C} cx="11" cy="11" r="2.4"/><path ${P} d="M7 20l-4 4 4 1M15 20l4 4-4 1"/><path ${C} d="M15.5 14h3"/><rect ${F} x="19" y="10" width="11" height="8" rx="1"/><path ${P} d="M19.5 10.5l5 4 5-4"/>`;
  var dishBody = `<path ${P} d="M12 24l-3 7M12 24l4 7M7 31h12"/><path ${K} d="M5 12a11 11 0 0 0 15 15z"/><path ${P} d="M12.5 19.5l7-7"/><circle ${C} cx="20" cy="12" r="1.5"/>`;

  var CREW = {
    who: [
      { h: 46, bob: 2, beat: 900,  f: [fig(46, tallBody + dot(10, 2.2, 1.7, '#00f0c8')), fig(46, tallBody + dot(10, 2.2, 1.7, '#ffc857'))] },        // the tall one: antenna light blinks
      { h: 38, bob: 3, beat: 480,  f: [fig(38, midBody + `<path ${P} d="M19 21l6-10"/><circle ${F} cx="26" cy="9" r="2.3"/>`), fig(38, midBody + `<path ${P} d="M19 21l9-6"/><circle ${F} cx="29" cy="14" r="2.3"/>`)] },   // the medium one waves
      { h: 30, bob: 6, beat: 130,  f: [fig(30, smallBody + `<path ${A} d="M8.5 23v3"/>`), fig(30, smallBody + `<path ${O} d="M8.5 23v6"/><path ${A} d="M8.5 23v3.5"/>`)] }    // the small one floats on a jetpack
    ],
    what: [
      { h: 40, bob: 2, beat: 1100, f: [fig(40, scoutBody + `<path ${W} d="M28.5 0.8v3.4M26.8 2.5h3.4"/>`), fig(40, scoutBody + dot(28.5, 2.5, 1, '#00f0c8'))] },   // a star twinkles
      { h: 34, bob: 3, beat: 800,  f: [fig(34, robotBody + dot(16, 3, 1.6, '#00f0c8') + `<path ${C} d="M13.5 11.5h1M17.5 11.5h1"/>`), fig(34, robotBody + dot(16, 3, 1.6, '#ffc857') + `<path ${C} d="M13 12h2M17 12h2"/>`)] },   // antenna blinks, eyes blink
      { h: 36, bob: 2, beat: 420,  f: [fig(36, flagBody + `<path fill="#ff5f9e" stroke="#ff5f9e" d="M24 4h7v7h-7z"/><path ${W} d="M26.5 7.5h2"/>`), fig(36, flagBody + `<path fill="#ff5f9e" stroke="#ff5f9e" d="M24 4c2.5 1.5 4.5-1.5 7 0v7c-2.5-1.5-4.5 1.5-7 0z"/><path ${W} d="M26.5 7.5h2"/>`)] }   // the flag waves
    ],
    contact: [
      { h: 40, bob: 2, beat: 600,  f: [fig(40, radioBody + `<path ${C} d="M27 9a3 3 0 0 1 0 4"/>`), fig(40, radioBody + `<path ${C} d="M27 9a3 3 0 0 1 0 4M29.5 7a6 6 0 0 1 0 8"/>`)] },   // signal waves
      { h: 38, bob: 5, beat: 130,  f: [fig(38, mailBody + `<path ${A} d="M9 22c0 3 1 5 2 7 1-2 2-4 2-7"/>`), fig(38, mailBody + `<path ${O} d="M8 22c0 5 1.4 9 3 13 1.6-4 3-8 3-13"/><path ${A} d="M9.6 23c0 3 .6 6 1.4 8 .8-2 1.4-5 1.4-8"/>`)] },   // deliveries by rocket only
      { h: 32, bob: 1, beat: 700,  f: [fig(32, dishBody + `<path ${C} d="M23 6a7 7 0 0 1 3 3"/>`), fig(32, dishBody + `<path ${C} d="M23 6a7 7 0 0 1 3 3M25 2a11 11 0 0 1 5 5"/>`)] }    // the dish beams
    ]
  };

  var ORDER = Object.keys(ICONS), PX = {}, ready = null, R = 24, HOME = ORDER.indexOf('ij');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* rasterise every icon once to a 24x24 grid with hard edges: that's what makes it an LED face */
  function rasterOne(k, src) {
    return new Promise(function (res) {
      var vb = (src.match(/viewBox="0 0 (\d+) (\d+)"/) || [0, 32, 32]), w = +vb[1], h = +vb[2];
      var cw = Math.round(R * w / 32), ch = Math.round(R * h / 32);          // same grid for every sprite: 24 dots per 32 units
      var svg = src.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="' + (cw * 4) + '" height="' + (ch * 4) + '" ');
      var url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = cw; c.height = ch;
          var ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, cw, ch);
          var d = ctx.getImageData(0, 0, cw, ch), a = d.data;
          for (var i = 0; i < a.length; i += 4) a[i + 3] = a[i + 3] < 90 ? 0 : 255;
          ctx.putImageData(d, 0, 0);
          PX[k] = c.toDataURL();
        } catch (e) { PX[k] = null; }                         // fall back to the vector drawing
        URL.revokeObjectURL(url); res();
      };
      img.onerror = function () { PX[k] = null; URL.revokeObjectURL(url); res(); };
      img.src = url;
    });
  }
  function rasterise() {
    if (ready) return ready;
    var all = ORDER.map(function (k) { return rasterOne(k, ICONS[k]); })
      .concat(Object.keys(SPRITES).map(function (k) { return rasterOne(k, SPRITES[k]); }))
      .concat([].concat.apply([], Object.keys(CREW).map(function (g) {
        return [].concat.apply([], CREW[g].map(function (m, i) { return m.f.map(function (svg, n) { return rasterOne(crewKey(g, i, n), svg); }); }));
      })));
    ready = Promise.all(all);
    return ready;
  }
  function crewKey(g, i, n) { return 'crew-' + g + '-' + i + '-' + n; }
  function crewURL(g, i, n) {
    var k = crewKey(g, i, n), src = CREW[g][i].f[n];
    return PX[k] || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')));
  }
  // <div class="ij-crew" data-crew="who|what|contact" aria-hidden="true"></div>
  function buildCrew(el) {
    var g = el.getAttribute('data-crew'); if (!CREW[g]) return;
    el.innerHTML = CREW[g].map(function (m, i) {
      return '<span class="crew-fig" style="--h:' + m.h + ';--bob:' + m.bob + 'px;--bt:' + (2.2 + i * 0.7 + m.bob * 0.15).toFixed(2) + 's;--bd:-' + (i * 0.9).toFixed(1) + 's"><img alt="" src="' + crewURL(g, i, 0) + '"></span>';
    }).join('');
    if (reduce) return;                                          // no motion: the figures stand still on their first frame
    var root = document.documentElement;
    Array.prototype.forEach.call(el.querySelectorAll('.crew-fig img'), function (img, i) {
      var m = CREW[g][i], n = 0;
      setInterval(function () {
        if (el.closest('.menu') && !root.classList.contains('menu-open')) return;   // asleep while the menu is closed
        if (!el.offsetParent) return;                                                // or while its panel is hidden
        n = m.beat < 200 ? (Math.random() < 0.6 ? 1 : 0) : 1 - n;                    // flames flicker at random, the rest alternate
        img.src = crewURL(g, i, n);
      }, m.beat);
    });
  }
  function spriteURL(k) {
    var src = SPRITES[k] || ICONS[k];
    return PX[k] || ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(src.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')));
  }
  function art(k) { return PX[k] ? '<img src="' + PX[k] + '" alt="">' : (ICONS[k] || SPRITES[k]); }

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
    var own = SPRITES[el.getAttribute('data-icon')] ? el.getAttribute('data-icon') : null;   // a still figure may use a sprite outside the flip set
    if (mode === 'static') { el.innerHTML = '<span class="solo">' + art(own || ORDER[start]) + '</span>'; return; }   // a still figure has nothing to flip: one unclipped image, so its glow isn't boxed in
    el.innerHTML = '<span class="half t"></span><span class="half b"></span>' +
      '<span class="leaf"><span class="face front"></span><span class="face back"></span></span><span class="seam"></span>';
    var t = el.querySelector('.half.t'), b = el.querySelector('.half.b');
    var leaf = el.querySelector('.leaf'), front = leaf.querySelector('.front'), back = leaf.querySelector('.back');
    var cur = start, busy = false;
    function show(i) { var h = art(ORDER[i]); t.innerHTML = h; b.innerHTML = h; front.innerHTML = h; back.innerHTML = h; }
    show(cur);
    if (mode === 'static' || mode === 'static-tile') return;

    var canWAAPI = typeof leaf.animate === 'function', anim = null;
    function flipTo(next, dur) {
      return new Promise(function (res) {
        if (busy || next === cur) { res(); return; }
        busy = true;
        var n = art(ORDER[next]), c = art(ORDER[cur]);
        t.innerHTML = n; front.innerHTML = c; back.innerHTML = n; b.innerHTML = c;
        // the board keeps its own time: the flip ends after `dur` whether or not the browser managed to draw every frame,
        // so a busy page can drop frames but can never slow the board down (it used to wait for animationend)
        leaf.style.setProperty('--dur', dur + 'ms');
        if (canWAAPI) {
          anim = leaf.animate([{ transform: 'rotateX(0deg)' }, { transform: 'rotateX(-180deg)' }], { duration: dur, easing: 'linear', fill: 'forwards' });
          leaf.classList.add('go');                               // shade only
        } else { void leaf.offsetWidth; leaf.classList.add('go', 'css'); }
        setTimeout(function () {
          if (anim) { anim.cancel(); anim = null; }
          leaf.classList.remove('go', 'css'); cur = next; show(cur); busy = false; res();
        }, dur);
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
    if (!els.length && !document.querySelector('.ij-crew')) return;
    // size every tile now, so the layout (and the hero's launch pad) exists before the faces are drawn
    Array.prototype.forEach.call(els, function (el) { el.style.setProperty('--s', num(el, 'data-size', 56) + 'px'); el.classList.add('flap'); });
    rasterise().then(function () { Array.prototype.forEach.call(els, build); Array.prototype.forEach.call(document.querySelectorAll('.ij-crew'), buildCrew); });
  }
  // site.js waits on ready, then draws the flying rocket from these exact pixels
  window.IJFlap = { icons: ICONS, ready: rasterise(), sprite: spriteURL };
  // loaded at the end of <body>: run now, so the tiles have their size before site.js measures the hero
  if (document.readyState === 'loading' && !document.querySelector('.ij-flap')) document.addEventListener('DOMContentLoaded', init); else init();
})();
