// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as pcm from '../../web/generated/internal/machine/private-pcm.js';
import {PrivatePCMTransport} from '../../web/private-mpv/playback-pcm.js';
const header=extra=>({produced:0,consumed:0,epoch:2,nativeRunning:true,contextRunning:true,userPaused:false,...extra});
function model(profile='playback',capacity=8192,channels=2){
 let state=pcm.createPrivatePCM(profile,capacity,channels),facts=header();
 const step=()=>{const previous=state,text=JSON.stringify(previous),result=pcm.nextPrivatePCMStep(state,facts);assert.equal(JSON.stringify(previous),text);state=result.state;return result.effect;};
 const feedback=input=>{const result=pcm.privatePCMFeedback(state,input,facts.epoch,facts.consumed);state=result.state;if(result.write)facts={...facts,consumed:result.write.consumed};return result;};
 const flush=()=>{const effects=[];for(let i=0;i<40;i++){const effect=step();if(effect.kind==='idle')return effects;effects.push(effect);if(effect.kind==='reset'||effect.kind==='error')return effects;}throw Error('Unbounded PCM pump');};
 return{get state(){return state;},get facts(){return facts;},set facts(value){facts={...value};},step,feedback,flush};
}
for(const profile of ['playback','audio'])test(`${profile} reset gates samples and preserves startup publication order`,()=>{
 const m=model(profile);assert.deepEqual(m.step(),{kind:'reset',epoch:2,capacity:8192,channels:2});assert.equal(m.step().kind,'idle');
 assert.deepEqual(m.feedback({kind:'resetAck',epoch:2}).write,{epoch:2,consumed:0});m.facts=header({produced:2050});
 const effects=m.flush();assert.deepEqual(effects.map(effect=>effect.kind),profile==='audio'?['state','pcm','pcm','pcm']:['pcm','pcm','pcm','state']);
 assert.deepEqual(effects.filter(effect=>effect.kind==='pcm').map(effect=>[effect.start,effect.frames]),[[0,1024],[1024,1024],[2048,2]]);
 assert.equal(m.state.posted,2050);assert.equal(m.state.maxOutstanding,2050);assert.equal(m.state.running,true);
 assert.equal(m.feedback({kind:'resetAck',epoch:2}).pump,false,'duplicate acknowledgment cannot reset consumption');
});
test('playback waits for nonempty startup and resume but preserves real running starvation',()=>{
 const m=model();m.step();m.feedback({kind:'resetAck',epoch:2});assert.deepEqual(m.flush().map(effect=>effect.running),[false]);
 m.facts=header({produced:32});m.flush();m.feedback({kind:'consumed',epoch:2,frames:32});assert.deepEqual(m.flush(),[]);assert.equal(m.state.running,true);
 m.facts={...m.facts,contextRunning:false};assert.deepEqual(m.flush().map(effect=>effect.running),[false]);
 m.facts={...m.facts,contextRunning:true};assert.deepEqual(m.flush(),[]);m.facts={...m.facts,produced:64};assert.deepEqual(m.flush().map(effect=>effect.kind),['pcm','state']);
});
test('native epoch transitions reject old feedback and reset only after an even epoch',()=>{
 const m=model();m.step();m.feedback({kind:'resetAck',epoch:2});m.facts=header({produced:1024});m.flush();
 m.facts=header({epoch:3});assert.equal(m.step().kind,'idle');assert.equal(m.feedback({kind:'consumed',epoch:2,frames:512}).write,null);
 m.facts=header({epoch:4});assert.equal(m.step().kind,'reset');assert.equal(m.state.posted,0);assert.equal(m.state.ack,false);
 assert.equal(m.feedback({kind:'resetAck',epoch:2}).write,null);assert.equal(m.state.staleFeedback,2);
 assert.equal(m.feedback({kind:'resetAck',epoch:4}).write.epoch,4);
});
test('counter bounds reject regressions and overflow while feedback cannot consume unposted data',()=>{
 for(const facts of [header({produced:8193}),header({produced:0,consumed:1})]){const m=model();m.step();m.feedback({kind:'resetAck',epoch:2});m.facts=facts;assert.equal(m.step().kind,'error');}
 const m=model();m.step();m.feedback({kind:'resetAck',epoch:2});m.facts=header({produced:1024});m.flush();
 for(const frames of [-1,.5,1025,NaN]){const prior=m.state;assert.equal(m.feedback({kind:'consumed',epoch:2,frames}).error,'Invalid consumption feedback');assert.equal(m.state,prior);}
 m.feedback({kind:'consumed',epoch:2,frames:512});assert.equal(m.feedback({kind:'consumed',epoch:2,frames:511}).error,'Invalid consumption feedback');
 m.facts={...m.facts,produced:1023};assert.equal(m.step().kind,'error');
});
test('geometry, pump admission and failure authority remain immutable and bounded',()=>{
 assert.throws(()=>pcm.createPrivatePCM('playback',8193),/capacity/);assert.throws(()=>pcm.createPrivatePCM('playback',8192,7),/channel/);
 const initial=pcm.createPrivatePCM('playback',32768,8),start=pcm.beginPrivatePCMPump(initial);assert.equal(start.accepted,true);assert.equal(pcm.beginPrivatePCMPump(start.state).accepted,false);assert.equal(initial.pumping,false);
 const stopped=pcm.finishPrivatePCMPump(start.state);assert.equal(stopped.pumping,false);const failed=pcm.failPrivatePCM(stopped,'sample failure');
 assert.equal(pcm.failPrivatePCM(failed.state,'later').accepted,false);assert.equal(failed.state.error,'sample failure');assert.equal(pcm.beginPrivatePCMPump(failed.state).accepted,false);
});
for(const profile of ['playback','audio'])test(`${profile} stop admits once, rejects wrong identities and settles exactly once`,()=>{
 const initial=pcm.createPrivatePCM(profile),stop=pcm.beginPrivatePCMStop(initial,20);assert.equal(stop.deadline,1020);assert.equal(pcm.beginPrivatePCMStop(stop.state,90).accepted,false);
 assert.equal(pcm.settlePrivatePCMStop(stop.state,{kind:'ack',id:'other-close'}).outcome,'ignore');assert.equal(pcm.settlePrivatePCMStop(stop.state,{kind:'deadline',now:1019}).outcome,'ignore');
 for(const input of [{kind:'ack',id:stop.id},{kind:'deadline',now:1020},{kind:'send-error'}]){const done=pcm.settlePrivatePCMStop(stop.state,input);assert.equal(done.outcome,input.kind==='ack'?'resolve':'reject');assert.equal(pcm.settlePrivatePCMStop(done.state,input).outcome,'ignore');assert.equal(pcm.nextPrivatePCMStep(done.state,header()).effect.kind,'idle');}
 assert.equal(initial.phase,'active');
});
test('varied PCM histories keep consumed <= posted <= produced and per-batch capacity bounds',()=>{
 const run=seed=>{const m=model('playback',32768,6),history=[];m.step();m.feedback({kind:'resetAck',epoch:2});
  for(let i=0;i<180;i++){
   if(i%19===0){m.facts=header({epoch:m.facts.epoch+2});m.step();m.feedback({kind:'resetAck',epoch:m.facts.epoch});}
   const produced=m.facts.produced+(i*seed%1024);m.facts={...m.facts,produced};const effects=m.flush();
   assert.ok(effects.every(effect=>effect.kind!=='pcm'||effect.frames>0&&effect.frames<=1024));
   const consumed=m.facts.consumed+Math.floor((m.state.posted-m.facts.consumed)/2);m.feedback({kind:'consumed',epoch:m.facts.epoch,frames:consumed});
   assert.ok(consumed<=m.state.posted&&m.state.posted===produced);assert.ok(m.state.maxOutstanding<=32768);history.push(m.state);
  }return history;};for(let seed=1;seed<8;seed++)assert.deepEqual(run(seed),run(seed));
});

