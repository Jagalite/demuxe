// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {seekBounds,resolveSeekTarget} from '../web/generated/player/interaction.js';
import {scrubberPointer} from '../web/generated/internal/machine/scrubber.js';
import {createPreviewControl,transitionPreviewControl,rememberPreviewCache,previewBackgroundRetentionAvailable} from '../web/generated/internal/machine/preview.js';
import {PreviewController} from '../web/generated/preview/controller.js';
import {SessionPreviewProvider} from '../web/generated/preview/session-provider.js';

const full=[{start:0,end:600}],excerpt={start:120,end:180};
const until=async (predicate,message='condition',timeout=4000)=>{
  const deadline=performance.now()+timeout;
  while(!predicate()){
    assert.ok(performance.now()<deadline,`Timed out: ${message}`);
    await delay(5);
  }
};
const idle=controller=>until(()=>!controller.diagnostics.active&&!controller.diagnostics.pending,'preview lane idle');
const key=(time,width=240,height=135)=>JSON.stringify(['initial',0,time,width,height,false]);
const entry=(time,bytes=64,background=false)=>({key:key(time),time,bytes,background});
const result=request=>({time:request.time,actualTime:request.time,temporalAccuracy:'exact',width:1,height:1,image:{blob:new Blob(['x'])},path:'test'});
function countingProvider(){
  const calls={admissions:0,frames:0};
  return {calls,provider:{id:'counting',priority:1,canHandle:()=>{calls.admissions++;return true;},getFrame:async request=>{calls.frames++;return result(request);}}};
}

for(const [digit,time] of [[0,120],[5,150],[9,174]])test(`excerpt digit ${digit} targets ${time} seconds`,()=>{
  const bounds=seekBounds(full,excerpt);
  assert.deepEqual(bounds,excerpt);
  const target=bounds.start+(bounds.end-bounds.start)*digit/10;
  assert.equal(resolveSeekTarget(target,full,130,excerpt),time);
});
test('clearing the range restores full bounds and 0/5/9 targets',()=>{
  const bounds=seekBounds(full,null);
  assert.deepEqual(bounds,{start:0,end:600});
  assert.deepEqual([0,5,9].map(d=>resolveSeekTarget(bounds.start+(bounds.end-bounds.start)*d/10,full,130,null)),[0,300,540]);
});
test('Home/End targets and out-of-bounds drags remain inside excerpt',()=>{
  assert.equal(resolveSeekTarget(0,full,150,excerpt),120);
  assert.equal(resolveSeekTarget(600,full,150,excerpt),179.95);
  assert.equal(resolveSeekTarget(180,full,150,excerpt),179.95);
});
test('seek bounds intersect the live/seekable window and reject empty intersections',()=>{
  assert.deepEqual(seekBounds([{start:150,end:250}],excerpt),{start:150,end:180});
  assert.equal(seekBounds([{start:200,end:250}],excerpt),null);
  assert.equal(seekBounds([],excerpt),null);
  assert.equal(seekBounds(null,excerpt),null);
  assert.equal(seekBounds([{start:NaN,end:250}],excerpt),null);
});
test('range holes preserve directional seeking',()=>{
  const ranges=[{start:160,end:600},{start:0,end:130}];
  assert.deepEqual(seekBounds(ranges,excerpt),excerpt);
  assert.equal(resolveSeekTarget(150,ranges,120,excerpt),160);
  assert.equal(resolveSeekTarget(150,ranges,170,excerpt),129.95);
});
test('touch drag and mouse geometry both map to the excerpt midpoint',()=>{
  const facts={touch:false,disabled:false,left:0,width:400,thumbWidth:16,step:.1,min:120,max:180,x:200,parentLeft:0,parentWidth:400};
  assert.equal(scrubberPointer(facts).time,150);
  assert.equal(scrubberPointer({...facts,touch:true,dragging:true}).time,150);
  assert.deepEqual(scrubberPointer({...facts,touch:true}),{hide:true});
  assert.deepEqual(scrubberPointer({...facts,touch:true,dragging:true,disabled:true}),{hide:true});
});

