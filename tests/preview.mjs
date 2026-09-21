// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PreviewController} from '../web/generated/preview/controller.js';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const frame=time=>({time,width:8,height:8,image:{blob:new Blob(['jpeg'])},path:'test'});
const provider=(getFrame,priority=40)=>({id:'test',priority,canHandle:()=>true,getFrame});
const aborted=promise=>assert.rejects(promise,e=>e.name==='AbortError');
test('buckets coalesce work; latest caller wins, repeated result hits cache',async()=>{
 let calls=0;const c=new PreviewController([provider(async r=>{calls++;return frame(r.time);})],{debounceMs:10});
 const first=c.getFrame({time:1.1}),reject=aborted(first),second=c.getFrame({time:1.8});
 const result=await second;await reject;assert.equal(calls,1);assert.equal(result.time,1);assert.equal(result.requestedTime,1.8);
 assert.equal((await c.getFrame({time:1.5})).cache,'hit');assert.equal(calls,1);c.destroy();
});
test('obsolete buckets stop before generation and caller abort stops running work',async()=>{
 let calls=0,cancelled=false;const c=new PreviewController([provider(r=>{calls++;return new Promise((resolve,reject)=>r.signal.addEventListener('abort',()=>{cancelled=true;reject(r.signal.reason);},{once:true}));})],{debounceMs:5});
 const one=c.getFrame({time:1}),reject=aborted(one);const abort=new AbortController();const two=c.getFrame({time:2,signal:abort.signal}),rejectTwo=aborted(two);
 await delay(20);abort.abort();await Promise.all([reject,rejectTwo]);await delay(0);assert.equal(calls,1);assert.equal(cancelled,true);assert.equal(c.diagnostics.cacheEntries,0);c.destroy();
});
test('routing declines/errors fall through; removing experimental provider preserves API',async()=>{
 const order=[];const c=new PreviewController([provider(async r=>{order.push('normal');return frame(r.time);},40),provider(async()=>{order.push('broken');throw Error('decode');},20),{id:'no',priority:10,canHandle:()=>false,getFrame:async()=>{throw Error('unreachable');}}],{debounceMs:0});
 assert.equal((await c.getFrame({time:0})).path,'test');assert.deepEqual(order,['broken','normal']);
 const remove=c.addProvider({id:'experimental',priority:30,canHandle:()=>true,getFrame:async r=>({...frame(r.time),path:'experimental'})});
 assert.equal((await c.getFrame({time:0})).path,'experimental');remove();assert.equal((await c.getFrame({time:0})).path,'test');c.setProviders([]);assert.equal(await c.getFrame({time:0}),null);c.destroy();
});
test('LRU enforces byte and entry budgets including oversized images',async()=>{
 let calls=0;const c=new PreviewController([provider(async r=>{calls++;return frame(r.time);})],{debounceMs:0,maxCacheBytes:1400,maxEntries:2});
 for(let time=0;time<20;time++){await c.getFrame({time});assert.ok(c.diagnostics.cacheBytes<=1400);assert.ok(c.diagnostics.cacheEntries<=2);}
 assert.equal((await c.getFrame({time:19})).cache,'hit');assert.equal((await c.getFrame({time:0})).cache,'miss');
 const small=new PreviewController([provider(async()=>frame(0))],{debounceMs:0,maxCacheBytes:1});await small.getFrame({time:0});assert.equal(small.diagnostics.cacheEntries,0);small.destroy();c.destroy();
});
test('uncooperative provider cannot publish stale results or spawn unbounded concurrent work',async()=>{
 let release,calls=0;const c=new PreviewController([provider(r=>{calls++;return new Promise(resolve=>{release=()=>resolve(frame(r.time));});})],{debounceMs:0});
 const first=c.getFrame({time:1}),rejected=aborted(first);await delay(10);
 const promises=[];for(let time=2;time<40;time++){const p=c.getFrame({time});promises.push(aborted(p));await delay(1);}
 c.clear();await Promise.all(promises);await rejected;assert.equal(calls,1);release();await delay(5);assert.equal(c.diagnostics.cacheEntries,0);c.destroy();
});
test('timeout, clear and destroy settle callers and source cache is invalidated',async()=>{
 const c=new PreviewController([provider(()=>new Promise(()=>{}))],{debounceMs:0,timeoutMs:15});await aborted(c.getFrame({time:0}));c.destroy();await aborted(c.getFrame({time:0}));
 const d=new PreviewController([provider(async r=>frame(r.time))],{debounceMs:0});await d.getFrame({time:0});d.clear();assert.equal((await d.getFrame({time:0})).cache,'miss');d.destroy();
});
test('invalid requests fail locally and returned metadata cannot mutate cache',async()=>{
 const c=new PreviewController([provider(async r=>frame(r.time))],{debounceMs:0});await assert.rejects(c.getFrame({time:NaN}),RangeError);
 const r=await c.getFrame({time:0});r.time=99;assert.equal((await c.getFrame({time:0})).time,0);c.destroy();
});


