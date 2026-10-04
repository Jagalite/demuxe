// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFile} from 'node:fs/promises';
import {observeWorkerCleanup,classifyWorkerProbe,boundedObservation} from './helpers/worker-cleanup.mjs';
function fixture({probe=async()=>({url:'worker.js',now:1}),targets=[]}={}){
 const worker=Object.assign(new EventEmitter(),{url:()=> 'worker.js',evaluate:probe});let workers=[worker],time=10;
 const page=Object.assign(new EventEmitter(),{workers:()=>workers,evaluate:async()=>({owners:[{phase:'closed',iframeConnected:false,contextState:'closed'}]}),context:()=>({newCDPSession:async()=>({send:async()=>({targetInfos:targets}),detach:async()=>{}})})});
 const observer=observeWorkerCleanup(page,{chromium:true,now:()=>time});
 return{observer,page,worker,close(){time=20;workers=[];worker.emit('close');}};
}
test('listed runnable worker remains proven runnable even if target inventory is empty',async()=>{
 const f=fixture(),result=await f.observer.collect();assert.equal(result.workersAtObservation,1);assert.equal(result.workers[0].classification,'runnable');assert.equal(result.at,10);f.observer.dispose();assert.equal(f.page.listenerCount('worker'),0);assert.equal(f.worker.listenerCount('close'),0);f.close();assert.equal(result.events.length,1);
});
test('late close preserves original deadline survivor identity and records closed event',async()=>{
 let resolve;const f=fixture({probe:()=>new Promise(yes=>{resolve=yes;})}),pending=f.observer.collect();await Promise.resolve();f.close();resolve({url:'worker.js',now:1});const result=await pending;
 assert.equal(result.workersAtObservation,1);assert.equal(result.workers[0].id,1);assert.equal(result.at,10);assert.deepEqual(result.events.map(e=>[e.kind,e.at]),[['created',10],['closed',20]]);assert.equal(f.page.workers().length,0);
});
test('unavailable execution with absent target is evidence only, not zero-worker success',async()=>{
 const f=fixture({probe:async()=>{throw Error('Execution context destroyed');}}),result=await f.observer.collect();assert.equal(result.workersAtObservation,1);assert.equal(result.workers[0].classification,'execution-unavailable-target-absent');assert.equal('passed' in result,false);
});
test('rejected execution with a reported target cannot be labeled stale',async()=>{
 const f=fixture({probe:async()=>{throw Error('Execution context destroyed');},targets:[{type:'worker',url:'worker.js'}]}),result=await f.observer.collect();assert.equal(result.workers[0].classification,'target-still-reported');
});
test('bounded timeout remains indeterminate even with no target; no orphan deadline timer',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const pending=boundedObservation(()=>new Promise(()=>{}));t.mock.timers.tick(500);const result=await pending;assert.equal(result.status,'timeout');assert.equal(classifyWorkerProbe(result,false),'indeterminate');assert.equal(classifyWorkerProbe({status:'rejected'},undefined),'indeterminate');
});
test('no listed workers requires no CDP connection or liveness probe',async()=>{
 const f=fixture();f.close();f.page.context=()=>{throw Error('unnecessary CDP connection');};const result=await f.observer.collect();assert.equal(result.workersAtObservation,0);assert.deepEqual(result.workers,[]);assert.equal(result.targets.status,'unavailable');
});
test('maintained consumer gate still requires zero workers and never retries a failure',async()=>{
 const source=await readFile(new URL('./public-api-consumer.mjs',import.meta.url),'utf8');assert.match(source,/i<40&&page\.workers\(\)\.length;i\+\+\)await page\.waitForTimeout\(50\)/);assert.match(source,/assert\.equal\(page\.workers\(\)\.length,0,`Workers still alive after destroy:/);assert.doesNotMatch(source,/\bRETRY\b|trial<2|after retry/);assert.match(source,/passed:false,attempts/);
});
