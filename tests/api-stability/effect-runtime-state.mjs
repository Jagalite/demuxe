// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEffectRuntimeState,effectRuntimeWork,transitionEffectRuntime} from '../../web/generated/internal/machine/effect-runtime.js';
const effect=(id=1,kind='backend.play')=>({id,kind,lane:'immediate',resourceId:'backend',scope:{owner:'player',lifetime:1,sourceId:2,sessionId:3,operationId:4}});
const step=(state,input)=>transitionEffectRuntime(state,input).state;
const admitted=()=>step(createEffectRuntimeState(),{type:'admit',effect:effect()});
const started=()=>step(admitted(),{type:'start',id:1,current:true,retiredCleanup:false});

test('effect admissions copy only protocol fields and keep caller graphs mutable',()=>{
  const initial=createEffectRuntimeState(),input=effect();input.extra={secret:true};input.scope.extra='private';
  const next=step(initial,{type:'admit',effect:input});input.scope.owner='changed';input.resourceId='wrong';
  assert.deepEqual(effectRuntimeWork(next,1).effect,effect());assert.equal(initial.pending.length,0);
  assert.equal(Object.isFrozen(input),false);assert.equal(Object.isFrozen(input.scope),false);
  for(const value of [next,next.pending,next.pending[0],next.pending[0].effect,next.pending[0].effect.scope])assert.ok(Object.isFrozen(value));
});

test('queue capacity consumes IDs while invalid or repeated IDs never alter state',()=>{
  let state=step(createEffectRuntimeState(1),{type:'admit',effect:effect(1)});
  const full=transitionEffectRuntime(state,{type:'admit',effect:effect(2)});assert.equal(full.reason,'capacity');assert.equal(full.state.highWatermark,2);assert.equal(full.state.pending.length,1);state=full.state;
  for(const id of [0,1,2,NaN,Infinity,1.5]){const no=transitionEffectRuntime(state,{type:'admit',effect:effect(id)});assert.equal(no.reason,'identity');assert.equal(no.state,state);}
  state=step(state,{type:'retire',id:1,current:false,retiredCleanup:false});assert.equal(step(state,{type:'admit',effect:effect(3)}).pending.length,1);
});

test('execution starts exactly once and stale work retires without executing',()=>{
  const initial=admitted(),start=transitionEffectRuntime(initial,{type:'start',id:1,current:true,retiredCleanup:false});
  assert.equal(start.execute.kind,'backend.play');assert.equal(start.state.pending[0].phase,'started');assert.equal(initial.pending[0].phase,'queued');
  const duplicate=transitionEffectRuntime(start.state,{type:'start',id:1,current:true,retiredCleanup:false});assert.equal(duplicate.state,start.state);assert.equal(duplicate.execute,undefined);
  const stale=transitionEffectRuntime(initial,{type:'start',id:1,current:false,retiredCleanup:false});assert.equal(stale.execute,undefined);assert.equal(stale.state.pending.length,0);assert.equal(stale.outcomes[0].kind,'retired');
});

test('only a retired resource lifetime permits obsolete cleanup execution',()=>{
  let state=step(createEffectRuntimeState(),{type:'admit',effect:effect(1,'resource.release')});
  const held=transitionEffectRuntime(state,{type:'retire',id:1,current:false,retiredCleanup:true});assert.equal(held.state,state);
  const start=transitionEffectRuntime(state,{type:'start',id:1,current:false,retiredCleanup:true});assert.equal(start.execute.kind,'resource.release');
  const finished=transitionEffectRuntime(start.state,{type:'physical-result',id:1,success:true,current:false});assert.equal(finished.outcomes[0].kind,'retired');
});

