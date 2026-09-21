/* SPDX-License-Identifier: MIT. Standalone research harness, not production player code. */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const loadFile=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0));
const hash=a=>sha256Fallback(a instanceof ArrayBuffer?new Uint8Array(a):new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
const ranges=r=>Array.from({length:r.length},(_,i)=>[r.start(i),r.end(i)]);
function event(t,n,ms=4000){return new Promise((yes,no)=>{let ti;const clean=()=>{clearTimeout(ti);t.removeEventListener(n,ok);t.removeEventListener('error',bad)};const ok=e=>{clean();yes(e)};const bad=()=>{clean();no(Error(t.error?.message||n+' error'))};ti=setTimeout(()=>{clean();no(Error(n+' timeout'))},ms);t.addEventListener(n,ok);t.addEventListener('error',bad)})}
async function change(sb,fn){let p=event(sb,'updateend');try{fn()}catch(e){p.catch(()=>{});throw e}await p}
const append=(sb,b)=>change(sb,()=>sb.appendBuffer(b));
const remove=(sb,a,b)=>change(sb,()=>sb.remove(a,b));
function snap(v){let c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;let x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0);return {width:c.width,height:c.height,hash:hash(x.getImageData(0,0,c.width,c.height).data)}}
async function picture(v,t){let id,ti;const fr=new Promise((yes,no)=>{ti=setTimeout(()=>{v.cancelVideoFrameCallback(id);no(Error('frame timeout '+t))},2500);id=v.requestVideoFrameCallback((_,m)=>{clearTimeout(ti);yes(m)})});let s=event(v,'seeked',2500);v.currentTime=t;let [m]=await Promise.all([fr,s]);return{requested:t,currentTime:v.currentTime,mediaTime:m.mediaTime,...snap(v)}}
function stat(x){let sum=0,pk=0;for(let z of x){sum+=z*z;pk=Math.max(pk,Math.abs(z))}return{rms:Math.sqrt(sum/x.length),peak:pk}}
function amp(x,hz,sr=48000){let a=0,b=0;for(let i=0;i<x.length;i++){a+=x[i]*Math.cos(i*2*Math.PI*hz/sr);b+=x[i]*Math.sin(i*2*Math.PI*hz/sr)}return 2*Math.hypot(a,b)/x.length}
async function cleanup(v,u,ms,sbs=[]){v.pause();for(const s of sbs){try{if(ms.readyState==='open')ms.removeSourceBuffer(s)}catch{}}v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(u)}
window.silenceDecode=async()=>{
 let out={};for(const name of ['symbolic.flac','dense.flac']){try{const ctx=new OfflineAudioContext(2,1,48000);const b=await ctx.decodeAudioData((await loadFile(name)).buffer);out[name]={frames:b.length,channels:b.numberOfChannels,hashes:Array.from({length:b.numberOfChannels},(_,i)=>hash(b.getChannelData(i))),silent:[]};for(let c=0;c<b.numberOfChannels;c++){let x=b.getChannelData(c);out[name].silent.push(stat(x.slice(48000,144000)))}}catch(e){out[name]={error:String(e)}}}return out;
};
window.silencePlay=async mode=>{
 let m=manifest.silence,v=document.createElement('video');v.width=320;v.height=192;v.muted=false;document.body.append(v);
 let ms=new MediaSource(),u=URL.createObjectURL(ms),sbv,sba,ac,src,proc,g,capture=false;v.src=u;let o={mode,events:[],pictures:[],audio:[]};const isGap=mode.startsWith('gap');
 for(let n of ['playing','waiting','seeked','ended','error'])v.addEventListener(n,()=>o.events.push({event:n,time:v.currentTime,error:v.error?.message}));
 try{
  ac=new AudioContext({sampleRate:48000});await ac.resume();src=ac.createMediaElementSource(v);proc=ac.createScriptProcessor(1024,2,2);g=ac.createGain();g.gain.value=0;src.connect(proc);proc.connect(g);g.connect(ac.destination);
  proc.onaudioprocess=e=>{if(!capture)return;let x=e.inputBuffer.getChannelData(0),y=e.inputBuffer.getChannelData(1);o.audio.push({mediaTime:v.currentTime,contextTime:e.playbackTime,L:stat(x),R:stat(y),amps:[amp(x,701),amp(y,1103),amp(x,1709),amp(y,2203)]})};
  if(ms.readyState!=='open')await event(ms,'sourceopen');let mv='video/mp4; codecs="'+m.video.codec+'"',ma='audio/mp4; codecs="flac"';o.supported=[mv,ma].map(x=>MediaSource.isTypeSupported(x));
  sbv=ms.addSourceBuffer(mv);sba=ms.addSourceBuffer(ma);await append(sbv,await loadFile(m.video.init));await append(sba,await loadFile(m.audio.init));
  for(let f of m.video.fragments)await append(sbv,await loadFile(f.file));
  for(let f of m.audio.fragments)if(!isGap||f.tfdt===0||f.tfdt===144000)await append(sba,await loadFile(f.file));
  o.beforeEos={video:ranges(sbv.buffered),audio:ranges(sba.buffered),media:ranges(v.buffered)};if(mode!=='gap-no-eos')ms.endOfStream();o.afterEos={video:ranges(sbv.buffered),audio:ranges(sba.buffered),media:ranges(v.buffered)};o.duration=v.duration;
  // A/V run is at natural speed. The original user hears no test signal.
  capture=true;let end=event(v,'ended',isGap?4200:6500);end.catch(()=>{});await v.play();try{await end;o.ended=true}catch(e){o.playbackError=String(e);o.stallTime=v.currentTime}capture=false;v.pause();
  if(isGap){
    // Controlled repair: authoritative silent spans, not guessing that missing data is silence.
    for(let f of m.audio.fragments)if(f.tfdt===48000||f.tfdt===96000)await append(sba,await loadFile(f.file));
    ms.endOfStream();o.repairedRanges=ranges(v.buffered);if(mode==='gap-seek')o.repairSeek=await picture(v,1.04);capture=true;let end2=event(v,'ended',6000);end2.catch(()=>{});await v.play();await end2;capture=false;o.repairedEnded=true;
  }
  for(let t of [.24,1.24,2.24,3.24])o.pictures.push(await picture(v,t));o.videoSourceBufferRetained=ms.sourceBuffers.length===2&&ms.sourceBuffers[0]===sbv;o.finalDuration=v.duration;
 }catch(e){o.error=String(e)}finally{capture=false;if(proc)proc.onaudioprocess=null;for(let n of [src,proc,g])try{n?.disconnect()}catch{}if(ac)await ac.close();await cleanup(v,u,ms,[sbv,sba].filter(Boolean));o.cleaned=true}return o;
};
window.evict=async mode=>{
 let v=document.createElement('video');v.muted=true;document.body.append(v);let ms=new MediaSource(),u=URL.createObjectURL(ms),sb;v.src=u;let o={mode,pictures:[]},m=manifest.video;
 try{if(ms.readyState!=='open')await event(ms,'sourceopen');sb=ms.addSourceBuffer('video/mp4; codecs="'+m.codec+'"');await append(sb,await loadFile(m.init));for(let f of m.fragments)await append(sb,await loadFile(f.file));ms.endOfStream();o.pre=ranges(sb.buffered);o.playhead=await picture(v,5.24);
  if(mode!=='baseline'){o.requestedEnd=mode==='safe'?2:2.0001;await remove(sb,0,o.requestedEnd);o.post=ranges(sb.buffered)}
  try{o.pictures.push(await picture(v,2.52));o.requestedRewindSucceeded=Math.abs(o.pictures[0].mediaTime-2.52)<.04}catch(e){o.rewindError=String(e)}
  if(mode==='unsafe'){await append(sb,await loadFile(m.fragments[1].file));o.restored=ranges(sb.buffered);o.pictures.push(await picture(v,2.56));o.repaired=true}
  for(let t of [2.56,4.52,3.24,5.52])o.pictures.push(await picture(v,t));if(ms.readyState==='open')ms.endOfStream();v.playbackRate=4;let end=event(v,'ended');end.catch(()=>{});await v.play();await end;o.ended=true;o.retainedSourceBuffer=ms.sourceBuffers[0]===sb;
 }catch(e){o.error=String(e)}finally{await cleanup(v,u,ms,[sb].filter(Boolean));o.cleaned=true}return o;
};
function escaped(text){return text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
window.captionSetup=async mode=>{
 let v=document.createElement('video');v.id='captionVideo';v.muted=true;v.width=320;v.height=192;v.style.cssText='display:block;width:320px;height:192px;background:black';document.body.style.cssText='margin:0;background:white';document.body.append(v);
 let st=document.createElement('style');st.textContent='video::cue {font: 16px monospace; color:white; background:rgba(0,0,0,.9)}';document.head.append(st);
 let u=URL.createObjectURL(new Blob([await loadFile('edited.mp4')],{type:'video/mp4'}));v.src=u;await event(v,'loadedmetadata');let track=v.addTextTrack('subtitles','test','en');track.mode='showing';let cs=[];
 if(mode==='wrong-unclipped'){
  for(let [j,s] of captions.plan.entries())for(let c of captions.source_cues)if(c.start<s.source_end&&c.end>s.source_start)cs.push({...c,id:c.id+'-'+j,start:Math.max(0,c.start-s.source_start+s.dest_start),end:c.end-s.source_start+s.dest_start});
 }else cs=captions.projected;
 for(let c of cs){const q=new VTTCue(c.start/1000,c.end/1000,mode==='wrong-unescaped'?c.text:escaped(c.text));q.id=c.id;track.addCue(q)}
 window.captionOwner={v,u,track};return{mode,cues:cs.length,duration:v.duration,url:u,interpreted:Array.from(track.cues,q=>({text:q.text,htmlText:q.getCueAsHTML().textContent}))};
};
window.captionAt=async t=>{let {v,track}=captionOwner;let p=await picture(v,t);await sleep(80);return {...p,currentTime:v.currentTime,active:Array.from(track.activeCues||[],q=>({id:q.id,text:q.getCueAsHTML().textContent,start:q.startTime,end:q.endTime}))}};
window.captionClose=async()=>{let {v,u,track}=captionOwner;let url=v.currentSrc;await picture(v,5.8);v.playbackRate=4;let end=event(v,'ended');end.catch(()=>{});await v.play();await end;let o={ended:v.ended,urlUnchanged:v.currentSrc===url,remainingCues:track.cues.length};while(track.cues.length)track.removeCue(track.cues[0]);v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(u);o.cleaned=true;delete window.captionOwner;return o};
function floats(bytes){return new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4)}
function compare(a,b){let max=0,different=0;for(let i=0;i<Math.min(a.length,b.length);i++){let d=Math.abs(a[i]-b[i]);max=Math.max(max,d);if(d)different++}return{length:a.length,expected:b.length,different,maxAbs:max}}
function packed(b){let a=new Float32Array(b.length*b.numberOfChannels);for(let c=0;c<b.numberOfChannels;c++){let x=b.getChannelData(c);for(let i=0;i<x.length;i++)a[i*b.numberOfChannels+c]=x[i]}return a}
window.firTest=async(explicit=false)=>{
 let x=floats(await loadFile('fir_input.f32')),h=floats(await loadFile('fir_kernel.f32')),oracle=floats(await loadFile('fir_reference.f32')),m=fir;
 async function render(lo,hi,normal=false,halo=true){let s=halo?Math.max(0,lo-(h.length-1)):lo,n=Math.max(0,Math.min(hi,m.input_frames)-s);if(!n)throw Error('empty input');let ctx=new OfflineAudioContext(2,hi-s,48000),a=ctx.createBuffer(2,n,48000),ir=ctx.createBuffer(1,h.length,48000);for(let c=0;c<2;c++){let d=a.getChannelData(c);for(let i=0;i<n;i++)d[i]=x[(s+i)*2+c]}ir.copyToChannel(h,0);let src=ctx.createBufferSource(),cv=ctx.createConvolver();cv.normalize=normal;if(explicit){cv.channelCount=2;cv.channelCountMode="explicit";cv.channelInterpretation="discrete"}cv.buffer=ir;src.buffer=a;src.connect(cv);cv.connect(ctx.destination);src.start();let rendered=packed(await ctx.startRendering());src.disconnect();cv.disconnect();return{samples:rendered.slice((lo-s)*2,(hi-s)*2),inputStart:s,inputFrames:n,renderFrames:hi-s}}
 let full=await render(0,m.output_frames,false,true),out={full:compare(full.samples,oracle),jobs:[]};out.full.hash=hash(full.samples);out.tail=stat(full.samples.slice(m.input_frames*2));
 for(let [lo,hi] of m.intervals){let candidate=await render(lo,hi,false,true),wrong=await render(lo,hi,false,false),norm=await render(lo,hi,true,true);out.jobs.push({lo,hi,inputStart:candidate.inputStart,inputFrames:candidate.inputFrames,renderFrames:candidate.renderFrames,oracle:compare(candidate.samples,oracle.slice(lo*2,hi*2)),continuous:compare(candidate.samples,full.samples.slice(lo*2,hi*2)),noHalo:compare(wrong.samples,oracle.slice(lo*2,hi*2)),defaultNormalization:compare(norm.samples,oracle.slice(lo*2,hi*2)),sha256:hash(candidate.samples)})}
 return out;
};
