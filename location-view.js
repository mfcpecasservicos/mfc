(function(){
  'use strict';
  const maps={};
  const GEOCODER_URL=window.MFC_GEOCODER_URL||'https://nominatim.openstreetmap.org/search';
  const CACHE_PREFIX='mfc-geocode-v1:';
  const CACHE_TTL=30*24*60*60*1000;
  let geocodeQueue=Promise.resolve(),lastGeocodeAt=0;
  const style=document.createElement('style');
  style.textContent=`
    .mfc-location-card{grid-column:1/-1;border:1px solid #0ea5e966!important;background:linear-gradient(135deg,#082f49,#0f172a)!important;border-radius:14px;padding:14px;overflow:hidden}
    .mfc-location-head{display:flex;align-items:center;gap:9px;margin-bottom:9px;color:#7dd3fc}.mfc-location-head i{font-size:1.1rem}.mfc-location-head strong{font-size:.84rem;text-transform:uppercase;letter-spacing:.05em}
    .mfc-location-map{height:190px;border-radius:11px;overflow:hidden;border:1px solid #38bdf855;background:#dbeafe}.mfc-location-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;flex-wrap:wrap}
    .mfc-location-ok{color:#86efac;font-size:.78rem;font-weight:800}.mfc-location-ok.approx{color:#fde68a}.mfc-location-ok.error{color:#fca5a5}.mfc-location-route,.mfc-location-request{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 12px;border-radius:9px;color:#e0f2fe!important;text-decoration:none;font-size:.82rem;font-weight:900;border:1px solid #38bdf866;cursor:pointer}
    .mfc-location-route{background:#075985}.mfc-location-request{background:#0f766e;border-color:#2dd4bf88}.mfc-location-request:hover,.mfc-location-route:hover{filter:brightness(1.1)}
    .mfc-view-pin{width:36px;height:36px;border-radius:50% 50% 50% 0;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 12px #0008}.mfc-view-pin.approx{background:#f59e0b}.mfc-view-pin i{transform:rotate(45deg)}
    .mfc-procedure{margin-top:18px;background:#f8fbff;border:1px solid #dbe7f3;border-radius:20px;padding:18px 18px 16px;text-align:left;box-shadow:0 4px 18px rgba(15,23,42,.05)}
    .mfc-procedure h3{font-size:1.05rem;color:#06437a;margin-bottom:12px;font-weight:900}.mfc-procedure ol{list-style:none;display:flex;flex-direction:column;gap:10px}.mfc-procedure li{color:#203044;font-size:.9rem;line-height:1.45}.mfc-procedure li strong{color:#0f2e4f}
    @media(max-width:480px){.mfc-location-map{height:160px}.mfc-location-actions{display:grid;grid-template-columns:1fr}.mfc-location-route,.mfc-location-request{width:100%}}
  `;
  document.head.appendChild(style);

  const coordinate=value=>value===null||value===undefined||String(value).trim()===''?NaN:Number(value);
  const addressKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const uniqueParts=values=>{const parts=[];values.forEach(value=>{const clean=String(value||'').trim().replace(/^[,;\s]+|[,;\s]+$/g,'');const key=addressKey(clean),segments=parts.flatMap(part=>String(part).split(',')).map(addressKey);if(clean&&key&&!segments.includes(key))parts.push(clean)});return parts};
  const address=c=>uniqueParts([c?.address,c?.number,c?.neighborhood||c?.bairro,c?.city||c?.cidade]).join(', ');
  const read=c=>{const nested=c?.location||c?.mapLocation||c?.geolocation||{};const lat=coordinate(c?.latitude??c?.lat??nested.latitude??nested.lat),lng=coordinate(c?.longitude??c?.lng??c?.lon??nested.longitude??nested.lng??nested.lon);const valid=Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180;const confirmed=c?.locationConfirmed===true||nested.confirmed===true;const source=c?.locationSource||nested.source||'';return{lat,lng,valid,confirmed,source}};
  const has=c=>read(c).valid;
  const point=c=>{const value=read(c);return[value.lat,value.lng]};
  const target=(c,fallback='')=>has(c)?point(c).join(','):fallback;
  const routeUrl=(c,fallback=address(c))=>{const destination=target(c,fallback);return destination?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination)+'&travelmode=driving':''};
  const cacheRead=key=>{try{const item=JSON.parse(localStorage.getItem(CACHE_PREFIX+key)||'null');if(item&&Date.now()-item.savedAt<CACHE_TTL)return item.result||null}catch{}return undefined};
  const cacheWrite=(key,result)=>{try{localStorage.setItem(CACHE_PREFIX+key,JSON.stringify({savedAt:Date.now(),result:result||null}))}catch{}};
  const queuedFetch=url=>{const run=async()=>{const wait=Math.max(0,1100-(Date.now()-lastGeocodeAt));if(wait)await new Promise(resolve=>setTimeout(resolve,wait));lastGeocodeAt=Date.now();const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);try{return await fetch(url,{mode:'cors',credentials:'omit',signal:controller.signal})}finally{clearTimeout(timeout)}};const task=geocodeQueue.then(run,run);geocodeQueue=task.catch(()=>null);return task};
  const geocodeQuery=async(query,force=false)=>{const clean=String(query||'').trim();if(!clean)return null;const key=addressKey(clean);if(!force){const cached=cacheRead(key);if(cached!==undefined)return cached}try{const url=new URL(GEOCODER_URL);url.searchParams.set('format','jsonv2');url.searchParams.set('limit','1');url.searchParams.set('countrycodes','br');url.searchParams.set('accept-language','pt-BR');url.searchParams.set('q',clean);const response=await queuedFetch(url.toString());if(!response.ok)throw new Error('Geocodificação indisponível');const rows=await response.json();const first=rows?.[0],lat=coordinate(first?.lat),lng=coordinate(first?.lon);const result=Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng,valid:true,confirmed:false,source:'address',displayName:first.display_name||clean,query:clean}:null;cacheWrite(key,result);return result}catch(e){console.warn('MFC geocode:',e);return null}};
  const geocode=async(c,force=false)=>{const city=c?.city||c?.cidade||'',neighborhood=c?.neighborhood||c?.bairro||'',street=c?.address||'',number=c?.number||'';const candidates=[uniqueParts([street,number,neighborhood,city,'Bahia','Brasil']).join(', '),uniqueParts([street,neighborhood,city,'Bahia','Brasil']).join(', '),uniqueParts([neighborhood,city,'Bahia','Brasil']).join(', '),uniqueParts([city,'Bahia','Brasil']).join(', ')].filter(Boolean);for(const query of [...new Set(candidates)]){const result=await geocodeQuery(query,force);if(result)return result}return null};
  const statusText=value=>value.confirmed?'Ponto confirmado':value.source==='address'?'Local aproximado pelo endereço':'Ponto informado no cadastro';

  async function loadFirebaseCompat(){
    if(window.firebase?.firestore&&window.firebase?.auth)return window.firebase;
    const add=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
    await add('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
    await add('https://www.gstatic.com/firebasejs/10.13.2/firebase-auth-compat.js');
    await add('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore-compat.js');
    const config={apiKey:'AIzaSyAUUid850sbMebarV9S9zeZ94SbC-qzkk0B8',authDomain:'roteiro-mfc-d3053.firebaseapp.com',projectId:'roteiro-mfc-d3053',storageBucket:'roteiro-mfc-d3053.firebasestorage.app',messagingSenderId:'1030114859934',appId:'1:1030114859934:web:ad353eafb55205d6b4148f'};
    let app=window.firebase.apps.length?window.firebase.apps[0]:window.firebase.initializeApp(config);
    return window.firebase;
  }
  const waitForUser=auth=>new Promise((resolve,reject)=>{if(auth.currentUser)return resolve(auth.currentUser);const timer=setTimeout(()=>{unsub?.();reject(new Error('Sessão do Gestor não encontrada.'))},7000);const unsub=auth.onAuthStateChanged(user=>{if(user){clearTimeout(timer);unsub();resolve(user)}})});
  const tokenId=()=>{if(window.crypto?.randomUUID)return crypto.randomUUID().replace(/-/g,'');const a=new Uint8Array(16);crypto.getRandomValues(a);return [...a].map(v=>v.toString(16).padStart(2,'0')).join('')};
  const toastLocal=msg=>{if(typeof window.toast==='function')window.toast(msg);else alert(msg)};
  async function requestLocation(clientId){
    try{
      const f=await loadFirebaseCompat(),auth=f.auth(),user=await waitForUser(auth);if(!user)throw new Error('Faça login no Gestor novamente.');
      const client=(window.all||[]).find(c=>c.id===clientId);if(!client)throw new Error('Cliente não encontrado.');
      const token=tokenId(),now=new Date(),expires=new Date(now.getTime()+24*60*60*1000),db=f.firestore();
      const req={clientId,used:false,createdAtTs:f.firestore.Timestamp.fromDate(now),expiresAtTs:f.firestore.Timestamp.fromDate(expires),initialLatitude:Number.isFinite(coordinate(client.latitude))?coordinate(client.latitude):null,initialLongitude:Number.isFinite(coordinate(client.longitude))?coordinate(client.longitude):null,displayAddress:address(client)||'',clientName:String(client.name||client.companyName||'').slice(0,80)};
      await db.collection('locationRequests').doc(token).set(req);
      await db.collection('clients').doc(clientId).update({locationRequestToken:token,updatedAt:now.toISOString()});
      const link=new URL('./localizacao.html',location.origin);link.searchParams.set('token',token);
      const msg=`Olá! Precisamos confirmar a localização exata do atendimento. Abra este link e permita o acesso à sua localização pelo celular:\n\n${link.toString()}`;
      try{await navigator.clipboard.writeText(msg)}catch{const ta=document.createElement('textarea');ta.value=msg;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}
      window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener');
      toastLocal('📍 Link de localização preparado e copiado.');
    }catch(error){console.error('MFC solicitar localização:',error);toastLocal(error.message||'Não foi possível gerar o link de localização.');}
  }

  const html=(c,id)=>{const value=read(c),fallback=address(c);if(!value.valid&&!fallback)return'';const status=value.valid?statusText(value):'Buscando endereço aproximado…',approx=value.source==='address'||!value.valid;const request=location.pathname.endsWith('/gestor.html')?`<button type="button" class="mfc-location-request" onclick="MFCLocation.requestLocation('${String(c?.id||'').replace(/'/g,"\\'")}')"><i class="fa-solid fa-location-crosshairs"></i> Solicitar localização</button>`:'';return`<div class="iblk mfc-location-card" data-location-view><div class="mfc-location-head"><i class="fa-solid fa-location-dot"></i><strong>Localização do atendimento</strong></div><div class="mfc-location-map" id="${id}"></div><div class="mfc-location-actions"><span class="mfc-location-ok ${approx?'approx':''}" id="${id}-status"><i class="fa-solid ${approx?'fa-triangle-exclamation':'fa-circle-check'}"></i> ${status}</span><div style="display:flex;gap:8px;flex-wrap:wrap;margin-left:auto"><a class="mfc-location-route" id="${id}-route" href="${routeUrl(c,fallback)}" target="_blank" rel="noopener"><i class="fa-solid fa-diamond-turn-right"></i> Abrir rota no Maps</a>${request}</div></div></div>`};
  const init=async(id,c)=>{const el=document.getElementById(id);if(!el)return null;let value=read(c),geocoded=false;if(!value.valid){value=await geocode(c);geocoded=!!value}const status=document.getElementById(id+'-status'),route=document.getElementById(id+'-route');if(!value?.valid){if(status){status.className='mfc-location-ok error';status.innerHTML='<i class="fa-solid fa-circle-exclamation"></i> Endereço não localizado automaticamente'}return null}if(route)route.href='https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent([value.lat,value.lng].join(','))+'&travelmode=driving';if(status){status.className='mfc-location-ok '+(value.confirmed?'':'approx');status.innerHTML=`<i class="fa-solid ${value.confirmed?'fa-circle-check':'fa-triangle-exclamation'}"></i> ${statusText(value)}`}if(!window.L)return{...value,geocoded};if(maps[id]){try{maps[id].remove()}catch{}delete maps[id]}const coords=[value.lat,value.lng],map=L.map(el,{zoomControl:true,attributionControl:true,scrollWheelZoom:false}).setView(coords,value.source==='address'?16:18);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);const icon=L.divIcon({className:'',html:`<div class="mfc-view-pin ${value.source==='address'?'approx':''}"><i class="fa-solid fa-house"></i></div>`,iconSize:[36,36],iconAnchor:[18,36]});L.marker(coords,{icon,keyboard:true,title:value.source==='address'?'Local aproximado pelo endereço':'Local do atendimento'}).addTo(map);maps[id]=map;setTimeout(()=>map.invalidateSize(),80);return{...value,geocoded}};

  function injectProcedure(){
    if(!location.pathname.endsWith('/cadastro.html')&&!location.pathname.endsWith('/mfc/cadastro.html'))return;
    const benefits=document.querySelector('.benefits');if(!benefits||document.querySelector('.mfc-procedure'))return;
    const box=document.createElement('section');box.className='mfc-procedure';box.innerHTML=`<h3>Como funciona o atendimento?</h3><ol><li>📝 <strong>1. Enviamos o link de cadastro.</strong></li><li>🗓️ <strong>2. Agendamos a visita técnica.</strong> Gratuita em Dias D'Ávila. Outras regiões, consultar.</li><li>📋 <strong>3. O técnico faz a avaliação no local e gera o relatório.</strong></li><li>💵 <strong>4. Enviamos seu orçamento para aprovação.</strong></li><li>🛠️ <strong>5. Aprovou? Marcamos a data do serviço!</strong></li></ol>`;benefits.parentNode.insertBefore(box,benefits.nextSibling);
  }
  window.MFCLocation={read,has,point,target,address,routeUrl,html,init,geocode,geocodeQuery,requestLocation};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',injectProcedure);else injectProcedure();
})();
