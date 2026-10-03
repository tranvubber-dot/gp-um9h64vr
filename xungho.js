/* Tính xưng hô giữa hai người trong họ (cách gọi miền Bắc).
   XungHo.goi(db, aId, bId) → { tu: 'chú', giaiThich: '...', duong: [ids] }  (A gọi B là gì)
   db: { byId: {id: người}, laHuyetThong(p), soSanhVai(x, y) > 0 nếu x vai trên y } */
(function (G) {
  'use strict';

  function laNam(p) { return p.gioi === 'nam'; }

  /* Mọi tổ tiên huyết thống (qua cha và mẹ), kèm đường đi từ người đó lên. */
  function toTien(db, id) {
    var res = {}, q = [[id]];
    res[id] = [id];
    while (q.length) {
      var path = q.shift(), p = db.byId[path[path.length - 1]];
      [p.cha, p.me].forEach(function (pid) {
        if (pid && db.byId[pid] && !res[pid]) {
          var np = path.concat(pid);
          res[pid] = np; q.push(np);
        }
      });
    }
    return res;
  }

  /* Tổ chung gần nhất: trả { duongA: [A..L], duongB: [B..L] } hoặc null */
  function toChung(db, a, b) {
    var ta = toTien(db, a), tb = toTien(db, b), best = null;
    Object.keys(ta).forEach(function (k) {
      if (!tb[k]) return;
      var s = ta[k].length + tb[k].length;
      if (!best || s < best.s) best = { s: s, duongA: ta[k], duongB: tb[k] };
    });
    return best;
  }

  var DOI_DUOI = ['', 'con', 'cháu', 'chắt', 'chút', 'chít'];

  /* A gọi B khi hai người cùng huyết thống. */
  function goiMau(db, A, B, tc) {
    var dA = tc.duongA.length - 1, dB = tc.duongB.length - 1;
    var pA = tc.duongA.map(function (i) { return db.byId[i]; });
    var pB = tc.duongB.map(function (i) { return db.byId[i]; });
    var b = db.byId[B];

    if (dA === 0) { // B là con cháu trực hệ của A
      var t = DOI_DUOI[dB] || ('cháu đời thứ ' + dB);
      if (dB === 2) t += laNam(pB[1]) ? ' nội' : ' ngoại';
      return { tu: t, kieu: 'duoi', cach: dB };
    }
    if (dB === 0) { // B là tổ tiên trực hệ của A
      var nhanh = laNam(pA[1]) ? 'nội' : 'ngoại';
      if (dA === 1) return { tu: laNam(b) ? 'bố' : 'mẹ', kieu: 'tren', cach: 1 };
      if (dA === 2) return { tu: (laNam(b) ? 'ông ' : 'bà ') + nhanh, kieu: 'tren', cach: 2 };
      if (dA === 3) return { tu: (laNam(b) ? 'cụ ông' : 'cụ bà'), kieu: 'tren', cach: 3 };
      if (dA === 4) return { tu: (laNam(b) ? 'kỵ ông' : 'kỵ bà'), kieu: 'tren', cach: 4 };
      return { tu: 'cụ tổ (trên ' + dA + ' đời)', kieu: 'tren', cach: dA };
    }

    // Hai nhánh tách nhau từ con của tổ chung: so vai giữa 2 người con đó
    var nhanhA = pA[dA - 1], nhanhB = pB[dB - 1];
    var bVaiTren = db.soSanhVai(nhanhB, nhanhA) > 0;
    var ho = (dA > 1 && dB > 1) ? ' họ' : '';

    if (dA === dB) { // ngang hàng
      if (dA === 1) bVaiTren = db.soSanhVai(b, db.byId[A]) > 0;
      if (bVaiTren) return { tu: (laNam(b) ? 'anh' : 'chị') + ho, kieu: 'ngang', cach: 0 };
      return { tu: 'em' + ho, kieu: 'ngang', cach: 0 };
    }

    var k = dA - dB;
    if (k > 0) { // B ở vai trên
      var noi = laNam(pA[1]); // bên nội / ngoại xét theo cha hay mẹ của A
      ho = dB > 1 ? ' họ' : '';
      if (k === 1) {
        var w;
        if (noi) w = laNam(b) ? (bVaiTren ? 'bác' : 'chú') : (bVaiTren ? 'bác' : 'cô');
        else w = laNam(b) ? (bVaiTren ? 'bác' : 'cậu') : (bVaiTren ? 'bác' : 'dì');
        return { tu: w + ho, kieu: 'tren', cach: 1 };
      }
      if (k === 2) {
        var w2;
        if (laNam(b)) w2 = bVaiTren ? 'ông bác' : (noi ? 'ông chú' : 'ông cậu');
        else w2 = bVaiTren ? 'bà bác' : (noi ? 'bà cô' : 'bà dì');
        return { tu: w2 + ho, kieu: 'tren', cach: 2 };
      }
      return { tu: (k === 3 ? 'cụ' : 'kỵ') + ho, kieu: 'tren', cach: k };
    }
    // B ở vai dưới
    k = -k;
    var hoD = dA > 1 ? ' họ' : '';
    return { tu: (DOI_DUOI[k] === 'con' ? 'cháu' : (DOI_DUOI[k] || 'cháu')) + hoD, kieu: 'duoi', cach: k };
  }

  /* B là vợ/chồng của S (S cùng huyết thống với A), A gọi S là t → A gọi B? */
  function goiDauRe(t, B) {
    var nu = !laNam(B), w = t.tu, base = w.replace(/ (họ|nội|ngoại)$/, '');
    var ho = / họ$/.test(w) ? ' họ' : '';
    var map = {
      'bác': nu ? 'bác gái' : 'bác trai', 'chú': 'thím', 'cô': 'chú (dượng)',
      'cậu': 'mợ', 'dì': 'chú (dượng)', 'anh': 'chị (dâu)', 'chị': 'anh (rể)',
      'em': nu ? 'em (dâu)' : 'em (rể)', 'con': nu ? 'con dâu' : 'con rể',
      'bố': 'mẹ (kế)', 'mẹ': 'bố (dượng)',
      'ông bác': 'bà bác', 'ông chú': 'bà thím', 'ông cậu': 'bà mợ',
      'bà bác': 'ông bác', 'bà cô': 'ông dượng', 'bà dì': 'ông dượng'
    };
    if (map[base]) {
      if (base === 'con' || base === 'bố' || base === 'mẹ' || !ho) return map[base];
      return map[base].replace(/^([^(]+?)( \(|$)/, '$1' + ho + '$2');
    }
    if (/^(cháu|chắt|chút|chít)/.test(base)) return w + (nu ? ' dâu' : ' rể');
    if (/^ông/.test(base)) return 'bà' + w.slice(3);
    if (/^bà/.test(base)) return 'ông' + w.slice(2);
    if (/^(cụ|kỵ)/.test(base)) return base.split(' ')[0] + (nu ? ' bà' : ' ông');
    return w;
  }

  function ten(db, id) { return db.byId[id].ten; }

  function goi(db, A, B, _sau) {
    var a = db.byId[A], b = db.byId[B];
    if (!a || !b) return null;
    if (A === B) return { tu: 'chính mình', giaiThich: '' };
    if ((a.voChong || []).indexOf(B) >= 0)
      return { tu: laNam(b) ? 'chồng' : 'vợ', giaiThich: 'Hai người là vợ chồng.' };

    var tc = toChung(db, A, B);
    if (tc) {
      var r = goiMau(db, A, B, tc);
      var L = tc.duongA[tc.duongA.length - 1];
      r.duong = tc.duongA.concat(tc.duongB.slice(0, -1).reverse());
      r.giaiThich = (L === A || L === B) ? 'Cùng một dòng trực hệ.'
        : 'Tổ chung gần nhất: ' + ten(db, L) + '.';
      return r;
    }
    if (_sau) return null;
    // B là dâu/rể: đi qua vợ/chồng của B
    var vcB = (b.voChong || []).filter(function (s) { return db.laHuyetThong(db.byId[s]); });
    for (var i = 0; i < vcB.length; i++) {
      var tcS = toChung(db, A, vcB[i]);
      if (tcS) {
        var t = goiMau(db, A, vcB[i], tcS);
        return { tu: goiDauRe(t, b), giaiThich: b.ten + ' là ' + (laNam(b) ? 'chồng' : 'vợ') + ' của ' +
          ten(db, vcB[i]) + ' (người ' + a.ten + ' gọi là ' + t.tu + ').',
          duong: tcS.duongA.concat(tcS.duongB.slice(0, -1).reverse(), [B]) };
      }
    }
    // A là dâu/rể: gọi theo vợ/chồng
    var vcA = (a.voChong || []);
    for (var j = 0; j < vcA.length; j++) {
      var r2 = goi(db, vcA[j], B, true) || goiQuaDauRe(db, vcA[j], B);
      if (r2) return { tu: r2.tu, giaiThich: a.ten + ' gọi theo ' + (laNam(a) ? 'vợ' : 'chồng') +
        ' là ' + ten(db, vcA[j]) + '. ' + (r2.giaiThich || ''), duong: [A].concat(r2.duong || []) };
    }
    return { tu: '', giaiThich: 'Chưa tìm thấy quan hệ giữa hai người trong dữ liệu.' };
  }
  function goiQuaDauRe(db, A, B) { // A huyết thống, B dâu/rể
    var b = db.byId[B];
    var vcB = (b.voChong || []);
    for (var i = 0; i < vcB.length; i++) {
      var tc = toChung(db, A, vcB[i]);
      if (tc) {
        var t = goiMau(db, A, vcB[i], tc);
        return { tu: goiDauRe(t, b), giaiThich: b.ten + ' là ' + (laNam(b) ? 'chồng' : 'vợ') + ' của ' + ten(db, vcB[i]) + '.',
          duong: tc.duongA.concat(tc.duongB.slice(0, -1).reverse(), [B]) };
      }
    }
    return null;
  }

  G.XungHo = { goi: goi, toChung: toChung };
})(typeof window !== 'undefined' ? window : globalThis);
