// SPDX-License-Identifier: MIT
import {Player} from '/web/generated/index.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),live=new Set(),NativeWorker=Worker;
globalThis.Worker=class extends NativeWorker{constructor(...args){super(...args);live.add(this);}terminate(){live.delete(this);return super.terminate();}};
window.isolatedCheck=async(mode='software',presenter='rgb',cache='no')=>{
 const key='h264-dual-audio',result={key,mode,presenter,cache,isolated:crossOriginIsolated,userAgent:navigator.userAgent,scope:'Isolated pthread EOF track-switch regression with independent RGB references',passed:false,tracks:[]};
 const host=document.createElement('div');document.querySelector('main').replaceChildren(host);
 const player=new Player(host,{mode,remuxRuntime:'auto',softwarePresenter:presenter,assetBase:new URL('/',location.href).href,width:320,height:180});let backend;
 try{
  if(!crossOriginIsolated)throw Error('Isolated regression requires COOP/COEP');
  await player.open(new File([await(await fetch('/fixture/'+key)).blob()],'dual.mkv'));backend=player.current.backend;
  result.plan=player.diagnostics.plan.id;result.runtime=player.diagnostics.remuxRuntime.runtime;
  if(result.runtime!=='pthread'||result.plan.includes('private'))throw Error('Wrong regression engine');
  await backend.command('set','cache',cache);
  const reference=new Uint8Array(await(await fetch('/reference/'+key)).arrayBuffer());
  const tracks=backend.properties.get('track-list').filter(track=>track.type==='audio');if(tracks.length!==2)throw Error('Expected dual audio');
  for(const track of tracks){
   await player.selectTrack('audio',String(track.id));await player.seek(0);await sleep(200);
   const row={id:track.id,pausedPosition:player.state.currentTime};result.tracks.push(row);
   const snapshot=await player.snapshot(),bitmap=await createImageBitmap(snapshot.blob),canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const context=canvas.getContext('2d');context.drawImage(bitmap,0,0,320,180);bitmap.close();const pixels=context.getImageData(0,0,320,180).data;
   let sum=0;for(let i=0;i<320*180*3;i++)sum+=Math.abs(pixels[Math.floor(i/3)*4+i%3]-reference[i]);row.firstPictureMAE=sum/(320*180*3);
   if(row.pausedPosition>.15||row.firstPictureMAE>5)throw Error('EOF track switch discarded the initial picture');
   await player.play();await sleep(600);row.firstProgress=player.state.currentTime;row.audio=player.audioDiagnostics();
   if(row.firstProgress<.25||row.firstProgress>1.2||row.audio.rms<.001)throw Error('Track start timeline/audio mismatch');
   const started=performance.now();while(!backend.properties.get('eof-reached')&&performance.now()-started<8500)await sleep(100);
   row.eof=backend.properties.get('eof-reached');row.position=player.state.currentTime;if(!row.eof)throw Error('Track did not reach EOF');await player.pause();
  }
  await player.destroy();await sleep(150);result.liveWorkers=live.size;result.audioState=backend.audioDiagnostics().state;
  if(result.liveWorkers||result.audioState!=='closed'||host.querySelectorAll('canvas,video').length)throw Error('Isolated cleanup mismatch');result.passed=true;
 }catch(error){result.error=String(error.stack??error);result.diagnostics=player.diagnostics;await player.destroy().catch(e=>result.cleanupError=String(e));}
 await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
