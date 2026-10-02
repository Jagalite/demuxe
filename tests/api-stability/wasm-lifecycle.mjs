// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import * as core from '../../web/generated/internal/machine/wasm-lifecycle.js';

test('Wasm RPC authority preserves IDs, capacity, explicit deadlines and immutable prior state',()=>{
 let state=core.createWasmLifecycle();const initial=state;
 for(let index=0;index<128;index++){
  const admitted=core.admitWasmRequest(state,index*10);state=admitted.state;
  assert.equal(admitted.request.id,100+index);assert.equal(admitted.request.deadline,index*10+15000);
 }
 assert.equal(initial.requests.length,0);assert.equal(core.admitWasmRequest(state,0).reason,'capacity');
 assert.equal(core.settleWasmRequest(state,100,14999).state,state);
 const next=core.settleWasmRequest(state,100,15000);assert.equal(next.accepted,true);
 assert.equal(core.settleWasmRequest(next.state,100).accepted,false);
 assert.equal(core.admitWasmRequest(next.state,1).request.id,228);
 assert.ok(Object.isFrozen(state.requests));assert.ok(Object.isFrozen(state.requests[0]));
});

test('terminal retirement atomically clears request/waiter/open authority and cannot revive',()=>{
 let state=core.createWasmLifecycle();state=core.admitWasmRequest(state,10).state;state=core.admitWasmWaiter(state,15).state;
 state=core.beginWasmOpen(state).state;state=core.observeWasmFile(state,true);
 const end=core.retireWasmLifecycle(state);
 assert.deepEqual(end.requests,[100]);assert.deepEqual(end.waiters,[1]);assert.equal(end.state.open,null);assert.equal(end.state.hasFile,false);
 assert.equal(core.retireWasmLifecycle(end.state).accepted,false);assert.equal(core.settleWasmRequest(end.state,100).accepted,false);
 assert.equal(core.admitWasmWaiter(end.state,0).waiter,null);assert.equal(core.beginWasmOpen(end.state).reason,'unavailable');
 assert.equal(core.markWasmInitialized(end.state),end.state);assert.equal(core.settleWasmInitialization(end.state,true),end.state);
 const closed=core.finishWasmRetirement(end.state);assert.equal(closed.phase,'closed');assert.equal(core.admitWasmRequest(closed,0).reason,'unavailable');
});

test('ready versus failed initialization and worker failure notification are one way',()=>{
 const initial=core.createWasmLifecycle(),ready=core.settleWasmInitialization(initial,true),failed=core.settleWasmInitialization(initial,false);
 assert.equal(ready.phase,'ready');assert.equal(failed.phase,'failed');assert.equal(core.settleWasmInitialization(failed,true),failed);
 assert.equal(core.admitWasmRequest(failed,0).reason,'unavailable');
 const failure=core.claimWasmWorkerFailure(initial);assert.equal(failure.accepted,true);assert.equal(failure.state.phase,'failed');assert.equal(core.claimWasmWorkerFailure(failure.state).accepted,false);
 assert.equal(core.claimWasmWorkerFailure(ready).state.phase,'ready');
});

test('open lease rejects overlap and stale completion cannot clear replacement',()=>{
 const first=core.beginWasmOpen(core.createWasmLifecycle());assert.equal(first.id,1);assert.equal(core.beginWasmOpen(first.state).reason,'busy');
 const finished=core.finishWasmOpen(first.state,1),second=core.beginWasmOpen(finished);
 assert.equal(second.id,2);assert.equal(core.finishWasmOpen(second.state,1),second.state);assert.equal(core.ownsWasmOpen(second.state,1),false);
 assert.equal(core.ownsWasmOpen(second.state,2),true);assert.equal(core.ownsWasmOpen(core.retireWasmLifecycle(second.state).state,2),false);
});

test('event waits retain 25 second deadlines and targeted rejection preserves unrelated requests',()=>{
 const waited=core.admitWasmWaiter(core.createWasmLifecycle(),100);assert.equal(waited.waiter.deadline,25100);
 assert.equal(core.settleWasmWaiter(waited.state,1,25099).accepted,false);assert.equal(core.settleWasmWaiter(waited.state,1,25100).accepted,true);
 const a=core.admitWasmRequest(waited.state,0),b=core.admitWasmRequest(a.state,0),target=core.rejectWasmRequests(b.state,100);
 assert.deepEqual(target.ids,[100]);assert.deepEqual(target.state.requests.map(item=>item.id),[101]);
 assert.deepEqual(core.rejectWasmRequests(target.state).ids,[101]);assert.equal(b.state.requests.length,2);
});


test('source start and retirement atomically retire seek authority with the backend lifecycle',()=>{
 const first=core.beginWasmPlayerSeek(core.createWasmLifecycle(),10);assert.equal(first.reason,null);
 const observed=core.observeWasmPlayerSeek(first.state,{kind:'restart',eof:true});assert.equal(observed.seek.seek.restarted,true);
 const started=core.observeWasmFile(observed,true);assert.equal(started.hasFile,true);assert.equal(started.seek.seek,null);
 const second=core.beginWasmPlayerSeek(started,12),retired=core.retireWasmLifecycle(second.state).state;
 assert.equal(retired.phase,'retiring');assert.equal(retired.seek.seek,null);assert.equal(retired.hasFile,false);
 assert.equal(core.beginWasmPlayerSeek(retired,1).reason,'unavailable');assert.equal(core.observeWasmPlayerSeek(retired,{kind:'restart',eof:true}),retired);
 assert.equal(core.confirmWasmPlayerSeek(retired,second.state.seek.seek.id,12,12,true).confirmed,false);
});
