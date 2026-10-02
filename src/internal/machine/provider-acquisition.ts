// SPDX-License-Identifier: Apache-2.0
export type AcquisitionAvailability=Readonly<{state:'configured-unverified'|'available'|'absent'|'failed';reason?:string;failureId?:string}>;
export type AcquisitionOwner=Readonly<{id:string;availability:AcquisitionAvailability;preparation:'idle'|'pending'|'settled'}>;
export type AcquisitionAsset=Readonly<{identity:string;bytes:number;received:number;deadline:number;status:'pending'|'ready'|'failed';cancelled:boolean}>;
export type AcquisitionState=Readonly<{
  phase:'active'|'retiring'|'closed';catalogEpoch:number;scopeKey:string|null;timeoutMs:number;maxResidentBytes:number;reservedBytes:number;
  owners:readonly AcquisitionOwner[];assets:readonly AcquisitionAsset[];releases:readonly string[];
}>;
type Fault=Readonly<{kind:'reject';reason:'retired'|'stale'|'unresolved'|'absent'|'failed'|'budget'|'overflow'|'size'|'integrity';failureId?:string}>;
export type AcquisitionDecision=Fault|Readonly<{kind:'start'|'join'|'accepted'|'ignore'|'release'|'published'}>;
export type AcquisitionTransition=Readonly<{state:AcquisitionState;effect:AcquisitionDecision}>;
const result=(state:AcquisitionState,effect:AcquisitionDecision):AcquisitionTransition=>Object.freeze({state,effect:Object.freeze({...effect})});
export function createAcquisition(input:Readonly<{timeoutMs:number;maxResidentBytes:number;owners:readonly Readonly<{id:string;availability:AcquisitionAvailability}>[]}>):AcquisitionState{
  return Object.freeze({phase:'active',catalogEpoch:0,scopeKey:null,timeoutMs:input.timeoutMs,maxResidentBytes:input.maxResidentBytes,reservedBytes:0,
    owners:Object.freeze(input.owners.map(owner=>Object.freeze({id:owner.id,availability:Object.freeze({...owner.availability}),preparation:'idle' as const}))),assets:Object.freeze([]),releases:Object.freeze([])});
}
export function admitAcquisition(state:AcquisitionState,input:Readonly<{ticketEpoch:number|null;revisionMatches:boolean;scopeKey:string;resolved:boolean}>):AcquisitionTransition{
  if(state.phase!=='active')return result(state,{kind:'reject',reason:'retired'});
  if(input.ticketEpoch!==state.catalogEpoch||!input.revisionMatches||!input.scopeKey||state.scopeKey!==null&&state.scopeKey!==input.scopeKey)return result(state,{kind:'reject',reason:'stale'});
  if(!input.resolved)return result(state,{kind:'reject',reason:'unresolved'});
  return result(Object.freeze({...state,scopeKey:input.scopeKey}),{kind:'accepted'});
}
export function admitAcquisitionOwner(state:AcquisitionState,id:string):AcquisitionTransition{
  if(state.phase!=='active')return result(state,{kind:'reject',reason:'retired'});
  const owner=state.owners.find(owner=>owner.id===id);
  if(!owner||owner.availability.state==='absent')return result(state,{kind:'reject',reason:'absent'});
  if(owner.availability.state==='failed')return result(state,{kind:'reject',reason:'failed',failureId:owner.availability.failureId});
  if(owner.preparation!=='idle')return result(state,{kind:'join'});
  return result(Object.freeze({...state,owners:Object.freeze(state.owners.map(owner=>owner.id===id?Object.freeze({...owner,preparation:'pending' as const}):owner))}),{kind:'start'});
}
export function finishAcquisitionOwner(state:AcquisitionState,id:string,outcome:Readonly<{kind:'ready'}|{kind:'unavailable';reason:string}|{kind:'failed'}>):AcquisitionTransition{
  const owner=state.owners.find(owner=>owner.id===id);
  if(owner?.preparation!=='pending')return result(state,{kind:'ignore'});
  if(state.phase!=='active'){
    const next=Object.freeze({...state,owners:Object.freeze(state.owners.map(owner=>owner.id===id?Object.freeze({...owner,preparation:'settled' as const}):owner))});
    return result(next,{kind:outcome.kind==='ready'?'release':'ignore'});
  }
  const availability:AcquisitionAvailability=outcome.kind==='ready'?Object.freeze({state:'available'}):outcome.kind==='unavailable'?Object.freeze({state:'absent',reason:outcome.reason}):Object.freeze({state:'failed',failureId:id});
  return result(Object.freeze({...state,catalogEpoch:state.catalogEpoch+1,
    owners:Object.freeze(state.owners.map(owner=>owner.id===id?Object.freeze({...owner,availability,preparation:'settled' as const}):owner)),
    releases:outcome.kind==='ready'?Object.freeze([...state.releases,id]):state.releases}),{kind:'published'});
}
export function admitAcquisitionAsset(state:AcquisitionState,identity:string,bytes:number,now:number):AcquisitionTransition{
  if(state.phase!=='active')return result(state,{kind:'reject',reason:'retired'});
  if(state.assets.some(asset=>asset.identity===identity))return result(state,{kind:'join'});
  if(state.reservedBytes+bytes>state.maxResidentBytes)return result(state,{kind:'reject',reason:'budget'});
  return result(Object.freeze({...state,reservedBytes:state.reservedBytes+bytes,assets:Object.freeze([...state.assets,Object.freeze({identity,bytes,received:0,deadline:now+state.timeoutMs,status:'pending' as const,cancelled:false})])}),{kind:'start'});
}
export function observeAcquisitionAsset(state:AcquisitionState,identity:string,event:Readonly<{kind:'chunk';bytes:number}|{kind:'body'}|{kind:'digest';matches:boolean}|{kind:'failed'}|{kind:'deadline';now:number}>):AcquisitionTransition{
  const asset=state.assets.find(asset=>asset.identity===identity);
  if(!asset||asset.status!=='pending')return result(state,{kind:'ignore'});
  if(event.kind==='failed')return result(Object.freeze({...state,assets:Object.freeze(state.assets.map(asset=>asset.identity===identity?Object.freeze({...asset,status:'failed' as const}):asset))}),{kind:'accepted'});
  if(state.phase!=='active'||asset.cancelled)return result(state,{kind:'reject',reason:'retired'});
  if(event.kind==='deadline'){
    if(event.now<asset.deadline)return result(state,{kind:'ignore'});
    return result(Object.freeze({...state,assets:Object.freeze(state.assets.map(asset=>asset.identity===identity?Object.freeze({...asset,cancelled:true}):asset))}),{kind:'accepted'});
  }
  if(event.kind==='body')return result(state,asset.received===asset.bytes?{kind:'accepted'}:{kind:'reject',reason:'size'});
  if(event.kind==='chunk'&&asset.received+event.bytes>asset.bytes)return result(state,{kind:'reject',reason:'overflow'});
  if(event.kind==='digest'&&asset.received!==asset.bytes)return result(state,{kind:'reject',reason:'size'});
  if(event.kind==='digest'&&!event.matches)return result(state,{kind:'reject',reason:'integrity'});
  return result(Object.freeze({...state,assets:Object.freeze(state.assets.map(item=>item.identity===identity?Object.freeze({...item,received:event.kind==='chunk'?item.received+event.bytes:item.received,status:event.kind==='digest'?'ready' as const:item.status}):item))}),{kind:'accepted'});
}
export function retireAcquisition(state:AcquisitionState):AcquisitionTransition{
  if(state.phase!=='active')return result(state,{kind:'ignore'});
  return result(Object.freeze({...state,phase:'retiring'}),{kind:'accepted'});
}
/** Called after physical jobs settle; release order is reverse ready completion. */
export function acquisitionReleases(state:AcquisitionState):readonly string[]{return Object.freeze([...state.releases].reverse());}
export function closeAcquisition(state:AcquisitionState):AcquisitionState{return Object.freeze({...state,phase:'closed',assets:Object.freeze([]),releases:Object.freeze([]),reservedBytes:0});}
