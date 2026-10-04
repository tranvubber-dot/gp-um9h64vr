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

/* ---------- LINK CÓ CHÌA KHOÁ ----------
   Chỉ ai mở app bằng link có "#k=<chìa khoá>" mới xem được cây gia phả.
   Chìa khoá lưu trong Thuộc tính tập lệnh LINK_KEY (không nằm trong code trên GitHub).
   Tạo / đổi chìa khoá: chọn hàm datKhoaLink rồi bấm ▶ Chạy, xem link mới trong Nhật ký. */
function khoaDung_(k) { // nhận chìa dài (LINK_KEY) và chìa ngắn (LINK_KEY_NGAN)
  var p = PropertiesService.getScriptProperties(), k = String(k || '');
  return [p.getProperty('LINK_KEY'), p.getProperty('LINK_KEY_NGAN')].some(function (d) { return !!d && k === d; });
}
function chanDo_() { // chặn dò chìa khoá / mã: quá 20 lần sai trong 10 phút thì tạm khoá
  var cache = CacheService.getScriptCache(), sai = +(cache.get('sai') || 0);
  return { qua: sai >= 20, tang: function () { cache.put('sai', String(sai + 1), 600); Utilities.sleep(1500); } };
}

/* Mở thẳng link Apps Script: không trả dữ liệu nữa. */
function doGet() {
  return json_({ loi: 'can_link', thongBao: 'Gia phả này chỉ dành cho người trong họ.' });
}

/* App gửi { k } để lấy cây gia phả; gửi { k, ma } để mở khoá liên lạc. */
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (x) {}
  var cd = chanDo_();
  if (cd.qua) return json_({ ok: false, loi: 'Thử sai quá nhiều lần, đợi 10 phút rồi thử lại' });
  if (!khoaDung_(body.k)) { cd.tang(); return json_({ ok: false, loi: 'can_link' }); }
  if (body.lenh === 'dangNhap') return dangNhap_(body, cd);
  if (batDangNhap_() && !kiemVe_(body.ve)) return json_({ ok: false, loi: 'can_dang_nhap' });
  if (body.lenh === 'sua' || body.lenh === 'them' || body.lenh === 'suaHo') {
    try { return suaThongTin_(body, cd); }
    catch (err) { console.error('suaThongTin_: ' + err + ' | ' + (err && err.stack)); return json_({ ok: false, loi: 'Lỗi máy chủ: ' + (err && err.message || err) }); }
  }

  if (body.ma == null) { // lấy cây gia phả (không có phần riêng tư)
    var d = docSheet_();
    return json_({ ok: true, thongTin: d.thongTin, nguoi: d.cong, capNhat: new Date().toISOString() });
  }
  var ma = PropertiesService.getScriptProperties().getProperty('MA_GIA_DINH');
  if (!ma) return json_({ ok: false, loi: 'Ban quản trị chưa đặt mã gia đình' });
  if (String(body.ma || '').trim() !== String(ma).trim()) { cd.tang(); return json_({ ok: false, loi: 'Sai mã gia đình' }); }
  return json_({ ok: true, lienHe: docSheet_().rieng });
}

/* ---------- SỬA THÔNG TIN TỪ ĐIỆN THOẠI (cần MA_SUA) ----------
   App gửi { k, lenh:'sua', maSua, ma:'T030', anh:'<jpeg base64>'?, truong:{ tieu_su, dien_thoai, zalo, facebook, noi_o } }
   Ảnh lưu vào thư mục Drive "Ảnh gia phả" (ai có link mới xem), link ghi vào cột Ảnh của người đó. */
var TRUONG_SUA = ['ho_ten', 'gioi_tinh', 'ngay_sinh', 'ngay_mat', 'ngay_gio', 'thu_tu', 'que_quan', 'chuc_danh',
  'tieu_su', 'dien_thoai', 'zalo', 'facebook', 'noi_o'];
var QUAN_HE = ['ma_cha', 'ma_me', 'ma_vo_chong']; // app gửi mã (T003), ghi vào Sheet dạng "Tên · T003"

