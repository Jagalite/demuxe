// SPDX-License-Identifier: Apache-2.0
window.runResumeProbe=async kind=>{
   const delay=ms=>new Promise(r=>setTimeout(r,ms));
   const blob=new File([await(await fetch(window.fixtureProbeURL??'/fixtures/example.mp4')).arrayBuffer()],'example.mp4');
   const traces=[],events=[],commands=[];let p,v,url,loopTimer;
   const plain=kind.startsWith('plain');
   if(plain){v=document.createElement('video');v.style.width='640px';v.style.height='360px';v.preload='auto';v.muted=kind.includes('muted');document.querySelector('#host').append(v);url=URL.createObjectURL(blob);v.src=kind.includes('http')?'/fixtures/example.mp4':url;v.load();await new Promise((r,j)=>{v.addEventListener('loadeddata',r,{once:true});v.addEventListener('error',j,{once:true});});}
   else {const {Player}=await import('/web/generated/index.js');p=new Player(document.querySelector('#host'),{mode:'native',preview:{debounceMs:0}});await p.open(blob);v=p.surface;await p.setLoop({start:0,end:10});}
   const ranges=r=>Array.from({length:r.length},(_,i)=>[r.start(i),r.end(i)]);
   const state=()=>({at:performance.now(),time:v.currentTime,paused:v.paused,ended:v.ended,seeking:v.seeking,ready:v.readyState,network:v.networkState,frames:v.getVideoPlaybackQuality().totalVideoFrames,dropped:v.getVideoPlaybackQuality().droppedVideoFrames,buffered:ranges(v.buffered),seekable:ranges(v.seekable),error:v.error?{code:v.error.code,message:v.error.message}:null,preload:v.preload,muted:v.muted,rate:v.playbackRate,player:p?{status:p.state.status,intent:p.state.playbackIntent,pending:p.state.pendingOperation}:null});
   for(const name of ['play','playing','pause','waiting','stalled','seeking','seeked','canplay','canplaythrough','ended','error','suspend','emptied','loadeddata'])v.addEventListener(name,()=>events.push({event:name,...state()}));
   const sampler=setInterval(()=>traces.push(state()),100);
   const bounded=async(promise,ms)=>{let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Probe deadline')),ms))]);}finally{clearTimeout(timer);}};
   const observe=async()=>{const start=v.currentTime,frames=v.getVideoPlaybackQuality().totalVideoFrames;for(let n=0;n<(kind.includes('longwait')?800:100);n++){if(v.currentTime>start+.02&&v.readyState>=3&&v.getVideoPlaybackQuality().totalVideoFrames>frames)return;await delay(25);}throw Error('Plain output stalled');};
   const run=async(name,target,action)=>{const before=state();try{await bounded(action(),kind.includes('longwait')?24000:12000);commands.push({name,target,before,after:state(),passed:true});}catch(e){commands.push({name,target,before,after:state(),passed:false,error:String(e),code:e.code});throw e;}};
   let failure,rescue;
   try{
    await run('initial-play',0,async()=>{if(p)await p.play();else{await v.play();await observe();}});
    if(plain)loopTimer=setInterval(()=>{if(v.currentTime>=10){v.currentTime=0;}},25);
    await delay(kind.includes('cold')?0:30000);
    if(loopTimer)clearInterval(loopTimer);if(p)await p.setLoop(false);
    for(const target of (kind.includes('single9')?[9]:[1,5,9])){
     await run('pause',target,async()=>p?await p.pause():v.pause());
     await run('seek',target,async()=>{if(p)await p.seek(target);else await new Promise(r=>{v.addEventListener('seeked',r,{once:true});v.currentTime=target;});});
     if(kind.includes('settled'))await delay(250);
     await run('play',target,async()=>{if(p)await p.play();else{await v.play();await observe();}});
    }
   }catch(e){failure=String(e);await delay(3000);if(kind.includes('muterescue')){rescue={before:state()};v.muted=true;await delay(500);rescue.muted=state();v.muted=false;await delay(500);rescue.unmuted=state();}if(kind.includes('reseekrescue')){rescue={before:state()};v.currentTime=9;await delay(1000);rescue.after=state();}}
   const final=state();clearInterval(sampler);clearInterval(loopTimer);
   if(p)await p.destroy();else{v.pause();v.removeAttribute('src');v.load();v.remove();URL.revokeObjectURL(url);}
   return {failure,rescue,commands,events,traces,final};
  };
