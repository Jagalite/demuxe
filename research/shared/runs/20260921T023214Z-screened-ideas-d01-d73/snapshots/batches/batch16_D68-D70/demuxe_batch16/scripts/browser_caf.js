/* SPDX-License-Identifier: MIT */
const load=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=a=>sha256Fallback(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
const cmp=(a,b)=>{if(a.length!==b.length)return{exact:false,lengthA:a.length,lengthB:b.length};let bad=0,mx=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)bad++;mx=Math.max(mx,d)}return{exact:bad===0,values:a.length,different:bad,maxAbs:mx}};
function ev(t,n,ms=3500){return new Promise((res,rej)=>{let id;function done(f,v){clearTimeout(id);t.removeEventListener(n,ok);t.removeEventListener('error',bad);f(v)}const ok=e=>done(res,e),bad=()=>done(rej,Error(t.error?.message||n+' failed'));id=setTimeout(()=>done(rej,Error(n+' timeout')),ms);t.addEventListener(n,ok);t.addEventListener('error',bad)})}
window.runCAF=async()=>{
 let o={environment:{ua:navigator.userAgent,secureContext:isSecureContext,webCodecs:typeof VideoDecoder},decodes:{},comparisons:{},lifecycle:{}},ac=new AudioContext({sampleRate:48000}),ds={};
 let names=[];for(let n of ['float_le','float_be','s24_le','s24_be','s16_be'])names.push(n+'.caf',n+'_view.wav',n+'_ref.wav');names.push('s24_wrong_endian.wav','opus_ref.ogg','opus_emitted.caf','opus_declared.caf','opus_streamcopy.caf','opus_emitted_view.ogg','opus_declared_view.ogg','opus_no_priming.ogg');
 for(let n of names){try{let d=await ac.decodeAudioData((await load(n)).buffer);ds[n]=d;let peak=0;for(let c=0;c<d.numberOfChannels;c++){let a=d.getChannelData(c);for(let v of a)peak=Math.max(peak,Math.abs(v))}o.decodes[n]={frames:d.length,channels:d.numberOfChannels,rate:d.sampleRate,peak,hashes:Array.from({length:d.numberOfChannels},(_,c)=>hash(d.getChannelData(c)))};}catch(e){o.decodes[n]={error:String(e)}}}
 function pair(key,a,b,start=0,end=null){if(ds[a]&&ds[b])o.comparisons[key]=Array.from({length:ds[a].numberOfChannels},(_,c)=>cmp(ds[a].getChannelData(c),ds[b].getChannelData(c).subarray(start,end??ds[b].length)))}
 for(let n of ['float_le','float_be','s24_le','s24_be','s16_be'])pair(n,n+'_view.wav',n+'_ref.wav');pair('wrongEndian','s24_wrong_endian.wav','s24_be_ref.wav');pair('opusVsRef','opus_declared_view.ogg','opus_ref.ogg');pair('opusVsDeclaredUntrimmedSlice','opus_declared_view.ogg','opus_emitted_view.ogg',120,59497);pair('wrongPriming','opus_no_priming.ogg','opus_ref.ogg');await ac.close();
 for(let n of ['float_le.caf','float_le_view.wav','float_be_view.wav','s24_le_view.wav','s24_be_view.wav','s16_be_view.wav','opus_declared.caf','opus_ref.ogg','opus_emitted_view.ogg','opus_declared_view.ogg']){
  const v=document.createElement('audio'),u=URL.createObjectURL(new Blob([await load(n)],{type:n.endsWith('.caf')?'audio/x-caf':n.endsWith('.wav')?'audio/wav':'audio/ogg'}));let r={seeks:[]};document.body.append(v);let ctx,src,an,g;v.src=u;
  try{if(v.readyState<1)await ev(v,'loadedmetadata');r.duration=v.duration;
   for(let t of [.83,.19]){let p=ev(v,'seeked');v.currentTime=t;await p;r.seeks.push({requested:t,time:v.currentTime})}
   ctx=new AudioContext({sampleRate:48000});await ctx.resume();src=ctx.createMediaElementSource(v);an=ctx.createAnalyser();an.fftSize=1024;g=ctx.createGain();g.gain.value=0;src.connect(an).connect(g).connect(ctx.destination);
   let ended=ev(v,'ended',4000);await v.play();await sleep(180);let a=new Float32Array(1024);an.getFloatTimeDomainData(a);r.rms=Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);await ended;r.ended=true;
  }catch(e){r.error=String(e)}finally{v.pause();if(ctx)await ctx.close();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(u);r.cleaned=true}o.lifecycle[n]=r;
 }
 return o;
};
