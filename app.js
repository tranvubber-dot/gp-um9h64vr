/* Gia phả Họ Trần — giao diện chính */
(function () {
  'use strict';
  var C = window.GP_CONFIG || {};
  var $ = function (s) { return document.querySelector(s); };
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- lưu trên máy (bọc try vì Safari riêng tư có thể chặn) ---------- */
  function doc(k, mac) { try { var v = localStorage.getItem('gp_' + k); return v == null ? mac : JSON.parse(v); } catch (e) { return mac; } }
  function ghi(k, v) {
    try { if (v == null) localStorage.removeItem('gp_' + k); else localStorage.setItem('gp_' + k, JSON.stringify(v)); } catch (e) {}
    idbGhi(k, v == null ? null : JSON.stringify(v));
  }

  /* ---------- Bộ nhớ dự phòng: mọi cài đặt chép thêm vào IndexedDB.
     localStorage lỡ trống (iOS dọn, lỗi) thì tự khôi phục từ đây. ---------- */
  var IDB = null;
  function moIDB() {
    return new Promise(function (ok) {
      try {
        var r = indexedDB.open('giapha', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
        r.onsuccess = function () { IDB = r.result; ok(IDB); };
        r.onerror = function () { ok(null); };
      } catch (e) { ok(null); }
    });
  }
  function idbGhi(k, v) {
    if (!IDB) return;
    try { var st = IDB.transaction('kv', 'readwrite').objectStore('kv'); if (v == null) st.delete(k); else st.put(v, k); } catch (e) {}
  }
  function idbDocHet() {
    return new Promise(function (ok) {
      if (!IDB) return ok({});
      try {
        var out = {}, c = IDB.transaction('kv').objectStore('kv').openCursor();
        c.onsuccess = function () { var cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else ok(out); };
        c.onerror = function () { ok(out); };
      } catch (e) { ok({}); }
    });
  }
  var KHOI_PHUC = new Promise(function (ok) {
    var xong = false; setTimeout(function () { if (!xong) { xong = true; ok(0); } }, 1200);
    moIDB().then(idbDocHet).then(function (kv) {
      var n = 0;
      Object.keys(kv).forEach(function (k) {
        try { if (localStorage.getItem('gp_' + k) == null) { localStorage.setItem('gp_' + k, kv[k]); if (k !== 'dulieu') n++; } } catch (e) {}
      });
      try { // chiều ngược lại: thứ chỉ có trong localStorage thì chép sang IndexedDB
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf('gp_') === 0 && !(key.slice(3) in kv)) idbGhi(key.slice(3), localStorage.getItem(key));
        }
      } catch (e) {}
      if (!xong) { xong = true; ok(n); }
    });
  });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  /* ---------- Link khôi phục: #kp=<cài đặt mã hoá> (không chứa số điện thoại hay mã gia đình) ---------- */
  var KHOA_LINK = ['toi', 'cachxem', 'xhCheDo', 'anMau', 'khoa'];
  /* Chìa khoá xem gia phả: lấy từ link "#k=…" (người trong họ gửi cho nhau), lưu lại trên máy. */
  function layKhoaTuChuoi(s) { // nhận cả link dài "#k=…" lẫn link ngắn "#Ab3dE5fG7h"
    s = String(s || '').trim();
    var m = s.match(/[#&?]k=([A-Za-z0-9_-]{8,})/) || s.match(/#([A-Za-z0-9]{8,16})$/);
    return m ? m[1] : (/^[A-Za-z0-9_-]{24,}$/.test(s) ? s : null);
  }
  function linkChiaSe(k) { return location.origin + location.pathname + (/^[A-Za-z0-9]{8,16}$/.test(k) ? '#' : '#k=') + k; }
  (function () { var k = layKhoaTuChuoi(location.hash); if (k) { try { localStorage.setItem('gp_khoa', JSON.stringify(k)); } catch (e) {} } })();
  (function () {
    var m = location.hash.match(/[#&]kp=([^&]+)/); if (!m) return;
    try {
      var o = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))));
      KHOA_LINK.forEach(function (k) { if (k in o) localStorage.setItem('gp_' + k, JSON.stringify(o[k])); });
      sessionStorage.setItem('gp_vuaKhoiPhuc', '1');
    } catch (e) {}
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
  })();
  window.addEventListener('hashchange', function () { if (/[#&](kp|k)=/.test(location.hash) || /^#[A-Za-z0-9]{8,16}$/.test(location.hash)) location.reload(); });
  function taoLinkKhoiPhuc() {
    var o = {}; KHOA_LINK.forEach(function (k) { var v = doc(k, null); if (v != null) o[k] = v; });
    var b = btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return location.origin + location.pathname + '#kp=' + b;
  }

  /* ---------- lò xo: mô phỏng rồi xuất thành CSS linear() ---------- */
  (function caiLoXo() {
    var giam = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // iOS/Safari 26 chạy linear() ở luồng chính (WebKit bug 312407) → trên iPhone/iPad dùng cubic-bezier có nảy
    var IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (IOS) document.documentElement.classList.add('ios');
    var coLinear = !IOS && window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)');
    var KIEU = { bouncy: [260, 15], soft: [170, 20], wobbly: [180, 10], sheet: [300, 24] };
    var r = document.documentElement.style;
    Object.keys(KIEU).forEach(function (n) {
      var k = KIEU[n][0], c = KIEU[n][1], dt = 1 / 240, x = 0, v = 0, t = 0, pts = [0];
      for (var i = 0; i < 960; i++) {
        var a = -k * (x - 1) - c * v; v += a * dt; x += v * dt; t += dt;
        if (i % 4 === 3) pts.push(+x.toFixed(4));
        if (t > .25 && Math.abs(x - 1) < .0008 && Math.abs(v) < .01) break;
      }
      pts[pts.length - 1] = 1;
      var buoc = Math.max(1, Math.floor(pts.length / 60));
      var ease = coLinear ? 'linear(' + pts.filter(function (_, i) { return i % buoc === 0 || i === pts.length - 1; }).join(', ') + ')'
        : (c / (2 * Math.sqrt(k)) < .7 ? 'cubic-bezier(.3,1.45,.45,1)' : 'cubic-bezier(.25,1.1,.4,1)');
      r.setProperty('--sp-' + n, giam ? 'ease' : ease);
      r.setProperty('--sp-' + n + '-ms', (giam ? 120 : Math.round(t * 1000)) + 'ms');
    });
  })();

  var CD = Object.assign({ truyenThong: false, traiTruocGaiSau: false, hienNgoaiTon: C.hienNgoaiTon !== false }, doc('cachxem', {}));
  var PB = ((document.currentScript && document.currentScript.src || '').match(/v=([\d.]+)/) || [])[1];
  var RAW = null;          // dữ liệu công khai (đã bỏ phần riêng tư)
  var LH = doc('lienhe', null); // phần riêng tư đã mở khoá: { ma: {dien_thoai, zalo, facebook, noi_o, ngay_sinh} }
  var LA_MAU = !C.apiUrl;
  var DB = null;
  var TOI = doc('toi', null), XH_TOI = {}; // người đang xem là ai, và bạn gọi từng người là gì

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bao(msg) {
    var t = $('#thongBao'); t.textContent = msg; t.hidden = false;
    clearTimeout(bao._t); bao._t = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* Ảnh Drive vừa tải lên cần vài giây để Google tạo hình thu nhỏ: lỗi thì thử lại, đừng bỏ ngay. */
  function thuLaiAnh(im, boDi) {
    var n = +(im.getAttribute('data-thu') || 0), goc = im.getAttribute('data-goc') || im.getAttribute('href') || im.getAttribute('src') || '';
    if (n >= 5 || /^data:/.test(goc)) { boDi(); return; }
    im.setAttribute('data-goc', goc); im.setAttribute('data-thu', n + 1);
    setTimeout(function () {
      var u = goc + (goc.indexOf('?') < 0 ? '?' : '&') + 'thu=' + (n + 1);
      if (im.tagName.toLowerCase() === 'img') im.src = u; else im.setAttribute('href', u);
    }, [1500, 3000, 6000, 12000, 20000][n]);
  }
  window.GP_anhLoi = function (im) { thuLaiAnh(im, function () { var k = im.closest('.anh-lon'); if (k) k.remove(); }); };
  var ANH_TAM = {}; // ảnh vừa đổi trên máy này: hiện ngay, không chờ Google

  /* ---------- phần riêng tư: chỉ hiện khi có mã gia đình ---------- */
  var COT_RIENG = ['dien_thoai', 'zalo', 'facebook', 'noi_o'];
  function conSongDong(r) { return !(r.ngay_mat || r.da_mat || r.ngay_gio); }
  function tachRiengTu(rows) { // dùng cho dữ liệu mẫu, giống hệt Apps Script làm phía Google
    var cong = [], rieng = {};
    rows.forEach(function (r) {
      var o = Object.assign({}, r), x = {};
      COT_RIENG.forEach(function (k) { if (o[k]) x[k] = o[k]; delete o[k]; });
      if (conSongDong(r) && o.ngay_sinh) {
        var y = String(o.ngay_sinh).match(/(\d{4})/);
        if (String(o.ngay_sinh) !== (y && y[1])) { x.ngay_sinh = o.ngay_sinh; o.ngay_sinh = y ? y[1] : ''; }
      }
      if (Object.keys(x).length) rieng[o.ma] = x;
      cong.push(o);
    });
    return { cong: cong, rieng: rieng };
  }
  function ghepRiengTu(rows) {
    if (!LH) return rows;
    return rows.map(function (r) { return LH[r.ma] ? Object.assign({}, r, LH[r.ma]) : r; });
  }

  /* ---------- tải dữ liệu ---------- */
  var MAU_RIENG = null;
  function taiDuLieu(epMoi) {
    if (LA_MAU) {
      var t = tachRiengTu(window.GP_MAU.nguoi);
      MAU_RIENG = t.rieng;
      return Promise.resolve({ thongTin: window.GP_MAU.thongTin, nguoi: t.cong, capNhat: null });
    }
    var khoa = doc('khoa', null), cu = khoa ? doc('dulieu', null) : null;
    if (!khoa) return Promise.reject({ canLink: true });
    var moi = fetch(C.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ k: khoa, ve: doc('ve', null) }) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (d && d.loi === 'can_link') throw { canLink: true };
        if (d && d.loi === 'can_dang_nhap') throw { canDangNhap: true };
        if (!d || !d.nguoi) throw new Error(d && d.loi || 'Dữ liệu không đúng dạng');
        delete d.ok; d.taiLuc = Date.now(); ghi('dulieu', d); return d;
      });
    if (cu && !epMoi) { // hiện ngay bản đã lưu, cập nhật ngầm
      moi.then(function (d) { if (JSON.stringify(d.nguoi) !== JSON.stringify(cu.nguoi) || JSON.stringify(d.thongTin) !== JSON.stringify(cu.thongTin)) { RAW = d; dungLai(); bao('Đã cập nhật dữ liệu mới'); } })
        .catch(function (e) { if (e && e.canLink) khoaApp(true); else if (e && e.canDangNhap) moDangNhap(); });
      return Promise.resolve(cu);
    }
    return moi.catch(function (e) {
      if (e && (e.canLink || e.canDangNhap)) throw e;
      if (cu) { bao('Không tải được dữ liệu mới, đang dùng bản đã lưu'); return cu; }
      throw e;
    });
  }

  function dungLai(giuViTri) {
    DB = window.GiaPhaDB.dung({ thongTin: RAW.thongTin, nguoi: ghepRiengTu(RAW.nguoi) }, { traiTruocGaiSau: CD.traiTruocGaiSau });
    Object.keys(ANH_TAM).forEach(function (id) { if (DB.byId[id]) DB.byId[id].anh = ANH_TAM[id]; });
    tinhXungToi();
    $('#dangTai').hidden = true;
    veDau(); veCay(giuViTri); veTraCuu(); veXungHo(); veGio(); veDongHo(); veNhacGio();
  }

  /* ---------- "Bạn là ai?" ---------- */
  function tinhXungToi() {
    XH_TOI = {};
    if (TOI && !DB.byId[TOI]) TOI = null;
    if (!TOI) return;
    DB.list.forEach(function (p) {
      if (p.id === TOI) return;
      var r = window.XungHo.goi(DB, TOI, p.id), r2 = window.XungHo.goi(DB, p.id, TOI);
      XH_TOI[p.id] = { goi: (r && r.tu) || '', duocGoi: (r2 && r2.tu) || '' };
    });
  }
  function hoa(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function veNutToi() {
    var c = $('#chamToi'), p = TOI && DB.byId[TOI];
    c.className = 'cham' + (p ? (p.gioi === 'nu' ? ' nu' : ' nam') : '');
    c.textContent = p ? tenGoi(p).charAt(0) : '?';
    $('#nutToi').title = p ? 'Bạn: ' + p.ten + ' (bấm để đổi)' : 'Bạn là ai?';
  }
  function moHoiToi() {
    $('#hoiToi').hidden = false; $('#buocChon').hidden = false; $('#buocXacNhan').hidden = true;
    $('#timToi').value = ''; veDsToi();
    if (window.innerWidth > 700) setTimeout(function () { $('#timToi').focus(); }, 60);
  }
  function veDsToi() {
    var q = boDau($('#timToi').value.trim());
    var ds = DB.list.filter(function (p) { return !q || boDau(p.ten + ' ' + p.id).indexOf(q) >= 0; })
      .sort(function (a, b) { return (a.daMat - b.daMat) || (b.doi - a.doi) || a.thuTuDong - b.thuTuDong; }).slice(0, 60);
    $('#dsToi').innerHTML = ds.map(function (p) {
      return '<li data-toi="' + esc(p.id) + '">' + cham(p) + '<div><b>' + esc(p.ten) + '</b><span class="phu">' +
        esc(['Đời ' + p.doi, moTaNgan(p)].filter(Boolean).join(' · ')) + '</span></div></li>';
    }).join('') || '<li class="phu">Không thấy tên này. Nhờ người quản lý thêm bạn vào Google Sheet.</li>';
  }
  function xacNhanToi(id) {
    var p = DB.byId[id]; if (!p) return;
    var cha = p.cha && DB.byId[p.cha], me = p.me && DB.byId[p.me];
    var dong = [];
    if (cha || me) dong.push('Con của ' + [cha && ('ông <b>' + esc(cha.ten) + '</b>'), me && ('bà <b>' + esc(me.ten) + '</b>')].filter(Boolean).join(' và '));
    if (p.dauRe) dong.push(esc(vaiDauRe(p)));
    var vc = p.voChong.map(function (i) { return DB.byId[i].ten; });
    if (vc.length && !p.dauRe) dong.push((p.gioi === 'nam' ? 'Vợ: ' : 'Chồng: ') + '<b>' + esc(vc.join(', ')) + '</b>');
    dong.push('Đời thứ ' + p.doi + (tenChi(p) ? ', ' + esc(tenChi(p)) : ''));
    $('#xacNhanThe').innerHTML = '<div class="xac-nhan">' + cham(p) + '<h2>Bạn là ' + esc(p.ten) + '?</h2><p>' + dong.join('</p><p>') + '</p></div>';
    $('#xacNhanThe').dataset.id = id;
    $('#buocChon').hidden = true; $('#buocXacNhan').hidden = false;
  }
  $('#timToi').addEventListener('input', veDsToi);
  $('#dsToi').addEventListener('click', function (e) { var li = e.target.closest('[data-toi]'); if (li) xacNhanToi(li.getAttribute('data-toi')); });
  $('#chonLaiToi').onclick = function () { $('#buocChon').hidden = false; $('#buocXacNhan').hidden = true; };
  $('#dungLaToi').onclick = function () {
    TOI = $('#xacNhanThe').dataset.id; ghi('toi', TOI); ghi('boQuaToi', null);
    $('#hoiToi').hidden = true; dungLai(); chuyenTab('phado');
    setTimeout(function () { canhGiua(TOI, true); }, 350);
    bao('Chào ' + tenGoi(DB.byId[TOI]) + '! Mỗi thẻ giờ ghi bạn gọi người đó là gì.');
  };
  $('#boQuaToi').onclick = function () { ghi('boQuaToi', true); $('#hoiToi').hidden = true; };
  $('#nutToi').onclick = moHoiToi;

  /* ---------- tiện ích hiển thị ---------- */
  var IN = window.GiaPhaDB.inNgay;
  function namSinh(p) { return p.sinh && p.sinh.y; }
  function namMat(p) { return p.mat && p.mat.y; }
  function chuNam(p) {
    if (p.daMat) {
      var a = namSinh(p), b = namMat(p);
      if (!a && !b) return 'Đã mất';
      return (a || '?') + ' – ' + (b || '?');
    }
    return namSinh(p) ? 'Sinh ' + namSinh(p) : '';
  }
  function tuoiTho(p) {
    var a = namSinh(p), b = namMat(p);
    if (!a || !b) return '';
    var t = b - a + 1;
    return (t >= 60 ? 'hưởng thọ ' : 'hưởng dương ') + t + ' tuổi';
  }
  function tenGoi(p) { var w = p.ten.trim().split(/\s+/); return w[w.length - 1]; }
  function tenChi(p) { var c = p.chi && DB.chiList[p.chi - 1]; return c ? c.ten : ''; }
  function vaiDauRe(p) {
    var s = p.voChong.map(function (i) { return DB.byId[i]; }).filter(function (q) { return q.huyetThong; })[0];
    if (!s) return '';
    return (p.gioi === 'nu' ? (p.vai || 'Vợ') : 'Chồng') + ' của ' + s.ten;
  }
  function moTaNgan(p) {
    if (p.dauRe) return vaiDauRe(p) || 'Dâu / rể';
    var cha = p.cha && DB.byId[p.cha], me = p.me && DB.byId[p.me];
    var bo = cha && cha.huyetThong ? cha : (me || cha);
    return (bo ? (p.ngoaiTon ? 'Cháu ngoại, con bà ' : 'Con ' + (bo.gioi === 'nu' ? 'bà ' : 'ông ')) + bo.ten : (p === DB.thuyTo ? 'Thủy tổ' : ''));
  }
  function cham(p, lop) {
    var anh = p.anh ? '<img src="' + esc(p.anh) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '';
    return '<span class="cham ' + (p.gioi === 'nu' ? 'nu ' : '') + (p.daMat ? 'mat ' : '') + (lop || '') + '">' + esc(tenGoi(p).charAt(0)) + anh + '</span>';
  }

  /* ---------- ĐẦU TRANG ---------- */
  function veDau() {
    var tt = DB.thongTin, ten = tt.ten_dong_ho || 'Họ Trần';
    $('#tenHo').textContent = 'Gia phả ' + ten;
    document.title = 'Gia phả ' + ten;
    $('#queGoc').textContent = tt.que_goc ? 'Quê gốc: ' + tt.que_goc : DB.list.length + ' người · ' + DB.soDoi + ' đời';
    $('#bangMau').hidden = !LA_MAU || doc('anMau', false);
    veNutToi();
  }

  /* =================== PHẢ ĐỒ =================== */
  var CW = 196, CH = 78, SG = 18, HG = 22, RH = 140;
  var KHUNG_W = 100, KHUNG_H = 137, KHUNG_CACH = 14; // khung ảnh thờ mạ vàng, đặt tách trên thẻ cụ ông + cụ bà Thủy tổ
  function laCuTo(p) { var t = DB.thuyTo; return !!t && (p === t || t.voChong.indexOf(p.id) >= 0); }
  var thuGon = new Set(doc('thugon', []));
  var V = { x: 0, y: 0, k: 1 }, chonId = null;
  var svg = $('#cay'), G = $('#cayG');

  function conHien(p) {
    var c = p.con;
    if (CD.truyenThong) c = c.filter(function (x) { return x.gioi === 'nam' && !x.ngoaiTon; });
    else if (!CD.hienNgoaiTon) c = c.filter(function (x) { return !x.ngoaiTon; });
    if (p.ngoaiTon) c = []; // cháu ngoại chỉ ghi 1 đời
    return c;
  }
  function vcHien(p) { return p.voChong.map(function (i) { return DB.byId[i]; }).filter(function (s) { return !s.huyetThong; }); }

  var doDai = (function () {
    var cv = document.createElement('canvas').getContext('2d');
    return function (s, font) { cv.font = font; return cv.measureText(s).width; };
  })();

  function el(tag, at, cha) {
    var e = document.createElementNS(NS, tag);
    for (var k in at) e.setAttribute(k, at[k]);
    if (cha) cha.appendChild(e);
    return e;
  }
  function chu(cha, x, y, s, lop, maxW) {
    var t = el('text', { x: x, y: y, 'class': lop }, cha); t.textContent = s;
    if (maxW) {
      var f = lop === 'ten' ? '700 14px "Be Vietnam Pro", sans-serif' : (lop === 'nam-st' ? '11.5px "Be Vietnam Pro", sans-serif' : '600 10.5px "Be Vietnam Pro", sans-serif');
      if (doDai(s, f) > maxW) { t.setAttribute('textLength', maxW); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    }
    return t;
  }

  function veThe(p, x, y, cha) {
    var lop = 'the ' + (p.gioi === 'nu' ? 'nu' : 'nam') + (p.daMat ? ' mat' : '') + (p.dauRe ? ' dr' : '') + (p.id === chonId ? ' chon' : '') + (p.id === TOI ? ' toi' : '');
    var g = el('g', { 'class': lop, 'data-id': p.id, transform: 'translate(' + x + ',' + y + ')' }, cha);
    var vo = el('g', { 'class': 'vo' }, g);
    if (p.id === TOI) el('rect', { 'class': 'hao-quang', x: -6, y: -6, width: CW + 12, height: CH + 12, rx: 26, filter: 'url(#fHao)' }, vo); // hào quang vàng cho thẻ "Bạn"
    if (laCuTo(p)) { // ảnh thờ trong khung vàng, dựng tách phía trên thẻ
      var fx = (CW - KHUNG_W) / 2, fy = -KHUNG_H - KHUNG_CACH, wx = fx + KHUNG_W * 0.223, wy = fy + KHUNG_H * 0.157, ww = KHUNG_W * 0.546, wh = KHUNG_H * 0.688;
      var hq = el('g', { 'class': 'hao-to', transform: 'translate(' + (fx + KHUNG_W / 2) + ' ' + (fy + KHUNG_H / 2) + ')' }, vo); // hào quang chói lọi
      var tia = el('g', { 'class': 'tia-xoay', mask: 'url(#mTia)' }, hq), tiaD = '';
      for (var ti = 0; ti < 18; ti++) { var ga = ti * Math.PI / 9, gw = 0.075; tiaD += 'M0,0L' + (165 * Math.cos(ga - gw)).toFixed(1) + ',' + (165 * Math.sin(ga - gw)).toFixed(1) + 'L' + (165 * Math.cos(ga + gw)).toFixed(1) + ',' + (165 * Math.sin(ga + gw)).toFixed(1) + 'Z'; }
      el('path', { d: tiaD, fill: '#ffd56a' }, tia);
      el('ellipse', { 'class': 'quang-to', rx: KHUNG_W * 0.95, ry: KHUNG_H * 0.82, fill: 'url(#gHaoTo)' }, hq);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q, qi) {
        el('path', { 'class': 'lap-lanh', d: 'M0,-9L2,-2L9,0L2,2L0,9L-2,2L-9,0L-2,-2Z', fill: '#fffbe6',
          transform: 'translate(' + (q[0] * KHUNG_W * 0.5) + ' ' + (q[1] * KHUNG_H * 0.5) + ')', style: 'animation-delay:' + (qi * 0.55) + 's' }, hq);
      });
      var kt = el('g', { 'class': 'khung-to' }, vo);
      var cp = el('clipPath', { id: 'cKhungTo-' + p.id }, kt); el('rect', { x: wx, y: wy, width: ww, height: wh }, cp);
      el('rect', { x: wx, y: wy, width: ww, height: wh, fill: p.gioi === 'nu' ? 'url(#gNu)' : 'url(#gNam)' }, kt);
      var cc = chu(kt, wx + ww / 2, wy + wh / 2 + 12, tenGoi(p).charAt(0).toUpperCase(), 'chu-cai'); cc.setAttribute('text-anchor', 'middle'); cc.style.fontSize = '34px';
      if (p.anh) {
        var ia = el('image', { x: wx, y: wy, width: ww, height: wh, 'clip-path': 'url(#cKhungTo-' + p.id + ')', preserveAspectRatio: 'xMidYMid slice' }, kt);
        ia.addEventListener('error', function () { thuLaiAnh(ia, function () { ia.remove(); }); }); ia.setAttribute('href', p.anh);
      }
      el('image', { x: fx, y: fy, width: KHUNG_W, height: KHUNG_H, href: 'nen/khung-to.webp' }, kt);
    }
    // bóng mềm giả (2 lớp, không dùng filter để kéo thả mượt)
    el('rect', { 'class': 'bong2', x: -2, y: 4, width: CW + 4, height: CH + 4, rx: 22 }, vo);
    el('rect', { 'class': 'bong1', x: 0, y: 2.5, width: CW, height: CH + 1, rx: 20 }, vo);
    el('rect', { 'class': 'nen', width: CW, height: CH, rx: 20 }, vo);
    el('rect', { 'class': 'to-mau', x: 1.5, y: 1.5, width: CW - 3, height: CH - 3, rx: 18.5 }, vo);
    // ảnh tròn / chữ cái đầu trên nền chuyển màu
    var cx = 33, cy = CH / 2, r = 21;
    el('circle', { cx: cx, cy: cy, r: r, fill: p.gioi === 'nu' ? 'url(#gNu)' : 'url(#gNam)' }, vo); // màu ảnh theo giới tính; nền thẻ theo tình trạng
    chu(vo, cx, cy + 6, tenGoi(p).charAt(0).toUpperCase(), 'chu-cai').setAttribute('text-anchor', 'middle');
    if (p.anh) {
      var im = el('image', { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, 'clip-path': 'url(#cTron)', preserveAspectRatio: 'xMidYMid slice' }, vo);
      im.addEventListener('error', function () { thuLaiAnh(im, function () { im.remove(); }); });
      im.setAttribute('href', p.anh);
      el('circle', { cx: cx, cy: cy, r: r, fill: 'none', stroke: 'rgba(255,255,255,.9)', 'stroke-width': 2 }, vo);
    }
    el('circle', { 'class': p.daMat ? 'vong-mat' : 'vong-song', cx: cx, cy: cy, r: r + 3.5 }, vo);
    var tx = 63, w = CW - tx - 10;
    chu(vo, tx, 26, p.ten, 'ten', w);
    chu(vo, tx, 43, chuNam(p) || (p.daMat ? '' : 'Còn sống'), 'nam-st');
    var bac = p.dauRe ? (p.gioi === 'nu' ? (p.vai || 'Vợ') : 'Chồng') : (p === DB.thuyTo ? 'Thủy tổ' : (p.ngoaiTon ? 'Cháu ngoại' : (p.thuBac || '')));
    if (CD.truyenThong && !p.dauRe) {
      var nGai = p.con.filter(function (c) { return c.gioi === 'nu' && (c.cha === p.id); }).length;
      if (nGai) bac += (bac ? ' · ' : '') + nGai + ' gái';
    }
    var laXH = false;
    if (TOI) {
      if (p.id === TOI) { bac = 'Bạn'; laXH = true; }
      else if (XH_TOI[p.id] && XH_TOI[p.id].goi) { bac = hoa(XH_TOI[p.id].goi); laXH = true; }
    }
    if (bac) {
      var cb = el('g', { 'class': 'chip-bac' + (laXH ? ' xh' : '') }, vo);
      var bw = Math.min(w, doDai(bac, '600 10.5px "Be Vietnam Pro", sans-serif') + 14);
      el('rect', { x: tx - 1, y: 51, width: bw, height: 17, rx: 8.5 }, cb);
      chu(cb, tx + 6, 63, bac, '', bw - 12 < doDai(bac, '600 10.5px "Be Vietnam Pro", sans-serif') ? bw - 12 : 0);
    }
    if (p.dich) {
      var hd = el('g', { 'class': 'huy-dich' }, vo);
      el('rect', { x: CW - 46, y: -8, width: 50, height: 19, rx: 9.5 }, hd);
      chu(hd, CW - 21, 5.5, '★ Đích', '').setAttribute('text-anchor', 'middle');
    }
    return g;
  }

  function veCay(giuViTri) {
    while (G.firstChild) G.removeChild(G.firstChild);
    var lopDuong = el('g', {}, G), lopNoi = el('g', {}, G), lopDich = el('g', {}, G), lopThe = el('g', {}, G), lopNut = el('g', {}, G);

    function rong(p) {
      var vc = vcHien(p).length, unit = (1 + vc) * CW + vc * SG;
      var kids = thuGon.has(p.id) ? [] : conHien(p);
      p._unit = unit;
      if (!kids.length) return (p._w = unit);
      var s = kids.reduce(function (a, c) { return a + rong(c); }, 0) + HG * (kids.length - 1);
      return (p._w = Math.max(unit, s));
    }
    var minX = 1e9, maxX = -1e9, maxDoi = 1;
    function dat(p, x0) {
      p._x = x0 + (p._w - p._unit) / 2; p._y = (p.doi - 1) * RH;
      minX = Math.min(minX, p._x); maxX = Math.max(maxX, p._x + p._unit); maxDoi = Math.max(maxDoi, p.doi);
      var vc = vcHien(p);
      var g = veThe(p, p._x, p._y, lopThe);
      vc.forEach(function (s, i) {
        var sx = p._x + (i + 1) * (CW + SG);
        veThe(s, sx, p._y, lopThe); s._x = sx; s._y = p._y;
        var vy = p._y + CH / 2, vx1 = sx - SG - 2, vx2 = sx + 2;
        el('line', { 'class': 'noi-bong', x1: vx1, y1: vy, x2: vx2, y2: vy }, lopNoi);
        el('line', { 'class': 'noi-vc', x1: vx1, y1: vy, x2: vx2, y2: vy }, lopNoi);
        el('line', { 'class': 'noi-sang', x1: vx1, y1: vy - 0.6, x2: vx2, y2: vy - 0.6 }, lopNoi);
        el('circle', { 'class': 'mat-noi', cx: sx - SG / 2, cy: vy, r: 4.5 }, lopNoi);
      });
      var tatCa = conHien(p), kids = thuGon.has(p.id) ? [] : tatCa;
      var ox = vc.length ? p._x + CW + SG / 2 : p._x + CW / 2, oy = p._y + CH;
      if (kids.length) {
        var sum = kids.reduce(function (a, c) { return a + c._w; }, 0) + HG * (kids.length - 1);
        var cx = x0 + (p._w - sum) / 2, ym = oy + (RH - CH) / 2;
        var xs = [];
        kids.forEach(function (c) { dat(c, cx); xs.push(c._x + CW / 2); cx += c._w + HG; });
        var dich = p.dich && kids.some(function (c) { return c.dich; });
        kids.forEach(function (c, i) { // đường cong mềm từ cha mẹ xuống từng con
          var ty = c._y, d = 'M' + ox + ',' + (oy + 2) + 'C' + ox + ',' + (ym + 10) + ' ' + xs[i] + ',' + (ym - 10) + ' ' + xs[i] + ',' + ty;
          var lop = c.dich && dich ? lopDich : lopNoi; // dây vàng nổi: bóng tối + thân vàng + ánh sáng
          el('path', { 'class': 'noi-bong', d: d }, lop);
          el('path', { 'class': 'noi' + (c.dich && dich ? ' dich' : ''), d: d }, lop);
          el('path', { 'class': 'noi-sang', d: d }, lop);
        });
      }
      if (tatCa.length) {
        var gon = thuGon.has(p.id);
        var t = el('g', { 'class': 'thu-gon', 'data-gon': p.id, transform: 'translate(' + ox + ',' + (oy + 14) + ')' }, lopNut);
        el('circle', { r: gon ? 14 : 11 }, t);
        var n = gon ? demHau(p) : 0;
        var tt = chu(t, 0, 4, gon ? '+' + n : '−', '');
        tt.setAttribute('text-anchor', 'middle');
        el('title', {}, t).textContent = gon ? 'Mở ' + n + ' người' : 'Thu gọn nhánh';
      }
      return g;
    }
    var x = 0;
    DB.goc.forEach(function (g) { rong(g); dat(g, x); x += g._w + HG * 3; });

    // vạch đời bên trái
    for (var d = 1; d <= maxDoi; d++) {
      var y = (d - 1) * RH + CH / 2;
      el('line', { 'class': 'duong-doi', x1: minX - 40, y1: y, x2: maxX + 20, y2: y }, lopDuong);
      var nd = el('g', { 'class': 'nhan-doi' }, lopDuong);
      el('rect', { x: minX - 112, y: y - 14, width: 64, height: 28, rx: 14 }, nd);
      chu(nd, minX - 80, y + 4.5, 'Đời ' + d, '').setAttribute('text-anchor', 'middle');
    }
    G._bien = { x0: minX - 122, x1: maxX + 30, y0: DB.thuyTo ? -30 - KHUNG_H - KHUNG_CACH : -30, y1: (maxDoi - 1) * RH + CH + 40 };
    if (!veCay._da) { veCay._da = true; svg.classList.add('cay-moi'); setTimeout(function () { svg.classList.remove('cay-moi'); }, 1600);
      G.querySelectorAll('.the .vo').forEach(function (v) { var d = DB.byId[v.parentNode.getAttribute('data-id')].doi; v.style.animationDelay = Math.min(d * 70, 700) + 'ms'; }); }
    if (!giuViTri) requestAnimationFrame(vuaKhung);
    else apV();
  }
  function demHau(p) { var n = 0; conHien(p).forEach(function (c) { n += 1 + demHau(c); }); return n; }

  function khung() { return { width: svg.clientWidth, height: svg.clientHeight }; }
  /* Nút "Xem ngang": xoay phả đồ 90° chiếm cả màn hình (dùng được cả khi iPhone khoá xoay) */
  var XOAY = false;
  function datXoay(b) {
    XOAY = b; document.documentElement.classList.toggle('xoay-ngang', b);
    requestAnimationFrame(function () { if (TOI && DB && DB.byId[TOI]) canhGiua(TOI); else vuaKhung(true); });
    if (b) bao('Nghiêng điện thoại sang ngang để xem. Bấm ⟲ để trở lại.');
  }
  function apV() { G.setAttribute('transform', 'translate(' + V.x + ',' + V.y + ') scale(' + V.k + ')'); }
  function kep(k) { return Math.max(0.15, Math.min(2.5, k)); }
  function bayToi(nx, ny, nk, ms) {
    var a = { x: V.x, y: V.y, k: V.k }, t0 = performance.now(); ms = ms || 420;
    cancelAnimationFrame(bayToi._r);
    (function buoc(t) {
      var u = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - u, 3);
      V.x = a.x + (nx - a.x) * e; V.y = a.y + (ny - a.y) * e; V.k = a.k + (nk - a.k) * e; apV();
      if (u < 1) bayToi._r = requestAnimationFrame(buoc);
    })(t0);
  }
  function vuaKhung(muot) {
    var b = G._bien, r = khung();
    if (!b || !r.width) return;
    var w = b.x1 - b.x0, h = b.y1 - b.y0;
    var k = kep(Math.min(r.width / w, (r.height - 40) / h, 1));
    if (k < 0.4 && muot !== true) { // màn hẹp: toàn cây quá nhỏ không đọc được → phóng vào bạn (hoặc cụ Thủy tổ)
      var tam = (TOI && DB.byId[TOI] && DB.byId[TOI]._x != null) ? DB.byId[TOI] : DB.thuyTo;
      if (tam && tam._x != null) {
        k = Math.min(0.75, r.width / (CW * 2.2));
        V.k = k; V.x = r.width / 2 - (tam._x + CW / 2) * k; V.y = (tam === DB.thuyTo ? 70 + (KHUNG_H + KHUNG_CACH) * k : r.height / 2.6) - (tam._y + CH / 2) * k; apV(); return;
      }
    }
    var nx = (r.width - w * k) / 2 - b.x0 * k, ny = 20 + Math.max(0, (r.height - 40 - h * k) / 2) - b.y0 * k;
    if (muot === true) bayToi(nx, ny, k); else { V.x = nx; V.y = ny; V.k = k; apV(); }
  }
  function zoomTai(f, cx, cy) {
    var k = kep(V.k * f); f = k / V.k;
    V.x = cx - (cx - V.x) * f; V.y = cy - (cy - V.y) * f; V.k = k; apV();
  }
  function canhGiua(id, nhay) {
    var p = DB.byId[id];
    if (!p) return;
    // nếu người đó nằm trong nhánh đang thu gọn thì mở ra
    var mo = false, buoc = 0;
    function len1(x) {
      var c = x.cha && DB.byId[x.cha], m = x.me && DB.byId[x.me];
      return (c && c.huyetThong) ? c : (m || c || null);
    }
    var q = p.dauRe ? DB.byId[p.voChong.filter(function (s) { return DB.byId[s].huyetThong; })[0]] : p;
    while (q && buoc++ < 60) {
      var u = len1(q);
      if (u && thuGon.has(u.id)) { thuGon.delete(u.id); mo = true; }
      q = u;
    }
    if (mo) { ghi('thugon', Array.from(thuGon)); veCay(true); }
    if (p._x == null) { bao('Người này không hiện trên phả đồ ở cách xem hiện tại'); return; }
    var r = khung(), k = Math.max(V.k, 0.85);
    bayToi(r.width / 2 - (p._x + CW / 2) * k, r.height / 2.6 - (p._y + CH / 2) * k, k);
    if (nhay) {
      var g = G.querySelector('[data-id="' + id + '"]');
      if (g) { g.classList.remove('nhay'); void g.getBBox(); g.classList.add('nhay'); }
    }
  }
  function danhDauChon(id) {
    chonId = id;
    var toTien = {};
    if (id) {
      (function len(x) {
        var p = DB.byId[x]; if (!p) return;
        [p.cha, p.me].forEach(function (k) { if (k && !toTien[k]) { toTien[k] = 1; len(k); } });
      })(id);
    }
    G.querySelectorAll('.the').forEach(function (g) {
      var i = g.getAttribute('data-id');
      g.classList.toggle('chon', i === id);
      g.classList.toggle('to-tien', !!toTien[i]);
    });
    svg.classList.toggle('cay-mo', !!id);
  }

  /* kéo, véo, cuộn */
  (function () {
    var pts = new Map(), keo = null, veo = null, daDi = false, trungVao = null;
    var khung = $('#khungCay');
    function diem(e) { // toạ độ trong khung phả đồ (kể cả khi đang xoay ngang 90°)
      var r = svg.getBoundingClientRect();
      if (XOAY) return { x: e.clientY - r.top, y: r.right - e.clientX };
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    svg.addEventListener('pointerdown', function (e) {
      svg.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, diem(e));
      cancelAnimationFrame(bayToi._r);
      if (pts.size === 1) {
        daDi = false; trungVao = e.target.closest('[data-id],[data-gon]');
        var d = diem(e); keo = { x: d.x, y: d.y, vx: V.x, vy: V.y };
      } else if (pts.size === 2) {
        var a = Array.from(pts.values());
        veo = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), k: V.k, vx: V.x, vy: V.y, cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2 };
        daDi = true; keo = null;
      }
    });
    svg.addEventListener('pointermove', function (e) {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, diem(e));
      if (veo && pts.size >= 2) {
        var a = Array.from(pts.values());
        var d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
        var k = kep(veo.k * d / veo.d);
        var wx = (veo.cx - veo.vx) / veo.k, wy = (veo.cy - veo.vy) / veo.k;
        V.k = k; V.x = mx - wx * k; V.y = my - wy * k; apV();
      } else if (keo) {
        var p = diem(e), dx = p.x - keo.x, dy = p.y - keo.y;
        if (!daDi && Math.abs(dx) + Math.abs(dy) > 6) { daDi = true; khung.classList.add('keo'); }
        if (daDi) { V.x = keo.vx + dx; V.y = keo.vy + dy; apV(); }
      }
    });
    function tha(e) {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size === 1) { // còn một ngón sau khi véo: kéo tiếp từ đó, không nhảy
        var c = Array.from(pts.values())[0]; keo = { x: c.x, y: c.y, vx: V.x, vy: V.y }; veo = null; return;
      }
      if (pts.size === 0) {
        khung.classList.remove('keo');
        if (!daDi && trungVao && e.type === 'pointerup') {
          var gon = trungVao.getAttribute('data-gon');
          if (gon) {
            if (thuGon.has(gon)) thuGon.delete(gon); else thuGon.add(gon);
            ghi('thugon', Array.from(thuGon)); veCay(true); danhDauChon(chonId);
          } else { var idMo = trungVao.getAttribute('data-id'); if (XOAY) datXoay(false); moChiTiet(idMo); }
        }
        keo = veo = null; trungVao = null;
      }
    }
    svg.addEventListener('pointerup', tha);
    svg.addEventListener('pointercancel', tha);
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var p = diem(e);
      var laChuot = e.deltaMode === 1 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || e.metaKey || laChuot) zoomTai(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), p.x, p.y);
      else { V.x -= e.deltaX; V.y -= e.deltaY; apV(); }
    }, { passive: false });
    $('#zIn').onclick = function () { var r = khung(); zoomTai(1.3, r.width / 2, r.height / 2); };
    $('#zOut').onclick = function () { var r = khung(); zoomTai(1 / 1.3, r.width / 2, r.height / 2); };
    $('#zXoay').onclick = function () { datXoay(!XOAY); };
    $('#zFit').onclick = function () { vuaKhung(true); };
    $('#zToi').onclick = function () {
      if (TOI && DB.byId[TOI]) canhGiua(TOI, true); else moHoiToi();
    };
    var xoayHen = 0;
    window.addEventListener('resize', function () {
      if (!$('#tab-phado').classList.contains('hien')) return;
      apV();
      clearTimeout(xoayHen); // xoay máy ngang/dọc: canh lại vào thẻ của mình
      xoayHen = setTimeout(function () { if (TOI && DB && DB.byId[TOI]) canhGiua(TOI); else vuaKhung(true); }, 350);
    });
  })();

  /* =================== CHI TIẾT MỘT NGƯỜI =================== */
  var THU = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  function chip(p, them) {
    return '<span class="chip' + (p.gioi === 'nu' ? ' nu' : '') + '" data-mo="' + esc(p.id) + '">' + cham(p) + esc(p.ten) + (them ? ' <small>' + esc(them) + '</small>' : '') + '</span>';
  }
  function dong(nhan, gt) { return gt ? '<dt>' + nhan + '</dt><dd>' + gt + '</dd>' : ''; }
  function laLink(s) { return /^https?:\/\//i.test(s); }

  function moChiTiet(id) {
    var p = DB.byId[id]; if (!p) return;
    danhDauChon(id);
    var huy = ['Đời ' + p.doi, tenChi(p), p.dauRe ? vaiDauRe(p) : (p === DB.thuyTo ? 'Thủy tổ' : p.thuBac), p.daMat ? 'Đã mất' : '']
      .filter(Boolean).map(function (x) { return '<span class="huy">' + esc(x) + '</span>'; }).join('');
    if (p.dich) huy = '<span class="huy ga">★ Dòng đích</span>' + huy;
    var h = p.anh ? '<div class="anh-lon" data-xem-anh="' + esc(p.anh) + '"><img src="' + esc(p.anh) + '" alt="' + esc(p.ten) + '" referrerpolicy="no-referrer" onerror="GP_anhLoi(this)"><span class="phong">⤢</span></div>' : '';
    h += '<div class="ct-dau">' + cham(p) + '<div><h3>' + esc(p.ten) + '</h3><p class="phu">' + huy + '</p></div></div>';
    if (TOI && XH_TOI[id] && XH_TOI[id].goi) h += '<div class="xh-toi"><div><small>Bạn gọi là</small><b>' + esc(XH_TOI[id].goi) + '</b></div><div><small>Người này gọi bạn là</small><b>' + esc(XH_TOI[id].duocGoi || '—') + '</b></div></div>';
    else if (id === TOI) h += '<div class="xh-toi"><div><small>Đây là</small><b>bạn</b></div></div>';

    if (p.tieuSu) h += '<div class="muc-ct tieu-su-khoi"><h4>Tiểu sử</h4><div class="tieu-su">' + doan(p.tieuSu) + '</div></div>';
    else h += '<div class="muc-ct"><div class="khoa">Chưa có tiểu sử. Con cháu có thể viết vào cột <b>Tiểu sử</b> trong Google Sheet của họ.</div></div>';
    h += '<dl class="bang-tt">';
    h += dong('Tên húy', esc(p.tenHuy)) + dong('Tên tự', esc(p.tenTu)) + dong('Tên hiệu', esc(p.tenHieu)) + dong('Thụy hiệu', esc(p.thuyHieu));
    h += dong('Sinh', esc(IN(p.sinh)));
    if (p.daMat) h += dong('Mất', esc(IN(p.mat) || 'Không rõ') + (tuoiTho(p) ? ', ' + tuoiTho(p) : ''));
    if (p.gio) {
      var g = window.AmLich.gioSapToi(p.gio.d, p.gio.m), s = 'Ngày ' + p.gio.d + ' tháng ' + p.gio.m + ' âm lịch';
      if (g) s += '<br><span class="phu">Lần tới: ' + THU[g.date.getDay()] + ' ' + g.date.toLocaleDateString('vi-VN') + (g.soNgay === 0 ? ' (hôm nay)' : ' (còn ' + g.soNgay + ' ngày)') + '</span>';
      h += dong('Ngày giỗ', s);
    }
    h += dong('Học vị, chức danh', esc(p.chucDanh)) + dong('Quê quán', esc(p.queQuan));
    var mo = esc(p.noiAnTang);
    if (p.banDoMo) mo += (mo ? '<br>' : '') + '<a href="' + esc(laLink(p.banDoMo) ? p.banDoMo : 'https://maps.google.com/?q=' + encodeURIComponent(p.banDoMo)) + '" target="_blank" rel="noopener">Mở bản đồ chỉ đường</a>';
    h += dong('Nơi an táng', mo) + dong('Cải táng', esc(p.caiTang)) + dong('Nơi ở', esc(p.noiO)) + dong('Điện thoại', esc(p.lienHe.dienThoai));
    h += '</dl>';

    // quan hệ
    var cha = p.cha && DB.byId[p.cha], me = p.me && DB.byId[p.me];
    var q = '';
    if (cha || me) q += '<div class="muc-ct"><h4>Cha mẹ</h4><div class="chip-ds">' + [cha, me].filter(Boolean).map(function (x) { return chip(x); }).join('') + '</div></div>';
    if (p.voChong.length) q += '<div class="muc-ct"><h4>' + (p.gioi === 'nam' ? 'Vợ' : 'Chồng') + '</h4><div class="chip-ds">' +
      p.voChong.map(function (i) { var s = DB.byId[i]; return chip(s, s.vai); }).join('') + '</div></div>';
    var con = p.con.length ? p.con : DB.list.filter(function (c) { return c.cha === p.id || c.me === p.id; });
    if (con.length) {
      var nhieuBa = p.voChong.length > 1;
      q += '<div class="muc-ct"><h4>Con (' + con.length + ')</h4><div class="chip-ds">' + con.map(function (c) {
        var ba = nhieuBa && c.me && DB.byId[c.me] && c.me !== p.id ? 'con bà ' + tenGoi(DB.byId[c.me]) : '';
        return chip(c, [c.thuBac, ba].filter(Boolean).join(', '));
      }).join('') + '</div></div>';
    }
    var bo = cha && cha.huyetThong ? cha : me;
    if (bo) {
      var ae = bo.con.filter(function (c) { return c !== p; });
      if (ae.length) q += '<div class="muc-ct"><h4>Anh chị em</h4><div class="chip-ds">' + ae.map(function (c) { return chip(c); }).join('') + '</div></div>';
    }
    h += q;

    // liên lạc
    var L = p.lienHe, coLH = L.dienThoai || L.zalo || L.facebook;
    if (coLH) {
      h += '<div class="muc-ct"><h4>Liên lạc</h4><div class="lien-he">';
      if (L.dienThoai) h += '<a href="tel:' + esc(L.dienThoai.replace(/[^\d+]/g, '')) + '"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>Gọi điện</a>';
      if (L.zalo) h += '<a class="zalo" href="https://zalo.me/' + esc(String(L.zalo).replace(/[^\d]/g, '')) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h4l-4 4h4M15 9v4"/></svg>Zalo</a>';
      if (L.facebook) h += '<a class="fb" href="' + esc(laLink(L.facebook) ? L.facebook : 'https://www.facebook.com/' + L.facebook) + '" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/></svg>Facebook</a>';
      h += '</div></div>';
    } else if (!p.daMat && !LH) {
      h += '<div class="muc-ct"><div class="khoa">Số điện thoại, Zalo, Facebook của người còn sống chỉ hiện khi nhập <b>mã gia đình</b>. <span class="lien-ket" data-di="mokhoa">Nhập mã</span></div></div>';
    }

    h += '<div class="hang-nut" style="margin-top:18px"><button class="nut chinh" data-di="cay">Xem trên phả đồ</button><button class="nut" data-di="xh">Tính xưng hô với người này</button></div>';
    h += '<div class="hang-sua"><button class="nut-sua" data-di="sua"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>Sửa thông tin, đổi ảnh</button>' +
      '<button class="nut-sua" data-di="themCon">＋ Thêm con</button><button class="nut-sua" data-di="themVC">＋ Thêm ' + (p.gioi === 'nu' ? 'chồng' : 'vợ') + '</button></div>';
    $('#noiDungNgan').innerHTML = h;
    $('#noiDungNgan').dataset.id = id;
    var n = $('#nganKeo'); n.classList.add('mo'); n.setAttribute('aria-hidden', 'false'); n.scrollTop = 0;
    $('#manChe').hidden = window.innerWidth >= 900;
  }
  /* ---------- Sửa / thêm người từ điện thoại → ghi thẳng vào Google Sheet (cần mật mã sửa do trưởng họ cấp) ---------- */
  var ANH_MOI = null;
  function maTu(x) { var m = String(x || '').match(/([A-Za-z]{1,4}\d{1,6})\s*\)?\s*$/); return m ? m[1] : ''; }
  function dongGoc(id) { var r = (RAW.nguoi || []).filter(function (x) { return String(x.ma).trim() === id; })[0] || {}; return Object.assign({}, r, (LH && LH[id]) || {}); }
  function oSua(k, nhan, gt, kieu, goiY) {
    return '<label class="o-sua"><span>' + nhan + '</span><input data-truong="' + k + '" data-cu="' + esc(gt || '') + '" value="' + esc(gt || '') + '" type="' + (kieu || 'text') + '" placeholder="' + esc(goiY || '') + '" autocomplete="off"></label>';
  }
  function chonNguoi(k, nhan, cu, loc, boQua, ghiChu) { // cu = '?' nghĩa là ô trong Sheet đang ghi sai
    var ds = DB.list.filter(function (q) { return q.id !== boQua && (!loc || loc(q)); })
      .sort(function (a, b) { return (a.doi || 99) - (b.doi || 99) || a.thuTuDong - b.thuTuDong; });
    return '<label class="o-sua"><span>' + nhan + '</span><select data-truong="' + k + '" data-cu="' + esc(cu || '') + '"><option value=""' + (cu === '?' ? ' selected' : '') + '>— Không / chưa rõ —</option>' +
      ds.map(function (q) { return '<option value="' + esc(q.id) + '"' + (q.id === cu ? ' selected' : '') + '>' + esc(q.ten) + (q.doi ? ' · đời ' + q.doi : '') + '</option>'; }).join('') +
      '</select>' + (ghiChu ? '<small class="phu">' + ghiChu + '</small>' : '') + '</label>';
  }
  function oGioi(cu) {
    return '<label class="o-sua"><span>Giới tính</span><select data-truong="gioi_tinh" data-cu="' + esc(cu) + '">' +
      ['Nam', 'Nữ'].map(function (g) { return '<option' + (g === cu ? ' selected' : '') + '>' + g + '</option>'; }).join('') + '</select></label>';
  }
  function oConSong(song, mat, gio) { // gạt "Còn sống": tắt đi mới hiện ô ngày mất, ngày giỗ
    return '<label class="gat"><input type="checkbox" id="conSong"' + (song ? ' checked' : '') + '><span class="cong-tac"></span><span>Còn sống</span></label>' +
      '<div id="oMat"' + (song ? ' hidden' : '') + '><div class="hai-o">' + oSua('ngay_mat', 'Năm / ngày mất', mat, 'text', 'VD: 1998') + oSua('ngay_gio', 'Ngày giỗ (âm lịch)', gio, 'text', 'VD: 12/3') + '</div></div>';
  }
  function ganConSong() {
    var c = $('#conSong'); if (!c) return;
    c.onchange = function () { $('#oMat').hidden = this.checked; var l = $('#oLienHe'); if (l) l.hidden = !this.checked; };
  }
  function oMatMa() {
    return '<label class="o-sua"><span>Mật mã sửa</span><input id="suaMa" type="password" value="' + esc(doc('maSua', '') || '') + '" placeholder="Trưởng họ cấp cho bạn" autocomplete="off"></label>';
  }
  function quanHeCu(id, k) { // mã đang ghi ở dòng này, chỉ khi nó trỏ đúng người (bỏ mã cũ sai)
    var r = dongGoc(id), raw = String(r[k] || '').trim(); if (!raw) return '';
    var p = DB.byId[id], ds = k === 'ma_cha' ? [p.cha] : k === 'ma_me' ? [p.me] : p.voChong;
    var m = raw.split(/[,;]/).map(maTu).filter(function (x) { return ds.indexOf(x) >= 0; })[0];
    return m || '?'; // '?' = ô đang ghi sai → chọn lại sẽ được ghi đè
  }
  // Ô họ tên: gõ tới đâu viết hoa tới đó
  document.addEventListener('input', function (e) {
    var i = e.target; if (!i || i.getAttribute('data-truong') !== 'ho_ten') return;
    var v = i.value, h = v.toUpperCase(); if (v === h) return;
    var a = i.selectionStart, b = i.selectionEnd; i.value = h; try { i.setSelectionRange(a, b); } catch (x) {}
  });
  function moSua(id) {
    var p = DB.byId[id]; if (!p) return;
    if (LA_MAU) { bao('Chỉ sửa được khi app đã nối Google Sheet'); return; }
    ANH_MOI = null;
    var L = p.lienHe || {}, r = dongGoc(id), nam = function (q) { return q.gioi === 'nam'; }, nu = function (q) { return q.gioi === 'nu'; };
    var cha = quanHeCu(id, 'ma_cha'), me = quanHeCu(id, 'ma_me'), vc = quanHeCu(id, 'ma_vo_chong');
    var h = '<div class="ct-dau">' + cham(p) + '<div><h3>Sửa: ' + esc(p.ten) + '</h3><p class="phu">Lưu xong, ai mở app cũng thấy bản mới.</p></div></div>';
    h += '<div class="sua-anh"><div class="khung-anh" id="suaXem">' + (p.anh ? '<img src="' + esc(p.anh) + '" referrerpolicy="no-referrer" alt="">' : '<span>Chưa có ảnh</span>') + '</div>' +
      '<label class="nut chinh chon-anh">📷 Chọn / chụp ảnh<input id="suaFile" type="file" accept="image/*" hidden></label></div>';
    h += '<h4 class="nhom-sua">Thông tin chính</h4>';
    h += oSua('ho_ten', 'Họ và tên', r.ho_ten || p.ten) + oGioi(p.gioi === 'nu' ? 'Nữ' : 'Nam');
    h += '<div class="hai-o">' + oSua('ngay_sinh', 'Năm / ngày sinh', r.ngay_sinh, 'text', '1958') + oSua('thu_tu', 'Con thứ mấy', r.thu_tu, 'number', '1, 2, 3…') + '</div>';
    h += oConSong(!(r.ngay_mat || r.ngay_gio || p.daMat), r.ngay_mat, r.ngay_gio);
    h += '<h4 class="nhom-sua">Quan hệ</h4>';
    h += chonNguoi('ma_cha', 'Cha', cha, nam, id, cha === '?' ? 'Ô Cha trong Sheet đang ghi sai, chọn lại giúp.' : '');
    h += chonNguoi('ma_me', 'Mẹ', me, nu, id, me === '?' ? 'Ô Mẹ trong Sheet đang ghi sai, chọn lại giúp.' : (p.me && !me ? 'App đang tự hiểu mẹ là ' + esc(DB.byId[p.me].ten) + ' (vợ duy nhất của cha).' : ''));
    h += chonNguoi('ma_vo_chong', 'Vợ / chồng', vc, p.gioi === 'nu' ? nam : nu, id,
      vc === '?' ? 'Ô Vợ/Chồng trong Sheet đang ghi sai (' + esc(r.ma_vo_chong) + '), chọn lại hoặc để "Không".' : (!vc && p.voChong.length ? 'Đã nối từ phía ' + esc(DB.byId[p.voChong[0]].ten) + '.' : ''));
    h += '<h4 class="nhom-sua">Thêm</h4>';
    h += '<label class="o-sua"><span>Tiểu sử</span><textarea data-truong="tieu_su" data-cu="' + esc(p.tieuSu || '') + '" rows="5" placeholder="Học hành, công việc, kỷ niệm…">' + esc(p.tieuSu || '') + '</textarea></label>';
    h += '<div class="hai-o">' + oSua('que_quan', 'Quê quán', p.queQuan) + oSua('chuc_danh', 'Học vị, chức danh', p.chucDanh) + '</div>';
    var songCu = !(r.ngay_mat || r.ngay_gio || p.daMat);
    h += '<div id="oLienHe"' + (songCu ? '' : ' hidden') + '><h4 class="nhom-sua">Liên lạc</h4>';
    h += '<div class="hai-o">' + oSua('dien_thoai', 'Điện thoại', L.dienThoai, 'tel', '09…') + oSua('zalo', 'Zalo (số)', L.zalo, 'tel', '') + '</div>';
    h += oSua('facebook', 'Facebook', L.facebook, 'url', 'link hoặc tên tài khoản') + oSua('noi_o', 'Nơi ở', p.noiO, 'text', '');
    if (!LH) h += '<p class="phu" style="margin:-4px 2px 10px">Liên lạc đang ẩn (chưa nhập mã gia đình). Ô nào để trống sẽ giữ nguyên như cũ.</p>';
    h += '</div>';
    h += oMatMa();
    h += '<div class="hang-nut" style="margin-top:14px"><button class="nut chinh" id="nutLuuSua">Lưu lên gia phả</button><button class="nut" data-di="huySua">Huỷ</button></div>';
    $('#noiDungNgan').innerHTML = h;
    $('#nganKeo').scrollTop = 0;
    ganConSong();
    $('#suaFile').onchange = function () {
      var f = this.files && this.files[0]; if (!f) return;
      thuNhoAnh(f, 1000).then(function (du) { ANH_MOI = du; $('#suaXem').innerHTML = '<img src="' + du + '" alt="">'; })
        .catch(function () { bao('Không đọc được ảnh này, thử ảnh khác'); });
    };
    $('#nutLuuSua').onclick = function () { luuSua(id, this); };
  }
  /* Thêm con / vợ-chồng cho 1 người: app tự điền cha mẹ, con thứ, mã */
  function moThem(id, loai, vuaThem) {
    var p = DB.byId[id]; if (!p) return;
    if (LA_MAU) { bao('Chỉ thêm được khi app đã nối Google Sheet'); return; }
    var laCon = loai === 'con', vc = p.voChong.slice();
    var tieuDe = laCon ? 'Thêm con của ' + esc(p.ten) : 'Thêm ' + (p.gioi === 'nu' ? 'chồng' : 'vợ') + ' của ' + esc(p.ten);
    var h = '<div class="ct-dau">' + cham(p) + '<div><h3>' + tieuDe + '</h3><p class="phu">Mã, cha mẹ' + (laCon ? ', con thứ' : '') + ' tự điền.</p></div></div>';
    if (vuaThem) {
      var dsCon = p.con.length ? p.con : DB.list.filter(function (c) { return c.cha === p.id || c.me === p.id; });
      h += '<div class="vua-them">✓ Đã thêm <b>' + esc(vuaThem) + '</b>. Gõ tiếp người con thứ ' + (dsCon.length + 1) + ', hoặc bấm <b>Xong</b>.</div>';
    }
    if (laCon && vc.length > 1) h += '<label class="o-sua"><span>Con với</span><select id="themBan">' + vc.map(function (s) { return '<option value="' + esc(s) + '">' + esc(DB.byId[s].ten) + '</option>'; }).join('') + '</select></label>';
    h += oSua('ho_ten', 'Họ và tên', '', 'text', laCon ? 'Trần Văn …' : '');
    h += oGioi(laCon ? 'Nam' : (p.gioi === 'nu' ? 'Nam' : 'Nữ'));
    h += oSua('ngay_sinh', 'Năm / ngày sinh', '', 'text', '1990');
    h += oConSong(true, '', '');
    h += oMatMa();
    h += '<div class="hang-nut" style="margin-top:14px"><button class="nut chinh" id="nutLuuSua">＋ Thêm vào gia phả</button><button class="nut" data-di="huySua">' + (vuaThem ? 'Xong' : 'Huỷ') + '</button></div>';
    $('#noiDungNgan').innerHTML = h;
    $('#nganKeo').scrollTop = 0;
    ganConSong();
    var oTen = $('#noiDungNgan [data-truong="ho_ten"]'), oGt = $('#noiDungNgan [data-truong="gioi_tinh"]');
    oTen.oninput = function () { if (/\sthị\s/i.test(' ' + this.value + ' ')) oGt.value = 'Nữ'; };
    setTimeout(function () { oTen.focus(); }, 350);
    $('#nutLuuSua').onclick = function () { luuSua(id, this, { loai: loai, goc: id, banDoi: $('#themBan') ? $('#themBan').value : '' }); };
  }
  function thuNhoAnh(file, toiDa) {
    return new Promise(function (ok, loi) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, toiDa / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = function () { URL.revokeObjectURL(url); loi(); };
      img.src = url;
    });
  }
  function luuSua(id, nut, them) {
    var ma = $('#suaMa').value.trim();
    if (!ma) { bao('Nhập mật mã sửa (trưởng họ cấp)'); $('#suaMa').focus(); return; }
    var truong = {}, co = !!ANH_MOI && !them;
    $('#noiDungNgan').querySelectorAll('[data-truong]').forEach(function (i) {
      var v = i.value.trim(), cu = i.getAttribute('data-cu') || '';
      if (/^ngay_(mat|gio)$/.test(i.dataset.truong) && $('#conSong') && $('#conSong').checked) v = ''; // còn sống → không có ngày mất/giỗ
      var laSua = !them || them === 'ho';
      if (v === cu && laSua) return;
      if (!laSua && !v) return;
      var daMat = $('#conSong') && !$('#conSong').checked;
      if (!them && daMat && /^(dien_thoai|zalo|facebook|noi_o)$/.test(i.dataset.truong)) { // đã mất → xoá liên lạc
        if (cu || !LH) { truong[i.dataset.truong] = ''; co = true; } return;
      }
      if (!them && !v && !LH && /^(dien_thoai|zalo|facebook)$/.test(i.dataset.truong)) return; // liên lạc đang ẩn: trống = giữ nguyên
      if (i.dataset.truong === 'ho_ten') { v = v.replace(/\s+/g, ' ').toUpperCase(); if (v === cu.toUpperCase() && laSua) return; }
      truong[i.dataset.truong] = v; co = true;
    });
    if (them && them !== 'ho' && !truong.ho_ten) { bao('Nhập họ và tên'); $('#noiDungNgan [data-truong="ho_ten"]').focus(); return; }
    if (!co) { bao('Chưa thay đổi gì'); return; }
    var chu = nut.textContent;
    nut.disabled = true; nut.textContent = ANH_MOI && !them ? 'Đang tải ảnh lên…' : 'Đang lưu…';
    var body = them === 'ho' ? { k: doc('khoa', null), lenh: 'suaHo', maSua: ma, truong: truong }
      : them ? { k: doc('khoa', null), lenh: 'them', maSua: ma, truong: truong, quanHe: them }
      : { k: doc('khoa', null), lenh: 'sua', maSua: ma, ma: id, truong: truong };
    body.ve = doc('ve', null);
    if (ANH_MOI && !them) body.anh = ANH_MOI;
    fetch(C.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error(d && d.loi || 'Không lưu được');
        ghi('maSua', ma);
        if (body.anh) ANH_TAM[id] = body.anh;
        if (LH && !them) { // cập nhật liên lạc đã mở khoá trên máy này
          var x = LH[id] = LH[id] || {};
          ['dien_thoai', 'zalo', 'facebook', 'noi_o'].forEach(function (k) { if (k in truong) x[k] = truong[k]; });
          ghi('lienhe', LH);
        }
        if (them === 'ho') { bao('Đã lưu gốc gác dòng họ ✓'); return taiDuLieu(true).then(function (m) { RAW = m; dungLai(true); moGocGac(); }); }
        bao(them ? 'Đã thêm ' + truong.ho_ten + ' ✓' : 'Đã lưu lên gia phả ✓');
        var moi = them ? d.ma : id;
        return taiDuLieu(true).then(function (m) {
          RAW = m; dungLai(true);
          if (them && them.loai === 'con' && DB.byId[them.goc]) { // thêm con liên tục: mở lại form cho người con sau
            moThem(them.goc, 'con', truong.ho_ten);
            if (them.banDoi && $('#themBan')) $('#themBan').value = them.banDoi;
            return;
          }
          if (DB.byId[moi]) { moChiTiet(moi); canhGiua(moi, true); }
        });
      })
      .catch(function (e) {
        bao(e && e.message && !/fetch|network/i.test(e.message) ? e.message : 'Không kết nối được. Thử lại khi có mạng.');
        nut.disabled = false; nut.textContent = chu;
        if (e && /mật mã/i.test(e.message || '')) { ghi('maSua', null); $('#suaMa').select(); }
      });
  }

  function dongNgan() {
    $('#nganKeo').classList.remove('mo'); $('#nganKeo').setAttribute('aria-hidden', 'true'); $('#manChe').hidden = true;
    danhDauChon(null);
  }
  $('#dongNgan').onclick = dongNgan;
  $('#xemAnh').onclick = function () { this.hidden = true; };
  $('#manChe').onclick = dongNgan;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dongNgan(); });
  $('#noiDungNgan').addEventListener('click', function (e) {
    var xa = e.target.closest('[data-xem-anh]');
    if (xa) { var xv = $('#xemAnh'); xv.querySelector('img').src = xa.getAttribute('data-xem-anh'); xv.hidden = false; return; }
    var m = e.target.closest('[data-mo]');
    if (m) { moChiTiet(m.getAttribute('data-mo')); return; }
    var d = e.target.closest('[data-di]'); if (!d) return;
    var id = $('#noiDungNgan').dataset.id, di = d.getAttribute('data-di');
    if (di === 'cay') { var giu = id; chuyenTab('phado'); if (window.innerWidth < 900) dongNgan(); danhDauChon(giu); setTimeout(function () { canhGiua(giu, true); }, 60); }
    if (di === 'xh') {
      if (TOI && DB.byId[TOI] && id !== TOI) { XH_CD = 'toi'; ghi('xhCheDo', 'toi'); $('#xhB').value = id; }
      else { XH_CD = 'hai'; ghi('xhCheDo', 'hai'); $('#xhA').value = id; }
      chuyenTab('xungho'); dongNgan(); tinhXH();
    }
    if (di === 'sua') moSua(id);
    if (di === 'themCon') moThem(id, 'con');
    if (di === 'themVC') moThem(id, 'vo_chong');
    if (di === 'huySua') moChiTiet(id);
    if (di === 'mokhoa') { dongNgan(); chuyenTab('dongho'); setTimeout(function () { var i = $('#oMa'); if (i) { i.scrollIntoView({ block: 'center' }); i.focus(); } }, 50); }
  });
  // vuốt xuống để đóng ngăn kéo (điện thoại)
  (function () {
    var n = $('#nganKeo'), y0 = null, dy = 0;
    n.addEventListener('touchstart', function (e) { if (n.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
    n.addEventListener('touchmove', function (e) {
      if (y0 == null) return; dy = e.touches[0].clientY - y0;
      if (dy > 0) { n.style.transition = 'none'; n.style.transform = 'translateY(' + dy + 'px)'; }
    }, { passive: true });
    n.addEventListener('touchend', function () {
      if (y0 == null) return; n.style.transition = ''; n.style.transform = '';
      if (dy > 110) dongNgan(); y0 = null;
    });
  })();

  /* =================== TRA CỨU =================== */
  function boDau(s) { return window.GiaPhaDB.khoa(s).replace(/_/g, ' '); }
  function veTraCuu() {
    var sd = $('#locDoi'), sc = $('#locChi'), giu = [sd.value, sc.value];
    sd.innerHTML = '<option value="">Mọi đời</option>';
    for (var d = 1; d <= DB.soDoi; d++) sd.insertAdjacentHTML('beforeend', '<option value="' + d + '">Đời ' + d + '</option>');
    sc.innerHTML = '<option value="">Mọi chi</option>' + DB.chiList.map(function (c) { return '<option value="' + c.so + '">' + esc(c.ten) + '</option>'; }).join('');
    sd.value = giu[0]; sc.value = giu[1];
    locDS();
  }
  function locDS(e) {
    $('#dsNguoi').classList.toggle('dong', !e); // chỉ nảy lên khi mở tab, không nảy theo từng phím gõ
    var q = boDau($('#oTim').value.trim()), d = +$('#locDoi').value, c = +$('#locChi').value, tt = $('#locTT').value;
    var ds = DB.list.filter(function (p) {
      if (d && p.doi !== d) return false;
      if (c && p.chi !== c) return false;
      if (tt === 'song' && p.daMat) return false;
      if (tt === 'mat' && !p.daMat) return false;
      if (tt === 'lienhe' && !(p.lienHe.dienThoai || p.lienHe.zalo || p.lienHe.facebook)) return false;
      if (q && boDau([p.ten, p.tenHuy, p.tenTu, p.tenHieu, p.noiO, p.queQuan, p.id].join(' ')).indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.doi - b.doi || a.thuTuDong - b.thuTuDong; });
    $('#demKQ').textContent = ds.length + ' người';
    $('#dsNguoi').innerHTML = ds.map(function (p, i) {
      var nh = p.dich ? '<span class="nhan son">Đích</span>' : (chuNam(p) ? '<span class="nhan">' + esc(chuNam(p)) + '</span>' : '');
      if (p.lienHe.dienThoai) nh = '<a class="nhan son" href="tel:' + esc(p.lienHe.dienThoai.replace(/[^\d+]/g, '')) + '" onclick="event.stopPropagation()">Gọi</a>' + nh;
      return '<li style="--i:' + Math.min(i, 14) + '" data-mo="' + esc(p.id) + '" class="' + (p.daMat ? 'tt-mat' : 'tt-song') + '">' + cham(p) + '<div class="chu"><div class="ten">' + esc(p.ten) + '</div><div class="mo">' +
        esc([TOI && (p.id === TOI ? 'Bạn' : XH_TOI[p.id] && hoa(XH_TOI[p.id].goi)), 'Đời ' + p.doi, tenChi(p), moTaNgan(p)].filter(Boolean).join(' · ')) + '</div></div>' + nh + '</li>';
    }).join('') || '<li class="phu">Không tìm thấy ai.</li>';
  }
  ['#oTim', '#locDoi', '#locChi', '#locTT'].forEach(function (s) { $(s).addEventListener('input', locDS); });
  $('#dsNguoi').addEventListener('click', function (e) { var li = e.target.closest('[data-mo]'); if (li) moChiTiet(li.getAttribute('data-mo')); });
  $('#nutTim').onclick = function () { chuyenTab('tracuu'); setTimeout(function () { $('#oTim').focus(); }, 30); };

  /* =================== XƯNG HÔ =================== */
  function veXungHo() {
    var giuA = $('#xhA').value, giuB = $('#xhB').value, h = '';
    for (var d = 1; d <= DB.soDoi; d++) {
      var ds = DB.list.filter(function (p) { return p.doi === d; });
      if (!ds.length) continue;
      h += '<optgroup label="Đời ' + d + '">' + ds.map(function (p) {
        var m = moTaNgan(p); return '<option value="' + esc(p.id) + '">' + esc(p.ten + (m ? ' — ' + m : '')) + '</option>';
      }).join('') + '</optgroup>';
    }
    $('#xhA').innerHTML = h; $('#xhB').innerHTML = h;
    var cuoi = DB.dongDich[DB.dongDich.length - 1];
    $('#xhA').value = DB.byId[giuA] ? giuA : (TOI || cuoi || DB.list[0].id);
    var macB = DB.list.filter(function (p) { return p.doi === DB.byId[$('#xhA').value].doi - 2 && !p.dich && p.huyetThong && p.gioi === 'nam'; })[0];
    $('#xhB').value = DB.byId[giuB] ? giuB : (macB || DB.thuyTo || DB.list[0]).id;
    tinhXH();
  }
  var XH_CD = doc('xhCheDo', 'toi'); // 'toi' = tôi gọi người khác, 'hai' = hai người bất kỳ
  function apCheDoXH() {
    var cd = (XH_CD === 'toi' && TOI && DB.byId[TOI]) ? 'toi' : (XH_CD === 'toi' ? 'can-chon' : 'hai');
    document.querySelectorAll('#xhCheDo button').forEach(function (b) { b.classList.toggle('chon', b.getAttribute('data-cd') === XH_CD); });
    var toi = $('#xhToi');
    if (cd === 'toi') {
      var p = DB.byId[TOI];
      toi.innerHTML = cham(p) + '<div class="chu"><small>Bạn là</small><b>' + esc(p.ten) + '</b></div><button class="nut" data-di="doiToi">Đổi</button>';
      $('#xhA').value = TOI;
      $('#xhMoTa').textContent = 'Chọn một người trong họ, app cho biết bạn gọi người đó là gì và người đó gọi bạn là gì.';
      $('#xhNhanB').firstChild.textContent = 'Người bạn muốn hỏi';
    } else if (cd === 'can-chon') {
      toi.innerHTML = '<div class="chu"><small>Bạn là</small><b>Chưa chọn</b></div><button class="nut chinh" data-di="doiToi">Chọn tôi là ai</button>';
      $('#xhMoTa').textContent = 'Hãy cho app biết bạn là ai trước, rồi chọn người muốn hỏi.';
      $('#xhNhanB').firstChild.textContent = 'Người bạn muốn hỏi';
    } else {
      $('#xhMoTa').textContent = 'Chọn hai người bất kỳ trong họ, app cho biết hai người gọi nhau là gì (theo cách gọi miền Bắc).';
      $('#xhNhanB').firstChild.textContent = 'Người thứ hai';
    }
    toi.hidden = cd === 'hai';
    $('#xhNhanA').hidden = cd !== 'hai';
    $('#xhDoi').hidden = cd !== 'hai';
    return cd;
  }
  $('#xhCheDo').addEventListener('click', function (e) {
    var b = e.target.closest('[data-cd]'); if (!b) return;
    XH_CD = b.getAttribute('data-cd'); ghi('xhCheDo', XH_CD); tinhXH();
  });
  $('#xhToi').addEventListener('click', function (e) { if (e.target.closest('[data-di="doiToi"]')) moHoiToi(); });

  function tinhXH() {
    var cd = apCheDoXH();
    if (cd === 'can-chon') { $('#xhKQ').innerHTML = ''; return; }
    var a = $('#xhA').value, b = $('#xhB').value;
    if (cd === 'toi' && b === a) { $('#xhKQ').innerHTML = '<p class="phu" style="text-align:center">Chọn một người khác bạn ở ô bên trên.</p>'; return; }
    if (!DB.byId[a] || !DB.byId[b]) return;
    var r1 = window.XungHo.goi(DB, a, b), r2 = window.XungHo.goi(DB, b, a);
    var A = DB.byId[a], B = DB.byId[b];
    function ten(x) { return cd === 'toi' && x.id === TOI ? 'Bạn' : x.ten; }
    function the(x, y, r) {
      var nguoiNghe = cd === 'toi' && y.id === TOI ? 'bạn' : '<b>' + esc(y.ten) + '</b>';
      return '<div class="the-xh kinh"><div class="ai"><b>' + esc(ten(x)) + '</b> gọi ' + nguoiNghe + ' là</div><div class="tu">' +
        esc(r.tu || '—') + '</div></div>';
    }
    var h = the(A, B, r1) + the(B, A, r2);
    if (r1.giaiThich) h += '<p class="phu" style="text-align:center">' + esc(r1.giaiThich) + '</p>';
    if (r1.duong && r1.duong.length > 2) {
      h += '<div class="duong-xh">' + r1.duong.map(function (i, k) { return '<b' + (k === 0 || k === r1.duong.length - 1 ? ' class="ga"' : '') + ' data-mo="' + esc(i) + '">' + esc(DB.byId[i].ten) + '</b>'; }).join('<span>→</span>') + '</div>';
    }
    h += '<p class="phu" style="text-align:center;font-size:12.5px">Cách gọi theo miền Bắc. "Bác" là anh chị của bố/mẹ, "chú/cô" là em bên nội, "cậu/dì" là em bên ngoại. Họ hàng xa xét theo vai (thứ bậc chi), không xét tuổi.</p>';
    $('#xhKQ').innerHTML = h;
  }
  $('#xhA').addEventListener('change', tinhXH);
  $('#xhB').addEventListener('change', tinhXH);
  $('#xhDoi').onclick = function () { var a = $('#xhA').value; $('#xhA').value = $('#xhB').value; $('#xhB').value = a; tinhXH(); };
  $('#xhKQ').addEventListener('click', function (e) { var m = e.target.closest('[data-mo]'); if (m) moChiTiet(m.getAttribute('data-mo')); });

  /* =================== NGÀY GIỖ =================== */
  function dsGio() {
    var hn = new Date();
    return DB.list.filter(function (p) { return p.gio; }).map(function (p) {
      return { p: p, g: window.AmLich.gioSapToi(p.gio.d, p.gio.m, hn) };
    }).filter(function (x) { return x.g; }).sort(function (a, b) { return a.g.soNgay - b.g.soNgay; });
  }
  /* ---------- nhắc giỗ ---------- */
  function tenNhacGio(p) { // "Bà nội Đặng Thị Nga" nếu biết người xem là ai, không thì "bà Đặng Thị Nga"
    var xh = TOI && XH_TOI[p.id] && XH_TOI[p.id].goi;
    if (xh) return hoa(xh) + ' ' + p.ten;
    return (p.gioi === 'nam' ? 'ông ' : 'bà ') + p.ten;
  }
  function chuConNgay(n) { return n === 0 ? 'Hôm nay' : n === 1 ? 'Ngày mai' : 'Còn ' + n + ' ngày'; }
  function ngayKey() { var d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function veNhacGio() {
    var gan = dsGio().filter(function (x) { return x.g.soNgay <= 7; });
    var so = $('#soGio');
    so.hidden = !gan.length; so.textContent = gan.length;
    var b = $('#bangGio');
    if (!gan.length || doc('anGio', '') === ngayKey()) { b.hidden = true; return; }
    var x = gan[0], tien = new Date(x.g.date - 864e5);
    var them = gan.length > 1 ? ' · và ' + (gan.length - 1) + ' giỗ khác trong tuần' : '';
    b.innerHTML = '<span class="nhang">🕯️</span><div class="chu"><b>' + esc(chuConNgay(x.g.soNgay)) + ': giỗ ' + esc(tenNhacGio(x.p)) + '</b><br>' +
      'Ngày ' + x.p.gio.d + '/' + x.p.gio.m + ' âm (' + x.g.date.getDate() + '/' + (x.g.date.getMonth() + 1) + ')' +
      (x.g.soNgay > 0 ? ' · tiên thường tối ' + tien.getDate() + '/' + (tien.getMonth() + 1) : '') + esc(them) + '</div>' +
      '<button class="x" aria-label="Ẩn hôm nay">×</button>';
    b.dataset.id = x.p.id; b.hidden = false;
  }
  $('#bangGio').addEventListener('click', function (e) {
    if (e.target.closest('.x')) { ghi('anGio', ngayKey()); this.hidden = true; return; }
    if (gioCount() > 1) { chuyenTab('gio'); return; }
    moChiTiet(this.dataset.id);
  });
  function gioCount() { return dsGio().filter(function (x) { return x.g.soNgay <= 7; }).length; }

  function veGio() {
    var hn = new Date(), am = window.AmLich.solar2lunar(hn.getDate(), hn.getMonth() + 1, hn.getFullYear());
    $('#homNay').innerHTML = '<div class="nho">Hôm nay</div><div class="lon">' + THU[hn.getDay()] + ', ' + hn.toLocaleDateString('vi-VN') + '</div>' +
      '<div class="am">Âm lịch: ngày ' + am[0] + ' tháng ' + am[1] + (am[3] ? ' (nhuận)' : '') + ' năm ' + window.AmLich.canChiNam(am[2]) + '</div>';
    var ds = dsGio();
    var sap = ds.filter(function (x) { return x.g.soNgay <= 30; }).slice(0, 3);
    if (sap.length) {
      $('#homNay').insertAdjacentHTML('beforeend', '<div class="sap-gio">' + sap.map(function (x) {
        var tien = new Date(x.g.date - 864e5);
        return '<div class="muc" data-mo="' + esc(x.p.id) + '"><span class="dem">' + esc(chuConNgay(x.g.soNgay)) + '</span><div class="ct"><b>Giỗ ' + esc(tenNhacGio(x.p)) + '</b><br><small>' +
          THU[x.g.date.getDay()] + ' ' + x.g.date.getDate() + '/' + (x.g.date.getMonth() + 1) + ' (' + x.p.gio.d + '/' + x.p.gio.m + ' âm)' +
          (x.g.soNgay > 0 ? ' · tiên thường tối ' + tien.getDate() + '/' + (tien.getMonth() + 1) : '') + '</small></div></div>';
      }).join('') + '</div>');
    }
    $('#dsGio').innerHTML = ds.map(function (x, i) {
      var d = x.g.date, p = x.p, tien = new Date(d - 864e5);
      var con = x.g.soNgay === 0 ? '<b>Hôm nay</b>' : x.g.soNgay === 1 ? '<b>Ngày mai</b>' : '<b>' + x.g.soNgay + '</b>ngày nữa';
      return '<li style="--i:' + Math.min(i, 14) + '" data-mo="' + esc(p.id) + '" class="' + (x.g.soNgay <= 7 ? 'gan' : '') + (x.g.soNgay === 0 ? ' hom-nay-gio' : '') + '"><div class="lich-to"><div class="th">Tháng ' + (d.getMonth() + 1) + '</div><div class="ng">' + d.getDate() +
        '</div><div class="tt">' + (d.getDay() ? 'T.' + THU[d.getDay()].slice(4) : 'CN') + '</div></div><div class="chu"><div class="ten"><b>' + esc(p.ten) + '</b></div>' +
        '<div class="phu">Giỗ ' + p.gio.d + '/' + p.gio.m + ' âm · Đời ' + p.doi + (tenChi(p) ? ' · ' + esc(tenChi(p)) : '') + '</div>' +
        '<div class="phu" style="font-size:12px">Tiên thường: tối ' + tien.getDate() + '/' + (tien.getMonth() + 1) + '</div></div><div class="con">' + con + '</div></li>';
    }).join('') || '<li class="phu">Chưa có ai được ghi ngày giỗ. Điền cột "Ngày giỗ" (ngày/tháng âm lịch) trong Google Sheet.</li>';
  }
  $('#homNay').addEventListener('click', function (e) { var m = e.target.closest('[data-mo]'); if (m) moChiTiet(m.getAttribute('data-mo')); });
  $('#dsGio').addEventListener('click', function (e) { var li = e.target.closest('[data-mo]'); if (li) moChiTiet(li.getAttribute('data-mo')); });

  function taiFile(ten, noiDung, kieu) {
    var b = new Blob([noiDung], { type: kieu }), u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = ten; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
  }
  $('#taiLich').onclick = function () {
    var hn = new Date(), L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GiaPha//VI', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Ngày giỗ ' + (DB.thongTin.ten_dong_ho || 'họ Trần')];
    function f(d) { return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0'); }
    var dem = 0;
    DB.list.filter(function (p) { return p.gio; }).forEach(function (p) {
      var g1 = window.AmLich.gioSapToi(p.gio.d, p.gio.m, hn);
      if (!g1) return;
      var g2 = window.AmLich.gioSapToi(p.gio.d, p.gio.m, new Date(g1.date.getTime() + 864e5));
      [g1, g2].forEach(function (g, i) {
        if (!g) return;
        var e = new Date(g.date.getTime() + 864e5);
        L.push('BEGIN:VEVENT', 'UID:gio-' + p.id + '-' + f(g.date) + '@giapha', 'DTSTAMP:' + f(hn) + 'T000000Z',
          'DTSTART;VALUE=DATE:' + f(g.date), 'DTEND;VALUE=DATE:' + f(e),
          'SUMMARY:Giỗ ' + p.ten + ' (' + p.gio.d + '/' + p.gio.m + ' âm)',
          'DESCRIPTION:Đời ' + p.doi + (tenChi(p) ? ', ' + tenChi(p) : '') + '. Tiên thường tối hôm trước.',
          'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Mai là ngày giỗ ' + p.ten, 'END:VALARM', 'END:VEVENT');
        dem++;
      });
    });
    L.push('END:VCALENDAR');
    taiFile('ngay-gio.ics', L.join('\r\n'), 'text/calendar');
    bao('Đã tạo ' + dem + ' ngày giỗ (2 năm tới). Mở file để thêm vào lịch.');
  };

  /* =================== DÒNG HỌ =================== */
  function doan(s) { return String(s || '').split(/\n{1,}/).filter(Boolean).map(function (x) { return '<p>' + esc(x) + '</p>'; }).join(''); }
  function veDongHo() {
    var tt = DB.thongTin, song = DB.list.filter(function (p) { return !p.daMat; }).length;
    $('#thongKe').innerHTML = [[DB.list.length, 'người'], [DB.soDoi, 'đời'], [DB.chiList.length, 'chi'], [song, 'còn sống']]
      .map(function (x) { return '<div class="kinh"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('');
    $('#phaKy').innerHTML = doan(tt.pha_ky) || '<p class="phu">Chưa có.</p>';
    $('#tocUoc').innerHTML = doan(tt.toc_uoc) || '<p class="phu">Chưa có.</p>';
    var nt = esc(tt.nha_tho_ho || '');
    if (tt.ban_do_nha_tho) nt += '<br><a class="lien-ket" target="_blank" rel="noopener" href="' + esc(laLink(tt.ban_do_nha_tho) ? tt.ban_do_nha_tho : 'https://maps.google.com/?q=' + encodeURIComponent(tt.ban_do_nha_tho)) + '">Mở bản đồ chỉ đường</a>';
    $('#nhaTho').innerHTML = nt ? '<p>' + nt + '</p>' : '';
    $('#khoiNhaTho').hidden = !nt;
    $('#dsChi').innerHTML = DB.chiList.map(function (c) {
      var g = DB.byId[c.goc], n = DB.list.filter(function (p) { return p.chi === c.so && p.huyetThong; }).length;
      return '<li data-chi="' + esc(c.goc) + '"><span class="so">' + esc(c.ten.replace('Chi ', '')) + '</span><div><b>' + esc(c.ten) + '</b> <span class="phu">· ' + esc(c.phu) + '</span><br><span class="phu">Khởi từ ' + esc(g.ten) + ' · ' + n + ' người</span></div></li>';
    }).join('') || '<li class="phu">Chưa chia chi.</li>';
    veKhoa(); veCaiDat(); veLuuMay();
    var lc = !LA_MAU && RAW.taiLuc ? 'Tải lần cuối: ' + new Date(RAW.taiLuc).toLocaleString('vi-VN') : '';
    $('#capNhatLuc').textContent = lc;
    $('#capNhat').hidden = LA_MAU;
    $('#khoiHuongDan').hidden = !LA_MAU;
  }
  $('#dsChi').addEventListener('click', function (e) {
    var li = e.target.closest('[data-chi]'); if (!li) return;
    var id = li.getAttribute('data-chi'); chuyenTab('phado'); danhDauChon(id); setTimeout(function () { canhGiua(id, true); }, 60);
  });

  function veKhoa() {
    var k = $('#khoiKhoa');
    if (LH) {
      var n = Object.keys(LH).length;
      k.innerHTML = '<p>Đã mở khoá trên máy này: thấy được liên lạc của <b>' + n + '</b> người. Vào <b>Tra cứu → Có liên lạc</b> để xem danh bạ.</p>' +
        '<div class="hang-nut"><button class="nut" id="khoaLai">Khoá lại trên máy này</button></div>';
      $('#khoaLai').onclick = function () { LH = null; ghi('lienhe', null); dungLai(true); bao('Đã khoá. Liên lạc đã được xoá khỏi máy này.'); };
    } else {
      k.innerHTML = '<p>Số điện thoại, Zalo, Facebook, nơi ở và ngày sinh đầy đủ của người còn sống chỉ hiện với người trong họ có <b>mã gia đình</b>.' +
        (LA_MAU ? ' <span class="phu">(Bản mẫu: mã thử là <b>' + esc(C.maThuMau || '1234') + '</b>)</span>' : '') + '</p>' +
        '<form class="o-ma" id="formMa"><input id="oMa" type="password" placeholder="Mã gia đình" autocomplete="off"><button class="nut chinh" type="submit">Mở khoá</button></form>';
      $('#formMa').onsubmit = function (e) { e.preventDefault(); moKhoa($('#oMa').value.trim()); };
    }
  }
  function moKhoa(ma) {
    if (!ma) return;
    if (LA_MAU) {
      if (ma !== String(C.maThuMau || '1234')) { bao('Sai mã gia đình'); return; }
      LH = MAU_RIENG; ghi('lienhe', LH); dungLai(true); bao('Đã mở khoá liên lạc'); return;
    }
    bao('Đang kiểm tra mã…');
    fetch(C.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ k: doc('khoa', null), ve: doc('ve', null), ma: ma }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) { bao(d && d.loi || 'Sai mã gia đình'); return; }
        LH = d.lienHe || {}; ghi('lienhe', LH); dungLai(true); bao('Đã mở khoá liên lạc');
      })
      .catch(function () { bao('Không kết nối được. Thử lại khi có mạng.'); });
  }

  function veLuuMay() {
    var k = $('#khoiLuuMay');
    if (!k) {
      k = document.createElement('article'); k.className = 'khoi-chu kinh'; k.id = 'khoiLuuMay';
      $('#khoiHuongDan').insertAdjacentElement('beforebegin', k);
    }
    var p = TOI && DB.byId[TOI], d = doc('dulieu', null);
    k.innerHTML = '<h2>Lưu trên máy này</h2>' +
      '<p class="phu">App tự nhớ mọi thứ dưới đây, kể cả khi app được cập nhật bản mới. Chỉ mất khi xoá biểu tượng app khỏi màn hình chính.</p>' +
      '<dl class="bang-tt">' +
      '<dt>Bạn là</dt><dd>' + (p ? esc(p.ten) : 'Chưa chọn') + '</dd>' +
      '<dt>Liên lạc</dt><dd>' + (LH ? 'Đã mở khoá' : 'Chưa mở khoá') + '</dd>' +
      '<dt>Gia phả lưu lúc</dt><dd>' + (d && d.taiLuc ? new Date(d.taiLuc).toLocaleString('vi-VN') : (LA_MAU ? 'Dữ liệu mẫu' : '—')) + '</dd>' +
      '<dt>Giữ lâu dài</dt><dd id="luuLauDai">Đang kiểm tra…</dd>' +
      '<dt>Phiên bản app</dt><dd>' + esc(PB || '?') + '</dd>' +
      '</dl>' +
      '<div class="hang-nut"><button class="nut" id="taiLaiApp">↻ Tải lại app và dữ liệu mới nhất</button>' + (doc('ve', null) ? '<button class="nut" id="dangXuat">Đăng xuất</button>' : '') + '</div>' +
      (doc('khoa', null) ? '<div class="hang-nut"><button class="nut chinh" id="guiLinkHo">Gửi link gia phả cho người trong họ</button></div>' : '') +
      '<div class="hang-nut"><button class="nut" id="layLinkKP">Lấy link khôi phục của tôi</button></div>' +
      '<p class="phu">Lưu link này vào Ghi chú hoặc gửi Zalo cho chính mình. Lỡ xoá app hay đổi điện thoại, mở link là app nhớ lại bạn là ai và cách xem. Link không chứa số điện thoại hay mã gia đình (mã thì nhập lại một lần).</p>';
    try {
      if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (ok) { var e = $('#luuLauDai'); if (e) e.textContent = ok ? 'Có (máy sẽ không tự xoá)' : 'Bình thường'; });
      else $('#luuLauDai').textContent = 'Bình thường';
    } catch (e) {}
    $('#soPB').textContent = PB || '?';
    var dx = $('#dangXuat'); if (dx) dx.onclick = function () { if (confirm('Đăng xuất khỏi gia phả trên máy này?')) { ghi('ve', null); ghi('dulieu', null); location.reload(); } };
    $('#nutCapNhatApp').onclick = $('#taiLaiApp').onclick = function () {
      bao('Đang tải bản mới nhất…');
      var xong = function () { location.reload(); };
      try {
        (navigator.serviceWorker ? navigator.serviceWorker.getRegistration().then(function (r) { return r && r.update(); }) : Promise.resolve())
          .then(function () { return window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }) : 0; })
          .then(function () { ghi('dulieu', null); }).then(xong, xong);
      } catch (e) { xong(); }
    };
    var gl = $('#guiLinkHo');
    if (gl) gl.onclick = function () {
      var url = linkChiaSe(doc('khoa', ''));
      var txt = 'Mời bạn xem Gia phả ' + (DB.thongTin.ten_dong_ho || 'họ Trần') + '. Link chỉ dành cho người trong họ, đừng đăng công khai:';
      if (navigator.share) { navigator.share({ title: 'Gia phả', text: txt, url: url }).catch(function () {}); return; }
      (navigator.clipboard ? navigator.clipboard.writeText(txt + ' ' + url) : Promise.reject()).then(function () { bao('Đã chép link. Dán vào nhóm Zalo gia đình.'); })
        .catch(function () { window.prompt('Chép link này:', url); });
    };
    $('#layLinkKP').onclick = function () {
      var url = taoLinkKhoiPhuc();
      if (navigator.share) { navigator.share({ title: 'Link khôi phục Gia phả', text: 'Link khôi phục app Gia phả của tôi', url: url }).catch(function () {}); return; }
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { bao('Đã chép link khôi phục. Hãy lưu vào Ghi chú.'); })
        .catch(function () { window.prompt('Chép link này và lưu lại:', url); });
    };
  }

  function veCaiDat() {
    var k = $('#khoiCaiDat');
    if (!k) {
      k = document.createElement('article'); k.className = 'khoi-chu kinh cai-dat'; k.id = 'khoiCaiDat';
      $('#khoiKhoa').parentNode.insertAdjacentElement('afterend', k);
    }
    k.innerHTML = '<h2>Cách xem phả đồ</h2>' +
      '<label><span>Kiểu truyền thống<br><span class="phu">Phả đồ chỉ vẽ con trai, con gái ghi trong thẻ của cha</span></span><input class="cong-tac" type="checkbox" id="cdTT"' + (CD.truyenThong ? ' checked' : '') + '></label>' +
      '<label><span>Hiện cháu ngoại<br><span class="phu">Con của con gái, 1 đời</span></span><input class="cong-tac" type="checkbox" id="cdNT"' + (CD.hienNgoaiTon ? ' checked' : '') + (CD.truyenThong ? ' disabled' : '') + '></label>' +
      '<label><span>Con trai trước, con gái sau<br><span class="phu">Theo tục cũ. Tắt thì xếp theo thứ tự sinh</span></span><input class="cong-tac" type="checkbox" id="cdTr"' + (CD.traiTruocGaiSau ? ' checked' : '') + '></label>' +
      '<p class="phu">Con của bà cả luôn xếp trước con của bà kế, bà thứ. Chi đặt tên Giáp, Ất, Bính… theo thứ tự con trai của cụ Thủy tổ. Dòng đích (viền đỏ) đi theo con trai trưởng qua từng đời, không tính con nuôi.</p>';
    function doi(k2, v) { CD[k2] = v; ghi('cachxem', CD); setTimeout(dungLai, 380); } // chờ công tắc nảy xong
    $('#cdTT').onchange = function () { doi('truyenThong', this.checked); };
    $('#cdNT').onchange = function () { doi('hienNgoaiTon', this.checked); };
    $('#cdTr').onchange = function () { doi('traiTruocGaiSau', this.checked); };
  }

  /* tải sơ đồ SVG để in */
  $('#taiSVG').onclick = function () {
    var b = G._bien, w = Math.ceil(b.x1 - b.x0), h = Math.ceil(b.y1 - b.y0) + 70;
    var g = G.cloneNode(true); g.removeAttribute('transform');
    g.querySelectorAll('.thu-gon').forEach(function (x) { x.remove(); });
    g.querySelectorAll('.chon,.to-tien,.nhay').forEach(function (x) { x.classList.remove('chon', 'to-tien', 'nhay'); });
    var css = 'text{font-family:"Be Vietnam Pro",Arial,sans-serif}.nhan-doi rect{fill:#fff;stroke:#eee}.nhan-doi text{fill:#6d6475;font-size:13px;font-weight:700}' +
      '.duong-doi{stroke:#e8dcd6;stroke-dasharray:1 7;stroke-linecap:round}.noi{fill:none;stroke:#9a90a3;stroke-width:1.6;opacity:.6}.noi.dich{stroke:url(#gDich);stroke-width:3.2;opacity:1}' +
      '.noi-vc{stroke:#e0a43a;stroke-width:2}.bong1,.bong2{fill:#6e323c;opacity:.06}.the .nen{fill:#fff;stroke:#f1e8e4}.the.dr .nen{fill:#fffaf6;stroke:#9a90a3;stroke-dasharray:5 4}' +
      '.ten{font-size:14px;font-weight:700;fill:#1e1a22}.nam-st{font-size:11.5px;fill:#6d6475}.chip-bac rect{fill:#f1ecef}.chip-bac text{font-size:10.5px;font-weight:600;fill:#6d6475}' +
      '.the.nam:not(.dr) .chip-bac rect{fill:#e3edfa}.the.nam:not(.dr) .chip-bac text{fill:#2f6fc2}.the.nu:not(.dr) .chip-bac rect{fill:#ffe6ee}.the.nu:not(.dr) .chip-bac text{fill:#d6416c}' +
      '.chu-cai{fill:#fff;font-size:17px;font-weight:800}.huy-dich rect{fill:url(#gKim)}.huy-dich text{fill:#fff;font-size:10px;font-weight:800}.vong-mat{fill:none;stroke:#d4a12a;stroke-width:2}.vong-song{fill:none;stroke:#2fb457;stroke-width:2}' +
      '.to-mau{fill:none}.the .nen{fill:#e4f6ea;stroke:#a9dcb9}.the.mat .nen{fill:#ebe9ef;stroke:#b8b4c0}';
    var defs = svg.querySelector('defs').outerHTML;
    var tieuDe = 'Phả đồ ' + (DB.thongTin.ten_dong_ho || 'Họ Trần');
    var s = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="' + b.x0 + ' ' + (b.y0 - 70) + ' ' + w + ' ' + h + '">' +
      '<style>' + css + '</style>' + defs + '<rect x="' + b.x0 + '" y="' + (b.y0 - 70) + '" width="' + w + '" height="' + h + '" fill="#fff8f3"/>' +
      '<text x="' + (b.x0 + w / 2) + '" y="' + (b.y0 - 25) + '" text-anchor="middle" style="font-size:30px;font-weight:900;fill:#e5383b">' + esc(tieuDe) + '</text>' +
      new XMLSerializer().serializeToString(g).replace(/ xmlns="[^"]*"/, '') + '</svg>';
    taiFile('pha-do.svg', s, 'image/svg+xml');
    bao('Đã tải sơ đồ. Mở bằng trình duyệt hoặc gửi tiệm in để in khổ lớn.');
  };

  /* tải GEDCOM */
  $('#taiGED').onclick = function () {
    var T = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    function ngay(n) { if (!n || n.text) return n && n.text ? n.text : ''; return [n.d, n.m && T[n.m - 1], n.y].filter(Boolean).join(' '); }
    var so = {}, i = 0; DB.list.forEach(function (p) { so[p.id] = '@I' + (++i) + '@'; });
    var fam = {}, nf = 0;
    function giaDinh(a, b) {
      var key = [a, b].filter(Boolean).sort().join('|'); if (!key) return null;
      if (!fam[key]) fam[key] = { id: '@F' + (++nf) + '@', chong: null, vo: null, con: [] };
      [a, b].forEach(function (x) { if (x) { if (DB.byId[x].gioi === 'nam') fam[key].chong = x; else fam[key].vo = x; } });
      return fam[key];
    }
    DB.list.forEach(function (p) { p.voChong.forEach(function (s) { giaDinh(p.id, s); }); });
    DB.list.forEach(function (p) { var f = giaDinh(p.cha, p.me); if (f) f.con.push(p.id); });
    var L = ['0 HEAD', '1 SOUR GiaPha', '1 GEDC', '2 VERS 5.5.1', '2 FORM LINEAGE-LINKED', '1 CHAR UTF-8'];
    DB.list.forEach(function (p) {
      var w = p.ten.trim().split(/\s+/), ho = w.shift();
      L.push('0 ' + so[p.id] + ' INDI', '1 NAME ' + w.join(' ') + ' /' + ho + '/', '1 SEX ' + (p.gioi === 'nam' ? 'M' : 'F'));
      if (p.tenHuy) L.push('1 NICK ' + p.tenHuy);
      if (p.sinh) L.push('1 BIRT', '2 DATE ' + ngay(p.sinh));
      if (p.daMat) { L.push('1 DEAT' + (p.mat ? '' : ' Y')); if (p.mat) L.push('2 DATE ' + ngay(p.mat)); if (p.noiAnTang) L.push('1 BURI', '2 PLAC ' + p.noiAnTang); }
      if (p.gio) L.push('1 NOTE Ngày giỗ: ' + p.gio.d + '/' + p.gio.m + ' âm lịch');
      if (p.tieuSu) L.push('1 NOTE ' + p.tieuSu.replace(/\n/g, ' '));
      Object.keys(fam).forEach(function (k) {
        var f = fam[k];
        if (f.chong === p.id || f.vo === p.id) L.push('1 FAMS ' + f.id);
        if (f.con.indexOf(p.id) >= 0) L.push('1 FAMC ' + f.id);
      });
    });
    Object.keys(fam).forEach(function (k) {
      var f = fam[k]; L.push('0 ' + f.id + ' FAM');
      if (f.chong) L.push('1 HUSB ' + so[f.chong]);
      if (f.vo) L.push('1 WIFE ' + so[f.vo]);
      f.con.forEach(function (c) { L.push('1 CHIL ' + so[c]); });
    });
    L.push('0 TRLR');
    taiFile('gia-pha.ged', L.join('\r\n'), 'text/plain');
    bao('Đã tải file GEDCOM');
  };
  $('#capNhat').onclick = function () {
    bao('Đang tải dữ liệu mới…');
    taiDuLieu(true).then(function (d) { RAW = d; dungLai(true); bao('Đã cập nhật'); });
  };

  $('#anBangMau').onclick = function () { ghi('anMau', true); $('#bangMau').hidden = true; requestAnimationFrame(function () { apV(); }); };

  /* =================== CHUYỂN TAB =================== */
  function chuyenTab(t) {
    document.querySelectorAll('.tab').forEach(function (s) { s.classList.toggle('hien', s.id === 'tab-' + t); });
    var nut = document.querySelectorAll('#thanhDuoi button');
    nut.forEach(function (b, i) {
      var la = b.getAttribute('data-tab') === t; b.classList.toggle('chon', la);
      if (la) $('#chiBao').style.setProperty('--i', i);
    });
    if (t === 'phado' && !G._daVua) { G._daVua = true; requestAnimationFrame(vuaKhung); }
  }
  $('#thanhDuoi').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) chuyenTab(b.getAttribute('data-tab')); });

  /* =================== KHỞI ĐỘNG =================== */
  KHOI_PHUC.then(function (n) {
    var daTai = false; try { daTai = sessionStorage.getItem('gp_daTaiLai') === '1'; } catch (e) {}
    if (n > 0 && !daTai) { try { sessionStorage.setItem('gp_daTaiLai', '1'); } catch (e) {} location.reload(); return; }
    batDau();
  });
  /* Màn hình khoá: không có link đúng thì không thấy gì. */
  function khoaApp(daDoiKhoa) {
    if (daDoiKhoa) { ghi('dulieu', null); ghi('khoa', null); ghi('lienhe', null); LH = null; }
    $('#dangTai').hidden = true;
    $('#manKhoa').hidden = false;
    $('#thongBaoKhoa').textContent = daDoiKhoa ? 'Link bạn đang dùng đã được ban quản trị đổi. Hãy xin link mới trong nhóm gia đình.' : 'Hãy mở app bằng link được gửi trong nhóm gia đình (Zalo, Facebook…), hoặc dán link vào ô dưới.';
  }
  $('#formKhoa').onsubmit = function (e) {
    e.preventDefault();
    var k = layKhoaTuChuoi($('#oKhoa').value) || layKhoaTuChuoi('#k=' + $('#oKhoa').value.trim());
    if (!k) { bao('Link chưa đúng. Hãy dán nguyên link được gửi.'); return; }
    ghi('khoa', k); bao('Đang mở…'); setTimeout(function () { location.reload(); }, 300);
  };
  /* ---------- Đăng nhập "Bạn là ai, con ai?" (khi trưởng họ bật bắt đăng nhập) ---------- */
  function moDangNhap() {
    $('#dangTai').hidden = true;
    var m = $('#manDangNhap');
    if (!m) {
      m = document.createElement('div'); m.className = 'hoi-toi'; m.id = 'manDangNhap';
      m.innerHTML = '<div class="hop-toi kinh"><div>' +
        '<div class="an-trien lon" aria-hidden="true">陳</div><h2>Bạn là ai trong dòng họ?</h2>' +
        '<p class="phu">🔒 Chỉ con cháu có tên trong gia phả mới vào được. Trả lời 2 câu là app tự nhận ra bạn.</p>' +
        '<form id="formDN" class="form-dn">' +
        '<label class="o-sua"><span>Tên của bạn</span><input id="dnTen" placeholder="VD: Chính, hoặc Trần Đình Chính" autocomplete="off" autocapitalize="words"></label>' +
        '<label class="o-sua"><span>Bạn là con của ai? <small class="phu">(dâu/rể: gõ tên vợ/chồng)</small></span><input id="dnCon" placeholder="VD: Liêm" autocomplete="off" autocapitalize="words"></label>' +
        '<label class="o-sua" id="dnNamO" hidden><span>Năm sinh của bạn</span><input id="dnNam" inputmode="numeric" placeholder="VD: 1985"></label>' +
        '<button class="nut chinh" type="submit" id="dnNut" style="width:100%;margin-top:6px">Vào gia phả</button></form>' +
        '<p class="phu" id="dnLoi" style="margin-top:10px"></p></div></div>';
      document.body.appendChild(m);
      $('#formDN').onsubmit = function (e) {
        e.preventDefault();
        var ten = $('#dnTen').value.trim(), con = $('#dnCon').value.trim();
        if (!ten || !con) { $('#dnLoi').textContent = 'Gõ cả tên bạn và tên cha/mẹ.'; return; }
        var nut = $('#dnNut'); nut.disabled = true; nut.textContent = 'Đang tìm bạn trong gia phả…'; $('#dnLoi').textContent = '';
        fetch(C.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ k: doc('khoa', null), lenh: 'dangNhap', ten: ten, conAi: con, namSinh: $('#dnNam').value.trim() }) })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (d && d.ok) { ghi('ve', d.ve); ghi('toi', d.ma); ghi('boQuaToi', null); bao('Chào ' + d.ten + '!'); setTimeout(function () { location.reload(); }, 600); return; }
            if (d && d.loi === 'can_link') { khoaApp(true); return; }
            if (d && d.trung) $('#dnNamO').hidden = false;
            $('#dnLoi').textContent = (d && d.loi) || 'Chưa vào được, thử lại.';
            nut.disabled = false; nut.textContent = 'Vào gia phả';
          })
          .catch(function () { $('#dnLoi').textContent = 'Không kết nối được. Kiểm tra mạng.'; nut.disabled = false; nut.textContent = 'Vào gia phả'; });
      };
    }
    m.hidden = false;
    setTimeout(function () { var i = $('#dnTen'); if (i) i.focus(); }, 300);
  }

  /* ---------- Gốc gác dòng họ (bấm vào tên dòng họ ở đầu app) ---------- */
  function moGocGac() {
    if (!DB) return;
    var tt = DB.thongTin || {}, tt0 = DB.thuyTo, chu = '';
    chu += '<div class="ct-dau"><div class="an-trien" aria-hidden="true">陳</div><div><h3>' + esc(tt.ten_dong_ho || 'Gia phả') + '</h3><p class="phu">Gốc gác dòng họ</p></div></div>';
    chu += '<div class="the-so nho">' + [[DB.list.length, 'người'], [DB.soDoi, 'đời'], [DB.chiList.length, 'chi']].map(function (x) { return '<div class="kinh"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>';
    chu += '<dl class="bang-tt">' + dong('Quê gốc', esc(tt.que_goc)) + (tt0 ? dong('Cụ Thủy tổ', '<span class="lien-ket" data-mo-nguoi="' + esc(tt0.id) + '">' + esc(tt0.ten) + '</span>' + (chuNam(tt0) ? ' <span class="phu">(' + esc(chuNam(tt0)) + ')</span>' : '')) : '') + '</dl>';
    chu += '<div class="muc-ct"><h4>Nguồn gốc / phả ký</h4><div class="tieu-su">' + (doan(tt.pha_ky) || '<p class="phu">Chưa có. Người có mật mã sửa có thể viết ngay ở nút dưới.</p>') + '</div></div>';
    if (tt.nha_tho_ho || tt.ban_do_nha_tho) chu += '<div class="muc-ct"><h4>Nhà thờ họ</h4><p>' + esc(tt.nha_tho_ho || '') + (tt.ban_do_nha_tho ? '<br><a class="lien-ket" target="_blank" rel="noopener" href="' + esc(laLink(tt.ban_do_nha_tho) ? tt.ban_do_nha_tho : 'https://maps.google.com/?q=' + encodeURIComponent(tt.ban_do_nha_tho)) + '">Mở bản đồ chỉ đường</a>' : '') + '</p></div>';
    if (tt.toc_uoc) chu += '<div class="muc-ct"><h4>Tộc ước</h4><div class="tieu-su">' + doan(tt.toc_uoc) + '</div></div>';
    if (!LA_MAU) chu += '<button class="nut-sua" id="suaGocGac" style="margin-top:14px"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>Viết / sửa gốc gác dòng họ</button>';
    $('#noiDungNgan').innerHTML = chu; $('#noiDungNgan').dataset.id = '';
    var n = $('#nganKeo'); n.classList.add('mo'); n.setAttribute('aria-hidden', 'false'); n.scrollTop = 0;
    $('#manChe').hidden = window.innerWidth >= 900;
    var s = $('#suaGocGac'); if (s) s.onclick = suaGocGac;
    $('#noiDungNgan').querySelectorAll('[data-mo-nguoi]').forEach(function (x) { x.onclick = function () { moChiTiet(x.getAttribute('data-mo-nguoi')); }; });
  }
  function suaGocGac() {
    var tt = DB.thongTin || {}, vb = function (k, nhan, goiY, dong) {
      return '<label class="o-sua"><span>' + nhan + '</span><textarea data-truong="' + k + '" data-cu="' + esc(tt[k] || '') + '" rows="' + dong + '" placeholder="' + esc(goiY) + '">' + esc(tt[k] || '') + '</textarea></label>';
    };
    var h = '<div class="ct-dau"><div class="an-trien" aria-hidden="true">陳</div><div><h3>Sửa gốc gác dòng họ</h3><p class="phu">Lưu xong, ai mở app cũng thấy.</p></div></div>';
    h += oSua('ten_dong_ho', 'Tên dòng họ', tt.ten_dong_ho, 'text', 'VD: Họ Trần Đình') + oSua('que_goc', 'Quê gốc', tt.que_goc, 'text', 'Thôn, xã, huyện, tỉnh');
    h += vb('pha_ky', 'Nguồn gốc / phả ký', 'Cụ Thủy tổ từ đâu đến, lập nghiệp ở đâu, những ai có công với họ…', 8);
    h += oSua('nha_tho_ho', 'Nhà thờ họ (địa chỉ)', tt.nha_tho_ho) + oSua('ban_do_nha_tho', 'Link Google Maps nhà thờ họ', tt.ban_do_nha_tho, 'url', 'https://maps.app.goo.gl/…');
    h += vb('toc_uoc', 'Tộc ước', 'Ngày giỗ Tổ, quy ước của họ…', 4);
    h += oMatMa() + '<div class="hang-nut" style="margin-top:14px"><button class="nut chinh" id="nutLuuSua">Lưu</button><button class="nut" id="huyGocGac">Huỷ</button></div>';
    $('#noiDungNgan').innerHTML = h; $('#nganKeo').scrollTop = 0;
    $('#huyGocGac').onclick = moGocGac;
    $('#nutLuuSua').onclick = function () { luuSua('', this, 'ho'); };
  }
  $('#dauChu').onclick = moGocGac;
  $('#dauChu').onkeydown = function (e) { if (e.key === 'Enter') moGocGac(); };

  /* ---------- Dải chữ chạy: đạo làm con, đạo làm cha mẹ, đạo làm người ---------- */
  var LOI_HAY = [
    'Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra. (Ca dao)',
    'Uống nước nhớ nguồn – cây có cội, nước có nguồn, người có tổ có tông.',
    'Đạo làm con (ý kinh Thi Ca La Việt): phụng dưỡng cha mẹ, làm tròn bổn phận, giữ gìn gia phong, sống xứng đáng, lo hương khói khi cha mẹ khuất.',
    'Đạo làm cha mẹ (ý kinh Thi Ca La Việt): ngăn con điều ác, khuyên con điều thiện, cho con học hành nghề nghiệp, lo con yên bề gia thất.',
    'Hiếu thảo với cha mẹ khi còn sống là ruộng phước lớn nhất của đời người.',
    'Hận thù không dập tắt được hận thù; chỉ có tình thương mới dập tắt được. (Ý kinh Pháp Cú)',
    'Năm giới làm người: không sát sinh, không trộm cắp, không tà dâm, không nói dối, không say sưa.',
    'Gieo nhân lành, gặt quả lành. Nói lời ái ngữ, làm việc lợi người.',
    'Anh em như thể tay chân – thương người như thể thương thân.',
    'Một điều nhịn, chín điều lành. Một câu niệm Phật, trăm mối bình an.',
    'Mùa Vu Lan báo hiếu: nhớ ơn cha mẹ, ông bà, tổ tiên – những người cho ta hình hài và nề nếp.',
    'Thời gian cha mẹ ở bên ta là có hạn. Hãy gọi về nhà, hỏi han một câu hôm nay.'
  ];
  (function () {
    var i = Math.floor(Math.random() * LOI_HAY.length), sp = $('#chuChay'), vang = $('#chuVang');
    var giam = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function chay() {
      vang.textContent = LOI_HAY[i % LOI_HAY.length]; i++;
      if (giam) { sp.style.animation = 'none'; setTimeout(chay, 9000); return; } // không chạy chữ: đổi câu mỗi 9 giây
      sp.style.animation = 'none'; void sp.offsetWidth;
      var w = sp.parentNode.clientWidth, cw = sp.scrollWidth, giay = Math.max(9, (w + cw) / 38);
      sp.style.setProperty('--tu', w + 'px'); sp.style.setProperty('--den', -cw + 'px');
      sp.style.animation = 'chu-chay ' + giay + 's linear 1 both';
    }
    sp.addEventListener('animationend', function () { if (!giam) chay(); });
    chay();
  })();

  /* ---------- Giao diện nền kiểu Việt: trống đồng phù điêu, sơn mài mây vàng, sen hồng (SVG tự vẽ) ---------- */
  function svgBoc(noi, w, h, mau, tamX, tamY) { // vẽ 3 lớp: bóng tối, ánh sáng, nét chính → hiệu ứng nổi (phù điêu)
    var lop = function (dx, dy, m, o) { return '<g transform="translate(' + dx + ' ' + dy + ')" stroke="' + m + '" stroke-opacity="' + o + '" fill="none">' + noi + '</g>'; };
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (tamX || 0) + ' ' + (tamY || 0) + ' ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" stroke-linecap="round" stroke-linejoin="round">' +
      lop(1.6, 1.8, '#000', 0.35) + lop(-1.1, -1.2, '#fff', 0.35) + lop(0, 0, mau, 1) + '</svg>';
  }
  function svgTrongDong(mau) {
    var g = '', i, a, r, P = Math.PI;
    var sao = []; for (i = 0; i < 28; i++) { a = i * P / 14 - P / 2; r = i % 2 ? 20 : 58; sao.push((r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1)); }
    g += '<polygon points="' + sao.join(' ') + '" stroke-width="2.2"/><circle r="12" stroke-width="2"/>';
    [68, 72, 92, 96, 134, 138, 186, 190, 224, 228, 262].forEach(function (x) { g += '<circle r="' + x + '" stroke-width="1.6"/>'; });
    for (i = 0; i < 44; i++) { a = i * 2 * P / 44; g += '<circle cx="' + (82 * Math.cos(a)).toFixed(1) + '" cy="' + (82 * Math.sin(a)).toFixed(1) + '" r="2.4" stroke-width="1.4"/>'; }
    var z = []; for (i = 0; i <= 72; i++) { a = i * 2 * P / 72; r = i % 2 ? 108 : 122; z.push((r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1)); }
    g += '<polyline points="' + z.join(' ') + '" stroke-width="1.6"/>';
    var chim = 'M-16 0Q-6-3 5-1L18-3L6 1Q-5 3-16 0ZM-5-1Q1-13 11-15Q4-6 2-1M-7 1Q-1 10 7 13Q2 5-1 1M-16 0Q-20-3-22-8';
    for (i = 0; i < 14; i++) { a = i * 360 / 14; g += '<g transform="rotate(' + a + ') translate(0 -162) rotate(90)"><path d="' + chim + '" stroke-width="1.7"/></g>'; }
    for (i = 0; i < 40; i++) { a = i * 2 * P / 40; g += '<circle cx="' + (207 * Math.cos(a)).toFixed(1) + '" cy="' + (207 * Math.sin(a)).toFixed(1) + '" r="9" stroke-width="1.5"/><circle cx="' + (207 * Math.cos(a)).toFixed(1) + '" cy="' + (207 * Math.sin(a)).toFixed(1) + '" r="2" stroke-width="1.3"/>'; }
    for (i = 0; i < 120; i++) { a = i * 2 * P / 120; g += '<line x1="' + (240 * Math.cos(a)).toFixed(1) + '" y1="' + (240 * Math.sin(a)).toFixed(1) + '" x2="' + (254 * Math.cos(a)).toFixed(1) + '" y2="' + (254 * Math.sin(a)).toFixed(1) + '" stroke-width="1.3"/>'; }
    return svgBoc(g, 560, 560, mau, -280, -280);
  }
  function svgMay(mau) { // vân mây cuộn, lặp thành nền
    var may = 'M8 52Q6 38 22 36Q24 22 40 24Q50 12 64 22Q80 18 84 34Q100 36 98 52Z M22 46Q22 40 28 40Q34 40 33 46Q32 50 28 49 M48 34Q50 28 56 29Q62 31 60 37Q58 40 54 38 M72 44Q74 38 80 40Q84 43 81 47';
    return svgBoc('<path d="' + may + '" stroke-width="2"/><g transform="translate(60 70) scale(.7)"><path d="' + may + '" stroke-width="2.6"/></g>', 130, 110, mau);
  }
  function svgSen(mau) {
    var hoa = '<path d="M0-26Q11-9 0 9Q-11-9 0-26Z"/><path d="M0 9Q-7-11-22-14Q-19 4 0 9Z"/><path d="M0 9Q7-11 22-14Q19 4 0 9Z"/><path d="M-3 9Q-19-1-31 1Q-24 12 -3 11Z"/><path d="M3 9Q19-1 31 1Q24 12 3 11Z"/><path d="M-26 15Q0 24 26 15"/>';
    return svgBoc('<g transform="translate(70 62)" stroke-width="2">' + hoa + '</g><g transform="translate(0 132) scale(.55)" stroke-width="3">' + hoa + '</g><g transform="translate(140 132) scale(.55)" stroke-width="3">' + hoa + '</g>', 140, 140, mau);
  }
  function urlSvg(x) { return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(x) + '")'; }
  var NEN = {
    rongphuong: function () { return { img: 'url("nen/phuong.webp"), url("nen/rong.webp")', size: 'min(56vw, 46vh, 460px) auto, min(80vw, 42vh, 560px) auto', lap: 'no-repeat, no-repeat',
      vt: 'right 3vw top calc(env(safe-area-inset-top) + 120px), left 3vw bottom calc(var(--duoi) + 70px)', mau: 'url("nen/rong.webp")' }; },
    luonglong: function () { return { img: 'url("nen/luong-long.webp")', size: 'cover', lap: 'no-repeat', vt: 'center', mau: 'url("nen/luong-long.webp")' }; },
    trongdong: function () { return { img: urlSvg(svgTrongDong('#c8913a')), size: 'min(120vmin, 900px)', lap: 'no-repeat', vt: 'center 58%' }; },
    sonmai: function () { return { img: urlSvg(svgMay('#d9a441')), size: '130px 110px', lap: 'repeat', vt: '0 0' }; },
    sen: function () { return { img: urlSvg(svgSen('#d86a8a')), size: '140px 140px', lap: 'repeat', vt: '0 0' }; }
  };
  function apNen(ten) {
    if (!NEN[ten]) ten = '';
    document.documentElement.setAttribute('data-nen', ten);
    var hv = $('#hoaVan'), n = ten ? NEN[ten]() : null;
    hv.style.backgroundImage = n ? n.img : 'none';
    if (n) { hv.style.backgroundSize = n.size; hv.style.backgroundRepeat = n.lap; hv.style.backgroundPosition = n.vt; }
    document.querySelectorAll('#chonNen [data-nen]').forEach(function (b) { b.classList.toggle('chon', b.getAttribute('data-nen') === ten); });
  }
  document.querySelectorAll('#chonNen [data-nen]').forEach(function (b) {
    var ten = b.getAttribute('data-nen'), m = b.querySelector('.mau-nen');
    if (ten && m) { var n = NEN[ten](); m.style.backgroundImage = n.mau || n.img; m.style.backgroundSize = n.mau ? 'cover' : ten === 'trongdong' ? '180%' : '60px'; m.style.backgroundPosition = 'center'; m.setAttribute('data-nen', ten); }
    b.onclick = function () { ghi('nen', ten); apNen(ten); bao('Đã đổi giao diện nền'); };
  });
  apNen(doc('nen', ''));

  /* ---------- Nhạc nền Phật giáo nhẹ nhàng: chuông, bát hát, nền trầm (tự tạo bằng Web Audio, không cần file) ---------- */
  var NHAC = { ctx: null, bat: false, hen: [] };
  function taoNhac() {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    var c = new AC(), tong = c.createGain(); tong.gain.value = 0; tong.connect(c.destination);
    // vang: phản hồi xung tự tạo
    var vang = c.createConvolver(), dai = c.sampleRate * 4.5, ir = c.createBuffer(2, dai, c.sampleRate);
    for (var k = 0; k < 2; k++) { var d = ir.getChannelData(k); for (var i = 0; i < dai; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / dai, 3); }
    vang.buffer = ir; var uot = c.createGain(); uot.gain.value = 0.55; vang.connect(uot); uot.connect(tong);
    var kho = c.createGain(); kho.gain.value = 0.6; kho.connect(tong); kho.connect(vang);
    // nền trầm: hai dây Rê – La thở chậm
    [73.42, 110, 146.83].forEach(function (f, j) {
      var o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), lp = c.createBiquadFilter();
      o.type = j === 2 ? 'sine' : 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 420;
      g.gain.value = [0.05, 0.035, 0.012][j]; lfo.frequency.value = 0.05 + j * 0.03; lg.gain.value = g.gain.value * 0.6;
      lfo.connect(lg); lg.connect(g.gain); o.connect(lp); lp.connect(g); g.connect(kho); o.start(); lfo.start();
    });
    return { c: c, tong: tong, kho: kho };
  }
  function goBat(n, f, to) { // tiếng bát hát / chuông: các hoạ âm lệch, ngân dài
    var c = n.c, t = c.currentTime + 0.05;
    [[1, 1], [2.76, 0.5], [5.4, 0.22], [8.93, 0.1]].forEach(function (h) {
      [0, 1.3].forEach(function (lech) {
        var o = c.createOscillator(), g = c.createGain();
        o.frequency.value = f * h[0] + lech; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(to * h[1] * 0.5, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 9 / Math.sqrt(h[0]));
        o.connect(g); g.connect(n.kho); o.start(t); o.stop(t + 10);
      });
    });
  }
  function goMo(n) { // mõ gỗ: vài tiếng gõ khẽ
    var c = n.c;
    for (var i = 0; i < 3; i++) {
      var t = c.currentTime + 0.1 + i * 0.75, o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter();
      o.frequency.setValueAtTime(820, t); o.frequency.exponentialRampToValueAtTime(560, t + 0.08);
      bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 3;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(bp); bp.connect(g); g.connect(n.kho); o.start(t); o.stop(t + 0.25);
    }
  }
  function lich(n) {
    var thang = [146.83, 196, 220, 293.66, 329.63, 392];
    (function vong() {
      if (!NHAC.bat) return;
      var r = Math.random();
      if (r < 0.78) goBat(n, thang[Math.floor(Math.random() * thang.length)], 0.16 + Math.random() * 0.08); else goMo(n);
      NHAC.hen.push(setTimeout(vong, 7000 + Math.random() * 8000));
    })();
  }
  function batNhac(bat) {
    NHAC.bat = bat; ghi('nhac', bat ? 1 : 0);
    $('#nutNhac').classList.toggle('dang', bat); $('#nutNhac').textContent = bat ? '🔔' : '🔕';
    NHAC.hen.forEach(clearTimeout); NHAC.hen = [];
    if (bat) {
      if (!NHAC.ctx) NHAC.ctx = taoNhac();
      var n = NHAC.ctx; if (!n) { bao('Máy này không phát được nhạc'); return; }
      n.c.resume(); n.tong.gain.cancelScheduledValues(n.c.currentTime);
      n.tong.gain.setTargetAtTime(0.9, n.c.currentTime, 1.2);
      goBat(n, 196, 0.22); lich(n);
    } else if (NHAC.ctx) {
      var m = NHAC.ctx; m.tong.gain.setTargetAtTime(0, m.c.currentTime, 0.6);
      setTimeout(function () { if (!NHAC.bat) m.c.suspend(); }, 2500);
    }
  }
  $('#nutNhac').onclick = function () { batNhac(!NHAC.bat); bao(NHAC.bat ? '🔔 Đã bật nhạc nền' : '🔕 Đã tắt nhạc nền'); };
  $('#nutNhac').textContent = doc('nhac', 0) ? '🔔' : '🔕';
  if (doc('nhac', 0)) { // trình duyệt chỉ cho phát sau lần chạm đầu tiên
    var moNhac = function () { document.removeEventListener('pointerdown', moNhac, true); if (!NHAC.bat) batNhac(true); };
    document.addEventListener('pointerdown', moNhac, true);
  }

  function batDau() { taiDuLieu().catch(function (e) {
    if (e && e.canLink) { khoaApp(!!doc('khoa', null)); return new Promise(function () {}); }
    if (e && e.canDangNhap) { moDangNhap(); return new Promise(function () {}); }
    $('#dangTai').hidden = true; bao('Không tải được gia phả (' + (e && e.message || 'lỗi mạng') + '). Kiểm tra mạng rồi mở lại.');
    return new Promise(function () {});
  }).then(function (d) {
    RAW = d; dungLai(); G._daVua = true;
    try { if (sessionStorage.getItem('gp_vuaKhoiPhuc')) { sessionStorage.removeItem('gp_vuaKhoiPhuc'); setTimeout(function () { bao('Đã khôi phục cài đặt của bạn từ link'); }, 600); } } catch (e) {}
    if (!TOI && !doc('boQuaToi', false)) setTimeout(moHoiToi, 500);
  }); }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(function () {});

  /* App trên màn hình chính iPhone không tải lại khi mở lên: tự kiểm tra bản mới + dữ liệu mới mỗi lần quay lại app. */
  var AN_LUC = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { AN_LUC = Date.now(); return; }
    if (!AN_LUC || Date.now() - AN_LUC < 20000 || LA_MAU || !RAW) return;
    var dangSua = !!document.querySelector('#nganKeo.mo #nutLuuSua');
    fetch('index.html?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (h) {
      var m = h.match(/app\.js\?v=([\d.]+)/);
      if (m && PB && m[1] !== PB && !dangSua) { location.reload(); return; }
      if (!dangSua) taiDuLieu().catch(function () {});
    }).catch(function () {});
  });
  window.GP = { get DB() { return DB; }, V: V, canhGiua: canhGiua, moChiTiet: moChiTiet, chuyenTab: chuyenTab };
})();
