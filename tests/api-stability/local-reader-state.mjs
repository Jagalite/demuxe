// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialLocalReader,transitionLocalReader} from '../../web/generated/internal/machine/local-reader.js';
function machine(options={}){let state=initialLocalReader(options.size??100n,options.cache??8,options.requests??0);return{get state(){return state;},send(command){const old=state,snapshot=structuredClone(old),decision=transitionLocalReader(state,command);assert.deepEqual(old,snapshot);state=decision.state;return decision;},read(offset,size){const {request}=this.send({type:'begin',offset,capacity:size});this.send({type:'started',id:request.id});this.send({type:'chunk',id:request.id,bytes:request.size,done:false});this.send({type:'chunk',id:request.id,bytes:0,done:true});return this.send({type:'finish',id:request.id,success:true});}};}
test('local admissions preserve exact 64-bit offsets, EOF and the single active lease',()=>{
 const m=machine({size:2n**40n+10n}),offset=2n**40n;
 const first=m.send({type:'begin',offset,capacity:100});assert.equal(first.request.offset,offset);assert.equal(first.request.size,10);
 assert.match(m.send({type:'begin',offset:0n,capacity:1}).error,/Concurrent/);
 m.send({type:'finish',id:first.request.id,success:false});
 assert.equal(m.send({type:'begin',offset:offset+10n,capacity:1}).empty,true);
 assert.equal(m.state.stats.requests,0,'only physical stream starts count against the request budget');
});
test('local LRU moves exact hits, evicts oldest entries and leaves near slices as misses',()=>{
 const m=machine();m.read(0n,4);m.read(4n,4);
 assert.equal(m.send({type:'begin',offset:0n,capacity:4}).hit,'0:4');
 const next=m.read(8n,4);assert.deepEqual(next.evict,['4:4']);assert.equal(m.state.stats.cacheBytes,8);assert.equal(m.state.stats.cacheHits,1);
 assert.ok(m.send({type:'begin',offset:1n,capacity:3}).request);
});
test('local retired chunks are accounted but cannot publish or release a replacement read',()=>{
 const m=machine(),first=m.send({type:'begin',offset:0n,capacity:4}).request;
 m.send({type:'started',id:first.id});m.send({type:'chunk',id:first.id,bytes:2,done:false});m.send({type:'epoch'});
 assert.equal(m.send({type:'chunk',id:first.id,bytes:2,done:false}).aborted,true);m.send({type:'finish',id:first.id,success:false});
 assert.equal(m.state.stats.discardedBytes,4);assert.equal(m.state.stats.cacheBytes,0);
 const second=m.send({type:'begin',offset:4n,capacity:4}).request;
 assert.equal(m.send({type:'finish',id:first.id,success:true}).aborted,true);assert.equal(m.state.active.id,second.id);
});
test('retirement during cleanup prevents complete bytes entering the cache and close is idempotent',()=>{
 for(const retirement of ['epoch','close']){
  const m=machine(),{request}=m.send({type:'begin',offset:0n,capacity:4});m.send({type:'started',id:request.id});m.send({type:'chunk',id:request.id,bytes:4,done:false});m.send({type:'chunk',id:request.id,bytes:0,done:true});m.send({type:retirement});
  const finish=m.send({type:'finish',id:request.id,success:true});assert.equal(finish.aborted,true);assert.equal(m.state.stats.discardedBytes,4);assert.equal(m.state.stats.activeBytes,0);assert.equal(m.state.cache.length,0);
  m.send({type:'close'});const closed=m.state;m.send({type:'close'});assert.equal(m.state,closed);
 }
});
test('local request limits allow resident hits and chunk bounds reject failed data',()=>{
 const m=machine({requests:1});m.read(0n,4);assert.equal(m.send({type:'begin',offset:0n,capacity:4}).hit,'0:4');assert.match(m.send({type:'begin',offset:4n,capacity:4}).error,/budget/);
 for(const bytes of [3,5]){const r=machine(),{request}=r.send({type:'begin',offset:0n,capacity:4}),chunk=r.send({type:'chunk',id:request.id,bytes,done:false});const failure=chunk.error??r.send({type:'chunk',id:request.id,bytes:0,done:true}).error;assert.match(failure,/truncated|exceeds/);r.send({type:'finish',id:request.id,success:false});assert.equal(r.state.cache.length,0);}
});
