// SPDX-License-Identifier: Apache-2.0
import {Player} from '/web/generated/index.js';
import {playWithGesture} from './gesture.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check){const end=performance.now()+8000;while(!check()){if(performance.now()>end)throw Error('Playback did not advance');await sleep(20);}}
async function raster(blob){const bitmap=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,160,90);bitmap.close();const pixels=ctx.getImageData(8,8,16,16).data,rgb=[0,0,0];for(let i=0;i<pixels.length;i++)if(i%4<3)rgb[i%4]+=pixels[i]/256;return{rgb:rgb.map(Math.round),dataURL:canvas.toDataURL('image/png')};}
export async function runGuards(configs){window.guardBatch=[];for(const config of configs){window.running=config.id;const result={config,kind:'policy-guard',frames:[],checks:{},errors:[]};let player,refreshes=0;const initialOwners=document.querySelectorAll('iframe').length;
 try{
  const software=config.path==='software',url=new URL('/media/'+(config.file??'movie.mkv'),location.href);url.searchParams.set('case',config.id);if(config.expire)url.searchParams.set('auth','required');
  const source={url:url.href,immutable:true,...config.expire?{headers:{Authorization:'Bearer preview-experiment'},refreshAuthorization:async()=>{refreshes++;return {headers:{Authorization:'Bearer preview-experiment'}};}}:{}};
  const preview={duringPlayback:config.policy??'auto',debounceMs:0,bucketSeconds:0,timeoutMs:20000};
  player=new Player(document.querySelector('#surface'),{mode:software?'software':'native',automaticSelection:false,nativeRemux:software?'never':'always',remuxRuntime:'off',preview,startupEscalation:false,experimentalMpvSubtitles:false});
  if(config.mutatePolicy)preview.duringPlayback='allow';
  await player.openRemote(source);await playWithGesture(player);await until(()=>player.state.currentTime>.25);const backend=player.current.backend;result.accepted={class:backend.constructor.name,plan:backend.planId??backend.diagnostics?.plan};let seeks=0;player.addEventListener('seeking',()=>seeks++);player.addEventListener('error',e=>result.errors.push(String(e.detail)));
  if(config.expire)await fetch('/authorization?deny=yes&case='+config.id,{method:'POST'});
  const before=player.state.currentTime,declined=await player.preview.getFrame({time:10,width:160,height:90});result.checks.declines=declined===null;result.checks.noRefresh=refreshes===0;
  if(config.expire)await fetch('/authorization?deny=no&case='+config.id,{method:'POST'});
  await sleep(400);result.checks.playbackUnaffected=player.current.backend===backend&&player.state.currentTime>before&&seeks===0&&result.errors.length===0;
  await player.pause();
  for(const target of [10,18,12]){const start=performance.now(),frame=await player.preview.getFrame({time:target,width:160,height:90});if(!frame)throw Error('Paused/restored preview unavailable');const visual=await raster(frame.image.blob);result.frames.push({target,time:frame.time,path:frame.path,latencyMs:performance.now()-start,metrics:frame.metrics,...visual});}
  await playWithGesture(player);result.checks.cacheDuringPlayback=(await player.preview.getFrame({time:10,width:160,height:90}))?.cache==='hit';result.checks.noPreviewSeek=seeks===0;
  result.status=Object.values(result.checks).every(Boolean)?'pass':'fail';
 }catch(e){result.status='fail';result.error={name:e.name,code:e.code,message:e.message};result.failure=String(e.stack??e);if(player)result.lastPrimary={state:player.state,diagnostics:player.diagnostics};}
 finally{try{await player?.destroy();}catch(e){result.cleanupError=String(e);result.status='fail';}await sleep(100);result.checks.noIframeLeaks=document.querySelectorAll('iframe').length===initialOwners;if(!result.checks.noIframeLeaks)result.status='fail';}
 await fetch('/receipt',{method:'POST',body:JSON.stringify(result)});window.guardBatch.push({id:config.id,status:result.status,failure:result.failure,checks:result.checks});}
 window.running=null;return window.guardBatch;}
