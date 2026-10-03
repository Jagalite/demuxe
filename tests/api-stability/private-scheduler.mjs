// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/private-scheduler.js';
import {CoopScheduler} from '../../web/private-mpv/scheduler.js';

const attached=(slots,max)=>core.finishCoopAttachment(core.beginCoopAttachment(core.initialCoopState(slots,max)).state).state;
function model(slots=3,max=8){let state=attached(slots,max);const send=(fn,...args)=>{const old=state,copy=structuredClone(state),next=fn(state,...args);assert.deepEqual(old,copy);state=next.state??next;if(fn===core.startCoopTask&&next.id!==null)send(core.transitionCoopContinuation,{id:next.id,type:next.fresh?'begin':'resume'});if(fn===core.parkCoopTask&&next.wait)send(core.transitionCoopContinuation,{id:next.wait.task,type:'park'});return next;};return{get state(){return state;},send};}
test('task admission bounds physical slots separately from retained completed join records',()=>{
 const m=model(2,2),a=m.send(core.createCoopTask,false).task,b=m.send(core.createCoopTask,false).task;assert.equal(a.slot,1);assert.equal(b.slot,0);assert.equal(m.send(core.createCoopTask,true).task,null);
 m.send(core.startCoopTask);m.send(core.completeCoopTask,a.id);assert.equal(m.state.free.length,1);assert.equal(m.state.tasks.length,2);assert.equal(m.send(core.createCoopTask,true).task,null);
 m.send(core.detachCoopTask,a.id);assert.equal(m.send(core.createCoopTask,true).task.slot,1);
});
test('one active logical owner survives park until physical suspension releases the stack',()=>{
 const m=model(),a=m.send(core.createCoopTask,true).task,b=m.send(core.createCoopTask,true).task;m.send(core.startCoopTask);const waiter=m.send(core.parkCoopTask).wait;
 assert.equal(m.state.active,a.id);assert.equal(m.send(core.startCoopTask).id,null);assert.equal(m.send(core.releaseCoopTask,b.id).accepted,false);m.send(core.releaseCoopTask,a.id);assert.equal(m.send(core.startCoopTask).id,b.id);
 assert.equal(m.send(core.settleCoopWait,waiter.id).accepted,true);assert.equal(m.send(core.settleCoopWait,waiter.id).accepted,false);assert.equal(m.state.ready.filter(id=>id===a.id).length,1);
});
test('condition wake ordering and explicit deadlines cannot duplicate a ready continuation',()=>{
 const m=model(),tasks=[];for(let i=0;i<3;i++)tasks.push(m.send(core.createCoopTask,true).task);const waits=[];
 for(const task of tasks){m.send(core.startCoopTask);const wait=m.send(core.parkCoopTask).wait;waits.push(wait.id);m.send(core.bindCoopWait,wait.id,{key:7,deadline:100});m.send(core.releaseCoopTask,task.id);}
 assert.deepEqual(core.coopConditionWaits(m.state,7,false),[waits[0]]);assert.deepEqual(core.coopConditionWaits(m.state,7,true),waits);
 assert.equal(m.send(core.settleCoopWait,waits[0],'timeout',99).remaining,1);assert.equal(m.send(core.settleCoopWait,waits[0],'signal').accepted,true);assert.equal(m.send(core.settleCoopWait,waits[0],'timeout',100).accepted,false);
 assert.equal(m.send(core.settleCoopWait,waits[1],'timeout',100).accepted,true);assert.equal(m.state.stats.signals,1);assert.equal(m.state.stats.timerWakes,1);
});
test('join owns one completion and atomically retires the target when its waiter becomes ready',()=>{
 const m=model(),parent=m.send(core.createCoopTask,true).task,child=m.send(core.createCoopTask,false).task;m.send(core.startCoopTask);
 assert.equal(m.send(core.prepareCoopJoin,parent.id).code,1);assert.equal(m.send(core.prepareCoopJoin,child.id).wait,true);assert.equal(m.send(core.prepareCoopJoin,child.id).code,1);const wait=m.send(core.parkCoopTask).wait;m.send(core.bindCoopWait,wait.id,{join:child.id});assert.equal(m.send(core.settleCoopWait,wait.id).accepted,false);assert.ok(core.coopTask(m.state,child.id));m.send(core.releaseCoopTask,parent.id);m.send(core.startCoopTask);
 const completion=m.send(core.completeCoopTask,child.id);assert.deepEqual(completion.wake,[wait.id]);assert.deepEqual(completion.remove,[child.id]);assert.equal(core.coopTask(m.state,child.id),undefined);assert.equal(core.coopTask(m.state,parent.id).status,'ready');assert.equal(m.state.waits.length,0);
});
test('detach and join reject incompatible ownership without mutating state',()=>{
 const m=model(),child=m.send(core.createCoopTask,false).task;m.send(core.startCoopTask);assert.equal(m.send(core.prepareCoopJoin,child.id).code,2);assert.equal(m.send(core.detachCoopTask,child.id).code,0);assert.equal(m.send(core.prepareCoopJoin,child.id).code,1);assert.equal(m.send(core.detachCoopTask,child.id).code,1);
 const done=m.send(core.completeCoopTask,child.id);assert.deepEqual(done.remove,[child.id]);assert.equal(m.state.tasks.length,0);assert.equal(m.state.free.length,3);
});
test('retirement keeps cumulative evidence but abandons all runnable and waiting authority',()=>{
 const m=model(),a=m.send(core.createCoopTask,true).task;m.send(core.createCoopTask,false);m.send(core.startCoopTask);m.send(core.parkCoopTask);m.send(core.releaseCoopTask,a.id);m.send(core.scheduleCoopPump);m.send(core.closeCoopState);
 assert.equal(m.state.stats.abandoned,2);assert.equal(m.state.pendingPump,false);assert.deepEqual(m.state.tasks,[]);assert.deepEqual(m.state.free,[]);assert.equal(m.send(core.createCoopTask,true).task,null);assert.equal(m.send(core.startCoopTask).id,null);assert.equal(m.send(core.scheduleCoopPump).send,false);assert.equal(m.send(core.settleCoopWait,1).accepted,false);
});
test('long deterministic create park wake complete histories preserve exact slot accounting',()=>{
 const m=model(4,16);for(let cycle=0;cycle<100;cycle++){const ids=[];for(let i=0;i<4;i++)ids.push(m.send(core.createCoopTask,true).task.id);for(const id of ids){assert.equal(m.send(core.startCoopTask).id,id);const wait=m.send(core.parkCoopTask).wait;m.send(core.releaseCoopTask,id);m.send(core.settleCoopWait,wait.id);}for(const id of ids){assert.equal(m.send(core.startCoopTask).id,id);m.send(core.completeCoopTask,id);}assert.equal(new Set(m.state.free).size,4);assert.equal(m.state.tasks.length,0);assert.equal(m.state.waits.length,0);}
 assert.equal(m.state.stats.created,400);assert.equal(m.state.stats.completed,400);assert.equal(m.state.stats.suspensions,400);assert.equal(m.state.stats.resumes,400);
});

