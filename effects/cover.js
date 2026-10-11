/* cover.js — màn mở thiệp: chữ hiện từng ký tự, nút "Mở thiệp" / SKIP, trượt lên khi mở */
(function () {
  'use strict';

  var W = window.Wedding;
  var cover = document.getElementById('cover');
  if (!cover) return;

  /* Tách tên thành từng ký tự để chạy hiệu ứng */
  Array.prototype.forEach.call(cover.querySelectorAll('.cover-name'), function (node, i) {
    var text = node.textContent;
    node.textContent = '';
    node.setAttribute('aria-label', text);
    Array.prototype.forEach.call(text, function (ch, k) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = ch === ' ' ? ' ' : ch;
      s.style.animationDelay = (0.5 + i * 0.7 + k * 0.07) + 's';
      node.appendChild(s);
    });
  });

  var opened = false;
  function open() {
    if (opened) return;
    opened = true;
    document.body.classList.add('is-opened');
    cover.classList.add('is-open');
    document.body.classList.remove('is-locked');
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent('wedding:open'));
    setTimeout(function () { cover.hidden = true; }, 1300);
  }

  Array.prototype.forEach.call(cover.querySelectorAll('[data-cover-open]'), function (b) {
    b.addEventListener('click', open);
  });
  W.openCover = open;

  /* Nền mờ hai bên lấy từ chính ảnh bìa (chỉ hiện khi ảnh tải được) */
  var coverImg = cover.querySelector('.cover-bg img');
  var side = cover.querySelector('.cover-side');
  function showSide() {
    if (!coverImg || !side || !coverImg.naturalWidth) return;
    side.style.backgroundImage = 'url("' + (coverImg.currentSrc || coverImg.src) + '")';
    side.classList.add('is-on');
  }
  if (coverImg) {
    if (coverImg.complete) showSide();
    else coverImg.addEventListener('load', showSide);
  }

  /* Ảnh ngang cho máy tính: nếu có file cover-wide.jpg thì dùng khi màn hình rộng */
  var wideSrc = (W.C.images && W.C.images.coverWide) || 'assets/images/cover-wide.jpg';
  var host = cover.querySelector('.cover-bg');
  if (host && wideSrc) {
    var wide = new Image();
    wide.className = 'cover-wide-img';
    wide.alt = '';
    wide.onload = function () { host.appendChild(wide); cover.classList.add('has-wide'); };
    wide.src = wideSrc;
  }
})();
