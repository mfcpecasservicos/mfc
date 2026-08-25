import {collection,doc,getDoc,getDocs,setDoc,deleteDoc} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const mediaCache=new Map();
const mediaLoading=new Map();

function ids(value){return Array.isArray(value)?value.map(v=>typeof v==='string'?v:v?.id).filter(Boolean):[]}
function photoIds(layer){return ids(layer?.techReport?.photoRefs||layer?.photoRefs)}
function budgetId(layer){const ref=layer?.budgetImage?.ref||layer?.budgetImageRef;return typeof ref==='string'?ref:ref?.id||''}
const DAY=86400000;
function timeMs(value){if(!value)return 0;if(typeof value?.toMillis==='function')return value.toMillis();const ms=new Date(value).getTime();return Number.isFinite(ms)?ms:0}
export function mediaRetentionExpired(layer,{force=false,deletedAt=null,now=Date.now()}={}){if(force)return true;const deletedMs=timeMs(deletedAt);if(deletedMs&&now-deletedMs>=15*DAY)return true;const terminal=!!(layer?.done||layer?.status==='service_finished'||layer?.status==='done'),finishedMs=timeMs(layer?.concludedAt||layer?.serviceFinishedAt||layer?.doneAt||layer?.completedAt);return !!(terminal&&finishedMs&&now-finishedMs>=30*DAY)}
function closed(layer,force=false,deletedAt=null){return mediaRetentionExpired(layer,{force,deletedAt})}
function inlinePhotos(layer){return Array.isArray(layer?.techReport?.photos)?layer.techReport.photos.filter(Boolean):[]}

function compactImage(src,maxW=720,quality=.52){return new Promise(resolve=>{try{if(!String(src||'').startsWith('data:image/'))return resolve(src);const img=new Image();img.onload=()=>{try{const scale=Math.min(1,maxW/img.width),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);resolve(canvas.toDataURL('image/jpeg',quality))}catch{resolve(src)}};img.onerror=()=>resolve(src);img.src=src}catch{resolve(src)}})}

async function compactForDocument(src){let out=await compactImage(src,720,.52);for(const [w,q] of [[560,.42],[420,.32],[320,.24]]){if(String(out||'').length<650000)break;out=await compactImage(out,w,q)}return out}
function newId(kind,index){return kind+'_'+index+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9)}
async function storeOne(db,clientId,kind,index,data){const compact=await compactForDocument(data),id=newId(kind,index);if(!compact||String(compact).length>850000)throw Object.assign(new Error('Uma das imagens continua grande demais.'),{code:'media-too-large'});await setDoc(doc(db,'clients',clientId,'reportMedia',id),{data:compact,kind,layerIndex:index,createdAt:new Date().toISOString()});mediaCache.set(clientId+'/'+id,compact);return id}

async function deleteOneWithRetry(ref,attempts=3){let lastError=null;for(let attempt=0;attempt<attempts;attempt++){try{await deleteDoc(ref);return true}catch(error){lastError=error;if(attempt<attempts-1)await new Promise(resolve=>setTimeout(resolve,180*(attempt+1)))}}throw lastError}
export async function deleteMediaIds(db,clientId,values){const failures=[];for(const id of [...new Set((values||[]).filter(Boolean))]){mediaCache.delete(clientId+'/'+id);try{await deleteOneWithRetry(doc(db,'clients',clientId,'reportMedia',id))}catch(error){failures.push({id,error});console.warn('Não foi possível excluir uma mídia; a limpeza tentará novamente depois.',clientId,id,error)}}return failures}
export async function deleteAllClientMedia(db,clientId){const snap=await getDocs(collection(db,'clients',clientId,'reportMedia'));const failures=[];for(const mediaDoc of snap.docs){mediaCache.delete(clientId+'/'+mediaDoc.id);try{await deleteOneWithRetry(mediaDoc.ref)}catch(error){failures.push({id:mediaDoc.id,error})}}if(failures.length){const error=new Error('Não foi possível excluir todas as mídias deste cliente.');error.code='media-delete-failed';error.failures=failures;throw error}return snap.size}

export async function externalizeLayers(db,clientId,layers,{replaceIndex=null,replacePhotos=null,force=false,deletedAt=null,migrateActive=true}={}){const output=[],createdIds=[],deleteIds=[];let changed=false;for(let index=0;index<layers.length;index++){const layer=layers[index]||{},oldPhotoIds=photoIds(layer),oldBudgetId=budgetId(layer),mustClear=closed(layer,force,deletedAt);let next={...layer};if(mustClear){if(oldPhotoIds.length||oldBudgetId||inlinePhotos(layer).length||layer.budgetImage){changed=true;deleteIds.push(...oldPhotoIds,oldBudgetId);if(layer.techReport)next.techReport={...layer.techReport,photos:[],photoRefs:[]};next.budgetImage=null;next.budgetImageRef=null}output.push(next);continue}
let refs=[...oldPhotoIds];const replacing=replaceIndex===index&&Array.isArray(replacePhotos);const sources=replacing?replacePhotos:inlinePhotos(layer);if(replacing){deleteIds.push(...oldPhotoIds);refs=[]}if((replacing||migrateActive)&&sources.length){for(const source of sources){const id=await storeOne(db,clientId,'photo',index,source);createdIds.push(id);refs.push(id)}changed=true}if(layer.techReport&&(sources.length||refs.length||Array.isArray(layer.techReport.photos))){next.techReport={...layer.techReport,photos:[],photoRefs:refs}}
if(layer.budgetImage?.data&&migrateActive){const id=await storeOne(db,clientId,'budget',index,layer.budgetImage.data);createdIds.push(id);if(oldBudgetId)deleteIds.push(oldBudgetId);next.budgetImage={...layer.budgetImage,data:null,ref:id};next.budgetImageRef=id;changed=true}
output.push(next)}return{layers:output,createdIds,deleteIds,changed}}

async function loadOne(db,clientId,id,onLoaded){const key=clientId+'/'+id;if(mediaCache.has(key))return mediaCache.get(key);if(!mediaLoading.has(key)){mediaLoading.set(key,getDoc(doc(db,'clients',clientId,'reportMedia',id)).then(s=>{const data=s.exists()?s.data()?.data||'':'';if(data)mediaCache.set(key,data);return data}).catch(()=> '').finally(()=>mediaLoading.delete(key)))}const data=await mediaLoading.get(key);if(data&&onLoaded)onLoaded();return data}

export function layerPhotoSources(db,clientId,layer,onLoaded){const inline=inlinePhotos(layer),refs=photoIds(layer),resolved=[];for(const id of refs){const data=mediaCache.get(clientId+'/'+id);if(data)resolved.push(data);else loadOne(db,clientId,id,onLoaded)}return[...inline,...resolved]}
export function layerBudgetSource(db,clientId,layer,onLoaded){if(layer?.budgetImage?.data)return layer.budgetImage.data;const id=budgetId(layer);if(!id)return'';const data=mediaCache.get(clientId+'/'+id);if(data)return data;loadOne(db,clientId,id,onLoaded);return''}
export function layerMediaIds(layer){return[...photoIds(layer),budgetId(layer)].filter(Boolean)}
