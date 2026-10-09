// SPDX-License-Identifier: Apache-2.0
// Evaluate this function in a browser page served from the repository root.
// Uses real backends and media; the dev server need not expose tests/ as modules.
export async function checkRuntimeBuffering(options={mode:'native'}) {
 const {Player}=await import('/web/generated/index.js');
 const host=document.createElement('div');document.body.append(host);
 const player=new Player(host,{assetBase:location.origin+'/',preview:false,...options});
 const assert=(value,message)=>{if(!value)throw Error(message);};
 let phase='open';const started=performance.now(),events=[];
 for(const name of ['play','pause','playing','waiting','stalled','error'])player.addEventListener(name,()=>events.push({name,at:performance.now()-started,time:player.state.currentTime}));
 try{
  const file=new File([await(await fetch('/fixtures/example.mp4')).blob()],'sample.mp4');
  await player.open(file);const source=player.state.sourceId,mode=player.state.activeMode,checks=[];
  for(const playing of [false,true]){
   if(playing){phase='first-play';await player.play();}
   for(const policy of [{preload:'metadata',profile:'low-latency'}, {preload:'auto',profile:'resilient',aheadSeconds:12,behindSeconds:2,memoryBudget:16*1024*1024},{}]){
    phase=JSON.stringify({playing,policy});await player.setBuffering(policy);const report=player.getBuffering();
    assert(player.state.sourceId===source&&player.state.activeMode===mode,'Buffer update replaced source or mode');
    assert(!player.state.pendingOperation,'Buffer update left pending operation');
    assert(report.active&&report.requested.profile===(policy.profile??'balanced'),'Requested policy not reported');
    assert(player.state.playbackIntent===(playing?'play':'pause'),'Buffer update changed intent');
    if(report.effective.backend==='browser')assert(report.effective.settings.elementPreload===report.requested.preload,'Native hint not applied');
    if(report.effective.backend==='remux'&&policy.aheadSeconds)assert(report.effective.settings.effectiveForwardSeconds===12,'Remux scheduler not updated');
    checks.push({playing,report});
   }
  }
  await player.pause();return {pass:true,options,checks,elapsedMs:performance.now()-started,events,capability:player.current?.backend?.diagnostics?.capability};
 }catch(error){
  const backend=player.current?.backend,video=backend?.video;
  const evidence={phase,elapsedMs:performance.now()-started,events,state:player.state,diagnostics:backend?.diagnostics,video:video?{time:video.currentTime,paused:video.paused,seeking:video.seeking,ended:video.ended,readyState:video.readyState,networkState:video.networkState,preload:video.preload,width:video.videoWidth,height:video.videoHeight,rendered:video.getVideoPlaybackQuality().totalVideoFrames,audioBytes:video.webkitAudioDecodedByteCount}:null};
  throw Error(String(error)+'\nBUFFERING_DIAGNOSTICS '+JSON.stringify(evidence),{cause:error});
 }finally{await player.destroy();host.remove();}
}
