# Lịch sử thay đổi

## Bản thử (chưa chạy trên hệ thống thật)
- Thêm loại đơn **ST**: nhận biết theo 4 số đầu nhỏ hơn 6221, một đơn duy nhất, không có đơn tặng.
- JDE: chế độ **màn hình tìm chung** (ô Order Type = `*`), một lần Find cho SO/S5/S6/ST, không chuyển tab.
- SAP: đơn ST tìm theo trường `st`.
- Code.gs: đơn ST không bị coi là đơn tặng dù giá 0; khớp dòng SAP theo `SalesOrder` hoặc `st`.
- glassRUN: nhận diện đơn ST (cấu trúc dữ liệu trang ST Order List FG chưa kiểm chứng với dữ liệu thật).
- glassRUN: khi trang Orders báo "No rows to show" cho đơn ST, tool đọc số đơn trong ô lọc Order Number và vẫn nhận diện đơn ST, gửi lên Hộp thư.
- glassRUN: sửa lỗi nhận diện ST khi lọc ở trang Orders. Tool tìm tiêu đề cột "Order Number" rồi chỉ đọc ô lọc nằm ngay dưới cột đó (không quét mọi ô nhập, tránh đọc nhầm ô khác trên trang); giữ nhận diện khi danh sách trả về rỗng; panel hiện dòng "Ô lọc đang đọc được".

## 1.0 – bản hiện tại
- Quy tắc trạng thái: thêm Last Status 900 vào nhóm "đã xác nhận" (đơn 900 → 999).
- Hộp thư: nút **Xóa** từng đơn và **Xóa tất cả**. Bookmark GR và JDE gửi lại được sau khi xóa.
- SAP Fetch: chỉ tự lấy đơn mới. Không quét lại đơn cũ khi bật lại bookmark. Mỗi đơn thử một lần, SAP không có dữ liệu thì dừng, lấy lại bằng nút **lấy lại**.
- JDE Capture: tự điền mã đơn vào ô Order Number, tự bấm Find, lấy danh sách đơn từ clipboard, có nút **Dừng tự động**.
- Hộp thư tự động (Apps Script) nối 3 bookmark. JDE chặn nhận dữ liệu nên JDE gửi bằng biểu mẫu ẩn.
- Quy tắc đã xác nhận: Last 574 hoặc 620, hoặc Next 620 (574→620, 912→620, 620→999).
- Quy tắc chờ SUP xác nhận: Next 545.
- Nút **Đối soát lại** trên dữ liệu lần copy gần nhất.
- Bảng thời gian: đếm số lần copy, dán và thời gian từng bước.
- Font hệ thống tự nhiên, chữ in chìm "Logistics Hoc Mon – Designed by Tien Loi".
- Nguồn glassRUN khi không có JDE, chặn nếu dòng thiếu số lượng.