/* ---------- QUYỀN SỬA: mật mã quản trị (MA_SUA) + mật mã riêng từng người trong tab "Quyền sửa" ---------- */
var TAB_QUYEN = 'Quyền sửa', TAB_NHAT_KY = 'Nhật ký sửa';
function aiDuocSua_(ma) {
  ma = String(ma || '').trim(); if (!ma) return null;
  var chu = PropertiesService.getScriptProperties().getProperty('MA_SUA');
  if (chu && ma === String(chu).trim()) return 'Quản trị';
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_QUYEN);
  if (!sh || sh.getLastRow() < 2) return null;
  var v = sh.getRange(2, 1, sh.getLastRow() - 1, 2).getDisplayValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][1]).trim() === ma) return String(v[i][0]).trim() || 'Người được cấp';
  return null;
}
function ghiNhatKy_(ai, viec) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TAB_NHAT_KY);
  if (!sh) {
    sh = ss.insertSheet(TAB_NHAT_KY); sh.appendRow(['Lúc', 'Ai sửa', 'Việc']); sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#8E8A94').setFontColor('#FFFFFF');
    sh.setColumnWidth(1, 140); sh.setColumnWidth(2, 170); sh.setColumnWidth(3, 560);
  }
  sh.appendRow([Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'), ai, viec]);
}
/* Menu: cấp mật mã sửa cho 1 người. Thu hồi = xoá dòng của họ trong tab "Quyền sửa". */
function capMaSua() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Cấp quyền sửa gia phả', 'Gõ tên người được cấp (ví dụ: Chú Chính – con bác Liêm):', ui.ButtonSet.OK_CANCEL);
  var ten = String(r.getResponseText() || '').trim();
  if (r.getSelectedButton() !== ui.Button.OK || !ten) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TAB_QUYEN);
  if (!sh) {
    sh = ss.insertSheet(TAB_QUYEN); sh.getRange('B:B').setNumberFormat('@');
    sh.appendRow(['Người được cấp', 'Mật mã', 'Cấp lúc', 'Ghi chú']); sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#6E56CF').setFontColor('#FFFFFF');
    sh.setColumnWidth(1, 220); sh.setColumnWidth(2, 110); sh.setColumnWidth(3, 140); sh.setColumnWidth(4, 320);
    sh.getRange('A1').setNote('Mỗi dòng là 1 người được sửa gia phả trên app. Xoá dòng = thu hồi quyền ngay.');
  }
  var ma; do { ma = String(Math.floor(100000 + Math.random() * 900000)); } while (aiDuocSua_(ma));
  sh.appendRow([ten, ma, Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm'), 'Xoá dòng này để thu hồi quyền']);
  ui.alert('Đã cấp quyền sửa', 'Mật mã của ' + ten + ':   ' + ma + '\n\nGửi riêng mật mã này cho người đó (Zalo/tin nhắn). Họ nhập 1 lần trên app là sửa được.\nMuốn thu hồi: vào tab "' + TAB_QUYEN + '", xoá dòng của họ.', ui.ButtonSet.OK);
}

/* ---------- ĐĂNG NHẬP: "Bạn là ai, con ai?" — chỉ người có tên trong bảng mới vào được ----------
   Bật/tắt bằng menu 🌳 Gia phả → 🔒 Bật / tắt bắt đăng nhập (Script Property BAT_DANG_NHAP). */
function batDangNhap_() { return PropertiesService.getScriptProperties().getProperty('BAT_DANG_NHAP') === '1'; }
function biMat_() {
  var p = PropertiesService.getScriptProperties(), s = p.getProperty('BI_MAT');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('BI_MAT', s); }
  return s;
}
function ky_(s) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(s), biMat_())).replace(/=+$/, '').slice(0, 24); }
function kiemVe_(ve) { // vé = "T005.<hạn>.<chữ ký>"; người bị xoá khỏi bảng thì vé hết tác dụng
  var x = String(ve || '').split('.'); if (x.length !== 3) return null;
  if (ky_(x[0] + '.' + x[1]) !== x[2] || +x[1] < Date.now()) return null;
  var cache = CacheService.getScriptCache(), k = 've_' + x[0];
  if (cache.get(k)) return x[0];
  if (!bang_().dongCua[x[0]]) return null;
  cache.put(k, '1', 300); return x[0];
}
function boDau_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(ong|ba|bac|chu|co|di|cau|mo|thim|anh|chi|em|con|chau|cu|me|bo|cha|ma|tia|u|thay|vo|chong|cua|la|toi|minh)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function khopTen_(go, ten) { // gõ "Chính" hay "Trần Đình Chính" đều khớp "TRẦN ĐÌNH CHÍNH"
  go = boDau_(go); ten = boDau_(ten);
  return !!go && (go === ten || (' ' + ten).slice(-(go.length + 1)) === ' ' + go);
}
function dangNhap_(body, cd) {
  var b = bang_(), ten = String(body.ten || '').trim(), conAi = String(body.conAi || '').trim(), nam = String(body.namSinh || '').trim();
  if (!ten || !conAi) return json_({ ok: false, loi: 'Gõ tên bạn và tên cha/mẹ (hoặc vợ/chồng)' });
  var cMat = b.cot.indexOf('ngay_mat'), cDm = b.cot.indexOf('da_mat'), cGio = b.cot.indexOf('ngay_gio');
  var ds = Object.keys(b.dongCua).filter(function (m) {
    var r = b.v[b.dongCua[m] - 1];
    if ((cMat >= 0 && r[cMat]) || (cDm >= 0 && r[cDm]) || (cGio >= 0 && r[cGio])) return false; // người đã mất
    if (!khopTen_(ten, b.tenCua[m])) return false;
    var than = [maTu_(b.o(m, 'ma_cha')), maTu_(b.o(m, 'ma_me'))].concat(voChongCua_(b, m, null));
    if (!than.some(function (x) { return x && b.tenCua[x] && khopTen_(conAi, b.tenCua[x]); })) return false;
    return !nam || String(b.o(m, 'ngay_sinh')).indexOf(nam) >= 0;
  });
  if (!ds.length) { cd.tang(); return json_({ ok: false, loi: 'Không tìm thấy bạn trong gia phả. Kiểm tra lại tên, hoặc nhờ trưởng họ thêm bạn vào bảng.' }); }
  if (ds.length > 1) return json_({ ok: false, trung: true, loi: 'Có ' + ds.length + ' người trùng. Gõ họ tên đầy đủ hoặc thêm năm sinh.' });
  var ma = ds[0], het = Date.now() + 400 * 864e5;
  ghiNhatKy_(b.tenCua[ma] + ' (' + ma + ')', 'Đăng nhập app');
  return json_({ ok: true, ve: ma + '.' + het + '.' + ky_(ma + '.' + het), ma: ma, ten: b.tenCua[ma] });
}
/* Menu: bật / tắt bắt đăng nhập */
function batTatDangNhap() {
  var ui = SpreadsheetApp.getUi(), p = PropertiesService.getScriptProperties(), dang = batDangNhap_();
  var r = ui.alert(dang ? 'Đang BẬT bắt đăng nhập' : 'Đang TẮT bắt đăng nhập',
    dang ? 'Tắt đi thì ai có link là xem được, không cần đăng nhập. Tắt?' :
      'Bật lên thì mở app phải trả lời "Bạn là ai, con ai?". Chỉ người CÒN SỐNG có tên trong bảng (và có ghi Cha/Mẹ hoặc Vợ/Chồng) mới vào được.\n\nBật?',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  p.setProperty('BAT_DANG_NHAP', dang ? '0' : '1');
  ui.alert(dang ? 'Đã TẮT bắt đăng nhập.' : 'Đã BẬT. Lần tới mở app, mọi người sẽ được hỏi "Bạn là ai, con ai?".');
}
/* Menu: đăng xuất tất cả máy (đổi bí mật ký vé) */
function dangXuatTatCa() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Đăng xuất tất cả', 'Mọi máy sẽ phải đăng nhập lại. Làm?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  PropertiesService.getScriptProperties().deleteProperty('BI_MAT');
  ui.alert('Xong. Mọi máy sẽ phải đăng nhập lại.');
}

