// SPDX-License-Identifier: Apache-2.0
export type RangeReaderConfig=Readonly<{blockBytes:number;cacheBytes:number;readDeadlineMs:number;immutable:boolean}>;
type CachedRange=Readonly<{key:string;start:bigint;length:number;owned:number}>;
type RangeRead=Readonly<{id:number;epoch:number;start:bigint;key:string;received:number;bodyBytes:number;expected:number;attempt:number;refreshed:boolean;deadline:number|null;expired:boolean;cached:boolean;started:boolean}>;
export type RangeReaderState=Readonly<{config:RangeReaderConfig;epoch:number;closed:boolean;serial:number;active:RangeRead|null;preview:Readonly<{id:number;retired:boolean}>|null;total?:bigint;etag?:string;cache:readonly CachedRange[];stats:Readonly<{fetchedBytes:number;requests:number;retries:number;aborts:number;cacheBytes:number;peakCacheBytes:number;activeBytes:number;peakActiveBytes:number}>}>;
export type RangeReaderCommand=
 | Readonly<{type:'begin';offset:bigint;capacity:number}>
 | Readonly<{type:'epoch'}>|Readonly<{type:'close'}>|Readonly<{type:'preview-retire'}>
 | Readonly<{type:'preview-begin';allowFetch:boolean}>
 | Readonly<{type:'preview-finish'|'finish'|'timeout'|'fetch-started';id:number}>
 | Readonly<{type:'fetch-begin'|'check'|'request';id:number;now:number}>
 | Readonly<{type:'headers';id:number;status:number;range:string|null;encoding:string|null;etag:string|null;length:string|null;refreshAvailable:boolean}>
 | Readonly<{type:'chunk';id:number;bytes:number}>
 | Readonly<{type:'body-complete';id:number}>
 | Readonly<{type:'retry';id:number;retryable:boolean;now:number;serverWait:number;random:number}>
 | Readonly<{type:'cache';id:number;length:number;owned:number}>;
