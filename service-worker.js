const CACHE_NAME = 'mfc-tecnico-v9';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './mfc-logo.png',
  './mfc-capa.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Não interfere em Firebase, Google APIs, CDN ou arquivos externos.
  if (url.origin !== self.location.origin) return;

  // Gestor e cadastro não devem ficar presos em cache do PWA técnico.
  if (url.pathname.endsWith('/gestor.html') || url.pathname.endsWith('/cadastro.html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => new Response('Sem conexão. Recarregue quando a internet voltar.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }))
    );
    return;
  }

  // App técnico: rede primeiro para HTML, cache se cair.
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  // Assets locais: rede primeiro, cache se cair.
  event.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
