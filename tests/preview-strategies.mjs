// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PreviewPregenerator} from '../web/generated/preview/pregeneration.js';
import {PreviewController} from '../web/generated/preview/controller.js';
import {createPlayerPreview} from '../web/generated/preview/player-preview.js';
const advance=async t=>{t.mock.timers.tick(500);await new Promise(setImmediate);};
const frame=time=>({time,width:8,height:8,image:{blob:new Blob(['image'])},path:'test'});
const provider=getFrame=>({id:'test',priority:1,canHandle:()=>true,getFrame});
for(const strategy of [{type:'custom',sample:()=>[0,5,10]},{type:'demuxe'}])for(const failure of ['null','decode','unretainable'])test(`${strategy.type} advances beyond a ${failure} first sample and bounds retries`,async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let clock=0;t.mock.method(performance,'now',()=>clock);const seen=[];
 const c=new PreviewController([provider(async r=>{
  seen.push(r.time);
  if(r.time===0){if(failure==='null')return null;if(failure==='decode')throw Error('unavailable frame');return {...frame(0),image:{blob:new Blob(['x'.repeat(200001)])}};}
  return {...frame(r.time),width:240,height:135};
 })],{strategy,debounceMs:0,maxCacheBytes:200000});
 try{
  c.setDuration(120);
  for(let i=0;i<30;i++){clock+=500;await advance(t);}
  assert.ok(seen.some(time=>time>0));assert.ok(c.diagnostics.cacheEntries>0);assert.ok(seen.filter(time=>time===0).length<=2);
  c.setSourceIdentity('new');c.setDuration(120);clock+=500;await advance(t);assert.equal(seen.at(-1),0,'Source reset clears attempt cooldown');
 }finally{await c.destroy();}
});

test('Demuxe covers the timeline within budget and reverses its motion bias',async()=>{
 const {resolvePreviewStrategy}=await import('../web/generated/preview/strategies.js');
 const {demuxeStoryboard}=await import('../web/generated/internal/machine/preview-demuxe.js');
 const {sample,strategy}=resolvePreviewStrategy({type:'demuxe'});assert.deepEqual(strategy,{type:'demuxe'});
 const context=samplingContext({duration:1440,focus:720});
 for(const capacity of [0,1,2,3,9,24,96]){
  const c={...context,budget:{...context.budget,maxEntries:capacity}},times=sample(c);
  assert.ok(times.length<=capacity);assert.equal(new Set(times).size,times.length);
  for(const time of demuxeStoryboard(1440,capacity,1))assert.ok(times.includes(time));
  assert.ok(times.every(time=>time>=0&&time<1440));
 }
 const broad=new Set(demuxeStoryboard(1440,context.budget.maxEntries,1));
 const local=velocity=>sample({...context,interaction:{source:'hover',velocity,dwellMs:0}}).filter(time=>!broad.has(time));
 const mean=a=>a.reduce((sum,x)=>sum+x,0)/a.length;
 assert.ok(mean(local(100))>720);assert.ok(mean(local(-100))<720);
 for(const duration of [.1,1,12])assert.ok(sample({...context,duration,focus:duration}).every(time=>time>=0&&time<duration));
});

test('Demuxe retention protects broad coverage while rotating local LRU and enforcing bytes',async()=>{
 const {createPreviewControl,transitionPreviewControl,rememberPreviewCache}=await import('../web/generated/internal/machine/preview.js');
 let state=createPreviewControl({maxEntries:6,maxCacheBytes:600});
 state=transitionPreviewControl(state,{kind:'strategy',value:{type:'demuxe'}});
 state=transitionPreviewControl(state,{kind:'duration',duration:120});
 const add=(time,background=true)=>{state=rememberPreviewCache(state,{key:JSON.stringify(['initial',0,time,240,135,false]),time,bytes:100,background});};
 add(30);add(90);for(let i=0;i<25;i++)add(i,i%2===0);
 assert.ok(state.cache.some(e=>e.time===30)&&state.cache.some(e=>e.time===90));
 assert.equal(state.cache.length,6);assert.equal(state.bytes,600);assert.ok(state.cache.some(e=>e.time===24));
 state=transitionPreviewControl(state,{kind:'limits',maxEntries:1,maxCacheBytes:50});assert.equal(state.bytes,0);
});

