// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRemuxProducer} from '../remux-producer.js';
test('producer retains a mux failure that arrives before its presentation observer is installed',async()=>{
  const error=Object.assign(Error('Malformed output'),{code:'ASSET_LOAD_FAILED'});
  let cancelled=0,disposed=0;
  const stream={done:Promise.reject(error),stats:{totalBytes:0},cancel:async()=>{cancelled++;},next:()=>{throw Error('Failed producer must not consume');}};
  const producer=createRemuxProducer(stream,{dispose:()=>disposed++});
  await new Promise(resolve=>setImmediate(resolve));
  const messages=[];producer.onmessage=({data})=>messages.push(data);
  producer.postMessage({type:'init'});
  assert.deepEqual(messages,[{type:'error',message:'Malformed output',code:'ASSET_LOAD_FAILED'}]);
  producer.terminate();assert.equal(disposed,1);assert.equal(cancelled,1);
});
