/*
 * EMBERLOOP service worker.
 *
 * Strategy:
 * - Pages (index.html, ./) are NETWORK-FIRST: a new deploy shows up on the next
 *   open; the cached copy is only used offline. (v1 was cache-first for
 *   everything, which pinned installed players to their first-ever version.)
 * - Everything else (content-hashed build assets, icons) is cache-first, which is
 *   safe because a changed file gets a new name.
 * - Old cache versions are deleted on activate.
 */
const VERSION = 'emberloop-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isPage(request, url) {
  return request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
}

function remember(request, response) {
  if (response && response.status === 200 && response.type === 'basic') {
    const copy = response.clone();
    caches.open(VERSION).then((cache) => cache.put(request, copy));
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isPage(request, url)) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => remember(request, response))
        .catch(() => caches.match(request).then((cached) => cached || caches.match('./index.html'))),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => remember(request, response))
        .catch(() => caches.match('./index.html'));
    }),
  );
});
