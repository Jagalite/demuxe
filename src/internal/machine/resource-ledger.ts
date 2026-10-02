// SPDX-License-Identifier: Apache-2.0
/** Resource metadata authority. Values, callbacks, promises and clocks never enter this state. */
export type ResourcePhase='active'|'releasing'|'released'|'failed'|'detached';
export type ResourceMetadata=Readonly<{id:string;scopeKey:string;kind:string;ownership:'owned'|'borrowed';state:ResourcePhase}>;
export type ResourceLedgerLimits=Readonly<{maxResources:number;maxScopes:number;failureLimit:number;cleanupTimeoutMs:number}>;
export type ResourceCleanupFailure=Readonly<{id:string;scopeKey:string;kind:string;name:'CleanupError'|'CleanupTimeoutError'|'CleanupSchedulerError';message:string}>;
export type ResourceLedgerState=Readonly<{
  limits:ResourceLedgerLimits;disposed:boolean;resources:readonly ResourceMetadata[];scopes:readonly Readonly<{key:string;retired:boolean}>[];
  failures:readonly ResourceCleanupFailure[];failureCount:number;timedOut:number;deadlineErrors:number;lateReleased:number;lateFailed:number;
}>;
export type ResourceLedgerInput=
  |Readonly<{type:'register';id:string;scopeKey:string;kind:string;ownership:'owned'|'borrowed'}>
  |Readonly<{type:'release';id:string;expectedScopeKey?:string}>
  |Readonly<{type:'retire-scope';scopeKey:string}>
  |Readonly<{type:'dispose'}>
  |Readonly<{type:'deadline';id:string;reason:'timeout'|'scheduler'}>
  |Readonly<{type:'physical-result';id:string;success:boolean}>;
