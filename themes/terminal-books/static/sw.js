var CACHE_NAME = 'abg-v1';

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  var request = event.request;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external origins
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Fingerprinted assets (.min.) — cache-first
  if (url.pathname.indexOf('.min.') !== -1) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(request).then(function(cached) {
          if (cached) return cached;
          return fetch(request).then(function(response) {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // Everything else — network-first
  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return fetch(request).then(function(response) {
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(function() {
        return cache.match(request);
      });
    })
  );
});
