// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {beginWait,observeWait,beginAttempts,observeAttempt} from '../../web/generated/internal/machine/async-policy.js';
import * as worker from '../../web/generated/internal/machine/legacy-playback-worker.js';
import * as wasm from '../../web/generated/internal/machine/wasm-lifecycle.js';
import * as privateCore from '../../web/generated/internal/machine/private-software.js';
import * as preview from '../../web/generated/internal/machine/preview.js';
import * as shaka from '../../web/generated/internal/machine/shaka-backend.js';
import {ShakaBackend} from '../../web/generated/internal/shaka-backend.js';
import {PreviewController} from '../../web/generated/preview/controller.js';

const permutations=items=>items.length?items.flatMap((x,i)=>permutations(items.filter((_,j)=>i!==j)).map(t=>[x,...t])):[[]];
for(const kind of ['initialization','retirement','io-open','io-close','decoder','private-output','preview-media','threads']){
 test(`${kind}: all ready/failure/retirement/deadline orders have one terminal outcome`,()=>{
  for(const order of permutations(['ready','failed','retire','deadline'])){
   let state=beginWait(7,100,kind),terminal;
   const original=JSON.stringify(state);
   assert.equal(observeWait(state,{id:8,kind:'ready',now:101}),state);
   assert.equal(observeWait(state,{id:7,kind:'deadline',now:state.deadline-1}),state);
   for(const event of order){const before=state;state=observeWait(state,{id:7,kind:event,now:event==='deadline'?state.deadline:101});if(terminal)assert.equal(state,before);else terminal=state.phase;}
   assert.equal(state.phase,order[0]==='deadline'?'timeout':order[0]==='retire'?'retired':order[0]);
   assert.equal(JSON.stringify(beginWait(7,100,kind)),original);
  }
  const state=beginWait(1,0,kind);assert.equal(observeWait(state,{id:1,kind:'ready',now:state.deadline}).phase,'timeout');
 });
}
test('candidate position survives repeated identities; obsolete observations cannot advance twice',()=>{
 let state=beginAttempts(3);state=observeAttempt(state,0,'retry');assert.equal(state.index,1);
 assert.equal(observeAttempt(state,0,'retry'),state);state=observeAttempt(state,1,'defer');assert.equal(state.deferred,true);
 state=observeAttempt(state,2,'accept');assert.equal(state.phase,'accepted');assert.equal(observeAttempt(state,2,'retry'),state);
 assert.equal(beginAttempts(0).phase,'exhausted');
});
for(const name of ['software-full-engine-worker','filter-retained-engine-worker']){
 test(`${name}: actual handshake timer interpreter fences timeout, duplicate ready and late failure`,()=>{
  const source=fs.readFileSync(new URL(`../../web/${name}.js`,import.meta.url),'utf8');
  const helper=source.slice(source.indexOf('function handshake('),source.indexOf("import {preparedEngine}"));
  let now=0,id=0;const timers=new Map(),events=[];
  const context=vm.createContext({...worker,performance:{now:()=>now},Error,setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},clearTimeout:key=>timers.delete(key),control:worker.initialLegacyPlaybackWorker()});
  vm.runInContext(helper+';globalThis.start=handshake;',context);
  const first=context.start('decoder',()=>events.push('ready'),(_,active)=>events.push(active?'fatal':'rejected'));
  now=4999;first.ready();first.ready();first.fail(Error('crash'));first.fail(Error('duplicate'));
  assert.deepEqual(events,['ready','fatal']);assert.equal(timers.size,0);
  events.length=0;now=0;
  const second=context.start('decoder',()=>events.push('ready'),()=>events.push('rejected'));
  now=5000;for(const {fn} of [...timers.values()])fn();second.ready();second.fail(Error('late'));
  assert.deepEqual(events,['rejected']);assert.equal(timers.size,0);
  events.length=0;now=0;
  const opening=context.start('io-open',()=>events.push('ready'),()=>events.push('retired'));
  context.control=worker.reduceLegacyPlaybackWorker(context.control,{type:'close'});opening.ready();opening.ready();
  assert.deepEqual(events,['retired']);assert.equal(timers.size,0);
  events.length=0;const close=context.start('io-close',()=>events.push('contain'),()=>assert.fail('close failed'));
  now=1500;for(const {fn} of [...timers.values()])fn();close.ready();assert.deepEqual(events,['contain']);
 });
}
test('Wasm readiness and containment deadlines are separate from physical release',()=>{
 let state=wasm.beginWasmHandshake(wasm.createWasmLifecycle(),'initialization',0);
 assert.equal(wasm.observeWasmHandshake(state,'initialization','deadline',59999).effect,'waiting');
 state=wasm.observeWasmHandshake(state,'initialization','ready',60000).state;assert.equal(state.phase,'failed');
 assert.equal(wasm.observeWasmHandshake(state,'initialization','ready',60001).effect,'ignore');
 state=wasm.retireWasmLifecycle(state).state;state=wasm.beginWasmHandshake(state,'retirement',60001);
 const expired=wasm.observeWasmHandshake(state,'retirement','deadline',70001);assert.equal(expired.effect,'contain');assert.equal(expired.state.phase,'retiring');
 assert.equal(wasm.observeWasmHandshake(expired.state,'retirement','ready',70002).effect,'ignore');
 const failed=wasm.finishWasmRetirement(expired.state,false);assert.equal(failed.phase,'retiring');assert.equal(failed.releaseFailed,true);
 assert.equal(wasm.finishWasmRetirement(expired.state).phase,'closed');
});
test('private output waits have bounded identities and retire across replacement',()=>{
 let state=privateCore.initialPrivateSoftware(),first=privateCore.beginPrivateOutputWait(state,0,0);state=first.state;
 let next=privateCore.observePrivateOutputWait(state,first.id,25000,true);assert.equal(next.outcome,'timeout');assert.equal(next.state.waits.length,0);
 const load=privateCore.beginPrivateSoftwareLoad(state);state=privateCore.startPrivateSoftwareLoad(load.state,load.load);
 assert.equal(privateCore.observePrivateOutputWait(state,first.id,1,true).outcome,'retired');
 for(let i=0;i<128;i++)state=privateCore.beginPrivateOutputWait(state,state.generation,0).state;
 assert.equal(privateCore.beginPrivateOutputWait(state,state.generation,0).id,null);
 assert.equal(privateCore.retirePrivateSoftware(state).waits.length,0);
});
test('preview foreground intervals, media facts and exact-result admission are pure',()=>{
 let state=preview.createPreviewControl();state=preview.transitionPreviewControl(state,{kind:'foreground',at:0});
 assert.equal(preview.previewGenerationOutcome(state,499,false),'wait');assert.equal(preview.previewGenerationOutcome(state,500,false),'next');
 state=preview.transitionPreviewControl(state,{kind:'strategy',value:{type:'demuxe'}});
 assert.equal(preview.previewGenerationOutcome(state,99,false),'wait');assert.equal(preview.previewGenerationOutcome(state,100,false),'next');
 assert.equal(preview.previewGenerationOutcome(state,100,true),'wait');
 state=preview.transitionPreviewControl(state,{kind:'suspended',value:true});assert.equal(preview.previewGenerationOutcome(state,10000,false),'wait');
 const facts={width:100,height:100,duration:10,position:0,readyState:1};
 assert.deepEqual(preview.previewMediaPlan(facts,20,10000),{target:9.999,event:'seeked'});
 assert.equal(preview.previewMediaPlan({...facts,duration:Infinity},1,10000),null);
 assert.equal(preview.previewMediaPlan(facts,1,9999),null);
 assert.equal(preview.previewMediaPlan(facts,0,10000).event,'loadeddata');
 assert.equal(preview.previewResultAccepted(true,1,{actualTime:1,temporalAccuracy:'approximate'}),false);
 assert.equal(preview.previewResultAccepted(true,1,{actualTime:1,temporalAccuracy:'exact'}),true);
});
function qualityState(){let step=shaka.transitionShakaBackend(shaka.initialShakaBackend({preload:'auto'}),{type:'begin',domain:'quality'});const lease=step.lease;let state=shaka.transitionShakaBackend(step.state,{type:'enter',lease}).state;const policy={mode:'manual',id:'variant:1'},plan={ids:[1],abr:false,maxHeight:Infinity,maxBandwidth:Infinity};return {state:shaka.beginShakaQuality(state,lease,policy,plan),lease};}
test('quality configure/select/failure/retirement sequences cannot commit or roll back stale leases',()=>{
 for(const order of permutations(['configured','selected','failed','close'])){
  let {state,lease}=qualityState(),closed=false;
  for(const event of order){const previous=state;if(event==='close'){state=shaka.transitionShakaBackend(state,{type:'close'}).state;closed=true;}else{state=shaka.stepShakaQuality(state,lease,event);if(closed)assert.equal(state,previous);}}
  assert.equal(state.phase,'closed');assert.equal(state.qualityChange,null);assert.equal(shaka.commitShakaQuality(state,lease),state);
 }
 let {state,lease}=qualityState();state=shaka.stepShakaQuality(state,lease,'configured');state=shaka.stepShakaQuality(state,lease,'selected');state=shaka.commitShakaQuality(state,lease);
 assert.equal(state.quality.id,'variant:1');assert.equal(shaka.stepShakaQuality(state,lease,'failed'),state);
 ({state,lease}=qualityState());state=shaka.stepShakaQuality(state,lease,'failed');state=shaka.stepShakaQuality(state,lease,'restore-failed');assert.equal(state.qualityChange.rollbackFailed,true);assert.equal(state.quality.mode,'auto');
});
test('actual Shaka thumbnail fallback visits all positions when last URI repeats first',async()=>{
 const backend=Object.create(ShakaBackend.prototype),calls=[];let disposed=0;
 const policy={filter(){},destroy(){disposed++;},plugin(uri){calls.push(uri);return {promise:Promise.reject(Error('offline')),abort:async()=>{}};}};
 Object.assign(backend,{control:{epoch:1,phase:'ready',source:{format:'dash'}},player:{getManifest:()=>({imageStreams:[{id:1,segmentIndex:{},mimeType:'image/jpeg'}]}),isDynamic:()=>false,getImageTracks:()=>[{id:1,width:160}],getThumbnails:async()=>({uris:['a','b','a'],startByte:0,endByte:null})},policy:{forkForPreview:()=>policy},runtime:{net:{NetworkingEngine:{RequestType:{SEGMENT:1},defaultRetryParameters:()=>({}),makeRequest:()=>({headers:{}})}}}});
 await assert.rejects(backend.previewFrame({signal:new AbortController().signal,width:160,time:1}),/offline/);
 assert.deepEqual(calls,['a','b','a']);assert.equal(disposed,1);
});
test('actual preview provider sequence advances past unsupported, failure and inexact output',async()=>{
 const calls=[],image={time:1,width:1,height:1,path:'test',image:{blob:new Blob(['image'])}};
 const make=(id,canHandle,getFrame)=>({id,priority:0,canHandle:()=>{calls.push(id);return canHandle;},getFrame});
 const controller=new PreviewController([make('unsupported',false,()=>assert.fail()),make('failed',true,()=>{throw Error('failed');}),make('inexact',true,()=>image),make('exact',true,()=>({...image,actualTime:1,temporalAccuracy:'exact'}))],{debounceMs:0});
 try{const result=await controller.getFrame({time:1,exact:true});assert.equal(result.actualTime,1);assert.deepEqual(calls,['unsupported','failed','inexact','exact']);}finally{await controller.destroy();}
});

