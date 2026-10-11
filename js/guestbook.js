/* guestbook.js — sổ lưu bút: đọc lời chúc từ Google Sheet (backend/Code.gs, action=wishes) */
(function () {
  'use strict';
  var W = window.Wedding;
  var box = W.$('#notes');
  var hint = W.$('#notesHint');
  var isSample = true;

  var SAMPLE = [
    { name: 'Khách mời', wish: 'Chúc hai bạn trăm năm hạnh phúc, mãi bên nhau như ngày đầu!' },
    { name: 'Bạn bè', wish: 'Chúc hai bạn một đời ngọt ngào, nhiều niềm vui và thật nhiều sức khoẻ.' },
    { name: 'Người thân', wish: 'Mong những ngày phía trước luôn dịu dàng và rực rỡ với hai con.' }
  ];

  function note(w, idx) {
    var n = W.el('article', 'note');
    n.classList.add('note-' + (idx % 4));          // màu giấy nhớ: --note-1..4 trong css/base.css
    n.style.setProperty('--tilt', (idx % 2 ? 1.2 : -1.2) + 'deg');
    n.appendChild(W.el('p', 'note-text', w.wish));
    var from = W.el('p', 'note-from', '— ' + w.name);
    n.appendChild(from);
    if (w.time) n.appendChild(W.el('p', 'note-time', w.time));
    return n;
  }

  function render(list, sample) {
    isSample = !!sample;
    box.textContent = '';
    list.forEach(function (w, i) { box.appendChild(note(w, i)); });
    hint.textContent = sample ? '(Nội dung mẫu) Lời chúc thật của bạn bè sẽ hiện ở đây.' : '';
    box.scrollLeft = 0;
  }

  /* Thêm ngay lời chúc vừa gửi (không cần tải lại trang) */
  W.addWish = function (w) {
    var list = isSample ? [] : W.$$('.note', box).map(function (n) {
      return { name: n.querySelector('.note-from').textContent.replace(/^—\s*/, ''), wish: n.querySelector('.note-text').textContent };
    });
    list.unshift({ name: w.name, wish: w.wish });
    render(list, false);
  };

  function load() {
    var url = W.C.apiUrl;
    if (!url) { render(SAMPLE, true); return; }
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    fetch(url + (url.indexOf('?') > -1 ? '&' : '?') + 'action=wishes&limit=30', ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { return r.json(); })
      .then(function (data) {
        clearTimeout(timer);
        if (data && data.ok && data.wishes && data.wishes.length) render(data.wishes, false);
        else render(SAMPLE, true);
      })
      .catch(function () { clearTimeout(timer); render(SAMPLE, true); });
  }

  load();
})();
