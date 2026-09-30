// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {CooperativeDecoderMailbox} from '../web/private-mpv/decoder-mailbox.js';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function harness(execute,options={}) {
  let wait,stop;
  const scheduler={wrapImport:(_name,fn)=>fn,onStop:fn=>{stop=fn;return()=>{};},
    park:arm=>{wait={task:{}};arm(wait);return 'parked';},readyWait:w=>{w.ready=true;}};
  const service={execute,cancel(){this.cancelled=true;}},memory=new WebAssembly.Memory({initial:2,maximum:4});
  const mailbox=new CooperativeDecoderMailbox(scheduler,service,options);mailbox.attach(memory);
  const ptr=128,header=new Int32Array(memory.buffer,ptr,16);header[4]=3;new Uint8Array(memory.buffer,ptr+80,3).set([1,2,3]);
  return {mailbox,memory,ptr,header,service,get wait(){return wait;},stop:()=>stop()};
}
test('decoder results commit on the restored task and reacquire grown memory',async()=>{
  let resolve,input;const frame={closed:0,close(){this.closed++;}},presented=[];
  const h=harness(value=>{input=value;return new Promise(r=>resolve=r);},{onFrame:value=>presented.push(value)});
  try {
    assert.equal(h.mailbox.request(h.ptr,2),'parked');await turn();
    h.header[4]=17;new Uint8Array(h.memory.buffer,h.ptr+80,3).fill(9);
    assert.deepEqual([...input.bytes],[1,2,3]);assert.equal(input.fields[4],3);
    resolve({result:1,fields:[2,2,0,1,1,1,0,0],timestamp:123456,duration:40000,frame});await turn();
    assert.equal(h.wait.ready,true);assert.equal(h.header[3],0);assert.equal(presented.length,0);
    h.memory.grow(1);assert.equal(h.wait.task.resumeAction(),1);
    const header=new Int32Array(h.memory.buffer,h.ptr,16);assert.equal(header[3],1);assert.equal(header[5],2);
    assert.equal(new DataView(h.memory.buffer,h.ptr,80).getFloat64(64,true),123456);
    assert.deepEqual(presented,[frame]);assert.equal(frame.closed,0);assert.equal(h.mailbox.snapshot().pending,0);
  } finally {h.mailbox.close();frame.close();}
});
test('cancellation revokes a ready result and closes its retained frame',async()=>{
  const frame={closed:0,close(){this.closed++;}};const h=harness(async()=>({result:1,frame}));
  try {
    h.mailbox.request(h.ptr,4);await turn();assert.equal(h.wait.ready,true);
    h.mailbox.cancel();assert.equal(frame.closed,1);assert.equal(h.wait.task.resumeAction(),-29);
    assert.equal(h.header[3],0);assert.equal(frame.closed,1);assert.equal(h.mailbox.snapshot().pending,0);
  } finally {h.mailbox.close();}
});
test('decoder deadline releases the task and rejects late frame ownership',async()=>{
  let resolve;const frame={closed:0,close(){this.closed++;}};
  const h=harness(()=>new Promise(r=>resolve=r),{timeoutMs:10});
  try {
    h.mailbox.request(h.ptr,4);await new Promise(r=>setTimeout(r,25));
    assert.equal(h.wait.ready,true);assert.equal(h.wait.task.resumeAction(),-73);
    resolve({result:1,frame});await turn();assert.equal(frame.closed,1);
    assert.equal(h.mailbox.snapshot().timeouts,1);assert.equal(h.mailbox.snapshot().timers,0);
  } finally {h.mailbox.close();}
});
test('scheduler shutdown abandons pending callbacks and closes late results',async()=>{
  let resolve;const frame={closed:0,close(){this.closed++;}};
  const h=harness(()=>new Promise(r=>resolve=r));h.mailbox.request(h.ptr,4);await turn();h.stop();
  resolve({result:1,frame});await turn();assert.equal(frame.closed,1);assert.equal(h.wait.ready,true);
  assert.equal(h.mailbox.snapshot().pending,0);assert.equal(h.mailbox.snapshot().timers,0);
});
test('malformed service results and invalid mailbox requests fail without writes',async()=>{
  const frame={closed:0,close(){this.closed++;}},h=harness(async()=>({result:1,fields:[1],frame}));
  try {
    assert.equal(h.mailbox.request(h.ptr+1,1),-29);assert.equal(h.mailbox.request(h.ptr,9),-29);
    h.header[4]=65537;assert.equal(h.mailbox.request(h.ptr,1),-29);h.header[4]=3;
    h.mailbox.request(h.ptr,4);assert.equal(h.mailbox.request(h.ptr,4),-29);await turn();
    assert.equal(h.wait.task.resumeAction(),-29);assert.equal(frame.closed,1);assert.equal(h.mailbox.snapshot().errors,1);
  } finally {h.mailbox.close();}
});
