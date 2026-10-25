// يحفظ ملفات اللعبة على الجهاز لتعمل بدون إنترنت
// غيّر رقم الإصدار عند تعديل أي ملف حتى يحدَّث الكاش
const CACHE = 'jungle-hero-v49';
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
  'js/fractions.js',
  'js/integers.js',
  'js/engine.js',
  'js/journey.js',
  'js/brain.js',
  'js/sync.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', e => {
  // reload: تُجلب الملفات من الخادم لا من كاش المتصفح، حتى لا يُحفظ إصدار جديد بملفات قديمة
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// مكتبة Firebase تُحفظ عند أول تحميل لتعمل المزامنة لاحقاً حتى لو فُتحت اللعبة بدون إنترنت
const SDK = 'https://www.gstatic.com/firebasejs/';

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith(SDK)) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    })));
    return;
  }
  // اتصالات Firebase وتسجيل الدخول تذهب للشبكة مباشرة
  if (new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then(hit => hit || fetch(e.request))
      .catch(() => caches.match('index.html'))
  );
});
