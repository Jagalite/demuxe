// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {RangeSource as MpvRangeSource} from '../../web/private-mpv/range-source.js';
import {RangeSource as FfmpegRangeSource} from '../../web/private-ffmpeg/range-source.js';
import {SingleOwner} from '../../web/private-ffmpeg/single-owner.js';
import * as core from '../../web/generated/internal/machine/private-range-source.js';
const turn=()=>new Promise(setImmediate);
const pending=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const initial=()=>{let state=core.installPrivateRangeSource(core.createPrivateRangeState(),1024).state;const opened=core.openPrivateRangeHandle(state);return{state:opened.state,handle:opened.id};};
const admit=(state,handle,extra={})=>core.admitPrivateRangeRead(state,{handle,ptr:32,count:8,offset:0,memoryBytes:65536,now:0,...extra});

test('range policy keeps64 handles across replacement without ever reviving old identities',()=>{
 let state=core.installPrivateRangeSource(core.createPrivateRangeState(),1024).state;const ids=[];
 for(let i=0;i<64;i++){const next=core.openPrivateRangeHandle(state);state=next.state;ids.push(next.id);}assert.equal(core.openPrivateRangeHandle(state).id,-1);
 state=core.installPrivateRangeSource(state,20).state;assert.equal(core.openPrivateRangeHandle(state).id,-1);assert.equal(core.validPrivateRangeHandle(state,ids[0]),false);assert.equal(core.privateRangeHandle(state,ids[0]).size,1024);
 state=core.retirePrivateRangeHandle(state,ids[0],true).state;const next=core.openPrivateRangeHandle(state);assert.equal(next.id,65);assert.equal(core.validPrivateRangeHandle(next.state,65),true);assert.equal(next.state.handles.length,64);
});

test('range policy reserves all8 reads through ready settlement until actual owner commit',()=>{
 let {state,handle}=initial();const original=state;
 for(let i=0;i<8;i++)state=admit(state,handle).state;
 assert.equal(admit(state,handle).result,-1);const first=state.requests[0];state=core.settlePrivateRangeRead(state,first.id,'valid').state;
 assert.equal(admit(state,handle).request,null);const commit=core.planPrivateRangeCommit(state,first.id,8,65536);state=core.finishPrivateRangeCommit(state,first.id,commit);
 assert.ok(admit(state,handle).request);assert.equal(state.stats.copies,1);assert.equal(state.stats.bytes,8);assert.equal(original.requests.length,0);assert.equal(original.stats.reads,0);
});

test('range validation preserves finite bounds, EOF and short last reads',()=>{
 const {state,handle}=initial();for(const extra of [{offset:-1},{offset:1025},{offset:NaN},{count:262145},{count:-1},{count:1.5},{ptr:65535,count:2}])assert.equal(admit(state,handle,extra).result,-1);
 assert.equal(admit(state,handle,{offset:1024,count:20}).result,0);assert.equal(admit(state,handle,{count:0}).result,0);assert.equal(admit(state,handle,{offset:1020,count:20}).request.count,4);
});

test('range deadline is absolute and rejects early or duplicate timeout observations',()=>{
 let {state,handle}=initial();const next=admit(state,handle,{now:100});state=next.state;const id=next.request.id;
 const early=core.cancelPrivateRangeRead(state,id,5099);assert.equal(early.state,state);assert.equal(early.remaining,1);assert.equal(early.accepted,false);
 const due=core.cancelPrivateRangeRead(state,id,5100);assert.equal(due.timedOut,true);assert.equal(due.state.stats.timeouts,1);assert.equal(due.state.stats.cancelled,1);
 assert.equal(core.cancelPrivateRangeRead(due.state,id,5101).accepted,false);
});

