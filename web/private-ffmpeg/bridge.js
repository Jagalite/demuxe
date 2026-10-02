// SPDX-License-Identifier: MIT
// Serialized native execution; physical modules, handles and timers stay here.
import {SingleOwner} from './single-owner.js';
import {RangeSource} from './range-source.js';
import {initialFfmpegBridge,transitionFfmpegBridgeExecution,beginFfmpegSource,ffmpegSourceCurrent,setFfmpegHandle,detachFfmpegHandle,beginFfmpegShutdown,ffmpegShutdownRemaining,failFfmpegBridge,finishFfmpegBridge} from '../generated/internal/machine/ffmpeg-bridge.js';
const boundModules=new WeakSet();
const operations=new Set(['rm_set_demuxer','rm_probe','rm_open','rm_start','rm_step','rm_close','rm_error','rm_set_container','rm_duration','rm_video_codec','rm_audio_codec','rm_adapt_audio']);
export function createFFmpegBridge(Module,{timeoutMs=5000,shutdownTimeoutMs=5000}={}){
 if(typeof Module?.ccall!=='function'||!(Module.HEAPU8?.buffer instanceof ArrayBuffer))throw Error('Private FFmpeg memory and ccall are required');
 if(boundModules.has(Module))throw Error('FFmpeg module already has an owner or requires discard');
 if(!Number.isInteger(shutdownTimeoutMs)||shutdownTimeoutMs<1||shutdownTimeoutMs>120000)throw Error('Invalid shutdown deadline');
 let state=initialFfmpegBridge(),closing,fatal=null;
 const owner=new SingleOwner({store:{read:()=>state.execution,dispatch:input=>{const next=transitionFfmpegBridgeExecution(state,input);state=next.state;return next.decision;}}});
 const source=new RangeSource(owner,{timeoutMs,maxPending:1});source.attach({get buffer(){return Module.HEAPU8.buffer;}});
 boundModules.add(Module);
 const disable=()=>{Module.nonIsolatedRead=()=>-1;};
 function remember(error){if(!state.discard){state=failFfmpegBridge(state);fatal=Error('FFmpeg runtime failure');if(error instanceof Error)fatal=error;else try{fatal=Error(String(error));}catch{}}}
 function cleanup(fn){try{fn();}catch(error){remember(error);}}
 function poison(error){remember(error);cleanup(()=>source.close());cleanup(()=>owner.close(fatal));cleanup(disable);}
 try{Module.nonIsolatedRead=(ptr,count,offset)=>source.read(state.handle,ptr,count,offset);}catch(error){poison(error);throw error;}
 async function ccall(name,returnType,argTypes,args){
  try{const invoke=Module.ccall;if(owner.stopped||!owner.active)throw fatal??Error('FFmpeg owner retired before call');return await invoke.call(Module,name,returnType,argTypes,args,{async:true});}
  catch(error){poison(error);throw error;}
 }
 return {
  owner,source,get state(){return state.phase;},get requiresDiscard(){return state.discard;},
  setSource(reader){
   const admitted=beginFfmpegSource(state);state=admitted.state;if(admitted.id===null)throw Error('Cannot replace an active FFmpeg source; cancel and await first');
   const id=admitted.id,current=()=>ffmpegSourceCurrent(state,id);
   source.setSource(reader);if(!current())return;
   const previous=state.handle;state=setFfmpegHandle(state,id,-1);if(previous>=0)source.closeHandle(previous);if(!current())return;
   const handle=source.open();if(!current()){if(handle>=0)source.closeHandle(handle);return;}
   if(handle<0)throw Error('Cannot open FFmpeg source');state=setFfmpegHandle(state,id,handle);
  },
  call(name,returnType,argTypes,args){if(state.phase!=='ready')return Promise.reject(fatal??Error('FFmpeg bridge is '+state.phase));if(!operations.has(name))return Promise.reject(Error('Unadmitted FFmpeg API '+name));return owner.invoke(()=>ccall(name,returnType,argTypes,args));},
  cancel(){source.cancelSource();},
  destroy(){
   if(closing)return closing;
   let resolve,reject;closing=new Promise((yes,no)=>{resolve=yes;reject=no;});
   let shutdown;
   let timer,finished=false;
   const finish=error=>{
    if(finished)return;finished=true;
    if(error)remember(error);
    const handle=state.handle;state=detachFfmpegHandle(state);
    cleanup(()=>clearTimeout(timer));if(handle>=0)cleanup(()=>source.closeHandle(handle));
    cleanup(()=>source.close());cleanup(()=>owner.close(fatal??undefined));cleanup(disable);
    state=finishFfmpegBridge(state);if(state.discard)reject(fatal);else{boundModules.delete(Module);resolve();}
   };
   const arm=()=>{
    let remaining;try{const now=performance.now();remaining=ffmpegShutdownRemaining(state,shutdown.id,now);}catch(error){poison(error);finish(error);return;}if(finished||remaining===null)return;
    if(remaining===0){const error=Error('FFmpeg shutdown deadline exceeded; discard instance');poison(error);finish(error);return;}
    let acquired;try{acquired=setTimeout(arm,remaining);}catch(error){poison(error);finish(error);return;}
    if(finished)cleanup(()=>clearTimeout(acquired));else timer=acquired;
   };
   try{const now=performance.now();state=beginFfmpegShutdown(state,now,shutdownTimeoutMs);shutdown=state.shutdown;source.cancelSource();}catch(error){poison(error);finish(error);return closing;}
   if(state.discard){finish(fatal);return closing;}
   arm();
   if(!finished)(async()=>{await owner.idle();if(state.discard)throw fatal;if(finished)return;await owner.invoke(()=>ccall('rm_close',null,[],[]));})().then(()=>finish(),error=>finish(error));
   return closing;
  },
 };
}