test('quality selection mismatch requests rollback; superseded physical owner may restore but cannot commit',()=>{
 let {state,lease}=qualityState();state=shaka.stepShakaQuality(state,lease,'configured');
 assert.equal(shaka.verifyShakaQuality(state,lease,9).qualityChange.phase,'rollback');
 state=shaka.transitionShakaBackend(state,{type:'begin',domain:'audio'}).state;
 assert.equal(shaka.commitShakaQuality(state,lease),state);
 state=shaka.stepShakaQuality(state,lease,'failed');assert.equal(state.qualityChange.phase,'rollback');
 state=shaka.stepShakaQuality(state,lease,'restored');assert.equal(state.qualityChange.phase,'rejected');
});

test('local preview media wait retires on abort and rejects readiness at its deadline',async t=>{
 const {LocalVideoPreviewProvider}=await import('../../web/generated/preview/providers.js');
 let at=0,serial=0;const timers=new Map();t.mock.method(performance,'now',()=>at);
 t.mock.method(globalThis,'setTimeout',(fn,delay)=>{timers.set(++serial,{fn,delay});return serial;});t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
 for(const outcome of ['abort','deadline','late-ready']){
  at=0;let released=0;
  const video=Object.assign(new EventTarget(),{pause(){},removeAttribute(){},load(){released++;}});
  const provider=new LocalVideoPreviewProvider(()=>new Blob(['media']),{createElement:()=>video});
  const controller=new AbortController(),result=provider.getFrame({signal:controller.signal,time:1,width:160});
  const rejected=assert.rejects(result,outcome==='abort'?{name:'AbortError'}:/Preview media decode failed/);
  if(outcome==='abort')controller.abort();else{at=1500;if(outcome==='late-ready')video.dispatchEvent(new Event('loadedmetadata'));else for(const {fn} of [...timers.values()])fn();}
  await rejected;video.dispatchEvent(new Event('loadedmetadata'));assert.equal(timers.size,0);assert.equal(released,1);
 }
});

