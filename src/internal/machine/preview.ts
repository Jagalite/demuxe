// SPDX-License-Identifier: Apache-2.0
import {createPreviewInteraction,observePreviewInteraction,type PreviewInteractionState} from './preview-interaction.js';
import {demuxeStoryboard} from './preview-demuxe.js';
import type {PreviewOptionsData,PreviewStrategyData} from '../../types.js';

export type PreviewSettings=Readonly<Required<Omit<PreviewOptionsData,'pregenerate'|'strategy'>>>;
export type PreviewRequestData=Readonly<{time:number;width?:number;height?:number;exact?:boolean;maxDistance?:number;cacheOnly?:boolean}>;
export type PreviewJobState=Readonly<{id:number;key:string;time:number;width:number;height?:number;exact:boolean;sourceId:string;background:boolean;ready:boolean;aborted:boolean;requiresDecoder?:boolean;selectionMs:number}>;
export type PreviewCacheEntry=Readonly<{key:string;time:number;bytes:number;background:boolean}>;
export type PreviewControlState=Readonly<{
  options:PreviewSettings;allowed:boolean;suspended:boolean;playbackActive:boolean;disposed:boolean;
  interaction:PreviewInteractionState;strategy:PreviewStrategyData|null;duration:number|null;hoverUntil:number;playbackPosition:number;lastForeground:number;
  sourceId:string;revision:number;serial:number;requestEpoch:number;retiring:number;active:PreviewJobState|null;pending:PreviewJobState|null;
  caller:Readonly<{id:number;jobId:number}>|null;cache:readonly PreviewCacheEntry[];bytes:number;
  counters:Readonly<{requests:number;hits:number;failures:number;cancelled:number}>;
  lastFailure?:Readonly<{provider:string;kind:string}>;
}>;
export type PreviewControlEvent=
  |{kind:'enabled';value:boolean}|{kind:'suspended';value:boolean}|{kind:'playback';value:boolean}
  |{kind:'strategy';value:PreviewStrategyData}|{kind:'source';sourceId:string}|{kind:'providers'}
  |{kind:'focus';source:'hover'|'playback';time:number;at:number}
  |{kind:'duration';duration:number|null}|{kind:'position';time:number}
  |{kind:'foreground';at:number}|{kind:'hover';at:number}|{kind:'request-count';cacheOnly:boolean}|{kind:'retire-work'}|{kind:'retired-work'}
  |{kind:'dispose'}|{kind:'clear-cache'}|{kind:'limits';maxEntries:number;maxCacheBytes:number}
  |{kind:'cancel-job';id:number}|{kind:'ready';id:number}|{kind:'finish-job';id:number}
  |{kind:'provider';id:number;requiresDecoder:boolean|undefined}|{kind:'selection';id:number;milliseconds:number}
  |{kind:'failure';provider:string;errorKind:string}|{kind:'caller';jobId:number}|{kind:'settle';failed:boolean};

export function createPreviewControl(settings:Omit<PreviewOptionsData,'pregenerate'|'strategy'>={}):PreviewControlState {
  const options={enabled:true,bucketSeconds:1,debounceMs:50,width:160,maxCacheBytes:4*1024*1024,maxEntries:48,timeoutMs:10000,...settings};
  for(const [key,value] of Object.entries(options))if(key!=='enabled'&&(!Number.isFinite(value)||Number(value)<0))throw new RangeError(`Invalid preview ${key}`);
  if(options.width<1||options.width>2048||!Number.isInteger(options.width)||options.timeoutMs<1||options.timeoutMs>2147483647||options.debounceMs>2147483647||!Number.isInteger(options.maxEntries))throw new RangeError('Invalid preview limits');
  if(typeof options.enabled!=='boolean')throw new TypeError('Invalid preview enabled option');
  return Object.freeze({options:Object.freeze(options),allowed:options.enabled,suspended:false,playbackActive:false,disposed:false,
    interaction:createPreviewInteraction(),strategy:null,duration:null,hoverUntil:0,playbackPosition:0,lastForeground:-Infinity,sourceId:'initial',revision:0,serial:0,requestEpoch:0,retiring:0,
    active:null,pending:null,caller:null,cache:Object.freeze([]),bytes:0,counters:Object.freeze({requests:0,hits:0,failures:0,cancelled:0})});
}

