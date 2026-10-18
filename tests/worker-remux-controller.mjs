// SPDX-License-Identifier: Apache-2.0
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import {WorkerRemuxController} from '../web/worker-remux-controller.js';
// Match the module origin while exercising the browser worker loader in Node.
const originalLocation=Object.getOwnPropertyDescriptor(globalThis,'location');
const originalDocument=globalThis.document;
before(()=>{
 Object.defineProperty(globalThis,'location',{configurable:true,value:new URL(import.meta.url)});
 globalThis.document={body:{append(){}},createElement:()=>({contentWindow:{get Worker(){return globalThis.Worker;}},setAttribute(){},remove(){this.removed=true;}})};
});
after(()=>{if(originalLocation)Object.defineProperty(globalThis,'location',originalLocation);else delete globalThis.location;if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;});
class WorkerStub extends EventTarget {
 constructor(){super();this.messages=[];this.terminated=false;}
 postMessage(message){this.messages.push(message);}
 terminate(){this.terminated=true;}
 send(data){this.onmessage?.({data});this.dispatchEvent(new MessageEvent('message',{data}));}
}
function video(){return {paused:true,buffered:{length:0},getVideoPlaybackQuality:()=>({}),play(){this.paused=false;this.plays=(this.plays??0)+1;return Promise.resolve();},pause(){this.paused=true;},removeAttribute(){},load(){}};}
// Allocate through production boot so the worker and its owning document share
// the core's live owner identity. Physical handles alone do not grant authority.
async function bootController(t){
 const original=Object.getOwnPropertyDescriptor(globalThis,'Worker');
 Object.defineProperty(globalThis,'Worker',{configurable:true,writable:true,value:WorkerStub});
 t.after(()=>{if(original)Object.defineProperty(globalThis,'Worker',original);else delete globalThis.Worker;});
 const owner=new WorkerRemuxController(video(),{},()=>{}),boot=owner.boot(),worker=owner.worker;
 t.after(async()=>{const destroyed=owner.destroy();worker.send({type:'closed'});await destroyed;});
 const request=worker.messages.find(message=>message.type==='call'&&message.method==='boot');assert.ok(request);
 worker.send({type:'reply',id:request.id});await boot;
 return{owner,worker,documentOwner:owner.workerOwner};
}
test('destroy waits for an already pending error shutdown',async t=>{
 const {owner,worker,documentOwner}=await bootController(t);
 owner.abort(Error('owner failed'));let finished=false;const destroyed=owner.destroy().then(()=>{finished=true;});
 await new Promise(r=>setImmediate(r));assert.equal(finished,false);assert.equal(worker.terminated,false);assert.equal(documentOwner.removed,undefined);assert.ok(worker.messages.some(message=>message.type==='shutdown'));
 worker.send({type:'closed'});await destroyed;assert.equal(worker.terminated,true);assert.equal(documentOwner.removed,true);
});
for(const shutdown of ['acknowledged','timeout'])test(`destroy drains before detachment and bounds missing shutdown (${shutdown})`,async t=>{
 if(shutdown==='timeout')t.mock.timers.enable({apis:['setTimeout']});
 const {owner,worker,documentOwner}=await bootController(t),handle={owner:'retiring'},events=[];
 worker.send({type:'element',operation:'attach',handle});assert.equal(owner.video.srcObject,handle);
 const terminate=worker.terminate.bind(worker),remove=documentOwner.remove.bind(documentOwner),post=worker.postMessage.bind(worker);
 const load=owner.video.load.bind(owner.video);owner.video.load=()=>{assert.equal(owner.video.srcObject,null);events.push('reset');load();};
 worker.postMessage=message=>{if(message.type==='shutdown'){assert.equal(owner.video.srcObject,handle,'Keep the media attached while the worker drains');events.push('shutdown');}post(message);};
 worker.terminate=()=>{assert.equal(owner.video.srcObject,null,'MSE handle must be detached before worker termination');events.push('terminate');terminate();};
 documentOwner.remove=()=>{assert.equal(owner.video.srcObject,null);events.push('remove');remove();};
 const destroyed=owner.destroy();if(shutdown==='acknowledged'){worker.send({type:'detach'});worker.send({type:'closed'});}else t.mock.timers.tick(1000);await destroyed;
 assert.deepEqual(events.slice(0,4),['shutdown','reset','terminate','remove']);assert.equal(owner.control.cleanupFailures,0);
});
test('retiring a worker preserves a successor MSE handle',async t=>{
 const {owner,worker}=await bootController(t),oldHandle={},successor={};
 worker.send({type:'element',operation:'attach',handle:oldHandle});
 owner.video.srcObject=successor;let resets=0;owner.video.load=()=>{resets++;};const released=owner.release();
 worker.send({type:'closed'});await released;
 assert.equal(owner.video.srcObject,successor);assert.equal(resets,0);assert.equal(worker.terminated,true);
});
test('retiring a worker does not reset a replacement attached during detachment',async t=>{
 const {owner,worker}=await bootController(t),oldHandle={},successor={};
 worker.send({type:'element',operation:'attach',handle:oldHandle});let value=oldHandle,resets=0;
 Object.defineProperty(owner.video,'srcObject',{get:()=>value,set:next=>{value=next===null?successor:next;}});
 owner.video.load=()=>{resets++;};const released=owner.release();worker.send({type:'closed'});await released;
 assert.equal(value,successor);assert.equal(resets,0);
});
test('concurrent destroy calls wait for the same worker-tree teardown',async t=>{
 const {owner,worker,documentOwner}=await bootController(t);
 const first=owner.destroy(),second=owner.destroy();assert.equal(first,second);
 assert.equal(documentOwner.removed,undefined);assert.equal(worker.messages.filter(message=>message.type==='shutdown').length,1);worker.send({type:'closed'});await second;
 assert.equal(worker.terminated,true);assert.equal(documentOwner.removed,true);
});
test('shutdown timeout removes the worker owning document',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {owner,worker,documentOwner}=await bootController(t);
 const done=owner.destroy();t.mock.timers.tick(999);assert.equal(worker.terminated,false);assert.equal(documentOwner.removed,undefined);t.mock.timers.tick(1);await done;
 assert.equal(worker.terminated,true);assert.equal(documentOwner.removed,true);
});
test('a shutdown transport error still removes the owner',async t=>{
 const {owner,worker,documentOwner}=await bootController(t);
 worker.postMessage=()=>{throw Error('closed transport');};
 await owner.destroy();assert.equal(worker.terminated,true);assert.equal(documentOwner.removed,true);
});
for(const fallbackFails of [false,true])test(`worker construction failure removes its document before fallback (failure: ${fallbackFails})`,async()=>{
 const Original=globalThis.Worker;globalThis.Worker=class {constructor(){throw Error('blocked');}};
 const create=document.createElement;let frame,opened=0,destroyed=0;document.createElement=()=>frame=create();
 const fallbackError=Error('local fallback failed'),result={duration:12};
 const owner=new WorkerRemuxController(video(),{},()=>{
  assert.equal(frame.removed,true,'Failed worker document must be released before fallback acquisition');
  return{open:async()=>{opened++;assert.equal(frame.removed,true);if(fallbackFails)throw fallbackError;return result;},destroy:async()=>{destroyed++;}};
 });
 try{
  const opening=owner.open({kind:'local'});
  if(fallbackFails)await assert.rejects(opening,error=>error===fallbackError);else assert.equal(await opening,result);
  assert.equal(opened,1);assert.equal(frame.removed,true);assert.equal(owner.workerOwner,undefined);assert.equal(owner.resourceOwner,undefined);
  await owner.destroy();assert.equal(destroyed,1);
 }finally{globalThis.Worker=Original;document.createElement=create;await owner.destroy();}
});
test('a delayed recovery play request cannot override a user pause',async()=>{
 const Original=globalThis.Worker;globalThis.Worker=WorkerStub;
 const element=video(),owner=new WorkerRemuxController(element,{},()=>{});
 try{
  const boot=owner.boot(),worker=owner.worker;worker.send({type:'reply',id:worker.messages.find(m=>m.method==='boot').id});await boot;
  await owner.play();owner.pause();worker.send({type:'element',operation:'play',id:99});await new Promise(r=>setImmediate(r));
  assert.equal(element.paused,true);assert.equal(element.plays,1);assert.ok(worker.messages.some(m=>m.type==='playback-intent'&&m.playing===false));
  assert.ok(worker.messages.some(m=>m.type==='element-result'&&m.id===99));
 }finally{const worker=owner.worker,destroyed=owner.destroy();worker?.send({type:'closed'});await destroyed;globalThis.Worker=Original;}
});

