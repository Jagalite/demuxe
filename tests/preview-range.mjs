// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RangeReader} from '../web/range-reader.js';
const options={url:'https://media.test/video',immutable:true,blockBytes:1024,cacheBytes:1024,identity:{size:'8192',etag:'"v1"'}};
test('preview copies resident bytes without LRU, epoch, counters or cache mutation',async()=>{
 const reader=new RangeReader(options);reader.cache.set('0',new Uint8Array([1,2,3,4]));reader.stats.cacheBytes=4;
 const before=JSON.stringify(reader.stats),keys=[...reader.cache.keys()];const result=await reader.readPreview(1n,2);result.bytes[0]=99;
 assert.deepEqual([...reader.cache.get('0')],[1,2,3,4]);assert.deepEqual([...reader.cache.keys()],keys);assert.equal(JSON.stringify(reader.stats),before);assert.equal(reader.epoch,0);assert.equal(await reader.readPreview(100n,2),null);reader.close();
});
test('preview fetch is low priority, bounded, isolated and preempted by playback reads',async()=>{
 const original=globalThis.fetch;let started,aborted=false;const start=new Promise(resolve=>started=resolve);
 globalThis.fetch=(_url,init)=>{assert.equal(init.priority,'low');started();return new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('aborted','AbortError'));}));};
 const reader=new RangeReader(options);reader.cache.set('0',new Uint8Array([7]));
 try{const preview=reader.readPreview(2048n,10,{allowFetch:true});const reject=assert.rejects(preview);await start;assert.equal(await reader.readPreview(3000n,10,{allowFetch:true}),null);
 assert.equal((await reader.read(0n,1))[0],7);await reject;assert.equal(aborted,true);assert.equal(reader.epoch,0);assert.equal(reader.cache.size,1);assert.equal(reader.stats.fetchedBytes,0);
 }finally{reader.close();globalThis.fetch=original;}
});
test('background fetch never admits bytes to playback cache; cancellation is isolated',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response(new Uint8Array(1024),{status:206,headers:{'Content-Range':'bytes 2048-3071/8192','ETag':'"v1"','Content-Length':'1024'}});
 const reader=new RangeReader(options);try{const result=await reader.readPreview(2048n,16,{allowFetch:true});assert.equal(result.bytes.length,16);assert.equal(result.path,'fetched-bytes');assert.equal(reader.cache.size,0);assert.equal(reader.stats.cacheBytes,0);
 const abort=new AbortController();abort.abort();await assert.rejects(reader.readPreview(0n,1,{signal:abort.signal}),e=>e.name==='AbortError');assert.equal(reader.closed,false);
 }finally{reader.close();globalThis.fetch=original;}
});

test('preview authorization failure never occupies playback refresh callback',async()=>{
 const original=globalThis.fetch;let refreshes=0;globalThis.fetch=async()=>new Response(null,{status:401});
 const reader=new RangeReader(options,async()=>{refreshes++;return {headers:{Authorization:'renewed'}};});
 try{await assert.rejects(reader.readPreview(2048n,16,{allowFetch:true}));assert.equal(refreshes,0);assert.equal(reader.closed,false);assert.equal(reader.epoch,0);}finally{reader.close();globalThis.fetch=original;}
});
