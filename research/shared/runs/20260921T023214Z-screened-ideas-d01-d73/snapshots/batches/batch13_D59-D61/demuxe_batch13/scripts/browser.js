/* SPDX-License-Identifier: MIT. Bounded research harness, not production admission. */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const bytes=async n=>Uint8Array.from(atob(await readBytes(n)),x=>x.charCodeAt(0));
const hash=a=>sha256Fallback(new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
function compare(a,b){let d=0,max=0,first=-1,sse=0,n=Math.min(a.length,b.length);for(let i=0;i<n;i++){let x=Math.abs(a[i]-b[i]);if(x){d++;if(first<0)first=i;max=Math.max(max,x);sse+=x*x}}return{lengthA:a.length,lengthB:b.length,values:n,different:d,max,first,rmse:Math.sqrt(sse/n)}}
function evt(t,n,ms=2500){return new Promise((yes,no)=>{let ti;function clean(){clearTimeout(ti);t.removeEventListener(n,ok);t.removeEventListener('error',bad)}function ok(e){clean();yes(e)}function bad(){clean();no(Error(t.error?.message||n+' error'))}t.addEventListener(n,ok);t.addEventListener('error',bad);ti=setTimeout(()=>{clean();no(Error(n+' timeout'))},ms)})}
async function append(s,b){let p=evt(s,'updateend');p.catch(()=>{});s.appendBuffer(b);await p}
const ranges=r=>Array.from({length:r.length},(_,i)=>[r.start(i),r.end(i)]);
function canvas(w,h){let c=document.createElement('canvas');c.width=w;c.height=h;return c}
function pixels(c){return c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data}
function snap(v){let c=canvas(v.videoWidth,v.videoHeight);c.getContext('2d').drawImage(v,0,0);return{w:c.width,h:c.height,hash:hash(pixels(c))}}
async function picture(v,t){let id,ti;const fp=new Promise((ok,no)=>{ti=setTimeout(()=>{v.cancelVideoFrameCallback(id);no(Error('frame timeout '+t))},2000);id=v.requestVideoFrameCallback((_,m)=>{clearTimeout(ti);ok(m)})});fp.catch(()=>{});let sp=evt(v,'seeked',2000);sp.catch(()=>{});v.currentTime=t;let [m]=await Promise.all([fp,sp]);return{requested:t,currentTime:v.currentTime,mediaTime:m.mediaTime,...snap(v)}}
window.videoTest=async(name,mode,cold=false)=>{
 let m=video.variants[name],v=document.createElement('video');v.muted=true;document.body.append(v);let u,ms,sb,o={name,mode,cold,pictures:[]};
 try{
  if(mode==='mse'){
   ms=new MediaSource();u=URL.createObjectURL(ms);v.src=u;if(ms.readyState!=='open')await evt(ms,'sourceopen');let mime='video/mp4; codecs="'+video.codec+'"';o.supported=MediaSource.isTypeSupported(mime);sb=ms.addSourceBuffer(mime);await append(sb,await bytes(video.init));for(let f of (cold?m.fragments.slice(2):m.fragments))await append(sb,await bytes(f));ms.endOfStream();o.buffered=ranges(sb.buffered);
  }else{let p=evt(v,'loadeddata');p.catch(()=>{});u=URL.createObjectURL(new Blob([await bytes(m.file)],{type:'video/mp4'}));v.src=u;await p;o.buffered=ranges(v.buffered)}
  o.duration=v.duration;for(let t of (cold?[2.225,2.925,3.525,2.475]:video.times))o.pictures.push(await picture(v,t));
  v.currentTime=3.85;v.playbackRate=2;let end=evt(v,'ended',3000);end.catch(()=>{});await v.play();await end;o.ended=true;
 }catch(e){o.error=String(e)}finally{v.pause();try{if(sb&&ms.readyState==='open')ms.removeSourceBuffer(sb)}catch{}v.removeAttribute('src');v.load();v.remove();if(u)URL.revokeObjectURL(u);o.cleaned=true}return o
};
async function loadImage(name,mime='image/jpeg'){return await createImageBitmap(new Blob([await bytes(name)],{type:mime}))}
window.tiffTest=async()=>{
 let o={originals:[],cases:[],negative:[]};
 for(let name of tiff.source_files){try{let b=await loadImage(name,'image/tiff');o.originals.push({file:name,w:b.width,h:b.height,decoded:true});b.close()}catch(e){o.originals.push({file:name,error:String(e)})}}
 for(let m of tiff.cases){let c=canvas(m.width,m.height),ctx=c.getContext('2d'),ref=canvas(m.width,m.height),bm=await loadImage(m.reference,'image/png');ref.getContext('2d').drawImage(bm,0,0);bm.close();let decoded=0;
  for(let s of m.strips){let im=await loadImage(s.file);if(im.width!==s.width||im.height!==s.height)throw Error('unexpected strip geometry');ctx.drawImage(im,0,s.y);im.close();decoded++}
  o.cases.push({file:m.file,page:m.page??0,strips:decoded,pixels:m.width*m.height,comparison:compare(pixels(ref),pixels(c)),candidateHash:hash(pixels(c)),referenceHash:hash(pixels(ref))});
 }
 let m=tiff.cases[0];for(let mode of ['wrong-tables','wrong-order']){let c=canvas(m.width,m.height),ref=canvas(m.width,m.height),b=await loadImage(m.reference,'image/png');ref.getContext('2d').drawImage(b,0,0);b.close();let ctx=c.getContext('2d');
  for(let j=0;j<m.strips.length;j++){let s=m.strips[j],name=mode==='wrong-tables'&&j===0?'wrong_tables.jpg':mode==='wrong-order'&&j<2?m.strips[1-j].file:s.file;let im=await loadImage(name);ctx.drawImage(im,0,s.y);im.close()}
  o.negative.push({mode,comparison:compare(pixels(ref),pixels(c))});
 }
 return o;
};
function sourceData(N){let xs=[new Float32Array(N),new Float32Array(N)],z=0x471361;for(let i=0;i<N;i++){z=(Math.imul(z,1664525)+1013904223)>>>0;xs[0][i]=((z>>>8)%50001-25000)/65536;xs[1][i]=Math.fround(.23*Math.sin(i*.091)+.09*Math.cos(i*.007))}return xs}
function loopGuard(N,a,b,phase,frames,rate){if(![N,a,b,phase,frames,rate].every(Number.isInteger)||a<0||b<=a||b>N||phase<0||phase>=b-a||frames<1||frames>2e6||![24000,44100,48000].includes(rate))throw Error('unqualified loop range/rate')}
async function loopRender(xs,srcRate,dstRate,a,b,phase,frames,mode,startFrame=0){
 loopGuard(xs[0].length,a,b,phase,frames,srcRate);let c=new OfflineAudioContext(2,frames+startFrame,dstRate),L=b-a,buf;let periods=Math.ceil(frames*srcRate/dstRate/L)+3;
 if(mode==='materialized'){
  let N=Math.ceil(frames*srcRate/dstRate)+128;buf=c.createBuffer(2,N,srcRate);
  for(let ch=0;ch<2;ch++){let q=buf.getChannelData(ch);for(let i=0;i<N;i++)q[i]=xs[ch][a+(phase+i)%L]}
 }else if(mode==='sliced'){
  buf=c.createBuffer(2,L,srcRate);for(let ch=0;ch<2;ch++)buf.copyToChannel(xs[ch].slice(a,b),ch)
 }else{buf=c.createBuffer(2,xs[0].length,srcRate);for(let ch=0;ch<2;ch++)buf.copyToChannel(xs[ch],ch)}
 let s=c.createBufferSource();s.buffer=buf;s.connect(c.destination);if(mode!=='materialized'){s.loop=true;s.loopStart=(mode==='sliced'?0:a)/srcRate;s.loopEnd=(mode==='sliced'?L:b+(mode==='wrong-end'?1:0))/srcRate}
 s.start(startFrame/dstRate,mode==='materialized'?0:(mode==='sliced'?phase:a+phase)/srcRate);let out=await c.startRendering();s.disconnect();return{parts:[out.getChannelData(0).slice(startFrame),out.getChannelData(1).slice(startFrame)],inputFrames:buf.length,loopSeconds:s.loopEnd-s.loopStart,periods}
}
window.loopTest=async()=>{
 let xs=sourceData(8191),jobs=[{a:137,b:2011,phase:0,frames:75001,rate:48000},{a:137,b:2011,phase:731,frames:65003,rate:48000},{a:409,b:666,phase:256,frames:19999,rate:44100},{a:123,b:251,phase:17,frames:13001,rate:48000},{a:500,b:501,phase:0,frames:2003,rate:48000}],o={sameRate:[],fractional:[],guards:[]};
 for(let j of jobs){let L=j.b-j.a,ref=[0,1].map(ch=>Float32Array.from({length:j.frames},(_,i)=>xs[ch][j.a+(j.phase+i)%L]));let row={...j,outputs:[]};
  for(let mode of ['loop','sliced','materialized','wrong-end']){let z=await loopRender(xs,j.rate,j.rate,j.a,j.b,j.phase,j.frames,mode,13);row.outputs.push({mode,inputFrames:z.inputFrames,comparison:z.parts.map((q,ch)=>compare(ref[ch],q))})}o.sameRate.push(row)
 }
 for(let [src,dst] of [[24000,48000],[44100,48000],[48000,44100]]){let a=137,b=2011,phase=731,N=40003,material=await loopRender(xs,src,dst,a,b,phase,N,'materialized'),loop=await loopRender(xs,src,dst,a,b,phase,N,'loop'),slice=await loopRender(xs,src,dst,a,b,phase,N,'sliced'),again=await loopRender(xs,src,dst,a,b,phase,N,'loop');o.fractional.push({src,dst,frames:N,loopVsMaterial:loop.parts.map((p,ch)=>compare(material.parts[ch],p)),slicedVsMaterial:slice.parts.map((p,ch)=>compare(material.parts[ch],p)),loopVsSliced:loop.parts.map((p,ch)=>compare(slice.parts[ch],p)),repeat:loop.parts.map((p,ch)=>compare(again.parts[ch],p)),inputFrames:{loop:loop.inputFrames,sliced:slice.inputFrames,materialized:material.inputFrames}})}
 for(let args of [[8191,2,2,0,10,48000],[8191,2,9000,0,10,48000],[8191,2,300,298,10,48000],[8191,2.5,300,0,10,48000],[8191,2,300,0,10,96000]]){try{loopGuard(...args);o.guards.push(false)}catch(e){o.guards.push(String(e))}}
 return o;
};
window.loopFollowup=async()=>{
 let xs=sourceData(8191),o={cases:[]};
 for(let t of [{a:137,b:2011,phase:731,frames:12007,src:24000,dst:48000},{a:137,b:2011,phase:731,frames:12007,src:44100,dst:48000},{a:500,b:501,phase:0,frames:37,src:48000,dst:48000}]){
  let q={...t,outputs:[]},base=await loopRender(xs,t.src,t.dst,t.a,t.b,t.phase,t.frames,'loop'),sliced=await loopRender(xs,t.src,t.dst,t.a,t.b,t.phase,t.frames,'sliced');q.boundary=xs.map(a=>({lastInside:a[t.b-1],firstInside:a[t.a],firstOutside:a[t.b]}));
  for(let mode of ['unchanged','before','after']){let x=xs.map(a=>new Float32Array(a));if(mode!=='unchanged')for(let ch=0;ch<2;ch++)for(let i=(mode==='before'?0:t.b);i<(mode==='before'?t.a:x[ch].length);i++)x[ch][i]=ch===0?.75:-.625;
   let p=await loopRender(x,t.src,t.dst,t.a,t.b,t.phase,t.frames,'loop');q.outputs.push({mode,vsOriginal:p.parts.map((r,ch)=>compare(base.parts[ch],r)),vsSlice:p.parts.map((r,ch)=>compare(sliced.parts[ch],r)),first32:p.parts.map(a=>Array.from(a.slice(0,32)))})
  }o.cases.push(q)
 }return o;
};
window.tiffRegionTest=async()=>{
 let m=tiff.cases[0],refImage=await loadImage(m.reference,'image/png'),o={cases:[]};
 for(let [x,y,w,h] of [[17,101,123,20],[7,40,127,65],[9,240,99,3],[12,149,143,39]]){
  let ref=canvas(w,h);ref.getContext('2d').drawImage(refImage,x,y,w,h,0,0,w,h);let c=canvas(w,h),ctx=c.getContext('2d'),selected=[];
  for(let s of m.strips){let a=Math.max(y,s.y),z=Math.min(y+h,s.y+s.height);if(a>=z)continue;let im=await loadImage(s.file);ctx.drawImage(im,x,a-s.y,w,z-a,0,a-y,w,z-a);im.close();selected.push({y:s.y,height:s.height,decodedPixels:s.width*s.height})}
  o.cases.push({rect:[x,y,w,h],strips:selected.length,decodedPixels:selected.reduce((a,s)=>a+s.decodedPixels,0),fullPagePixels:m.width*m.height,comparison:compare(pixels(ref),pixels(c))})
 }refImage.close();return o;
};
