// SPDX-License-Identifier: Apache-2.0
// Test-only browser video + mpv AC-3 audio ownership and clock experiment.
const stage=document.querySelector('#stage');
let arm,player,video,backend,syncGain,running=false,baseRate=1,actualRate=1,lastAudio,lastFrame;
let errors=[],corrections=[],clockSamples=[],events=[],timer,controlTimer,commands=0,generation=0,phase='idle';
let sustained=0,releaseStreak=0,softActive=false,controllerBusy=false,transitionAt=0,lastConsumed=0,lastConsumeAt=0,drainStartEpoch=null;
const source=file=>new URL('/fixtures/'+file,location.href).href;
const wait=(predicate,timeout=15000)=>new Promise((resolve,reject)=>{const began=performance.now();const check=async()=>{
  try{if(await predicate()){resolve();return;}}catch(error){reject(error);return;}
  if(performance.now()-began>timeout)reject(Error('Timed out waiting for media state'));else setTimeout(check,50);};check();});
const fadeOut=async()=>{if(!syncGain)return;const t=backend.audioContext.currentTime;
  syncGain.gain.cancelScheduledValues(t);syncGain.gain.setValueAtTime(syncGain.gain.value,t);
  syncGain.gain.linearRampToValueAtTime(0,t+0.008);
  await new Promise(resolve=>setTimeout(resolve,12));};
const fadeIn=()=>{if(!syncGain)return;const t=backend.audioContext.currentTime;
  syncGain.gain.cancelScheduledValues(t);syncGain.gain.setValueAtTime(0,t);
  syncGain.gain.linearRampToValueAtTime(1,t+0.008);};
