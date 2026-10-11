/* calendar.js — lịch tháng của ngày cưới + nút thêm vào Google Calendar */
(function () {
  'use strict';
  var W = window.Wedding;
  var m = W.main;

  W.$('#calDate').textContent = W.pad(m.d) + '.' + W.pad(m.m) + '.' + m.y;
  W.$('#calSub').textContent = m.weekday + ', ' + W.pad(m.hh) + ':' + W.pad(m.mm);

  var grid = W.$('#calGrid');
  grid.appendChild(W.el('p', 'cal-month', 'Tháng ' + m.m + ', ' + m.y));

  var head = W.el('div', 'cal-row cal-head');
  ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].forEach(function (t, i) {
    head.appendChild(W.el('span', i === 6 ? 'is-sun' : '', t));
  });
  grid.appendChild(head);

  var body = W.el('div', 'cal-row cal-body');
  var offset = (new Date(m.y, m.m - 1, 1).getDay() + 6) % 7;   // tuần bắt đầu từ thứ 2
  var days = new Date(m.y, m.m, 0).getDate();
  var i, cell;
  for (i = 0; i < offset; i++) body.appendChild(W.el('span', 'is-empty', ''));
  for (i = 1; i <= days; i++) {
    cell = W.el('span', '', String(i));
    if ((offset + i - 1) % 7 === 6) cell.classList.add('is-sun');
    if (i === m.d) cell.classList.add('is-wedding');
    body.appendChild(cell);
  }
  grid.appendChild(body);

  /* Google Calendar: giờ theo múi giờ Việt Nam, giả định kéo dài 3 tiếng */
  function stamp(y, mo, d, hh, mm) {
    return '' + y + W.pad(mo) + W.pad(d) + 'T' + W.pad(hh) + W.pad(mm) + '00';
  }
  var endH = m.hh + 3;
  var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent('Đám cưới ' + W.C.groom.short + ' & ' + W.C.bride.short)
    + '&dates=' + stamp(m.y, m.m, m.d, m.hh, m.mm) + '/' + stamp(m.y, m.m, m.d, Math.min(endH, 23), m.mm)
    + '&ctz=Asia%2FHo_Chi_Minh'
    + '&location=' + encodeURIComponent((W.C.location.name + ' - ' + W.C.location.address));
  W.$('#addCal').href = url;
})();
