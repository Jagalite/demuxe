// SPDX-License-Identifier: MIT
import {Player} from '/web/generated/index.js';
window.publicCheck=async(key,runtime='jspi',mode='software',automatic=false,crossOriginAssets=false)=>{
 const profiles=await(await fetch('/profiles')).json(),profile=profiles.find(p=>p.key===key);
 if(!profile)throw Error('Unknown fixture');
 const assetBase=new URL('/',location.href);if(crossOriginAssets)assetBase.hostname='127.0.0.1';
 const result={key,runtime,mode,automatic,assetBase:assetBase.href,userAgent:navigator.userAgent,isolated:crossOriginIsolated,passed:false,pictures:[]};
 const main=document.querySelector('main'),status=document.querySelector('#status');
 status.textContent=`Testing ${key} through ${runtime}`;
 main.replaceChildren();const player=new Player(main,{...(automatic?{}:{mode}),remuxRuntime:runtime,softwarePresenter:'rgb',width:profile.width,height:profile.height,assetBase:assetBase.href});window.player=player;
 try{
  result.preparation=await player.prepare(['inspector',mode]);
  const file=new File([await(await fetch('/fixture/'+key)).blob()],key);await player.open(file);
  result.plan=player.diagnostics.plan;result.backend=player.diagnostics.backend;result.selection=player.diagnostics.selection;
  if(automatic&&!result.selection?.automatic)throw Error('Automatic selection was not active');
  if(crossOriginIsolated||result.plan.id!==mode+'-private'||result.preparation.assets.some(a=>a.status!=='ready'))throw Error('Wrong public route/preparation');
  const reference=new Uint8Array(await(await fetch('/reference/'+key)).arrayBuffer());
  for(const target of profile.seekTargets??[.5,1.5,2.5]){
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
  if(mode==='software'){
   await player.setVideoFilters('hflip');await player.seek(.5);
   const pixels=player.surface.getContext('2d').getImageData(0,0,profile.width,profile.height).data,length=profile.width*profile.height*3;let mae=Infinity;
   for(let frame=Math.floor(.5*profile.fps)-1;frame<=Math.ceil(.5*profile.fps)+1;frame++){let sum=0;for(let y=0;y<profile.height;y++)for(let x=0;x<profile.width;x++)for(let c=0;c<3;c++)sum+=Math.abs(pixels[(y*profile.width+x)*4+c]-reference[frame*length+(y*profile.width+profile.width-1-x)*3+c]);mae=Math.min(mae,sum/length);}
   result.filterMAE=mae;if(mae>5)throw Error('Public Software filter picture mismatch');result.filterApplied=true;await player.setVideoFilters('');
  }else try{await player.setVideoFilters('hflip');}catch(e){result.filterError=String(e);}
  await player.seek(.5);result.recovered=player.state.currentTime;
  const backend=player.current.backend,context=backend.context;
  await player.play();await context.suspend();await new Promise(r=>setTimeout(r,250));result.suspended=player.diagnostics.backend.audio.header[6];
  await context.resume();await new Promise(r=>setTimeout(r,500));result.resumed=player.diagnostics.backend.audio.header[6];await player.pause();
  await player.destroy();result.context=backend.audioDiagnostics().state;result.cleanup=backend.diagnostics.cleanup;
  if(result.advanced<.8||result.settings.rate!==1.25||Math.abs(result.settings.volume-.35)>.001||result.settings.gain!==.4||(mode==='software'?!result.filterApplied:!result.filterError)||Math.abs(result.recovered-.5)>.15||result.suspended!==0||result.resumed!==1||result.context!=='closed'||result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24)throw Error('Public controls/lifetime mismatch');
  result.passed=true;
 }catch(e){result.error=String(e)+'\n'+String(e.stack??'');result.failureState={state:player.state,diagnostics:player.diagnostics};await player.destroy().catch(()=>{});}
 status.textContent=`${key} / ${runtime}: ${result.passed?'passed':result.error}`;
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};

// A browser that lacks the inspected WebCodecs configuration must explain the
// pinned Hybrid rejection and retain a working Software route for the same file.
window.publicHybridRejectionCheck=async(key,runtime='asyncify')=>{
 const profile=(await(await fetch('/profiles')).json()).find(p=>p.key===key);
 if(!profile)throw Error('Unknown fixture');
 const result={key,runtime,scope:'Public Hybrid capability rejection and Software recovery',userAgent:navigator.userAgent,isolated:crossOriginIsolated,passed:false};
 const main=document.querySelector('main');main.replaceChildren();
 const player=new Player(main,{mode:'hybrid',remuxRuntime:runtime,assetBase:new URL('/',location.href).href,width:profile.width,height:profile.height});
 try{
  const file=new File([await(await fetch('/fixture/'+key)).blob()],key);
  try{await player.open(file);throw Error('Expected unsupported Hybrid configuration to reject');}
  catch(error){
   result.rejection={code:error.code,message:error.message};
   result.admission=player.diagnostics.planAdmission;
   const hybrid=result.admission.find(p=>p.id==='hybrid-private');
   if(error.code!=='UNSUPPORTED_FEATURE'||hybrid?.code!=='FEATURE_UNSUPPORTED'||!hybrid.reason.includes('Hybrid browser configuration unsupported')||error.message!==hybrid.reason)throw error;
  }
  await player.setMode('software');await player.open(file);await player.seek(.5);await player.play();await new Promise(r=>setTimeout(r,900));await player.pause();
  result.plan=player.diagnostics.plan;result.position=player.state.currentTime;
  if(result.plan.id!=='software-private'||result.position<1.1)throw Error('Software recovery did not advance');
  const backend=player.current.backend;await player.destroy();result.cleanup=backend.diagnostics.cleanup;result.audioState=backend.audioDiagnostics().state;
  if(result.audioState!=='closed'||result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24)throw Error('Recovery resources survived destruction');
  result.passed=true;
 }catch(error){result.error=String(error.stack??error);await player.destroy().catch(()=>{});}
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
