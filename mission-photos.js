/* impossible jobs · mission photos
   Adds the slide-1 photo of a mission (field "photo" in missions.js) behind the top of its
   holographic mission file, plus a soft blurred glow of the same photo behind the card.
   Missions without a photo are left exactly as they were. Loaded by missions.js. */
(function () {
  function start() {
    var card = document.getElementById('holoCard'), holo = document.getElementById('holo');
    if (!card || !holo) return;
    var byNum = {};
    (window.MISSIONS || []).forEach(function (m) { if (m.photo) byNum[m.num] = m; });

    // warm the cache for the newest photos so the first open is instant
    Object.keys(byNum).sort().reverse().slice(0, 4).forEach(function (n) { var i = new Image(); i.src = byNum[n].photo; });

    function apply() {
      card.classList.remove('has-photo');
      holo.classList.remove('has-photo');
      var id = card.querySelector('.hc-top .id'), inner = card.querySelector('.hc-in');
      if (!id || !inner) return;
      var num = (id.textContent.match(/\d{3}/) || [])[0], m = byNum[num];
      if (!m) return;
      if (!inner.querySelector('.hc-photo')) {
        var d = document.createElement('div');
        d.className = 'hc-photo';
        d.setAttribute('aria-hidden', 'true');
        d.style.backgroundImage = 'url("' + m.photo + '")';
        if (m.photo_focus) d.style.backgroundPosition = m.photo_focus;
        inner.insertBefore(d, inner.firstChild);
      }
      card.classList.add('has-photo');
      holo.style.setProperty('--mphoto', 'url("' + m.photo + '")');
      holo.classList.add('has-photo');
    }
    new MutationObserver(apply).observe(card, { childList: true });
    apply();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
