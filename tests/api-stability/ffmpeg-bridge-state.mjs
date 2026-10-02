// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {createFFmpegBridge} from '../../web/private-ffmpeg/bridge.js';
import * as core from '../../web/generated/internal/machine/ffmpeg-bridge.js';
const pending=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const turn=()=>new Promise(setImmediate);
const module=()=>({HEAPU8:new Uint8Array(65536),calls:[],ccall(name){this.calls.push(name);return 0;}});
const reader=size=>({size,read:async()=>new Uint8Array(1)});

test('bridge core composes execution, source ownership, shutdown and discard',()=>{
 let state=core.initialFfmpegBridge();const first=core.beginFfmpegSource(state);state=core.setFfmpegHandle(first.state,first.id,1);
 const next=core.beginFfmpegSource(state);assert.equal(core.ffmpegSourceCurrent(next.state,first.id),false);assert.equal(core.setFfmpegHandle(next.state,first.id,4),next.state);
 state=core.transitionFfmpegBridgeExecution(next.state,{type:'begin'}).state;assert.equal(core.beginFfmpegSource(state).id,null);
 state=core.beginFfmpegShutdown(state,100,5000);assert.equal(state.phase,'closing');assert.equal(core.ffmpegShutdownRemaining(state,1,5099),1);assert.equal(core.ffmpegShutdownRemaining(state,1,5100),0);
 state=core.finishFfmpegBridge(core.failFfmpegBridge(state));assert.equal(state.discard,true);assert.equal(state.phase,'failed');assert.equal(state.execution.physical,1);
});
test('healthy bridge preserves admitted ABI calls and negative native results',async()=>{
 const engine=module();engine.ccall=function(name){this.calls.push(name);return -1;};const bridge=createFFmpegBridge(engine);bridge.setSource(reader(9));
 assert.equal(await bridge.call('rm_probe','number',[],[]),-1);assert.equal(bridge.requiresDiscard,false);await assert.rejects(bridge.call('unadmitted'),/Unadmitted/);
 await bridge.destroy();assert.equal(bridge.state,'closed');assert.deepEqual(engine.calls,['rm_probe','rm_close']);const replacement=createFFmpegBridge(engine);await replacement.destroy();
});
test('invalid replacement preserves current reader and handle',async()=>{
 const engine=module(),bridge=createFFmpegBridge(engine),source=reader(10);bridge.setSource(source);const handles=bridge.source.snapshot().handles;
 assert.throws(()=>bridge.setSource({size:0}),/source|reader/i);assert.equal(bridge.source.source.reader,source);assert.equal(bridge.source.snapshot().handles,handles);await bridge.destroy();
});
test('destroy reserves shared result before cancellation callbacks',async()=>{
 const engine=module(),bridge=createFFmpegBridge(engine);let nested,cancellations=0;const cancel=bridge.source.cancelSource.bind(bridge.source);
 bridge.source.cancelSource=()=>{cancellations++;nested=bridge.destroy();cancel();};
 const result=bridge.destroy();assert.equal(nested,result);assert.equal(bridge.destroy(),result);await result;assert.equal(cancellations,1);assert.deepEqual(engine.calls,['rm_close']);
});
test('destroy joins native work before issuing close and rejects new calls',async()=>{
 const engine=module(),active=pending();engine.ccall=function(name){this.calls.push(name);return name==='rm_step'?active.promise:0;};const bridge=createFFmpegBridge(engine),work=bridge.call('rm_step'),close=bridge.destroy();
 await assert.rejects(bridge.call('rm_probe'),/closing/);assert.deepEqual(engine.calls,['rm_step']);active.resolve(4);assert.equal(await work,4);await close;assert.deepEqual(engine.calls,['rm_step','rm_close']);
});
test('unexpected native failure poisons ownership and retains original Error',async()=>{
 const engine=module(),error=Error('native crash');engine.ccall=()=>{throw error;};const bridge=createFFmpegBridge(engine);
 await assert.rejects(bridge.call('rm_probe'),value=>value===error);assert.equal(bridge.state,'failed');assert.equal(bridge.requiresDiscard,true);await assert.rejects(bridge.destroy(),value=>value===error);assert.throws(()=>createFFmpegBridge(engine),/discard/);assert.equal(engine.nonIsolatedRead(0,1,0),-1);
});
test('throwing cleanup does not skip remaining source, owner, and import retirement',async()=>{
 const engine=module(),bridge=createFFmpegBridge(engine),failure=Error('handle cleanup');bridge.setSource(reader(8));let sourceClosed=0;const close=bridge.source.close.bind(bridge.source);
 bridge.source.closeHandle=()=>{throw failure;};bridge.source.close=()=>{sourceClosed++;close();};
 await assert.rejects(bridge.destroy(),value=>value===failure);assert.equal(sourceClosed,1);assert.equal(bridge.owner.stopped,true);assert.equal(engine.nonIsolatedRead(0,1,0),-1);assert.equal(bridge.requiresDiscard,true);
});
test('nested replacement keeps the newest source and exactly one live handle',async()=>{
 const engine=module(),bridge=createFFmpegBridge(engine);bridge.setSource(reader(5));const replace=bridge.source.setSource.bind(bridge.source);let nested=false;
 bridge.source.setSource=value=>{replace(value);if(!nested){nested=true;bridge.setSource(reader(20));}};
 bridge.setSource(reader(10));assert.equal(bridge.source.source.reader.size,20);assert.equal(bridge.source.snapshot().handles,1);await bridge.destroy();
});
test('source callback destruction cannot install a late handle',async()=>{
 const engine=module(),bridge=createFFmpegBridge(engine),replace=bridge.source.setSource.bind(bridge.source);let close;
 bridge.source.setSource=value=>{replace(value);close=bridge.destroy();};bridge.setSource(reader(10));await close;assert.equal(bridge.source.snapshot().handles,0);assert.equal(bridge.state,'closed');
});
test('retirement from ccall property acquisition prevents native invocation',async()=>{
 const engine=module(),bridge=createFFmpegBridge(engine);let calls=0;Object.defineProperty(engine,'ccall',{get(){bridge.owner.close();return()=>{calls++;return 0;};}});
 await assert.rejects(bridge.call('rm_probe'),/closed|retired/);assert.equal(calls,0);await assert.rejects(bridge.destroy());
});
test('absolute shutdown deadline contains ignored work and late completion',async t=>{
 const engine=module(),active=pending(),saved={setTimeout,clearTimeout,performance};let now=0;const timers=new Set();
 globalThis.performance={now:()=>now};globalThis.setTimeout=(fn,delay)=>{const timer={fn,delay};timers.add(timer);return timer;};globalThis.clearTimeout=value=>timers.delete(value);t.after(()=>Object.assign(globalThis,saved));
 engine.ccall=function(name){this.calls.push(name);return active.promise;};const bridge=createFFmpegBridge(engine),work=bridge.call('rm_step'),workRejected=assert.rejects(work,/deadline/),close=bridge.destroy(),closeRejected=assert.rejects(close,/deadline/);
 const fire=()=>{const timer=[...timers][0];timers.delete(timer);timer.fn();};assert.equal([...timers][0].delay,5000);now=4999;fire();assert.equal([...timers][0].delay,1);now=5000;fire();await Promise.all([workRejected,closeRejected]);assert.equal(bridge.owner.state.physical,1);assert.equal(bridge.requiresDiscard,true);assert.equal(timers.size,0);
 active.resolve(0);await turn();assert.equal(bridge.owner.state.physical,null);assert.deepEqual(engine.calls,['rm_step']);assert.throws(()=>createFFmpegBridge(engine),/discard/);
});

