// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {StartupModules} from '../../web/generated/internal/startup-escalation.js';
import {STARTUP_ENTRY_LIMIT,STARTUP_TIMEOUT_MS} from '../../web/generated/internal/machine/startup.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const drain=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const observe=promise=>{const value={status:'pending'};promise.then(result=>Object.assign(value,{status:'fulfilled',result}),error=>Object.assign(value,{status:'rejected',error}));return value;};
/** External calls ignore AbortSignal deliberately. The harness owns physical settlement. */
function rig(t){
 let now=0,serial=0;const timers=new Map(),jobs=[],trace=[];
 const owner=new StartupModules(new URL('https://fixture.test/'));
 t.mock.method(performance,'now',()=>now);
 t.mock.method(globalThis,'setTimeout',(callback,delay)=>{const id=++serial;timers.set(id,{callback,deadline:now+delay});return id;});
 t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
 t.mock.method(globalThis,'fetch',(url,{signal})=>{const job={path:new URL(url).pathname.slice(1),signal,fetch:deferred(),reads:[],compile:undefined,cancels:[],released:0};jobs.push(job);trace.push(['fetch',job.path]);return job.fetch.promise;});
 t.mock.method(WebAssembly,'compile',data=>{const job=jobs.find(value=>value.tag===data[0]);assert.ok(job,'compile belongs to an admitted fetch');assert.equal(job.compile,undefined);job.compile=deferred();trace.push(['compile',job.path]);return job.compile.promise;});
 function response(job,{ok=true,delayedCancel=false}={}){job.tag=jobs.indexOf(job)+1;return {ok,status:ok?200:503,headers:{get(){return '1';}},body:{cancel(){const pending=deferred();job.cancels.push(pending);trace.push(['body.cancel',job.path]);if(!delayedCancel)pending.resolve();return pending.promise;},getReader(){return {read(){const pending=deferred();job.reads.push(pending);trace.push(['read',job.path]);return pending.promise;},cancel(){const pending=deferred();job.cancels.push(pending);trace.push(['reader.cancel',job.path]);if(!delayedCancel)pending.resolve();return pending.promise;},releaseLock(){job.released++;}};}}};}
 async function at(job,stage,options={}){
  if(stage==='fetch')return;
  job.fetch.resolve(response(job,options));await drain();assert.equal(job.reads.length,1);
  if(stage==='body')return;
  job.reads[0].resolve({done:false,value:Uint8Array.of(job.tag)});await drain();assert.equal(job.reads.length,2);
  job.reads[1].resolve({done:true});await drain();assert.ok(job.compile);
 }
 function advance(time){now=time;trace.push(['advance',time]);for(const [id,timer] of [...timers])if(timer.deadline<=time){timers.delete(id);timer.callback();}}
 function invariant(){assert.ok(owner.state.entries.length<=STARTUP_ENTRY_LIMIT);assert.equal(new Set(owner.state.entries.map(entry=>entry.path)).size,owner.state.entries.length);if(owner.state.stopped)assert.equal(owner.binaries.size,0);}
 return {owner,jobs,trace,timers,response,at,advance,invariant,async warm(path){trace.push(['warm',path]);const promise=owner.warm(path),outcome=observe(promise);await drain();invariant();return {promise,outcome};},async step(label,action){trace.push([label]);try{await action();await drain();invariant();}catch(error){error.stack+='\nStartup sequence receipt: '+JSON.stringify(trace);throw error;}}};
}

