const CACHE_NAME = 'mfc-tecnico-v79';
const APP_SHELL = [
  './',
  './index.html',
  './gestor.html',
  './cadastro.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './mfc-logo.png',
  './mfc-capa.png',
  './fontawesome/css/all.min.css',
  './fontawesome/webfonts/fa-solid-900.woff2',
  './fontawesome/webfonts/fa-regular-400.woff2',
  './fontawesome/webfonts/fa-brands-400.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => null)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isHtml = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/mfc/' || url.pathname === '/mfc';
  if (isHtml) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
      return res;
    }))
  );
});
