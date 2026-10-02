// SPDX-License-Identifier: Apache-2.0
import {resourceScopeKey,type Effect,type EffectOutcome,type EffectScope} from '../machine/protocol.js';
import {createEffectRuntimeState,effectRuntimeWork,transitionEffectRuntime,type EffectRuntimeState,type EffectRuntimeInput,type EffectRuntimeDecision} from '../machine/effect-runtime.js';
import type {Backend} from '../backend.js';
import {ResourceRegistry} from './resources.js';

type Handle={controller?:AbortController;resolve:(value:EffectOutcome)=>void;unschedule?:()=>void};
export type EffectRuntimeOptions={
  store?:Readonly<{read:()=>EffectRuntimeState;dispatch:(input:EffectRuntimeInput)=>EffectRuntimeDecision}>;
  scopeKey?:(scope:EffectScope)=>string;
  resources:ResourceRegistry;isCurrent:(scope:EffectScope)=>boolean;now:()=>number;
  schedule:(work:()=>void)=>()=>void;waitUntil:(deadlineMs:number,signal:AbortSignal)=>Promise<void>;
  onOutcome?:(outcome:EffectOutcome,physicalError?:unknown)=>void;onObserverError?:(error:unknown)=>void;maxPending?:number;
};
/** Host interpreter for typed effects. The enclosing Player can compose the
 * pure execution owner through the store port; physical handles remain here. */
