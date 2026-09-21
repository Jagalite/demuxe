/* Standalone component tests, not the maintained Demuxe player. */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=a=>sha256Fallback(a instanceof ArrayBuffer?new Uint8Array(a):new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
const deadline=(p,ms,label)=>new Promise((ok,bad)=>{const t=setTimeout(()=>bad(Error(label+' timeout')),ms);p.then(v=>{clearTimeout(t);ok(v)},e=>{clearTimeout(t);bad(e)})});
function waitFor(obj,ev,ms=3000){return new Promise((ok,bad)=>{
 const cleanup=()=>{clearTimeout(timer);obj.removeEventListener(ev,done);obj.removeEventListener('error',fail)};
 const done=e=>{cleanup();ok(e)},fail=()=>{cleanup();bad(Error(obj.error?.message||ev+' error'))};
 const timer=setTimeout(()=>{cleanup();bad(Error(ev+' timeout'))},ms);obj.addEventListener(ev,done);obj.addEventListener('error',fail);
})}
window.trial=async(name,direct=false)=>{
 const m=manifest[name],mime='video/mp4; codecs="'+m.codec+',mp4a.40.2"';
 const res={name,direct,mime,supported:MediaSource.isTypeSupported(mime)},events=[];
 const v=document.createElement('video');v.muted=true;v.playsInline=true;v.width=160;v.height=96;document.body.appendChild(v);
 let url,ms,sb,cb;
 for(const e of ['loadedmetadata','loadeddata','playing','waiting','seeked','ended','error'])v.addEventListener(e,()=>events.push({event:e,time:v.currentTime,error:v.error?.message}));
 try{
  const data=await loadFile(name);
  if(direct){url=URL.createObjectURL(new Blob([data],{type:'video/mp4'}));v.src=url}
  else{
   ms=new MediaSource();url=URL.createObjectURL(ms);v.src=url;if(ms.readyState!=='open')await waitFor(ms,'sourceopen');
   sb=ms.addSourceBuffer(mime);const appended=waitFor(sb,'updateend');sb.appendBuffer(data);await appended;
   res.appended=true;res.buffered=Array.from({length:sb.buffered.length},(_,i)=>[sb.buffered.start(i),sb.buffered.end(i)]);ms.endOfStream();
  }
  if(v.readyState<1)await waitFor(v,'loadedmetadata');res.duration=v.duration;res.dimensions=[v.videoWidth,v.videoHeight];
  const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d',{willReadFrequently:true});res.captures=[];
  for(const t of [0.5,1.5,2.5,3.5]){
   const expected=Math.max(...m.pts_us.filter(x=>x<=Math.round(t*1e6)+2));
   const witness=deadline(new Promise(resolve=>{const step=(now,meta)=>{
    if(Math.abs(meta.mediaTime*1e6-expected)<=20)resolve(meta);else cb=v.requestVideoFrameCallback(step);
   };cb=v.requestVideoFrameCallback(step)}),3000,'presented frame');
   // Register handlers for both promises immediately, avoiding orphan rejections.
   const sought=waitFor(v,'seeked');v.currentTime=t;const [,meta]=await Promise.all([sought,witness]);
   ctx.drawImage(v,0,0,c.width,c.height);res.captures.push({requested:t,expected_us:expected,actual:meta.mediaTime,hash:hash(ctx.getImageData(0,0,c.width,c.height).data)});
  }
  const end=waitFor(v,'ended',4000);v.playbackRate=2;await v.play();await end;res.ended=true;res.frames=v.getVideoPlaybackQuality?.().totalVideoFrames;
 }catch(e){res.error=String(e);res.media_error=v.error?{code:v.error.code,message:v.error.message}:null}
 finally{if(cb!==undefined)v.cancelVideoFrameCallback(cb);res.events=events;v.pause();v.removeAttribute('src');v.load();v.remove();if(url)URL.revokeObjectURL(url)}
 return res;
};
window.audio=async name=>{
 try{const ac=new OfflineAudioContext(2,1,48000),a=await ac.decodeAudioData((await loadFile(name)).buffer),v=new Float32Array(a.length*a.numberOfChannels);
 for(let c=0;c<a.numberOfChannels;c++){let x=a.getChannelData(c);for(let i=0;i<x.length;i++)v[i*a.numberOfChannels+c]=x[i]}
 return {frames:a.length,channels:a.numberOfChannels,sample_rate:a.sampleRate,sha256:hash(v)}
 }catch(e){return{error:String(e)}}
};
window.cancellationScreen=async()=>{
 const bytes=await loadFile('packet.zlib'),bad=await loadFile('packet_bad_crc.zlib'),plain=await loadFile('packet.raw');
 const expectedHash=hash(plain),out=[];
 for(const mode of ['normal','supersede_before_input','supersede_after_output','supersede_after_validation','cancel_after_validation','bad_checksum']){
  let replacementCommitted=0,replacementHash=null;let epoch=1,cancelled=false,produced=0,retained=0,naiveCommitted=0,guardCommitted=0,maxRetained=0,log=[];
  let release;const barrier=new Promise(r=>release=r);let reached;const checkpoint=new Promise(r=>reached=r);
  const snapshot=epoch;
  const src=mode==='bad_checksum'?bad:bytes;
  const work=(async()=>{
   let first=true,cursor=0,validated=false,err=null,chunks=[];
   const stream=new ReadableStream({async pull(c){
    if(first){first=false;if(mode==='supersede_before_input'){reached();await barrier}}
    if(cursor===src.length){c.close();return}
    const end=Math.min(cursor+37,src.length);c.enqueue(src.slice(cursor,end));cursor=end;
   }}).pipeThrough(new DecompressionStream('deflate'));
   const reader=stream.getReader();
   try{while(true){const {done,value}=await reader.read();if(done){validated=true;break}
    produced+=value.length;
    if(retained+value.length>65536)throw Error('retention cap');
    chunks.push(value);retained+=value.length;maxRetained=Math.max(maxRetained,retained);
    if(mode==='supersede_after_output'){reached();await barrier}
   }}catch(e){err=String(e)}finally{reader.releaseLock()}
   const joined=new Uint8Array(retained);let p=0;for(const v of chunks){joined.set(v,p);p+=v.length}
   if(mode==='supersede_after_validation'||mode==='cancel_after_validation'){reached();await barrier}
   if(validated){naiveCommitted+=retained;if(snapshot===epoch&&!cancelled)guardCommitted+=retained}
   const digest=validated?hash(joined):null;
   chunks=[];retained=0;
   return {validated,error:err,digest};
  })();
  if(mode.startsWith('supersede')||mode==='cancel_after_validation'){
   await deadline(checkpoint,2000,'checkpoint');if(mode==='cancel_after_validation')cancelled=true;else epoch++;
   log.push({event:'source changed or cancelled',old_epoch:snapshot,current_epoch:epoch,cancelled});
   if(mode.startsWith('supersede')){const currentToken=epoch;const nextBytes=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer();replacementHash=hash(nextBytes);if(currentToken===epoch&&!cancelled&&replacementHash===expectedHash)replacementCommitted=nextBytes.byteLength;log.push({event:'replacement committed before stale job released',bytes:replacementCommitted,epoch});}
   release();
  }
  const r=await deadline(work,2500,'decompression');out.push({mode,...r,produced,expectedHash,replacementCommitted,replacementHash,naiveCommitted,guardCommitted,maxRetained,retainedAfter:retained,epoch,log});
 }
 return out;
};
window.audibleTrial=async(name,direct)=>{
 const m=manifest[name],mime='video/mp4; codecs="'+m.codec+',mp4a.40.2"',v=document.createElement('video');v.muted=false;v.playsInline=true;document.body.appendChild(v);
 let ac,source,proc,gain,url,ms;const res={name,direct},channels=[[],[]];let blocks=0,capturing=false,observedInputChannels=[];
 try{
  ac=new AudioContext({sampleRate:48000});await ac.resume();source=ac.createMediaElementSource(v);proc=ac.createScriptProcessor(1024,2,2);gain=ac.createGain();gain.gain.value=0;
  source.connect(proc);proc.connect(gain);gain.connect(ac.destination);
  proc.onaudioprocess=e=>{if(!capturing)return;blocks++;observedInputChannels.push(e.inputBuffer.numberOfChannels);for(let c=0;c<2;c++)channels[c].push(...e.inputBuffer.getChannelData(c))};
  const data=await loadFile(name);
  if(direct){url=URL.createObjectURL(new Blob([data],{type:'video/mp4'}));v.src=url}
  else{ms=new MediaSource();url=URL.createObjectURL(ms);v.src=url;if(ms.readyState!=='open')await waitFor(ms,'sourceopen');let sb=ms.addSourceBuffer(mime);let appended=waitFor(sb,'updateend');sb.appendBuffer(data);await appended;ms.endOfStream()}
  if(v.readyState<1)await waitFor(v,'loadedmetadata');capturing=true;await v.play();await sleep(1100);v.pause();capturing=false;
  res.currentTime=v.currentTime;res.duration=v.duration;res.blocks=blocks;res.capturedFrames=channels[0].length;res.contextRate=ac.sampleRate;
  res.rms=channels.map(x=>Math.sqrt(x.reduce((sum,y)=>sum+y*y,0)/Math.max(1,x.length)));
  res.peak=channels.map(x=>x.reduce((max,y)=>Math.max(max,Math.abs(y)),0));
  // Frequency-selective witness over the captured real media output, not speaker hardware.
  res.toneAmplitude=channels.map(x=>[997,1481].map(f=>{let a=0,b=0;for(let i=0;i<x.length;i++){a+=x[i]*Math.cos(2*Math.PI*f*i/ac.sampleRate);b+=x[i]*Math.sin(2*Math.PI*f*i/ac.sampleRate)}return 2*Math.hypot(a,b)/Math.max(1,x.length)}));
  res.audioDetected=res.rms.every(x=>x>0.005);res.correctChannelTones=res.toneAmplitude[0][0]>3*res.toneAmplitude[0][1]&&res.toneAmplitude[1][1]>3*res.toneAmplitude[1][0];
 }catch(e){res.error=String(e)}
 finally{capturing=false;res.mediaError=v.error?{code:v.error.code,message:v.error.message}:null;v.pause();if(proc){proc.onaudioprocess=null;proc.disconnect()}source?.disconnect();gain?.disconnect();if(ac)await ac.close();v.removeAttribute('src');v.load();v.remove();if(url)URL.revokeObjectURL(url)}
 return res;
};
