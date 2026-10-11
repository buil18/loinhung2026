/* lightbox.js — bấm vào ảnh trong album để xem lớn, vuốt hoặc dùng phím ←/→ để chuyển ảnh */
(function () {
  'use strict';

  var W = window.Wedding;
  var lb = document.getElementById('lightbox');
  var img = document.getElementById('lbImg');
  var grid = document.getElementById('galleryGrid');
  if (!lb || !grid) return;

  var list = [];
  var idx = 0;
  var startX = 0;

  function collect() {
    list = Array.prototype.slice.call(grid.querySelectorAll('.tile:not(.no-img) img'))
      .map(function (i) { return i.currentSrc || i.src; });
  }
  function show(i) {
    idx = (i + list.length) % list.length;
    img.src = list[idx];
  }
  function open(i) {
    lb.hidden = false;
    document.body.classList.add('is-locked');
    show(i);
  }
  function close() {
    lb.hidden = true;
    img.removeAttribute('src');
    document.body.classList.remove('is-locked');
  }

  grid.addEventListener('click', function (e) {
    var tile = e.target.closest('.tile');
    if (!tile || tile.classList.contains('no-img')) return;
    collect();
    var src = tile.querySelector('img').currentSrc || tile.querySelector('img').src;
    var i = list.indexOf(src);
    if (i > -1) open(i);
  });

  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', function () { show(idx - 1); });
  lb.querySelector('.lb-next').addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });

  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(idx - 1);
    else if (e.key === 'ArrowRight') show(idx + 1);
  });

  lb.addEventListener('touchstart', function (e) { startX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
  }, { passive: true });
})();
