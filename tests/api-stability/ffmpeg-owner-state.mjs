// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {SingleOwner} from '../../web/private-ffmpeg/single-owner.js';
import {initialFfmpegOwner,transitionFfmpegOwner} from '../../web/generated/internal/machine/ffmpeg-owner.js';
const pending=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const turn=()=>new Promise(setImmediate);

test('pure owner retains physical identity after logical retirement',()=>{
 const initial=initialFfmpegOwner(),first=transitionFfmpegOwner(initial,{type:'begin'}),park=transitionFfmpegOwner(first.state,{type:'park',task:first.id});
 const closed=transitionFfmpegOwner(park.state,{type:'close'});
 assert.equal(initial.active,null);assert.equal(closed.state.active,null);assert.equal(closed.state.physical,first.id);assert.equal(closed.retireWait,park.id);
 assert.equal(transitionFfmpegOwner(closed.state,{type:'begin'}).accepted,false);
 assert.equal(transitionFfmpegOwner(closed.state,{type:'complete',task:2}).accepted,false);
 const done=transitionFfmpegOwner(closed.state,{type:'complete',task:first.id});assert.equal(done.state.physical,null);assert.equal(done.state.completed,1);
 assert.equal(transitionFfmpegOwner(done.state,{type:'complete',task:first.id}).accepted,false);
});
test('native invoke reserves a published promise before synchronous reentry',async()=>{
 const owner=new SingleOwner();let nested,join,observed;
 const result=owner.invoke(()=>{observed=owner.active.promise;join=owner.idle();nested=owner.invoke(()=>assert.fail('nested native call'));return 7;});
 assert.equal(observed,result);assert.equal(await result,7);await join;await assert.rejects(nested,/already active/);
});
test('synchronous failure keeps admission busy until completion and preserves falsey errors',async()=>{
 const owner=new SingleOwner();const result=owner.invoke(()=>{throw undefined;});const nested=owner.invoke(()=>42);
 await assert.rejects(result,error=>error===undefined);await assert.rejects(nested,/already active/);assert.equal(await owner.invoke(()=>42),42);
});
test('park publishes before arm, resumes once, and cleans once',async()=>{
 const owner=new SingleOwner();let cleanup=0,resume=0,waiter;
 const result=owner.invoke(()=>owner.park(value=>{waiter=value;value.cleanup=()=>cleanup++;value.task.resumeAction=()=>{resume++;return 9;};assert.equal(owner.readyWait(value,1),true);assert.equal(owner.readyWait(value,2),false);}));
 assert.equal(await result,9);assert.equal(cleanup,1);assert.equal(resume,1);assert.equal(owner.readyWait(waiter,3),false);assert.equal(owner.waiters.size,0);
});
test('close during queued delivery settles both wait and native operation without resume',async()=>{
 const owner=new SingleOwner(),reason=Error('retired');let wait,waiter,resumed=0;
 const result=owner.invoke(()=>{wait=owner.park(value=>{waiter=value;value.task.resumeAction=()=>resumed++;});return wait;});
 const outer=assert.rejects(result,error=>error===reason),inner=assert.rejects(wait,error=>error===reason);
 owner.readyWait(waiter,3);owner.close(reason);await Promise.all([outer,inner]);await turn();assert.equal(resumed,0);assert.equal(owner.waiters.size,0);assert.equal(owner.state.physical,null);
});
test('close contains cleanup failures and retires ignored native work honestly',async()=>{
 const owner=new SingleOwner(),native=pending(),reason=Error('stop');let notifications=0;
 owner.onStop(()=>{throw 0;});owner.onStop(()=>notifications++);
 const result=owner.invoke(()=>native.promise),settled=assert.rejects(result,error=>error===reason);owner.close(reason);await settled;await owner.idle();
 assert.equal(notifications,1);assert.equal(owner.state.physical,1);assert.equal(owner.state.cleanupFailures,1);native.resolve(8);await turn();assert.equal(owner.state.physical,null);assert.equal(owner.state.retired,1);
});
test('arm failure cleans acquired wait and preserves original rejection',async()=>{
 const owner=new SingleOwner(),failure=Error('arm');let cleaned=0;
 const result=owner.invoke(()=>owner.park(waiter=>{waiter.cleanup=()=>cleaned++;throw failure;}));await assert.rejects(result,error=>error===failure);assert.equal(cleaned,1);assert.equal(owner.waiters.size,0);
});
test('cleanup retirement prevents queued continuation delivery',async()=>{
 const owner=new SingleOwner(),reason=Error('cleanup retired');let resumed=0;
 const result=owner.invoke(()=>owner.park(waiter=>{waiter.cleanup=()=>owner.close(reason);waiter.task.resumeAction=()=>resumed++;assert.equal(owner.readyWait(waiter,3),false);}));
 await assert.rejects(result,error=>error===reason);await turn();assert.equal(resumed,0);assert.equal(owner.waiters.size,0);
});
test('throwing cleanup settles the waiter and native call with the original failure',async()=>{
 const owner=new SingleOwner();const result=owner.invoke(()=>owner.park(waiter=>{waiter.cleanup=()=>{throw false;};owner.readyWait(waiter,3);}));
 await assert.rejects(result,error=>error===false);assert.equal(owner.state.cleanupFailures,1);assert.equal(owner.waiters.size,0);
});
test('wait acquired after synchronous retirement is cleaned exactly once',async()=>{
 const owner=new SingleOwner(),reason=Error('retired in arm');let cleaned=0;
 const result=owner.invoke(()=>owner.park(waiter=>{owner.close(reason);waiter.cleanup=()=>cleaned++;}));
 await assert.rejects(result,error=>error===reason);await turn();assert.equal(cleaned,1);assert.equal(owner.waiters.size,0);
});

test('retired arm cleanup cannot erase a same-task successor resume action',async()=>{
 const owner=new SingleOwner(),error=Error('first arm failed');let next,second,resumed=0;
 const result=owner.invoke(async()=>{
  await assert.rejects(owner.park(waiter=>{waiter.cleanup=()=>{second=owner.park(value=>{next=value;value.task.resumeAction=()=>{resumed++;return 42;};});};throw error;}),value=>value===error);
  assert.equal(owner.readyWait(next,0),true);return second;
 });
 const value=await result;assert.equal(value,42);assert.equal(resumed,1);
});
