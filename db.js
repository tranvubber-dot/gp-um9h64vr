/* Dựng cơ sở dữ liệu gia phả từ các dòng của Google Sheet (hoặc dữ liệu mẫu).
   GiaPhaDB.dung(raw, opts) → db */
(function (G) {
  'use strict';

  /* "Họ và tên" → "ho_va_ten" */
  function khoa(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }
  /* tên cột thay thế → tên chuẩn */
  var BIET_DANH = {
    ho_va_ten: 'ho_ten', ten: 'ho_ten', gioi: 'gioi_tinh', cha: 'ma_cha', me: 'ma_me',
    vo_chong: 'ma_vo_chong', ma_vo_hoac_chong: 'ma_vo_chong', con_thu: 'thu_tu', thu_tu_con: 'thu_tu',
    nam_sinh: 'ngay_sinh', nam_mat: 'ngay_mat', ngay_gio_am_lich: 'ngay_gio', gio: 'ngay_gio',
    so_dien_thoai: 'dien_thoai', sdt: 'dien_thoai', fb: 'facebook', biet_hieu: 'ten_hieu', hoc_vi_chuc_danh: 'chuc_danh', vai_vo: 'vai', dia_chi: 'noi_o', hoc_vi: 'chuc_danh', chuc_tuoc: 'chuc_danh', vo_thu: 'vai', la_vo_thu: 'vai',
    noi_chon_cat: 'noi_an_tang', mo_phan: 'noi_an_tang', anh_chan_dung: 'anh', ghi_chu: 'tieu_su'
  };
  function chuanDong(row) {
    var o = {};
    Object.keys(row).forEach(function (k) {
      var kk = khoa(k); kk = BIET_DANH[kk] || kk;
      var v = row[k];
      if (v === null || v === undefined) v = '';
      o[kk] = typeof v === 'string' ? v.trim() : v;
    });
    return o;
  }

  /* "12/3/1890" | "3/1890" | "1890" | Date → {d, m, y} */
  function docNgay(v) {
    if (!v) return null;
    if (v instanceof Date) return { d: v.getDate(), m: v.getMonth() + 1, y: v.getFullYear() };
    var s = String(v).trim(), m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return { d: +m[3], m: +m[2], y: +m[1] };
    var p = s.split(/[\/\-.\s]+/).filter(Boolean).map(Number);
    if (p.some(isNaN)) return { text: s };
    if (p.length === 1) return { y: p[0] };
    if (p.length === 2) return p[1] > 31 ? { m: p[0], y: p[1] } : { d: p[0], m: p[1] };
    return { d: p[0], m: p[1], y: p[2] };
  }
  function inNgay(n) {
    if (!n) return '';
    if (n.text) return n.text;
    return [n.d, n.m, n.y].filter(Boolean).join('/');
  }
  /* link chia sẻ Google Drive → link ảnh xem trực tiếp */
  function anhTrucTiep(u) {
    u = String(u || '').trim(); if (!u) return '';
    var m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
    return m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w400' : u;
  }
  function laCo(v) { return /^(x|có|co|yes|1|true|đã mất|da mat)$/i.test(String(v || '').trim()); }

  function dung(raw, opts) {
    opts = opts || {};
    var list = [], byId = {};
    (raw.nguoi || []).forEach(function (r, i) {
      r = chuanDong(r);
      var id = String(r.ma || '').trim();
      if (!id || !r.ho_ten) return;
      if (byId[id]) id = id + '_' + i;
      var p = {
        id: id, ten: r.ho_ten, gioi: /^n(ữ|u)/i.test(r.gioi_tinh) ? 'nu' : 'nam',
        cha: String(r.ma_cha || '').trim() || null, me: String(r.ma_me || '').trim() || null,
        voChong: String(r.ma_vo_chong || '').split(/[,;]+/).map(function (x) { return x.trim(); }).filter(Boolean),
        thu: parseInt(r.thu_tu, 10) || 0, vai: r.vai || '', loaiCon: r.loai_con || '',
        tenHuy: r.ten_huy || '', tenTu: r.ten_tu || '', tenHieu: r.ten_hieu || '', thuyHieu: r.thuy_hieu || '',
        chucDanh: r.chuc_danh || '', caiTang: r.cai_tang || '', queQuan: r.que_quan || '',
        sinh: docNgay(r.ngay_sinh), mat: docNgay(r.ngay_mat),
        daMat: !!(r.ngay_mat || laCo(r.da_mat) || r.ngay_gio),
        gio: null, noiAnTang: r.noi_an_tang || '', banDoMo: r.ban_do_mo || '',
        tieuSu: r.tieu_su || '', anh: anhTrucTiep(r.anh), noiO: r.noi_o || '',
        lienHe: { dienThoai: r.dien_thoai || '', zalo: r.zalo || '', facebook: r.facebook || '' },
        thuTuDong: i, con: []
      };
      var g = docNgay(r.ngay_gio);
      if (g && g.d && g.m) p.gio = { d: g.d, m: g.m };
      list.push(p); byId[id] = p;
    });

    // Ô Cha / Mẹ / Vợ chồng có thể ghi mã (T003), "Tên · T003" (chọn từ danh sách) hoặc chỉ tên (nếu không trùng)
    var theoTen = {};
    list.forEach(function (p) { var k = p.ten.toLowerCase().replace(/\s+/g, ' '); (theoTen[k] = theoTen[k] || []).push(p.id); });
    function giai(ref) {
      ref = String(ref || '').trim(); if (!ref) return null;
      if (byId[ref]) return ref;
      var m = ref.match(/([A-Za-z]{1,4}\d{1,6})\s*\)?\s*$/);
      if (m && byId[m[1]]) return m[1];
      var ds = theoTen[ref.toLowerCase().replace(/\s+/g, ' ')];
      return ds && ds.length === 1 ? ds[0] : null;
    }
    list.forEach(function (p) {
      p.cha = giai(p.cha); p.me = giai(p.me);
      var vc = [];
      p.voChong.forEach(function (x) {
        var id = giai(x);
        if (id) vc.push(id);
        else if (/^([A-Za-z]{1,4}\d+\s+)+[A-Za-z]{1,4}\d+$/.test(x)) x.split(/\s+/).forEach(function (y) { if (byId[y]) vc.push(y); });
      });
      p.voChong = vc.filter(function (s, i) { return s !== p.id && vc.indexOf(s) === i; });
    });
    list.forEach(function (p) {
      p.voChong.forEach(function (s) { if (byId[s].voChong.indexOf(p.id) < 0) byId[s].voChong.push(p.id); });
    });

    // Huyết thống: có cha/mẹ trong họ, hoặc là gốc (không cha mẹ, không phải dâu/rể của ai có cha mẹ)
    function coChaMe(p) { return !!(p.cha || p.me); }
    var goc = [];
    list.forEach(function (p) {
      if (coChaMe(p)) return;
      var laDauRe = p.voChong.some(function (s) {
        var q = byId[s];
        return coChaMe(q) || (p.gioi === 'nu' && q.gioi === 'nam') ||
          (p.gioi === q.gioi && q.thuTuDong < p.thuTuDong);
      });
      if (!laDauRe) goc.push(p);
    });
    var gocSet = {}; goc.forEach(function (p) { gocSet[p.id] = 1; });
    function laHuyetThong(p) { return !!(p && (coChaMe(p) || gocSet[p.id])); }

    // So vai giữa anh chị em: >0 nếu x vai trên y
    function soSanhVai(x, y) {
      if (x === y) return 0;
      var cungCha = x.cha && x.cha === y.cha, cungMe = x.me && x.me === y.me;
      if ((cungCha || cungMe) && x.thu && y.thu && x.thu !== y.thu) return y.thu - x.thu;
      var sx = x.sinh && x.sinh.y, sy = y.sinh && y.sinh.y;
      if (sx && sy && sx !== sy) return sy - sx;
      return y.thuTuDong - x.thuTuDong;
    }

    // Con cái: gắn vào cha (nếu cha là huyết thống), không thì vào mẹ
    list.forEach(function (p) {
      var cha = p.cha && byId[p.cha], me = p.me && byId[p.me];
      if (cha && laHuyetThong(cha)) cha.con.push(p);
      else if (me && laHuyetThong(me)) { me.con.push(p); p.ngoaiTon = true; }
      else if (cha) cha.con.push(p);
      else if (me) me.con.push(p);
    });
    // Xếp con: con bà cả trước, rồi bà kế, bà thứ; trong mỗi bà theo thứ tự sinh.
    function hangBa(p) {
      var me = p.me && byId[p.me];
      if (!me) return 0;
      var v = (me.vai || '').toLowerCase();
      if (/chính|chinh|cả|ca\b/.test(v)) return 0;
      if (/kế|ke/.test(v)) return 1;
      if (/thứ|thu|lẽ|le/.test(v)) return 2;
      var cha = p.cha && byId[p.cha];
      return cha ? Math.max(0, cha.voChong.indexOf(me.id)) : 0;
    }
    list.forEach(function (p) {
      p.con.sort(function (a, b) {
        if (opts.traiTruocGaiSau && a.gioi !== b.gioi) return a.gioi === 'nam' ? -1 : 1;
        return (hangBa(a) - hangBa(b)) || -soSanhVai(a, b);
      });
    });

    // Đời: từ gốc đi xuống; dâu/rể cùng đời với vợ/chồng
    goc.sort(function (a, b) { return a.thuTuDong - b.thuTuDong; });
    function datDoi(p, d) {
      if (p.doi) return; p.doi = d;
      p.voChong.forEach(function (s) { if (!laHuyetThong(byId[s]) && !byId[s].doi) byId[s].doi = d; });
      p.con.forEach(function (c) { datDoi(c, d + 1); });
    }
    goc.forEach(function (g) { datDoi(g, 1); });
    list.forEach(function (p) { if (!p.doi) p.doi = 1; });

    // Thứ bậc trong nhà: trưởng nam, con trai thứ 2..., trưởng nữ...
    list.forEach(function (p) {
      var trai = 0, gai = 0, nTrai = p.con.filter(function (c) { return c.gioi === 'nam'; }).length;
      p.con.forEach(function (c) {
        if (c.cha !== p.id && c.me !== p.id) return;
        var nGai = p.con.length - nTrai;
        if (c.gioi === 'nam') { trai++; c.thuBac = trai === 1 ? 'Trưởng nam' : (trai === nTrai && trai > 2 ? 'Út nam' : 'Thứ nam ' + trai); }
        else { gai++; c.thuBac = gai === 1 ? 'Trưởng nữ' : (gai === nGai && gai > 2 ? 'Út nữ' : 'Thứ nữ ' + gai); }
        if (c.loaiCon && !/đẻ|de|ruột|ruot/i.test(c.loaiCon)) c.thuBac += ' · ' + c.loaiCon.toLowerCase();
      });
    });

    // Chi: con trai của Thủy tổ lập chi (chi 1 = chi trưởng)
    var thuyTo = goc[0], chiList = [];
    if (thuyTo) {
      thuyTo.con.filter(function (c) { return c.gioi === 'nam' && !c.ngoaiTon; }).forEach(function (c, i) {
        var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
        chiList.push({ so: i + 1, ten: 'Chi ' + (CAN[i] || (i + 1)), phu: i === 0 ? 'chi trưởng' : 'chi thứ ' + (i + 1), goc: c.id });
        (function gan(p) {
          p.chi = i + 1;
          p.voChong.forEach(function (s) { if (!laHuyetThong(byId[s])) byId[s].chi = i + 1; });
          p.con.forEach(gan);
        })(c);
      });
    }

    // Dòng đích: từ Thủy tổ theo con trai trưởng (không tính con nuôi) qua từng đời
    var dongDich = [];
    for (var cur = thuyTo; cur; ) {
      dongDich.push(cur.id); cur.dich = true;
      cur = cur.con.filter(function (c) {
        return c.gioi === 'nam' && !c.ngoaiTon && !/nuôi|nuoi/i.test(c.loaiCon);
      })[0];
    }

    list.forEach(function (p) {
      p.huyetThong = laHuyetThong(p);
      p.dauRe = !p.huyetThong;
    });

    return {
      list: list, byId: byId, goc: goc, thuyTo: thuyTo, chiList: chiList,
      thongTin: raw.thongTin || {}, dongDich: dongDich, laHuyetThong: laHuyetThong, soSanhVai: soSanhVai,
      soDoi: list.reduce(function (m, p) { return Math.max(m, p.doi); }, 0)
    };
  }

  G.GiaPhaDB = { dung: dung, docNgay: docNgay, inNgay: inNgay, khoa: khoa };
})(typeof window !== 'undefined' ? window : globalThis);
