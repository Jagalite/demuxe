// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PreviewPregenerator} from '../web/generated/preview/pregeneration.js';
import {PreviewController} from '../web/generated/preview/controller.js';
const advance=async t=>{t.mock.timers.tick(500);await new Promise(setImmediate);};
const result=time=>({time,width:8,height:8,image:{blob:new Blob(['image'])},path:'test'});
test('timestamp lists retain original times while sorting and deduplicating buckets with a count limit',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];
 const p=new PreviewPregenerator({timestamps:[8,2.3,2.8,4,12],count:2},1,async r=>{seen.push(r.time);return 'next';});
 p.setDuration(10);for(let i=0;i<4;i++)await advance(t);
 assert.deepEqual(seen,[2.3,4]);p.stop();
});
test('omitted/null count processes all finite interval candidates in seconds or minutes',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const config of [{every:30},{every:.5,unit:'minutes',count:null}]){
  const seen=[];const p=new PreviewPregenerator(config,1,async r=>{seen.push(r.time);return 'next';});
  p.setDuration(91);for(let i=0;i<5;i++)await advance(t);assert.deepEqual(seen,[0,30,60,90]);p.stop();
 }
});
test('unknown/live duration, disabled scheduling, source reset and in-flight jobs remain bounded',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let release,calls=0;
 const p=new PreviewPregenerator({every:1},1,()=>{calls++;return new Promise(resolve=>{release=resolve;});});
 await advance(t);assert.equal(calls,0);p.setDuration(Infinity);await advance(t);assert.equal(calls,0);
 p.setDuration(10);p.setEnabled(false);await advance(t);assert.equal(calls,0);p.setEnabled(true);await advance(t);assert.equal(calls,1);
 for(let i=0;i<4;i++){p.setDuration(10);await advance(t);}assert.equal(calls,1);
 p.reset();p.setDuration(null);release('next');await new Promise(setImmediate);await advance(t);assert.equal(calls,1);p.stop();
});
test('invalid pregeneration settings fail at initialization',()=>{
 for(const config of [{every:0},{every:Infinity},{every:1,unit:'hours'},{timestamps:[-1]},{timestamps:[1],every:1},{every:1,count:0},{every:1,count:1.5}])assert.throws(()=>new PreviewPregenerator(config,1,async()=> 'next'));
});
test('all candidates run without exceeding the image cache capacity',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];
 const c=new PreviewController([{id:'test',priority:1,canHandle:()=>true,getFrame:async r=>{seen.push(r.time);return result(r.time);}}],{debounceMs:0,maxEntries:2,pregenerate:{every:1}});
 c.setSourceIdentity('movie');c.setDuration(4);
 for(let i=0;i<10;i++)await advance(t);
 assert.deepEqual(seen,[0,1,2,3]);assert.equal(c.diagnostics.cacheEntries,2);await c.destroy();
});
test('disabled API remains disabled through buffering transitions and can restore providers',async()=>{
 let calls=0;const c=new PreviewController([{id:'test',priority:1,canHandle:()=>true,getFrame:async r=>{calls++;return result(r.time);}}],{enabled:false,debounceMs:0});
 c.setSuspended(true);c.setSuspended(false);assert.equal(await c.getFrame({time:1}),null);await c.prefetch({time:1});assert.equal(calls,0);
 c.enabled=true;assert.ok(await c.getFrame({time:1}));c.enabled=false;assert.equal(c.diagnostics.cacheEntries,0);assert.equal(await c.getFrame({time:1}),null);c.enabled=true;assert.ok(await c.getFrame({time:1}));await c.destroy();
});
test('background thumbnails never evict foreground cache entries',async()=>{
 const c=new PreviewController([{id:'test',priority:1,canHandle:()=>true,getFrame:async r=>result(r.time)}],{debounceMs:0,maxEntries:1});
 await c.getFrame({time:1});await new Promise(setImmediate);await c.prefetch({time:2});assert.equal((await c.getFrame({time:1})).cache,'hit');await c.destroy();
});

test('fractional timestamp pregeneration matches foreground buckets without redundant decoding',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];
 const c=new PreviewController([{id:'test',priority:1,canHandle:()=>true,getFrame:async r=>{seen.push(r.time);return result(r.time);}}],{bucketSeconds:.1,debounceMs:0,pregenerate:{timestamps:[4.39,4.35],count:1}});
 try{
  c.setDuration(10);for(let i=0;i<4;i++)await advance(t);
  assert.deepEqual(seen,[4.3]);
  for(const time of [4.35,4.39]){
   const work=c.getFrame({time,width:240,height:135});await advance(t);const frame=await work;
   assert.equal(frame.cache,'hit');assert.equal(frame.bucketTime,4.3);
  }
  assert.deepEqual(seen,[4.3]);
 }finally{await c.destroy();}
});
