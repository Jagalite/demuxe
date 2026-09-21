/* SPDX-License-Identifier: MIT */
const load=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const hash=a=>sha256Fallback(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
const cmp=(a,b)=>{let bad=0,max=0;if(a.length!==b.length)return{exact:false,different:null,lengthA:a.length,lengthB:b.length};for(let i=0;i<a.length;i++){let d=Math.abs(a[i]-b[i]);if(d)bad++;max=Math.max(max,d)}return{exact:bad===0,different:bad,maxAbs:max,length:a.length}};
function ev(t,n,ms=3500){return new Promise((res,rej)=>{let id;function done(f,v){clearTimeout(id);t.removeEventListener(n,ok);t.removeEventListener('error',bad);f(v)}const ok=e=>done(res,e),bad=()=>done(rej,Error(t.error?.message||n+' failed'));id=setTimeout(()=>done(rej,Error(n+' timeout')),ms);t.addEventListener(n,ok);t.addEventListener('error',bad)})}
async function append(s,b){let p=ev(s,'updateend');try{s.appendBuffer(b)}catch(e){p.catch(()=>{});throw e}await p}
const ranges=r=>Array.from({length:r.length},(_,i)=>[r.start(i),r.end(i)]);
async function seek(v,t){let id;let f=new Promise((res,rej)=>{let tm=setTimeout(()=>{v.cancelVideoFrameCallback(id);rej(Error('frame timeout'))},3500);id=v.requestVideoFrameCallback((_,m)=>{clearTimeout(tm);res(m)})});let p=ev(v,'seeked');v.currentTime=t;let [m]=await Promise.all([f,p]);return m}
function pixels(v){let c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;let ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0);return ctx.getImageData(0,0,c.width,c.height).data}
window.runOgg=async()=>{
 let o={decodes:{},comparisons:{},lifecycle:{}},ac=new AudioContext({sampleRate:48000}),data={};
 for(const n of ['ogg0.flac','ogg1.flac','multiplexed.oga','selected0.oga','selected1.oga']){
  try{let b=await ac.decodeAudioData((await load(n)).buffer);data[n]=b;o.decodes[n]={frames:b.length,rate:b.sampleRate,channels:b.numberOfChannels,hashes:Array.from({length:b.numberOfChannels},(_,i)=>hash(b.getChannelData(i)))};}catch(e){o.decodes[n]={error:String(e)}}
 }
 for(let i=0;i<2;i++){
  for(const k of ['selected','full']){let a=data[k==='selected'?`selected${i}.oga`:'multiplexed.oga'],b=data[`ogg${i}.flac`];if(a&&b)o.comparisons[k+i]=Array.from({length:2},(_,j)=>cmp(a.getChannelData(j),b.getChannelData(j)))}
 }
 await ac.close();
 for(const n of ['multiplexed.oga','selected0.oga','selected1.oga']){
  const v=document.createElement('audio'),u=URL.createObjectURL(new Blob([await load(n)],{type:'audio/ogg'}));document.body.append(v);let r={seeks:[]};v.src=u;
  try{if(v.readyState<1)await ev(v,'loadedmetadata');r.duration=v.duration;r.trackAPI=!!v.audioTracks;for(const t of [.81,.17]){let s=ev(v,'seeked');v.currentTime=t;await s;r.seeks.push({requested:t,time:v.currentTime})}let e=ev(v,'ended',5000);await v.play();await e;r.ended=true}catch(e){r.error=String(e)}finally{v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(u);r.cleaned=true}o.lifecycle[n]=r;
 }
 return o
};
window.runVideo=async mode=>{
 const v=document.createElement('video'),m=new MediaSource(),u=URL.createObjectURL(m);let s,o={mode,checks:[],appends:[]};v.muted=true;document.body.append(v);v.src=u;
 try{
  if(m.readyState!=='open')await ev(m,'sourceopen');s=m.addSourceBuffer('video/mp4; codecs="'+videoManifest.codec+'"');let plan=mode==='ref-a'?['a']:mode==='ref-b'?['b']:['a','b','a'];
  for(let i=0;i<plan.length;i++){
   let n=plan[i];s.timestampOffset=i;
   if(i===0||mode==='fresh_init')await append(s,await load('v_'+n+'.init'));
   let f=(mode==='mapped'&&n==='b')?'v_b_mapped.m4s':(mode==='wrong_picture'&&n==='b')?'v_a_0.m4s':'v_'+n+'_0.m4s';
   await append(s,await load(f));o.appends.push({source:n,file:f,buffered:ranges(s.buffered)})
  }
  m.endOfStream();if(v.readyState<1)await ev(v,'loadedmetadata');o.duration=v.duration;
  let times=plan.length===1?[.175,.725,.325,.925]:[.175,.725,1.175,1.725,2.175,2.725,1.325,.325,2.925,1.925];
  for(let t of times){let md=await seek(v,t);o.checks.push({requested:t,mediaTime:md.mediaTime,width:v.videoWidth,height:v.videoHeight,hash:hash(pixels(v))})}
  // Entire natural-speed run; callbacks record picture identities but are not guaranteed to observe every decoded frame.
  let initial=await seek(v,.001);o.firstFrame={mediaTime:initial.mediaTime,hash:hash(pixels(v))};let seen=[];let cb;function frame(_,md){seen.push({mediaTime:md.mediaTime,hash:hash(pixels(v))});cb=v.requestVideoFrameCallback(frame)}cb=v.requestVideoFrameCallback(frame);let e=ev(v,'ended',6000);await v.play();await e;v.cancelVideoFrameCallback(cb);o.observed=seen;o.ended=true;o.retainedSourceBuffer=m.sourceBuffers.length===1&&m.sourceBuffers[0]===s;
 }catch(e){o.error=String(e)}finally{v.pause();try{if(s&&m.readyState==='open')m.removeSourceBuffer(s)}catch{}v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(u);o.cleaned=true}return o
};
