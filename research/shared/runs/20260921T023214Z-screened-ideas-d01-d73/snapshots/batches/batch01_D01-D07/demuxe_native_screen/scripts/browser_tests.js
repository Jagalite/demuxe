/* Bounded component experiments. This is not the Demuxe player. */
const sleep = ms => new Promise(r => setTimeout(r,ms));
const deadline = (p,ms,label) => Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error(label+' timeout')),ms))]);
const hex = a => Array.from(new Uint8Array(a),x=>x.toString(16).padStart(2,'0')).join('');
const hash = async a => crypto.subtle ? hex(await crypto.subtle.digest('SHA-256',a)) : sha256Fallback(a instanceof ArrayBuffer ? new Uint8Array(a) : new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
window.manifest = null;
window.init = async()=>window.manifest=await (await fetch('/fixtures/manifest.json')).json();
window.capabilities=async()=>({ua:navigator.userAgent,secure:isSecureContext,VideoDecoder:typeof VideoDecoder,
  DecompressionStream:typeof DecompressionStream,MediaSource:typeof MediaSource,
  mse:Object.fromEntries(['video/mp4; codecs="avc1.4d400a"','audio/mp4; codecs="alac"','audio/mp4; codecs="flac"',
  'video/mp4; codecs="avc1.4d400a,flac"'].map(x=>[x,MediaSource.isTypeSupported(x)]))});
window.decodeFrames=async(name,startIndex=0,markFirstKey=false)=>{
 if(typeof VideoDecoder==='undefined')return{blocked:true,reason:'Secure-context WebCodecs unavailable in allowed in-memory page'};
 const m=manifest.files[name];const bytes=await(await fetch('/fixtures/'+name)).arrayBuffer();
 const cfg={codec:m.codec,codedWidth:m.width,codedHeight:m.height,description:new Uint8Array(m.description),hardwareAcceleration:'no-preference'};
 let support;try{support=(await VideoDecoder.isConfigSupported(cfg)).supported;}catch(e){return {support:false,error:String(e)}}
 const frames=[];const jobs=[];const errors=[];let rejected=null;
 const dec=new VideoDecoder({output:f=>{jobs.push((async()=>{
   try{const w=f.codedWidth,h=f.codedHeight;const dest=new Uint8Array(w*h*3/2);
       await f.copyTo(dest,{format:'I420',layout:[{offset:0,stride:w},{offset:w*h,stride:w/2},{offset:w*h+w*h/4,stride:w/2}]});
       frames.push({timestamp:f.timestamp,width:w,height:h,hash:await hash(dest),format:f.format});
   }catch(e){errors.push(String(e));}finally{f.close();}
 })())},error:e=>errors.push(String(e))});
 try{dec.configure(cfg);const packets=m.packets.slice(startIndex);
 for(let i=0;i<packets.length;i++){const p=packets[i];dec.decode(new EncodedVideoChunk({
   type:(p.key||(markFirstKey&&i===0))?'key':'delta',timestamp:p.pts_us,duration:p.duration_us,
   data:new Uint8Array(bytes,p.offset,p.size)}));}
 await deadline(dec.flush(),3500,'decode');
 }catch(e){rejected=String(e)}finally{if(dec.state!=='closed')dec.close();}
 await Promise.all(jobs);frames.sort((a,b)=>a.timestamp-b.timestamp);
 const sorted=m.packets.map((p,i)=>({p,i})).sort((a,b)=>a.p.pts_us-b.p.pts_us);
 const expected=sorted.filter(x=>x.i>=startIndex).map(x=>({timestamp:x.p.pts_us,hash:m.host_frame_hashes[sorted.indexOf(x)]}));
 return {support,rejected,errors,frameCount:frames.length,expectedCount:expected.length,
   exactHostPixels:frames.length===expected.length&&frames.every((f,i)=>f.hash===expected[i].hash),
   exactTimestamps:frames.length===expected.length&&frames.every((f,i)=>f.timestamp===expected[i].timestamp),frames};
};
window.msePlayback=async(name,mime,times=[0.5,2.5])=>{
 const v=document.createElement('video');v.muted=true;v.playsInline=true;v.width=160;v.height=96;document.body.appendChild(v);
 const ms=new MediaSource(),url=URL.createObjectURL(ms);v.src=url;
 const events=[],res={file:name,mime,supported:MediaSource.isTypeSupported(mime)};let sb;
 for(const ev of ['error','loadedmetadata','loadeddata','canplay','playing','waiting','seeking','seeked','ended'])v.addEventListener(ev,()=>events.push({event:ev,t:v.currentTime,error:v.error?.message}));
 const once=(target,event,ms=2500)=>deadline(new Promise((ok,bad)=>{
  const good=e=>{target.removeEventListener('error',fail);ok(e)};const fail=e=>{target.removeEventListener(event,good);bad(new Error(target.error?.message||event+' error'))};
  target.addEventListener(event,good,{once:true});target.addEventListener('error',fail,{once:true});}),ms,event);
 try{
  if(!res.supported)throw new Error('mime unsupported');
  if(ms.readyState!=='open')await once(ms,'sourceopen');
  sb=ms.addSourceBuffer(mime);const data=await(await fetch('/fixtures/'+name)).arrayBuffer();
  const appended=once(sb,'updateend');sb.appendBuffer(data);await appended;
  res.appended=true;res.buffered=Array.from({length:sb.buffered.length},(_,i)=>[sb.buffered.start(i),sb.buffered.end(i)]);
  ms.endOfStream();if(v.readyState<1)await once(v,'loadedmetadata');
  if(sb.buffered.length && v.currentTime<sb.buffered.start(0))v.currentTime=sb.buffered.start(0);
  if(v.readyState<2)await once(v,'loadeddata');res.duration=v.duration;res.dimensions=[v.videoWidth,v.videoHeight];
  const captures=[];const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d',{willReadFrequently:true});
  // Seek smoke plus full-frame canvas hashes, not a decoded-all-frames assertion.
  for(const t of times){
    const expected=Math.max(...manifest.files['video.mp4'].packets.map(p=>p.pts_us).filter(p=>p<=Math.round(t*1e6)+2));
    let callbackId;
    const rendered=deadline(new Promise(resolve=>{
      const wait=(now,meta)=>{if(Math.abs(meta.mediaTime*1e6-expected)<=20)resolve(meta);
        else callbackId=v.requestVideoFrameCallback(wait);};
      callbackId=v.requestVideoFrameCallback(wait);
    }),3500,'matching presented-frame witness');
    try{const sought=once(v,'seeked');v.currentTime=t;await sought;const witness=await rendered;
      ctx.drawImage(v,0,0,c.width,c.height);captures.push({t:v.currentTime,mediaTime:witness.mediaTime,
        expectedMediaTimeUs:expected,hash:await hash(ctx.getImageData(0,0,c.width,c.height).data)});
    }finally{if(callbackId!==undefined)v.cancelVideoFrameCallback(callbackId)}
  }
  res.captures=captures;
  const end=once(v,'ended',4500);v.playbackRate=2;await v.play();await end;
  res.ended=true;res.quality=v.getVideoPlaybackQuality?.().toJSON?.()||{totalVideoFrames:v.getVideoPlaybackQuality?.().totalVideoFrames};
 }catch(e){res.error=String(e);res.mediaError=v.error?{code:v.error.code,message:v.error.message}:null}
 finally{res.events=events;v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url)}
 return res;
};
window.audioExact=async(rate=48000)=>{
 const bytes=await(await fetch('/fixtures/sixch.flac')).arrayBuffer();
 const ac=new OfflineAudioContext(6,manifest.audio.frames,rate);
 try{const a=await ac.decodeAudioData(bytes);const out=new Int32Array(a.length*a.numberOfChannels);
   for(let c=0;c<a.numberOfChannels;c++){const data=a.getChannelData(c);for(let i=0;i<a.length;i++)out[i*a.numberOfChannels+c]=Math.round(data[i]*8388608)}
   const digest=await hash(out.buffer);
   return {sampleRate:a.sampleRate,frames:a.length,channels:a.numberOfChannels,sha256:digest,
    exact:rate===48000&&a.length===manifest.audio.frames&&a.numberOfChannels===6&&digest===manifest.audio.interleaved_i32_sha256,
    firstFrame:Array.from(out.slice(0,6))};
 }catch(e){return{error:String(e)}}
};
window.inflateCase=async(name,chunkSize,cap=65536)=>{
 const src=new Uint8Array(await(await fetch('/fixtures/'+name)).arrayBuffer());
 let cursor=0;const input=new ReadableStream({async pull(controller){
   if(cursor===src.length){controller.close();return}
   // Delay the final checksum so any premature publication becomes observable.
   if(cursor>=src.length-4)await sleep(15);
   const stop=Math.min(src.length,cursor+chunkSize, cursor<src.length-4?src.length-4:src.length);
   controller.enqueue(src.slice(cursor,stop));cursor=stop;
 }});
 let reader=input.pipeThrough(new DecompressionStream('deflate')).getReader();
 let produced=0,retained=0,maxChunk=0,naivePublished=0;const chunks=[];let error=null,ok=false;
 try{while(true){const {value,done}=await reader.read();if(done){ok=true;break}
     produced+=value.length;maxChunk=Math.max(maxChunk,value.length);naivePublished+=value.length;
     if(retained+value.length>cap){await reader.cancel('output bound exceeded');throw new Error('output bound exceeded')}
     retained+=value.length;chunks.push(value);
   }}catch(e){error=String(e)}finally{reader.releaseLock()}
 const joined=new Uint8Array(retained);let p=0;for(const b of chunks){joined.set(b,p);p+=b.length}
 const digest=ok?await hash(joined):null;
 return {name,chunkSize,inputBytes:src.length,ok,error,producedBytes:produced,retainedBytes:retained,maxChunkBytes:maxChunk,
   naivePublishedBytes:naivePublished,transactionallyPublishedBytes:ok?retained:0,sha256:digest,
   exact:ok&&digest===manifest.inflate.packet_sha256};
};
window.audioFileStats=async(name)=>{
 try{const ac=new OfflineAudioContext(2,1,48000),bytes=await(await fetch('/fixtures/'+name)).arrayBuffer();
 const a=await ac.decodeAudioData(bytes),out=new Float32Array(a.length*a.numberOfChannels),rms=[];
 for(let c=0;c<a.numberOfChannels;c++){const x=a.getChannelData(c);let e=0;for(let i=0;i<x.length;i++){out[i*a.numberOfChannels+c]=x[i];e+=x[i]*x[i]}rms.push(Math.sqrt(e/x.length))}
 return {channels:a.numberOfChannels,sampleRate:a.sampleRate,frames:a.length,float32_sha256:await hash(out.buffer),rms};
 }catch(e){return{error:String(e)}}
};