/** Data-only control updates. Resource cancellation and observer delivery use the
 * committed result; this authority never holds an image, provider or callback. */
export function transitionPreviewControl(state:PreviewControlState,event:PreviewControlEvent):PreviewControlState {
  const updateJob=(id:number,change:Partial<PreviewJobState>)=>({
    active:state.active?.id===id?Object.freeze({...state.active,...change}):state.active,
    pending:state.pending?.id===id?Object.freeze({...state.pending,...change}):state.pending,
  });
  switch(event.kind){
    case 'enabled':if(typeof event.value!=='boolean')throw new TypeError('Preview enabled must be boolean');return Object.freeze({...state,allowed:event.value});
    case 'suspended':return Object.freeze({...state,suspended:event.value});
    case 'playback':return Object.freeze({...state,playbackActive:event.value});
    case 'strategy':return Object.freeze({...state,strategy:event.value.type==='timestamps'?Object.freeze({...event.value,timestamps:Object.freeze([...event.value.timestamps])}):Object.freeze({...event.value})});
    case 'focus':return Object.freeze({...state,interaction:observePreviewInteraction(state.interaction,event.source,event.time,event.at,state.options.bucketSeconds)});
    case 'source':return Object.freeze({...state,interaction:createPreviewInteraction(),sourceId:event.sourceId,hoverUntil:0,playbackPosition:0});
    case 'providers':return Object.freeze({...state,revision:state.revision+1});
    case 'duration':return Object.freeze({...state,duration:event.duration!==null&&Number.isFinite(event.duration)&&event.duration>0?event.duration:null});
    case 'position':return Number.isFinite(event.time)&&event.time>=0?Object.freeze({...state,playbackPosition:event.time}):state;
    case 'foreground':return Object.freeze({...state,lastForeground:event.at});
    case 'hover':return Object.freeze({...state,hoverUntil:event.at+1500});
    case 'request-count':return Object.freeze({...state,requestEpoch:state.requestEpoch+(event.cacheOnly?0:1),counters:Object.freeze({...state.counters,requests:state.counters.requests+1})});
    case 'retire-work':return Object.freeze({...state,requestEpoch:state.requestEpoch+1,retiring:state.retiring+1});
    case 'retired-work':return Object.freeze({...state,retiring:Math.max(0,state.retiring-1)});
    case 'dispose':return Object.freeze({...state,disposed:true});
    case 'clear-cache':return Object.freeze({...state,cache:Object.freeze([]),bytes:0});
    case 'limits':{
      if(!Number.isSafeInteger(event.maxEntries)||event.maxEntries<0||!Number.isFinite(event.maxCacheBytes)||event.maxCacheBytes<0)throw new RangeError('Invalid preview cache limits');
      const cache=[...state.cache];let bytes=state.bytes;
      while(cache.length&&(cache.length>event.maxEntries||bytes>event.maxCacheBytes)){
        const background=cache.findIndex(entry=>entry.background),index=background<0?0:background;
        bytes-=cache[index].bytes;cache.splice(index,1);
      }
      return Object.freeze({...state,options:Object.freeze({...state.options,maxEntries:event.maxEntries,maxCacheBytes:event.maxCacheBytes}),cache:Object.freeze(cache),bytes});
    }
    case 'cancel-job':return Object.freeze({...state,active:state.active?.id===event.id?Object.freeze({...state.active,aborted:true}):state.active,pending:state.pending?.id===event.id?null:state.pending});
    case 'ready':return Object.freeze({...state,...updateJob(event.id,{ready:true})});
    case 'finish-job':return state.active?.id===event.id?Object.freeze({...state,active:null}):state;
    case 'provider':return Object.freeze({...state,...updateJob(event.id,{requiresDecoder:event.requiresDecoder})});
    case 'selection':{
      const job=previewJob(state,event.id);return job?Object.freeze({...state,...updateJob(event.id,{selectionMs:job.selectionMs+event.milliseconds})}):state;
    }
    case 'failure':return Object.freeze({...state,counters:Object.freeze({...state.counters,failures:state.counters.failures+1}),lastFailure:Object.freeze({provider:event.provider,kind:event.errorKind})});
    case 'caller':return state.disposed||state.retiring||!previewJob(state,event.jobId)||previewJob(state,event.jobId)!.aborted?state:Object.freeze({...state,serial:state.serial+1,caller:Object.freeze({id:state.serial+1,jobId:event.jobId})});
    case 'settle':return !state.caller?state:Object.freeze({...state,caller:null,counters:event.failed?Object.freeze({...state.counters,cancelled:state.counters.cancelled+1}):state.counters});
  }
}

