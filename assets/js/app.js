/* Catbeam site: scroll-driven story + micro-interactions.
   GSAP 3 + ScrollTrigger + Lenis (vendored). Everything degrades: html.rm = reduced motion (static page, posters),
   no GSAP / script error = `.anim` is dropped and the static layout takes over. Content is never gated on this file. */
(function () {
  'use strict';
  var root = document.documentElement, doc = document;
  var rm = root.classList.contains('rm');
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function bail() { root.classList.remove('anim'); }
  var failsafe = setTimeout(function () { if (!root.classList.contains('ready')) bail(); }, 4500);

  /* ---------- store links (same builder as config.js) ---------- */
  function links() {
    if (!window.CATBEAM || !CATBEAM.storeUrl) return;
    $$('[data-ct]').forEach(function (a) { a.href = CATBEAM.storeUrl(a.getAttribute('data-ct')); });
  }

  /* ---------- language menu ---------- */
  function langMenu() {
    var d = $('details.lang'); if (!d) return;
    doc.addEventListener('click', function (e) { if (d.open && !d.contains(e.target)) d.open = false; });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.open) { d.open = false; d.querySelector('summary').focus(); } });
  }

  /* ---------- care cards (work with or without GSAP) ---------- */
  function care() {
    $$('.ring').forEach(function (b) {
      var of = +b.dataset.of, fg = $('.r-fg', b), t = $('i', $('b', b));
      var set = function (n) { b.dataset.n = n; t.textContent = n; fg.style.strokeDashoffset = 100 - (n / of) * 100; };
      set(+b.dataset.n);
      b.addEventListener('click', function () { set((+b.dataset.n + 1) % (of + 1)); });
    });
    $$('.med').forEach(function (c) {
      var chips = $$('.chip', c), bar = $('.bar i', c);
      var upd = function () { bar.style.width = (chips.filter(function (x) { return x.getAttribute('aria-pressed') === 'true'; }).length / chips.length * 100) + '%'; };
      chips.forEach(function (x) { x.addEventListener('click', function () { x.setAttribute('aria-pressed', x.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); upd(); }); });
      upd();
    });
    $$('.pp').forEach(function (b) { b.addEventListener('click', function () { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); }); });
    $$('.chat').forEach(function (c) {
      var q = $('.q', c), a = $('.a', c), done = false, timer;
      c.setAttribute('aria-live', 'polite');
      var type = function (el, txt, speed, cb) {
        if (rm) { el.textContent = txt; cb && cb(); return; }
        var i = 0; el.textContent = '';
        (function step() { el.textContent = txt.slice(0, ++i); if (i < txt.length) timer = setTimeout(step, speed); else cb && cb(); })();
      };
      var run = function () { clearTimeout(timer); q.textContent = ''; a.textContent = ''; type(q, c.dataset.q, 24, function () { timer = setTimeout(function () { type(a, c.dataset.a, 14); }, 450); }); };
      c.closest('.card').addEventListener('click', function () { if (done) run(); });
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting && !done) { done = true; run(); io.disconnect(); } }, { threshold: .6 });
        io.observe(c);
      } else { done = true; run(); }
    });
  }

  /* ---------- videos outside the story: play only while visible ---------- */
  function videos() {
    var vs = $$('video').filter(function (v) { return !v.classList.contains('clip'); });
    if (rm || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { var v = x.target; if (x.isIntersecting) { var p = v.play(); p && p.catch && p.catch(function () {}); } else v.pause(); });
    }, { rootMargin: '120px', threshold: .15 });
    vs.forEach(function (v) { io.observe(v); });
  }

  /* ---------- FAQ (native details; height animation added with GSAP) ---------- */
  function faq(g) {
    if (!g) return;
    $$('.qa').forEach(function (d) {
      var s = $('summary', d), a = $('.qa-a', d), busy = false;
      s.addEventListener('click', function (e) {
        e.preventDefault(); if (busy) return; busy = true;
        if (d.open) { g.to(a, { height: 0, duration: .45, ease: 'power3.inOut', onComplete: function () { d.open = false; g.set(a, { clearProps: 'height' }); busy = false; } }); }
        else { d.open = true; g.fromTo(a, { height: 0 }, { height: 'auto', duration: .55, ease: 'power3.out', onComplete: function () { g.set(a, { clearProps: 'height' }); busy = false; } }); }
      });
    });
  }

  /* ---------- reduced motion / no-GSAP story: static layout, idle poster, play on demand ---------- */
  function staticStory() {
    var idle = $('video[data-clip="idle"]'), btn = $('.replay'); if (!idle) return;
    if (rm) {
      if (btn) {
        btn.hidden = false;
        btn.addEventListener('click', function () { idle.play(); });
        idle.addEventListener('play', function () { btn.hidden = true; });
        idle.addEventListener('pause', function () { btn.hidden = false; });
        idle.addEventListener('click', function () { idle.paused ? idle.play() : idle.pause(); });
      }
    } else if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { var p = en[0].isIntersecting ? idle.play() : idle.pause(); p && p.catch && p.catch(function () {}); }, { threshold: .2 }).observe(idle);
    }
  }

  /* ---------- the animated page ---------- */
  function animated() {
    var g = window.gsap, ST = window.ScrollTrigger;
    g.registerPlugin(ST);
    ST.config({ ignoreMobileResize: true });

    /* smooth scroll */
    var lenis = null;
    if (window.Lenis && fine) {
      lenis = new Lenis({ lerp: .11, wheelMultiplier: .95, anchors: false });
      lenis.on('scroll', ST.update);
      g.ticker.add(function (t) { lenis.raf(t * 1000); });
      g.ticker.lagSmoothing(0);
    }
    var scrollToY = function (y) { lenis ? lenis.scrollTo(y, { duration: 1.3 }) : window.scrollTo({ top: y, behavior: 'smooth' }); };
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1), el = id && doc.getElementById(id); if (!el) return;
        e.preventDefault(); scrollToY(el.getBoundingClientRect().top + window.pageYOffset - 56); history.replaceState(null, '', '#' + id);
      });
    });

    /* header */
    var hd = $('.hd'), last = 0;
    ST.create({ start: 0, end: 'max', onUpdate: function (s) {
      var y = s.scroll(), dir = y > last ? 1 : -1;
      hd.classList.toggle('solid', y > 60);
      if (!hd.contains(doc.activeElement)) hd.classList.toggle('hide', dir > 0 && y > 900);
      last = y;
    } });

    /* ---- the story ---- */
    var small = window.matchMedia('(max-width: 899px)').matches, TH = small ? 'top 30%' : 'top 60%';
    var story = $('.story'), scr = $('.phone-screen'), phone = $('.phone'), beats = $$('.beat');
    var orb = $('.orb', scr), bloom = $('.bloom', scr), clips = {};
    $$('video.clip', scr).forEach(function (v) { clips[v.dataset.clip] = v; });
    var L = { night: $('.sc-night'), wall: $('.sc-wall'), floor: $('.sc-floor'), win: $('.sc-window'), rug: $('.sc-rug'), bowl: $('.sc-bowl'), glow: $('.sc-glow') };

    /* initial scene = night with a lone light */
    g.set([L.wall], { clipPath: 'circle(0% at 70% 33%)' });
    g.set([L.floor, L.rug, L.bowl, L.glow], { opacity: 0 });
    g.set(L.win, { opacity: 0 }); g.set(scr, { '--sil': 1 });   // the window is first only a faint arch of light
    g.set(L.rug, { scaleX: .55, transformOrigin: '65% 77%' }); g.set(L.bowl, { y: 14 });
    g.set(orb, { left: '50%', top: '72%' }); g.set($$('i', orb), { opacity: 0 });
    g.set(phone, { opacity: 0, y: 70, scale: .94, transformPerspective: 1200 });

    /* intro (also the "loader": content is already in the DOM; this only reveals it) */
    var intro = g.timeline({ delay: .08, defaults: { ease: 'power3.out' }, onComplete: function () { root.classList.add('ready'); hd.style.transition = ''; g.set(hd, { clearProps: 'transform,translate,rotate,scale' }); } });
    hd.style.transition = 'background .4s, box-shadow .4s, color .4s';   // CSS transform transition would fight the tween
    intro.from(hd, { yPercent: -100, opacity: 0, duration: .8 }, 0)
      .to(phone, { opacity: 1, y: 0, scale: 1, duration: 1.4, ease: 'expo.out' }, .1)
      .to($$('i', orb), { opacity: 1, duration: 1.2, stagger: .1 }, .5)
      .from(orb, { top: '90%', duration: 2, ease: 'power2.out' }, .4)
      .to('.hero-copy .kick', { opacity: 1, y: 0, duration: .8 }, .35)
      .to('.hero-copy h1 .w', { y: 0, duration: 1.15, ease: 'expo.out', stagger: .09 }, .45)
      .to(['.hero-copy .lead', '.hero-copy .cta-row', '.hero-copy .fine'], { opacity: 1, y: 0, duration: .9, stagger: .12 }, 1.0);
    g.set(['.hero-copy .kick', '.hero-copy .lead', '.hero-copy .cta-row', '.hero-copy .fine'], { y: 18 });
    root.classList.add('ready'); clearTimeout(failsafe);   // initial hidden states are all set; content can never stay hidden

    /* orb floats gently before the scroll takes over */
    g.to(orb, { y: -8, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });

    /* scrubbed build: light -> window -> room */
    var build = g.timeline({ defaults: { ease: 'none' } });
    build.to(orb, { left: '70%', duration: 1.3, ease: 'power1.inOut' }, 0.1)
      .to(orb, { top: '33%', duration: 1.3, ease: 'power3.out' }, 0.1)
      .to(scr, { '--sil': 0, duration: .5 }, 1.0)
      .to(L.win, { opacity: 1, duration: .5, ease: 'power2.out' }, 1.0)
      .fromTo(L.win, { filter: 'brightness(2.4) saturate(.4)' }, { filter: 'brightness(1) saturate(1)', duration: .8 }, 1.0)
      .to(L.glow, { opacity: .9, duration: .6 }, 1.1)
      .to(L.wall, { clipPath: 'circle(150% at 70% 33%)', duration: 1.1, ease: 'power2.inOut' }, 1.7)
      .to(L.floor, { opacity: 1, duration: .5 }, 2.1)
      .to(L.rug, { opacity: 1, scaleX: 1, duration: .5, ease: 'power2.out' }, 2.3)
      .to(L.bowl, { opacity: 1, y: 0, duration: .45, ease: 'power2.out' }, 2.55)
      .to(orb, { scale: .5, opacity: 0, duration: .45 }, 2.55)
      .to(L.night, { opacity: .0, duration: .6 }, 2.4)
      .to(L.glow, { opacity: .5, duration: .4 }, 2.6);
    ST.create({ trigger: beats[0], start: 'top top', endTrigger: beats[3], end: TH, scrub: .7, animation: build });

    /* beat -> clip */
    var plan = { 3: 'wake', 4: 'star_bat', 5: 'eat', 6: 'sniff_cam', 7: 'idle' }, cur = null, curBeat = -1;
    var play = function (v) { var p = v.play(); p && p.catch && p.catch(function () {}); };
    var prefetch = function (n) { var v = clips[n]; if (v && v.preload !== 'auto') { v.preload = 'auto'; v.load(); } };
    Object.keys(clips).forEach(function (k) {
      var v = clips[k], then = v.dataset.then;
      if (then) v.addEventListener('ended', function () { if (cur === k && clips[then]) show(then, true); });
    });
    function show(name, soft) {
      if (name === cur) return;
      var prev = cur && clips[cur]; cur = name;
      if (!soft && name) g.fromTo(bloom, { opacity: 0 }, { opacity: .85, duration: .22, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: true });
      Object.keys(clips).forEach(function (k) { clips[k].classList.toggle('on', k === name); });
      if (name) { var v = clips[name]; try { v.currentTime = 0; } catch (e) {} play(v); }
      if (prev) setTimeout(function () { if (cur !== prev.dataset.clip) prev.pause(); }, 700);
    }
    function setBeat(i) {
      curBeat = i;
      $$('.dots button').forEach(function (b, k) { b.classList.toggle('on', k === i); });
      show(plan[i] || null);
      var next = { 2: 'wake', 3: 'star_bat', 4: 'eat', 5: 'sniff_cam', 6: 'idle' }[i]; if (next) prefetch(next);
    }
    prefetch('idle'); setTimeout(function () { prefetch('wake'); }, 1200);
    beats.forEach(function (b, i) {
      ST.create({ trigger: b, start: TH, end: small ? 'bottom 30%' : 'bottom 60%', onToggle: function (s) { if (s.isActive) setBeat(i); } });
      if (i > 0) g.from($('.beat-card', b), { opacity: 0, y: 44, ease: 'power3.out', duration: 1, scrollTrigger: { trigger: b, start: 'top 72%', toggleActions: 'play none none reverse' } });
    });
    ST.create({ trigger: story, start: 'top bottom', end: 'bottom top', onToggle: function (s) { if (!s.isActive) Object.keys(clips).forEach(function (k) { clips[k].pause(); }); else if (cur) play(clips[cur]); } });
    var dotBtns = $$('.dots button');
    dotBtns.forEach(function (b) { b.tabIndex = -1; b.addEventListener('click', function () { var el = beats[+b.dataset.go]; scrollToY(el.getBoundingClientRect().top + window.pageYOffset); }); });

    /* mobile: the phone waits below the hero copy (never under it), then rises into place as the copy scrolls away */
    if (small) {
      var col = $('.phone-col'), copy = $('.hero-copy'), y0 = 0;
      var measure = function () {
        g.set(col, { y: 0 });
        var top = phone.getBoundingClientRect().top - (g.getProperty(phone, 'y') || 0), bottom = copy.getBoundingClientRect().bottom + scrollY;
        y0 = Math.max(0, Math.round(bottom + 34 - top));
        return y0;
      };
      g.fromTo(col, { y: measure }, { y: 0, immediateRender: true, ease: 'none', scrollTrigger: { trigger: story, start: 'top top', end: function () { return '+=' + Math.max(260, innerHeight * .7); }, scrub: .5, invalidateOnRefresh: true } });
    }

    /* phone: slight scroll-linked sway through the story + pointer tilt */
    g.fromTo(phone, { rotationY: -6 }, { rotationY: 6, ease: 'none', scrollTrigger: { trigger: story, start: 'top top', end: 'bottom bottom', scrub: 1 } });
    if (fine) {
      var rx = g.quickTo(phone, 'rotationX', { duration: .8, ease: 'power3.out' });
      story.addEventListener('pointermove', function (e) { rx(((e.clientY / innerHeight) - .5) * -6); });
    }

    /* ---- generic: reveals ---- */
    ST.batch('.reveal', { start: 'top 90%', once: true, onEnter: function (els) {
      g.fromTo(els, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .12, overwrite: 'auto',
        onComplete: function () { els.forEach(function (el) { el.classList.add('in'); g.set(el, { clearProps: 'opacity,transform' }); }); } });
    } });
    setTimeout(function () { $$('.reveal:not(.in)').forEach(function (el) { if (el.getBoundingClientRect().top < innerHeight * 1.1) { el.classList.add('in'); g.set(el, { clearProps: 'opacity,transform' }); } }); }, 6000);

    /* ---- generic: parallax by data-depth ---- */
    $$('[data-depth]').forEach(function (el) {
      var d = +el.dataset.depth;
      g.fromTo(el, { y: d * 520 }, { y: -d * 520, ease: 'none', scrollTrigger: { trigger: el.parentNode, start: 'top bottom', end: 'bottom top', scrub: .8 } });
    });

    /* ---- section headings: masked line-by-line feel for h2 ---- */
    $$('.sec-h h2, .wid-copy h2, .reel-copy h2, .club-copy h2').forEach(function (h) {
      g.fromTo(h, { clipPath: 'inset(0 0 100% 0)', y: 30 }, { clipPath: 'inset(0 0 -20% 0)', y: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true }, onComplete: function () { g.set(h, { clearProps: 'clipPath' }); } });
    });

    /* ---- care: line draw + counter, ring fill ---- */
    var wt = $('.wt');
    if (wt) {
      var ln = $('.line', wt), ar = $('.area', wt), cnt = $('[data-count]', wt), tgt = parseFloat(cnt.dataset.count), dec = +cnt.dataset.dec || 0, o = { v: tgt - 0.9 };
      var tl = g.timeline({ scrollTrigger: { trigger: wt, start: 'top 80%', once: true } });
      tl.fromTo(ln, { strokeDashoffset: 100 }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, 0)
        .fromTo(ar, { opacity: 0 }, { opacity: 1, duration: 1 }, .8)
        .fromTo($$('.dots-c circle', wt), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: .5, stagger: .18, ease: 'back.out(3)' }, .3)
        .to(o, { v: tgt, duration: 1.6, ease: 'power2.out', onUpdate: function () { cnt.textContent = o.v.toFixed(dec); } }, 0);
    }
    $$('.ring').forEach(function (b) {
      var fg = $('.r-fg', b), end = 100 - (+b.dataset.n / +b.dataset.of) * 100;
      fg.style.strokeDashoffset = 100;
      ST.create({ trigger: b, start: 'top 85%', once: true, onEnter: function () { g.to(fg, { strokeDashoffset: end, duration: 1.4, ease: 'power3.out' }); } });
    });
    $$('.med .bar i').forEach(function (i) { var w = i.style.width; i.style.width = '0%'; ST.create({ trigger: i, start: 'top 90%', once: true, onEnter: function () { i.style.width = w; } }); });

    /* ---- tilt cards + light follow ---- */
    if (fine) {
      $$('[data-tilt]').forEach(function (c) {
        var ry = g.quickTo(c, 'rotationY', { duration: .6, ease: 'power3.out' }), rx = g.quickTo(c, 'rotationX', { duration: .6, ease: 'power3.out' });
        g.set(c, { transformPerspective: 900 });
        c.addEventListener('pointermove', function (e) {
          var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          ry((x - .5) * 9); rx((y - .5) * -9); c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
        });
        c.addEventListener('pointerleave', function () { ry(0); rx(0); });
      });
      /* magnetic buttons */
      $$('[data-magnet]').forEach(function (b) {
        var qx = g.quickTo(b, 'x', { duration: .5, ease: 'power3.out' }), qy = g.quickTo(b, 'y', { duration: .5, ease: 'power3.out' });
        b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); qx((e.clientX - (r.left + r.width / 2)) * .28); qy((e.clientY - (r.top + r.height / 2)) * .38); });
        b.addEventListener('pointerleave', function () { qx(0); qy(0); });
      });
      /* cursor light */
      var cl = $('.cursor-light');
      if (cl) {
        var cx = g.quickTo(cl, 'x', { duration: .7, ease: 'power3.out' }), cy = g.quickTo(cl, 'y', { duration: .7, ease: 'power3.out' });
        window.addEventListener('pointermove', function (e) { cl.classList.add('on'); cx(e.clientX); cy(e.clientY); }, { passive: true });
        doc.addEventListener('pointerleave', function () { cl.classList.remove('on'); });
      }
    }

    /* ---- widgets / reel / club entrances ---- */
    [['.wid-stage', '.mock, .la'], ['.reel-stage', '.mock'], ['.club-stage', '.cc']].forEach(function (p) {
      var st = $(p[0]); if (!st) return;
      g.from($$(p[1], st), { opacity: 0, scale: .9, duration: 1.1, ease: 'expo.out', stagger: .14, scrollTrigger: { trigger: st, start: 'top 78%', once: true } });
    });
    $$('.pts li, .feat li, .steps3 li').forEach(function (li, i) { g.from(li, { opacity: 0, x: -18, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: li, start: 'top 92%', once: true } }); });

    /* ---- how it works ---- */
    var path = $('.hsteps .path');
    if (path && getComputedStyle(path).display !== 'none') g.fromTo(path, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger: { trigger: '.hsteps', start: 'top 75%', end: 'bottom 70%', scrub: .6 } });
    $$('.ph-stack img').forEach(function (im, i) { g.from(im, { x: (i % 2 ? -1 : 1) * 24, y: -30, rotation: 0, opacity: 0, duration: .8, delay: i * .12, ease: 'back.out(1.6)', scrollTrigger: { trigger: im, start: 'top 90%', once: true } }); });
    var tr = $('.timer .r-fg'); if (tr) g.fromTo(tr, { strokeDashoffset: 100 }, { strokeDashoffset: 25, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: tr, start: 'top 90%', once: true } });

    faq(g);

    /* layout may shift after fonts / images: refresh once */
    var rf = function () { ST.refresh(); };
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(rf);
    window.addEventListener('load', function () { setTimeout(rf, 200); });
  }

  /* ---------- boot ---------- */
  function boot() {
    links(); langMenu(); care(); videos();
    if (rm || !root.classList.contains('anim') || !window.gsap || !window.ScrollTrigger) { bail(); staticStory(); clearTimeout(failsafe); return; }
    try { animated(); } catch (err) { bail(); staticStory(); if (window.console) console.error(err); }
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})();
