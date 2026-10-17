/* ---------------- IJ audio: generative music + ambience, synthesized live (no audio files) ---------------- */
window.IJAudio = (function () {
  var ctx = null, master = null, musicBus = null, musicFilter = null, padBus = null, fxBus = null, delay = null, started = false, timers = [];
  var enabled = true;
  try { enabled = localStorage.getItem('ij-sound') !== '0'; } catch (e) {}
  var page = document.body ? document.body.getAttribute('data-page') : null;
  var BOARD = page === 'board';
  var listeners = [];
  function notify() { listeners.forEach(function (f) { f(); }); }
  var ss = { get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };

  function build() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = 0.0001;
    master.connect(comp); comp.connect(ctx.destination);
    // the music runs through one filter: wide open at home, muffled "through the walls" on the mission board
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.Q.value = 0.8;
    musicFilter.frequency.value = BOARD ? 900 : 18000;
    musicBus = ctx.createGain(); musicBus.gain.value = BOARD ? 0.5 : 0.85;
    musicBus.connect(musicFilter); musicFilter.connect(master);
    padBus = ctx.createGain(); padBus.gain.value = 1; padBus.connect(musicBus);       // ducked by the kick
    fxBus = ctx.createGain(); fxBus.gain.value = 0.55; fxBus.connect(master);
    delay = ctx.createDelay(1.5); delay.delayTime.value = 60 / 118 * 0.75;            // dotted-eighth echo
    var fb = ctx.createGain(); fb.gain.value = 0.36; var dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 3200;
    delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(musicBus);
    return true;
  }
  var NOISE = null;
  function noise() { if (NOISE) return NOISE; var b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return (NOISE = b); }
  var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  /* --- the track: upbeat space synth, 118 BPM, A minor (Am9 · Fmaj7 · Cadd9 · G6/9), endlessly varied --- */
  var BPM = 118, S16 = 60 / BPM / 4, step = 0, nextT = 0;
  var CH = [[57, 60, 64, 71], [53, 57, 60, 64], [48, 52, 55, 62], [55, 59, 62, 69]];
  var ROOT = [45, 41, 48, 43];
  function voice(type, f, t, dur, peak, dest, attack) {
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + (attack || 0.005)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); return g;
  }
  function kick(t, v) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.35);
    padBus.gain.cancelScheduledValues(t); padBus.gain.setValueAtTime(0.32, t); padBus.gain.linearRampToValueAtTime(1, t + S16 * 3.2);   // sidechain pump
  }
  function hiss(t, hp, dur, v, bp) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(); f.type = bp ? 'bandpass' : 'highpass'; f.frequency.value = hp; if (bp) f.Q.value = 0.9;
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  function pad(notes, t, dur) {
    notes.forEach(function (n) {
      [-9, 9].forEach(function (c) {
        var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = c;
        f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(2200, t + dur * 0.6);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.014, t + 0.25); g.gain.setValueAtTime(0.014, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.3);
        o.connect(f); f.connect(g); g.connect(padBus); o.start(t); o.stop(t + dur + 0.4);
      });
    });
  }
  function bass(n, t) {
    var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = mtof(n);
    f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(260, t + S16 * 1.6); f.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + S16 * 1.8);
    o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + S16 * 2);
  }
  function zap(t) { var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.setValueAtTime(2600, t); o.frequency.exponentialRampToValueAtTime(180, t + 0.35);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.02, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38); o.connect(g); g.connect(musicBus); g.connect(delay); o.start(t); o.stop(t + 0.4); }
  function riser(t, dur) { var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise(); s.loop = true;
    f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + dur * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(t); s.stop(t + dur + 0.1); }
  var ARP = [0, 1, 2, 3, 2, 1, 0, 2, 3, 1, 2, 0, 3, 2, 1, 3];
  function schedule() {
    while (nextT < ctx.currentTime + 0.2) {
      var t = nextT, s16 = step % 16, bar = Math.floor(step / 16), ci = Math.floor(bar / 2) % 4, chord = CH[ci], phrase = bar % 16;
      var drums = bar >= 4, full = drums && phrase !== 15;                       // a breath every 16 bars
      if (s16 === 0 && bar % 2 === 0) pad(chord, t, S16 * 32);
      if (bar >= 2 && s16 % 2 === 0 && (full || s16 < 8)) bass(ROOT[ci] + (s16 % 4 === 2 ? 12 : 0), t);
      if (drums && s16 % 4 === 0 && full) kick(t, BOARD ? 0.11 : 0.24);
      if (drums && !BOARD && (s16 === 4 || s16 === 12) && full) hiss(t, 1700, 0.12, 0.05, true);                    // clap
      if (drums && !BOARD && s16 % 4 === 2) hiss(t, 8000, 0.09, 0.03);                                             // open hat
      if (drums && !BOARD && s16 % 2 === 1) hiss(t, 9000, 0.03, 0.012 + Math.random() * 0.008);                   // closed hat
      if (bar >= 1 && Math.random() < 0.85) voice('square', mtof(chord[ARP[s16] % 4] + 24), t, S16 * 0.9, 0.012 + (s16 % 4 === 0 ? 0.006 : 0), delay);
      if (bar >= 1 && s16 % 2 === 0) voice('triangle', mtof(chord[ARP[s16] % 4] + 24), t, S16 * 1.6, 0.018, musicBus);
      if (phrase === 14 && s16 === 0) riser(t, S16 * 32);                         // build into the next phrase
      if (drums && s16 === 14 && Math.random() < 0.22) zap(t);                    // the odd laser
      nextT += S16; step++;
    }
  }
  function startMusic() {
    nextT = ctx.currentTime + 0.08;
    // carry on from where the other page left off (same tempo and key), aligned to the next bar
    var saved = null; try { saved = JSON.parse(ss.get('ij-music') || 'null'); } catch (e) {}
    if (saved && Date.now() - saved.at < 20000) {
      var elapsed = (Date.now() - saved.at) / 1000, s = saved.step + Math.round(elapsed / S16);
      step = Math.max(64, Math.ceil(s / 16) * 16);
    } else step = 0;
    schedule(); timers.push(setInterval(schedule, 40));
    addEventListener('pagehide', function () { ss.set('ij-music', JSON.stringify({ step: step, at: Date.now() })); });
  }

  /* --- mission board only: a cold control-room ambience on top of the muffled track --- */
  function startAmbient() {
    [[45, -6], [52, 5], [57, -3]].forEach(function (d) {
      var o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(d[0]); o.detune.value = d[1];
      f.type = 'lowpass'; f.frequency.value = 260; f.Q.value = 4;
      lfo.frequency.value = 0.04 + Math.random() * 0.05; lg.gain.value = 140; lfo.connect(lg); lg.connect(f.frequency);
      g.gain.value = 0.035; o.connect(f); f.connect(g); g.connect(master); o.start(); lfo.start();
    });
    var s = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
    s.buffer = noise(); s.loop = true; nf.type = 'bandpass'; nf.frequency.value = 420; nf.Q.value = 0.7; ng.gain.value = 0.016;
    s.connect(nf); nf.connect(ng); ng.connect(master); s.start();
    (function blips() {
      if (ctx.state === 'running') {
        var t = ctx.currentTime, n = 1 + Math.floor(Math.random() * 4);
        for (var i = 0; i < n; i++) { var o = ctx.createOscillator(), g = ctx.createGain(), tt = t + i * 0.09;
          o.type = 'sine'; o.frequency.value = 1100 + Math.random() * 1600;
          g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.012, tt + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.08);
          o.connect(g); g.connect(master); g.connect(delay); o.start(tt); o.stop(tt + 0.1); }
      }
      timers.push(setTimeout(blips, 1800 + Math.random() * 4200));
    })();
  }

  /* --- mission board only: a busy airport terminal (crowd, footsteps, suitcases, announcements) --- */
  var airBus = null;
  function startAirport() {
    var rnd = function (a, b) { return a + Math.random() * (b - a); };
    airBus = ctx.createGain(); airBus.gain.value = 1; airBus.connect(master);
    // a big terminal hall: synthesized reverb
    var rev = ctx.createConvolver(), len = Math.floor(ctx.sampleRate * 3.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    rev.buffer = ir;
    var wet = ctx.createGain(); wet.gain.value = 0.5; rev.connect(wet); wet.connect(airBus);
    var crowd = ctx.createGain(); crowd.gain.value = 2.2;
    var crowdLP = ctx.createBiquadFilter(); crowdLP.type = 'lowpass'; crowdLP.frequency.value = 2600;
    crowd.connect(crowdLP); crowdLP.connect(airBus); crowdLP.connect(rev);
    var pan = function (p) { if (ctx.createStereoPanner) { var s = ctx.createStereoPanner(); s.pan.value = p; return s; } return ctx.createGain(); };
    var VOWELS = [[800, 1200], [500, 1900], [320, 2300], [520, 900], [340, 800], [650, 1700], [450, 1500]];

    // one "speaker" saying a phrase of invented syllables: a buzzing voice shaped by two moving formants
    function phrase(t, opt) {
      var n = opt.syl, o = ctx.createOscillator(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain(), p = pan(opt.pan);
      var nz = ctx.createBufferSource(), nf = ctx.createBiquadFilter(), ng = ctx.createGain();
      o.type = 'sawtooth'; f1.type = f2.type = 'bandpass'; f1.Q.value = 3.5; f2.Q.value = 4.5;
      nz.buffer = noise(); nf.type = 'highpass'; nf.frequency.value = 3200;
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g2); g2.connect(g); g2.gain.value = 0.6;
      nz.connect(nf); nf.connect(ng); ng.connect(p); g.connect(p); p.connect(opt.dest);
      g.gain.setValueAtTime(0.0001, t); ng.gain.setValueAtTime(0.0001, t);
      var tt = t, base = opt.pitch;
      for (var i = 0; i < n; i++) {
        var dur = rnd(opt.min, opt.max), v = VOWELS[Math.floor(Math.random() * VOWELS.length)], last = i === n - 1;
        // intonation: drift down through the phrase, sometimes rise at the end like a question
        var pf = base * (1 + 0.12 * Math.sin(i * 1.7) - 0.25 * (i / n) + (last && Math.random() < 0.3 ? 0.3 : 0));
        o.frequency.setTargetAtTime(pf, tt, 0.03);
        f1.frequency.setTargetAtTime(v[0] * opt.fs, tt, 0.02); f2.frequency.setTargetAtTime(v[1] * opt.fs, tt, 0.02);
        if (Math.random() < 0.6) { ng.gain.setValueAtTime(0.0001, tt); ng.gain.exponentialRampToValueAtTime(opt.vol * 0.35, tt + 0.008); ng.gain.exponentialRampToValueAtTime(0.0001, tt + 0.04); }
        g.gain.setValueAtTime(0.0001, tt + 0.02); g.gain.exponentialRampToValueAtTime(opt.vol, tt + 0.05); g.gain.exponentialRampToValueAtTime(opt.vol * 0.5, tt + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, tt + dur);
        tt += dur + (Math.random() < 0.18 ? rnd(0.05, 0.18) : 0);
      }
      o.frequency.setValueAtTime(base, t); o.start(t); o.stop(tt + 0.1); nz.start(t, Math.random()); nz.stop(tt + 0.1);
      return tt;
    }
    // the crowd: a handful of people talking at once, all over the hall
    for (var k = 0; k < 9; k++) (function (k) {
      var deep = Math.random() < 0.5, pitch = deep ? rnd(95, 140) : rnd(180, 250), fs = deep ? 0.92 : 1.12, where = rnd(-0.9, 0.9), dist = rnd(0.25, 1);
      (function talk() {
        if (ctx.state === 'running') {
          var t = ctx.currentTime + rnd(0.05, 0.5);
          var end = phrase(t, { syl: 3 + Math.floor(Math.random() * 10), min: 0.08, max: 0.2, pitch: pitch * rnd(0.95, 1.05), fs: fs, pan: where, vol: 0.05 * dist, dest: crowd });
          timers.push(setTimeout(talk, (end - ctx.currentTime + rnd(0.3, 2.6)) * 1000));
        } else timers.push(setTimeout(talk, 1000));
      })();
    })(k);
    // a soft wash of distant voices underneath
    var bed = ctx.createBufferSource(), bf = ctx.createBiquadFilter(), bg = ctx.createGain(), bl = ctx.createOscillator(), blg = ctx.createGain();
    bed.buffer = noise(); bed.loop = true; bf.type = 'bandpass'; bf.frequency.value = 650; bf.Q.value = 0.8; bg.gain.value = 0.03;
    bl.frequency.value = 0.13; blg.gain.value = 0.012; bl.connect(blg); blg.connect(bg.gain);
    bed.connect(bf); bf.connect(bg); bg.connect(crowd); bed.start(); bl.start();

    // footsteps crossing the hall
    (function walker() {
      if (ctx.state === 'running') {
        var heels = Math.random() < 0.45, steps = 6 + Math.floor(Math.random() * 10), from = rnd(-1, 1), to = -from, t = ctx.currentTime + 0.1, gap = rnd(0.42, 0.58), vol = rnd(0.06, 0.12);
        for (var i = 0; i < steps; i++) {
          var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), p = pan(from + (to - from) * i / steps), tt = t + i * gap + rnd(-0.02, 0.02);
          s.buffer = noise(); f.type = 'bandpass'; f.frequency.value = heels ? rnd(2600, 3600) : rnd(900, 1400); f.Q.value = heels ? 3 : 1.5;
          var e = vol * Math.sin(Math.PI * (i + 0.5) / steps);
          g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, e), tt + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, tt + (heels ? 0.05 : 0.07));
          s.connect(f); f.connect(g); g.connect(p); p.connect(crowd); s.start(tt, Math.random()); s.stop(tt + 0.1);
        }
      }
      timers.push(setTimeout(walker, rnd(2500, 8000)));
    })();
    // suitcases rolling over floor tiles
    (function suitcase() {
      if (ctx.state === 'running') {
        var t = ctx.currentTime + 0.1, dur = rnd(3.5, 6.5), from = rnd(-1, 1), p = pan(from);
        var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), rum = ctx.createBiquadFilter();
        s.buffer = noise(); s.loop = true; f.type = 'bandpass'; f.frequency.value = rnd(700, 1100); f.Q.value = 1.2; rum.type = 'lowpass'; rum.frequency.value = 220;
        lfo.type = 'square'; lfo.frequency.value = rnd(7, 12); lg.gain.value = 0.5; am.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + dur * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        if (p.pan) p.pan.linearRampToValueAtTime(-from, t + dur);
        s.connect(f); f.connect(am); s.connect(rum); rum.connect(am); am.connect(g); g.connect(p); p.connect(crowd);
        s.start(t); s.stop(t + dur + 0.1); lfo.start(t); lfo.stop(t + dur + 0.1);
      }
      timers.push(setTimeout(suitcase, rnd(7000, 16000)));
    })();
    // announcements: chime, then a PA voice in two invented languages, echoing through the hall
    var pa = ctx.createBiquadFilter(), pa2 = ctx.createBiquadFilter(), shaper = ctx.createWaveShaper(), paG = ctx.createGain(), curve = new Float32Array(256);
    for (var i = 0; i < 256; i++) { var x = i / 128 - 1; curve[i] = Math.tanh(x * 2.2); }
    shaper.curve = curve; pa.type = 'highpass'; pa.frequency.value = 380; pa2.type = 'lowpass'; pa2.frequency.value = 3300; paG.gain.value = 1.6;
    pa.connect(shaper); shaper.connect(pa2); pa2.connect(paG); paG.connect(airBus); paG.connect(rev);
    function chime(t, notes) {
      notes.forEach(function (m, j) {
        [1, 2.01, 3.02].forEach(function (h, k) {
          var o = ctx.createOscillator(), g = ctx.createGain(), tt = t + j * 0.62;
          o.type = 'sine'; o.frequency.value = mtof(m) * h;
          g.gain.setValueAtTime(0.0001, tt); g.gain.exponentialRampToValueAtTime(0.11 / (k + 1), tt + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, tt + 1.6);
          o.connect(g); g.connect(airBus); g.connect(rev); o.start(tt); o.stop(tt + 1.7);
        });
      });
      return t + notes.length * 0.62 + 0.4;
    }
    function announce() {
      if (ctx.state === 'running') {
        var t = chime(ctx.currentTime + 0.1, Math.random() < 0.5 ? [79, 76, 72] : [84, 81, 77, 72]);
        var voice = Math.random() < 0.5 ? { pitch: rnd(190, 225), fs: 1.1 } : { pitch: rnd(105, 130), fs: 0.93 };
        var end = t, lines = 2 + Math.floor(Math.random() * 2);
        for (var l = 0; l < lines; l++) end = phrase(end + rnd(0.15, 0.35), { syl: 7 + Math.floor(Math.random() * 9), min: 0.07, max: 0.16, pitch: voice.pitch, fs: voice.fs, pan: 0, vol: 0.12, dest: pa });
        // the same message again in a second invented language
        var v2 = { pitch: voice.pitch * rnd(0.9, 1.1), fs: voice.fs * rnd(0.95, 1.05) };
        end += 0.9;
        for (var l2 = 0; l2 < lines; l2++) end = phrase(end + rnd(0.15, 0.35), { syl: 6 + Math.floor(Math.random() * 10), min: 0.06, max: 0.14, pitch: v2.pitch, fs: v2.fs, pan: 0, vol: 0.11, dest: pa });
        if (Math.random() < 0.5) chime(end + 0.5, [72, 76]);
      }
      timers.push(setTimeout(announce, rnd(26000, 48000)));
    }
    timers.push(setTimeout(announce, 6000));
  }
  function duck(on) { if (!airBus || !ctx) return; var t = ctx.currentTime; airBus.gain.cancelScheduledValues(t); airBus.gain.setValueAtTime(airBus.gain.value, t); airBus.gain.linearRampToValueAtTime(on ? 0.5 : 1, t + 0.6); }

  function fadeTo(v, secs) { if (!master) return; var t = ctx.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), t); master.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), t + secs); }
  function begin() {
    if (!started) { started = true; startMusic(); if (BOARD) { startAmbient(); startAirport(); } }
    var arriving = ss.get('ij-warp') && Date.now() - +ss.get('ij-warp') < 8000;
    if (arriving) {                                                    // land softly after a page warp
      ss.set('ij-warp', '');
      var t = ctx.currentTime, from = BOARD ? 18000 : 400, to = BOARD ? 900 : 18000;
      musicFilter.frequency.setValueAtTime(from, t); musicFilter.frequency.exponentialRampToValueAtTime(to, t + 1.6);
      whoosh(true);
    }
    fadeTo(1, arriving ? 1.2 : 2.5); notify(); setTimeout(notify, 250);
  }
  function start() {
    if (!enabled) return;
    if (!ctx && !build()) return;
    if (ctx.state === 'running') { begin(); return; }
    var p = ctx.resume(); if (p && p.then) p.then(function () { if (ctx.state === 'running') begin(); }); else begin();
  }
  function whoosh(down) {
    var t = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise(); f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(down ? 5000 : 400, t); f.frequency.exponentialRampToValueAtTime(down ? 300 : 6000, t + 0.8);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    s.connect(f); f.connect(g); g.connect(fxBus); s.start(t); s.stop(t + 1);
  }
  // leaving for the other page: sweep the music away under a whoosh, then go
  function warp(href) {
    ss.set('ij-warp', String(Date.now()));
    document.documentElement.classList.add('warping');
    if (enabled && started && ctx && ctx.state === 'running') {
      var t = ctx.currentTime;
      musicFilter.frequency.cancelScheduledValues(t); musicFilter.frequency.setValueAtTime(musicFilter.frequency.value, t);
      musicFilter.frequency.exponentialRampToValueAtTime(BOARD ? 18000 : 300, t + 0.7);
      whoosh(!BOARD); fadeTo(0.2, 0.75);
    }
    setTimeout(function () { location.href = href; }, 720);
  }
  function setEnabled(v) {
    enabled = v; try { localStorage.setItem('ij-sound', v ? '1' : '0'); } catch (e) {}
    if (v) unlock(); else if (ctx) { fadeTo(0.0001, 0.6); setTimeout(function () { if (!enabled) { ctx.suspend(); if (silentEl) silentEl.pause(); } }, 700); }
    notify();
  }
  /* phones (iPhone and iPad above all) only let a page start sound inside a real tap: a finger lifting (touchend / click),
     a key, or a mouse press. A finger merely touching down does not count, and the ringer's silent switch mutes web audio
     unless the page says it is media playback. unlock() does all of that, and is retried on every tap until sound runs. */
  var silentEl = null;
  function silentWav() {                                            // 0.1 s of silence, made on the spot (no file to load)
    var n = 4410, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = function (o, str) { for (var i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
  }
  function unlock() {
    if (!enabled) return;
    if (!ctx && !build()) return;
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}   // Safari 16.4+: play even with the silent switch on
    try {                                                              // older iPhones: a playing media element switches the page to playback
      if (!silentEl) { silentEl = new Audio(silentWav()); silentEl.loop = true; silentEl.setAttribute('playsinline', ''); }
      var pp = silentEl.play(); if (pp && pp.catch) pp.catch(function () {});
    } catch (e) {}
    try { var one = ctx.createBuffer(1, 1, 22050), src = ctx.createBufferSource(); src.buffer = one; src.connect(ctx.destination); src.start(0); } catch (e) {}
    start();
  }
  var GESTURES = ['pointerdown', 'touchend', 'click', 'keydown'];
  function gesture(e) {
    if (e.type === 'pointerdown' && e.pointerType && e.pointerType !== 'mouse') return;     // a touch-down is not permission; its tap is
    window.__ijFirst = performance.now();
    unlock();
    setTimeout(function () { if (ctx && ctx.state === 'running') GESTURES.forEach(function (ev) { removeEventListener(ev, gesture, true); }); }, 500);
  }
  // what was the sound doing when this tap began? (registered first, so it runs before the tap itself may start it before the button hears about it)
  addEventListener('pointerdown', function () { window.__ijWasPlaying = !!(enabled && started && ctx && ctx.state === 'running'); }, true);
  GESTURES.forEach(function (ev) { addEventListener(ev, gesture, true); });
  // arriving from the other page: many browsers let the sound continue straight away; if not, it waits for a tap
  if (enabled && ss.get('ij-warp')) start();
  // back from another tab, a locked screen or a phone call ('interrupted' on iPhone): pick the sound up again
  document.addEventListener('visibilitychange', function () {
    if (!ctx || !enabled || !started) return;
    if (document.hidden) { ctx.suspend(); if (silentEl) silentEl.pause(); }
    else { var r = ctx.resume(); if (r && r.then) r.then(notify); if (silentEl) { var q = silentEl.play(); if (q && q.catch) q.catch(function () {}); } }
  });
  // page-to-page links between home and the mission board get the warp transition
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    var href = a.getAttribute('href'); if (!/^(index\.html|jobs\.html)(#.*)?$/.test(href)) return;
    var dest = href.split('#')[0]; if ((BOARD && dest === 'jobs.html') || (!BOARD && dest === 'index.html')) return;
    e.preventDefault(); warp(href);
  });
  addEventListener('pageshow', function (e) { if (e.persisted) document.documentElement.classList.remove('warping'); });

  return {
    get enabled() { return enabled; }, get playing() { return enabled && started && ctx && ctx.state === 'running'; },
    get ctx() { return ctx; }, get fx() { return fxBus; }, get echo() { return delay; },
    setEnabled: setEnabled, unlock: unlock, duck: duck, onChange: function (f) { listeners.push(f); }
  };
})();

