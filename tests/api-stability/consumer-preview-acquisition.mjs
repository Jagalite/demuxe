// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
const {PreviewController}=await import(process.env.PREVIEW_CONTROLLER_URL??'../../web/generated/preview/controller.js');
const {MediaView}=await import(process.env.MEDIA_VIEW_URL??'../../web/generated/integration/media-view.js');
const turn=()=>new Promise(setImmediate);
const provider={id:'fixture',priority:1,canHandle:()=>true,getFrame:async r=>({time:r.time,width:1,height:1,image:{blob:new Blob(['x'])},path:'fixture'})};
function timers(t,hook=()=>{}){
 const live=new Set(),cleared=[];let serial=0;
 t.mock.method(globalThis,'setTimeout',(callback,delay)=>{const handle={id:++serial,callback,delay};live.add(handle);hook(handle);return handle;});
 t.mock.method(globalThis,'clearTimeout',handle=>{live.delete(handle);cleared.push(handle);});
 return {live,cleared};
}
test('preview controller construction retirement releases the late controller without timers',async t=>{
 const c=new PreviewController([provider],{debounceMs:0}),Original=AbortController;let done,acquired;
 const scheduled=timers(t);t.mock.method(globalThis,'AbortController',class extends Original{constructor(){super();acquired=this;done=c.destroy();}});
 await assert.rejects(c.getFrame({time:1}),{name:'AbortError'});await done;
 assert.equal(acquired.signal.aborted,true);assert.equal(c.jobs.size,0);assert.equal(c.callers.size,0);assert.equal(scheduled.live.size,0);
});
for(const at of [1,2])test(`preview retirement during timer ${at} acquisition releases late handle and settles caller`,async t=>{
 const c=new PreviewController([provider],{debounceMs:0});let done;const scheduled=timers(t,h=>{if(h.id===at)done=c.destroy();});
 await assert.rejects(c.getFrame({time:1}),{name:'AbortError'});await done;
 assert.equal(scheduled.live.size,0);assert.equal(c.jobs.size,0);assert.equal(c.callers.size,0);
});
for(const at of [1,2])test(`preview timer ${at} acquisition failure retires reserved metadata`,async t=>{
 const failure=Error('timer acquisition'),c=new PreviewController([provider],{debounceMs:0});const scheduled=timers(t,h=>{if(h.id===at){scheduled.live.delete(h);throw failure;}});
 await assert.rejects(c.getFrame({time:1}),e=>e===failure);assert.equal(c.state.pending,null);assert.equal(c.state.caller,null);assert.equal(c.jobs.size,0);assert.equal(scheduled.live.size,0);await c.destroy();
});
test('synchronous preview job callback executes only after caller is installed',async t=>{
 const c=new PreviewController([provider],{debounceMs:0});const scheduled=timers(t,h=>{if(h.id===1)h.callback();});
 const frame=await c.getFrame({time:1});assert.equal(frame.path,'fixture');await c.destroy();assert.equal(scheduled.live.size,0);
});
test('synchronous preview deadline settles its prepublished caller',async t=>{
 let at=0;t.mock.method(performance,'now',()=>at);
 const c=new PreviewController([provider],{debounceMs:0});const scheduled=timers(t,h=>{if(h.id===2){at=10000;h.callback();}});
 await assert.rejects(c.getFrame({time:1}),{name:'AbortError'});assert.equal(c.callers.size,0);assert.equal(c.jobs.size,0);assert.equal(scheduled.live.size,0);await c.destroy();
});
test('preview partial abort-listener registration rolls back and preserves original error',async t=>{
 const c=new PreviewController([provider],{debounceMs:0}),failure=Error('listener'),listeners=new Set();const scheduled=timers(t);
 const signal={aborted:false,addEventListener(_name,fn){listeners.add(fn);throw failure;},removeEventListener(_name,fn){listeners.delete(fn);}};
 await assert.rejects(c.getFrame({time:1,signal}),e=>e===failure);assert.equal(listeners.size,0);assert.equal(scheduled.live.size,0);assert.equal(c.jobs.size,0);await c.destroy();
});
test('preview destroy publishes shared completion before cleanup reentry',async t=>{
 const c=new PreviewController([provider],{debounceMs:0}),scheduled=timers(t);let nested;
 const signal={aborted:false,addEventListener(){},removeEventListener(){nested=c.destroy();}};
 const work=c.getFrame({time:1,signal});const rejection=assert.rejects(work,{name:'AbortError'});const done=c.destroy();assert.equal(nested,done);assert.equal(c.destroy(),done);await done;await rejection;assert.equal(scheduled.live.size,0);
});
test('preview caller cleanup failure cannot orphan its promise or skip job cancellation',async t=>{
 const c=new PreviewController([provider],{debounceMs:0}),scheduled=timers(t);const failure=Error('remove');
 const signal={aborted:false,addEventListener(){},removeEventListener(){throw failure;}};
 const work=c.getFrame({time:1,signal});const rejected=assert.rejects(work,{name:'AbortError'});await c.destroy();await rejected;assert.equal(c.jobs.size,0);assert.equal(c.callers.size,0);assert.equal(scheduled.live.size,0);
});
function runtime(){
 const p=new EventTarget(),subscribers=new Set(),events=new Map();p.state=Object.freeze({sourceId:null,currentTime:0,duration:null,streamType:'unknown',playbackIntent:'pause',status:'idle',volume:1,muted:false,playbackRate:1,error:null,loop:false,buffered:null,seekable:null,pendingOperation:null});p.isDestroyed=false;
 p.subscribe=fn=>{subscribers.add(fn);fn(p.state);return()=>subscribers.delete(fn);};p.destroy=async()=>{throw Error('borrowed runtime destroyed');};
 p.addEventListener=(type,fn)=>{events.set(type,fn);};p.removeEventListener=(type,fn)=>{if(events.get(type)===fn)events.delete(type);};return {p,subscribers,events};
}
for(const at of ['seeking','seeked'])test(`MediaView constructor rolls back partially added ${at} listener and binding`,async()=>{
 const {p,subscribers,events}=runtime(),add=p.addEventListener,failure=Error('partial registration');p.addEventListener=(type,fn)=>{add(type,fn);if(type===at)throw failure;};assert.throws(()=>new MediaView(p),e=>e===failure);await turn();assert.equal(events.size,0);assert.equal(subscribers.size,0);assert.equal(p.isDestroyed,false);
});
test('MediaView disposal retires before callback reentry and attempts every cleanup',async()=>{
 const {p,subscribers,events}=runtime(),view=new MediaView(p),remove=p.removeEventListener,failure=Error('cleanup');let nested,callbacks=0;
 view.addEventListener('seeked',()=>callbacks++);p.removeEventListener=(type,fn)=>{nested=view.dispose();events.get('seeked')?.();remove(type,fn);if(type==='seeking')throw failure;};
 const done=view.dispose();assert.equal(nested,done);assert.equal(view.dispose(),done);await assert.rejects(done,e=>e===failure);assert.equal(callbacks,0);assert.equal(events.size,0);assert.equal(subscribers.size,0);
});

