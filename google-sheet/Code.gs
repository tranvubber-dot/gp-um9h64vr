/**
 * GIA PHẢ — Apps Script đọc Google Sheet cho web app.
 * Dán toàn bộ file này vào: Google Sheet → Tiện ích mở rộng → Apps Script.
 *
 * - Ai mở web cũng đọc được cây gia phả (tên, quan hệ, năm sinh/mất, ngày giỗ…).
 * - Số điện thoại, Zalo, Facebook, nơi ở, ngày sinh đầy đủ của người còn sống
 *   CHỈ trả về khi nhập đúng "mã gia đình". Mã được kiểm tra tại máy chủ Google,
 *   Google Sheet vẫn để chế độ riêng tư (không cần chia sẻ công khai).
 *
 * Đặt mã: Apps Script → Cài đặt dự án (bánh răng) → Thuộc tính tập lệnh →
 *         thêm thuộc tính  MA_GIA_DINH  = mã của họ (nên ≥ 6 ký tự, không dùng ngày sinh).
 */

var TAB_NGUOI = 'Người';
var TAB_THONG_TIN = 'Thông tin';
var COT_RIENG = ['dien_thoai', 'zalo', 'facebook', 'noi_o'];
var BIET_DANH = {
  ho_va_ten: 'ho_ten', ten: 'ho_ten', gioi: 'gioi_tinh', cha: 'ma_cha', me: 'ma_me',
  vo_chong: 'ma_vo_chong', ma_vo_hoac_chong: 'ma_vo_chong', con_thu: 'thu_tu', thu_tu_con: 'thu_tu',
  nam_sinh: 'ngay_sinh', nam_mat: 'ngay_mat', ngay_gio_am_lich: 'ngay_gio', gio: 'ngay_gio',
  so_dien_thoai: 'dien_thoai', sdt: 'dien_thoai', fb: 'facebook', dia_chi: 'noi_o',
  hoc_vi_chuc_danh: 'chuc_danh'
};

function khoa_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function docSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(TAB_NGUOI) || ss.getSheets()[0];
  var v = sh.getDataRange().getDisplayValues(); // lấy đúng chữ đang hiện, tránh Sheets tự đổi 12/3 thành ngày
  var cot = v[0].map(function (h) { var k = khoa_(h); return BIET_DANH[k] || k; });
  var cong = [], rieng = {};
  for (var i = 1; i < v.length; i++) {
    var r = {}, co = false;
    cot.forEach(function (k, j) { if (k && v[i][j] !== '') { r[k] = String(v[i][j]).trim(); co = true; } });
    if (!co || !r.ma || !r.ho_ten) continue;
    var x = {};
    COT_RIENG.forEach(function (k) { if (r[k]) { x[k] = r[k]; } delete r[k]; });
    var conSong = !(r.ngay_mat || r.da_mat || r.ngay_gio);
    if (conSong && r.ngay_sinh) {
      var y = String(r.ngay_sinh).match(/(\d{4})/);
      if (r.ngay_sinh !== (y && y[1])) { x.ngay_sinh = r.ngay_sinh; r.ngay_sinh = y ? y[1] : ''; }
    }
    if (Object.keys(x).length) rieng[r.ma] = x;
    cong.push(r);
  }
  var thongTin = {};
  var st = ss.getSheetByName(TAB_THONG_TIN);
  if (st) st.getDataRange().getDisplayValues().forEach(function (row, i) {
    if (i === 0 || !row[0]) return;
    thongTin[khoa_(row[0])] = row[1];
  });
  return { cong: cong, rieng: rieng, thongTin: thongTin };
}

/* Web app gọi để lấy cây gia phả (không có phần riêng tư). */
function doGet() {
  var d = docSheet_();
  return json_({ thongTin: d.thongTin, nguoi: d.cong, capNhat: new Date().toISOString() });
}

