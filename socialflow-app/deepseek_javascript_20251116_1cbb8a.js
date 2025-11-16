const CACHE_NAME = 'socialflow-v1.0.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/styles/main.css',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - strategy: cache first for static, network first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((response) => {
      // Return cached version if found
      if (response) {
        return response;
      }

      // Otherwise, make a network request and cache the response
      return fetch(request).then((response) => {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {}
          return response;
        }

        // Clone the response to cache it and return it
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      }).catch(() => {
        // If both cache and network fail, we can return a fallback page or an error message
        // For example, return a custom offline page
        return caches.match('/offline.html');
      });
    })
  );
});