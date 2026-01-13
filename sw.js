const CACHE_NAME = 'fmt-tracker-pro-v36'; // Updated version for fresh cache
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/sw.js',
  './images/favicon.ico',
  './images/UFMT.png',
  './images/UFMT.jpg',
  './images/UFMT-narrow.png',
  './images/UFMT-narrow.jpg',
  './images/web-banner.jpg'
];

// Install Event - Fixed with better error handling
self.addEventListener('install', event => {
  event. waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Only cache essential files that exist
        return Promise.all(
          urlsToCache.map(url => {
            return fetch(url)
              .then(response => {
                if (response && response.status === 200) {
                  return cache.put(url, response);
                }
              })
              .catch(err => {
                console.warn(`Failed to cache ${url}:`, err);
              });
          })
        );
      })
      .catch(err => {
        console.error('Cache open failed:', err);
      })
  );
  self.skipWaiting();
});

// Fetch Event - Network first, then cache
self.addEventListener('fetch', event => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  event.respondWith(
    fetch(request)
      .then(response => {
        if (!response || response.status !== 200) {
          return caches.match(request);
        }
        
        // Clone the response
        const responseClone = response.clone();
        
        // Cache successful responses
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(request, responseClone);
          });
        
        return response;
      })
      .catch(() => {
        // Return cached version if network fails
        return caches.match(request)
          .then(response => {
            if (response) return response;
            
            // Fallback for images
            if (request.destination === 'image') {
              return caches.match('./images/UFMT.png');
            }
            
            // Return offline page if available
            return caches.match('/index.html');
          });
      })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});