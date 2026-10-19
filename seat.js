/* impossible jobs — seat.js: the boarding list ("claim your seat").
   One component used on the home page, the job board and the drift. Provider-agnostic: fill IJ_LIST below with the
   list service's form endpoint and field names, and every form on the site starts posting to it.
   Until then (action empty) a seat is noted on the visitor's device only, and the form says so honestly.

   Kit:        action 'https://app.kit.com/forms/FORM_ID/subscriptions', email 'email_address', extra via 'fields[mission]'
   beehiiv:    action from the embed form, email 'email'
   Buttondown: action 'https://buttondown.com/api/emails/embed-subscribe/USERNAME', email 'email', extra 'tag'

   Anonymity: nothing a person typed in the drift is ever sent. Only the email, and only with a tick, the mission they
   chose or their drift heading as a plain tag. */
window.IJ_LIST = window.IJ_LIST || { enabled: false, action: '', emailField: 'email', tagField: 'tag', extra: {} };   // enabled: false = no form anywhere on the site (18 Oct: not for now)

(function () {
  'use strict';
  var cfg = window.IJ_LIST, KEY = 'ij-seat';
  function saved() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function remember(tag) { try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), tag: tag || '' })); } catch (e) {} document.dispatchEvent(new CustomEvent('ij:seat', { detail: tag })); }

  // <form class="seat" data-tag="mission-003" data-context="board|drift|home">
  function build(form) {
    var tag = form.getAttribute('data-tag') || '', ctx = form.getAttribute('data-context') || 'home';
    var withTag = form.hasAttribute('data-ask-tag');   // the drift: attach the heading only if ticked
    form.setAttribute('novalidate', ''); form.setAttribute('method', 'post'); form.setAttribute('action', cfg.action || '#');
    form.innerHTML =
      '<label class="seat-lbl" for="' + form.id + '-email">' + (form.getAttribute('data-label') || 'your email') + '</label>' +
      '<div class="seat-row"><input id="' + form.id + '-email" class="seat-in" type="email" name="' + cfg.emailField + '" required autocomplete="email" inputmode="email" placeholder="you@somewhere.earth">' +
      '<button class="seat-go" type="submit">' + (form.getAttribute('data-button') || 'claim my seat') + '</button></div>' +
      (withTag ? '<label class="seat-tick"><input type="checkbox" name="ij_attach" value="1"> attach my drift heading to this seat (your answers stay on this phone)</label>' : '') +
      '<p class="seat-fine">' + (form.getAttribute('data-fine') || 'one email when your seat matters. no newsletter unless you ask. unsubscribe any time.') + '</p>' +
      '<p class="seat-done" hidden></p>';
    var done = form.querySelector('.seat-done'), inp = form.querySelector('.seat-in'), btn = form.querySelector('.seat-go');
    var prev = saved();
    if (prev && ctx !== 'drift') { form.classList.add('held'); done.hidden = false; done.textContent = 'seat held on this device' + (prev.tag ? ' · ' + prev.tag : '') + '. add another email any time.'; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!inp.checkValidity()) { inp.focus(); inp.classList.add('bad'); return; }
      var t = tag;
      if (withTag) { var tick = form.querySelector('[name="ij_attach"]'); if (tick && tick.checked && window.IJ_DRIFT_HEADING) t = 'heading-' + String(window.IJ_DRIFT_HEADING).toLowerCase().replace(/[^a-z0-9]+/g, '-'); else t = 'drift'; }
      btn.disabled = true; btn.textContent = '…';
      var finish = function (sent) {
        remember(t); form.classList.add('held'); done.hidden = false;
        done.textContent = sent ? 'seat requested. check your inbox and confirm, and it\u2019s yours.' : 'seat noted on this device. the boarding list opens soon; we\u2019ll ask again then.';
        btn.textContent = 'held'; inp.value = '';
      };
      if (!cfg.action) { setTimeout(function () { finish(false); }, 400); return; }
      var fd = new FormData(); fd.append(cfg.emailField, inp.value.trim());
      if (t && cfg.tagField) fd.append(cfg.tagField, t);
      Object.keys(cfg.extra || {}).forEach(function (k) { fd.append(k, cfg.extra[k]); });
      fetch(cfg.action, { method: 'POST', body: fd, mode: 'no-cors' }).then(function () { finish(true); }).catch(function () { finish(true); });
    });
  }
  function init() {
    if (!cfg.enabled) { document.documentElement.classList.add('no-seat'); return; }   // switched off: forms stay hidden, 'apply now' stays
    Array.prototype.forEach.call(document.querySelectorAll('form.seat'), function (f, i) { if (!f.id) f.id = 'seat' + i; build(f); });
  }
  window.IJSeat = { held: saved, remember: remember, build: function (f) { if (!cfg.enabled) return; if (!f.id) f.id = 'seat' + Math.random().toString(36).slice(2, 7); if (!f.getAttribute('data-built')) { build(f); f.setAttribute('data-built', '1'); } } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