export function previewJob(state:PreviewControlState,id:number):PreviewJobState|undefined {return state.active?.id===id?state.active:state.pending?.id===id?state.pending:undefined;}
export function previewGenerationAdmission(state:PreviewControlState,at:number):'run'|'wait'|'stop' {
  if(state.disposed)return 'stop';
  if(state.retiring||!state.allowed||state.suspended||state.active||state.pending||state.caller||at-state.lastForeground<(state.strategy?.type==='demuxe'?100:500))return 'wait';
  return !state.options.maxCacheBytes||!state.options.maxEntries?'stop':'run';
}
export function previewProviderDeferred(state:PreviewControlState,requiresDecoder:boolean|undefined,allowDuringPlayback:boolean|undefined):boolean {return !!(state.playbackActive&&requiresDecoder&&!allowDuringPlayback);}
export function previewCanPrefetch(state:PreviewControlState):boolean {return !(state.active||state.pending||state.caller||state.disposed||state.retiring);}
export type PreviewAdmission=
  |Readonly<{kind:'aborted'}>|Readonly<{kind:'disabled'}>|Readonly<{kind:'invalid';message:string}>
  |Readonly<{kind:'ready';key:string;time:number;width:number;height:number|undefined;exact:boolean}>;
export function admitPreviewRequest(state:PreviewControlState,request:PreviewRequestData,aborted:boolean):PreviewAdmission {
  if(state.disposed||state.retiring||aborted)return Object.freeze({kind:'aborted'});
  if(!state.allowed)return Object.freeze({kind:'disabled'});
  const width=request.width??state.options.width,height=request.height;
  if(request.maxDistance!==undefined&&(!Number.isFinite(request.maxDistance)||request.maxDistance<0))return Object.freeze({kind:'invalid',message:'Invalid preview distance'});
  if(!Number.isFinite(request.time)||request.time<0||!Number.isInteger(width)||width<1||width>2048||(height!==undefined&&(!Number.isInteger(height)||height<1||height>2048)))return Object.freeze({kind:'invalid',message:'Invalid preview request'});
  const bucket=request.exact?0:state.options.bucketSeconds,time=bucket?Math.floor(request.time/bucket)*bucket:request.time;
  if(!Number.isFinite(time))return Object.freeze({kind:'invalid',message:'Invalid preview bucket'});
  return Object.freeze({kind:'ready',key:JSON.stringify([state.sourceId,state.revision,time,width,height??null,!!request.exact]),time,width,height,exact:!!request.exact});
}
export function planPreviewRequest(state:PreviewControlState,key:string,cacheOnly:boolean,background:boolean):Readonly<{state:PreviewControlState;jobId:number|null;cancel:readonly number[]}> {
  const job=state.pending?.key===key?state.pending:state.active?.key===key&&!state.active.aborted?state.active:null;
  const cancel=cacheOnly?[]:[state.pending,state.active].filter(other=>other!==null&&other.id!==job?.id).map(other=>other!.id);
  const next=job&&!cacheOnly&&!background?Object.freeze({...state,
    active:state.active===job?Object.freeze({...job,background:false}):state.active,
    pending:state.pending===job?Object.freeze({...job,background:false}):state.pending}):state;
  return Object.freeze({state:next,jobId:job?.id??null,cancel:Object.freeze(cancel)});
}
export function createPreviewJob(state:PreviewControlState,admission:Extract<PreviewAdmission,{kind:'ready'}>,background:boolean):PreviewControlState {
  const id=state.serial+1;
  return Object.freeze({...state,serial:id,pending:Object.freeze({id,key:admission.key,time:admission.time,width:admission.width,height:admission.height,exact:admission.exact,sourceId:state.sourceId,background,ready:false,aborted:false,selectionMs:0})});
}
export function startPreviewJob(state:PreviewControlState):PreviewControlState {return state.active||!state.pending?.ready?state:Object.freeze({...state,active:state.pending,pending:null});}

