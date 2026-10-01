// SPDX-License-Identifier: MIT
window.reviewCheck=async(runtime='asyncify',mode='software',modular=false,fault='')=>{
 const result={runtime,mode,modular,fault,userAgent:navigator.userAgent,isolated:crossOriginIsolated,passed:false};
 const base=new URL(modular?`/providers-${runtime}/`:'/',location.href),main=document.querySelector('main');main.replaceChildren();
 const urls=new Set(),original=URL.createObjectURL,revoke=URL.revokeObjectURL;
 URL.createObjectURL=function(...args){const url=original.apply(this,args);urls.add(url);return url;};
 URL.revokeObjectURL=function(url){urls.delete(url);return revoke.call(this,url);};
 let player;
 try{
  await fetch('/fault?file='+encodeURIComponent(fault));
  const {Player}=await import(new URL('index.js',base));
  player=new Player(main,{mode,remuxRuntime:runtime,assetBase:base.href,width:320,height:180});
  const file=new File([await(await fetch('/fixture')).blob()],'fixture.mkv');
  if(fault){
   try{await player.open(file);throw Error('Corrupt provider asset was accepted');}
   catch(error){result.rejection=error.toJSON?.();if(error.code!=='ASSET_LOAD_FAILED')throw error;}
  }else{
   await player.open(file);
   result.plan=player.diagnostics.plan.id;result.seekable=player.state.seekable;
   if(result.plan!==mode+'-private'||!result.seekable?.some(range=>range.start===0&&range.end>=5.9))throw Error('Missing public seekable timeline');
   if(player.capabilities.features.seek.availability!=='available')throw Error('Seek capability not available');
   await player.setPlaybackRange({start:0,end:3});
   await player.setLoop({start:.5,end:2});
   result.range=player.state.playbackRange;result.loop=player.state.loop;
   if(result.range?.end!==3||result.loop?.end!==2)throw Error('Range or loop was not committed');
   await player.setLoop(false);await player.setPlaybackRange(null);await player.setLoop(true);await player.setLoop(false);
   await player.seek(1);result.seekPosition=player.state.currentTime;if(Math.abs(result.seekPosition-1)>.15)throw Error('Public seek failed');
   await player.play();const deadline=performance.now()+3000;while(player.state.currentTime<1.2&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,25));
   if(player.state.currentTime<1.2)throw Error('Playback did not progress');await player.pause();
  }
  await player.destroy();player=undefined;
  result.survivingBlobURLs=urls.size;if(urls.size)throw Error('Verified glue Blob URL leaked');
  result.passed=true;
 }catch(error){result.error=String(error)+'\n'+error.stack;}
 finally{await player?.destroy().catch(error=>result.cleanupError=String(error));await fetch('/fault?file=');URL.createObjectURL=original;URL.revokeObjectURL=revoke;}
 document.querySelector('#status').textContent=JSON.stringify(result);
 await fetch('/result',{method:'POST',body:JSON.stringify(result)});return result;
};
