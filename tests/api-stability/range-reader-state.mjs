// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialRangeReader,transitionRangeReader,rangePeek,rangePreviewAllowed,rangeURLAllowed} from '../../web/generated/internal/machine/range-reader.js';
const config={blockBytes:1024,cacheBytes:2048,readDeadlineMs:15000,immutable:false};
function machine(options={},identity){let state=initialRangeReader({...config,...options},identity);return{get state(){return state;},send(command){const old=state,snapshot=structuredClone(old),decision=transitionRangeReader(state,command);assert.deepEqual(old,snapshot);state=decision.state;return decision;},begin(start=0n,now=1000){const {request}=this.send({type:'begin',offset:start,capacity:1024});this.send({type:'fetch-begin',id:request.id,now});this.send({type:'request',id:request.id,now});this.send({type:'fetch-started',id:request.id});return request.id;},headers(id,range='bytes 0-1023/8192',extra={}){return this.send({type:'headers',id,status:206,range,etag:'"stable"',encoding:null,length:null,refreshAvailable:false,...extra});},cache(start,length=1024,owned=1024){const {request}=this.send({type:'begin',offset:start,capacity:1});const result=this.send({type:'cache',id:request.id,length,owned});this.send({type:'finish',id:request.id});return result;}};}
test('range admission preserves 64-bit anchored windows, inner hits and full-buffer LRU accounting',()=>{
 const m=machine(),base=2n**40n;m.cache(base);m.cache(base+2048n,4);
 assert.equal(m.state.stats.cacheBytes,2048,'a partial view retains its full allocation');
 const hit=m.send({type:'begin',offset:base+1000n,capacity:100});assert.equal(hit.hit.start,base);m.send({type:'finish',id:hit.request.id});
 const accepted=m.cache(base+4096n);assert.deepEqual(accepted.evict,[String(base+2048n)]);assert.deepEqual(m.state.cache.map(item=>item.start),[base,base+4096n]);assert.equal(m.state.stats.peakCacheBytes,2048);
 const request=m.send({type:'begin',offset:base+8192n,capacity:1}).request;m.send({type:'cache',id:request.id,length:4,owned:1024});assert.equal(m.send({type:'cache',id:request.id,length:4,owned:1024}).aborted,true);
});
test('strong representation identity is accepted from headers and rejects changed length or validator',()=>{
 const m=machine(),id=m.begin();assert.equal(m.headers(id).error,undefined);assert.equal(m.state.total,8192n);assert.equal(m.state.etag,'"stable"');
 assert.match(m.headers(id,'bytes 0-1023/9000').error,/changed length/);assert.match(m.headers(id,undefined,{etag:'"new"'}).error,/changed/);
 const unsigned=machine(),request=unsigned.begin();assert.match(unsigned.headers(request,undefined,{etag:'W/"weak"'}).error,/strong ETag/);
 const immutable=machine({immutable:true}),open=immutable.begin();assert.equal(immutable.headers(open,undefined,{etag:null}).error,undefined);assert.equal(immutable.state.etag,undefined);
});
test('partial retries resume from received bytes without extending the absolute deadline',()=>{
 const m=machine(),id=m.begin();m.headers(id);m.send({type:'chunk',id,bytes:300});assert.equal(m.send({type:'body-complete',id}).retry,true);
 const retry=m.send({type:'retry',id,retryable:true,now:1500,serverWait:0,random:.5});assert.equal(retry.wait,80);assert.equal(m.state.active.deadline,16000);
 const next=m.send({type:'request',id,now:1580});m.send({type:'fetch-started',id});assert.equal(next.offset,300n);assert.equal(next.end,1023n);m.headers(id,'bytes 300-1023/8192');
 assert.equal(m.send({type:'chunk',id,bytes:724}).copyAt,300);assert.equal(m.send({type:'body-complete',id}).complete,true);assert.equal(m.state.stats.fetchedBytes,1024);assert.equal(m.state.stats.requests,2);
});
test('absolute deadlines cover successful progress and server backoff at both configured bounds',()=>{
 for(const deadline of [15000,45000]){
  const m=machine({readDeadlineMs:deadline}),id=m.begin(0n,0);m.headers(id);m.send({type:'chunk',id,bytes:16});
  const retry=m.send({type:'retry',id,retryable:true,now:deadline-500,serverWait:60000,random:0});assert.equal(retry.wait,500);
  assert.match(m.send({type:'check',id,now:deadline}).error,/deadline/);assert.match(m.send({type:'body-complete',id}).error,/deadline/);assert.equal(m.state.cache.length,0);
 }
});
test('epoch, timeout and close retire publication before resource cleanup; stale finishes preserve a successor',()=>{
 for(const event of ['epoch','timeout','close']){
  const m=machine(),id=m.begin();m.headers(id);m.send({type:event,id});assert.ok(m.send({type:'cache',id,length:1,owned:1024}).aborted||m.state.active.expired);m.send({type:'finish',id});assert.equal(m.state.stats.activeBytes,0);assert.equal(m.state.cache.length,0);
  if(event!=='close'){const next=m.send({type:'begin',offset:2048n,capacity:1}).request;m.send({type:'finish',id});assert.equal(m.state.active.id,next.id);}
 }
});
test('preview reads inspect full resident ranges without LRU changes and keep retirement leases until cleanup',()=>{
 const m=machine({}, {size:'8192',etag:'"stable"'});m.cache(0n);m.cache(2048n);const before=m.state;
 assert.deepEqual(rangePeek(before,1n,3),{key:'0',at:1});assert.equal(rangePeek(before,1023n,2).key,undefined);assert.equal(m.state,before);
 const preview=m.send({type:'preview-begin',allowFetch:true}).previewId;assert.ok(preview);assert.equal(rangePreviewAllowed(m.state,true),false);
 m.send({type:'preview-retire'});assert.equal(m.state.preview.retired,true);assert.equal(m.send({type:'preview-begin',allowFetch:true}).previewId,undefined);
 m.send({type:'preview-finish',id:preview});const replacement=m.send({type:'preview-begin',allowFetch:true}).previewId;m.send({type:'preview-finish',id:preview});assert.equal(m.state.preview.id,replacement);
});
test('range response policy fences status, compression, ETags, byte bounds and one-shot refresh',()=>{
 const m=machine(),id=m.begin();assert.equal(m.headers(id,undefined,{status:401,refreshAvailable:true}).refresh,true);assert.match(m.headers(id,undefined,{status:401,refreshAvailable:true}).error,/401/);
 assert.match(m.headers(id,undefined,{encoding:'gzip'}).error,/Encoded/);assert.match(m.headers(id,'invalid').error,/Content-Range/);m.headers(id);assert.match(m.send({type:'chunk',id,bytes:1025}).error,/bound/);assert.equal(m.state.active.received,0);
 assert.equal(rangeURLAllowed({protocol:'https:',credentials:false,allowedOrigin:true}),true);assert.equal(rangeURLAllowed({protocol:'https:',credentials:true,allowedOrigin:true}),false);
});