const {PreviewPregenerator}=await import('../../web/generated/preview/pregeneration.js');
test('pregenerator stops during timer acquisition and releases the late handle',t=>{
 let p,calls=0;const scheduled=timers(t,()=>p.stop());p=new PreviewPregenerator({every:1},1,async()=>{calls++;return 'next';});p.setDuration(5);assert.equal(scheduled.live.size,0);assert.equal(p.state.timer,null);assert.equal(p.timer,undefined);assert.equal(calls,0);
});
test('pregenerator timer failure stops only its own lease and permits explicit reset',t=>{
 const failure=Error('timer');let fail=true;const scheduled=timers(t,h=>{if(fail){fail=false;scheduled.live.delete(h);throw failure;}});const p=new PreviewPregenerator({every:1},1,async()=> 'next');assert.throws(()=>p.setDuration(5),e=>e===failure);assert.equal(p.state.timer,null);assert.equal(p.timer,undefined);p.reset();assert.equal(scheduled.live.size,1);p.stop();assert.equal(scheduled.live.size,0);
});
test('pregenerator cancellation reentry preserves its newer timer',t=>{
 const scheduled=timers(t);const p=new PreviewPregenerator({every:1},1,async()=> 'next');p.setDuration(5);const original=globalThis.clearTimeout;let once=false;
 t.mock.method(globalThis,'clearTimeout',h=>{original(h);if(!once){once=true;p.reset();}});p.reset();assert.equal(scheduled.live.size,1);assert.equal(p.timer.id,p.state.timer);p.stop();assert.equal(scheduled.live.size,0);
});

