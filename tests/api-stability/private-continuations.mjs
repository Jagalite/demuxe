// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/private-scheduler.js';
import {CoopScheduler} from '../../web/private-mpv/scheduler.js';

function model(backend='asyncify'){
 let state=core.finishCoopAttachment(core.beginCoopAttachment(core.initialCoopState(2,8,backend)).state).state;const initial=state,history=[];
 const send=(fn,...args)=>{const before=structuredClone(state),old=state,result=fn(state,...args);assert.deepEqual(old,before);state=result.state??result;history.push([fn,args]);return result;};
 return{get state(){return state;},send,event:(id,type,extra={})=>send(core.transitionCoopContinuation,{id,type,...extra}),replay(){return history.reduce((state,[fn,args])=>{const result=fn(state,...args);return result.state??result;},initial);}};
}
function start(m){const task=m.send(core.createCoopTask,true).task;assert.equal(m.send(core.startCoopTask).id,task.id);assert.equal(m.event(task.id,'begin').accepted,true);return task.id;}
function suspend(m,id,site='test.wait'){
 const wait=m.send(core.parkCoopTask).wait;assert.equal(m.event(id,'park').accepted,true);
 if(m.state.backend==='asyncify'){assert.equal(m.event(id,'site',{site}).accepted,true);assert.equal(m.event(id,'unwound').accepted,true);}
 m.send(core.releaseCoopTask,id);return wait.id;
}

test('interleaved continuation sites and counters belong to the exact scheduler task',()=>{
 const m=model(),a=start(m),aw=suspend(m,a,'read.a'),b=start(m),bw=suspend(m,b,'read.b');
 assert.equal(m.event(a,'resume').accepted,false);m.send(core.settleCoopWait,bw);m.send(core.startCoopTask);assert.equal(m.event(b,'resume').accepted,true);
 assert.equal(m.event(b,'rewind-import',{site:'read.a'}).accepted,false);assert.equal(m.event(a,'rewind-import',{site:'read.b'}).accepted,false);assert.equal(m.event(b,'rewind-import',{site:'read.b'}).accepted,true);assert.equal(m.event(b,'rewind-import',{site:'read.b'}).accepted,false);assert.equal(m.state.continuations.rewinds,0);m.event(b,'rewound');
 m.send(core.completeCoopTask,b);m.send(core.settleCoopWait,aw);m.send(core.startCoopTask);m.event(a,'resume');m.event(a,'rewind-import',{site:'read.a'});m.event(a,'rewound');m.send(core.completeCoopTask,a);
 assert.deepEqual(core.snapshotCoopContinuations(m.state),{kind:'asyncify',unwinds:2,rewinds:2,maxSavedBytes:0});assert.deepEqual(m.replay(),m.state);assert.equal(m.state.tasks.length,0);
});
test('Asyncify protocol rejects premature return, missing site and duplicate unwind',()=>{
 const m=model(),id=start(m);assert.equal(m.event(id,'begin').accepted,false);assert.equal(m.event(id,'resume').accepted,false);m.send(core.parkCoopTask);assert.equal(m.event(id,'park').accepted,true);assert.equal(m.event(id,'return').accepted,false);assert.equal(m.event(id,'unwound').accepted,false);
 assert.equal(m.event(id,'site',{site:''}).accepted,false);m.event(id,'site',{site:'test.wait'});assert.equal(m.event(id,'site',{site:'other'}).accepted,false);m.event(id,'unwound');assert.equal(m.event(id,'unwound').accepted,false);assert.equal(m.state.continuations.unwinds,1);
});
test('saved-byte high-water observations cannot alter caller input or accept invalid sizes',()=>{
 const m=model(),id=start(m);m.event(id,'checked',{savedBytes:96});m.event(id,'checked',{savedBytes:32});m.event(id,'checked',{savedBytes:128});for(const savedBytes of [-1,1.5,NaN,Infinity])assert.equal(m.event(id,'checked',{savedBytes}).accepted,false);assert.equal(m.state.continuations.maxSavedBytes,128);assert.equal(m.event(id+1,'checked',{savedBytes:1024}).accepted,false);assert.deepEqual(m.replay(),m.state);
});
test('scheduler retirement atomically discards all continuation sites and rejects late transitions',()=>{
 const m=model(),id=start(m);suspend(m,id,'private.read');const before=m.state;m.send(core.closeCoopState);assert.equal(before.tasks[0].continuation.site,'private.read');assert.deepEqual(m.state.tasks,[]);for(const type of ['begin','park','unwound','resume','return','checked','site','rewind-import'])assert.equal(m.event(id,type,{site:'private.read',savedBytes:100}).accepted,false);assert.equal(m.state.continuations.unwinds,1);assert.equal(m.state.continuations.rewinds,0);
});
test('JSPI suspension and resume share the same scheduler state without Asyncify protocol fields',()=>{
 const m=model('jspi'),id=start(m),wait=suspend(m,id);assert.equal(m.event(id,'site',{site:'read'}).accepted,false);m.send(core.settleCoopWait,wait);m.send(core.startCoopTask);assert.equal(m.event(id,'resume').accepted,true);assert.equal(m.event(id,'resume').accepted,false);assert.equal(m.event(id,'return').accepted,true);assert.equal(m.event(id,'checked',{savedBytes:32}).accepted,false);assert.deepEqual(core.snapshotCoopContinuations(m.state),{kind:'jspi'});assert.deepEqual(m.replay(),m.state);
});
test('replay of many alternating imports retains bounded per-task protocol records',()=>{
 const m=model(),id=start(m);for(let index=0;index<200;index++){const site=`read.${index%3}`,wait=suspend(m,id,site);m.send(core.settleCoopWait,wait);m.send(core.startCoopTask);m.event(id,'resume');m.event(id,'checked',{savedBytes:index%61});m.event(id,'rewind-import',{site});m.event(id,'rewound');assert.equal(m.state.tasks.length,1);assert.equal(m.state.tasks[0].continuation.site,null);assert.equal(m.state.continuations.unwinds,index+1);assert.equal(m.state.continuations.rewinds,index+1);}assert.equal(m.state.continuations.maxSavedBytes,60);assert.deepEqual(m.replay(),m.state);
});