for(const strategy of ['on-demand','demuxe']){
  test(`${strategy}: full foreground cache denies background retention without eviction`,()=>{
    let state=transitionPreviewControl(createPreviewControl({maxEntries:2,maxCacheBytes:1024}),{kind:'strategy',value:{type:strategy}});
    state=rememberPreviewCache(rememberPreviewCache(state,entry(1,512)),entry(2,512));
    assert.equal(previewBackgroundRetentionAvailable(state,key(3)),false);
    assert.strictEqual(rememberPreviewCache(state,entry(3,512,true)),state);
    assert.equal(state.bytes,1024);
  });
  test(`${strategy}: background may evict background, never foreground`,()=>{
    let state=transitionPreviewControl(createPreviewControl({maxEntries:2,maxCacheBytes:1024}),{kind:'strategy',value:{type:strategy}});
    state=rememberPreviewCache(rememberPreviewCache(state,entry(1,512)),entry(2,512,true));
    assert.equal(previewBackgroundRetentionAvailable(state,key(3)),true);
    const next=rememberPreviewCache(state,entry(3,512,true));
    assert.deepEqual(next.cache.map(e=>e.time),[1,3]);
    assert.equal(next.bytes,1024);
  });
}
test('byte-full protected cache denies retention even with entry slots remaining',()=>{
  const state=rememberPreviewCache(createPreviewControl({maxEntries:4,maxCacheBytes:64}),entry(1,64));
  assert.equal(previewBackgroundRetentionAvailable(state,key(2)),false);
});
test('failed insertion is atomic even after an evictable background entry',()=>{
  let state=rememberPreviewCache(createPreviewControl({maxEntries:3,maxCacheBytes:128}),entry(1,32,true));
  state=rememberPreviewCache(state,entry(2,96,false));
  assert.strictEqual(rememberPreviewCache(state,entry(3,64,true)),state);
});
test('same-key foreground replacement does not inflate bytes or evict other entries',()=>{
  let state=rememberPreviewCache(createPreviewControl({maxEntries:2,maxCacheBytes:160}),entry(1,64));
  state=rememberPreviewCache(state,entry(2,64));
  const next=rememberPreviewCache(state,entry(1,80));
  assert.equal(next.bytes,144);
  assert.equal(next.cache.length,2);
  assert.strictEqual(rememberPreviewCache(next,entry(1,96,true)),next);
});
test('demuxe storyboard protection and foreground protection both survive preflight',()=>{
  let state=createPreviewControl({maxEntries:3,maxCacheBytes:192});
  state=transitionPreviewControl(state,{kind:'strategy',value:{type:'demuxe'}});
  state=transitionPreviewControl(state,{kind:'duration',duration:600});
  for(const e of [entry(1),entry(2),entry(300,64,true)])state=rememberPreviewCache(state,e);
  assert.equal(previewBackgroundRetentionAvailable(state,key(3)),false);
  assert.strictEqual(rememberPreviewCache(state,entry(3,64,true)),state);
});
test('bounded cache property sweep preserves foregrounds, accounting and atomic failure',()=>{
  let cases=0;
  for(const strategy of ['on-demand','demuxe'])for(const maxEntries of [0,1,2,3,8])for(const maxCacheBytes of [0,32,64,128,256])for(const mask of [0,1,3,5,7]){
    let state=transitionPreviewControl(createPreviewControl({maxEntries,maxCacheBytes}),{kind:'strategy',value:{type:strategy}});
    state=transitionPreviewControl(state,{kind:'duration',duration:600});
    for(let i=0;i<3;i++)state=rememberPreviewCache(state,entry(i,(i+1)*16,!!(mask&(1<<i))));
    for(const bytes of [1,16,32,64,128,512]){
      const next=rememberPreviewCache(state,entry(20,bytes,true));
      assert.equal(next.bytes,next.cache.reduce((sum,e)=>sum+e.bytes,0));
      assert.ok(next.bytes<=maxCacheBytes&&next.cache.length<=maxEntries);
      for(const e of state.cache.filter(e=>!e.background))assert.ok(next.cache.some(n=>n.key===e.key));
      if(!next.cache.some(e=>e.key===key(20)))assert.strictEqual(next,state);
      cases++;
    }
  }
  assert.equal(cases,1500);
});

