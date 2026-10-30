// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installStreamWorker} from '../worker-stream.js';
test('stream worker hands one generation to the existing producer protocol and transfers owned output',async()=>{
  const sent=[],commands=[],host={postMessage:(data,transfer)=>sent.push({data,transfer})};let retired=0;
  const producer={postMessage:data=>commands.push(data),terminate:()=>retired++};
  const file=new Blob(['finite']);
  installStreamWorker(async(source,options)=>{assert.equal(source,file);assert.equal(options.target,1);return producer;},host);
  await host.onmessage({data:{type:'configure',file,target:1,sourceTracks:[]}});
  assert.deepEqual(sent[0].data,{type:'producer-ready',size:6});
  await host.onmessage({data:{type:'init'}});await host.onmessage({data:{type:'next',id:7}});
  assert.deepEqual(commands,[{type:'init'},{type:'next',id:7}]);
  const buffer=new ArrayBuffer(4);producer.onmessage({data:{type:'fragment',buffer,id:7,more:true}});
  assert.deepEqual(sent[1].transfer,[buffer]);
  await host.onmessage({data:{type:'close'}});await host.onmessage({data:{type:'close'}});
  assert.equal(retired,1);producer.onmessage({data:{type:'fragment',buffer}});assert.equal(sent.length,2);
});
test('stream worker retires a producer acquired after close without publishing readiness',async()=>{
  const sent=[],host={postMessage:data=>sent.push(data)};let complete,signal,retired=0;
  installStreamWorker((_file,options)=>{signal=options.signal;return new Promise(resolve=>{complete=resolve;});},host);
  const pending=host.onmessage({data:{type:'configure',file:new Blob(['x'])}});
  await host.onmessage({data:{type:'close'}});assert.equal(signal.aborted,true);
  complete({terminate:()=>retired++});await pending;
  assert.equal(retired,1);assert.equal(sent.length,0);
});
test('stream worker retains preflight classifications and refuses invalid acquisition ordering',async()=>{
  const sent=[],host={postMessage:data=>sent.push(data)};
  installStreamWorker(async()=>{throw Object.assign(Error('Unsupported profile'),{code:'PROVIDER_PROFILE_MISMATCH'});},host);
  await host.onmessage({data:{type:'configure',file:new Blob(['x'])}});
  assert.equal(sent[0].code,'PROVIDER_PROFILE_MISMATCH');assert.equal(sent[0].type,'error');
  const invalid=[],other={postMessage:data=>invalid.push(data)};let calls=0;
  installStreamWorker(async()=>{calls++;},other);await other.onmessage({data:{type:'next',id:1}});
  assert.equal(calls,0);assert.equal(invalid[0].code,'ASSET_LOAD_FAILED');
});
test('stream worker borrows only bounded byte reads while acquiring a remote producer',async()=>{
  const sent=[],host={postMessage:data=>sent.push(data)},producer={terminate(){},postMessage(){}};
  installStreamWorker(async source=>{
    assert.equal(source.kind,'bytes');assert.equal(source.url,undefined);
    assert.deepEqual(await source.read(1,2),new Uint8Array([4,5]));return producer;
  },host);
  const opening=host.onmessage({data:{type:'configure',source:{size:4},sourceTracks:[]}});
  assert.deepEqual(sent,[{type:'read',id:1,offset:1,length:2}]);
  await host.onmessage({data:{type:'read-result',id:1,bytes:new Uint8Array([4,5])}});await opening;
  assert.deepEqual(sent[1],{type:'producer-ready',size:4});
  await host.onmessage({data:{type:'close'}});
});
test('stream worker close settles an outstanding byte request without late readiness',async()=>{
  const sent=[],host={postMessage:data=>sent.push(data)};
  installStreamWorker(async source=>{await source.read(0,2);throw Error('Closed request unexpectedly resolved');},host);
  const opening=host.onmessage({data:{type:'configure',source:{size:2}}});
  assert.equal(sent[0].type,'read');await host.onmessage({data:{type:'close'}});await opening;
  await host.onmessage({data:{type:'read-result',id:1,bytes:new Uint8Array(2)}});assert.equal(sent.length,1);
});
test('stream worker rejects incomplete remote bytes as an acquisition protocol failure',async()=>{
  const sent=[],host={postMessage:data=>sent.push(data)};
  installStreamWorker(async source=>{await source.read(0,2);throw Error('Short source unexpectedly resolved');},host);
  const opening=host.onmessage({data:{type:'configure',source:{size:2}}});
  await host.onmessage({data:{type:'read-result',id:1,bytes:new Uint8Array(1)}});await opening;
  assert.equal(sent[1].type,'error');assert.equal(sent[1].code,'ASSET_LOAD_FAILED');
});
