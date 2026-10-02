// SPDX-License-Identifier: Apache-2.0
// Evaluate this function in a browser page served from the repository root.
// Uses real backends and media; the dev server need not expose tests/ as modules.
export async function checkRuntimeBuffering(options={mode:'native'}) {
 const {Player}=await import('/web/generated/index.js');
 const host=document.createElement('div');document.body.append(host);
 const player=new Player(host,{assetBase:location.origin+'/',preview:false,...options});
 const assert=(value,message)=>{if(!value)throw Error(message);};
 try{
  const file=new File([await(await fetch('/fixtures/example.mp4')).blob()],'sample.mp4');
  await player.open(file);const source=player.state.sourceId,mode=player.state.activeMode,checks=[];
  for(const playing of [false,true]){
   if(playing)await player.play();
   for(const policy of [{preload:'metadata',profile:'low-latency'}, {preload:'auto',profile:'resilient',aheadSeconds:12,behindSeconds:2,memoryBudget:16*1024*1024},{}]){
    await player.setBuffering(policy);const report=player.getBuffering();
    assert(player.state.sourceId===source&&player.state.activeMode===mode,'Buffer update replaced source or mode');
    assert(!player.state.pendingOperation,'Buffer update left pending operation');
    assert(report.active&&report.requested.profile===(policy.profile??'balanced'),'Requested policy not reported');
    assert(player.state.playbackIntent===(playing?'play':'pause'),'Buffer update changed intent');
    if(report.effective.backend==='browser')assert(report.effective.settings.elementPreload===report.requested.preload,'Native hint not applied');
    if(report.effective.backend==='remux'&&policy.aheadSeconds)assert(report.effective.settings.effectiveForwardSeconds===12,'Remux scheduler not updated');
    checks.push({playing,report});
   }
  }
  await player.pause();return {pass:true,options,checks};
 }finally{await player.destroy();host.remove();}
}