for(const name of ['software-full-engine-worker','filter-retained-engine-worker'])test(`${name}: old I/O worker acknowledgment cannot settle a replacement worker close`,()=>{
 const source=fs.readFileSync(new URL(`../../web/${name}.js`,import.meta.url),'utf8');
 const start=source.indexOf('    ioWorker.onmessage='),end=source.indexOf('    ioWorker.onerror=',start);
 let closed=0;const old={},current={};
 const context=vm.createContext({profileEnabled:false,ioWorker:old,openingWorker:old,ioClose:{worker:current,resolve:()=>closed++},opening:{ready(){},fail(){}},post(){},data:{id:1},Error});
 vm.runInContext(source.slice(start,end),context);
 old.onmessage({data:{type:'closed'}});assert.equal(closed,0);
 context.ioClose={worker:old,resolve:()=>closed++};old.onmessage({data:{type:'closed'}});assert.equal(closed,1);
});

for(const outcome of ['ready','action-failure'])for(const failing of ['timer','loadedmetadata','error','abort']){
 test(`local preview ${outcome} settles and attempts every cleanup when ${failing} removal throws`,{timeout:1000},async t=>{
  const {LocalVideoPreviewProvider}=await import('../../web/generated/preview/providers.js');
  const callbacks=new Map(),removed=[],cleanupError=Error('cleanup failed'),actionError=Error('source assignment failed');
  const controller=new AbortController();let released=0,cleanupReceipt;
  t.mock.method(globalThis,'setTimeout',()=>17);
  const remove=kind=>{removed.push(kind);if(kind===failing)throw cleanupError;};
  t.mock.method(globalThis,'clearTimeout',()=>remove('timer'));
  t.mock.method(controller.signal,'addEventListener',(kind,fn)=>callbacks.set(kind,fn));
  t.mock.method(controller.signal,'removeEventListener',()=>remove('abort'));
  const video={
   addEventListener:(kind,fn)=>callbacks.set(kind,fn),removeEventListener:kind=>remove(kind),
   set src(value){if(outcome==='action-failure')throw actionError;callbacks.get('loadedmetadata')();},
   pause(){},removeAttribute(){},load(){released++;}
  };
  const provider=new LocalVideoPreviewProvider(()=>new Blob(['media']),{createElement:()=>video});
  const result=provider.getFrame({signal:controller.signal,time:0,width:160,trackCleanup:receipt=>{cleanupReceipt=receipt;}});
  await assert.rejects(result,error=>error===(outcome==='ready'?cleanupError:actionError));
  await cleanupReceipt;
  assert.deepEqual(removed,['timer','loadedmetadata','error','abort']);assert.equal(released,1);
  callbacks.get('loadedmetadata')();callbacks.get('abort')();
  assert.equal(removed.length,4);assert.equal(released,1);
 });
}

