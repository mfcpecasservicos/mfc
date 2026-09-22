importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:"AIzaSyAUUid850sbmBAVS9JzeZ94SbC-qzkk0B8",authDomain:"roteiro-mfc-d3053.firebaseapp.com",projectId:"roteiro-mfc-d3053",storageBucket:"roteiro-mfc-d3053.firebasestorage.app",messagingSenderId:"1030114859934",appId:"1:1030114859934:web:ad353eafb55205d6b4148f"});
// Mensagens enviadas com payload "notification" já são exibidas pelo FCM.
// Não chamar showNotification aqui evita que o mesmo aviso apareça duas vezes.
firebase.messaging();

const CACHE_NAME = 'mfc-tecnico-v143f-recover';
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

function patchHtmlSource(source, url) {
  let html = source;
  const isIndex = url.pathname.endsWith('/index.html') || url.pathname === '/mfc/' || url.pathname === '/mfc' || url.pathname === '/';
  const isGestor = url.pathname.endsWith('/gestor.html');

  if (isIndex) {
    html = html.replace(
      "let clients=allClients.filter(c=>!c.deleted&&c.status!=='discarded').filter(c=>getLayers(c).some(l=>!l.done));",
      "let clients=allClients.filter(c=>!c.deleted&&c.status!=='discarded').filter(c=>getLayers(c).some(l=>!l.done&&l.status!=='service_finished'));"
    );
  }

  if (isGestor) {
    html = html.replace(
      '<div><span class="fl">Descrição do problema desta avaliação</span><textarea class="fi" id="gestor-inline-problem-${c.id}" placeholder="Descreva o defeito"></textarea></div>',
      '<div><span class="fl">Data e hora da nova visita</span><input class="fi" id="gestor-inline-datetime-${c.id}" placeholder="dd/mm/aaaa hh:mm"></div><div><span class="fl">Descrição do problema desta avaliação</span><textarea class="fi" id="gestor-inline-problem-${c.id}" placeholder="Descreva o defeito"></textarea></div>'
    );
    html = html.replace(
      "problem=document.getElementById('gestor-inline-problem-'+id).value.trim();if(!name||!problem)return alert('Informe o equipamento e a descrição do problema.');",
      "problem=document.getElementById('gestor-inline-problem-'+id).value.trim(),datetimeBr=document.getElementById('gestor-inline-datetime-'+id)?.value.trim()||'',datetime=brToIso(datetimeBr);if(!name||!problem)return alert('Informe o equipamento e a descrição do problema.');if(!datetime)return alert('Informe a data e hora da nova visita.');"
    );
    html = html.replace(
      "makeLayer('waiting','',false,false,row)",
      "makeLayer('waiting',datetime,false,false,row)"
    );
    html = html.replace(
      "for(const s of PRIO){const found=act.find(l=>(l.status||'waiting')===s);if(found)return found}return act[0]",
      "for(const s of PRIO){const matches=act.filter(l=>(l.status||'waiting')===s);if(matches.length)return matches.sort((a,b)=>{const da=new Date(layerMainDate(c,a)||0).getTime()||0,db=new Date(layerMainDate(c,b)||0).getTime()||0;return db-da})[0]}return act[0]"
    );
  }

  return html;
}

async function patchHtmlResponse(response, url) {
  if (!response) return response;
  const source = await response.text();
  const patched = patchHtmlSource(source, url);
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(patched, {status: response.status, statusText: response.statusText, headers});
}

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
    event.respondWith((async()=>{
      try {
        const res = await fetch(req);
        const patched = await patchHtmlResponse(res, url);
        const copy = patched.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return patched;
      } catch (error) {
        const cached = await caches.match(req) || await caches.match('./index.html');
        return patchHtmlResponse(cached, url);
      }
    })());
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
