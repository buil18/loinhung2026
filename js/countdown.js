/* countdown.js — đồng hồ đếm ngược tới buổi lễ chính */
(function () {
  'use strict';
  var W = window.Wedding;
  var target = W.main.ts.getTime();
  var d = W.$('#cdD'), h = W.$('#cdH'), m = W.$('#cdM'), s = W.$('#cdS');
  var note = W.$('#cdNote');
  var groomFirst = document.body.getAttribute('data-first') === 'groom';
  var names = groomFirst ? W.C.groom.short + ' & ' + W.C.bride.short : W.C.bride.short + ' & ' + W.C.groom.short;

  function fill(days, hh, mm, ss) {
    d.textContent = days < 100 ? W.pad(days) : String(days);
    h.textContent = W.pad(hh);
    m.textContent = W.pad(mm);
    s.textContent = W.pad(ss);
  }

  function setNote(days) {
    note.textContent = '';
    if (days > 0) {
      note.appendChild(document.createTextNode('Còn '));
      note.appendChild(W.el('strong', '', String(days)));
      note.appendChild(document.createTextNode(' ngày nữa là đến lễ cưới của '));
      note.appendChild(W.el('span', 'cd-names', names));
      note.appendChild(document.createTextNode('.'));
    } else if (days === 0) {
      note.textContent = 'Hôm nay là ngày vui của ' + names + '!';
    } else {
      note.textContent = 'Cảm ơn bạn đã đồng hành cùng ' + names + '.';
    }
  }

  function tick() {
    var diff = target - Date.now();
    if (diff <= 0) {
      fill(0, 0, 0, 0);
      setNote(Date.now() - target < 864e5 ? 0 : -1);
      return;
    }
    var sec = Math.floor(diff / 1000);
    var days = Math.floor(sec / 86400);
    fill(days, Math.floor(sec % 86400 / 3600), Math.floor(sec % 3600 / 60), sec % 60);
    setNote(days);
  }

  tick();
  setInterval(tick, 1000);
})();
