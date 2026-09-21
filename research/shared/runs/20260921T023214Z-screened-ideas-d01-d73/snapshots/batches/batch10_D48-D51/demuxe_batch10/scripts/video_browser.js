/* SPDX-License-Identifier: MIT. Prototype output/lifecycle witnesses, no player integration. */
window.videoCase=async function(spec){
 const v=document.createElement('video');v.muted=true;v.style.width='320px';v.style.height='240px';document.body.appendChild(v);let url,ms,sb;
 const o={name:spec.name,mode:spec.mode,pictures:[],appends:[],mediaErrors:[]};v.addEventListener('error',()=>o.mediaErrors.push({code:v.error?.code,message:v.error?.message}));
 try{
  if(spec.mode==='direct'){
   url=URL.createObjectURL(new Blob([await loadFile(spec.file)],{type:'video/mp4'}));const wait=event(v,'loadedmetadata');v.src=url;await wait;
  }else{
   o.supported=MediaSource.isTypeSupported('video/mp4; codecs="'+spec.codec+'"');if(!o.supported)throw Error('MIME unsupported');
   ms=new MediaSource();url=URL.createObjectURL(ms);const wait=event(ms,'sourceopen');v.src=url;await wait;sb=ms.addSourceBuffer('video/mp4; codecs="'+spec.codec+'"');if(spec.offset!==undefined)sb.timestampOffset=spec.offset;
   for(const n of spec.files){await append(sb,await loadFile(n));o.appends.push(n)}
   o.buffered=Array.from({length:sb.buffered.length},(_,i)=>[sb.buffered.start(i),sb.buffered.end(i)]);ms.endOfStream();if(!o.buffered.length)throw Error('no buffered media after append');
   if(v.readyState<1)await event(v,'loadedmetadata');o.sameSourceBuffer=true;
  }
  o.duration=v.duration;
  for(const t of spec.times){
   try{o.pictures.push(await seekPicture(v,t))}catch(e){o.pictures.push({requested:t,error:String(e)});break}
  }
  if(spec.finish!==false){let wait=event(v,'ended',4000);v.playbackRate=4;await Promise.all([v.play(),wait]);o.ended=true;o.finalTime=v.currentTime}
 }catch(e){o.error=String(e)}finally{
  v.pause();v.removeAttribute('src');v.load();v.remove();if(url)URL.revokeObjectURL(url);o.cleaned=true;
 }
 return o
}
