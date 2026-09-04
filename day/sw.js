// Daily Board service worker: keeps the shell openable offline. Network first
// for the page itself (so a deploy shows up on the next open), cache fallback.
const CACHE = 'daily-board-v13';
const SHELL = ['/day/', '/day/index.html', '/day/manifest.webmanifest', '/day/icon-192.png', '/day/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

// A nudge from the scheduler. iOS will not show a push with no visible
// notification, so there is always something to display.
self.addEventListener('push', (e) => {
  let d = { title: 'Daily Board', body: '' };
  try { d = { ...d, ...e.data.json() }; } catch { if (e.data) d.body = e.data.text(); }
  e.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body,
      icon: '/day/icon-192.png',
      badge: '/day/icon-192.png',
      tag: d.tag || 'day',
      renotify: true,
      data: { url: '/day/' },
    })
  );
});

// Tapping one opens the board, reusing the window if it is already open.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.includes('/day/') && 'focus' in c) return c.focus();
      return self.clients.openWindow('/day/');
    })
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith('/day/')) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('/day/index.html')))
  );
});