test('Demuxe fills a bounded working set without churn and honors suspension and source changes',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let clock=0;t.mock.method(performance,'now',()=>clock);const seen=[];
 const c=new PreviewController([provider(async r=>{seen.push(r.time);return {time:r.time,width:240,height:135,image:{blob:new Blob(['x'])},path:'test'};})],{strategy:{type:'demuxe'},debounceMs:0,maxEntries:9,maxCacheBytes:2*1024*1024});
 const tick=async()=>{clock+=100;t.mock.timers.tick(100);await new Promise(setImmediate);};
 try{
  c.setDuration(1440);c.setPlaybackPosition(720);
  for(let i=0;i<80;i++)await tick();const count=seen.length;
  assert.ok(count>3&&count<=9);for(let i=0;i<40;i++)await tick();assert.equal(seen.length,count);
  for(const time of [240,720,1200])assert.ok(await c.getFrame({time,width:240,height:135,cacheOnly:true}));
  c.setSuspended(true);c.setPlaybackPosition(300);for(let i=0;i<20;i++)await tick();assert.equal(seen.length,count);
  c.setSuspended(false);c.setPlaybackPosition(300);for(let i=0;i<40;i++)await tick();assert.ok(seen.length>count);
  c.setSourceIdentity('new');assert.equal(c.diagnostics.cacheEntries,0);const stopped=seen.length;for(let i=0;i<10;i++)await tick();assert.equal(seen.length,stopped);
  c.enabled=false;c.setDuration(1440);for(let i=0;i<10;i++)await tick();assert.equal(seen.length,stopped);
 }finally{await c.destroy();}
});

