// SPDX-License-Identifier: Apache-2.0
import {Player} from '/web/generated/index.js';
import {NativePlayer} from '/web/generated/internal/native-player.js';
import {ShakaBackend} from '/web/generated/internal/shaka-backend.js';
import {WasmPlayer} from '/web/generated/internal/wasm-player.js';
import {PrivateSoftwarePlayer} from '/web/generated/internal/private-software-player.js';
import {PreviewController} from '/web/generated/preview/controller.js';
import {bufferingPolicy} from '/web/generated/internal/buffering.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function deadline(work,ms,label){let timer;try{return await Promise.race([work,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' timed out')),ms))]);}finally{clearTimeout(timer);}}
async function until(check,ms,label){const end=performance.now()+ms;while(!check()){if(performance.now()>end)throw Error(label+' timed out');await sleep(20);}}
const evidence=backend=>({class:backend.constructor.name,plan:backend.planId??backend.diagnostics?.plan??null,decoder:backend.diagnostics?.decoder??backend.diagnostics?.decoderBackend??null,runtime:backend.options?.runtime??backend.remuxRuntime??null,rendered:backend.diagnostics?.rendered??null});
async function raster(blob){
 const image=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;
 const context=canvas.getContext('2d');context.drawImage(image,0,0,160,90);image.close();
 const pixels=context.getImageData(8,8,16,16).data,sum=[0,0,0];for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)sum[c]+=pixels[i+c];
 const rgb=sum.map(v=>Math.round(v/(pixels.length/4)));
 document.querySelector('#previews').append(canvas);
 const dataURL=canvas.toDataURL('image/png');return {rgb,dataURL,width:160,height:90};
}
function sample(player){const v=player.surface,d=player.current.backend.diagnostics;return {wall:performance.now(),time:player.state.currentTime,rendered:v instanceof HTMLVideoElement?v.getVideoPlaybackQuality().totalVideoFrames:d?.rendered??null,dropped:v instanceof HTMLVideoElement?v.getVideoPlaybackQuality().droppedVideoFrames:null};}
function delta(a,b){return {wallMs:b.wall-a.wall,mediaSeconds:b.time-a.time,rendered:a.rendered===null||b.rendered===null?null:b.rendered-a.rendered,dropped:a.dropped===null||b.dropped===null?null:b.dropped-a.dropped};}

// Experimental factory consumes the accepted backend identity. It never calls
// Player.create/select/replace, and owns all preview seeks and decoder teardown.
function previewFactory(primary,source,kind){
 const accepted=primary.current.backend,identity=evidence(accepted),base=new URL('/',location.href);
 let backend,video,canvas,opening,disposed=false,disposal,notifyStarted;
 const started=new Promise(resolve=>notifyStarted=resolve);
 const buffer=bufferingPolicy({preload:'auto',profile:'low-latency',memoryBudget:8*1024*1024});
 async function open(time){
  if(disposed)throw new DOMException('Disposed','AbortError');
  video=document.createElement('video');video.muted=true;video.playsInline=true;video.width=160;video.height=90;
  canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;
  if(identity.class==='NativePlayer'){
   const remux=!['direct','direct-mpv'].includes(identity.plan);
   backend=new NativePlayer(video,remux?'always':'never',base,false,undefined,undefined,false,[],remux?'native-remux':'native-direct',buffer,8000,undefined,primary.remuxRuntime);
  }else if(identity.class==='ShakaBackend')backend=new ShakaBackend(video,base,buffer);
  else if(identity.class==='PrivateSoftwarePlayer')backend=new PrivateSoftwarePlayer(canvas,{runtime:identity.runtime,mode:primary.mode,assetBase:base,buffering:buffer,videoTrack:primary.sourceInspection?.probe.tracks.find(t=>t.type==='video'&&!t.attachedPicture)});
  else if(identity.class==='WasmPlayer')backend=new WasmPlayer(canvas,{mode:primary.mode,assetBase:base,buffering:buffer,videoTrack:primary.sourceInspection?.probe.tracks.find(t=>t.type==='video'&&!t.attachedPicture)});
  else throw Error('No factory for '+identity.class);
  notifyStarted();
  await backend.ready;
  const software=backend instanceof WasmPlayer||backend instanceof PrivateSoftwarePlayer;
  if(software){await backend.command('set','pause','yes');await backend.command('set','aid','no');await backend.command('set','sid','no');if(backend instanceof WasmPlayer){await backend.command('set','vd-lavc-threads','1');if(primary.mode!=='hybrid')await backend.command('set','start',String(time));}}
  const presentation=backend instanceof WasmPlayer?backend.waitForPreviewPresentation():null;presentation?.catch(()=>{});
  if(source instanceof File)await backend.open(source);else await backend.openRemote(source);
  if(presentation){await presentation;await backend.waitForPreviewMetadata();}
  if(backend instanceof ShakaBackend)await until(()=>video.readyState>=2&&!video.seeking,5000,'Shaka initial presentation');
 }
 const api={
  id:'accepted-route-experiment',priority:1,requiresDecoder:kind!=='shaka-authored',allowDuringPlayback:true,
  started,
  canHandle:()=>true,
  async getFrame(request){
   if(kind==='shaka-authored')return accepted.previewFrame(request);
   request.signal.throwIfAborted();const abort=()=>{const cleanup=api.destroy();request.trackCleanup?.(cleanup);void cleanup.catch(()=>{});};request.signal.addEventListener('abort',abort,{once:true});
   try{const start=performance.now(),cold=!opening;
   if(!opening)opening=open(request.time);await opening;request.signal.throwIfAborted();
   const initialized=performance.now();
   if(backend instanceof WasmPlayer||backend instanceof PrivateSoftwarePlayer){
    if(!cold||primary.mode==='hybrid'||backend instanceof PrivateSoftwarePlayer)await backend.seek(request.time);
    const picture=await backend.previewSnapshot();request.signal.throwIfAborted();
    return {time:picture.time,width:picture.width,height:picture.height,image:{blob:new Blob([picture.blob],{type:picture.blob.type})},path:primary.mode+'-'+identity.class,metrics:{decoderInitializationMs:cold?initialized-start:0,frameDecodeMs:performance.now()-initialized},experiment:{cold,identity:evidence(backend)}};
   }
   await backend.seek(request.time);
   if(backend instanceof NativePlayer)await backend.verifyStartup({video:true,audio:false});
   await until(()=>!video.seeking&&video.readyState>=2,4000,'preview frame');
   const context=canvas.getContext('2d');context.drawImage(video,0,0,160,90);
   const blob=await new Promise((resolve,reject)=>{try{canvas.toBlob(resolve,'image/png');}catch(e){reject(e);}});if(!blob)throw Error('Empty snapshot');
   request.signal.throwIfAborted();return {time:Number(backend.properties.get('time-pos')),width:160,height:90,image:{blob},path:identity.class+'-'+identity.plan,metrics:{decoderInitializationMs:cold?initialized-start:0,seekMs:performance.now()-initialized},experiment:{cold,identity:evidence(backend)}};
   }finally{request.signal.removeEventListener('abort',abort);}
  },
  get identity(){return backend?evidence(backend):identity;},
  destroy(){disposed=true;return disposal??(disposal=(async()=>{await backend?.destroy();video?.remove();canvas?.remove();})());},
 };
 return api;
}

