const CACHE_NAME = 'mfc-v13';
const APP_SHELL = ['./','./index.html','./cadastro.html','./gestor.html','./manifest.webmanifest','./mfc-logo.png','./mfc-capa.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => { self.skipWaiting(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL).catch(()=>null))); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('.html') || url.pathname === '/mfc/' || url.pathname === '/mfc') {
    event.respondWith(fetch(req).then(res => { const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req, copy)); return res; }).catch(() => caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => { const copy=res.clone(); caches.open(CACHE_NAME).then(c=>c.put(req, copy)); return res; }).catch(()=>cached)));
});
