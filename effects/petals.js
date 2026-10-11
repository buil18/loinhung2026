/* petals.js — cánh hoa rơi nhẹ trên màn mở thiệp (canvas, tự dừng khi thiệp mở) */
(function () {
  'use strict';

  var cv = document.getElementById('petals');
  if (!cv || !cv.getContext) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ctx = cv.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0, raf = 0, petals = [];
  var COUNT = 22;
  // Màu cánh hoa lấy từ biến --petal trong css/base.css
  var COLOR = (getComputedStyle(document.documentElement).getPropertyValue('--petal') || '').trim() || '#f7dde4';

  function size() {
    w = cv.clientWidth; h = cv.clientHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function make(initial) {
    return {
      x: Math.random() * w,
      y: initial ? Math.random() * h : -20,
      r: 5 + Math.random() * 7,
      vy: 0.45 + Math.random() * 0.8,
      vx: -0.2 + Math.random() * 0.5,
      rot: Math.random() * 6.28,
      vr: (Math.random() - 0.5) * 0.04,
      sway: Math.random() * 6.28,
      a: 0.4 + Math.random() * 0.45
    };
  }

  function draw(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = COLOR;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, 6.2832);
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (var i = 0; i < petals.length; i++) {
      var p = petals[i];
      p.sway += 0.02;
      p.y += p.vy;
      p.x += p.vx + Math.sin(p.sway) * 0.5;
      p.rot += p.vr;
      if (p.y > h + 20) petals[i] = make(false);
      draw(petals[i]);
    }
    raf = requestAnimationFrame(frame);
  }

  function stop() { cancelAnimationFrame(raf); raf = 0; }

  size();
  for (var i = 0; i < COUNT; i++) petals.push(make(true));
  raf = requestAnimationFrame(frame);

  window.addEventListener('resize', size);
  document.addEventListener('wedding:open', function () { setTimeout(stop, 1400); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else if (!raf && !document.body.classList.contains('is-opened')) raf = requestAnimationFrame(frame);
  });
})();
