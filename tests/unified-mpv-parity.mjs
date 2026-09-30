// SPDX-License-Identifier: Apache-2.0
// Compare deterministic rendering with the retained four-engine package.
export async function capture({bundleName,delivery,file,options,subtitle}){
 const bundle=await import('/'+bundleName+'/demuxe.mjs'),runtime=delivery==='embedded'?await bundle.createDemuxeRuntime():undefined,Player=runtime?.api.Player??bundle.Player;
 const host=document.createElement('div');host.style.cssText='width:320px;height:180px';document.body.append(host);
 const player=new Player(host,{assetBase:runtime?.assetBase??bundle.assetBase,preview:false,...options});
 try{
  const bytes=await(await fetch('/fixtures/'+file)).arrayBuffer();await player.open(new File([bytes],file));
  if(subtitle){const track=player.state.subtitleTracks[0];if(!track)throw Error('Subtitle track absent');await player.selectSubtitleTrack(track.id);await player.subtitleVisible(true);}
  await player.play();const until=performance.now()+15000;while(player.state.currentTime<.6&&performance.now()<until)await new Promise(r=>setTimeout(r,25));if(player.state.currentTime<.6)throw Error('Playback stalled');await player.pause();await new Promise(r=>setTimeout(r,100));
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const context=canvas.getContext('2d');context.drawImage(player.surface,0,0,160,90);const rgba=context.getImageData(0,0,160,90).data;
  if(!rgba.some((v,i)=>i%4!==3&&v>60))throw Error('Black frame');
  return {rgba:Array.from(rgba),plan:player.getPlaybackExplanation().planId,diagnostics:player.diagnostics};
 }finally{await player.destroy();runtime?.dispose();host.remove();}
}
export function compare(a,b){
 let max=0,total=0,changed=0;for(let i=0;i<a.length;i++){if(i%4===3)continue;const delta=Math.abs(a[i]-b[i]);max=Math.max(max,delta);total+=delta;if(delta>3)changed++;}
 return {max,mean:total/(a.length*.75),changedFraction:changed/(a.length*.75)};
}