export type RangeReaderDecision=Readonly<{state:RangeReaderState;error?:string;aborted?:boolean;retry?:boolean;wait?:number;refresh?:boolean;complete?:boolean;empty?:boolean;hit?:Readonly<{key:string;start:bigint}>;request?:RangeRead;offset?:bigint;end?:bigint;copyAt?:number;evict?:readonly string[];previewId?:number;retirePreview?:number}>;
export function initialRangeReader(config:RangeReaderConfig,identity?:Readonly<{size:string;etag?:string}>):RangeReaderState {
 if(!Number.isInteger(config.readDeadlineMs)||config.readDeadlineMs<15000||config.readDeadlineMs>45000)throw Error('Invalid read deadline');
 if(!Number.isInteger(config.blockBytes)||config.blockBytes<1024||config.blockBytes>262144||!Number.isInteger(config.cacheBytes)||config.cacheBytes<config.blockBytes||config.cacheBytes>16777216)throw Error('Invalid range budgets');
 return Object.freeze({config:Object.freeze({...config}),epoch:0,closed:false,serial:0,active:null,preview:null,total:identity?BigInt(identity.size):undefined,etag:identity?.etag,cache:Object.freeze([]),stats:Object.freeze({fetchedBytes:0,requests:0,retries:0,aborts:0,cacheBytes:0,peakCacheBytes:0,activeBytes:0,peakActiveBytes:0})});
}
export function rangeCurrent(state:RangeReaderState,id:number):boolean{return !state.closed&&state.active?.id===id&&state.active.epoch===state.epoch;}
export function rangeURLAllowed(facts:Readonly<{protocol:string;credentials:boolean;allowedOrigin:boolean}>):boolean{return ['http:','https:'].includes(facts.protocol)&&!facts.credentials&&facts.allowedOrigin;}
export function rangePeek(state:RangeReaderState,offset:bigint,capacity:number):Readonly<{error?:string;key?:string;at?:number}> {
 if(state.closed)return Object.freeze({});
 if(typeof offset!=='bigint'||offset<0n||!Number.isInteger(capacity)||capacity<1||capacity>262144)return Object.freeze({error:'Invalid preview read'});
 const entry=state.cache.find(item=>offset>=item.start&&offset+BigInt(capacity)<=item.start+BigInt(item.length));
 return entry?Object.freeze({key:entry.key,at:Number(offset-entry.start)}):Object.freeze({});
}
export function rangePreviewAllowed(state:RangeReaderState,allowFetch:boolean):boolean{return allowFetch&&!state.closed&&!state.active&&!state.preview&&state.total!==undefined&&!!(state.etag||state.config.immutable);}
export function transitionRangeReader(state:RangeReaderState,command:RangeReaderCommand):RangeReaderDecision {
 const result=(next:RangeReaderState,extra:Omit<RangeReaderDecision,'state'>={})=>Object.freeze({state:next===state?state:Object.freeze({...next}),...extra});
 if(command.type==='preview-retire'||command.type==='epoch'||command.type==='close'){
  const closing=command.type==='close',retiring=command.type!=='preview-retire';
  return result({...state,closed:state.closed||closing,epoch:state.epoch+(retiring?1:0),preview:state.preview?Object.freeze({...state.preview,retired:true}):null,cache:closing?Object.freeze([]):state.cache,stats:retiring?Object.freeze({...state.stats,aborts:state.stats.aborts+1,cacheBytes:closing?0:state.stats.cacheBytes}):state.stats},{retirePreview:state.preview?.id});
 }
 if(command.type==='preview-begin'){
  if(!rangePreviewAllowed(state,command.allowFetch))return result(state);
  const preview=Object.freeze({id:state.serial+1,retired:false});return result({...state,serial:preview.id,preview},{previewId:preview.id});
 }
 if(command.type==='preview-finish')return state.preview?.id===command.id?result({...state,preview:null}):result(state);
 if(command.type==='begin'){
  if(state.closed)return result(state,{error:'Range reader closed'});
  if(state.active)return result(state,{error:'Concurrent reads are not allowed'});
  if(typeof command.offset!=='bigint'||command.offset<0n||!Number.isInteger(command.capacity)||command.capacity<1||command.capacity>262144)return result(state,{error:'Invalid read'});
  if(state.total!==undefined&&command.offset>=state.total)return result(state,{empty:true});
  const exact=state.cache.find(item=>item.key===String(command.offset)),cached=exact??state.cache.find(item=>command.offset>=item.start&&command.offset<item.start+BigInt(item.length)),start=cached?.start??command.offset,key=cached?.key??String(start);
  const active=Object.freeze({id:state.serial+1,epoch:state.epoch,start,key,received:0,bodyBytes:0,expected:0,attempt:0,refreshed:false,deadline:null,expired:false,cached:!!cached,started:false});
  return result({...state,serial:active.id,active,cache:cached?Object.freeze([...state.cache.filter(item=>item!==cached),cached]):state.cache},{request:active,hit:cached?Object.freeze({key,start}):undefined});
 }
 if(command.type==='finish')return state.active?.id===command.id?result({...state,active:null,stats:Object.freeze({...state.stats,activeBytes:0})}):result(state);
 if(!rangeCurrent(state,command.id))return result(state,{aborted:true});
 const active=state.active!;
 if(command.type==='timeout')return result({...state,active:Object.freeze({...active,expired:true})},{error:'Media read retry deadline exceeded'});
 if(command.type==='fetch-begin')return result({...state,active:Object.freeze({...active,deadline:command.now+state.config.readDeadlineMs}),stats:Object.freeze({...state.stats,activeBytes:state.config.blockBytes,peakActiveBytes:Math.max(state.stats.peakActiveBytes,state.config.blockBytes)})});
 if(active.expired||'now' in command&&active.deadline!==null&&command.now>=active.deadline)return result({...state,active:Object.freeze({...active,expired:true})},{error:'Media read retry deadline exceeded'});
 if(command.type==='check')return result(state);
 if(command.type==='fetch-started')return active.started||active.attempt===0?result(state,{aborted:true}):result({...state,active:Object.freeze({...active,started:true}),stats:Object.freeze({...state.stats,requests:state.stats.requests+1})});
 if(command.type==='request'){
  const offset=active.start+BigInt(active.received),fullEnd=active.start+BigInt(state.config.blockBytes)-1n,end=state.total!==undefined&&fullEnd>=state.total?state.total-1n:fullEnd;
  return result({...state,active:Object.freeze({...active,attempt:active.attempt+1,bodyBytes:0,expected:0,started:false})},{offset,end});
 }
 if(command.type==='headers'){
  if(command.status===401&&!active.refreshed&&command.refreshAvailable)return result({...state,active:Object.freeze({...active,refreshed:true})},{refresh:true});
  if([408,429,500,502,503,504].includes(command.status))return result(state,{error:`Retryable HTTP ${command.status}`,retry:true});
  const offset=active.start+BigInt(active.received);
  if(command.status===416){const match=/^bytes \*\/(\d+)$/.exec(command.range??'');return match&&state.total!==undefined&&BigInt(match[1])===state.total&&offset>=state.total?result(state,{complete:true}):result(state,{error:'Unexpected range EOF'});}
  if(command.status!==206)return result(state,{error:`Expected HTTP 206; received ${command.status}`});
  const match=/^bytes (\d+)-(\d+)\/(\d+)$/.exec(command.range??'');if(!match)return result(state,{error:'Missing or invalid Content-Range'});
  const [lo,hi,total]=match.slice(1).map(BigInt),fullEnd=active.start+BigInt(state.config.blockBytes)-1n,end=state.total!==undefined&&fullEnd>=state.total?state.total-1n:fullEnd,expectedEnd=end<total?end:total-1n;
  if(lo!==offset||hi!==expectedEnd||hi<lo||total<=hi||state.total!==undefined&&total!==state.total)return result(state,{error:'Incoherent media range or changed length'});
  if(command.encoding&&command.encoding!=='identity')return result(state,{error:'Encoded range representation is unsupported'});
  if(state.etag&&command.etag!==state.etag)return result(state,{error:'Media representation changed'});
  const etag=state.etag||(command.etag&&/^"[^\r\n]*"$/.test(command.etag)?command.etag:undefined);
  if(!etag&&!state.config.immutable)return result(state,{error:'A strong ETag or explicit immutable contract is required'});
  const expected=Number(hi-lo+1n),next={...state,total,etag,active:Object.freeze({...active,expected})};
  if(command.length!==null){let length;try{length=BigInt(command.length);}catch{return result(next,{error:'Content-Length does not match range'});}if(length!==BigInt(expected))return result(next,{error:'Content-Length does not match range'});}
  return result(next);
 }
 if(command.type==='chunk'){
  const next={...state,stats:Object.freeze({...state.stats,fetchedBytes:state.stats.fetchedBytes+command.bytes})};
  if(active.bodyBytes+command.bytes>active.expected||active.received+command.bytes>state.config.blockBytes)return result(next,{error:'Range body exceeded its bound'});
  return result({...next,active:Object.freeze({...active,received:active.received+command.bytes,bodyBytes:active.bodyBytes+command.bytes})},{copyAt:active.received});
 }
 if(command.type==='body-complete')return active.bodyBytes===active.expected?result(state,{complete:true}):result(state,{error:'Truncated range body',retry:true});
 if(command.type==='retry'){
  if(!command.retryable)return result(state,{retry:false});
  if(active.attempt>=Math.ceil(state.config.readDeadlineMs/1500))return result(state,{error:'Media read retry limit exceeded'});
  const backoff=80*2**Math.min(active.attempt-1,3)*(0.75+command.random*0.5),wait=Math.min(Math.max(0,active.deadline!-command.now),Math.max(Number.isFinite(command.serverWait)?command.serverWait:0,backoff));
  return result({...state,stats:Object.freeze({...state.stats,retries:state.stats.retries+1})},{retry:true,wait});
 }
 if(command.type!=='cache')return result(state,{aborted:true});
 if(active.cached)return result(state,{aborted:true});
 if(!Number.isInteger(command.length)||command.length<0||command.length>command.owned||command.owned>state.config.blockBytes)return result(state,{error:'Range body exceeded its bound'});
 let index=0,retained=state.stats.cacheBytes;const evict:string[]=[];
 while(retained+command.owned>state.config.cacheBytes&&index<state.cache.length){const item=state.cache[index++];retained-=item.owned;evict.push(item.key);}
 const entry=Object.freeze({key:active.key,start:active.start,length:command.length,owned:command.owned}),cacheBytes=retained+command.owned;
 return result({...state,active:Object.freeze({...active,cached:true}),cache:Object.freeze([...state.cache.slice(index),entry]),stats:Object.freeze({...state.stats,cacheBytes,peakCacheBytes:Math.max(state.stats.peakCacheBytes,cacheBytes)})},{evict:Object.freeze(evict)});
}