test('adaptive covers a two-hour movie broadly then fills only the five-second focus window',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];
 const p=new PreviewPregenerator({strategy:'adaptive',samples:24,every:5,radius:30},1,async r=>{seen.push(r.time);return 'next';});
 p.setFocus(3600);p.setDuration(7200);
 for(let i=0;i<100;i++)await advance(t);
 assert.equal(seen.length,37);assert.equal(new Set(seen).size,37);
 assert.ok(Math.max(...seen.slice(0,4))-Math.min(...seen.slice(0,4))>=3600);
 assert.deepEqual(seen.slice(24).sort((a,b)=>a-b),Array.from({length:13},(_,i)=>3570+i*5));
 p.setFocus(7198);for(let i=0;i<30;i++)await advance(t);
 assert.ok(seen.slice(37).every(n=>n>=7168&&n<7200&&n%5===0));assert.ok(seen.length<50);
 p.stop();
});
test('adaptive deferral and source reset cannot consume the wrong source candidate',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];let finish;
 const p=new PreviewPregenerator({strategy:'adaptive',samples:2,every:5,radius:10},1,r=>{seen.push(r.time);return new Promise(resolve=>finish=resolve);});
 p.setDuration(40);await advance(t);finish('wait');await new Promise(setImmediate);await advance(t);assert.deepEqual(seen,[10,10]);
 p.reset();p.setDuration(20);finish('next');await new Promise(setImmediate);await advance(t);assert.equal(seen.at(-1),5);
 p.stop();finish('next');await new Promise(setImmediate);await advance(t);assert.equal(seen.length,3);
});
test('on-demand never pregenerates but accepts hover requests; strategies can change live',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];let clock=0;t.mock.method(performance,'now',()=>clock);
 const c=new PreviewController([provider(async r=>{seen.push(r.time);return frame(r.time);})],{strategy:{type:'on-demand'},debounceMs:0});
 const api=createPlayerPreview(c);c.setDuration(12);
 try{
  for(let i=0;i<8;i++)await advance(t);assert.deepEqual(seen,[]);
  const hover=api.getFrame({time:3});await advance(t);await hover;
  api.setStrategy({type:'interval',every:5});assert.equal(api.strategy.every,5);assert.ok(Object.isFrozen(api.strategy));
  for(let i=0;i<8;i++)await advance(t);
  // Foreground cooldown uses wall time; release it deterministically here.
  clock=501;for(let i=0;i<8;i++)await advance(t);
  assert.deepEqual(seen,[3,0,5,10]);assert.equal((await api.getFrame({time:3,cacheOnly:true})).cache,'hit');
 }finally{await c.destroy();}
});
test('uniform and explicit timestamp strategies preserve their configured coverage',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];
 const c=new PreviewController([provider(async r=>{seen.push(r.time);return frame(r.time);})],{strategy:{type:'uniform',samples:4},debounceMs:0});
 try{
  c.setDuration(40);for(let i=0;i<12;i++)await advance(t);assert.deepEqual(seen,[5,25,15,35]);
  c.setStrategy({type:'timestamps',timestamps:[30,2,2.5,9],count:2});for(let i=0;i<8;i++)await advance(t);
  assert.deepEqual(seen.slice(4),[2,9]);assert.ok(Object.isFrozen(c.strategy.timestamps));
 }finally{await c.destroy();}
});
test('invalid strategy changes are atomic and legacy pregenerate stays supported',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const c=new PreviewController([],{strategy:{type:'adaptive'}});
 try{
  const current=c.strategy;
  for(const config of [{type:'unknown'},{type:'uniform',samples:1},{type:'interval',every:0},{type:'adaptive',samples:257},{type:'adaptive',every:0},{type:'adaptive',radius:Infinity},{type:'adaptive',radius:1000,every:1},{type:'timestamps',timestamps:[-1]}])assert.throws(()=>c.setStrategy(config));
  assert.equal(c.strategy,current);
  assert.throws(()=>new PreviewController([],{strategy:{type:'on-demand'},pregenerate:{every:5}}));
  const legacy=new PreviewController([],{pregenerate:{every:5}});assert.equal(legacy.strategy,null);await legacy.destroy();
 }finally{await c.destroy();}assert.throws(()=>c.setStrategy({type:'uniform'}),{name:'AbortError'});
});
test('switching strategy cancels background work without overlapping providers',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let started=0,signal,finish;
 const c=new PreviewController([provider(r=>{started++;signal=r.signal;return new Promise(resolve=>finish=resolve);})],{strategy:{type:'interval',every:5},debounceMs:0});
 try{
  c.setDuration(20);await advance(t);await advance(t);assert.equal(started,1);
  c.setStrategy({type:'adaptive'});assert.equal(signal.aborted,true);
  for(let i=0;i<5;i++)await advance(t);assert.equal(started,1);
  c.setStrategy({type:'on-demand'});finish(frame(0));await new Promise(setImmediate);
  for(let i=0;i<5;i++)await advance(t);assert.equal(started,1);assert.equal(c.diagnostics.cacheEntries,0);
 }finally{await c.destroy();}
});
test('strategy changes preserve an interactive request and respect disabled previews',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let signal,finish;
 const c=new PreviewController([provider(r=>{signal=r.signal;return new Promise(resolve=>finish=resolve);})],{debounceMs:0});
 try{
  const hover=c.getFrame({time:7});await advance(t);c.setStrategy({type:'adaptive'});assert.equal(signal.aborted,false);
  finish(frame(7));await hover;c.enabled=false;c.setStrategy({type:'interval'});c.setDuration(20);
  for(let i=0;i<10;i++)await advance(t);assert.equal(c.enabled,false);assert.equal(c.diagnostics.active,false);assert.equal(c.diagnostics.cacheEntries,0);
 }finally{await c.destroy();}
});
test('adaptive hover focus temporarily outranks playback and source replacement resets it',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let clock=0;t.mock.method(performance,'now',()=>clock);
 const c=new PreviewController([],{strategy:{type:'adaptive'}});
 try{
  c.setPlaybackPosition(100);assert.equal(c.pregenerator.state.focus,100);
  await c.getFrame({time:500,cacheOnly:true});c.setPlaybackPosition(101);assert.equal(c.pregenerator.state.focus,500);
  clock=1501;c.setPlaybackPosition(102);assert.equal(c.pregenerator.state.focus,102);
  c.setSourceIdentity('next');assert.equal(c.pregenerator.state.focus,0);assert.equal(c.pregenerator.state.visited.length,0);
 }finally{await c.destroy();}
});
test('adaptive generation stays within the cache budget',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const c=new PreviewController([provider(async r=>frame(r.time))],{strategy:{type:'adaptive'},debounceMs:0,maxEntries:4,maxCacheBytes:4096});
 try{c.setDuration(7200);c.setPlaybackPosition(3600);for(let i=0;i<100;i++)await advance(t);assert.ok(c.diagnostics.cacheEntries<=4);assert.ok(c.diagnostics.cacheBytes<=4096);}finally{await c.destroy();}
});

