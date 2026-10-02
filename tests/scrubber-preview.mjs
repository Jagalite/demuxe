// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ScrubberPreview} from '../web/generated/player/preview.js';

function fixture(decode=()=>Promise.resolve(),api=()=>undefined) {
 const timeline=new EventTarget(),panel={hidden:false},label={textContent:''};
 const image={hidden:true,removeAttribute(){delete this.src;},ownerDocument:{createElement:()=>({decode,removeAttribute(){delete this.src;}})}};
 const preview=new ScrubberPreview(timeline,panel,image,label,api);
 return {preview,panel,image,label,timeline};
}
const frame=image=>({time:4,actualTime:4,temporalAccuracy:'exact',image});
test('stationary authored preview times out its image fetch and can recover',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let signal;
 t.mock.method(globalThis,'fetch',(_url,options)=>{signal=options.signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));});
 const {preview,panel,image,label}=fixture();
 const work=preview.show(frame({uris:['http://localhost/hung'],crop:{x:0,y:0,width:1,height:1}}));
 t.mock.timers.tick(4999);assert.equal(panel.hidden,false);t.mock.timers.tick(1);await work;
 assert.equal(signal.aborted,true);assert.equal(panel.hidden,true);assert.equal(image.src,undefined);
 await preview.show(frame({blob:new Blob(['jpeg'])}));assert.equal(panel.hidden,false);assert.equal(label.textContent,'0:04');preview.destroy();
});
test('a stalled image decode times out, revokes its URL and cannot overwrite a newer image',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let finish,calls=0;const revoked=[];
 t.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));
 const {preview,panel,image}=fixture(()=>++calls===1?new Promise(resolve=>finish=resolve):Promise.resolve());
 const first=preview.show(frame({blob:new Blob(['first'])}));await Promise.resolve();
 t.mock.timers.tick(5000);assert.equal(panel.hidden,true);assert.equal(revoked.length,1);
 await preview.show(frame({blob:new Blob(['next'])}));const current=image.src;assert.equal(panel.hidden,false);
 finish();await first;assert.equal(image.src,current);assert.equal(panel.hidden,false);assert.ok(!revoked.includes(current));preview.destroy();
});
test('a retired image deadline never hides a replacement preview',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let finish,calls=0;
 const {preview,panel,image}=fixture(()=>++calls===1?new Promise(resolve=>finish=resolve):Promise.resolve());
 const old=preview.show(frame({blob:new Blob(['old'])}));await Promise.resolve();
 await preview.show(frame({blob:new Blob(['current'])}));const current=image.src;
 t.mock.timers.tick(5000);assert.equal(panel.hidden,false);assert.equal(image.src,current);finish();await old;preview.destroy();
});

test('adaptive hover shows broad cache coverage then requests a nearby refinement',async()=>{
 const calls=[],shown=[];
 const api={strategy:{type:'adaptive',samples:24,every:5},getFrame:async request=>{calls.push(request);return {...frame({}),time:request.cacheOnly?150:100};}};
 const {preview,timeline}=fixture(undefined,()=>api);timeline.min='0';timeline.max='7200';
 preview.show=async value=>{shown.push(value.time);};
 await preview.sample(api,100,0);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(shown,[150,100]);assert.equal(calls[0].maxDistance,151);assert.equal(calls[1].maxDistance,3.5);
 preview.destroy();
});
test('adaptive hover reuses a nearby cache sample without another decode',async()=>{
 const calls=[];const api={strategy:{type:'adaptive',samples:24,every:5},getFrame:async request=>{calls.push(request);return {...frame({}),time:102};}};
 const {preview,timeline}=fixture(undefined,()=>api);timeline.min='0';timeline.max='7200';preview.show=async()=>{};
 await preview.sample(api,100,0);await new Promise(resolve=>setImmediate(resolve));assert.equal(calls.length,1);preview.destroy();
});
