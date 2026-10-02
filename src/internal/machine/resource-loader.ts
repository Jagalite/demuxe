// SPDX-License-Identifier: Apache-2.0
const MiB=1024*1024;
type ResourceHandle=Readonly<{id:number;start:bigint;total:bigint;length:number}>;
type ResourceOpen=Readonly<{id:number;epoch:number;start?:bigint;end?:bigint;limit:number;attempt:number;refreshed:boolean;count:number;expected?:number;total?:bigint;phase:'ready'|'headers'|'body'|'complete'|'accepted';cancelled:boolean;started:boolean}>;
export type ResourceLoaderState=Readonly<{live:boolean;closed:boolean;epoch:number;serial:number;nextId:number;active:ResourceOpen|null;handles:readonly ResourceHandle[];stats:Readonly<{opens:number;requests:number;retries:number;aborts:number;handles:number;retainedBytes:number;peakRetainedBytes:number;fetchedBytes:number}>}>;
export type ResourceLoaderCommand=
 | Readonly<{type:'open';start?:bigint;end?:bigint;manifest:boolean}>
 | Readonly<{type:'request'|'fetch-started'|'body-complete'|'accept'|'finish'|'cancel';id:number}>
 | Readonly<{type:'headers';id:number;status:number;encoding:string|null;range:string|null;length:string|null;refreshAvailable:boolean}>
 | Readonly<{type:'chunk';id:number;bytes:number}>
 | Readonly<{type:'retry';id:number;retryable:boolean}>
 | Readonly<{type:'close-handle';id:number}>
 | Readonly<{type:'epoch'}>|Readonly<{type:'close'}>;
