// SPDX-License-Identifier: Apache-2.0
// Synthetic host: no media bytes, browser objects, decoder or wall-clock timers.
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer,playerEffectAuthority} from '../../web/generated/internal/machine/transition.js';
import {EffectRuntime} from '../../web/generated/internal/effects/runtime.js';
import {ResourceRegistry} from '../../web/generated/internal/effects/resources.js';
import {Contract} from './composed-replay-harness.mjs';
import {VirtualEffects,deferred} from './virtual-effects.mjs';
export const day=86400000;
export function random(seed){let n=seed>>>0;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return (n^(n>>>16))>>>0;};}
const drain=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
export async function soakPlayback({seed=1,steps=6000,mutation}={}){
 assert.ok(Number.isSafeInteger(seed)&&seed>0&&Number.isSafeInteger(steps)&&steps>=64&&steps<=20000);
 const next=random(seed),clock=new VirtualEffects(),model=new Contract(),pending=new Map(),releases=new Map(),outcomes=[];
 const coverage=new Set(),suffix=[];let state=initialPlayerControl(),runtime,invoking,serial=0,checks=0,step=-1,violation;
 let peakEffects=0,peakResources=0,peakTimers=0,physicalCalls=0,releaseCalls=0,staleProbes=0;
 const remember=input=>{suffix.push({step,time:clock.time,input:structuredClone(input)});if(suffix.length>64)suffix.shift();};
 function send(input){
  remember(input);const expected=model.send(input),before=state;let result=transitionPlayer(before,input);
  if(mutation==='drop-pause'&&input.type==='play.retire')result={...result,state:before,executionOutcomes:[]};
  if(mutation==='leak-release'&&input.type==='resource.event'&&input.input.type==='physical-result')result={...result,state:before};
  state=result.state;
  try{assert.equal(result.accepted,expected,'contract admission');model.check(state);checks++;}
  catch(error){violation??=error;}
  runtime?.deliverOutcomes(result.executionOutcomes??[]);
  if(input.type==='effect.event'&&input.input.type==='start')invoking=input.input.id;
  return result;
 }
 const resources=new ResourceRegistry({store:{read:()=>state.resources,dispatch:input=>send({type:'resource.event',input}).resource},scheduleCleanupTimeout:clock.scheduleDeadline});
 runtime=new EffectRuntime({resources,store:{read:()=>state.executor,dispatch:input=>send({type:'effect.event',input}).execution},scopeKey:s=>'scope:'+s.sessionId,isCurrent:s=>playerEffectAuthority(state,s),now:clock.now,schedule:clock.schedule,waitUntil:clock.waitUntil,onOutcome:o=>outcomes.push([o.id,o.kind])});
 function call(kind){
  const id=invoking;assert.ok(!pending.has(id),'no repeated physical invocation');physicalCalls++;
  const work=deferred();pending.set(id,work);const success=next()%5!==0;
  clock.scheduleDeadline(()=>{pending.delete(id);success?work.resolve():work.reject(Error('synthetic backend failure'));coverage.add(success?'physical-success':'physical-failure');},100+next()%20000);
  return work.promise;
 }
 async function open(preserve){
  const old=model.session,attempt=send({type:'source.begin',operationEpoch:model.epoch,mode:['software','hybrid','native'][next()%3],preserve,planId:'synthetic'}).id;
  for(const stage of ['created','configured','opened','applied','positioned'])send({type:'source.'+stage,attempt});
  send({type:'source.accept',attempt,operationEpoch:model.epoch,settings:{...state.settings,pause:preserve?model.pause:true},planMatches:true});send({type:'source.finished',attempt});
  coverage.add(preserve?'preserved-source':'fresh-source');
  if(old!==null)void resources.retireScope('scope:'+old).catch(()=>{});
  const session=model.session;
  await resources.register({id:'resource:'+session,scopeKey:'scope:'+session,kind:'backend',ownership:'owned',value:{play:()=>call('play'),pause:()=>call('pause')},release(){
   assert.ok(!releases.has(session),'cleanup invoked once');releaseCalls++;const work=deferred();releases.set(session,work);
   const success=next()%7!==0;clock.scheduleDeadline(()=>{releases.delete(session);success?work.resolve():work.reject(Error('synthetic cleanup failure'));coverage.add(success?'cleanup-success':'cleanup-failure');},100+next()%20000);return work.promise;
  }});
 }
 function submit(kind,lane){
  const id=++serial,playId=kind==='backend.play'?send({type:'play.request'}).id:undefined;
  const scope={owner:'player',lifetime:model.epoch,sourceId:model.sourceSerial,sessionId:model.session,operationId:0,...playId===undefined?{}:{playId}};
  void runtime.submit({id,kind,lane,scope,...kind==='timer.wait'?{deadlineMs:clock.time+100+next()%20000}:{resourceId:'resource:'+model.session}}).then(()=>{if(playId!==undefined)send({type:'play.settled',id:playId});}).catch(error=>{violation??=error;});
  coverage.add(kind+':'+lane);
 }
 async function inspect(){
  await drain();if(violation)throw violation;model.check(state);assert.deepEqual(outcomes,model.outcomes,'exactly once, ordered delivery');
  peakEffects=Math.max(peakEffects,runtime.pendingCount);peakResources=Math.max(peakResources,state.resources.resources.length);peakTimers=Math.max(peakTimers,clock.timers.size);
  assert.ok(pending.size<=64&&releases.size<=64&&clock.timers.size<=192,'bounded physical backlog');
  assert.ok(runtime.handles.size<=64&&resources.handles.size<=64&&resources.acquisitions.size===0);
  assert.ok(resources.completions.size<=64&&resources.scopes.size<=64);
  assert.ok(state.resources.scopes.length<=state.resources.limits.maxScopes);
 }
 try{
  await open(false);
  for(step=0;step<steps;step++){
   const choice=next()%16;
   if(choice<7&&runtime.pendingCount<24&&state.playback.plays.length<24)submit(['backend.play','backend.pause','timer.wait'][next()%3],next()%2?'immediate':'scheduled');
   else if(choice<10){send({type:'play.retire'});send({type:'settings.change',value:{pause:true}});coverage.add('pause');}
   else if(choice===10){send({type:'settings.change',value:{pause:false}});coverage.add('resume');}
   else if(choice===11)await open(true);
   else if(choice===12){const old=model.session;send({type:'play.retire'});send({type:'operation.retire',terminal:false});send({type:'source.clear'});void resources.retireScope('scope:'+old).catch(()=>{});await open(false);coverage.add('close-reopen');}
   else if(choice===13){send({type:'effect.event',input:{type:'physical-result',id:outcomes.length?outcomes[next()%outcomes.length][0]:serial+1,current:true,success:true}});coverage.add('duplicate-or-late-result');}
   else if(choice===14){const attempt=send({type:'source.begin',operationEpoch:model.epoch,mode:'software',preserve:true,planId:'synthetic'}).id;
    assert.equal(send({type:'source.accept',attempt,operationEpoch:model.epoch,settings:state.settings,planMatches:true}).accepted,false);send({type:'source.finished',attempt});staleProbes++;coverage.add('premature-source-accept');}
   else {clock.flush();coverage.add('dispatch');}
   if(step%3===0)clock.flush();
   // Short active intervals overlap physical work; sparse idle jumps span 28
   // days. A 49-day base separately crosses signed/unsigned 32-bit timestamps.
   const jump=step%64===63?28*day/Math.floor(steps/64):next()%500;
   clock.advanceTo(clock.time+jump);await inspect();
   if(step===Math.floor(steps/2)){clock.advanceTo(clock.time+49*day);await inspect();coverage.add('large-timestamp');}
  }
  send({type:'play.retire'});send({type:'operation.retire',terminal:true});
  const disposal=resources.dispose();void disposal.catch(()=>{});await drain();clock.flush();
  // Explicit fairness closure: every fake producer eventually returns, even
  // when logical work was retired and its cleanup deadline already expired.
  clock.advanceTo(clock.time+day);await inspect();await disposal.catch(()=>{});await inspect();
  assert.equal(runtime.pendingCount,0);assert.equal(state.resources.resources.length,0);assert.equal(pending.size,0);assert.equal(releases.size,0);assert.equal(clock.timers.size,0);assert.equal(clock.scheduled.length,0);assert.equal(runtime.handles.size,0);assert.equal(resources.handles.size,0);assert.equal(resources.completions.size,0);assert.equal(resources.scopes.size,0);
  return{seed,steps,checks,virtualDays:clock.time/day,physicalCalls,releaseCalls,staleProbes,peakEffects,peakResources,peakTimers,registered:model.registered,released:model.released,cleanupFailures:model.failures,cleanupTimeouts:model.timedOut,lateReleased:model.lateReleased,lateFailed:model.lateFailed,coverage:[...coverage].sort()};
 }catch(error){
  throw new Error(`Playback soak failed: seed=${seed}, steps=${steps}, step=${step}, virtualMs=${clock.time}\nReplay: soakPlayback({seed:${seed},steps:${steps}})\nLast inputs: ${JSON.stringify(suffix)}`,{cause:error});
 }finally{try{runtime.dispose();}catch{}for(const work of pending.values())work.resolve();for(const work of releases.values())work.resolve();await drain();}
}
