// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as core from '../../web/generated/internal/machine/playback-host.js';
const source=(await readFile(process.env.PLAYBACK_HOST_SOURCE??new URL('../../web/private-mpv/playback-host.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'').replace('export class PrivatePlaybackHost','class PrivatePlaybackHost')+'\nPrivatePlaybackHost;';
const Constructor=vm.runInNewContext(source,{...core,Promise,Error,AggregateError,Number,JSON,TextEncoder,Uint8Array,Uint8ClampedArray,ImageData:class{constructor(width,height){this.width=width;this.height=height;this.data=new Uint8ClampedArray(width*height*4);}},PrivatePCMTransport:class{constructor(engine){engine.audioConstructed?.();}stop(){return Promise.resolve();}snapshot(){return{};}}});
function fixture(options={}){
 const calls=[],freed=[],events=[],drawn=[],memory=new WebAssembly.Memory({initial:1});let native=256;
 const engine={raw:{memory},module:{UTF8ToString:()=>events.shift()},source:{generation:1,setSource(){options.setSource?.();},drainFailures:()=>options.failures??[],cancelSource(){calls.push('cancelSource');options.cancel?.();},snapshot:()=>({})},scheduler:{snapshot:()=>({})},dispose(){calls.push('dispose');options.dispose?.();},async call(name,...args){calls.push(name);if(options.call)return options.call(name,args,{freed,events});if(name==='malloc')return native+=64;if(name==='free')freed.push(args[0]);if(name==='web_event')return events.length?128:0;if(name==='web_render')return options.renderPointer??0;return 0;}};
 const host=new Constructor(engine,{getContext:()=>({putImageData(){drawn.push(1);options.present?.();}})},4,4,options.hostOptions);
 return{host,engine,calls,freed,events,drawn};
}
function deferred(){let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve};}
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('native acquisition completing after close is cleaned without reviving creation',async()=>{
 const gate=deferred();const f=fixture({call:async(name)=>name==='web_create'?gate.promise:0});const creating=f.host.create({});await turn();const closing=f.host.destroy();gate.resolve(0);await assert.rejects(creating,/closed|replaced/);await closing;assert.equal(f.calls.filter(n=>n==='web_destroy').length,1);assert.equal(f.host.created,false);assert.equal(f.calls.filter(n=>n==='dispose').length,1);
});
test('queued command loses admission immediately when destroy is requested',async()=>{
 const f=fixture(),gate=deferred();f.host.serial(()=>gate.promise);const command=f.host.command(1,'pause'),closing=f.host.destroy();gate.resolve();await assert.rejects(command,/closed|replaced/);await closing;assert.equal(f.calls.includes('malloc'),false);
});
test('queued create cannot acquire native state after close',async()=>{
 const f=fixture(),gate=deferred();f.host.serial(()=>gate.promise);const create=f.host.create({}),close=f.host.destroy();gate.resolve();await assert.rejects(create,/closed|replaced/);await close;assert.equal(f.calls.includes('web_create'),false);
});
test('late native render cannot present or count a retired frame',async()=>{
 const gate=deferred(),f=fixture({call:async name=>name==='web_render'?gate.promise:0});const pumping=f.host.pump();await turn();const close=f.host.destroy();gate.resolve(1024);await assert.rejects(pumping,/closed|replaced/);await close;assert.equal(f.drawn.length,0);assert.equal(f.host.draws,0);assert.equal(f.calls.includes('web_presented'),false);
});
test('late string allocation is released but never submitted',async()=>{
 const gate=deferred();const f=fixture({call:async(name,args,{freed})=>{if(name==='malloc')return gate.promise;if(name==='free')freed.push(args[0]);return 0;}}),command=f.host.command(1,'pause');await turn();const close=f.host.destroy();gate.resolve(256);await assert.rejects(command,/closed|replaced/);await close;assert.deepEqual(f.freed,[256]);assert.equal(f.calls.includes('web_command_args'),false);
});
test('all native strings are released even when the first free fails',async()=>{
 let ptr=128;const f=fixture({call:async(name,args,{freed})=>{if(name==='malloc')return ptr+=128;if(name==='free'){freed.push(args[0]);if(args[0]===256)throw Error('first free');}return 0;}});await assert.rejects(f.host.command(1,'set','pause','yes'),/first free/);assert.deepEqual(f.freed,[256,384,512]);
});
test('destroy identity is shared and every cleanup effect executes once',async()=>{
 const f=fixture();await f.host.create({});const first=f.host.destroy(),second=f.host.destroy();assert.equal(first,second);await first;assert.equal(f.calls.filter(n=>n==='cancelSource').length,1);assert.equal(f.calls.filter(n=>n==='web_destroy').length,1);assert.equal(f.calls.filter(n=>n==='dispose').length,1);
});
test('cancel failure cannot skip native disposal and retained cleanup',async()=>{
 let cleared=0;const f=fixture({cancel:()=>{throw Error('cancel failed');},hostOptions:{retained:{clear(){cleared++;},snapshot:()=>({})}}});let closing;assert.doesNotThrow(()=>{closing=f.host.destroy();});await assert.rejects(closing,/cancel failed/);assert.equal(f.calls.includes('dispose'),true);assert.equal(cleared,1);
});
test('opaque command failure is preserved while releasing all strings',async()=>{
 const f=fixture({call:async(name,args,{freed})=>{if(name==='malloc')return 256;if(name==='web_command_args')throw undefined;if(name==='free')freed.push(args[0]);return 0;}});let rejected=false;try{await f.host.command(1,'pause');}catch(error){rejected=true;assert.equal(error,undefined);}assert.equal(rejected,true);assert.deepEqual(f.freed,[256]);
});
test('late event string is freed without publishing a property',async()=>{
 const gate=deferred();let eventTaken=false;const f=fixture({call:async(name,args,{freed})=>{if(name==='web_event'){if(eventTaken)return 0;eventTaken=true;return gate.promise;}if(name==='free')freed.push(args[0]);return 0;}});f.events.push(JSON.stringify({event:'property-change',name:'duration',data:12}));const pump=f.host.pump(false,false);await turn();const close=f.host.destroy();gate.resolve(128);await assert.rejects(pump,/closed|replaced/);await close;assert.deepEqual(f.freed,[128]);assert.equal(f.host.properties.duration,undefined);
});
test('native method getter retirement fences the command effect',async()=>{
 const f=fixture();let old=f.engine.call;Object.defineProperty(f.engine,'call',{get(){f.host.destroy();return old;}});await assert.rejects(f.host.command(1,'pause'),/closed|replaced/);await f.host.destroy();assert.equal(f.calls.includes('malloc'),false);
});
test('retained presentation method getter retirement fences pixel effects',async()=>{
 let presented=0,f;const retained={clear(){},snapshot:()=>({}),get present(){f.host.destroy();return()=>{presented++;return true;};}};f=fixture({hostOptions:{retained}});await assert.rejects(f.host.pump(),/closed|replaced/);await f.host.destroy();assert.equal(presented,0);
});
test('source cancellation callback sees already-latched failure authority',async()=>{
 let observed;const f=fixture({failures:[{generation:1,kind:'network'}],cancel:()=>{observed=f.host.control.sourceFailed;}});await assert.rejects(f.host.pump(),/Source transport: network/);assert.equal(observed,true);f.engine.source.drainFailures=()=>[];await assert.rejects(f.host.pump(),/Source transport/);
});
test('event draining and retained history have independent finite budgets',async()=>{
 const f=fixture();for(let i=0;i<320;i++)f.events.push(JSON.stringify({event:'property-change',name:'time-pos',data:i}));for(let i=0;i<5;i++)assert.equal((await f.host.pump(false,false)).length,64);assert.equal(f.host.events.length,256);assert.equal(f.host.events[0].data,64);assert.equal(f.host.properties['time-pos'],319);assert.equal(f.host.control.events,256);
});
test('duration policy follows observed native events rather than mutable diagnostics',async()=>{
 const f=fixture(),commands=[];f.events.push(JSON.stringify({event:'property-change',name:'duration',data:12}));await f.host.pump(false,false);f.host.properties.duration=120;f.host.command=async(id,...args)=>commands.push(args);await f.host.seek(1,9.5);assert.equal(commands[0][2],'10.5');
});
test('render size invalidation and pause gates preserve exact native flags',async()=>{
 const flags=[],f=fixture({call:async(name,args)=>{if(name==='web_render')flags.push(args[2]);return 0;}});await f.host.pump();await f.host.pump();f.host.width=8;await f.host.pump(false,false);await f.host.pump();await f.host.pump(true);assert.deepEqual(flags,[1,0,1,1]);
});
test('repeated native create is rejected before allocating a second engine',async()=>{const f=fixture();await f.host.create({});await assert.rejects(f.host.create({}),/already created/);assert.equal(f.calls.filter(n=>n==='web_create').length,1);});
for(let seed=1;seed<=12;seed++)test(`composed lifetime history ${seed}: reset, duration, faults, render and terminal closure`,()=>{
 let state=core.initialPlaybackHost(seed%3===0?8:2,seed%2===0),serial=seed;
 for(let step=0;step<120;step++){
  serial=(serial*1664525+1013904223)>>>0;const epoch=state.epoch;
  if(step===110)state=core.closePlaybackHost(state);
  const before=state;
  switch(serial%7){
   case 0:if(state.phase==='active')state=core.resetPlaybackHostSource(state);break;
   case 1:state=core.observePlaybackHostEvent(state,epoch,{kind:'property-change',name:'duration',duration:serial%120}).state;break;
   case 2:state=core.setPlaybackHostPreroll(state,serial%100);break;
   case 3:state=core.beginPlaybackHostRender(state,epoch,serial%8+1,4,!!(serial%2)).state;break;
   case 4:state=core.presentPlaybackHost(state,epoch);break;
   case 5:state=core.failPlaybackHostSource(state,epoch);break;
   case 6:state=core.observePlaybackHostEvent(state,epoch,{kind:'command-reply',error:'failed'}).state;break;
  }
  assert.ok(Object.isFrozen(state));assert.ok(state.events<=256);assert.ok(state.draws>=0);assert.ok(state.seekPreroll<=60);
  if(step>=110)assert.equal(state,before,'terminal histories cannot acquire new forward authority');
  assert.equal(core.playbackHostCurrent(state,epoch-1),false);
 }
 state=core.finishPlaybackHostClose(state);assert.equal(state.phase,'closed');assert.equal(state.created,false);
});

test('unchanged render dimensions preserve immutable state through idle and forced pumps',async()=>{
 const f=fixture();await f.host.pump();const original=f.host.control;
 for(let i=0;i<100;i++)await f.host.pump(i%2===0);
 assert.equal(core.beginPlaybackHostRender(original,original.epoch,4,4,true).state,original);
 assert.equal(f.host.control.renderWidth,original.renderWidth);assert.equal(f.host.control.renderHeight,original.renderHeight);
 f.host.width=8;await f.host.pump();assert.notEqual(f.host.control,original);
 assert.equal(original.renderWidth,4);assert.equal(f.host.control.renderWidth,8);
});

test('host queue pressure rejects before retaining excess commands and reserves close cleanup',async()=>{
 const f=fixture(),gate=deferred();await f.host.create({});const active=f.host.serial(()=>gate.promise);await turn();
 const queued=Array.from({length:127},()=>f.host.command(1,'pause'));
 await assert.rejects(f.host.command(1,'pause'),/queue capacity/);assert.equal(f.host.work.size,128);
 const closing=f.host.destroy();await Promise.all(queued.map(p=>assert.rejects(p,/closed|replaced/)));
 assert.equal(f.host.work.size,2);assert.equal(f.host.control.queue.length,1);assert.equal(f.calls.filter(n=>n==='web_destroy').length,0);
 gate.resolve();await assert.rejects(active,/closed|replaced/);await closing;
 assert.equal(f.host.work.size,0);assert.equal(f.host.control.activeWork,null);assert.equal(f.calls.filter(n=>n==='web_destroy').length,1);
});
test('source replacement releases queued payload closures without growing a blocked native chain',async()=>{
 const f=fixture(),gate=deferred(),active=f.host.serial(()=>gate.promise);await turn();
 for(let generation=0;generation<20;generation++){
  let invoked=0;const queued=Array.from({length:127},()=>f.host.serial(()=>{invoked++;}));f.host.resetSource();
  await Promise.all(queued.map(p=>assert.rejects(p,/closed|replaced/)));assert.equal(f.host.work.size,1);assert.equal(f.host.control.queue.length,0);assert.equal(invoked,0);
 }
 const final=f.host.serial(()=>42);gate.resolve();await assert.rejects(active,/closed|replaced/);assert.equal(await final,42);assert.equal(f.host.work.size,0);await f.host.destroy();
});
test('cleanup bypasses exhausted forward queue identities without reviving admission',async()=>{
 const f=fixture();await f.host.create({});f.host.control=Object.freeze({...f.host.control,workSerial:Number.MAX_SAFE_INTEGER});
 await assert.rejects(f.host.command(1,'pause'),/identity exhausted/);await f.host.destroy();assert.equal(f.calls.filter(n=>n==='web_destroy').length,1);assert.equal(f.host.work.size,0);
});
test('pure queue stale completion cannot release current active ownership',()=>{
 let state=core.initialPlaybackHost();const first=core.admitPlaybackHostWork(state);state=core.startPlaybackHostWork(first.state).state;
 const queued=core.admitPlaybackHostWork(state);state=core.resetPlaybackHostSource(queued.state);assert.equal(state.queue.length,0);assert.equal(state.activeWork.id,first.work.id);
 assert.equal(core.finishPlaybackHostWork(state,queued.work.id),state);state=core.finishPlaybackHostWork(state,first.work.id);assert.equal(state.activeWork,null);
 const closed=core.closePlaybackHost(state);assert.ok(core.admitPlaybackHostWork(closed).error);const cleanup=core.admitPlaybackHostWork(closed,true);assert.equal(cleanup.work.cleanup,true);assert.ok(core.admitPlaybackHostWork(cleanup.state,true).error);
});
test('host admission refuses excess work while native execution is blocked',async()=>{
 const f=fixture(),gate=deferred(),pending=[];let rejection;
 try{
  for(let i=0;i<128;i++)pending.push(f.host.serial(()=>gate.promise));
  const excess=f.host.serial(()=>{});pending.push(excess);void excess.catch(error=>rejection=error);await turn();
  assert.match(String(rejection),/queue capacity/);
 }finally{gate.resolve();await Promise.allSettled(pending);await f.host.destroy();}
});
