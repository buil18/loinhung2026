/* autoscroll.js — sau khi bấm "Mở thiệp", trang tự cuộn xuống nhẹ nhàng.
   Người xem chạm / vuốt / lăn chuột / bấm phím / bấm vào trang là dừng ngay, nhường lại cho họ tự cuộn.
   Chỉnh trong js/config.js (không bắt buộc):  autoScroll: { enabled: true, speed: 45, delay: 1600 }
     enabled: false = tắt hẳn | speed = số pixel mỗi giây (nhỏ = chậm) | delay = chờ bao nhiêu mili-giây sau khi mở */
(function () {
  'use strict';
  var W = window.Wedding;
  var cfg = (W && W.C && W.C.autoScroll) || {};
  if (cfg.enabled === false) return;
  /* Nhiều máy Windows tắt "hiệu ứng động" nên trình duyệt báo prefers-reduced-motion = reduce, khiến tự cuộn không chạy.
     Mặc định vẫn cuộn (người xem chạm vào là dừng). Muốn tôn trọng cài đặt đó thì đặt respectReducedMotion: true */
  if (cfg.respectReducedMotion === true && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var speed = cfg.speed || 45;
  var delay = cfg.delay == null ? 1600 : cfg.delay;
  var running = false, last = 0, acc = 0, rafId = 0, timer = 0;

  var STOP = ['wheel', 'touchstart', 'touchmove', 'mousedown', 'pointerdown', 'keydown'];

  function stop() {
    if (!running && !timer) return;
    running = false;
    clearTimeout(timer); timer = 0;
    cancelAnimationFrame(rafId);
    STOP.forEach(function (e) { window.removeEventListener(e, stop, true); });
  }

  function step(t) {
    if (!running) return;
    if (document.body.classList.contains('is-locked') || document.querySelector('.sheet:not([hidden]), .lightbox:not([hidden])')) { stop(); return; }
    acc += (t - last) / 1000 * speed;
    last = t;
    var px = Math.floor(acc);
    if (px >= 1) {
      acc -= px;
      var before = window.pageYOffset;
      window.scrollBy({ top: px, left: 0, behavior: 'instant' });   /* "instant" để không bị scroll-behavior:smooth của trang làm khựng */
      if (window.pageYOffset === before) { stop(); return; }         /* tới cuối trang */
    }
    rafId = requestAnimationFrame(step);
  }

  function start() {
    running = true;
    last = performance.now(); acc = 0;
    STOP.forEach(function (e) { window.addEventListener(e, stop, { capture: true, passive: true }); });
    rafId = requestAnimationFrame(step);
  }

  document.addEventListener('wedding:open', function () {
    /* Chờ màn mở thiệp trượt đi xong rồi mới cuộn; chạm vào trong lúc chờ cũng huỷ */
    STOP.forEach(function (e) { window.addEventListener(e, stop, { capture: true, passive: true }); });
    timer = setTimeout(function () { timer = 0; start(); }, delay);
  });
})();