export async function runCase(config){
 document.querySelector('#status').textContent=JSON.stringify(config);document.querySelector('#previews').replaceChildren();
 const result={config,userAgent:navigator.userAgent,isolated:crossOriginIsolated,started:new Date().toISOString(),frames:[],errors:[],checks:{}};
 let player,provider,controller;const owners=document.querySelectorAll('iframe').length;
 try{
  const isShaka=config.path.startsWith('shaka'),file=config.path==='software'?'software.mkv':config.path==='remux'?'movie.mkv':isShaka?'dash/'+(config.path==='shaka-authored'?'images.mpd':'main.mpd'):'movie.mp4';
  const url=new URL('/media/'+file,config.crossOrigin?location.origin.replace('127.0.0.1','localhost'):location.origin);url.searchParams.set('case',config.id);url.searchParams.set('lane','playback');if(config.crossOrigin)url.searchParams.set('cors','allow');
  if(config.auth)url.searchParams.set('auth','required');
  let source=config.remote?{url:url.href,...isShaka?{format:'dash'}:{},...config.path==='remux'||config.path==='software'||config.path==='hybrid'?{immutable:true}:{}}:new File([await(await fetch(url)).blob()],file);
  if(config.auth)source.headers={Authorization:'Bearer preview-experiment'};
  const mode=['hybrid','software'].includes(config.path)?config.path:'native';
  player=new Player(document.querySelector('#surface'),{mode,automaticSelection:false,nativeRemux:config.path==='remux'?'always':'never',remuxRuntime:config.runtime??'off',preview:false,startupEscalation:false,experimentalMpvSubtitles:false});
  window.primary=player;
  await deadline(source instanceof File?player.open(source):player.openRemote(source),25000,'primary open');
  const accepted=player.current.backend;
  result.accepted=evidence(accepted);result.selectedRuntime=player.remuxRuntime;result.selectedMode=player.mode;
  result.checks.routeMatches=config.path==='direct'?result.accepted.class==='NativePlayer'&&result.accepted.plan==='direct':config.path==='remux'?result.accepted.class==='NativePlayer'&&result.accepted.plan==='remux':isShaka?result.accepted.class==='ShakaBackend':player.mode===config.path;
  if(!result.checks.routeMatches)throw Error('Requested route was not accepted: '+JSON.stringify(result.accepted));
  await player.play();await until(()=>player.state.currentTime>.25,6000,'primary advancing');
  const baselineStart=sample(player);await sleep(1200);result.baseline=delta(baselineStart,sample(player));
  if(config.productionBaseline){player.preview.enabled=true;const start=performance.now(),frame=await player.preview.getFrame({time:6,width:160,height:90});result.productionPreview={path:frame?.path??null,latencyMs:performance.now()-start,diagnostics:player.preview.diagnostics};player.preview.enabled=false;}
  // Continue the established baseline playback; a primary seek would introduce
  // its own buffering/startup work into the thumbnail measurement.
  if(!(source instanceof File)){const u=new URL(source.url);u.searchParams.set('lane','preview');source={...source,url:u.href};}
  provider=previewFactory(player,source,config.path);
  const generate=provider.getFrame.bind(provider);provider.getFrame=async request=>{try{const frame=await generate(request);result.rawFrame=frame?{time:frame.time,width:frame.width,height:frame.height,path:frame.path,bytes:frame.image?.blob?.size}:null;return frame;}catch(error){result.providerError=String(error?.stack??error);throw error;}};
  controller=new PreviewController([provider],{debounceMs:0,timeoutMs:15000,bucketSeconds:0});controller.setPlaybackActive(true);
  let seeks=0;player.addEventListener('seeking',()=>seeks++);player.addEventListener('error',event=>result.errors.push(String(event.detail?.message??event.detail??event)));
  const interval=[];const sampler=setInterval(()=>interval.push(sample(player)),50),duringStart=sample(player);
  try{
   for(const target of [10,18,12]){
    const before=performance.now(),frame=await deadline(controller.getFrame({time:target,width:160,height:90}),16000,'preview request');
    if(!frame)throw Error('No frame: '+JSON.stringify(controller.diagnostics));
    const latencyMs=performance.now()-before,visual=await raster(frame.image.blob),expected=target<16?1:2;
    const correctColor=visual.rgb[expected]>170&&visual.rgb.filter((_,i)=>i!==expected).every(v=>v<70);
    result.frames.push({target,time:frame.time,path:frame.path,latencyMs,metrics:frame.metrics,identity:provider.identity,correctColor,...visual});
   }
   const hit=await controller.getFrame({time:10,width:160,height:90});result.cache={hit:hit?.cache,ms:hit?.metrics.totalMs};
   await sleep(Math.max(300,1200-(performance.now()-duringStart.wall)));result.during=delta(duringStart,sample(player));
  }finally{clearInterval(sampler);result.playbackSamples=interval;}
  result.previewIdentity=provider.identity;result.checks.colors=result.frames.every(f=>f.correctColor);result.checks.timestamps=result.frames.every(f=>Math.abs(f.time-f.target)<.25);result.checks.primaryUnchanged=player.current.backend===accepted&&seeks===0;result.checks.playbackAdvances=result.during.mediaSeconds>.1;result.checks.noPrimaryErrors=result.errors.length===0;result.checks.cache=result.cache.hit==='hit';result.primarySeekEvents=seeks;
  result.checks.previewEngineMatches=result.previewIdentity.class===result.accepted.class&&(!['hybrid','software'].includes(config.path)||result.previewIdentity.decoder===(config.path==='hybrid'?'webcodecs':'software'));
  result.checks.playbackKeepsPace=result.during.mediaSeconds/(result.during.wallMs/1000)>.8;
  // Verify that a request cancellation remains local to the preview controller.
  const abort=new AbortController();abort.abort();const cancelled=await controller.getFrame({time:20,signal:abort.signal}).catch(e=>e.name);result.checks.preabort=cancelled==='AbortError';
  if(config.lifecycle&&config.path!=='shaka-authored'){
   controller.destroy();await provider.destroy();provider=previewFactory(player,source,config.path);controller=new PreviewController([provider],{debounceMs:0,timeoutMs:15000});controller.setPlaybackActive(true);
   const cancel=new AbortController(),work=controller.getFrame({time:20,signal:cancel.signal}).catch(error=>error.name);
   await deadline(provider.started,5000,'cancellation decoder allocation');const before=sample(player);cancel.abort();const outcome=await work;await provider.destroy();await controller.drain();await sleep(400);
   result.cancellation={outcome,playback:delta(before,sample(player)),identityUnchanged:player.current.backend===accepted,seekEvents:seeks};
   result.checks.midflightAbort=outcome==='AbortError'&&result.cancellation.identityUnchanged&&seeks===0&&result.cancellation.playback.mediaSeconds>.1;
  }
  result.status=Object.values(result.checks).every(Boolean)?'pass':'fail';
 }catch(error){result.status='fail';result.failure=String(error?.stack??error);if(player)result.lastPrimary={state:player.state,backend:evidence(player.current?.backend??{})};}
 finally{
  controller?.destroy();try{await deadline(provider?.destroy()??Promise.resolve(),6000,'preview destroy');}catch(e){result.cleanupError=String(e);result.status='fail';}
  try{await deadline(player?.destroy()??Promise.resolve(),6000,'primary destroy');}catch(e){result.cleanupError=String(e);result.status='fail';}
  await sleep(100);result.ownersAfter=document.querySelectorAll('iframe').length;result.checks.noIframeLeaks=result.ownersAfter===owners;if(!result.checks.noIframeLeaks)result.status='fail';
 }
 document.querySelector('#status').textContent=JSON.stringify(result,null,2);return result;
}
