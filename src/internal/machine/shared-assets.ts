// SPDX-License-Identifier: Apache-2.0
export type SharedAssetEntry=Readonly<{key:string;id:number;bytes:number;ready:boolean}>;
export type SharedAssetsState=Readonly<{retired:boolean;nextId:number;maxBytes:number;entries:readonly SharedAssetEntry[]}>;
export type SharedAssetsCommand=
  |Readonly<{type:'reserve';key:string;bytes:number}>
  |Readonly<{type:'ready'|'failed';id:number}>
  |Readonly<{type:'clear'}>|Readonly<{type:'retire'}>;
export function initialSharedAssets(maxBytes:number):SharedAssetsState{return Object.freeze({retired:false,nextId:1,maxBytes,entries:Object.freeze([])});}
export function reservedAssetBytes(state:SharedAssetsState):number{return state.entries.reduce((total,entry)=>total+entry.bytes,0);}
/** Ordered reservations are the LRU; pending acquisitions cannot be evicted.
 * IDs fence completions after eviction, retry, clear, and retirement. */
export function transitionSharedAssets(state:SharedAssetsState,command:SharedAssetsCommand){
  if(command.type==='retire')return Object.freeze({state:Object.freeze({...state,retired:true,entries:Object.freeze([])}),id:undefined,error:undefined});
  if(state.retired)return Object.freeze({state,id:undefined,error:'retired' as const});
  if(command.type==='reserve'){
    const cached=state.entries.find(entry=>entry.key===command.key);
    if(cached)return Object.freeze({state:Object.freeze({...state,entries:Object.freeze([...state.entries.filter(entry=>entry.id!==cached.id),cached])}),id:cached.id,error:undefined});
    if(!Number.isSafeInteger(command.bytes)||command.bytes<0||command.bytes>state.maxBytes)return Object.freeze({state,id:undefined,error:'size' as const});
    let entries=[...state.entries],bytes=reservedAssetBytes(state);
    for(const entry of state.entries){if(bytes+command.bytes<=state.maxBytes)break;if(entry.ready){entries=entries.filter(item=>item.id!==entry.id);bytes-=entry.bytes;}}
    if(bytes+command.bytes>state.maxBytes)return Object.freeze({state:Object.freeze({...state,entries:Object.freeze(entries)}),id:undefined,error:'capacity' as const});
    const id=state.nextId;
    return Object.freeze({state:Object.freeze({...state,nextId:id+1,entries:Object.freeze([...entries,Object.freeze({key:command.key,id,bytes:command.bytes,ready:false})])}),id,error:undefined});
  }
  const entries=command.type==='clear'?state.entries.filter(entry=>!entry.ready)
    :command.type==='failed'?state.entries.filter(entry=>entry.id!==command.id)
    :state.entries.map(entry=>entry.id===command.id?Object.freeze({...entry,ready:true}):entry);
  return Object.freeze({state:Object.freeze({...state,entries:Object.freeze(entries)}),id:undefined,error:undefined});
}
