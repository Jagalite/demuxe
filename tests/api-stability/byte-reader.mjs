// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createByteReader,validateByteRange,beginByteRead,completeByteRead,failByteRead,retireByteReader,closeByteReader} from '../../web/generated/internal/machine/byte-reader.js';
import {materializeSource} from '../../web/generated/sources.js';

const identity={id:'source',size:1048576};
const fresh=(options={})=>createByteReader({...identity,maxReads:32,maxBytes:1048576,ownedClose:false,...options});
const complete=(transition,length=transition.effect.length,overrides={})=>completeByteRead(transition.state,{request:transition.effect.request,chunk:transition.effect.chunk,identity,validBuffer:true,length,...overrides});

test('reader admission rejects invalid ranges before spending any budgets',()=>{
 const state=fresh();
 for(const [offset,length]of [[-1,1],[0,-1],[.5,1],[0,1.5],[NaN,1],[0,Infinity],[1048576,1],[0,1048577]]){
  assert.equal(validateByteRange(state,offset,length).code,'INVALID_ARGUMENT');const result=beginByteRead(state,identity,offset,length);assert.equal(result.state,state);assert.equal(result.effect.kind,'reject');assert.equal(result.effect.abort,false);
 }
 const retired=retireByteReader(state);assert.equal(beginByteRead(retired,identity,-1,1).effect.fault.code,'INVALID_ARGUMENT');
 assert.equal(validateByteRange(state,1048576,0),null);
});
test('short-read continuation chooses exact next offsets and counts provider calls separately from bytes',()=>{
 const initial=fresh(),first=beginByteRead(initial,identity,7,600000);assert.deepEqual(first.effect,{kind:'read',request:1,chunk:1,offset:7,length:262144});
 const second=complete(first,100000);assert.equal(second.copyAt,0);assert.equal(second.effect.offset,100007);assert.equal(second.effect.length,262144);assert.equal(second.state.reads,2);assert.equal(second.state.bytes,100000);
 const third=complete(second);assert.equal(third.copyAt,100000);assert.equal(third.effect.offset,362151);assert.equal(third.effect.length,237856);
 const done=complete(third);assert.deepEqual(done.effect,{kind:'complete',request:1});assert.equal(done.copyAt,362144);assert.equal(done.state.bytes,600000);assert.equal(done.state.reads,3);assert.equal(done.state.active,null);
 assert.equal(initial.bytes,0);assert.equal(first.state.bytes,0);assert.equal(first.state.active.received,0);
});
test('zero-length reads preserve identity validation and spend no read budget',()=>{
 const state=fresh({maxReads:0});const result=beginByteRead(state,identity,0,0);assert.equal(result.effect.kind,'complete');assert.equal(result.state.reads,0);assert.equal(result.state.bytes,0);
 const changed=beginByteRead(state,{id:'other',size:identity.size},0,0);assert.equal(changed.effect.fault.code,'SOURCE_CHANGED');assert.equal(changed.state.retired,true);
});
test('byte budget refusal does not poison a later admissible request',()=>{
 const first=beginByteRead(fresh({maxBytes:8}),identity,0,6),done=complete(first);const denied=beginByteRead(done.state,identity,10,3);
 assert.equal(denied.effect.fault.message,'Inspection byte budget exceeded');assert.equal(denied.state.retired,false);assert.equal(denied.state.failure,null);assert.equal(denied.state.reads,1);
 const next=complete(beginByteRead(denied.state,identity,10,2));assert.equal(next.state.bytes,8);assert.equal(next.state.reads,2);
});
test('short-read exhaustion counts accepted bytes and refuses the next provider call',()=>{
 const first=beginByteRead(fresh({maxReads:1}),identity,0,10),denied=complete(first,3);
 assert.equal(denied.effect.fault.message,'Source read budget exceeded');assert.equal(denied.copyAt,0);assert.equal(denied.state.bytes,3);assert.equal(denied.state.reads,1);assert.equal(denied.state.failure,null);assert.equal(denied.state.retired,false);
 assert.equal(beginByteRead(denied.state,identity,0,0).effect.kind,'complete');
});
for(const [name,change]of [['identity',{identity:{id:'changed',size:identity.size}}],['size',{identity:{id:'source',size:7}}],['nonbuffer',{validBuffer:false}],['empty',{length:0}],['oversize',{length:9}],['invalid length',{length:NaN}]])test(`reader rejects ${name} before publishing returned bytes`,()=>{
 const first=beginByteRead(fresh(),identity,0,8),result=complete(first,8,change);
 assert.equal(result.effect.fault.code,'SOURCE_CHANGED');assert.equal(result.effect.abort,true);assert.equal(result.copyAt,null);assert.equal(result.state.bytes,0);assert.equal(result.state.reads,1);assert.equal(result.state.retired,true);
 assert.equal(beginByteRead(result.state,identity,0,1).effect.fault.code,'ABORTED');
});
test('retired and obsolete completions cannot overwrite current request authority',()=>{
 const first=beginByteRead(fresh(),identity,0,8),next=complete(first,4);
 const stale=completeByteRead(next.state,{request:first.effect.request,chunk:first.effect.chunk,identity,validBuffer:true,length:4});assert.equal(stale.state,next.state);assert.equal(stale.effect.kind,'ignore');
 const retired=retireByteReader(next.state),late=completeByteRead(retired,{request:next.effect.request,chunk:next.effect.chunk,identity,validBuffer:true,length:4});assert.equal(late.effect.fault.code,'ABORTED');assert.equal(late.state.bytes,4);assert.equal(late.copyAt,null);assert.equal(late.state.failure,null);
 const duplicate=failByteRead(late.state,next.effect.request,next.effect.chunk,{code:'DECODE_FAILED',message:'late'});assert.equal(duplicate.state,late.state);assert.equal(duplicate.effect.kind,'ignore');
});
test('in-flight failure after retirement remains the first failure and owned close is issued once',()=>{
 const first=beginByteRead(fresh({ownedClose:true}),identity,0,8),closed=closeByteReader(first.state);assert.equal(closed.closeProvider,true);
 const failed=failByteRead(closed.state,first.effect.request,first.effect.chunk,{code:'NETWORK_TIMEOUT',message:'deadline'});assert.deepEqual(failed.state.failure,{code:'NETWORK_TIMEOUT',message:'deadline'});
 const again=closeByteReader(failed.state);assert.equal(again.closeProvider,false);assert.equal(again.state,failed.state);assert.equal(closeByteReader(fresh()).closeProvider,false);
 assert.equal(beginByteRead(again.state,identity,0,8).effect.fault.code,'ABORTED');
});
test('seeded short-read histories replay exactly with bounded counters and frozen prior snapshots',()=>{
 const replay=()=>{let state=fresh(),seed=24301;const states=[state];for(let request=0;request<12;request++){let step=beginByteRead(state,identity,request*23,73);while(step.effect.kind==='read'){seed=(Math.imul(seed,1664525)+1013904223)>>>0;step=complete(step,Math.min(step.effect.length,1+seed%29));states.push(step.state);}state=step.state;if(step.effect.kind==='reject')break;}return states;};
 const a=replay(),b=replay();assert.deepEqual(a,b);assert.ok(a.at(-1).reads<=32);assert.ok(a.at(-1).bytes<=1048576);
 for(const state of a){assert.ok(Object.isFrozen(state));if(state.active)assert.ok(Object.isFrozen(state.active));}assert.equal(a[0].reads,0);assert.equal(a[0].bytes,0);
 const input={...identity,maxReads:2,maxBytes:8,ownedClose:false},state=createByteReader(input);input.maxBytes=100;assert.equal(state.maxBytes,8);assert.equal(Object.isFrozen(input),false);
});
test('source shell copies provider buffers and preserves receiver and owned teardown',async()=>{
 const issued=[];let closed=0;const source={kind:'bytes',transport:'application-managed',id:'source',size:10,ownership:'owned',read:async function(offset,length){assert.equal(this,source);const bytes=new Uint8Array(Math.min(3,length)).fill(offset);issued.push(bytes);return bytes;},close(){assert.equal(this,source);closed++;}};
 const file=await materializeSource(source);for(const bytes of issued)bytes.fill(255);assert.deepEqual([...new Uint8Array(await file.arrayBuffer())],[0,0,0,3,3,3,6,6,6,9]);assert.equal(closed,1);
});
test('source shell timeout aborts the provider and never admits its late result',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let release,start,closed=0,reads=0,providerSignal;const entered=new Promise(resolve=>{start=resolve;});
 const source={kind:'bytes',transport:'application-managed',id:'source',size:8,ownership:'owned',close(){closed++;},read(offset,length,signal){reads++;providerSignal=signal;start();return new Promise(resolve=>{release=resolve;});}};
 const work=materializeSource(source),rejected=assert.rejects(work,error=>error.code==='NETWORK_TIMEOUT');await entered;t.mock.timers.tick(3000);await rejected;assert.equal(providerSignal.aborted,true);assert.equal(closed,1);release(new Uint8Array(8));await Promise.resolve();assert.equal(reads,1);assert.equal(closed,1);
});
