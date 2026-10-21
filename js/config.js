/* ==========================================================================
   FILE CẤU HÌNH DUY NHẤT — chỉ cần sửa file này để đổi toàn bộ nội dung thiệp.
   Mục nào có dấu [ ... ] là thông tin giữ chỗ, hãy thay bằng thông tin thật.
   ========================================================================== */
window.WEDDING_CONFIG = {

  /* 1. Link Google Apps Script (Web app) — nơi nhận RSVP và trả lời chúc.
        Xem backend/README.md để triển khai. */
  apiUrl: "https://script.google.com/macros/s/AKfycbxskzyGDOINFSB9LXcLZ_V7X0mjC08tHeMKKQEMkq3RFK2S69W7OV2Szx5jmJbgC50V/exec",

  /* 2. Chú rể / Cô dâu */
  groom: {
    short: "Tiến Lợi",                          // tên hiển thị lớn
    full: "Tiến Lợi"                            // tên đầy đủ (ví dụ: Bùi Trần Tiến Lợi)
  },
  bride: {
    short: "Tuyết Nhung",
    full: "Tuyết Nhung"
  },

  /* 3. Các buổi lễ. date: YYYY-MM-DD, time: HH:MM (giờ Việt Nam).
        lunar để trống "" nếu không muốn hiện ngày âm lịch.
        Buổi có mainEvent = true là ngày dùng cho lịch + đếm ngược. */
  ceremonies: [
    { title: "Lễ Hôn Phối",    date: "2026-11-14", time: "05:00", lunar: "", mainEvent: false },
    { title: "Lễ Vu Quy", date: "2026-11-14", time: "09:00", lunar: "", mainEvent: true  }
  ],

  /* 4. Lịch trình trong ngày cưới (của buổi chính) */
  schedule: [
    { time: "05:00", title: "Thánh lễ hôn phối" },
    { time: "09:00", title: "Lễ gia tiên" },
    { time: "10:30", title: "Đón khách" },
    { time: "10:45", title: "Làm lễ" },
    { time: "11:00", title: "Khai tiệc" },
    { time: "13:00", title: "Tiễn khách" }
  ],

  /* 5. Địa điểm (bản đồ được nhúng từ mapQuery) */
  location: {
    name: "Tư gia nhà gái",
    address: "Số nhà 26 đường 42 thôn 10 Xã Nam Thành Tỉnh Lâm Đồng",
    mapQuery: "7G9J+5R8 Nam Thành, Lâm Đồng, Việt Nam",                            // ví dụ: "Nhà hàng ABC, 12 Lê Lợi, Quận 1, TP.HCM"
    mapLink: "https://maps.app.goo.gl/Aq9CyPNamcPnHWmN7",                             // (tuỳ chọn) link Google Maps để nút "Chỉ đường" mở đúng
  },

  /* 6. Album: ảnh đặt trong assets/images/ theo tên gallery-01.jpg, gallery-02.jpg ... */
  gallery: { count: 12, visible: 6, prefix: "assets/photos/gallery-", ext: ".jpg" },

  /* 7. Mừng cưới. qr: ảnh mã QR đặt trong assets/qr/ (xoá dòng qr nếu chưa có) */
  gifts: [
    { side: "Nhà trai", holder: "BUI TIEN LOI", bank: "TP Bank", number: "01326254702", qr: "assets/qr/groom.png" },
    { side: "Nhà gái",  holder: "NGUYEN THI TUYET NHUNG", bank: "TP Bank", number: "00902455096", qr: "assets/qr/bride.png" }
  ],

  /* 8. Nhạc nền: đặt file mp3 vào assets/music/. Để src = "" nếu không dùng nhạc. */
  music: { src: "assets/music/wedding.mp3" },
  autoScroll: { enabled: true, speed: 45, delay: 1600 },

  /* 9. Câu chữ */
  text: {
    inviteLead: "Trân trọng kính mời",
    inviteBody: [
      "Giữa những điều bình dị của cuộc sống, thật may mắn khi hai người tìm thấy nhau và chọn cùng nhau đi hết hành trình phía trước.",
      "Sẽ thật trọn vẹn nếu ngày vui ấy có sự hiện diện của bạn, cùng sẻ chia những khoảnh khắc hạnh phúc và đáng nhớ."
    ],
    thanks: "Cảm ơn bạn đã góp mặt trong niềm vui và hạnh phúc của chúng tôi.",
    footer: "With love"
  },

  /* 10. Các lựa chọn trong form RSVP — GIỮ NGUYÊN để khớp với backend/Code.gs */
  sides: ["Khách của Cô Dâu", "Khách của Chú Rể"],
  maxGuests: 10
};