export type ResourceLedgerRejection='invalid-id'|'invalid-scope'|'invalid-kind'|'invalid-ownership'|'duplicate'|'resource-capacity'|'scope-capacity'|'missing'|'scope-mismatch';
export type ResourceLedgerDecision=Readonly<{state:ResourceLedgerState;accepted:boolean;reason?:ResourceLedgerRejection;start?:boolean;late?:boolean;ids?:readonly string[];scopeKeys?:readonly string[]}>;
const valid=(value:string)=>typeof value==='string'&&value.length>0&&value.length<=256;
const no=(state:ResourceLedgerState,reason:ResourceLedgerRejection):ResourceLedgerDecision=>Object.freeze({state,accepted:false,reason});
const ok=(state:ResourceLedgerState,extra:Readonly<{start?:boolean;late?:boolean;ids?:readonly string[];scopeKeys?:readonly string[]}>= {}):ResourceLedgerDecision=>Object.freeze({state,...extra,accepted:true});
export function createResourceLedger(options:Partial<ResourceLedgerLimits>={}):ResourceLedgerState {
  const limits=Object.freeze({maxResources:options.maxResources??1024,maxScopes:options.maxScopes??256,failureLimit:options.failureLimit??32,cleanupTimeoutMs:options.cleanupTimeoutMs??5000});
  for(const [name,value]of Object.entries({maxResources:limits.maxResources,maxScopes:limits.maxScopes,failureLimit:limits.failureLimit}))if(!Number.isSafeInteger(value)||value<(name==='failureLimit'?0:1))throw new RangeError('Invalid resource registry capacity');
  if(!Number.isFinite(limits.cleanupTimeoutMs)||limits.cleanupTimeoutMs<1||limits.cleanupTimeoutMs>60000)throw new RangeError('Invalid resource registry cleanup deadline');
  return Object.freeze({limits,disposed:false,resources:Object.freeze([]),scopes:Object.freeze([]),failures:Object.freeze([]),failureCount:0,timedOut:0,deadlineErrors:0,lateReleased:0,lateFailed:0});
}
export function resourceMetadata(state:ResourceLedgerState,id:string):ResourceMetadata|undefined{return state.resources.find(entry=>entry.id===id);}
export function resourceScopeRetired(state:ResourceLedgerState,key:string):boolean{return state.disposed||state.scopes.some(scope=>scope.key===key&&scope.retired);}
export function resourceAvailable(state:ResourceLedgerState,id:string):boolean{const entry=resourceMetadata(state,id);return !!entry&&entry.state==='active'&&!resourceScopeRetired(state,entry.scopeKey);}
function replace(state:ResourceLedgerState,entry:ResourceMetadata,phase:ResourcePhase):ResourceLedgerState {
  const next:ResourceMetadata=Object.freeze({...entry,state:phase});
  return Object.freeze({...state,resources:Object.freeze(state.resources.map(item=>item.id===entry.id?next:item))});
}
function failure(state:ResourceLedgerState,entry:ResourceMetadata,reason:'physical'|'timeout'|'scheduler'):ResourceLedgerState {
  const name=reason==='timeout'?'CleanupTimeoutError':reason==='scheduler'?'CleanupSchedulerError':'CleanupError';
  const message=reason==='timeout'?'Resource cleanup exceeded its deadline':reason==='scheduler'?'Resource cleanup deadline could not be scheduled':'Resource cleanup failed';
  const summary:ResourceCleanupFailure=Object.freeze({id:entry.id,scopeKey:entry.scopeKey,kind:entry.kind,name,message});
  return Object.freeze({...state,failureCount:state.failureCount+1,failures:state.limits.failureLimit?Object.freeze([...state.failures,summary].slice(-state.limits.failureLimit)):state.failures});
}
export function transitionResourceLedger(state:ResourceLedgerState,input:ResourceLedgerInput):ResourceLedgerDecision {
  if(input.type==='register'){
    if(!valid(input.id))return no(state,'invalid-id');if(!valid(input.scopeKey))return no(state,'invalid-scope');if(!valid(input.kind))return no(state,'invalid-kind');
    if(input.ownership!=='owned'&&input.ownership!=='borrowed')return no(state,'invalid-ownership');
    if(resourceMetadata(state,input.id))return no(state,'duplicate');
    if(state.resources.length>=state.limits.maxResources)return no(state,'resource-capacity');
    const existing=state.scopes.some(scope=>scope.key===input.scopeKey);if(!existing&&state.scopes.length>=state.limits.maxScopes)return no(state,'scope-capacity');
    const entry:ResourceMetadata=Object.freeze({id:input.id,scopeKey:input.scopeKey,kind:input.kind,ownership:input.ownership,state:'active'});
    const scopes=existing?state.scopes:Object.freeze([...state.scopes,Object.freeze({key:input.scopeKey,retired:state.disposed})]);
    return ok(Object.freeze({...state,scopes,resources:Object.freeze([...state.resources,entry])}));
  }
  if(input.type==='retire-scope'){
    if(!valid(input.scopeKey))return no(state,'invalid-scope');
    const previous=state.scopes.find(scope=>scope.key===input.scopeKey);
    if(!previous&&state.scopes.length>=state.limits.maxScopes)return no(state,'scope-capacity');
    const scopes=previous?previous.retired?state.scopes:Object.freeze(state.scopes.map(scope=>scope.key===input.scopeKey?Object.freeze({...scope,retired:true}):scope)):Object.freeze([...state.scopes,Object.freeze({key:input.scopeKey,retired:true})]);
    return ok(scopes===state.scopes?state:Object.freeze({...state,scopes}),{ids:Object.freeze(state.resources.filter(entry=>entry.scopeKey===input.scopeKey).map(entry=>entry.id).reverse())});
  }
  if(input.type==='dispose')return ok(state.disposed?state:Object.freeze({...state,disposed:true,scopes:Object.freeze(state.scopes.map(scope=>scope.retired?scope:Object.freeze({...scope,retired:true})))}),{scopeKeys:Object.freeze(state.scopes.map(scope=>scope.key).reverse())});
  const entry=resourceMetadata(state,input.id);if(!entry)return no(state,'missing');
  if(input.type==='release'){
    if(input.expectedScopeKey!==undefined&&entry.scopeKey!==input.expectedScopeKey)return no(state,'scope-mismatch');
    return entry.state==='active'?ok(replace(state,entry,'releasing'),{start:true}):ok(state,{start:false});
  }
  if(input.type==='deadline'){
    if(entry.state!=='releasing')return ok(state,{start:false});
    const next=failure(replace(state,entry,'detached'),entry,input.reason);
    return ok(Object.freeze({...next,timedOut:next.timedOut+(input.reason==='timeout'?1:0),deadlineErrors:next.deadlineErrors+(input.reason==='scheduler'?1:0)}),{start:true});
  }
  if(entry.state!=='releasing'&&entry.state!=='detached')return ok(state,{start:false});
  const late=entry.state==='detached';let next=replace(state,entry,input.success?'released':'failed');
  if(late)next=Object.freeze({...next,lateReleased:next.lateReleased+(input.success?1:0),lateFailed:next.lateFailed+(input.success?0:1)});
  else if(!input.success)next=failure(next,entry,'physical');
  return ok(next,{start:true,late});
}
export function resourceLedgerDiagnostics(state:ResourceLedgerState){
  return Object.freeze({disposed:state.disposed,registered:state.resources.length,
    active:state.resources.filter(entry=>resourceAvailable(state,entry.id)).length,
    retiring:state.resources.filter(entry=>entry.state==='active'&&resourceScopeRetired(state,entry.scopeKey)).length,
    releasing:state.resources.filter(entry=>entry.state==='releasing').length,released:state.resources.filter(entry=>entry.state==='released').length,
    detached:state.resources.filter(entry=>entry.state==='detached').length,failed:state.failureCount,timedOut:state.timedOut,deadlineErrors:state.deadlineErrors,lateReleased:state.lateReleased,lateFailed:state.lateFailed,
    scopes:state.scopes.length,retiredScopes:state.scopes.filter(scope=>scope.retired).length,limits:state.limits,resources:state.resources,failures:state.failures});
}