test('custom sampling preserves priority, deduplicates buckets and exposes immutable budget context',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[],contexts=[];
 const c=new PreviewController([provider(async r=>{seen.push(r.time);return frame(r.time);})],{strategy:{type:'custom',sample:ctx=>{contexts.push(ctx);return [9,2,2.5,7];}},debounceMs:0,maxEntries:3,maxCacheBytes:4096});
 try{
  c.setPlaybackPosition(6);c.setDuration(20);for(let i=0;i<20;i++)await advance(t);
  assert.deepEqual(seen,[9,2,7]);assert.equal(contexts[0].focus,6);assert.equal(contexts[0].duration,20);
  assert.ok(Object.isFrozen(contexts[0]));assert.ok(Object.isFrozen(contexts[0].budget));assert.ok(Object.isFrozen(contexts[0].cachedTimestamps));
  assert.equal(contexts[0].budget.availableEntries,3);assert.equal(contexts.at(-1).budget.availableEntries,0);
  assert.deepEqual(contexts.at(-1).cachedTimestamps,[9,2,7]);
  c.unload({start:2,end:3});for(let i=0;i<6;i++)await advance(t);assert.deepEqual(seen,[9,2,7,2]);
 }finally{await c.destroy();}
});
test('custom sampling follows focus and isolates throwing, async and malformed callbacks',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];
 const c=new PreviewController([provider(async r=>{seen.push(r.time);return frame(r.time);})],{debounceMs:0});
 try{
  c.setDuration(100);
  for(const sample of [()=>{throw Error('host');},()=>Promise.resolve([1]),()=>Promise.reject(Error('async host')),()=>[NaN],()=>[-1],()=>[100],()=>Array(257).fill(1)]){
   c.setStrategy({type:'custom',sample});for(let i=0;i<4;i++)await advance(t);
  }
  assert.deepEqual(seen,[]);
  c.setStrategy({type:'custom',sample:({focus})=>[focus]});c.setPlaybackPosition(30);
  for(let i=0;i<4;i++)await advance(t);assert.deepEqual(seen,[30]);
  c.setPlaybackPosition(40);for(let i=0;i<4;i++)await advance(t);assert.deepEqual(seen,[30,40]);
  c.enabled=false;for(let i=0;i<4;i++)await advance(t);assert.deepEqual(seen,[30,40]);
  assert.throws(()=>c.setStrategy({type:'custom',sample:42}));assert.equal(c.strategy.type,'custom');
 }finally{await c.destroy();}
});
test('custom sampler reentrant strategy replacement cannot launch stale work',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];
 const c=new PreviewController([provider(async r=>{seen.push(r.time);return frame(r.time);})],{debounceMs:0});
 try{
  c.setStrategy({type:'custom',sample:()=>{c.setStrategy({type:'on-demand'});return [3];}});
  c.setDuration(20);for(let i=0;i<8;i++)await advance(t);assert.deepEqual(seen,[]);assert.equal(c.strategy.type,'on-demand');
 }finally{await c.destroy();}
});
test('adaptive focus changes can revisit evicted local samples',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];
 const p=new PreviewPregenerator({strategy:'adaptive',samples:2,every:5,radius:0},1,async r=>{seen.push(r.time);return 'next';});
 p.setDuration(100);p.setFocus(40);for(let i=0;i<8;i++)await advance(t);
 p.setFocus(45,[]);for(let i=0;i<4;i++)await advance(t);
 p.setFocus(40,[]);for(let i=0;i<4;i++)await advance(t);
 assert.deepEqual(seen,[25,75,40,45,40]);p.stop();
});
test('custom working sets converge within entry and observed byte capacity',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const limits of [{maxEntries:2,maxCacheBytes:4096},{maxEntries:10,maxCacheBytes:1200}]){
  const seen=[];const c=new PreviewController([provider(async r=>{seen.push(r.time);return frame(r.time);})],{strategy:{type:'custom',sample:()=>[1,2,3,4]},debounceMs:0,...limits});
  try{c.setDuration(20);for(let i=0;i<20;i++)await advance(t);assert.deepEqual(seen,[1,2]);assert.equal(c.diagnostics.cacheEntries,2);assert.ok(c.diagnostics.cacheBytes<=limits.maxCacheBytes);}finally{await c.destroy();}
 }
});
test('custom fractional buckets remain resident without double quantization',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const seen=[];
 const c=new PreviewController([provider(async r=>{seen.push(r.time);return frame(r.time);})],{strategy:{type:'custom',sample:()=>[4.3,4.29]},bucketSeconds:.1,debounceMs:0});
 try{c.setDuration(10);for(let i=0;i<10;i++)await advance(t);assert.deepEqual(seen,[Math.floor(4.3/.1)*.1]);}finally{await c.destroy();}
});
test('custom strategy replacement cancels its in-flight background provider',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let signal,finish;
 const c=new PreviewController([provider(r=>{signal=r.signal;return new Promise(resolve=>finish=resolve);})],{strategy:{type:'custom',sample:()=>[3]},debounceMs:0});
 try{c.setDuration(20);await advance(t);await advance(t);assert.ok(signal);c.setStrategy({type:'on-demand'});assert.equal(signal.aborted,true);finish(frame(3));await new Promise(setImmediate);assert.equal(c.diagnostics.cacheEntries,0);}finally{await c.destroy();}
});

