// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {WorkerRemuxController} from '../web/worker-remux-controller.js';
class WorkerStub extends EventTarget {
 constructor(){super();this.messages=[];this.terminated=false;}
 postMessage(message){this.messages.push(message);}
 terminate(){this.terminated=true;}
 send(data){this.onmessage?.({data});this.dispatchEvent(new MessageEvent('message',{data}));}
}
function video(){return {paused:true,buffered:{length:0},getVideoPlaybackQuality:()=>({}),play(){this.paused=false;this.plays=(this.plays??0)+1;return Promise.resolve();},pause(){this.paused=true;},removeAttribute(){},load(){}};}
test('destroy waits for an already pending error shutdown',async()=>{
 const owner=new WorkerRemuxController(video(),{},()=>{}),worker=owner.worker=new WorkerStub();
 owner.abort(Error('owner failed'));let finished=false;const destroyed=owner.destroy().then(()=>{finished=true;});
 await new Promise(r=>setImmediate(r));assert.equal(finished,false);assert.equal(worker.terminated,false);
 worker.send({type:'closed'});await destroyed;assert.equal(worker.terminated,true);
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
