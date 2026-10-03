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


test('worker error with sentinel ID zero rejects every pending request as before',async t=>{
 const f=await fixture(t),first=f.player.command('first'),second=f.player.command('second');await turn();
 f.worker.emit({type:'error',id:0,message:'worker-wide failure'});
 await assert.rejects(first,/worker-wide failure/);await assert.rejects(second,/worker-wide failure/);
 assert.equal(f.player.pending.size,0);assert.equal(f.player.lifecycle.requests.length,0);
});

test('seek confirmation survives immutable restart observations while rejecting a newer equal-target seek',async t=>{
 const f=await fixture(t);f.hook=message=>{if(message.type==='seek')f.worker.reply(message.id);};
 await f.player.seek(5);const first=f.player.confirmSeek(5);await turn();const firstId=f.messages.at(-1).id;
 f.worker.event({event:'playback-restart'});f.worker.reply(firstId,'5|no');assert.equal(await first,true);
 const old=f.player.confirmSeek(5);await turn();const oldId=f.messages.at(-1).id;await f.player.seek(5);
 f.worker.reply(oldId,'3|no');assert.equal(await old,false);assert.equal(f.player.seekBoundary(5),undefined);
});

test('native clamping uses completed presentation and idle EOF, then source start clears it',async t=>{
 const f=await fixture(t);f.hook=message=>{if(message.type==='seek')f.worker.reply(message.id);};await f.player.seek(10);
 f.worker.event({event:'property-change',name:'demuxer-cache-state',data:{eof:true,idle:true}});f.worker.event({event:'playback-restart'});
 const confirmed=f.player.confirmSeek(10);await turn();f.worker.reply(f.messages.at(-1).id,'8|no');assert.equal(await confirmed,false);assert.equal(f.player.seekBoundary(10),8);
 f.worker.event({event:'start-file'});assert.equal(f.player.seekBoundary(10),undefined);assert.equal(await f.player.confirmSeek(10),true);
});

test('retired valid seek rejects before touching the physical audio ring',async t=>{
 const f=await fixture(t);await f.player.destroy();Atomics.store(f.player.audioHeader,2,11);
 await assert.rejects(f.player.seek(2),/destroyed/);assert.equal(Atomics.load(f.player.audioHeader,2),11);assert.equal(f.player.lifecycle.seek.seek,null);
});

test('failed volume leaves accepted mute/gain state and actual graph unchanged',async t=>{
 const f=await fixture(t),values=[];f.player.gainNode={gain:{setValueAtTime:value=>values.push(value)},disconnect(){}};
 f.hook=message=>{if(message.id)f.worker.reply(message.id);};await f.player.gain(.4);await f.player.volume(0);await f.player.gain(.2);
 assert.deepEqual(values,[.4,0,0]);assert.equal(f.player.lifecycle.settings.gain,.2);assert.equal(f.player.lifecycle.settings.volume,0);
 const error=Error('volume rejected');f.hook=message=>{if(message.id)throw error;};await assert.rejects(f.player.volume(50),value=>value===error);
 assert.equal(f.player.lifecycle.settings.volume,0);assert.deepEqual(values,[.4,0,0]);
 f.hook=message=>{if(message.id)f.worker.reply(message.id);};await f.player.volume(50);assert.equal(values.at(-1),.2);
});

test('partially failed buffering preserves old policy and only acknowledges successful commands',async t=>{
 const f=await fixture(t),error=Error('buffer rejected');let writes=0;f.hook=message=>{if(message.id){if(++writes===2)throw error;f.worker.reply(message.id);}};
 await assert.rejects(f.player.setBuffering({profile:'low-latency',preload:'metadata'}),value=>value===error);
 assert.equal(f.player.bufferingDiagnostics.requestedProfile,'balanced');assert.deepEqual(f.player.lifecycle.settings.bufferingSettings,{cache:'yes'});
});

test('buffering captures one caller policy before asynchronous native acknowledgments',async t=>{
 const f=await fixture(t),policy={profile:'low-latency',preload:'metadata'};let first=true;
 f.hook=message=>{if(message.id){if(first){first=false;policy.profile='resilient';policy.preload='auto';}f.worker.reply(message.id);}};
 await f.player.setBuffering(policy);assert.equal(Object.isFrozen(policy),false);assert.equal(f.player.bufferingDiagnostics.requestedProfile,'low-latency');assert.equal(f.player.bufferingDiagnostics.preload,'metadata');
 assert.equal(f.player.lifecycle.settings.bufferingSettings['demuxer-max-bytes'],'8388608');assert.equal(f.player.lifecycle.settings.bufferingSettings['cache-secs'],'1');
});

test('synchronous destruction after native volume reply prevents late accepted settings',async t=>{
 const f=await fixture(t);f.hook=message=>{if(message.type==='destroy')f.worker.emit({type:'destroyed'});else if(message.id){f.worker.reply(message.id);void f.player.destroy();}};
 await assert.rejects(f.player.volume(0),/destroyed/);await f.player.destroy();assert.equal(f.player.lifecycle.settings.volume,100);
});

test('synchronous destruction after buffering reply stops later writes and policy acceptance',async t=>{
 const f=await fixture(t);f.hook=message=>{if(message.type==='destroy')f.worker.emit({type:'destroyed'});else if(message.id){f.worker.reply(message.id);void f.player.destroy();}};
 await assert.rejects(f.player.setBuffering({profile:'resilient',preload:'none'}),/destroyed/);await f.player.destroy();
 assert.equal(f.messages.filter(message=>message.type==='command').length,1);assert.equal(f.player.lifecycle.settings.buffering.profile,'balanced');assert.deepEqual(f.player.lifecycle.settings.bufferingSettings,{});
});

