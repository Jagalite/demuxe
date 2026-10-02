// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
const RealAbortController=globalThis.AbortController;
function install(t,name,value){const prior=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});t.after(()=>Object.defineProperty(globalThis,name,prior));}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function player(t){const p=unitPlayer();t.after(()=>p.destroy());return p;}
function drained(p){assert.equal(p.queued,0);assert.equal(p.control.operations.active,null);assert.equal(p.operationResources.size,0);}
test('controller constructor failure keeps its synchronous error and releases the reserved operation',async t=>{
 const p=player(t),failure=Error('controller unavailable');let invoked=0;install(t,'AbortController',class{constructor(){throw failure;}});assert.throws(()=>p.enqueue(async()=>invoked++),error=>error===failure);await p.queue;assert.equal(invoked,0);drained(p);
});
test('throwing undefined during acquisition is still failure, not permission to execute',async t=>{
 const p=player(t);let invoked=0;install(t,'AbortController',class{constructor(){throw undefined;}});let thrown=false;try{p.enqueue(async()=>invoked++);}catch(error){thrown=true;assert.equal(error,undefined);}assert.equal(thrown,true);await p.queue;assert.equal(invoked,0);drained(p);
});
test('controller construction reentrant enqueue preserves FIFO and the successor drain',async t=>{
 const p=player(t),calls=[];let once=true,nested;install(t,'AbortController',class{constructor(){const value=new RealAbortController();if(once){once=false;nested=p.enqueue(async()=>calls.push('inner'));}return value;}});const outer=p.enqueue(async()=>calls.push('outer'));await Promise.all([outer,nested]);await p.queue;assert.deepEqual(calls,['outer','inner']);drained(p);
});
test('controller constructor may admit a successor then throw without orphaning either slot',async t=>{
 const p=player(t),failure=Error('outer failed'),calls=[];let once=true,nested;install(t,'AbortController',class{constructor(){const value=new RealAbortController();if(once){once=false;nested=p.enqueue(async()=>calls.push('inner'));throw failure;}return value;}});assert.throws(()=>p.enqueue(async()=>calls.push('outer')),error=>error===failure);await nested;await p.queue;assert.deepEqual(calls,['inner']);drained(p);
});
test('retirement during controller construction aborts late handle and never registers stale resources',async t=>{
 const p=player(t);let once=true,closing,late,invoked=0;install(t,'AbortController',class{constructor(){const value=new RealAbortController();if(once){once=false;late=value;closing=p.close();}return value;}});const outer=p.enqueue(async()=>invoked++);await assert.rejects(outer,{code:'ABORTED'});await closing;await p.queue;assert.equal(late.signal.aborted,true);assert.equal(invoked,0);drained(p);
});
test('controller listener acquisition failure detaches partially installed listener and drains',async t=>{
 const p=player(t),failure=Error('controller listener failed');let detached=0;install(t,'AbortController',class{constructor(){const value=new RealAbortController(),add=value.signal.addEventListener.bind(value.signal),remove=value.signal.removeEventListener.bind(value.signal);value.signal.addEventListener=(...args)=>{add(...args);throw failure;};value.signal.removeEventListener=(...args)=>{detached++;remove(...args);};return value;}});assert.throws(()=>p.enqueue(async()=>assert.fail('must not run')),error=>error===failure);await p.queue;assert.equal(detached,1);drained(p);
});
test('caller listener acquisition failure removes a partially attached listener and preserves cause',async t=>{
 const p=player(t),failure=Error('caller listener failed'),caller=new RealAbortController(),add=caller.signal.addEventListener.bind(caller.signal),remove=caller.signal.removeEventListener.bind(caller.signal);let detached=0;caller.signal.addEventListener=(...args)=>{add(...args);throw failure;};caller.signal.removeEventListener=(...args)=>{detached++;remove(...args);};assert.throws(()=>p.enqueue(async()=>assert.fail('must not run'),null,caller.signal),error=>error===failure);await p.queue;assert.equal(detached,1);drained(p);caller.abort();assert.equal(p.queued,0);
});
test('caller listener acquisition can enqueue without replacing the original reserved drain',async t=>{
 const p=player(t),calls=[],caller=new RealAbortController(),add=caller.signal.addEventListener.bind(caller.signal);let nested;caller.signal.addEventListener=(...args)=>{nested=p.enqueue(async()=>calls.push('inner'));add(...args);};await p.enqueue(async()=>calls.push('outer'),null,caller.signal);await nested;await p.queue;assert.deepEqual(calls,['outer','inner']);drained(p);
});
test('listener attached after retirement reentry is removed after acquisition finishes',async t=>{
 const p=player(t),caller=new RealAbortController(),add=caller.signal.addEventListener.bind(caller.signal),remove=caller.signal.removeEventListener.bind(caller.signal);let closing,attached=0,detached=0;caller.signal.addEventListener=(...args)=>{closing=p.close();add(...args);attached++;};caller.signal.removeEventListener=(...args)=>{remove(...args);detached++;};await assert.rejects(p.enqueue(async()=>assert.fail('must not run'),null,caller.signal),{code:'ABORTED'});await closing;await p.queue;assert.equal(attached,1);assert.equal(detached,1);drained(p);
});
test('throwing caller detach rejects its result while queue bookkeeping still releases',async t=>{
 const p=player(t),caller=new RealAbortController(),failure=Error('detach failed');caller.signal.removeEventListener=()=>{throw failure;};await assert.rejects(p.enqueue(async()=>{},null,caller.signal),error=>error===failure);await p.queue;drained(p);await p.enqueue(async()=>{});await p.queue;drained(p);
});
for(const failureAt of ['constructor','listener'])test(`close ${failureAt} acquisition failure waits for cleanup and preserves a cleanup-admitted successor`,async t=>{
 const p=player(t),failure=Error('close acquisition failed'),hold=deferred(),order=[];let nested,once=true;
 const next={backend:{destroy:async()=>{}},surface:{remove(){}}},old={backend:{destroy(){order.push('dispose-old');nested=p.enqueue(async()=>{assert.equal(p.current,undefined);assert.equal(p.source,undefined);assert.equal(p.control.source.acceptedSession,null);order.push('successor');p.current=next;p.source={kind:'local',file:new File(['next'],'next.mp4')};acceptSourceIdentity(p,2);},'opening');return hold.promise;}},surface:{remove(){}}};p.current=old;p.source={kind:'local',file:new File(['old'],'old.mp4')};acceptSourceIdentity(p,1);
 install(t,'AbortController',class{constructor(){const value=new RealAbortController();if(once){once=false;if(failureAt==='constructor')throw failure;value.signal.addEventListener=()=>{throw failure;};}return value;}});
 const closing=p.close(),rejected=assert.rejects(closing,error=>error===failure);let settled=false;void closing.catch(()=>{settled=true;});await flush();assert.equal(settled,false);assert.equal(order.includes('successor'),false);hold.resolve();await rejected;await nested;await p.queue;assert.deepEqual(order,['dispose-old','successor']);assert.equal(p.current,next);assert.equal(p.sourceSerial,2);drained(p);
});
