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
    if (v) start(); else if (ctx) { fadeTo(0.0001, 0.6); setTimeout(function () { if (!enabled) ctx.suspend(); }, 700); }
    notify();
  }
  function firstGesture() { window.__ijFirst = performance.now(); start(); ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { removeEventListener(ev, firstGesture, true); }); }
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { addEventListener(ev, firstGesture, true); });
  // arriving from the other page: many browsers let the sound continue straight away; if not, it waits for a tap
  if (enabled && ss.get('ij-warp')) start();
  document.addEventListener('visibilitychange', function () { if (!ctx || !enabled || !started) return; if (document.hidden) ctx.suspend(); else ctx.resume(); });
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
    setEnabled: setEnabled, duck: duck, onChange: function (f) { listeners.push(f); }
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
      // the first click on the page both unlocks audio and lands here: treat it as "start", not "switch off"
      if (performance.now() - (window.__ijFirst || 0) < 600) { setTimeout(paint, 120); return; }
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
  ring.innerHTML = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14"/><path class="tick" d="M20 1v5M20 34v5M1 20h5M34 20h5"/></svg>';
  function mount() { document.body.appendChild(ring); document.body.appendChild(dot); root.classList.add('has-cursor'); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
  var x = -100, y = -100, rx = -100, ry = -100, moving = false;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HOT = 'a, button, [role="tab"], [role="button"], label, input, select, textarea, summary, .mrow, .mod, .dock-head';
  addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    x = e.clientX; y = e.clientY; root.classList.add('cursor-in');
    dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    root.classList.toggle('cursor-hot', !!(e.target.closest && e.target.closest(HOT)));
    if (!moving) { moving = true; requestAnimationFrame(follow); }
  }, { passive: true });
  function follow() {
    var k = still ? 1 : 0.22;
    rx += (x - rx) * k; ry += (y - ry) * k;
    ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    if (Math.abs(x - rx) > 0.2 || Math.abs(y - ry) > 0.2) requestAnimationFrame(follow); else moving = false;
  }
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
    if (document.body.getAttribute('data-page') === 'board') return;   // the mission board is a quiet, serious system: no rocket
    var sky = document.querySelector('.sky');
    var layer = document.createElement('div');
    layer.className = 'flyer front'; layer.setAttribute('aria-hidden', 'true');
    var POOL = 170, pts = [];
    for (var i = 0; i < POOL; i++) { var d = document.createElement('i'); d.className = 'pt'; layer.appendChild(d); pts.push({ el: d, life: 0 }); }
    layer.insertAdjacentHTML('afterbegin',
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
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.65, w: r.width * 0.81 };   // the LED rocket's nozzle inside the hero tile (fins match the flyer's)
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
          x = pad.x; y = pad.y; ang = 0; sc = pad.w / (SIZE * 0.765);
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
      rk.style.transform = 'translate3d(' + (x - SIZE / 2 + jx).toFixed(1) + 'px,' + (y - SIZE * 1.18 * 0.6 + jy).toFixed(1) + 'px,0) rotate(' + ang.toFixed(2) + 'deg) scale(' + sc.toFixed(3) + ')';
      rk.style.opacity = (mode === 'away' || mode === 'pad') ? 0 : (front ? 1 : 0.72);   // on the pad, the rocket is the LED face of the tile
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