for(const current of [true,false])for(const success of [true,false])test(`physical outcome current=${current} success=${success}`,()=>{
  const initial=started(),decision=transitionEffectRuntime(initial,{type:'physical-result',id:1,current,success});
  assert.equal(decision.outcomes[0].kind,!current?'retired':success?'completed':'failed');assert.equal(decision.state.pending.length,0);
  assert.ok(Object.isFrozen(decision.outcomes));assert.ok(Object.isFrozen(decision.outcomes[0]));
  for(const input of [{type:'physical-result',id:1,current:true,success:true},{type:'start',id:1,current:true,retiredCleanup:false},{type:'schedule-failed',id:1}]){
    const duplicate=transitionEffectRuntime(decision.state,input);assert.equal(duplicate.state,decision.state);assert.equal(duplicate.outcomes.length,0);
  }
});

test('physical outcomes cannot complete queued work and scheduling errors cannot replace started work',()=>{
  const queued=admitted();assert.equal(transitionEffectRuntime(queued,{type:'physical-result',id:1,current:true,success:true}).state,queued);
  const failed=transitionEffectRuntime(queued,{type:'schedule-failed',id:1});assert.equal(failed.outcomes[0].kind,'failed');assert.equal(failed.outcomes[0].error.message,'Effect scheduling failed');
  const active=started();assert.equal(transitionEffectRuntime(active,{type:'schedule-failed',id:1}).state,active);
});

test('disposal retires the entire batch atomically and prevents readmission',()=>{
  let state=admitted();state=step(state,{type:'admit',effect:effect(2)});
  const disposed=transitionEffectRuntime(state,{type:'dispose'});assert.equal(disposed.state.disposed,true);assert.equal(disposed.state.pending.length,0);
  assert.deepEqual(disposed.outcomes.map(value=>[value.id,value.kind]),[[1,'retired'],[2,'retired']]);
  assert.equal(transitionEffectRuntime(disposed.state,{type:'dispose'}).state,disposed.state);
  const rejected=transitionEffectRuntime(disposed.state,{type:'admit',effect:effect(3)});assert.equal(rejected.reason,'disposed');assert.equal(rejected.state.highWatermark,3);assert.equal(rejected.state.pending.length,0);
});

function permutations(values){return values.length?values.flatMap((value,i)=>permutations(values.filter((_,j)=>i!==j)).map(tail=>[value,...tail])):[[]];}
for(const order of permutations(['start','complete','retire','dispose']))test(`logical lifecycle history ${order.join(' -> ')}`,()=>{
  let state=admitted(),outcomes=[],executions=0;
  for(const name of order){
    const input={start:{type:'start',id:1,current:true,retiredCleanup:false},complete:{type:'physical-result',id:1,current:true,success:true},retire:{type:'retire',id:1,current:false,retiredCleanup:false},dispose:{type:'dispose'}}[name];
    const result=transitionEffectRuntime(state,input);state=result.state;outcomes.push(...result.outcomes);if(result.execute)executions++;
    assert.ok(executions<=1);assert.ok(outcomes.length<=1);assert.ok(state.pending.length<=1);
    if(outcomes.length)assert.equal(state.pending.length,0);
  }
  assert.equal(outcomes.length,1);assert.equal(state.disposed,true);assert.equal(state.pending.length,0);
  const completesBeforeRetirement=order.indexOf('start')<order.indexOf('complete')&&order.indexOf('complete')<Math.min(order.indexOf('retire'),order.indexOf('dispose'));
  assert.equal(outcomes[0].kind,completesBeforeRetirement?'completed':'retired');
});

test('retired cleanup evidence never exempts play or pause from scope retirement',()=>{
  for(const kind of ['backend.play','backend.pause','timer.wait']){
    const input=kind==='timer.wait'?{...effect(1,kind),deadlineMs:10}:effect(1,kind);
    const state=step(createEffectRuntimeState(),{type:'admit',effect:input});
    for(const type of ['start','retire']){
      const result=transitionEffectRuntime(state,{type,id:1,current:false,retiredCleanup:true});
      assert.equal(result.execute,undefined);assert.equal(result.outcomes[0].kind,'retired');assert.equal(result.state.pending.length,0);
    }
  }
});