// Real scheduler + continuation adapter, controlled ABI exports and real memory.
// These tests establish callback ownership, not actual Binaryen or JSPI execution.
function adapter(t,{backend='asyncify',attach=true}={}){
 const oldChannel=globalThis.MessageChannel,oldPromising=Object.getOwnPropertyDescriptor(WebAssembly,'promising'),oldSuspending=Object.getOwnPropertyDescriptor(WebAssembly,'Suspending'),events=[];
 globalThis.MessageChannel=class{port1={onmessage:null,close(){}};port2={postMessage:()=>events.push(0),close(){}};};
 if(backend==='jspi'){
  Object.defineProperty(WebAssembly,'promising',{configurable:true,writable:true,value:fn=>async(...args)=>fn(...args)});
  Object.defineProperty(WebAssembly,'Suspending',{configurable:true,writable:true,value:function(fn){return fn;}});
 }
 const s=new CoopScheduler({backend,slots:2,maxRetainedTasks:8}),memory=new WebAssembly.Memory({initial:1}),hooks={},calls=[],waiters=[];let state=0,sp=8192,name='test.wait',entry;
 const call=(key,work)=>{calls.push(key);hooks[key]?.();return work();};
 const e={memory,demuxe_coop_invoke:()=>{},demuxe_coop_get_sp:()=>sp,demuxe_coop_set_sp:value=>{sp=value;},demuxe_coop_stack_count:()=>2,demuxe_coop_stack_base:index=>256+index*512,demuxe_coop_stack_top:index=>768+index*512,
 asyncify_get_state:()=>call('state',()=>state),asyncify_start_unwind:()=>call('start-unwind',()=>{state=1;}),asyncify_stop_unwind:()=>call('stop-unwind',()=>{state=0;}),asyncify_start_rewind:()=>call('start-rewind',()=>{state=2;}),asyncify_stop_rewind:()=>call('stop-rewind',()=>{state=0;}),demuxe_asyncify_count:()=>call('count',()=>2),demuxe_asyncify_data:index=>16384+index*4096,demuxe_asyncify_base:index=>16416+index*4096,demuxe_asyncify_end:index=>18432+index*4096,
 run:()=>entry?entry():s.wrapImport(name,()=>s.park(waiter=>waiters.push(waiter)))()};
 if(attach)s.attach(e);
 t.after(()=>{s.close();globalThis.MessageChannel=oldChannel;for(const[key,value]of [['promising',oldPromising],['Suspending',oldSuspending]])value?Object.defineProperty(WebAssembly,key,value):delete WebAssembly[key];});
 return{s,e,memory,hooks,calls,waiters,set name(value){name=value;},set entry(value){entry=value;},tick(){assert.ok(events.length,'queued channel turn');events.shift();s.channel.port1.onmessage();}};
}
test('actual Asyncify adapter keeps arbitrary continuation values only in physical task storage',async t=>{
 const f=adapter(t),value={secret:'opaque callback result',callback(){}};const work=f.s.run(f.e.run);f.tick();const task=f.waiters[0].task;assert.equal(task.resumeSite,undefined);assert.equal(f.s.machine.tasks[0].continuation.site,'test.wait');assert.doesNotThrow(()=>structuredClone(f.s.machine));f.s.readyWait(f.waiters[0],value);f.tick();assert.equal(await work,value);assert.equal(task.continuationResult,undefined);assert.deepEqual(f.s.continuations.snapshot(),{kind:'asyncify',maxSavedBytes:0,unwinds:1,rewinds:1});
});
test('actual Asyncify adapter rejects a wrong rewind import before consuming the opaque result',async t=>{
 const f=adapter(t),work=f.s.run(f.e.run);f.tick();f.name='wrong';f.s.readyWait(f.waiters[0],7);f.tick();await assert.rejects(work,/wrong import/);assert.equal(f.calls.filter(value=>value==='stop-rewind').length,0);assert.equal(f.s.snapshot().continuations.rewinds,0);assert.equal(f.s.stopped,true);
});
test('actual Asyncify retirement during unwind stop cannot release or revive the task',async t=>{
 const f=adapter(t),error=Error('retired by native callback');f.hooks['stop-unwind']=()=>f.s.close(error);const work=f.s.run(f.e.run);f.tick();await assert.rejects(work,value=>value===error);assert.equal(f.s.snapshot().continuations.unwinds,0);assert.equal(f.s.snapshot().retainedTasks,0);assert.equal(f.s.readyWait(f.waiters[0],7),false);
});
test('actual Asyncify retirement during rewind start never re-enters native task',async t=>{
 const f=adapter(t),error=Error('closed while starting rewind');let calls=0;f.entry=()=>{calls++;return f.s.wrapImport('wait',()=>f.s.park(waiter=>f.waiters.push(waiter)))();};const work=f.s.run(f.e.run);f.tick();f.hooks['start-rewind']=()=>f.s.close(error);f.s.readyWait(f.waiters[0],7);f.tick();await assert.rejects(work,value=>value===error);assert.equal(calls,1);assert.equal(f.s.snapshot().continuations.rewinds,0);assert.equal(f.s.snapshot().retainedTasks,0);
});
test('actual Asyncify attachment stops at a retiring ABI callback without retaining exports',t=>{
 const f=adapter(t,{attach:false});f.hooks.count=()=>f.s.close();assert.throws(()=>f.s.attach(f.e),/closed/);assert.equal(f.s.continuations.e,undefined);assert.equal(f.s.continuations.stacks,undefined);assert.equal(f.calls.includes('state'),false);
});
test('actual JSPI adapter consumes each resolver once and ignores completion after retirement',async t=>{
 const f=adapter(t,{backend:'jspi'});f.entry=()=>f.s.park(waiter=>f.waiters.push(waiter));const work=f.s.run(f.e.run);f.tick();assert.equal(f.s.machine.tasks[0].continuation.phase,'suspended');f.s.readyWait(f.waiters[0],17);f.tick();await Promise.resolve();assert.equal(await work,17);assert.equal(f.waiters[0].task.resume,null);assert.deepEqual(f.s.continuations.snapshot(),{kind:'jspi'});
 const late=f.s.run(f.e.run);f.tick();const pending=f.waiters[1].task,resolve=pending.resume,error=Error('source retired');f.s.close(error);await assert.rejects(late,value=>value===error);resolve(99);await Promise.resolve();assert.equal(f.s.snapshot().completed,1);assert.equal(f.s.snapshot().abandoned,1);assert.equal(f.s.snapshot().retainedTasks,0);
});

