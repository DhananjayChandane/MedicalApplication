const CACHE_NAME = 'medical-store-v1.0.4';

const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/fontawesome.css',
    '/theme.js',
    '/shortcuts.js',
    '/dashboard.html',
    '/dashboard.js',
    '/login.html',
    '/login.js',
    '/signup.html',
    '/signup.js',
    '/account-settings.html',
    '/account-settings.js',
    '/reset-password.html'
    // ❌ DO NOT cache service-worker.js
];

// INSTALL
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[SW] Caching app shell');

            for (const url of URLS_TO_CACHE) {
                try {
                    await cache.add(url);
                } catch (err) {
                    console.warn('[SW] Failed to cache:', url);
                }
            }
        })
    );

    self.skipWaiting();
});

// FETCH
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // 🚫 NEVER intercept API calls
    if (request.url.includes('/api/')) {
        return;
    }

    // 🚫 Only handle GET requests
    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                // Only cache valid responses
                if (
                    !networkResponse ||
                    networkResponse.status !== 200 ||
                    networkResponse.type !== 'basic'
                ) {
                    return networkResponse;
                }

                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseClone);
                });

                return networkResponse;
            });
        })
    );
});

// ACTIVATE
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

