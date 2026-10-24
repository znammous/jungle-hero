// يحفظ ملفات اللعبة على الجهاز لتعمل بدون إنترنت
// غيّر رقم الإصدار عند تعديل أي ملف حتى يحدَّث الكاش
const CACHE = 'jungle-hero-v3';
const FILES = [
  './',
  'index.html',
  'css/style.css',
  'fonts/baloo-bhaijaan-2-arabic.woff2',
  'fonts/baloo-bhaijaan-2-latin.woff2',
  'js/background.js',
  'js/data.js',
  'js/store.js',
  'js/sound.js',
  'js/engine.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then(hit => hit || fetch(e.request))
      .catch(() => caches.match('index.html'))
  );
});
