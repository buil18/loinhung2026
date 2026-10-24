# Final Check – Đối soát chốt chặn xuất hàng

Công cụ đối soát đơn xuất hàng giữa JDE và SAP trước khi xe ra cổng. Chạy trên Google Apps Script (Web App) kết hợp 3 bookmark gắn vào 3 trang: glassRUN, JDE, SAP.

## Thành phần

| Thư mục | Nội dung |
|---|---|
| `apps-script/Code.gs` | Phần xử lý trên Google: nhận dữ liệu từ 3 bookmark ("hộp thư"), áp quy tắc trạng thái, đối soát số lượng |
| `apps-script/Index.html` | Trang web đối soát: hộp thư tự động, kết quả, thời gian, nút đối soát lại, nút xóa dữ liệu |
| `bookmarks/gr-capture.js` | Bookmark glassRUN: lấy đơn chính và đơn tặng, tự gửi lên hộp thư |
| `bookmarks/jde-capture.js` | Bookmark JDE: tự điền mã đơn, bấm Find, thu dữ liệu, tự gửi |
| `bookmarks/sap-fetch.js` | Bookmark SAP: tự lấy dữ liệu SAP của đơn mới và gửi |
| `tools/embed_bookmarks.py` | Đưa mã 3 bookmark vào `Index.html` |
| `tests/` | Kiểm thử mô phỏng (không cần JDE hay SAP thật) |

## Cài đặt

1. Tạo dự án Google Apps Script, dán `Code.gs` và `Index.html`.
2. Triển khai thành Web App: Execute as **Me**, Who has access **Anyone**. Mỗi lần sửa code phải triển khai lại phiên bản mới.
3. Mở trang Web App, vào mục **Cài bookmark tự động**, bấm **Copy bookmark** cho từng cái rồi dán vào ô URL của một bookmark trình duyệt.
4. Khóa bí mật của hộp thư tự sinh và nằm trong Script Properties (`RELAY_SECRET`), không nằm trong code. Địa chỉ Web App và khóa chỉ có trong bookmark do trang tạo ra, **không đưa lên GitHub**.

## Cách chạy mỗi ca

1. Mở 3 tab glassRUN, JDE, SAP. Bấm bookmark tương ứng một lần trên mỗi tab.
2. glassRUN: lọc theo số đơn chính. Đơn tự gửi. Bấm **Copy đơn** để lấy danh sách cho JDE.
3. JDE: bấm **Lấy danh sách từ clipboard và chạy**. Tool tự điền mã vào ô Order Number và bấm Find. Dùng màn hình tìm chung (ô Order Type để `*`) thì một lần Find cho cả SO, S5, S6, ST, không phải chuyển tab. Nếu đang ở từng tab riêng, panel nhắc chuyển tab SO → S5 → S6 (đơn ST có tab ST).
4. SAP: tự lấy dữ liệu đơn mới, không cần thao tác.
5. Trang Final Check tự đối soát khi JDE và SAP đủ dữ liệu.

Trang JDE chặn nhận dữ liệu từ hộp thư, nên JDE chỉ gửi đi, danh sách đơn phải lấy từ clipboard. Nếu hộp thư lỗi, vẫn dùng được cách copy và dán thủ công trên trang.

## Đơn ST (chuyển kho)

- Đơn có 4 số đầu nhỏ hơn 6221 (hiện nay 6012…) được coi là ST. ST là đơn duy nhất, không có đơn tặng.
- Trạng thái áp dụng giống SO, S5, S6.
- SAP: tìm theo trường `st` thay vì `SalesOrder`.
- Lưới ST trên JDE phải cùng định dạng cột với lưới SO (ô định dạng của lưới).

## Quy tắc trạng thái (Code.gs)

| Nhóm | Điều kiện |
|---|---|
| Chờ SUP xác nhận | Next Status = 545 |
| Đã xác nhận (chỉ kiểm tra lại) | Last Status = 574, 620 hoặc 900, hoặc Next Status = 620 |

- Mọi dòng của đơn chính và đơn tặng phải cùng một nhóm, nếu không đơn bị chặn.
- Không xét dòng két/vỏ (LineType DP) và dòng Last Status = 980.
- Nguồn dữ liệu glassRUN (không có JDE) không kiểm tra trạng thái, nhưng chặn nếu có dòng thiếu số lượng.

## Phát triển

- Sửa mã bookmark trong `bookmarks/`, sau đó chạy `python3 tools/embed_bookmarks.py` để cập nhật `Index.html`.
- Kiểm thử: `npm install` rồi `npm test`.
- Quy ước: không dùng comment `//` trong mã bookmark, vì khi tạo bookmark các dòng bị nối thành một dòng.

## Thiết kế bởi

Logistics Hoc Mon – Designed by Tien Loi.
