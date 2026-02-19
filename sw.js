const CACHE_NAME = 'ert-odisha-v1';

// Add all the files you want to work offline here
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './subjects.html',
  './chapters.html',
  './content.html',
  './logo.png',
  './bg-image.jpg' // Add any other images you use here
];

// Install Event: Save files to cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching offline assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup old caches
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

// Fetch Event: Serve from cache if offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});