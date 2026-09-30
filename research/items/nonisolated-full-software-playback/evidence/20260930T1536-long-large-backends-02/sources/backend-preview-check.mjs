// SPDX-License-Identifier: MIT
import {PrivateSoftwarePlayer} from '/web/generated/internal/private-software-player.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
window.backendCheck=async(key,runtime='jspi',mode='software')=>{
 const profile=(await(await fetch('/profiles')).json()).find(p=>p.key===key);
 if(!profile)throw Error('Unknown fixture');
 const result={key,runtime,mode,scope:'Maintained private Backend, before public admission expansion',userAgent:navigator.userAgent,isolated:crossOriginIsolated,passed:false,pictures:[]};
 const canvas=document.createElement('canvas');canvas.width=profile.width;canvas.height=profile.height;document.querySelector('main').replaceChildren(canvas);
 document.querySelector('#status').textContent=`Testing Backend ${key} / ${mode} / ${runtime}`;
 const backend=new PrivateSoftwarePlayer(canvas,{runtime,mode,assetBase:new URL('/',location.href),duration:profile.duration});window.backend=backend;
 backend.addEventListener('error',event=>{result.backendError=String(event.detail);});
 const file=new File([await(await fetch('/fixture/'+key)).blob()],key);
 try{
  await backend.open(file);const reference=new Uint8Array(await(await fetch('/reference/'+key)).arrayBuffer());
  for(const target of profile.seekTargets??[.5,1.5,2.5]){
   await backend.seek(target);const image=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
   const length=profile.width*profile.height*3;let nearest={mae:Infinity};
   for(let frame=Math.max(0,Math.floor((target-.1)*profile.fps));frame<=Math.ceil((target+.1)*profile.fps);frame++){
    let sum=0;for(let i=0;i<length;i++)sum+=Math.abs(image[Math.floor(i/3)*4+i%3]-reference[frame*length+i]);
    const mae=sum/length;if(mae<nearest.mae)nearest={mae,time:frame/profile.fps};
   }
   result.pictures.push({target,...nearest});if(!(nearest.mae<5&&Math.abs(nearest.time-target)<=1/profile.fps+.001))throw Error('Backend seek picture mismatch');
  }
  await backend.seek(0);await backend.play();await sleep(1200);
  result.audio=backend.audioDiagnostics();result.progress=Number(backend.properties.get('time-pos'));await backend.pause();await backend.verifyOutput();
  result.diagnostics=backend.diagnostics;
  if(result.progress<.8||result.audio.mediaFrames<24000||result.audio.rms<.001)throw Error('Backend A/V output did not advance');
  if(mode==='hybrid'&&(backend.diagnostics.decoderBackend!=='webcodecs'||!backend.diagnostics.browserDecoder.submitted||!backend.diagnostics.retained.presented))throw Error('Browser video decoding was not exercised');
  await backend.open(file);await backend.seek(1.5);result.replacement=backend.diagnostics;
  await backend.destroy();result.cleanup=backend.diagnostics.cleanup;
  if(result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24||backend.audioDiagnostics().state!=='closed')throw Error('Backend resources survived destruction');
  result.passed=true;
 }catch(error){result.error=String(error.stack??error);result.diagnostics=backend.diagnostics;await backend.destroy().catch(error=>{result.cleanupError=String(error);});}
 document.querySelector('#status').textContent=`${key} / ${mode} / ${runtime}: ${result.passed?'passed':result.error}`;
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
