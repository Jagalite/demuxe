// SPDX-License-Identifier: Apache-2.0
import {createWasmSeek,clearWasmSeek,beginWasmSeek,observeWasmSeek,confirmWasmSeek} from './wasm-seek.js';
import type {WasmSeekState,WasmSeekObservation} from './wasm-seek.js';
import {createWasmSettings,updateWasmSettings} from './wasm-settings.js';
import type {WasmSettings,WasmSettingInput} from './wasm-settings.js';
/** Logical ownership only. Workers, promises, errors and timers remain in the shell. */
export type WasmPhase='initializing'|'ready'|'failed'|'retiring'|'closed';
export type WasmDeadline=Readonly<{id:number;deadline:number}>;
export type WasmLifecycle=Readonly<{phase:WasmPhase;initSent:boolean;workerFailed:boolean;nextRequest:number;nextWaiter:number;nextOpen:number;requests:readonly WasmDeadline[];waiters:readonly WasmDeadline[];open:number|null;hasFile:boolean;seek:WasmSeekState;settings:WasmSettings}>;
export function createWasmLifecycle(decoderOutput=true):WasmLifecycle{return Object.freeze({phase:'initializing',initSent:false,workerFailed:false,nextRequest:100,nextWaiter:1,nextOpen:1,requests:Object.freeze([]),waiters:Object.freeze([]),open:null,hasFile:false,seek:createWasmSeek(),settings:createWasmSettings(decoderOutput)});}
export function wasmAlive(state:WasmLifecycle):boolean{return state.phase==='initializing'||state.phase==='ready';}
export function markWasmInitialized(state:WasmLifecycle):WasmLifecycle{return wasmAlive(state)?Object.freeze({...state,initSent:true}):state;}
export function settleWasmInitialization(state:WasmLifecycle,success:boolean):WasmLifecycle{return state.phase==='initializing'?Object.freeze({...state,phase:success?'ready':'failed'}):state;}
export function claimWasmWorkerFailure(state:WasmLifecycle):Readonly<{state:WasmLifecycle;accepted:boolean}>{
  if(!wasmAlive(state)||state.workerFailed)return Object.freeze({state,accepted:false});
  return Object.freeze({state:Object.freeze({...state,workerFailed:true,phase:state.phase==='initializing'?'failed':state.phase}),accepted:true});
}
export function admitWasmRequest(state:WasmLifecycle,now:number):Readonly<{state:WasmLifecycle;request:WasmDeadline|null;reason:'unavailable'|'capacity'|null}>{
  if(!wasmAlive(state))return Object.freeze({state,request:null,reason:'unavailable'});
  if(state.requests.length>=128)return Object.freeze({state,request:null,reason:'capacity'});
  const request=Object.freeze({id:state.nextRequest,deadline:now+15000});
  return Object.freeze({state:Object.freeze({...state,nextRequest:state.nextRequest+1,requests:Object.freeze([...state.requests,request])}),request,reason:null});
}
export function settleWasmRequest(state:WasmLifecycle,id:number,now?:number):Readonly<{state:WasmLifecycle;accepted:boolean}>{
  const request=state.requests.find(item=>item.id===id);
  if(!request||now!==undefined&&now<request.deadline)return Object.freeze({state,accepted:false});
  return Object.freeze({state:Object.freeze({...state,requests:Object.freeze(state.requests.filter(item=>item.id!==id))}),accepted:true});
}
export function rejectWasmRequests(state:WasmLifecycle,id?:number):Readonly<{state:WasmLifecycle;ids:readonly number[]}>{
  const ids=Object.freeze(state.requests.filter(item=>id===undefined||item.id===id).map(item=>item.id));
  return Object.freeze({state:ids.length?Object.freeze({...state,requests:Object.freeze(state.requests.filter(item=>!ids.includes(item.id)))}):state,ids});
}
export function admitWasmWaiter(state:WasmLifecycle,now:number):Readonly<{state:WasmLifecycle;waiter:WasmDeadline|null}>{
  if(!wasmAlive(state))return Object.freeze({state,waiter:null});
  const waiter=Object.freeze({id:state.nextWaiter,deadline:now+25000});
  return Object.freeze({state:Object.freeze({...state,nextWaiter:state.nextWaiter+1,waiters:Object.freeze([...state.waiters,waiter])}),waiter});
}
export function settleWasmWaiter(state:WasmLifecycle,id:number,now?:number):Readonly<{state:WasmLifecycle;accepted:boolean}>{
  const waiter=state.waiters.find(item=>item.id===id);
  if(!waiter||now!==undefined&&now<waiter.deadline)return Object.freeze({state,accepted:false});
  return Object.freeze({state:Object.freeze({...state,waiters:Object.freeze(state.waiters.filter(item=>item.id!==id))}),accepted:true});
}
export function beginWasmOpen(state:WasmLifecycle):Readonly<{state:WasmLifecycle;id:number|null;reason:'unavailable'|'busy'|null}>{
  if(!wasmAlive(state))return Object.freeze({state,id:null,reason:'unavailable'});
  if(state.open!==null)return Object.freeze({state,id:null,reason:'busy'});
  return Object.freeze({state:Object.freeze({...state,open:state.nextOpen,nextOpen:state.nextOpen+1}),id:state.nextOpen,reason:null});
}
export function ownsWasmOpen(state:WasmLifecycle,id:number):boolean{return wasmAlive(state)&&state.open===id;}
export function finishWasmOpen(state:WasmLifecycle,id:number):WasmLifecycle{return state.open===id?Object.freeze({...state,open:null}):state;}
export function observeWasmFile(state:WasmLifecycle,present:boolean):WasmLifecycle{
 if(!wasmAlive(state))return state;const seek=present?clearWasmSeek(state.seek):state.seek;
 return state.hasFile===present&&seek===state.seek?state:Object.freeze({...state,hasFile:present,seek});
}
export function beginWasmPlayerSeek(state:WasmLifecycle,target:number):Readonly<{state:WasmLifecycle;reason:'invalid'|'unavailable'|null}>{
 const decision=beginWasmSeek(state.seek,target);if(!decision.accepted)return Object.freeze({state,reason:'invalid'});
 if(!wasmAlive(state))return Object.freeze({state,reason:'unavailable'});
 return Object.freeze({state:Object.freeze({...state,seek:decision.state}),reason:null});
}
export function observeWasmPlayerSeek(state:WasmLifecycle,event:WasmSeekObservation):WasmLifecycle{
 if(!wasmAlive(state))return state;const seek=observeWasmSeek(state.seek,event);return seek===state.seek?state:Object.freeze({...state,seek});
}
export function confirmWasmPlayerSeek(state:WasmLifecycle,id:number,target:number,position:number,settled:boolean):Readonly<{state:WasmLifecycle;confirmed:boolean}>{
 const decision=confirmWasmSeek(state.seek,id,target,position,settled);
 return Object.freeze({state:decision.state===state.seek?state:Object.freeze({...state,seek:decision.state}),confirmed:decision.confirmed});
}
export function retireWasmLifecycle(state:WasmLifecycle):Readonly<{state:WasmLifecycle;accepted:boolean;requests:readonly number[];waiters:readonly number[]}>{
  if(state.phase==='retiring'||state.phase==='closed')return Object.freeze({state,accepted:false,requests:Object.freeze([]),waiters:Object.freeze([])});
  return Object.freeze({state:Object.freeze({...state,phase:'retiring',open:null,hasFile:false,seek:clearWasmSeek(state.seek),requests:Object.freeze([]),waiters:Object.freeze([])}),accepted:true,requests:Object.freeze(state.requests.map(item=>item.id)),waiters:Object.freeze(state.waiters.map(item=>item.id))});
}
export function finishWasmRetirement(state:WasmLifecycle):WasmLifecycle{return state.phase==='retiring'?Object.freeze({...state,phase:'closed'}):state;}

export function applyWasmSetting(state:WasmLifecycle,input:WasmSettingInput):Readonly<{state:WasmLifecycle;accepted:boolean;send:boolean}>{
 if(!wasmAlive(state))return Object.freeze({state,accepted:false,send:false});
 const decision=updateWasmSettings(state.settings,input);
 return Object.freeze({state:decision.state===state.settings?state:Object.freeze({...state,settings:decision.state}),accepted:decision.accepted,send:decision.send&&(input.kind!=='watchdog'||state.initSent)});
}
