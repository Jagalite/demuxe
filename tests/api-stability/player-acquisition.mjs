// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../../web/generated/unified-player.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
import {initialPromotion,transitionPromotion} from '../../web/generated/internal/machine/route-promotion.js';
const facts={automatic:true,source:true,current:true,error:false,paused:true,background:false,waiting:false,queued:0};
const turn=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function setup(t){
 const p=unitPlayer(),timers=new Map(),cleared=[];let next=0,now=0,hook,clearHook;
 p.promotionFacts=()=>facts;p.schedulePromotion=Player.prototype.schedulePromotion;
 t.mock.method(globalThis,'setTimeout',(callback,delay)=>{const handle=++next;timers.set(handle,callback);hook?.(handle,callback,delay);return handle;});
 t.mock.method(globalThis,'clearTimeout',handle=>{cleared.push(handle);timers.delete(handle);clearHook?.(handle);});
 t.mock.method(performance,'now',()=>now);
 return{p,timers,cleared,set hook(value){hook=value;},set clearHook(value){clearHook=value;},fire(){now+=200;const [id,callback]=timers.entries().next().value;timers.delete(id);callback();}};
}
test('promotion allocation rollback clears only its matching timer lease',t=>{
 const f=setup(t),failure=Error('no timer');f.hook=()=>{throw failure;};assert.throws(()=>f.p.schedulePromotion(),e=>e===failure);assert.equal(f.p.control.routing.promotion.timer,null);
 const state=transitionPromotion(initialPromotion(),{kind:'schedule',now:0,facts});assert.equal(transitionPromotion(state,{kind:'timer-failed',id:state.timer.id+1}),state);
 let active=transitionPromotion(state,{kind:'fired',id:state.timer.id,now:200,facts});active=transitionPromotion(active,{kind:'schedule',now:200,facts});const retired=transitionPromotion(active,{kind:'timer-failed',id:active.timer.id});assert.equal(retired.active,active.active);assert.equal(retired.timer,null);
});
test('late promotion timer acquisition after cancellation clears its physical handle',t=>{
 const f=setup(t);f.hook=()=>f.p.cancelPromotion();f.p.schedulePromotion();assert.equal(f.p.promotionTimer,undefined);assert.equal(f.timers.size,0);assert.equal(f.p.control.routing.promotion.timer,null);
});
test('reentrant successor timer survives previous acquisition completion and failure',t=>{
 for(const failed of [false,true]){const f=setup(t);let successor;f.hook=()=>{f.hook=null;f.p.schedulePromotion();successor=f.p.promotionTimer;if(failed)throw Error('old timer failed');};if(failed)assert.throws(()=>f.p.schedulePromotion(),/old timer failed/);else f.p.schedulePromotion();assert.equal(f.p.promotionTimer,successor);assert.equal(f.p.control.routing.promotion.timer.id,2);assert.ok(f.timers.has(successor));}
});
test('reentrant timer cancellation cleanup cannot overwrite its successor handle',t=>{
 const f=setup(t);f.p.schedulePromotion();f.clearHook=handle=>{if(handle!==undefined){f.clearHook=null;f.p.schedulePromotion();}};f.p.cancelPromotion();assert.ok(f.p.promotionTimer);assert.equal(f.timers.size,1);assert.equal(f.p.control.routing.promotion.timer.id,2);
});
test('controller acquired after retirement is aborted without enqueueing',t=>{
 const f=setup(t),original=globalThis.AbortController;let controller,queued=0;f.p.enqueue=()=>{queued++;return Promise.resolve();};
 t.mock.method(globalThis,'AbortController',function(){controller=new original();f.p.cancelPromotion();return controller;});
 f.p.schedulePromotion();f.fire();assert.equal(controller.signal.aborted,true);assert.equal(queued,0);assert.equal(f.p.promotionController,undefined);
});
test('controller allocation failure retires active promotion without escaping timer',t=>{
 const f=setup(t);t.mock.method(globalThis,'AbortController',function(){throw Error('controller failed');});f.p.schedulePromotion();assert.doesNotThrow(()=>f.fire());assert.equal(f.p.control.routing.promotion.active,null);assert.equal(f.p.promotionController,undefined);
});
test('synchronous enqueue failure releases controller and active ownership',t=>{
 const f=setup(t);let controller;f.p.enqueue=()=>{controller=f.p.promotionController;throw Error('enqueue failed');};f.p.schedulePromotion();assert.doesNotThrow(()=>f.fire());assert.equal(controller.signal.aborted,true);assert.equal(f.p.promotionController,undefined);assert.equal(f.p.control.routing.promotion.active,null);
});
test('synchronous timer delivery cannot publish an already fired handle',async t=>{
 const f=setup(t);let queued=0;f.p.enqueue=()=>{queued++;return Promise.resolve();};f.hook=(_handle,callback)=>{f.hook=null;t.mock.method(performance,'now',()=>200);callback();};f.p.schedulePromotion();assert.equal(f.p.promotionTimer,undefined);await turn();assert.equal(queued,1);assert.equal(f.p.control.routing.promotion.active,null);
});
function track(t){const f=setup(t),listeners=new Set(),aborts=new Set();let matches=false;const signal={aborted:false,addEventListener(_name,listener){aborts.add(listener);},removeEventListener(_name,listener){aborts.delete(listener);}};Object.defineProperty(f.p,'activeOperation',{get:()=>({controller:{signal}})});const backend={addEventListener(_name,listener){listeners.add(listener);},removeEventListener(_name,listener){listeners.delete(listener);}};const session={backend};f.p.current=session;acceptSourceIdentity(f.p,1);const op=f.p.dispatchControl({type:'operation.admit',kind:'switching'}).id;f.p.dispatchControl({type:'operation.start',id:op});f.p.sessionTracks=()=>[{type:'audio',id:1,selected:matches}];return{...f,backend,signal,listeners,aborts,set selected(v){matches=v;},confirm(){return f.p.confirmTrackSelection(session,undefined,'native',f.p.settings,'audio','1');}};}
test('synchronous track timeout rejects and releases the late timer without acquiring listeners',async t=>{
 const f=track(t);t.mock.method(globalThis,'setTimeout',callback=>{callback();return 99;});await assert.rejects(f.confirm(),/required track selection/);assert.ok(f.cleared.includes(99));assert.equal(f.listeners.size,0);assert.equal(f.aborts.size,0);
});
test('track listener acquisition throwing after attachment releases all acquired resources',async t=>{
 const f=track(t),failure=Error('registration failed');f.backend.addEventListener=(_name,listener)=>{f.listeners.add(listener);throw failure;};await assert.rejects(f.confirm(),e=>e===failure);assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);assert.equal(f.aborts.size,0);
});
test('abort listener acquisition throwing after attachment releases backend and timer',async t=>{
 const f=track(t),failure=Error('abort registration failed');f.signal.addEventListener=(_name,listener)=>{f.aborts.add(listener);throw failure;};await assert.rejects(f.confirm(),e=>e===failure);assert.equal(f.listeners.size,0);assert.equal(f.aborts.size,0);assert.equal(f.timers.size,0);
});
test('synchronous backend confirmation cannot leak late listener attachment or acquire abort listener',async t=>{
 const f=track(t);f.backend.addEventListener=(_name,listener)=>{f.selected=true;listener();f.listeners.add(listener);};await f.confirm();assert.equal(f.listeners.size,0);assert.equal(f.aborts.size,0);assert.equal(f.timers.size,0);
});
test('synchronous abort callback releases late attachment and ignores repeated completion',async t=>{
 const f=track(t);let abort;f.signal.addEventListener=(_name,listener)=>{abort=listener;listener();f.aborts.add(listener);};await assert.rejects(f.confirm(),/aborted/);assert.equal(f.listeners.size,0);assert.equal(f.aborts.size,0);assert.equal(f.timers.size,0);const count=f.cleared.length;abort();assert.equal(f.cleared.length,count);
});
test('track observation failure rejects and removes every listener',async t=>{
 const f=track(t),failure=Error('track observer failed');const promise=f.confirm();f.p.sessionTracks=()=>{throw failure;};[...f.listeners][0]();await assert.rejects(promise,e=>e===failure);assert.equal(f.listeners.size,0);assert.equal(f.aborts.size,0);assert.equal(f.timers.size,0);
});
test('throwing prior timer cleanup retires the newly reserved timer lease',t=>{
 const f=setup(t);f.p.schedulePromotion();f.clearHook=()=>{throw Error('clear failed');};assert.throws(()=>f.p.schedulePromotion(),/clear failed/);assert.equal(f.p.control.routing.promotion.timer,null);assert.equal(f.p.promotionTimer,undefined);
});
test('abort during an initially matching observation rejects without acquiring resources',async t=>{
 const f=track(t);f.p.sessionTracks=()=>{f.signal.aborted=true;return[{type:'audio',id:1,selected:true}];};await assert.rejects(f.confirm(),/aborted/);assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);assert.equal(f.aborts.size,0);
});
test('already selected track resolves without allocating listeners or timers',async t=>{
 const f=track(t);f.selected=true;await f.confirm();assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);assert.equal(f.aborts.size,0);
});
test('duplicate delivery of one native timer cannot allocate a second promotion controller',async t=>{
 const f=setup(t);let callback,queued=0;f.p.enqueue=()=>{queued++;return new Promise(()=>{});};f.hook=(_id,wake)=>callback=wake;f.p.schedulePromotion();f.fire();const controller=f.p.promotionController;callback();assert.equal(queued,1);assert.equal(f.p.promotionController,controller);f.p.cancelPromotion();
});
test('promotion cancellation runs every independent cleanup after timer or abort errors',t=>{
 const f=setup(t),calls=[],failure=Error('clear failed');f.p.schedulePromotion();const id=f.p.control.routing.promotion.timer.id;
 for(const change of [{kind:'fired',id,now:200,facts},{kind:'start',id,facts},{kind:'trying',id}])f.p.dispatchControl({type:'routing.promotion',change});
 f.p.promotionController={abort(){calls.push('controller');throw Error('abort failed');}};
 Object.defineProperty(f.p,'activeOperation',{get:()=>({controller:{abort(){calls.push('operation');}}})});
 Object.defineProperty(f.p,'inspection',{get:()=>({abort(){calls.push('inspection');}})});
 f.p.dispose=async()=>{calls.push('candidate');};f.clearHook=()=>{calls.push('timer');throw failure;};
 assert.throws(()=>f.p.cancelPromotion(),e=>e===failure);assert.deepEqual(calls,['timer','controller','operation','inspection','candidate']);assert.equal(f.p.promotionController,undefined);assert.equal(f.p.control.routing.promotion.active,null);
});
test('abort during timer acquisition fences all listener allocation and clears late handle',async t=>{
 const f=track(t);let registrations=0;f.backend.addEventListener=()=>{registrations++;};t.mock.method(globalThis,'setTimeout',()=>{f.signal.aborted=true;return 91;});await assert.rejects(f.confirm(),/aborted/);assert.equal(registrations,0);assert.ok(f.cleared.includes(91));
});
test('abort during backend listener acquisition fences abort listener acquisition',async t=>{
 const f=track(t);let registrations=0;f.backend.addEventListener=(_name,listener)=>{f.listeners.add(listener);f.signal.aborted=true;};f.signal.addEventListener=()=>{registrations++;};await assert.rejects(f.confirm(),/aborted/);assert.equal(registrations,0);assert.equal(f.listeners.size,0);assert.equal(f.timers.size,0);
});
test('track confirmation cleanup reentry cannot replace success with an abort',async t=>{
 const f=track(t),pending=f.confirm(),check=[...f.listeners][0];
 const remove=f.backend.removeEventListener;f.backend.removeEventListener=(...args)=>{remove(...args);check();};f.selected=true;check();await pending;
 assert.equal(f.listeners.size,0);assert.equal(f.aborts.size,0);assert.equal(f.timers.size,0);assert.equal(f.p.control.trackConfirmation.pending,null);
});
test('old confirmation cleanup cannot retire a reentrant successor lease',async t=>{
 const f=track(t),first=f.confirm(),oldCheck=[...f.listeners][0];let successor;
 const remove=f.backend.removeEventListener;f.backend.removeEventListener=(...args)=>{remove(...args);if(!successor){f.selected=false;successor=f.confirm();}};
 f.selected=true;oldCheck();await first;
 const successorId=f.p.control.trackConfirmation.pending.id;oldCheck();assert.equal(f.p.control.trackConfirmation.pending.id,successorId);
 f.selected=true;[...f.listeners][0]();await successor;assert.equal(f.p.control.trackConfirmation.pending,null);assert.equal(f.timers.size,0);assert.equal(f.listeners.size,0);
});
