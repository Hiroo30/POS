// Toko DEWI Service Worker for PWA
const CACHE_NAME = 'toko-dewi-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls (always network first & fresh data)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then(res => res || caches.match('/')))
    );
    return;
  }

  // Stale-while-revalidate for static files (icons, fonts, static assets)
  if (
    url.pathname.startsWith('/icons/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
  }
});
