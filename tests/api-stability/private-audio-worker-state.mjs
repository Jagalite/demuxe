// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import * as core from '../../web/generated/internal/machine/private-audio-worker.js';
import * as pcm from '../../web/generated/internal/machine/private-pcm.js';
const ready=()=>core.finishAudioWorkerInit(core.admitAudioWorkerInit(core.createPrivateAudioWorker(),48000,true).state).state;
test('audio worker initialization is single-owner and cannot finish after retirement',()=>{
 const initial=core.createPrivateAudioWorker(),init=core.admitAudioWorkerInit(initial,48000,true);assert.equal(init.error,null);assert.equal(initial.phase,'new');assert.equal(init.state.configuredRate,48000);
 assert.equal(core.admitAudioWorkerInit(init.state,48000,true).error,'Audio host already initialized');const retired=core.retireAudioWorker(init.state);assert.equal(retired.revoke,true);assert.equal(core.audioWorkerInitCurrent(retired.state),false);assert.equal(core.finishAudioWorkerInit(retired.state).accepted,false);
 assert.equal(core.retireAudioWorker(retired.state).revoke,false);assert.equal(core.audioWorkerAccepts(retired.state,'load'),false);assert.equal(core.audioWorkerAccepts(retired.state,'close'),true);
});
test('context suspension preserves native pause before stopped-device header ordering',()=>{
 let state=ready(),play=core.beginAudioWorkerControl(state,'pause',false);assert.deepEqual(play.effects,[{kind:'native.pause',paused:false}]);state=core.finishAudioWorkerControl(play.state,play.id).state;
 const suspend=core.beginAudioWorkerControl(state,'context',false);assert.equal(suspend.state.contextRunning,false);assert.deepEqual(suspend.effects,[{kind:'pump'},{kind:'native.pause',paused:true}]);
 const suspended=core.finishAudioWorkerControl(suspend.state,suspend.id);assert.deepEqual(suspended.effects,[{kind:'device',running:false}]);
 const resume=core.beginAudioWorkerControl(suspended.state,'context',true);assert.deepEqual(resume.effects,[{kind:'device',running:true},{kind:'native.pause',paused:false}]);assert.deepEqual(core.finishAudioWorkerControl(resume.state,resume.id).effects,[{kind:'pump'}]);
});
test('pause commits stop intent before native I/O; obsolete completions cannot change controls',()=>{
 const state=ready(),pause=core.beginAudioWorkerControl(state,'pause',true);assert.deepEqual(pause.effects,[{kind:'pump'},{kind:'native.pause',paused:true}]);assert.equal(core.beginAudioWorkerControl(pause.state,'context',true).id,null);
 const retired=core.retireAudioWorker(pause.state).state;assert.equal(core.finishAudioWorkerControl(retired,pause.id).accepted,false);assert.equal(core.finishAudioWorkerControl(pause.state,pause.id+1).accepted,false);assert.equal(state.control,null);
});
function load(replace=false){let decision=core.beginAudioWorkerLoad(ready(),replace);const advance=input=>{const previous=decision.state,text=JSON.stringify(previous);decision=core.advanceAudioWorkerLoad(previous,decision.id,input);assert.equal(JSON.stringify(previous),text);return decision;};return{get decision(){return decision;},advance};}
test('load phases require source opening and native readiness before chain publication',()=>{
 const run=load();assert.equal(run.decision.effect.kind,'source');assert.equal(run.advance({kind:'loaded',loaded:true}).effect.message,'Audio load phase mismatch');
 assert.equal(run.advance({kind:'source.opened'}).effect.kind,'open');assert.equal(run.advance({kind:'opened'}).effect.kind,'loaded');assert.equal(run.advance({kind:'loaded',loaded:true}).effect.kind,'chains');assert.equal(run.advance({kind:'chains'}).effect.kind,'done');assert.equal(run.decision.state.load.stage,'loaded');
});
test('replacement flush waits at most 200 intervals and checks retained native handles',()=>{
 for(const final of ['ack','deadline','live']){
  const run=load(true);assert.equal(run.decision.effect.kind,'close');run.advance({kind:'closed'});
  for(let i=0;i<200;i++){assert.deepEqual(run.advance({kind:'flush',ack:false}).effect,{kind:'wait',phase:'flush',ms:5});assert.equal(run.advance({kind:'flush.waited'}).effect.kind,'sample.flush');}
  const sampled=run.advance({kind:'flush',ack:final!=='deadline'});
  if(final==='deadline'){assert.equal(sampled.effect.message,'Replacement flush deadline');continue;}
  assert.equal(sampled.effect.kind,'handles');const checked=run.advance({kind:'handles',live:final==='live'});assert.equal(checked.effect.kind,final==='live'?'error':'create');
  if(final==='ack')assert.equal(run.advance({kind:'created'}).effect.kind,'source');
 }
});
test('load polling allows 1000 native samples and retains the final delay before deadline',()=>{
 const run=load();run.advance({kind:'source.opened'});run.advance({kind:'opened'});
 for(let i=0;i<1000;i++){assert.deepEqual(run.advance({kind:'loaded',loaded:false}).effect,{kind:'wait',phase:'loaded',ms:5});assert.equal(run.advance({kind:'load.waited'}).effect.kind,i===999?'error':'loaded');}
 assert.equal(run.decision.effect.message,'Load deadline');
});
test('source retirement prevents every late load phase from starting another effect',()=>{
 const run=load(true),original=run.decision.state,id=run.decision.id,retired=core.retireAudioWorker(original).state;
 for(const input of [{kind:'closed'},{kind:'flush',ack:true},{kind:'handles',live:false},{kind:'created'},{kind:'source.opened'},{kind:'opened'},{kind:'loaded',loaded:true},{kind:'chains'}])assert.equal(core.advanceAudioWorkerLoad(retired,id,input).effect.message,'Audio host closing');
 assert.equal(original.load.stage,'closing');
});
test('refresh request admission, deadline and replacement preserve scope and exactly one outcome',()=>{
 const first=core.beginAudioWorkerLoad(ready(),false),request=core.admitAudioWorkerRefresh(first.state,first.id,30);assert.equal(request.request.deadline,5030);
 assert.equal(core.settleAudioWorkerRefresh(request.state,request.request.id,{kind:'deadline',now:5029}).accepted,false);
 const settled=core.settleAudioWorkerRefresh(request.state,request.request.id,{kind:'reply'});assert.equal(settled.accepted,true);assert.equal(core.settleAudioWorkerRefresh(settled.state,request.request.id,{kind:'reply'}).accepted,false);
 const second=core.beginAudioWorkerLoad(request.state,false);assert.deepEqual(second.retire,[request.request.id]);assert.equal(core.admitAudioWorkerRefresh(second.state,first.id,40).request,null);assert.equal(core.settleAudioWorkerRefresh(second.state,request.request.id,{kind:'reply'}).accepted,false);
 const active=core.admitAudioWorkerRefresh(second.state,second.id,50),closed=core.retireAudioWorker(active.state);assert.deepEqual(closed.refreshes,[active.request.id]);assert.equal(closed.state.refreshes.length,0);
});
test('worker teardown admission is stable after repeated close and preserves closed terminal state',()=>{
 const state=core.retireAudioWorker(ready()).state,first=core.beginAudioWorkerClose(state);assert.equal(first.accepted,true);assert.equal(core.beginAudioWorkerClose(first.state).accepted,false);
 const closed=core.finishAudioWorkerClose(first.state);assert.equal(closed.phase,'closed');assert.equal(core.retireAudioWorker(closed).revoke,false);assert.equal(core.admitAudioWorkerInit(closed,48000,true).error,'Audio host already initialized');
});

