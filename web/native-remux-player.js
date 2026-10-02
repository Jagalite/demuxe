// SPDX-License-Identifier: Apache-2.0
import {runtimeWorker} from './generated/internal/runtime-worker.js';
import {initialRemuxLifecycle,transitionRemuxLifecycle,remuxGenerationCurrent,remuxRestartCurrent,remuxRecoveryCurrent,remuxAcceptedGeneration} from './generated/internal/machine/remux-lifecycle.js';
import {remuxForwardSeconds,remuxStartupCoverage,remuxPlaybackEnded,selectRemuxPumpHead,selectRemuxPump,selectRemuxPumpContinuation,selectRemuxWindowResume,selectRemuxBufferedSeek} from './generated/internal/machine/remux-scheduling.js';
import {WorkerRemuxController,workerMSEAvailable} from './worker-remux-controller.js';
// The same Native scheduler can own MSE in a window or a dedicated worker.
// Demux/mux and bounded source reads always remain separate workers.
const byteLength=value=>Array.isArray(value)?value.reduce((n,b)=>n+b.byteLength,0):value?.byteLength||0;
export function windowedBrowserSupported(ua=globalThis.navigator?.userAgent??''){return /Chrome\//.test(ua)&&!/Firefox|Edg\/|OPR\/|Android|Mobile/.test(ua);}
export class RemuxPlayer {
 constructor(video,{bufferedSeeks=false,audioAdaptation,buffering,mseOwner='auto',fragmentDelivery='separate',runtime='pthread',compiledWasm,attachMedia}={}){
  if(runtime==='pthread'&&globalThis.crossOriginIsolated&&mseOwner!=='window'&&!audioAdaptation&&workerMSEAvailable())return new WorkerRemuxController(video,{compiledWasm,bufferedSeeks,audioAdaptation,buffering,fragmentDelivery},()=>new RemuxPlayer(video,{compiledWasm,bufferedSeeks,audioAdaptation,buffering,mseOwner:'window',fragmentDelivery}));
  this.runtime=runtime;this.compiledWasm=compiledWasm;this.attachMedia=attachMedia;this.fragmentDelivery=fragmentDelivery;
  this.audioAdaptation=audioAdaptation;
  this.bufferedSeeks=bufferedSeeks&&typeof video.requestVideoFrameCallback==='function';
  this.video=video;this.timelineBias=1;this.lifecycle=initialRemuxLifecycle();this.transitionLifecycle({type:'buffering',policy:buffering});this.stats={fragments:[],generatedBytes:0,discardedBytes:0,peakQueueDepth:0,bufferedBytesUpperBound:0,peakBufferedBytesUpperBound:0,peakBufferedSeconds:0,seeks:[],sessions:[],errors:[],workers:0,recoveries:[],gapSkips:[]};
  this.bufferResources=new Map();this.updateResources=new Map();this.sourceStats={};this.remuxStats={};this.timer=setInterval(()=>this.pump(),50);
 }
 get generation(){return this.lifecycle.generation;}
 get bufferState(){return this.lifecycle.buffer;}
 get schedule(){return this.lifecycle.schedule;}
 get target(){return this.schedule.target;}
 get windowed(){return this.schedule.windowed;}
 get presentationFloor(){return this.schedule.presentationFloor;}
 get primeVideo(){return this.schedule.primeVideo;}
 get trackBounds(){return this.schedule.trackBounds??undefined;}
 get raps(){return this.schedule.raps;}
 get buffering(){return this.schedule.buffering;}
 transitionSchedule(command,generation=this.generation){return this.transitionLifecycle({type:'schedule',generation,command}).schedule??{accepted:false};}
 get busy(){return this.bufferState.busy;}
 get pulling(){return this.bufferState.pull!==null;}
 get pullId(){return this.bufferState.pull;}
 get pending(){return this.bufferState.pending;}
 get delivery(){return this.bufferState.delivery;}
 get eof(){return this.bufferState.eof;}
 get segments(){return this.bufferState.segments;}
 get headerAccepted(){return this.bufferState.headerAccepted;}
 transitionBuffer(command,generation=this.generation){const result=this.transitionLifecycle({type:'buffer',generation,command});return result.buffer??{accepted:false};}
 setBusy(value,generation=this.generation){return this.transitionBuffer({type:'busy',value},generation).accepted;}
 takeBuffers(type){const result=this.transitionBuffer({type});if(!result.accepted)return null;return result.resources.map(resource=>{const value=this.bufferResources.get(resource.id);this.bufferResources.delete(resource.id);return value;});}
 acceptFragment(data,generation=this.generation){
  const part=data.type==='fragment-part',parts=part?[data.buffer]:(data.parts??[]),buffers=part?[]:(data.buffers??[data.buffer]);
  const result=this.transitionBuffer(part?{type:'part',pullId:data.id,bytes:byteLength(data.buffer),updating:this.sbs.some(sb=>sb.updating)}:{type:'fragment',pullId:data.id,parts:parts.map(byteLength),buffers:buffers.map(byteLength),more:!!data.more,updating:this.sbs.some(sb=>sb.updating)},generation);
  if(!result.accepted){if(result.error)this.fail(result.error,undefined,generation);return false;}
  (part?result.resources:result.parts).forEach((resource,index)=>this.bufferResources.set(resource.id,parts[index]));
  if(!part)result.buffers.forEach((resource,index)=>this.bufferResources.set(resource.id,buffers[index]));
  this.stats.peakDeliveryParts=Math.max(this.stats.peakDeliveryParts||0,this.delivery.length);
  this.stats.generatedBytes+=byteLength(parts);return true;
 }

 get stopped(){return this.lifecycle.stopped;}
 get starting(){return this.lifecycle.starting;}
 get targetReady(){return this.lifecycle.targetReady;}
 get failedGeneration(){return this.lifecycle.failedGeneration;}
 get acceptedGeneration(){return this.lifecycle.acceptedGeneration;}
 get recoveryAttempts(){return this.lifecycle.recoveryAttempts;}
 get recoveryPlaying(){return this.lifecycle.playing;}
 transitionLifecycle(command){
  const before=this.lifecycle,result=transitionRemuxLifecycle(before,command);this.lifecycle=result.state;
  // One detached diagnostic snapshot survives logical retirement until resource cleanup.
  if(command.type!=='buffer'&&before.buffer!==result.state.buffer&&(before.buffer.segments.length||before.buffer.pending||before.buffer.delivery.length))this.retiredBuffer=before.buffer;
  return result;
 }
 generationCurrent(generation){return remuxGenerationCurrent(this.lifecycle,generation);}
 assertGeneration(generation){if(!this.generationCurrent(generation))throw new DOMException('Superseded','AbortError');}
 setPlaybackIntent(playing){return this.transitionLifecycle({type:'intent',playing:!!playing}).accepted===true;}
 async open(source,target=0){
  if(this.runtime==='pthread'&&!globalThis.crossOriginIsolated)throw Error('Remux requires cross-origin isolation');
  const opened=this.transitionLifecycle({type:'open'});if(opened.error)throw Error(opened.error);
  if(this.source&&(this.source.file!==source.file||this.source.options?.url!==source.options?.url)){this.identity=undefined;this.duration=undefined;}
  this.source=source;return this.restart(target);
 }
 async restart(target,recoveryId){
  const decision=this.transitionLifecycle({type:'restart',target,duration:this.duration,recoveryId});
  if(decision.error)throw Error(decision.error);if(decision.aborted)throw new DOMException('Superseded','AbortError');
  const serial=decision.restartId;
  try{
   for(;;){
    try{return await this.start(target,new Set(this.lifecycle.rejected),serial);}catch(error){
     if(!remuxRestartCurrent(this.lifecycle,serial))throw error;
     this.stopWorkers();
     const retry=this.transitionLifecycle({type:'retry',restartId:serial,mime:this.mime});
     if(!retry.retry)throw error;
    }
   }
  }finally{this.transitionLifecycle({type:'settle',restartId:serial});}
 }
 async start(target,rejected=new Set(),restartId=this.lifecycle.restartId){
  const oldGeneration=this.generation,decision=this.transitionLifecycle({type:'begin',restartId});
  if(decision.error)throw Error(decision.error);if(decision.aborted)throw new DOMException('Superseded','AbortError');
  const begun=performance.now(),generation=decision.generation;this.stopWorkers(undefined,oldGeneration);this.assertGeneration(generation);
  this.capability={};
  this.sbs=[];this.bufferResources=new Map();this.updateResources=new Map();
  this.failureError=undefined;this.stats.errors=[];this.stats.seeks.push({target,started:begun});if(this.stats.seeks.length>64)this.stats.seeks.shift();this.frames=[];this.muxedFrames=false;this.sourceStats={};this.remuxStats={};
  this.video.pause();this.assertGeneration(generation);this.video.removeAttribute('src');this.assertGeneration(generation);this.video.load();this.assertGeneration(generation);
  const oldURL=this.objectURL;this.objectURL=null;if(oldURL)URL.revokeObjectURL(oldURL);this.assertGeneration(generation);
  this.media=new MediaSource();if(this.attachMedia)this.attachMedia(this.media);else{this.objectURL=URL.createObjectURL(this.media);this.video.src=this.objectURL;}this.assertGeneration(generation);
  await new Promise((resolve,reject)=>{
   const media=this.media;
   const finish=error=>{clearTimeout(timer);media.removeEventListener('sourceopen',opened);if(this.cancelWait===cancel)this.cancelWait=null;error?reject(error):resolve();};
   const opened=()=>finish(),cancel=error=>finish(error);
   const timer=setTimeout(()=>finish(Error('MSE sourceopen timeout')),10000);
   this.cancelWait=cancel;media.addEventListener('sourceopen',opened,{once:true});
  });
  this.assertGeneration(generation);
  this.mailbox=this.runtime==='pthread'?new SharedArrayBuffer(64+262144):null;const channel=this.runtime==='pthread'?null:new MessageChannel();this.sourcePort=channel?.port2;this.sourceWorker=runtimeWorker(new URL('./native-remux-source-worker.js',import.meta.url),{type:'module'});this.stats.workers++;
  const ready=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>finish(Error('Remux source initialization timed out')),10000);
   let settled=false;
   const finish=(error,data)=>{if(settled)return;settled=true;clearTimeout(timer);if(this.cancelWait===cancel)this.cancelWait=null;error?reject(error):resolve(data);};
   const sourceWorker=this.sourceWorker,sourceDescriptor=this.source;
   const cancel=error=>finish(error);this.cancelWait=cancel;this.watchWorker(sourceWorker,generation,'source');sourceWorker.onmessage=({data})=>{if(!this.generationCurrent(generation))return;if(data.type==='refresh'){Promise.resolve().then(()=>{this.assertGeneration(generation);if(!sourceDescriptor.refreshAuthorization)throw Error('Authorization refresh unavailable');return sourceDescriptor.refreshAuthorization(data.resource);}).then(update=>{if(this.generationCurrent(generation))sourceWorker.postMessage({type:'refreshed',update});},error=>{if(this.generationCurrent(generation))sourceWorker.postMessage({type:'refreshed',error:String(error)});});}if(data.type==='ready')finish(null,data);if(data.type==='stats')this.sourceStats=data.stats;if(data.type==='error'){const message='Source transport: '+data.message;finish(Error(message));this.fail(message,undefined,generation);}};
   const {refreshAuthorization,...source}=sourceDescriptor;this.assertGeneration(generation);sourceWorker.postMessage({type:'init',mailbox:this.mailbox,port:channel?.port1,...source,identity:this.identity},channel?[channel.port1]:[]);
  });
  this.assertGeneration(generation);
  this.identity??=ready.identity;this.total=ready.size;this.worker=runtimeWorker(new URL('./native-remux-worker.js',import.meta.url),{type:'module'});this.stats.workers++;this.watchWorker(this.worker,generation,'mux');
  this.cancelWait=null;const session={generation,target,sourceSize:ready.size,firstPlayableMs:null,firstPlayableSourceBytes:null};this.stats.sessions.push(session);if(this.stats.sessions.length>64)this.stats.sessions.shift();
  this.worker.onmessage=({data})=>{
   if(!this.generationCurrent(generation)){this.stats.discardedBytes+=byteLength(data.parts??data.buffers??data.buffer);return;}
   if(data.type==='error'){this.fail(data.message,undefined,generation);return;}
   if(Number.isFinite(data.producedAt)){(this.stats.producerDispatchLatencyMs??=[]).push(Math.max(0,performance.timeOrigin+performance.now()-data.producedAt));if(this.stats.producerDispatchLatencyMs.length>256)this.stats.producerDispatchLatencyMs.shift();}
   if(data.type==='fragment-part'){
    if(this.acceptFragment(data,generation))this.pump();return;
   }
   if(data.type==='log'){(this.logs??=[]).push(data.message);if(this.logs.length>32)this.logs.shift();return;}
   if(data.type==='fragment'&&!this.acceptFragment(data,generation))return;
   if(data.type==='ready'){const header=this.transitionBuffer({type:'header'},generation);if(!header.accepted){if(header.error)this.fail(header.error,undefined,generation);return;}}
   if(data.presentationFrames){this.muxedFrames=true;this.frames.push(...data.presentationFrames.map(([pts,duration])=>[pts-this.timelineBias,duration]));}else if(data.frames)this.frames.push(...data.frames);if(this.frames.length>4096)this.frames.splice(0,this.frames.length-4096);
   if(data.stats)this.remuxStats=data.stats;this.stats.generatedBytes+=byteLength(data.buffers??data.buffer);
   if(data.type==='negotiate'){
    if(data.windowed&&!windowedBrowserSupported()){this.fail('Long unequal-track Native adaptation is unsupported in this browser; use Hybrid','UNSUPPORTED_TIMELINE',generation);return;}
    session.packaging=[];
    for(const candidate of data.candidates){
     const attempt={...candidate};session.packaging.push(attempt);
     if(rejected.has(candidate.mime)){attempt.rejected='Initialization append failed';continue;}
     this.capability.apiHint=`MediaSource.isTypeSupported(${candidate.mime})=${MediaSource.isTypeSupported(candidate.mime)}`;
     if(!MediaSource.isTypeSupported(candidate.mime)){attempt.rejected='MSE type unsupported';continue;}
     try{
      const mimes=data.windowed?data.lanes:[candidate.mime];
      if(!mimes?.length||mimes.some(m=>!MediaSource.isTypeSupported(m)))throw Error('Unsupported selected track packaging');
      this.sbs=[];for(const mime of mimes)this.sbs.push(this.media.addSourceBuffer(mime));this.sb=this.sbs[0];
      this.transitionSchedule({type:'configure',windowed:!!data.windowed,trackBounds:data.trackBounds},generation);
     }catch(error){for(const sb of this.sbs)this.media.removeSourceBuffer(sb);this.sbs=[];attempt.rejected=String(error);continue;}
     this.capability.sourceBufferCreated=true;
     attempt.selected=true;this.mime=candidate.mime;
     this.worker.postMessage({type:'select-container',container:candidate.container});return;
    }
    this.fail('Unsupported MSE packaging for selected codecs',undefined,generation);return;
   }
   if(data.type==='ready'){
    try{
     if(target<0||target>=data.duration)throw Error('Seek target out of range');
     if(!MediaSource.isTypeSupported(data.mime))throw Error(`Unsupported MSE ${data.mime}`);
     this.duration=data.duration;this.tracks=data.tracks;this.mime=data.mime;this.media.duration=data.duration+this.timelineBias;
     for(const sb of this.sbs){
      sb.mode='segments';sb.timestampOffset=0;
      sb.addEventListener('error',()=>{if(this.generationCurrent(generation)){this.transitionLifecycle({type:'packaging-failure',generation,failed:true});this.fail('MSE SourceBuffer error',undefined,generation);}});
     }
     try{this.append(data.buffers??[data.buffer],true);}catch(error){this.transitionLifecycle({type:'packaging-failure',generation,failed:error.name!=='QuotaExceededError'});throw error;}
    }catch(e){this.fail(String(e),undefined,generation);}
   }else if(data.type==='fragment'){

    this.transitionSchedule({type:'raps',values:data.raps},generation);
    this.stats.peakQueueDepth=Math.max(this.stats.peakQueueDepth,1);this.pump();
   }
  };
  this.worker.postMessage({type:'init',compiledWasm:this.compiledWasm,runtime:this.runtime,port:this.sourcePort,fragmentDelivery:this.fragmentDelivery,mailbox:this.mailbox,size:ready.size,target,audioAdaptation:this.audioAdaptation,videoTrack:this.source.videoTrack,audioTrack:this.source.videoOnly?-2:this.source.audioTrack},this.sourcePort?[this.sourcePort]:[]);this.sourcePort=null;
  await new Promise((resolve,reject)=>{
   const deadline=performance.now()+20000;const check=()=>{
    if(generation===this.generation&&this.stats.errors.length){reject(this.failureError??Error(this.stats.errors.at(-1)));return;}
    if(!this.generationCurrent(generation)){reject(new DOMException('Superseded','AbortError'));return;}
    // Initial decoder preroll can leave a short leading gap in the playable range.
    if(!this.primeVideo&&(!this.windowed||!this.busy&&!this.pulling&&!this.pending)&&this.hasStartupCoverage()){
     if(!this.transitionLifecycle({type:'accept',generation}).accepted){reject(new DOMException('Superseded','AbortError'));return;}this.video.currentTime=target+this.timelineBias;
     if(!this.generationCurrent(generation)){reject(new DOMException('Superseded','AbortError'));return;}
     session.firstPlayableMs=performance.now()-begun;session.firstPlayableSourceBytes=this.sourceStats.fetchedBytes;
     session.generatedBytes=this.remuxStats.generatedBytes;session.fetchedBytesAtLeastSourceSize=(this.sourceStats.fetchedBytes>=ready.size);
     resolve();return;
    }
    if(performance.now()>deadline){reject(Error('Remux target buffer timeout'));return;}setTimeout(check,20);
   };check();
  });
  return session;
 }
 hasStartupCoverage(){return remuxStartupCoverage(this.target,this.duration,this.ranges());}
 contains(t){t+=this.timelineBias;const b=this.sb?.buffered;if(!b)return false;for(let i=0;i<b.length;i++)if(t>=b.start(i)&&t<b.end(i))return true;return false;}
 ranges(){const b=this.windowed?this.video.buffered:this.sb?.buffered;return b?Array.from({length:b.length},(_,i)=>[(this.windowed?Math.max(b.start(i)-this.timelineBias,this.presentationFloor??0):b.start(i)-this.timelineBias),b.end(i)-this.timelineBias]).filter(([a,b])=>b>a):[];}
 watchUpdate(sb,update,generation){
  const handles=this.updateResources,handler=()=>this.updateFinished(sb,generation,update.id);
  handles.set(update.id,{sb,handler});sb.addEventListener('updateend',handler);
  if(!this.generationCurrent(generation)||this.updateResources!==handles){handles.delete(update.id);sb.removeEventListener('updateend',handler);this.assertGeneration(generation);}
 }
 updateFinished(sb,generation,id){
  if(!this.generationCurrent(generation))return;
  const lane=this.sbs.indexOf(sb),entry=this.bufferState.updates.find(update=>update.id===id&&update.lane===lane);
  if(!entry)return;
  const end=entry.kind==='append'&&sb.buffered.length?sb.buffered.end(sb.buffered.length-1)-this.timelineBias:Infinity;
  const result=this.transitionBuffer({type:'updated',id,lane,end,now:performance.now(),updating:this.sbs.some(buffer=>buffer.updating)},generation);
  if(!result.accepted)return;
  const handle=this.updateResources.get(id);this.updateResources.delete(id);if(handle)sb.removeEventListener('updateend',handle.handler);
  if(!this.generationCurrent(generation))return;
  if(result.latency!==undefined){(this.stats.appendLatencyMs??=[]).push(result.latency);if(this.stats.appendLatencyMs.length>256)this.stats.appendLatencyMs.shift();}
  if(this.busy)return;
  if(this.windowed&&this.media.readyState==='open'&&this.sbs.every(buffer=>buffer.buffered.length)){
   try{this.media.endOfStream();}catch(error){this.fail(String(error),undefined,generation);return;}
   if(!this.generationCurrent(generation))return;
  }
  if(this.primeVideo)this.primeLastVideo(generation);
  if(!this.generationCurrent(generation))return;
  this.resumeWindow();if(this.generationCurrent(generation))this.pump();
 }
 append(buffers,initialization=false){
  const generation=this.generation,entries=buffers.map((buffer,lane)=>({lane,bytes:byteLength(buffer)}));
  for(const entry of entries)if(entry.bytes&&!this.sbs[entry.lane])throw Error('Unexpected fragment lane');
  const result=this.transitionBuffer({type:'append',entries,initialization,now:performance.now()},generation);
  if(!result.accepted){if(result.error)throw Error(result.error);this.assertGeneration(generation);return;}
  // Admit the whole batch before any lane can synchronously complete or reenter.
  const targets=result.updates.map(update=>({update,sb:this.sbs[update.lane],buffer:buffers[update.lane]}));
  for(const {update,sb} of targets){this.assertGeneration(generation);this.watchUpdate(sb,update,generation);}
  for(const {update,sb,buffer} of targets){
   this.assertGeneration(generation);this.stats.fragments.push({lane:update.lane,bytes:update.bytes,at:performance.now(),generation});if(this.stats.fragments.length>256)this.stats.fragments.shift();sb.appendBuffer(buffer);this.assertGeneration(generation);
  }
  if(!targets.length&&!this.busy)this.pump();
 }
 removeBuffered(lane,cut,allLanes=false){
  const generation=this.generation,sb=this.sbs?.[lane]??this.sb,result=this.transitionBuffer({type:'remove',lane,cut,allLanes,now:performance.now()},generation);
  if(!result.accepted){if(result.error)throw Error(result.error);return;}
  this.watchUpdate(sb,result.updates[0],generation);this.assertGeneration(generation);sb.remove(0,cut+this.timelineBias-.00001);
 }
 expectedVideoFrame(target){return this.frames?.filter(([pts])=>pts<=target+.000001).sort((a,b)=>a[0]-b[0]).at(-1)?.[0];}
 matchesVideoFrame(target,mediaTime){
  if(!this.muxedFrames)return undefined;
  const epsilon=.000001;
  return this.frames.some(([pts,duration])=>target>=pts-epsilon&&target<pts+duration+epsilon&&mediaTime>=pts+this.timelineBias-epsilon&&mediaTime<=target+this.timelineBias+epsilon);
 }
 primeLastVideo(generation){
  if(this.primeFrame||!this.primeVideo||this.sbs.some(s=>s.updating))return;
  const b=this.sb.buffered;
  if(!b.length||b.end(b.length-1)-this.timelineBias<this.trackBounds.videoEnd-.002)return;
  const target=b.end(b.length-1)-.001,expected=this.expectedVideoFrame(this.trackBounds.videoEnd);
  if(expected===undefined)return;
  const a=this.sbs[1].buffered;if(!Array.from({length:a.length},(_,i)=>[a.start(i),a.end(i)]).some(([start,end])=>target>=start&&target<end))return;
  this.setBusy(true,generation);if(this.media.readyState==='open')this.media.endOfStream();
  let presented,primeTimeout,primeFrame=0;
  const clean=()=>{clearTimeout(primeTimeout);try{this.video.removeEventListener('seeked',complete);}finally{try{if(primeFrame){const frame=primeFrame;primeFrame=0;this.video.cancelVideoFrameCallback(frame);}}finally{if(this.cancelPrime===clean){this.primeFrame=0;this.primeTimeout=0;this.cancelPrime=null;}}}};
  const complete=()=>{
   if(!this.generationCurrent(generation)||!presented||this.video.seeking||Math.abs(this.video.currentTime-target)>.002)return;
   clean();if(!this.transitionSchedule({type:'prime-finished'},generation).accepted)return;
   (this.stats.tailPrimes??=[]).push({generation,frame:presented.mediaTime-this.timelineBias,target:this.target});if(this.stats.tailPrimes.length>64)this.stats.tailPrimes.shift();
   this.setBusy(false,generation);this.pump();
  };
  const check=(_,metadata)=>{
   if(!this.generationCurrent(generation))return;
   if(metadata.mediaTime>=expected+this.timelineBias-.001&&metadata.mediaTime<=target+.001&&Math.abs(this.video.currentTime-target)<.002)presented=metadata;
   complete();if(this.generationCurrent(generation)&&this.primeVideo)this.primeFrame=primeFrame=this.video.requestVideoFrameCallback(check);
  };
  this.cancelPrime=clean;this.video.addEventListener('seeked',complete);
  this.primeTimeout=primeTimeout=setTimeout(()=>{if(this.generationCurrent(generation))this.fail('Completed video preroll did not present a frame',undefined,generation);},10000);
  this.primeFrame=primeFrame=this.video.requestVideoFrameCallback(check);this.video.currentTime=target;
 }
 resumeWindow(){
  const generation=this.generation,b=this.video.buffered,position=this.video.currentTime;
  const action=selectRemuxWindowResume(this.schedule,this.bufferState,{current:this.generationCurrent(generation),playing:this.recoveryPlaying,paused:this.video.paused,starting:this.starting,seeking:!!this.video.seeking,ended:!!this.video.ended,position,bufferEnd:b?.length?b.end(b.length-1):undefined,duration:this.duration,timelineBias:this.timelineBias});
  if(!this.generationCurrent(generation)||action==='wait')return;
  // Clear an internal window end at the same clock position before play can rewind.
  if(action==='seek'){this.video.currentTime=position;return;}
  const request=this.transitionSchedule({type:'resume'},generation);if(!request.accepted)return;
  void this.video.play().catch(error=>{if(this.generationCurrent(generation)&&this.schedule.resume===request.id&&this.recoveryPlaying)this.fail(String(error),undefined,generation);}).finally(()=>{this.transitionSchedule({type:'resumed',id:request.id},generation);});
 }
 setBuffering(policy){if(!this.transitionLifecycle({type:'buffering',policy}).accepted)throw new DOMException('Destroyed','AbortError');}
 forwardTargetSeconds(){return remuxForwardSeconds(this.schedule,this.video.paused,this.video.playbackRate);}
 // Some MSE implementations retain HAVE_FUTURE_DATA at an exhausted audio
 // edge without dispatching waiting. Observe real clock starvation only while
 // the producer is outstanding near that edge; downloading alone is not waiting.
 observeStarvation(now=performance.now()){
  const position=this.video.currentTime,active=!this.stopped&&!this.starting&&this.targetReady&&!this.video.seeking&&!this.playbackPaused&&!this.playbackEnded;
  if(!active||position!==this.progressPosition||this.progressGeneration!==this.generation){this.progressPosition=position;this.progressGeneration=this.generation;this.progressAt=now;}
  const sourceTime=position-this.timelineBias;
  const range=active?this.ranges().find(([a,b])=>a<=sourceTime+.05&&b>=sourceTime):undefined;
  const ahead=range?range[1]-sourceTime:0;
  const waiting=!!(active&&this.pulling&&now-(this.progressAt??now)>=750&&ahead<=Math.max(1,this.video.playbackRate||1));
  if(waiting!==!!this.waitingForMedia){this.waitingForMedia=waiting;this.onBufferingChange?.();}
 }
 pumpFacts(){
  const physical={position:this.video.currentTime-this.timelineBias,paused:this.video.paused,readyState:this.video.readyState,playbackRate:this.video.playbackRate,ranges:this.ranges(),laneStarts:(this.sbs??[]).map(sb=>sb.buffered?.length?sb.buffered.start(0)-this.timelineBias:null),audioAdaptation:!!this.audioAdaptation,adaptationEnd:this.remuxStats?.adaptation?.sourceEnd,duration:this.duration};
  return {...physical,targetReady:this.targetReady,playing:this.recoveryPlaying};
 }
 pump(){
  const generation=this.generation;this.observeStarvation();
  const observed={hasSourceBuffer:!!this.sb,updating:(this.sbs??(this.sb?[this.sb]:[])).some(sb=>sb.updating),mediaState:this.media?.readyState??''};
  if(!this.generationCurrent(generation))return;
  const head=selectRemuxPumpHead(this.schedule,this.bufferState,{...observed,current:true,targetReady:this.targetReady,playing:this.recoveryPlaying});
  if(head==='wait')return;
  try{
   if(head==='delivery'){this.append(this.takeBuffers('take-delivery'));return;}
   this.resumeWindow();if(!this.generationCurrent(generation))return;
   const facts=this.pumpFacts(),decision=selectRemuxPump(this.schedule,this.bufferState,facts);
   if(!this.generationCurrent(generation))return;
   this.stats.peakBufferedSeconds=Math.max(this.stats.peakBufferedSeconds,decision.metrics.seconds);this.stats.bufferedBytesUpperBound=decision.metrics.bytes;this.stats.peakBufferedBytesUpperBound=Math.max(this.stats.peakBufferedBytesUpperBound,decision.metrics.bytes);
   const action=decision.action;
   if(action.kind==='remove'){this.removeBuffered(action.lane,action.cut,action.allLanes);return;}
   if(action.kind==='pending'){this.append(this.takeBuffers('take-pending'));return;}
   if(action.clearPending)this.takeBuffers('take-pending');
   if(action.gap){this.stats.gapSkips.push(action.gap);if(this.stats.gapSkips.length>64)this.stats.gapSkips.shift();this.video.currentTime=action.gap.to+this.timelineBias;}
   if(!this.generationCurrent(generation))return;
   const continuationFacts=action.gap?this.pumpFacts():null;
   if(!this.generationCurrent(generation))return;
   const next=continuationFacts?selectRemuxPumpContinuation(this.schedule,this.bufferState,continuationFacts,action.continuation):action.next;
   if(next.kind==='fail'){this.fail(next.error,undefined,generation);return;}
   if(next.kind==='eof'){
    if(next.duration!==undefined){this.duration=next.duration;if(!this.windowed)this.media.duration=this.duration+this.timelineBias;}
    if(this.generationCurrent(generation)&&this.media.readyState==='open')this.media.endOfStream();return;
   }
   if(next.kind==='pull'){const pull=this.transitionBuffer({type:'pull'},generation);if(pull.accepted)this.worker.postMessage({type:'next',id:pull.pullId});}
  }catch(error){this.fail(String(error),undefined,generation);}
 }
 watchWorker(worker,generation,label){
  const failed=event=>{if(!this.generationCurrent(generation))return;event.preventDefault?.();this.fail(`Remux ${label} worker failed: ${event.message||event.type}`,undefined,generation);};
  worker.onerror=failed;worker.onmessageerror=failed;
 }
 fail(message,code,generation=this.generation){
  const sourceId=this.lifecycle.sourceId;
  const target=Math.max(0,this.video.currentTime-this.timelineBias),playing=this.windowed?this.recoveryPlaying:!this.video.paused;
  const decision=this.transitionLifecycle({type:'failure',generation,message,playing});if(!decision.accepted)return;
  const failure=Object.assign(Error(message),code?{code}:{});this.failureError=failure;this.stats.errors.push(message);
  this.stopWorkers(failure);
  if(decision.recoveryId!==undefined){
   const recoveryId=decision.recoveryId;if(!remuxRecoveryCurrent(this.lifecycle,recoveryId))return;
   const recovery={target,reason:message,attempt:this.recoveryAttempts,restored:false};this.stats.recoveries.push(recovery);if(this.stats.recoveries.length>64)this.stats.recoveries.shift();
   const failed=error=>{if(!remuxRecoveryCurrent(this.lifecycle,recoveryId))return;this.transitionLifecycle({type:'recovered',recoveryId});this.onError?.(String(error));};
   void this.restart(target,recoveryId).then(async()=>{
    if(!remuxRecoveryCurrent(this.lifecycle,recoveryId))return;
    if(this.recoveryPlaying)await this.video.play();
    if(this.transitionLifecycle({type:'recovered',recoveryId}).accepted)recovery.restored=true;
   },failed).catch(failed);
  }else if(decision.report&&this.lifecycle.sourceId===sourceId&&this.generation===generation&&!this.stopped)this.onError?.(message);
 }

 stopWorkers(error=new DOMException('Superseded','AbortError'),generation=this.generation){
  this.transitionLifecycle({type:'retire',generation});
  const retiredBuffer=this.retiredBuffer??this.bufferState;this.retiredBuffer=null;
  // Detach the retired generation before invoking callbacks or host cleanup.
  // Reentrant opens then install independent resources which this cleanup cannot touch.
  const {worker,sourceWorker,sourcePort,mailbox,cancelWait,cancelPrime,primeTimeout,primeFrame,bufferResources,updateResources}=this;
  this.bufferResources=new Map();this.updateResources=new Map();
  this.worker=this.sourceWorker=this.sourcePort=this.mailbox=this.cancelWait=this.cancelPrime=null;this.primeTimeout=this.primeFrame=0;
  if(worker){(this.stats.cancellations??=[]).push({adaptation:this.remuxStats.adaptation?{...this.remuxStats.adaptation}:undefined,generatedBytes:this.remuxStats.generatedBytes||0,pendingBytes:(retiredBuffer.pending??[]).reduce((n,part)=>n+part.bytes,0),retainedCompressedBytesUpperBound:retiredBuffer.segments.reduce((n,segment)=>n+segment.bytes,0),sourceFetchedBytes:this.sourceStats.fetchedBytes||0,inFlightOutputUpperBound:(this.windowed?16:8)*1024*1024});if(this.stats.cancellations.length>64)this.stats.cancellations.shift();}
  this.stats.discardedBytes+=byteLength([...(bufferResources?.values()??[])]);bufferResources?.clear();this.stats.workers=0;this.sb=null;this.sbs=[];
  const cleanup=action=>{try{action();}catch{this.stats.cleanupFailures=(this.stats.cleanupFailures??0)+1;}};
  for(const {sb,handler} of updateResources?.values()??[])cleanup(()=>sb.removeEventListener('updateend',handler));updateResources?.clear();
  if(cancelPrime)cleanup(cancelPrime);else{clearTimeout(primeTimeout);if(primeFrame)cleanup(()=>this.video.cancelVideoFrameCallback(primeFrame));}
  cleanup(()=>cancelWait?.(error));
  if(mailbox)cleanup(()=>{const h=new Int32Array(mailbox,0,16);Atomics.store(h,4,1);Atomics.store(h,0,3);Atomics.notify(h,0);});
  cleanup(()=>sourcePort?.close());cleanup(()=>worker?.postMessage({type:'close'}));
  cleanup(()=>sourceWorker?.postMessage({type:'close'}));cleanup(()=>sourceWorker?.terminate());cleanup(()=>worker?.terminate());
 }
 canSeekBuffered(t){
  const lifecycle=this.lifecycle,generation=this.generation,media=this.video.buffered,mediaRanges=media?Array.from({length:media.length},(_,i)=>[media.start(i),media.end(i)]):[];
  const accepted=selectRemuxBufferedSeek(lifecycle.schedule,t,{enabled:this.bufferedSeeks,current:this.generationCurrent(generation),starting:lifecycle.starting,targetReady:lifecycle.targetReady,accepted:remuxAcceptedGeneration(lifecycle),hasSourceBuffer:!!this.sb,updating:!!this.sb?.updating,mediaState:this.media?.readyState??'',timelineBias:this.timelineBias,ranges:this.ranges(),mediaRanges});
  return accepted&&this.generationCurrent(generation);
 }
 async seek(t){
  if(this.canSeekBuffered(t)){
   // Keep the producer's forward position. Only consumption moves backwards;
   // using the previous target here would evict media at the new playhead.
   const generation=this.generation;if(!this.transitionSchedule({type:'seek',target:t},generation).accepted)throw new DOMException('Superseded','AbortError');this.video.currentTime=t+this.timelineBias;this.assertGeneration(generation);
   this.stats.bufferedSeeks=(this.stats.bufferedSeeks??0)+1;
   return {kind:'buffered',generation:this.generation,target:t};
  }
  return this.restart(t);
 }
 get playbackPaused(){return this.windowed?!this.recoveryPlaying:this.video.paused;}
 get playbackEnded(){return remuxPlaybackEnded(this.schedule,this.bufferState,{ended:this.video.ended,position:this.video.currentTime,duration:this.duration,timelineBias:this.timelineBias});}
 async play(){if(!this.setPlaybackIntent(true))throw new DOMException('Destroyed','AbortError');if(this.starting)return;if(this.windowed){this.pump();if(this.video.ended&&!this.playbackEnded){this.resumeWindow();return;}}return this.video.play();}
 pause(){this.setPlaybackIntent(false);this.video.pause();}
 get bufferingDiagnostics(){return {effectiveForwardSeconds:this.forwardTargetSeconds(),playbackRate:this.video.playbackRate,paused:this.video.paused,waitingForMedia:!!this.waitingForMedia};}
 snapshot(){return {delivery:{mode:this.fragmentDelivery,queuedParts:this.delivery?.length??0,queuedBytes:this.delivery.reduce((sum,part)=>sum+part.bytes,0),pulling:this.pulling,busy:this.busy,pending:!!this.pending,updating:this.sbs?.map(s=>s.updating)},buffering:this.bufferingDiagnostics,capability:{...this.capability,...this.bufferState.initAccepted?{initAccepted:true}:{},...this.bufferState.mediaAccepted?{mediaAccepted:true}:{}},stats:structuredClone(this.stats),source:{...this.sourceStats},remux:{...this.remuxStats},windowed:this.windowed,presentationFloor:this.presentationFloor,trackBounds:this.trackBounds,ranges:this.ranges(),timelineBias:this.timelineBias,position:Math.max(0,this.video.currentTime-this.timelineBias),quality:this.video.getVideoPlaybackQuality(),readyState:this.video.readyState,logs:this.logs,videoError:this.video.error?.message};}
 async destroy(){if(!this.transitionLifecycle({type:'destroy'}).accepted)return;clearInterval(this.timer);this.stopWorkers();this.video.pause();this.video.removeAttribute('src');this.video.load();if(this.objectURL)URL.revokeObjectURL(this.objectURL);this.objectURL=null;}
}
