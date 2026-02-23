const CACHE_NAME = 'ert-odisha-v5'; // Bumped version

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './subjects.html',
  './chapters.html',
  './content.html',
  './viewer.html',
  './firebase-engine.js',
  './contributors.html',
  './logo.png',
  './bg-image.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => {
      if (key !== CACHE_NAME) return caches.delete(key);
    })))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // 1. Ignore POST/PUT/DELETE requests entirely (Firebase Auth needs this to work without crashing the SW)
  if (event.request.method !== 'GET') {
    return;
  }
  
  // 2. Ignore Firebase and Google API calls to prevent offline storage duplication
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('identitytoolkit') || 
      event.request.url.includes('firebase')) {
    return; 
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});