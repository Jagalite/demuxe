// SPDX-License-Identifier: MIT
import {Player} from '/web/generated/index.js';
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
window.trackCheck=async(key,runtime='jspi',mode='software',audioOutput='stereo',publicPlayer=false,filterOverride,cacheOverride)=>{
 const profile=(await(await fetch('/profiles')).json()).find(p=>p.key===key);
 const result={key,runtime,mode,audioOutput,scope:(publicPlayer?'Public Player':'Direct Backend')+' track selection, resampling and output layout PCM qualification',isolated:crossOriginIsolated,userAgent:navigator.userAgent,passed:false,filterOverride,cacheOverride,tracks:[]};
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;document.querySelector('main').replaceChildren(canvas);
 let backend,player;
 try{
  if(publicPlayer){const host=document.createElement('div');document.querySelector('main').replaceChildren(host);player=new Player(host,{remuxRuntime:runtime,mode,audioOutput,width:320,height:180,assetBase:new URL('/',location.href).href});}
  else player=new PrivateSoftwarePlayer(canvas,{runtime,mode,audioOutput,assetBase:new URL('/',location.href),duration:profile.duration,...(profile.decodeWidth?{resourceLimits:{maxDecodePixels:8294400}}:{})});
  if(!publicPlayer){backend=player;window.backend=backend;}
  await player.open(new File([await(await fetch('/fixture/'+key)).blob()],key));backend=publicPlayer?player.current.backend:player;window.backend=backend;
  if(filterOverride!==undefined)await backend.command('set','vf',filterOverride);else if(profile.toneMapping==='hdr-to-sdr')await backend.command('set','vf','lavfi=[zscale=transfer=linear:npl=100,format=gbrpf32le,zscale=primaries=bt709,tonemap=tonemap=mobius:desat=0,zscale=transfer=bt709:matrix=bt709:range=limited,format=yuv420p]');
  if(cacheOverride!==undefined)await backend.command('set','cache',cacheOverride);
  result.output=backend.audioDiagnostics();const channels=result.output.outputChannels;
  const tracks=backend.properties.get('track-list').filter(t=>t.type==='audio');if(tracks.length!==(profile.audioTracks??1))throw Error('Audio track count mismatch');
  for(let index=0;index<tracks.length;index++){
   await player.selectTrack('audio',String(tracks[index].id));await player.seek(0);await worklet(backend,'record');const firstDraw=backend.diagnostics.rendered,samples=[],pictureTimes=[];const picture=({data})=>{if(data.type==='picture')pictureTimes.push(performance.now());};backend.worker.addEventListener('message',picture);await player.play();const started=performance.now();
   while(performance.now()-started<8500&&!backend.properties.get('eof-reached')){await sleep(100);samples.push({wall:performance.now()-started,position:backend.properties.get('time-pos'),draws:backend.diagnostics.rendered,avsync:backend.properties.get('avsync')});}
   const elapsedMs=performance.now()-started;await player.pause();backend.worker.removeEventListener('message',picture);const capture=await worklet(backend,'inspect'),pcm=new Float32Array(capture.pcm);
   const variant=String(index)+(channels===2?'-stereo':'');const reference=new Float32Array(await(await fetch('/reference-pcm/'+key+(profile.audioTracks?'?variant='+variant:''))).arrayBuffer());
   const check={samples,elapsedMs,rendered:backend.diagnostics.rendered-firstDraw,index,id:tracks[index].id,selected:backend.properties.get('aid'),frames:pcm.length/channels,eof:backend.properties.get('eof-reached'),comparison:compare(pcm,reference,channels),interiorUnderruns:capture.underrunEvents.filter(e=>e.read<Math.min(pcm.length/channels,reference.length/channels)-128)};result.tracks.push(check);
   if(!check.eof||check.frames<270000||check.comparison.comparedSamples<500000||check.comparison.normalizedRMS>.005||check.comparison.peakError>.003||check.interiorUnderruns.length)throw Error('Track PCM, EOF or continuity mismatch');
   if(profile.decodeWidth){check.presentedPictures=pictureTimes.length;check.pictureTimes=pictureTimes.map(time=>time-started);check.maxFrameGapLimit=Math.max(250,2000/profile.fps);check.maxFrameGapMs=Math.max(0,...pictureTimes.slice(1).map((time,i)=>time-pictureTimes[i]));check.maxAVSync=Math.max(...samples.map(s=>Math.abs(s.avsync??0)));if(check.presentedPictures<profile.fps*profile.duration*.9||check.elapsedMs>7500||check.maxFrameGapMs>check.maxFrameGapLimit||check.maxAVSync>.1)throw Error('Continuous video cadence or A/V mismatch');}
  }
  await player.destroy();result.cleanup=backend.diagnostics.cleanup;if(result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24||backend.audioDiagnostics().state!=='closed')throw Error('Track cleanup mismatch');result.passed=true;
 }catch(error){result.error=String(error.stack??error);result.diagnostics=backend?.diagnostics;await player?.destroy().catch(e=>result.cleanupError=String(e));}
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