test('tiny full cache: 100 prefetches invoke neither provider selection nor decoding',async t=>{
  const {calls,provider}=countingProvider();
  const controller=new PreviewController([provider],{debounceMs:0,maxEntries:1});
  t.after(()=>controller.destroy());
  await controller.getFrame({time:1});await idle(controller);
  const before={...calls};
  for(let i=0;i<100;i++)await controller.prefetch({time:2+i});
  assert.deepEqual(calls,before);
  assert.equal((await controller.getFrame({time:1,cacheOnly:true})).cache,'hit');
  await controller.getFrame({time:3});await idle(controller);
  assert.equal(calls.frames,before.frames+1,'foreground demand can replace a foreground');
  controller.unload({start:3,end:4});
  await controller.prefetch({time:4});await idle(controller);
  assert.equal(calls.frames,before.frames+2,'capacity release resumes background work');
});
test('capacity is rechecked after asynchronous provider admission',async t=>{
  let release,started,frames=0;
  const ready=new Promise(resolve=>{started=resolve;});
  const gate=new Promise(resolve=>{release=resolve;});
  const controller=new PreviewController([{id:'gated',priority:1,canHandle:async()=>{started();await gate;return true;},getFrame:async request=>{frames++;return result(request);}}],{debounceMs:0,maxEntries:1});
  t.after(()=>controller.destroy());
  const pending=controller.prefetch({time:1});
  await ready;controller.setCacheLimits({maxEntries:0});release();
  await pending;await idle(controller);
  assert.equal(frames,0);
});
test('disabled retention does not disable foreground frames',async t=>{
  const {calls,provider}=countingProvider();
  const controller=new PreviewController([provider],{debounceMs:0,maxEntries:0});
  t.after(()=>controller.destroy());
  await controller.prefetch({time:1});assert.equal(calls.frames,0);
  assert.ok(await controller.getFrame({time:2}));assert.equal(calls.frames,1);
  assert.equal(controller.diagnostics.cacheEntries,0);
});
test('real pregenerator waits while full and retries after unload',async t=>{
  const {calls,provider}=countingProvider();let sampled=0;
  const controller=new PreviewController([provider],{debounceMs:0,maxEntries:1,strategy:{type:'custom',sample:()=>{sampled++;return [20];}}});
  t.after(()=>controller.destroy());
  await controller.getFrame({time:1});await idle(controller);controller.setDuration(600);
  await until(()=>sampled>=2,'two real scheduler sampling ticks');
  assert.equal(calls.frames,1);assert.equal(calls.admissions,1);
  controller.unload({start:1,end:2});
  await until(()=>calls.frames===2,'scheduler resumes after unload');
  await idle(controller);
  assert.equal((await controller.getFrame({time:20,width:240,height:135,cacheOnly:true})).cache,'hit');
});

function sessionFixture(){
  const calls={binding:0,created:0,opened:0,frames:0,destroyed:0};
  const binding={key:'source',source:{file:new Blob(['media'])},backend:{createPreviewSession(){calls.created++;return {async open(){calls.opened++;},async frame(request){calls.frames++;return {...result(request),actualTime:null,temporalAccuracy:'approximate'};},async destroy(){calls.destroyed++;}};}}};
  const provider=new SessionPreviewProvider(()=>{calls.binding++;return binding;},{},()=>true);
  const request={time:1,width:160,exact:true,sourceId:'source',signal:new AbortController().signal,publish(){}};
  return {calls,provider,request};
}
test('unsupported exact request performs zero binding, decoder-open and seek work',async t=>{
  const {calls,provider,request}=sessionFixture();t.after(()=>provider.release());
  assert.equal(provider.canHandle(request),false);
  assert.equal(await provider.getFrame(request),null);
  assert.deepEqual(calls,{binding:0,created:0,opened:0,frames:0,destroyed:0});
});
test('unsupported exact request preserves a warm session and its idle-release timer',async t=>{
  const {calls,provider,request}=sessionFixture();t.after(()=>provider.release());
  const approximate={...request,exact:false};
  assert.equal(provider.canHandle(approximate),true);
  assert.ok(await provider.getFrame(approximate));
  const timer=provider.idle,before={...calls};
  assert.equal(await provider.getFrame(request),null);
  assert.equal(provider.idle,timer);
  assert.deepEqual(calls,before);
  assert.ok(await provider.getFrame({...approximate,time:2}));
  assert.equal(calls.created,1);assert.equal(calls.opened,1);assert.equal(calls.frames,2);
});
test('aborted exact requests retain the AbortError contract',async t=>{
  const {provider,request}=sessionFixture();t.after(()=>provider.release());
  const abort=new AbortController();abort.abort();
  await assert.rejects(provider.getFrame({...request,signal:abort.signal}),{name:'AbortError'});
});
test('controller skips approximate-only session and preserves exact-capable fallback',async t=>{
  const {calls,provider}=sessionFixture();let exactCalls=0;
  const controller=new PreviewController([provider,{id:'exact',priority:40,canHandle:request=>request.exact,getFrame:async request=>{exactCalls++;return result(request);}}],{debounceMs:0});
  t.after(()=>controller.destroy());
  const frame=await controller.getFrame({time:1.25,exact:true});
  assert.equal(frame.actualTime,1.25);assert.equal(frame.temporalAccuracy,'exact');
  assert.equal(exactCalls,1);assert.equal(calls.created,0);assert.equal(calls.opened,0);assert.equal(calls.frames,0);
});

test('too-small byte budget skips background decoding even in an empty cache',async t=>{
  const {calls,provider}=countingProvider();
  const controller=new PreviewController([provider],{debounceMs:0,maxEntries:1,maxCacheBytes:16});
  t.after(()=>controller.destroy());
  await controller.prefetch({time:1});assert.equal(calls.frames,0);assert.equal(calls.admissions,0);
  assert.ok(await controller.getFrame({time:2}));assert.equal(calls.frames,1);
});