export class EffectRuntime {
  private localState?:EffectRuntimeState;
  private get state(){return this.options.store?this.options.store.read():this.localState!;}
  private readonly handles=new Map<number,Handle>();
  constructor(private readonly options:EffectRuntimeOptions){if(!options.store)this.localState=createEffectRuntimeState(options.maxPending);}
  get pendingCount(){return this.state.pending.length;}
  private transition(input:EffectRuntimeInput):EffectRuntimeDecision {
    if(this.options.store)return this.options.store.dispatch(input);const decision=transitionEffectRuntime(this.state,input);this.localState=decision.state;return decision;
  }
  submit(input:Effect,options:Readonly<{rethrowImmediate?:boolean}>={}):Promise<EffectOutcome>{
    // Normalize host records before entering the reducer; getters can reenter.
    const sourceScope=input.scope,scope={owner:sourceScope.owner,lifetime:sourceScope.lifetime,sourceId:sourceScope.sourceId,sessionId:sourceScope.sessionId,operationId:sourceScope.operationId,...sourceScope.playId!==undefined?{playId:sourceScope.playId}:{}};
    const kind=input.kind,identity={id:input.id,scope,lane:input.lane};
    const observed:Effect=kind==='timer.wait'?{...identity,kind,deadlineMs:(input as Extract<Effect,{kind:'timer.wait'}>).deadlineMs}:{...identity,kind,resourceId:(input as Exclude<Effect,{kind:'timer.wait'}>).resourceId};
    const admission=this.transition({type:'admit',effect:observed});
    if(!admission.accepted)throw new Error(admission.reason==='identity'?'Effect ID must increase':admission.reason==='disposed'?'Effect runtime is disposed':'Effect queue is full');
    const effect=effectRuntimeWork(this.state,observed.id)!.effect;
    let resolve!:(value:EffectOutcome)=>void;
    const result=new Promise<EffectOutcome>(done=>{resolve=done;});
    const handle:Handle={resolve};this.handles.set(effect.id,handle);
    // Install settlement before host acquisition, which can retire the owner.
    try{
      const controller=new AbortController();handle.controller=controller;
      if(!this.handles.has(effect.id)){try{controller.abort();}catch(error){this.observerError(error);}return result;}
    }catch(error){
      this.deliver(this.transition({type:'schedule-failed',id:effect.id}).outcomes,error);
      if(effect.lane==='immediate'&&options.rethrowImmediate)throw error;
      return result;
    }
    // Transient scheduler observation, not work lifecycle authority. A scheduler
    // may invoke its callback synchronously and then throw after work completed.
    let schedulerInvoked=false;
    const start=()=>{
      const current=this.current(effect),retiredCleanup=this.retiredCleanup(effect);
      const decision=this.transition({type:'start',id:effect.id,current,retiredCleanup});
      if(!decision.accepted)return;schedulerInvoked=true;this.deliver(decision.outcomes);
      if(!decision.execute)return;
      try{
        // Preserve browser user activation by invoking before promise wrapping.
        const operation=this.execute(decision.execute,handle.controller!.signal);
        Promise.resolve(operation).then(()=>this.finish(effect,true),error=>this.finish(effect,false,error));
      }catch(error){this.finish(effect,false,error);if(effect.lane==='immediate'&&options.rethrowImmediate)throw error;}
    };
    if(effect.lane==='immediate')start();
    else try{
      const cancel=this.options.schedule(start);
      if(!effectRuntimeWork(this.state,effect.id))cancel();else handle.unschedule=cancel;
    }catch(error){
      if(schedulerInvoked)this.observerError(error);
      else this.deliver(this.transition({type:'schedule-failed',id:effect.id}).outcomes);
    }
    return result;
  }
  /** Logical retirement settles callers even if an external operation ignores abort. */
  retireStale():void {
    for(const {effect} of this.state.pending){
      const retiredCleanup=this.retiredCleanup(effect),current=this.current(effect);
      this.deliver(this.transition({type:'retire',id:effect.id,current,retiredCleanup}).outcomes);
    }
  }
  dispose():void {
    this.deliver(this.transition({type:'dispose'}).outcomes);
    // The owner retires the registry separately and awaits physical cleanup.
  }
  private scopeKey(scope:EffectScope){return this.options.scopeKey?.(scope)??resourceScopeKey(scope);}
  /** Deliver outcomes already committed by an enclosing composed owner. */
  deliverOutcomes(outcomes:readonly EffectOutcome[]):void{this.deliver(outcomes);}
  private retiredCleanup(effect:Effect):boolean{return effect.kind==='resource.release'&&this.options.resources.isScopeRetired(this.scopeKey(effect.scope));}
  private current(effect:Effect):boolean {
    if(this.state.disposed||!effectRuntimeWork(this.state,effect.id))return false;
    try{return this.options.isCurrent(effect.scope);}catch{return false;}
  }
  private execute(effect:Effect,signal:AbortSignal):void|Promise<void>{
    switch(effect.kind){
      case 'backend.play':{const backend=this.options.resources.get<Pick<Backend,'play'>>(effect.resourceId,this.scopeKey(effect.scope)),call=backend.play;if(!this.current(effect))throw new Error('Effect retired before invocation');return call.call(backend);}
      case 'backend.pause':{const backend=this.options.resources.get<Pick<Backend,'pause'>>(effect.resourceId,this.scopeKey(effect.scope)),call=backend.pause;if(!this.current(effect))throw new Error('Effect retired before invocation');return call.call(backend);}
      case 'resource.release':return this.options.resources.release(effect.resourceId,this.scopeKey(effect.scope));
      case 'timer.wait':
        if(!Number.isFinite(effect.deadlineMs))throw new Error('Invalid effect deadline');
        return effect.deadlineMs<=this.options.now()?undefined:this.options.waitUntil(effect.deadlineMs,signal);
    }
  }
  private finish(effect:Effect,success:boolean,error?:unknown):void {
    const current=this.current(effect);this.deliver(this.transition({type:'physical-result',id:effect.id,success,current}).outcomes,error);
  }
  private observerError(error:unknown):void{try{this.options.onObserverError?.(error);}catch{/* Observer failures cannot change settlement. */}}
  private deliver(outcomes:readonly EffectOutcome[],error?:unknown):void {
    // The reducer removed every outcome before abort handlers/observers reenter.
    for(const outcome of outcomes){
      const handle=this.handles.get(outcome.id);if(!handle)continue;this.handles.delete(outcome.id);
      const cancel=handle.unschedule;handle.unschedule=undefined;try{cancel?.();}catch{/* Settlement must continue. */}
      if(outcome.kind==='retired')try{handle.controller?.abort();}catch(error){this.observerError(error);}
      handle.resolve(outcome);
      try{this.options.onOutcome?.(outcome,error);}catch(error){this.observerError(error);}
    }
  }
}
