/* Gia phả Họ Trần — giao diện chính */
(function () {
  'use strict';
  var C = window.GP_CONFIG || {};
  var $ = function (s) { return document.querySelector(s); };
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- lưu trên máy (bọc try vì Safari riêng tư có thể chặn) ---------- */
  function doc(k, mac) { try { var v = localStorage.getItem('gp_' + k); return v == null ? mac : JSON.parse(v); } catch (e) { return mac; } }
  function ghi(k, v) { try { if (v == null) localStorage.removeItem('gp_' + k); else localStorage.setItem('gp_' + k, JSON.stringify(v)); } catch (e) {} }

  /* ---------- lò xo: mô phỏng rồi xuất thành CSS linear() ---------- */
  (function caiLoXo() {
    var giam = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var coLinear = window.CSS && CSS.supports && CSS.supports('transition-timing-function', 'linear(0, 1)');
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
    var cu = doc('dulieu', null);
    var moi = fetch(C.apiUrl + (C.apiUrl.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now())
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) {
        if (!d || !d.nguoi) throw new Error(d && d.loi || 'Dữ liệu không đúng dạng');
        d.taiLuc = Date.now(); ghi('dulieu', d); return d;
      });
    if (cu && !epMoi) { // hiện ngay bản đã lưu, cập nhật ngầm
      moi.then(function (d) { if (JSON.stringify(d.nguoi) !== JSON.stringify(cu.nguoi) || JSON.stringify(d.thongTin) !== JSON.stringify(cu.thongTin)) { RAW = d; dungLai(); bao('Đã cập nhật dữ liệu mới'); } })
        .catch(function () {});
      return Promise.resolve(cu);
    }
    return moi.catch(function (e) {
      if (cu) { bao('Không tải được dữ liệu mới, đang dùng bản đã lưu'); return cu; }
      bao('Không tải được Google Sheet: ' + e.message + '. Đang hiện dữ liệu mẫu.');
      LA_MAU = true; return taiDuLieu();
    });
  }

  function dungLai(giuViTri) {
    DB = window.GiaPhaDB.dung({ thongTin: RAW.thongTin, nguoi: ghepRiengTu(RAW.nguoi) }, { traiTruocGaiSau: CD.traiTruocGaiSau });
    tinhXungToi();
    $('#dangTai').hidden = true;
    veDau(); veCay(giuViTri); veTraCuu(); veXungHo(); veGio(); veDongHo();
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
    var st = p.anh ? ' style="background-image:url(\'' + esc(p.anh) + '\')"' : '';
    return '<span class="cham ' + (p.gioi === 'nu' ? 'nu ' : '') + (p.daMat ? 'mat ' : '') + (p.anh ? 'co-anh ' : '') + (lop || '') + '"' + st + '>' + (p.anh ? '' : esc(tenGoi(p).charAt(0))) + '</span>';
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
    // bóng mềm giả (2 lớp, không dùng filter để kéo thả mượt)
    el('rect', { 'class': 'bong2', x: -2, y: 4, width: CW + 4, height: CH + 4, rx: 22 }, vo);
    el('rect', { 'class': 'bong1', x: 0, y: 2.5, width: CW, height: CH + 1, rx: 20 }, vo);
    el('rect', { 'class': 'nen', width: CW, height: CH, rx: 20 }, vo);
    // ảnh tròn / chữ cái đầu trên nền chuyển màu
    var cx = 33, cy = CH / 2, r = 21;
    el('circle', { cx: cx, cy: cy, r: r, fill: p.daMat ? 'url(#gMat)' : (p.gioi === 'nu' ? 'url(#gNu)' : 'url(#gNam)') }, vo);
    if (p.anh) {
      var im = el('image', { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, 'clip-path': 'url(#cTron)', preserveAspectRatio: 'xMidYMid slice' }, vo);
      im.setAttribute('href', p.anh);
    } else chu(vo, cx, cy + 6, tenGoi(p).charAt(0).toUpperCase(), 'chu-cai').setAttribute('text-anchor', 'middle');
    if (p.daMat) el('circle', { 'class': 'vong-mat', cx: cx, cy: cy, r: r + 3.5 }, vo);
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
        el('line', { 'class': 'noi-vc', x1: sx - SG - 2, y1: p._y + CH / 2, x2: sx + 2, y2: p._y + CH / 2 }, lopNoi);
        el('circle', { cx: sx - SG / 2, cy: p._y + CH / 2, r: 3.5, fill: 'var(--kim)' }, lopNoi);
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
          el('path', { 'class': 'noi' + (c.dich && dich ? ' dich' : ''), d: d }, c.dich && dich ? lopDich : lopNoi);
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
    G._bien = { x0: minX - 122, x1: maxX + 30, y0: -30, y1: (maxDoi - 1) * RH + CH + 40 };
    if (!veCay._da) { veCay._da = true; svg.classList.add('cay-moi'); setTimeout(function () { svg.classList.remove('cay-moi'); }, 1600);
      G.querySelectorAll('.the .vo').forEach(function (v) { var d = DB.byId[v.parentNode.getAttribute('data-id')].doi; v.style.animationDelay = Math.min(d * 70, 700) + 'ms'; }); }
    if (!giuViTri) requestAnimationFrame(vuaKhung);
    else apV();
  }
  function demHau(p) { var n = 0; conHien(p).forEach(function (c) { n += 1 + demHau(c); }); return n; }

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
    var b = G._bien, r = svg.getBoundingClientRect();
    if (!b || !r.width) return;
    var w = b.x1 - b.x0, h = b.y1 - b.y0;
    var k = kep(Math.min(r.width / w, (r.height - 40) / h, 1));
    if (k < 0.4 && muot !== true) { // màn hẹp: toàn cây quá nhỏ không đọc được → phóng vào bạn (hoặc cụ Thủy tổ)
      var tam = (TOI && DB.byId[TOI] && DB.byId[TOI]._x != null) ? DB.byId[TOI] : DB.thuyTo;
      if (tam && tam._x != null) {
        k = Math.min(0.75, r.width / (CW * 2.2));
        V.k = k; V.x = r.width / 2 - (tam._x + CW / 2) * k; V.y = (tam === DB.thuyTo ? 70 : r.height / 2.6) - (tam._y + CH / 2) * k; apV(); return;
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
    var r = svg.getBoundingClientRect(), k = Math.max(V.k, 0.85);
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
    function diem(e) { var r = svg.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
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
          } else moChiTiet(trungVao.getAttribute('data-id'));
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
    $('#zIn').onclick = function () { var r = svg.getBoundingClientRect(); zoomTai(1.3, r.width / 2, r.height / 2); };
    $('#zOut').onclick = function () { var r = svg.getBoundingClientRect(); zoomTai(1 / 1.3, r.width / 2, r.height / 2); };
    $('#zFit').onclick = function () { vuaKhung(true); };
    $('#zToi').onclick = function () {
      if (TOI && DB.byId[TOI]) canhGiua(TOI, true); else moHoiToi();
    };
    window.addEventListener('resize', function () { if ($('#tab-phado').classList.contains('hien')) apV(); });
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
    var h = '<div class="ct-dau">' + cham(p) + '<div><h3>' + esc(p.ten) + '</h3><p class="phu">' + huy + '</p></div></div>';
    if (TOI && XH_TOI[id] && XH_TOI[id].goi) h += '<div class="xh-toi"><div><small>Bạn gọi là</small><b>' + esc(XH_TOI[id].goi) + '</b></div><div><small>Người này gọi bạn là</small><b>' + esc(XH_TOI[id].duocGoi || '—') + '</b></div></div>';
    else if (id === TOI) h += '<div class="xh-toi"><div><small>Đây là</small><b>bạn</b></div></div>';

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
    if (p.tieuSu) h += '<div class="muc-ct"><h4>Tiểu sử, công đức</h4><div class="tieu-su">' + esc(p.tieuSu) + '</div></div>';

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
    $('#noiDungNgan').innerHTML = h;
    $('#noiDungNgan').dataset.id = id;
    var n = $('#nganKeo'); n.classList.add('mo'); n.setAttribute('aria-hidden', 'false'); n.scrollTop = 0;
    $('#manChe').hidden = window.innerWidth >= 900;
  }
  function dongNgan() {
    $('#nganKeo').classList.remove('mo'); $('#nganKeo').setAttribute('aria-hidden', 'true'); $('#manChe').hidden = true;
    danhDauChon(null);
  }
  $('#dongNgan').onclick = dongNgan;
  $('#manChe').onclick = dongNgan;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dongNgan(); });
  $('#noiDungNgan').addEventListener('click', function (e) {
    var m = e.target.closest('[data-mo]');
    if (m) { moChiTiet(m.getAttribute('data-mo')); return; }
    var d = e.target.closest('[data-di]'); if (!d) return;
    var id = $('#noiDungNgan').dataset.id, di = d.getAttribute('data-di');
    if (di === 'cay') { var giu = id; chuyenTab('phado'); if (window.innerWidth < 900) dongNgan(); danhDauChon(giu); setTimeout(function () { canhGiua(giu, true); }, 60); }
    if (di === 'xh') { $('#xhA').value = id; chuyenTab('xungho'); dongNgan(); tinhXH(); }
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
      return '<li style="--i:' + Math.min(i, 14) + '" data-mo="' + esc(p.id) + '">' + cham(p) + '<div class="chu"><div class="ten">' + esc(p.ten) + '</div><div class="mo">' +
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
  function tinhXH() {
    var a = $('#xhA').value, b = $('#xhB').value;
    if (!DB.byId[a] || !DB.byId[b]) return;
    var r1 = window.XungHo.goi(DB, a, b), r2 = window.XungHo.goi(DB, b, a);
    var A = DB.byId[a], B = DB.byId[b];
    function the(x, y, r) {
      return '<div class="the-xh kinh"><div class="ai"><b>' + esc(x.ten) + '</b> gọi <b>' + esc(y.ten) + '</b> là</div><div class="tu">' +
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
  function veGio() {
    var hn = new Date(), am = window.AmLich.solar2lunar(hn.getDate(), hn.getMonth() + 1, hn.getFullYear());
    $('#homNay').innerHTML = '<div class="nho">Hôm nay</div><div class="lon">' + THU[hn.getDay()] + ', ' + hn.toLocaleDateString('vi-VN') + '</div>' +
      '<div class="am">Âm lịch: ngày ' + am[0] + ' tháng ' + am[1] + (am[3] ? ' (nhuận)' : '') + ' năm ' + window.AmLich.canChiNam(am[2]) + '</div>';
    var ds = dsGio();
    $('#dsGio').innerHTML = ds.map(function (x, i) {
      var d = x.g.date, p = x.p, tien = new Date(d - 864e5);
      var con = x.g.soNgay === 0 ? '<b>Hôm nay</b>' : x.g.soNgay === 1 ? '<b>Ngày mai</b>' : '<b>' + x.g.soNgay + '</b>ngày nữa';
      return '<li style="--i:' + Math.min(i, 14) + '" data-mo="' + esc(p.id) + '" class="' + (x.g.soNgay <= 7 ? 'gan' : '') + (x.g.soNgay === 0 ? ' hom-nay-gio' : '') + '"><div class="lich-to"><div class="th">Tháng ' + (d.getMonth() + 1) + '</div><div class="ng">' + d.getDate() +
        '</div><div class="tt">' + (d.getDay() ? 'T.' + THU[d.getDay()].slice(4) : 'CN') + '</div></div><div class="chu"><div class="ten"><b>' + esc(p.ten) + '</b></div>' +
        '<div class="phu">Giỗ ' + p.gio.d + '/' + p.gio.m + ' âm · Đời ' + p.doi + (tenChi(p) ? ' · ' + esc(tenChi(p)) : '') + '</div>' +
        '<div class="phu" style="font-size:12px">Tiên thường: tối ' + tien.getDate() + '/' + (tien.getMonth() + 1) + '</div></div><div class="con">' + con + '</div></li>';
    }).join('') || '<li class="phu">Chưa có ai được ghi ngày giỗ. Điền cột "Ngày giỗ" (ngày/tháng âm lịch) trong Google Sheet.</li>';
  }
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
    veKhoa(); veCaiDat();
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
    fetch(C.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ma: ma }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) { bao(d && d.loi || 'Sai mã gia đình'); return; }
        LH = d.lienHe || {}; ghi('lienhe', LH); dungLai(true); bao('Đã mở khoá liên lạc');
      })
      .catch(function () { bao('Không kết nối được. Thử lại khi có mạng.'); });
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
      '.chu-cai{fill:#fff;font-size:17px;font-weight:800}.huy-dich rect{fill:url(#gKim)}.huy-dich text{fill:#fff;font-size:10px;font-weight:800}.vong-mat{fill:none;stroke:#e0a43a;stroke-width:1.5;stroke-dasharray:2 2.5}';
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
      if (la) $('#chiBao').style.transform = 'translateX(' + (i * 100) + '%)';
    });
    if (t === 'phado' && !G._daVua) { G._daVua = true; requestAnimationFrame(vuaKhung); }
  }
  $('#thanhDuoi').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b) chuyenTab(b.getAttribute('data-tab')); });

  /* =================== KHỞI ĐỘNG =================== */
  taiDuLieu().then(function (d) {
    RAW = d; dungLai(); G._daVua = true;
    if (!TOI && !doc('boQuaToi', false)) setTimeout(moHoiToi, 500);
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(function () {});
  window.GP = { get DB() { return DB; }, V: V, canhGiua: canhGiua, moChiTiet: moChiTiet, chuyenTab: chuyenTab };
})();
