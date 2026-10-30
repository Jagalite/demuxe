// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installPreparationWorker} from '../worker-preparation.js';
test('worker source uses bounded byte requests and retires late responses',async()=>{
  const sent=[],host={postMessage:message=>sent.push(message)};
  installPreparationWorker(async source=>{
    assert.equal(source.kind,'bytes');
    const parts=await Promise.all([source.read(0,2),source.read(2,2)]);
    return {bytes:Array.from(parts[0]).concat(Array.from(parts[1]))};
  },host);
  const pending=host.onmessage({data:{source:{size:4},sourceTracks:[]}});
  assert.deepEqual(sent,[{type:'read',id:1,offset:0,length:2},{type:'read',id:2,offset:2,length:2}]);
  await host.onmessage({data:{type:'read-result',id:2,bytes:new Uint8Array([3,4])}});
  await host.onmessage({data:{type:'read-result',id:1,bytes:new Uint8Array([1,2])}});
  await pending;assert.deepEqual(sent[2],{ok:true,value:{bytes:[1,2,3,4]}});
  await host.onmessage({data:{type:'read-result',id:1,bytes:new Uint8Array([9,9])}});
  assert.equal(sent.length,3);
});
test('worker rejects incomplete range responses instead of publishing a prepared file',async()=>{
  const sent=[],host={postMessage:message=>sent.push(message)};
  installPreparationWorker(async source=>{await source.read(0,4);return 'invalid-success';},host);
  const pending=host.onmessage({data:{source:{size:4}}});
  await host.onmessage({data:{type:'read-result',id:1,bytes:new Uint8Array(2)}});
  await pending;assert.equal(sent[1].ok,false);assert.match(sent[1].error.message,/Invalid preparation read response/);
  assert.equal(sent[1].error.code,'ASSET_LOAD_FAILED');
});
