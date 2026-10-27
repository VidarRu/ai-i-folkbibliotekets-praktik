/* AI i folkbibliotekets praktik – interaktion
   Startsidan med lösenord, utfällning, scrollanimationer och videospelare.
   Lösenordet är en enkel spärr för besökare – inget riktigt skydd, eftersom
   sidan och materialet ligger öppet på GitHub. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Tema ─────────────────────────────────────────────────────── */
  var toggle = document.querySelector('.theme-toggle');
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* privat läge */ }
    });
  }

  /* ── Ord-för-ord-animation i delarnas rubriker ──────────────────── */
  document.querySelectorAll('.part-title').forEach(function (title) {
    var i = 0;
    (function wrap(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var span = document.createElement('span');
            span.className = 'w';
            span.style.setProperty('--i', i++);
            span.textContent = part;
            frag.appendChild(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          wrap(child);
        }
      });
    })(title);
  });

  document.querySelectorAll('.stagger').forEach(function (el) {
    Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty('--i', Math.min(i, 10)); });
  });
  document.querySelectorAll('.flow, .bars, .bookshelf').forEach(function (el) {
    el.querySelectorAll(':scope > li, :scope > .bar, :scope > .book').forEach(function (c, i) { c.style.setProperty('--i', i); });
  });

  /* ── Scrollanimationer (startas först när startsidan är passerad) ─ */
  var revealSel = '[data-reveal], .stagger, .part-head, .flow, .bars, .bookshelf, .timeline, [data-count]';
  function startReveals() {
    var revealEls = document.querySelectorAll(revealSel);
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add('in');
          if (e.target.hasAttribute('data-count')) countUp(e.target);
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    }
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var start = null, dur = 1400;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0' + suffix;
    requestAnimationFrame(step);
  }

  /* ── Utfällbara rutor ──────────────────────────────────────────── */
  function setOpen(acc, open) {
    var btn = acc.querySelector(':scope > .acc-btn');
    acc.classList.toggle('open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  document.querySelectorAll('.acc').forEach(function (acc) {
    var btn = acc.querySelector(':scope > .acc-btn');
    if (!btn) return;
    setOpen(acc, acc.hasAttribute('data-open'));
    btn.addEventListener('click', function () {
      var opening = !acc.classList.contains('open');
      var grid = acc.parentElement && acc.parentElement.classList.contains('acc-grid') ? acc.parentElement : null;
      // I ett rutnät är en ruta öppen åt gången; den öppnade brer ut sig över hela raden
      if (grid && opening) {
        Array.prototype.forEach.call(grid.children, function (sib) { if (sib !== acc && sib.classList.contains('open')) setOpen(sib, false); });
      }
      if (grid && opening) {
        var content = acc.querySelector('.acc-content');
        if (content) content.classList.toggle('cols', content.textContent.trim().length > 650);
      }
      setOpen(acc, opening);
      if (grid && opening) {
        requestAnimationFrame(function () {
          var r = acc.getBoundingClientRect();
          var navH = 80;
          if (r.top < navH || r.top > window.innerHeight * 0.7) {
            window.scrollBy({ top: r.top - navH - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
          }
        });
      }
    });
  });

  function openAndScroll(id) {
    var acc = document.getElementById(id);
    if (!acc || !acc.classList.contains('acc')) return false;
    setOpen(acc, true);
    acc.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    return true;
  }
  document.querySelectorAll('tr[data-open]').forEach(function (tr) {
    tr.addEventListener('click', function () { openAndScroll(tr.getAttribute('data-open')); });
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (id && openAndScroll(id)) e.preventDefault();
  });
  if (location.hash) openAndScroll(location.hash.slice(1));

  /* ── Meny: aktiv del, förlopp och skuggning ───────────────────── */
  var nav = document.querySelector('.topnav');
  var progress = document.querySelector('.progress');
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.navlinks a'));
  var parts = navLinks.map(function (a) { return document.querySelector(a.getAttribute('href')); }).filter(Boolean);
  var shelves = Array.prototype.slice.call(document.querySelectorAll('.shelf-bg'));
  var ticking = false;

  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);

    var current = null;
    var probe = y + window.innerHeight * 0.3;
    parts.forEach(function (p) { if (p.offsetTop <= probe) current = p; });
    navLinks.forEach(function (a) {
      var on = current && a.getAttribute('href') === '#' + current.id;
      a.classList.toggle('active', !!on);
      if (on && a.scrollIntoView && nav && window.innerWidth < 820) {
        var box = a.parentNode;
        var left = a.offsetLeft - box.clientWidth / 2 + a.clientWidth / 2;
        if (Math.abs(box.scrollLeft - left) > 40) box.scrollTo({ left: left, behavior: 'smooth' });
      }
    });

    if (!reduceMotion) {
      var vh = window.innerHeight;
      shelves.forEach(function (s) {
        var r = s.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var center = (r.top + r.height / 2 - vh / 2) / vh;
        s.style.setProperty('--py', (center * -60).toFixed(1) + 'px');
      });
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ── Böckerna i hero följer muspekaren lite ────────────────────── */
  var shelf = document.querySelector('.bookshelf');
  if (shelf && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    shelf.addEventListener('pointermove', function (e) {
      var r = shelf.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      shelf.style.perspectiveOrigin = (50 + x * 40) + '% 40%';
    });
  }

  /* ── Affischer i större format ─────────────────────────────────── */
  var box = document.getElementById('lightbox');
  if (box && typeof box.showModal === 'function') {
    var img = box.querySelector('img');
    var pdf = box.querySelector('[data-lb-pdf]');
    var jpg = box.querySelector('[data-lb-jpg]');
    document.querySelectorAll('[data-lightbox]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        img.src = btn.getAttribute('data-full');
        img.alt = btn.getAttribute('data-title') || '';
        pdf.href = btn.getAttribute('data-pdf');
        jpg.href = btn.getAttribute('data-full');
        box.showModal();
      });
    });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.hasAttribute('data-lb-close')) box.close(); });
  }

  /* ── YouTube: laddas först när man klickar ─────────────────────── */
  document.querySelectorAll('.video[data-yt]').forEach(function (v) {
    var btn = v.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var id = v.getAttribute('data-yt');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = btn.getAttribute('aria-label') || 'Video';
      f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      f.allowFullscreen = true;
      v.replaceChild(f, btn);
    });
  });

  /* ── Startsida med lösenord ────────────────────────────────────── */
  var GATE_HASH = 'd55beaabcb5bffd94034be5d3eb1223dc3f27d10f0935bd654f09aadda3fcdc5';
  var GATE_KEY = 'aifp-gate';
  var gate = document.getElementById('gate');

  function sha256(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    return Promise.resolve(null);
  }

  /* Musik på startsidan. Webbläsare tillåter inte ljud innan besökaren
     har klickat eller skrivit något, så musiken startar vid första
     interaktionen om den inte får spela direkt. */
  var audio = document.getElementById('gate-audio');
  var soundBtn = gate && gate.querySelector('.gate-sound');
  var SOUND_KEY = 'aifp-sound';
  var musicWanted = true;
  try { musicWanted = localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { /* privat läge */ }
  var fadeTimer = null;

  function fadeTo(target, ms, done) {
    if (!audio) return;
    clearInterval(fadeTimer);
    var from = audio.volume, steps = Math.max(1, Math.round(ms / 50)), n = 0;
    fadeTimer = setInterval(function () {
      n++;
      audio.volume = Math.max(0, Math.min(1, from + (target - from) * (n / steps)));
      if (n >= steps) { clearInterval(fadeTimer); if (done) done(); }
    }, 50);
  }
  function setSoundUi(on) {
    if (!soundBtn) return;
    soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', on ? 'Stäng av musiken' : 'Slå på musiken');
  }
  function startMusic() {
    if (!audio || !musicWanted || !audio.paused) return;
    audio.volume = 0;
    var p = audio.play();
    if (p && p.then) p.then(function () { fadeTo(0.5, 2500); }).catch(function () { /* väntar på klick */ });
  }
  function stopMusic(ms) {
    if (!audio || audio.paused) return;
    fadeTo(0, ms, function () { audio.pause(); });
  }
  if (soundBtn) {
    setSoundUi(musicWanted);
    soundBtn.addEventListener('click', function () {
      musicWanted = !musicWanted;
      try { localStorage.setItem(SOUND_KEY, musicWanted ? 'on' : 'off'); } catch (e) { /* privat läge */ }
      setSoundUi(musicWanted);
      if (musicWanted) startMusic(); else stopMusic(600);
    });
  }

  function enterSite(instant) {
    if (gate && !instant && !reduceMotion) gate.classList.add('leaving');
    root.classList.add('unlocked');
    stopMusic(2500);
    if (gate) {
      if (instant || reduceMotion) { gate.style.display = 'none'; }
      else {
        gate.classList.add('leaving');
        // Låt musiken tona ut innan startsidan tas bort
        setTimeout(function () { gate.style.display = 'none'; }, 900);
        setTimeout(function () { if (audio) audio.pause(); gate.remove(); }, 2700);
      }
    }
    onScroll();
    startReveals();
  }

  function runLoader(done) {
    var log = gate.querySelector('.gate-log');
    var pct = gate.querySelector('.gate-pct');
    var bar = gate.querySelector('.gate-bar span');
    var lines = [
      '> startar kunskapsbanken …',
      '> laddar del 1: generativ AI',
      '> laddar del 2: informationssökning',
      '> laddar del 3: informationshantering',
      '> sorterar affischer och presentationer',
      '> kontrollerar källorna … ok',
      '> klart.'
    ];
    if (reduceMotion) {
      log.textContent = lines.join('\n');
      pct.textContent = '100%'; bar.style.transform = 'scaleX(1)';
      done(); return;
    }
    var dur = 2600, start = null, shown = 0;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      // lite ryckig kurva så att det känns som en riktig laddning
      var eased = p < 1 ? Math.min(0.99, p + Math.sin(p * 9) * 0.03) : 1;
      var v = Math.max(0, Math.round(eased * 100));
      pct.textContent = v + '%';
      bar.style.transform = 'scaleX(' + (v / 100) + ')';
      var want = Math.min(lines.length, Math.floor(p * lines.length) + 1);
      while (shown < want) { log.textContent += (shown ? '\n' : '') + lines[shown]; shown++; }
      if (p < 1) requestAnimationFrame(step); else setTimeout(done, 350);
    }
    requestAnimationFrame(step);
  }

  if (root.classList.contains('unlocked') || !gate) {
    enterSite(true);
  } else {
    var form = gate.querySelector('form');
    var input = gate.querySelector('input');
    var error = gate.querySelector('.gate-error');
    startMusic();
    var firstTouch = function (e) {
      if (soundBtn && soundBtn.contains(e.target)) return;
      startMusic();
    };
    gate.addEventListener('pointerdown', firstTouch);
    gate.addEventListener('keydown', firstTouch);
    runLoader(function () {
      gate.classList.add('ready');
      setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }, reduceMotion ? 0 : 900);
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = input.value.trim();
      sha256(value).then(function (hash) {
        var ok = hash ? hash === GATE_HASH : btoa(value) === 'TGFiYmV0MjAyNg==';
        if (ok) {
          try { localStorage.setItem(GATE_KEY, GATE_HASH.slice(0, 12)); } catch (err) { /* privat läge */ }
          error.hidden = true;
          enterSite(false);
        } else {
          error.hidden = false;
          gate.classList.remove('shake'); void gate.offsetWidth; gate.classList.add('shake');
          input.select();
        }
      });
    });
  }

  var lockBtn = document.querySelector('[data-lock]');
  if (lockBtn) {
    lockBtn.addEventListener('click', function () {
      try { localStorage.removeItem(GATE_KEY); } catch (e) { /* privat läge */ }
      location.reload();
    });
  }
})();