test('already-ready reads remain revocable through cancellation and source replacement',()=>{
 for(const retire of [state=>core.retirePrivateRangeHandle(state,1).state,state=>core.installPrivateRangeSource(state,8).state,state=>core.retirePrivateRangeSource(state,'close').state]){
  let {state,handle}=initial();const next=admit(state,handle);state=core.settlePrivateRangeRead(next.state,next.request.id,'valid').state;state=retire(state);
  const plan=core.planPrivateRangeCommit(state,next.request.id,8,65536);assert.equal(plan.reason,'stale');assert.equal(plan.value,-1);state=core.finishPrivateRangeCommit(state,next.request.id,plan);assert.equal(state.requests.length,0);assert.equal(state.stats.copies,0);assert.equal(state.stats.staleCommitsRejected,1);
 }
});

test('terminal abandonment releases logical requests without falsely counting byte copies',()=>{
 let {state,handle}=initial();for(let i=0;i<8;i++)state=admit(state,handle).state;
 const next=core.retirePrivateRangeSource(state,'abandon').state;assert.equal(next.requests.length,0);assert.equal(next.handles.length,0);assert.equal(next.closed,true);assert.equal(next.stats.abandonedRequests,8);assert.equal(next.stats.copies,0);
 const late=core.settlePrivateRangeRead(next,1,'reader-error').state;assert.equal(late.requests.length,0);assert.equal(late.stats.lateCompletions,1);assert.equal(late.stats.errors,1);
});

