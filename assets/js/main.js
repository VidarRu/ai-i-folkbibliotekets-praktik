/* AI i folkbibliotekets praktik – interaktion
   Allt innehåll syns även utan JavaScript; skriptet lägger bara på
   utfällning, scrollanimationer, scrollband och videospelare. */
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

  /* ── Scrollanimationer ─────────────────────────────────────────── */
  var revealSel = '[data-reveal], .stagger, .part-head, .flow, .bars, .bookshelf, [data-count]';
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
    btn.addEventListener('click', function () { setOpen(acc, !acc.classList.contains('open')); });
  });

  function openAndScroll(id) {
    var acc = document.getElementById(id);
    if (!acc || !acc.classList.contains('acc')) return false;
    setOpen(acc, true);
    var track = acc.closest('.track');
    if (track) track.scrollTo({ left: acc.offsetLeft - track.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
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

  /* ── Scrollband i sidled ───────────────────────────────────────── */
  document.querySelectorAll('.track-wrap').forEach(function (wrap) {
    var track = wrap.querySelector('.track');
    var prev = wrap.querySelector('[data-prev]');
    var next = wrap.querySelector('[data-next]');
    var dotsBox = wrap.querySelector('.track-dots');
    var items = Array.prototype.slice.call(track.children);
    var dots = [];
    if (dotsBox) {
      items.forEach(function () { var s = document.createElement('span'); dotsBox.appendChild(s); dots.push(s); });
    }
    function stepSize() { return items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : track.clientWidth; }
    function update() {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
      if (dots.length) {
        var idx = Math.round(track.scrollLeft / stepSize());
        if (track.scrollLeft >= max) idx = items.length - 1;
        dots.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
      }
    }
    if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -stepSize(), behavior: 'smooth' }); });
    if (next) next.addEventListener('click', function () { track.scrollBy({ left: stepSize(), behavior: 'smooth' }); });
    track.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();

    // Dra med musen (pekskärmar scrollar redan naturligt)
    track.classList.add('draggable');
    var down = false, moved = false, swallow = false, startX = 0, startLeft = 0;
    // Hindra att släppet efter en dragning räknas som ett klick på en ruta
    track.addEventListener('click', function (ev) {
      if (swallow) { ev.stopPropagation(); ev.preventDefault(); }
    }, true);
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = true; moved = false; startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('dragging'); }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', function () {
      if (!down) return;
      down = false;
      if (moved) {
        track.classList.remove('dragging');
        var s = stepSize();
        track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: 'smooth' });
        swallow = true;
        setTimeout(function () { swallow = false; }, 0);
      }
      moved = false;
    });
  });

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
})();
