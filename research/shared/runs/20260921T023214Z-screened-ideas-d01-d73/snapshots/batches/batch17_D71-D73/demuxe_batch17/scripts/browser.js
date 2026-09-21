// SPDX-License-Identifier: MIT
const load=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=a=>sha256Fallback(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
const ranges=r=>Array.from({length:r.length},(_,i)=>[r.start(i),r.end(i)]);
function ev(t,n,ms=2500){return new Promise((res,rej)=>{let tm;function end(ok,x){clearTimeout(tm);t.removeEventListener(n,yes);t.removeEventListener('error',no);ok?res(x):rej(x)}const yes=e=>end(true,e),no=()=>end(false,Error(t.error?.message||n+' error'));tm=setTimeout(()=>end(false,Error(n+' timeout')),ms);t.addEventListener(n,yes);t.addEventListener('error',no)})}
async function append(s,b){let p=ev(s,'updateend');try{s.appendBuffer(b)}catch(e){p.catch(()=>{});throw e}await p}
async function seek(v,t){let id,tm;const f=new Promise((res,rej)=>{tm=setTimeout(()=>{v.cancelVideoFrameCallback(id);rej(Error('frame timeout at '+t))},1800);id=v.requestVideoFrameCallback((_,m)=>{clearTimeout(tm);res(m)})});const s=ev(v,'seeked',1800);v.currentTime=t;try{let [m]=await Promise.all([f,s]);return m}catch(e){clearTimeout(tm);v.cancelVideoFrameCallback(id);throw e}}
function snap(v){const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;let ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0);return {width:c.width,height:c.height,hash:hash(ctx.getImageData(0,0,c.width,c.height).data)}}
window.probe=async cfg=>{
 const v=document.createElement('video');v.muted=true;v.style.width='320px';document.body.append(v);let ms,sb,url;
 const out={name:cfg.name,route:cfg.route,checks:[],appends:[],support:MediaSource.isTypeSupported(cfg.mime)};
 try{
   if(cfg.route==='mse'){
     ms=new MediaSource();url=URL.createObjectURL(ms);v.src=url;if(ms.readyState!=='open')await ev(ms,'sourceopen');sb=ms.addSourceBuffer(cfg.mime);
     await append(sb,await load(cfg.init));
     for(const n of cfg.fragments){await append(sb,await load(n));out.appends.push({file:n,buffered:ranges(sb.buffered)})}
     if(cfg.forceDuration!=null)ms.duration=cfg.forceDuration;
     out.bufferedBeforeEOS=ranges(sb.buffered);ms.endOfStream();if(cfg.forceAfterEOS!=null)ms.duration=cfg.forceAfterEOS;
   }else{url=URL.createObjectURL(new Blob([await load(cfg.file)],{type:cfg.mime}));v.src=url;}
   if(v.readyState<1)await ev(v,'loadedmetadata');out.duration=v.duration;out.initialDimensions=[v.videoWidth,v.videoHeight];
   for(const t of cfg.times){try{const m=await seek(v,t);out.checks.push({query:t,mediaTime:m.mediaTime,frameWidth:m.width,frameHeight:m.height,...snap(v)})}catch(e){out.checks.push({query:t,error:String(e),currentTime:v.currentTime,buffered:ranges(v.buffered)});break;}}
   if(cfg.natural!==false){
     const m=await seek(v,.001);out.first={mediaTime:m.mediaTime,frameWidth:m.width,frameHeight:m.height,...snap(v)};out.observed=[];let cb;
     function next(_,m){out.observed.push({mediaTime:m.mediaTime,frameWidth:m.width,frameHeight:m.height,...snap(v)});cb=v.requestVideoFrameCallback(next)}cb=v.requestVideoFrameCallback(next);
     try{const p=ev(v,'ended',5000);await v.play();await p;out.ended=true}catch(e){out.playbackError=String(e);out.currentTime=v.currentTime;out.ended=false}finally{v.cancelVideoFrameCallback(cb)}
   }
   out.finalDuration=v.duration;out.finalBuffered=ranges(v.buffered);
 }catch(e){out.error=String(e);out.currentTime=v.currentTime;out.finalBuffered=ranges(v.buffered)}
 finally{v.pause();try{if(ms?.readyState==='open'&&sb)ms.removeSourceBuffer(sb)}catch{}v.removeAttribute('src');v.load();v.remove();if(url)URL.revokeObjectURL(url);out.cleaned=true}
 return out;
};
