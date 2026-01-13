// Service Worker for UFMT-SSC26 — robust caching and relative paths
const CACHE_NAME = 'ufmt-ssc26-v3';
const BASE = '/UFMT-SSC26/'; // align with manifest scope and where sw.js lives
const urlsToCache = [
  BASE,
  BASE + 'index.html',
  BASE + 'style.css',
  BASE + 'app.js',
  BASE + 'manifest.json',
  BASE + 'images/favicon.ico',
  BASE + 'images/UFMT.png',
  BASE + 'images/UFMT.jpg',
  BASE + 'images/UFMT-narrow.png',
  BASE + 'images/UFMT-narrow.jpg',
  BASE + 'images/web-banner.jpg'
];

// Install: cache resources but don't fail entire install when one resource fails
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // cache.addAll can fail when one resource is missing; use Promise.allSettled
        return Promise.allSettled(urlsToCache.map(u => cache.add(u)))
          .then(results => {
            results.forEach((r, i) => {
              if (r.status === 'rejected') {
                console.warn('Failed to cache:', urlsToCache[i], r.reason);
              }
            });
          });
      })
      .then(() => self.skipWaiting())
  );
});

// Allow page to tell SW to skipWaiting (useful on deploy)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  const keep = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => keep.includes(k) ? null : caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Fetch: network-first for freshness, fallback to cache, provide image/page fallbacks
self.addEventListener('fetch', event => {
  // Only handle GET requests from our scope (relative paths); leave cross-origin alone
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // only cache successful (200) responses
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone).catch(() => { /* ignore cache put errors */ });
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // network failed — try cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;

          // If request is for an image, return default image if cached
          if (event.request.destination === 'image' || event.request.url.includes('/images/')) {
            return caches.match(BASE + 'images/UFMT.png');
          }

          // If it's navigation (page), return cached index.html
          const accept = event.request.headers.get('accept') || '';
          if (accept.includes('text/html')) {
            return caches.match(BASE + 'index.html');
          }

          // generic fallback
          return new Response('Offline: resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});