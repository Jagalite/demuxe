// SPDX-License-Identifier: MIT
import {Player} from '/web/generated/index.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
window.policyCheck=async(quality='exact',runtime='jspi',preload='metadata')=>{
 const result={key:'decode-and-buffering-policy',quality,runtime,preload,userAgent:navigator.userAgent,isolated:crossOriginIsolated,passed:false};
 const host=document.createElement('div');document.querySelector('main').replaceChildren(host);
 const player=new Player(host,{mode:'software',remuxRuntime:runtime,decodeQuality:quality,adaptiveFrameDrop:true,audioOutput:'auto',buffering:{preload,profile:'low-latency',memoryBudget:8*1024*1024},assetBase:new URL('/',location.href).href,width:320,height:180});
 try{
  const file=new File([await(await fetch('/fixture/h264-ac3')).blob()],'h264.mkv');await player.open(file);const backend=player.current.backend;
  result.before={native:await backend.command('expand-text','${options/vd-lavc-o}'),cache:await backend.command('expand-text','${options/cache-secs}')};
  await player.play();await sleep(800);await player.pause();result.advance=player.state.currentTime;result.policy=player.diagnostics.backend.decodePolicy;result.buffering=player.diagnostics.backend.buffering;result.audio=player.audioDiagnostics();
  result.afterCache=await backend.command('expand-text','${options/cache-secs}');
  if(result.advance<.5||result.audio.mediaFrames<24000||result.policy.requested!==quality||result.policy.effective!==quality||result.policy.threads!==1||result.policy.ffmpegOptions.max_pixels!=='8294400')throw Error('Decode/output policy mismatch');
  if(quality==='exact'?result.policy.shortcuts.length:!result.policy.shortcuts.includes('skip_loop_filter=noref'))throw Error('Reconstruction contract mismatch');
  const actual=JSON.stringify(result.before.native);if(!actual.includes('max_pixels')||quality!=='exact'&&!actual.includes('noref'))throw Error('Native decoder did not receive the requested options');
  if(Number(result.before.cache)!==(preload==='auto'?3600000:1)||Number(result.afterCache)!==3600000)throw Error('Preload transition was not applied natively');
  if(result.buffering.forwardLimitBytes+result.buffering.backwardLimitBytes!==8*1024*1024)throw Error('Buffering budget mismatch');
  await player.open(file);await player.seek(1);await player.play();await sleep(300);await player.pause();result.replacement=player.diagnostics.backend.decodePolicy;if(result.replacement.requested!==quality)throw Error('Replacement lost requested quality');
  await player.destroy();result.cleanup=backend.diagnostics.cleanup;if(result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24)throw Error('Policy cleanup mismatch');result.passed=true;
 }catch(error){result.error=String(error.stack??error);result.diagnostics=player.diagnostics;await player.destroy().catch(e=>result.cleanupError=String(e));}
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
