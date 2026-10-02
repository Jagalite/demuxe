// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/private-decoder-mailbox.js';
import {CooperativeDecoderMailbox} from '../../web/private-mpv/decoder-mailbox.js';
import {PrivatePlaybackHost} from '../../web/private-mpv/playback-host.js';
test('pure mailbox admits one request and requires ready before one native commit',()=>{
 const initial=core.initialDecoderMailbox(),first=core.beginDecoderRequest(initial,10,5000);assert.equal(first.state.pending.due,5010);assert.equal(core.beginDecoderRequest(first.state,20,5000).id,null);assert.equal(core.beginDecoderCommit(first.state,first.id).accepted,false);
 const ready=core.settleDecoderRequest(first.state,first.id,1),committing=core.beginDecoderCommit(ready.state,first.id);assert.equal(committing.accepted,true);assert.equal(core.decoderCommitCurrent(committing.state,first.id),true);
 const done=core.finishDecoderCommit(committing.state,first.id,true);assert.equal(done.stats.committed,1);assert.equal(done.pending,null);assert.equal(core.beginDecoderCommit(done,first.id).accepted,false);assert.equal(initial.stats.requests,0);assert.ok(Object.isFrozen(ready.state.pending));
});
test('pure early timer keeps its original absolute deadline and timeout has one outcome',()=>{
 const first=core.beginDecoderRequest(core.initialDecoderMailbox(),100,5000),early=core.cancelDecoderRequest(first.state,first.id,true,5099);assert.equal(early.remaining,1);assert.equal(early.state,first.state);
 const timeout=core.cancelDecoderRequest(first.state,first.id,true,5100);assert.equal(timeout.wake,true);assert.equal(timeout.state.stats.timeouts,1);assert.equal(timeout.state.failure,'timeout');assert.equal(timeout.state.pending.result,-73);
 const duplicate=core.cancelDecoderRequest(timeout.state,first.id,true,5200);assert.equal(duplicate.state,timeout.state);assert.equal(duplicate.accepted,false);
});
test('pure ready cancellation revokes writes but does not wake the native continuation twice',()=>{
 const first=core.beginDecoderRequest(core.initialDecoderMailbox(),0,5000),ready=core.settleDecoderRequest(first.state,first.id,1),retired=core.retireDecoderMailbox(ready.state);
 assert.equal(retired.wake,false);assert.equal(retired.state.stats.cancelled,1);const commit=core.beginDecoderCommit(retired.state,first.id);assert.equal(commit.accepted,true);assert.equal(core.decoderCommitCurrent(commit.state,first.id),false);assert.equal(core.decoderRequestResult(commit.state,first.id),-29);
 assert.equal(core.finishDecoderCommit(commit.state,first.id,true).stats.committed,0);
});
test('pure cancel during frame transfer prevents accepted completion and close bounds retired metadata',()=>{
 const first=core.beginDecoderRequest(core.initialDecoderMailbox(),0,5000),ready=core.settleDecoderRequest(first.state,first.id,1),commit=core.beginDecoderCommit(ready.state,first.id),closed=core.retireDecoderMailbox(commit.state,true);
 assert.equal(closed.state.closed,true);assert.equal(closed.state.pending.phase,'done');assert.equal(closed.state.stats.cancelled,1);assert.equal(core.decoderCommitCurrent(closed.state,first.id),false);assert.equal(core.beginDecoderRequest(closed.state,0,5000).id,null);assert.equal(core.finishDecoderCommit(closed.state,first.id,true).stats.committed,0);
});
test('pure stale result increments only late accounting and cannot replace successor metadata',()=>{
 const first=core.beginDecoderRequest(core.initialDecoderMailbox(),0,5000),done=core.finishDecoderCommit(core.beginDecoderCommit(core.settleDecoderRequest(first.state,first.id,1).state,first.id).state,first.id,true),second=core.beginDecoderRequest(done,10,5000);
 const late=core.settleDecoderRequest(second.state,first.id,99);assert.equal(late.accepted,false);assert.equal(late.state.pending,second.state.pending);assert.equal(late.state.stats.lateResults,1);assert.equal(core.failDecoderCommit(late.state,first.id,'presentation'),late.state);
});
test('pure native request and response bounds preserve exact config, packet and frame limits',()=>{
 assert.equal(core.validDecoderRequest(128,4,208),true);assert.equal(core.validDecoderRequest(129,4,1024),false);assert.equal(core.validDecoderRequest(128,7,1024),false);
 assert.equal(core.validDecoderPacket(128,1,128+80+65536,65536),true);assert.equal(core.validDecoderPacket(128,1,9e6,65537),false);assert.equal(core.validDecoderPacket(128,2,128+80+8388608,8388608),true);assert.equal(core.validDecoderPacket(128,2,9e6,8388609),false);
 const valid={result:1,fields:[2,2,0,1,1,1,0,0],timestamp:0,duration:0,pixels:'bytes',pixelBytes:1920*1080*3/2};assert.equal(core.validDecoderResponse(valid),true);
 for(const patch of [{fields:[1]},{result:2147483648},{timestamp:NaN},{duration:-1},{pixels:'invalid'},{pixelBytes:valid.pixelBytes+1}])assert.equal(core.validDecoderResponse({...valid,...patch}),false);
});
test('varied ready cancel timeout and late-result histories retain exactly one native outcome',()=>{
 let state=core.initialDecoderMailbox(),commits=0,cancels=0,timeouts=0;
 for(let i=0;i<90;i++){
  const request=core.beginDecoderRequest(state,i*100,50);state=request.state;
  if(i%3===0){state=core.cancelDecoderRequest(state,request.id,true,i*100+50).state;cancels++;timeouts++;}
  else{state=core.settleDecoderRequest(state,request.id,1).state;if(i%3===1){state=core.retireDecoderMailbox(state).state;cancels++;}else commits++;}
  const begin=core.beginDecoderCommit(state,request.id);state=core.finishDecoderCommit(begin.state,request.id,core.decoderCommitCurrent(begin.state,request.id));const settled=state;
  assert.equal(core.beginDecoderCommit(state,request.id).accepted,false);state=core.settleDecoderRequest(state,request.id,1).state;assert.equal(state.pending,null);assert.equal(settled.stats.committed,state.stats.committed);
 }
 assert.equal(state.stats.requests,90);assert.equal(state.stats.committed,commits);assert.equal(state.stats.cancelled,cancels);assert.equal(state.stats.timeouts,timeouts);assert.equal(state.stats.lateResults,90);
});
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function harness(execute,options={}){
 let wait,stop,now=0,timerSerial=0;const timers=new Map(),cleared=[],scheduler={wrapImport:(_name,fn)=>fn,onStop:fn=>{stop=fn;return()=>{};},park:arm=>{wait={task:{},ready:false,wakes:0};arm(wait);return 'parked';},readyWait:entry=>{entry.ready=true;entry.wakes++;return true;}};
 const service={execute,cancel(){}},mailbox=new CooperativeDecoderMailbox(scheduler,service,{now:()=>now,setTimer:(callback,delay)=>{const id=++timerSerial;timers.set(id,{callback,delay});return id;},clearTimer:id=>{cleared.push(id);timers.delete(id);},...options}),memory=new WebAssembly.Memory({initial:2,maximum:4}),ptr=128;mailbox.attach(memory);
 const header=new Int32Array(memory.buffer,ptr,16);header[4]=3;new Uint8Array(memory.buffer,ptr+80,3).set([1,2,3]);
 return {mailbox,memory,ptr,header,scheduler,service,timers,cleared,get wait(){return wait;},set now(value){now=value;},stop:()=>stop()};
}
const frame=()=>({closed:0,close(){this.closed++;}});
test('actual duplicate restored callback neither writes a second result nor increments committed',async()=>{
 const h=harness(async()=>({result:1}));try{h.mailbox.request(h.ptr,4);await turn();const resume=h.wait.task.resumeAction;assert.equal(resume(),1);h.header[3]=71;assert.equal(resume(),-29);assert.equal(h.header[3],71);assert.equal(h.mailbox.snapshot().committed,1);}finally{h.mailbox.close();}
});
for(const close of [false,true])test('actual presentation '+(close?'close':'cancel')+' revokes metadata publication after frame transfer',async()=>{
 const output=frame();let h;h=harness(async()=>({result:1,fields:[2,2,0,1,1,1,0,0],timestamp:123,frame:output}),{onFrame:()=>close?h.mailbox.close():h.mailbox.cancel()});
 try{h.mailbox.request(h.ptr,4);await turn();assert.equal(h.wait.task.resumeAction(),-29);assert.equal(h.header[3],0);assert.equal(h.header[5],0);assert.equal(h.mailbox.snapshot().committed,0);assert.equal(output.closed,0,'successful presentation callback owns frame even after retirement');assert.equal(h.mailbox.snapshot().pending,0);}finally{h.mailbox.close();output.close();}
});
test('actual presentation memory growth reacquires current views before committing metadata',async()=>{
 const output=frame(),h=harness(async()=>({result:1,timestamp:123,frame:output}),{onFrame:()=>h.memory.grow(1)});
 try{h.mailbox.request(h.ptr,4);await turn();assert.equal(h.wait.task.resumeAction(),1);assert.equal(new Int32Array(h.memory.buffer,h.ptr,16)[3],1);assert.equal(new DataView(h.memory.buffer,h.ptr,80).getFloat64(64,true),123);}finally{h.mailbox.close();output.close();}
});
test('actual early and stale timer callbacks cannot timeout early or clear a replacement request',async()=>{
 let resolve;const h=harness(()=>new Promise(yes=>resolve=yes));try{
  h.mailbox.request(h.ptr,4);await turn();const early=[...h.timers.values()][0].callback;h.now=4999;early();assert.equal(h.wait.ready,false);assert.equal(h.mailbox.snapshot().timeouts,0);assert.equal([...h.timers.values()].at(-1).delay,1);
  resolve({result:0});await turn();assert.equal(h.wait.task.resumeAction(),0);h.mailbox.request(h.ptr,4);await turn();const pending=h.mailbox.pending;h.now=5000;early();assert.equal(h.mailbox.pending,pending);assert.equal(h.wait.ready,false);assert.equal(h.mailbox.snapshot().timers,1);
 }finally{h.mailbox.close();}
});
test('actual decoder deadline becomes a host fatal error before native output can silently advance',async()=>{
 const h=harness(()=>new Promise(()=>{}));let calls=0;const host=new PrivatePlaybackHost({decoder:h.mailbox,source:{drainFailures:()=>[]},call:async()=>{calls++;return 0;}},{getContext:()=>({})},2,2);
 try{h.mailbox.request(h.ptr,4);await turn();h.now=5000;[...h.timers.values()][0].callback();assert.equal(h.wait.task.resumeAction(),-73);await assert.rejects(host.pump(),/Retained decoder request deadline/);assert.equal(calls,0);assert.equal(h.mailbox.snapshot().pending,0);assert.equal(h.mailbox.snapshot().timers,0);}finally{h.mailbox.close();}
});
test('actual timer scheduling failure does not issue decoder I/O and releases its parked native task',async()=>{
 let called=0;const h=harness(async()=>{called++;return {result:0};},{setTimer:()=>{throw Error('timer unavailable');}});
 try{assert.equal(h.mailbox.request(h.ptr,4),'parked');await turn();assert.equal(called,0);assert.equal(h.wait.ready,true);assert.equal(h.wait.task.resumeAction(),-29);assert.match(h.mailbox.snapshot().error,/timer unavailable/);assert.equal(h.mailbox.snapshot().timers,0);}finally{h.mailbox.close();}
});
test('actual scheduler wake exception retires response ownership and pending resources once',async()=>{
 const output=frame(),h=harness(async()=>({result:1,frame:output}));h.scheduler.readyWait=()=>{throw Error('scheduler stopped');};h.scheduler.fail=()=>{};
 h.mailbox.request(h.ptr,4);await turn();assert.equal(output.closed,1);assert.equal(h.mailbox.closed,true);assert.equal(h.mailbox.snapshot().pending,0);assert.equal(h.mailbox.snapshot().timers,0);h.mailbox.close();assert.equal(output.closed,1);
});
test('actual service cancellation can synchronously close without duplicate cleanup or late publication',async()=>{
 const output=frame(),h=harness(async()=>({result:1,frame:output}));let cancellations=0;h.service.cancel=()=>{cancellations++;h.mailbox.close();};
 h.mailbox.request(h.ptr,4);await turn();h.mailbox.cancel();assert.equal(output.closed,1);assert.equal(h.mailbox.closed,true);assert.equal(h.wait.task.resumeAction(),-29);assert.equal(h.mailbox.snapshot().committed,0);assert.equal(cancellations,2);assert.equal(h.mailbox.snapshot().cancelled,1);
});
test('actual timer cancellation failure cannot strand an accepted ready response',async()=>{
 const output=frame(),h=harness(async()=>({result:1,frame:output}),{clearTimer:()=>{throw Error('timer cleanup unavailable');}});
 try{h.mailbox.request(h.ptr,4);await turn();assert.equal(h.wait.ready,true);assert.equal(h.wait.task.resumeAction(),1);assert.equal(output.closed,1);assert.match(h.mailbox.snapshot().error,/timer cleanup unavailable/);assert.equal(h.mailbox.snapshot().pending,0);}finally{h.mailbox.close();}
});
test('actual timer cancellation failure still aborts and wakes a suspended native request',async()=>{
 let resolve,aborted=false;const output=frame(),h=harness((_input,signal)=>{signal.addEventListener('abort',()=>aborted=true);return new Promise(yes=>resolve=yes);},{clearTimer:()=>{throw Error('timer cleanup unavailable');}});
 try{h.mailbox.request(h.ptr,4);await turn();assert.doesNotThrow(()=>h.mailbox.cancel());assert.equal(aborted,true);assert.equal(h.wait.ready,true);assert.equal(h.wait.task.resumeAction(),-29);resolve({result:1,frame:output});await turn();assert.equal(output.closed,1);assert.equal(h.mailbox.snapshot().pending,0);assert.match(h.mailbox.snapshot().error,/timer cleanup unavailable/);}finally{h.mailbox.close();}
});
