// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialResourceLoader,transitionResourceLoader,resourceCurrent,resourceRead,resourceURLAllowed} from '../../web/generated/internal/machine/resource-loader.js';
function machine(live=false){let state=initialResourceLoader(live);return{get state(){return state;},send(command){const old=state,snapshot=structuredClone(old),result=transitionResourceLoader(state,command);assert.deepEqual(old,snapshot);state=result.state;return result;},open(bytes=4,range){const {request}=this.send({type:'open',manifest:false,...range}),id=request.id;this.send({type:'request',id});this.send({type:'fetch-started',id});this.send({type:'headers',id,status:range?206:200,encoding:null,range:range?`bytes ${range.start}-${range.end-1n}/1099511627776`:null,length:String(bytes),refreshAvailable:false});this.send({type:'chunk',id,bytes});this.send({type:'body-complete',id});return{id,handle:this.send({type:'accept',id}).handle};}};}
test('resource handles retain absolute 64-bit offsets and bounded view ranges',()=>{
 const m=machine(),start=2n**35n,{id,handle}=m.open(4,{start,end:start+4n});assert.equal(handle.total,2n**40n);
 assert.deepEqual(resourceRead(handle,false,start+1n,2),{at:1,end:3});assert.equal(resourceRead(handle,false,start+4n,2).empty,true);
 assert.match(resourceRead(handle,false,0n,2).error,/Invalid/);assert.equal(m.state.stats.retainedBytes,4);
 assert.equal(m.send({type:'accept',id}).aborted,true,'one response must not acquire two handles');
 m.send({type:'finish',id});m.send({type:'close-handle',id:handle.id});assert.equal(m.state.stats.retainedBytes,0);
});
test('resource epoch retirement precedes cleanup and stale outcomes cannot touch a successor',()=>{
 const m=machine(),first=m.send({type:'open',manifest:false}).request.id;m.send({type:'request',id:first});m.send({type:'epoch'});
 assert.equal(resourceCurrent(m.state,first),false);assert.equal(m.send({type:'headers',id:first,status:200,encoding:null,range:null,length:null,refreshAvailable:false}).aborted,true);
 assert.match(m.send({type:'open',manifest:false}).error,/Concurrent/,'physical cleanup retains its lane');m.send({type:'finish',id:first});
 const second=m.send({type:'open',manifest:false}).request.id;m.send({type:'finish',id:first});assert.equal(m.state.active.id,second);
});
test('resource refresh is one-shot and consumes one of four bounded attempts',()=>{
 const m=machine(),id=m.send({type:'open',manifest:false}).request.id;
 m.send({type:'request',id});m.send({type:'fetch-started',id});assert.equal(m.send({type:'headers',id,status:401,encoding:null,range:null,length:null,refreshAvailable:true}).refresh,true);
 m.send({type:'request',id});m.send({type:'fetch-started',id});assert.match(m.send({type:'headers',id,status:401,encoding:null,range:null,length:null,refreshAvailable:true}).error,/401/);
 for(let attempt=2;attempt<=4;attempt++){const retry=m.send({type:'retry',id,retryable:true});assert.equal(retry.retry,attempt<4);if(attempt<4){assert.equal(retry.wait,attempt*100);m.send({type:'request',id});m.send({type:'fetch-started',id});}}
 assert.equal(m.state.stats.requests,4);assert.equal(m.state.stats.retries,2);
});
test('resource truncation retries reset attempt bytes and cancellation blocks publication',()=>{
 const m=machine(),id=m.send({type:'open',manifest:false}).request.id;
 m.send({type:'request',id});m.send({type:'fetch-started',id});m.send({type:'headers',id,status:200,encoding:null,range:null,length:'4',refreshAvailable:false});m.send({type:'chunk',id,bytes:2});
 assert.equal(m.send({type:'body-complete',id}).retry,true);m.send({type:'retry',id,retryable:true});m.send({type:'request',id});m.send({type:'fetch-started',id});assert.equal(m.state.active.count,0);assert.equal(m.state.stats.fetchedBytes,2);
 m.send({type:'cancel',id});assert.equal(resourceCurrent(m.state,id),false);assert.equal(m.send({type:'accept',id}).aborted,true);m.send({type:'finish',id});assert.equal(m.state.stats.handles,0);
});
test('resource handle/count/byte budgets release independently and epochs preserve admitted handles',()=>{
 const m=machine(),first=m.open(8*1024*1024);m.send({type:'finish',id:first.id});const second=m.open(8*1024*1024);m.send({type:'finish',id:second.id});
 const id=m.send({type:'open',manifest:false}).request.id;m.send({type:'request',id});m.send({type:'fetch-started',id});m.send({type:'headers',id,status:200,encoding:null,range:null,length:'1',refreshAvailable:false});m.send({type:'chunk',id,bytes:1});assert.match(m.send({type:'body-complete',id}).error,/memory budget/);m.send({type:'finish',id});
 m.send({type:'epoch'});assert.equal(m.state.handles.length,2);m.send({type:'close-handle',id:first.handle.id});assert.equal(m.state.stats.retainedBytes,8*1024*1024);
 const closed=m.send({type:'close'});assert.deepEqual(closed.release,[second.handle.id]);assert.equal(m.state.stats.retainedBytes,0);assert.deepEqual(m.send({type:'close'}).release,[]);
});
test('resource URL policy uses captured facts and keeps credentials/origins outside diagnostics',()=>{
 const facts={length:100,protocol:'https:',credentials:false,allowedOrigin:true};assert.equal(resourceURLAllowed(facts),true);
 for(const change of [{length:4096},{protocol:'file:'},{credentials:true},{allowedOrigin:false}])assert.equal(resourceURLAllowed({...facts,...change}),false);
 assert.equal(resourceRead(undefined,true,0n,1).error,'Resource loader closed');
});