for(const stage of ['fetch','body','compile'])for(const retirement of ['timeout','destroy'])for(const completion of ['resolve','reject'])test(`${retirement} during ${stage}, followed by ignored-abort ${completion}`,async t=>{
 const h=rig(t),work=await h.warm('a'),job=h.jobs[0];await h.at(job,stage);
 await h.step(retirement,()=>retirement==='destroy'?h.owner.destroy():h.advance(STARTUP_TIMEOUT_MS));
 assert.equal(job.signal.aborted,true);assert.equal(work.outcome.status,'pending');assert.equal(h.owner.state.entries.length,1);
 if(retirement==='timeout')assert.equal(h.owner.warm('a'),work.promise,'retired but physically pending work is deduplicated');
 else await assert.rejects(h.owner.warm('a'));
 await h.step(`${stage}.${completion}`,()=>{
  const pending=stage==='fetch'?job.fetch:stage==='body'?job.reads[0]:job.compile;
  if(completion==='reject')pending.reject(Error('physical failure'));
  else pending.resolve(stage==='fetch'?h.response(job):stage==='body'?{done:false,value:Uint8Array.of(job.tag)}:{});
 });
 assert.equal(work.outcome.status,'rejected');assert.equal(h.owner.state.entries.length,0);assert.equal(h.owner.binaries.size,0);assert.equal(h.timers.size,0);
 if(stage==='body')assert.equal(job.released,1);
 if(retirement==='timeout'){
  const retry=await h.warm('a'),next=h.jobs[1];await h.at(next,'compile');next.compile.resolve({module:'retry'});await drain();assert.equal(retry.outcome.status,'fulfilled');assert.deepEqual(new Uint8Array(await h.owner.bytes('a')),Uint8Array.of(next.tag));
 }
 h.owner.destroy();
});

for(const stage of ['fetch','body','compile'])test(`ordinary ${stage} failure allows one shared retry and leaves other work intact`,async t=>{
 const h=rig(t),a=await h.warm('a'),b=await h.warm('b'),job=h.jobs[0];await h.at(job,stage);
 await h.step(`${stage}.reject`,()=>{(stage==='fetch'?job.fetch:stage==='body'?job.reads[0]:job.compile).reject(Error('retryable'));});
 assert.equal(a.outcome.status,'rejected');assert.equal(b.outcome.status,'pending');
 const retry=await h.warm('a');assert.equal(h.owner.warm('a'),retry.promise);assert.equal(h.jobs.length,3);
 for(const job of [h.jobs[2],h.jobs[1]]){await h.at(job,'compile');job.compile.resolve({});await drain();}
 assert.equal(retry.outcome.status,'fulfilled');assert.equal(b.outcome.status,'fulfilled');h.owner.destroy();assert.equal(h.owner.state.entries.length,0);assert.equal(h.timers.size,0);
});

for(const seed of [1,17,257,65537])test(`seed ${seed}: capacity remains charged across shuffled late fetch/body/compile settlement`,async t=>{
 const h=rig(t),work=[];for(let i=0;i<STARTUP_ENTRY_LIMIT;i++){work.push(await h.warm(`module-${i}`));await h.at(h.jobs[i],['fetch','body','compile'][i%3]);}
 assert.equal(h.jobs.length,STARTUP_ENTRY_LIMIT);for(let i=0;i<work.length;i++)assert.equal(h.owner.warm(`module-${i}`),work[i].promise);
 await assert.rejects(h.owner.warm('overflow'));h.advance(STARTUP_TIMEOUT_MS);await assert.rejects(h.owner.warm('overflow'));assert.equal(h.jobs.length,STARTUP_ENTRY_LIMIT);
 let random=seed;const order=h.jobs.map((_,i)=>i);for(let i=order.length-1;i>0;i--){random=(Math.imul(random,1664525)+1013904223)>>>0;const j=random%(i+1);[order[i],order[j]]=[order[j],order[i]];}
 for(const index of order){await h.step(`seed:${seed}/settle:${index}`,()=>{const job=h.jobs[index];if(index%3===0)job.fetch.resolve(h.response(job));else if(index%3===1)job.reads[0].resolve({done:false,value:Uint8Array.of(job.tag)});else job.compile.resolve({});});assert.equal(work[index].outcome.status,'rejected');}
 assert.equal(h.owner.state.entries.length,0);assert.equal(h.timers.size,0);const retry=await h.warm('overflow');await h.at(h.jobs.at(-1),'compile');h.jobs.at(-1).compile.resolve({});await drain();assert.equal(retry.outcome.status,'fulfilled');h.owner.destroy();
});

