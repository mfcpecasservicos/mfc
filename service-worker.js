const CACHE_NAME = 'mfc-tecnico-v7';
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
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL).catch(() => null))
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

  // Páginas HTML: sempre tenta buscar a versão nova primeiro.
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then(cached => {
        // Só o app técnico cai para index.html. Gestor/cadastro não recebem index por engano.
        if (cached) return cached;
        if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
          return caches.match('./index.html');
        }
        return new Response('Sem conexão. Atualize quando a internet voltar.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }))
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
