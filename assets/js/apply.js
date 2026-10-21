(function () {
  'use strict';
  var MAX_IMAGES = 5, MAX_SIDE = 1400, QUALITY = 0.8;

  // Tabs Agentur / einzelne Dame
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.apply-tabs [role="tab"]'));
  function select(name) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', String(on));
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { select(t.getAttribute('data-tab')); }); });
  if (location.hash === '#bewerben-dame') select('dame');

  // Bilder verkleinern (Canvas -> JPEG)
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve({ name: file.name.replace(/\.[^.]+$/, '') + '.jpg', data: c.toDataURL('image/jpeg', QUALITY) });
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Bild konnte nicht gelesen werden: ' + file.name)); };
      img.src = url;
    });
  }

  document.querySelectorAll('form[data-apply]').forEach(function (form) {
    var status = form.querySelector('.apply-status');
    var btn = form.querySelector('.apply-submit');
    var fileInput = form.querySelector('input[type=file]');
    var thumbs = form.querySelector('[data-thumbs]');
    var images = [];

    if (fileInput) fileInput.addEventListener('change', function () {
      var files = Array.prototype.slice.call(fileInput.files || []).slice(0, MAX_IMAGES);
      thumbs.innerHTML = ''; images = [];
      status.className = 'apply-status full'; status.textContent = files.length ? 'Bilder werden vorbereitet …' : '';
      Promise.all(files.map(shrink)).then(function (res) {
        images = res;
        res.forEach(function (r) { var i = document.createElement('img'); i.src = r.data; i.alt = ''; thumbs.appendChild(i); });
        status.textContent = res.length ? res.length + ' Bild(er) bereit.' : '';
        if ((fileInput.files || []).length > MAX_IMAGES) status.textContent += ' Maximal ' + MAX_IMAGES + ' Bilder.';
      }).catch(function (e) { status.className = 'apply-status err full'; status.textContent = e.message; });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      form.querySelectorAll('.field').forEach(function (f) { f.removeAttribute('aria-invalid'); });
      if (!form.checkValidity()) {
        var bad = form.querySelector(':invalid');
        if (bad) {
          if (bad.closest('details')) bad.closest('details').open = true;
          bad.setAttribute('aria-invalid', 'true'); bad.focus();
        }
        status.className = 'apply-status err full';
        status.textContent = 'Bitte füllen Sie alle Pflichtfelder (*) korrekt aus.';
        return;
      }
      var data = { typ: form.getAttribute('data-apply') };
      new FormData(form).forEach(function (v, k) { if (k !== 'bilder') data[k] = typeof v === 'string' ? v.trim() : v; });
      data.bilder = images;
      btn.disabled = true; status.className = 'apply-status full'; status.textContent = 'Wird gesendet …';
      fetch('/api/bewerbung', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.j.error || 'Senden fehlgeschlagen.');
          form.reset(); images = []; if (thumbs) thumbs.innerHTML = '';
          status.className = 'apply-status ok full';
          status.textContent = 'Danke! Ihre Bewerbung ist bei uns eingegangen. Wir melden uns in Kürze.';
        })
        .catch(function (e) {
          status.className = 'apply-status err full';
          status.textContent = e.message + ' Alternativ per E-Mail an kontakt@globalescort.de.';
        })
        .then(function () { btn.disabled = false; });
    });
  });
})();
