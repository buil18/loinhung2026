/* reveal.js — hiện dần các khối khi cuộn tới (thay cho AOS/GSAP, không cần thư viện)
   Dùng: thêm thuộc tính data-reveal (và tuỳ chọn data-delay="150") vào phần tử. */
(function () {
  'use strict';

  var els = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  var started = false;

  function show(el) {
    el.classList.add('is-visible');
    // xoá độ trễ sau khi hiện xong để không làm chậm các hiệu ứng hover về sau
    if (el.style.transitionDelay) setTimeout(function () { el.style.transitionDelay = ''; }, 1500);
  }

  function start() {
    if (started) return;
    started = true;

    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(show); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { show(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    els.forEach(function (el) {
      var d = el.getAttribute('data-delay');
      if (d) el.style.transitionDelay = d + 'ms';
      io.observe(el);
    });
  }

  // Chờ mở thiệp xong mới chạy để khối đầu tiên được thấy khi màn mở trượt lên
  if (document.getElementById('cover')) document.addEventListener('wedding:open', start);
  else start();
})();