test('source identity and source-bound authored routing invalidate old images',async()=>{
 const {AuthoredPreviewProvider}=await import('../web/generated/preview/providers.js');
 let generated=0;const c=new PreviewController([new AuthoredPreviewProvider(async r=>({...frame(r.time),actualTime:r.time,path:'storyboard',timestampKind:'interval'}),'movie-a'),provider(async r=>{generated++;return frame(r.time);})],{debounceMs:0});
 c.setSourceIdentity('movie-a');assert.equal((await c.getFrame({time:2})).path,'storyboard');assert.equal((await c.getFrame({time:2})).cache,'hit');
 c.setSourceIdentity('movie-b');assert.equal(c.diagnostics.cacheEntries,0);const result=await c.getFrame({time:2});assert.equal(result.path,'test');assert.equal(result.sourceId,'movie-b');assert.equal(generated,1);c.destroy();
});
test('progressive updates preserve time/fidelity semantics and stop after cancellation',async()=>{
 let publish,finish;const c=new PreviewController([provider(r=>{publish=r.publish;r.publish({...frame(0),actualTime:0,temporalAccuracy:'approximate',fidelity:'full'});return new Promise(resolve=>{finish=resolve;});})],{debounceMs:0});
 const seen=[],signal=new AbortController();const work=c.request({time:2.4,signal:signal.signal,onUpdate:f=>seen.push(f)});const rejected=aborted(work);await delay(10);
 assert.equal(seen[0].actualTime,0);assert.equal(seen[0].requestedTime,2.4);assert.equal(seen[0].temporalAccuracy,'approximate');assert.equal(seen[0].fidelity,'full');
 signal.abort();publish({...frame(2),fidelity:'reduced'});finish(frame(2));await rejected;await delay(0);assert.equal(seen.length,1);assert.equal(c.diagnostics.cacheEntries,0);c.destroy();
});
test('exact intent bypasses buckets and rejects approximate providers; metrics distinguish cache work',async()=>{
 const c=new PreviewController([provider(async r=>({...frame(r.time),actualTime:r.time,temporalAccuracy:'approximate'}),10),provider(async r=>({...frame(r.time),actualTime:r.time,temporalAccuracy:'exact',fidelity:'reduced',metrics:{decodedFrames:1}}),20)],{debounceMs:0});
 const first=await c.getFrame({time:1.42,exact:true});assert.equal(first.actualTime,1.42);assert.equal(first.temporalAccuracy,'exact');assert.equal(first.fidelity,'reduced');assert.equal(first.metrics.decodedFrames,1);
 const hit=await c.getFrame({time:1.42,exact:true});assert.equal(hit.cache,'hit');assert.equal(hit.metrics.decodedFrames,null);assert.ok(hit.metrics.totalMs>=0);c.destroy();
});
test('failure diagnostics stay bounded and explicit prefetch declines while a request runs',async()=>{
 let release;const c=new PreviewController([provider(async()=>{throw Error('do not leak signed media URLs');},1),provider(r=>new Promise(resolve=>release=()=>resolve(frame(r.time))))],{debounceMs:0});
 const work=c.getFrame({time:2});await delay(10);await c.prefetch({time:3});assert.equal(c.diagnostics.requests,1);assert.equal(c.diagnostics.failures,1);assert.deepEqual(c.diagnostics.lastFailure,{provider:'test',kind:'Error'});release();await work;c.destroy();
});

test('malformed provider output and detached publications cannot corrupt the bounded cache',async()=>{
 let publish;const c=new PreviewController([provider(async r=>{publish=r.publish;r.publish({...frame(0),image:null});return {...frame(0),image:{blob:{size:NaN}},unused:new Uint8Array(100000)};},1),provider(async r=>frame(r.time),2)],{debounceMs:0});
 const result=await c.getFrame({time:0});assert.equal(result.path,'test');assert.ok(Number.isFinite(c.diagnostics.cacheBytes));assert.doesNotThrow(()=>publish({...frame(0),image:null}));c.destroy();
});

test('destroy during local decode unloads its private video and revokes its URL',async()=>{
 const {LocalVideoPreviewProvider}=await import('../web/generated/preview/providers.js');
 const originalCreate=URL.createObjectURL,originalRevoke=URL.revokeObjectURL;let urls=0,paused=0,unloaded=0;
 URL.createObjectURL=blob=>{urls++;return originalCreate(blob);};URL.revokeObjectURL=url=>{urls--;originalRevoke(url);};
 const video=Object.assign(new EventTarget(),{videoWidth:320,videoHeight:180,duration:10,currentTime:0,readyState:1,pause(){paused++;},removeAttribute(){},load(){unloaded++;}});
 Object.defineProperty(video,'src',{set(){queueMicrotask(()=>video.dispatchEvent(new Event('loadedmetadata')));}});
 const c=new PreviewController([new LocalVideoPreviewProvider(()=>new Blob(['media']),{createElement(){return video;}})],{debounceMs:0});
 try{const pending=c.getFrame({time:2}),rejected=aborted(pending);await delay(10);assert.equal(urls,1);c.destroy();await rejected;await delay(0);assert.equal(urls,0);assert.equal(paused,1);assert.equal(unloaded,1);}finally{c.destroy();URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;}
});
