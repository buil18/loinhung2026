/* music.js — nhạc nền tự phát khi mở trang + nút bật/tắt.

   Cách hoạt động:
   1. Vừa tải trang là thử phát ngay.
   2. Trình duyệt (nhất là điện thoại) thường chặn nhạc có tiếng khi khách chưa chạm vào trang.
      Nếu bị chặn, nhạc sẽ tự phát ở lần chạm / bấm / nhấn phím đầu tiên ở bất kỳ đâu.
   3. Khách bấm nút tròn để tắt/bật; nếu đã tự tắt thì thiệp không tự bật lại. */
(function () {
  'use strict';

  var W = window.Wedding;
  var src = W.C.music && W.C.music.src;
  var btn = document.getElementById('musicBtn');
  if (!src || !btn) return;

  var audio = new Audio();
  audio.loop = true;
  audio.preload = 'auto';
  audio.src = src;

  var userPaused = false;     // khách chủ động tắt nhạc
  var resumeOnShow = false;   // tạm dừng vì chuyển tab
  var failed = false;         // không có file nhạc
  var GESTURES = ['pointerdown', 'touchend', 'click', 'keydown'];

  function setPlaying(on) {
    btn.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function play() {
    if (failed || userPaused) return;
    var p = audio.play();
    if (p && p.then) {
      p.then(function () { setPlaying(true); disarm(); },
             function () { setPlaying(false); arm(); });
    }
  }

  /* Chờ cú chạm đầu tiên rồi phát */
  function onGesture(e) {
    if (e.target && e.target.closest && e.target.closest('#musicBtn')) return;  // nút nhạc tự xử lý
    play();
  }
  function arm() {
    GESTURES.forEach(function (t) { document.addEventListener(t, onGesture, true); });
  }
  function disarm() {
    GESTURES.forEach(function (t) { document.removeEventListener(t, onGesture, true); });
  }

  audio.addEventListener('canplay', function () { btn.hidden = false; });
  audio.addEventListener('error', function () { failed = true; btn.hidden = true; disarm(); });

  btn.addEventListener('click', function () {
    if (audio.paused) { userPaused = false; play(); }
    else { userPaused = true; audio.pause(); setPlaying(false); }
  });

  // Tạm dừng khi khách chuyển sang tab/ứng dụng khác, quay lại thì phát tiếp
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && !audio.paused) { audio.pause(); resumeOnShow = true; }
    else if (!document.hidden && resumeOnShow) { resumeOnShow = false; play(); }
  });

  // Dự phòng: khi bấm "Mở thiệp" mà nhạc chưa phát thì phát luôn
  document.addEventListener('wedding:open', function () { if (audio.paused) play(); });

  play();   // thử tự phát ngay khi tải trang
})();