test('pausing an in-flight recovery play acknowledges cancellation without a playback error',async()=>{
 const Original=globalThis.Worker;globalThis.Worker=WorkerStub;
 const element=video(),owner=new WorkerRemuxController(element,{},()=>{});let rejectPlay;
 try{
  const boot=owner.boot(),worker=owner.worker;worker.send({type:'reply',id:worker.messages.find(m=>m.method==='boot').id});await boot;
  element.play=()=>new Promise((resolve,reject)=>{rejectPlay=reject;});
  worker.send({type:'element',operation:'play',id:7});owner.pause();rejectPlay(new DOMException('Interrupted by pause','AbortError'));
  await new Promise(r=>setImmediate(r));const reply=worker.messages.find(m=>m.type==='element-result'&&m.id===7);assert.ok(reply);assert.equal(reply.error,undefined);
 }finally{const worker=owner.worker,destroyed=owner.destroy();worker?.send({type:'closed'});await destroyed;globalThis.Worker=Original;}
});

test('duplicate drain messages cannot detach a successor attachment',async t=>{
 const {owner,worker}=await bootController(t),handle={},successor={};worker.send({type:'element',operation:'attach',handle});let resets=0;owner.video.load=()=>{resets++;};const closing=owner.release();worker.send({type:'detach'});assert.equal(owner.video.srcObject,null);assert.equal(resets,1);owner.video.srcObject=successor;worker.send({type:'detach'});worker.send({type:'closed'});await closing;assert.equal(owner.video.srcObject,successor);assert.equal(resets,1);
});
