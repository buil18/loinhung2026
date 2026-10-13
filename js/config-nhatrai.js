/* ==========================================================================
   CẤU HÌNH RIÊNG CHO BẢN NHÀ TRAI (nhatrai.html)
   File này chỉ ghi đè những mục khác với bản nhà gái. Mọi mục không nhắc tới
   ở đây (ảnh, nhạc, tài khoản, lời chúc, link Google Sheet...) vẫn lấy từ js/config.js.
   Hiện tại các buổi lễ và lịch trình đang chép từ bản nhà gái — bạn sửa trực tiếp bên dưới.
   ========================================================================== */
(function () {
  var C = window.WEDDING_CONFIG;

  /* ---- 1. CÁC BUỔI LỄ của nhà trai ----
     date: YYYY-MM-DD, time: HH:MM (giờ Việt Nam).
     lunar để trống "" nếu không muốn hiện ngày âm lịch.
     Buổi có mainEvent: true là buổi dùng cho lịch + đếm ngược (chỉ để một buổi). */
  C.ceremonies = [
    { title: "Lễ Thành Hôn",   date: "2026-11-28", time: "10:00", lunar: "", mainEvent: true  }
  ];

  /* ---- 2. LỊCH TRÌNH trong ngày cưới (của buổi chính) ---- */
  C.schedule = [
    { time: "08:00", title: "Lễ đón dâu" },
    { time: "09:00", title: "Lễ gia tiên" },
    { time: "10:30", title: "Đón khách" },
    { time: "10:45", title: "Làm lễ" },
    { time: "11:00", title: "Khai tiệc" },
    { time: "13:00", title: "Tiễn khách" }
  ];

  /* ---- 3. ĐỊA ĐIỂM nhà trai ---- */
  C.location = Object.assign({}, C.location, {
    name: "Tư gia nhà trai",
    address: "Hồng Vũ, Hưng Yên",                    // có số nhà / thôn thì sửa tại đây
    mapQuery: "995V+XPC Hồng Vũ, Hưng Yên, Việt Nam",
    mapLink: ""                                       // dán link Google Maps vào đây nếu muốn nút "Chỉ đường" mở đúng link
  });
})();
