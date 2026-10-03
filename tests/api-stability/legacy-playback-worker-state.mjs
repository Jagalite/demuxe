// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import * as adaptivePolicy from '../../web/generated/internal/machine/legacy-adaptive-decode.js';
import * as retainedPolicy from '../../web/generated/internal/machine/legacy-retained-presentation.js';
import * as policy from '../../web/generated/internal/machine/legacy-playback-worker.js';
const {initialLegacyPlaybackWorker:initial,reduceLegacyPlaybackWorker:reduce,admitLegacyCommand:admit,finishLegacyCommand:finish}=policy;
test('command leases are immutable, finite, unique and terminal',()=>{
 let state=initial(),old=state;for(let i=0;i<128;i++){const result=admit(state);assert.notEqual(result.id,null);state=result.state;}
 assert.equal(old.commands.length,0);assert.equal(admit(state).id,null);assert.equal(finish(state,7),state);
 state=finish(state,state.commands[0].id);assert.notEqual(admit(state).id,null);
 assert.equal(admit({...state,commandSerial:0xffffffff}).id,null);
 assert.equal(admit(reduce(state,{type:'close'})).id,null);assert.equal(admit(reduce(state,{type:'fail'})).id,null);
});
test('seek release needs restart and near target, late duplicate preserves state',()=>{
 let state=reduce(initial(),{type:'seek',target:5});state=reduce(state,{type:'position',position:5});assert.equal(policy.legacySeekComplete(state),false);
 state=reduce(state,{type:'restart'});assert.equal(policy.legacySeekComplete(state),true);state=reduce(state,{type:'seek-released'});assert.equal(state.pendingTarget,null);assert.equal(reduce(state,{type:'seek-released'}),state);
});
test('source leases prohibit overlapping acquisition and stale completion',()=>{
 let state=reduce(reduce(initial(),{type:'init'}),{type:'ready'}),first=policy.admitLegacySource(state);assert.equal(first.id,1);assert.equal(policy.admitLegacySource(first.state).id,null);
 assert.equal(policy.finishLegacySource(first.state,99),first.state);state=policy.finishLegacySource(first.state,first.id);assert.equal(policy.admitLegacySource(state).id,2);
 assert.equal(policy.admitLegacySource(reduce(state,{type:'close'})).id,null);
});
for(const file of ['software-full-engine-worker.js','filter-retained-engine-worker.js']){
 const source=(await readFile(process.env.LEGACY_WORKER_SOURCE_ROOT?process.env.LEGACY_WORKER_SOURCE_ROOT+'/'+file:new URL('../../web/'+file,import.meta.url),'utf8')).replace(/^import .*;$/gm,'').replaceAll('import.meta.url',JSON.stringify('file:///fixture/worker.js'));
 function shell(){
  const scheduled=[],messages=[],commands=[];let calls=0;
  const context=vm.createContext({...policy,...adaptivePolicy,...retainedPolicy,URL,Map,Int32Array,Float32Array,Set,ArrayBuffer,performance:{now:()=>1000},self:{postMessage:message=>messages.push(message)},setTimeout:callback=>{scheduled.push(callback);return scheduled.length;},clearTimeout(){},clearInterval(){},SubtitleOverlay:class{clear(){}},WebCodecsPresenter:class{},location:{search:''},URLSearchParams,webgpuDiagnostics:()=>({}),testEngine:{ccall(...args){commands.push(args);return 0;}}});
  vm.runInContext(source,context);vm.runInContext('engine=testEngine;const originalTick=tick;tick=()=>{};',context);
  return {context,scheduled,messages,commands,run:code=>vm.runInContext(code,context)};
 }
 test(file+' pump callback delivers once and stale callbacks cannot replace successor',()=>{
  const w=shell();w.run('schedulePump()');const first=w.scheduled[0];first();assert.equal(w.scheduled.length,2);first();assert.equal(w.scheduled.length,2);
  w.run('schedulePump()');const before=w.scheduled.length;w.scheduled[1]();assert.equal(w.scheduled.length,before);
 });

 test(file+' timer acquisition failure retires command callers and disallows new work',()=>{
  const w=shell();w.run('setTimeout=()=>{throw Error("timer failed")};');assert.throws(()=>w.run('internalCommand(["x"],()=>{})'),/timer failed/);assert.equal(w.commands.length,0);assert.equal(w.run('control.pumpFailed'),true);assert.equal(w.run('internalCommands.size'),0);
 });
 test(file+' timer cleanup reentry preserves successor ownership',()=>{
  const w=shell();w.run('schedulePump();let once=true;clearTimeout=()=>{if(once){once=false;schedulePump();}};schedulePump();');assert.equal(w.scheduled.length,2);assert.equal(w.run('timer'),2);
 });
 test(file+' malformed native event frees its native allocation',()=>{
  const w=shell();w.run('tick=originalTick;');
  w.run('pumpAudio=()=>{};let freed=0;engine._web_event=()=>12;engine.UTF8ToString=()=>"{";engine._free=()=>freed++;');w.run('tick()');assert.equal(w.run('freed'),1);
 });

 test(file+' failed I/O retirement still destroys native and terminates children',async()=>{
  const w=shell();w.run('let destroyed=0,terminated=0;closeIO=async()=>{throw Error("I/O close failed")};engine._web_destroy=()=>destroyed++;engine.PThread={runningWorkers:[],terminateAllThreads(){terminated++;}};setTimeout=callback=>{callback();return 1;};');
  await w.context.self.onmessage({data:{type:'destroy'}});assert.equal(w.run('destroyed'),1);assert.equal(w.run('terminated'),1);assert.ok(w.messages.some(m=>m.type==='error'&&m.message.includes('I/O close failed')));
 });
 test(file+' command admission rejects overflow before native submission and rollback releases slots',()=>{
  const w=shell();w.run('for(let i=0;i<128;i++)internalCommand(["set","pause","yes"],()=>{});');assert.equal(w.commands.length,128);assert.throws(()=>w.run('internalCommand(["x"],()=>{})'),/capacity/);assert.equal(w.commands.length,128);
  w.run('control=finishLegacyCommand(control,control.commands[0].id);engine.ccall=()=>{throw Error("native submission failed")};');const count=w.run('control.commands.length');assert.throws(()=>w.run('internalCommand(["x"],()=>{})'),/native submission/);assert.equal(w.run('control.commands.length'),count);
 });
}

