// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {WasmPlayer} from '../../web/generated/internal/wasm-player.js';
const turn=()=>new Promise(setImmediate);
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};

async function fixture(t,{ready=true,modulePending=false}={}){
 const saved=new Map(),timers=new Set(),intervals=new Set(),messages=[],log=[],module=deferred();let worker,context,hook,clearHook,now=0;
 const install=(key,value)=>{saved.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});};
 install('performance',{now:()=>now,timeOrigin:0});
 install('crossOriginIsolated',true);install('location',{origin:'https://example.test'});
 install('setTimeout',(callback,delay)=>{const timer={callback,delay};timers.add(timer);return timer;});
 install('clearTimeout',timer=>{timers.delete(timer);clearHook?.(timer);});
 install('setInterval',(callback,delay)=>{const timer={callback,delay};intervals.add(timer);return timer;});
 install('clearInterval',timer=>{intervals.delete(timer);});
 class Worker{
  constructor(){worker=this;}
  postMessage(message){messages.push(message);if(hook)return hook(message);if(message.type==='destroy')this.emit({type:'destroyed'});}
  emit(data){this.onmessage?.({data});}
  event(event){this.emit({type:'event',event});}
  reply(id,result){this.event({event:'command-reply',id,result});}
  terminate(){log.push('terminate');}
 }
 class AudioContext{
  destination={maxChannelCount:2};audioWorklet={addModule:()=>modulePending?module.promise:Promise.resolve()};baseLatency=0;outputLatency=0;state='running';sampleRate=48000;currentTime=0;
  constructor(){context=this;}
  createAnalyser(){return{disconnect:()=>log.push('analyser-disconnect')};}
  close(){log.push('audio-close');return Promise.resolve();}
  resume(){log.push('resume');return Promise.resolve();}
 }
 class AudioWorkletNode{port={postMessage:()=>log.push('port-close-message'),close:()=>log.push('port-close')};connect(){}disconnect(){log.push('node-disconnect');}}
 install('AudioContext',AudioContext);install('AudioWorkletNode',AudioWorkletNode);
 const owner={hidden:false,setAttribute(){},contentWindow:{Worker},remove(){log.push('owner-remove');}};
 install('document',{body:{append(){}},createElement:()=>owner});
 const player=new WasmPlayer({width:320,height:180,transferControlToOffscreen:()=>({})},{assetBase:new URL('https://example.test/'),prepared:{font:new ArrayBuffer(1)}});void player.ready.catch(()=>{});
 await turn();if(ready){worker.emit({type:'ready',browserCodecsAbsent:false});await player.ready;}
 t.after(async()=>{hook=undefined;clearHook=undefined;await player.destroy().catch(()=>{});for(const [key,descriptor]of saved)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];});
 return{player,worker,context,messages,log,timers,intervals,module,owner,set hook(value){hook=value;},set clearHook(value){clearHook=value;},get now(){return now;},set now(value){now=value;},fire(delay,{early=false}={}){const timer=[...timers].find(timer=>timer.delay===delay);assert.ok(timer,'missing deadline '+delay);timers.delete(timer);if(!early)now+=delay;timer.callback();}};
}

test('actual RPC commits ownership before synchronous replies and preserves IDs',async t=>{
 const f=await fixture(t);f.hook=message=>{if(message.id)f.worker.reply(message.id,'ok');};
 assert.equal(await f.player.command('get','pause'),'ok');assert.equal(f.messages.find(message=>message.id).id,100);
 assert.equal(f.player.pending.size,0);assert.equal(f.player.lifecycle.requests.length,0);
});

test('throwing postMessage rejects the original error and removes RPC timer immediately',async t=>{
 const f=await fixture(t),error=Error('clone failure');f.hook=message=>{if(message.id)throw error;};
 await assert.rejects(f.player.command('stop'),reason=>reason===error);
 assert.equal(f.player.pending.size,0);assert.equal(f.player.lifecycle.requests.length,0);assert.equal([...f.timers].filter(timer=>timer.delay===15000).length,0);
});

test('RPC deadline and late/duplicate replies settle at most once',async t=>{
 const f=await fixture(t),promise=f.player.command('stop');await turn();const message=f.messages.find(message=>message.id);
 f.fire(15000);await assert.rejects(promise,/Command timed out/);f.worker.reply(message.id);f.worker.reply(message.id);
 assert.equal(f.player.pending.size,0);assert.equal(f.player.lifecycle.requests.length,0);
});

