// SPDX-License-Identifier: MIT
import {Player} from '/web/generated/index.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
window.adaptiveCheck=async(runtime='jspi')=>{
 const result={key:'sustained-adaptive-transition',scope:'Public Player policy with test-induced backend filter workload',runtime,userAgent:navigator.userAgent,isolated:crossOriginIsolated,passed:false,samples:[]};
 const host=document.createElement('div');document.querySelector('main').replaceChildren(host);
 const player=new Player(host,{mode:'software',remuxRuntime:runtime,decodeQuality:'exact',adaptiveFrameDrop:true,assetBase:new URL('/',location.href).href,width:320,height:180});
 let backend;
 try{
  await player.open(new File([await(await fetch('/fixture/h264-long-gop')).blob()],'long.mp4'));backend=player.current.backend;
  result.initial=player.diagnostics.backend.decodePolicy;
  // Real filter work creates presentation pressure without faking native counters.
  // This is a bounded policy/lifecycle check, not a CPU or throughput benchmark.
  result.filter='lavfi=[zscale=w=1920:h=1080:transferin=bt709:primariesin=bt709:matrixin=bt709:transfer=linear,format=gbrpf32le,zscale=transfer=bt709:matrix=bt709,format=yuv420p,scale=320:180]';
  await backend.command('set','vf',result.filter);result.nativeFilter=await backend.command('expand-text','${options/vf}');await player.play();
  async function waitFor(predicate,phase,budget){const start=performance.now();while(performance.now()-start<budget){await sleep(500);const diagnostics=player.diagnostics.backend;const sample={phase,wall:performance.now()-start,position:player.state.currentTime,policy:diagnostics.decodePolicy,avsync:backend.properties.get('avsync'),decoderDrops:backend.properties.get('decoder-frame-drop-count'),presentationDrops:backend.properties.get('frame-drop-count'),rendered:diagnostics.rendered,heapBytes:diagnostics.heapBytes,reason:diagnostics.adaptiveReason};result.samples.push(sample);if(predicate(sample))return sample;}throw Error('Adaptive '+phase+' deadline');}
  result.pressure=await waitFor(sample=>sample.policy.adaptiveState!=='normal','pressure',35000);
  result.nativePressure=await backend.command('expand-text','${options/vd-lavc-o}');
  if(!JSON.stringify(result.nativePressure).includes('noref'))throw Error('Native pressure options missing');
  await backend.command('set','vf','');
  result.recovery=await waitFor(sample=>sample.policy.adaptiveState==='normal'&&sample.policy.effective==='exact','recovery',45000);
  result.nativeRecovery=await backend.command('expand-text','${options/vd-lavc-o}');
  if(JSON.stringify(result.nativeRecovery).includes('noref'))throw Error('Native shortcuts survived recovery');
  await player.pause();await player.seek(2);await player.play();await sleep(500);await player.pause();
  result.finalPosition=player.state.currentTime;if(result.finalPosition<2.3)throw Error('Playback did not recover');
  await player.destroy();result.cleanup=backend.diagnostics.cleanup;if(result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24)throw Error('Adaptive cleanup mismatch');result.passed=true;
 }catch(error){result.error=String(error.stack??error);result.diagnostics=player.diagnostics;await player.destroy().catch(e=>result.cleanupError=String(e));}
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
