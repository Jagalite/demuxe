// SPDX-License-Identifier: Apache-2.0
/** MSE transaction metadata. The enclosing RemuxLifecycle owns generation authority. */
export type RemuxBufferResource=Readonly<{id:number;lane:number;bytes:number}>;
export type RemuxBufferUpdate=Readonly<{id:number;lane:number;kind:'append'|'remove';bytes:number;initialization:boolean;started:number}>;
export type RemuxBufferSegment=RemuxBufferUpdate&Readonly<{end:number}>;
export type RemuxBufferState=Readonly<{
 pullSerial:number;pull:number|null;resourceSerial:number;updateSerial:number;
 delivery:readonly RemuxBufferResource[];pending:readonly RemuxBufferResource[]|null;
 updates:readonly RemuxBufferUpdate[];segments:readonly RemuxBufferSegment[];
 busy:boolean;eof:boolean;headerAccepted:boolean;initAccepted:boolean;mediaAccepted:boolean;
}>;
export type RemuxBufferCommand=
 | Readonly<{type:'pull'}>
 | Readonly<{type:'part';pullId:number;bytes:number;updating?:boolean}>
 | Readonly<{type:'fragment';pullId:number;parts:readonly number[];buffers:readonly number[];more:boolean;updating:boolean}>
 | Readonly<{type:'header'}>
 | Readonly<{type:'take-delivery'}>
 | Readonly<{type:'take-pending'}>
 | Readonly<{type:'append';entries:readonly Readonly<{lane:number;bytes:number}>[];initialization:boolean;now:number}>
 | Readonly<{type:'remove';lane:number;cut:number;now:number;allLanes:boolean}>
 | Readonly<{type:'updated';id:number;lane:number;end:number;now:number;updating:boolean}>
 | Readonly<{type:'busy';value:boolean}>;
export type RemuxBufferDecision=Readonly<{
 state:RemuxBufferState;accepted:boolean;error?:string;pullId?:number;
 resources?:readonly RemuxBufferResource[];parts?:readonly RemuxBufferResource[];buffers?:readonly RemuxBufferResource[];
 updates?:readonly RemuxBufferUpdate[];latency?:number;
}>;
export function initialRemuxBuffer():RemuxBufferState {
 return Object.freeze({pullSerial:0,pull:null,resourceSerial:0,updateSerial:0,delivery:Object.freeze([]),pending:null,updates:Object.freeze([]),segments:Object.freeze([]),busy:false,eof:false,headerAccepted:false,initAccepted:false,mediaAccepted:false});
}
export function resetRemuxBuffer(state:RemuxBufferState,busy=false,clearEvidence=false):RemuxBufferState {
 return Object.freeze({...initialRemuxBuffer(),pullSerial:state.pullSerial,resourceSerial:state.resourceSerial,updateSerial:state.updateSerial,busy,initAccepted:!clearEvidence&&state.initAccepted,mediaAccepted:!clearEvidence&&state.mediaAccepted});
}
export function transitionRemuxBuffer(state:RemuxBufferState,command:RemuxBufferCommand):RemuxBufferDecision {
 const result=(next:RemuxBufferState,extra:Omit<RemuxBufferDecision,'state'|'accepted'>={},accepted=true)=>Object.freeze({state:next===state?state:Object.freeze({...next}),accepted,...extra});
 if(command.type==='busy')return result({...state,busy:command.value});
 if(command.type==='header')return state.headerAccepted?result(state,{error:'Duplicate remux initialization'},false):result({...state,headerAccepted:true});
 if(command.type==='pull'){
  if(state.pull!==null||state.eof||state.busy||state.updates.length||state.pending||state.delivery.length)return result(state,{},false);
  const pullId=state.pullSerial+1;return result({...state,pullSerial:pullId,pull:pullId,busy:true},{pullId});
 }
 if(command.type==='part'){
  if(state.pull!==command.pullId)return result(state,{error:'Unexpected progressive fragment operation'},false);
  const resource=Object.freeze({id:state.resourceSerial+1,lane:0,bytes:command.bytes});
  return result({...state,resourceSerial:resource.id,delivery:Object.freeze([...state.delivery,resource]),busy:state.updates.length>0||!!command.updating},{resources:Object.freeze([resource])});
 }
 if(command.type==='fragment'){
  if(state.pull!==command.pullId)return result(state,{error:'Unexpected remux fragment operation'},false);
  const parts=Object.freeze(command.parts.map((bytes,index)=>Object.freeze({id:state.resourceSerial+index+1,lane:0,bytes})));
  const buffers=Object.freeze(command.buffers.map((bytes,lane)=>Object.freeze({id:state.resourceSerial+parts.length+lane+1,lane,bytes})));
  return result({...state,pull:null,resourceSerial:state.resourceSerial+parts.length+buffers.length,delivery:Object.freeze([...state.delivery,...parts]),pending:buffers,eof:!command.more,busy:state.updates.length>0||command.updating},{parts,buffers});
 }
 if(command.type==='take-delivery'){
  if(!state.delivery.length)return result(state,{},false);
  return result({...state,delivery:Object.freeze(state.delivery.slice(1))},{resources:Object.freeze([state.delivery[0]])});
 }
 if(command.type==='take-pending')return state.pending?result({...state,pending:null},{resources:state.pending}):result(state,{},false);
 if(command.type==='append'){
  const entries=command.entries.filter(entry=>entry.bytes>0);
  if(entries.some((entry,index)=>state.updates.some(update=>update.lane===entry.lane)||entries.some((other,otherIndex)=>otherIndex<index&&entry.lane===other.lane)))return result(state,{error:'SourceBuffer update already pending'},false);
  const updates=Object.freeze(entries.map((entry,index)=>Object.freeze({id:state.updateSerial+index+1,lane:entry.lane,kind:'append' as const,bytes:entry.bytes,initialization:command.initialization,started:command.now})));
  return result({...state,updateSerial:state.updateSerial+updates.length,updates:Object.freeze([...state.updates,...updates]),segments:Object.freeze([...state.segments,...updates.map(update=>Object.freeze({...update,end:Infinity}))]),busy:updates.length>0||state.updates.length>0},{updates});
 }
 if(command.type==='remove'){
  if(state.updates.some(update=>update.lane===command.lane))return result(state,{error:'SourceBuffer update already pending'},false);
  const update=Object.freeze({id:state.updateSerial+1,lane:command.lane,kind:'remove' as const,bytes:0,initialization:false,started:command.now});
  return result({...state,updateSerial:update.id,updates:Object.freeze([...state.updates,update]),segments:Object.freeze(state.segments.filter(segment=>(!command.allLanes&&segment.lane!==command.lane)||segment.end>command.cut)),busy:true},{updates:Object.freeze([update])});
 }
 const update=state.updates.find(entry=>entry.id===command.id&&entry.lane===command.lane);
 if(!update)return result(state,{},false);
 const updates=Object.freeze(state.updates.filter(entry=>entry.id!==update.id)),append=update.kind==='append';
 return result({...state,updates,segments:append?Object.freeze(state.segments.map(segment=>segment.id===update.id?Object.freeze({...segment,end:command.end}):segment)):state.segments,busy:updates.length>0||command.updating,initAccepted:state.initAccepted||append&&update.initialization,mediaAccepted:state.mediaAccepted||append&&!update.initialization},append?{latency:command.now-update.started}:{});
}
