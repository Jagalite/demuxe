// SPDX-License-Identifier: Apache-2.0
// Test-only finite simulator. Histories select these fixed fake adapters; they
// cannot import code, resolve URLs, construct Player or supply host callbacks.
import {EffectRuntime} from '../../web/generated/internal/effects/runtime.js';
import {ResourceRegistry} from '../../web/generated/internal/effects/resources.js';
import {sameEffectScope,resourceScopeKey} from '../../web/generated/internal/machine/protocol.js';
import {createTrace,appendTrace,selectTrace} from '../../web/generated/internal/machine/trace.js';
import {VirtualEffects,deferred,settle} from './virtual-effects.mjs';

function normalize(history){
  if(!Array.isArray(history)||history.length>128)throw new RangeError('Simulated history limit exceeded');
  return history.map(step=>{
    if(['retire','flush','dispose'].includes(step.type))return Object.freeze({type:step.type});
    if(step.type==='submit'&&['backend.play','backend.pause','timer.wait'].includes(step.kind)&&['immediate','scheduled'].includes(step.lane)&&Number.isFinite(step.deadline??0)&&(step.deadline??0)>=0)return Object.freeze({type:step.type,kind:step.kind,lane:step.lane,deadline:step.deadline??0});
    if(['resolve','reject'].includes(step.type)&&Number.isSafeInteger(step.call)&&step.call>=1&&step.call<=128)return Object.freeze({type:step.type,call:step.call});
    if(step.type==='advance'&&Number.isFinite(step.time)&&step.time>=0)return Object.freeze({type:step.type,time:step.time});
    throw new TypeError('Unsupported simulated action');
  });
}
export async function replaySimulatedHistory(history,{ignoreRetirement=false}={}){
  const steps=normalize(history),clock=new VirtualEffects(),resources=new ResourceRegistry({scheduleCleanupTimeout:clock.scheduleDeadline}),calls=[],pending=new Map(),effects=new Map(),outcomes=[];
  let generation=1,serial=0,trace=createTrace(256);
  const scope=()=>({owner:'simulated',lifetime:generation,sourceId:generation,sessionId:generation,operationId:1});
  const record=(effect,phase)=>{trace=appendTrace(trace,{scope:{lifetime:effect.scope.lifetime,sourceId:effect.scope.sourceId,sessionId:effect.scope.sessionId,operationId:effect.scope.operationId},kind:'effect',effectId:effect.id,name:effect.kind,phase},{accepted:phase!=='retired'&&phase!=='failed',status:'unknown',effectCount:phase==='issued'?1:0,pendingCount:runtime.pendingCount,reason:phase==='retired'?'stale':phase==='failed'?'failed':'none'},clock.now());};
  const runtime=new EffectRuntime({resources,isCurrent:value=>ignoreRetirement||sameEffectScope(value,scope()),now:clock.now,schedule:clock.schedule,waitUntil:clock.waitUntil,onOutcome:event=>{outcomes.push({id:event.id,kind:event.kind});record(effects.get(event.id),event.kind);}});
  const register=()=>resources.register({id:'backend-'+generation,scopeKey:resourceScopeKey(scope()),kind:'backend',ownership:'owned',value:{play(){return invoke('play');},pause(){return invoke('pause');}},release(){}});
  function invoke(kind){const work=deferred(),id=calls.length+1;calls.push({id,kind});pending.set(id,work);return work.promise;}
  await register();
  try{
    for(const step of steps){
      if(step.type==='submit'){
        const effect={id:++serial,scope:scope(),resourceId:'backend-'+generation,kind:step.kind,lane:step.lane,deadlineMs:step.deadline};effects.set(effect.id,effect);record(effect,'issued');void runtime.submit(effect);
      }else if(step.type==='retire'){generation++;runtime.retireStale();await register();}
      else if(step.type==='resolve'||step.type==='reject'){
        const work=pending.get(step.call);if(!work)throw new RangeError('Unknown simulated completion');
        if(step.type==='resolve')work.resolve();else work.reject(Error('Simulated effect failure'));
      }else if(step.type==='advance')clock.advanceTo(step.time);
      else if(step.type==='flush')clock.flush();
      else runtime.dispose();
      await settle();
    }
  }finally{runtime.dispose();await resources.dispose();await settle();}
  return {calls,outcomes,trace:selectTrace(trace),pending:runtime.pendingCount,timers:clock.timers.size};
}

/** Deterministic bounded delta debugging. Predicate must use an isolated
 * simulated replay. A budget-limited result is explicitly not called minimal. */
export async function shrinkSimulatedHistory(history,fails,{maxTrials=128}={}){
  let current=normalize(history);if(!Number.isSafeInteger(maxTrials)||maxTrials<1||maxTrials>4096)throw new RangeError('Invalid shrink budget');
  let trials=0,exhausted=false;
  const check=async candidate=>{if(trials>=maxTrials){exhausted=true;return false;}trials++;return await fails(candidate)===true;};
  if(!await check(current))throw new Error('Initial simulated history does not reproduce failure');
  let partition=2;
  while(current.length&&!exhausted){
    const size=Math.ceil(current.length/partition);let reduced=false;
    for(let start=0;start<current.length&&!exhausted;start+=size){
      const candidate=[...current.slice(0,start),...current.slice(start+size)];
      if(await check(candidate)){current=candidate;partition=Math.max(2,partition-1);reduced=true;break;}
    }
    if(reduced)continue;if(partition>=current.length)break;partition=Math.min(current.length,partition*2);
  }
  return Object.freeze({history:Object.freeze(current),trials,budgetExhausted:exhausted,oneMinimal:!exhausted});
}
