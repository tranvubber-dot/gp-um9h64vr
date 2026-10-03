/* Âm lịch Việt Nam — thuật toán Hồ Ngọc Đức, múi giờ +7.
   Dùng để đổi ngày giỗ (âm) sang dương lịch và hiện can chi. */
(function (G) {
  'use strict';
  var PI = Math.PI, TZ = 7;
  function INT(d) { return Math.floor(d); }

  function jdFromDate(dd, mm, yy) {
    var a = INT((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
    var jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }
  function jdToDate(jd) {
    var a, b, c;
    if (jd > 2299160) { a = jd + 32044; b = INT((4 * a + 3) / 146097); c = a - INT((b * 146097) / 4); }
    else { b = 0; c = jd + 32082; }
    var d = INT((4 * c + 3) / 1461), e = c - INT((1461 * d) / 4), m = INT((5 * e + 2) / 153);
    return [e - INT((153 * m + 2) / 5) + 1, m + 3 - 12 * INT(m / 10), b * 100 + d - 4800 + INT(m / 10)];
  }
  function newMoon(k) {
    var T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
    var Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    var Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    var F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    var C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    var deltat = T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return Jd1 + C1 - deltat;
  }
  function sunLongitude(jdn) {
    var T = (jdn - 2451545.0) / 36525, T2 = T * T, dr = PI / 180;
    var M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    var DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    var L = (L0 + DL) * dr;
    return L - PI * 2 * INT(L / (PI * 2));
  }
  function getSunLongitude(d) { return INT(sunLongitude(d - 0.5 - TZ / 24) / PI * 6); }
  function getNewMoonDay(k) { return INT(newMoon(k) + 0.5 + TZ / 24); }
  function getLunarMonth11(yy) {
    var off = jdFromDate(31, 12, yy) - 2415021, k = INT(off / 29.530588853);
    var nm = getNewMoonDay(k);
    if (getSunLongitude(nm) >= 9) nm = getNewMoonDay(k - 1);
    return nm;
  }
  function getLeapMonthOffset(a11) {
    var k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5), last, i = 1;
    var arc = getSunLongitude(getNewMoonDay(k + i));
    do { last = arc; i++; arc = getSunLongitude(getNewMoonDay(k + i)); } while (arc != last && i < 14);
    return i - 1;
  }
  /* dương → âm: trả [ngày, tháng, năm, nhuận(0/1)] */
  function solar2lunar(dd, mm, yy) {
    var dayNumber = jdFromDate(dd, mm, yy);
    var k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    var monthStart = getNewMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k);
    var a11 = getLunarMonth11(yy), b11 = a11, lunarYear;
    if (a11 >= monthStart) { lunarYear = yy; a11 = getLunarMonth11(yy - 1); }
    else { lunarYear = yy + 1; b11 = getLunarMonth11(yy + 1); }
    var lunarDay = dayNumber - monthStart + 1, diff = INT((monthStart - a11) / 29);
    var lunarLeap = 0, lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
      var leapDiff = getLeapMonthOffset(a11);
      if (diff >= leapDiff) { lunarMonth = diff + 10; if (diff == leapDiff) lunarLeap = 1; }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
    return [lunarDay, lunarMonth, lunarYear, lunarLeap];
  }
  /* âm → dương: trả [ngày, tháng, năm] hoặc [0,0,0] nếu không có */
  function lunar2solar(ld, lm, ly, leap) {
    var a11, b11;
    if (lm < 11) { a11 = getLunarMonth11(ly - 1); b11 = getLunarMonth11(ly); }
    else { a11 = getLunarMonth11(ly); b11 = getLunarMonth11(ly + 1); }
    var k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853), off = lm - 11;
    if (off < 0) off += 12;
    if (b11 - a11 > 365) {
      var leapOff = getLeapMonthOffset(a11), leapMonth = leapOff - 2;
      if (leapMonth < 0) leapMonth += 12;
      if (leap && lm != leapMonth) return [0, 0, 0];
      if (leap || off >= leapOff) off += 1;
    }
    return jdToDate(getNewMoonDay(k + off) + ld - 1);
  }

  var CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  var CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  function canChiNam(y) { return CAN[(y + 6) % 10] + ' ' + CHI[(y + 8) % 12]; }

  /* Ngày giỗ (âm lịch d/m) gần nhất tính từ hôm nay (Date).
     Tháng thiếu không có ngày 30 → cúng ngày 29. Trả {date: Date, lunarYear, soNgay} */
  function gioSapToi(ld, lm, today) {
    today = today || new Date();
    var t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var lt = solar2lunar(t0.getDate(), t0.getMonth() + 1, t0.getFullYear());
    for (var ly = lt[2]; ly <= lt[2] + 1; ly++) {
      var s = lunar2solar(ld, lm, ly, 0);
      var back = solar2lunar(s[0], s[1], s[2]);
      if (back[1] !== lm || back[0] !== ld) s = lunar2solar(29, lm, ly, 0); // tháng thiếu
      var d = new Date(s[2], s[1] - 1, s[0]);
      var soNgay = Math.round((d - t0) / 864e5);
      if (soNgay >= 0) return { date: d, lunarYear: ly, soNgay: soNgay };
    }
    return null;
  }

  G.AmLich = { solar2lunar: solar2lunar, lunar2solar: lunar2solar, canChiNam: canChiNam, gioSapToi: gioSapToi };
})(typeof window !== 'undefined' ? window : globalThis);
