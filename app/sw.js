/* Service Worker — 离线缓存应用外壳 */
const CACHE = 'ledger-v4';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/icons.js',
  './js/store.js',
  './js/ui.js',
  './js/ai.js',
  './js/charts.js',
  './js/sheets.js',
  './js/pages-home.js',
  './js/pages-shot.js',
  './js/pages-ai.js',
  './js/pages-mine.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // AI 接口请求永不缓存
  if (e.request.method !== 'GET' || url.pathname.includes('/chat/completions')) return;
  // 跨域资源交给浏览器
  if (url.origin !== location.origin) return;

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