/* ---------- đọc bảng Người + tra quan hệ ---------- */
function bang_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_NGUOI);
  var v = sh.getDataRange().getDisplayValues();
  var cot = v[0].map(function (h) { var k = khoa_(h); return BIET_DANH[k] || k; });
  var b = { sh: sh, v: v, cot: cot, dongCua: {}, tenCua: {}, gioiCua: {} };
  var cMa = cot.indexOf('ma'), cTen = cot.indexOf('ho_ten'), cGt = cot.indexOf('gioi_tinh');
  for (var i = 1; i < v.length; i++) {
    var m = String(v[i][cMa]).trim(); if (!m) continue;
    b.dongCua[m] = i + 1; b.tenCua[m] = String(v[i][cTen]).trim(); b.gioiCua[m] = cGt >= 0 ? String(v[i][cGt]).trim() : '';
  }
  b.nhan = function (m) { m = String(m || '').trim(); return !m ? '' : (b.tenCua[m] ? b.tenCua[m] + ' · ' + m : m); };
  b.o = function (ma, k) { var d = b.dongCua[ma], c = cot.indexOf(k); return d && c >= 0 ? String(v[d - 1][c] || '').trim() : ''; };
  return b;
}
function laNu_(g) { return /^n(ữ|u)/i.test(String(g || '').trim()); }
/* vợ/chồng của 1 người (đọc cả hai chiều), lọc theo giới nếu cần */
function voChongCua_(b, ma, chiNu) {
  var ds = [], cVc = b.cot.indexOf('ma_vo_chong');
  String(b.o(ma, 'ma_vo_chong')).split(/[,;]/).forEach(function (x) { var m = maTu_(x) || x.trim(); if (b.dongCua[m]) ds.push(m); });
  if (cVc >= 0) Object.keys(b.dongCua).forEach(function (m) {
    var o = String(b.v[b.dongCua[m] - 1][cVc] || '');
    if (o.split(/[,;]/).some(function (x) { return (maTu_(x) || x.trim()) === ma; }) && ds.indexOf(m) < 0) ds.push(m);
  });
  return ds.filter(function (m) { return m !== ma && (chiNu == null || laNu_(b.gioiCua[m]) === chiNu); });
}
function conCua_(b, ma) {
  var cCha = b.cot.indexOf('ma_cha'), cMe = b.cot.indexOf('ma_me');
  return Object.keys(b.dongCua).filter(function (m) {
    var r = b.v[b.dongCua[m] - 1];
    return (cCha >= 0 && maTu_(r[cCha]) === ma) || (cMe >= 0 && maTu_(r[cMe]) === ma);
  });
}
/* ghi các trường vào 1 dòng; quan hệ nhận mã → "Tên · Mã" */
function ghiTruong_(b, dong, t) {
  var da = [];
  TRUONG_SUA.concat(QUAN_HE).forEach(function (k) {
    if (!(k in t)) return;
    var c = b.cot.indexOf(k); if (c < 0) return;
    var gt = String(t[k] == null ? '' : t[k]).trim();
    if (QUAN_HE.indexOf(k) >= 0) gt = gt.split(/[,;]/).map(function (x) { return b.nhan(maTu_(x) || x.trim()); }).filter(String).join(', ');
    b.sh.getRange(dong, c + 1).setNumberFormat('@').setValue(gt.slice(0, 5000));
    da.push(k);
  });
  return da;
}
/* Thêm 1 người. qh = { loai: 'con' | 'vo_chong' | '', goc: 'T003', me/cha: mã người kia (tuỳ chọn) } */
function themNguoi_(t, qh, ai) {
  t = t || {}; qh = qh || {};
  var ten = String(t.ho_ten || '').trim();
  if (!ten) throw new Error('Thiếu họ tên');
  var b = bang_(), goc = String(qh.goc || '').trim();
  if (qh.loai && !b.dongCua[goc]) throw new Error('Không thấy người gốc ' + goc);
  if (!t.gioi_tinh) t.gioi_tinh = /\sthị\s/i.test(' ' + ten + ' ') ? 'Nữ' : 'Nam';
  if (qh.loai === 'con') {
    var gocNu = laNu_(b.gioiCua[goc]), ban = qh.banDoi || '';
    if (!ban) { var vc = voChongCua_(b, goc, !gocNu); if (vc.length === 1) ban = vc[0]; }
    t.ma_cha = gocNu ? ban : goc; t.ma_me = gocNu ? goc : ban;
    if (!t.thu_tu) t.thu_tu = String(conCua_(b, goc).length + 1);
  } else if (qh.loai === 'vo_chong') t.ma_vo_chong = goc;
  // mã mới = số lớn nhất + 1
  var lon = 0, dau = 'T';
  Object.keys(b.dongCua).forEach(function (m) { var x = m.match(/^([A-Za-z]{1,4})(\d+)$/); if (x) { dau = x[1]; lon = Math.max(lon, +x[2]); } });
  var ma = dau + ('00' + (lon + 1)).slice(-3);
  // dòng trống đầu tiên sau người cuối cùng
  var cMa = b.cot.indexOf('ma'), cTen = b.cot.indexOf('ho_ten'), cuoi = 1;
  for (var i = 1; i < b.v.length; i++) if (String(b.v[i][cMa]).trim() || String(b.v[i][cTen]).trim()) cuoi = i + 1;
  var dong = cuoi + 1;
  if (dong > b.sh.getMaxRows()) b.sh.insertRowsAfter(b.sh.getMaxRows(), 50);
  b.sh.getRange(dong, cMa + 1).setNumberFormat('@').setValue(ma);
  b.dongCua[ma] = dong; b.tenCua[ma] = ten;
  ghiTruong_(b, dong, t);
  SpreadsheetApp.flush();
  ghiNhatKy_(ai, 'Thêm ' + ten + ' (' + ma + ')' + (qh.loai === 'con' ? ' – con của ' + b.nhan(goc) : qh.loai === 'vo_chong' ? ' – vợ/chồng của ' + b.nhan(goc) : ''));
  return ma;
}

