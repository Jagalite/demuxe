// SPDX-License-Identifier: Apache-2.0
/** Immutable transport policy. Resource IDs are shell-owned aliases: no URLs,
 * credentials, request objects, response bodies, timers or callbacks enter here. */
export type ShakaNetworkFailure=Readonly<{code:'SOURCE_PERMISSION'|'SOURCE_CHANGED'|'UNSUPPORTED_FEATURE';message:string}>;
export type ShakaRange=Readonly<{start:bigint;requestedEnd:bigint|undefined;end:bigint;total:bigint|undefined;expected:bigint|undefined;complete:boolean}>;
export type ShakaNetworkRequest=Readonly<{id:number;kind:'manifest'|'segment'|'other';phase:'fetch'|'refresh'|'body'|'ready'|'cleanup';resource:number|undefined;attempt:number;cancelled:'abort'|'timeout'|null;deadline:number|undefined;limit:number;bytes:number;lastProgress:number;length:number;contentLength:string|undefined;range:ShakaRange|null}>;
export type ShakaNetworkState=Readonly<{active:boolean;serial:number;terminal:number;immutable:boolean;preview:boolean;requests:readonly ShakaNetworkRequest[];validators:readonly Readonly<{resource:number;value:string}>[];totals:readonly Readonly<{resource:number;value:bigint}>[]}>;
export type ShakaNetworkDecision=Readonly<{state:ShakaNetworkState;accepted:boolean;failure?:ShakaNetworkFailure;id?:number;remaining?:number;refresh?:boolean;progress?:Readonly<{elapsed:number;bytes:number;remaining:number}>;slice?:Readonly<{start:number;end:number}>;streamRange?:boolean}>;
const failure=(code:ShakaNetworkFailure['code'],message:string):ShakaNetworkFailure=>Object.freeze({code,message});
const changed=(message:string)=>failure('SOURCE_CHANGED',message);
const permission=(message:string)=>failure('SOURCE_PERMISSION',message);
export function initialShakaNetwork(immutable=false,preview=false):ShakaNetworkState{return Object.freeze({active:true,serial:0,terminal:0,immutable,preview,requests:Object.freeze([]),validators:Object.freeze([]),totals:Object.freeze([])});}
export function shakaNetworkRequest(state:ShakaNetworkState,id:number):ShakaNetworkRequest|undefined{return state.requests.find(request=>request.id===id);}
export function shakaNetworkCurrent(state:ShakaNetworkState,id:number):boolean{return state.active&&!!state.requests.some(request=>request.id===id&&!request.cancelled&&request.phase!=='cleanup');}
function result(state:ShakaNetworkState,extra:Omit<ShakaNetworkDecision,'state'|'accepted'>={},accepted=true):ShakaNetworkDecision{return Object.freeze({state,accepted,...extra});}
function replace(state:ShakaNetworkState,request:ShakaNetworkRequest):ShakaNetworkState{return Object.freeze({...state,requests:Object.freeze(state.requests.map(value=>value.id===request.id?Object.freeze({...request}):value))});}
export function beginShakaNetworkRequest(state:ShakaNetworkState,kind:ShakaNetworkRequest['kind'],timeout:number,now:number):ShakaNetworkDecision{
 if(!state.active)return result(state,{},false);
 if(state.requests.length>=(state.preview?4:32))return result(state,{failure:permission('Streaming concurrent request capacity exceeded')},false);
 const request:ShakaNetworkRequest=Object.freeze({id:state.serial+1,kind,phase:'fetch',resource:undefined,attempt:0,cancelled:null,deadline:timeout?now+Math.max(0,timeout):undefined,limit:(state.preview||kind==='manifest'?4:16)*1024*1024,bytes:0,lastProgress:now,length:0,contentLength:undefined,range:null});
 return result(Object.freeze({...state,serial:request.id,requests:Object.freeze([...state.requests,request])}),{id:request.id});
}
export function setShakaNetworkResource(state:ShakaNetworkState,id:number,resource:number):ShakaNetworkState{const request=shakaNetworkRequest(state,id);return request&&shakaNetworkCurrent(state,id)?replace(state,{...request,resource}):state;}
export function cancelShakaNetworkRequest(state:ShakaNetworkState,id:number):ShakaNetworkDecision{const request=shakaNetworkRequest(state,id);return state.active&&request&&!request.cancelled?result(replace(state,{...request,cancelled:'abort'})):result(state,{},false);}
export function expireShakaNetworkRequest(state:ShakaNetworkState,id:number,now:number):ShakaNetworkDecision{
 const request=shakaNetworkRequest(state,id);if(!request||!shakaNetworkCurrent(state,id)||request.deadline===undefined)return result(state,{},false);
 const remaining=request.deadline-now;return remaining>0?result(state,{remaining}):result(replace(state,{...request,cancelled:'timeout'}));
}
export function cleanupShakaNetworkRequest(state:ShakaNetworkState,id:number):ShakaNetworkState{const request=shakaNetworkRequest(state,id);return request&&request.phase!=='cleanup'?replace(state,{...request,phase:'cleanup'}):state;}
export function finishShakaNetworkRequest(state:ShakaNetworkState,id:number):ShakaNetworkState{return shakaNetworkRequest(state,id)?Object.freeze({...state,requests:Object.freeze(state.requests.filter(request=>request.id!==id))}):state;}
export function failShakaNetwork(state:ShakaNetworkState):ShakaNetworkState{return state.active?Object.freeze({...state,terminal:state.terminal+1}):state;}
export function retireShakaNetwork(state:ShakaNetworkState):ShakaNetworkState{return state.active?Object.freeze({...state,active:false,requests:Object.freeze([]),validators:Object.freeze([]),totals:Object.freeze([])}):state;}
export function shakaNetworkAdmission(facts:Readonly<{license:boolean;drm:boolean;rangeOverride:boolean;ownedBlob:boolean;http:boolean;userinfo:boolean;allowed:boolean}>):ShakaNetworkFailure|undefined{
 if(facts.license||facts.drm)return failure('UNSUPPORTED_FEATURE','Encrypted streaming requires a DRM contract');
 if(facts.rangeOverride)return permission('Source headers cannot override Shaka byte ranges');
 if(!facts.ownedBlob&&(!facts.http||facts.userinfo||!facts.allowed))return permission('Streaming resource origin is not allowed');
}
export function receiveShakaNetworkStatus(state:ShakaNetworkState,id:number,status:number,canRefresh:boolean):ShakaNetworkDecision{
 const request=shakaNetworkRequest(state,id);if(!request||!shakaNetworkCurrent(state,id)||request.phase!=='fetch')return result(state,{},false);
 if(status!==401&&status!==403)return result(state,{refresh:false});
 if(request.attempt||!canRefresh)return result(state,{failure:permission('Streaming authorization was rejected')});
 return result(replace(state,{...request,attempt:1,phase:'refresh'}),{refresh:true});
}
export function finishShakaNetworkRefresh(state:ShakaNetworkState,id:number):ShakaNetworkDecision{const request=shakaNetworkRequest(state,id);return request&&shakaNetworkCurrent(state,id)&&request.phase==='refresh'?result(replace(state,{...request,phase:'fetch'})):result(state,{},false);}
function retained<T extends Readonly<{resource:number}>>(values:readonly T[],value:T):readonly T[]{const found=values.some(item=>item.resource===value.resource),next=found?values.map(item=>item.resource===value.resource?value:item):[...values.slice(values.length>=4096?1:0),value];return Object.freeze(next);}
export function observeShakaNetworkValidator(state:ShakaNetworkState,id:number,validator:string|null,ownedBlob:boolean):ShakaNetworkDecision{
 const request=shakaNetworkRequest(state,id);if(!request||!shakaNetworkCurrent(state,id)||request.resource===undefined)return result(state,{},false);
 if(!state.immutable||request.kind!=='segment'||ownedBlob||!validator||validator.startsWith('W/'))return result(state);
 const known=state.validators.find(value=>value.resource===request.resource);
 if(known&&known.value!==validator)return result(state,{failure:changed('Streaming resource representation changed')});
 return result(Object.freeze({...state,validators:retained(state.validators,Object.freeze({resource:request.resource,value:validator}))}));
}
export type ShakaResponseFacts=Readonly<{range:string|null;status:number;encoding:string|undefined;contentRange:string|undefined;contentLength:string|undefined;now:number}>;
export function beginShakaNetworkBody(state:ShakaNetworkState,id:number,facts:ShakaResponseFacts):ShakaNetworkDecision{
 const request=shakaNetworkRequest(state,id);if(!request||!shakaNetworkCurrent(state,id)||request.phase!=='fetch')return result(state,{},false);
 const requested=facts.range?/^bytes=(\d+)-(\d*)$/.exec(facts.range):null;let range:ShakaRange|null=null;
 if(facts.range&&!requested)return result(state,{failure:changed('Unsupported streaming byte range')});
 if(facts.range&&facts.encoding&&facts.encoding!=='identity')return result(state,{failure:changed('Encoded response cannot preserve streaming byte ranges')});
 if(requested){
  const start=BigInt(requested[1]),requestedEnd=requested[2]?BigInt(requested[2]):undefined;let total:bigint|undefined,end=0n,expected:bigint|undefined;
  if(facts.status===206){
   const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(facts.contentRange??'');if(!match)return result(state,{failure:changed('Invalid streaming Content-Range')});
   total=BigInt(match[3]);end=requestedEnd??total-1n;if(end>=total)end=total-1n;
   if(BigInt(match[1])!==start||BigInt(match[2])!==end||start>end||end>=total)return result(state,{failure:changed('Streaming response does not match requested byte range')});
   expected=end-start+1n;
  }else if(facts.status!==200)return result(state,{failure:changed('Streaming range request needs a complete 200 or exact 206 response')});
  range=Object.freeze({start,requestedEnd,end,total,expected,complete:facts.status===200});
 }else if(facts.status===206)return result(state,{failure:changed('Unexpected partial streaming response')});
 if(Number(facts.contentLength)>request.limit)return result(state,{failure:permission('Streaming resource exceeds the response byte budget')});
 return result(replace(state,{...request,phase:'body',range,contentLength:facts.contentLength,length:Number(facts.contentLength)||0,lastProgress:facts.now}));
}
export function appendShakaNetworkBody(state:ShakaNetworkState,id:number,size:number,now:number):ShakaNetworkDecision{
 const request=shakaNetworkRequest(state,id);if(!request||!shakaNetworkCurrent(state,id)||request.phase!=='body')return result(state,{},false);
 const bytes=request.bytes+size;if(bytes>request.limit)return result(state,{failure:permission('Streaming resource exceeds the response byte budget')});
 return result(replace(state,{...request,bytes,lastProgress:now}),{progress:Object.freeze({elapsed:now-request.lastProgress,bytes:size,remaining:Math.max(0,request.length-bytes)})});
}
export function completeShakaNetworkBody(state:ShakaNetworkState,id:number):ShakaNetworkDecision{
 const request=shakaNetworkRequest(state,id);if(!request||!shakaNetworkCurrent(state,id)||request.phase!=='body'||request.resource===undefined)return result(state,{},false);
 let next=state,slice:Readonly<{start:number;end:number}>|undefined;
 if(request.range){
  const range=request.range,bytes=BigInt(request.bytes);let total=range.total,end=range.end;
  // Preserve legacy Content-Length conversion, including its native SyntaxError
  // for malformed numeric values; callers classify that as a transport error.
  if(request.contentLength&&BigInt(request.contentLength)!==bytes)return result(state,{failure:changed('Streaming range body length disagrees with Content-Length')});
  if(range.expected!==undefined&&range.expected!==bytes)return result(state,{failure:changed('Streaming range body has the wrong byte count')});
  if(range.complete){total=bytes;end=range.requestedEnd??total-1n;if(end>=total)end=total-1n;if(range.start>end||range.start>=total)return result(state,{failure:changed('Complete streaming response does not contain requested range')});slice=Object.freeze({start:Number(range.start),end:Number(end+1n)});}
  const known=state.totals.find(value=>value.resource===request.resource);if(known&&known.value!==total)return result(state,{failure:changed('Streaming range resource changed length')});
  next=Object.freeze({...state,totals:retained(state.totals,Object.freeze({resource:request.resource,value:total!}))});
 }
 return result(replace(next,{...request,phase:'ready'}),{...(slice?{slice}:{}),streamRange:!!request.range});
}
export function shakaNetworkResourceIDs(state:ShakaNetworkState):readonly number[]{return Object.freeze([...new Set([...state.requests.flatMap(request=>request.resource===undefined?[]:[request.resource]),...state.validators.map(value=>value.resource),...state.totals.map(value=>value.resource)])]);}
