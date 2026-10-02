// SPDX-License-Identifier: MIT
import {privateMpv,privateMpvSource} from '../private-mpv.js';
import {createPrivatePCM,beginPrivatePCMPump,finishPrivatePCMPump,nextPrivatePCMStep,privatePCMFeedback,failPrivatePCM,beginPrivatePCMStop,settlePrivatePCMStop} from '../generated/internal/machine/private-pcm.js';
let source;const loading=new AbortController(),refreshes=new Map();
let engine,port,ptr,timer,contextRunning=false,userPaused=true;
let transport=createPrivatePCM('audio');
let initialized=false,closing=false,closed=false,configuredRate,stopPromise,stopAck;
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
 loading.abort();source?.close();clearInterval(timer);userPaused=true;
 engine?.source.cancelSource();engine?.dispose();
 void stopTransport().catch(()=>{});
 postMessage({type:'transportError',error:transport.error,cleanup:{scheduler:engine?.scheduler.snapshot(),source:engine?.source.snapshot()}});
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const header=()=>new Uint32Array(engine.raw.memory.buffer,ptr,8);
function pump(){
 if(!engine||!port||closing)return;
 const admission=beginPrivatePCMPump(transport);transport=admission.state;if(!admission.accepted)return;
 try{
  for(;;){
   const h=header(),step=nextPrivatePCMStep(transport,{produced:h[0],consumed:h[1],epoch:h[3],nativeRunning:!!h[2],contextRunning,userPaused});transport=step.state;
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
 if(transport.error!==null||closed||!engine)return;
 if(data.type==='error'){fail(data.error);return;}
 const h=header(),input=data.type==='resetAck'?{kind:'resetAck',epoch:data.epoch}:data.type==='consumed'?{kind:'consumed',epoch:data.epoch,frames:data.frames}:{kind:'other',epoch:data.epoch};
 const decision=privatePCMFeedback(transport,input,h[3],h[1]);transport=decision.state;
 if(decision.error){fail(decision.error);return;}
 if(decision.write){h[7]=decision.write.epoch;h[1]=decision.write.consumed;}
 if(decision.pump)pump();
}
async function invoke(name,...args){if(transport.error!==null)throw Error(transport.error);return engine.call('private_audio_'+name,...args);}
async function checked(name,...args){const r=await invoke(name,...args);if(r<0){const failures=engine.source.drainFailures();throw Error(failures.length?'Source transport: '+failures.map(f=>String(f.cause??f.kind)).join('; '):name+' returned '+r);}return r;}
let chain=Promise.resolve();
onmessage=({data:d})=>{
 if(d.op==='refreshed'){const p=refreshes.get(d.refreshId);if(p){refreshes.delete(d.refreshId);clearTimeout(p.timer);d.error?p.reject(Error('Authorization refresh failed')):p.resolve(d.update);}return;}
 // A pending source read may hold the current RPC. Close must revoke it now,
 // before its own serialized native teardown can run.
 if(d.op==='close'&&!closed){closing=true;loading.abort();source?.close();for(const p of refreshes.values()){clearTimeout(p.timer);p.reject(Error('Source closed'));}refreshes.clear();clearInterval(timer);engine?.source.cancelSource();void stopTransport().catch(()=>{});}
 chain=chain.then(async()=>{
 if(d.op==='init'&&initialized){d.port?.close();postMessage({id:d.id,error:'Audio host already initialized'});return;}
 if(closed||(closing&&d.op!=='close')){d.port?.close();postMessage({id:d.id,error:'Audio host closed'});return;}

 try{
  let result;
  if(d.op==='init'){
   initialized=true;configuredRate=d.rate;port=d.port;port.onmessage=({data})=>feedback(data);port.start();
   engine=await privateMpv(d.backend,'audio',{signal:loading.signal}).catch(error=>{throw Error('Private mpv initialization: '+error);});
   ptr=await invoke('ptr');if(closing)throw Error('Audio host closing');
   contextRunning=!!d.contextRunning;const h=header();h[6]=+contextRunning;h[5]=d.latencyUs??0;
   await checked('create',d.rate);timer=setInterval(pump,4);
   result=engine.facts();
  }else if(d.op==='load'){
   if(d.replace){
    userPaused=true;pump();await invoke('close');pump();
    for(let i=0;i<200&&!transport.ack;i++)await delay(5);
    if(!transport.ack)throw Error('Replacement flush deadline');
    if(await engine.call('demuxe_source_live'))throw Error('Old source handle retained');
    await checked('create',configuredRate);
   }
   source?.close();
   const refresh=d.canRefresh?resource=>new Promise((resolve,reject)=>{const refreshId=crypto.randomUUID();const timer=setTimeout(()=>{refreshes.delete(refreshId);reject(Error('Authorization refresh timed out'));},5000);refreshes.set(refreshId,{resolve,reject,timer});postMessage({type:'refresh',refreshId,resource});}):undefined;
   source=privateMpvSource(d,refresh);await source.open(engine);
   await checked('open');let loaded=0;
   for(let i=0;i<1000&&!loaded;i++){loaded=await checked('loaded');if(!loaded)await delay(5);}
   if(!loaded)throw Error('Load deadline');result=await invoke('chains');
  }else if(d.op==='pause'){
   if(d.value){userPaused=true;pump();}
   await checked('pause',d.value||!contextRunning?1:0);userPaused=!!d.value;pump();result=true;
  }
  else if(d.op==='speed'){await checked('speed',d.value);result=true;}
  else if(d.op==='seek'){await checked('seek',d.value);pump();result=true;}
  else if(d.op==='context'){
   // Suspend mpv while its AO still has a valid consumption state. Reporting a
   // stopped device first can make mpv classify the queued audio as an underrun.
   if(!d.value){contextRunning=false;pump();await checked('pause',1);header()[6]=0;}
   else{header()[6]=1;contextRunning=true;await checked('pause',userPaused?1:0);pump();}
   result=true;
  }
  else if(d.op==='latency'){header()[5]=Math.max(0,Math.min(1000000,Math.round(d.value)));result=true;}
  else if(d.op==='status'){
   result={runtime:engine.facts(),time:await invoke('time'),eof:await invoke('eof'),chains:await invoke('chains'),header:Array.from(header()),epoch:transport.epoch,posted:transport.posted,ack:transport.ack,userPaused,maxOutstanding:transport.maxOutstanding,feedbackCount:transport.feedbackCount,staleFeedback:transport.staleFeedback,error:transport.error??undefined};
  }else if(d.op==='close'){
   clearInterval(timer);await stopTransport();await invoke('close');
   const live=await engine.call('demuxe_source_live');
   result={live,scheduler:engine.scheduler.snapshot(),source:engine.source.snapshot(),maxOutstanding:transport.maxOutstanding,feedbackCount:transport.feedbackCount,error:transport.error??undefined};
   closed=true;engine.dispose();engine=null;
  }else throw Error('Unknown audio operation');
  postMessage({id:d.id,result});
 }catch(e){if(!closing||d.op==='close')fail(e);postMessage({id:d.id,error:describeError(e)});}
});};
