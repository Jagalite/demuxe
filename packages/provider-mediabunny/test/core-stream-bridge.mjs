// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bridgeStreamWorker} from '../../../web/generated/internal/stream-worker.js';
function fixture(options={}){
  const sent=[],events=[];let terminations=0,closes=0;
  const raw={postMessage:(data,transfer)=>sent.push({data,transfer}),terminate:()=>terminations++};
  const worker=bridgeStreamWorker(raw,{size:1024,read:async(_at,n)=>new Uint8Array(n),check:()=>{},close:()=>closes++,...options});
  worker.onmessage=event=>events.push(event.data);
  return {worker,raw,sent,events,get terminations(){return terminations;},get closes(){return closes;}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('remote streaming RPC stays private and returns exact owned buffers',async()=>{
  const data=new Uint8Array([0,1,2,3,4,5]);
  const f=fixture({read:async(at,n)=>data.subarray(at,at+n)});
  f.raw.onmessage({data:{type:'read',id:1,offset:2,length:3}});await flush();
  assert.equal(f.events.length,0);assert.equal(f.sent.length,1);
  const value=f.sent[0].data;assert.equal(value.type,'read-result');assert.deepEqual(value.bytes,new Uint8Array([2,3,4]));assert.equal(value.bytes.buffer.byteLength,3);assert.deepEqual(f.sent[0].transfer,[value.bytes.buffer]);
  data.fill(9);assert.deepEqual(value.bytes,new Uint8Array([2,3,4]));
  f.raw.onmessage({data:{type:'fragment',id:1,buffer:new ArrayBuffer(2)}});assert.equal(f.events[0].type,'fragment');
  f.worker.terminate();f.worker.terminate();assert.equal(f.terminations,1);assert.equal(f.closes,1);
});
test('original source failure is retained and late reads cannot publish after retirement',async()=>{
  const reason=Object.assign(Error('Representation changed'),{code:'SOURCE_CHANGED'});let finish,calls=0;
  const f=fixture({read:async()=>{if(++calls===1)throw reason;return new Promise(resolve=>{finish=resolve;});}});
  f.raw.onmessage({data:{type:'read',id:1,offset:0,length:2}});f.raw.onmessage({data:{type:'read',id:2,offset:2,length:2}});await flush();
  assert.equal(f.events.length,1);assert.equal(f.events[0].error,reason);assert.equal(f.terminations,1);assert.equal(f.closes,1);
  finish(new Uint8Array(2));await flush();assert.equal(f.sent.length,0);assert.equal(f.events.length,1);
});
test('policy checks guard both requests and cached producer output',async()=>{
  for(const type of ['read','fragment']){
    const reason=Error('Policy mutated');let reads=0;
    const f=fixture({check:()=>{throw reason;},read:async()=>{reads++;return new Uint8Array(2);}});
    f.raw.onmessage({data:{type,id:1,offset:0,length:2}});await flush();
    assert.equal(reads,0);assert.equal(f.events[0].error,reason);assert.equal(f.terminations,1);
  }
});
test('malformed, duplicate and excessive worker reads fail before additional transport',async()=>{
  for(const request of [{id:0,offset:0,length:1},{id:1,offset:-1,length:1},{id:1,offset:1024,length:1},{id:1,offset:0,length:0}]){
    let reads=0;const f=fixture({read:async()=>{reads++;return new Uint8Array(1);}});
    f.raw.onmessage({data:{type:'read',...request}});await flush();assert.equal(reads,0);assert.equal(f.events[0].code,'ASSET_LOAD_FAILED');
  }
  for(const count of [2,9]){
    let reads=0;const f=fixture({read:async()=>{reads++;return new Promise(()=>{});}});
    for(let i=1;i<=count;i++)f.raw.onmessage({data:{type:'read',id:count===2?1:i,offset:0,length:1}});
    await flush();assert.equal(reads,0);assert.equal(f.events[0].code,'ASSET_LOAD_FAILED');assert.equal(f.terminations,1);
  }
});
test('per-read deadline closes transport without imposing a whole playback deadline',async()=>{
  const f=fixture({read:()=>new Promise(()=>{}),readTimeoutMs:5});
  await new Promise(resolve=>setTimeout(resolve,10));assert.equal(f.terminations,0,'idle playback owns no read deadline');
  const failed=new Promise(resolve=>{f.worker.onmessage=event=>resolve(event.data);});
  f.raw.onmessage({data:{type:'read',id:1,offset:0,length:1}});
  const event=await failed;assert.equal(event.code,'NETWORK_TIMEOUT');assert.equal(f.terminations,1);assert.equal(f.closes,1);
});
test('generation retirement discards an uncooperative in-flight source read',async()=>{
  let finish;const f=fixture({read:()=>new Promise(resolve=>{finish=resolve;})});
  f.raw.onmessage({data:{type:'read',id:1,offset:0,length:2}});await flush();f.worker.terminate();finish(new Uint8Array(2));await flush();
  assert.equal(f.events.length,0);assert.equal(f.sent.length,0);assert.equal(f.terminations,1);assert.equal(f.closes,1);
});
test('source failure between acquisition and presentation handlers is retained and delivered asynchronously once',async()=>{
  const reason=Error('Source changed during handoff'),f=fixture({check:()=>{throw reason;}});
  f.worker.onmessage=null;f.raw.onmessage({data:{type:'fragment'}});
  assert.equal(f.terminations,1);const events=[];
  f.worker.onmessage=event=>events.push(event.data);
  assert.equal(events.length,0,'the proxy must preserve asynchronous Worker delivery');
  await flush();assert.equal(events[0].error,reason);
  f.worker.onmessage=event=>events.push(event.data);await flush();assert.equal(events.length,1);
});
test('secondary retirement failure cannot replace the original transport error',async()=>{
  const reason=Error('Source permission failed'),f=fixture({read:async()=>{throw reason;},close:()=>{throw Error('Cleanup failed');}});
  f.raw.onmessage({data:{type:'read',id:1,offset:0,length:1}});await flush();
  assert.equal(f.events[0].error,reason);assert.equal(f.terminations,1);
});

test('a queued source failure follows a handler replaced during handoff',async()=>{
 const reason=Error('Source changed'),f=fixture({check:()=>{throw reason;}}),old=[],current=[];
 f.worker.onmessage=event=>old.push(event.data);f.raw.onmessage({data:{type:'fragment'}});
 f.worker.onmessage=event=>current.push(event.data);await flush();
 assert.equal(old.length,0);assert.equal(current.length,1);assert.equal(current[0].error,reason);
});
test('a queued source failure waits while the handoff has no handler',async()=>{
 const reason=Error('Source changed'),f=fixture({check:()=>{throw reason;}}),old=[],current=[];
 f.worker.onmessage=event=>old.push(event.data);f.raw.onmessage({data:{type:'fragment'}});f.worker.onmessage=null;
 await flush();assert.equal(old.length,0);f.worker.onmessage=event=>current.push(event.data);await flush();assert.equal(current.length,1);assert.equal(current[0].error,reason);
});
test('explicit worker termination suppresses queued source failure delivery',async()=>{
 const reason=Error('Source changed'),f=fixture({check:()=>{throw reason;}}),events=[];
 f.worker.onmessage=event=>events.push(event.data);f.raw.onmessage({data:{type:'fragment'}});f.worker.terminate();await flush();
 assert.deepEqual(events,[]);assert.equal(f.terminations,1);
});