/* App gửi { k, lenh:'sua', maSua, ma, anh?, truong:{…} }  hoặc  { k, lenh:'them', maSua, truong:{…}, quanHe:{ loai, goc, banDoi? } } */
function suaThongTin_(body, cd) {
  var coMa = PropertiesService.getScriptProperties().getProperty('MA_SUA') || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_QUYEN);
  if (!coMa) return json_({ ok: false, loi: 'Ban quản trị chưa đặt mật mã sửa' });
  var ai = aiDuocSua_(body.maSua);
  if (!ai) { cd.tang(); return json_({ ok: false, loi: 'Sai mật mã sửa (hoặc đã bị thu hồi)' }); }
  var lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    if (body.lenh === 'them') return json_({ ok: true, ma: themNguoi_(body.truong, body.quanHe, ai) });
    if (body.lenh === 'suaHo') return json_({ ok: true, daSua: suaThongTinHo_(body.truong || {}, ai) });
    var b = bang_(), dong = b.dongCua[String(body.ma || '').trim()];
    if (!dong) return json_({ ok: false, loi: 'Không tìm thấy người này trong Sheet' });
    var daSua = [], linkAnh = '';
    if (body.anh) {
      var bytes = Utilities.base64Decode(String(body.anh).replace(/^data:image\/\w+;base64,/, ''));
      if (bytes.length > 4 * 1024 * 1024) return json_({ ok: false, loi: 'Ảnh quá lớn' });
      var file = thuMucAnh_().createFile(Utilities.newBlob(bytes, 'image/jpeg', body.ma + '_' + Date.now() + '.jpg'));
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      linkAnh = 'https://drive.google.com/file/d/' + file.getId() + '/view';
      var cAnh = b.cot.indexOf('anh');
      if (cAnh >= 0) { b.sh.getRange(dong, cAnh + 1).setNumberFormat('@').setValue(linkAnh); daSua.push('ảnh'); }
    }
    daSua = daSua.concat(ghiTruong_(b, dong, body.truong || {}));
    SpreadsheetApp.flush();
    if (daSua.length) ghiNhatKy_(ai, 'Sửa ' + b.nhan(body.ma) + ': ' + daSua.join(', '));
    return json_({ ok: true, daSua: daSua, anh: linkAnh });
  } finally { lock.releaseLock(); }
}

