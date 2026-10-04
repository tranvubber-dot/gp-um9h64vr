/* DỮ LIỆU MẪU — người và tên đều bịa, chỉ để xem thử app.
   Khi đã nối Google Sheet (điền apiUrl trong config.js) app sẽ không dùng file này.
   Mỗi dòng = một dòng trong tab "Người" của Google Sheet (cùng tên cột). */
window.GP_MAU = {
  thongTin: {
    ten_dong_ho: 'Họ Trần',
    que_goc: 'Làng Mẫu, xã Mẫu, tỉnh Mẫu',
    pha_ky: 'Đây là đoạn phả ký mẫu. Phả ký kể lại nguồn gốc dòng họ: cụ Thủy tổ từ đâu đến, lập nghiệp ở đâu, những người có công với họ, những lần tu sửa gia phả.\n\nKhi dùng thật, anh/chị chép phả ký của họ mình vào ô "pha_ky" trong tab "Thông tin" của Google Sheet.',
    toc_uoc: 'Ngày giỗ Tổ: 12 tháng 3 âm lịch hằng năm, con cháu các chi về nhà thờ họ dâng hương.\nTết Nguyên đán: chi trưởng mở cửa nhà thờ từ 30 Tết.\nMỗi suất đinh đóng góp quỹ họ theo bàn bạc của Hội đồng gia tộc.',
    nha_tho_ho: 'Nhà thờ họ Trần — thôn Mẫu (địa chỉ ví dụ)',
    ban_do_nha_tho: ''
  },
  nguoi: [
    { ma: 'T001', ho_ten: 'Trần Văn Tổ', gioi_tinh: 'Nam', ten_huy: 'Phúc Tổ', ten_tu: 'Cương Trực', ngay_sinh: '1820', ngay_mat: '1890', ngay_gio: '12/3', noi_an_tang: 'Nghĩa trang làng, khu A', chuc_danh: 'Thủy tổ', tieu_su: 'Cụ là người đầu tiên của họ Trần về lập nghiệp ở làng. Cụ khai khẩn đất hoang, dựng nhà thờ họ đầu tiên.', ma_vo_chong: 'T002' },
    { ma: 'T002', ho_ten: 'Nguyễn Thị Hiền', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_sinh: '1825', ngay_mat: '1895', ngay_gio: '5/9', noi_an_tang: 'Nghĩa trang làng, khu A' },

    { ma: 'T003', ho_ten: 'Trần Văn Cả', gioi_tinh: 'Nam', ma_cha: 'T001', ma_me: 'T002', thu_tu: 1, ngay_sinh: '1848', ngay_mat: '1920', ngay_gio: '20/11', ma_vo_chong: 'T004', chuc_danh: 'Trưởng họ đời 2' },
    { ma: 'T004', ho_ten: 'Lê Thị Mai', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_mat: '1925', ngay_gio: '2/2' },
    { ma: 'T005', ho_ten: 'Trần Thị Nhất', gioi_tinh: 'Nữ', ma_cha: 'T001', ma_me: 'T002', thu_tu: 2, ngay_sinh: '1851', ngay_mat: '1930', ngay_gio: '8/6', ma_vo_chong: 'T006', tieu_su: 'Xuất giá về họ Phạm ở làng bên.' },
    { ma: 'T006', ho_ten: 'Phạm Văn Bình', gioi_tinh: 'Nam', ngay_mat: '1928' },
    { ma: 'T007', ho_ten: 'Trần Văn Hai', gioi_tinh: 'Nam', ma_cha: 'T001', ma_me: 'T002', thu_tu: 3, ngay_sinh: '1855', ngay_mat: '1932', ngay_gio: '15/7', ma_vo_chong: 'T008' },
    { ma: 'T008', ho_ten: 'Đỗ Thị Lan', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_mat: '1940', ngay_gio: '3/10' },

    { ma: 'T009', ho_ten: 'Trần Văn Đức', gioi_tinh: 'Nam', ma_cha: 'T003', ma_me: 'T004', thu_tu: 1, ngay_sinh: '1880', ngay_mat: '1955', ngay_gio: '27/8', ma_vo_chong: 'T010', chuc_danh: 'Trưởng họ đời 3' },
    { ma: 'T010', ho_ten: 'Vũ Thị Hoa', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_mat: '1960', ngay_gio: '14/1' },
    { ma: 'T011', ho_ten: 'Trần Thị Hạnh', gioi_tinh: 'Nữ', ma_cha: 'T003', ma_me: 'T004', thu_tu: 2, ngay_sinh: '1884', ngay_mat: '1950', ngay_gio: '10/4', ma_vo_chong: 'T012' },
    { ma: 'T012', ho_ten: 'Hoàng Văn Sơn', gioi_tinh: 'Nam', ngay_mat: '1949' },
    { ma: 'T013', ho_ten: 'Trần Văn Nhân', gioi_tinh: 'Nam', ma_cha: 'T003', ma_me: 'T004', thu_tu: 3, ngay_sinh: '1888', ngay_mat: '1962', ngay_gio: '1/12', ma_vo_chong: 'T014' },
    { ma: 'T014', ho_ten: 'Bùi Thị Thu', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_mat: '1970', ngay_gio: '9/9' },
    { ma: 'T015', ho_ten: 'Phạm Văn Minh', gioi_tinh: 'Nam', ma_cha: 'T006', ma_me: 'T005', thu_tu: 1, ngay_sinh: '1875', ngay_mat: '1940', tieu_su: 'Con của bà Trần Thị Nhất (cháu ngoại của cụ Tổ).' },
    { ma: 'T016', ho_ten: 'Trần Văn Nghĩa', gioi_tinh: 'Nam', ma_cha: 'T007', ma_me: 'T008', thu_tu: 1, ngay_sinh: '1885', ngay_mat: '1958', ngay_gio: '23/8', ma_vo_chong: 'T017' },
    { ma: 'T017', ho_ten: 'Ngô Thị Yến', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_mat: '1966', ngay_gio: '6/5' },
    { ma: 'T018', ho_ten: 'Trần Thị Thảo', gioi_tinh: 'Nữ', ma_cha: 'T007', ma_me: 'T008', thu_tu: 2, ngay_sinh: '1890', ngay_mat: '1972', ngay_gio: '18/2' },

    { ma: 'T019', ho_ten: 'Trần Văn Hùng', gioi_tinh: 'Nam', ma_cha: 'T009', ma_me: 'T010', thu_tu: 1, ngay_sinh: '1925', ngay_mat: '2005', ngay_gio: '4/11', ma_vo_chong: 'T020', chuc_danh: 'Trưởng họ đời 4' },
    { ma: 'T020', ho_ten: 'Đặng Thị Nga', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_sinh: '1930', ngay_mat: '2012', ngay_gio: '25/8' },
    { ma: 'T021', ho_ten: 'Trần Thị Lý', gioi_tinh: 'Nữ', ma_cha: 'T009', ma_me: 'T010', thu_tu: 2, ngay_sinh: '1929', ngay_mat: '2001', ngay_gio: '7/3' },
    { ma: 'T022', ho_ten: 'Trần Văn Quang', gioi_tinh: 'Nam', ma_cha: 'T013', ma_me: 'T014', thu_tu: 1, ngay_sinh: '1928', ngay_mat: '2010', ngay_gio: '16/6', ma_vo_chong: 'T023' },
    { ma: 'T023', ho_ten: 'Lý Thị Bích', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_sinh: '1932', noi_o: 'Hà Nội', dien_thoai: '0900 000 101' },
    { ma: 'T024', ho_ten: 'Trần Văn Tuấn', gioi_tinh: 'Nam', ma_cha: 'T016', ma_me: 'T017', thu_tu: 1, ngay_sinh: '1935', ngay_mat: '2015', ngay_gio: '29/9', ma_vo_chong: 'T032' },
    { ma: 'T032', ho_ten: 'Mai Thị Hằng', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_sinh: '1940', noi_o: 'Quê nhà' },
    { ma: 'T025', ho_ten: 'Trần Thị Hương', gioi_tinh: 'Nữ', ma_cha: 'T016', ma_me: 'T017', thu_tu: 2, ngay_sinh: '1938', ma_vo_chong: 'T033' },
    { ma: 'T033', ho_ten: 'Cao Văn Thành', gioi_tinh: 'Nam', ngay_sinh: '1936' },

    { ma: 'T026', ho_ten: 'Trần Văn Long', gioi_tinh: 'Nam', ma_cha: 'T019', ma_me: 'T020', thu_tu: 1, ngay_sinh: '12/05/1958', ma_vo_chong: 'T034', chuc_danh: 'Trưởng họ đời 5', noi_o: 'Quê nhà', dien_thoai: '0900 000 201', zalo: '0900000201', facebook: 'https://www.facebook.com/' },
    { ma: 'T034', ho_ten: 'Phan Thị Dung', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_sinh: '1960' },
    { ma: 'T027', ho_ten: 'Trần Thị Ngọc', gioi_tinh: 'Nữ', ma_cha: 'T019', ma_me: 'T020', thu_tu: 2, ngay_sinh: '1962', noi_o: 'TP. Hồ Chí Minh', dien_thoai: '0900 000 202' },
    { ma: 'T028', ho_ten: 'Trần Văn Khánh', gioi_tinh: 'Nam', ma_cha: 'T022', ma_me: 'T023', thu_tu: 1, ngay_sinh: '1960', ngay_mat: '2020', ngay_gio: '11/1', noi_an_tang: 'Nghĩa trang làng, khu B' },
    { ma: 'T029', ho_ten: 'Trần Minh An', gioi_tinh: 'Nam', ma_cha: 'T024', ma_me: 'T032', thu_tu: 1, ngay_sinh: '1965', noi_o: 'Đà Nẵng', dien_thoai: '0900 000 203', zalo: '0900000203' },

    { ma: 'T030', ho_ten: 'Trần Gia Bảo', gioi_tinh: 'Nam', ma_cha: 'T026', ma_me: 'T034', thu_tu: 1, ngay_sinh: '1985', ma_vo_chong: 'T035', noi_o: 'Hà Nội', dien_thoai: '0900 000 301', zalo: '0900000301', facebook: 'https://www.facebook.com/' },
    { ma: 'T035', ho_ten: 'Hà Thị Thanh Hương', gioi_tinh: 'Nữ', vai: 'Chính thất', ngay_sinh: '1988' },
    { ma: 'T031', ho_ten: 'Trần Bảo Ngọc', gioi_tinh: 'Nữ', ma_cha: 'T026', ma_me: 'T034', thu_tu: 2, ngay_sinh: '1990', noi_o: 'Hà Nội' },
    { ma: 'T036', ho_ten: 'Trần Gia Huy', gioi_tinh: 'Nam', ma_cha: 'T030', ma_me: 'T035', thu_tu: 1, ngay_sinh: '2015' },
    { ma: 'T037', ho_ten: 'Trần Khánh Linh', gioi_tinh: 'Nữ', ma_cha: 'T030', ma_me: 'T035', thu_tu: 2, ngay_sinh: '2018' }
  ],
  thongBao: [
    { id: 'tb2', ngay: '02/10/2026', loai: 'Việc họ', tieuDe: 'Thông báo giỗ Tổ năm Bính Ngọ', noiDung: 'Ngày 12 tháng 3 âm lịch, con cháu các chi về nhà thờ họ dâng hương.\nTrưởng các chi báo số người về dự trước ngày 5/3 âm lịch.', ghim: true, nguoi: 'Ban quản trị' },
    { id: 'tb3', ngay: '28/09/2026', loai: 'Đóng góp', tieuDe: 'Đóng góp tu sửa nhà thờ họ', noiDung: 'Mái ngói nhà thờ bị dột sau mùa mưa. Họ thống nhất mỗi suất đinh đóng góp để tu sửa trước Tết.', mucDong: '500.000đ/suất', han: '15/11/2026', nguoi: 'Trưởng chi Giáp' },
    { id: 'tb4', ngay: '20/09/2026', loai: 'Khuyến học', tieuDe: 'Khen thưởng con cháu học giỏi', noiDung: 'Con cháu đạt học sinh giỏi cấp tỉnh trở lên năm học vừa qua, gia đình gửi giấy khen về ban khuyến học để họ khen thưởng.', nguoi: 'Ban khuyến học' }
  ]
};
