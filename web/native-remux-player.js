// SPDX-License-Identifier: Apache-2.0
import {runtimeWorker} from './generated/internal/runtime-worker.js';
import {initialRemuxLifecycle,transitionRemuxLifecycle,remuxGenerationCurrent,remuxRestartCurrent,remuxRecoveryCurrent,remuxAcceptedGeneration} from './generated/internal/machine/remux-lifecycle.js';
import {WorkerRemuxController,workerMSEAvailable} from './worker-remux-controller.js';
// The same Native scheduler can own MSE in a window or a dedicated worker.
// Demux/mux and bounded source reads always remain separate workers.
const byteLength=value=>Array.isArray(value)?value.reduce((n,b)=>n+b.byteLength,0):value?.byteLength||0;
export function windowedBrowserSupported(ua=globalThis.navigator?.userAgent??''){return /Chrome\//.test(ua)&&!/Firefox|Edg\/|OPR\/|Android|Mobile/.test(ua);}
export class RemuxPlayer {
 constructor(video,{bufferedSeeks=false,audioAdaptation,buffering,mseOwner='auto',fragmentDelivery='separate',runtime='pthread',compiledWasm,attachMedia}={}){
  if(runtime==='pthread'&&globalThis.crossOriginIsolated&&mseOwner!=='window'&&!audioAdaptation&&workerMSEAvailable())return new WorkerRemuxController(video,{compiledWasm,bufferedSeeks,audioAdaptation,buffering,fragmentDelivery},()=>new RemuxPlayer(video,{compiledWasm,bufferedSeeks,audioAdaptation,buffering,mseOwner:'window',fragmentDelivery}));
  this.runtime=runtime;this.compiledWasm=compiledWasm;this.attachMedia=attachMedia;this.fragmentDelivery=fragmentDelivery;
  this.buffering=buffering;
  this.audioAdaptation=audioAdaptation;
  this.bufferedSeeks=bufferedSeeks&&typeof video.requestVideoFrameCallback==='function';
  this.video=video;this.timelineBias=1;this.lifecycle=initialRemuxLifecycle();this.stats={fragments:[],generatedBytes:0,discardedBytes:0,peakQueueDepth:0,bufferedBytesUpperBound:0,peakBufferedBytesUpperBound:0,peakBufferedSeconds:0,seeks:[],sessions:[],errors:[],workers:0,recoveries:[],gapSkips:[]};
  this.segments=[];this.sourceStats={};this.remuxStats={};this.timer=setInterval(()=>this.pump(),50);
 }
 get generation(){return this.lifecycle.generation;}
 get stopped(){return this.lifecycle.stopped;}
 get starting(){return this.lifecycle.starting;}
 get targetReady(){return this.lifecycle.targetReady;}
 get failedGeneration(){return this.lifecycle.failedGeneration;}
 get acceptedGeneration(){return this.lifecycle.acceptedGeneration;}
 get recoveryAttempts(){return this.lifecycle.recoveryAttempts;}
 get recoveryPlaying(){return this.lifecycle.playing;}
 transitionLifecycle(command){const result=transitionRemuxLifecycle(this.lifecycle,command);this.lifecycle=result.state;return result;}
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
  this.windowed=false;this.headerAccepted=false;this.presentationFloor=0;this.pulling=false;this.pullId=0;this.resumingWindow=false;this.primeVideo=false;this.sbs=[];this.delivery=[];this.receipts=new Map();this.pendingUpdates=new Set();this.lastEvictions=[];
  this.failureError=undefined;this.stats.errors=[];this.stats.seeks.push({target,started:begun});if(this.stats.seeks.length>64)this.stats.seeks.shift();this.target=target;this.frames=[];this.muxedFrames=false;this.lastEviction=-Infinity;this.raps=[];this.busy=true;this.eof=false;this.pending=null;this.receipt=null;this.segments=[];this.sourceStats={};this.remuxStats={};
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
    if(!this.pulling||data.id!==this.pullId){this.fail('Unexpected progressive fragment operation',undefined,generation);return;}
    this.delivery.push(data.buffer);this.stats.peakDeliveryParts=Math.max(this.stats.peakDeliveryParts||0,this.delivery.length);this.stats.generatedBytes+=data.buffer.byteLength;this.busy=this.pendingUpdates.size>0||this.sbs.some(s=>s.updating);this.pump();return;
   }
   if(data.type==='log'){(this.logs??=[]).push(data.message);if(this.logs.length>32)this.logs.shift();return;}
   if(data.type==='fragment'&&(!this.pulling||data.id!==this.pullId)){this.fail('Unexpected remux fragment operation',undefined,generation);return;}
   if(data.type==='ready'){if(this.headerAccepted){this.fail('Duplicate remux initialization',undefined,generation);return;}this.headerAccepted=true;}
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
      this.windowed=!!data.windowed;this.trackBounds=data.trackBounds;this.presentationFloor=this.windowed&&target>=Math.min(this.trackBounds.videoEnd,this.trackBounds.audioEnd)?Math.max(0,target-.5):0;this.primeVideo=this.windowed&&target>=this.trackBounds.videoEnd&&this.trackBounds.videoEnd<this.trackBounds.audioEnd;
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
      sb.addEventListener('updateend',()=>this.updateFinished(sb,generation));
      sb.addEventListener('error',()=>{if(this.generationCurrent(generation)){this.transitionLifecycle({type:'packaging-failure',generation,failed:true});this.fail('MSE SourceBuffer error',undefined,generation);}});
     }
     try{this.append(data.buffers??[data.buffer],true);}catch(error){this.transitionLifecycle({type:'packaging-failure',generation,failed:error.name!=='QuotaExceededError'});throw error;}
    }catch(e){this.fail(String(e),undefined,generation);}
   }else if(data.type==='fragment'){
    this.pulling=false;

    this.raps.push(...data.raps);if(this.raps.length>256)this.raps.splice(0,this.raps.length-256);
    if(data.parts){this.delivery.push(...data.parts);this.stats.peakDeliveryParts=Math.max(this.stats.peakDeliveryParts||0,this.delivery.length);this.stats.generatedBytes+=byteLength(data.parts);}
    this.pending=data.buffers??[data.buffer];this.eof=!data.more;this.busy=this.pendingUpdates.size>0||this.sbs.some(s=>s.updating);this.stats.peakQueueDepth=Math.max(this.stats.peakQueueDepth,1);this.pump();
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
 hasStartupCoverage(){
  const target=this.target,margin=Math.min(.02,Math.max(0,this.duration-target)/2);
  return this.ranges().some(([a,b])=>a<=target+.5&&b>target+margin);
 }
 contains(t){t+=this.timelineBias;const b=this.sb?.buffered;if(!b)return false;for(let i=0;i<b.length;i++)if(t>=b.start(i)&&t<b.end(i))return true;return false;}
 ranges(){const b=this.windowed?this.video.buffered:this.sb?.buffered;return b?Array.from({length:b.length},(_,i)=>[(this.windowed?Math.max(b.start(i)-this.timelineBias,this.presentationFloor??0):b.start(i)-this.timelineBias),b.end(i)-this.timelineBias]).filter(([a,b])=>b>a):[];}
 updateFinished(sb,generation){
       if(!this.generationCurrent(generation)||!this.pendingUpdates.delete(sb))return;
       const receipt=this.receipts.get(sb);if(receipt){(this.stats.appendLatencyMs??=[]).push(performance.now()-receipt.started);if(this.stats.appendLatencyMs.length>256)this.stats.appendLatencyMs.shift();if(receipt.initialization)this.capability.initAccepted=true;else this.capability.mediaAccepted=true;receipt.end=sb.buffered.length?sb.buffered.end(sb.buffered.length-1)-this.timelineBias:Infinity;this.receipts.delete(sb);}
       if(this.pendingUpdates.size||this.sbs.some(s=>s.updating))return;
       this.busy=false;
       if(this.windowed&&this.media.readyState==='open'&&this.sbs.every(s=>s.buffered.length)){
        try{this.media.endOfStream();}catch(error){this.fail(String(error),undefined,generation);return;}
       }
       if(this.primeVideo)this.primeLastVideo(generation);
       this.resumeWindow();
       this.pump();
 }
 append(buffers,initialization=false){
  this.busy=false;
  buffers.forEach((buffer,lane)=>{
   if(!buffer.byteLength)return;
   const sb=this.sbs[lane];if(!sb)throw Error('Unexpected fragment lane');
   this.busy=true;const receipt={lane,bytes:buffer.byteLength,end:Infinity,initialization,started:performance.now()};this.segments.push(receipt);this.receipts.set(sb,receipt);this.pendingUpdates.add(sb);
   this.stats.fragments.push({lane,bytes:buffer.byteLength,at:performance.now(),generation:this.generation});if(this.stats.fragments.length>256)this.stats.fragments.shift();sb.appendBuffer(buffer);
  });
  if(!this.busy)this.pump();
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
  this.busy=true;if(this.media.readyState==='open')this.media.endOfStream();
  let presented,primeTimeout,primeFrame=0;
  const clean=()=>{clearTimeout(primeTimeout);try{this.video.removeEventListener('seeked',complete);}finally{try{if(primeFrame){const frame=primeFrame;primeFrame=0;this.video.cancelVideoFrameCallback(frame);}}finally{if(this.cancelPrime===clean){this.primeFrame=0;this.primeTimeout=0;this.cancelPrime=null;}}}};
  const complete=()=>{
   if(!this.generationCurrent(generation)||!presented||this.video.seeking||Math.abs(this.video.currentTime-target)>.002)return;
   clean();this.primeVideo=false;
   (this.stats.tailPrimes??=[]).push({generation,frame:presented.mediaTime-this.timelineBias,target:this.target});if(this.stats.tailPrimes.length>64)this.stats.tailPrimes.shift();
   this.busy=false;this.pump();
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
  if(!this.generationCurrent(this.generation)||!this.windowed||!this.recoveryPlaying||!this.video.paused||this.starting||this.video.seeking||this.resumingWindow)return;
  if(this.video.ended){
   if(this.playbackEnded)return;
   const at=this.video.currentTime,b=this.video.buffered;
   if(!b.length||b.end(b.length-1)<=at+.05)return;
   // play() at an ended media element rewinds it. Clear the internal window-end
   // state with a seek to the same position after new real coverage arrives.
   this.video.currentTime=at;return;
  }
  const generation=this.generation;this.resumingWindow=true;
  void this.video.play().catch(error=>{if(this.generationCurrent(generation)&&this.recoveryPlaying)this.fail(String(error),undefined,generation);}).finally(()=>{if(this.generationCurrent(generation))this.resumingWindow=false;});
 }
 setBuffering(policy){if(this.stopped)throw new DOMException('Destroyed','AbortError');this.buffering={...policy};}
 forwardTargetSeconds(){return (this.video.paused&&this.buffering?.preload!=='auto'&&this.buffering?1:(this.buffering?.forwardSeconds??5))*(this.video.paused?1:Math.max(1,this.video.playbackRate||1));}
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
 pump(){
  const generation=this.generation;this.observeStarvation();
  if(!this.generationCurrent(generation)||!this.sb||this.busy||(this.sbs??[this.sb]).some(s=>s.updating)||!['open',...(this.windowed?['ended']:[])].includes(this.media.readyState))return;
  try{
   if(this.delivery?.length){this.append([this.delivery.shift()]);return;}
   if(this.pulling)return;
   if(this.windowed&&this.targetReady&&!this.recoveryPlaying)return;
   this.resumeWindow();
   const now=this.targetReady?Math.max(this.video.currentTime-this.timelineBias,this.target):this.target,ranges=this.ranges();
   const seconds=ranges.reduce((s,[a,b])=>s+b-a,0);this.stats.peakBufferedSeconds=Math.max(this.stats.peakBufferedSeconds,seconds);
   const bufferedBytes=this.segments.reduce((s,v)=>s+v.bytes,0),byteLimit=this.buffering?.forwardLimitBytes??12*1024*1024;
   this.stats.bufferedBytesUpperBound=bufferedBytes;this.stats.peakBufferedBytesUpperBound=Math.max(this.stats.peakBufferedBytesUpperBound,bufferedBytes);
   // History is a target, not a reservation: at the byte ceiling, reclaim old
   // intervals so retained history cannot prevent fetching forward data.
   const pressured=bufferedBytes>=byteLimit;
   const historyLimit=now-(pressured?0:(this.buffering?.backwardSeconds??3));
   const retainedRap=this.raps.filter(t=>t<=historyLimit).at(-1);
   // Evict old complete intervals. Browser codec dependencies may keep internal
   // resources beyond the coded ranges.
   // MSE removal can extend through dependent frames to the next RAP. Never
   // remove through the GOP currently decoding; evict at known source RAPs.
   if(this.windowed&&this.targetReady){
    for(let lane=0;lane<this.sbs.length;lane++){
     const sb=this.sbs[lane],end=lane?this.trackBounds.audioEnd:this.trackBounds.videoEnd;
     // Keep audio aligned with the retained video GOP under pressure. If
     // no RAP is available, leave a small audio safety margin at the playhead.
     const laneLimit=lane&&pressured?(retainedRap??now-.5):historyLimit;
     const limit=Math.min(laneLimit,end-.5),cut=lane?limit:this.raps.filter(t=>t<=limit).at(-1);
     if(cut!==undefined&&sb.buffered.length&&sb.buffered.start(0)-this.timelineBias<cut-.001&&cut>(this.lastEvictions[lane]??-Infinity)){
      this.busy=true;this.lastEvictions[lane]=cut;this.pendingUpdates.add(sb);sb.remove(0,cut+this.timelineBias-.00001);this.segments=this.segments.filter(s=>s.lane!==lane||s.end>cut);return;
     }
    }
   }
   const cut=this.windowed?undefined:retainedRap;
   if(this.targetReady&&cut!==undefined&&ranges.length&&ranges[0][0]<cut-.001&&cut>this.lastEviction){this.busy=true;this.lastEviction=cut;this.pendingUpdates?.add(this.sb);this.sb.remove(0,cut+this.timelineBias-.00001);this.segments=this.segments.filter(s=>s.end>cut);return;}
   if(this.pending){
    const buffers=this.pending;this.pending=null;
    if(byteLength(buffers)){this.append(buffers);return;}
   }
   // Account for the same short leading codec-preroll gap admitted by start().
   // Otherwise a sub-millisecond gap can look like zero buffered data while paused
   // and drain the entire source before the media element advances into the range.
   // Some valid edits leave a short hole between MSE coded ranges. Advance
   // only while playing at the end of a range, within a half-second budget.
   const next=ranges.find(([a])=>a>now+.001);
   if(this.targetReady&&!this.video.paused&&this.video.readyState<3&&next&&next[0]-now<=.5){
    this.stats.gapSkips.push({from:now,to:next[0]});if(this.stats.gapSkips.length>64)this.stats.gapSkips.shift();
    this.video.currentTime=next[0]+this.timelineBias;
   }
   const ahead=ranges.find(([a,b])=>a<=now+0.5&&now<=b)?.[1]-now||0;
   if(ahead<5&&ranges.at(-1)?.[1]>now+12){this.fail('Remux timeline gap exceeds forward buffer budget',undefined,generation);return;}
   if(this.eof&&!this.pending){if(this.audioAdaptation&&this.remuxStats.adaptation?.sourceEnd>0){this.duration=this.remuxStats.adaptation.sourceEnd;if(!this.windowed)this.media.duration=this.duration+this.timelineBias;}if(this.media.readyState==='open')this.media.endOfStream();return;}
   const preparedAhead=this.audioAdaptation?Math.max(0,(this.remuxStats.adaptation?.sourceEnd??now)-now):0;
   // MSE exposes the intersection of selected tracks. Never encode an entire
   // longer track merely to make a shorter track's buffered range advance.
   if(!this.eof&&preparedAhead>=5&&ahead<.25&&!this.video.paused){this.fail('Adapted track timelines cannot progress within the preparation budget; use Hybrid',undefined,generation);return;}
   if(this.windowed&&!this.targetReady&&!this.primeVideo&&this.hasStartupCoverage())return;
   // A single protected decode interval can itself exceed the budget. Never
   // discard its reference frames or wait forever at an exhausted buffer.
   if(!this.eof&&this.targetReady&&pressured&&ahead<=0&&(this.windowed?this.recoveryPlaying:!this.video.paused)){this.fail('Remux cannot refill within the coded-data budget while preserving the current GOP',undefined,generation);return;}
   const forward=this.forwardTargetSeconds();
   if(!this.eof&&ahead<forward&&preparedAhead<forward&&bufferedBytes<byteLimit){this.busy=true;this.pulling=true;this.worker.postMessage({type:'next',id:this.pullId=(this.pullId??0)+1});}
  }catch(e){this.fail(String(e),undefined,generation);}
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
  // Detach the retired generation before invoking callbacks or host cleanup.
  // Reentrant opens then install independent resources which this cleanup cannot touch.
  const {worker,sourceWorker,sourcePort,mailbox,cancelWait,cancelPrime,primeTimeout,primeFrame}=this;
  this.worker=this.sourceWorker=this.sourcePort=this.mailbox=this.cancelWait=this.cancelPrime=null;this.primeTimeout=this.primeFrame=0;
  if(worker){(this.stats.cancellations??=[]).push({adaptation:this.remuxStats.adaptation?{...this.remuxStats.adaptation}:undefined,generatedBytes:this.remuxStats.generatedBytes||0,pendingBytes:byteLength(this.pending),retainedCompressedBytesUpperBound:this.segments.reduce((n,s)=>n+s.bytes,0),sourceFetchedBytes:this.sourceStats.fetchedBytes||0,inFlightOutputUpperBound:(this.windowed?16:8)*1024*1024});if(this.stats.cancellations.length>64)this.stats.cancellations.shift();}
  this.stats.discardedBytes+=byteLength(this.pending)+byteLength(this.delivery);this.pending=null;this.delivery=[];this.stats.workers=0;this.sb=null;this.sbs=[];
  const cleanup=action=>{try{action();}catch{this.stats.cleanupFailures=(this.stats.cleanupFailures??0)+1;}};
  if(cancelPrime)cleanup(cancelPrime);else{clearTimeout(primeTimeout);if(primeFrame)cleanup(()=>this.video.cancelVideoFrameCallback(primeFrame));}
  cleanup(()=>cancelWait?.(error));
  if(mailbox)cleanup(()=>{const h=new Int32Array(mailbox,0,16);Atomics.store(h,4,1);Atomics.store(h,0,3);Atomics.notify(h,0);});
  cleanup(()=>sourcePort?.close());cleanup(()=>worker?.postMessage({type:'close'}));
  cleanup(()=>sourceWorker?.postMessage({type:'close'}));cleanup(()=>sourceWorker?.terminate());cleanup(()=>worker?.terminate());
 }
 canSeekBuffered(t){
  // A held final video frame produces no new compositor callback to verify a
  // buffered seek. Regenerate its bounded real preroll instead.
  if(this.windowed&&t>=this.trackBounds.videoEnd)return false;
  if(!this.bufferedSeeks||!Number.isFinite(t)||t<0||this.stopped||this.starting||!this.targetReady||!remuxAcceptedGeneration(this.lifecycle)||!this.sb||this.sb.updating||!['open','ended'].includes(this.media?.readyState))return false;
  // Appended history is not playable coverage. Check both the media element's
  // intersection and the current SourceBuffer after browser eviction/removal.
  const media=this.video.buffered;
  const range=this.ranges().find(([a,b])=>t>=a&&t+.25<b);
  if(!range)return false;
  const rap=this.raps.filter(r=>r<=t&&r>=range[0]-.001).at(-1);
  if(rap===undefined)return false;
  for(let i=0;i<media.length;i++)if(rap+this.timelineBias>=media.start(i)-.001&&t+this.timelineBias+.25<media.end(i))return true;
  return false;
 }
 async seek(t){
  if(this.canSeekBuffered(t)){
   // Keep the producer's forward position. Only consumption moves backwards;
   // using the previous target here would evict media at the new playhead.
   this.target=t;this.video.currentTime=t+this.timelineBias;
   this.stats.bufferedSeeks=(this.stats.bufferedSeeks??0)+1;
   return {kind:'buffered',generation:this.generation,target:t};
  }
  return this.restart(t);
 }
 get playbackPaused(){return this.windowed?!this.recoveryPlaying:this.video.paused;}
 get playbackEnded(){return this.video.ended&&(!this.windowed||this.eof&&!this.pending&&!this.busy&&this.video.currentTime>=this.duration+this.timelineBias-.02);}
 async play(){if(!this.setPlaybackIntent(true))throw new DOMException('Destroyed','AbortError');if(this.starting)return;if(this.windowed){this.pump();if(this.video.ended&&!this.playbackEnded){this.resumeWindow();return;}}return this.video.play();}
 pause(){this.setPlaybackIntent(false);this.video.pause();}
 get bufferingDiagnostics(){return {effectiveForwardSeconds:this.forwardTargetSeconds(),playbackRate:this.video.playbackRate,paused:this.video.paused,waitingForMedia:!!this.waitingForMedia};}
 snapshot(){return {delivery:{mode:this.fragmentDelivery,queuedParts:this.delivery?.length??0,queuedBytes:byteLength(this.delivery),pulling:this.pulling,busy:this.busy,pending:!!this.pending,updating:this.sbs?.map(s=>s.updating)},buffering:this.bufferingDiagnostics,capability:{...this.capability},stats:structuredClone(this.stats),source:{...this.sourceStats},remux:{...this.remuxStats},windowed:this.windowed,presentationFloor:this.presentationFloor,trackBounds:this.trackBounds,ranges:this.ranges(),timelineBias:this.timelineBias,position:Math.max(0,this.video.currentTime-this.timelineBias),quality:this.video.getVideoPlaybackQuality(),readyState:this.video.readyState,logs:this.logs,videoError:this.video.error?.message};}
 async destroy(){if(!this.transitionLifecycle({type:'destroy'}).accepted)return;clearInterval(this.timer);this.stopWorkers();this.video.pause();this.video.removeAttribute('src');this.video.load();if(this.objectURL)URL.revokeObjectURL(this.objectURL);this.objectURL=null;}
}
