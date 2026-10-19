(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Stadt wählen
  var cities = $$('.city');
  if (cities.length) {
    var target = $('[data-city-name]');
    cities.forEach(function (btn) {
      btn.addEventListener('click', function () {
        cities.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
        btn.setAttribute('aria-pressed', 'true');
        target.textContent = btn.querySelector('b').textContent;
      });
    });
  }

  // Filter
  var chips = $$('.chip');
  if (chips.length) {
    var count = $('[data-count]');
    var update = function () {
      var n = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; }).length;
      count.textContent = Math.max(4, 48 - n * 5);
    };
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        update();
      });
    });
    var reset = $('[data-reset]');
    if (reset) reset.addEventListener('click', function () {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); }); update();
    });
    update();
  }

  // Swipe
  var stack = $('.stack');
  if (stack) {
    var P = [
      ['Lena', 26, 'Agentur A', '2 km', 'Neu', ['Elegant', 'Brünett', 'Deutsch, Englisch'], 'p1'],
      ['Sofia', 31, 'Agentur B', '4 km', 'Top', ['Natürlich', 'Blond', 'Private Galerie'], 'p2'],
      ['Mila', 24, 'Agentur C', '6 km', 'Neu', ['Sportlich', 'Schwarz', 'Heute frei'], 'p3'],
      ['Nora', 35, 'Agentur A', '3 km', 'Duo', ['Kurvig', 'Rot', 'Private Galerie'], 'p4'],
      ['Jana', 29, 'Agentur D', '8 km', 'Top', ['Zierlich', 'Brünett', 'Verifiziert'], 'p5'],
      ['Elena', 38, 'Agentur B', '5 km', 'Neu', ['Elegant', 'Blond', 'Englisch'], 'p6']
    ];
    var i = 0, favs = 0, busy = false;
    var front = $('.card--front'), back = $('.card--back img'), hint = $('[data-hint]');
    var fill = function () {
      var p = P[i % P.length], nx = P[(i + 1) % P.length];
      $('img', front).src = '/assets/img/' + p[6] + '.webp';
      $('img', front).alt = 'Beispielprofil ' + p[0];
      $('[data-name]', front).textContent = p[0];
      $('[data-age]', front).textContent = p[1];
      $('[data-meta]', front).textContent = p[2] + ' · ' + p[3];
      $('[data-badge]', front).textContent = p[4];
      $('[data-tags]', front).innerHTML = '';
      p[5].forEach(function (t) { var s = document.createElement('span'); s.textContent = t; $('[data-tags]', front).appendChild(s); });
      back.src = '/assets/img/' + nx[6] + '.webp';
    };
    var act = function (kind) {
      if (busy) return; busy = true;
      if (kind === 'like') favs++;
      front.classList.add(kind === 'like' ? 'out-like' : 'out-nope');
      setTimeout(function () {
        i++; fill();
        front.style.transition = 'none';
        front.classList.remove('out-like', 'out-nope');
        void front.offsetWidth; front.style.transition = '';
        hint.textContent = favs ? favs + (favs === 1 ? ' Favorit gemerkt' : ' Favoriten gemerkt') : 'Tippe: ✕ weiter · ♥ merken';
        busy = false;
      }, 450);
    };
    $('[data-like]').addEventListener('click', function () { act('like'); });
    $('[data-nope]').addEventListener('click', function () { act('nope'); });
    // Wischen mit Finger/Maus
    var sx = null;
    front.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    window.addEventListener('pointerup', function (e) {
      if (sx === null) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 50) act(dx > 0 ? 'like' : 'nope');
    });
    fill();
  }

  // Private Galerie
  var gal = $('.galerie');
  if (gal) {
    $('[data-unlock]').addEventListener('click', function () {
      gal.classList.remove('locked'); gal.classList.add('unlocked');
      $('[data-status]').textContent = 'Freigeschaltet';
    });
  }
})();
