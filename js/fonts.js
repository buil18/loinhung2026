/* fonts.js — tự nạp font cho thiệp theo các biến --font-* trong css/base.css.
   Muốn đổi font: chỉ sửa khối "FONT CHỮ" ở đầu css/base.css.

   Cách nạp (tự động, theo thứ tự):
   1. Tên bạn ghi đã có @font-face trong CSS  -> dùng luôn.
   2. Bạn khai báo file ở bảng FONT_FILES bên dưới -> nạp file đó.
   3. Thử font Google Fonts theo tên.
   4. Không phải font Google -> tự tìm file trong assets/fonts/ theo tên
      (ví dụ 'VL Bodega Script' -> assets/fonts/VL-Bodega-Script.woff2 / .ttf / .otf ...).
   5. Vẫn không có -> dùng font kế tiếp trong dòng (và báo ở Console, bấm F12 để xem). */
(function () {
  'use strict';

  /* ===== BẢNG FONT TỰ CÓ (không bắt buộc) =====
     Ghi tên font (đúng như trong css/base.css) và đường dẫn tới file. Có thể liệt kê nhiều file cho một tên
     để chọn độ đậm: { file: '...', weight: '700' }.
     Ví dụ:
       'VL Bodega Script': 'assets/fonts/VL-Bodega-Script.ttf',
       'Font Của Tôi': [ { file: 'assets/fonts/MyFont-Regular.woff2' }, { file: 'assets/fonts/MyFont-Bold.woff2', weight: '700' } ]
  */
  var FONT_FILES = {
  };

  var root = document.documentElement;
  var cs = getComputedStyle(root);
  var LOCAL = /^(times new roman|times|georgia|arial|helvetica|verdana|tahoma|trebuchet ms|palatino|garamond|courier new|serif|sans-serif|cursive|monospace|system-ui|-apple-system|segoe ui|roboto)$/i;
  var EXTS = ['woff2', 'woff', 'ttf', 'otf'];

  function warn(msg) { if (window.console) console.warn('[fonts] ' + msg); }

  /* Tên font đã khai báo @font-face trong CSS */
  var declared = {};
  try {
    Array.prototype.forEach.call(document.styleSheets, function (sh) {
      var rules; try { rules = sh.cssRules; } catch (e) { return; }
      Array.prototype.forEach.call(rules || [], function (r) {
        if (r.type === 5 && r.style) declared[r.style.getPropertyValue('font-family').replace(/["']/g, '').trim().toLowerCase()] = 1;
      });
    });
  } catch (e) {}

  /* Nạp một file font bằng FontFace API */
  function loadFile(name, file, weight) {
    var face = new FontFace(name, 'url("' + file + '")', { weight: weight || '400', style: 'normal', display: 'swap' });
    return face.load().then(function (f) { document.fonts.add(f); return f; });
  }

  /* Thử lần lượt các tên file đoán được trong assets/fonts/ */
  function guessFiles(name) {
    var base = name.trim();
    var names = [base.replace(/\s+/g, '-'), base.replace(/\s+/g, ''), base.replace(/\s+/g, '_'), base];
    var list = [];
    names.forEach(function (n) { EXTS.forEach(function (e) { list.push('assets/fonts/' + n + '.' + e); }); });
    return list;
  }
  function tryList(name, list, i) {
    if (i >= list.length) { warn('Không tìm thấy font "' + name + '" (không có trên Google, không có file trong assets/fonts/). Đang dùng font thay thế.'); return; }
    loadFile(name, list[i]).catch(function () { tryList(name, list, i + 1); });
  }

  function addLink(url, onfail) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = url;
    if (onfail) l.onerror = onfail;
    document.head.appendChild(l);
  }
  function gHref(f, withWeights) {
    var n = encodeURIComponent(f).replace(/%20/g, '+');
    return 'https://fonts.googleapis.com/css?family=' + (withWeights ? n + ':300,400,500,600,700,400i' : n) + '&subset=vietnamese,latin&display=swap';
  }

  var seen = {};
  ['--font-body', '--font-display', '--font-names'].forEach(function (v) {
    var name = (cs.getPropertyValue(v) || '').split(',')[0].replace(/["']/g, '').trim();
    if (!name || LOCAL.test(name) || seen[name] || declared[name.toLowerCase()]) return;
    seen[name] = 1;

    /* 2. file khai báo thủ công */
    var manual = FONT_FILES[name];
    if (manual) {
      (Array.isArray(manual) ? manual : [{ file: manual }]).forEach(function (m) {
        loadFile(name, m.file, m.weight).catch(function () { warn('Không mở được file font: ' + m.file); });
      });
      return;
    }
    /* 3 + 4. Google trước, không có thì tìm file trong assets/fonts/ */
    var fallback = function () { tryList(name, guessFiles(name), 0); };
    addLink(gHref(name, true), function () { addLink(gHref(name, false), fallback); });
  });
})();