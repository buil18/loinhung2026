/* app.js — khởi tạo chung, đổ dữ liệu từ config.js vào trang */
(function () {
  'use strict';

  var C = window.WEDDING_CONFIG;
  var W = window.Wedding = { C: C };

  var WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

  /* ---------- tiện ích ---------- */
  var $ = W.$ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = W.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  W.el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  W.pad = function (n) { return (n < 10 ? '0' : '') + n; };

  W.toast = function (msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(W._toastTimer);
    W._toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2400);
  };

  /* Đọc ngày giờ từ config. Giờ luôn hiểu là giờ Việt Nam (+07:00). */
  W.parseEvent = function (ev) {
    var d = ev.date.split('-').map(Number);
    var t = (ev.time || '00:00').split(':').map(Number);
    var weekday = WEEKDAYS[new Date(Date.UTC(d[0], d[1] - 1, d[2])).getUTCDay()];
    return {
      title: ev.title, y: d[0], m: d[1], d: d[2], hh: t[0], mm: t[1],
      weekday: weekday, lunar: ev.lunar || '',
      ts: new Date(ev.date + 'T' + W.pad(t[0]) + ':' + W.pad(t[1]) + ':00+07:00')
    };
  };

  var events = C.ceremonies.map(W.parseEvent);
  var mainIdx = 0;
  C.ceremonies.forEach(function (c, i) { if (c.mainEvent) mainIdx = i; });
  W.events = events;
  W.main = events[mainIdx];

  /* ---------- gán text theo data-bind="groom.short" ---------- */
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, obj);
  }
  $$('[data-bind]').forEach(function (n) {
    var v = get(C, n.getAttribute('data-bind'));
    if (v != null) n.textContent = v;
  });

  document.title = 'Thiệp cưới ' + C.bride.short + ' & ' + C.groom.short;

  /* Thanh trạng thái trình duyệt điện thoại đổi theo màu nền --bg */
  var tc = document.querySelector('meta[name=theme-color]');
  var bgc = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (tc && bgc) tc.setAttribute('content', bgc);

  /* ---------- ngày trên cover + bìa ---------- */
  var m = W.main;
  var dateStr = W.pad(m.d) + ' / ' + W.pad(m.m) + ' / ' + m.y;
  $('#coverDate').textContent = dateStr;
  $('#heroDate').textContent = dateStr;
  $('#heroWeekday').textContent = m.weekday;

  /* ---------- tên khách mời: ?to=Tên Khách ---------- */
  var q = new URLSearchParams(location.search).get('to');
  var guest = q ? q.trim().slice(0, 60) : '';
  W.guest = guest;
  $('#inviteLead').textContent = C.text.inviteLead;
  var gn = $('#guestName');
  if (guest) { gn.textContent = guest; }
  else { gn.textContent = 'Quý khách'; gn.classList.add('is-placeholder'); }
  var body = $('#inviteBody');
  C.text.inviteBody.forEach(function (t) { body.appendChild(W.el('p', '', t)); });

  /* ---------- hai họ ---------- */
  function family(host, label, p) {
    host.appendChild(W.el('p', 'family-title', label));
    if (p.father) host.appendChild(W.el('p', 'family-name', p.father));
    if (p.mother) host.appendChild(W.el('p', 'family-name', p.mother));
    if (p.address) host.appendChild(W.el('p', 'family-addr', p.address));
  }
  family($('#groomFamily'), 'Nhà trai', C.groom);
  family($('#brideFamily'), 'Nhà gái', C.bride);

  /* ---------- các buổi lễ ---------- */
  var cer = $('#ceremonies');
  events.forEach(function (e, i) {
    var item = W.el('div', 'ceremony');
    item.setAttribute('data-reveal', '');
    item.appendChild(W.el('p', 'cer-name', e.title));
    item.appendChild(W.el('p', 'cer-time', W.pad(e.hh) + ':' + W.pad(e.mm)));
    var row = W.el('div', 'cer-date');
    row.appendChild(W.el('span', 'cer-wd', e.weekday));
    row.appendChild(W.el('span', 'cer-vr'));
    row.appendChild(W.el('span', 'cer-day', W.pad(e.d)));
    row.appendChild(W.el('span', 'cer-vr'));
    row.appendChild(W.el('span', 'cer-mo', 'Tháng ' + e.m));
    item.appendChild(row);
    item.appendChild(W.el('p', 'cer-year', String(e.y)));
    if (e.lunar) item.appendChild(W.el('p', 'cer-lunar', '(' + e.lunar + ')'));
    cer.appendChild(item);
  });

  /* ---------- lịch trình ---------- */
  var tl = $('#timeline');
  C.schedule.forEach(function (s) {
    var li = W.el('li', 'tl-item');
    li.setAttribute('data-reveal', '');
    li.appendChild(W.el('span', 'tl-time', s.time));
    li.appendChild(W.el('span', 'tl-dot'));
    li.appendChild(W.el('span', 'tl-title', s.title));
    tl.appendChild(li);
  });

  /* ---------- địa điểm ---------- */
  var L = C.location;
  $('#locName').textContent = L.name;
  $('#locAddr').textContent = L.address;
  $('#locNote').textContent = L.note || '';
  var mapWrap = $('#mapWrap');
  if (L.mapQuery) {
    var f = document.createElement('iframe');
    f.loading = 'lazy';
    f.title = 'Bản đồ địa điểm';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.src = 'https://www.google.com/maps?q=' + encodeURIComponent(L.mapQuery) + '&output=embed';
    mapWrap.appendChild(f);
  } else {
    mapWrap.classList.add('map-empty');
    mapWrap.appendChild(W.el('p', '', 'Điền mapQuery trong js/config.js để hiện bản đồ'));
  }
  var locBtn = $('#locBtn');
  var dest = L.mapLink || (L.mapQuery ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(L.mapQuery) : '');
  if (dest) locBtn.href = dest; else locBtn.hidden = true;

  /* ---------- album ---------- */
  var G = C.gallery;
  var grid = $('#galleryGrid');
  W.galleryFiles = [];
  for (var i = 1; i <= G.count; i++) {
    var src = G.prefix + W.pad(i) + G.ext;
    var fig = W.el('button', 'tile photo' + (i > G.visible ? ' is-extra' : ''));
    fig.type = 'button';
    fig.setAttribute('data-label', 'Ảnh ' + W.pad(i));
    fig.setAttribute('data-index', String(i - 1));
    if (i > G.visible) fig.hidden = true;
    var im = document.createElement('img');
    im.loading = 'lazy'; im.alt = 'Ảnh cưới ' + i; im.src = src;
    im.onerror = function () { this.parentNode.classList.add('no-img'); this.remove(); };
    fig.appendChild(im);
    grid.appendChild(fig);
    W.galleryFiles.push(src);
  }
  var moreBtn = $('#galleryMore');
  if (G.count <= G.visible) { moreBtn.hidden = true; $('#galleryFade').hidden = true; }
  moreBtn.addEventListener('click', function () {
    var extras = $$('.is-extra', grid);
    extras.forEach(function (n, k) {
      n.hidden = false;
      n.style.animationDelay = (k * 70) + 'ms';
      n.classList.add('pop');
    });
    $('#galleryFade').hidden = true;
    moreBtn.hidden = true;
  });

  /* ---------- mừng cưới ---------- */
  var gl = $('#giftList');
  C.gifts.forEach(function (g) {
    var box = W.el('div', 'gift-card');
    box.setAttribute('data-reveal', '');
    box.appendChild(W.el('p', 'gift-side', g.side));
    if (g.qr) {
      var qr = W.el('div', 'photo gift-qr');
      qr.setAttribute('data-label', 'QR');
      var qi = document.createElement('img');
      qi.alt = 'Mã QR ' + g.side; qi.src = g.qr; qi.loading = 'lazy';
      qi.onerror = function () { this.parentNode.remove(); };
      qr.appendChild(qi);
      box.appendChild(qr);
    }
    box.appendChild(W.el('p', 'gift-holder', g.holder));
    box.appendChild(W.el('p', 'gift-bank', g.bank));
    var line = W.el('div', 'gift-num');
    line.appendChild(W.el('span', '', g.number));
    var cp = W.el('button', 'copy', 'Sao chép');
    cp.type = 'button';
    cp.addEventListener('click', function () { W.copy(g.number); });
    line.appendChild(cp);
    box.appendChild(line);
    gl.appendChild(box);
  });

  W.copy = function (text) {
    function done() { W.toast('Đã sao chép số tài khoản'); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else { fallback(); }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { W.toast('Không sao chép được'); }
      document.body.removeChild(ta);
    }
  };

  /* ---------- lời cảm ơn ---------- */
  $('#thanksText').textContent = C.text.thanks;
  $('#footText').textContent = C.text.footer;
})();
