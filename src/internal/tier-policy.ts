// SPDX-License-Identifier: Apache-2.0
import {readTierFailure,preferredPlanIndices} from './machine/routing.js';
import {initialTierOwner,transitionTierOwner,type TierOwner,type TierChange} from './machine/route-evidence.js';
export type TierStore={read():TierOwner;change(change:TierChange,revision:number):boolean};
function localTierStore():TierStore{
  let state=initialTierOwner();
  return {read:()=>state,change(change,revision){const next=transitionTierOwner(state,change,revision),accepted=next!==state;state=next;return accepted;}};
}
/** Object identity and clock reads stay here; Player evidence shares its one
 * composed authority, while standalone utility instances have a local owner. */
export class TierAttempts {
  private sources=new WeakMap<object,number>();
  private identityEpoch=-1;
  constructor(private readonly store:TierStore=localTierStore()){}
  key(source:object,configuration:string,plan:string){
    const owner=this.store.read();
    if(this.identityEpoch!==owner.identityEpoch){this.sources=new WeakMap();this.identityEpoch=owner.identityEpoch;}
    let id=this.sources.get(source);
    if(!id){if(!this.store.change({kind:'identity'},owner.revision))return undefined;id=this.store.read().serial;this.sources.set(source,id);}
    return `${id}:${configuration}:${plan}`;
  }
  failure(source:object,configuration:string,plan:string,reason:string,now=performance.now()){
    const key=this.key(source,configuration,plan);if(key===undefined)return;
    this.store.change({kind:'failure',key,reason,now},this.store.read().revision);
  }
  reason(source:object,configuration:string,plan:string,now=performance.now()){
    const key=this.key(source,configuration,plan);if(key===undefined)return undefined;
    const previous=this.store.read(),result=readTierFailure(previous.value,key,now);
    this.store.change({kind:'read',key,now},previous.revision);return result.reason;
  }
  clear(){this.store.change({kind:'clear'},this.store.read().revision);}
}
/** Optional promotion only tries plans ahead of the currently accepted plan. */
export function preferredPlans<T extends {id:string;eligible:boolean}>(plans:readonly T[],current:string){
  return preferredPlanIndices(plans.map(plan=>({id:plan.id,eligible:plan.eligible})),current).map(index=>plans[index]);
}
