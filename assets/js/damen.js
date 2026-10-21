(function () {
  'use strict';
  function dn(n) { return n + (n === 1 ? ' Dame' : ' Damen'); }
  var DATA = JSON.parse(document.getElementById('damen-data').textContent);
  var LADIES = DATA.ladies, AGENCY = DATA.agency;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var HAIR = { blond: 'Blond', dunkelblond: 'Dunkelblond', braun: 'Braun', schwarz: 'Schwarz' };
  var AGES = { a: ['18–29', 18, 29], b: ['30–39', 30, 39], c: ['40+', 40, 99] };
  var state = { city: null, hair: null, age: null, likes: [] };

  function hairKey(h) {
    h = (h || '').toLowerCase();
    if (h.indexOf('dunkelblond') === 0) return 'dunkelblond';
    if (h.indexOf('blond') >= 0) return 'blond';
    if (h.indexOf('braun') >= 0) return 'braun';
    if (h.indexOf('schwarz') >= 0) return 'schwarz';
    return 'other';
  }
  LADIES.forEach(function (l) {
    l.hairKey = hairKey(l.facts.Haarfarbe);
    l.allLikes = [];
    l.groups.forEach(function (g) { l.allLikes = l.allLikes.concat(g[1]); });
  });

  // ---------- Umkreis-Logik ----------
  var CITY = {};
  DATA.cities.forEach(function (c) { CITY[c[0]] = { lat: c[1], lng: c[2] }; });
  function km(a, b) {
    var R = 6371, toR = Math.PI / 180;
    var dLa = (b.lat - a.lat) * toR, dLo = (b.lng - a.lng) * toR;
    var h = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  // kleinste Entfernung zwischen einer Stadt und den Standorten einer Dame
  function distTo(l, cityName) {
    var c = CITY[cityName]; if (!c) return Infinity;
    var best = Infinity;
    l.locations.forEach(function (loc) { var d = km(c, { lat: loc[1], lng: loc[2] }); if (d < best) best = d; });
    return best;
  }
  // Dame erscheint in einer Stadt, wenn die Stadt innerhalb ihres Umkreises (radiusKm) liegt
  function inCity(l, cityName) { return l.cities.indexOf(cityName) >= 0 || distTo(l, cityName) <= l.radiusKm; }

  function hasLike(l, tag) {
    return l.allLikes.some(function (x) { return x.indexOf(tag) === 0; });
  }
  function matches(l, s, skip) {
    if (skip !== 'city' && s.city && !inCity(l, s.city)) return false;
    if (skip !== 'hair' && s.hair && l.hairKey !== s.hair) return false;
    if (skip !== 'age' && s.age) { var a = AGES[s.age]; if (l.age < a[1] || l.age > a[2]) return false; }
    if (skip !== 'likes') for (var i = 0; i < s.likes.length; i++) if (!hasLike(l, s.likes[i])) return false;
    return true;
  }
  function countWith(patch, skip) {
    var s = Object.assign({}, state, patch);
    return LADIES.filter(function (l) { return matches(l, s, skip); }).length;
  }

  // ---------- Views ----------
  var views = { start: $('#view-start'), wizard: $('#view-wizard'), results: $('#view-results') };
  function show(name) {
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // ---------- Wizard ----------
  var STEPS = ['city', 'hair', 'age', 'likes'];
  var stepIdx = 0;
  var stepEls = $$('.step');
  var barItems = $$('.steps-bar li');
  var liveCount = $('#live-count');

  function renderStep() {
    stepEls.forEach(function (el, i) { el.hidden = i !== stepIdx; });
    barItems.forEach(function (li, i) { li.className = i < stepIdx ? 'done' : (i === stepIdx ? 'now' : ''); });
    // counts on tiles
    $$('[data-city]').forEach(function (b) {
      var v = b.getAttribute('data-city');
      var n = countWith({ city: v }, null);
      b.querySelector('small').textContent = n ? dn(n) : 'Bald · Start in Kürze';
      b.disabled = n === 0;
      b.setAttribute('aria-pressed', String(state.city === v));
    });
    // Städte mit Damen zuerst
    var box = $('.tiles--cities');
    $$('[data-city]').filter(function (b) { return !b.disabled; }).reverse().forEach(function (b) { box.insertBefore(b, box.firstChild); });
    $$('[data-hair]').forEach(function (b) {
      var v = b.getAttribute('data-hair') || null;
      var n = countWith({ hair: v }, null);
      b.querySelector('small').textContent = dn(n);
      b.disabled = v !== null && n === 0;
      b.setAttribute('aria-pressed', String(state.hair === v && (v !== null || state.hairChosen)));
    });
    $$('[data-age]').forEach(function (b) {
      var v = b.getAttribute('data-age') || null;
      var n = countWith({ age: v }, null);
      b.querySelector('small').textContent = dn(n);
      b.disabled = v !== null && n === 0;
      b.setAttribute('aria-pressed', String(state.age === v && (v !== null || state.ageChosen)));
    });
    $$('[data-like]').forEach(function (b) {
      var v = b.getAttribute('data-like');
      var on = state.likes.indexOf(v) >= 0;
      var n = countWith({ likes: on ? state.likes : state.likes.concat([v]) }, null);
      b.querySelector('small').textContent = n;
      b.setAttribute('aria-pressed', String(on));
      b.disabled = !on && n === 0;
    });
    var total = countWith({}, null);
    liveCount.textContent = total;
    $('#show-results-count').textContent = total;
    $('#btn-back').hidden = stepIdx === 0;
    $('#btn-next').hidden = stepIdx === STEPS.length - 1;
    $('#btn-finish').hidden = stepIdx !== STEPS.length - 1;
  }
  function go(i) { stepIdx = Math.max(0, Math.min(STEPS.length - 1, i)); renderStep(); window.scrollTo({ top: 0 }); }

  // ---------- Stadtsuche ----------
  var cInput = $('#city-input'), cList = $('#city-suggest');
  function norm(t) { return (t || '').toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss').trim(); }
  function pickCity(name) {
    state.city = name; cInput.value = ''; cList.hidden = true; cInput.setAttribute('aria-expanded', 'false');
    renderStep(); setTimeout(function () { go(1); }, 160);
  }
  function suggest() {
    var q = norm(cInput.value); cList.innerHTML = '';
    if (q.length < 2) { cList.hidden = true; cInput.setAttribute('aria-expanded', 'false'); return; }
    var hits = DATA.cities.filter(function (c) { return norm(c[0]).indexOf(q) === 0; })
      .concat(DATA.cities.filter(function (c) { return norm(c[0]).indexOf(q) > 0; })).slice(0, 8);
    if (!hits.length) {
      var li = document.createElement('li'); li.className = 'cs-empty';
      li.textContent = 'Stadt nicht gefunden. Versuch die nächste größere Stadt.'; cList.appendChild(li);
    }
    hits.forEach(function (c) {
      var n = countWith({ city: c[0] }, null);
      var li = document.createElement('li'); li.setAttribute('role', 'option');
      var b = document.createElement('button'); b.type = 'button';
      var t = document.createElement('strong'); t.textContent = c[0];
      var m = document.createElement('small'); m.textContent = n ? dn(n) + ' im Umkreis' : 'Noch keine Damen';
      if (!n) b.className = 'none';
      b.appendChild(t); b.appendChild(m);
      b.addEventListener('click', function () { pickCity(c[0]); });
      li.appendChild(b); cList.appendChild(li);
    });
    cList.hidden = false; cInput.setAttribute('aria-expanded', 'true');
  }
  cInput.addEventListener('input', suggest);
  cInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var first = cList.querySelector('button'); if (first) { e.preventDefault(); first.click(); } }
    if (e.key === 'Escape') { cList.hidden = true; cInput.setAttribute('aria-expanded', 'false'); }
  });

  $$('[data-city]').forEach(function (b) { b.addEventListener('click', function () { state.city = b.getAttribute('data-city'); renderStep(); setTimeout(function () { go(1); }, 160); }); });
  $$('[data-hair]').forEach(function (b) { b.addEventListener('click', function () { state.hair = b.getAttribute('data-hair') || null; state.hairChosen = true; renderStep(); setTimeout(function () { go(2); }, 160); }); });
  $$('[data-age]').forEach(function (b) { b.addEventListener('click', function () { state.age = b.getAttribute('data-age') || null; state.ageChosen = true; renderStep(); setTimeout(function () { go(3); }, 160); }); });
  $$('[data-like]').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-like'); var i = state.likes.indexOf(v);
      if (i >= 0) state.likes.splice(i, 1); else state.likes.push(v);
      renderStep();
    });
  });
  $('#btn-back').addEventListener('click', function () { go(stepIdx - 1); });
  $('#btn-next').addEventListener('click', function () { go(stepIdx + 1); });
  $('#btn-skip').addEventListener('click', function () {
    if (stepIdx === STEPS.length - 1) { showResults(); return; }
    go(stepIdx + 1);
  });
  $('#btn-finish').addEventListener('click', showResults);

  $('#choose-all').addEventListener('click', function () {
    state = { city: null, hair: null, age: null, likes: [] };
    showResults();
  });
  $('#choose-filter').addEventListener('click', function () {
    state = { city: null, hair: null, age: null, likes: [] };
    show('wizard'); go(0);
  });

  // ---------- Results ----------
  var cards = $$('.setcard');
  var grid = $('.cards');
  function showResults() {
    var n = 0;
    var list = cards.map(function (c) {
      var l = LADIES[+c.getAttribute('data-i')];
      var here = state.city && l.cities.indexOf(state.city) >= 0;
      var d = state.city ? (here ? 0 : distTo(l, state.city)) : 0;
      var ok = matches(l, state, null);
      c.hidden = !ok; if (ok) n++;
      var dist = c.querySelector('.setcard-dist');
      if (state.city && ok) {
        dist.hidden = false;
        dist.textContent = d < 3 ? 'In ' + state.city : Math.round(d) + ' km entfernt · kommt zu dir';
      } else dist.hidden = true;
      return { c: c, l: l, d: d, i: +c.getAttribute('data-i') };
    });
    list.sort(function (a, b) { return (a.l.pause - b.l.pause) || (a.d - b.d) || (a.i - b.i); });
    list.forEach(function (x) { grid.appendChild(x.c); });
    var near = $('#empty-near');
    near.textContent = '';
    if (!n && state.city && CITY[state.city]) {
      var best = null;
      LADIES.forEach(function (l) { var dd = distTo(l, state.city); if (!best || dd < best.d) best = { d: dd, c: l.cities[0] }; });
      if (best) near.textContent = 'Die nächsten Damen findest du in ' + best.c + ' (' + Math.round(best.d) + ' km).';
    }
    $('#result-count').textContent = n;
    $('#empty').hidden = n > 0;
    $('#result-city').textContent = state.city || 'Alle Damen';
    $('#result-pre').hidden = !state.city;
    renderActive();
    show('results');
  }
  function renderActive() {
    var box = $('#active-filters'); box.innerHTML = '';
    var add = function (label, clear) {
      var s = document.createElement('span'); s.className = 'af'; s.textContent = label;
      var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', label + ' entfernen'); x.textContent = '×';
      x.addEventListener('click', function () { clear(); showResults(); });
      s.appendChild(x); box.appendChild(s);
    };
    if (state.city) add(state.city, function () { state.city = null; });
    if (state.hair) add(HAIR[state.hair], function () { state.hair = null; });
    if (state.age) add(AGES[state.age][0] + ' Jahre', function () { state.age = null; });
    state.likes.forEach(function (t) { add(t, function () { state.likes = state.likes.filter(function (x) { return x !== t; }); }); });
    box.hidden = !box.children.length;
  }
  $('#edit-filter').addEventListener('click', function () { show('wizard'); go(0); });
  $('#reset-filter').addEventListener('click', function () { state = { city: null, hair: null, age: null, likes: [] }; showResults(); });
  $('#empty-reset').addEventListener('click', function () { state = { city: null, hair: null, age: null, likes: [] }; showResults(); });

  // ---------- Profile dialog ----------
  var dlg = $('#profile');
  var cur = null, imgIdx = 0;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function setImg(i) {
    var g = cur.gallery; imgIdx = (i + g.length) % g.length;
    var main = $('#pg-img'); main.src = DATA.imgBase + g[imgIdx].f; main.alt = cur.name + ', Bild ' + (imgIdx + 1);
    $$('#pg-thumbs button').forEach(function (b, k) { b.setAttribute('aria-current', String(k === imgIdx)); });
  }
  function openProfile(i) {
    cur = LADIES[i];
    $('#pf-name').innerHTML = '';
    $('#pf-name').appendChild(document.createTextNode(cur.name + ' '));
    $('#pf-name').appendChild(el('span', null, cur.age));
    $('#pf-sub').textContent = cur.cities.join(', ') + ' · ' + AGENCY.name + (cur.pause ? ' · derzeit pausiert' : '');
    var th = $('#pg-thumbs'); th.innerHTML = '';
    cur.gallery.forEach(function (g, k) {
      var b = el('button'); b.type = 'button'; b.setAttribute('aria-label', 'Bild ' + (k + 1));
      var im = el('img'); im.src = DATA.imgBase + g.f; im.alt = ''; im.loading = 'lazy';
      b.appendChild(im); b.addEventListener('click', function () { setImg(k); }); th.appendChild(b);
    });
    $('#pg-prev').hidden = $('#pg-next').hidden = cur.gallery.length < 2;
    setImg(0);
    var facts = $('#pf-facts'); facts.innerHTML = '';
    DATA.factKeys.forEach(function (k) {
      if (!cur.facts[k]) return;
      var d = el('div'); d.appendChild(el('dt', null, k)); d.appendChild(el('dd', null, cur.facts[k])); facts.appendChild(d);
    });
    var likes = $('#pf-likes'); likes.innerHTML = '';
    cur.groups.forEach(function (g) {
      if (!g[1].length) return;
      var box = el('div', 'likes'); box.appendChild(el('h3', null, g[0]));
      var ul = el('ul');
      g[1].forEach(function (x) {
        var li = el('li', null, x);
        if (state.likes.some(function (t) { return x.indexOf(t) === 0; })) li.className = 'hit';
        ul.appendChild(li);
      });
      box.appendChild(ul); likes.appendChild(box);
    });
    $('#pf-agency').textContent = AGENCY.name;
    $('#pf-wa').href = AGENCY.whatsapp;
    $('#pf-tel').href = 'tel:' + AGENCY.phoneIntl;
    $('#pf-phone').textContent = AGENCY.phone;
    $('#pf-link').href = AGENCY.profileBase + cur.slug + '/';
    $('#pf-link').textContent = 'Profil bei ' + AGENCY.name;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    try { history.replaceState(null, '', '#' + cur.slug); } catch (e) {}
  }
  function closeProfile() {
    if (dlg.open) dlg.close();
  }
  dlg.addEventListener('close', function () { try { history.replaceState(null, '', location.pathname); } catch (e) {} });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeProfile(); });
  $('#pf-close').addEventListener('click', closeProfile);
  $('#pg-prev').addEventListener('click', function () { setImg(imgIdx - 1); });
  $('#pg-next').addEventListener('click', function () { setImg(imgIdx + 1); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') setImg(imgIdx - 1);
    if (e.key === 'ArrowRight') setImg(imgIdx + 1);
  });
  cards.forEach(function (c) {
    c.addEventListener('click', function (e) { e.preventDefault(); openProfile(+c.getAttribute('data-i')); });
  });

  // ---------- Start ----------
  var hash = (location.hash || '').slice(1);
  var deep = LADIES.findIndex(function (l) { return l.slug === hash; });
  if (hash === 'alle' || deep >= 0) { showResults(); if (deep >= 0) openProfile(deep); }
  else show('start');
})();