const source=(await readFile(new URL('../../web/private-mpv/audio-worker.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
function worker(){
 const messages=[],calls=[],sources=[],memory=new WebAssembly.Memory({initial:5});let disposed=0,cancelled=0,portClosed=0,hook,acquire;
 const engine={raw:{memory},facts:()=>({runtime:'fixture'}),dispose(){disposed++;},source:{cancelSource(){cancelled++;},snapshot:()=>({}),drainFailures:()=>[]},scheduler:{snapshot:()=>({})},async call(name,...args){calls.push([name,...args]);if(hook){const result=hook(name,...args);if(result!==undefined)return result;}if(name==='private_audio_chains'||name==='private_audio_loaded')return 1;return 0;}};
 const port={start(){},close(){portClosed++;},postMessage(message){if(message.type==='stop')this.onmessage?.({data:{type:'stopped',id:message.id}});if(message.type==='reset')this.onmessage?.({data:{type:'resetAck',epoch:message.epoch}});}};
 const context=vm.createContext({...core,...pcm,AbortController,Map,Uint32Array,Float32Array,performance,setTimeout,clearTimeout,setInterval:()=>0,clearInterval(){},postMessage:value=>messages.push(value),privateMpv:()=>acquire?acquire():Promise.resolve(engine),privateMpvSource:(_data,refresh)=>{const source={refresh,closed:0,async open(){source.onOpen?.();},close(){source.closed++;source.onClose?.();}};sources.push(source);return source;}});
 vm.runInContext(source,context);const send=data=>context.onmessage({data}),drain=()=>vm.runInContext('chain',context);
 return{messages,calls,sources,engine,port,context,send,drain,get state(){return vm.runInContext('lifecycle',context);},get disposed(){return disposed;},get cancelled(){return cancelled;},get portClosed(){return portClosed;},set hook(value){hook=value;},set acquire(value){acquire=value;},async init(){send({id:1,op:'init',rate:48000,contextRunning:true,port,backend:'asyncify'});await drain();},async close(id=99){send({id,op:'close'});await drain();}};
}
test('actual audio initialization and load preserve native call order and reply only after chain readiness',async()=>{
 const w=worker();await w.init();w.send({id:2,op:'load'});await w.drain();assert.deepEqual(w.calls.map(call=>call[0]),['private_audio_ptr','private_audio_create','private_audio_open','private_audio_loaded','private_audio_chains']);assert.equal(w.messages.find(message=>message.id===2).result,1);assert.equal(w.state.load.stage,'loaded');await w.close();assert.equal(w.disposed,1);assert.equal(w.portClosed,1);
});
test('actual close while engine acquisition is pending disposes the late owner without native calls',async()=>{
 const w=worker();let acquire;w.acquire=()=>new Promise(resolve=>acquire=resolve);const init=w.init();await new Promise(resolve=>setImmediate(resolve));w.send({id:2,op:'close'});acquire(w.engine);await init;await w.drain();assert.deepEqual(w.calls,[]);assert.equal(w.disposed,1);assert.match(w.messages.find(message=>message.id===1).error,/closing/);assert.equal(w.messages.find(message=>message.id===2).result.live,0);assert.equal(w.state.phase,'closed');
});
test('actual reentrant close revokes a source once and shares native teardown among RPC callers',async()=>{
 const w=worker();await w.init();w.send({id:2,op:'load'});await w.drain();w.sources[0].onClose=()=>w.send({id:4,op:'close'});await w.close(3);await w.drain();
 assert.equal(w.sources[0].closed,1);assert.equal(w.cancelled,1);assert.equal(w.disposed,1);assert.equal(w.calls.filter(call=>call[0]==='private_audio_close').length,1);assert.ok(w.messages.some(message=>message.id===3&&message.result));assert.ok(w.messages.some(message=>message.id===4&&message.result));
});
test('actual late load response after close cannot query or publish output ownership',async()=>{
 const w=worker();await w.init();let release;w.hook=name=>name==='private_audio_open'?new Promise(resolve=>release=resolve):undefined;w.send({id:2,op:'load'});await new Promise(resolve=>setImmediate(resolve));w.send({id:3,op:'close'});release(0);await w.drain();
 assert.equal(w.calls.some(call=>call[0]==='private_audio_loaded'||call[0]==='private_audio_chains'),false);assert.match(w.messages.find(message=>message.id===2).error,/closing/);assert.equal(w.disposed,1);
});
test('actual old source refresh cannot escape replacement and late replies cannot settle the new request',async()=>{
 const w=worker();await w.init();w.send({id:2,op:'load',canRefresh:true});await w.drain();const first=w.sources[0].refresh({url:'https://example.test/old'}),rejected=assert.rejects(first,/Source closed/),oldId=w.messages.find(message=>message.type==='refresh').refreshId;
 w.send({id:3,op:'load',canRefresh:true});await w.drain();await rejected;await assert.rejects(w.sources[0].refresh({url:'https://example.test/stale'}),/Source closed/);
 const next=w.sources[1].refresh({url:'https://example.test/new'}),newId=w.messages.filter(message=>message.type==='refresh').at(-1).refreshId;assert.notEqual(newId,oldId);
 w.send({op:'refreshed',refreshId:oldId,update:{token:'old'}});w.send({op:'refreshed',refreshId:newId,update:{token:'new'}});assert.deepEqual(await next,{token:'new'});await w.close();
});
test('actual context suspension applies native pause while the consumption device is still running',async()=>{
 const w=worker();await w.init();const header=new Uint32Array(w.engine.raw.memory.buffer,0,8),observed=[];w.hook=(name,value)=>{if(name==='private_audio_pause')observed.push([value,header[6]]);};
 w.send({id:2,op:'pause',value:false});await w.drain();w.send({id:3,op:'context',value:false});await w.drain();assert.equal(header[6],0);w.send({id:4,op:'context',value:true});await w.drain();assert.equal(header[6],1);assert.deepEqual(observed,[[0,1],[1,1],[0,1]]);await w.close();
});
