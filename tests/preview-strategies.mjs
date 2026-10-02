// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PreviewPregenerator} from '../web/generated/preview/pregeneration.js';
import {PreviewController} from '../web/generated/preview/controller.js';
import {createPlayerPreview} from '../web/generated/preview/player-preview.js';
const advance=async t=>{t.mock.timers.tick(500);await new Promise(setImmediate);};
const frame=time=>({time,width:8,height:8,image:{blob:new Blob(['image'])},path:'test'});
const provider=getFrame=>({id:'test',priority:1,canHandle:()=>true,getFrame});

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