/* Sửa tab "Thông tin" (gốc gác dòng họ) từ app */
var TT_HO = { ten_dong_ho: 'Tên dòng họ', que_goc: 'Quê gốc', pha_ky: 'Phả ký', toc_uoc: 'Tộc ước', nha_tho_ho: 'Nhà thờ họ', ban_do_nha_tho: 'Bản đồ nhà thờ' };
function suaThongTinHo_(t, ai) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(TAB_THONG_TIN);
  if (!sh) { sh = ss.insertSheet(TAB_THONG_TIN); sh.appendRow(['Mục', 'Nội dung']); }
  var v = sh.getDataRange().getDisplayValues(), da = [];
  Object.keys(TT_HO).forEach(function (k) {
    if (!(k in t)) return;
    var gt = String(t[k] == null ? '' : t[k]).slice(0, 20000), dong = -1;
    for (var i = 1; i < v.length; i++) if (khoa_(v[i][0]) === k) { dong = i + 1; break; }
    if (dong < 0) { sh.appendRow([TT_HO[k], gt]); } else sh.getRange(dong, 2).setValue(gt);
    da.push(TT_HO[k]);
  });
  if (da.length) ghiNhatKy_(ai, 'Sửa gốc gác dòng họ: ' + da.join(', '));
  return da;
}

