const CACHE_NAME = 'mega-bat-rush-v3';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/app-icon-192.png',
  './icons/app-icon-512.png',
  './icons/bat.jpg',
  './icons/muscle.jpg',
  './icons/coins.jpg',
  './icons/chest-closed.jpg',
  './icons/chest-open.jpg',
  './textures/grass.jpg',
  './textures/walkway.jpg',
  './textures/building.jpg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Network-first for HTML & JS/CSS so live updates land immediately, with offline cache fallback!
  if (req.mode === 'navigate' || req.destination === 'script' || req.destination === 'style') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static textures & icons
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
    )
  );
});
