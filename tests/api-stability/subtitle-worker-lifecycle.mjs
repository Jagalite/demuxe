// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../../web/generated/internal/machine/subtitle-worker.js';
const source=fs.readFileSync(process.env.SUBTITLE_WORKER_SOURCE??new URL('../../web/mpv-subtitle-worker.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'').replaceAll('import.meta.url',JSON.stringify('file:///subtitle-worker.js')).replaceAll('import(', 'loadModule(').replace('const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));','const delay=async()=>{};');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
function fixture(hooks={}){
 const messages=[],calls=[],timers=new Map(),allTimers=[],bitmaps=[];let serial=0,now=0,allocation=4096;
 const engine={HEAPU8:new Uint8Array(65536),HEAP32:new Int32Array(16384),FS:{mkdir:path=>calls.push(['mkdir',path]),writeFile:path=>calls.push(['write',path]),unlink:path=>calls.push(['unlink',path])},PThread:{runningWorkers:[],terminateAllThreads(){calls.push(['threads.terminate']);}},_web_io_ptr:()=>0,_web_io_cancel(){calls.push(['io.cancel']);},_web_io_configure(...args){calls.push(['io.configure',...args]);},_web_subtitle_ptr:()=>0};
 const native={subtitle_service_create:()=>1,malloc:()=>{allocation+=4096;return allocation;},free:()=>0,subtitle_service_open:()=>0,subtitle_service_loaded:()=>1,subtitle_service_track_count:()=>0,subtitle_service_block:()=>0,subtitle_service_close:()=>0,subtitle_service_select:()=>0,subtitle_service_av_chains:()=>0,subtitle_service_update:()=>1,subtitle_service_render:()=>1,subtitle_service_text:()=>0,subtitle_service_ass_scan_needed:()=>0,subtitle_service_visual_schedule:()=>0,subtitle_service_bitmap_recovery_point:()=>-1,subtitle_service_seek:()=>0,demuxe_source_live:()=>0};
 for(const[name,fn]of Object.entries(native))engine['_'+name]=(...args)=>{calls.push([name,...args]);return hooks.native?.(name,args)??fn(...args);};
 const host={module:engine,call(name,...args){return engine['_'+name](...args);},facts:()=>({runtime:'fake'}),source:{cancelSource(){calls.push(['source.cancel']);},drainFailures:()=>[]},dispose(){calls.push(['host.dispose']);hooks.dispose?.();}};
 const input={open:async()=>{calls.push(['source.open']);return hooks.sourceOpen?.();},close(){calls.push(['source.close']);hooks.sourceClose?.();},reader:{stats:{reads:0}}};
 const io={onmessage:null,onerror:null,postMessage(data){calls.push(['io.post',data.type]);if(data.type==='init'&&!hooks.ioHeld)this.onmessage({data:{type:'ready',info:{size:1024}}});},terminate(){calls.push(['io.terminate']);hooks.ioTerminate?.();}};
 const context={...core,onmessage:null,postMessage(data,transfer){hooks.post?.(data,transfer);messages.push(data);},performance:{now:()=>{hooks.clock?.();return now;}},TextDecoder,TextEncoder,URL,Uint8Array,Int32Array,DataView,ArrayBuffer,AbortController,Promise,Error,DOMException,
  self:{close(){calls.push(['self.close']);}},setTimeout(callback,delay){const entry={id:++serial,callback,due:now+delay};hooks.setTimer?.(entry);timers.set(entry.id,entry);allTimers.push(entry);return entry.id;},clearTimeout(id){hooks.clearTimer?.(id);timers.delete(id);},
  runtimeWorker(){calls.push(['io.acquire']);hooks.ioAcquire?.();return io;},
  loadModule:async path=>{hooks.import?.(path);if(path.includes('private-mpv'))return{privateMpv:async()=>hooks.hostAcquire?await hooks.hostAcquire():host,privateMpvSource:()=>input};return{default:async()=>hooks.engineAcquire?await hooks.engineAcquire():engine};},
  SubtitleOverlay:class{serial=0;clear(){calls.push(['overlay.clear']);}read(){this.serial++;return{surface:{}};}draw(){}},OffscreenCanvas:class{getContext(){return{};}transferToImageBitmap(){const bitmap={closes:0,close(){this.closes++;}};bitmaps.push(bitmap);return bitmap;}}
 };
 vm.runInNewContext(source+'\nglobalThis.inspect=()=>({control,refreshes:refreshes.size,ioOpening,chain});globalThis.refreshForTest=value=>refreshAuthorization(control.epoch,value);',context);
 const f={hooks,messages,calls,engine,host,input,io,timers,allTimers,bitmaps,context,send(data){context.onmessage({data});return context.inspect().chain;},init(runtime='pthread'){return this.send({id:1,type:'init',runtime,fonts:[],file:{},canRefresh:true});},request(type,extra={}){return this.send({id:++serial+10,type,seconds:0,width:320,height:180,force:true,rate:1,running:true,trackId:1,...extra});},async close(){this.send({type:'close'});await flush();},inspect:context.inspect,get now(){return now;},set now(value){now=value;},fire(entry=allTimers.at(-1)){timers.delete(entry.id);entry.callback();},refresh:context.refreshForTest};return f;
}
test('pure FIFO requests preserve current lease and close retires all live identities',()=>{
 const initial=core.initialSubtitleWorker(),first=core.admitSubtitleWorker(initial,'init',1),second=core.admitSubtitleWorker(first.state,'select',2);assert.equal(initial.serial,0);assert.equal(core.startSubtitleWorker(second.state,second.request).accepted,false);const start=core.startSubtitleWorker(second.state,first.request);assert.equal(start.accepted,true);assert.equal(core.subtitleWorkerCurrent(start.state,first.request),true);const finish=core.finishSubtitleWorker(start.state,first.request),next=core.startSubtitleWorker(finish,second.request);assert.equal(next.accepted,true);const closed=core.closeSubtitleWorker(next.state);assert.equal(core.subtitleWorkerCurrent(closed.state,second.request),false);assert.equal(core.admitSubtitleWorker(closed.state,'render',3).request,undefined);assert.equal(closed.state.queue.length,0);assert.equal(core.closeSubtitleWorker(closed.state).accepted,false);
});
test('pure refresh reply and deadline settle only original identity',()=>{
 const state=core.initialSubtitleWorker(),first=core.admitSubtitleRefresh(state,1,0);assert.equal(first.request.deadline,5000);assert.equal(core.settleSubtitleRefresh(first.state,first.request.id,4999).remaining,1);const done=core.settleSubtitleRefresh(first.state,first.request.id,5000);assert.equal(done.request.id,first.request.id);const second=core.admitSubtitleRefresh(done.state,1,6000);assert.equal(core.settleSubtitleRefresh(second.state,first.request.id).request,undefined);assert.equal(core.subtitleRefreshCurrent(second.state,second.request),true);assert.equal(core.closeSubtitleWorker(second.state).state.refreshes.length,0);
});
test('actual initialization and queued selection run once in FIFO order',async()=>{
 const f=fixture();await f.init();await f.request('select');assert.equal(f.messages[0].id,1);assert.deepEqual(Array.from(f.messages[0].tracks),[]);assert.equal(f.calls.filter(call=>call[0]==='subtitle_service_create').length,1);assert.equal(f.calls.filter(call=>call[0]==='subtitle_service_select').length,1);assert.equal(f.inspect().control.active,null);await f.close();assert.equal(f.messages.at(-1).type,'closed');assert.equal(f.calls.filter(call=>call[0]==='self.close').length,1);
});
test('close during deferred private host acquisition contains late host without native forward work',async()=>{
 const pending=deferred(),f=fixture({hostAcquire:()=>pending.promise});const initializing=f.init('jspi');await flush();await f.close();pending.resolve(f.host);await initializing;await flush();assert.equal(f.messages.some(message=>message.id===1),false);assert.equal(f.calls.some(call=>call[0]==='subtitle_service_create'),false);assert.equal(f.calls.filter(call=>call[0]==='host.dispose').length,1);assert.equal(f.messages.at(-1).type,'closed');
});
test('close during source open suppresses queued work and later init result',async()=>{
 const pending=deferred(),f=fixture({sourceOpen:()=>pending.promise});const initializing=f.init('jspi');f.request('select');await flush();await f.close();pending.resolve();await initializing;await flush();assert.equal(f.calls.some(call=>call[0]==='subtitle_service_open'),false);assert.equal(f.calls.some(call=>call[0]==='subtitle_service_select'),false);assert.equal(f.messages.some(message=>message.id===1),false);assert.equal(f.inspect().control.queue.length,0);assert.equal(f.messages.at(-1).type,'closed');
});
test('close wakes pending IO source-open wait and clears timeout ownership',async()=>{
 const f=fixture({ioHeld:true}),opening=f.init();await flush();assert.equal(f.timers.size,1);await f.close();await opening;await flush();assert.equal(f.timers.size,0);assert.equal(f.calls.filter(call=>call[0]==='io.terminate').length,1);assert.equal(f.messages.at(-1).type,'closed');f.io.onmessage({data:{type:'ready',info:{size:1}}});assert.equal(f.messages.filter(message=>message.type==='closed').length,1);
});
test('private refresh IDs reject late completion and preserve original deadline on early callback',async()=>{
 const f=fixture();await f.init('jspi');const first=f.refresh('one'),rejection=assert.rejects(first,/timed out/),request=f.messages.at(-1);f.now=4999;f.fire();assert.equal(f.allTimers.at(-1).due,5000);f.now=5000;f.fire();await rejection;const second=f.refresh('two'),current=f.messages.at(-1);f.send({type:'refreshed',id:request.id,update:'late'});assert.equal(f.inspect().refreshes,1);f.send({type:'refreshed',id:current.id,update:'fresh'});assert.equal(await second,'fresh');assert.equal(f.timers.size,0);await f.close();
});
test('refresh timer acquisition retirement clears late handle and rejects the waiter',async()=>{
 const f=fixture();await f.init('jspi');f.hooks.setTimer=()=>{f.send({type:'close'});};await assert.rejects(f.refresh('one'),/closed/);await flush();assert.equal(f.timers.size,0);assert.equal(f.messages.some(message=>message.type==='refresh'),false);
});
test('close attempts source and IO cleanup even when prior cancellation throws',async()=>{
 const f=fixture({sourceClose(){throw Error('source close failed');}});await f.init('jspi');f.host.source.cancelSource=()=>{throw Error('cancel failed');};await f.close();assert.equal(f.calls.some(call=>call[0]==='source.close'),true);assert.equal(f.calls.some(call=>call[0]==='host.dispose'),true);assert.match(f.messages.at(-1).error,/cancel failed/);assert.equal(f.messages.at(-1).type,'closed');
});
test('retirement after bitmap acquisition closes unsent native image',async()=>{
 const gate=deferred(),f=fixture({native(name){if(name==='subtitle_service_text')return gate.promise;}});await f.init();await f.request('select');const rendering=f.request('render');await flush();assert.equal(f.bitmaps.length,1);await f.close();gate.resolve(0);await rendering;await flush();assert.equal(f.bitmaps[0].closes,1);assert.equal(f.messages.some(message=>message.bitmap),false);
});
test('failed bitmap transfer closes caller-owned image and reports request error',async()=>{
 const f=fixture({post(message){if(message.bitmap)throw Error('transfer failed');}});await f.init();await f.request('select');await f.request('render');assert.equal(f.bitmaps[0].closes,1);assert.match(f.messages.at(-1).error,/transfer failed/);await f.close();
});
test('request identity getter retirement cannot overwrite closed worker ownership',async()=>{
 const f=fixture();await f.init();let reads=0;const request={type:'select',get id(){reads++;f.send({type:'close'});return 99;},trackId:1};await f.send(request);await flush();assert.equal(reads,1);assert.equal(f.inspect().control.phase,'closed');assert.equal(f.calls.some(call=>call[0]==='subtitle_service_select'),false);assert.equal(f.messages.some(message=>message.id===99),false);
});
test('successful refresh cleanup retirement rejects instead of publishing authorization',async()=>{
 const f=fixture();await f.init('jspi');const refreshed=f.refresh('one'),message=f.messages.at(-1);f.hooks.clearTimer=()=>{f.send({type:'close'});};f.send({type:'refreshed',id:message.id,update:'stale'});await assert.rejects(refreshed,/closed/);await flush();assert.equal(f.inspect().control.phase,'closed');
});

test('pure request and refresh budgets reject without extending retained identities',()=>{
 let state=core.initialSubtitleWorker();for(let id=0;id<128;id++)state=core.admitSubtitleWorker(state,'render',id).state;
 const overflow=core.admitSubtitleWorker(state,'render',129);assert.equal(overflow.error,'capacity');assert.equal(overflow.state,state);assert.equal(state.queue.length,128);
 let refresh=core.initialSubtitleWorker();for(let id=0;id<128;id++)refresh=core.admitSubtitleRefresh(refresh,1,id).state;
 assert.equal(core.admitSubtitleRefresh(refresh,1,128).error,'capacity');assert.equal(refresh.refreshes.length,128);
 assert.equal(core.admitSubtitleWorker(core.initialSubtitleWorker(),{},1).error,'invalid');
});
test('actual held initialization bounds queued commands and suppresses them on close',async()=>{
 const gate=deferred(),f=fixture({hostAcquire:()=>gate.promise});const opening=f.init('jspi');await flush();
 for(let id=2;id<=129;id++)f.send({type:'select',id,trackId:1});
 assert.equal(f.inspect().control.queue.length,127);assert.match(f.messages.at(-1).error,/capacity/);assert.equal(f.messages.at(-1).id,129);
 await f.close();gate.resolve(f.host);await opening;await flush();assert.equal(f.inspect().control.queue.length,0);assert.equal(f.calls.some(call=>call[0]==='subtitle_service_select'),false);
});
test('actual request replies use captured client identity after native execution',async()=>{
 const f=fixture();await f.init();let reads=0;await f.send({type:'select',get id(){reads++;return 77;},trackId:1});assert.equal(reads,1);assert.equal(f.messages.at(-1).id,77);await f.close();
});
test('deadline early delivery retains original due time and stale callbacks cannot wake',async()=>{
 const f=fixture({native(name,args){if(name==='subtitle_service_visual_schedule'){const view=new DataView(f.engine.HEAPU8.buffer);view.setFloat64(args[1],.5,true);view.setUint32(args[2],7,true);return 1;}}});
 await f.init();await f.request('select');await f.request('render');const original=f.allTimers.at(-1);assert.equal(original.due,502);
 f.now=10;f.fire(original);assert.equal(f.messages.filter(m=>m.type==='subtitleDeadline').length,0);const replacement=f.allTimers.at(-1);assert.equal(replacement.due,502);
 f.fire(original);assert.equal(f.allTimers.at(-1),replacement);f.now=502;f.fire(replacement);f.fire(replacement);assert.equal(f.messages.filter(m=>m.type==='subtitleDeadline').length,1);assert.equal(f.inspect().control.timeline.scheduler.deadlineWakes,1);
 await f.request('render');const cancelled=f.allTimers.at(-1);await f.request('cancelDeadline');f.now=1004;f.fire(cancelled);assert.equal(f.messages.filter(m=>m.type==='subtitleDeadline').length,1);await f.close();
});
test('deadline timer acquired while close reenters is released without wake',async()=>{
 const f=fixture({native(name,args){if(name==='subtitle_service_visual_schedule'){new DataView(f.engine.HEAPU8.buffer).setFloat64(args[1],.5,true);return 1;}}});await f.init();await f.request('select');
 f.hooks.setTimer=()=>{f.send({type:'close'});};await f.request('render');await flush();assert.equal(f.timers.size,0);f.now=1000;f.fire();assert.equal(f.messages.filter(m=>m.type==='subtitleDeadline').length,0);assert.equal(f.inspect().control.phase,'closed');
});
test('attachment byte and count budgets release only after successful native removal',async()=>{
 const f=fixture();await f.init();let id=0;f.engine._malloc=()=>4096;f.engine._subtitle_service_external_api=()=>1;f.engine._subtitle_service_add=()=>++id;f.engine._subtitle_service_remove=()=>0;
 const asset={format:'srt',bytes:new ArrayBuffer(8*1024*1024)};await f.request('add',{asset});await f.request('add',{asset});assert.equal(f.inspect().control.attachments.bytes,16*1024*1024);
 await f.request('add',{asset:{format:'srt',bytes:new ArrayBuffer(1)}});assert.match(f.messages.at(-1).error,/budget/);assert.equal(id,2);
 f.engine._subtitle_service_remove=()=>-1;await f.request('remove',{trackId:1});assert.equal(f.inspect().control.attachments.bytes,16*1024*1024);
 f.engine._subtitle_service_remove=()=>0;await f.request('remove',{trackId:1});assert.equal(f.inspect().control.attachments.bytes,8*1024*1024);
 for(let i=0;i<15;i++)await f.request('add',{asset:{format:'vtt',bytes:new ArrayBuffer(1)}});assert.equal(f.inspect().control.attachments.entries.length,16);
 await f.request('add',{asset:{format:'vtt',bytes:new ArrayBuffer(1)}});assert.match(f.messages.at(-1).error,/budget/);assert.equal(f.inspect().control.attachments.pending,null);await f.close();
});
test('rejected native attachment clears reservation without consuming byte budget',async()=>{
 const f=fixture();await f.init();f.engine._subtitle_service_external_api=()=>1;f.engine._subtitle_service_add=()=>-1;await f.request('add',{asset:{format:'ass',bytes:new ArrayBuffer(32)}});
 assert.match(f.messages.at(-1).error,/could not load/);assert.equal(f.inspect().control.attachments.bytes,0);assert.equal(f.inspect().control.attachments.pending,null);assert.ok(f.calls.some(([name,path])=>name==='unlink'&&path==='/subtitles/1.ass'));await f.close();
});
test('composed timeline and attachment decisions reject retired request observations',()=>{
 let state=core.initialSubtitleWorker();const admitted=core.admitSubtitleWorker(state,'render',1),request=admitted.request;state=core.startSubtitleWorker(admitted.state,request).state;
 state=core.changeSubtitleTimeline(state,request,{type:'selected',trackId:1});state=core.changeSubtitleTimeline(state,request,{type:'rendered',next:.5,epoch:7});
 const reserved=core.admitSubtitleAttachment(state,request,'srt',128,true);state=reserved.state;const scheduled=core.armSubtitleDeadline(state,request,{mode:'deadline',unstable:false,next:.5,epoch:7},0,1,true,0);state=scheduled.state;
 assert.equal(core.subtitleMayLearnProfile(state),true);assert.equal(core.settleSubtitleDeadline(state,scheduled.deadline,10).remaining,492);
 state=core.closeSubtitleWorker(state).state;assert.equal(core.subtitleDeadlineCurrent(state,scheduled.deadline),false);assert.equal(state.attachments.pending,null);
 assert.equal(core.changeSubtitleTimeline(state,request,{type:'time',seconds:5}),state);assert.equal(core.commitSubtitleAttachment(state,request,1),state);assert.equal(core.completeSubtitlePump(state,request,.6,7,false).state,state);assert.equal(core.settleSubtitleDeadline(state,scheduled.deadline,600).accepted,false);
});
test('timeline replay keeps crossed boundaries observable across arbitrary cancelled rearming',()=>{
 function replay(seed){let state=core.initialSubtitleWorker(),boundary=.5,last=0,invalidations=0;const snapshots=[];
  for(let step=0;step<96;step++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;const seconds=last+(seed%100)/1000;
   const admission=core.admitSubtitleWorker(state,'pump',step),request=admission.request;state=core.startSubtitleWorker(admission.state,request).state;
   if(step===0){state=core.changeSubtitleTimeline(state,request,{type:'selected',trackId:1});state=core.changeSubtitleTimeline(state,request,{type:'rendered',next:boundary,epoch:7});}
   state=core.cancelSubtitleDeadline(state);const armed=core.armSubtitleDeadline(state,request,{mode:'deadline',unstable:false,next:seconds<.5?.5:2,epoch:7},seconds,1,true,step*50);state=armed.state;
   const completion=core.completeSubtitlePump(state,request,seconds,7,false);assert.equal(completion.timingChanged,boundary!==null&&seconds>=boundary);if(completion.timingChanged){invalidations++;boundary=null;}
   state=core.changeSubtitleTimeline(completion.state,request,{type:'time',seconds});state=core.finishSubtitleWorker(state,request);last=seconds;snapshots.push(JSON.stringify(state));
  }assert.equal(invalidations,1);return snapshots;
 }
 for(let seed=1;seed<=24;seed++)assert.deepEqual(replay(seed),replay(seed));
});
test('attachment allocation failure rolls back the retained file and reservation',async()=>{
 const f=fixture();await f.init();f.engine._subtitle_service_external_api=()=>1;f.engine._malloc=()=>{throw Error('allocation failed');};await f.request('add',{asset:{format:'srt',bytes:new ArrayBuffer(32)}});assert.match(f.messages.at(-1).error,/allocation failed/);assert.ok(f.calls.some(([name,path])=>name==='unlink'&&path==='/subtitles/1.srt'));assert.equal(f.inspect().control.attachments.pending,null);assert.equal(f.inspect().control.attachments.bytes,0);await f.close();
});
test('failed attachment rollback retains cleanup and blocks additional file acquisition',async()=>{
 const f=fixture();await f.init();f.engine._subtitle_service_external_api=()=>1;f.engine._malloc=()=>0;const unlink=f.engine.FS.unlink;let attempts=0;f.engine.FS.unlink=path=>{attempts++;if(attempts===1)throw Error('unlink failed');unlink(path);};
 await f.request('add',{asset:{format:'srt',bytes:new ArrayBuffer(32)}});assert.match(f.messages.at(-1).error,/attachment allocation failed/);assert.equal(f.inspect().control.failed,true);
 await f.request('add',{asset:{format:'srt',bytes:new ArrayBuffer(32)}});assert.equal(f.calls.filter(([name])=>name==='write').length,1);await f.close();assert.equal(attempts,2);assert.ok(f.calls.some(([name,path])=>name==='unlink'&&path==='/subtitles/1.srt'));
});
test('deadline clock observation retirement cannot restore active worker state',async()=>{
 const f=fixture({native(name,args){if(name==='subtitle_service_visual_schedule'){new DataView(f.engine.HEAPU8.buffer).setFloat64(args[1],.5,true);return 1;}}});await f.init();await f.request('select');await f.request('render');const timer=f.allTimers.at(-1);f.now=502;f.hooks.clock=()=>{f.hooks.clock=null;f.send({type:'close'});};f.fire(timer);await flush();assert.equal(f.inspect().control.phase,'closed');assert.equal(f.messages.filter(m=>m.type==='subtitleDeadline').length,0);
});
test('attachment getter retirement cannot restore active worker state or acquire a file',async()=>{
 const f=fixture();await f.init();f.engine._subtitle_service_external_api=()=>1;const asset={get format(){f.send({type:'close'});return 'srt';},bytes:new ArrayBuffer(32)};await f.request('add',{asset});await flush();assert.equal(f.inspect().control.phase,'closed');assert.equal(f.calls.filter(([name])=>name==='write').length,0);
});
test('successful native add with failed free poisons lifetime and bounds native admission',async()=>{
 const f=fixture();await f.init();let adds=0;f.engine._subtitle_service_external_api=()=>1;f.engine._subtitle_service_add=()=>++adds;f.engine._free=()=>{throw Error('attachment free failed');};
 await f.request('add',{asset:{format:'srt',bytes:new ArrayBuffer(32)}});assert.match(f.messages.at(-1).error,/attachment free failed/);assert.equal(f.inspect().control.failed,true);
 for(let i=0;i<20;i++)await f.request('add',{asset:{format:'srt',bytes:new ArrayBuffer(32)}});assert.equal(adds,1);assert.equal(f.calls.filter(([name])=>name==='write').length,1);assert.equal(f.inspect().control.attachments.pending,null);await f.close();assert.ok(f.calls.some(([name])=>name==='subtitle_service_close'));
});
test('uncertain native add preserves original failure through free and file rollback errors',async()=>{
 const f=fixture();await f.init();let adds=0;f.engine._subtitle_service_external_api=()=>1;f.engine._subtitle_service_add=()=>{adds++;throw Error('original add failure');};f.engine._free=()=>{throw Error('free cleanup failure');};const unlink=f.engine.FS.unlink;f.engine.FS.unlink=()=>{throw Error('file cleanup failure');};
 await f.request('add',{asset:{format:'srt',bytes:new ArrayBuffer(32)}});assert.match(f.messages.at(-1).error,/original add failure/);assert.equal(f.inspect().control.failed,true);await f.request('add',{asset:{format:'srt',bytes:new ArrayBuffer(32)}});assert.equal(adds,1);assert.match(f.messages.at(-1).error,/original add failure/);f.engine.FS.unlink=unlink;await f.close();assert.ok(f.calls.some(([name,path])=>name==='unlink'&&path==='/subtitles/1.srt'));
});
for(const kind of ['native','unlink'])test(`uncertain removal after ${kind} failure retains budget and blocks repeat mutation`,async()=>{
 const f=fixture();await f.init();let removes=0;f.engine._subtitle_service_external_api=()=>1;f.engine._subtitle_service_add=()=>1;await f.request('add',{asset:{format:'srt',bytes:new ArrayBuffer(32)}});
 const unlink=f.engine.FS.unlink;f.engine._subtitle_service_remove=()=>{removes++;if(kind==='native')throw Error('remove uncertain');return 0;};if(kind==='unlink')f.engine.FS.unlink=()=>{throw Error('unlink uncertain');};
 await f.request('remove',{trackId:1});assert.match(f.messages.at(-1).error,/uncertain/);assert.equal(f.inspect().control.failed,true);assert.equal(f.inspect().control.attachments.bytes,32);await f.request('remove',{trackId:1});assert.equal(removes,1);f.engine.FS.unlink=unlink;await f.close();assert.ok(f.calls.some(([name])=>name==='subtitle_service_close'));
});