/* Chọn Cha (hoặc Mẹ) trên Sheet → tự điền người còn lại (nếu chỉ có 1 vợ/chồng) và "Con thứ" */
function tuDienChaMe_(sh, tu, den) {
  var b = bang_(), cCha = b.cot.indexOf('ma_cha'), cMe = b.cot.indexOf('ma_me'), cThu = b.cot.indexOf('thu_tu');
  if (cCha < 0 || cMe < 0) return;
  for (var d = Math.max(2, tu); d <= Math.min(den, b.v.length); d++) {
    var r = b.v[d - 1], cha = maTu_(r[cCha]), me = maTu_(r[cMe]), goc = cha || me;
    if (cha && !String(r[cMe]).trim()) { var v = voChongCua_(b, cha, true); if (v.length === 1) sh.getRange(d, cMe + 1).setValue(b.nhan(v[0])); }
    if (me && !String(r[cCha]).trim()) { var c = voChongCua_(b, me, false); if (c.length === 1) sh.getRange(d, cCha + 1).setValue(b.nhan(c[0])); }
    if (goc && cThu >= 0 && !String(r[cThu]).trim()) {
      var anhEm = conCua_(b, goc).filter(function (m) { return b.dongCua[m] !== d; });
      sh.getRange(d, cThu + 1).setValue(String(anhEm.length + 1));
    }
  }
}