function fixture(t,{functions={},contextHooks=null,slots=3,attach=true}={}){
 const events=[],timers=new Set();let now=0,setHook,clearHook,postHook;const saved=new Map();const install=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
 install('performance',{now:()=>now});install('setTimeout',(callback,delay)=>{setHook?.();const timer={callback,delay};timers.add(timer);return timer;});install('clearTimeout',timer=>{clearHook?.();timers.delete(timer);});
 install('MessageChannel',class{port1={onmessage:null,close(){}};port2={postMessage:()=>{postHook?.();events.push(0);},close(){}};});
 const scheduler=new CoopScheduler({slots,maxRetainedTasks:16,backend:'asyncify',contextHooks}),memory=new WebAssembly.Memory({initial:1}),parked=Symbol('parked');let sp=8192;
 scheduler.continuations={attach(){},snapshot(){return{kind:'test-double'};},begin(task){assert.equal(scheduler.continuation({type:'begin',id:task.id}),true);const value=task.fn(...task.args);if(value!==parked)scheduler.finish(task,null,value);},park(task){for(const input of [{type:'park'},{type:'site',site:'test-double'},{type:'unwound'}])assert.equal(scheduler.continuation({...input,id:task.id}),true);scheduler.releaseSuspended(task);return parked;},resume(task,value){for(const input of [{type:'resume'},{type:'rewind-import',site:'test-double'},{type:'rewound'}])assert.equal(scheduler.continuation({...input,id:task.id}),true);scheduler.finish(task,null,value);}};
 const exports={memory,demuxe_coop_invoke:()=>{},demuxe_coop_get_sp:()=>sp,demuxe_coop_set_sp:value=>{sp=value;},demuxe_coop_stack_base:index=>256+index*512,demuxe_coop_stack_top:index=>768+index*512,demuxe_coop_stack_count:()=>slots,...functions};if(attach)scheduler.attach(exports);
 t.after(()=>{clearHook=undefined;scheduler.close();for(const[key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
 return{scheduler,exports,events,timers,memory,get sp(){return sp;},get now(){return now;},set now(value){now=value;},set setHook(value){setHook=value;},set clearHook(value){clearHook=value;},set postHook(value){postHook=value;},tick(){assert.ok(events.length,'pending channel turn');events.shift();scheduler.channel.port1.onmessage();},fire(){const timer=[...timers][0];assert.ok(timer);timers.delete(timer);timer.callback();}};
}

test('actual adapter restores host stack and prevents recursive pump inside idle hook',async t=>{
 const order=[];let f,reentered=false;const first=()=>{order.push('first');return 1;},second=()=>{order.push('second');return 2;};
 f=fixture(t,{functions:{first,second},contextHooks:{enter(){},leave(){},idle(){order.push('idle-start');if(!reentered){reentered=true;f.scheduler.pump();}order.push('idle-end');}}});
 const a=f.scheduler.run(first),b=f.scheduler.run(second);f.tick();assert.deepEqual(order,['first','idle-start','idle-end']);assert.equal(f.sp,8192);f.tick();assert.deepEqual(await Promise.all([a,b]),[1,2]);assert.equal(f.scheduler.snapshot().freeSlots,3);
});
test('actual adapter commits retirement before stop callbacks and rejects each pending root once',async t=>{
 let f;const wait=()=>f.scheduler.wait(1,-1);f=fixture(t,{functions:{wait}});const failure=Error('closed'),a=f.scheduler.run(wait),b=f.scheduler.run(wait);f.tick();f.tick();let observed;
 f.scheduler.onStop(()=>{observed=f.scheduler.snapshot();assert.equal(f.scheduler.active,null);});f.scheduler.close(failure);await assert.rejects(a,error=>error===failure);await assert.rejects(b,error=>error===failure);assert.equal(observed.stopped,true);assert.equal(observed.liveTasks,0);assert.equal(observed.abandoned,2);assert.equal(f.scheduler.snapshot().freeSlots,0);
});
test('actual condition timeout rearms once and stale timer callback cannot replace newer registration',async t=>{
 let f;const wait=()=>f.scheduler.wait(9,100);f=fixture(t,{functions:{wait}});const work=f.scheduler.run(wait);f.tick();const old=[...f.timers][0];f.now=10;f.fire();const next=[...f.timers][0];old.callback();assert.equal(f.timers.size,1);assert.equal([...f.timers][0],next);f.now=100;f.fire();f.tick();assert.equal(await work,1);assert.equal(f.scheduler.snapshot().timerWakes,1);assert.equal(f.scheduler.snapshot().timers,0);
});
test('actual signal cleanup failure closes the scheduler and settles pending root',async t=>{
 let f;const wait=()=>f.scheduler.wait(9,100);f=fixture(t,{functions:{wait}});const failure=Error('timer cleanup failed'),work=f.scheduler.run(wait);f.tick();f.clearHook=()=>{throw failure;};f.scheduler.wake(9,false);await assert.rejects(work,error=>error===failure);assert.equal(f.scheduler.stopped,true);assert.equal(f.scheduler.snapshot().retainedTasks,0);assert.equal(f.scheduler.snapshot().timers,1);f.clearHook=undefined;
});
test('actual timer rearm failure closes scheduler rather than orphaning a native task',async t=>{
 let f;const wait=()=>f.scheduler.wait(9,100);f=fixture(t,{functions:{wait}});const failure=Error('timer acquisition failed');let count=0;f.setHook=()=>{if(count++)throw failure;};const work=f.scheduler.run(wait);f.tick();f.now=1;f.fire();await assert.rejects(work,error=>error===failure);assert.equal(f.scheduler.stopped,true);assert.equal(f.scheduler.snapshot().timers,0);
});
test('actual channel scheduling failure rejects created task with original error',async t=>{
 const value=()=>7,f=fixture(t,{functions:{value}}),failure=Error('channel closed');f.postHook=()=>{throw failure;};await assert.rejects(f.scheduler.run(value),error=>error===failure);assert.equal(f.scheduler.stopped,true);assert.equal(f.scheduler.snapshot().retainedTasks,0);
});
test('actual resume action throws before native continuation and closes its owner',async t=>{
 let f,waiter;const wait=()=>f.scheduler.park(value=>{waiter=value;});f=fixture(t,{functions:{wait}});const failure=Error('copy failed'),work=f.scheduler.run(wait);f.tick();waiter.task.resumeAction=()=>{throw failure;};f.scheduler.readyWait(waiter,0);f.tick();await assert.rejects(work,error=>error===failure);assert.equal(f.scheduler.snapshot().abandoned,1);
});
test('memory observation reentry uses freshly admitted stack slots and cannot alias nested task',async t=>{
 const value=()=>7,f=fixture(t,{functions:{value}});let entered=false,nested;Object.defineProperty(f.exports,'memory',{get(){if(!entered){entered=true;nested=f.scheduler.run(value);}return f.memory;}});
 const outer=f.scheduler.run(value);assert.equal(new Set(f.scheduler.machine.tasks.map(task=>task.slot)).size,2);f.tick();f.tick();assert.deepEqual(await Promise.all([nested,outer]),[7,7]);assert.equal(f.scheduler.snapshot().completed,2);
});

test('six seeded scheduler histories replay and preserve independent slot, queue and waiter invariants',()=>{
 for(const seed of [1,7,31,24301,65537,0x5eed]){
  let random=seed,state=attached(4,12);const history=[],next=()=>random=(Math.imul(random,1664525)+1013904223)>>>0;
  const send=(fn,...args)=>{const before=structuredClone(state),old=state,result=fn(state,...args);assert.deepEqual(old,before);state=result.state??result;history.push([fn,args]);if(fn===core.startCoopTask&&result.id!==null)send(core.transitionCoopContinuation,{id:result.id,type:result.fresh?'begin':'resume'});if(fn===core.parkCoopTask&&result.wait)send(core.transitionCoopContinuation,{id:result.wait.task,type:'park'});return result;};
  const verify=()=>{
   const live=state.tasks.filter(task=>task.status!=='done'),owned=live.map(task=>task.slot),ready=new Set(state.ready),waitTasks=state.waits.map(wait=>wait.task);
   assert.equal(new Set([...state.free,...owned]).size,4);assert.equal(state.free.length+owned.length,4);assert.equal(ready.size,state.ready.length);assert.ok(state.tasks.length<=12);assert.ok(live.length<=4);
   for(const id of state.ready)assert.ok(['new','ready'].includes(core.coopTask(state,id)?.status));
   for(const task of state.tasks)assert.equal(task.status==='done',task.slot===null);
   assert.equal(new Set(waitTasks).size,waitTasks.length);assert.deepEqual([...waitTasks].sort(),state.tasks.filter(task=>task.status==='waiting').map(task=>task.id).sort());
   if(state.active!==null)assert.ok(['running','waiting','ready'].includes(core.coopTask(state,state.active)?.status));
   for(const wait of state.waits)if(wait.join!==null){const target=core.coopTask(state,wait.join);assert.ok(target?.joined);assert.equal(target.detached,false);assert.equal(target.root,false);}
  };
  for(let tick=0;tick<500;tick++){
   const action=next()%9,active=state.active===null?null:core.coopTask(state,state.active);
   if(action===0)send(core.createCoopTask,!!(next()%2));
   else if(action===1)send(core.startCoopTask);
   else if(action===2&&active?.status==='running'){const wait=send(core.parkCoopTask).wait;send(core.bindCoopWait,wait.id,{key:next()%3,deadline:tick+5});}
   else if(action===3&&active&&['waiting','ready'].includes(active.status))send(core.releaseCoopTask,active.id);
   else if(action===4&&state.waits.length){const wait=state.waits[next()%state.waits.length];send(core.settleCoopWait,wait.id,'ready');}
   else if(action===5&&active?.status==='running')send(core.completeCoopTask,active.id);
   else if(action===6&&state.tasks.length)send(core.detachCoopTask,state.tasks[next()%state.tasks.length].id);
   else if(action===7&&active?.status==='running'&&state.tasks.length){const target=state.tasks[next()%state.tasks.length],decision=send(core.prepareCoopJoin,target.id);if(decision.wait){const wait=send(core.parkCoopTask).wait;send(core.bindCoopWait,wait.id,{join:target.id});send(core.releaseCoopTask,active.id);}}
   else if(action===8){send(core.scheduleCoopPump);send(core.consumeCoopPump);}
   verify();
  }
  const replay=history.reduce((state,[fn,args])=>{const decision=fn(state,...args);return decision.state??decision;},attached(4,12));assert.deepEqual(replay,state);const closed=core.closeCoopState(state);assert.equal(closed.stats.abandoned,state.tasks.filter(task=>task.status!=='done').length);assert.equal(closed.tasks.length,0);
 }
});


test('attachment reservation rejects reentry and cannot be accepted after retirement',()=>{
 const state=core.initialCoopState(),begin=core.beginCoopAttachment(state);assert.equal(begin.accepted,true);assert.equal(core.beginCoopAttachment(begin.state).accepted,false);assert.equal(core.createCoopTask(state,true).task,null);const closed=core.closeCoopState(begin.state);assert.equal(core.finishCoopAttachment(closed).accepted,false);assert.equal(core.beginCoopAttachment(closed).accepted,false);
});

test('actual ABI getter retirement stops attachment before acquiring later exports',t=>{
 const f=fixture(t,{attach:false});let reads=0;Object.defineProperty(f.exports,'memory',{get(){f.scheduler.close();return f.memory;}});Object.defineProperty(f.exports,'demuxe_coop_get_sp',{get(){reads++;return()=>8192;}});
 assert.throws(()=>f.scheduler.attach(f.exports),/closed/);assert.equal(reads,0);assert.equal(f.scheduler.e,undefined);assert.equal(f.scheduler.cStacks,undefined);assert.equal(f.scheduler.stopped,true);
});

test('actual ABI callback retirement rejects attachment without installing physical exports',t=>{
 const f=fixture(t,{attach:false});f.exports.demuxe_coop_stack_count=()=>{f.scheduler.close();return 3;};assert.throws(()=>f.scheduler.attach(f.exports),/closed/);assert.equal(f.scheduler.e,undefined);assert.equal(f.scheduler.cStacks,undefined);assert.equal(f.scheduler.machine.attachment,'attaching');assert.equal(f.scheduler.stopped,true);
});

test('reentrant attachment cannot replace the outer admitted ABI',t=>{
 const f=fixture(t,{attach:false});let entered=false;Object.defineProperty(f.exports,'memory',{get(){if(!entered){entered=true;assert.throws(()=>f.scheduler.attach(f.exports),/already attached/);}return f.memory;}});f.scheduler.attach(f.exports);assert.equal(f.scheduler.machine.attachment,'attached');assert.equal(f.scheduler.e,f.exports);assert.equal(f.scheduler.stopped,false);
});

test('close runs every custom parked cleanup once even if one throws or reenters',async t=>{
 let f,called=0;const failure=Error('stop'),wait=()=>f.scheduler.park(waiter=>{waiter.cleanup=()=>{called++;f.scheduler.close();if(called===1)throw Error('cleanup failed');};});f=fixture(t,{functions:{wait}});const a=f.scheduler.run(wait),b=f.scheduler.run(wait);f.tick();f.tick();f.scheduler.close(failure);await assert.rejects(a,error=>error===failure);await assert.rejects(b,error=>error===failure);assert.equal(called,2);f.scheduler.close();assert.equal(called,2);
});

test('failed timer cleanup remains counted until that exact physical callback finally fires',async t=>{
 let f;const wait=()=>f.scheduler.wait(9,100);f=fixture(t,{functions:{wait}});const work=f.scheduler.run(wait);f.tick();f.clearHook=()=>{throw Error('timer cleanup failed');};f.scheduler.close();await assert.rejects(work,/closed/);assert.equal(f.scheduler.snapshot().timers,1);f.now=100;f.fire();assert.equal(f.scheduler.snapshot().timers,0);assert.equal(f.scheduler.snapshot().liveTasks,0);f.clearHook=undefined;
});

test('decoder wake owner coalesces scheduled and running work and retires atomically',()=>{
 const initial=attached(),queued=core.transitionCoopDecoderWake(initial,'schedule');assert.equal(queued.accepted,true);assert.equal(core.transitionCoopDecoderWake(queued.state,'schedule').accepted,false);
 const running=core.transitionCoopDecoderWake(queued.state,'begin');assert.equal(running.state.decoderWake,'running');assert.equal(core.transitionCoopDecoderWake(running.state,'schedule').accepted,false);
 const done=core.transitionCoopDecoderWake(running.state,'finish');assert.equal(done.state.decoderWake,'idle');assert.equal(core.transitionCoopDecoderWake(done.state,'schedule').accepted,true);
 const closed=core.closeCoopState(running.state);assert.equal(closed.decoderWake,'idle');assert.equal(core.transitionCoopDecoderWake(closed,'begin').accepted,false);assert.equal(core.transitionCoopDecoderWake(closed,'schedule').accepted,false);assert.equal(initial.decoderWake,'idle');
});
test('actual decoder wake merges a burst until its scheduled native call completes',async t=>{
 let calls=0;const wake=()=>++calls,f=fixture(t,{functions:{wake}});assert.equal(f.scheduler.wakeDecoder(()=>wake),true);assert.equal(f.scheduler.wakeDecoder(()=>wake),false);await Promise.resolve();assert.equal(f.scheduler.machine.decoderWake,'running');assert.equal(f.scheduler.wakeDecoder(()=>wake),false);f.tick();await new Promise(setImmediate);assert.equal(calls,1);assert.equal(f.scheduler.machine.decoderWake,'idle');
 assert.equal(f.scheduler.wakeDecoder(()=>wake),true);await Promise.resolve();f.tick();await new Promise(setImmediate);assert.equal(calls,2);
});
test('queued decoder wake cannot acquire native function after close',async t=>{
 const f=fixture(t);f.scheduler.wakeDecoder(()=>assert.fail('retired acquisition'));f.scheduler.close();await Promise.resolve();assert.equal(f.scheduler.machine.decoderWake,'idle');assert.equal(f.scheduler.snapshot().created,0);
});
test('decoder export acquisition retirement prevents native task admission',async t=>{
 const f=fixture(t);f.scheduler.wakeDecoder(()=>{f.scheduler.close();return()=>assert.fail('retired native wake');});await Promise.resolve();assert.equal(f.scheduler.snapshot().created,0);assert.equal(f.scheduler.machine.decoderWake,'idle');
});
test('decoder wake queue acquisition failure retires without a latched wake',t=>{
 const f=fixture(t),saved=queueMicrotask;t.after(()=>{globalThis.queueMicrotask=saved;});globalThis.queueMicrotask=()=>{throw Error('queue failed');};f.scheduler.wakeDecoder(()=>{});assert.equal(f.scheduler.stopped,true);assert.equal(f.scheduler.machine.decoderWake,'idle');assert.match(f.scheduler.failure,/queue failed/);
});
test('opaque scheduler failure cannot prevent logical retirement or pending settlement',async t=>{
 const entry=()=>1,f=fixture(t,{functions:{entry}}),error={get stack(){throw Error('cannot format');}},work=f.scheduler.run(entry);f.scheduler.fail(error);await assert.rejects(work,value=>value===error);assert.equal(f.scheduler.stopped,true);assert.equal(f.scheduler.snapshot().retainedTasks,0);
});
