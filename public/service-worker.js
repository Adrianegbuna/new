/**
 * Service Worker for RenewableZmart
 * Enables offline functionality and PWA features
 */

const CACHE_NAME = 'renewablezmart-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  // Note: Don't cache banner.svg and icon files here as they may not exist
  // They will be cached on first access via the fetch handler
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching assets');
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => cache.add(url))
      ).then(() => {
        console.log('[Service Worker] Cache completed (may have skipped some files)');
      }).catch((error) => {
        console.log('[Service Worker] Some assets failed to cache:', error);
      });
    }).catch((error) => {
      console.error('[Service Worker] Cache opening failed:', error);
    })
  );
  
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip S3 presigned URLs - never intercept, let browser handle directly
  if (url.hostname.includes('.s3.') || url.hostname.includes('amazonaws.com')) {
    return;
  }

  // Skip Paystack requests - let them bypass service worker CSP
  if (url.hostname.includes('paystack.com') || url.hostname.includes('api.paystack.co') || url.hostname.includes('checkout.paystack.com')) {
    // Don't intercept Paystack requests - let browser handle them directly
    return;
  }

  // Skip external script requests that might have CSP issues (Google APIs, etc.)
  if (url.hostname.includes('apis.google.com') || url.hostname.includes('googleapis.com')) {
    // Let browser handle Google API requests directly, don't intercept with service worker
    return;
  }

  // Skip API requests - always fetch from network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => {
          // Return error response if network fails for API
          return new Response(
            JSON.stringify({ error: 'Network error. Please check your connection.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // For HTML pages, try network first, fallback to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            try {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            } catch (error) {
              console.log('[Service Worker] Cache error:', error);
            }
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for HTML
          return caches.match(request).then((cached) => {
            return cached || caches.match('/offline.html') || new Response('Offline');
          });
        })
    );
    return;
  }

  // For other assets (CSS, JS, images), use cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200 && response.type !== 'error') {
              const responseClone = response.clone();
              try {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseClone);
                });
              } catch (error) {
                console.log('[Service Worker] Cache put error:', error);
              }
            }
            return response;
          })
          .catch(() => {
            // Return placeholder if offline
            if (request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#e5e7eb" width="200" height="200"/></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            return new Response('Offline - asset unavailable');
          })
      );
    })
  );
});

// Message event - handle background sync and push notifications
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