test('actual Asyncify rewind stop failure leaves no acknowledged rewind count',async t=>{
 const f=adapter(t),error=Error('native rewind stop failed'),work=f.s.run(f.e.run);f.tick();f.hooks['stop-rewind']=()=>{throw error;};f.s.readyWait(f.waiters[0],7);f.tick();await assert.rejects(work,value=>value===error);assert.equal(f.s.snapshot().continuations.rewinds,0);assert.equal(f.s.snapshot().retainedTasks,0);
});
test('actual Asyncify rewind stop retirement rejects output before acknowledging rewind',async t=>{
 const f=adapter(t),error=Error('closed during native rewind stop'),work=f.s.run(f.e.run);f.tick();f.hooks['stop-rewind']=()=>f.s.close(error);f.s.readyWait(f.waiters[0],7);f.tick();await assert.rejects(work,value=>value===error);assert.equal(f.s.snapshot().continuations.rewinds,0);assert.equal(f.s.snapshot().retainedTasks,0);
});

test('composed scheduler rejects physical release or completion before protocol acknowledgment',()=>{
 const m=model(),id=m.send(core.createCoopTask,true).task.id;m.send(core.startCoopTask);
 assert.equal(m.send(core.completeCoopTask,id).accepted,false);assert.equal(m.send(core.releaseCoopTask,id).accepted,false);assert.equal(m.send(core.parkCoopTask).wait,null);
 m.event(id,'begin');assert.equal(m.send(core.releaseCoopTask,id).accepted,false);const wait=m.send(core.parkCoopTask).wait;m.event(id,'park');m.event(id,'site',{site:'wait'});
 assert.equal(m.send(core.releaseCoopTask,id).accepted,false);m.event(id,'unwound');assert.equal(m.send(core.releaseCoopTask,id).accepted,true);m.send(core.settleCoopWait,wait.id);m.send(core.startCoopTask);
 assert.equal(m.send(core.completeCoopTask,id).accepted,false);assert.equal(m.send(core.releaseCoopTask,id).accepted,false);m.event(id,'resume');assert.equal(m.send(core.completeCoopTask,id).accepted,false);m.event(id,'rewind-import',{site:'wait'});assert.equal(m.send(core.completeCoopTask,id).accepted,false);m.event(id,'rewound');assert.equal(m.send(core.completeCoopTask,id).accepted,true);assert.equal(m.state.free.length,2);
});
