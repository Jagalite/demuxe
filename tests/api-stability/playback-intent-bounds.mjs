// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
test('combined play/seek intent admission is finite and preserves rejected identity',()=>{
 let state=initialPlayerControl();
 for(let i=0;i<128;i++){const step=transitionPlayer(state,i%2?{type:'play.request'}:{type:'seek.request',latest:true});assert.equal(step.accepted,true);state=step.state;}
 const denied=transitionPlayer(state,{type:'play.request'});assert.equal(denied.accepted,false);assert.equal(denied.state,state);
 state=transitionPlayer(state,{type:'play.settled',id:2}).state;assert.equal(transitionPlayer(state,{type:'play.request'}).accepted,true);
 const exhausted={...initialPlayerControl(),playback:{...initialPlayerControl().playback,serial:Number.MAX_SAFE_INTEGER}};
 assert.equal(transitionPlayer(exhausted,{type:'seek.request',latest:false}).accepted,false);
 const retired=transitionPlayer(initialPlayerControl(),{type:'operation.retire',terminal:true}).state;
 assert.equal(transitionPlayer(retired,{type:'play.request'}).accepted,false);
});
test('same-stack public request burst cannot retain unbounded controllers before FIFO rejection settles',async()=>{
 const p=unitPlayer(),pending=[];
 for(let i=0;i<512;i++){pending.push((i%2?p.play():p.seek(0)).catch(()=>{}));assert.ok(p.playRequests.size+p.seekRequests.size<=128);}
 assert.equal(p.playRequests.size+p.seekRequests.size,128);
 await Promise.all(pending);assert.equal(p.playRequests.size+p.seekRequests.size,0);
});
test('pause drops retired controller associations synchronously',async()=>{
 const p=unitPlayer(),pending=Array.from({length:64},()=>p.play().catch(()=>{}));
 pending.push(p.pause().catch(()=>{}));assert.equal(p.playRequests.size,0);await Promise.all(pending);
});
test('failed controller or signal acquisition rolls back only its admitted intent',t=>{
 const p=unitPlayer(),error=Error('controller unavailable');
 t.mock.method(globalThis,'AbortController',function(){throw error;});
 assert.throws(()=>p.play(),e=>e===error);assert.throws(()=>p.seek(0),e=>e===error);
 assert.equal(p.control.playback.plays.length+p.control.playback.seeks.length,0);
 t.mock.restoreAll();
 const signal={addEventListener(){throw error;},removeEventListener(){}};
 assert.throws(()=>p.seek(0,{signal}),e=>e===error);assert.equal(p.control.playback.seeks.length,0);
});
