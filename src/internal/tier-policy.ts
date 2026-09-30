// SPDX-License-Identifier: Apache-2.0
/** Configuration-scoped compatibility evidence and optional retry scheduling. */
export class TierAttempts {
  private sources=new WeakMap<object,number>();
  private serial=0;
  private failures=new Map<string,{reason:string;until:number}>();
  private deferredPromotions=new Set<string>();
  key(source:object,configuration:string,plan:string){let id=this.sources.get(source);if(!id){id=++this.serial;this.sources.set(source,id);}return `${id}:${configuration}:${plan}`;}
  failure(source:object,configuration:string,plan:string,reason:string,now=performance.now()){
    const key=this.key(source,configuration,plan);this.failures.delete(key);this.failures.set(key,{reason,until:now+60000});
    if(this.failures.size>64)this.failures.delete(this.failures.keys().next().value!);
  }
  reason(source:object,configuration:string,plan:string,now=performance.now()){
    const key=this.key(source,configuration,plan),value=this.failures.get(key);
    if(value&&value.until>now)return value.reason;
    this.failures.delete(key);
  }
  // A startup deadline is inconclusive, but repeating it on pause blocks a
  // working session. Defer only optional promotion for this source/settings;
  // required discovery still retries and performs its usual readiness checks.
  deferPromotion(source:object,configuration:string,plan:string){
    const key=this.key(source,configuration,plan);this.deferredPromotions.delete(key);this.deferredPromotions.add(key);
    if(this.deferredPromotions.size>64)this.deferredPromotions.delete(this.deferredPromotions.values().next().value!);
  }
  promotionDeferred(source:object,configuration:string,plan:string){return this.deferredPromotions.has(this.key(source,configuration,plan));}
  clear(){this.failures.clear();this.deferredPromotions.clear();this.sources=new WeakMap();}
}
/** Optional promotion only tries plans ahead of the currently accepted plan. */
export function preferredPlans<T extends {id:string;eligible:boolean}>(plans:T[],current:string){
 const index=plans.findIndex(p=>p.id===current);
 return index<0?[]:plans.slice(0,index).filter(p=>p.eligible);
}
