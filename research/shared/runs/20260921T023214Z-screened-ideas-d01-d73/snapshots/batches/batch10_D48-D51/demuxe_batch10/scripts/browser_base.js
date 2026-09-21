/* SPDX-License-Identifier: MIT. Standalone component screens. */
const loadFile=async n=>Uint8Array.from(atob(await readBytes(n)),c=>c.charCodeAt(0));
const hash=a=>sha256Fallback(a instanceof ArrayBuffer?new Uint8Array(a):new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function event(t,name,ms=5000){return new Promise((yes,no)=>{const cleanup=()=>{clearTimeout(timer);t.removeEventListener(name,done);t.removeEventListener('error',bad)};const done=e=>{cleanup();yes(e)},bad=()=>{cleanup();no(Error(t.error?.message||name+' error'))};let timer=setTimeout(()=>{cleanup();no(Error(name+' timeout'))},ms);t.addEventListener(name,done);t.addEventListener('error',bad)})}
async function append(sb,b){let wait=event(sb,'updateend');try{sb.appendBuffer(b)}catch(e){wait.catch(()=>{});throw e}await wait}
function snapshot(v){const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0);return {width:c.width,height:c.height,hash:hash(ctx.getImageData(0,0,c.width,c.height).data)}}
async function seekPicture(v,t){let id;const frame=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{v.cancelVideoFrameCallback(id);reject(Error('frame timeout at '+t))},2500);id=v.requestVideoFrameCallback((_,m)=>{clearTimeout(timer);resolve(m)})});const seek=event(v,'seeked',2500);v.currentTime=t;let [m]=await Promise.all([frame,seek]);return{requested:t,mediaTime:m.mediaTime,...snapshot(v)}}