test('interaction context supports pure direction and dwell policies and resets across sources',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let clock=0;t.mock.method(performance,'now',()=>clock);const contexts=[];
 const c=new PreviewController([],{strategy:{type:'custom',sample:ctx=>{contexts.push(ctx);return [];}}});
 try{
  c.setDuration(100);c.setPlaybackPosition(10);await advance(t);
  assert.deepEqual(contexts.at(-1).interaction,{source:'playback',velocity:0,dwellMs:0});
  clock=100;c.setPlaybackPosition(10.2);await advance(t);
  assert.ok(Math.abs(contexts.at(-1).interaction.velocity-2)<1e-9);
  assert.equal(contexts.at(-1).interaction.dwellMs,100);
  clock=200;await c.getFrame({time:40.1,cacheOnly:true});await advance(t);
  assert.deepEqual(contexts.at(-1).interaction,{source:'hover',velocity:0,dwellMs:0});
  clock=300;await c.getFrame({time:40.6,cacheOnly:true});await advance(t);
  assert.deepEqual(contexts.at(-1).interaction,{source:'hover',velocity:5,dwellMs:100});
  clock=400;await c.getFrame({time:40.2,cacheOnly:true});c.setPlaybackPosition(11);await advance(t);
  assert.ok(contexts.at(-1).interaction.velocity<0);assert.equal(contexts.at(-1).focus,40.2);
  clock=1000;await advance(t);assert.equal(contexts.at(-1).interaction.velocity,0);assert.equal(contexts.at(-1).interaction.dwellMs,800);
  assert.ok(Object.isFrozen(contexts.at(-1).interaction));
  clock=2000;await advance(t);assert.equal(contexts.at(-1).focus,11);assert.deepEqual(contexts.at(-1).interaction,{source:'playback',velocity:0,dwellMs:100});
  c.setSourceIdentity('replacement');c.setDuration(20);await advance(t);
  assert.equal(contexts.at(-1).focus,0);assert.deepEqual(contexts.at(-1).interaction,{source:'playback',velocity:0,dwellMs:0});
 }finally{await c.destroy();}
});
test('interaction observations are deterministic and same-tick duplicates retain direction',async()=>{
 const {createPreviewInteraction,observePreviewInteraction:observe,snapshotPreviewInteraction:snapshot}=await import('../web/generated/internal/machine/preview-interaction.js');
 const initial=createPreviewInteraction();
 const events=[['hover',10.1,100],['hover',10.6,200],['hover',10.6,200]];
 const replay=()=>events.reduce((state,[source,focus,at])=>observe(state,source,focus,at,1),initial);
 const state=replay();assert.deepEqual(state,replay());assert.deepEqual(snapshot(state,250),{source:'hover',velocity:5,dwellMs:150});
 const crossed=observe(state,'hover',11,300,1);assert.equal(snapshot(crossed,350).dwellMs,50);
 const sameClock=observe(crossed,'hover',12,300,1);assert.equal(snapshot(sameClock,300).velocity,0);
 const reentry=observe(state,'hover',10.6,2000,1);assert.deepEqual(snapshot(reentry,2000),{source:'hover',velocity:0,dwellMs:0});
 assert.equal(observe(state,'hover',NaN,300,1),state);
});