/* sound switches: any element with data-sound-toggle */
(function soundSwitches() {
  function paint() {
    document.querySelectorAll('[data-sound-toggle]').forEach(function (b) {
      var A = window.IJAudio, lbl = b.querySelector('.lbl');
      b.classList.toggle('on', A.enabled); b.classList.toggle('armed', A.enabled && !A.playing);
      b.setAttribute('aria-pressed', A.enabled ? 'true' : 'false');
      if (lbl) lbl.textContent = !A.enabled ? 'sound off' : (A.playing ? 'sound on' : 'tap for sound');
    });
  }
  document.querySelectorAll('[data-sound-toggle]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      var A = window.IJAudio;
      // "tap for sound": sound is meant to be on but isn't running yet, so this tap starts it (never switches it off)
      if (A.enabled && (!A.playing || !window.__ijWasPlaying)) { A.unlock(); setTimeout(paint, 150); setTimeout(paint, 600); return; }
      A.setEnabled(!A.enabled);
    });
  });
  window.IJAudio.onChange(paint);
  paint(); setInterval(paint, 1500);
})();

(function cursor() {
  // custom reticle cursor, only for real mice / trackpads
  if (!window.matchMedia || !window.matchMedia('(pointer: fine)').matches) return;
  var root = document.documentElement;
  var ring = document.createElement('div'), dot = document.createElement('div');
  ring.className = 'cur-ring'; dot.className = 'cur-dot';
  ring.setAttribute('aria-hidden', 'true'); dot.setAttribute('aria-hidden', 'true');
  ring.innerHTML = '<i></i><i></i><i></i><i></i>';   // the square reticle (chosen 17 Oct): four corner brackets, locked to the pointer
  function mount() { document.body.appendChild(ring); document.body.appendChild(dot); root.classList.add('has-cursor'); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  var x = -100, y = -100, rx = -100, ry = -100, moving = false;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HOT = 'a, button, [role="tab"], [role="button"], label, input, select, textarea, summary, .mrow, .mod, .dock-head';
  addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    x = e.clientX; y = e.clientY; root.classList.add('cursor-in');
    dot.style.transform = ring.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';   // no easing: it sits exactly where the mouse is
    root.classList.toggle('cursor-hot', !!(e.target.closest && e.target.closest(HOT)));
  }, { passive: true });
  document.addEventListener('mouseleave', function () { root.classList.remove('cursor-in'); });
  addEventListener('blur', function () { root.classList.remove('cursor-in'); });
  addEventListener('pointerdown', function () { root.classList.add('cursor-down'); });
  addEventListener('pointerup', function () { root.classList.remove('cursor-down'); });
})();

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
    // the logo stays visible over the menu: clicking it closes the menu on the way home
    document.querySelectorAll('.bar .mini, .sysbar .mini').forEach(function (a) { a.addEventListener('click', function () { if (root.classList.contains('menu-open')) openMenu(false); }); });
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
  window.IJBootModule = function (m) { bootModule(m); };   // the module rail (holo.js) replays the original boot sequence
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
    dockToggle.querySelector('.lbl').textContent = state === 'open' ? 'close' : 'open modules';
    dockToggle.setAttribute('aria-label', state === 'open' ? 'close modules' : 'open modules');
    if (state === 'open') { dock.scrollTop = 0; var g = $('dockGrid'); if (g) g.scrollTop = 0; }
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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dockState === 'open') { userMin = true; setDock('min'); } });
  var heat = 0;
  function updateDock(y) {
    // heat (how far down the page you are) also drives the module rail's blink rate, so it runs even without the old dock
    var goal = $('goalSec'), fin = $('final');
    var h = 1;
    if (goal && y > goal.offsetTop - innerHeight * 0.3) h = 2;
    if (fin && y > fin.offsetTop - innerHeight * 0.5) h = 3;
    if (h !== heat) { heat = h; root.setAttribute('data-heat', h); }
    if (!dock) return;
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

  /* ---------- the gap rig ----------
     one jagged fracture line (the same random zigzag every frame), drawn as two edges that start together
     (the crack) and pull apart (the tear); the void between them is dark, with data raining inside it */
  var gapBroke = false, gapR = null;
  function gapRig(crack, oe, mobile) {
    var split = els.gapSec.querySelector('.split'), stick = els.gapSec.querySelector('.stick');
    if (!gapR) {
      var NS = 'http://www.w3.org/2000/svg', N = 16, jag = [];
      for (var i = 0; i <= N; i++) jag.push(i === 0 || i === N ? 0 : (Math.random() * 2 - 1) * (i % 2 ? 1 : 0.55));
      var svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'gap-tear'); svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = '<defs><pattern id="gapRain" width="18" height="60" patternUnits="userSpaceOnUse"><path d="M3 0v14M12 26v9M8 44v6" stroke="rgba(0,240,200,.55)" stroke-width="1.2"/>' +
        '<animateTransform attributeName="patternTransform" type="translate" from="0 0" to="0 60" dur="1.1s" repeatCount="indefinite"/></pattern>' +
        ['eA:#00f0c8', 'eAw:#e9fffb', 'eB:#ff5f9e', 'eBw:#fff0f6'].map(function (g) { var q = g.split(':');   // edge strokes that fade at both ends (no mask needed)
          return '<linearGradient id="' + q[0] + '" class="efade" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="' + q[1] + '" stop-opacity="0"/><stop offset=".08" stop-color="' + q[1] + '"/><stop offset=".92" stop-color="' + q[1] + '"/><stop offset="1" stop-color="' + q[1] + '" stop-opacity="0"/></linearGradient>'; }).join('') +
        '<linearGradient id="gapVoid" x1="0" x2="1"><stop offset="0" stop-color="#00f0c8" stop-opacity=".22"/><stop offset=".18" stop-color="#020107"/><stop offset=".82" stop-color="#020107"/><stop offset="1" stop-color="#ff5f9e" stop-opacity=".22"/></linearGradient></defs>' +
        '<path class="void"/><path class="rain"/>' +
        // each torn edge is three stacked lines (wide faint, medium, bright core): a glow without any blur filter, cheap to redraw
        '<path class="edge a g3" pathLength="1"/><path class="edge a g2" pathLength="1"/><path class="edge a" pathLength="1"/>' +
        '<path class="edge b g3" pathLength="1"/><path class="edge b g2" pathLength="1"/><path class="edge b" pathLength="1"/>';
      stick.insertBefore(svg, stick.firstChild);   // the fracture runs through the whole screen, headline included
      // the headline breaks too: two clipped copies (decorative) that pull apart; the real one stays for screen readers
      var h2 = els.gapSec.querySelector('.gap-intro .h2'), intro = h2.parentNode;
      var hl = h2.cloneNode(true), hr = h2.cloneNode(true);
      hl.className += ' h2-half l'; hr.className += ' h2-half r'; hl.setAttribute('aria-hidden', 'true'); hr.setAttribute('aria-hidden', 'true');
      [hl, hr].forEach(wordSpans);
      intro.appendChild(hl); intro.appendChild(hr);
      var cv = document.createElement('canvas'); cv.className = 'gap-void'; cv.setAttribute('aria-hidden', 'true'); svg.parentNode.insertBefore(cv, svg);   // under the svg: the glowing edges stay on top
      var flash = document.createElement('div'); flash.className = 'gap-flash'; flash.setAttribute('aria-hidden', 'true'); stick.appendChild(flash);
      gapR = { svg: svg, cv: cv, raf: 0, jag: jag, N: N, h2: h2, hl: hl, hr: hr, flash: flash, stick: stick,
        voidP: svg.querySelector('.void'), rain: svg.querySelector('.rain'), a: svg.querySelectorAll('.edge.a'), b: svg.querySelectorAll('.edge.b') };
    }
    var R = gapR, W = stick.clientWidth, H = stick.clientHeight, sr = stick.getBoundingClientRect(), pr = split.getBoundingClientRect();
    R.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var cx = pr.left - sr.left + pr.width / 2;                 // the split's centre line
    // half-width of the void. on desktop it never pushes the left column's text closer than 84px to the edge (where the
    // boarding stub lives): worked out from the layout at rest (text width measured while untouched), not from moving text
    if (!mobile && (R.w !== innerWidth || R.tw == null) && oe < 0.01) {
      var rg = document.createRange(); rg.selectNodeContents(els.sideL.querySelector('ul'));
      R.tw = rg.getBoundingClientRect().width; R.w = innerWidth;
    }
    var cap = Math.min(300, innerWidth * 0.22);
    if (!mobile && R.tw != null) {
      var restLeft = pr.left + pr.width / 2 - parseFloat(getComputedStyle(els.sideL).paddingRight) - R.tw;
      cap = Math.max(40, Math.min(cap, restLeft - 84));
    }
    var dist = mobile ? oe * 52 : oe * cap;
    els.gapSec.style.setProperty('--gapw', (dist * 2) + 'px');
    var amp = mobile ? 7 : 14;
    var rr = els.gapSec.querySelector('.rift').getBoundingClientRect(), rc = rr.top - sr.top + rr.height / 2;   // phones: the tear runs across the middle band
    // the two edges, along the same zigzag
    function edge(side) {
      var pts = [];
      for (var i = 0; i <= R.N; i++) {
        var t = i / R.N, j = R.jag[i] * amp;
        if (mobile) pts.push([t * W, rc + side * dist + j]);
        else pts.push([cx + side * dist + j, t * H]);
      }
      return pts;
    }
    var A = edge(-1), B = edge(1);
    function line(p) { return 'M' + p.map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L'); }
    var poly = line(A) + 'L' + B.slice().reverse().map(function (q) { return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z';
    var dA = line(A), dB = line(B);
    R.a.forEach(function (el) { el.setAttribute('d', dA); }); R.b.forEach(function (el) { el.setAttribute('d', dB); });
    R.pts = A.concat(B.slice().reverse()); R.open = oe;
    R.vp = mobile ? [W / 2, rc] : [cx, H * 0.5];
    R.bounds = mobile ? [0, rc - dist, W, rc + dist] : [cx - dist, 0, cx + dist, H];
    R.read = [els.riftLabel, els.gapOut].map(function (el) {      // the text in the middle, as halos (centre x, centre y, radius x, radius y)
      var q = el.getBoundingClientRect(); if (!q.width) return null;
      return [q.left - sr.left + q.width / 2, q.top - sr.top + q.height / 2, q.width * 0.62 + 40, q.height * 0.75 + 36];
    }).filter(Boolean);
    if (oe > 0.01 && !reduce) gapVoidLoop();
    R.voidP.setAttribute('d', poly); R.rain.setAttribute('d', poly);
    R.svg.style.setProperty('--crack', crack.toFixed(3));
    R.svg.style.setProperty('--open', oe.toFixed(3));
    R.svg.classList.toggle('h', !!mobile);
    if (R.fadeDir !== (mobile ? 'h' : 'v') + W + 'x' + H) {        // point the edge fades along the tear
      R.fadeDir = (mobile ? 'h' : 'v') + W + 'x' + H;
      R.svg.querySelectorAll('.efade').forEach(function (gr) { gr.setAttribute('x1', 0); gr.setAttribute('y1', 0); gr.setAttribute('x2', mobile ? W : 0); gr.setAttribute('y2', mobile ? 0 : H); });
    }
    // the columns and the headline are pushed apart (and turn away from each other)
    if (mobile) {
      els.sideL.style.transform = 'translate3d(0,' + (-oe * 16) + 'px,0)';
      els.sideR.style.transform = 'translate3d(0,' + (oe * 16) + 'px,0)';
    } else {
      // the outer edges recede: both columns are pulled back into the screen on either side of the chasm
      els.sideL.style.transform = 'translate3d(' + (-dist) + 'px,0,0) rotateY(' + (-oe * 16) + 'deg)';
      els.sideR.style.transform = 'translate3d(' + dist + 'px,0,0) rotateY(' + (oe * 16) + 'deg)';
    }
    var hd = mobile ? oe * 18 : dist;                          // the headline halves ride the torn edges
    R.hl.style.top = R.hr.style.top = R.h2.offsetTop + 'px';
    if (R.sideW !== innerWidth || !R.inset) { R.sideW = innerWidth; R.inset = assignSides(R.hl, R.hr); }
    var pl = mobile ? 0 : R.inset[0] * oe, pr2 = mobile ? 0 : R.inset[1] * oe;   // desktop: each half clears its torn edge
    R.hl.style.transform = 'translate3d(' + (-(hd + pl)) + 'px,' + (oe * 4) + 'px,0) rotate(' + (-oe * 2.5) + 'deg)';
    R.hr.style.transform = 'translate3d(' + (hd + pr2) + 'px,' + (-oe * 4) + 'px,0) rotate(' + (oe * 2.5) + 'deg)';
    R.hl.style.top = R.hr.style.top = R.h2.offsetTop + 'px';
    var torn = oe > 0.001;
    R.h2.style.opacity = torn ? 0 : 1; R.hl.style.opacity = R.hr.style.opacity = torn ? 1 : 0;
  }
  // wrap every word of a headline copy in its own span (keeps the <em> around "designed.")
  function wordSpans(el) {
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var sp = document.createElement('span'); sp.className = 'hw'; sp.textContent = part; frag.appendChild(sp);
          });
          n.replaceChild(frag, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(el);
  }
  // each word goes to the side its centre falls on, so the split always lands between words;
  // the highlighted word ("designed.") always rides with the right half
  function assignSides(hl, hr) {
    var box = hl.getBoundingClientRect(), mid = box.left + box.width / 2;
    var wl = hl.querySelectorAll('.hw'), wr = hr.querySelectorAll('.hw');
    var inL = 0, inR = 0;                                       // how far each half's innermost word reaches past the centre
    for (var i = 0; i < wl.length; i++) {
      var r = wl[i].getBoundingClientRect(), right = wl[i].closest('em') ? true : (r.left + r.width / 2) > mid;
      wl[i].style.visibility = right ? 'hidden' : 'visible';
      wr[i].style.visibility = right ? 'visible' : 'hidden';
      if (right) inR = Math.max(inR, mid - r.left); else inL = Math.max(inL, r.right - mid);
    }
    return [Math.max(0, inL) + 22, Math.max(0, inR) + 22];      // extra push so no word ever touches a torn edge
  }

  /* the void's animation: looking down a shaft into the future. a perspective tunnel rushing toward you, a radial grid,
     warp streaks, flickering data fragments and a scanning band, all clipped to the torn shape (edges stay on top) */
  var GLYPHS = ['ROLE://2046', 'SIGNAL ACQUIRED', 'NEW ROLE · UNNAMED', '0x2046', 'MATCH 97.4%', 'CURIOSITY.EXE', 'VACANCY: NONE', 'HUMAN FIRST', 'SYNC', 'TITLE NOT FOUND', '>> FUTURE', 'POSTED: NOT YET'];
  function gapVoidLoop() {
    var R = gapR; if (!R || R.raf) return;
    var cv = R.cv, ctx = cv.getContext('2d'), last = performance.now(), t = 0;
    var parts = [], glyphs = [], i;
    for (i = 0; i < 140; i++) parts.push({ a: Math.random() * Math.PI * 2, z: Math.random(), v: 0.25 + Math.random() * 0.9, c: Math.random() < 0.55 ? 0 : 1 });
    function draw(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      var sec = els.gapSec.getBoundingClientRect();
      if (!(sec.bottom > 0 && sec.top < innerHeight) || !R.pts || R.open < 0.01) { R.raf = 0; ctx.clearRect(0, 0, cv.width, cv.height); return; }
      var small = innerWidth < 700, dpr = small ? 1 : Math.min(2, window.devicePixelRatio || 1), W = R.stick.clientWidth, H = R.stick.clientHeight;   // phones: standard resolution
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      // clip to the torn shape
      ctx.save(); ctx.beginPath();
      R.pts.forEach(function (p, k) { if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
      ctx.closePath(); ctx.clip();
      var vx = R.vp[0], vy = R.vp[1], M = Math.max(W, H) * 0.9, o = R.open;
      // the void itself: near-black, faintly tinted toward each torn edge, darkest at the core
      var bb0 = R.bounds, vg = ctx.createLinearGradient(bb0[0], 0, bb0[2], 0);
      if (bb0[2] - bb0[0] < 2) vg = ctx.createLinearGradient(0, bb0[1], 0, bb0[3] + 1);
      vg.addColorStop(0, 'rgba(0,60,52,.95)'); vg.addColorStop(0.2, '#020107'); vg.addColorStop(0.8, '#020107'); vg.addColorStop(1, 'rgba(70,10,36,.95)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      // radial grid converging on the vanishing point
      ctx.lineWidth = 1;
      var NR = small ? 12 : 24;
      for (i = 0; i < NR; i++) {
        var ang = i / NR * Math.PI * 2 + t * 0.03;
        ctx.strokeStyle = 'rgba(0,240,200,' + (0.035 * o) + ')';
        ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(vx + Math.cos(ang) * M * 1.4, vy + Math.sin(ang) * M * 1.4); ctx.stroke();
      }
      // the tunnel: frames born at the vanishing point, accelerating toward you
      var NF = small ? 9 : 16;
      for (i = 0; i < NF; i++) {
        var z = (i / NF + t * 0.16) % 1, sc = Math.pow(z, 2.6), hw = sc * M, hh = sc * M * 0.62;
        var al = Math.min(1, z * 2.2) * (1 - z) * 1.4 * o;
        ctx.strokeStyle = (i % 3 === 0 ? 'rgba(255,95,158,' : 'rgba(0,240,200,') + (0.34 * al) + ')';
        ctx.lineWidth = 0.6 + z * 1.6;
        ctx.strokeRect(vx - hw, vy - hh, hw * 2, hh * 2);
        // corner ticks on the nearer frames
        if (z > 0.55) { ctx.fillStyle = 'rgba(255,255,255,' + (0.3 * al) + ')'; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { ctx.fillRect(vx + q[0] * hw - 2, vy + q[1] * hh - 2, 4, 4); }); }
      }
      // warp streaks
      for (i = 0; i < (small ? 55 : parts.length); i++) {
        var p = parts[i]; p.z += p.v * dt * 0.55;
        if (p.z > 1) { p.z = 0.02; p.a = Math.random() * Math.PI * 2; }
        var r1 = Math.pow(p.z, 2.2) * M * 1.3, r0 = Math.pow(Math.max(0, p.z - 0.04 - p.v * 0.03), 2.2) * M * 1.3;
        var ca = Math.cos(p.a), sa = Math.sin(p.a), a2 = Math.min(1, p.z * 3) * o;
        ctx.strokeStyle = p.c ? 'rgba(255,95,158,' + (0.48 * a2) + ')' : 'rgba(150,255,240,' + (0.48 * a2) + ')';
        ctx.lineWidth = 0.5 + p.z * 1.8;
        ctx.beginPath(); ctx.moveTo(vx + ca * r0, vy + sa * r0 * 0.7); ctx.lineTo(vx + ca * r1, vy + sa * r1 * 0.7); ctx.stroke();
      }
      // the vanishing point itself: a slow, pulsing core
      var pulse = 0.6 + 0.4 * Math.sin(t * 2.2), g = ctx.createRadialGradient(vx, vy, 0, vx, vy, 90 + pulse * 40);
      g.addColorStop(0, 'rgba(220,255,250,' + (0.1 * o) + ')'); g.addColorStop(0.35, 'rgba(0,240,200,' + (0.05 * o) + ')'); g.addColorStop(1, 'rgba(0,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(vx - 140, vy - 140, 280, 280);
      // scanning band
      var sy = ((t * 0.22) % 1.3 - 0.15) * H, band = ctx.createLinearGradient(0, sy - 70, 0, sy + 70);
      band.addColorStop(0, 'rgba(0,240,200,0)'); band.addColorStop(0.5, 'rgba(0,240,200,' + (0.06 * o) + ')'); band.addColorStop(1, 'rgba(0,240,200,0)');
      ctx.fillStyle = band; ctx.fillRect(0, sy - 70, W, 140);
      ctx.globalCompositeOperation = 'source-over';
      // readability: a soft dark halo behind the logo and the closing line, so the animation fades as it passes behind them
      if (R.read) R.read.forEach(function (q) {
        var hx = q[0], hy = q[1], rx = q[2], ry = q[3];
        ctx.save(); ctx.translate(hx, hy); ctx.scale(1, ry / rx);
        var dk = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        dk.addColorStop(0, 'rgba(2,1,7,.82)'); dk.addColorStop(0.55, 'rgba(2,1,7,.6)'); dk.addColorStop(1, 'rgba(2,1,7,0)');
        ctx.fillStyle = dk; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });
      // data fragments flickering in the dark
      var bb = R.bounds;
      if (glyphs.length < 6 && Math.random() < dt * 5) {
        var vw2 = bb[2] - bb[0], side = Math.random() < 0.5, gx = side ? bb[0] + 14 + Math.random() * Math.max(4, vw2 * 0.3 - 110) : bb[2] - vw2 * 0.3 + Math.random() * Math.max(4, vw2 * 0.3 - 120);
        var gy = 40 + Math.random() * (H - 80), clash = R.read && R.read.some(function (q) { return Math.abs(gx + 50 - q[0]) < q[2] * 0.9 && Math.abs(gy - q[1]) < q[3] * 0.9; });
        if (!clash) glyphs.push({ s: GLYPHS[(Math.random() * GLYPHS.length) | 0], x: gx, y: gy, life: 0, max: 1.4 + Math.random() * 2, c: Math.random() < 0.7 });
      }
      ctx.font = '500 10.5px "DM Mono", ui-monospace, monospace'; ctx.textBaseline = 'middle';
      for (i = glyphs.length - 1; i >= 0; i--) {
        var gl = glyphs[i]; gl.life += dt;
        if (gl.life > gl.max) { glyphs.splice(i, 1); continue; }
        var fl = (gl.life < 0.25 ? (Math.random() < 0.5 ? 0.2 : 1) : gl.life > gl.max - 0.3 ? (gl.max - gl.life) / 0.3 : 1) * o;
        var shown = gl.s.slice(0, Math.min(gl.s.length, Math.floor(gl.life * 28)));     // typed out
        ctx.fillStyle = gl.c ? 'rgba(0,240,200,' + (0.6 * fl) + ')' : 'rgba(255,95,158,' + (0.6 * fl) + ')';
        ctx.fillRect(gl.x, gl.y - 5, 3, 10);
        ctx.fillText(shown, gl.x + 8, gl.y);
      }
      ctx.restore();
      ctx.globalCompositeOperation = 'destination-out';              // fade the ends (cheaper than a CSS mask)
      var fd = small ? ctx.createLinearGradient(0, 0, W, 0) : ctx.createLinearGradient(0, 0, 0, H);
      fd.addColorStop(0, 'rgba(0,0,0,1)'); fd.addColorStop(small ? 0.1 : 0.07, 'rgba(0,0,0,0)'); fd.addColorStop(small ? 0.9 : 0.93, 'rgba(0,0,0,0)'); fd.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = fd; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
      R.raf = requestAnimationFrame(draw);
    }
    R.raf = requestAnimationFrame(draw);
  }

  function gapBreak() {
    if (!gapR || reduce) return;
    var st = gapR.stick, fl = gapR.flash;
    st.classList.remove('quake'); fl.classList.remove('go'); void st.offsetWidth;
    st.classList.add('quake'); fl.classList.add('go');
    setTimeout(function () { st.classList.remove('quake'); }, 560);
    var A = window.IJAudio; if (!A || !A.playing || !A.ctx) return;
    try {   // a crack (filtered noise) over a deep thud
      var ctx = A.ctx, t = ctx.currentTime, len = Math.floor(ctx.sampleRate * 0.5), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      var n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), gn = ctx.createGain();
      n.buffer = buf; f.type = 'highpass'; f.frequency.value = 900; gn.gain.value = 0.16;
      n.connect(f); f.connect(gn); gn.connect(A.fx); n.start(t);
      var o = ctx.createOscillator(), og = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(32, t + 0.6);
      og.gain.setValueAtTime(0.0001, t); og.gain.exponentialRampToValueAtTime(0.32, t + 0.02); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(og); og.connect(A.fx); o.start(t); o.stop(t + 0.85);
    } catch (e) {}
  }

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
      if (!els.hgrid) { els.hgrid = document.createElement('div'); els.hgrid.className = 'horizon-grid'; els.horizon.appendChild(els.hgrid); }
      els.hgrid.style.transform = 'translate3d(0,' + ((y * 0.6) % 64).toFixed(1) + 'px,0)';   // wraps every grid cell: looks endless, costs nothing
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
      // the gap: a crack draws itself down the middle, the section jolts, then everything tears apart along it
      var g = clamp((prog(els.gapSec) - 0.08) / 0.6, 0, 1);
      var crack = clamp((g - 0.1) / 0.18, 0, 1);              // 1. the fracture draws itself
      var open = clamp((g - 0.3) / 0.45, 0, 1);               // 3. the tear
      var oe = 1 - Math.pow(1 - open, 3);
      gapRig(crack, oe, mobile);
      els.sideL.classList.toggle('cross', g > 0.35);
      els.riftLabel.style.opacity = clamp((g - 0.5) / 0.3, 0, 1);
      els.riftLabel.style.transform = 'scale(' + (0.8 + 0.2 * clamp((g - 0.5) / 0.3, 0, 1)) + ')';
      els.riftBeam.style.opacity = 0;                           // the torn edges replace the old beam
      els.gapOut.classList.toggle('in', g > 0.85);
      // 2. the break: a jolt, a flash and (with sound on) a crack, once each time the fracture completes
      if (crack >= 1 && !gapBroke) { gapBroke = true; gapBreak(); }
      if (crack < 0.6) gapBroke = false;
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
    if (document.body.getAttribute('data-page') === 'board') return;   // the mission board is a quiet, serious system: no rocket
    var sky = document.querySelector('.sky');
    var layer = document.createElement('div');
    layer.className = 'flyer front'; layer.setAttribute('aria-hidden', 'true');
    var POOL = 170, pts = [];
    for (var i = 0; i < POOL; i++) { var d = document.createElement('i'); d.className = 'pt'; layer.appendChild(d); pts.push({ el: d, life: 0 }); }
    // the flying rocket IS the tile's LED rocket: same pixel sprite, same grid, same glow (sprites drawn by flap.js)
    layer.insertAdjacentHTML('afterbegin', '<span class="flyer-rocket"><img class="fr-img" alt=""></span>');
    sky.parentNode.insertBefore(layer, sky.nextSibling);
    var rk = layer.querySelector('.flyer-rocket'), rkImg = rk.querySelector('.fr-img');
    var SRC = {}, frameKey = '', frameAt = 0;
    function loadSprites() { if (!window.IJFlap) return; ['rk1', 'rk2', 'rk3'].forEach(function (k) { SRC[k] = IJFlap.sprite(k); }); frameKey = ''; }
    loadSprites(); if (window.IJFlap && IJFlap.ready) IJFlap.ready.then(loadSprites);
    // LED flame in steps: the tile's own small flame first, then longer burns, flickering
    function pickFrame(now, thrust) {
      if (now - frameAt < (innerWidth < 700 ? 140 : 70) && frameKey) return;   // phones: the flame flickers half as often (each swap redraws the glow)
      frameAt = now;
      var k = !thrust || flame < 0.9 ? 'rk1' : flame < 1.5 ? (Math.random() < 0.55 ? 'rk2' : 'rk1') : (Math.random() < 0.65 ? 'rk3' : 'rk2');
      if (k !== frameKey && SRC[k]) { rkImg.src = SRC[k]; frameKey = k; }
    }
    var logoRocket = $('rocket');
    var countdown = null;

    if (logoRocket) {
      countdown = document.createElement('span'); countdown.className = 'countdown'; countdown.setAttribute('aria-hidden', 'true');
      logoRocket.parentNode.appendChild(countdown);
    }

    var rnd = function (a, b) { return a + Math.random() * (b - a); };
    var wrapA = function (a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    var SIZE = 100, dockH = 0;
    var U = 3;   // px per sprite unit at scale 1 (sprite is 32 x 48 units, nozzle at 16, 20)
    function measure() {
      SIZE = innerWidth < 700 ? 70 : 100; dockH = dock ? dock.offsetHeight : 0; U = SIZE * 0.03;
      // padded by 16 units so the glow isn't cut off; 16 units = 12 LED dots, so the dot screen stays on the sprite's grid
      rk.style.width = (64 * U) + 'px'; rk.style.height = (80 * U) + 'px'; rk.style.setProperty('--s', (32 * U) + 'px');
    }
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
    function flameLen() { return 7 * U * sc * flame; }

    function padPos() {
      if (!logoRocket) return null;
      var r = logoRocket.getBoundingClientRect();
      if (!r.width || r.bottom < 0 || r.top > innerHeight) return null;
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.6, unit: r.width / 32 };   // the tile draws the 32-unit rocket s px wide, centred in its 4:5 face: nozzle (16, 20) lands at 50% / 60%
    }
    function setMode(m) { mode = m; modeT = 0; }
    function edgePoint(side, w, h, out) {
      // side: 0 left, 1 right, 2 top, 3 bottom
      return side === 0 ? { x: -out, y: rnd(h * 0.15, h * 0.85) } : side === 1 ? { x: w + out, y: rnd(h * 0.15, h * 0.85) }
           : side === 2 ? { x: rnd(w * 0.15, w * 0.85), y: -out } : { x: rnd(w * 0.15, w * 0.85), y: h + out };
    }
    // A pass is a single gentle arc from one edge to a different edge.
    // Total change of heading over the whole pass is at most 25 degrees.
    var MAX_TURN = 25 * Math.PI / 180, arc = null;
    function planPass(w, h) {
      var best = null;
      for (var tries = 0; tries < 40; tries++) {
        var inSide = Math.floor(Math.random() * 4);
        var others = [0, 1, 2, 3].filter(function (k) { return k !== inSide; });
        var outSide = others[Math.floor(Math.random() * 3)];
        var A = edgePoint(inSide, w, h, 140), B = edgePoint(outSide, w, h, 140);
        var chord = Math.hypot(B.x - A.x, B.y - A.y), mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2;
        // a real crossing: long enough, and passing through the middle of the screen rather than clipping a corner
        if (chord > Math.min(w, h) * 0.9 && mx > w * 0.2 && mx < w * 0.8 && my > h * 0.15 && my < h * 0.85) { best = { A: A, B: B, chord: chord }; break; }
      }
      if (!best) { var A2 = edgePoint(0, w, h, 140), B2 = edgePoint(1, w, h, 140); best = { A: A2, B: B2, chord: Math.hypot(B2.x - A2.x, B2.y - A2.y) }; }
      var delta = rnd(-MAX_TURN, MAX_TURN);                       // total turn for this pass, |delta| <= 25 deg
      var heading = Math.atan2(best.B.y - best.A.y, best.B.x - best.A.x);
      var len = Math.abs(delta) < 1e-3 ? best.chord : best.chord * (delta / 2) / Math.sin(delta / 2);   // arc length
      v = w < 700 ? 260 : 420;
      arc = { omega: delta / (len / v), len: len, done: 0 };     // constant turn rate: a true circular arc
      x = best.A.x; y = best.A.y;
      phi = heading - delta / 2;                                  // start heading; ends at heading + delta / 2
      ang = phi * 180 / Math.PI + 90; sc = 1;
      depthT = Math.random() < 0.55 ? rnd(0.2, 1) : rnd(-1, -0.2); depth = depthT;
      wp = { off: true };
    }
    function nextWaypoint() { route.shift(); wp = route[0] || null; if (wp) depthT = wp.depth; }

    var last = performance.now();
    function tick(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now; modeT += dt;
      var w = innerWidth, h = innerHeight - dockSpace(), small = w < 700;
      var thrust = 0, shake = 0;

      if (mode === 'pad') {
        pad = padPos();
        if (!pad) { setMode('away'); awayFor = 0.4; document.dispatchEvent(new CustomEvent('ij:liftoff')); }   // scrolled off before launch: free the tile
        else {
          x = pad.x; y = pad.y; ang = 0; sc = pad.unit / U;   // same pixel size as the tile's rocket
          var tl = 3.2 - (now - t0) / 1000;
          if (countdown) countdown.textContent = tl > 2.2 ? '' : tl > 1.5 ? 't-3' : tl > 0.8 ? 't-2' : tl > 0.1 ? 't-1' : '';
          if (tl <= 0.1) { setMode('ignition'); document.dispatchEvent(new CustomEvent('ij:ignition')); }
        }
      } else if (mode === 'ignition') {
        if (countdown) countdown.textContent = 'ignition';
        thrust = Math.min(1, modeT / 0.9); shake = 1.8 * thrust;
        var spread = small ? 0.55 : 1;
        // a ground cloud rolling out across the pad and over the wordmark
        flame = 0.5 + thrust * 1.4;
        for (var k = 0; k < 3; k++) { var tp = tail(flameLen() * rnd(0.3, 0.8)); emit('smoke', tp.x + rnd(-3, 3), tp.y, rnd(-140, 140) * thrust, rnd(0, 25), rnd(10, 16), rnd(1.4, 2.4)); }
        if (modeT > 1.4) { setMode('ascent'); liftT = now; if (countdown) countdown.textContent = 'liftoff'; document.dispatchEvent(new CustomEvent('ij:liftoff')); }
      } else if (mode === 'ascent') {
        thrust = 1; shake = Math.max(0, 1.6 - modeT * 0.7);
        var acc = 70 + modeT * 160;
        vy -= acc * dt;
        var climbed = pad ? pad.y - y : 0;
        if (climbed > h * 0.12) { var pitch = Math.min(25, (climbed - h * 0.12) / (h * 0.5) * 25); ang += (pitch - ang) * Math.min(1, dt * 2.4); vx = -vy * Math.tan(ang * Math.PI / 180); }
        x += vx * dt; y += vy * dt;
        sc += (1 - sc) * Math.min(1, dt * 0.9);
        flame = 1.9;
        for (var q = 0; q < 2; q++) { var tq = tail(flameLen() * rnd(0, 0.45)); emit('smoke', tq.x + rnd(-2, 2), tq.y, tq.dx * rnd(10, 50) + rnd(-30, 30) * Math.abs(tq.dy), tq.dy * rnd(10, 50), rnd(16, 26) * (small ? 0.7 : 1), rnd(1.8, 3)); }
        if (Math.random() < 0.6) { var ts = tail(flameLen() * rnd(0.2, 0.7)); emit('spark s0', ts.x, ts.y, ts.dx * rnd(80, 160) + rnd(-30, 30) * Math.abs(ts.dy), ts.dy * rnd(80, 160), rnd(5, 8), 0.4); }
        if (modeT > 1.2 && countdown) countdown.style.opacity = 0;
        if (y < -180) { setMode('away'); awayFor = rnd(0.8, 1.6); }
      } else if (mode === 'away') {
        if (modeT > awayFor) { planPass(w, h); setMode('fly'); }
      } else if (mode === 'fly') {
        var cruise = small ? 260 : 420;
        if (!arc) planPass(w, h);
        var step = v * dt;
        phi += arc.omega * dt;
        x += Math.cos(phi) * step; y += Math.sin(phi) * step;
        arc.done += step;
        thrust = 0.55 + 0.45 * Math.min(1, v / cruise);
        if (arc.done > arc.len * 0.5 && !arc.flip) { arc.flip = true; if (Math.random() < 0.5) depthT = -depthT; }   // may slip behind or in front halfway
        if (arc.done >= arc.len || modeT > 12) {
          setMode('away'); awayFor = rnd(3, 7); arc = null; wp = null;   // rest off-screen before the next pass
        }
        ang = phi * 180 / Math.PI + 90;
        depth += (depthT - depth) * Math.min(1, dt * 0.9);
        sc += ((1 + 0.3 * depth) - sc) * Math.min(1, dt * 2);
        var rad = (ang + 90) * Math.PI / 180;
        flame = 0.5 + thrust * 0.9;
        if (Math.random() < 0.45) { var tk = tail(flameLen() * rnd(0.15, 0.6)); emit('spark s' + Math.floor(Math.random() * 3), tk.x, tk.y, tk.dx * 70 + rnd(-25, 25), tk.dy * 70 + rnd(-25, 25), rnd(6, 10) * sc, rnd(0.45, 0.8)); }
      }


      var front = mode !== 'fly' || depth > 0;
      if (front !== layer._front) { layer.classList.toggle('front', front); layer._front = front; }
      var jx = shake ? rnd(-shake, shake) : 0, jy = shake ? rnd(-shake, shake) : 0;
      rk.style.transform = 'translate3d(' + (x - 32 * U + jx).toFixed(2) + 'px,' + (y - 36 * U + jy).toFixed(2) + 'px,0) rotate(' + ang.toFixed(2) + 'deg) scale(' + sc.toFixed(4) + ')';
      rk.style.opacity = (mode === 'away' || mode === 'pad') ? 0 : (front ? 1 : 0.72);   // on the pad, the rocket is the LED face of the tile
      pickFrame(now, thrust);

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
