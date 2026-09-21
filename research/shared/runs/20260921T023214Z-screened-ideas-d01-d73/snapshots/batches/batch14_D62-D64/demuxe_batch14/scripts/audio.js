/* SPDX-License-Identifier: MIT; standalone empirical harness */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const load=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0));
function event(t,n,ms=4500){return new Promise((res,rej)=>{const done=(f,x)=>{clearTimeout(id);t.removeEventListener(n,ok);t.removeEventListener('error',bad);f(x)};const ok=e=>done(res,e),bad=()=>done(rej,Error(t.error?.message||'media error'));const id=setTimeout(()=>done(rej,Error(n+' timeout')),ms);t.addEventListener(n,ok);t.addEventListener('error',bad)})}
async function append(s,b){let p=event(s,'updateend');try{s.appendBuffer(b)}catch(e){p.catch(()=>{});throw e}return p}
const ranges=r=>Array.from({length:r.length},(_,i)=>[r.start(i),r.end(i)]);
function b64(a){let u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength),s='';for(let i=0;i<u.length;i+=16384)s+=String.fromCharCode(...u.subarray(i,i+16384));return btoa(s)}
window.audioRun=async arg=>{
 let m=audioManifest,o={arg,events:[]},v=document.createElement('audio'),ms=new MediaSource(),u=URL.createObjectURL(ms),sb,ac,src,proc,g;document.body.append(v);v.src=u;
 for(let e of ['playing','waiting','ended','error'])v.addEventListener(e,()=>o.events.push({type:e,time:v.currentTime,error:v.error?.message}));
 let chunks=[],capture=false;
 try{
  ac=new AudioContext({sampleRate:m.sample_rate});await ac.resume();o.contextRate=ac.sampleRate;src=ac.createMediaElementSource(v);proc=ac.createScriptProcessor(1024,2,2);g=ac.createGain();g.gain.value=0;src.connect(proc);proc.connect(g);g.connect(ac.destination);
  proc.onaudioprocess=e=>{if(capture){let n=e.inputBuffer.length,c=new Float32Array(n*2);for(let i=0;i<n;i++){c[i*2]=e.inputBuffer.getChannelData(0)[i];c[i*2+1]=e.inputBuffer.getChannelData(1)[i]}chunks.push(c)}};
  if(ms.readyState!=='open')await event(ms,'sourceopen');sb=ms.addSourceBuffer('audio/mp4; codecs="flac"');o.supported=MediaSource.isTypeSupported('audio/mp4; codecs="flac"');
  let plan=arg.mode.startsWith('join')?m.plan:arg.mode==='clip'?[{source:'a',a:m.cuts[arg.i][0],b:m.cuts[arg.i][1]}]:[{source:arg.source,a:0,b:m.sources[arg.source].frames}];
  for(const p of plan){if(!m.sources[p.source]||!Number.isInteger(p.a)||!Number.isInteger(p.b)||p.a<0||p.a>=p.b||p.b>m.sources[p.source].frames)throw Error('unqualified source/sample interval')}
  let cursor=0;o.stages=[];let earlyEnd=null,started=false;
  for(let j=0;j<plan.length;j++){
   const p=plan[j],s=m.sources[p.source];sb.appendWindowEnd=Infinity;sb.appendWindowStart=cursor/m.sample_rate;
   let off=cursor-p.a;if(arg.wrongOffset||(arg.wrongJoin&&j===1))off+=1;sb.timestampOffset=off/m.sample_rate;sb.appendWindowEnd=(cursor+p.b-p.a+(arg.extraTail||0))/m.sample_rate;
   if(j===0||arg.mode!=='join-no-init')await append(sb,await load(s.init));
   for(const f of s.fragments)await append(sb,await load(f.file));
   cursor+=p.b-p.a;
   if(arg.mode==='join-live'&&j===0){capture=true;await sleep(150);earlyEnd=event(v,'ended',7000);earlyEnd.catch(()=>{});await v.play();started=true;while(v.currentTime<.15)await sleep(10);o.startedBeforeRemainingAppend={time:v.currentTime,buffered:ranges(sb.buffered)}}
   o.stages.push({buffered:ranges(sb.buffered),offset:sb.timestampOffset,start:sb.appendWindowStart,end:sb.appendWindowEnd});
  }
  ms.endOfStream();o.duration=v.duration;o.expectedFrames=cursor;o.ranges=ranges(sb.buffered);
  if(!started){capture=true;await sleep(150);earlyEnd=event(v,'ended',6000);earlyEnd.catch(()=>{});await v.play()}await earlyEnd;o.ended=true;await sleep(250);capture=false;
  let n=chunks.reduce((n,x)=>n+x.length,0),raw=new Float32Array(n),at=0;for(let x of chunks){raw.set(x,at);at+=x.length}o.captureFrames=n/2;o.capture=b64(raw);o.retainedSourceBuffer=ms.sourceBuffers.length===1&&ms.sourceBuffers[0]===sb;
 }catch(e){o.error=String(e)}finally{capture=false;v.pause();if(proc)proc.onaudioprocess=null;for(let n of [src,proc,g])try{n?.disconnect()}catch{}if(ac)await ac.close();try{if(sb&&ms.readyState==='open')ms.removeSourceBuffer(sb)}catch{}v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(u);o.cleaned=true}return o
};
