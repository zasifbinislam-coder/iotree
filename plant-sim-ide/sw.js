// Plant Sim IDE - service worker
// Cache-first for our own files, network-first with cache fallback for CDN.

const VERSION = 'v3';
const CACHE = 'plant-sim-' + VERSION;

const ESSENTIAL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './default-files.js',
  './manifest.webmanifest',
  './icon.svg',
  './sketch.ino',
  './diagram.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ESSENTIAL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    // Cache-first for own files
    e.respondWith(
      caches.match(req).then(cached =>
        cached || fetch(req).then(resp => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(req, clone));
          }
          return resp;
        })
      )
    );
  } else {
    // Network-first for Monaco CDN, fall back to cache when offline
    e.respondWith(
      fetch(req).then(resp => {
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match(req))
    );
  }
});