test('RPC cleanup reentry observes retired ownership and cannot settle the old request twice',async t=>{
 const f=await fixture(t);let nested,entered=false;const first=f.player.command('first');await turn();const id=f.messages.find(message=>message.id).id;
 f.clearHook=timer=>{if(timer?.delay===15000&&!entered){entered=true;assert.equal(f.player.lifecycle.requests.some(entry=>entry.id===id),false);nested=f.player.command('second');f.worker.reply(id,'late');}};
 f.worker.reply(id,'first');assert.equal(await first,'first');await turn();f.clearHook=undefined;
 const second=f.messages.find(message=>message.id===id+1);f.worker.reply(second.id,'second');assert.equal(await nested,'second');
});

test('destroy reentry shares one promise, retires pending requests/waits first and contains resources',async t=>{
 const f=await fixture(t),request=f.player.command('pending'),wait=f.player.waitForPreviewPresentation();await turn();let nested;
 f.player.loading.signal.addEventListener('abort',()=>{assert.equal(f.player.lifecycle.requests.length,0);assert.equal(f.player.lifecycle.waiters.length,0);nested=f.player.destroy();});
 const destroy=f.player.destroy();assert.equal(nested,destroy);await assert.rejects(request,/destroyed/);await assert.rejects(wait,/destroyed/);await destroy;
 assert.equal(f.player.lifecycle.phase,'closed');assert.deepEqual(f.log.filter(entry=>['terminate','owner-remove','audio-close'].includes(entry)),['terminate','owner-remove','audio-close']);
 assert.equal(f.intervals.size,0);assert.equal(f.timers.size,0);assert.equal(f.player.eventWaiters.size,0);
});

test('destroy before ready blocks late initialization work and late ready cannot revive it',async t=>{
 const f=await fixture(t,{ready:false,modulePending:true}),opened=f.player.open(new ArrayBuffer(4)),ready=f.player.ready;
 await f.player.destroy();await assert.rejects(opened,/destroyed/);await assert.rejects(ready,/destroyed/);
 f.module.resolve();await turn();f.worker.emit({type:'ready'});assert.equal(f.player.lifecycle.phase,'closed');
 assert.equal(f.messages.some(message=>message.type==='init'||message.type==='open'),false);assert.equal(f.intervals.size,0);
});

test('initialization timeout remains failed after a late ready reply',async t=>{
 const f=await fixture(t,{ready:false});f.fire(60000);let error;await assert.rejects(f.player.ready,value=>{error=value;return /initialization timed out/.test(value.message);});
 f.worker.emit({type:'ready'});assert.equal(f.player.lifecycle.phase,'failed');await assert.rejects(f.player.request({type:'command'}),value=>value===error);
});

test('destroy during stop prevents an accepted open continuation from sending a source',async t=>{
 const f=await fixture(t);f.hook=message=>{if(message.type==='destroy')f.worker.emit({type:'destroyed'});else if(message.id){f.worker.reply(message.id);void f.player.destroy();}};
 await assert.rejects(f.player.open(new ArrayBuffer(4)),/destroyed/);await f.player.destroy();
 assert.equal(f.messages.some(message=>message.type==='open'),false);assert.equal(f.player.lifecycle.open,null);
});

test('open overlap rejects and failure cancels its file-loaded waiter before a later successful open',async t=>{
 const f=await fixture(t);let first=true;
 f.hook=message=>{if(message.type==='destroy')f.worker.emit({type:'destroyed'});else if(message.type==='command')f.worker.reply(message.id);else if(message.type==='open'){if(first){first=false;throw Error('open transport failed');}f.worker.event({event:'start-file'});f.worker.reply(message.id);f.worker.event({event:'file-loaded'});}};
 const firstOpen=f.player.open(new ArrayBuffer(4));await assert.rejects(f.player.open(new ArrayBuffer(4)),/Another open/);await assert.rejects(firstOpen,/open transport failed/);
 assert.equal(f.player.eventWaiters.size,0);assert.equal(f.player.lifecycle.waiters.length,0);assert.equal(f.player.lifecycle.open,null);
 await f.player.open(new ArrayBuffer(4));assert.equal(f.player.lifecycle.hasFile,true);assert.equal(f.player.lifecycle.open,null);
});

