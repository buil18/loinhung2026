# Thiệp cưới online — Tiến Lợi

Thiệp cưới tĩnh (HTML/CSS/JS thuần, không cần build), chạy trực tiếp trên GitHub Pages.
Xác nhận tham dự và lời chúc được lưu vào Google Sheet qua Google Apps Script.

## Cấu trúc thư mục

```
wedding-invite/
├─ index.html            Khung trang, 12 khối
├─ css/
│  ├─ base.css           Màu, font, nút, khung ảnh
│  └─ sections.css       Giao diện từng khối
├─ js/
│  ├─ config.js          ⭐ File duy nhất cần sửa để đổi thông tin
│  ├─ app.js             Đổ dữ liệu vào trang, album, mừng cưới
│  ├─ countdown.js       Đếm ngược
│  ├─ calendar.js        Lịch tháng + thêm vào Google Calendar
│  ├─ guestbook.js       Đọc lời chúc từ Google Sheet
│  └─ rsvp.js            Form xác nhận tham dự
├─ effects/              ✨ Toàn bộ hiệu ứng
│  ├─ effects.css        Mọi animation (hiện dần, mở thiệp, sóng, nút nhạc…)
│  ├─ reveal.js          Hiện dần khi cuộn
│  ├─ cover.js           Màn mở thiệp + chữ chạy từng ký tự
│  ├─ petals.js          Cánh hoa rơi
│  ├─ music.js           Nhạc nền + nút bật/tắt
│  └─ lightbox.js        Xem ảnh album phóng to
├─ assets/
│  ├─ images/            📷 Bạn tự upload ảnh vào đây (xem bảng bên dưới)
│  ├─ music/             🎵 wedding.mp3
│  └─ qr/                Mã QR mừng cưới (groom.png, bride.png)
└─ backend/
   ├─ Code.gs            Google Apps Script (ghi Sheet + lấy dữ liệu về)
   └─ README.md          Cách cài backend
```

## 12 khối của thiệp

1. Màn mở thiệp (có nút SKIP) → 2. Bìa → 3. Lời mời (tên khách) → 4. Hai họ + các buổi lễ
→ 5. Lịch + đếm ngược → 6. Lịch trình → 7. Địa điểm + bản đồ → 8. Album → 9. Sổ lưu bút
→ 10. Mừng cưới → 11. Xác nhận tham dự → 12. Lời cảm ơn

## Việc cần làm (theo thứ tự)

1. **Sửa `js/config.js`**: tên cô dâu, tên bố mẹ hai bên, ngày giờ các buổi lễ, địa điểm, tài khoản mừng cưới.
   Mọi chỗ có dấu `[ ... ]` là thông tin giữ chỗ.
2. **Cài backend** theo `backend/README.md` (5 phút), rồi dán link `/exec` vào `apiUrl` trong `config.js`
   (hiện đã điền sẵn link bạn cung cấp).
3. **Upload ảnh / nhạc** vào `assets/` đúng tên file như bảng dưới. Chưa có ảnh thì trang vẫn chạy,
   chỗ ảnh hiện ô giữ chỗ ghi tên file cần thêm.
4. **Đưa lên GitHub Pages** (bên dưới).

## Ảnh cần upload

| File | Dùng ở | Gợi ý |
|---|---|---|
| `assets/images/cover.jpg` | Màn mở thiệp (toàn màn hình) | Dọc, 1080×1920, chủ thể ở giữa |
| `assets/images/hero.jpg` | Bìa thiệp (khung polaroid) | Dọc tỉ lệ 3:4, ví dụ 900×1200 |
| `assets/images/gallery-01.jpg` … `gallery-09.jpg` | Album | Dọc tỉ lệ 3:4, ~900×1200, mỗi ảnh < 300 KB |
| `assets/images/ending.jpg` | Lời cảm ơn | Dọc hoặc vuông, 1080×1350 |
| `assets/images/og.jpg` | Ảnh xem trước khi gửi link qua Zalo/Facebook | 1200×630 |
| `assets/qr/groom.png`, `bride.png` | QR mừng cưới | Vuông. Không có thì xoá dòng `qr` trong `config.js` |
| `assets/music/wedding.mp3` | Nhạc nền | Dưới 5 MB. Dùng bản nhạc bạn có quyền sử dụng |

Đổi số lượng ảnh album: sửa `gallery.count` trong `config.js`. Nên nén ảnh (ví dụ squoosh.app) để thiệp mở nhanh trên 4G.

## Đưa lên GitHub Pages

1. Tạo repository mới trên GitHub, upload toàn bộ nội dung thư mục này (hoặc `git push`).
2. Vào **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   chọn nhánh `main`, thư mục `/ (root)`, bấm **Save**.
3. Sau 1–2 phút trang chạy tại `https://<tên-github>.github.io/<tên-repo>/`.

## Gửi thiệp theo tên từng khách

Thêm `?to=` và tên khách vào cuối link, ví dụ:

```
https://<tên-github>.github.io/<tên-repo>/?to=Anh%20Nam
```

Tên sẽ hiện ở khối lời mời và tự điền sẵn vào form xác nhận. Không có `?to=` thì hiện "Quý khách".
Mẹo: dùng Google Sheet với công thức `=ENCODEURL(A2)` để tạo nhanh link cho cả danh sách khách.

## Xem thử trên máy

Mở bằng một server tĩnh (không nên mở thẳng file vì một số trình duyệt chặn nhạc/bản đồ):

```
python3 -m http.server 8080
```

rồi vào http://localhost:8080.

## Lưu ý

- `apiUrl` nằm trong code công khai trên GitHub. Ai có link đều gửi được dữ liệu vào Sheet của bạn.
  Backend đã giới hạn độ dài, chặn công thức độc hại và có ô bẫy spam, nhưng nếu cần chặt hơn hãy kiểm duyệt định kỳ.
  Muốn ẩn một lời chúc khỏi thiệp, chỉ cần xoá dòng đó trong Sheet.
- Thống kê số khách: mở trực tiếp Google Sheet, hoặc dùng `?action=summary` (xem `backend/README.md`).


## Đổi font chữ

Mở `css/base.css`, sửa khối **FONT CHỮ** ở đầu file (`--font-body`, `--font-display`, `--font-names`, …). Thiệp tự tải font Google tương ứng (file `js/fonts.js`), không phải thêm link nào. Ở cuối file có 6 bộ font mẫu (A–F) để chép thay vào. Chọn font có hỗ trợ tiếng Việt (xem trên fonts.google.com, lọc "Vietnamese"). Font chữ viết tay: đặt `--names-anim: word` để tên không bị đứt nét.