// mpv time-pos is its AO-compensated media clock. AO get_state includes native
// queued PCM and WebAudio base/output latency, so those delays must not be
// subtracted again. Extrapolation is bounded by fresh worklet consumption.
export function estimatedAudioPresentationTime(at=performance.now()){
  if(!lastAudio||!backend)return null;
  const h=backend.audioHeader,consumed=Atomics.load(h,5)>>>0;
  if(consumed!==lastConsumed){lastConsumed=consumed;lastConsumeAt=at;}
  const age=at-lastAudio.at;
  if(age>500)return null;
  const advancing=running&&backend.audioContext.state==='running'&&at-lastConsumeAt<150;
  return lastAudio.time+(advancing?Math.min(age,150)*actualRate/1000:0);
}
const syncSample=()=>{
  if(arm!=='C'||!video||!backend)return null;
  const at=performance.now(),observed=lastAudio?.time??null;
  const estimated=estimatedAudioPresentationTime(at),h=backend.audioHeader;
  const write=Atomics.load(h,0)>>>0,read=Atomics.load(h,1)>>>0;
  const queued=write>=read?write-read:null;
  const outputLatency=(backend.audioContext.baseLatency||0)+(backend.audioContext.outputLatency||0);
  const error=estimated===null?null:estimated-video.currentTime;
  const outputStamp=backend.audioContext.getOutputTimestamp?.();
  const sample={at,generation,phase,videoTime:video.currentTime,mpvObserved:observed,
    estimatedAudibleAudioTime:estimated,mpvClockEstimate:estimated,
    audioObservationAgeMs:lastAudio?at-lastAudio.at:null,errorMs:error===null?null:error*1000,
    lastFrameMediaTime:lastFrame?.mediaTime??null,lastFrameExpectedDisplayTime:lastFrame?.expectedDisplayTime??null,
    mediaFrames:Atomics.load(h,5),underruns:Atomics.load(h,6),preEofUnderruns:Atomics.load(h,8),
    postEofDrainCallbacks:Atomics.load(h,9),ringQueuedFrames:queued,
    estimatedWrittenPcmMediaPosition:estimated===null||queued===null?null:estimated+(queued/backend.audioContext.sampleRate+outputLatency)*actualRate,
    nativeEpoch:Atomics.load(h,3),ackEpoch:Atomics.load(h,4),lastConsumedGeneration:Atomics.load(h,11),
    lastConsumedEpoch:Atomics.load(h,13),permittedEpoch:Atomics.load(h,14),staleEpochRejects:Atomics.load(h,15),
    audioContextTime:backend.audioContext.currentTime,outputStamp,
    webAudioBaseLatency:backend.audioContext.baseLatency,webAudioOutputLatency:backend.audioContext.outputLatency,
    currentAudioRate:actualRate,videoRate:video.playbackRate};
  clockSamples.push(sample);if(clockSamples.length>3000)clockSamples.shift();return sample;
};
async function control(){
  const s=syncSample();if(!s)return;
  if(controllerBusy||!running||phase!=='playing'||s.errorMs===null||s.audioObservationAgeMs>250||video.seeking||video.ended){s.controllerDecision='ineligible';return;}
  const e=s.errorMs;
  sustained=Math.abs(e)>50?sustained+1:0;
  releaseStreak=Math.abs(e)<30?releaseStreak+1:0;
  if(sustained>=3)softActive=true;
  if(releaseStreak>=3)softActive=false;
  // Hysteresis avoids repeated speed commands around the 50 ms threshold.
  const trim=softActive?Math.max(-0.005,Math.min(0.005,-e/1000*0.1)):0;
  const target=baseRate*(1+trim);
  s.controllerDecision=trim?'hold-soft-speed':'deadband';
  if(Math.abs(target-actualRate)>0.001){controllerBusy=true;try{actualRate=target;await backend.rate(target);
    s.controllerDecision=trim?'apply-soft-speed':'release-soft-speed';
    corrections.push({at:s.at,generation,type:trim?'soft-speed':'release-speed',errorMs:e,rate:target});
  }finally{controllerBusy=false;}}
}
export async function start(id){
  if(player)throw Error('Already started');arm=id;errors=[];corrections=[];clockSamples=[];events=[];commands=0;lastAudio=null;lastFrame=null;running=false;actualRate=1;baseRate=1;generation=0;phase='startup';sustained=0;releaseStreak=0;softActive=false;lastConsumed=0;lastConsumeAt=0;drainStartEpoch=null;
  stage.replaceChildren();
  if(id==='C'){
    video=document.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
    video.src=source('h264-1080p60-video-only.mp4');stage.append(video);
    const onFrame=(_,meta)=>{lastFrame={mediaTime:meta.mediaTime,expectedDisplayTime:meta.expectedDisplayTime,
      presentedFrames:meta.presentedFrames};
      if(video&&Number.isFinite(video.duration)&&meta.mediaTime>=video.duration-0.2&&phase==='playing'){
        phase='drain';drainStartEpoch=Atomics.load(backend.audioHeader,3);Atomics.store(backend.audioHeader,7,1);
        events.push({name:'video-drain-window',at:performance.now(),time:meta.mediaTime});}
      if(video&&!video.ended)video.requestVideoFrameCallback(onFrame);};
    video.requestVideoFrameCallback(onFrame);
    for(const name of ['playing','pause','seeked','ended','waiting','stalled','ratechange'])video.addEventListener(name,()=>events.push({name,at:performance.now(),time:video.currentTime}));
    video.addEventListener('ended',()=>{running=false;phase='ended';
      if(drainStartEpoch===null)drainStartEpoch=Atomics.load(backend.audioHeader,3);
      Atomics.store(backend.audioHeader,7,2);
      const drain=async()=>{await wait(()=>Atomics.load(backend.audioHeader,0)===Atomics.load(backend.audioHeader,1),2000);
        Atomics.store(backend.audioHeader,2,0);await backend.pause();
        await wait(()=>Atomics.load(backend.audioHeader,3)!==drainStartEpoch&&
          Atomics.load(backend.audioHeader,3)===Atomics.load(backend.audioHeader,4),2000);
        await backend.audioContext.suspend();};
      drain().catch(error=>errors.push('EOF drain: '+String(error)));});
    globalThis.__selectiveAudioPoC=true;
    const {WasmPlayer}=await import('/demuxe/web/generated/internal/wasm-player.js');
    const hidden=document.createElement('canvas');hidden.width=1;hidden.height=1;
    backend=new WasmPlayer(hidden,{assetBase:new URL('/demuxe/',location.href),mode:'hybrid',audioOutput:'stereo'});
    backend.addEventListener('error',ev=>errors.push(String(ev.detail)));
    backend.addEventListener('mpv',ev=>{const e=ev.detail;if(e.event==='property-change'&&e.name==='time-pos'&&typeof e.data==='number')
      lastAudio={time:e.data,at:performance.now()};if(e.event==='end-file'){
        phase='drain';Atomics.store(backend.audioHeader,7,1);
        events.push({name:'mpv-end-file',at:performance.now(),reason:e.reason});}});
    await backend.ready;
    syncGain=backend.audioContext.createGain();syncGain.gain.value=0;
    backend.audioNode.disconnect(backend.audioContext.destination);
    backend.audioNode.connect(syncGain);syncGain.connect(backend.audioContext.destination);
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
    await Promise.all([video.play(),backend.play()]);
    Atomics.store(backend.audioHeader,14,Atomics.load(backend.audioHeader,3));
    Atomics.store(backend.audioHeader,12,1);fadeIn();running=true;phase='playing';
    timer=setInterval(syncSample,50);
    controlTimer=setInterval(()=>{control().catch(e=>errors.push(String(e)));},250);
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
    const q=video.getVideoPlaybackQuality();return {arm,started:true,route:'selective-sync-experiment',generation,phase,position:video.currentTime,
      duration:video.duration,paused:video.paused,ended:video.ended,video:{width:video.videoWidth,height:video.videoHeight,
       total:q.totalVideoFrames,dropped:q.droppedVideoFrames,readyState:video.readyState,currentSrc:video.currentSrc,
       frame:lastFrame},mpv:{videoParams:backend.properties.get('video-params')??null,
       videoCodec:backend.properties.get('video-codec')??null,audioCodec:backend.properties.get('audio-codec-name')??null,
       tracks:backend.properties.get('track-list')??null,pause:backend.properties.get('pause'),
       position:backend.properties.get('time-pos')??null,eof:backend.properties.get('eof-reached')??null,
       speed:backend.properties.get('speed')??null},worker:backend.diagnostics??null,
       audioOutput:backend.audioDiagnostics(),clock:clockSamples.at(-1)??syncSample(),
       corrections:corrections.slice(),events:events.slice(),commandCount:commands,
       preEofUnderruns:Atomics.load(backend.audioHeader,8),postEofDrainCallbacks:Atomics.load(backend.audioHeader,9),
       staleEpochRejects:Atomics.load(backend.audioHeader,15),lastConsumedGeneration:Atomics.load(backend.audioHeader,11),
       lastConsumedEpoch:Atomics.load(backend.audioHeader,13),permittedEpoch:Atomics.load(backend.audioHeader,14),
       canvasCount:stage.querySelectorAll('canvas').length,webCodecsDecodeWorker:false,errors:errors.slice()};
  }
  const state=player.state,d=player.diagnostics,el=stage.querySelector('video');const q=el?.getVideoPlaybackQuality();
  return {arm,started:true,route:d?.plan?.id??state.activeMode,position:state.currentTime,duration:state.duration,paused:state.paused,
    video:el?{width:el.videoWidth,height:el.videoHeight,total:q?.totalVideoFrames,dropped:q?.droppedVideoFrames}:null,
    diagnostics:d,audioOutput:player.current?.backend?.audioDiagnostics?.()??null,
    mpv:{videoParams:player.current?.backend?.properties?.get('video-params')??null,
      audioCodec:player.current?.backend?.properties?.get('audio-codec-name')??null},errors:errors.slice()};
}
export async function pause(){if(arm==='C'){
  running=false;phase='paused';await fadeOut();Atomics.store(backend.audioHeader,12,0);video.pause();await backend.pause();
  events.push({name:'pause-gated',at:performance.now(),generation});
 }else await player.pause();return snapshot();}