test('event predicate exception removes the listener, timer and logical waiter',async t=>{
 const f=await fixture(t),error=Error('bad observation'),wait=f.player.waitForEvent(()=>{throw error;});
 f.worker.event({event:'playback-restart'});await assert.rejects(wait,value=>value===error);
 assert.equal(f.player.eventWaiters.size,0);assert.equal(f.player.lifecycle.waiters.length,0);assert.equal([...f.timers].some(timer=>timer.delay===25000),false);
});

test('event waiter deadline and later events cannot resurrect retired work',async t=>{
 const f=await fixture(t),wait=f.player.waitForPreviewPresentation();f.fire(25000);await assert.rejects(wait,/Media operation timed out/);
 f.worker.event({event:'playback-restart'});assert.equal(f.player.eventWaiters.size,0);assert.equal(f.player.lifecycle.waiters.length,0);
});

test('native cleanup deadline still terminates worker, removes owner and closes audio once',async t=>{
 const f=await fixture(t);f.hook=()=>{};const destroy=f.player.destroy();f.fire(10000);await assert.rejects(destroy,/cleanup timed out/);
 f.worker.emit({type:'destroyed'});assert.equal(f.player.lifecycle.phase,'closed');assert.equal(f.player.destroy(),destroy);
 for(const name of ['terminate','owner-remove','audio-close'])assert.equal(f.log.filter(entry=>entry===name).length,1);
});

test('throwing physical cleanup cannot strand remaining resources',async t=>{
 const f=await fixture(t),error=Error('containment failure');f.worker.terminate=()=>{f.log.push('terminate');throw error;};
 await assert.rejects(f.player.destroy(),value=>value===error);assert.ok(f.log.includes('owner-remove'));assert.ok(f.log.includes('audio-close'));assert.equal(f.player.lifecycle.phase,'closed');
});


test('early RPC timer is rearmed against sampled time without settling',async t=>{
 const f=await fixture(t),request=f.player.command('stop');await turn();let settled=false;void request.finally(()=>{settled=true;}).catch(()=>{});
 f.now=14999;f.fire(15000,{early:true});await turn();assert.equal(settled,false);assert.equal(f.player.lifecycle.requests.length,1);
 f.fire(1);await assert.rejects(request,/Command timed out/);assert.equal(f.player.pending.size,0);
});

test('early event timer is rearmed against sampled time without settling',async t=>{
 const f=await fixture(t),wait=f.player.waitForPreviewPresentation();let settled=false;void wait.finally(()=>{settled=true;}).catch(()=>{});
 f.now=24999;f.fire(25000,{early:true});await turn();assert.equal(settled,false);assert.equal(f.player.lifecycle.waiters.length,1);
 f.fire(1);await assert.rejects(wait,/Media operation timed out/);assert.equal(f.player.eventWaiters.size,0);
});

test('throwing RPC timer cleanup still rejects and cannot orphan its settled promise',async t=>{
 const f=await fixture(t),error=Error('timer cleanup failed'),request=f.player.command('stop');await turn();
 f.clearHook=timer=>{if(timer?.delay===15000)throw error;};f.worker.reply(100,'ok');
 await assert.rejects(request,value=>value===error);assert.equal(f.player.pending.size,0);assert.equal(f.player.lifecycle.requests.length,0);f.clearHook=undefined;
});

test('throwing waiter cleanup still removes listener and settles the promise',async t=>{
 const f=await fixture(t),error=Error('waiter timer cleanup failed'),wait=f.player.waitForPreviewPresentation();
 f.clearHook=timer=>{if(timer?.delay===25000)throw error;};f.worker.event({event:'playback-restart'});
 await assert.rejects(wait,value=>value===error);assert.equal(f.player.eventWaiters.size,0);assert.equal(f.player.lifecycle.waiters.length,0);
 f.clearHook=undefined;f.worker.event({event:'playback-restart'});
});

test('destroy settles a waiter even when timer cleanup throws and still contains every resource',async t=>{
 const f=await fixture(t),error=Error('waiter cleanup failed'),wait=f.player.waitForPreviewPresentation();
 f.clearHook=timer=>{if(timer?.delay===25000)throw error;};const destroyed=f.player.destroy();
 await assert.rejects(wait,/Player destroyed/);await assert.rejects(destroyed,value=>value===error);
 for(const name of ['terminate','owner-remove','audio-close'])assert.equal(f.log.filter(entry=>entry===name).length,1);
 assert.equal(f.player.eventWaiters.size,0);assert.equal(f.player.lifecycle.waiters.length,0);f.clearHook=undefined;
});
