const CACHE_NAME = 'ert-odisha-v3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './subjects.html',
  './chapters.html',
  './content.html',
  './logo.png',
  './bg-image.jpg'
];

// 1. Install Event - Cache initial files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// 2. Activate Event - Clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// 3. Fetch Event - NETWORK FIRST, FALLBACK TO CACHE
self.addEventListener('fetch', event => {
  event.respondWith(
    // Step A: Always try to get the newest file from GitHub (the network) first
    fetch(event.request)
      .then(networkResponse => {
        // If successful, take a copy of the fresh file and update the cache silently!
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        // Return the fresh file to the user
        return networkResponse;
      })
      .catch(() => {
        // Step B: If the network fetch fails (user is offline), use the saved cache
        return caches.match(event.request);
      })
  );
});