const {DemuxeMediaElement}=await import('../../web/generated/media-element/index.js');
for(const phase of ['registration','synchronization'])test(`borrowed media element rolls back failed ${phase}`,async t=>{
 const {p,events,subscribers}=runtime(),element=new DemuxeMediaElement(),failure=Error(phase);element.dispatchEvent=()=>true;
 if(phase==='registration'){const add=MediaView.prototype.addEventListener;t.mock.method(MediaView.prototype,'addEventListener',function(...args){add.apply(this,args);throw failure;});}
 else t.mock.method(MediaView.prototype,'synchronize',()=>{throw failure;});
 assert.throws(()=>element.bind(p),e=>e===failure);await turn();assert.equal(element.view,undefined);assert.equal(element.bindingState.bound,false);assert.equal(events.size,0);assert.equal(subscribers.size,0);
});
test('borrowed media element retirement during MediaView acquisition releases late subscription',async()=>{
 const {p,subscribers,events}=runtime(),element=new DemuxeMediaElement(),subscribe=p.subscribe;let done;
 p.subscribe=fn=>{const stop=subscribe(fn);done=element.dispose();return stop;};
 assert.throws(()=>element.bind(p),{code:'ABORTED'});await done;await turn();assert.equal(events.size,0);assert.equal(subscribers.size,0);assert.equal(element.view,undefined);
});
test('borrowed media element cleanup reentry joins one completion despite independent failure',async()=>{
 const {p,subscribers,events}=runtime(),element=new DemuxeMediaElement();element.dispatchEvent=()=>true;element.bind(p);let nested,stops=0;const failure=Error('stop');
 element.stops.unshift(()=>{nested=element.dispose();throw failure;},()=>stops++);
 const done=element.dispose();assert.equal(nested,done);assert.equal(element.dispose(),done);await assert.rejects(done,e=>e===failure);assert.equal(stops,1);assert.equal(events.size,0);assert.equal(subscribers.size,0);
});

const {DemuxePlayerElement}=await import('../../web/generated/player/index.js');
const {initialElementLifecycle}=await import('../../web/generated/internal/machine/element-lifecycle.js');
test('player element destroy publishes completion before reentry and attempts independent owner cleanup',async()=>{
 const element=Object.create(DemuxePlayerElement.prototype),calls=[],failure=Error('unsubscribe');let nested;
 Object.assign(element,{lifecycle:initialElementLifecycle(),cleanup:Promise.resolve(),core:{destroy(){calls.push('core');nested=element.destroy();return Promise.resolve();}},hoverPreview:{destroy(){calls.push('preview');}},unsubscribe(){calls.push('unsubscribe');throw failure;},resizeObserver:{disconnect(){calls.push('observer');}},sourceAbort:{abort(){calls.push('abort');}},rejectReady(){calls.push('ready');},resetQueue(){calls.push('queue');},view(){},updateTitle(){},$(id){return {replaceChildren(){calls.push(id);},set hidden(value){calls.push(id);}};}});
 const before=globalThis.document;globalThis.document={removeEventListener(name){calls.push(name);}};
 try{const done=element.destroy();assert.equal(nested,done);assert.equal(element.destroy(),done);await assert.rejects(done,e=>e===failure);for(const required of ['preview','unsubscribe','observer','abort','queue','core','fullscreenchange','pointerdown','surface','buffering-indicator'])assert.ok(calls.includes(required),required);assert.equal(calls.filter(x=>x==='core').length,1);assert.equal(element.core,undefined);}
 finally{if(before===undefined)delete globalThis.document;else globalThis.document=before;}
});
