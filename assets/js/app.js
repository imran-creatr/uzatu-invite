/* Қыз ұзату — Арайлым · 14.11.2026 */
(function () {
  'use strict';

  /* Куда уходят ответы RSVP — веб-приложение Apps Script.
     Пустая строка = отправка выключена, ответ остаётся только в localStorage. */
  var RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbygbL7GDPZeFuQ-qQNjzfcgLyFG0eoHpcEuf4Sw0Q2YL4WNYCLY9AJMViFCepYg0v4J/exec';

  var PENDING_KEY = 'uzatu-rsvp-pending';

  var EVENT   = new Date(2026, 10, 14, 0, 0, 0);   // 14 Nov 2026, local time
  var EASE    = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  var reduced = window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function observe(el, onEnter, opts) {
    if (!('IntersectionObserver' in window)) { onEnter(); return null; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        onEnter();
        io.unobserve(e.target);
      });
    }, opts || { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return io;
  }

  /* ══ November 2026 calendar ═══════════════════════════════════════════════
     Nov 1 2026 falls on a Sunday and the grid starts on Monday, so six blank
     cells lead the month. The 14th carries a heart that inks itself in.     */
  function buildCalendar() {
    var grid = document.getElementById('calGrid');
    if (!grid) return;

    var heart =
      '<svg class="cal__heart" viewBox="0 0 100 84" aria-hidden="true">' +
      '<path d="M50 78 C24 59 5 44 5 27 C5 13 16 4 27 4 C38 4 46 11 50 19 ' +
      'C54 11 62 4 73 4 C84 4 95 13 95 27 C95 44 76 59 50 78 Z" ' +
      'fill="none" stroke="#201f1d" stroke-width="2.4" ' +
      'stroke-linejoin="round" stroke-linecap="round"/></svg>';

    var lead = (new Date(2026, 10, 1).getDay() + 6) % 7;   // blanks before day 1
    var days = new Date(2026, 11, 0).getDate();            // days in November
    var html = '';

    for (var i = 0; i < lead; i++) {
      html += '<div class="cal__cell" aria-hidden="true"></div>';
    }
    for (var d = 1; d <= days; d++) {
      var isDay = d === EVENT.getDate();
      html += '<div class="cal__cell"' +
              (isDay ? ' aria-label="14 қараша — той күні"' : '') + '>' +
              (isDay ? heart : '') + '<span>' + d + '</span></div>';
    }
    grid.insertAdjacentHTML('beforeend', html);

    // give the heart's outline its true length so the draw-in is exact
    var path = grid.querySelector('.cal__heart path');
    if (path && path.getTotalLength) {
      path.style.setProperty('--len', path.getTotalLength().toFixed(1));
    }

    // stagger the sweep diagonally: later columns and rows arrive later
    var cells = grid.children;
    for (var c = 0; c < cells.length; c++) {
      var col = c % 7, row = Math.floor(c / 7);
      cells[c].style.setProperty('--d', (col * 26 + row * 55) + 'ms');
    }

    if (reduced) { grid.classList.add('is-in'); return; }
    observe(grid, function () { grid.classList.add('is-in'); },
            { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
  }

  /* ══ countdown — a real flip clock ════════════════════════════════════════
     Each digit is four stacked halves: two static faces plus two hinged
     leaves. On a change the front leaf folds down over the seam while the
     back leaf swings up behind it, so the new glyph is revealed the way a
     split-flap board does it.                                              */
  var UNITS = ['КҮН', 'САҒАТ', 'МИНУТ', 'СЕКУНД'];

  function split(left) {
    return [
      Math.floor(left / 86400),
      Math.floor((left % 86400) / 3600),
      Math.floor((left % 3600) / 60),
      left % 60
    ];
  }

  function makeFlip(initial) {
    var el = document.createElement('div');
    el.className = 'flip';
    el.innerHTML =
      '<div class="flip__face flip__face--top"><b></b></div>' +
      '<div class="flip__face flip__face--bottom"><b></b></div>' +
      '<div class="flip__leaf flip__leaf--front"><b></b></div>' +
      '<div class="flip__leaf flip__leaf--back"><b></b></div>';

    var q = function (s) { return el.querySelector(s); };
    var faceTop  = q('.flip__face--top b');
    var faceBot  = q('.flip__face--bottom b');
    var leafFront = q('.flip__leaf--front b');
    var leafBack  = q('.flip__leaf--back b');

    var current = initial;
    [faceTop, faceBot, leafFront, leafBack].forEach(function (b) { b.textContent = current; });

    var timer = null;

    el.setDigit = function (next, animate) {
      if (next === current) return;

      if (!animate) {
        current = next;
        [faceTop, faceBot, leafFront, leafBack].forEach(function (b) { b.textContent = next; });
        return;
      }

      // top face already shows the new glyph — the folding leaf hides it
      faceTop.textContent   = next;
      faceBot.textContent   = current;
      leafFront.textContent = current;
      leafBack.textContent  = next;

      el.classList.remove('is-flipping');
      void el.offsetWidth;                       // restart the animation
      el.classList.add('is-flipping');

      current = next;
      clearTimeout(timer);
      timer = setTimeout(function () {
        el.classList.remove('is-flipping');
        faceBot.textContent   = next;            // settle both static faces
        leafFront.textContent = next;
      }, 660);
    };

    return el;
  }

  function buildCountdown() {
    var row = document.getElementById('countRow');
    if (!row) return null;

    var start = split(Math.max(0, Math.floor((EVENT.getTime() - Date.now()) / 1000)));
    var units = [];

    UNITS.forEach(function (title, u) {
      var box = document.createElement('div');
      box.className = 'count__unit';

      var pair = document.createElement('div');
      pair.className = 'count__digits';

      // two cards is the design, but never drop a digit if days run past 99
      var text  = String(start[u]);
      var width = Math.max(2, text.length);
      var flips = [];
      String(start[u]).padStart(width, '0').split('').forEach(function (ch) {
        var f = makeFlip(ch);
        pair.appendChild(f);
        flips.push(f);
      });

      var label = document.createElement('span');
      label.className = 'count__label';
      label.textContent = title;

      box.appendChild(pair);
      box.appendChild(label);
      row.appendChild(box);
      units.push({ box: box, pair: pair, flips: flips, width: width, last: start[u] });
    });

    var live = false;                    // no flips until the clock is on screen
    var tickTimer = null;

    function tick() {
      var left = Math.max(0, Math.floor((EVENT.getTime() - Date.now()) / 1000));
      split(left).forEach(function (value, u) {
        var unit = units[u];
        if (value === unit.last && live) return;

        var text = String(value).padStart(unit.width, '0').slice(-unit.width);
        for (var i = 0; i < unit.flips.length; i++) {
          unit.flips[i].setDigit(text[i], live && !reduced);
        }

        // the unit bob is reserved for the rarer rollovers; seconds turn
        // over constantly and would make the whole block twitch
        if (live && !reduced && u < 3 && value !== unit.last) {
          unit.box.classList.remove('is-ticking');
          void unit.box.offsetWidth;
          unit.box.classList.add('is-ticking');
        }
        unit.last = value;
      });
    }

    tick();
    observe(row, function () { live = true; }, { threshold: 0.3 });
    tickTimer = setInterval(tick, 1000);
    return tickTimer;
  }

  /* ══ hero: play muted inline, then hold the last frame ════════════════════ */
  function setupHero() {
    var hero = document.querySelector('.hero');
    var v    = document.getElementById('heroVideo');
    if (hero) requestAnimationFrame(function () { hero.classList.add('is-in'); });
    if (!v) return;

    v.muted = true;
    v.playsInline = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* autoplay refused — first frame stays */ });

    v.addEventListener('ended', function () {
      try {
        v.pause();
        if (isFinite(v.duration)) v.currentTime = Math.max(0, v.duration - 0.05);
      } catch (e) { /* ignore */ }
    });
  }

  /* ══ scroll reveal ════════════════════════════════════════════════════════
     Elements are tagged, then flipped on as they enter. A scroll sweep and
     two timeouts guarantee nothing is ever left invisible.                 */
  function setupReveal() {
    var root = document.getElementById('page');
    if (!root) return;

    var targets = [];
    Array.prototype.slice.call(root.children).forEach(function (section, si) {
      if (si === 0) return;                          // hero has its own entrance
      Array.prototype.slice.call(section.children).forEach(function (el) {
        if (el.hasAttribute('hidden')) return;       // leave the thank-you alone
        targets.push(el);
      });
    });

    if (reduced || !('IntersectionObserver' in window)) return;

    // delay resets per section so no element ever waits on a long queue
    var perSection = 0, lastParent = null;
    targets.forEach(function (el) {
      if (el.parentNode !== lastParent) { lastParent = el.parentNode; perSection = 0; }
      el.classList.add('reveal');
      el.style.setProperty('--d', Math.min(perSection * 85, 510) + 'ms');
      perSection++;
    });

    var show = function (el) {
      if (el.classList.contains('is-in')) return;
      el.classList.add('is-in');
    };

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        show(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { io.observe(el); });

    var sweep = function () {
      targets.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.95 && r.bottom > 0) show(el);
      });
    };
    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep);
    setTimeout(sweep, 1200);
    setTimeout(function () { targets.forEach(show); }, 3000);
  }

  /* ══ RSVP ═════════════════════════════════════════════════════════════════
     The answer is posted to an Apps Script web app. No Content-Type header is
     set on purpose — fetch then labels a string body text/plain itself, which
     keeps this a "simple" request. Naming a type would trigger a CORS
     preflight, and Apps Script does not answer OPTIONS.                     */

  function readPending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY)) || []; }
    catch (e) { return []; }
  }
  function writePending(list) {
    try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)); } catch (e) { /* private mode */ }
  }

  function postAnswer(payload) {
    if (!RSVP_ENDPOINT) return Promise.reject(new Error('endpoint-not-configured'));
    return fetch(RSVP_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(payload)     // no headers — see the note above
    }).then(function (r) {
      if (!r.ok) throw new Error('http-' + r.status);
      return r.text();
    }).then(function (text) {
      var res = {};
      try { res = JSON.parse(text); } catch (e) { /* non-JSON body counts as sent */ }
      if (res && res.ok === false) throw new Error(res.error || 'rejected');
      return res;
    });
  }

  /* anything that failed earlier is retried quietly on the next visit */
  function flushPending() {
    if (!RSVP_ENDPOINT) return;
    var queue = readPending();
    if (!queue.length) return;

    var next = function (i) {
      if (i >= queue.length) { writePending([]); return; }
      postAnswer(queue[i])
        .then(function () { next(i + 1); })
        .catch(function () { writePending(queue.slice(i)); });   // stop, keep the rest
    };
    next(0);
  }

  function setupRsvp() {
    var form   = document.getElementById('rsvpForm');
    var thanks = document.getElementById('rsvpThanks');
    var errBox = document.getElementById('rsvpError');
    var name   = document.getElementById('rsvpName');
    if (!form || !thanks) return;

    var button    = form.querySelector('button[type="submit"]');
    var idleLabel = button.textContent;

    var shake = function (el) {
      el.classList.remove('is-shaking');
      void el.offsetWidth;
      el.classList.add('is-shaking');
      setTimeout(function () { el.classList.remove('is-shaking'); }, 500);
    };

    var fail = function (msg) {
      errBox.textContent = msg;
      errBox.hidden = false;
      button.disabled = false;
      button.textContent = idleLabel;
    };

    var succeed = function () {
      errBox.hidden = true;
      var reveal = function () { form.hidden = true; thanks.hidden = false; };
      if (reduced) { reveal(); return; }
      form.classList.add('is-leaving');
      setTimeout(reveal, 340);
    };

    name.addEventListener('input', function () { name.removeAttribute('aria-invalid'); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (button.disabled) return;

      if (!name.value.trim()) {
        name.setAttribute('aria-invalid', 'true');
        shake(name.closest('.field'));
        name.focus();
        return;
      }
      name.removeAttribute('aria-invalid');

      var picked = form.querySelector('input[name="attend"]:checked');
      if (!picked) {
        shake(form.querySelector('.choices'));
        form.querySelector('.choice__input').focus();
        return;
      }

      var payload = {
        name:   name.value.trim().slice(0, 200),
        answer: picked.value
      };

      // a local copy survives even if the network never cooperates
      try {
        localStorage.setItem('uzatu-rsvp', JSON.stringify({
          name: payload.name, answer: payload.answer, at: new Date().toISOString()
        }));
      } catch (err) { /* ignore */ }

      if (!RSVP_ENDPOINT) { succeed(); return; }   // not wired up yet

      errBox.hidden = true;
      button.disabled = true;
      button.textContent = 'Жіберілуде…';

      postAnswer(payload)
        .then(succeed)
        .catch(function () {
          // keep it for the next visit, and let the guest know it did not land
          var queue = readPending();
          queue.push(payload);
          writePending(queue);
          fail('Жауабыңыз жіберілмеді. Байланысты тексеріп, қайта жіберіп көріңіз.');
        });
    });
  }

  /* ══ boot ═════════════════════════════════════════════════════════════════ */
  buildCalendar();
  var timer = buildCountdown();
  setupHero();
  setupRsvp();
  flushPending();
  requestAnimationFrame(setupReveal);

  window.addEventListener('pagehide', function () { if (timer) clearInterval(timer); });
})();
