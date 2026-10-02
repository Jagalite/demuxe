// SPDX-License-Identifier: Apache-2.0
export type PromotionFacts=Readonly<{automatic:boolean;source:boolean;current:boolean;error:boolean;paused:boolean;background:boolean;waiting:boolean;queued:number}>;
export type PromotionState=Readonly<{serial:number;epoch:number;timer:Readonly<{id:number;epoch:number;due:number}>|null;active:Readonly<{id:number;epoch:number;phase:'queued'|'inspecting'|'trying'}>|null}>;
export type PromotionChange=
  |Readonly<{kind:'cancel'}>
  |Readonly<{kind:'schedule';now:number;facts:PromotionFacts}>
  |Readonly<{kind:'fired';id:number;now:number;facts:PromotionFacts}>
  |Readonly<{kind:'start';id:number;facts:PromotionFacts}>
  |Readonly<{kind:'trying'|'finished';id:number}>;
export function initialPromotion():PromotionState{return Object.freeze({serial:0,epoch:0,timer:null,active:null});}
export function cancelPromotion(state:PromotionState):PromotionState{return Object.freeze({...state,epoch:state.epoch+1,timer:null,active:null});}
export function transitionPromotion(state:PromotionState,change:PromotionChange):PromotionState{
  if(change.kind==='cancel')return cancelPromotion(state);
  if(change.kind==='schedule'){
    const f=change.facts;
    return !f.automatic||!f.source||!f.current||f.error?Object.freeze({...state,timer:null}):Object.freeze({...state,serial:state.serial+1,timer:Object.freeze({id:state.serial+1,epoch:state.epoch,due:change.now+200})});
  }
  if(change.kind==='fired'){
    const timer=state.timer,f=change.facts;
    if(!timer||timer.id!==change.id||timer.epoch!==state.epoch||change.now<timer.due)return state;
    const admitted=!state.active&&!f.queued&&f.automatic&&f.source&&f.current&&!f.error&&(f.paused||f.background)&&!f.waiting;
    return Object.freeze({...state,timer:null,active:admitted?Object.freeze({id:timer.id,epoch:state.epoch,phase:'queued' as const}):state.active});
  }
  const active=state.active;
  if(!active||active.id!==change.id||active.epoch!==state.epoch)return state;
  if(change.kind==='finished')return Object.freeze({...state,active:null});
  if(change.kind==='start'){
    if(active.phase!=='queued')return state;
    const f=change.facts;
    return Object.freeze({...state,active:f.automatic&&f.source&&f.current?Object.freeze({...active,phase:'inspecting' as const}):null});
  }
  return active.phase==='inspecting'?Object.freeze({...state,active:Object.freeze({...active,phase:'trying' as const})}):state;
}
/** Only an already admitted plan before the accepted plan can be promoted.
 * Playing handoffs additionally need the Native overlap path. */
export function promotionPlanAllowed(paused:boolean,mode:string,cachedFailure:boolean):boolean{return (paused||mode==='native')&&!cachedFailure;}