/* ---------- Biểu mẫu thêm người ngay trong Sheet (menu 🌳 Gia phả → ➕ Thêm người) ---------- */
function moFormThem() {
  var html = HtmlService.createHtmlOutput(FORM_THEM_).setTitle('Thêm người vào gia phả');
  SpreadsheetApp.getUi().showSidebar(html);
}
function dsNguoiChoForm() {
  var b = bang_();
  return Object.keys(b.dongCua).sort(function (x, y) { return b.dongCua[x] - b.dongCua[y]; })
    .map(function (m) { return { ma: m, ten: b.tenCua[m], nu: laNu_(b.gioiCua[m]), vc: voChongCua_(b, m, null) }; });
}
function themTuForm(f) {
  var lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    var t = { ho_ten: f.ho_ten, gioi_tinh: f.gioi_tinh, ngay_sinh: f.ngay_sinh, ngay_mat: f.ngay_mat, ngay_gio: f.ngay_gio };
    Object.keys(t).forEach(function (k) { if (!t[k]) delete t[k]; });
    var ai = 'Biểu mẫu trên Sheet';
    return themNguoi_(t, { loai: f.loai, goc: f.goc, banDoi: f.banDoi }, ai);
  } finally { lock.releaseLock(); }
}
var FORM_THEM_ = '<!doctype html><html><head><meta charset="utf-8"><style>' +
  'body{font:14px system-ui,-apple-system,sans-serif;margin:14px;color:#222}label{display:block;margin:12px 0 4px;font-weight:600}' +
  'input,select{width:100%;box-sizing:border-box;padding:9px;border:1px solid #ccc;border-radius:8px;font-size:14px}' +
  '.hang{display:flex;gap:8px}.hang>*{flex:1}button{margin-top:16px;width:100%;padding:12px;border:0;border-radius:10px;background:#E5383B;color:#fff;font-size:15px;font-weight:700;cursor:pointer}' +
  '.goi{color:#777;font-size:12px;margin-top:4px}#tb{margin-top:12px;padding:10px;border-radius:8px;display:none}.ok{background:#E8F7EE;color:#176B3A}.loi{background:#FDECEC;color:#A11}' +
  '</style></head><body>' +
  '<label>Người này là</label><select id="loai"><option value="con">Con của…</option><option value="vo_chong">Vợ / chồng của…</option><option value="">Người mới (chưa nối với ai)</option></select>' +
  '<div id="khungGoc"><label id="nhanGoc">Con của</label><select id="goc"></select><div id="khungBan"><label>Với (mẹ/cha của cháu)</label><select id="ban"></select></div></div>' +
  '<label>Họ và tên</label><input id="ten" placeholder="Trần Văn …" autofocus>' +
  '<label>Giới tính</label><select id="gt"><option value="">Tự đoán (có chữ “Thị” là Nữ)</option><option>Nam</option><option>Nữ</option></select>' +
  '<div class="hang"><div><label>Năm / ngày sinh</label><input id="sinh" placeholder="1958"></div><div><label>Năm / ngày mất</label><input id="mat" placeholder="để trống nếu còn sống"></div></div>' +
  '<label>Ngày giỗ (âm lịch)</label><input id="gio" placeholder="12/3">' +
  '<button id="nut">➕ Thêm vào gia phả</button><div id="tb"></div>' +
  '<p class="goi">Mã, cha mẹ, con thứ tự điền. Thêm xong form vẫn mở để thêm tiếp người sau.</p>' +
  '<script>var DS=[];function $(i){return document.getElementById(i)}' +
  'function veGoc(){var l=$("loai").value;$("khungGoc").style.display=l?"":"none";$("nhanGoc").textContent=l==="con"?"Con của":"Vợ / chồng của";' +
  'var cu=$("goc").value;$("goc").innerHTML=DS.map(function(p){return "<option value=\\""+p.ma+"\\">"+p.ten+" · "+p.ma+"</option>"}).join("");if(cu)$("goc").value=cu;veBan()}' +
  'function veBan(){var p=DS.filter(function(x){return x.ma===$("goc").value})[0];var vc=p?p.vc:[];var hien=$("loai").value==="con"&&vc.length>1;$("khungBan").style.display=hien?"":"none";' +
  '$("ban").innerHTML=vc.map(function(m){var q=DS.filter(function(x){return x.ma===m})[0];return "<option value=\\""+m+"\\">"+(q?q.ten:m)+" · "+m+"</option>"}).join("")}' +
  'function tai(chon){google.script.run.withSuccessHandler(function(d){DS=d;veGoc();if(chon)$("goc").value=chon;veBan()}).dsNguoiChoForm()}' +
  '$("loai").onchange=veGoc;$("goc").onchange=veBan;' +
  '$("nut").onclick=function(){var f={loai:$("loai").value,goc:$("goc").value,banDoi:$("khungBan").style.display===""?$("ban").value:"",ho_ten:$("ten").value.trim(),gioi_tinh:$("gt").value,ngay_sinh:$("sinh").value.trim(),ngay_mat:$("mat").value.trim(),ngay_gio:$("gio").value.trim()};' +
  'if(!f.ho_ten){$("ten").focus();return}$("nut").disabled=true;$("nut").textContent="Đang thêm…";' +
  'google.script.run.withSuccessHandler(function(ma){var tb=$("tb");tb.className="ok";tb.style.display="block";tb.textContent="Đã thêm "+f.ho_ten+" ("+ma+").";' +
  '["ten","sinh","mat","gio"].forEach(function(i){$(i).value=""});$("gt").value="";$("nut").disabled=false;$("nut").textContent="➕ Thêm vào gia phả";$("ten").focus();tai(f.goc)})' +
  '.withFailureHandler(function(e){var tb=$("tb");tb.className="loi";tb.style.display="block";tb.textContent="Lỗi: "+e.message;$("nut").disabled=false;$("nut").textContent="➕ Thêm vào gia phả"}).themTuForm(f)};' +
  'tai()</script></body></html>';

