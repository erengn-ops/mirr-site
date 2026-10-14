/* The teleport, scrubbed by scroll. Four of Miel's real photos are swept into a vortex made of their own pixels,
   which lands on the phone as the first frame of her real wake-up clip; then the clip plays (a hard cut: the
   mosaic and the clip's frame 0 are the same picture). The vortex is a stylised effect on photos; the clip is real. */
(function () {
  'use strict';
  var d = document, root = d.getElementById('story');
  if (!root) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (RM || !root.querySelector('canvas')) return;
  var pin = root.querySelector('.story-pin'), cv = root.querySelector('canvas'), ctx = cv.getContext('2d');
  var screen = root.querySelector('.story-phone .screen'), wakeImg = root.querySelector('#wakeImg'), wakeVid = root.querySelector('#wakeVid');
  var steps = [].slice.call(root.querySelectorAll('.stp')), dots = [].slice.call(root.querySelectorAll('.story-dots i'));
  var photoSrc = root.dataset.photos.split(','), wakeSrc = root.dataset.wake;
  var images = [], wakePix = null, ready = false, W = 0, H = 0, dpr = 1;
  var CX = 28, CY = 37, TC = 46;           // photo grid per card; target grid columns
  var N = CX * CY * 4, TR = Math.ceil(N / TC);
  var P = {}, cards = [], cur = 0, tgt = 0, last = 0, raf = 0, active = false, vidOn = false;
  var V0 = 0.16, V1 = 0.74, REV = 0.80;

  function sm(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  function clamp(x) { return Math.min(1, Math.max(0, x)); }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function load(src) { return new Promise(function (res) { var i = new Image(); i.decoding = 'async'; i.onload = function () { res(i); }; i.onerror = function () { res(null); }; i.src = src; }); }
  function sampleCover(img, w, h) {           // pixels of img covering a w×h box (object-fit: cover)
    var c = d.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d', { willReadFrequently: true });
    var s = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / s, sh = h / s;
    x.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
    return x.getImageData(0, 0, w, h).data;
  }
  function drawCover(img, x, y, w, h, r) {
    ctx.save(); ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); ctx.clip();
    var s = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / s, sh = h / s;
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h); ctx.restore();
  }

  var samples = [];
  function layout() {
    var r = pin.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var sr = screen.getBoundingClientRect();
    var sx = sr.left - r.left, sy = sr.top - r.top, sw = sr.width, sh = sr.height;
    var ax = sx + sw / 2, ay = sy + sh / 2, wide = W >= 900;
    var cw = wide ? Math.min(210, W * .15, H * .27) : Math.min(150, W * .32), ch = cw * 4 / 3;
    var fx = wide ? W * .34 : W / 2, fy = wide ? H * .58 : H * (W < 400 ? .41 : .4);
    cards = [];
    for (var k = 0; k < 4; k++) {
      var o = k - 1.5;
      cards.push({ x: fx + o * cw * (wide ? .58 : .56), y: fy + Math.abs(o) * cw * .1 - (wide ? 0 : 0), rot: o * (wide ? .12 : .13), cw: cw, ch: ch, b: Math.max(4, cw * .045) });
    }
    // particles
    var R = rng(11), n = N;
    var x0 = new Float32Array(n), y0 = new Float32Array(n), th0 = new Float32Array(n), r0 = new Float32Array(n),
        txx = new Float32Array(n), tyy = new Float32Array(n), thT = new Float32Array(n), rT = new Float32Array(n),
        dly = new Float32Array(n), dth = new Float32Array(n), bul = new Float32Array(n), lift = new Float32Array(n),
        s0 = new Float32Array(n), sT = new Float32Array(n), c0 = new Uint8Array(n * 3), cT = new Uint8Array(n * 3);
    var cell = cw / CX, cellH = ch / CY, tcw = sw / TC, tch = sh / TR;
    var order = new Uint32Array(n); for (var i = 0; i < n; i++) order[i] = i;
    for (i = n - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)), t = order[i]; order[i] = order[j]; order[j] = t; }
    var minWH = Math.min(W, H);
    for (i = 0; i < n; i++) {
      var k2 = i % 4, jj = Math.floor(i / 4), gx = jj % CX, gy = Math.floor(jj / CX) % CY, cd = cards[k2];
      var lx = (gx + .5) * cell - cd.cw / 2, ly = (gy + .5) * cellH - cd.ch / 2;
      var cs = Math.cos(cd.rot), sn = Math.sin(cd.rot);
      x0[i] = cd.x + lx * cs - ly * sn; y0[i] = cd.y + lx * sn + ly * cs;
      var dx = x0[i] - ax, dy = y0[i] - ay; r0[i] = Math.hypot(dx, dy); th0[i] = Math.atan2(dy, dx);
      var ti = order[i], tx = ti % TC, ty = Math.floor(ti / TC);
      txx[i] = sx + (tx + .5) * tcw; tyy[i] = sy + (ty + .5) * tch;
      dx = txx[i] - ax; dy = tyy[i] - ay; rT[i] = Math.hypot(dx, dy); thT[i] = Math.atan2(dy, dx);
      var turns = 1 + Math.floor(R() * 3), dd = thT[i] - th0[i];
      while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
      dth[i] = dd + turns * 2 * Math.PI;
      // the card dissolves in a sweep (left to right across the fan) with some noise
      var u = (cd.x + lx * cs - fx) / (W * .5); dly[i] = clamp(.45 * R() + .35 * (u * .5 + .5) + .1 * (k2 / 3));
      bul[i] = (.12 + R() * .42) * minWH * (wide ? .8 : .75); lift[i] = (R() - .3) * H * .22;
      s0[i] = Math.max(cell, cellH) + .6; sT[i] = Math.max(tcw, tch) + .5;
      var px = Math.min(CX - 1, gx), py = Math.min(CY - 1, gy), sd = samples[k2];
      if (sd) { var q = (py * CX + px) * 4; c0[i * 3] = sd[q]; c0[i * 3 + 1] = sd[q + 1]; c0[i * 3 + 2] = sd[q + 2]; }
      if (wakePix) { var q2 = (ty * TC + tx) * 4; cT[i * 3] = wakePix[q2]; cT[i * 3 + 1] = wakePix[q2 + 1]; cT[i * 3 + 2] = wakePix[q2 + 2]; }
    }
    P = { n: n, ax: ax, ay: ay, x0: x0, y0: y0, th0: th0, r0: r0, tx: txx, ty: tyy, thT: thT, rT: rT, dly: dly, dth: dth, bul: bul, lift: lift, s0: s0, sT: sT, c0: c0, cT: cT };
  }

  var pal = []; for (var qi = 0; qi < 4096; qi++) pal.push('rgb(' + ((qi >> 8) * 17) + ',' + (((qi >> 4) & 15) * 17) + ',' + ((qi & 15) * 17) + ')');
  function ease(s) { return s < .5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2; }

  function pos(i, s, out) {
    var e = ease(s), se = Math.sin(Math.PI * e);
    var Rr = P.r0[i] + (P.rT[i] - P.r0[i]) * e + P.bul[i] * se;
    var th = P.th0[i] + P.dth[i] * Math.pow(e, .85);
    var sq = 1 - .6 * se;
    out[0] = P.ax + Rr * Math.cos(th); out[1] = P.ay + Rr * Math.sin(th) * sq - P.lift[i] * se; out[2] = e;
  }

  var o1 = [0, 0, 0], o2 = [0, 0, 0];
  function render(p) {
    if (!ready) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    var q = clamp((p - V0) / (V1 - V0));
    var appear = sm(0, .1, p), cardA = 1 - sm(V0, V0 + .05, p);
    pin.style.setProperty('--beam', sm(.08, V1, p).toFixed(3));
    var mosaicA = 1 - sm(V1, REV, p);     // the mosaic gives way to the clip's frame
    // step captions
    var step = p < V0 ? 0 : p < REV - .02 ? 1 : 2;
    steps.forEach(function (el, i) { el.classList.toggle('on', i === step); }); dots.forEach(function (el, i) { el.classList.toggle('on', i === step); });
    wakeImg.style.opacity = sm(V1 - .02, REV, p).toFixed(3);
    // the clip
    var want = p >= REV;
    if (want && !vidOn) { vidOn = true; wakeVid.currentTime = 0; var pr = wakeVid.play(); if (pr && pr.catch) pr.catch(function () {}); wakeVid.classList.add('on'); }
    else if (!want && vidOn) { vidOn = false; wakeVid.pause(); wakeVid.classList.remove('on'); }
    // cards
    if (cardA > 0.001 && appear > 0) {
      for (var k = 0; k < 4; k++) {
        var c = cards[k], img = images[k]; if (!img) continue;
        var a = appear * cardA, yy = c.y + (1 - appear) * H * .35 * (1 + k * .08);
        ctx.save(); ctx.globalAlpha = a; ctx.translate(c.x, yy); ctx.rotate(c.rot);
        ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8; ctx.fillStyle = '#fff6ea';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-c.cw / 2 - c.b, -c.ch / 2 - c.b, c.cw + 2 * c.b, c.ch + 2 * c.b + c.b * 1.6, 6) : ctx.rect(-c.cw / 2 - c.b, -c.ch / 2 - c.b, c.cw + 2 * c.b, c.ch + 2 * c.b + c.b * 1.6); ctx.fill();
        ctx.shadowColor = 'transparent'; drawCover(img, -c.cw / 2, -c.ch / 2, c.cw, c.ch, 2);
        ctx.restore();
      }
    }
    // particles
    if (q > 0 || p >= V0 - .004) {
      if (p < V0 - .004) return;
      ctx.globalAlpha = mosaicA; var n = P.n, span = .5;
      for (var i = 0; i < n; i++) {
        var s = clamp((q - P.dly[i] * (1 - span)) / span);
        pos(i, s, o1); var e = o1[2];
        var m = sm(.3, .92, e), r = P.c0[i * 3] + (P.cT[i * 3] - P.c0[i * 3]) * m, g = P.c0[i * 3 + 1] + (P.cT[i * 3 + 1] - P.c0[i * 3 + 1]) * m, b = P.c0[i * 3 + 2] + (P.cT[i * 3 + 2] - P.c0[i * 3 + 2]) * m;
        var sz = P.s0[i] + (P.sT[i] - P.s0[i]) * e; var mid = Math.sin(Math.PI * e);
        if (mid > .15 && (i & 1) === 0 && s < 1) {          // a streak behind the swirling grains
          pos(i, Math.max(0, s - .045), o2);
          ctx.globalAlpha = mosaicA * .35; ctx.fillStyle = pal[(Math.min(255, r) >> 4 << 8) | (Math.min(255, g) >> 4 << 4) | (Math.min(255, b) >> 4)];
          ctx.fillRect(o2[0] - sz * .4, o2[1] - sz * .4, sz * .8, sz * .8); ctx.globalAlpha = mosaicA;
        }
        ctx.fillStyle = pal[(Math.min(255, r) >> 4 << 8) | (Math.min(255, g) >> 4 << 4) | (Math.min(255, b) >> 4)];
        var half = sz * (1 - .35 * mid) / 2; ctx.fillRect(o1[0] - half, o1[1] - half, half * 2, half * 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  function loop(t) {
    raf = 0; var dt = Math.min(.05, (t - last) / 1000 || .016); last = t;
    cur += (tgt - cur) * (1 - Math.exp(-dt * 7));
    if (Math.abs(tgt - cur) < .0004) cur = tgt;
    render(cur);
    if (active && cur !== tgt) raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && active) raf = requestAnimationFrame(loop); }
  function onScroll() {
    var r = root.getBoundingClientRect(), total = root.offsetHeight - innerHeight;
    tgt = clamp(-r.top / total); kick();
  }

  function init() {
    Promise.all(photoSrc.map(load).concat([load(wakeSrc)])).then(function (all) {
      images = all.slice(0, 4); var wk = all[4]; if (!wk || images.some(function (i) { return !i; })) return;
      samples = images.map(function (im) { return sampleCover(im, CX, CY); });
      wakePix = sampleCover(wk, TC, TR);
      ready = true; layout(); onScroll(); cur = tgt; render(cur);
    });
  }
  var loaded = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !loaded) { loaded = true; init(); }
        active = e.isIntersecting; if (active) { onScroll(); kick(); } else if (vidOn) { wakeVid.pause(); }
        if (active && vidOn && cur >= REV) wakeVid.play().catch(function () {});
      });
    }, { rootMargin: '600px 0px' }).observe(root);
  } else { loaded = true; active = true; init(); }
  addEventListener('scroll', function () { if (active) onScroll(); }, { passive: true });
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (ready) { layout(); render(cur); } }, 150); });
  window.__story = { set: function (p) { tgt = cur = p; render(p); } };
})();
