// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPregeneration,transitionPregeneration} from '../../web/generated/internal/machine/preview-pregeneration.js';
import {createPreviewControl,transitionPreviewControl,previewGenerationAdmission,previewProviderDeferred,previewCanPrefetch,admitPreviewRequest,planPreviewRequest,createPreviewJob,startPreviewJob,lookupPreviewCache,rememberPreviewCache,unloadPreviewCache} from '../../web/generated/internal/machine/preview.js';
import {PreviewPregenerator} from '../../web/generated/preview/pregeneration.js';
import {PreviewController} from '../../web/generated/preview/controller.js';
const turn=()=>new Promise(setImmediate);
const step=(state,event)=>transitionPreviewControl(state,event);
const request=(state,time,extra={})=>admitPreviewRequest(state,{time,...extra},false);
const entry=(state,time,bytes,background=false,extra={})=>({key:request(state,time,extra).key,time,bytes,background});
function scheduler(config,bucket=1){let state=createPregeneration(config,bucket);return {get state(){return state;},send(event){const next=transitionPregeneration(state,event);state=next.state;return next.effects;},fire(){return this.send({kind:'timer',id:state.timer});},finish(outcome='next'){return this.send({kind:'completed',id:state.running.id,outcome});}};}

 test('pregeneration centers and spread are independent expected values',()=>{
  const p=scheduler({samples:4});assert.deepEqual(p.send({kind:'duration',duration:40}),[{kind:'schedule',id:1,delayMs:500}]);
  const times=[];for(let i=0;i<4;i++){times.push(p.fire()[0].request.time);p.finish();}
  assert.deepEqual(times,[5,25,15,35]);assert.deepEqual(p.fire(),[]);assert.equal(p.state.finished,true);
 });
 test('pregeneration waits, disabling and stale reset completion preserve candidates',()=>{
  const p=scheduler({every:5});p.send({kind:'duration',duration:20});p.fire();assert.equal(p.state.running.request.time,0);
  p.finish('wait');p.fire();assert.equal(p.state.running.request.time,0);
  const old=p.state.running.id;p.send({kind:'reset'});assert.equal(p.state.running.id,old);assert.equal(p.state.timer,null);
  p.send({kind:'duration',duration:10});p.send({kind:'enabled',enabled:false});p.send({kind:'completed',id:old,outcome:'next'});
  assert.equal(p.state.index,0);assert.equal(p.state.running,null);assert.equal(p.state.timer,null);
  p.send({kind:'enabled',enabled:true});p.fire();assert.equal(p.state.running.request.time,0);
  p.finish();p.fire();assert.equal(p.state.running.request.time,5);
 });
 test('duplicate and retired scheduler callbacks cannot change active work',()=>{
  const p=scheduler({every:2});p.send({kind:'duration',duration:10});const oldTimer=p.state.timer;p.fire();const oldRun=p.state.running.id;
  assert.deepEqual(p.send({kind:'timer',id:oldTimer}),[]);assert.equal(p.state.running.id,oldRun);
  p.finish();const timer=p.state.timer;assert.deepEqual(p.send({kind:'completed',id:oldRun,outcome:'stop'}),[]);assert.equal(p.state.timer,timer);
  p.fire();const current=p.state;assert.deepEqual(p.send({kind:'timer',id:oldTimer}),[]);assert.equal(p.state,current);
  p.send({kind:'stop'});p.finish();assert.equal(p.state.timer,null);assert.equal(p.state.finished,true);
 });
 test('adaptive broad coverage precedes focus and exhausted neighborhoods keep polling',()=>{
  const p=scheduler({strategy:'adaptive',samples:2,every:5,radius:5});p.send({kind:'focus',time:20});p.send({kind:'duration',duration:40});
  const times=[];for(let i=0;i<5;i++){times.push(p.fire()[0].request.time);p.finish();}
  assert.deepEqual(times,[10,30,20,25,15]);assert.equal(p.fire()[0].kind,'schedule');assert.equal(p.state.finished,false);
  p.send({kind:'focus',time:35});assert.equal(p.fire()[0].request.time,35);p.finish();
  assert.deepEqual(p.state.visited,[10,30,20,25,15,35]);
 });
 test('pregeneration copies caller config without freezing or quantizing it twice',()=>{
  const timestamps=[4.39,4.35,9],config={timestamps,width:99,height:53,count:2},p=scheduler(config,.1);
  config.width=3;timestamps.push(1);assert.equal(Object.isFrozen(config),false);assert.equal(Object.isFrozen(timestamps),false);
  p.send({kind:'duration',duration:10});const first=p.fire()[0];assert.deepEqual(first.request,{time:4.35,width:99,height:53});
  assert.ok(Object.isFrozen(p.state));assert.ok(Object.isFrozen(p.state.config.times));assert.ok(Object.isFrozen(first.request));
  p.finish();assert.equal(p.fire()[0].request.time,9);
 });
 test('physical stale timer callback does not erase the current timer handle',async t=>{
  const scheduled=[],cancelled=[];let calls=0;
  t.mock.method(globalThis,'setTimeout',(fn,delay)=>{const handle={fn,delay};scheduled.push(handle);return handle;});
  t.mock.method(globalThis,'clearTimeout',handle=>cancelled.push(handle));
  const p=new PreviewPregenerator({every:1},1,async()=>{calls++;return 'next';});
  p.setDuration(4);const old=scheduled[0];p.reset();const current=scheduled[1];old.fn();assert.equal(calls,0);
  p.stop();assert.ok(cancelled.includes(current));current.fn();assert.equal(calls,0);await turn();
 });
 test('preview admission distinguishes preabort, disabled, invalid and exact keys',()=>{
  let s=createPreviewControl({bucketSeconds:.5,width:80});
  assert.equal(admitPreviewRequest(s,{time:NaN},true).kind,'aborted');
  s=step(s,{kind:'enabled',value:false});assert.equal(admitPreviewRequest(s,{time:NaN},false).kind,'disabled');
  s=step(s,{kind:'enabled',value:true});assert.equal(request(s,-1).message,'Invalid preview request');
  assert.equal(request(s,2,{maxDistance:-1}).message,'Invalid preview distance');
  assert.deepEqual(request(s,2.7),{kind:'ready',key:'["initial",0,2.5,80,null,false]',time:2.5,width:80,height:undefined,exact:false});
  assert.equal(request(s,2.7,{exact:true}).time,2.7);
 });
 test('coalesced foreground work upgrades background; cache-only never cancels or upgrades',()=>{
  let s=createPreviewControl();s=createPreviewJob(s,request(s,2),true);const pending=s.pending.id;
  let plan=planPreviewRequest(s,request(s,2).key,true,false);assert.equal(plan.jobId,pending);assert.equal(plan.state.pending.background,true);assert.deepEqual(plan.cancel,[]);
  plan=planPreviewRequest(s,request(s,2).key,false,false);s=plan.state;assert.equal(s.pending.background,false);assert.deepEqual(plan.cancel,[]);
  s=step(s,{kind:'ready',id:pending});s=startPreviewJob(s);s=createPreviewJob(s,request(s,3),false);
  plan=planPreviewRequest(s,request(s,4).key,false,false);assert.deepEqual(plan.cancel,[s.pending.id,s.active.id]);
  assert.deepEqual(planPreviewRequest(s,request(s,4).key,true,false).cancel,[]);
 });
 test('aborted provider still occupies the lane until its own completion',()=>{
  let s=createPreviewControl();s=createPreviewJob(s,request(s,1),false);const old=s.pending.id;
  s=step(s,{kind:'ready',id:old});s=startPreviewJob(s);s=step(s,{kind:'cancel-job',id:old});
  assert.equal(s.active.aborted,true);assert.equal(planPreviewRequest(s,request(s,1).key,false,false).jobId,null);
  s=createPreviewJob(s,request(s,2),false);const next=s.pending.id;s=step(s,{kind:'ready',id:next});assert.equal(startPreviewJob(s),s);
  assert.equal(step(s,{kind:'finish-job',id:next}),s);s=step(s,{kind:'finish-job',id:old});s=startPreviewJob(s);assert.equal(s.active.id,next);
 });
 test('preview pressure, cooldown, zero budgets and independent native admission',()=>{
  let s=createPreviewControl();assert.equal(previewGenerationAdmission(s,0),'run');assert.equal(previewCanPrefetch(s),true);
  s=step(s,{kind:'foreground',at:50});assert.equal(previewGenerationAdmission(s,549),'wait');assert.equal(previewGenerationAdmission(s,550),'run');
  s=step(s,{kind:'playback',value:true});assert.equal(previewProviderDeferred(s,true,false),true);assert.equal(previewProviderDeferred(s,true,true),false);assert.equal(previewProviderDeferred(s,false,false),false);
  s=step(s,{kind:'limits',maxEntries:0,maxCacheBytes:100});assert.equal(previewGenerationAdmission(s,550),'stop');
  s=step(s,{kind:'suspended',value:true});assert.equal(previewGenerationAdmission(s,550),'wait');
  s=step(s,{kind:'dispose'});assert.equal(previewGenerationAdmission(s,550),'stop');assert.equal(previewCanPrefetch(s),false);
 });
 test('cache lookup uses represented timestamps, later ties, dimensions and LRU',()=>{
  let s=createPreviewControl();const a=entry(s,1,10,true),b=entry(s,5,20,true),other=entry(s,3,30,false,{width:300});
  s=rememberPreviewCache(s,a);s=rememberPreviewCache(s,b);s=rememberPreviewCache(s,other);
  const lookup=lookupPreviewCache(s,{time:3,maxDistance:2},request(s,3),false);s=lookup.state;
  assert.equal(lookup.key,b.key);assert.deepEqual(s.cache.map(x=>x.key),[a.key,other.key,b.key]);assert.equal(s.cache.at(-1).background,false);
  assert.equal(s.counters.hits,1);assert.equal(lookupPreviewCache(s,{time:3,exact:true,maxDistance:99},request(s,3,{exact:true}),false).key,null);
 });
 test('background cache cannot evict foreground and partial evictions remain committed',()=>{
  let s=createPreviewControl({maxEntries:3,maxCacheBytes:100});s=rememberPreviewCache(s,entry(s,0,50));s=rememberPreviewCache(s,entry(s,1,20,true));
  s=rememberPreviewCache(s,entry(s,2,60,true));assert.deepEqual(s.cache.map(x=>x.time),[0]);assert.equal(s.bytes,50);
  s=rememberPreviewCache(s,entry(s,3,30,true));s=step(s,{kind:'limits',maxEntries:1,maxCacheBytes:100});assert.deepEqual(s.cache.map(x=>x.time),[0]);
  s=rememberPreviewCache(s,entry(s,4,40));assert.deepEqual(s.cache.map(x=>x.time),[4]);assert.equal(s.bytes,40);
 });
 test('unload uses requested half-open buckets and identifies matching active and pending work',()=>{
  let s=createPreviewControl();const a=entry(s,1,20),b=entry(s,2,30),c=entry(s,3,40);
  for(const item of [a,{...b,time:99},c])s=rememberPreviewCache(s,item);
  s=createPreviewJob(s,request(s,1),false);s=step(s,{kind:'ready',id:s.pending.id});s=startPreviewJob(s);s=createPreviewJob(s,request(s,2),false);
  const result=unloadPreviewCache(s,1,3);assert.deepEqual(result.jobs,[s.active.id,s.pending.id]);assert.equal(result.removed,2);assert.deepEqual(result.state.cache,[c]);assert.equal(result.state.bytes,40);
 });
 test('core copies settings, strategies and entries and retains immutable history',()=>{
  const settings={width:80},s=createPreviewControl(settings),timestamps=[2,9],strategy={type:'timestamps',timestamps};
  const next=step(s,{kind:'strategy',value:strategy});settings.width=900;timestamps.push(15);
  assert.equal(s.options.width,80);assert.deepEqual(next.strategy.timestamps,[2,9]);assert.equal(Object.isFrozen(strategy),false);assert.equal(Object.isFrozen(timestamps),false);
  const item=entry(next,2,10),cached=rememberPreviewCache(next,item);item.bytes=999;assert.equal(cached.bytes,10);assert.equal(cached.cache[0].bytes,10);assert.equal(next.cache.length,0);
  assert.ok(Object.isFrozen(cached));assert.ok(Object.isFrozen(cached.cache));assert.ok(Object.isFrozen(cached.cache[0]));
 });
 test('control histories preserve cache accounting, one lane and deterministic replay',()=>{
  const run=seed=>{let state=createPreviewControl({maxEntries:4,maxCacheBytes:120}),history=[];
   for(let i=0;i<200;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const choice=seed%6,time=(seed>>>5)%20;
    if(choice===0){state=unloadPreviewCache(state,time,time+1).state;state=rememberPreviewCache(state,entry(state,time,20,!!(seed&128)));}
    else if(choice===1)state=lookupPreviewCache(state,{time,maxDistance:2},request(state,time),false).state;
    else if(choice===2)state=unloadPreviewCache(state,time,time+2).state;
    else if(choice===3)state=step(state,{kind:'limits',maxEntries:1+(seed%4),maxCacheBytes:120});
    else if(choice===4)state=step(state,{kind:'suspended',value:!!(seed&128)});
    else state=step(state,{kind:'playback',value:!!(seed&128)});
    assert.equal(state.bytes,state.cache.reduce((sum,item)=>sum+item.bytes,0));assert.ok(state.cache.length<=state.options.maxEntries);assert.ok(state.bytes<=state.options.maxCacheBytes);history.push(state);
   }return history;};
  // Candidate keys are unique during production admission; direct histories
  // intentionally use replace-after-unload to model completed fresh jobs.
  for(const seed of [1,7,24301])assert.deepEqual(run(seed),run(seed));
 });
 test('controller reentrant onUpdate preserves newer caller and rejects stale image completion',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});const finishes=[],seen=[];
  const c=new PreviewController([{id:'held',priority:0,canHandle:()=>true,getFrame:ctx=>new Promise(resolve=>{seen.push(ctx);finishes.push(resolve);})}],{debounceMs:0});
  const image=time=>({time,width:8,height:8,path:'test',image:{blob:new Blob(['image'])}});
  let newer;const first=c.request({time:1,onUpdate:()=>{newer=c.getFrame({time:2});}});const rejected=assert.rejects(first,{name:'AbortError'});
  t.mock.timers.tick(1);await turn();finishes[0](image(1));await turn();await rejected;
  t.mock.timers.tick(1);await turn();assert.equal(seen.length,2);finishes[1](image(2));assert.equal((await newer).requestedTime,2);
  await turn();assert.equal(c.diagnostics.active,false);await c.destroy();
 });
 test('retired caller timeout cannot cancel a coalesced replacement caller',async t=>{
  const timers=[];t.mock.method(globalThis,'setTimeout',(fn,ms)=>{const handle={fn,ms};timers.push(handle);return handle;});t.mock.method(globalThis,'clearTimeout',()=>{});
  let finish;const c=new PreviewController([{id:'held',priority:0,canHandle:()=>true,getFrame:()=>new Promise(resolve=>finish=resolve)}],{debounceMs:0});
  const first=c.getFrame({time:1}),rejected=assert.rejects(first,{name:'AbortError'}),oldTimeout=timers.find(item=>item.ms===10000);
  timers.find(item=>item.ms===0).fn();await turn();const latest=c.getFrame({time:1.2});await rejected;oldTimeout.fn();
  assert.equal(c.diagnostics.cancelled,1);finish({time:1,width:8,height:8,path:'held',image:{blob:new Blob(['image'])}});
  assert.equal((await latest).requestedTime,1.2);await c.destroy();
 });
 test('reentrant provider abort cannot orphan the newer caller or pending resource',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let nested;const finishes=[],seen=[];
  const c=new PreviewController([{id:'held',priority:0,canHandle:()=>true,getFrame:ctx=>new Promise(resolve=>{seen.push(ctx.time);finishes.push(resolve);if(ctx.time===1)ctx.signal.addEventListener('abort',()=>{nested=c.getFrame({time:3});},{once:true});})}],{debounceMs:0});
  const first=c.getFrame({time:1}),firstRejected=assert.rejects(first,{name:'AbortError'});t.mock.timers.tick(1);await turn();
  const superseded=c.getFrame({time:2});await assert.rejects(superseded,{name:'AbortError'});await firstRejected;
  finishes[0](null);await turn();t.mock.timers.tick(1);await turn();assert.deepEqual(seen,[1,3]);
  finishes[1]({time:3,width:8,height:8,path:'held',image:{blob:new Blob(['image'])}});assert.equal((await nested).requestedTime,3);await turn();
  assert.equal(c.diagnostics.pending,false);assert.equal(c.diagnostics.active,false);assert.equal(c.jobs.size,0);assert.equal(c.callers.size,0);await c.destroy();
 });
 test('provider result normalization cannot republish an image retired by a getter',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let c;
  c=new PreviewController([{id:'getter',priority:0,canHandle:()=>true,getFrame:async()=>({get time(){c.setSourceIdentity('new-source');return 1;},width:8,height:8,path:'old',image:{blob:new Blob(['image'])}})}],{debounceMs:0});
  const work=c.getFrame({time:1}),rejected=assert.rejects(work,{name:'AbortError'});t.mock.timers.tick(1);await turn();await rejected;
  assert.equal(c.diagnostics.sourceId,'new-source');assert.equal(c.diagnostics.cacheEntries,0);assert.equal(c.diagnostics.active,false);await c.destroy();
 });
 test('clear rejects synchronous abort-handler admission without retaining a caller or timer',async t=>{
  t.mock.timers.enable({apis:['setTimeout']});let nested,finish;
  const c=new PreviewController([{id:'held',priority:0,canHandle:()=>true,getFrame:ctx=>new Promise(resolve=>{finish=resolve;ctx.signal.addEventListener('abort',()=>{nested=c.getFrame({time:3}).catch(error=>error.name);},{once:true});})}],{debounceMs:0});
  const first=c.getFrame({time:1}),rejected=assert.rejects(first,{name:'AbortError'});t.mock.timers.tick(1);await turn();c.clear();
  await rejected;assert.equal(await nested,'AbortError');assert.equal(c.diagnostics.pending,false);assert.equal(c.callers.size,0);assert.equal(c.state.retiring,0);
  finish(null);await turn();assert.equal(c.jobs.size,0);assert.equal(c.diagnostics.active,false);assert.equal(c.diagnostics.cacheEntries,0);
  // The guard is scoped to retirement; later ordinary calls remain admissible.
  const later=c.getFrame({time:4}),laterRejected=assert.rejects(later,{name:'AbortError'});assert.equal(c.diagnostics.pending,true);await c.destroy();await laterRejected;
 });
