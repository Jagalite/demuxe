// SPDX-License-Identifier: Apache-2.0
export type PrivateRangeHandle=Readonly<{id:number;generation:number;size:number;cancelled:boolean}>;
export type PrivateRangeRequest=Readonly<{id:number;handle:number;generation:number;ptr:number;count:number;offset:number;deadline:number;phase:'reading'|'ready';cancelled:boolean}>;
export type PrivateRangeStats=Readonly<{reads:number;bytes:number;copies:number;cancelled:number;timeouts:number;errors:number;lateCompletions:number;staleCommitsRejected:number;maxPending:number;abandonedRequests:number}>;
export type PrivateRangeState=Readonly<{closed:boolean;generation:number;nextHandle:number;nextRequest:number;timeoutMs:number;maxPending:number;maxChunk:number;source:Readonly<{generation:number;size:number;cancelled:boolean}>|null;handles:readonly PrivateRangeHandle[];requests:readonly PrivateRangeRequest[];stats:PrivateRangeStats}>;
export function createPrivateRangeState(timeoutMs=5000,maxPending=8,maxChunk=262144):PrivateRangeState{return Object.freeze({closed:false,generation:0,nextHandle:1,nextRequest:1,timeoutMs,maxPending,maxChunk,source:null,handles:Object.freeze([]),requests:Object.freeze([]),stats:Object.freeze({reads:0,bytes:0,copies:0,cancelled:0,timeouts:0,errors:0,lateCompletions:0,staleCommitsRejected:0,maxPending:0,abandonedRequests:0})});}
export function privateRangeHandle(state:PrivateRangeState,id:number):PrivateRangeHandle|undefined{return state.handles.find(handle=>handle.id===id);}
export function validPrivateRangeHandle(state:PrivateRangeState,id:number):boolean{const handle=privateRangeHandle(state,id);return !!handle&&!state.closed&&!handle.cancelled&&!!state.source&&!state.source.cancelled&&handle.generation===state.source.generation;}
function cancelRequests(state:PrivateRangeState,ids:readonly number[]):PrivateRangeState{
 const count=state.requests.filter(request=>ids.includes(request.id)&&!request.cancelled).length;
 if(!count)return state;
 return Object.freeze({...state,requests:Object.freeze(state.requests.map(request=>ids.includes(request.id)&&!request.cancelled?Object.freeze({...request,cancelled:true}):request)),stats:Object.freeze({...state.stats,cancelled:state.stats.cancelled+count})});
}
export function installPrivateRangeSource(state:PrivateRangeState,size:number):Readonly<{state:PrivateRangeState;generation:number|null;cancel:readonly number[]}>{
 if(state.closed||!Number.isSafeInteger(size)||size<0)return Object.freeze({state,generation:null,cancel:Object.freeze([])});
 const cancel=Object.freeze(state.requests.map(request=>request.id)),retired=cancelRequests(state,cancel),generation=state.generation+1;
 return Object.freeze({state:Object.freeze({...retired,generation,source:Object.freeze({generation,size,cancelled:false})}),generation,cancel});
}
export function openPrivateRangeHandle(state:PrivateRangeState):Readonly<{state:PrivateRangeState;id:number}>{
 if(state.closed||!state.source||state.source.cancelled||state.handles.length>=64||state.nextHandle>0x7fffffff)return Object.freeze({state,id:-1});
 const id=state.nextHandle,handle=Object.freeze({id,generation:state.source.generation,size:state.source.size,cancelled:false});
 return Object.freeze({state:Object.freeze({...state,nextHandle:id+1,handles:Object.freeze([...state.handles,handle])}),id});
}
export function validPrivateRangeRead(state:PrivateRangeState,input:Readonly<{handle:number;ptr:number;count:number;offset:number}>):boolean{
 const {handle,ptr,count,offset}=input,h=privateRangeHandle(state,handle);
 return !!h&&validPrivateRangeHandle(state,handle)&&Number.isSafeInteger(offset)&&offset>=0&&Number.isInteger(count)&&count>=0&&count<=state.maxChunk&&offset<=h.size&&Number.isInteger(ptr)&&ptr>=0&&ptr<=0xffffffff;
}
export function admitPrivateRangeRead(state:PrivateRangeState,input:Readonly<{handle:number;ptr:number;count:number;offset:number;memoryBytes:number;now:number}>):Readonly<{state:PrivateRangeState;request:PrivateRangeRequest|null;result:number}>{
 const {handle,ptr,count,offset,memoryBytes,now}=input,h=privateRangeHandle(state,handle);
 if(!h||!validPrivateRangeRead(state,input)||ptr>memoryBytes-count)return Object.freeze({state,request:null,result:-1});
 if(offset===h.size||count===0)return Object.freeze({state,request:null,result:0});
 if(state.requests.length>=state.maxPending)return Object.freeze({state,request:null,result:-1});
 const request=Object.freeze({id:state.nextRequest,handle,generation:h.generation,ptr,count:Math.min(count,h.size-offset),offset,deadline:now+state.timeoutMs,phase:'reading' as const,cancelled:false});
 return Object.freeze({state:Object.freeze({...state,nextRequest:request.id+1,requests:Object.freeze([...state.requests,request]),stats:Object.freeze({...state.stats,reads:state.stats.reads+1,maxPending:Math.max(state.stats.maxPending,state.requests.length+1)})}),request,result:0});
}
export function settlePrivateRangeRead(state:PrivateRangeState,id:number,outcome:'valid'|'invalid'|'failure'|'reader-error'):Readonly<{state:PrivateRangeState;accepted:boolean}>{
 const request=state.requests.find(request=>request.id===id),readerError=outcome==='reader-error'?1:0;
 if(!request||request.phase!=='reading')return Object.freeze({state:Object.freeze({...state,stats:Object.freeze({...state.stats,errors:state.stats.errors+readerError,lateCompletions:state.stats.lateCompletions+1})}),accepted:false});
 return Object.freeze({state:Object.freeze({...state,requests:Object.freeze(state.requests.map(item=>item.id===id?Object.freeze({...item,phase:'ready' as const}):item)),stats:Object.freeze({...state.stats,errors:state.stats.errors+(outcome==='invalid'||outcome==='reader-error'?1:0)})}),accepted:true});
}
export function cancelPrivateRangeRead(state:PrivateRangeState,id:number,now?:number):Readonly<{state:PrivateRangeState;accepted:boolean;timedOut:boolean;remaining:number}>{
 const request=state.requests.find(request=>request.id===id);
 if(!request)return Object.freeze({state,accepted:false,timedOut:false,remaining:0});
 if(now!==undefined&&(request.phase!=='reading'||request.cancelled))return Object.freeze({state,accepted:false,timedOut:false,remaining:0});
 if(now!==undefined&&now<request.deadline)return Object.freeze({state,accepted:false,timedOut:false,remaining:request.deadline-now});
 const next=cancelRequests(state,[id]),timedOut=now!==undefined;
 return Object.freeze({state:timedOut?Object.freeze({...next,stats:Object.freeze({...next.stats,timeouts:next.stats.timeouts+1})}):next,accepted:true,timedOut,remaining:0});
}
export function retirePrivateRangeHandle(state:PrivateRangeState,id:number,close=false):Readonly<{state:PrivateRangeState;cancel:readonly number[]}>{
 const handle=privateRangeHandle(state,id);if(!handle)return Object.freeze({state,cancel:Object.freeze([])});
 const cancel=Object.freeze(state.requests.filter(request=>request.handle===id).map(request=>request.id)),next=cancelRequests(state,cancel);
 const handles=close?next.handles.filter(item=>item.id!==id):next.handles.map(item=>item.id===id?Object.freeze({...item,cancelled:true}):item);
 return Object.freeze({state:Object.freeze({...next,handles:Object.freeze(handles)}),cancel});
}
export function retirePrivateRangeSource(state:PrivateRangeState,mode:'cancel'|'close'|'abandon'):Readonly<{state:PrivateRangeState;cancel:readonly number[]}>{
 const cancel=Object.freeze(state.requests.map(request=>request.id));
 if(mode==='abandon')return Object.freeze({state:Object.freeze({...state,closed:true,source:null,handles:Object.freeze([]),requests:Object.freeze([]),stats:Object.freeze({...state.stats,abandonedRequests:state.stats.abandonedRequests+state.requests.length})}),cancel});
 const next=cancelRequests(state,cancel);
 return Object.freeze({state:Object.freeze({...next,closed:state.closed||mode==='close',source:mode==='close'?null:state.source?Object.freeze({...state.source,cancelled:true}):null,handles:mode==='close'?Object.freeze([]):state.handles}),cancel});
}
export function planPrivateRangeCommit(state:PrivateRangeState,id:number,length:number|null,memoryBytes:number):Readonly<{value:number;reason:'missing'|'stale'|'invalid'|'failure'|'copy'}>{
 const request=state.requests.find(request=>request.id===id);
 if(!request||request.phase!=='ready')return Object.freeze({value:-1,reason:'missing'});
 if(request.cancelled||!validPrivateRangeHandle(state,request.handle))return Object.freeze({value:-1,reason:'stale'});
 if(length===null)return Object.freeze({value:-1,reason:'failure'});
 if(!Number.isInteger(length)||length<1||length>request.count||request.ptr>memoryBytes-length)return Object.freeze({value:-1,reason:'invalid'});
 return Object.freeze({value:length,reason:'copy'});
}
export function finishPrivateRangeCommit(state:PrivateRangeState,id:number,result:Readonly<{reason:'missing'|'stale'|'invalid'|'failure'|'copy';value:number}>):PrivateRangeState{
 if(!state.requests.some(request=>request.id===id))return state;
 return Object.freeze({...state,requests:Object.freeze(state.requests.filter(request=>request.id!==id)),stats:Object.freeze({...state.stats,staleCommitsRejected:state.stats.staleCommitsRejected+(result.reason==='stale'?1:0),errors:state.stats.errors+(result.reason==='invalid'?1:0),copies:state.stats.copies+(result.reason==='copy'?1:0),bytes:state.stats.bytes+(result.reason==='copy'?result.value:0)})});
}

export function observePrivateRangeError(state:PrivateRangeState):PrivateRangeState{return Object.freeze({...state,stats:Object.freeze({...state.stats,errors:state.stats.errors+1})});}