export function lookupPreviewCache(state:PreviewControlState,request:PreviewRequestData,admission:Extract<PreviewAdmission,{kind:'ready'}>,background:boolean):Readonly<{state:PreviewControlState;key:string|null}> {
  let cached=state.cache.find(entry=>entry.key===admission.key);
  if(!cached&&!request.exact&&request.maxDistance){
    let distance=request.maxDistance;
    for(const entry of state.cache){
      const identity=JSON.parse(entry.key);
      if(identity[0]!==state.sourceId||identity[1]!==state.revision||identity[3]!==admission.width||identity[4]!== (admission.height??null))continue;
      const delta=Math.abs(entry.time-request.time);if(delta<=distance){distance=delta;cached=entry;}
    }
  }
  if(!cached)return Object.freeze({state,key:null});
  const entry=Object.freeze({...cached,background:background?cached.background:false});
  return Object.freeze({state:Object.freeze({...state,cache:Object.freeze([...state.cache.filter(item=>item.key!==entry.key),entry]),counters:Object.freeze({...state.counters,hits:state.counters.hits+1})}),key:entry.key});
}
export function rememberPreviewCache(state:PreviewControlState,entry:PreviewCacheEntry):PreviewControlState {
  if(entry.bytes>state.options.maxCacheBytes||!state.options.maxEntries)return state;
  const cache=[...state.cache];let bytes=state.bytes;
  const capacity=Math.min(state.options.maxEntries,Math.floor(state.options.maxCacheBytes/Math.max(1,entry.bytes,...cache.map(item=>item.bytes))));
  const broad=new Set(state.strategy?.type==='demuxe'?demuxeStoryboard(state.duration??0,capacity,state.options.bucketSeconds):[]);
  const protectedEntry=(item:PreviewCacheEntry)=>{const key=JSON.parse(item.key);return key[3]===240&&key[4]===135&&!key[5]&&broad.has(key[2]);};
  while(cache.length&&(bytes+entry.bytes>state.options.maxCacheBytes||cache.length>=state.options.maxEntries)){
    let index=entry.background?cache.findIndex(item=>item.background):0;
    if(state.strategy?.type==='demuxe'){
      // Local LRU can turn over without losing broad coverage. Foreground always wins.
      index=cache.findIndex(item=>!protectedEntry(item));
      if(index<0&&!entry.background)index=0;
    }
    if(index<0)return Object.freeze({...state,cache:Object.freeze(cache),bytes});
    bytes-=cache[index].bytes;cache.splice(index,1);
  }
  // Keys are unique for admitted, serialized jobs. Store only detached metadata;
  // images are addressed by key in the shell resource map.
  const existing=cache.findIndex(item=>item.key===entry.key);
  if(existing>=0)cache[existing]=Object.freeze({...entry});else cache.push(Object.freeze({...entry}));
  return Object.freeze({...state,cache:Object.freeze(cache),bytes:bytes+entry.bytes});
}
export function unloadPreviewCache(state:PreviewControlState,start:number,end:number):Readonly<{state:PreviewControlState;jobs:readonly number[];removed:number}> {
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<=start)throw new RangeError('Invalid preview unload range');
  const contains=(time:number)=>time>=start&&time<end;
  const jobs=[state.active,state.pending].filter(job=>job!==null&&contains(job.time)).map(job=>job!.id);
  const removed=state.cache.filter(entry=>contains(JSON.parse(entry.key)[2]));
  return Object.freeze({state:Object.freeze({...state,cache:Object.freeze(state.cache.filter(entry=>!contains(JSON.parse(entry.key)[2]))),bytes:state.bytes-removed.reduce((sum,entry)=>sum+entry.bytes,0)}),jobs:Object.freeze(jobs),removed:removed.length});
}
