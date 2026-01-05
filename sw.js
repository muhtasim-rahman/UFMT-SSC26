const CACHE_NAME = 'fmt-tracker-v17-offline';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './crypto.js',
    './manifest.json',
    './images/favicon.ico',
    './images/UFMT-white-bg.jpg',
    './images/UFMT-narow.png',
    './images/UFMT.png'
];

// Install Event: Cache Files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching Assets...');
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch Event: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
    // API Requests বাদে বাকি সব ক্যাশ ফার্স্ট স্ট্র্যাটেজি
    if (event.request.url.includes('google.com') || event.request.method === 'POST') {
        return; // API এর কাজ app.js নিজেই হ্যান্ডেল করছে (try-catch দিয়ে)
    }

    event.respondWith(
        fetch(event.request)
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
