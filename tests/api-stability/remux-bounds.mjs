// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemuxController,transitionRemuxController as controller} from '../../web/generated/internal/machine/remux-controller.js';
import {initialRemuxWorker,transitionRemuxWorker as worker} from '../../web/generated/internal/machine/remux-worker.js';
function ready(){let s=worker(initialRemuxWorker(),{type:'call',id:1,method:'boot'}).state;return worker(s,{type:'finish',id:1,success:true}).state;}
test('controller RPC capacity preserves existing work and reopens exactly one slot',()=>{
 let s=controller(initialRemuxController(),{type:'boot'}).state;const owner=s.owner.id;s=controller(s,{type:'booted',owner}).state;
 for(let i=0;i<128;i++){const d=controller(s,{type:'request',owner,method:'seek',now:0});assert.equal(d.accepted,true);s=d.state;}
 assert.equal(controller(s,{type:'request',owner,method:'open',now:0}).state,s);
 s=controller(s,{type:'reply',owner,id:s.requests[0].id}).state;
 assert.equal(controller(s,{type:'request',owner,method:'open',now:0}).state.requests.length,128);
 assert.equal(controller({...s,requestSerial:Number.MAX_SAFE_INTEGER},{type:'request',owner,method:'open',now:0}).accepted,undefined);
});
test('worker bounds both outstanding physical calls and element/refresh requests',()=>{
 let s=ready();for(let i=2;i<130;i++){const d=worker(s,{type:'call',id:i,method:'seek'});assert.equal(d.accepted,true);s=d.state;}
 assert.equal(worker(s,{type:'call',id:130,method:'seek'}).state,s);
 const done=worker(s,{type:'finish',id:2,success:true});assert.equal(done.current,false);s=done.state;
 assert.equal(worker(s,{type:'call',id:130,method:'seek'}).state.operations.length,128);
 for(let i=0;i<128;i++){const d=worker(s,{type:'request',kind:'element',now:0});assert.equal(d.accepted,true);s=d.state;}
 assert.equal(worker(s,{type:'request',kind:'element',now:0}).state,s);
 s=worker(s,{type:'deadline',kind:'element',id:s.requests[0].id,now:10000}).state;
 assert.equal(worker(s,{type:'request',kind:'element',now:0}).state.requests.length,128);
});
test('worker exhaustion never aliases IDs or epochs and shutdown still retires',()=>{
 const s=ready();assert.equal(worker({...s,serial:Number.MAX_SAFE_INTEGER},{type:'request',kind:'element',now:0}).accepted,undefined);
 for(const id of [0,-1,Infinity,Number.MAX_SAFE_INTEGER+1])assert.equal(worker(s,{type:'call',id,method:'seek'}).accepted,undefined);
 const exhausted={...s,epoch:Number.MAX_SAFE_INTEGER};assert.equal(worker(exhausted,{type:'call',id:2,method:'seek'}).accepted,undefined);
 const closed=worker(exhausted,{type:'shutdown'});assert.equal(closed.accepted,true);assert.equal(closed.state.epoch,Number.MAX_SAFE_INTEGER);assert.equal(closed.state.phase,'closing');
});

test('controller owner acquisition budget bounds detached cleanup even without acknowledgments',()=>{
 let s=initialRemuxController();for(let i=0;i<128;i++){const d=controller(s,{type:'boot'});assert.equal(d.accepted,true);s=controller(d.state,{type:'release',owner:d.owner}).state;}
 assert.equal(controller(s,{type:'boot'}).accepted,undefined);
 s=controller(s,{type:'released',owner:1}).state;const next=controller(s,{type:'boot'});assert.equal(next.accepted,true);assert.equal(next.owner,129);
 assert.equal(controller(next.state,{type:'destroy'}).accepted,true);
 assert.equal(controller({...s,operationSerial:Number.MAX_SAFE_INTEGER},{type:'begin',kind:'seek'}).accepted,undefined);
});