test('shutdown clock acquisition failure retires and settles the published close result',async t=>{
 const saved=globalThis.performance,error=Error('clock failed'),engine=module(),bridge=createFFmpegBridge(engine);t.after(()=>{globalThis.performance=saved;});globalThis.performance={now(){throw error;}};
 let thrown,result;try{result=bridge.destroy();}catch(value){thrown=value;}const shared=bridge.destroy();let settled=false;shared.catch(()=>{settled=true;});await turn();assert.equal(thrown,undefined);assert.equal(result,shared);assert.equal(settled,true);assert.equal(bridge.owner.stopped,true);
});
test('opaque native rejection conversion cannot skip owner and source retirement',async()=>{
 const conversion=Error('conversion failed'),rejection={toString(){throw conversion;}},engine=module();engine.ccall=()=>Promise.reject(rejection);const bridge=createFFmpegBridge(engine);bridge.setSource({size:9,read:async()=>new Uint8Array(1)});
 await bridge.call('rm_probe').catch(()=>{});assert.equal(bridge.requiresDiscard,true);assert.equal(bridge.owner.stopped,true);assert.equal(bridge.source.snapshot().handles,0);assert.equal(engine.nonIsolatedRead(0,1,0),-1);await bridge.destroy().catch(()=>{});
});
test('shutdown clock failure during timer rearm settles ignored work',async t=>{
 const saved={performance,setTimeout,clearTimeout},timers=new Set(),failure=Error('clock rearm'),native=pending(),engine=module();let now=0,broken=false;
 globalThis.performance={now(){if(broken)throw failure;return now;}};globalThis.setTimeout=(fn,delay)=>{const timer={fn,delay};timers.add(timer);return timer;};globalThis.clearTimeout=timer=>timers.delete(timer);t.after(()=>Object.assign(globalThis,saved));
 engine.ccall=()=>native.promise;const bridge=createFFmpegBridge(engine),work=bridge.call('rm_step'),workRejected=assert.rejects(work,value=>value===failure),close=bridge.destroy(),closeRejected=assert.rejects(close,value=>value===failure);
 broken=true;const timer=[...timers][0];timers.delete(timer);timer.fn();await Promise.all([workRejected,closeRejected]);assert.equal(bridge.owner.stopped,true);assert.equal(timers.size,0);native.resolve(0);await turn();
});

test('shutdown clock observation cannot overwrite execution admitted by its callback',async t=>{
 const saved=globalThis.performance,engine=module();let release;const pending=new Promise(resolve=>{release=resolve;});engine.ccall=name=>name==='rm_step'?pending:0;const bridge=createFFmpegBridge(engine);let called=false,work;t.after(()=>{globalThis.performance=saved;});globalThis.performance={now(){if(!called){called=true;work=bridge.call('rm_step');work.catch(()=>{});}return 0;}};
 const close=bridge.destroy();close.catch(()=>{});const active=bridge.owner.state.active;release(0);await turn();globalThis.performance=saved;bridge.owner.close();await close.catch(()=>{});assert.equal(active,1);
});
