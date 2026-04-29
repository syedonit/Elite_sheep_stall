const CACHE_NAME = 'sheep-stall-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Nunito:wght@300;400;500;600;700;800&display=swap'
];

// Install – cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http')));
    }).then(() => self.skipWaiting())
  );
});

// Activate – remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch – cache-first for pages, network-first for external
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Cache-first for same-origin (our pages & assets)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        }).catch(() => caches.match('/index.html'));
      })
    );
    return;
  }

  // Network-first for external (fonts, maps, etc.)
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Background sync for WhatsApp inquiries (offline queuing)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-inquiry') {
    event.waitUntil(syncInquiries());
  }
});

async function syncInquiries() {
  // When back online, notify user
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'ONLINE', message: 'Back online! You can now send your WhatsApp inquiry.' });
  });
}

// Push notification support (future use)
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🐑 Seasonal Premium Sheep Stall';
  const options = {
    body: data.body || 'New animals available! Visit us today.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: 'sheep-stall-notification',
    renotify: true,
    actions: [
      { action: 'whatsapp', title: '💬 WhatsApp' },
      { action: 'view', title: '🐑 View Animals' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'whatsapp') {
    event.waitUntil(clients.openWindow('https://wa.me/918105122693'));
  } else {
    event.waitUntil(clients.openWindow('/'));
  }
});
