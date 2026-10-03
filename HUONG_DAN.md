# Gia phả Họ Trần: hướng dẫn nối Google Sheet

App đọc dữ liệu từ một Google Sheet. Họ hàng nào được mời đều sửa được Sheet, sửa xong thì mở app lại là thấy ngay, không cần đưa web lên lại.

## Bước 1: Tạo Google Sheet từ file mẫu
1. Vào drive.google.com, bấm **Mới → Tải tệp lên**, chọn file `google-sheet/Mau_Gia_Pha.xlsx`.
2. Mở file vừa tải lên, chọn **Tệp → Lưu dưới dạng Google Trang tính**. Từ đây chỉ dùng bản Google Trang tính.
3. File có 3 tab:
   - **Người**: mỗi người một dòng, kể cả con dâu và con rể.
   - **Thông tin**: tên dòng họ, quê gốc, phả ký, tộc ước, nhà thờ họ.
   - **Hướng dẫn**: giải thích từng cột. Rê chuột lên tiêu đề cột cũng thấy ghi chú.
4. Xoá các dòng mẫu, rồi nhập người thật. **Không đổi tên các tab "Người" và "Thông tin".**

### Cách ghi cho đúng
- **Mã**: mỗi người một mã riêng, ví dụ T001, T002. Đã đặt thì đừng đổi.
- **Con**: ghi *Mã cha* và *Mã mẹ*. Có Mã mẹ thì app biết con của bà nào, và con bà cả được xếp trước con bà kế.
- **Vợ chồng**: ghi *Mã vợ/chồng* ở một trong hai người là đủ. Người có nhiều vợ thì ghi các mã cách nhau dấu phẩy, bà cả ghi trước. Cột *Vai* ghi Chính thất, Kế thất hoặc Thứ thất.
- **Con gái**: ghi như con trai, kèm một dòng cho người chồng (rể). Muốn ghi con của con gái (cháu ngoại) thì cứ ghi. App có công tắc để ẩn hoặc hiện các cháu ngoại.
- **Con thứ**: con thứ mấy trong nhà. Để trống thì app xếp theo năm sinh.
- **Loại con**: để trống nghĩa là con đẻ. Nếu khác thì ghi *Con nuôi* hoặc *Thừa tự*. Con nuôi không được tính vào dòng đích.
- **Ngày giỗ**: ngày/tháng **âm lịch**, ví dụ `12/3`. Đây chính là ngày mất theo âm lịch. Người mất vào tháng nhuận thì ghi tháng thường cùng tên.
- **Ngày sinh, ngày mất**: ghi `12/5/1958` hoặc chỉ năm `1958`.
- **Ảnh**: dán link ảnh trên Google Drive. Ảnh phải được chia sẻ ở chế độ "Bất kỳ ai có đường liên kết".
- **Các cột riêng tư** (Nơi ở, Điện thoại, Zalo, Facebook): chỉ hiện khi người xem nhập đúng mã gia đình. Chỉ ghi khi chính người đó đồng ý.

## Bước 2: Dán đoạn mã Apps Script
1. Trong Google Sheet, chọn **Tiện ích mở rộng → Apps Script**.
2. Xoá hết đoạn mã có sẵn, dán toàn bộ nội dung file `google-sheet/Code.gs`, rồi bấm **Lưu** (biểu tượng đĩa mềm).
3. Đặt mã gia đình:
   - Bấm **Cài đặt dự án** (bánh răng bên trái).
   - Kéo xuống **Thuộc tính tập lệnh**, bấm **Thêm thuộc tính tập lệnh**.
   - Ô *Thuộc tính* ghi `MA_GIA_DINH`. Ô *Giá trị* ghi mã của họ: từ 6 ký tự trở lên, đừng dùng ngày sinh hay số điện thoại.
   - Bấm **Lưu thuộc tính tập lệnh**.
4. Chạy thử (không bắt buộc): chọn hàm `thuDoc` rồi bấm **▶ Chạy**. Google sẽ hỏi cấp quyền thì đồng ý. Mở **Nhật ký thực thi** để xem app đọc được bao nhiêu người.

## Bước 3: Triển khai thành ứng dụng web
1. Bấm **Triển khai → Tùy chọn triển khai mới**.
2. Bấm bánh răng cạnh "Chọn loại", chọn **Ứng dụng web**, rồi điền:
   - **Thực thi với tư cách**: *Tôi*.
   - **Người có quyền truy cập**: *Bất kỳ ai*. Người xem web không cần tài khoản Google.
3. Bấm **Triển khai**, rồi cấp quyền nếu được hỏi. Google sẽ báo "chưa xác minh": đó là đoạn mã của chính anh/chị, nên bấm **Nâng cao → Đi tới… → Cho phép**.
4. Sao chép **URL ứng dụng web**, dạng `https://script.google.com/macros/s/…/exec`.

## Bước 4: Dán link vào app
Mở file `config.js`, dán link vào giữa hai dấu nháy ở dòng `apiUrl: ''`:
```js
apiUrl: 'https://script.google.com/macros/s/XXXXXXXX/exec',
```

## Những điều cần nhớ
- **Sửa dữ liệu trong Sheet**: không phải làm gì thêm. Mở app lại là thấy, hoặc bấm *Dòng họ → Cập nhật dữ liệu mới*.
- **Sửa file Code.gs**: phải chọn **Triển khai → Quản lý các bản triển khai → ✏️ Sửa → Phiên bản: Phiên bản mới → Triển khai**. Làm vậy thì link vẫn giữ nguyên.
- **Mời họ hàng cùng nhập liệu**: dùng nút *Chia sẻ* của Google Sheet, cấp quyền *Người chỉnh sửa* cho từng email. **Đừng** chia sẻ Sheet kiểu "Bất kỳ ai có đường liên kết", vì như thế ai cũng xem được số điện thoại.
- **Đổi mã gia đình**: sửa giá trị `MA_GIA_DINH`. Máy nào đã mở khoá trước đó vẫn giữ danh bạ cũ cho tới khi bấm *Khoá lại*.
- **Chặn dò mã**: nếu có người nhập sai quá 20 lần trong 10 phút, việc mở khoá bị tạm dừng 10 phút.

## Mức độ riêng tư
| Ai mở web cũng thấy | Chỉ người có mã gia đình mới thấy |
|---|---|
| Tên, quan hệ, đời, chi | Số điện thoại, Zalo, Facebook |
| Năm sinh, năm mất, ngày giỗ, nơi an táng | Nơi ở |
| Tiểu sử, phả ký, tộc ước | Ngày sinh đầy đủ của người còn sống |

Trang web đã được chặn Google tìm kiếm (có `robots.txt` và thẻ `noindex`). Dù vậy, ai có link vẫn mở được, nên chỉ gửi link trong nhóm họ hàng.
