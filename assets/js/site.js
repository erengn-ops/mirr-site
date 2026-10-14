/* Catbeam site: header, reveal, parallax hills, the hero loop, "tap her", day and night, the birthday card.
   Only real clips are played (Miel's own); a clip is never cross-faded to fake motion: players cut on clip boundaries,
   which are all the cat's resting pose. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RM) root.classList.add('rm');
  var saveData = navigator.connection && navigator.connection.saveData;
  var M = '/mirr-site/assets/media/';
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var T = {}; try { T = JSON.parse(($('#i18n') || {}).textContent || '{}'); } catch (e) {}

  /* header + parallax */
  var hd = $('.hd'), ticking = false;
  var darkSecs = $$('[data-dark]');
  function onScroll() {
    var y = window.scrollY || 0;
    root.style.setProperty('--sy', y);
    if (hd) {
      hd.classList.toggle('solid', y > 12);
      var dark = false, h = hd.offsetHeight / 2;
      for (var i = 0; i < darkSecs.length; i++) { var r = darkSecs[i].getBoundingClientRect(); if (r.top <= h && r.bottom > h) { dark = true; break; } }
      hd.classList.toggle('on-dark', dark);
    }
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* language menu: closes on outside tap / Escape */
  var lang = $('.lang');
  if (lang) {
    d.addEventListener('click', function (e) { if (lang.open && !lang.contains(e.target)) lang.open = false; });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') lang.open = false; });
  }

  /* reveal */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  /* visibility helper */
  function whenVisible(el, on, off, margin) {
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver(function (es) { es.forEach(function (e) { (e.isIntersecting ? on : off || function () {})(); }); }, { rootMargin: margin || '0px', threshold: 0.01 }).observe(el);
  }
  function warm(urls) { if (saveData) return; urls.forEach(function (u, i) { setTimeout(function () { fetch(u, { priority: 'low' }).catch(function () {}); }, 150 * i); }); }

  /* Two stacked <video>s: the next clip starts underneath and is shown on its first frame (a cut, never a blend). */
  function Player(screen) {
    this.v = [$('video.a', screen), $('video.b', screen)]; this.i = 0; this.tok = 0;
  }
  Player.prototype.play = function (src, o) {
    o = o || {}; var self = this, tok = ++this.tok, old = this.v[this.i], nxt = this.v[1 - this.i];
    nxt.onended = null; nxt.loop = !!o.loop; nxt.muted = o.muted !== false;
    if (nxt.getAttribute('src') !== src) nxt.setAttribute('src', src);
    try { nxt.currentTime = 0; } catch (e) {}
    var shown = false;
    function show() {
      if (shown || tok !== self.tok) return; shown = true;
      nxt.classList.remove('back'); old.classList.add('back');
      if (old !== nxt) setTimeout(function () { if (tok === self.tok) old.pause(); }, 60);
      self.i = 1 - self.i;
      if (o.onshow) o.onshow();
    }
    nxt.onended = function () { if (tok === self.tok && o.onend) o.onend(); };
    var pr = nxt.play();
    var go = function () { if ('requestVideoFrameCallback' in nxt) nxt.requestVideoFrameCallback(show); else show(); };
    if (pr && pr.then) pr.then(go, function () { show(); }); else go();
    setTimeout(show, 1200);
  };
  Player.prototype.stop = function () { this.tok++; this.v.forEach(function (v) { v.pause(); }); };

  /* hero loop: Miel's idle clip */
  var hero = $('#heroVideo');
  if (hero && !RM) whenVisible(hero, function () { hero.play().catch(function () {}); }, function () { hero.pause(); });

  /* TAP HER */
  var tap = $('#tapScreen');
  if (tap) {
    var pl = new Player(tap), busy = false, last = '', sound = false, started = false;
    var clips = ['love', 'love_v2', 'love_v3', 'meow', 'meow_v2', 'happy', 'happy_v2', 'greet', 'hungry', 'curious', 'belly', 'stretch', 'yawn'];
    var label = { love: 'love', love_v2: 'love', love_v3: 'love', meow: 'meow', meow_v2: 'meow', happy: 'happy', happy_v2: 'happy', greet: 'greet', hungry: 'hungry', curious: 'curious', belly: 'belly', stretch: 'stretch', yawn: 'yawn' };
    var pill = $('#tapPill'), dot = $('.hintdot', tap), ripple = $('.tap-ripple', tap), soundBtn = $('#soundBtn');
    var pillT;
    function say(t) { pill.textContent = t; pill.classList.add('on'); clearTimeout(pillT); pillT = setTimeout(function () { pill.classList.remove('on'); }, 2200); }
    function idle() { busy = false; pl.play(M + 'idle.mp4', { loop: true }); }
    whenVisible(tap, function () {
      if (!started) { started = true; warm(clips.map(function (c) { return M + c + '.mp4'; })); if (!RM) idle(); }
      else if (!busy && !RM) pl.v[pl.i].play().catch(function () {});
    }, function () { pl.v[pl.i].pause(); }, '150px');
    if (RM) { var iv = pl.v[0]; iv.setAttribute('src', M + 'idle.mp4'); }
    function react(x, y) {
      ripple.style.left = x + '%'; ripple.style.top = y + '%'; ripple.classList.remove('go'); void ripple.offsetWidth; ripple.classList.add('go');
      dot.classList.add('off');
      if (busy) return;
      var pick; do { pick = clips[Math.floor(Math.random() * clips.length)]; } while (label[pick] === last && clips.length > 3);
      last = label[pick]; busy = true; if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
      pl.play(M + pick + '.mp4', { muted: !sound, onshow: function () { say((T.name || 'Miel') + ' · ' + ((T.react || {})[label[pick]] || '')); }, onend: idle });
    }
    tap.addEventListener('click', function (e) {
      var r = tap.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
      var onCat = x > 50 && x < 89 && y > 38 && y < 82;
      if (onCat) react(x, y); else { ripple.style.left = x + '%'; ripple.style.top = y + '%'; ripple.classList.remove('go'); void ripple.offsetWidth; ripple.classList.add('go'); say(T.hint || ''); }
    });
    if (soundBtn) soundBtn.addEventListener('click', function () {
      sound = !sound; soundBtn.setAttribute('aria-pressed', sound);
      soundBtn.querySelector('span').textContent = sound ? T.soundOn : T.soundOff;
    });
  }

  /* DAY AND NIGHT: idle → fall asleep → sleep loop (an ear, a tail now and then) → wake → idle */
  var ns = $('#nightScreen');
  if (ns) {
    var np = new Player(ns), sec = $('.night'), state = 'day', st = $('#nightState'), stirT, auto, interacted = false, started2 = false;
    var bNight = $('#bNight'), bOpen = $('#bOpen');
    function setState(txt) { st.textContent = txt || ''; }
    function sleepLoop() {
      np.play(M + 'sleep.mp4', { loop: true });
      clearTimeout(stirT);
      stirT = setTimeout(function stir() {
        if (state !== 'night') return;
        np.play(M + (Math.random() < .5 ? 'stir_ear' : 'stir_tail') + '.mp4', { onend: function () { sleepLoop(); } });
      }, 5200 + Math.random() * 4000);
    }
    function goNight() {
      if (state === 'night' || state === 'falling') return; state = 'falling'; clearTimeout(stirT);
      sec.classList.add('is-night'); bNight.setAttribute('aria-pressed', 'true'); bOpen.setAttribute('aria-pressed', 'false'); bOpen.disabled = false;
      setState(T.falling);
      np.play(M + 'fall_asleep.mp4', { onend: function () { state = 'night'; setState(T.asleep); sleepLoop(); } });
    }
    function goOpen() {
      if (state !== 'night') return; state = 'waking'; clearTimeout(stirT);
      sec.classList.remove('is-night'); bNight.setAttribute('aria-pressed', 'false'); bOpen.setAttribute('aria-pressed', 'true'); bOpen.disabled = true;
      setState(T.waking);
      np.play(M + 'wake.mp4', { onend: function () { state = 'day'; setState(T.awake); bOpen.setAttribute('aria-pressed', 'false'); np.play(M + 'idle.mp4', { loop: true }); } });
    }
    bNight.addEventListener('click', function () { interacted = true; clearTimeout(auto); goNight(); });
    bOpen.addEventListener('click', function () { interacted = true; goOpen(); });
    bOpen.disabled = true;
    whenVisible(ns, function () {
      if (!started2) {
        started2 = true; warm([M + 'fall_asleep.mp4', M + 'sleep.mp4', M + 'wake.mp4', M + 'stir_ear.mp4', M + 'stir_tail.mp4']);
        if (!RM) { np.play(M + 'idle.mp4', { loop: true }); auto = setTimeout(function () { if (!interacted) goNight(); }, 4200); }
      } else if (state === 'day' && !RM) np.v[np.i].play().catch(function () {});
    }, function () { if (state === 'day') np.v[np.i].pause(); }, '100px');
  }

  /* Birthday card: plays once when it comes into view; a button plays it again. */
  var bd = $('#bdVideo');
  if (bd) {
    var bb = $('#bdReplay'), played = false;
    whenVisible(bd, function () { if (!played && !RM) { played = true; bd.play().catch(function () {}); } }, null, '-15% 0px');
    bd.addEventListener('ended', function () { bb.hidden = false; });
    bb.addEventListener('click', function () { bb.hidden = true; bd.currentTime = 0; bd.play().catch(function () {}); });
    if (RM) bb.hidden = false;
  }
  /* wake clip in the reduced-motion version of the story */
  var sw = $('#ssPlay'), sv = $('#ssVideo');
  if (sw && sv) sw.addEventListener('click', function () { sw.hidden = true; sv.hidden = false; sv.play().catch(function () {}); });
})();