test('canceling a late fetch body remains charged until body cancellation physically settles',async t=>{
 const h=rig(t),work=await h.warm('a'),job=h.jobs[0];h.owner.destroy();job.fetch.resolve(h.response(job,{delayedCancel:true}));await drain();
 assert.equal(job.cancels.length,1);assert.equal(work.outcome.status,'pending');assert.equal(h.owner.state.entries.length,1);
 await h.step('body.cancel.complete',()=>job.cancels[0].resolve());assert.equal(work.outcome.status,'rejected');assert.equal(h.owner.state.entries.length,0);
});

test('HTTP failure cancels its body and retains the obligation until cancellation settles',async t=>{
 const h=rig(t),work=await h.warm('a'),job=h.jobs[0];
 await h.step('fetch.http503',()=>job.fetch.resolve(h.response(job,{ok:false,delayedCancel:true})));
 await h.step('check physical body retirement',()=>{assert.equal(job.cancels.length,1);assert.equal(work.outcome.status,'pending');assert.equal(h.owner.state.entries.length,1);});
 await h.step('body.cancel.complete',()=>job.cancels[0].resolve());assert.equal(work.outcome.status,'rejected');assert.equal(work.outcome.error.code,'ASSET_LOAD_FAILED');assert.equal(h.owner.state.entries.length,0);
});

test('early deadline rearm failure retires authority without escaping or freeing live fetch capacity',async t=>{
 const h=rig(t),work=await h.warm('a'),job=h.jobs[0],[id,timer]=[...h.timers][0];h.timers.delete(id);
 t.mock.method(globalThis,'setTimeout',()=>{throw Error('timer allocation failed');});
 await h.step('early timer callback, rearm throws',()=>assert.doesNotThrow(()=>timer.callback()));
 assert.equal(job.signal.aborted,true);assert.equal(work.outcome.status,'pending');assert.equal(h.owner.state.entries.length,1);
 job.fetch.resolve(h.response(job));await drain();assert.equal(work.outcome.status,'rejected');assert.equal(h.owner.state.entries.length,0);
});

test('HTTP cancellation rejection preserves the HTTP error and releases exactly once',async t=>{
 const h=rig(t),work=await h.warm('a'),job=h.jobs[0];job.fetch.resolve(h.response(job,{ok:false,delayedCancel:true}));await drain();
 assert.equal(work.outcome.status,'pending');assert.equal(job.cancels.length,1);
 await h.step('HTTP body.cancel.reject',()=>job.cancels[0].reject(Error('cancel failed')));
 assert.equal(work.outcome.error.code,'ASSET_LOAD_FAILED');assert.match(work.outcome.error.message,/HTTP 503/);assert.equal(h.owner.state.entries.length,0);assert.equal(job.cancels.length,1);
});
for(const cancellation of ['resolve','reject'])test(`reader failure stays charged until cancellation ${cancellation}s and preserves read error`,async t=>{
 const h=rig(t),work=await h.warm('a'),job=h.jobs[0],failure=Error('reader failed');await h.at(job,'body',{delayedCancel:true});
 await h.step('read.reject',()=>job.reads[0].reject(failure));assert.equal(job.cancels.length,1);assert.equal(work.outcome.status,'pending');assert.equal(h.owner.state.entries.length,1);assert.equal(job.released,0);
 await h.step(`reader.cancel.${cancellation}`,()=>job.cancels[0][cancellation](Error('cancel failed')));
 assert.equal(work.outcome.error,failure);assert.equal(h.owner.state.entries.length,0);assert.equal(job.released,1);assert.equal(job.cancels.length,1);
});

test('initial deadline allocation failure rejects speculation before fetch and permits retry',async t=>{
 const h=rig(t);const scheduling=t.mock.method(globalThis,'setTimeout',()=>{throw Error('timer allocation failed');});
 const work=await h.warm('a');assert.equal(work.outcome.status,'rejected');assert.equal(h.jobs.length,0);assert.equal(h.owner.state.entries.length,0);
 scheduling.mock.restore();const retry=await h.warm('a');await h.at(h.jobs[0],'compile');h.jobs[0].compile.resolve({});await drain();assert.equal(retry.outcome.status,'fulfilled');h.owner.destroy();
});