function thuMucAnh_() {
  var ten = 'Ảnh gia phả', it = DriveApp.getFoldersByName(ten);
  return it.hasNext() ? it.next() : DriveApp.createFolder(ten);
}
/* Menu 🌳 Gia phả → Đặt mật mã sửa: tự gõ mật mã (ví dụ số điện thoại dễ nhớ). Không lưu trong code. */
function datMaSua() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Mật mã sửa thông tin', 'Ai biết mật mã này mới đổi được ảnh / tiểu sử / liên lạc từ điện thoại.\nGõ mật mã mới (ít nhất 6 ký tự):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var m = String(r.getResponseText() || '').trim();
  if (m.length < 6) { ui.alert('Mật mã quá ngắn, cần ít nhất 6 ký tự.'); return; }
  PropertiesService.getScriptProperties().setProperty('MA_SUA', m);
  thuMucAnh_(); // tạo sẵn thư mục ảnh trên Drive
  ui.alert('Đã đặt mật mã sửa. Thư mục "Ảnh gia phả" đã có trên Google Drive.');
}

/* Chạy thử phần lưu ảnh lên Drive (chọn hàm này rồi bấm ▶ Chạy). Tạo 1 ảnh nhỏ rồi xoá luôn. */
function thuDrive() {
  var thuMuc = thuMucAnh_();
  Logger.log('Thư mục: ' + thuMuc.getName() + ' ' + thuMuc.getUrl());
  var png = Utilities.base64Decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==');
  var file = thuMuc.createFile(Utilities.newBlob(png, 'image/png', 'thu.png'));
  Logger.log('Tạo file OK: ' + file.getId());
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); Logger.log('Chia sẻ công khai OK'); }
  catch (e) { Logger.log('Chia sẻ LỖI: ' + e); }
  file.setTrashed(true);
}

/* Tạo chìa khoá mới (link cũ sẽ hết tác dụng). Link mới hiện trong Nhật ký thực thi. */
function datKhoaLink() {
  var k = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  PropertiesService.getScriptProperties().setProperty('LINK_KEY', k);
  Logger.log('LINK MỚI: https://tranvubber-dot.github.io/gp-um9h64vr/#k=' + k);
}

/* Tạo chìa khoá NGẮN (10 ký tự) cho link gọn: …/gp-um9h64vr/#Ab3dE5fG7h. Chìa dài cũ vẫn dùng được. */
function datKhoaNgan() {
  var chu = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789', b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now()), k = '';
  for (var i = 0; i < 10; i++) k += chu.charAt((b[i] + 256) % chu.length);
  PropertiesService.getScriptProperties().setProperty('LINK_KEY_NGAN', k);
  Logger.log('LINK GỌN: https://tranvubber-dot.github.io/gp-um9h64vr/#' + k);
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
    .addItem('➕ Thêm người (biểu mẫu)', 'moFormThem')
    .addSeparator()
    .addItem('🔑 Đặt mật mã quản trị của tôi', 'datMaSua')
    .addItem('👤 Cấp mật mã sửa cho người khác', 'capMaSua')
    .addSeparator()
    .addItem('🔒 Bật / tắt bắt đăng nhập', 'batTatDangNhap')
    .addItem('🚪 Đăng xuất tất cả máy', 'dangXuatTatCa')
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
    try {
      dienMa_(sh, 2, sh.getLastRow()); // rà cả bảng: dòng nào lần trước bị lỡ cũng được bù
      var hd = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(function (h) { var k = khoa_(h); return BIET_DANH[k] || k; });
      var c1 = e.range.getColumn(), c2 = e.range.getLastColumn(), cCha = hd.indexOf('ma_cha') + 1, cMe = hd.indexOf('ma_me') + 1;
      if ((cCha >= c1 && cCha <= c2) || (cMe >= c1 && cMe <= c2)) tuDienChaMe_(sh, e.range.getRow(), e.range.getLastRow());
    }
    finally { lock.releaseLock(); }
  } catch (err) { console.error('onEdit lỗi: ' + err + ' | ' + (err && err.stack)); }
}
