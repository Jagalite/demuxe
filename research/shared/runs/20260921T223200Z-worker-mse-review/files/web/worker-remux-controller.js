// SPDX-License-Identifier: GPL-3.0-or-later
// Only element operations cross this boundary. Encoded fragments stay between
// the producer and the dedicated MSE owner, using transferable ArrayBuffers.
export const workerMSEAvailable=()=>typeof document!=='undefined'&&globalThis.MediaSource?.canConstructInDedicatedWorker===true&&'srcObject' in HTMLMediaElement.prototype;
export class WorkerRemuxController {
 constructor(video,options,fallback){
  this.video=video;this.options=options;this.fallback=fallback;this.timelineBias=1;this.pending=new Map();this.serial=0;this.state={};
 }
 async boot(){
  if(this.worker)return;
  const worker=this.worker=new Worker(new URL('./native-mse-worker.js',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{
   if(this.worker!==worker||this.stopped)return;
   if(data.type==='reply'){
    const pending=this.pending.get(data.id);if(!pending)return;this.pending.delete(data.id);clearTimeout(pending.timer);
    if(data.state)this.accept(data.state);data.error?pending.reject(Error(data.error)):pending.resolve(data.value);
   }else if(data.type==='state')this.accept(data.state);
   else if(data.type==='element'){
    try{if(data.operation==='attach')this.video.srcObject=data.handle;else if(data.operation==='reset'){this.video.pause();this.video.srcObject=null;this.video.removeAttribute('src');this.video.load();}else if(data.operation==='seek')this.video.currentTime=data.value;else if(data.operation==='pause')this.video.pause();else if(data.operation==='play'){if(this.playIntent===false){worker.postMessage({type:'element-result',id:data.id});return;}this.video.play().then(()=>{if(this.worker===worker){this.sync();worker.postMessage({type:'element-result',id:data.id});}},error=>{if(this.worker===worker)worker.postMessage({type:'element-result',id:data.id,error:this.playIntent===false?undefined:String(error)});});}}
    catch(error){this.abort(error);}
   }else if(data.type==='error'){this.onError?.(data.message);}
   else if(data.type==='refresh')Promise.resolve().then(()=>this.refreshAuthorization(data.resource)).then(update=>{if(this.worker===worker)worker.postMessage({type:'refreshed',id:data.id,update});},error=>{if(this.worker===worker)worker.postMessage({type:'refreshed',id:data.id,error:String(error)});});
  };
  worker.onerror=event=>{event.preventDefault();this.abort(Error('MSE worker failed: '+event.message));};
  worker.onmessageerror=()=>this.abort(Error('MSE worker message failed'));
  this.timer=setInterval(()=>this.sync(),50);this.sync();
  await this.call('boot',this.options);
 }
 accept(state){this.state=state;for(const key of ['duration','tracks','frames'])this[key]=state[key];this.onBufferingChange?.();}
 sync(){if(!this.worker)return;const v=this.video,b=v.buffered,q=v.getVideoPlaybackQuality();this.worker.postMessage({type:'element-state',state:{currentTime:v.currentTime,paused:v.paused,ended:v.ended,seeking:v.seeking,readyState:v.readyState,playbackRate:v.playbackRate,quality:{totalVideoFrames:q.totalVideoFrames,droppedVideoFrames:q.droppedVideoFrames},ranges:Array.from({length:b.length},(_,i)=>[b.start(i),b.end(i)])}});}
 call(method,value){
  if(!this.worker||this.stopped)return Promise.reject(new DOMException('Destroyed','AbortError'));
  const id=++this.serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('MSE owner operation timed out: '+method));},30000);this.pending.set(id,{resolve,reject,timer});this.worker.postMessage({type:'call',id,method,value});});
 }
 async open(source,target=0){
  if(this.stopped)throw new DOMException('Destroyed','AbortError');
  this.starting=true;
  try{
   // Only the owner capability handshake can select the window fallback. Source
   // failures after admission must retain their original compatibility meaning.
   if(!this.local)try{await (this.bootPromise??=this.boot());}catch(error){await this.release(error);if(this.stopped)throw error;this.video.srcObject=null;this.local=this.fallback();this.fallbackReason=String(error);}
   if(this.local){this.local.onError=m=>this.onError?.(m);this.local.onBufferingChange=()=>this.onBufferingChange?.();const result=await this.local.open(source,target);this.tracks=this.local.tracks;this.duration=this.local.duration;return result;}
   const {refreshAuthorization,...transport}=source;this.refreshAuthorization=refreshAuthorization;
   try{return await this.call('open',{source:transport,target,refresh:!!refreshAuthorization});}
   catch(error){
    if(this.stopped||this.state.snapshot?.capability?.sourceBufferCreated||!/Unsupported MSE|MSE sourceopen/.test(String(error)))throw error;
    await this.release(error);if(this.stopped)throw error;
    this.video.srcObject=null;this.local=this.fallback();this.fallbackReason=String(error);this.local.onError=m=>this.onError?.(m);this.local.onBufferingChange=()=>this.onBufferingChange?.();
    const value=await this.local.open(source,target);this.tracks=this.local.tracks;this.duration=this.local.duration;return value;
   }
  }finally{this.starting=false;}
 }
 async seek(target){if(this.local)return this.local.seek(target);this.starting=true;try{return await this.call('seek',target);}finally{this.starting=false;}}
 get generation(){return this.local?.generation??this.state.generation??0;}
 get waitingForMedia(){return this.local?.waitingForMedia??this.state.waitingForMedia;}
 get eof(){return this.local?.eof??this.state.eof;}
 get muxedFrames(){return this.local?.muxedFrames??this.state.muxedFrames;}
 get starting(){return this.local?.starting??this.operationStarting;}
 set starting(value){this.operationStarting=value;}
 canSeekBuffered(target){return this.local?.canSeekBuffered(target)??false;}
 expectedVideoFrame(target){return this.local?.expectedVideoFrame(target)??this.frames?.filter(([pts])=>pts<=target+.000001).sort((a,b)=>a[0]-b[0]).at(-1)?.[0];}
 matchesVideoFrame(target,mediaTime){if(this.local)return this.local.matchesVideoFrame(target,mediaTime);if(!this.muxedFrames)return undefined;return this.frames?.some(([pts,duration])=>target>=pts-.000001&&target<pts+duration+.000001&&mediaTime>=pts+this.timelineBias-.000001&&mediaTime<=target+this.timelineBias+.000001);}
 get stats(){return this.local?.stats??this.state.snapshot?.stats??{};}
 async play(){if(this.local)return this.local.play();this.playIntent=true;this.worker?.postMessage({type:'playback-intent',playing:true});await this.video.play();this.sync();}
 pause(){if(this.local)return this.local.pause();this.playIntent=false;this.worker?.postMessage({type:'playback-intent',playing:false});this.video.pause();this.sync();}
 get playbackPaused(){return this.local?.playbackPaused??this.video.paused;}
 get playbackEnded(){return this.local?.playbackEnded??this.video.ended;}
 ranges(){return this.local?.ranges()??this.state.snapshot?.ranges??[];}
 snapshot(){const snapshot=this.local?.snapshot()??this.state.snapshot??{};return {...snapshot,mseOwner:this.local?'window':'worker',ownerFallback:this.fallbackReason,fragmentTransport:this.local?'window':'producer-to-mse-worker'};}
 release(error=new DOMException('Superseded','AbortError')){
  clearInterval(this.timer);const worker=this.worker;this.worker=null;
  for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(error);}this.pending.clear();
  // An error callback may already have started the same shutdown.
  if(!worker)return this.releasing??Promise.resolve();
  // The owner must wake a blocked pthread read and retire its child workers
  // before termination. Killing only their parent can strand a source mailbox.
  return this.releasing=new Promise(resolve=>{let timer;const finish=()=>{clearTimeout(timer);worker.terminate();resolve();};worker.addEventListener('message',({data})=>{if(data.type==='closed')finish();});timer=setTimeout(finish,1000);worker.postMessage({type:'shutdown'});});
 }
 abort(error){this.release(error);this.onError?.(String(error));}
 async destroy(){if(this.stopped)return;this.stopped=true;await this.release();await this.local?.destroy();this.video.pause();this.video.srcObject=null;this.video.removeAttribute('src');this.video.load();}
}
