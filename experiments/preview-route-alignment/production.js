// SPDX-License-Identifier: Apache-2.0
import {Player} from '/web/generated/index.js';
import {playWithGesture} from './gesture.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,ms,label){const end=performance.now()+ms;while(!check()){if(performance.now()>end)throw Error(label+' timed out');await sleep(20);}}
function sample(p){const v=p.surface;return {wall:performance.now(),time:p.state.currentTime,rendered:v instanceof HTMLVideoElement?v.getVideoPlaybackQuality().totalVideoFrames:p.current.backend.diagnostics?.rendered??null,dropped:v instanceof HTMLVideoElement?v.getVideoPlaybackQuality().droppedVideoFrames:null};}
const delta=(a,b)=>({wallMs:b.wall-a.wall,mediaSeconds:b.time-a.time,rendered:a.rendered===null||b.rendered===null?null:b.rendered-a.rendered,dropped:a.dropped===null||b.dropped===null?null:b.dropped-a.dropped});
async function raster(blob){const image=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);image.close();const pixels=ctx.getImageData(8,8,16,16).data,sum=[0,0,0];for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)sum[c]+=pixels[i+c];const rgb=sum.map(v=>Math.round(v/(pixels.length/4)));document.querySelector('#previews').append(canvas);return {rgb,dataURL:canvas.toDataURL('image/png')};}
export async function runCase(config){
 const result={config,production:true,userAgent:navigator.userAgent,isolated:crossOriginIsolated,started:new Date().toISOString(),frames:[],errors:[],checks:{}};let player;const stage=name=>console.debug('preview-stage '+JSON.stringify({case:config.id,stage:name,time:player?.state.currentTime}));const owners=document.querySelectorAll('iframe').length;
 document.querySelector('#previews').replaceChildren();document.querySelector('#status').textContent=JSON.stringify(config);
 try{
  const shaka=config.path.startsWith('shaka'),file=config.file??(config.path==='software'?'software.mkv':config.path==='remux'?'movie.mkv':shaka?'dash-av/'+(config.path==='shaka-authored'?'images.mpd':'main.mpd'):'movie.mp4');
  const url=new URL('/media/'+file,config.crossOrigin?location.origin.replace('127.0.0.1','localhost'):location.origin);url.searchParams.set('case',config.id);if(config.crossOrigin)url.searchParams.set('cors','allow');if(config.auth)url.searchParams.set('auth','required');if(config.throttle)url.searchParams.set('slow','yes');
  const source=config.remote?{url:url.href,...shaka?{format:'dash'}:{},...['remux','hybrid','software'].includes(config.path)?{immutable:true}:{},...config.auth?{headers:{Authorization:'Bearer preview-experiment'}}:{}}:new File([await(await fetch(url)).blob()],file);
  const mode=['hybrid','software'].includes(config.path)?config.path:'native';
  player=new Player(document.querySelector('#surface'),{mode,automaticSelection:false,nativeRemux:config.path==='remux'?'always':'never',remuxRuntime:config.runtime??'off',preview:{debounceMs:0,bucketSeconds:0,timeoutMs:15000,duringPlayback:config.duringPlayback??'auto'},startupEscalation:false,experimentalMpvSubtitles:false});window.primary=player;
  stage('opening');await (source instanceof File?player.open(source):player.openRemote(source));
  stage('opened');const accepted=player.current.backend;result.accepted={class:accepted.constructor.name,plan:accepted.planId??accepted.diagnostics?.plan,mode:player.mode};
  let seeks=0;player.addEventListener('seeking',()=>seeks++);player.addEventListener('error',e=>result.errors.push(String(e.detail?.message??e.detail)));
  await playWithGesture(player);await until(()=>player.state.currentTime>.25,6000,'primary advancing');const before=sample(player);await sleep(1200);result.baseline=delta(before,sample(player));
  const samples=[],timer=setInterval(()=>samples.push(sample(player)),50),start=sample(player);
  try{
   for(const target of [10,18,12]){stage('preview-'+target);
    const begin=performance.now(),frame=await player.preview.getFrame({time:target,width:160,height:90});
    if(!frame){result.emptyPreview=player.preview.diagnostics;throw Error('No production preview');}
    const latencyMs=performance.now()-begin,visual=await raster(frame.image.blob),expected=target<16?1:2;
    result.frames.push({target,time:frame.time,path:frame.path,width:frame.width,height:frame.height,latencyMs,metrics:frame.metrics,correctColor:visual.rgb[expected]>170&&visual.rgb.filter((_,i)=>i!==expected).every(v=>v<70),...visual});
   }
   const hit=await player.preview.getFrame({time:10,width:160,height:90});result.cache={hit:hit?.cache,ms:hit?.metrics.totalMs};await sleep(Math.max(300,1200-(performance.now()-start.wall)));result.during=delta(start,sample(player));
  }finally{clearInterval(timer);result.playbackSamples=samples;}
  const expectedPath=config.path==='direct'?'native-direct':config.path==='remux'?'native-remux':config.path==='shaka-authored'?'shaka-image-track':config.path==='shaka-generated'?'shaka-generated':config.path+'-'+(config.runtime==='jspi'||config.runtime==='asyncify'?config.runtime:'pthread');
  Object.assign(result.checks,{routeMatches:player.mode===mode,previewEngineMatches:result.frames.every(f=>f.path===expectedPath),colors:result.frames.every(f=>f.correctColor),dimensions:result.frames.every(f=>f.width===(config.expectedWidth??160)&&f.height===(config.expectedHeight??90)),timestamps:result.frames.every(f=>Math.abs(f.time-f.target)<.25),primaryUnchanged:player.current.backend===accepted&&seeks===0,noPrimaryErrors:result.errors.length===0,cache:result.cache.hit==='hit',playbackKeepsPace:result.during.mediaSeconds/(result.during.wallMs/1000)>.8});
  stage('cancellation');player.preview.clear();const cancel=new AbortController(),work=player.preview.getFrame({time:20,signal:cancel.signal}).catch(e=>e.name);await sleep(5);cancel.abort();result.cancellation=await work;result.checks.cancellation=result.cancellation==='AbortError'||result.cancellation?.image!==undefined;result.checks.abortIsolated=player.current.backend===accepted&&seeks===0;
  result.status=Object.values(result.checks).every(Boolean)?'pass':'fail';
 }catch(error){result.status='fail';result.error={name:error?.name,code:error?.code,message:error?.message};result.failure=String(error?.stack??error);if(player)result.lastPrimary={state:player.state,plan:player.current?.backend.planId};}
 finally{stage('destroying');try{await player?.destroy();}catch(e){result.cleanupError=String(e);result.status='fail';}await sleep(100);result.checks.noIframeLeaks=document.querySelectorAll('iframe').length===owners;if(!result.checks.noIframeLeaks)result.status='fail';}
 document.querySelector('#status').textContent=JSON.stringify(result,null,2);return result;
}
export async function runMatrix(configs){window.batch=[];for(const config of configs){window.running=config.id;const r=await runCase(config);await fetch('/receipt',{method:'POST',body:JSON.stringify(r)});window.batch.push({id:config.id,status:r.status,failure:r.failure,checks:r.checks,latencies:r.frames.map(f=>Math.round(f.latencyMs))});}window.running=null;return window.batch;}
