(function () {
  'use strict';
  var CONTACT_EMAIL = 'kontakt@globalescort.de';

  // Altershinweis (18+)
  var gate = document.getElementById('agegate');
  if (gate) {
    var ok = false;
    try { ok = localStorage.getItem('ge-age-ok') === '1'; } catch (e) {}
    if (!ok) { gate.classList.add('show'); document.documentElement.style.overflow = 'hidden'; }
    var yes = gate.querySelector('[data-age-yes]');
    if (yes) yes.addEventListener('click', function () {
      try { localStorage.setItem('ge-age-ok', '1'); } catch (e) {}
      gate.classList.remove('show'); document.documentElement.style.overflow = '';
    });
  }

  // Preisrechner
  var calc = document.querySelector('[data-calc]');
  if (calc) {
    var MIN = 10, MAX = 60, PRICE = 99;
    var n = 15;
    var range = calc.querySelector('input[type=range]');
    var outN = calc.querySelectorAll('[data-calc-n]');
    var outTotal = calc.querySelector('[data-calc-total]');
    var fmt = new Intl.NumberFormat('de-DE');
    var render = function () {
      outN.forEach(function (el) { el.textContent = n; });
      outTotal.textContent = fmt.format(n * PRICE) + ' €';
      range.value = n;
    };
    var set = function (v) { n = Math.min(MAX, Math.max(MIN, v)); render(); };
    calc.querySelector('[data-calc-dec]').addEventListener('click', function () { set(n - 1); });
    calc.querySelector('[data-calc-inc]').addEventListener('click', function () { set(n + 1); });
    range.addEventListener('input', function () { set(parseInt(range.value, 10) || MIN); });
    render();
  }

  // Formulare: öffnen eine vorbereitete E-Mail (bis ein Formular-Backend angebunden ist)
  document.querySelectorAll('form[data-mail]').forEach(function (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      var lines = [];
      form.querySelectorAll('input, textarea, select').forEach(function (el) {
        if (el.name && el.value) lines.push(el.name + ': ' + el.value);
      });
      var subject = form.getAttribute('data-mail');
      window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));
      form.classList.add('sent');
    });
  });

  var y = document.querySelectorAll('[data-year]');
  y.forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
