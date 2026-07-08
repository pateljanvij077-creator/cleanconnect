const CACHE_NAME = 'cleanconnect-v2';
const ASSETS = [
  '/logo.png',
  '/logo-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Clean up old caches when the new Service Worker activates
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-First strategy for pages / navigation requests to prevent stale asset hashes
  if (e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match('/index.html') || caches.match(e.request))
    );
    return;
  }

  // Cache-First strategy for images and static assets
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
