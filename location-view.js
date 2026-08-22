(function(){
  'use strict';
  const maps={};
  const style=document.createElement('style');
  style.textContent=`
    .mfc-location-card{grid-column:1/-1;border:1px solid #0ea5e966!important;background:linear-gradient(135deg,#082f49,#0f172a)!important;border-radius:14px;padding:14px;overflow:hidden}
    .mfc-location-head{display:flex;align-items:center;gap:9px;margin-bottom:9px;color:#7dd3fc}.mfc-location-head i{font-size:1.1rem}.mfc-location-head strong{font-size:.84rem;text-transform:uppercase;letter-spacing:.05em}
    .mfc-location-map{height:190px;border-radius:11px;overflow:hidden;border:1px solid #38bdf855;background:#dbeafe}.mfc-location-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;flex-wrap:wrap}
    .mfc-location-ok{color:#86efac;font-size:.78rem;font-weight:800}.mfc-location-route{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 12px;border-radius:9px;background:#075985;color:#e0f2fe!important;text-decoration:none;font-size:.82rem;font-weight:900;border:1px solid #38bdf866}
    .mfc-view-pin{width:36px;height:36px;border-radius:50% 50% 50% 0;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 4px 12px #0008}.mfc-view-pin i{transform:rotate(45deg)}
    @media(max-width:480px){.mfc-location-map{height:160px}.mfc-location-route{width:100%}}
  `;
  document.head.appendChild(style);
  const coordinate=value=>value===null||value===undefined||String(value).trim()===''?NaN:Number(value);
  const read=c=>{const nested=c?.location||c?.mapLocation||c?.geolocation||{};const lat=coordinate(c?.latitude??c?.lat??nested.latitude??nested.lat),lng=coordinate(c?.longitude??c?.lng??c?.lon??nested.longitude??nested.lng??nested.lon);const valid=Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180;const confirmed=c?.locationConfirmed===true||nested.confirmed===true;return{lat,lng,valid,confirmed}};
  const has=c=>read(c).valid;
  const point=c=>{const value=read(c);return[value.lat,value.lng]};
  const target=(c,fallback='')=>has(c)?point(c).join(','):fallback;
  const routeUrl=c=>has(c)?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(point(c).join(','))+'&travelmode=driving':'';
  const html=(c,id)=>{const value=read(c);return value.valid?`<div class="iblk mfc-location-card" data-location-view><div class="mfc-location-head"><i class="fa-solid fa-location-dot"></i><strong>Localização do atendimento</strong></div><div class="mfc-location-map" id="${id}"></div><div class="mfc-location-actions"><span class="mfc-location-ok"><i class="fa-solid fa-circle-check"></i> ${value.confirmed?'Ponto confirmado no cadastro':'Ponto enviado pelo cadastro'}</span><a class="mfc-location-route" href="${routeUrl(c)}" target="_blank" rel="noopener"><i class="fa-solid fa-diamond-turn-right"></i> Abrir rota no Maps</a></div></div>`:''};
  const init=(id,c)=>{if(!has(c)||!window.L)return;const el=document.getElementById(id);if(!el)return;if(maps[id]){try{maps[id].remove()}catch{}delete maps[id]}const coords=point(c);const map=L.map(el,{zoomControl:true,attributionControl:true,scrollWheelZoom:false}).setView(coords,18);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);const icon=L.divIcon({className:'',html:'<div class="mfc-view-pin"><i class="fa-solid fa-house"></i></div>',iconSize:[36,36],iconAnchor:[18,36]});L.marker(coords,{icon,keyboard:true,title:'Local confirmado do atendimento'}).addTo(map);maps[id]=map;setTimeout(()=>map.invalidateSize(),80)};
  window.MFCLocation={read,has,point,target,routeUrl,html,init};
})();