export async function resume(){if(arm==='C'){
  await Promise.all([backend.play(),video.play()]);Atomics.store(backend.audioHeader,12,1);
  fadeIn();running=true;phase='playing';sustained=0;events.push({name:'resume-published',at:performance.now(),generation});
 }else await player.play();return snapshot();}
export async function seek(seconds){if(arm==='C'){
  const wasRunning=running,oldEpoch=Atomics.load(backend.audioHeader,3),at=performance.now();
  running=false;phase='seeking';await fadeOut();generation++;sustained=0;releaseStreak=0;softActive=false;
  drainStartEpoch=null;Atomics.store(backend.audioHeader,7,0);
  Atomics.store(backend.audioHeader,12,0);Atomics.store(backend.audioHeader,10,generation);
  video.pause();await backend.pause();lastAudio=null;lastFrame=null;
  if(backend.audioContext.state==='suspended')await backend.audioContext.resume();
  const seeked=new Promise(resolve=>video.addEventListener('seeked',resolve,{once:true}));
  video.currentTime=seconds;
  await Promise.all([seeked,backend.seek(seconds)]);commands++;
  await wait(()=>Atomics.load(backend.audioHeader,3)!==oldEpoch&&
    Atomics.load(backend.audioHeader,3)===Atomics.load(backend.audioHeader,4),5000);
  await backend.play();
  await wait(async()=>await backend.confirmSeek(seconds),5000);
  await wait(()=>lastFrame&&Math.abs(lastFrame.mediaTime-seconds)<0.1,3000);
  if(wasRunning)await video.play();else await backend.pause();
  Atomics.store(backend.audioHeader,14,Atomics.load(backend.audioHeader,3));
  Atomics.store(backend.audioHeader,12,wasRunning?1:0);if(wasRunning)fadeIn();running=wasRunning;phase=wasRunning?'playing':'paused';
  corrections.push({at,generation,type:'user-seek',target:seconds,oldEpoch,newEpoch:Atomics.load(backend.audioHeader,3),
    publicationBlockedMs:performance.now()-at,paused:!wasRunning});
 }else await player.seek(seconds);return snapshot();}
