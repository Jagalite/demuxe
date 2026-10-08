// SPDX-License-Identifier: Apache-2.0
import type {RuntimeProvider} from './provider-runtime.js';
import {copyData} from './data.js';
export type SharedRuntimeState=Readonly<{retired:boolean;revision:number;qualified:Readonly<Record<string,string>>;providers:readonly RuntimeProvider[];loads:readonly Readonly<{key:string;id:number}>[];nextLoad:number}>;
export function initialSharedRuntime(qualified:Readonly<Record<string,string>>):SharedRuntimeState{return Object.freeze({retired:false,revision:0,qualified:copyData(qualified),providers:Object.freeze([]),loads:Object.freeze([]),nextLoad:1});}
export function admitSharedRuntimeLoad(state:SharedRuntimeState,key:string){
  if(state.retired)return Object.freeze({state,id:undefined,start:false});
  const old=state.loads.find(load=>load.key===key);if(old)return Object.freeze({state,id:old.id,start:false});
  const id=state.nextLoad;return Object.freeze({state:Object.freeze({...state,nextLoad:id+1,loads:Object.freeze([...state.loads,Object.freeze({key,id})])}),id,start:true});
}
export function failSharedRuntimeLoad(state:SharedRuntimeState,id:number):SharedRuntimeState{return Object.freeze({...state,loads:Object.freeze(state.loads.filter(load=>load.id!==id))});}
export function unqualifiedRuntimeProvider(state:SharedRuntimeState,providers:readonly RuntimeProvider[]):string|undefined{return providers.find(provider=>!provider.manifestMatches||state.qualified[provider.id]!==provider.implementationIdentity)?.id;}
/** The adapter supplies a validated additive merge against this revision. No
 * asynchronous work may occur between merge and publication. */
export function publishSharedRuntime(state:SharedRuntimeState,baseRevision:number,providers:readonly RuntimeProvider[],changed:boolean){
  if(state.retired||state.revision!==baseRevision||unqualifiedRuntimeProvider(state,providers)!==undefined)return Object.freeze({state,accepted:false,published:false});
  if(!changed)return Object.freeze({state,accepted:true,published:false});
  const facts=new Map(state.providers.map(provider=>[provider.id,provider]));for(const provider of providers)facts.set(provider.id,copyData(provider));
  return Object.freeze({state:Object.freeze({...state,revision:state.revision+1,providers:Object.freeze([...facts.values()])}),accepted:true,published:true});
}
export function retireSharedRuntime(state:SharedRuntimeState):SharedRuntimeState{return Object.freeze({...state,retired:true,loads:Object.freeze([])});}
