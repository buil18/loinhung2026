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
    msg.textContent = ''; msg.className = 'form-msg'; if (!submit.disabled) submit.textContent = 'Gửi xác nhận';
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
    submit.textContent = 'Đang gửi…';
    say('Đang gửi, bạn đợi một chút nhé…');

    /* Gửi dạng text/plain để Google Apps Script nhận được, và ĐỌC phản hồi để biết chắc đã lưu hay chưa.
       Quá 20 giây không có phản hồi thì coi là lỗi để khách bấm gửi lại. */
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);

    function fail(text) {
      clearTimeout(timer);
      say(text, 'is-err');
      submit.disabled = false;
      submit.textContent = 'Gửi lại';
    }

    fetch(C.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      return r.json();
    }).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) {
        try { localStorage.setItem('wedding_rsvp_name', name); } catch (err) {}
        say('✓ “Cảm ơn bạn đã hồi đáp. Hẹn gặp bạn trong ngày vui!”', 'is-ok');
        submit.textContent = 'Đã gửi';
        if (wish) W.addWish({ name: name, wish: wish });
        form.elements.wish.value = '';
        setTimeout(function () {
          close();
          submit.disabled = false;
          submit.textContent = 'Gửi xác nhận';
          W.toast('Đã gửi xác nhận tham dự. Cảm ơn bạn!');
        }, 2200);
      } else {
        fail('“Rất tiếc, xác nhận chưa được gửi đi. Bạn vui lòng thử lại nhé!”' + (res && res.error ? ' (' + res.error + ')' : '') + '. Bạn bấm "Gửi lại" giúp mình nhé.');
      }
    }).catch(function () {
      fail('Rất tiếc, xác nhận chưa được gửi đi. Bạn vui lòng thử lại nhé! bạn bấm "Gửi lại" nhé.');
    });
  });
})();