// SPDX-License-Identifier: Apache-2.0
export type BackendRequestProfile='software'|'audio';
export type BackendRequest=Readonly<{id:number;op:string;deadline:number}>;
export type BackendRequests=Readonly<{profile:BackendRequestProfile;phase:'active'|'closing'|'closed';failed:boolean;nextId:number;pending:readonly BackendRequest[]}>;
export type BackendRequestAdmission=Readonly<{state:BackendRequests;effect:Readonly<{kind:'send';request:BackendRequest}|{kind:'reject';reason:'closed'|'failed'|'capacity'}>}>;
export function createBackendRequests(profile:BackendRequestProfile):BackendRequests{return Object.freeze({profile,phase:'active',failed:false,nextId:1,pending:Object.freeze([])});}
export function admitBackendRequest(state:BackendRequests,op:string,now:number):BackendRequestAdmission{
  const reject=(reason:'closed'|'failed'|'capacity'):BackendRequestAdmission=>Object.freeze({state,effect:Object.freeze({kind:'reject',reason})});
  if(state.phase==='closed')return reject('closed');
  if(op!=='close'){
    if(state.phase!=='active')return reject('closed');
    if(state.failed)return reject('failed');
    if(state.profile==='software'&&state.pending.length>=128)return reject('capacity');
  }
  const timeout=state.profile==='software'?(op==='init'?60000:op==='close'?2000:25000):(op==='close'?1500:15000);
  const request=Object.freeze({id:state.nextId,op,deadline:now+timeout});
  return Object.freeze({state:Object.freeze({...state,nextId:state.nextId+1,pending:Object.freeze([...state.pending,request])}),effect:Object.freeze({kind:'send',request})});
}
export type BackendRequestSettlement=Readonly<{state:BackendRequests;effect:Readonly<{kind:'ignore'}|{kind:'settle';request:BackendRequest;fatal:boolean}>}>;
export function settleBackendRequest(state:BackendRequests,id:number,event:Readonly<{kind:'reply'|'transport-error'}|{kind:'deadline';now:number}>):BackendRequestSettlement{
  const request=state.pending.find(request=>request.id===id);
  if(!request||event.kind==='deadline'&&event.now<request.deadline)return Object.freeze({state,effect:Object.freeze({kind:'ignore'})});
  return Object.freeze({state:Object.freeze({...state,pending:Object.freeze(state.pending.filter(request=>request.id!==id))}),effect:Object.freeze({kind:'settle',request,fatal:event.kind==='deadline'&&state.profile==='audio'})});
}
export function failBackendRequests(state:BackendRequests):Readonly<{state:BackendRequests;reject:readonly number[];notify:boolean}>{
  if(state.failed||state.phase!=='active')return Object.freeze({state,reject:Object.freeze([]),notify:false});
  return Object.freeze({state:Object.freeze({...state,failed:true,pending:Object.freeze([])}),reject:Object.freeze(state.pending.map(request=>request.id)),notify:true});
}
/** Closing blocks new ordinary requests while existing replies and the cleanup
 * request retain their original settlement/deadline semantics. */
export function beginBackendClose(state:BackendRequests):BackendRequests{return state.phase==='active'?Object.freeze({...state,phase:'closing'}):state;}
export function finishBackendClose(state:BackendRequests):Readonly<{state:BackendRequests;reject:readonly number[]}>{
  return Object.freeze({state:Object.freeze({...state,phase:'closed',pending:Object.freeze([])}),reject:Object.freeze(state.pending.map(request=>request.id))});
}
