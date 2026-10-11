/* rsvp.js — form xác nhận tham dự, gửi về Google Sheet qua Apps Script */
(function () {
  'use strict';
  var W = window.Wedding, C = W.C;

  var sheet = W.$('#rsvpSheet');
  var form = W.$('#rsvpForm');
  var msg = W.$('#formMsg');
  var submit = W.$('#rsvpSubmit');
  var countField = W.$('#countField');
  var lastFocus = null;

  /* ---- đổ lựa chọn vào form ---- */
  var sideSel = form.elements.side;
  sideSel.appendChild(new Option('Chọn…', ''));
  C.sides.forEach(function (s) { sideSel.appendChild(new Option(s, s)); });

  var countSel = form.elements.count;
  for (var i = 1; i <= C.maxGuests; i++) countSel.appendChild(new Option(i + ' người', String(i)));

  /* nhớ họ tên / lấy từ link ?to= */
  try {
    var saved = localStorage.getItem('wedding_rsvp_name');
    if (W.guest) form.elements.name.value = W.guest;
    else if (saved) form.elements.name.value = saved;
  } catch (e) { if (W.guest) form.elements.name.value = W.guest; }

  /* ---- mở / đóng ---- */
  function open() {
    lastFocus = document.activeElement;
    msg.textContent = ''; msg.className = 'form-msg';
    sheet.hidden = false;
    requestAnimationFrame(function () { sheet.classList.add('is-open'); });
    document.body.classList.add('is-locked');
    setTimeout(function () { form.elements.name.focus(); }, 250);
  }
  function close() {
    sheet.classList.remove('is-open');
    setTimeout(function () { sheet.hidden = true; }, 280);
    document.body.classList.remove('is-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  W.$('#rsvpOpen').addEventListener('click', open);
  sheet.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !sheet.hidden) close(); });

  /* ---- số người chỉ cần khi có tham dự ---- */
  function syncCount() {
    var yes = form.elements.attend.value === 'Có tham dự';
    countField.classList.toggle('is-off', !yes);
    countSel.disabled = !yes;
  }
  Array.prototype.forEach.call(form.querySelectorAll('input[name=attend]'), function (r) {
    r.addEventListener('change', syncCount);
  });
  syncCount();

  function say(text, kind) { msg.textContent = text; msg.className = 'form-msg ' + (kind || ''); }

  /* ---- gửi ---- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var name = form.elements.name.value.trim();
    var side = form.elements.side.value;
    var attend = form.elements.attend.value;
    var wish = form.elements.wish.value.trim();

    if (!name) { say('Bạn vui lòng nhập họ và tên.', 'is-err'); form.elements.name.focus(); return; }
    if (!side) { say('Bạn vui lòng chọn là khách của ai.', 'is-err'); sideSel.focus(); return; }
    if (!C.apiUrl) { say('Chưa cấu hình apiUrl trong js/config.js.', 'is-err'); return; }

    var payload = {
      name: name,
      side: side,
      attend: attend,
      count: attend === 'Có tham dự' ? Number(countSel.value) : 0,
      wish: wish,
      hp: form.elements.hp.value
    };

    submit.disabled = true;
    say('Đang gửi…');

    /* Apps Script không trả header CORS cho POST, nên dùng no-cors + text/plain:
       trình duyệt vẫn gửi đi bình thường, chỉ là không đọc được phản hồi. */
    fetch(C.apiUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function () {
      try { localStorage.setItem('wedding_rsvp_name', name); } catch (err) {}
      say('Cảm ơn bạn! Chúng mình đã nhận được xác nhận.', 'is-ok');
      if (wish) W.addWish({ name: name, wish: wish });
      form.elements.wish.value = '';
      setTimeout(function () { close(); submit.disabled = false; W.toast('Đã gửi xác nhận tham dự'); }, 1500);
    }).catch(function () {
      say('Không gửi được, bạn kiểm tra mạng và thử lại nhé.', 'is-err');
      submit.disabled = false;
    });
  });
})();
