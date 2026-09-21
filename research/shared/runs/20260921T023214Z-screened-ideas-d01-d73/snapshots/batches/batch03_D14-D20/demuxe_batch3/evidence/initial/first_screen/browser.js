/* SPDX-License-Identifier: MIT. Bounded screens; not a production player. */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=a=>sha256Fallback(a instanceof ArrayBuffer?new Uint8Array(a):new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
function event(target,name,ms=4000){return new Promise((yes,no)=>{
  const clean=()=>{clearTimeout(timer);target.removeEventListener(name,done);target.removeEventListener('error',fail)};
  const done=e=>{clean();yes(e)},fail=()=>{clean();no(Error(target.error?.message||name+' error'))};
  const timer=setTimeout(()=>{clean();no(Error(name+' timeout'))},ms);target.addEventListener(name,done);target.addEventListener('error',fail);
})}
async function append(sb,data){const done=event(sb,'updateend');sb.appendBuffer(data);await done}
function range(b){return Array.from({length:b.length},(_,i)=>[b.start(i),b.end(i)])}
function tone(x,f,sr=48000){let re=0,im=0;for(let i=0;i<x.length;i++){re+=x[i]*Math.cos(i*2*Math.PI*f/sr);im+=x[i]*Math.sin(i*2*Math.PI*f/sr)}return 2*Math.hypot(re,im)/Math.max(x.length,1)}
function summary(x){let sq=0,peak=0;for(let v of x){sq+=v*v;peak=Math.max(peak,Math.abs(v))}return {rms:Math.sqrt(sq/Math.max(1,x.length)),peak}}
window.decode=async(name,expected=null)=>{
 let res={name};
 try{
 const ac=new OfflineAudioContext(2,1,48000),b=await ac.decodeAudioData((await loadFile(name)).buffer),ch=b.numberOfChannels;
 const out=new Float32Array(b.length*ch);
 for(let c=0;c<ch;c++){const x=b.getChannelData(c);for(let i=0;i<x.length;i++)out[i*ch+c]=x[i]}
 res={...res,frames:b.length,channels:ch,sampleRate:b.sampleRate,hash:hash(out),stats:[],interiorHashes:[],tones:[],head:Array.from(out.slice(0,20)),tail:Array.from(out.slice(-20))};
 for(let c=0;c<ch;c++){
   const x=b.getChannelData(c).slice(12000,Math.min(b.length,72000));res.stats.push(summary(x));res.interorFrames=x.length;res.interiorHashes.push(hash(x));res.tones.push([997,1481].map(f=>tone(x,f)));
 }
 if(expected){
   const e=new Float32Array((await loadFile(expected+'.expected.f32')).buffer);let mismatch=0,maxAbs=0;
   for(let i=0;i<Math.min(e.length,out.length);i++){if(e[i]!==out[i])mismatch++;maxAbs=Math.max(maxAbs,Math.abs(e[i]-out[i]))}
   res.floatOracle={expectedSamples:e.length,actualSamples:out.length,mismatches:mismatch,maxAbs};
   if(expected==='s32'){
    const ints=new Int32Array((await loadFile('s32.pcm')).buffer);let changed=0,maxError=0;
    for(let i=0;i<Math.min(ints.length,out.length);i++){let err=Math.abs(ints[i]-out[i]*2147483648);if(err!==0)changed++;maxError=Math.max(maxError,err)}
    res.integerOracle={samples:ints.length,changed,maxError};
   }
 }
 }catch(e){res.error=String(e)}
 return res;
};
window.route=async(mode,offset=0)=>{
 const v=document.createElement('video');v.width=160;v.height=96;v.playsInline=true;v.muted=false;document.body.appendChild(v);
 const res={mode,offset},blocks=[],pictures=[],events=[];let ms,url,ac,src,proc,silent,callback,vsb,asb,capturing=false;
 const mimeV='video/mp4; codecs="'+manifest.video_codec+'"';
 try{
  ac=new AudioContext({sampleRate:48000});await ac.resume();src=ac.createMediaElementSource(v);proc=ac.createScriptProcessor(1024,2,2);silent=ac.createGain();silent.gain.value=0;src.connect(proc);proc.connect(silent);silent.connect(ac.destination);
  proc.onaudioprocess=e=>{if(!capturing)return;const left=e.inputBuffer.getChannelData(0),right=e.inputBuffer.getChannelData(1);blocks.push({time:v.currentTime,contextTime:e.playbackTime,left:summary(left),right:summary(right),tones:[701,901,997,1481,1709,1909].map(f=>tone(left,f)),rightTones:[701,901,997,1481,1709,1909].map(f=>tone(right,f))})};
  const draw=document.createElement('canvas');draw.width=160;draw.height=96;const ctx=draw.getContext('2d',{willReadFrequently:true});
  const cb=(now,m)=>{ctx.drawImage(v,0,0);pictures.push({time:m.mediaTime,displayTime:m.expectedDisplayTime,hash:hash(ctx.getImageData(0,0,160,96).data)});callback=v.requestVideoFrameCallback(cb)};callback=v.requestVideoFrameCallback(cb);
  for(let kind of ['playing','waiting','stalled','seeked','ended','error'])v.addEventListener(kind,()=>events.push({kind,time:v.currentTime,error:v.error?.message}));
  if(mode.startsWith('direct:')){
   const name=mode.slice(7);url=URL.createObjectURL(new Blob([await loadFile(name)]));v.src=url;
  }else{
   ms=new MediaSource();url=URL.createObjectURL(ms);v.src=url;if(ms.readyState!=='open')await event(ms,'sourceopen');
   if(mode==='combined_vorbis'||mode==='sparse'){
    const codec=mode==='sparse'?'flac':'vorbis';const mime='video/mp4; codecs="'+manifest.video_codec+','+codec+'"';res.mime=mime;res.supported=MediaSource.isTypeSupported(mime);vsb=ms.addSourceBuffer(mime);await append(vsb,await loadFile(mode==='sparse'?'av_sparse.mp4':'av_vorbis.mp4'));ms.endOfStream();
   }else{
    vsb=ms.addSourceBuffer(mimeV);await append(vsb,await loadFile('video.mp4'));
    const first=mode==='switch'?'opus':'vorbis',mimeA='audio/webm; codecs="'+first+'"';res.mime=[mimeV,mimeA];res.supported=res.mime.map(x=>MediaSource.isTypeSupported(x));asb=ms.addSourceBuffer(mimeA);asb.timestampOffset=offset;
    await append(asb,await loadFile(mode==='switch'?'first_opus.webm':'vorbis.webm'));
    res.initialBuffered={video:range(vsb.buffered),audio:range(asb.buffered)};
    if(mode!=='switch')ms.endOfStream();
   }
  }
  if(v.readyState<1)await event(v,'loadedmetadata');res.dimensions=[v.videoWidth,v.videoHeight];capturing=true;
  const end=event(v,'ended',8500);end.catch(()=>{});await v.play();
  if(mode==='switch'){
   await sleep(650);res.switchAt=v.currentTime;res.videoBufferIdentityBefore=vsb===ms.sourceBuffers[0];
   asb.changeType('audio/webm; codecs="vorbis"');asb.timestampOffset=2+offset;await append(asb,await loadFile('second_vorbis.webm'));
   res.videoBufferIdentityAfter=vsb===ms.sourceBuffers[0];res.afterSwitchBuffered={video:range(vsb.buffered),audio:range(asb.buffered)};ms.endOfStream();
  }
  await end;capturing=false;res.ended=true;res.duration=v.duration;res.finalTime=v.currentTime;
  res.videoFrames=v.getVideoPlaybackQuality?.();
  // Actual seeks on the same presentation, with frame callbacks and captured audio.
  res.seeks=[];
  for(const target of [0.35,2.35]){
    const begin=blocks.length,pi=pictures.length;const sought=event(v,'seeked');v.currentTime=target;await sought;capturing=true;await v.play();await sleep(500);v.pause();capturing=false;
    res.seeks.push({target,final:v.currentTime,blocks:blocks.slice(begin),pictures:pictures.slice(pi)});
  }
 }catch(e){res.error=String(e)}
 finally{
  capturing=false;res.mediaError=v.error?{code:v.error.code,message:v.error.message}:null;res.blocks=blocks;res.pictures=pictures;res.events=events;
  if(callback!==undefined)v.cancelVideoFrameCallback(callback);v.pause();if(proc){proc.onaudioprocess=null;proc.disconnect()}src?.disconnect();silent?.disconnect();if(ac)await ac.close();v.removeAttribute('src');v.load();v.remove();if(url)URL.revokeObjectURL(url);
  res.cleanup={mediaElements:document.querySelectorAll('audio,video').length,audioContextClosed:ac?.state==='closed'};
 }
 return res;
};
