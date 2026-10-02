// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EffectRuntime} from '../../web/generated/internal/effects/runtime.js';
import {ResourceRegistry} from '../../web/generated/internal/effects/resources.js';
import {sameEffectScope,resourceScopeKey} from '../../web/generated/internal/machine/protocol.js';
import {VirtualEffects,deferred,settle} from './virtual-effects.mjs';
const scope=()=>({owner:'player-1',lifetime:1,sourceId:1,sessionId:1,operationId:1});
function fixture(t,extra={}){
  const clock=new VirtualEffects(),resources=new ResourceRegistry(),outcomes=[],calls=[];
  let current=scope();
  const runtime=new EffectRuntime({resources,isCurrent:value=>sameEffectScope(value,current),now:clock.now,schedule:clock.schedule,waitUntil:clock.waitUntil,onOutcome:event=>outcomes.push(event),...extra});
  const backend={play(){calls.push('play');},pause(){calls.push('pause');}};
  resources.register({id:'backend',scopeKey:resourceScopeKey(current),kind:'backend',value:backend,ownership:'owned',release:()=>calls.push('release')});
  t.after(async()=>{runtime.dispose();await resources.dispose();});
  return {clock,resources,runtime,outcomes,calls,backend,get current(){return current;},replace(patch){current={...current,...patch};runtime.retireStale();},effect(id,kind='backend.play',lane='immediate'){return {id,kind,lane,scope:{...current},resourceId:'backend'};}};
}
test('immediate effects invoke in the submit stack; scheduled effects wait',async t=>{
  const f=fixture(t),immediate=f.runtime.submit(f.effect(1));assert.deepEqual(f.calls,['play']);
  const queued=f.runtime.submit(f.effect(2,'backend.pause','scheduled'));assert.deepEqual(f.calls,['play']);
  f.clock.flush();assert.deepEqual(f.calls,['play','pause']);
  assert.equal((await immediate).kind,'completed');assert.equal((await queued).kind,'completed');
  assert.equal(f.runtime.pendingCount,0);
});
test('scheduler callback replay does not repeat a physical effect',async t=>{
  let callback;const f=fixture(t,{schedule(work){callback=work;return()=>{};}}),work=deferred();
  f.backend.play=()=>{f.calls.push('play');return work.promise;};
  const result=f.runtime.submit(f.effect(1,'backend.play','scheduled'));callback();callback();
  assert.deepEqual(f.calls,['play']);work.resolve();assert.equal((await result).kind,'completed');callback();assert.deepEqual(f.calls,['play']);
});
test('cleanup can release its retired session without touching the replacement',async t=>{
  const f=fixture(t),cleanup=f.effect(1,'resource.release','scheduled');
  f.replace({sessionId:2});await f.resources.retireScope(resourceScopeKey(cleanup.scope));const result=f.runtime.submit(cleanup);f.runtime.retireStale();f.clock.flush();
  assert.equal((await result).kind,'retired');assert.deepEqual(f.calls,['release']);
});
test('obsolete operation cleanup cannot release the still-current backend',async t=>{
  const f=fixture(t),result=f.runtime.submit(f.effect(1,'resource.release','scheduled'));
  f.replace({operationId:2});f.clock.flush();assert.equal((await result).kind,'retired');assert.deepEqual(f.calls,[]);
  assert.equal(f.resources.get('backend'),f.backend);
});
test('a scheduler throw after starting work does not replace its outcome',async t=>{
  const errors=[],f=fixture(t,{schedule(start){start();throw Error('scheduler after start');},onObserverError:error=>errors.push(error)}),work=deferred();
  f.backend.play=()=>work.promise;const result=f.runtime.submit(f.effect(1,'backend.play','scheduled'));
  assert.equal(f.runtime.pendingCount,1);assert.equal(f.outcomes.length,0);assert.equal(errors.length,1);
  work.resolve();assert.equal((await result).kind,'completed');
});
test('queued effects copy input and scope without freezing caller objects',async t=>{
  const f=fixture(t),input=f.effect(1,'backend.play','scheduled'),result=f.runtime.submit(input);
  input.resourceId='missing';input.scope.owner='wrong';assert.equal(Object.isFrozen(input),false);
  f.clock.flush();assert.equal((await result).kind,'completed');assert.deepEqual(f.calls,['play']);
});
test('retirement settles ignored aborts and suppresses late completion',async t=>{
  const f=fixture(t),work=deferred();f.backend.play=()=>work.promise;
  const result=f.runtime.submit(f.effect(1));f.replace({sessionId:2});
  assert.equal((await result).kind,'retired');assert.equal(f.runtime.pendingCount,0);
  work.resolve();await settle();assert.equal(f.outcomes.length,1);
  const pending=f.runtime.submit({...f.effect(2),resourceId:'missing'});assert.equal((await pending).kind,'failed');
});
test('retired scheduled work never invokes its backend',async t=>{
  const f=fixture(t),result=f.runtime.submit(f.effect(1,'backend.play','scheduled'));f.replace({sourceId:2});
  assert.equal(f.clock.scheduled.length,0);f.clock.flush();assert.equal((await result).kind,'retired');assert.deepEqual(f.calls,[]);
});
test('a current scope cannot execute or release another session resource',async t=>{
  const f=fixture(t);f.replace({sessionId:2});
  for(const [id,kind]of [[1,'backend.play'],[2,'resource.release']])assert.equal((await f.runtime.submit(f.effect(id,kind))).kind,'failed');
  assert.deepEqual(f.calls,[]);
});
test('virtual deadlines complete deterministically and retirement removes timers',async t=>{
  const f=fixture(t),first=f.runtime.submit({...f.effect(1,'timer.wait'),deadlineMs:20});
  f.clock.advanceTo(19);await settle();assert.equal(f.outcomes.length,0);
  f.clock.advanceTo(20);assert.equal((await first).kind,'completed');
  const second=f.runtime.submit({...f.effect(2,'timer.wait'),deadlineMs:30});f.runtime.dispose();
  assert.equal((await second).kind,'retired');assert.equal(f.clock.timers.size,0);
  f.clock.advanceTo(100);await settle();assert.equal(f.outcomes.length,2);
});
test('synchronous failures are normalized without leaking backend messages',async t=>{
  const f=fixture(t);f.backend.play=()=>{throw Error('secret remote authorization string');};
  const outcome=await f.runtime.submit(f.effect(1));assert.equal(outcome.kind,'failed');
  assert.equal(JSON.stringify(outcome).includes('secret'),false);
});
for(const retired of [false,true])test(`deferred rejection ${retired?'after retirement':'while current'} settles once`,async t=>{
  const f=fixture(t),work=deferred();f.backend.play=()=>work.promise;
  const result=f.runtime.submit(f.effect(1));if(retired)f.replace({sessionId:2});
  work.reject(Error('secret backend failure'));const outcome=await result;await settle();
  assert.equal(outcome.kind,retired?'retired':'failed');assert.equal(f.outcomes.length,1);
  assert.equal(f.runtime.pendingCount,0);assert.equal(JSON.stringify(outcome).includes('secret'),false);
});
test('scheduler rejection before invocation settles without calling the backend',async t=>{
  const f=fixture(t,{schedule(){throw Error('scheduler unavailable');}});
  assert.equal((await f.runtime.submit(f.effect(1,'backend.play','scheduled'))).kind,'failed');
  assert.deepEqual(f.calls,[]);assert.equal(f.outcomes.length,1);assert.equal(f.runtime.pendingCount,0);
});
test('duplicate delivery cannot execute an effect twice and capacity is bounded',async t=>{
  const f=fixture(t,{maxPending:1}),work=deferred();f.backend.play=()=>work.promise;
  const first=f.runtime.submit(f.effect(1));assert.throws(()=>f.runtime.submit(f.effect(1)),/increase/);
  assert.throws(()=>f.runtime.submit(f.effect(2)),/full/);work.resolve();await first;
  assert.throws(()=>f.runtime.submit(f.effect(2)),/increase/);assert.equal((await f.runtime.submit(f.effect(3))).kind,'completed');
});
test('throwing outcome observers cannot strand effect promises',async t=>{
  const f=fixture(t,{onOutcome(){throw Error('observer');},onObserverError(){throw Error('reporter');}});
  assert.equal((await f.runtime.submit(f.effect(1))).kind,'completed');assert.equal(f.runtime.pendingCount,0);
});
test('outcome observers may synchronously submit subsequent effects',async t=>{
  let f,next;f=fixture(t,{onOutcome(event){if(event.id===1)next=f.runtime.submit(f.effect(2,'backend.pause'));}});
  await f.runtime.submit(f.effect(1));assert.equal((await next).kind,'completed');assert.deepEqual(f.calls,['play','pause']);
});
test('reentrant current-scope sampling cannot start work after disposal',async t=>{
  let f;f=fixture(t,{isCurrent(){f.runtime.dispose();return true;}});
  const result=f.runtime.submit(f.effect(1));assert.equal((await result).kind,'retired');
  assert.deepEqual(f.calls,[]);assert.equal(f.outcomes.length,1);assert.equal(f.runtime.pendingCount,0);
});
test('disposal commits the entire pending batch before the first observer reenters',async t=>{
  let f;const counts=[];f=fixture(t,{onOutcome(){counts.push(f.runtime.pendingCount);f.runtime.retireStale();f.runtime.dispose();}});
  const one=f.runtime.submit(f.effect(1,'backend.play','scheduled')),two=f.runtime.submit(f.effect(2,'backend.pause','scheduled'));
  f.runtime.dispose();assert.deepEqual(counts,[0,0]);assert.deepEqual((await Promise.all([one,two])).map(value=>value.kind),['retired','retired']);
  f.clock.flush();assert.deepEqual(f.calls,[]);assert.equal(f.clock.scheduled.length,0);
});
// Exercise every causal ordering of two completions and source retirement.
function permutations(values){return values.length?values.flatMap((value,i)=>permutations(values.filter((_,j)=>i!==j)).map(tail=>[value,...tail])):[[]];}
for(const order of permutations(['play','pause','retire']))test(`completion schedule ${order.join(' -> ')}`,async t=>{
  const f=fixture(t),play=deferred(),pause=deferred();f.backend.play=()=>play.promise;f.backend.pause=()=>pause.promise;
  const one=f.runtime.submit(f.effect(1)),two=f.runtime.submit(f.effect(2,'backend.pause'));let retired=false;
  const expected=new Map();
  for(const action of order){
    if(action==='retire'){retired=true;f.replace({lifetime:2});for(const id of [1,2])if(!expected.has(id))expected.set(id,'retired');}
    else{const id=action==='play'?1:2;({play,pause})[action].resolve();if(!retired)expected.set(id,'completed');}
    await settle();
    assert.equal(new Set(f.outcomes.map(event=>event.id)).size,f.outcomes.length,'Duplicate outcome');
    for(const event of f.outcomes)assert.equal(event.kind,expected.get(event.id));
  }
  assert.equal((await one).kind,expected.get(1));assert.equal((await two).kind,expected.get(2));assert.equal(f.runtime.pendingCount,0);
});