for(const boundary of ['timer','loadedmetadata','error','abort'])test(`local preview retirement during ${boundary} acquisition releases late resources and skips source assignment`,async t=>{
 const {LocalVideoPreviewProvider}=await import('../../web/generated/preview/providers.js');
 const controller=new AbortController(),listeners=new Map(),timers=new Set();let now=0,assigned=0,released=0;
 t.mock.method(performance,'now',()=>now);
 t.mock.method(globalThis,'setTimeout',fn=>{if(boundary==='timer'){now=1500;fn();}timers.add(17);return 17;});
 t.mock.method(globalThis,'clearTimeout',id=>timers.delete(id));
 const add=(kind,fn)=>{if(kind===boundary){controller.abort();if(kind==='abort')fn();}listeners.set(kind,fn);};
 t.mock.method(controller.signal,'addEventListener',add);
 t.mock.method(controller.signal,'removeEventListener',kind=>listeners.delete(kind));
 const video={addEventListener:add,removeEventListener:kind=>listeners.delete(kind),set src(value){assigned++;},pause(){},removeAttribute(){},load(){released++;}};
 const provider=new LocalVideoPreviewProvider(()=>new Blob(['media']),{createElement:()=>video});
 await assert.rejects(provider.getFrame({signal:controller.signal,time:0,width:160}));
 assert.equal(assigned,0);assert.equal(listeners.size,0);assert.equal(timers.size,0);assert.equal(released,1);
});

