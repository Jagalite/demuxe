// SPDX-License-Identifier: MIT
import {privateMpv,privateMpvSource} from '../private-mpv.js';
import {createPrivatePCM,beginPrivatePCMPump,finishPrivatePCMPump,nextPrivatePCMStep,privatePCMFeedback,failPrivatePCM,beginPrivatePCMStop,settlePrivatePCMStop} from '../generated/internal/machine/private-pcm.js';
import {admitAudioWorkerRPC,finishAudioWorkerRPC,createPrivateAudioWorker,admitAudioWorkerInit,audioWorkerInitCurrent,finishAudioWorkerInit,audioWorkerAccepts,retireAudioWorker,beginAudioWorkerClose,finishAudioWorkerClose,beginAudioWorkerControl,finishAudioWorkerControl,beginAudioWorkerLoad,audioWorkerLoadCurrent,advanceAudioWorkerLoad,admitAudioWorkerRefresh,settleAudioWorkerRefresh} from '../generated/internal/machine/private-audio-worker.js';
let source;const loading=new AbortController(),refreshes=new Map();
let engine,port,ptr,timer;
let lifecycle=createPrivateAudioWorker();
let transport=createPrivatePCM('audio');
let stopPromise,stopAck,closePromise;
function stopTransport(){
 if(stopPromise)return stopPromise;
 if(!port)return Promise.resolve();
 const admission=beginPrivatePCMStop(transport,performance.now());transport=admission.state;
 let resolve,reject,timeout;
 const completion=new Promise((yes,no)=>{resolve=yes;reject=no;});
 // Publish before timers, port callbacks or close observers can reenter.
 stopPromise=completion.finally(()=>port.close());
 const settle=(input,error)=>{
  const result=settlePrivatePCMStop(transport,input);transport=result.state;if(result.outcome==='ignore')return false;
  clearTimeout(timeout);stopAck=undefined;result.outcome==='resolve'?resolve():reject(error);return true;
 };
 const expire=()=>{if(transport.phase!=='stopping')return;try{if(!settle({kind:'deadline',now:performance.now()},Error('Worklet stop deadline')))timeout=setTimeout(expire,Math.max(0,admission.deadline-performance.now()));}catch(error){settle({kind:'send-error'},error);}};
 stopAck=id=>settle({kind:'ack',id});
 try{timeout=setTimeout(expire,Math.max(0,admission.deadline-performance.now()));port.postMessage({type:'stop',id:admission.id});}
 catch(error){settle({kind:'send-error'},error);}
 return stopPromise;
}
// Firefox stacks omit the message; preserve it for public error classification.
const describeError=cause=>String(cause)+(cause?.stack?'\n'+cause.stack:'');
function fail(cause){
 const failure=failPrivatePCM(transport,describeError(cause));transport=failure.state;if(!failure.accepted)return;
 // Retire logical publication before revoking reads: abort listeners may reenter.
 retireHost();clearInterval(timer);
 engine?.dispose();
 void stopTransport().catch(()=>{});
 postMessage({type:'transportError',error:transport.error,cleanup:{scheduler:engine?.scheduler.snapshot(),source:engine?.source.snapshot()}});
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const header=()=>new Uint32Array(engine.raw.memory.buffer,ptr,8);
function pump(){
 if(!engine||!port||lifecycle.phase==='closing'||lifecycle.phase==='closed')return;
 const admission=beginPrivatePCMPump(transport);transport=admission.state;if(!admission.accepted)return;
 try{
  for(;;){
   const h=header(),step=nextPrivatePCMStep(transport,{produced:h[0],consumed:h[1],epoch:h[3],nativeRunning:!!h[2],contextRunning:lifecycle.contextRunning,userPaused:lifecycle.userPaused});transport=step.state;
   const effect=step.effect;if(effect.kind==='idle')return;if(effect.kind==='error')throw Error(effect.message);
   if(effect.kind==='reset'){port.postMessage({type:'reset',epoch:effect.epoch});return;}
   if(effect.kind==='state'){port.postMessage({type:'state',epoch:effect.epoch,running:effect.running});continue;}
   const pcm=new Float32Array(effect.frames*2),ring=new Float32Array(engine.raw.memory.buffer,ptr+32,8192*8);
   for(let i=0;i<effect.frames;i++){const at=((effect.start+i)%8192)*2;pcm[i*2]=ring[at];pcm[i*2+1]=ring[at+1];}
   port.postMessage({type:'pcm',epoch:effect.epoch,start:effect.start,buffer:pcm.buffer},[pcm.buffer]);
  }
 }catch(error){fail(error);}finally{transport=finishPrivatePCMPump(transport);}
}
function feedback(data){
 if(data.type==='stopped'&&data.id==='worker-close'){stopAck?.(data.id);return;}
 if(transport.error!==null||lifecycle.phase==='closed'||!engine)return;
 if(data.type==='error'){fail(data.error);return;}
 const h=header(),input=data.type==='resetAck'?{kind:'resetAck',epoch:data.epoch}:data.type==='consumed'?{kind:'consumed',epoch:data.epoch,frames:data.frames}:{kind:'other',epoch:data.epoch};
 const decision=privatePCMFeedback(transport,input,h[3],h[1]);transport=decision.state;
 if(decision.error){fail(decision.error);return;}
 if(decision.write){h[7]=decision.write.epoch;h[1]=decision.write.consumed;}
 if(decision.pump)pump();
}
async function invoke(name,...args){if(transport.error!==null)throw Error(transport.error);return engine.call('private_audio_'+name,...args);}
async function checked(name,...args){const r=await invoke(name,...args);if(r<0){const failures=engine.source.drainFailures();throw Error(failures.length?'Source transport: '+failures.map(f=>String(f.cause??f.kind)).join('; '):name+' returned '+r);}return r;}
function rejectRefreshes(ids){for(const id of ids){const pending=refreshes.get(id);if(pending){refreshes.delete(id);clearTimeout(pending.timer);pending.reject(Error('Source closed'));}}}
function retireHost(){
 const retired=retireAudioWorker(lifecycle);lifecycle=retired.state;if(!retired.revoke)return;
 // Logical retirement precedes abort/source callbacks and native cancellation.
 clearInterval(timer);rejectRefreshes(retired.refreshes);loading.abort();source?.close();engine?.source.cancelSource();void stopTransport().catch(()=>{});
}
function assertInit(){if(!audioWorkerInitCurrent(lifecycle))throw Error('Audio host closing');}
function assertLoad(id){if(!audioWorkerLoadCurrent(lifecycle,id))throw Error('Audio host closing');}
function requestRefresh(load,resource){
 const admission=admitAudioWorkerRefresh(lifecycle,load,performance.now());lifecycle=admission.state;if(!admission.request)return Promise.reject(Error('Source closed'));
 const {id,deadline}=admission.request;
 return new Promise((resolve,reject)=>{
  const pending={resolve,reject,timer:undefined};refreshes.set(id,pending);
  const settle=(input,error)=>{const result=settleAudioWorkerRefresh(lifecycle,id,input);lifecycle=result.state;if(!result.accepted)return false;refreshes.delete(id);clearTimeout(pending.timer);reject(error);return true;};
  const expire=()=>{if(refreshes.get(id)!==pending)return;try{if(!settle({kind:'deadline',now:performance.now()},Error('Authorization refresh timed out')))pending.timer=setTimeout(expire,Math.max(0,deadline-performance.now()));}catch(error){settle({kind:'send-error'},error);}};
  try{pending.timer=setTimeout(expire,Math.max(0,deadline-performance.now()));postMessage({type:'refresh',refreshId:String(id),resource});}catch(error){settle({kind:'send-error'},error);}
 });
}
async function loadAudio(data){
 let decision=beginAudioWorkerLoad(lifecycle,!!data.replace);lifecycle=decision.state;rejectRefreshes(decision.retire??[]);const id=decision.id;let result;
 for(;;){
  const effect=decision.effect;if(effect.kind==='error')throw Error(effect.message);if(effect.kind==='done')return result;assertLoad(id);
  let input;
  if(effect.kind==='close'){pump();await invoke('close');assertLoad(id);pump();input={kind:'closed'};}
  else if(effect.kind==='sample.flush')input={kind:'flush',ack:transport.ack};
  else if(effect.kind==='wait'){await delay(effect.ms);input={kind:effect.phase==='flush'?'flush.waited':'load.waited'};}
  else if(effect.kind==='handles')input={kind:'handles',live:!!await engine.call('demuxe_source_live')};
  else if(effect.kind==='create'){await checked('create',lifecycle.configuredRate);input={kind:'created'};}
  else if(effect.kind==='source'){
   source?.close();assertLoad(id);source=privateMpvSource(data,data.canRefresh?resource=>requestRefresh(id,resource):undefined);await source.open(engine);input={kind:'source.opened'};
  }else if(effect.kind==='open'){await checked('open');input={kind:'opened'};}
  else if(effect.kind==='loaded')input={kind:'loaded',loaded:!!await checked('loaded')};
  else if(effect.kind==='chains'){result=await invoke('chains');input={kind:'chains'};}
  decision=advanceAudioWorkerLoad(lifecycle,id,input);lifecycle=decision.state;
 }
}
async function controlAudio(kind,value){
 const admission=beginAudioWorkerControl(lifecycle,kind,!!value);lifecycle=admission.state;if(admission.id===null)throw Error('Audio host closed');
 const run=async effects=>{for(const effect of effects){if(!audioWorkerAccepts(lifecycle,kind))throw Error('Audio host closing');if(effect.kind==='pump')pump();else if(effect.kind==='device')header()[6]=+effect.running;else await checked('pause',+effect.paused);}};
 await run(admission.effects);const completion=finishAudioWorkerControl(lifecycle,admission.id);lifecycle=completion.state;if(!completion.accepted)throw Error('Audio host closing');await run(completion.effects);return true;
}
function closeAudio(){
 if(closePromise)return closePromise;
 const admission=beginAudioWorkerClose(lifecycle);lifecycle=admission.state;
 let resolve,reject;closePromise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 retireHost();
 void (async()=>{
  clearInterval(timer);await stopTransport();if(!engine){lifecycle=finishAudioWorkerClose(lifecycle);return {live:0,maxOutstanding:transport.maxOutstanding,feedbackCount:transport.feedbackCount,error:transport.error??undefined};}
  await invoke('close');const live=await engine.call('demuxe_source_live');
  const result={live,scheduler:engine.scheduler.snapshot(),source:engine.source.snapshot(),maxOutstanding:transport.maxOutstanding,feedbackCount:transport.feedbackCount,error:transport.error??undefined};
  lifecycle=finishAudioWorkerClose(lifecycle);const owned=engine;engine=null;owned.dispose();return result;
 })().then(resolve,reject);
 return closePromise;
}
function rpcBytes(value){
 let bytes=0,nodes=0;const seen=new Set(),stack=[[value,0]];
 while(stack.length){const [item,depth]=stack.pop();if(++nodes>4096||depth>16)throw Error('Audio RPC envelope capacity');
  if(typeof item==='string'){bytes+=item.length*2;}else if(item&&typeof item==='object'&&!seen.has(item)){
   seen.add(item);bytes+=64;
   if(item instanceof ArrayBuffer||typeof SharedArrayBuffer!=='undefined'&&item instanceof SharedArrayBuffer)bytes+=item.byteLength;
   else if(ArrayBuffer.isView(item))stack.push([item.buffer,depth+1]);
   else if(!(typeof Blob!=='undefined'&&item instanceof Blob)&&!(typeof MessagePort!=='undefined'&&item instanceof MessagePort)&&!(typeof OffscreenCanvas!=='undefined'&&item instanceof OffscreenCanvas)){
    if(!Array.isArray(item)&&Object.prototype.toString.call(item)!=='[object Object]')throw Error('Unsupported audio RPC envelope');
    for(const key in item)if(Object.prototype.hasOwnProperty.call(item,key)){bytes+=key.length*2;stack.push([item[key],depth+1]);if(stack.length>4096)throw Error('Audio RPC envelope capacity');}
   }
  }
  if(bytes>64*1024*1024)throw Error('Audio RPC byte capacity');
 }return bytes;
}
let chain=Promise.resolve();
onmessage=({data:d})=>{
 if(d.op==='refreshed'){
  const id=Number(d.refreshId),decision=settleAudioWorkerRefresh(lifecycle,id,{kind:'reply'});lifecycle=decision.state;
  const pending=refreshes.get(id);if(decision.accepted&&pending){refreshes.delete(id);clearTimeout(pending.timer);d.error?pending.reject(Error('Authorization refresh failed')):pending.resolve(d.update);}return;
 }
 let rpc;try{const admission=admitAudioWorkerRPC(lifecycle,rpcBytes(d),d.op==='close');lifecycle=admission.state;if(admission.id===undefined)throw Error(admission.error);rpc=admission.id;}catch(error){d.port?.close();postMessage({id:d.id,error:describeError(error)});return;}
 // Close revokes pending reads before waiting on the serialized native queue.
 try{if(d.op==='close')retireHost();}catch(error){lifecycle=finishAudioWorkerRPC(lifecycle,rpc);postMessage({id:d.id,error:describeError(error)});return;}
 chain=chain.then(async()=>{
  if(d.op==='init'&&lifecycle.initialized){d.port?.close();postMessage({id:d.id,error:'Audio host already initialized'});return;}
  if(!audioWorkerAccepts(lifecycle,d.op)){d.port?.close();postMessage({id:d.id,error:'Audio host closed'});return;}
  try{
   let result;
   if(d.op==='init'){
    const admission=admitAudioWorkerInit(lifecycle,d.rate,!!d.contextRunning);lifecycle=admission.state;if(admission.error)throw Error(admission.error);
    port=d.port;port.onmessage=({data})=>feedback(data);port.start();assertInit();
    const acquired=await privateMpv(d.backend,'audio',{signal:loading.signal}).catch(error=>{throw Error('Private mpv initialization: '+error);});
    if(!audioWorkerInitCurrent(lifecycle)){acquired.dispose();throw Error('Audio host closing');}engine=acquired;
    ptr=await invoke('ptr');assertInit();const h=header();h[6]=+lifecycle.contextRunning;h[5]=d.latencyUs??0;
    await checked('create',d.rate);const completion=finishAudioWorkerInit(lifecycle);lifecycle=completion.state;if(!completion.accepted)throw Error('Audio host closing');timer=setInterval(pump,4);result=engine.facts();
   }else if(d.op==='load')result=await loadAudio(d);
   else if(d.op==='pause'||d.op==='context')result=await controlAudio(d.op,d.value);
   else if(d.op==='speed'){await checked('speed',d.value);result=true;}
   else if(d.op==='seek'){await checked('seek',d.value);pump();result=true;}
   else if(d.op==='latency'){header()[5]=Math.max(0,Math.min(1000000,Math.round(d.value)));result=true;}
   else if(d.op==='status')result={runtime:engine.facts(),time:await invoke('time'),eof:await invoke('eof'),chains:await invoke('chains'),header:Array.from(header()),epoch:transport.epoch,posted:transport.posted,ack:transport.ack,userPaused:lifecycle.userPaused,maxOutstanding:transport.maxOutstanding,feedbackCount:transport.feedbackCount,staleFeedback:transport.staleFeedback,error:transport.error??undefined};
   else if(d.op==='close')result=await closeAudio();
   else throw Error('Unknown audio operation');
   if(!audioWorkerAccepts(lifecycle,d.op))throw Error('Audio host closing');postMessage({id:d.id,result});
  }catch(error){if(lifecycle.phase!=='closing'||d.op==='close')fail(error);postMessage({id:d.id,error:describeError(error)});}
 }).finally(()=>{lifecycle=finishAudioWorkerRPC(lifecycle,rpc);});
};