/* Web app gửi { ma } để mở khoá liên lạc. */
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (x) {}
  var ma = PropertiesService.getScriptProperties().getProperty('MA_GIA_DINH');
  if (!ma) return json_({ ok: false, loi: 'Ban quản trị chưa đặt mã gia đình' });

  // chặn dò mã: quá 20 lần sai trong 10 phút thì tạm khoá
  var cache = CacheService.getScriptCache(), sai = +(cache.get('sai') || 0);
  if (sai >= 20) return json_({ ok: false, loi: 'Nhập sai quá nhiều lần, thử lại sau 10 phút' });
  if (String(body.ma || '').trim() !== String(ma).trim()) {
    cache.put('sai', String(sai + 1), 600);
    Utilities.sleep(1500);
    return json_({ ok: false, loi: 'Sai mã gia đình' });
  }
  return json_({ ok: true, lienHe: docSheet_().rieng });
}

/* Chạy thử trong trình soạn Apps Script: chọn hàm này rồi bấm ▶ Chạy, xem Nhật ký. */
function thuDoc() {
  var d = docSheet_();
  Logger.log('Đọc được ' + d.cong.length + ' người, ' + Object.keys(d.rieng).length + ' người có thông tin riêng.');
  Logger.log(JSON.stringify(d.cong.slice(0, 3)));
}


/* =====================================================================
   SẮP XẾP LẠI SHEET CHO DỄ NHÌN — chạy 1 lần: chọn hàm lamGonSheet rồi bấm ▶ Chạy.
   - Cột Cha / Mẹ / Vợ-Chồng thành danh sách thả xuống (gõ vài chữ để tìm), khỏi nhớ mã.
   - Cột Mã tự điền khi gõ tên mới. Giới tính tự điền (tên có "Thị" → Nữ).
   - Cột ít dùng gom sau nút [+]. Cột liên lạc (riêng tư) tô màu tím.
   - Tab cũ được giữ lại tên "Người (bản cũ)" để đối chiếu, xem xong có thể xoá.
   ===================================================================== */
var COT_MOI = [
  // [tiêu đề, khoá, ghi chú, độ rộng, nhóm]  nhóm: 'chinh' | 'ke' (ảnh, tiểu sử) | 'rieng' | 'them'
  ['Mã', 'ma', 'Tự điền khi gõ tên. Không cần sửa.', 58, 'chinh'],
  ['Họ và tên', 'ho_ten', 'Gõ họ tên đầy đủ. Mã và giới tính sẽ tự điền.', 190, 'chinh'],
  ['Giới tính', 'gioi_tinh', 'Nam / Nữ (tự đoán theo chữ "Thị", sửa lại nếu sai)', 82, 'chinh'],
  ['Cha', 'ma_cha', 'Bấm vào ô → chọn người cha trong danh sách (gõ vài chữ để tìm). Để trống với cụ Thủy tổ và với dâu/rể.', 200, 'chinh'],
  ['Mẹ', 'ma_me', 'Chọn người mẹ — để biết là con bà nào.', 200, 'chinh'],
  ['Vợ/Chồng', 'ma_vo_chong', 'Chọn vợ hoặc chồng. Chỉ cần chọn ở MỘT người. Nhiều vợ: chọn bà cả, rồi gõ thêm dấu phẩy và tên bà kế.', 200, 'chinh'],
  ['Con thứ', 'thu_tu', 'Con thứ mấy trong nhà: 1, 2, 3…', 70, 'chinh'],
  ['Ngày sinh', 'ngay_sinh', 'Ghi năm (1958) hoặc ngày/tháng/năm (12/5/1958).', 92, 'chinh'],
  ['Ngày mất', 'ngay_mat', 'Để trống nếu còn sống.', 92, 'chinh'],
  ['Ngày giỗ', 'ngay_gio', 'Ngày/tháng ÂM LỊCH, ví dụ 12/3.', 82, 'chinh'],
  ['Ảnh', 'anh', 'Ảnh đại diện (không bắt buộc). Tải ảnh lên Google Drive → bấm Chia sẻ → "Bất kỳ ai có đường liên kết" → Sao chép đường liên kết → dán vào đây.', 150, 'ke'],
  ['Tiểu sử', 'tieu_su', 'Ai muốn thì viết: cuộc đời, công đức, kỷ niệm, lời dặn… Xuống dòng trong ô: Ctrl+Enter (Windows) hoặc ⌘+Enter (Mac). App hiện đầy đủ khi bấm vào người đó.', 320, 'ke'],
  ['Điện thoại', 'dien_thoai', '🔒 Riêng tư — chỉ người có mã gia đình mới thấy.', 118, 'rieng'],
  ['Zalo', 'zalo', '🔒 Số điện thoại dùng Zalo.', 110, 'rieng'],
  ['Facebook', 'facebook', '🔒 Link trang Facebook.', 150, 'rieng'],
  ['Nơi ở', 'noi_o', '🔒 Tỉnh/thành đang sống.', 130, 'rieng'],
  ['Vai', 'vai', 'Với vợ: Chính thất / Kế thất / Thứ thất.', 92, 'them'],
  ['Loại con', 'loai_con', 'Để trống = con đẻ. Hoặc: Con nuôi / Thừa tự.', 86, 'them'],
  ['Tên húy', 'ten_huy', '', 100, 'them'],
  ['Tên tự', 'ten_tu', '', 100, 'them'],
  ['Tên hiệu', 'ten_hieu', '', 100, 'them'],
  ['Thụy hiệu', 'thuy_hieu', '', 100, 'them'],
  ['Đã mất', 'da_mat', 'Ghi x nếu đã mất mà không rõ ngày.', 66, 'them'],
  ['Nơi an táng', 'noi_an_tang', '', 170, 'them'],
  ['Cải táng', 'cai_tang', 'Nơi và năm cải táng (sang cát) nếu có.', 130, 'them'],
  ['Bản đồ mộ', 'ban_do_mo', 'Dán link Google Maps vị trí mộ.', 130, 'them'],
  ['Học vị, chức danh', 'chuc_danh', '', 140, 'them'],
  ['Quê quán', 'que_quan', 'Với dâu/rể: quê của họ.', 130, 'them']
];
var MAU_NHOM = { chinh: '#E5383B', ke: '#F08C2E', rieng: '#6E56CF', them: '#8E8A94' };
function cotSo_(khoa) { for (var i = 0; i < COT_MOI.length; i++) if (COT_MOI[i][1] === khoa) return i + 1; return 0; }
var SO_DONG = 1000;