export type ResourceLoaderDecision=Readonly<{state:ResourceLoaderState;error?:string;aborted?:boolean;request?:ResourceOpen;handle?:ResourceHandle;refresh?:boolean;retry?:boolean;wait?:number;release?:readonly number[]}>;
export function initialResourceLoader(live:boolean):ResourceLoaderState{return Object.freeze({live,closed:false,epoch:0,serial:0,nextId:1,active:null,handles:Object.freeze([]),stats:Object.freeze({opens:0,requests:0,retries:0,aborts:0,handles:0,retainedBytes:0,peakRetainedBytes:0,fetchedBytes:0})});}
export function resourceURLAllowed(facts:Readonly<{length:number;protocol:string;credentials:boolean;allowedOrigin:boolean}>):boolean{return facts.length<=4095&&['http:','https:'].includes(facts.protocol)&&!facts.credentials&&facts.allowedOrigin;}
export function resourceRead(handle:ResourceHandle|undefined,closed:boolean,offset:bigint,capacity:number):Readonly<{error?:string;at?:number;end?:number;empty?:boolean}>{
 if(closed)return Object.freeze({error:'Resource loader closed'});
 if(!handle||typeof offset!=='bigint'||offset<handle.start||!Number.isInteger(capacity)||capacity<1||capacity>262144)return Object.freeze({error:'Invalid resource read'});
 const at=offset-handle.start;if(at>=BigInt(handle.length))return Object.freeze({empty:true});
 return Object.freeze({at:Number(at),end:Number(at)+capacity});
}
export function resourceCurrent(state:ResourceLoaderState,id:number):boolean{return !state.closed&&state.active?.id===id&&state.active.epoch===state.epoch&&!state.active.cancelled;}
export function resourceOpenError(state:ResourceLoaderState,start?:bigint,end?:bigint):string|undefined {
 if(state.closed)return 'Resource loader closed';
 if(state.active)return 'Concurrent resource opens are not allowed';
 if(state.handles.length>=16||!state.live&&state.stats.opens>=10000)return 'Resource count limit exceeded';
 if(start!==undefined&&(typeof start!=='bigint'||start<0n||typeof end!=='bigint'||end<=start)||start===undefined&&end!==undefined)return 'Invalid resource range';
}
export function transitionResourceLoader(state:ResourceLoaderState,command:ResourceLoaderCommand):ResourceLoaderDecision {
 const result=(next:ResourceLoaderState,extra:Omit<ResourceLoaderDecision,'state'>={})=>Object.freeze({state:next===state?state:Object.freeze({...next}),...extra});
 if(command.type==='epoch'||command.type==='close'){
  const closing=command.type==='close';
  return result({...state,closed:state.closed||closing,epoch:state.epoch+1,handles:closing?Object.freeze([]):state.handles,stats:Object.freeze({...state.stats,aborts:state.stats.aborts+1,handles:closing?0:state.stats.handles,retainedBytes:closing?0:state.stats.retainedBytes})},{release:closing?Object.freeze(state.handles.map(item=>item.id)):Object.freeze([])});
 }
 if(command.type==='close-handle'){
  const handle=state.handles.find(item=>item.id===command.id);if(!handle)return result(state);
  return result({...state,handles:Object.freeze(state.handles.filter(item=>item.id!==command.id)),stats:Object.freeze({...state.stats,handles:state.stats.handles-1,retainedBytes:state.stats.retainedBytes-handle.length})},{release:Object.freeze([handle.id])});
 }
 if(command.type==='open'){
  const error=resourceOpenError(state,command.start,command.end);if(error)return result(state,{error});
  const {start,end}=command;
  const limit=command.manifest?MiB:8*MiB;
  if(start!==undefined&&end!-start>BigInt(limit))return result(state,{error:'Resource size limit exceeded'});
  const active:ResourceOpen=Object.freeze({id:state.serial+1,epoch:state.epoch,start,end,limit,attempt:0,refreshed:false,count:0,phase:'ready',cancelled:false,started:false});
  return result({...state,serial:active.id,active,stats:Object.freeze({...state.stats,opens:state.stats.opens+1})},{request:active});
 }
 if(command.type==='finish')return state.active?.id===command.id?result({...state,active:null}):result(state);
 if(!resourceCurrent(state,command.id))return result(state,{aborted:true});
 const active=state.active!;
 if(command.type==='cancel')return result({...state,active:Object.freeze({...active,cancelled:true})});
 if(command.type==='request'){
  if(active.phase!=='ready')return result(state,{aborted:true});
  if(active.attempt>=4)return result(state,{error:'Resource request attempts exhausted'});
  return result({...state,active:Object.freeze({...active,phase:'headers',attempt:active.attempt+1,count:0,expected:undefined,total:undefined,started:false})});
 }
 if(command.type==='fetch-started')return active.phase!=='headers'||active.started?result(state,{aborted:true}):result({...state,active:Object.freeze({...active,started:true}),stats:Object.freeze({...state.stats,requests:state.stats.requests+1})});
 if(command.type==='headers'){
  if(active.phase!=='headers')return result(state,{aborted:true});
  if(command.status===401&&command.refreshAvailable&&!active.refreshed)return result({...state,active:Object.freeze({...active,refreshed:true,phase:'ready'})},{refresh:true});
  if([408,429,500,502,503,504].includes(command.status))return result(state,{error:`Retryable resource HTTP ${command.status}`,retry:true});
  if(command.status!==(active.start===undefined?200:206))return result(state,{error:`Unexpected resource HTTP ${command.status}`});
  if(command.encoding&&command.encoding!=='identity')return result(state,{error:'Encoded resource bodies are unsupported'});
  let total:bigint|undefined,expected:number|undefined;
  if(active.start!==undefined){
   const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(command.range??'');
   if(!match||BigInt(match[1])!==active.start||BigInt(match[2])+1n!==active.end||BigInt(match[3])<active.end!)return result(state,{error:'Invalid resource Content-Range'});
   total=BigInt(match[3]);expected=Number(active.end!-active.start);
  }
  if(command.length!==null){
   if(!/^\d+$/.test(command.length)||BigInt(command.length)>BigInt(active.limit))return result(state,{error:'Resource size limit exceeded'});
   if(expected!==undefined&&Number(command.length)!==expected)return result(state,{error:'Resource length mismatch'});
   expected=Number(command.length);
  }
  return result({...state,active:Object.freeze({...active,total,expected,phase:'body'})});
 }
 if(command.type==='chunk'){
  if(active.phase!=='body')return result(state,{aborted:true});
  const count=active.count+command.bytes,next={...state,active:Object.freeze({...active,count}),stats:Object.freeze({...state.stats,fetchedBytes:state.stats.fetchedBytes+command.bytes})};
  return result(next,count>active.limit||active.expected!==undefined&&count>active.expected?{error:'Resource size limit exceeded'}:{});
 }
 if(command.type==='body-complete'){
  if(active.phase!=='body')return result(state,{aborted:true});
  if(active.expected!==undefined&&active.count!==active.expected)return result(state,{error:'Truncated resource body',retry:true});
  if(!active.count)return result(state,{error:'Empty resource body'});
  if(state.stats.retainedBytes+active.count>16*MiB)return result(state,{error:'Resource memory budget exceeded'});
  return result({...state,active:Object.freeze({...active,phase:'complete'})});
 }
 if(command.type==='retry'){
  if(!command.retryable||active.attempt>=4)return result(state,{retry:false});
  if(active.phase==='accepted')return result(state,{aborted:true});
  return result({...state,active:Object.freeze({...active,phase:'ready'}),stats:Object.freeze({...state.stats,retries:state.stats.retries+1})},{retry:true,wait:100*active.attempt});
 }
 if(active.phase!=='complete')return result(state,{aborted:true});
 if(state.stats.retainedBytes+active.count>16*MiB)return result(state,{error:'Resource memory budget exceeded'});
 const handle=Object.freeze({id:state.nextId,start:active.start??0n,total:active.total??BigInt(active.count),length:active.count}),retained=state.stats.retainedBytes+active.count;
 return result({...state,nextId:handle.id+1,active:Object.freeze({...active,phase:'accepted'}),handles:Object.freeze([...state.handles,handle]),stats:Object.freeze({...state.stats,handles:state.stats.handles+1,retainedBytes:retained,peakRetainedBytes:Math.max(state.stats.peakRetainedBytes,retained)})},{handle});
}