function fixture(t,RangeSource,options={}){
 const saved=new Map(),timers=new Set();let now=0,stop,setHook,clearHook;const install=(key,value)=>{if(!saved.has(key))saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value,writable:true});};
 install('performance',{now:()=>now});install('setTimeout',(fn,delay)=>{setHook?.();const timer={fn,delay};timers.add(timer);return timer;});install('clearTimeout',timer=>{timers.delete(timer);clearHook?.();});
 const scheduler={stopped:false,ready:[],onStop(fn){stop=fn;return()=>{};},park(arm){const waiter={task:{},done:false};arm(waiter);return waiter;},readyWait(waiter){if(waiter.done||this.stopped)return false;waiter.done=true;this.ready.push(waiter);this.onReady?.();return true;},resume(){const waiter=this.ready.shift();assert.ok(waiter,'ready owner');return waiter.task.resumeAction();},stop(){this.stopped=true;stop();}};
 const source=new RangeSource(scheduler,options),memory=new WebAssembly.Memory({initial:1});source.attach(memory);new Uint8Array(memory.buffer).fill(0xcc);
 t.after(()=>{source.close();for(const[key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
 return{source,scheduler,memory,timers,install,set setHook(value){setHook=value;},set clearHook(value){clearHook=value;},set now(value){now=value;},fire(){const timer=[...timers][0];assert.ok(timer);timers.delete(timer);timer.fn();},bytes:()=>new Uint8Array(memory.buffer,32,8)};
}

for(const [name,RangeSource]of [['mpv',MpvRangeSource],['ffmpeg',FfmpegRangeSource]]){
 test(name+' range copies owned bytes only when resumed and reacquires grown Wasm memory',async t=>{
  const f=fixture(t,RangeSource),bytes=Uint8Array.of(1,2,3,4),read=pending();f.source.setSource({size:100,read:()=>read.promise});const id=f.source.open();f.source.read(id,32,8,0);await turn();
  read.resolve(bytes);await turn();assert.deepEqual([...f.bytes()],Array(8).fill(0xcc));bytes.fill(9);const old=f.memory.buffer;f.memory.grow(1);assert.equal(old.byteLength,0);
  assert.equal(f.scheduler.resume(),4);assert.deepEqual([...f.bytes()],[1,2,3,4,0xcc,0xcc,0xcc,0xcc]);assert.equal(f.source.snapshot().pending,0);assert.equal(f.source.snapshot().bytes,4);
 });
 test(name+' ready result is cancelled before owner resume without heap writes',async t=>{
  const f=fixture(t,RangeSource);f.source.setSource({size:100,read:async()=>new Uint8Array(8)});const id=f.source.open();f.source.read(id,32,8,0);await turn();f.source.cancelHandle(id);
  assert.equal(f.scheduler.resume(),-1);assert.deepEqual([...f.bytes()],Array(8).fill(0xcc));assert.equal(f.source.snapshot().staleCommitsRejected,1);assert.equal(f.source.snapshot().copies,0);
 });
 test(name+' cancelling before reader invocation avoids work and bounds pending admission',async t=>{
  const f=fixture(t,RangeSource);let calls=0;f.source.setSource({size:100,read:()=>{calls++;return new Promise(()=>{});}});const id=f.source.open();for(let i=0;i<8;i++)f.source.read(id,32,8,0);
  assert.equal(f.source.read(id,32,8,0),-1);assert.equal(f.source.snapshot().maxPending,8);f.source.cancelSource();await turn();assert.equal(calls,0);
  for(let i=0;i<8;i++)assert.equal(f.scheduler.resume(),-1);assert.equal(f.source.snapshot().pending,0);assert.equal(f.timers.size,0);
 });
 test(name+' invalid or empty reader results never synthesize successful bytes',async t=>{
  const f=fixture(t,RangeSource);for(const result of [0,8,NaN,Infinity,new Uint8Array(0),new Uint8Array(9),null]){
   f.source.setSource({size:100,read:async()=>result});const id=f.source.open();f.source.read(id,32,8,0);await turn();assert.equal(f.scheduler.resume(),-1);f.source.closeHandle(id);
  }assert.equal(f.source.snapshot().errors,7);assert.deepEqual([...f.bytes()],Array(8).fill(0xcc));
 });
 test(name+' native deadline preserves original5000ms and rearms an early callback',async t=>{
  const f=fixture(t,RangeSource);let aborted=0;f.source.setSource({size:100,read:(_offset,_count,signal)=>{signal.addEventListener('abort',()=>aborted++);return new Promise(()=>{});}});const id=f.source.open();f.source.read(id,32,8,0);await turn();
  assert.equal([...f.timers][0].delay,5000);f.now=4999;f.fire();assert.equal(f.scheduler.ready.length,0);assert.equal([...f.timers][0].delay,1);f.now=5000;f.fire();assert.equal(aborted,1);assert.equal(f.scheduler.resume(),-1);assert.equal(f.source.snapshot().timeouts,1);assert.equal(f.source.drainFailures()[0].kind,'timeout');
 });
 test(name+' source replacement commits before abort reentry and nested source wins',async t=>{
  const f=fixture(t,RangeSource);const newest={size:300,read:async()=>Uint8Array.of(3)};
  f.source.setSource({size:100,read:(_offset,_count,signal)=>{signal.addEventListener('abort',()=>f.source.setSource(newest),{once:true});return new Promise(()=>{});}});const old=f.source.open();f.source.read(old,32,8,0);await turn();
  f.source.setSource({size:200,read:async()=>Uint8Array.of(2)});assert.equal(f.source.source.reader,newest);assert.equal(f.source.generation,3);assert.equal(f.scheduler.resume(),-1);assert.equal(f.source.imports.valid(old),0);
  const id=f.source.open();assert.equal(f.source.size(id),300);f.source.read(id,32,8,0);await turn();assert.equal(f.scheduler.resume(),1);assert.equal(f.bytes()[0],3);
 });
 test(name+' closing retires admission before synchronous abort callbacks',async t=>{
  const f=fixture(t,RangeSource);let openId,rejected=false;f.source.setSource({size:100,read:(_offset,_count,signal)=>{signal.addEventListener('abort',()=>{openId=f.source.open();try{f.source.setSource({size:1,read:async()=>Uint8Array.of(1)});}catch{rejected=true;}});return new Promise(()=>{});}});const id=f.source.open();f.source.read(id,32,8,0);await turn();f.source.close();
  assert.equal(openId,-1);assert.equal(rejected,true);assert.equal(f.scheduler.resume(),-1);assert.equal(f.source.snapshot().handles,0);assert.equal(f.source.snapshot().pending,0);
 });
 test(name+' scheduler abandonment contains readers and late resolution cannot write',async t=>{
  const f=fixture(t,RangeSource),read=pending();let aborted=0;f.source.setSource({size:100,read:(_offset,_count,signal)=>{signal.addEventListener('abort',()=>aborted++);return read.promise;}});const id=f.source.open();f.source.read(id,32,8,0);await turn();f.scheduler.stop();read.resolve(Uint8Array.of(1));await turn();
  assert.equal(aborted,1);assert.equal(f.timers.size,0);assert.equal(f.source.snapshot().handles,0);assert.equal(f.source.snapshot().pending,0);assert.equal(f.source.snapshot().abandonedRequests,1);assert.equal(f.scheduler.ready.length,0);assert.deepEqual([...f.bytes()],Array(8).fill(0xcc));
 });
 test(name+' reader failure keeps host cause identity out of snapshots',async t=>{
  const f=fixture(t,RangeSource),error=Error('private source bearer token');f.source.setSource({size:100,read:async()=>{throw error;}});const id=f.source.open();f.source.read(id,32,8,0);await turn();assert.equal(f.scheduler.resume(),-1);assert.equal(f.source.drainFailures()[0].cause,error);assert.equal(JSON.stringify(f.source.snapshot()).includes('private source'),false);
 });
 test(name+' repeated open read close histories release every handle and timer',async t=>{
  const f=fixture(t,RangeSource);for(let i=0;i<100;i++){f.source.setSource({size:100,read:async()=>Uint8Array.of(i)});const id=f.source.open();assert.equal(id,i+1);f.source.read(id,32,8,0);await turn();assert.equal(f.scheduler.resume(),1);assert.equal(f.bytes()[0],i);f.source.closeHandle(id);assert.equal(f.source.snapshot().pending,0);assert.equal(f.source.snapshot().handles,0);assert.equal(f.timers.size,0);}
  assert.equal(f.source.snapshot().reads,100);assert.equal(f.source.snapshot().copies,100);
 });
}


test('actual FFmpeg single owner delivers bytes only inside its serialized invocation',async()=>{
 const owner=new SingleOwner(),source=new FfmpegRangeSource(owner),memory=new WebAssembly.Memory({initial:1});source.attach(memory);source.setSource({size:20,read:async()=>Uint8Array.of(4,5)});const id=source.open();
 try{assert.equal(await owner.invoke(()=>source.read(id,32,8,0)),2);assert.deepEqual([...new Uint8Array(memory.buffer,32,2)],[4,5]);assert.equal(owner.active,null);assert.equal(source.snapshot().pending,0);}
 finally{source.close();owner.close();}
});

test('actual FFmpeg owner stop rejects pending read and abandons logical and physical resources',async()=>{
 const owner=new SingleOwner(),source=new FfmpegRangeSource(owner),memory=new WebAssembly.Memory({initial:1}),reader=pending(),error=Error('stopped');source.attach(memory);source.setSource({size:20,read:()=>reader.promise});const id=source.open();
 const request=owner.invoke(()=>source.read(id,32,8,0));await turn();owner.close(error);await assert.rejects(request,reason=>reason===error);reader.resolve(Uint8Array.of(9));await turn();
 assert.equal(source.snapshot().pending,0);assert.equal(source.snapshot().timers,0);assert.equal(source.snapshot().handles,0);assert.equal(new Uint8Array(memory.buffer)[32],0);
});


test('memory observation reentry cannot resurrect a closed range source during admission',t=>{
 const f=fixture(t,MpvRangeSource);f.source.setSource({size:20,read:async()=>Uint8Array.of(1)});const id=f.source.open();
 f.source.memory={get buffer(){f.source.close();return f.memory.buffer;}};
 assert.equal(f.source.read(id,32,8,0),-1);assert.equal(f.source.closed,true);assert.equal(f.source.snapshot().pending,0);assert.equal(f.timers.size,0);
});


for(const [name,RangeSource]of [['mpv',MpvRangeSource],['ffmpeg',FfmpegRangeSource]]){
 test(name+' timer cleanup failure still wakes native owner and retires the request',async t=>{
  const f=fixture(t,RangeSource),error=Error('clear timer failed');f.source.setSource({size:20,read:async()=>Uint8Array.of(1)});const id=f.source.open();f.clearHook=()=>{throw error;};f.source.read(id,32,8,0);await turn();
  assert.equal(f.scheduler.resume(),-1);assert.equal(f.source.snapshot().pending,0);assert.equal(f.timers.size,0);assert.equal(f.source.drainFailures()[0].cause,error);assert.equal(f.source.snapshot().errors,1);f.clearHook=undefined;
 });
 test(name+' failed early timer rearm wakes a failed read without retaining resources',async t=>{
  const f=fixture(t,RangeSource),error=Error('set timer failed');let calls=0;f.setHook=()=>{if(calls++)throw error;};f.source.setSource({size:20,read:()=>new Promise(()=>{})});const id=f.source.open();f.source.read(id,32,8,0);await turn();f.now=100;f.fire();
  assert.equal(f.scheduler.resume(),-1);assert.equal(f.source.snapshot().pending,0);assert.equal(f.timers.size,0);assert.equal(f.source.drainFailures()[0].cause,error);assert.equal(f.source.snapshot().timeouts,0);assert.equal(f.source.snapshot().errors,1);
 });
 test(name+' repeated stale timeout callback cannot replace current deadline registration',async t=>{
  const f=fixture(t,RangeSource);f.source.setSource({size:20,read:()=>new Promise(()=>{})});const id=f.source.open();f.source.read(id,32,8,0);await turn();const stale=[...f.timers][0];f.now=100;f.fire();const current=[...f.timers][0];stale.fn();
  assert.equal(f.timers.size,1);assert.equal([...f.timers][0],current);f.now=5000;f.fire();assert.equal(f.scheduler.resume(),-1);assert.equal(f.source.snapshot().timeouts,1);assert.equal(f.timers.size,0);
 });
 test(name+' controller acquisition failure rolls back admitted native read',t=>{
  const f=fixture(t,RangeSource),error=Error('controller unavailable');f.source.setSource({size:20,read:()=>new Promise(()=>{})});const id=f.source.open();f.install('AbortController',class{constructor(){throw error;}});
  assert.throws(()=>f.source.read(id,32,8,0),reason=>reason===error);assert.equal(f.source.snapshot().pending,0);assert.equal(f.source.requests.size,0);assert.equal(f.timers.size,0);
 });
 test(name+' late controller acquired after abandonment is aborted without parking',t=>{
  const f=fixture(t,RangeSource),RealController=AbortController;let acquired;f.source.setSource({size:20,read:()=>new Promise(()=>{})});const id=f.source.open();f.install('AbortController',class extends RealController{constructor(){super();acquired=this;f.source.abandon();}});
  assert.equal(f.source.read(id,32,8,0),-1);assert.equal(acquired.signal.aborted,true);assert.equal(f.source.requests.size,0);assert.equal(f.scheduler.ready.length,0);assert.equal(f.timers.size,0);
 });
}

test('actual FFmpeg readyWait failure rejects its owner and removes the admitted request',async()=>{
 const owner=new SingleOwner(),source=new FfmpegRangeSource(owner),memory=new WebAssembly.Memory({initial:1}),error=Error('wake failed');source.attach(memory);source.setSource({size:20,read:async()=>Uint8Array.of(4)});const id=source.open();owner.readyWait=()=>{throw error;};
 try{await assert.rejects(owner.invoke(()=>source.read(id,32,8,0)),reason=>reason===error);assert.equal(source.snapshot().pending,0);assert.equal(source.snapshot().timers,0);assert.equal(new Uint8Array(memory.buffer)[32],0);}
 finally{source.close();owner.close();}
});


test('commit-time memory acquisition failure releases the exact request before propagating',async t=>{
 const f=fixture(t,MpvRangeSource),error=Error('memory unavailable');f.source.setSource({size:20,read:async()=>Uint8Array.of(1)});const id=f.source.open();f.source.read(id,32,8,0);await turn();f.source.memory={get buffer(){throw error;}};
 assert.throws(()=>f.scheduler.resume(),reason=>reason===error);assert.equal(f.source.snapshot().pending,0);assert.equal(f.source.requests.size,0);assert.equal(f.timers.size,0);assert.deepEqual([...f.bytes()],Array(8).fill(0xcc));
});