test('PCM epochs gate copy, preserve audio-only final output and handle counter wrap',()=>{
 let state=policy.initialLegacyPCM();let plan=policy.planLegacyPCM(state,2,0,0);assert.equal(plan.kind,'reset');state=plan.state;
 assert.equal(policy.planLegacyPCM(state,2,0,10).kind,'wait');assert.equal(policy.planLegacyPCM(state,3,2,10).kind,'wait');
 assert.equal(policy.planLegacyPCM(state,4,2,10,true).kind,'wait');assert.equal(policy.planLegacyPCM(state,4,2,10,false).kind,'reset');
 state={epoch:2,forwarded:0xfffffffe};assert.equal(policy.planLegacyPCM(state,2,2,3).count,5);assert.throws(()=>policy.planLegacyPCM(state,2,2,10000),/capacity/);
 assert.equal(policy.commitLegacyPCM(state,4,3),state);
});

test('source replacement invalidates logical configuration receipt without releasing physical capacity early',()=>{
 let state=reduce(reduce(initial(),{type:'init'}),{type:'ready'});const command=admit(state);state=command.state;assert.equal(policy.legacyCommandCurrent(state,command.id),true);
 const opened=policy.admitLegacySource(state);state=opened.state;assert.equal(policy.legacyCommandCurrent(state,command.id),false);assert.equal(state.commands.length,1);
 state=finish(state,command.id);assert.equal(state.commands.length,0);
});
test('GPU recovery remembers latest explicit pause intent and clears consumed intent',()=>{
 let state=reduce(initial(),{type:'gpu-lost'});assert.equal(state.gpuPauseIntent,true);state=reduce(state,{type:'gpu-intent',paused:false});assert.equal(state.gpuPauseIntent,false);state=reduce(state,{type:'gpu-restored'});assert.equal(state.gpuPauseIntent,null);
});
test('snapshot conversion retains its single physical slot across source replacement until settlement',()=>{
 let state=reduce(reduce(initial(),{type:'init'}),{type:'ready'});state=policy.admitLegacySnapshot(state,8);state=policy.captureLegacySnapshot(state);state=policy.admitLegacySource(state).state;
 assert.equal(policy.admitLegacySnapshot(state,9),state);const finished=policy.finishLegacySnapshot(state,8,0);assert.equal(finished.publish,false);assert.equal(finished.state.snapshot,null);assert.notEqual(policy.admitLegacySnapshot(finished.state,9),finished.state);
 assert.equal(policy.finishLegacySnapshot(finished.state,8,0).publish,false);
});
test('detected container preroll and watchdog preferences belong to worker control',()=>{
 let state=reduce(initial(),{type:'format',format:'mpegts',software:false});assert.equal(state.seekPreroll,30);state=reduce(state,{type:'format',format:'matroska,webm',software:false});assert.equal(state.seekPreroll,.5);state=reduce(state,{type:'format',format:'mpegts',software:true});assert.equal(state.seekPreroll,1);state=reduce(state,{type:'decoder-watchdog',enabled:false});assert.equal(state.decoderOutputWatchdog,false);
});
