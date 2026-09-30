// SPDX-License-Identifier: MIT
import {PrivateSoftwarePlayer} from '/web/generated/internal/private-software-player.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function worklet(backend,type){return new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timer=setTimeout(()=>{backend.node.port.removeEventListener('message',listener);reject(Error('Worklet deadline'));},3000);function listener({data}){if(data.id===id){clearTimeout(timer);backend.node.port.removeEventListener('message',listener);resolve(data);}}backend.node.port.addEventListener('message',listener);backend.node.port.postMessage({type,id});});}
function compare(pcm,reference,channels){
 let best={error:Infinity,offset:0};
 for(let offset=-2048;offset<=2048;offset++){let error=0;for(let frame=4096;frame<8192;frame+=71){const delta=pcm[frame*channels]-reference[(frame+offset)*channels];error+=delta*delta;}if(error<best.error)best={error,offset};}
 let error=0,energy=0,peak=0,count=0;
 // Exclude filter startup and EOF padding; check every channel throughout the interior.
 for(let frame=2048;frame<Math.min(pcm.length/channels,reference.length/channels-best.offset)-2048;frame++)for(let channel=0;channel<channels;channel++){const sample=reference[(frame+best.offset)*channels+channel],delta=pcm[frame*channels+channel]-sample;error+=delta*delta;energy+=sample*sample;peak=Math.max(peak,Math.abs(delta));count++;}
 return {offsetFrames:best.offset,comparedSamples:count,normalizedRMS:Math.sqrt(error/energy),peakError:peak};
}
window.trackCheck=async(key,runtime='jspi',mode='software',audioOutput='stereo')=>{
 const profile=(await(await fetch('/profiles')).json()).find(p=>p.key===key);
 const result={key,runtime,mode,audioOutput,scope:'Direct Backend track selection, resampling and output layout PCM qualification',isolated:crossOriginIsolated,userAgent:navigator.userAgent,passed:false,tracks:[]};
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;document.querySelector('main').replaceChildren(canvas);
 let backend;
 try{
  backend=new PrivateSoftwarePlayer(canvas,{runtime,mode,audioOutput,assetBase:new URL('/',location.href),duration:profile.duration});window.backend=backend;
  await backend.open(new File([await(await fetch('/fixture/'+key)).blob()],key));
  result.output=backend.audioDiagnostics();const channels=result.output.outputChannels;
  const tracks=backend.properties.get('track-list').filter(t=>t.type==='audio');if(tracks.length!==profile.audioTracks)throw Error('Audio track count mismatch');
  for(let index=0;index<tracks.length;index++){
   await backend.selectTrack('audio',String(tracks[index].id));await backend.seek(0);await worklet(backend,'record');await backend.play();const started=performance.now();
   while(performance.now()-started<8500&&!backend.properties.get('eof-reached'))await sleep(100);
   await backend.pause();const capture=await worklet(backend,'inspect'),pcm=new Float32Array(capture.pcm);
   const variant=String(index)+(channels===2?'-stereo':'');const reference=new Float32Array(await(await fetch('/reference-pcm/'+key+'?variant='+variant)).arrayBuffer());
   const check={index,id:tracks[index].id,selected:backend.properties.get('aid'),frames:pcm.length/channels,eof:backend.properties.get('eof-reached'),comparison:compare(pcm,reference,channels),interiorUnderruns:capture.underrunEvents.filter(e=>e.read<Math.min(pcm.length/channels,reference.length/channels)-128)};result.tracks.push(check);
   if(!check.eof||check.frames<270000||check.comparison.comparedSamples<500000||check.comparison.normalizedRMS>.005||check.comparison.peakError>.003||check.interiorUnderruns.length)throw Error('Track PCM, EOF or continuity mismatch');
  }
  await backend.destroy();result.cleanup=backend.diagnostics.cleanup;if(result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24||backend.audioDiagnostics().state!=='closed')throw Error('Track cleanup mismatch');result.passed=true;
 }catch(error){result.error=String(error.stack??error);result.diagnostics=backend?.diagnostics;await backend?.destroy().catch(e=>result.cleanupError=String(e));}
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
