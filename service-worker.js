importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:"AIzaSyAUUid850sbmBAVS9JzeZ94SbC-qzkk0B8",authDomain:"roteiro-mfc-d3053.firebaseapp.com",projectId:"roteiro-mfc-d3053",storageBucket:"roteiro-mfc-d3053.firebasestorage.app",messagingSenderId:"1030114859934",appId:"1:1030114859934:web:ad353eafb55205d6b4148f"});
// Mensagens enviadas com payload "notification" já são exibidas pelo FCM.
// Não chamar showNotification aqui evita que o mesmo aviso apareça duas vezes.
firebase.messaging();

const CACHE_NAME = 'mfc-tecnico-v142c';
const FIREBASE_MODULES = [
  'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging.js'
];
const APP_SHELL = [
  './',
  './index.html',
  './gestor.html',
  './cadastro.html',
  './layout-guide.js',
  './layout-guide.js?v=141b',
  './report-media.js',
  './report-media.js?v=140',
  './location-view.js',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png',
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
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    const results=await Promise.allSettled([...APP_SHELL,...FIREBASE_MODULES].map(url=>cache.add(url)));
    results.forEach((result,index)=>{if(result.status==='rejected')console.warn('Falha ao preparar arquivo offline:',[...APP_SHELL,...FIREBASE_MODULES][index],result.reason)});
  }));
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
  const isFirebaseModule = url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/11.0.0/');
  if (isFirebaseModule) {
    event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
      return res;
    })));
    return;
  }
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
