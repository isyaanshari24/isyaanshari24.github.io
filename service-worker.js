const CACHE_NAME = 'ptshm-v2';

const PRECACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ── INSTALL ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        PRECACHE_FILES.map(f => cache.add(f).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH ──
self.addEventListener('fetch', event => {
  // Skip non-GET
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Absensi iframe → network only, jangan cache
  if (url.hostname === 'isyaanshari24.github.io' && url.pathname.startsWith('/PT.SHM')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response('<h2 style="font-family:sans-serif;padding:20px">⚠️ Absensi memerlukan koneksi internet</h2>', {
          headers: { 'Content-Type': 'text/html' }
        })
      )
    );
    return;
  }

  // Google Fonts → network first, fallback cache
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // File lokal → cache first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// ── PUSH NOTIFICATION (siap pakai nanti) ──
self.addEventListener('push', event => {
  const data = event.data?.json() ?? { title: 'PT. SHM', body: 'Ada notifikasi baru' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png'
    })
  );
});
