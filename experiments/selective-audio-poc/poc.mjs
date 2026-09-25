// SPDX-License-Identifier: Apache-2.0
// Test-only browser video + mpv AC-3 audio ownership and clock experiment.
const stage=document.querySelector('#stage');
let arm,player,video,backend,running=false,baseRate=1,actualRate=1,lastAudio,lastFrame;
let errors=[],corrections=[],clockSamples=[],events=[],timer,commands=0;
const source=file=>new URL('/fixtures/'+file,location.href).href;
const wait=(predicate,timeout=15000)=>new Promise((resolve,reject)=>{const began=performance.now();const check=async()=>{
  try{if(await predicate()){resolve();return;}}catch(error){reject(error);return;}
  if(performance.now()-began>timeout)reject(Error('Timed out waiting for media state'));else setTimeout(check,50);};check();});
const syncSample=()=>{
  if(arm!=='C'||!video||!backend)return null;
  const at=performance.now(),observed=lastAudio?.time??null;
  const estimated=observed===null?null:observed+(running?(at-lastAudio.at)*actualRate/1000:0);
  const error=estimated===null?null:estimated-video.currentTime;
  const sample={at,videoTime:video.currentTime,mpvObserved:observed,mpvClockEstimate:estimated,
    audioObservationAgeMs:lastAudio?at-lastAudio.at:null,errorMs:error===null?null:error*1000,
    lastFrameMediaTime:lastFrame?.mediaTime??null,lastFrameExpectedDisplayTime:lastFrame?.expectedDisplayTime??null,
    mediaFrames:backend.audioDiagnostics().mediaFrames,underruns:backend.audioDiagnostics().underruns,
    currentAudioRate:actualRate,videoRate:video.playbackRate};
  clockSamples.push(sample);if(clockSamples.length>3000)clockSamples.shift();return sample;
};
async function control(){
  const s=syncSample();if(!running||s?.errorMs===null||s.audioObservationAgeMs>500||video.seeking||video.ended)return;
  const e=s.errorMs/1000;
  // Small rate trim. Explicit user seeks are the only hard seeks.
  const target=Math.abs(e)>0.045?baseRate*(1-Math.max(-0.02,Math.min(0.02,e*0.25))):baseRate;
  if(Math.abs(target-actualRate)>0.003){actualRate=target;await backend.rate(target);corrections.push({at:s.at,type:'rate',errorMs:s.errorMs,rate:target});}
}
export async function start(id){
  if(player)throw Error('Already started');arm=id;errors=[];corrections=[];clockSamples=[];events=[];commands=0;lastAudio=null;lastFrame=null;running=false;actualRate=1;baseRate=1;
  stage.replaceChildren();
  if(id==='C'){
    video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
    video.src=source('h264-1080p60-video-only.mp4');stage.append(video);
    const onFrame=(_,meta)=>{lastFrame={mediaTime:meta.mediaTime,expectedDisplayTime:meta.expectedDisplayTime,
      presentedFrames:meta.presentedFrames};if(video&&!video.ended)video.requestVideoFrameCallback(onFrame);};
    video.requestVideoFrameCallback(onFrame);
    for(const name of ['playing','pause','seeked','ended','waiting','stalled','ratechange'])video.addEventListener(name,()=>events.push({name,at:performance.now(),time:video.currentTime}));
    video.addEventListener('ended',()=>{running=false;Atomics.store(backend.audioHeader,2,0);
      backend.pause().then(()=>backend.audioContext.suspend()).catch(error=>errors.push(String(error)));});
    globalThis.__selectiveAudioPoC=true;
    const {WasmPlayer}=await import('/demuxe/web/generated/internal/wasm-player.js');
    const hidden=document.createElement('canvas');hidden.width=1;hidden.height=1;
    backend=new WasmPlayer(hidden,{assetBase:new URL('/demuxe/',location.href),mode:'hybrid',audioOutput:'stereo'});
    backend.addEventListener('error',ev=>errors.push(String(ev.detail)));
    backend.addEventListener('mpv',ev=>{const e=ev.detail;if(e.event==='property-change'&&e.name==='time-pos'&&typeof e.data==='number')
      lastAudio={time:e.data,at:performance.now()};if(e.event==='end-file')events.push({name:'mpv-end-file',at:performance.now(),reason:e.reason});});
    await backend.ready;
    await backend.command('set','vid','no');commands++;
    await backend.command('set','sid','no');commands++;
    const response=await fetch(source('h264-1080p60-ac3.mkv'));if(!response.ok)throw Error('AC-3 source fetch failed');
    const file=new File([await response.arrayBuffer()],'h264-1080p60-ac3.mkv');
    await backend.openLocal(file,{});commands++;
    await wait(()=>backend.properties.get('audio-codec-name')&&Array.isArray(backend.properties.get('track-list')));
    const tracks=backend.properties.get('track-list');
    if(tracks.some(t=>t.type==='video'&&t.selected))throw Error('mpv video track selected despite vid=no');
    if(!tracks.some(t=>t.type==='audio'&&t.selected))throw Error('mpv audio track not selected');
    await wait(()=>video.readyState>=2);
    await Promise.all([video.play(),backend.play()]);running=true;
    timer=setInterval(()=>{control().catch(e=>errors.push(String(e)));},250);
    player={kind:'selective',destroy:()=>backend.destroy()};
  }else{
    const {Player}=await import('/demuxe/web/generated/index.js');
    player=new Player(stage,{assetBase:'/demuxe/',width:960,height:540,...(id==='B'?{mode:'hybrid'}:{})});
    player.addEventListener('error',ev=>errors.push(String(ev.detail??ev)));
    await player.ready;
    await player.open(source(id==='A'?'h264-1080p60-aac.mkv':'h264-1080p60-ac3.mkv'));
    await player.play();
  }
  return snapshot();
}
export function snapshot(){
  if(!player)return {arm,started:false,errors};
  if(arm==='C'){
    const q=video.getVideoPlaybackQuality();return {arm,started:true,route:'selective-poc',position:video.currentTime,
      duration:video.duration,paused:video.paused,ended:video.ended,video:{width:video.videoWidth,height:video.videoHeight,
       total:q.totalVideoFrames,dropped:q.droppedVideoFrames,readyState:video.readyState,currentSrc:video.currentSrc,
       frame:lastFrame},mpv:{videoParams:backend.properties.get('video-params')??null,
       videoCodec:backend.properties.get('video-codec')??null,audioCodec:backend.properties.get('audio-codec-name')??null,
       tracks:backend.properties.get('track-list')??null,pause:backend.properties.get('pause'),
       position:backend.properties.get('time-pos')??null,eof:backend.properties.get('eof-reached')??null,
       speed:backend.properties.get('speed')??null},worker:backend.diagnostics??null,
       audioOutput:backend.audioDiagnostics(),clock:clockSamples.at(-1)??syncSample(),
       corrections:corrections.slice(),events:events.slice(),commandCount:commands,
       canvasCount:stage.querySelectorAll('canvas').length,webCodecsDecodeWorker:false,errors:errors.slice()};
  }
  const state=player.state,d=player.diagnostics,el=stage.querySelector('video');const q=el?.getVideoPlaybackQuality();
  return {arm,started:true,route:d?.plan?.id??state.activeMode,position:state.currentTime,duration:state.duration,paused:state.paused,
    video:el?{width:el.videoWidth,height:el.videoHeight,total:q?.totalVideoFrames,dropped:q?.droppedVideoFrames}:null,
    diagnostics:d,audioOutput:player.current?.backend?.audioDiagnostics?.()??null,
    mpv:{videoParams:player.current?.backend?.properties?.get('video-params')??null,
      audioCodec:player.current?.backend?.properties?.get('audio-codec-name')??null},errors:errors.slice()};
}
export async function pause(){if(arm==='C'){running=false;await Promise.all([backend.pause(),Promise.resolve(video.pause())]);}else await player.pause();return snapshot();}
export async function resume(){if(arm==='C'){await Promise.all([backend.play(),video.play()]);running=true;}else await player.play();return snapshot();}
export async function seek(seconds){if(arm==='C'){running=false;video.pause();await backend.pause();
  lastFrame=null;const seeked=new Promise(resolve=>video.addEventListener('seeked',resolve,{once:true}));video.currentTime=seconds;
  await Promise.all([seeked,backend.seek(seconds)]);commands++;lastAudio=null;
  await wait(()=>lastFrame&&Math.abs(lastFrame.mediaTime-seconds)<0.1,3000);
  await Promise.all([backend.play(),video.play()]);running=true;
  await wait(async()=>await backend.confirmSeek(seconds),5000);
 }else await player.seek(seconds);return snapshot();}
export async function rate(value){if(arm==='C'){
  const wasRunning=running,at=performance.now();
  if(wasRunning){running=false;video.pause();await backend.pause();}
  const anchor=video.currentTime;
  baseRate=value;actualRate=value;video.playbackRate=value;await backend.rate(value);commands++;
  await backend.seek(anchor);commands++;lastAudio=null;
  corrections.push({at,type:'rate-transition-seek',rate:value,target:anchor,pausedBoth:wasRunning});
  if(wasRunning){await Promise.all([backend.play(),video.play()]);running=true;
    await wait(async()=>await backend.confirmSeek(anchor),5000);}
 }else await player.setPlaybackRate(value);return snapshot();}
export function samples(){return clockSamples.slice();}
export async function stop(){clearInterval(timer);timer=null;running=false;
  if(player){if(arm==='C'){video?.pause();await backend.destroy();video?.remove();video=null;backend=null;}
   else await player.destroy();}
  player=null;stage.replaceChildren();return {stopped:true,errors};}
window.poc={start,snapshot,pause,resume,seek,rate,samples,stop};