function maTu_(x) {
  var m = String(x || '').trim().match(/([A-Za-z]{1,4}\d{1,6})\s*\)?\s*$/);
  return m ? m[1] : '';
}

/* Công thức danh sách chọn người. Sheet đặt khu vực Việt Nam dùng dấu ; thay cho dấu , nên thử cả hai. */
function datCongThucDS_(ds) {
  var t = "'" + TAB_NGUOI + "'!";
  var f = '=IFERROR(FILTER(' + t + 'B2:B&" · "&' + t + 'A2:A,' + t + 'B2:B<>"",' + t + 'A2:A<>""),"")';
  var o = ds.getRange('A2');
  o.setFormula(f); SpreadsheetApp.flush();
  if (/^#/.test(o.getDisplayValue())) { o.setFormula(f.replace(/,/g, ';')); SpreadsheetApp.flush(); }
  return o.getDisplayValue();
}

/* Sửa riêng danh sách chọn người (không đụng dữ liệu). */
function suaDanhSach() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ds = ss.getSheetByName('_DS') || ss.insertSheet('_DS');
  Logger.log('Người đầu danh sách: ' + datCongThucDS_(ds));
  ds.hideSheet();
}

function lamGonSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cu = ss.getSheetByName(TAB_NGUOI);
  if (!cu) throw new Error('Không thấy tab "' + TAB_NGUOI + '"');

  // 1. đọc dữ liệu cũ
  var v = cu.getDataRange().getDisplayValues();
  var cot = v[0].map(function (h) { var k = khoa_(h); return BIET_DANH[k] || k; });
  var rows = v.slice(1).map(function (r) {
    var o = {}; cot.forEach(function (k, j) { if (k && r[j] !== '') o[k] = r[j]; }); return o;
  }).filter(function (o) { return o.ma || o.ho_ten; });
  var ten = {};
  rows.forEach(function (o) { if (o.ma) ten[maTu_(o.ma) || o.ma] = o.ho_ten; });
  function nhan(ref) { // "T001, T005" → "Trần Văn Tổ · T001, … · T005"
    return String(ref || '').split(/[,;]/).map(function (x) {
      x = x.trim(); var m = maTu_(x) || x;
      return ten[m] ? ten[m] + ' · ' + m : x;
    }).filter(String).join(', ');
  }

  // 2. giữ bản cũ, tạo tab mới cùng tên
  var tenCu = 'Người (bản cũ)';
  if (ss.getSheetByName(tenCu)) tenCu += ' ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd-MM HH:mm');
  cu.setName(tenCu);
  var sh = ss.insertSheet(TAB_NGUOI, 0);
  var n = COT_MOI.length;
  if (sh.getMaxColumns() < n) sh.insertColumnsAfter(sh.getMaxColumns(), n - sh.getMaxColumns());
  if (sh.getMaxRows() < SO_DONG) sh.insertRowsAfter(sh.getMaxRows(), SO_DONG - sh.getMaxRows());

  // 3. ghi tiêu đề + dữ liệu (mọi ô dạng chữ để Sheets không tự đổi 12/3 thành ngày)
  sh.getRange(1, 1, SO_DONG, n).setNumberFormat('@');
  sh.getRange(1, 1, 1, n).setValues([COT_MOI.map(function (c) { return c[0]; })]);
  var data = rows.map(function (o) {
    return COT_MOI.map(function (c) {
      var k = c[1], val = o[k] || '';
      if (k === 'ma_cha' || k === 'ma_me' || k === 'ma_vo_chong') val = nhan(val);
      return val;
    });
  });
  if (data.length) sh.getRange(2, 1, data.length, n).setValues(data);

  // 4. trang trí
  sh.setFrozenRows(1); sh.setFrozenColumns(2);
  sh.setRowHeight(1, 34);
  COT_MOI.forEach(function (c, j) {
    var h = sh.getRange(1, j + 1);
    h.setBackground(MAU_NHOM[c[4]]).setFontColor('#FFFFFF').setFontWeight('bold')
      .setHorizontalAlignment('center').setVerticalAlignment('middle');
    if (c[2]) h.setNote(c[2]);
    sh.setColumnWidth(j + 1, c[3]);
  });
  sh.getRange(2, 1, SO_DONG - 1, 1).setFontColor('#9A90A3').setHorizontalAlignment('center');
  sh.getRange(2, 2, SO_DONG - 1, 1).setFontWeight('bold');
  sh.getRange(2, 1, SO_DONG - 1, n).setVerticalAlignment('middle').setWrap(false);
  sh.getRange(2, 1, SO_DONG - 1, n).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  sh.getRange(2, cotSo_('dien_thoai'), SO_DONG - 1, 4).setBackground('#F4F0FF'); // vùng liên lạc riêng tư
  sh.getRange(2, cotSo_('anh'), SO_DONG - 1, 2).setBackground('#FFF6EC'); // ảnh + tiểu sử
  sh.getRange(2, cotSo_('tieu_su'), SO_DONG - 1, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);

  // 5. danh sách chọn người (tab ẩn _DS, tự cập nhật khi thêm người)
  var ds = ss.getSheetByName('_DS') || ss.insertSheet('_DS');
  ds.clear();
  ds.getRange('A1').setValue('Danh sách để chọn — tự động, đừng sửa');
  datCongThucDS_(ds);
  ds.hideSheet();
  var chonNguoi = SpreadsheetApp.newDataValidation().requireValueInRange(ds.getRange('A2:A'), true)
    .setAllowInvalid(true).setHelpText('Chọn người trong danh sách, gõ vài chữ của tên để tìm nhanh.').build();
  sh.getRange(2, cotSo_('ma_cha'), SO_DONG - 1, 3).setDataValidation(chonNguoi);
  var gioi = SpreadsheetApp.newDataValidation().requireValueInList(['Nam', 'Nữ'], true).setAllowInvalid(false).build();
  sh.getRange(2, cotSo_('gioi_tinh'), SO_DONG - 1, 1).setDataValidation(gioi);
  var vai = SpreadsheetApp.newDataValidation().requireValueInList(['Chính thất', 'Kế thất', 'Thứ thất'], true).setAllowInvalid(true).build();
  sh.getRange(2, cotSo_('vai'), SO_DONG - 1, 1).setDataValidation(vai);
  var loai = SpreadsheetApp.newDataValidation().requireValueInList(['Con nuôi', 'Thừa tự'], true).setAllowInvalid(true).build();
  sh.getRange(2, cotSo_('loai_con'), SO_DONG - 1, 1).setDataValidation(loai);

  // 6. gom cột ít dùng sau nút [+]
  var batDau = cotSo_('vai'), soThem = n - batDau + 1;
  sh.setColumnGroupControlPosition(SpreadsheetApp.GroupControlTogglePosition.BEFORE);
  sh.getRange(1, batDau, 1, soThem).shiftColumnGroupDepth(1);
  sh.getColumnGroup(batDau, 1).collapse();

  ss.setActiveSheet(sh);
  SpreadsheetApp.getActive().toast('Đã sắp xếp lại ' + data.length + ' người. Tab cũ đổi tên thành "' + tenCu + '".', 'Gia phả', 8);
}