test('timing and watchdog observations suppress retired worker writes while preserving explicit force',async t=>{
 const f=await fixture(t);f.messages.length=0;f.player.sendTiming();assert.equal(f.messages.length,0);f.player.sendTiming(true);assert.equal(f.messages.length,1);
 f.context.outputLatency=.012;f.player.sendTiming();assert.deepEqual(f.messages.at(-1),{type:'timing',latencyUs:12000,running:true});
 f.player.setWatchdogs({decoderOutput:false});assert.deepEqual(f.messages.at(-1),{type:'watchdogs',decoderOutput:false});
 await f.player.destroy();const state=f.player.lifecycle,count=f.messages.length;f.player.sendTiming(true);f.player.setWatchdogs({decoderOutput:true});assert.equal(f.messages.length,count);assert.equal(f.player.lifecycle,state);
});


test('gain acquired after synchronous destruction is disconnected without installing a stage',async t=>{
 const f=await fixture(t);let disconnected=0;f.context.createGain=()=>{void f.player.destroy();return{disconnect(){disconnected++;}};};
 await assert.rejects(f.player.gain(.3),/destroyed/);await f.player.destroy();assert.equal(disconnected,1);assert.equal(f.player.gainNode,undefined);assert.equal(f.player.lifecycle.settings.gain,1);
});

test('gain graph reentry cannot reconnect a resource after backend retirement',async t=>{
 const f=await fixture(t),actions=[];const node={gain:{setValueAtTime(){}},disconnect(){actions.push('disconnect');},connect(){actions.push('connect');}};
 f.context.createGain=()=>node;f.player.audioNode.disconnect=()=>{actions.push('source-disconnect');void f.player.destroy();};
 await assert.rejects(f.player.gain(.3),/destroyed/);await f.player.destroy();assert.equal(actions.includes('connect'),false);assert.ok(actions.includes('disconnect'));assert.equal(f.player.lifecycle.settings.gain,1);
});

test('failed gain graph setup removes the partial stage and preserves the original error',async t=>{
 const f=await fixture(t),error=Error('gain connection failed');let disconnected=0;const node={gain:{setValueAtTime(){}},disconnect(){disconnected++;},connect(){throw error;}};f.context.createGain=()=>node;
 await assert.rejects(f.player.gain(.3),reason=>reason===error);assert.equal(f.player.gainNode,undefined);assert.equal(f.player.lifecycle.settings.gain,1);assert.equal(disconnected,1);
});


test('gain rollback stops reconnecting when cleanup synchronously destroys the backend',async t=>{
 const f=await fixture(t),error=Error('graph setup failed'),connections=[];let node;
 f.context.createGain=()=>node={gain:{setValueAtTime(){}},disconnect(){void f.player.destroy();},connect(){throw error;}};
 f.player.audioNode.connect=target=>connections.push(target);
 await assert.rejects(f.player.gain(.3),reason=>reason===error);await f.player.destroy();assert.deepEqual(connections,[node]);assert.equal(f.player.lifecycle.settings.gain,1);
});
test('actual failed ready cannot retain a subtitle identity or copy native bytes',async t=>{
 const f=await fixture(t,{ready:false});const promise=f.player.addSubtitle({format:'srt',label:'late',attachmentId:'late',bytes:new ArrayBuffer(2),select:false});f.worker.emit({type:'error',message:'init failed',assetFailure:true});await assert.rejects(promise,/init failed/);assert.equal(f.player.lifecycle.attachments?.length??f.player.attachmentIds.length,0);assert.equal(f.messages.filter(message=>message.type==='subtitle').length,0);
});
test('actual synchronous subtitle acknowledgment publishes the bounded pending identity first',async t=>{
 const f=await fixture(t);f.hook=message=>{if(message.type==='subtitle'){f.worker.event({event:'property-change',name:'track-list',data:[{external:true,type:'sub',id:1}]});f.worker.reply(message.id,true);}};
 await f.player.addSubtitle({format:'srt',label:'one',attachmentId:'one',bytes:new ArrayBuffer(2),select:false});assert.equal(f.player.properties.get('track-list')[0]['attachment-id'],'one');assert.equal(f.player.lifecycle.attachments[0].status,'accepted');assert.equal(f.player.lifecycle.attachmentPending,null);
});
test('actual native subtitle rejection retains uncertain bytes and blocks repeated unaccounted acquisition',async t=>{
 const f=await fixture(t);f.hook=message=>{if(message.type==='subtitle')f.worker.event({event:'command-reply',id:message.id,error:'subtitle rejected'});};
 const subtitle={format:'srt',label:'bad',attachmentId:'bad',bytes:new ArrayBuffer(2),select:false};await assert.rejects(f.player.addSubtitle(subtitle),/subtitle rejected/);if(f.player.lifecycle.attachments){assert.equal(f.player.lifecycle.attachments[0].status,'uncertain');assert.equal(f.player.lifecycle.attachments[0].identity,undefined);}
 await assert.rejects(f.player.addSubtitle(subtitle),/uncertain/);assert.equal(f.messages.filter(message=>message.type==='subtitle').length,1);
});
test('actual subtitle rejection before native submission rolls back reserved metadata',async t=>{
 const f=await fixture(t);f.player.lifecycle={...f.player.lifecycle,requests:Array.from({length:128},(_,index)=>({id:index+1000,deadline:15000}))};
 await assert.rejects(f.player.addSubtitle({format:'srt',label:'full',attachmentId:'full',bytes:new ArrayBuffer(2),select:false}),/queue is full/);assert.equal(f.player.lifecycle.attachments?.length??f.player.attachmentIds.length,0);assert.equal(f.player.lifecycle.attachmentFailed,false);assert.equal(f.messages.filter(message=>message.type==='subtitle').length,0);
});
