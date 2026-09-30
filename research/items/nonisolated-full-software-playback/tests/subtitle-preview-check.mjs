// SPDX-License-Identifier: MIT
import {Player} from '/web/generated/index.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const pixels=player=>player.surface.getContext('2d').getImageData(0,0,320,180).data;
function difference(a,b){let count=0,magenta=0;for(let i=0;i<a.length;i+=4){if(Math.max(...[0,1,2].map(c=>Math.abs(a[i+c]-b[i+c])))>30){count++;if(a[i]>140&&a[i+1]<95&&a[i+2]>140)magenta++;}}return {count,magenta};}
window.subtitleCheck=async(key,runtime='jspi',mode='software')=>{
 const profile=(await(await fetch('/profiles')).json()).find(p=>p.key===key),result={key,runtime,mode,scope:'Public embedded subtitle ownership and bitmap reference qualification',isolated:crossOriginIsolated,passed:false,checks:[]};
 const host=document.createElement('div');document.querySelector('main').replaceChildren(host);const player=new Player(host,{mode,remuxRuntime:runtime,width:320,height:180,assetBase:new URL('/',location.href).href});
 try{
  await player.open(new File([await(await fetch('/fixture/'+key)).blob()],key));const backend=player.current.backend;result.tracks=player.state.subtitleTracks;
  if(result.tracks.length!==profile.subtitleTracks)throw Error('Embedded subtitle inventory mismatch');
  for(const seconds of [1,35.9,.1,1]){
   await player.subtitleVisible(false);await player.seek(seconds);await sleep(100);const clear=pixels(player);
   await player.subtitleVisible(true);await player.seek(seconds);await sleep(100);const shown=pixels(player),diff=difference(shown,clear);result.checks.push({seconds,...diff});
   const expected=profile.bitmap?seconds<35.3:seconds>=.5&&seconds<35.8;
   if(expected?diff.count<100:diff.count!==0)throw Error('Embedded cue visibility or expiry mismatch');
   if(expected&&['pgs','vobsub','ass'].includes(key)&&diff.magenta<500)throw Error('Marked subtitle palette/shape missing');
   if(profile.bitmap&&seconds===1){const ref=new Uint8Array(await(await fetch('/reference/'+key)).arrayBuffer());let sum=0;for(let i=0;i<ref.length;i++)sum+=Math.abs(shown[Math.floor(i/3)*4+i%3]-ref[i]);result.checks.at(-1).referenceMAE=sum/ref.length;if(sum/ref.length>5)throw Error('Independent bitmap picture mismatch');}
  }
  await player.selectSubtitleTrack(null);await player.seek(1);await sleep(100);const disabled=pixels(player);
  await player.selectSubtitleTrack(result.tracks[0].id);await player.seek(1);await sleep(100);const selected=pixels(player);result.selected=difference(selected,disabled);if(result.selected.count<100)throw Error('Subtitle selection did not restore cue');
  if(profile.subtitleTracks>1){await player.selectSubtitleTrack(result.tracks[1].id);await player.seek(1);await sleep(100);result.alternate=difference(pixels(player),selected);if(result.alternate.count<100)throw Error('Alternate embedded subtitle did not change text');}
  await player.destroy();result.cleanup=backend.diagnostics.cleanup;if(result.cleanup.scheduler.liveTasks||result.cleanup.scheduler.freeSlots!==24)throw Error('Subtitle cleanup failed');result.passed=true;
 }catch(error){result.error=String(error.stack??error);result.diagnostics=player.current?.backend?.diagnostics;await player.destroy().catch(e=>result.cleanupError=String(e));}
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