/* Thêm menu "🌳 Gia phả" lên thanh menu của Google Sheet mỗi khi mở file. */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🌳 Gia phả')
    .addItem('Sắp xếp lại Sheet cho dễ nhìn', 'lamGonSheet')
    .addItem('Điền mã còn thiếu', 'dienMaConThieu')
    .addToUi();
}

/* Điền Mã + Giới tính cho các dòng có tên mà chưa có mã, trong khoảng dòng [tu, den]. */
function dienMa_(sh, tu, den) {
  var nc = sh.getLastColumn();
  var hd = sh.getRange(1, 1, 1, nc).getDisplayValues()[0].map(function (h) { var k = khoa_(h); return BIET_DANH[k] || k; });
  var cMa = hd.indexOf('ma'), cTen = hd.indexOf('ho_ten'), cGt = hd.indexOf('gioi_tinh');
  if (cMa < 0 || cTen < 0) return 0;
  var cuoi = sh.getLastRow();
  if (cuoi < 2) return 0;
  den = Math.min(den, cuoi);
  if (den < tu) return 0;
  var tatCaMa = sh.getRange(2, cMa + 1, cuoi - 1, 1).getDisplayValues();
  var lon = 0, dauMa = 'T', dem = 0;
  tatCaMa.forEach(function (r) {
    var m = String(r[0]).match(/^([A-Za-z]{1,4})(\d+)$/);
    if (m) { dauMa = m[1]; lon = Math.max(lon, +m[2]); }
  });
  var vung = sh.getRange(tu, 1, den - tu + 1, nc).getDisplayValues();
  vung.forEach(function (r, i) {
    if (!String(r[cTen]).trim()) return;
    if (!String(r[cMa]).trim()) { lon++; dem++; sh.getRange(tu + i, cMa + 1).setValue(dauMa + ('00' + lon).slice(-3)); }
    if (cGt >= 0 && !String(r[cGt]).trim()) sh.getRange(tu + i, cGt + 1).setValue(/\sthị\s/i.test(' ' + r[cTen] + ' ') ? 'Nữ' : 'Nam');
  });
  SpreadsheetApp.flush();
  return dem;
}

