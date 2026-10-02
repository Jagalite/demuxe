// SPDX-License-Identifier: Apache-2.0
import {runtimeWorker} from './generated/internal/runtime-worker.js';
import {initialRemuxController,transitionRemuxController,remuxOwnerCurrent,remuxOperationCurrent,remuxFallbackAllowed,remuxReleaseCurrent} from './generated/internal/machine/remux-controller.js';
// Only element operations cross this boundary. Encoded fragments stay between
// the producer and the dedicated MSE owner, using transferable ArrayBuffers.
export const workerMSEAvailable=()=>typeof document!=='undefined'&&globalThis.MediaSource?.canConstructInDedicatedWorker===true&&'srcObject' in HTMLMediaElement.prototype;
const aborted=()=>new DOMException('Superseded','AbortError');
export class WorkerRemuxController {
 constructor(video,options,fallback){
  const {compiledWasm,buffering,...configuration}=options;
  this.control=initialRemuxController(buffering,configuration);this.compiledWasm=compiledWasm;
  this.video=video;this.fallback=fallback;this.timelineBias=1;this.pending=new Map();this.releases=new Map();
 }
 transition(command){const decision=transitionRemuxController(this.control,command);this.control=decision.state;return decision;}
 get options(){return {...this.control.configuration,buffering:this.control.buffering,compiledWasm:this.compiledWasm};}
 get stopped(){return this.control.destroyed;}
 get playIntent(){return this.control.intent??undefined;}
 get state(){return {...this.control.observation,tracks:this.tracks};}
 get duration(){return this.local?.duration??this.control.observation.duration;}
 get tracks(){return this.local?.tracks??(this.trackResource?.token===this.control.tracksToken?this.trackResource.value:undefined);}
 get frames(){return this.local?.frames??this.control.observation.frames;}
 assertOwner(id){if(!remuxOwnerCurrent(this.control,id))throw aborted();}
 assertOperation(id){if(!remuxOperationCurrent(this.control,id))throw aborted();}
 retireRequests(requests,error){
  const retired=requests.map(request=>{const resource=this.pending.get(request.id);this.pending.delete(request.id);return resource;}).filter(Boolean);
  for(const resource of retired){clearTimeout(resource.timer);resource.reject(error);}
 }
 boot(){
  const current=this.control.owner;if(current?.kind==='worker'&&current.phase==='ready')return Promise.resolve();
  if(this.booting&&remuxOwnerCurrent(this.control,this.booting.owner))return this.booting.promise;
  const admission=this.transition({type:'boot'});if(!admission.accepted)return Promise.reject(aborted());const id=admission.owner;
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});this.booting={owner:id,promise};
  try{
   // A disposable document owns the entire worker tree. Publish its identity
   // before insertion and construction, both of which can invoke host callbacks.
   const frame=document.createElement('iframe');if(!remuxOwnerCurrent(this.control,id)){frame.remove();throw aborted();}this.workerOwner=frame;this.resourceOwner=id;
   frame.hidden=true;frame.setAttribute('aria-hidden','true');this.assertOwner(id);document.body.append(frame);this.assertOwner(id);
   const worker=runtimeWorker(new URL('./native-mse-worker.js',import.meta.url),{type:'module'},frame.contentWindow.Worker);
   if(!remuxOwnerCurrent(this.control,id)){worker.terminate();throw aborted();}this.worker=worker;
   worker.onmessage=({data})=>{
    if(!remuxOwnerCurrent(this.control,id)||this.worker!==worker)return;
    if(data.type==='reply'){
     const decision=this.transition({type:'reply',owner:id,id:data.id});if(!decision.accepted)return;
     const pending=this.pending.get(data.id);this.pending.delete(data.id);if(!pending)return;clearTimeout(pending.timer);
     try{if(data.state)this.accept(data.state,id);data.error?pending.reject(Error(data.error)):pending.resolve(data.value);}catch(error){pending.reject(error);}
    }else if(data.type==='state')this.accept(data.state,id);
    else if(data.type==='element'){
     try{
      if(data.operation==='attach')this.video.srcObject=data.handle;
      else if(data.operation==='reset'){this.video.pause();this.assertOwner(id);this.video.srcObject=null;this.assertOwner(id);this.video.removeAttribute('src');this.assertOwner(id);this.video.load();}
      else if(data.operation==='seek')this.video.currentTime=data.value;
      else if(data.operation==='pause')this.video.pause();
      else if(data.operation==='play'){
       if(this.playIntent===false){worker.postMessage({type:'element-result',id:data.id});return;}
       Promise.resolve(this.video.play()).then(()=>{if(remuxOwnerCurrent(this.control,id)){this.sync(id);if(remuxOwnerCurrent(this.control,id))worker.postMessage({type:'element-result',id:data.id});}},error=>{if(remuxOwnerCurrent(this.control,id))worker.postMessage({type:'element-result',id:data.id,error:this.playIntent===false?undefined:String(error)});});
      }
     }catch(error){if(remuxOwnerCurrent(this.control,id))this.abort(error,id);}
    }else if(data.type==='error')this.onError?.(data.message);
    else if(data.type==='refresh'){
     const source=this.refreshSource;
     Promise.resolve().then(()=>{if(!remuxOwnerCurrent(this.control,id)||!source||this.refreshSource!==source||this.control.sourceKey!==source.key||source.key!==data.sourceKey)throw aborted();return source.refreshAuthorization(data.resource);}).then(update=>{if(remuxOwnerCurrent(this.control,id)&&this.refreshSource===source&&this.control.sourceKey===source.key)worker.postMessage({type:'refreshed',id:data.id,update});},error=>{if(remuxOwnerCurrent(this.control,id))worker.postMessage({type:'refreshed',id:data.id,error:String(error)});});
    }
   };
   worker.onerror=event=>{if(!remuxOwnerCurrent(this.control,id))return;event.preventDefault?.();this.abort(Error('MSE worker failed: '+event.message),id);};
   worker.onmessageerror=()=>{if(remuxOwnerCurrent(this.control,id))this.abort(Error('MSE worker message failed'),id);};
   this.timer=setInterval(()=>this.sync(id),50);this.sync(id);this.assertOwner(id);
   this.call('boot',this.options,id).then(()=>{if(!this.transition({type:'booted',owner:id}).accepted)throw aborted();if(this.playIntent!==undefined)worker.postMessage({type:'playback-intent',playing:this.playIntent});resolve();},reject).catch(reject);
  }catch(error){reject(error);}
  return promise;
 }
 accept(state,id=this.control.owner?.id){
  const tracks=state.tracks,observation={duration:state.duration,generation:state.generation,eof:state.eof,muxedFrames:state.muxedFrames,waitingForMedia:state.waitingForMedia,frames:state.frames,snapshot:state.snapshot},decision=this.transition({type:'observe',owner:id,observation,tracks:tracks!==undefined});if(!decision.accepted)return;
  // Codec descriptions may include byte arrays. They stay in the shell and
  // are reachable only through the currently accepted opaque observation token.
  this.trackResource=tracks===undefined?undefined:{token:this.control.tracksToken,value:tracks};this.onBufferingChange?.();
 }
 sync(id=this.control.owner?.id){
  if(!remuxOwnerCurrent(this.control,id)||!this.worker)return;const worker=this.worker,v=this.video,b=v.buffered,q=v.getVideoPlaybackQuality();
  const state={currentTime:v.currentTime,paused:v.paused,ended:v.ended,seeking:v.seeking,readyState:v.readyState,playbackRate:v.playbackRate,quality:{totalVideoFrames:q.totalVideoFrames,droppedVideoFrames:q.droppedVideoFrames},ranges:Array.from({length:b.length},(_,i)=>[b.start(i),b.end(i)])};
  if(remuxOwnerCurrent(this.control,id)&&this.worker===worker)worker.postMessage({type:'element-state',state});
 }
 call(method,value,owner=this.control.owner?.id){
  const decision=this.transition({type:'request',owner,method,now:performance.now()});if(!decision.accepted)return Promise.reject(new DOMException('Destroyed','AbortError'));const {id,deadline}=decision.request,worker=this.worker;
  return new Promise((resolve,reject)=>{
   const resource={resolve,reject,timer:undefined};this.pending.set(id,resource);
   const settle=(input,error)=>{const result=this.transition(input);if(result.wait!==undefined)return result.wait;if(!result.accepted)return;this.pending.delete(id);clearTimeout(resource.timer);reject(error);};
   const expire=()=>{try{const wait=settle({type:'deadline',owner,id,now:performance.now()},Error('MSE owner operation timed out: '+method));if(wait!==undefined)resource.timer=setTimeout(expire,wait);}catch(error){settle({type:'reply',owner,id},error);}};
   try{resource.timer=setTimeout(expire,Math.max(0,deadline-performance.now()));worker.postMessage({type:'call',id,method,value});}catch(error){settle({type:'reply',owner,id},error);}
  });
 }
 async installFallback(operation,error,reason){
  if(!remuxFallbackAllowed(this.control,operation,reason,String(error)))throw error;
  const oldOwner=this.control.owner?.id;await this.release(error,oldOwner);this.assertOperation(operation);
  const admission=this.transition({type:'local',operation,reason,message:String(error)});if(!admission.accepted)throw error;
  let finish;const acquisition={owner:admission.owner,promise:new Promise(resolve=>{finish=resolve;})};this.localAcquisition=acquisition;
  try{
   this.video.srcObject=null;this.assertOwner(admission.owner);this.assertOperation(operation);
   const local=this.fallback();
   if(!remuxOwnerCurrent(this.control,admission.owner)||!remuxOperationCurrent(this.control,operation)){await local.destroy();throw aborted();}
   this.local=local;this.fallbackReason=String(error);local.onError=message=>{if(remuxOwnerCurrent(this.control,admission.owner))this.onError?.(message);};local.onBufferingChange=()=>{if(remuxOwnerCurrent(this.control,admission.owner))this.onBufferingChange?.();};
   return local;
  }catch(error){this.transition({type:'release',owner:admission.owner});throw error;}
  finally{finish();if(this.localAcquisition===acquisition)this.localAcquisition=undefined;}

 }
 async open(source,target=0){
  const operation=this.transition({type:'begin',kind:'open'});if(!operation.accepted)throw new DOMException('Destroyed','AbortError');const id=operation.operation;
  try{
   if(!this.local)try{await this.boot();this.assertOperation(id);}catch(error){this.assertOperation(id);await this.installFallback(id,error,'boot');}
   this.assertOperation(id);
   if(this.local){const local=this.local,value=await local.open(source,target);this.assertOperation(id);return value;}
   const {refreshAuthorization,...transport}=source;this.refreshSource={key:operation.sourceKey,refreshAuthorization};
   try{const value=await this.call('open',{source:transport,target,refresh:!!refreshAuthorization,sourceKey:operation.sourceKey});this.assertOperation(id);return value;}
   catch(error){
    this.assertOperation(id);
    const local=await this.installFallback(id,error,'source');this.assertOperation(id);const value=await local.open(source,target);this.assertOperation(id);return value;
   }
  }finally{this.transition({type:'finish',id});}
 }
 async setBuffering(policy){
  const owner=this.control.owner?.id;this.assertOwner(owner);
  if(this.local)await this.local.setBuffering(policy);else await this.call('setBuffering',policy,owner);
  if(!this.transition({type:'buffering',owner,value:policy}).accepted)throw aborted();
 }
 async seek(target){
  const operation=this.transition({type:'begin',kind:'seek'});if(!operation.accepted)throw new DOMException('Destroyed','AbortError');const id=operation.operation;
  try{const value=this.local?await this.local.seek(target):await this.call('seek',target);this.assertOperation(id);return value;}finally{this.transition({type:'finish',id});}
 }
 get generation(){return this.local?.generation??this.control.observation.generation??0;}
 get waitingForMedia(){return this.local?.waitingForMedia??this.control.observation.waitingForMedia;}
 get eof(){return this.local?.eof??this.control.observation.eof;}
 get muxedFrames(){return this.local?.muxedFrames??this.control.observation.muxedFrames;}
 get starting(){return this.local?.starting??!!this.control.operation;}
 canSeekBuffered(target){return this.local?.canSeekBuffered(target)??false;}
 expectedVideoFrame(target){return this.local?.expectedVideoFrame(target)??this.frames?.filter(([pts])=>pts<=target+.000001).sort((a,b)=>a[0]-b[0]).at(-1)?.[0];}
 matchesVideoFrame(target,mediaTime){if(this.local)return this.local.matchesVideoFrame(target,mediaTime);if(!this.muxedFrames)return undefined;return this.frames?.some(([pts,duration])=>target>=pts-.000001&&target<pts+duration+.000001&&mediaTime>=pts+this.timelineBias-.000001&&mediaTime<=target+this.timelineBias+.000001);}
 get stats(){return this.local?.stats??this.control.observation.snapshot?.stats??{};}
 async play(){
  if(!this.transition({type:'intent',playing:true}).accepted)throw new DOMException('Destroyed','AbortError');if(this.local)return this.local.play();
  const owner=this.control.owner?.id;this.worker?.postMessage({type:'playback-intent',playing:true});if(this.stopped)throw aborted();await this.video.play();if(remuxOwnerCurrent(this.control,owner))this.sync(owner);
 }
 pause(){if(!this.transition({type:'intent',playing:false}).accepted)return;if(this.local)return this.local.pause();const owner=this.control.owner?.id;this.worker?.postMessage({type:'playback-intent',playing:false});if(this.stopped)return;this.video.pause();if(remuxOwnerCurrent(this.control,owner))this.sync(owner);}
 get playbackPaused(){return this.local?.playbackPaused??this.video.paused;}
 get playbackEnded(){return this.local?.playbackEnded??this.video.ended;}
 ranges(){return this.local?.ranges()??this.control.observation.snapshot?.ranges??[];}
 get bufferingDiagnostics(){return this.local?.bufferingDiagnostics??this.control.observation.snapshot?.buffering;}
 snapshot(){const snapshot=this.local?.snapshot()??this.control.observation.snapshot??{};return {...snapshot,mseOwner:this.local?'window':'worker',ownerFallback:this.fallbackReason,fragmentTransport:this.local?'window':'producer-to-mse-worker'};}
 release(error=aborted(),id=this.resourceOwner??this.control.ownerSerial){
  const admission=this.transition({type:'release',owner:id}),completion=this.releaseResources(id);if(admission.accepted)this.retireRequests(admission.retire,error);
  return completion;
 }
 releaseResources(id){
  if(id===undefined)return Promise.resolve();
  if(this.releases.has(id))return this.releases.get(id);
  if(this.resourceOwner!==id)return Promise.resolve();
  const worker=this.worker,frame=this.workerOwner,timer=this.timer;
  this.worker=this.workerOwner=this.resourceOwner=this.timer=undefined;this.refreshSource=undefined;if(this.booting?.owner===id)this.booting=undefined;
  let resolve;const promise=new Promise(yes=>{resolve=yes;});this.releases.set(id,promise);const cleanup=action=>{try{action();}catch{this.transition({type:'cleanup-failed'});}};cleanup(()=>clearInterval(timer));
  let timeout,finished=false;
  const finish=()=>{if(finished)return;finished=true;cleanup(()=>clearTimeout(timeout));cleanup(()=>worker?.removeEventListener('message',closed));cleanup(()=>worker?.terminate());cleanup(()=>frame?.remove());this.releases.delete(id);resolve();};
  const closed=({data})=>{if(data.type==='closed')finish();};
  try{if(!worker){finish();return promise;}worker.addEventListener('message',closed);timeout=setTimeout(finish,1000);worker.postMessage({type:'shutdown'});}catch{finish();}
  return promise;
 }
 abort(error,id=this.control.owner?.id){if(!remuxOwnerCurrent(this.control,id))return;const operationSerial=this.control.operationSerial;this.release(error,id);if(remuxReleaseCurrent(this.control,id,operationSerial))this.onError?.(String(error));}
 destroy(){
  if(this.destruction)return this.destruction;
  const admission=this.transition({type:'destroy'});let resolve,reject;this.destruction=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const local=this.local,acquisition=this.localAcquisition?.promise;this.local=undefined;this.retireRequests(admission.retire??[],new DOMException('Destroyed','AbortError'));
  const release=this.releaseResources(this.resourceOwner);
  void (async()=>{await Promise.all([release,...this.releases.values(),acquisition]);await local?.destroy();this.video.pause();this.video.srcObject=null;this.video.removeAttribute('src');this.video.load();this.trackResource=undefined;})().then(resolve,reject);
  return this.destruction;
 }
}
