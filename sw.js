const CACHE_NAME = 'ert-odisha-v8'; // Ultimate Freshness Update

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './subjects.html',
  './chapters.html',
  './content.html',
  './viewer.html',
  './teacher-panel.html',
  './admin-panel.html',
  './contributors.html',
  './firebase-engine.js',
  './logo.png',
  './bg-image.jpg'
];

self.addEventListener('install', event => {
  // Forces the new service worker to install immediately
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => {
      // Destroys all old cached versions
      if (key !== CACHE_NAME) return caches.delete(key);
    })))
  );
  // Takes control of the website immediately without waiting for a page reload
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Ignore POST requests (logins)
  if (event.request.method !== 'GET') return;
  
  // Ignore Firebase database requests so they never get trapped in the offline cache
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('identitytoolkit') || 
      event.request.url.includes('firebase')) {
    return; 
  }

  // Check if the file being requested is one of our own website files
  const isMyWebsiteFile = event.request.url.startsWith(self.location.origin);

  event.respondWith(
    // MAGIC FIX: If it's our file, we add { cache: 'no-cache' } to act as a permanent background "Hard Refresh".
    // It bypasses the 10-minute GitHub Pages delay and forces a check for new code.
    fetch(event.request, isMyWebsiteFile ? { cache: 'no-cache' } : {})
      .then(networkResponse => {
        // If successful, silently update the offline cache with the brand new file
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        return networkResponse;
      })
      .catch(() => {
        // Step B: ONLY if the user has ZERO internet connection, fallback to the saved cache
        return caches.match(event.request);
      })
  );
});