/* Menu: điền mã cho mọi dòng còn thiếu (phòng khi tự điền bị lỡ). */
function dienMaConThieu() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_NGUOI);
  var lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    var n = dienMa_(sh, 2, sh.getLastRow());
    SpreadsheetApp.getActive().toast(n ? 'Đã điền mã cho ' + n + ' người.' : 'Không còn ai thiếu mã.', 'Gia phả', 5);
  } finally { lock.releaseLock(); }
}

/* Tự điền Mã và Giới tính khi gõ tên người mới (chạy tự động, không cần bấm gì).
   Có khoá để hai lần gõ liền nhau không bị cấp trùng mã. Google đôi khi bỏ qua sự kiện khi gõ quá nhanh,
   nên mỗi lần chạy đều rà cả bảng. */
function onEdit(e) {
  try {
    var sh = e.range.getSheet();
    if (sh.getName() !== TAB_NGUOI || e.range.getLastRow() < 2) return;
    var lock = LockService.getDocumentLock();
    if (!lock.tryLock(20000)) return;
    try { dienMa_(sh, 2, sh.getLastRow()); } // rà cả bảng: dòng nào lần trước bị lỡ cũng được bù
    finally { lock.releaseLock(); }
  } catch (err) { console.error('onEdit lỗi: ' + err + ' | ' + (err && err.stack)); }
}