for(const failing of ['pause','removeAttribute','load','revoke'])test(`local preview final ${failing} failure cannot skip other media releases`,async t=>{
 const {LocalVideoPreviewProvider}=await import('../../web/generated/preview/providers.js');
 const controller=new AbortController();controller.abort();const releases=[];let receipt;
 const release=kind=>{releases.push(kind);if(kind===failing)throw Error(kind);};
 t.mock.method(URL,'createObjectURL',()=> 'blob:test');t.mock.method(URL,'revokeObjectURL',()=>release('revoke'));
 const video={addEventListener(){},removeEventListener(){},pause:()=>release('pause'),removeAttribute:()=>release('removeAttribute'),load:()=>release('load')};
 const provider=new LocalVideoPreviewProvider(()=>new Blob(['media']),{createElement:()=>video});
 await assert.rejects(provider.getFrame({signal:controller.signal,time:0,width:160,trackCleanup:p=>{receipt=p;}}));
 await receipt;assert.deepEqual(releases,['pause','removeAttribute','load','revoke']);
});

for(const name of ['software-full-engine-worker','filter-retained-engine-worker'])test(`${name}: early deadlines, boundary readiness and superseded decoder failures preserve one owner`,()=>{
 const source=fs.readFileSync(new URL(`../../web/${name}.js`,import.meta.url),'utf8');
 const helper=source.slice(source.indexOf('function handshake('),source.indexOf("import {preparedEngine}"));
 for(const [kind,budget] of [['io-open',20000],['io-close',1500],['decoder',5000],['threads',2000]]){
  let now=0,id=0;const timers=new Map(),events=[];
  const context=vm.createContext({...worker,performance:{now:()=>now},Error,setTimeout:(fn,delay)=>{timers.set(++id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),control:worker.initialLegacyPlaybackWorker()});
  vm.runInContext(helper+';globalThis.start=handshake;',context);
  const wait=context.start(kind,()=>events.push('ready-or-contained'),()=>events.push('rejected'));
  const [key,first]=[...timers][0];timers.delete(key);now=budget-1;first.fn();
  assert.equal(events.length,0);assert.equal(timers.size,1);assert.equal([...timers.values()][0].delay,1);
  now=budget;wait.ready();wait.fail(Error('late'));first.fn();
  assert.deepEqual(events,[kind==='io-close'?'ready-or-contained':'rejected']);assert.equal(timers.size,0);
  if(kind==='decoder'){
   events.length=0;const newer=context.start(kind,()=>events.push('new-ready'),()=>events.push('new-failed'));
   wait.fail(Error('old decoder crash'));newer.ready();wait.ready();wait.fail(Error('old duplicate crash'));
   assert.deepEqual(events,['new-ready']);assert.equal(context.control.pumpFailed,false);assert.equal(timers.size,0);
  }
 }
});

test('throwing preview cleanup registration still releases its URL and resolves the offered receipt',async t=>{
 const {LocalVideoPreviewProvider}=await import('../../web/generated/preview/providers.js');
 const released=[],failure=Error('host refused receipt');let receipt;
 t.mock.method(URL,'createObjectURL',()=> 'blob:test');t.mock.method(URL,'revokeObjectURL',()=>released.push('url'));
 const video={pause:()=>released.push('pause'),removeAttribute:()=>released.push('src'),load:()=>released.push('load')};
 const provider=new LocalVideoPreviewProvider(()=>new Blob(['media']),{createElement:()=>video});
 await assert.rejects(provider.getFrame({signal:new AbortController().signal,time:0,width:160,trackCleanup:p=>{receipt=p;throw failure;}}),error=>error===failure);
 await receipt;assert.deepEqual(released,['pause','src','load','url']);
});
