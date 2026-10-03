// SPDX-License-Identifier: Apache-2.0
// Finite, test-only replay: no URLs, provider loading, media bytes or host callbacks.
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer,playerEffectAuthority} from '../../web/generated/internal/machine/transition.js';
import {EffectRuntime} from '../../web/generated/internal/effects/runtime.js';
import {ResourceRegistry} from '../../web/generated/internal/effects/resources.js';
import {createTrace,tracePlayerTransition,selectTrace} from '../../web/generated/internal/machine/trace.js';
import {VirtualEffects,deferred} from './virtual-effects.mjs';
const drain=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
const stages=['created','configured','opened','applied','positioned'];
const sort=values=>values.sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
/** Deliberately smaller than Player: contractual identities, source milestones,
 * accepted pause, outstanding execution and physical cleanup obligations only.
 * No production reducer/selectors are used to calculate expected state. */
export class Contract {
 epoch=0;terminal=false;disposed=false;session=null;sessionEpoch=null;candidate=null;attempt=0;sessionSerial=0;sourceSerial=0;playSerial=0;plays=new Set();pause=true;
 effects=new Map();resources=new Map();retired=new Set();outcomes=[];registered=0;released=0;lateReleased=0;lateFailed=0;failures=0;timedOut=0;
 current(scope){return !this.terminal&&scope.owner==='player'&&scope.lifetime===this.epoch&&!this.retired.has(scope.sessionId)&&((scope.sessionId===this.session&&this.sessionEpoch===this.epoch)||scope.sessionId===this.candidate?.session&&this.candidate.epoch===this.epoch)&&(scope.playId===undefined||this.plays.has(scope.playId));}
 retireEffects(){for(const [id,e]of this.effects)if(!this.current(e.scope)&&!(e.kind==='resource.release'&&this.retired.has(e.scope.sessionId))||this.terminal)this.complete(id,'retired');}
 complete(id,kind){if(this.effects.delete(id))this.outcomes.push([id,kind]);}
 send(input){
  const type=input.type;let accepted=true;
  if(type==='source.begin'){if(this.terminal||this.candidate||input.operationEpoch!==this.epoch)accepted=false;else this.candidate={id:++this.attempt,session:++this.sessionSerial,epoch:this.epoch,stage:0,preserve:input.preserve};}
  else if(stages.some(stage=>type==='source.'+stage)){const index=stages.indexOf(type.slice(7));if(!this.candidate||input.attempt!==this.candidate.id||this.candidate.epoch!==this.epoch||this.candidate.stage!==index)accepted=false;else this.candidate.stage++;}
  else if(type==='source.accept'){const c=this.candidate;if(!c||c.id!==input.attempt||c.epoch!==this.epoch||c.stage!==5||!input.planMatches)accepted=false;else{if(this.session!==null&&this.session!==c.session)this.retired.add(this.session);this.session=c.session;this.sessionEpoch=c.epoch;this.sourceSerial+=c.preserve?0:1;c.stage=6;this.pause=input.settings.pause;}}
  else if(type==='source.finished'){if(!this.candidate||input.attempt!==this.candidate.id||this.candidate.epoch!==this.epoch)accepted=false;else this.candidate=null;}
  else if(type==='source.clear'){if(this.session!==null)this.retired.add(this.session);if(this.candidate)this.retired.add(this.candidate.session);this.session=null;this.sessionEpoch=null;this.candidate=null;this.pause=true;}
  else if(type==='operation.retire'){this.epoch++;this.terminal||=input.terminal;if(this.session!==null)this.retired.add(this.session);if(this.candidate)this.retired.add(this.candidate.session);}
  else if(type==='play.request'){this.plays.add(++this.playSerial);}
  else if(type==='play.retire')this.plays.clear();
  else if(type==='play.settled')this.plays.delete(input.id);
  else if(type==='settings.change')this.pause=input.value.pause??this.pause;
  else if(type==='effect.event'){
   const e=input.input,work=this.effects.get(e.id);
   if(e.type==='admit')this.effects.set(e.effect.id,{...e.effect,phase:'queued'});
   else if(e.type==='start'){if(!work||work.phase!=='queued')accepted=false;else if(!this.current(work.scope)&&!(work.kind==='resource.release'&&this.retired.has(work.scope.sessionId)))this.complete(e.id,'retired');else work.phase='started';}
   else if(e.type==='physical-result'){if(!work||work.phase!=='started')accepted=false;else this.complete(e.id,!this.current(work.scope)?'retired':e.success?'completed':'failed');}
   else if(e.type==='retire'){if(work&&!this.current(work.scope)&&!(work.kind==='resource.release'&&this.retired.has(work.scope.sessionId)))this.complete(e.id,'retired');else accepted=false;}
   else if(e.type==='dispose'){accepted=!this.disposed;this.disposed=true;for(const id of this.effects.keys())this.complete(id,'retired');}
   else if(e.type==='schedule-failed'){if(work?.phase==='queued')this.complete(e.id,'failed');else accepted=false;}
   else throw Error('Unmodeled execution event '+e.type);
  }else if(type==='resource.event'){
   const e=input.input,r=this.resources.get(e.id);
   if(e.type==='register'||e.type==='reserve'){this.resources.set(e.id,{scope:Number(e.scopeKey.slice(6)),phase:e.type==='reserve'?'reserved':'active',owned:e.ownership!=='borrowed',acquired:e.type!=='reserve'});this.registered++;}
   else if(e.type==='acquire'){if(!r||r.acquired)accepted=false;else{r.acquired=true;if(r.phase==='reserved')r.phase='active';}}
   else if(e.type==='retire-scope')this.retired.add(Number(e.scopeKey.slice(6)));
   else if(e.type==='dispose'){for(const r of this.resources.values())this.retired.add(r.scope);}
   else if(e.type==='release'){if(!r)accepted=false;else if(['active','reserved'].includes(r.phase))r.phase='releasing';}
   else if(e.type==='deadline'){if(!r)accepted=false;else if(r.phase==='releasing'){r.phase='detached';this.failures++;this.timedOut+=e.reason==='timeout'?1:0;}}
   else if(e.type==='physical-result'){if(!r)accepted=false;else if(r.acquired&&['releasing','detached'].includes(r.phase)){if(r.phase==='detached'){if(e.success)this.lateReleased++;else this.lateFailed++;}else if(!e.success)this.failures++;if(e.success)this.released++;this.resources.delete(e.id);}}
   else throw Error('Unmodeled resource event '+e.type);
  }else throw Error('Unmodeled command '+type);
  if(type!=='effect.event')this.retireEffects();if(this.terminal)this.disposed=true;return accepted;
 }
 check(state){
  assert.deepEqual([state.operations.epoch,state.operations.terminal,state.source.acceptedSession,state.source.serial,state.settings.pause],[this.epoch,this.terminal,this.session,this.sourceSerial,this.pause],'contractual publication');
  assert.deepEqual([...state.playback.plays],[...this.plays],'live play intents');
  assert.deepEqual(sort(state.executor.pending.map(w=>[w.effect.id,w.phase])),sort([...this.effects].map(([id,w])=>[id,w.phase])),'execution obligations');
  assert.deepEqual(sort(state.resources.resources.map(r=>[r.id,r.state,r.acquired!==false])),sort([...this.resources].map(([id,r])=>[id,r.phase,r.acquired])),'resource obligations');
  assert.deepEqual([state.resources.registeredTotal,state.resources.releasedTotal,state.resources.lateReleased,state.resources.lateFailed,state.resources.failureCount,state.resources.timedOut],[this.registered,this.released,this.lateReleased,this.lateFailed,this.failures,this.timedOut],'cleanup accounting');
  assert.ok(state.executor.pending.length<=state.executor.limit);assert.ok(state.resources.resources.length<=state.resources.limits.maxResources);assert.ok(state.resources.failures.length<=state.resources.limits.failureLimit);
 }
}
export class ReplayViolation extends Error{constructor(cause,history){super(cause.message,{cause});this.name='ReplayViolation';this.history=structuredClone(history);}}
export function validateHistory(history){
 if(!Array.isArray(history)||history.length>512)throw Error('History exceeds finite replay bound');let opened=false,now=0,releasing=false;const issued=new Map();
 const fields={open:['type'],submit:['type','id','kind','lane','deadline'],complete:['type','id','success'],advance:['type','time'],cleanup:['type','success'],duplicate:['type','id']};
 for(const s of history){if(!s||typeof s!=='object')throw Error('Invalid action');if(Object.keys(s).some(key=>!(fields[s.type]??['type']).includes(key)))throw Error('Unsupported history payload');
  if(s.type==='open'){if(opened)throw Error('Duplicate open');opened=true;}
  else if(s.type==='submit'){if(!opened||!Number.isSafeInteger(s.id)||s.id<1||issued.has(s.id)||!['backend.play','backend.pause','timer.wait'].includes(s.kind)||!['immediate','scheduled'].includes(s.lane))throw Error('Invalid effect issuance');if(s.kind==='timer.wait'&&(!Number.isFinite(s.deadline??100)||(s.deadline??100)<0))throw Error('Invalid deadline');issued.set(s.id,{...s,started:s.lane==='immediate'});}
  else if(s.type==='flush'){for(const work of issued.values())if(!work.cancelled)work.started=true;}
  else if(s.type==='complete'){if(!issued.has(s.id)||!issued.get(s.id).started||issued.get(s.id).kind==='timer.wait'||typeof s.success!=='boolean')throw Error('Noncausal completion');}
  else if(s.type==='advance'){if(!Number.isFinite(s.time)||s.time<now)throw Error('Nonmonotonic time');now=s.time;}
  else if(['pause','clear','retire','destroy'].includes(s.type)){for(const work of issued.values())if(s.type!=='pause'||work.kind==='backend.play')work.cancelled=true;}
  else if(s.type==='release'){if(!opened)throw Error('Release before registration');releasing=true;}
  else if(s.type==='cleanup'){if(!releasing)throw Error('Cleanup before release');}
  else if(s.type==='duplicate'){if(!issued.has(s.id))throw Error('Result without effect issuance');}
  else if(!['probe-accept'].includes(s.type))throw Error('Unknown replay action');
 }
 return structuredClone(history);
}
export async function replayComposed(history,{mutation,recordInputs=false}={}){
 const actions=validateHistory(history),clock=new VirtualEffects(),model=new Contract(),calls=[],outcomes=[],physical=new Map(),cleanups=new Map(),deliveries=new Map(),coverage=new Set(),pairs=new Set(),effectKinds=new Set(),visited=[];let previous,checks=0,inputs=[],state=initialPlayerControl(),trace=createTrace(64),runtime,invoking,violation,lastDecision;
 function send(input){try{return dispatch(input);}catch(error){violation??=error;if(error.code==='ERR_ASSERTION'&&lastDecision)return lastDecision;throw error;}}
 function dispatch(input){if(recordInputs)inputs.push(JSON.parse(JSON.stringify(input)));const expected=model.send(input),before=state;let supplied=before;
  if(mutation==='premature-acceptance'&&input.type==='source.accept'&&before.source.candidate)supplied={...before,source:{...before.source,candidate:{...before.source.candidate,phase:'verifying'}}};
  let result=transitionPlayer(supplied,input);
  if(mutation==='dropped-pause'&&input.type==='play.retire')result={...result,state:before,executionOutcomes:[]};
  if(mutation==='skipped-release'&&input.type==='resource.event'&&input.input.type==='physical-result')result={...result,state:before};
  if(mutation==='missing-identity'&&input.type==='source.clear')result={...result,state:{...result.state,executor:before.executor},executionOutcomes:[]};
  lastDecision=result;state=result.state;const name=input.type+(input.input?':'+input.input.type:'')+':'+(result.accepted?'accepted':'ignored');coverage.add(name);if(previous)pairs.add(previous+' -> '+name);previous=name;if(input.type==='effect.event'&&input.input.effect)effectKinds.add(input.input.effect.kind);
  trace=tracePlayerTransition(trace,input,before,result,checks++);assert.equal(result.accepted,expected,'admission '+name);model.check(state);runtime?.deliverOutcomes(result.executionOutcomes??[]);if(input.type==='effect.event'&&input.input.type==='start')invoking=input.input.id;return result;
 }
 const resources=new ResourceRegistry({store:{read:()=>state.resources,dispatch:input=>send({type:'resource.event',input}).resource},scheduleCleanupTimeout:clock.scheduleDeadline});
 runtime=new EffectRuntime({resources,store:{read:()=>state.executor,dispatch:input=>send({type:'effect.event',input}).execution},scopeKey:s=>'scope:'+s.sessionId,isCurrent:s=>playerEffectAuthority(state,s),now:clock.now,schedule:clock.schedule,waitUntil:clock.waitUntil,onOutcome:o=>outcomes.push([o.id,o.kind])});
 function backendCall(kind){const id=invoking;if(physical.has(id))throw Error('Repeated physical invocation');const work=deferred();physical.set(id,work);calls.push([id,kind]);return work.promise;}
 async function open(){const attempt=send({type:'source.begin',operationEpoch:model.epoch,mode:'software',preserve:false,planId:'fixture'}).id;for(const phase of stages)send({type:'source.'+phase,attempt});send({type:'source.accept',attempt,operationEpoch:model.epoch,settings:state.settings,planMatches:true});send({type:'source.finished',attempt});const id=model.session;await resources.register({id:'resource:'+id,scopeKey:'scope:'+id,kind:'backend',ownership:'owned',value:{play:()=>backendCall('play'),pause:()=>backendCall('pause')},release(){calls.push(['resource:'+id,'release']);const work=deferred();cleanups.set(id,work);return work.promise;}});}
 try{for(const step of actions){visited.push(step);
  if(step.type==='open')await open();
  else if(step.type==='submit'){let playId;if(step.kind==='backend.play')playId=send({type:'play.request'}).id;const scope={owner:'player',lifetime:model.epoch,sourceId:model.sourceSerial,sessionId:model.session,operationId:0,...playId===undefined?{}:{playId}},effect={id:step.id,scope,kind:step.kind,lane:step.lane,...step.kind==='timer.wait'?{deadlineMs:step.deadline??100}:{resourceId:'resource:'+model.session}};deliveries.set(step.id,runtime.submit(effect));}
  else if(step.type==='complete'){const work=physical.get(step.id);if(!work)throw Error('Completion has no physical producer');step.success?work.resolve():work.reject(Error('fake backend failure'));}
  else if(step.type==='duplicate')send({type:'effect.event',input:{type:'physical-result',id:step.id,current:true,success:true}});
  else if(step.type==='pause'){send({type:'play.retire'});send({type:'settings.change',value:{pause:true}});}
  else if(step.type==='flush')clock.flush();
  else if(step.type==='advance')clock.advanceTo(step.time);
  else if(step.type==='clear')send({type:'source.clear'});
  else if(step.type==='retire'||step.type==='destroy')send({type:'operation.retire',terminal:step.type==='destroy'});
  else if(step.type==='release')void resources.release('resource:1').catch(()=>{});
  else if(step.type==='cleanup'){const work=cleanups.get(1);if(!work)throw Error('Cleanup has no physical producer');step.success===false?work.reject(Error('fake cleanup failure')):work.resolve();}
  else if(step.type==='probe-accept'){const attempt=send({type:'source.begin',operationEpoch:model.epoch,mode:'software',preserve:true,planId:'fixture'}).id;send({type:'source.accept',attempt,operationEpoch:model.epoch,settings:state.settings,planMatches:true});send({type:'source.finished',attempt});}
  await drain();if(violation)throw violation;model.check(state);assert.deepEqual(outcomes,model.outcomes,'ordered outcome delivery');
 }
 // Fairness closure is explicit: retire logical work, begin cleanup, complete
 // every started external call/cleanup, advance deadlines, then drain delivery.
 send({type:'play.retire'});send({type:'operation.retire',terminal:true});const disposal=resources.dispose();void disposal.catch(()=>{});await drain();for(const p of physical.values())p.resolve();for(const p of cleanups.values())p.resolve();await drain();clock.advanceTo(Math.max(clock.time,100000));await drain();await disposal.catch(()=>{});await drain();
 if(violation)throw violation;model.check(state);assert.deepEqual(outcomes,model.outcomes);assert.equal(runtime.pendingCount,0);assert.equal(state.resources.resources.length,0);assert.equal(clock.timers.size,0);assert.equal(clock.scheduled.length,0);assert.equal(resources.handles.size,0);assert.equal(resources.acquisitions.size,0);assert.equal(runtime.handles.size,0);assert.ok(trace.entries.length<=64);
 return{...recordInputs?{inputs}:{},checks,calls,outcomes,coverage:[...coverage].sort(),pairs:[...pairs].sort(),effectKinds:[...effectKinds].sort(),trace:selectTrace(trace),final:{epoch:state.operations.epoch,registered:model.registered,released:model.released,lateReleased:model.lateReleased,lateFailed:model.lateFailed}};
 }catch(error){throw new ReplayViolation(error,visited);}finally{try{runtime.dispose();}catch{}for(const p of physical.values())p.resolve();for(const p of cleanups.values())p.resolve();await drain();}
}
/** Linear extensions of a supplied finite causal DAG; no claims beyond its nodes. */
export function schedules(nodes){const output=[];function visit(prefix,used){if(prefix.length===nodes.length){output.push(prefix);return;}for(const n of nodes)if(!used.has(n.id)&&n.after.every(id=>used.has(id)))visit([...prefix,n.action],new Set([...used,n.id]));}visit([],new Set());return output;}
/** Deletion-minimal over causally valid histories, when budget is not exhausted. */
export async function shrinkComposed(history,fails,{maxTrials=256}={}){let current=validateHistory(history),trials=0,changed=true;if(!await fails(current))throw Error('History does not fail');while(changed&&trials<maxTrials){changed=false;for(let i=0;i<current.length&&trials<maxTrials;i++){const candidate=current.filter((_,index)=>index!==i);try{validateHistory(candidate);}catch{continue;}trials++;if(await fails(candidate)){current=candidate;changed=true;break;}}}return{history:current,trials,oneMinimal:!changed&&trials<maxTrials,budgetExhausted:trials>=maxTrials};}
