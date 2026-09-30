// SPDX-License-Identifier: MIT
import {PrivateSoftwarePlayer} from '/web/generated/internal/private-software-player.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
window.traceCheck=async(switchTrack=true)=>{
 const result={key:'dual-audio-seek-trace',switchTrack,diagnosticOnly:true,runtime:'jspi',mode:'software',isolated:crossOriginIsolated,passed:false,events:[]};
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;document.querySelector('main').replaceChildren(canvas);
 const backend=new PrivateSoftwarePlayer(canvas,{runtime:'jspi',assetBase:new URL('/',location.href),duration:6});window.backend=backend;let phase='open';
 backend.addEventListener('mpv',e=>{if(phase==='switch'||phase==='seek'||phase==='settle'){if(result.events.length<4000)result.events.push({phase,wall:performance.now(),...e.detail});}});
 try{
  await backend.open(new File([await(await fetch('/fixture/h264-dual-audio')).blob()],'dual.mkv'));await backend.play();const started=performance.now();
  while(!backend.properties.get('eof-reached')&&performance.now()-started<8500)await sleep(100);
  if(!backend.properties.get('eof-reached'))throw Error('EOF deadline');await backend.pause();phase='switch';if(switchTrack)await backend.selectTrack('audio','2');phase='seek';
  try{await backend.seek(0);}catch(e){result.seekError=String(e);}phase='settle';await sleep(300);result.position=backend.properties.get('time-pos');result.diagnostics=backend.diagnostics;result.passed=result.position<.15&&!result.seekError;
 }catch(e){result.error=String(e.stack??e);}finally{await backend.destroy();result.cleanup=backend.diagnostics?.cleanup;}
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
