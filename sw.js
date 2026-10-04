/* Cho app chạy khi mất mạng. Đổi PHIEN_BAN mỗi lần sửa app. */
var PHIEN_BAN = 'giapha-1.19.3';
var TEP = ['./', 'index.html', 'style.css', 'app.js', 'db.js', 'xungho.js', 'amlich.js', 'config.js', 'data-mau.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(PHIEN_BAN).then(function (c) { return c.addAll(TEP); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== PHIEN_BAN; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.origin === location.origin) { // mạng trước, mất mạng thì lấy bản lưu
    // cache:'no-cache' — GitHub Pages cho trình duyệt giữ bản cũ 10 phút; buộc hỏi lại máy chủ (rẻ, chỉ 304 nếu không đổi)
    e.respondWith(fetch(u.href, { cache: 'no-cache', credentials: 'same-origin' }).then(function (r) {
      if (r.redirected) return fetch(e.request); // Safari không nhận trang chuyển hướng từ service worker
      var c = r.clone(); caches.open(PHIEN_BAN).then(function (k) { k.put(e.request, c); }); return r;
    }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) { // phông chữ: lưu lại dùng mãi
    e.respondWith(caches.match(e.request).then(function (m) {
      return m || fetch(e.request).then(function (r) { var c = r.clone(); caches.open(PHIEN_BAN).then(function (k) { k.put(e.request, c); }); return r; });
    }));
  }
});
