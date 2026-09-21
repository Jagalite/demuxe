/* SPDX-License-Identifier: MIT. Preliminary research components, not production code. */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bytes=async n=>Uint8Array.from(atob(await readBytes(n)),x=>x.charCodeAt(0));
const hash=a=>sha256Fallback(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
function evt(t,n,ms=4000){return new Promise((yes,no)=>{let ti;function clean(){clearTimeout(ti);t.removeEventListener(n,ok);t.removeEventListener('error',bad)}function ok(e){clean();yes(e)}function bad(){clean();no(Error(t.error?.message||n+' error'))}t.addEventListener(n,ok);t.addEventListener('error',bad);ti=setTimeout(()=>{clean();no(Error(n+' timeout'))},ms)})}
async function append(s,b){let p=evt(s,'updateend');p.catch(()=>{});s.appendBuffer(b);await p}
const ranges=r=>Array.from({length:r.length},(_,i)=>[r.start(i),r.end(i)]);
function snap(v){let c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;let x=c.getContext('2d',{willReadFrequently:true});x.drawImage(v,0,0);let data=x.getImageData(0,0,c.width,c.height).data;return{w:c.width,h:c.height,hash:hash(data)}}
async function picture(v,t){let id,ti;const fp=new Promise((ok,no)=>{ti=setTimeout(()=>{v.cancelVideoFrameCallback(id);no(Error('frame timeout '+t))},2500);id=v.requestVideoFrameCallback((_,m)=>{clearTimeout(ti);ok(m)})});fp.catch(()=>{});let sp=evt(v,'seeked',2500);sp.catch(()=>{});v.currentTime=t;let [m]=await Promise.all([fp,sp]);return{requested:t,currentTime:v.currentTime,mediaTime:m.mediaTime,...snap(v)}}
window.videoTest=async(name,mode)=>{
 let m=video.variants[name],v=document.createElement('video');v.muted=true;v.width=256;v.height=160;document.body.append(v);let u,ms,sb,o={name,mode,pictures:[]};
 try{
  if(mode==='mse'){
   ms=new MediaSource();u=URL.createObjectURL(ms);v.src=u;if(ms.readyState!=='open')await evt(ms,'sourceopen');let mime='video/webm; codecs="vp9"';o.supported=MediaSource.isTypeSupported(mime);sb=ms.addSourceBuffer(mime);await append(sb,await bytes(m.init));for(let f of m.clusters)await append(sb,await bytes(f));ms.endOfStream();o.buffered=ranges(sb.buffered);
  }else{let p=evt(v,'loadeddata');p.catch(()=>{});u=URL.createObjectURL(new Blob([await bytes(m.file)],{type:'video/webm'}));v.src=u;await p}
  o.duration=v.duration;for(let t of video.times)o.pictures.push(await picture(v,t));
  v.currentTime=2.925;v.playbackRate=2;let end=evt(v,'ended',3000);end.catch(()=>{});await v.play();await end;o.ended=true;o.totalVideoFrames=v.getVideoPlaybackQuality?.().totalVideoFrames;
 }catch(e){o.error=String(e)}finally{v.pause();try{if(sb&&ms.readyState==='open')ms.removeSourceBuffer(sb)}catch{}v.removeAttribute('src');v.load();v.remove();if(u)URL.revokeObjectURL(u);o.cleaned=true}return o
};
function compare(a,b,start=0,n=null){n=n??Math.min(a.length-start,b.length);let dif=0,max=0,first=-1,ss=0;for(let i=0;i<n;i++){let d=Math.abs(a[start+i]-b[i]);if(d){dif++;if(first<0)first=i;max=Math.max(max,d);ss+=d*d}}return{values:n,different:dif,max,first,rmse:Math.sqrt(ss/n)}}
const floats=async n=>new Float32Array((await bytes(n)).buffer);
function separate(x,C){let out=Array.from({length:C},()=>new Float32Array(x.length/C));for(let i=0;i<x.length/C;i++)for(let c=0;c<C;c++)out[c][i]=x[i*C+c];return out}
function riffPlan(b,cap=500000){
 const d=new DataView(b.buffer,b.byteOffset,b.byteLength),text=(a,z)=>String.fromCharCode(...b.slice(a,z));
 if(b.length<12||text(0,4)!=='RIFF'||text(8,12)!=='WAVE'||d.getUint32(4,true)+8!==b.length)throw Error('RIFF extent');
 function chunks(a,z){let o=[];while(a<z){if(a+8>z)throw Error('truncated chunk');let n=d.getUint32(a+4,true),end=a+8+n;if(end+(n&1)>z)throw Error('chunk bounds');o.push([text(a,a+4),a+8,end]);a=end+(n&1)}return o}
 let fmt=false,seen=false,parts=[],t=0,last=[0,0],fact=null;
 for(let [tag,a,z] of chunks(12,b.length)){
  if(tag==='fmt '){if(fmt||z-a!==16||d.getUint16(a,true)!==1||d.getUint16(a+2,true)!==2||d.getUint32(a+4,true)!==48000||d.getUint32(a+8,true)!==192000||d.getUint16(a+12,true)!==4||d.getUint16(a+14,true)!==16)throw Error('format');fmt=true}
  else if(tag==='fact'){if(fact!==null||z-a!==4)throw Error('fact extent/duplicate');fact=d.getUint32(a,true)}
  else if(tag==='LIST'){
   if(!fmt||seen||text(a,a+4)!=='wavl')throw Error('list order/type');seen=true;
   for(let [k,x,y] of chunks(a+4,z)){
    let n;if(k==='data'){if((y-x)%4||y===x)throw Error('frame alignment');n=(y-x)/4;parts.push({kind:'data',offset:x,frames:n,start:t});last=[d.getInt16(y-4,true)/32768,d.getInt16(y-2,true)/32768]}
    else if(k==='slnt'){if(y-x!==4)throw Error('slnt extent');n=d.getUint32(x,true);if(!n)throw Error('zero hold');parts.push({kind:'hold',values:[...last],frames:n,start:t})}else throw Error('subchunk unsupported');t+=n;if(t>cap)throw Error('duration cap')
   }
  }else throw Error('top chunk unsupported')
 }
 if(!fmt||!seen||fact===null)throw Error('missing chunks');if(fact!==t)throw Error('fact sample count');return{parts,frames:t,channels:2,rate:48000}
}
async function renderSparse(b,plan,start,end,mode){
 if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>plan.frames)throw Error('output range');
 const c=new OfflineAudioContext(2,end-start,48000),dv=new DataView(b.buffer,b.byteOffset,b.byteLength);let stats={dataFrames:0,bufferBytes:0,constants:0,nodes:0},owned=[];
 for(let p of plan.parts){let a=Math.max(start,p.start),z=Math.min(end,p.start+p.frames);if(a>=z)continue;let n=z-a,at=(a-start)/48000;
  if(p.kind==='data'){
   let buf=c.createBuffer(2,n,48000);for(let ch=0;ch<2;ch++){let out=buf.getChannelData(ch);for(let i=0;i<n;i++)out[i]=dv.getInt16(p.offset+(a-p.start+i)*4+ch*2,true)/32768}
   let s=c.createBufferSource();s.buffer=buf;s.connect(c.destination);s.start(at);owned.push(s);stats.dataFrames+=n;stats.bufferBytes+=n*8;stats.nodes++;
  }else if(mode!=='zero'){
   let merger=c.createChannelMerger(2);merger.connect(c.destination);owned.push(merger);stats.nodes++;
   for(let ch=0;ch<2;ch++){let s=new ConstantSourceNode(c,{offset:p.values[mode==='swap'?1-ch:ch]});s.connect(merger,0,ch);s.start(at);s.stop((z-start)/48000);owned.push(s);stats.constants++;stats.nodes++}
  }
 }
 let y=await c.startRendering();for(let node of owned)node.disconnect();return{output:y,stats}
}
window.sparseTest=async()=>{
 let b=await bytes('sparse.wav'),plan=riffPlan(b),raw=new Int16Array((await bytes('sparse_reference.s16')).buffer),ref=separate(Float32Array.from(raw,x=>x/32768),2),o={plan,decode:{},renders:[],negativeGuards:[]};
 for(let fn of ['sparse.wav','dense.wav','dense_float.wav']){try{let c=new OfflineAudioContext(2,1,48000),a=await c.decodeAudioData((await bytes(fn)).buffer);o.decode[fn]={frames:a.length,channels:a.numberOfChannels,comparison:ref.map((r,ch)=>compare(r,a.getChannelData(ch)))}}catch(e){o.decode[fn]={error:String(e)}}}
 let jobs=[[0,plan.frames],...sparse.windows];
 for(let mode of ['correct','zero','swap'])for(let [start,end] of (mode==='correct'?jobs:[[0,plan.frames]])){
  let r=await renderSparse(b,plan,start,end,mode);o.renders.push({mode,start,end,...r.stats,frames:r.output.length,channels:r.output.numberOfChannels});
  // Deliberately keep reference and candidate owners separate.
  o.renders.at(-1).comparison=ref.map((x,ch)=>compare(x,r.output.getChannelData(ch),start,end-start));
 }
 for(let f of [async()=>riffPlan(await bytes('sparse_without_fact.wav')),()=>riffPlan(b.slice(0,-1)),()=>riffPlan(b,1000),()=>renderSparse(b,plan,.5,20,'correct')]){try{await f();o.negativeGuards.push(false)}catch(e){o.negativeGuards.push(String(e))}}
 return o;
};
window.sparseLife=async fn=>{
 let a=document.createElement('audio');a.muted=true;document.body.append(a);let u=URL.createObjectURL(new Blob([await bytes(fn)],{type:'audio/wav'})),o={file:fn,seeks:[]};
 try{let p=evt(a,'loadedmetadata',2500);p.catch(()=>{});a.src=u;await p;o.duration=a.duration;for(let t of [.1,.75]){let p=evt(a,'seeked');a.currentTime=t;await p;o.seeks.push(a.currentTime)}a.playbackRate=4;let p2=evt(a,'ended',3000);p2.catch(()=>{});await a.play();await p2;o.ended=true}catch(e){o.error=String(e)}finally{a.pause();a.removeAttribute('src');a.load();a.remove();URL.revokeObjectURL(u);o.cleaned=true}return o;
};
function preRoll(r,epsilon,B=1,cap=200000){if(!(Number.isFinite(r)&&r>0&&r<1&&Number.isFinite(epsilon)&&epsilon>0&&epsilon<1&&Number.isFinite(B)&&B>0))throw Error('unqualified coefficients/bound');let p=Math.max(0,Math.ceil(Math.log(epsilon/(4*B))/Math.log(r)));if(p>cap)throw Error('history exceeds job cap');return p}
async function iirRender(x,r,start,end,P){
 const a=Math.max(0,start-P),input=x.slice(a*2,end*2),L=end-a,c=new OfflineAudioContext(2,L,48000),b=c.createBuffer(2,L,48000);
 for(let ch=0;ch<2;ch++){let y=b.getChannelData(ch);for(let i=0;i<L;i++)y[i]=input[i*2+ch]}
 const source=c.createBufferSource(),filter=new IIRFilterNode(c,{feedforward:[1-r],feedback:[1,-r],channelCount:2,channelCountMode:'explicit',channelInterpretation:'discrete'});source.buffer=b;source.connect(filter);filter.connect(c.destination);source.start(0);let y=await c.startRendering();source.disconnect();filter.disconnect();return{parts:[y.getChannelData(0).slice(start-a),y.getChannelData(1).slice(start-a)],inputStart:a,inputFrames:L};
}
window.iirTest=async()=>{
 let o={cases:[],guards:[]};
 for(let m of iir.records){let x=await floats(m.source);for(let v of x)if(!Number.isFinite(v)||Math.abs(v)>m.max_declared_abs_input)throw Error('source input bound');let ref=separate(await floats(m.reference),2),P=preRoll(m.r,iir.total_tolerance),full=await iirRender(x,m.r,0,m.frames,0),q={name:m.name,r:m.r,P,stateBound:m.state_bound,fullReference:ref.map((v,c)=>compare(v,full.parts[c])),jobs:[]};
  for(let mode of ['bounded','no-history','short-history'])for(let [start,end] of m.intervals){let p=mode==='bounded'?P:mode==='short-history'?Math.floor(P/8):0,a=await iirRender(x,m.r,start,end,p);q.jobs.push({mode,start,end,preroll:p,inputStart:a.inputStart,inputFrames:a.inputFrames,vsFull:full.parts.map((r,c)=>compare(r,a.parts[c],start,end-start)),vsIndependent:ref.map((r,c)=>compare(r,a.parts[c],start,end-start))})}
  o.cases.push(q)
 }
 for(let args of [[1,1e-5],[-.5,1e-5],[.99,0],[.99999999,1e-5],[NaN,1e-5]]){try{preRoll(...args);o.guards.push(false)}catch(e){o.guards.push(String(e))}}
 return o;
};
window.videoContinuous=async(name)=>{
 let m=video.variants[name],v=document.createElement('video');v.muted=true;document.body.append(v);let ms=new MediaSource(),u=URL.createObjectURL(ms),sb,cbid,active=false,o={name,observed:[]};
 try{
  v.src=u;if(ms.readyState!=='open')await evt(ms,'sourceopen');sb=ms.addSourceBuffer('video/webm; codecs="vp9"');await append(sb,await bytes(m.init));for(let f of m.clusters)await append(sb,await bytes(f));ms.endOfStream();o.duration=v.duration;
  active=true;function tick(_,m){o.observed.push({time:m.mediaTime,...snap(v)});if(active)cbid=v.requestVideoFrameCallback(tick)}cbid=v.requestVideoFrameCallback(tick);let end=evt(v,'ended',6000);end.catch(()=>{});await v.play();await end;o.ended=true;o.totalVideoFrames=v.getVideoPlaybackQuality().totalVideoFrames;
 }catch(e){o.error=String(e)}finally{active=false;if(cbid)v.cancelVideoFrameCallback(cbid);v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(u);o.cleaned=true}return o;
};