export async function rate(value){if(arm==='C'){
  const at=performance.now(),oldEpoch=Atomics.load(backend.audioHeader,3),previous=baseRate;
  if(!Number.isFinite(value)||value<0.5||value>2)throw Error('Invalid rate');
  let anchor;const wasRunning=running;
  running=false;phase='rate-transition';await fadeOut();Atomics.store(backend.audioHeader,12,0);
  video.pause();await backend.pause();anchor=video.currentTime;
  sustained=0;releaseStreak=0;softActive=false;baseRate=value;actualRate=value;transitionAt=at;
  video.playbackRate=value;await backend.rate(value);commands++;
  // mpv's AO clock did not converge after a direct speed change (see raw
  // no-seek rate run). Use exactly one generation-scoped audio reset.
  generation++;Atomics.store(backend.audioHeader,10,generation);lastAudio=null;
  await backend.seek(anchor);commands++;
  await wait(()=>Atomics.load(backend.audioHeader,3)!==oldEpoch&&
    Atomics.load(backend.audioHeader,3)===Atomics.load(backend.audioHeader,4),5000);
  await backend.play();await wait(async()=>await backend.confirmSeek(anchor),5000);
  if(wasRunning)await video.play();else await backend.pause();
  Atomics.store(backend.audioHeader,14,Atomics.load(backend.audioHeader,3));
  Atomics.store(backend.audioHeader,12,wasRunning?1:0);if(wasRunning)fadeIn();running=wasRunning;phase=wasRunning?'playing':'paused';
  corrections.push({at,generation,type:'user-rate',previous,rate:value,oldEpoch,
    newEpoch:Atomics.load(backend.audioHeader,3),seek:true,seekTarget:anchor,
    commandMs:performance.now()-at});
 }else await player.setPlaybackRate(value);return snapshot();}
export function samples(){return clockSamples.slice();}
export async function stop(){clearInterval(timer);clearInterval(controlTimer);timer=null;controlTimer=null;running=false;
  if(player){if(arm==='C'){video?.pause();await backend.destroy();syncGain?.disconnect();syncGain=null;video?.remove();video=null;backend=null;}
   else await player.destroy();}
  player=null;stage.replaceChildren();return {stopped:true,errors};}
window.poc={start,snapshot,pause,resume,seek,rate,samples,stop};