const samplingContext=(overrides={})=>({duration:200,focus:100,bucketSeconds:1,
 interaction:{source:'hover',velocity:0,dwellMs:0},cachedTimestamps:[],
 budget:{maxEntries:96,maxBytes:16*1024*1024,usedEntries:0,usedBytes:0,availableEntries:96,availableBytes:16*1024*1024},...overrides});
test('Gaussian locations have normal density rather than a uniform nearest-first grid',async()=>{
 const {resolvePreviewStrategy:resolve}=await import('../web/generated/preview/strategies.js');
 const context=samplingContext(),sample=resolve({type:'gaussian'}).sample;
 const times=sample(context);assert.deepEqual(sample(context),times);assert.equal(times[0],100);
 assert.ok(times.length<=25&&times.length>=15);assert.equal(new Set(times).size,times.length);
 assert.ok(times.every(time=>Number.isInteger(time)&&Math.abs(time-100)<=30));
 assert.ok(times.filter(time=>Math.abs(time-100)<=10).length>times.length/2);
 const ordered=[...times].sort((a,b)=>a-b),gaps=ordered.slice(1).map((time,index)=>time-ordered[index]);
 assert.ok(Math.max(...gaps)>Math.min(...gaps));
 const spread=values=>values.reduce((sum,time)=>sum+Math.abs(time-100),0)/values.length;
 assert.ok(spread(resolve({type:'gaussian',sigma:20}).sample(context))>spread(resolve({type:'gaussian',sigma:5}).sample(context)));
 for(const time of times)assert.ok(times.includes(200-time));
});
test('directional locations respond to signed speed, cap prediction, and fall back at rest',async()=>{
 const {resolvePreviewStrategy:resolve}=await import('../web/generated/preview/strategies.js');
 const sample=resolve({type:'directional'}).sample;
 const moved=velocity=>sample(samplingContext({interaction:{source:'hover',velocity,dwellMs:0}}));
 const mean=times=>times.reduce((sum,time)=>sum+time,0)/times.length;
 const stationary=moved(0),forward=moved(10),backward=moved(-10),fast=moved(30);
 assert.equal(forward[0],100);assert.equal(backward[0],100);
 assert.ok(mean(forward)>mean(stationary));assert.ok(mean(backward)<mean(stationary));assert.ok(mean(fast)>mean(forward));
 assert.ok(forward.some(time=>time<100));assert.ok(backward.some(time=>time>100));
 assert.deepEqual(moved(1e9),fast);assert.deepEqual(moved(-1e9),moved(-30));
 assert.deepEqual(stationary,resolve({type:'gaussian'}).sample(samplingContext()));
 assert.deepEqual(sample(samplingContext({interaction:{source:'playback',velocity:100,dwellMs:0}})),stationary);
 assert.deepEqual(resolve({type:'directional',lookAhead:0}).sample(samplingContext({interaction:{source:'hover',velocity:100,dwellMs:0}})),stationary);
});
test('density presets bound output at video edges, short clips, tiny budgets and invalid options',async()=>{
 const {resolvePreviewStrategy:resolve}=await import('../web/generated/preview/strategies.js');
 for(const type of ['gaussian','directional']){
  const {sample}=resolve({type});
  for(const [duration,focus] of [[.1,0],[1,1],[20,0],[20,20],[20,1e6]]){
   const times=sample(samplingContext({duration,focus}));assert.ok(times.length>0&&times.length<=25);assert.ok(times.every(time=>time>=0&&time<duration));
  }
  const context=samplingContext();assert.equal(sample({...context,budget:{...context.budget,maxEntries:1}}).length,1);
  assert.deepEqual(sample({...context,budget:{...context.budget,maxBytes:0}}),[]);
  for(const config of [{samples:0},{samples:257},{samples:1.5},{every:0},{radius:-1},{radius:Infinity},{radius:3000,every:1}])assert.throws(()=>resolve({type,...config}));
 }
 for(const sigma of [0,-1,Infinity,NaN])assert.throws(()=>resolve({type:'gaussian',sigma}));
 for(const lookAhead of [-1,Infinity,NaN,6])assert.throws(()=>resolve({type:'directional',lookAhead}));
});
test('density presets use the bounded preview lane, preserve cache and stay disabled when toggled off',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let clock=0;t.mock.method(performance,'now',()=>clock);const seen=[];
 const c=new PreviewController([provider(async r=>{seen.push(r.time);return frame(r.time);})],{strategy:{type:'gaussian'},debounceMs:0,maxEntries:8,maxCacheBytes:4096});
 try{
  c.setDuration(200);c.setPlaybackPosition(100);for(let i=0;i<24;i++)await advance(t);
  assert.equal(seen[0],100);assert.ok(c.diagnostics.cacheEntries<=8&&c.diagnostics.cacheBytes<=4096);
  const count=seen.length;c.setStrategy({type:'directional'});for(let i=0;i<8;i++)await advance(t);assert.equal(seen.length,count);
  const current=c.strategy;assert.throws(()=>c.setStrategy({type:'gaussian',sigma:0}));assert.equal(c.strategy,current);
  c.enabled=false;clock=100;await c.getFrame({time:110,cacheOnly:true});clock=200;await c.getFrame({time:115,cacheOnly:true});
  for(let i=0;i<8;i++)await advance(t);assert.equal(seen.length,count);
  c.enabled=true;for(let i=0;i<8;i++)await advance(t);assert.ok(seen.length>count);
 }finally{await c.destroy();}
});