const audioSource=(await readFile(new URL('../../web/private-mpv/audio-worker.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
function adapter(profile){
 const memory=new WebAssembly.Memory({initial:5}),messages=[],publications=[];let reenter;let closes=0,disposals=0;
 const port={start(){},close(){closes++;},postMessage(message){messages.push(message);reenter?.(message);}};
 const engine={raw:{memory},dispose(){disposals++;},source:{cancelSource(){},snapshot(){return{};}},scheduler:{snapshot(){return{};}}};
 if(profile==='playback'){
  const owner=new PrivatePCMTransport(engine,0,port,0);clearInterval(owner.timer);
  return{messages,publications,header:owner.header(),get state(){return owner.machine;},pump:()=>owner.pump(),feedback:data=>owner.feedback(data),stop:()=>owner.stop(),set reenter(value){reenter=value;},get closes(){return closes;},get disposals(){return disposals;}};
 }
 const context=vm.createContext({...pcm,performance,AbortController,Map,Uint32Array,Float32Array,setTimeout,clearTimeout,setInterval,clearInterval,postMessage:value=>publications.push(value),testEngine:engine,testPort:port});
 vm.runInContext(audioSource,context);vm.runInContext('engine=testEngine;port=testPort;ptr=0;contextRunning=true;userPaused=false;',context);
 return{messages,publications,header:new Uint32Array(memory.buffer,0,8),get state(){return vm.runInContext('transport',context);},pump:()=>vm.runInContext('pump()',context),feedback:data=>{context.data=data;vm.runInContext('feedback(data)',context);},stop:()=>vm.runInContext('stopTransport()',context),set reenter(value){reenter=value;},get closes(){return closes;},get disposals(){return disposals;},context};
}
for(const profile of ['playback','audio'])test(`${profile} actual adapter transfers owned PCM and ignores stale epoch feedback`,()=>{
 const a=adapter(profile);a.header[3]=2;a.header[2]=1;a.pump();a.feedback({type:'resetAck',epoch:2});a.header[0]=4;
 // The adapter's native heap is exposed by its header; PCM must not alias it.
 const ring=new Float32Array(a.header.buffer,32,8);ring.set([.1,.2,.3,.4,.5,.6,.7,.8]);const expected=ring.slice();a.pump();
 const sent=a.messages.find(message=>message.type==='pcm');ring.fill(0);assert.deepEqual(new Float32Array(sent.buffer),expected);
 a.feedback({type:'consumed',epoch:0,frames:4});assert.equal(a.header[1],0);a.feedback({type:'consumed',epoch:2,frames:4});assert.equal(a.header[1],4);assert.equal(a.state.feedbackCount,1);
});
for(const profile of ['playback','audio'])test(`${profile} actual stop publishes one completion before synchronous port reentry`,async()=>{
 const a=adapter(profile);let nested;a.reenter=message=>{if(message.type==='stop'){nested=a.stop();a.feedback({type:'stopped',id:'wrong'});assert.equal(a.state.phase,'stopping');a.feedback({type:'stopped',id:message.id});}};
 const completion=a.stop();assert.equal(completion,nested);assert.equal(a.stop(),completion);await completion;assert.equal(a.closes,1);assert.equal(a.messages.filter(message=>message.type==='stop').length,1);assert.equal(a.state.phase,'stopped');
 a.feedback({type:'stopped',id:profile==='audio'?'worker-close':'playback-close'});assert.equal(a.closes,1);
});
for(const profile of ['playback','audio'])test(`${profile} actual stop send failure rejects all callers and closes the port once`,async()=>{
 const a=adapter(profile);a.reenter=message=>{if(message.type==='stop')throw Error('send failed');};const completion=a.stop();assert.equal(a.stop(),completion);await assert.rejects(completion,/send failed/);assert.equal(a.closes,1);assert.equal(a.state.phase,'stopped');
});
for(const profile of ['playback','audio'])test(`${profile} stop acknowledgment remains final if the send callback subsequently throws`,async()=>{
 const a=adapter(profile);a.reenter=message=>{if(message.type==='stop'){a.feedback({type:'stopped',id:message.id});throw Error('late send failure');}};
 await a.stop();assert.equal(a.closes,1);assert.equal(a.state.phase,'stopped');
});
for(const profile of ['playback','audio'])test(`${profile} actual stop deadline reschedules early wakeups and ignores duplicate callbacks`,async t=>{
 let now=10,next=1;const timers=new Map();
 t.mock.method(performance,'now',()=>now);t.mock.method(globalThis,'setTimeout',callback=>{const id=next++;timers.set(id,callback);return id;});t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
 const a=adapter(profile),completion=a.stop(),rejected=assert.rejects(completion,/Worklet stop deadline/);const [first,early]=timers.entries().next().value;
 timers.delete(first);now=1009;early();assert.equal(a.state.phase,'stopping');assert.equal(timers.size,1);
 const [second,deadline]=timers.entries().next().value;timers.delete(second);now=1010;deadline();await rejected;
 early();deadline();assert.equal(timers.size,0);assert.equal(a.closes,1);assert.equal(a.state.phase,'stopped');
});
for(const profile of ['playback','audio'])test(`${profile} stop scheduling failure rejects without sending or abandoning the completion`,async t=>{
 t.mock.method(globalThis,'setTimeout',()=>{throw Error('timer scheduling failed');});const a=adapter(profile),completion=a.stop();assert.equal(a.stop(),completion);
 await assert.rejects(completion,/timer scheduling failed/);assert.equal(a.messages.length,0);assert.equal(a.closes,1);assert.equal(a.state.phase,'stopped');
});
for(const profile of ['playback','audio'])test(`${profile} early stop rescheduling failure rejects instead of orphaning the caller`,async t=>{
 let wake,schedules=0;t.mock.method(performance,'now',()=>10);
 t.mock.method(globalThis,'setTimeout',callback=>{if(++schedules>1)throw Error('timer rescheduling failed');wake=callback;return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});
 const a=adapter(profile),completion=a.stop(),rejected=assert.rejects(completion,/timer rescheduling failed/);wake();await rejected;wake();
 assert.equal(a.closes,1);assert.equal(a.state.phase,'stopped');assert.equal(schedules,2);
});
test('audio failure retires authority before an abort listener can reenter failure',async()=>{
 const a=adapter('audio');a.reenter=message=>{if(message.type==='stop')a.feedback({type:'stopped',id:message.id});};
 vm.runInContext("loading.signal.addEventListener('abort',()=>fail(Error('reentrant failure')));fail(Error('first failure'));",a.context);
 await a.stop();assert.equal(a.publications.length,1);assert.match(a.publications[0].error,/first failure/);assert.equal(a.disposals,1);assert.equal(a.closes,1);
});
