/* SPDX-License-Identifier: MIT */
const pLoad=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0));
const pHash=a=>sha256Fallback(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
const pWait=ms=>new Promise(r=>setTimeout(r,ms));
function pEvent(t,n,ms=3000){return new Promise((res,rej)=>{let id;function done(f,v){clearTimeout(id);t.removeEventListener(n,ok);t.removeEventListener('error',bad);f(v)}const ok=e=>done(res,e),bad=()=>done(rej,Error(t.error?.message||n+' failed'));id=setTimeout(()=>done(rej,Error(n+' timeout')),ms);t.addEventListener(n,ok);t.addEventListener('error',bad)})}
async function pSeek(v,t){let id;let f=new Promise((res,rej)=>{let timer=setTimeout(()=>{v.cancelVideoFrameCallback(id);rej(Error('frame timeout'))},3000);id=v.requestVideoFrameCallback((_,m)=>{clearTimeout(timer);res(m)})});let s=pEvent(v,'seeked');v.currentTime=t;let [m]=await Promise.all([f,s]);return m}
function canvas(){let c=document.createElement('canvas');c.width=128;c.height=64;return c}
function compare(a,b){let bad=0,max=0;for(let i=0;i<a.length;i++){let d=Math.abs(a[i]-b[i]);if(d)bad++;max=Math.max(max,d)}return{different:bad,maxAbs:max,exact:bad===0}}
window.runPGS=async mode=>{
 let v=document.createElement('video');v.muted=true;v.width=128;v.height=64;document.body.append(v);let u=URL.createObjectURL(new Blob([await pLoad('background.mp4')],{type:'video/mp4'}));v.src=u;
 let c=canvas(),ctx=c.getContext('2d',{willReadFrequently:true}),reference=canvas(),rx=reference.getContext('2d',{willReadFrequently:true}),base=canvas(),bx=base.getContext('2d');let cache=new Map(),refcache=new Map(),o={mode,checks:[],created:0,closed:0};
 try{
  if(v.readyState<1)await pEvent(v,'loadedmetadata');
  const times=[.1,.26,.74,.76,1.24,1.26,1.74,1.76,2.24,2.26,2.74,2.76,.76,2.26,.26];
  let previous=null;
  for(let t of times){let md=await pSeek(v,t),ev=pgsManifest.events.filter(e=>e.pts<=Math.round(t*90000)).at(-1);bx.clearRect(0,0,128,64);bx.drawImage(v,0,0);rx.clearRect(0,0,128,64);rx.drawImage(base,0,0);ctx.clearRect(0,0,128,64);ctx.drawImage(base,0,0);
   if(mode==='wrong-clear'&&ev?.draws.length===0)ev=previous;
   if(ev){
    for(let d of ev.draws){
     let key=mode==='wrong-palette'?[ev.epoch,d.id,d.version].join(':'):mode==='wrong-epoch'?[d.id,d.version,d.palette_version].join(':'):d.file;
     if(!cache.has(key)){cache.set(key,await createImageBitmap(new Blob([await pLoad(d.file)],{type:'image/png'})));o.created++}
     ctx.drawImage(cache.get(key),d.x,d.y);
    }
    if(ev.draws.length)previous=ev;
   }
   let actual=pgsManifest.events.filter(e=>e.pts<=Math.round(t*90000)).at(-1);
   if(actual){if(!refcache.has(actual.reference))refcache.set(actual.reference,await createImageBitmap(new Blob([await pLoad(actual.reference)],{type:'image/png'})));rx.drawImage(refcache.get(actual.reference),0,0)}
   let ca=ctx.getImageData(0,0,128,64).data,ra=rx.getImageData(0,0,128,64).data;o.checks.push({time:t,videoMediaTime:md.mediaTime,pts:actual?.pts??null,draws:actual?.draws.length??0,...compare(ca,ra),hash:pHash(ca),referenceHash:pHash(ra)});
  }
  // Finish actual source playback after paused seek/index checks. Cue scheduling itself is not qualified here.
  v.currentTime=2.8;await pEvent(v,'seeked');let end=pEvent(v,'ended',2500);await v.play();await end;o.ended=true;o.videoSourceUnchanged=v.src===u;o.mediaSourceLoads=1;
 }catch(e){o.error=String(e)}finally{for(let x of cache.values()){x.close();o.closed++}for(let x of refcache.values())x.close();v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(u);o.cleaned=true}return o
}
