// SPDX-License-Identifier: Apache-2.0
import {RemuxPlayer} from './native-remux-player.js';
import {initialRemuxWorker,transitionRemuxWorker,remuxWorkerLive,remuxWorkerOperationCurrent,initialRemuxElement,observeRemuxElement,seekRemuxElement,pauseRemuxElement} from './generated/internal/machine/remux-worker.js';
// Reuse the maintained scheduler, eviction rules and generation owner. FFmpeg
// and source I/O remain in separate child workers; neither blocks this loop.
let owner,cancelBoot,control=initialRemuxWorker(),element=initialRemuxElement();
const pending=new Map();
const transition=command=>{const result=transitionRemuxWorker(control,command);control=result.state;return result;};
const aborted=()=>new DOMException('Superseded','AbortError');
function retireRequests(requests,error=aborted()){
 const retired=requests.map(request=>{const resource=pending.get(request.id);pending.delete(request.id);return resource;}).filter(Boolean);
 for(const resource of retired){clearTimeout(resource.timer);resource.reject(error);}
}
function request(kind,message,sourceKey){
 const decision=transition({type:'request',kind,sourceKey,now:performance.now()});if(!decision.accepted)return Promise.reject(aborted());
 const {id,deadline}=decision.request;
 return new Promise((resolve,reject)=>{
  const resource={resolve,reject,timer:undefined};pending.set(id,resource);
  const settle=(input,error,value)=>{
   const result=transition(input);if(result.wait!==undefined)return result.wait;if(!result.accepted)return;
   pending.delete(id);clearTimeout(resource.timer);error?reject(error):resolve(value);
  };
  const expire=()=>{
   try{const wait=settle({type:'deadline',kind,id,now:performance.now()},Error(kind==='element'?'Element play timed out':'Authorization refresh timed out'));if(wait!==undefined)resource.timer=setTimeout(expire,wait);}
   catch(error){settle({type:'reply',kind,id},error);}
  };
  try{resource.timer=setTimeout(expire,Math.max(0,deadline-performance.now()));postMessage({...message,id});}
  catch(error){settle({type:'reply',kind,id},error);}
 });
}
function settleRequest(kind,data){
 const decision=transition({type:'reply',kind,id:data.id});if(!decision.accepted)return;
 const resource=pending.get(data.id);pending.delete(data.id);if(!resource)return;clearTimeout(resource.timer);
 data.error?resource.reject(Error(data.error)):resource.resolve(data.update);
}
const ranges=values=>({length:values.length,start:i=>values[i][0],end:i=>values[i][1]});
class ElementState {
 get currentTime(){return element.currentTime;}
 set currentTime(value){if(!remuxWorkerLive(control))return;element=seekRemuxElement(element,value);postMessage({type:'element',operation:'seek',value});}
 get paused(){return element.paused;}get playbackRate(){return element.playbackRate;}get readyState(){return element.readyState;}
 get ended(){return element.ended;}get seeking(){return element.seeking;}get buffered(){return ranges(element.ranges);}
 pause(){if(!remuxWorkerLive(control))return;element=pauseRemuxElement(element);postMessage({type:'element',operation:'pause'});}
 play(){return request('element',{type:'element',operation:'play'});}
 removeAttribute(){}
 load(){if(remuxWorkerLive(control))postMessage({type:'element',operation:'reset'});}
 getVideoPlaybackQuality(){return element.quality??{};}
 update(state){
  if(!remuxWorkerLive(control))return;
  const snapshot={currentTime:state.currentTime,paused:state.paused,ended:state.ended,seeking:state.seeking,readyState:state.readyState,playbackRate:state.playbackRate,quality:state.quality?{totalVideoFrames:state.quality.totalVideoFrames,droppedVideoFrames:state.quality.droppedVideoFrames}:undefined,ranges:state.ranges.map(([a,b])=>[a,b])};
  if(remuxWorkerLive(control))element=observeRemuxElement(snapshot);
 }
}
const video=new ElementState();
const state=()=>({duration:owner?.duration,tracks:owner?.tracks,generation:owner?.generation,eof:owner?.eof,muxedFrames:owner?.muxedFrames,frames:owner?.muxedFrames?owner.frames:undefined,waitingForMedia:owner?.waitingForMedia,snapshot:owner?.snapshot()});
async function boot(operation,options){
 if(!globalThis.MediaSource?.canConstructInDedicatedWorker)throw Error('Worker MSE unavailable');
 const media=new MediaSource();if(!media.handle)throw Error('MediaSourceHandle unavailable');
 await new Promise((resolve,reject)=>{
  let timer,settled=false;
  const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);media.removeEventListener('sourceopen',opened);if(cancelBoot===cancel)cancelBoot=undefined;error?reject(error):resolve();};
  const opened=()=>finish(),cancel=()=>finish(aborted());cancelBoot=cancel;
  try{timer=setTimeout(()=>finish(Error('Worker MSE attachment timed out')),3000);media.addEventListener('sourceopen',opened,{once:true});postMessage({type:'element',operation:'attach',handle:media.handle},[media.handle]);}catch(error){finish(error);}
 });
 if(!remuxWorkerOperationCurrent(control,operation))throw aborted();
 const candidate=new RemuxPlayer(video,{...options,bufferedSeeks:false,mseOwner:'window',attachMedia:media=>{if(remuxWorkerLive(control))postMessage({type:'element',operation:'attach',handle:media.handle},[media.handle]);}});
 if(!remuxWorkerOperationCurrent(control,operation)){await candidate.destroy();throw aborted();}
 owner=candidate;candidate.onError=message=>{if(owner===candidate&&remuxWorkerLive(control))postMessage({type:'error',message});};
}
self.onmessage=async({data})=>{
 if(data.type==='shutdown'){
  const decision=transition({type:'shutdown'});if(!decision.accepted)return;
  const retiring=owner,cancel=cancelBoot;owner=undefined;cancelBoot=undefined;clearInterval(stateTimer);retireRequests(decision.retire,new DOMException('Destroyed','AbortError'));cancel?.();
  try{await retiring?.destroy();}finally{if(transition({type:'closed'}).accepted){postMessage({type:'closed'});close();}}return;
 }
 if(!remuxWorkerLive(control))return;
 if(data.type==='playback-intent'){owner?.setPlaybackIntent(data.playing);return;}
 if(data.type==='element-result'){settleRequest('element',data);return;}
 if(data.type==='element-state'){video.update(data.state);return;}
 if(data.type==='refreshed'){settleRequest('refresh',data);return;}
 if(data.type!=='call')return;
 const admission=transition({type:'call',id:data.id,method:data.method,sourceKey:data.value?.sourceKey});
 if(!admission.accepted){postMessage({type:'reply',id:data.id,error:admission.error});return;}
 retireRequests(admission.retire);const operation=admission.operation;let value,error,snapshot;
 try{
  if(data.method==='boot')await boot(operation,data.value);
  else if(data.method==='open'){
   const {source,target,refresh,sourceKey}=data.value,descriptor={...source};
   if(refresh)descriptor.refreshAuthorization=resource=>request('refresh',{type:'refresh',sourceKey,resource},sourceKey);
   value=await owner.open(descriptor,target);
  }else if(data.method==='seek')value=await owner.seek(data.value);
  else value=await owner.setBuffering(data.value);
 }catch(cause){error=String(cause);}
 if(remuxWorkerOperationCurrent(control,operation)&&owner){try{snapshot=state();}catch(cause){error??=String(cause);}}
 const settled=transition({type:'finish',id:data.id,success:error===undefined});if(!settled.accepted)return;
 if(!settled.current){value=undefined;snapshot=undefined;error=String(aborted());}
 postMessage({type:'reply',id:data.id,value,error,state:snapshot});
};
const stateTimer=setInterval(()=>{if(owner&&control.phase==='ready')postMessage({type:'state',state:state()});},100);
