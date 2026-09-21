/* SPDX-License-Identifier: MIT. Standalone component screens. */
const loadFile=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0));
const hash=a=>sha256Fallback(a instanceof ArrayBuffer?new Uint8Array(a):new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function event(t,name,ms=5000){return new Promise((yes,no)=>{const cleanup=()=>{clearTimeout(timer);t.removeEventListener(name,done);t.removeEventListener('error',bad)};const done=e=>{cleanup();yes(e)},bad=()=>{cleanup();no(Error(t.error?.message||name+' error'))};let timer=setTimeout(()=>{cleanup();no(Error(name+' timeout'))},ms);t.addEventListener(name,done);t.addEventListener('error',bad)})}
async function append(sb,b){let wait=event(sb,'updateend');try{sb.appendBuffer(b)}catch(e){wait.catch(()=>{});throw e}await wait}
function snapshot(v){const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0);return {width:c.width,height:c.height,hash:hash(ctx.getImageData(0,0,c.width,c.height).data)}}
async function seekPicture(v,t){let id;const frame=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{v.cancelVideoFrameCallback(id);reject(Error('frame timeout at '+t))},2500);id=v.requestVideoFrameCallback((_,m)=>{clearTimeout(timer);resolve(m)})});const seek=event(v,'seeked',2500);v.currentTime=t;let [m]=await Promise.all([frame,seek]);return{requested:t,mediaTime:m.mediaTime,...snapshot(v)}}
async function playBlob(name,asView=false,wrongSource=false){let v=document.createElement('video');v.muted=true;document.body.appendChild(v);let url;let o={name,asView,pictures:[]};
 try{let blob;if(asView){let view=manifest.views[name],sources={},parts=[await loadFile(view.header)];for(let n of Object.keys(manifest.sources)){let a=await loadFile(n);if(wrongSource&&n==='a.mp4')a[0]^=1;if(hash(a)!==manifest.sources[n].sha256)throw Error('source validator changed');sources[n]=new Blob([a])}for(let q of view.spans)parts.push(sources[q.file].slice(q.start,q.end));blob=new Blob(parts,{type:'video/mp4'});o.parts=parts.length;o.constructedSize=blob.size;
 // A complete read is a test-only identity oracle, NOT part of the candidate construction contract.
 o.testOnlyBlobHash=hash(await blob.arrayBuffer());o.byteOracle=o.testOnlyBlobHash===view.sha256;
 }else blob=new Blob([await loadFile(name)],{type:'video/mp4'});
 url=URL.createObjectURL(blob);v.src=url;await event(v,'loadedmetadata');o.duration=v.duration;
 let times=asView?Array.from({length:60},(_,i)=>i*.05+.025):Array.from({length:40},(_,i)=>i*.05+.025);if(name.includes('wrong_offset'))times=[.225,1.225,2.225];
 for(let t of times)o.pictures.push(await seekPicture(v,t));if(asView)for(let t of [1.725,.275,2.725,1.025])o.pictures.push(await seekPicture(v,t));
 let end=event(v,'ended',5000);v.playbackRate=4;await v.play();await end;o.ended=true;o.finalTime=v.currentTime;
 }catch(e){o.error=String(e)}finally{v.pause();v.removeAttribute('src');v.load();v.remove();if(url)URL.revokeObjectURL(url);o.cleaned=true}return o}
