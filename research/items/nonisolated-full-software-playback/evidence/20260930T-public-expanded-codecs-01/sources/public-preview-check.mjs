// SPDX-License-Identifier: MIT
import {Player} from '/web/generated/index.js';
window.publicCheck=async(key,runtime='jspi',mode='software')=>{
 const profiles=await(await fetch('/profiles')).json(),profile=profiles.find(p=>p.key===key);
 if(!profile)throw Error('Unknown fixture');
 const result={key,runtime,mode,userAgent:navigator.userAgent,isolated:crossOriginIsolated,passed:false,pictures:[]};
 const main=document.querySelector('main'),status=document.querySelector('#status');
 status.textContent=`Testing ${key} through ${runtime}`;
 main.replaceChildren();const player=new Player(main,{mode,remuxRuntime:runtime,softwarePresenter:'rgb',width:profile.width,height:profile.height,assetBase:new URL('/',location.href).href});window.player=player;
 try{
  result.preparation=await player.prepare(['inspector',mode]);
  const file=new File([await(await fetch('/fixture/'+key)).blob()],key);await player.open(file);
  result.plan=player.diagnostics.plan;result.backend=player.diagnostics.backend;
  if(crossOriginIsolated||result.plan.id!==mode+'-private'||result.preparation.assets.some(a=>a.status!=='ready'))throw Error('Wrong public route/preparation');
  const reference=new Uint8Array(await(await fetch('/reference/'+key)).arrayBuffer());
  for(const target of [.5,1.5,2.5]){
   await player.seek(target);const source=player.surface;
   const image=await createImageBitmap(await(await fetch(source.toDataURL())).blob());
   const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
   const context=canvas.getContext('2d');context.drawImage(image,0,0);image.close();const rgba=context.getImageData(0,0,canvas.width,canvas.height).data;
   const length=profile.width*profile.height*3;let best={mae:Infinity};
   for(let frame=Math.max(0,Math.floor((target-1)*profile.fps));frame<=Math.ceil((target+1)*profile.fps);frame++){
    let sum=0;for(let i=0;i<length;i++)sum+=Math.abs(rgba[Math.floor(i/3)*4+i%3]-reference[frame*length+i]);
    const mae=sum/length;if(mae<best.mae)best={mae,time:frame/profile.fps};
   }
   result.pictures.push({target,...best});if(!(best.mae<5&&Math.abs(best.time-target)<=1/profile.fps+.001)){
    result.seekFailure={backend:player.diagnostics.backend};
    const snapshot=await player.current.backend.previewSnapshot(),bitmap=await createImageBitmap(snapshot.blob);
    context.drawImage(bitmap,0,0);bitmap.close();const native=context.getImageData(0,0,canvas.width,canvas.height).data;let nearest={mae:Infinity};
    for(let frame=0;frame<=Math.ceil((target+1)*profile.fps);frame++){let sum=0;for(let i=0;i<length;i++)sum+=Math.abs(native[Math.floor(i/3)*4+i%3]-reference[frame*length+i]);const mae=sum/length;if(mae<nearest.mae)nearest={mae,time:frame/profile.fps};}
    result.seekFailure.worker={...nearest,timeProperty:snapshot.time,backend:player.diagnostics.backend};throw Error('Seek picture mismatch');
   }
  }
  await player.seek(0);await player.play();await new Promise(r=>setTimeout(r,1200));await player.pause();result.advanced=player.state.currentTime;
  await player.rate(1.25);await player.volume(35);await player.setAudioGain(.4);await player.setAudioDelay(.025);
  await player.seek(1.5);await player.open(file);await player.seek(2.5);
  result.settings={rate:player.state.playbackRate,volume:player.state.volume,gain:player.diagnostics.audioGain};
  try{await player.setVideoFilters('hflip');}catch(e){result.filterError=String(e);}
  await player.seek(.5);result.recovered=player.state.currentTime;
  const backend=player.current.backend,context=backend.context;
  await player.play();await context.suspend();await new Promise(r=>setTimeout(r,250));result.suspended=player.diagnostics.backend.audio.header[6];
  await context.resume();await new Promise(r=>setTimeout(r,500));result.resumed=player.diagnostics.backend.audio.header[6];await player.pause();
  await player.destroy();result.context=backend.audioDiagnostics().state;result.cleanup=backend.diagnostics.cleanup;
  if(result.advanced<.8||result.settings.rate!==1.25||Math.abs(result.settings.volume-.35)>.001||result.settings.gain!==.4||!result.filterError||Math.abs(result.recovered-.5)>.15||result.suspended!==0||result.resumed!==1||result.context!=='closed'||result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24)throw Error('Public controls/lifetime mismatch');
  result.passed=true;
 }catch(e){result.error=String(e.stack??e);result.failureState={state:player.state,diagnostics:player.diagnostics};await player.destroy().catch(()=>{});}
 status.textContent=`${key} / ${runtime}: ${result.passed?'passed':result.error}`;
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
