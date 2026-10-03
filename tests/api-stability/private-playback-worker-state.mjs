// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import * as decode from '../../web/generated/internal/decode-policy.js';
import * as policy from '../../web/generated/internal/machine/private-playback-worker.js';
const source=(await readFile(process.env.PLAYBACK_WORKER_SOURCE??new URL('../../web/private-mpv/playback-worker.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function worker(options={}){
 const messages=[],commands=[],events=[],sources=[],calls=[],timers=new Map();let timer=0,bitmapResolve,now=1000;
 const engine={facts:()=>({runtime:'fixture'}),module:{FS:{mkdirTree(){},writeFile(){},unlink(){}}},async call(name){calls.push(name);return 0;},raw:{memory:{buffer:new ArrayBuffer(16)}},runtime:'fixture',source:{snapshot:()=>({}),source:{reader:{}},drainFailures:()=>[],cancelSource(){}},scheduler:{snapshot:()=>({})},dispose(){}};
 const host={setNativeDestroyed(){this.created=false;},resetSource(){this.properties={};this.events=[];this.draws=0;},setSeekPreroll(duration){this.seekPreroll=Number.isFinite(duration)&&duration>0?Math.min(60,duration):2;},audio:{header:()=>new Int32Array(8),pump(){}},draws:options.draws??1,properties:{'track-list':[{type:'video',selected:true}],'time-pos':2.5},canvas:{async convertToBlob(){return 'snapshot';}},async create(){this.created=true;},async command(id,...args){commands.push([id,...args]);events.push({event:'command-reply',id,result:true});},async pump(){return events.splice(0);},async seek(id){events.push({event:'command-reply',id:id+0x40000000,result:true});},async serial(operation){return operation();},async destroy(){return{};}};
 const context=vm.createContext({...decode,...policy,performance:{now:()=>now},AbortController,ArrayBuffer,Blob,Map,privateMpv:()=>options.acquire?options.acquire(engine):Promise.resolve(engine),PrivatePlaybackHost:function(){return host;},privateMpvSource:(_data,refresh)=>{const item={refresh,closed:0,async open(){if(options.open)await options.open(item);},close(){this.closed++;this.onClose?.();}};sources.push(item);return item;},setTimeout:(callback,ms)=>{if(options.scheduleError?.(ms))throw Error('timer unavailable');const id=++timer;timers.set(id,{callback,ms});return id;},clearTimeout:id=>timers.delete(id),postMessage:value=>messages.push(value),createImageBitmap:()=>new Promise(resolve=>bitmapResolve=resolve),testEngine:engine,testHost:host});
 vm.runInContext(source,context);if(!options.boot)vm.runInContext("engine=testEngine;host=testHost;lifecycle=admitPlaybackWorkerInit(lifecycle).state;lifecycle=finishPlaybackWorkerInit(lifecycle,true).state;lifecycle=beginPlaybackWorkerControl(lifecycle,'pause',false).state;lifecycle=configurePlaybackWorkerDecode(lifecycle,{codec:'h264',decodeQuality:'exact',maxDecodePixels:8294400},false,false);",context);
 return{messages,commands,host,engine,sources,calls,context,timers,advance:ms=>now+=ms,send:data=>context.onmessage({data}),pump:()=>vm.runInContext('pump()',context),drain:()=>vm.runInContext('chain',context),bitmap(){assert.ok(bitmapResolve,'bitmap capture started');bitmapResolve({width:1,height:1,close(){options.bitmapClosed?.();}});},async close(){this.send({id:99,op:'close'});await this.drain();}};
}
test('actual pause acknowledgment waits for the concurrently captured final picture to be presented',async()=>{
 const w=worker();w.send({id:1,op:'pause',value:true});await turn();const pumping=w.pump();await turn();
 const repliedBeforeCapture=w.messages.some(message=>message.id===1);w.bitmap();await pumping;await turn();
 const picture=w.messages.find(message=>message.type==='picture'),repliedBeforePresentation=w.messages.some(message=>message.id===1);assert.ok(picture);
 w.send({op:'picture-presented',pictureId:picture.pictureId});await w.drain();const reply=w.messages.find(message=>message.id===1);await w.close();
 assert.equal(repliedBeforeCapture,false,'pause resolved while final bitmap was still pending');assert.equal(repliedBeforePresentation,false,'pause resolved before visible presentation acknowledgment');assert.equal(reply.result,true);
});

async function pumpPicture(w){const pumping=w.pump();await turn();w.bitmap();await pumping;return w.messages.filter(message=>message.type==='picture').at(-1);}
async function pause(w,id=1){w.send({id,op:'pause',value:true});await turn();const picture=await pumpPicture(w);w.send({op:'picture-presented',pictureId:picture.pictureId});await w.drain();return picture;}
test('pause holds the latest draw behind the occupied mailbox and ignores stale acknowledgments',async()=>{
 const w=worker(),first=await pumpPicture(w);w.host.draws=2;w.send({id:1,op:'pause',value:true});await turn();await w.pump();await turn();
 w.send({op:'picture-presented',pictureId:999});await turn();assert.equal(w.messages.some(message=>message.id===1),false);
 w.send({op:'picture-presented',pictureId:first.pictureId});await turn();assert.equal(w.messages.some(message=>message.id===1),false);
 const second=await pumpPicture(w);w.send({op:'picture-presented',pictureId:first.pictureId});await turn();assert.equal(w.messages.some(message=>message.id===1),false);
 w.send({op:'picture-presented',pictureId:second.pictureId});await w.drain();assert.equal(w.messages.find(message=>message.id===1).result,true);await w.close();
});
test('settled and duplicate pause suppress unsolicited trailing pictures',async()=>{
 const w=worker();await pause(w);w.host.draws=3;await w.pump();assert.equal(w.messages.filter(message=>message.type==='picture').length,1);
 w.send({id:2,op:'pause',value:true});await turn();await w.pump();await w.drain();assert.equal(w.messages.find(message=>message.id===2).result,true);await w.close();
});
for(const operation of [{op:'seek',seconds:4},{op:'command',args:['frame-step']},{op:'command',args:['frame-back-step']},{op:'command',args:['set','sub-visibility','no']},{op:'command',args:['set','vf','hflip']},{op:'resize',width:320,height:180},{op:'pause',value:false}])test('explicit '+JSON.stringify(operation)+' opens presentation after settled pause',async()=>{
 const w=worker();await pause(w);w.host.draws=2;w.send({id:2,...operation});await turn();const picture=await pumpPicture(w);assert.equal(picture.rendered,2);w.send({op:'picture-presented',pictureId:picture.pictureId});await w.drain();assert.ok(w.messages.find(message=>message.id===2));await w.close();
});
for(const operation of ['close','load'])test(operation+' retires pending presentation without waiting for acknowledgment',async()=>{
 const w=worker();w.send({id:1,op:'pause',value:true});await turn();const picture=await pumpPicture(w),pausing=w.drain();w.send({id:2,op:operation,generation:2});await pausing;
 assert.match(w.messages.find(message=>message.id===1).error,/closed|replaced/i);w.send({op:'picture-presented',pictureId:picture.pictureId});assert.equal(w.messages.filter(message=>message.id===1).length,1);await w.close();
});
test('presentation deadline rejects pause exactly once and later acknowledgment cannot resolve it',async()=>{
 const w=worker();w.send({id:1,op:'pause',value:true});await turn();const picture=await pumpPicture(w);const deadline=[...w.timers.values()].find(timer=>timer.ms===15000);assert.ok(deadline);w.advance(15000);deadline.callback();await w.drain();
 assert.match(w.messages.find(message=>message.id===1).error,/Picture presentation deadline/);w.send({op:'picture-presented',pictureId:picture.pictureId});assert.equal(w.messages.filter(message=>message.id===1).length,1);await w.close();
});

function ready(){let state=policy.admitPlaybackWorkerInit(policy.createPrivatePlaybackWorker()).state;return policy.finishPlaybackWorkerInit(state,true).state;}
function loaded(state,generation=1){let next=policy.receivePlaybackWorkerLoad(state);const id=next.id;next=policy.beginPlaybackWorkerLoad(next.state,id,generation,false);for(const input of ['opened','created','loaded'])next=policy.advancePlaybackWorkerLoad(next.state,id,input);return next.state;}
test('pure load retirement rejects every delayed stage, command and capture from earlier identity',()=>{
 let state=loaded(ready()),command=policy.admitPlaybackWorkerCommand(state,false,10);state=command.state;const capture=policy.beginPlaybackWorkerCapture(state,2);state=capture.state;
 const previous=state;state=policy.receivePlaybackWorkerLoad(state).state;
 assert.equal(policy.settlePlaybackWorkerRequest(state,'command',command.request.id,{kind:'reply'}).accepted,false);
 assert.equal(policy.finishPlaybackWorkerCapture(state,capture.picture.id).picture,null);
 assert.equal(policy.advancePlaybackWorkerLoad(state,previous.load.id,'loaded').accepted,false);
 assert.equal(previous.commands.length,1);assert.equal(previous.capture.rendered,2);assert.ok(Object.isFrozen(previous));
});
test('pure old-generation picture acknowledgment frees mailbox without crediting new source',()=>{
 let state=loaded(ready()),capture=policy.beginPlaybackWorkerCapture(state,4);state=policy.finishPlaybackWorkerCapture(capture.state,capture.picture.id).state;state=loaded(state,2);
 const fence=policy.pausePlaybackWorkerPresentation(state,1,10);state=fence.state;const ack=policy.acknowledgePlaybackWorkerPicture(state,capture.picture.id);
 assert.equal(ack.state.presentedDraws,0);assert.equal(ack.resolved.length,0);assert.equal(ack.state.pendingPicture,null);assert.equal(ack.state.fences.length,1);
});
test('pure deadlines do not fire early or twice and retained states stay immutable',()=>{
 let state=loaded(ready()),command=policy.admitPlaybackWorkerCommand(state,true,250);state=command.state;assert.equal(command.id,1);assert.equal(command.request.id,0x40000001);assert.equal(command.request.deadline,15250);
 assert.equal(policy.settlePlaybackWorkerRequest(state,'command',command.request.id,{kind:'deadline',now:15249}).state,state);
 const settled=policy.settlePlaybackWorkerRequest(state,'command',command.request.id,{kind:'deadline',now:15250});assert.equal(settled.accepted,true);assert.equal(settled.state.commands.length,0);assert.equal(state.commands.length,1);
 assert.equal(policy.settlePlaybackWorkerRequest(settled.state,'command',command.request.id,{kind:'reply'}).accepted,false);
});
test('pure refresh deadline and retirement preserve source admission and identity',()=>{
 let state=loaded(ready()),request=policy.admitPlaybackWorkerRefresh(state,state.load.id,100);state=request.state;assert.equal(request.request.deadline,5100);
 assert.equal(policy.settlePlaybackWorkerRequest(state,'refresh',request.request.id,{kind:'deadline',now:5099}).accepted,false);
 assert.equal(policy.admitPlaybackWorkerRefresh(state,state.load.id+1,100).request,null);
 state=policy.retirePlaybackWorker(state).state;assert.equal(state.refreshes.length,0);assert.equal(policy.settlePlaybackWorkerRequest(state,'refresh',request.request.id,{kind:'reply'}).accepted,false);
});
test('pure presentation histories preserve pause, explicit visual reopening and finite mailbox ownership',()=>{
 for(let rounds=1;rounds<=12;rounds++){
  let state=loaded(ready());const retained=[];
  for(let draw=1;draw<=rounds;draw++){
   retained.push(state);state=policy.openPlaybackWorkerPresentation(state);const capture=policy.beginPlaybackWorkerCapture(state,draw);state=policy.finishPlaybackWorkerCapture(capture.state,capture.picture.id).state;
   const pause=policy.pausePlaybackWorkerPresentation(state,draw,draw*100);state=pause.state;
   assert.equal(policy.beginPlaybackWorkerCapture(state,draw+1).picture,null);
   const ack=policy.acknowledgePlaybackWorkerPicture(state,capture.picture.id);state=ack.state;assert.deepEqual(ack.resolved,[pause.fence.id]);assert.equal(state.picturePaused,true);assert.equal(state.presentedDraws,draw);assert.equal(state.fences.length,0);
   assert.equal(policy.beginPlaybackWorkerCapture(state,draw+1).picture,null);assert.equal(policy.acknowledgePlaybackWorkerPicture(state,capture.picture.id).state,state);
  }
  assert.equal(retained[0].presentedDraws,0);assert.equal(retained[0].picturePaused,false);
 }
});
test('pure settings preserve insertion order and detach prior accepted values',()=>{
 let state=ready();state=policy.playbackWorkerSetting(state,'volume','20');state=policy.playbackWorkerSetting(state,'speed','1.5');const previous=state;state=policy.playbackWorkerSetting(state,'volume','30');
 assert.deepEqual(state.settings,[['volume','30'],['speed','1.5']]);assert.deepEqual(previous.settings,[['volume','20'],['speed','1.5']]);assert.ok(Object.isFrozen(state.settings[0]));
});
test('pure subtitle inventory enforces both aggregate byte and entry limits',()=>{
 let state=ready();for(let i=0;i<32;i++)state=policy.acceptPlaybackWorkerSubtitle(state,1);assert.equal(policy.playbackWorkerSubtitleFits(state,1),false);
 state=policy.acceptPlaybackWorkerSubtitle(ready(),16*1024*1024);assert.equal(policy.playbackWorkerSubtitleFits(state,1),false);assert.equal(policy.playbackWorkerSubtitleFits(ready(),16*1024*1024),true);
});
test('actual close publishes shared completion before source cancellation reenters',async()=>{
 const w=worker();let inner,count=0;w.engine.source.cancelSource=()=>{count++;inner=vm.runInContext('close()',w.context);};const completion=vm.runInContext('close()',w.context);assert.equal(inner,completion);await completion;assert.equal(count,1);assert.equal(vm.runInContext('close()',w.context),completion);
});
test('actual early timer reschedules presentation deadline instead of rejecting pause',async()=>{
 const w=worker();w.send({id:1,op:'pause',value:true});await turn();const picture=await pumpPicture(w),entry=[...w.timers.values()].find(timer=>timer.ms===15000);entry.callback();await turn();assert.equal(w.messages.some(message=>message.id===1),false);
 w.send({op:'picture-presented',pictureId:picture.pictureId});await w.drain();assert.equal(w.messages.find(message=>message.id===1).result,true);await w.close();
});
test('actual retired pump discards a bitmap completed after close',async()=>{
 const w=worker();const pumping=w.pump();await turn();await w.close();w.bitmap();await pumping;assert.equal(w.messages.filter(message=>message.type==='picture').length,0);
});

test('actual close during engine acquisition disposes late engine without creating native host',async()=>{
 let acquire,disposed=0;const w=worker({boot:true,acquire:engine=>new Promise(resolve=>acquire=()=>resolve(engine))});w.engine.dispose=()=>disposed++;
 w.send({id:1,op:'init',runtime:'fixture'});await turn();w.send({id:2,op:'close'});acquire();await w.drain();
 assert.deepEqual(w.calls,[]);assert.equal(disposed,1);assert.match(w.messages.find(message=>message.id===1).error,/closing/);assert.equal(w.messages.some(message=>message.id===1&&message.result),false);assert.equal(vm.runInContext('lifecycle.phase',w.context),'closed');
});
test('actual close during source open prevents host recreation, commands and successful load publication',async()=>{
 let release;const w=worker({open:()=>new Promise(resolve=>release=resolve)});w.send({id:1,op:'load',generation:1});await turn();w.send({id:2,op:'close'});release();await w.drain();
 assert.equal(w.host.created,undefined);assert.equal(w.commands.length,0);assert.match(w.messages.find(message=>message.id===1).error,/replaced/i);assert.equal(w.messages.some(message=>message.id===1&&message.result),false);assert.equal(w.sources[0].closed,1);
});
test('actual source refresh is rejected at replacement and retained stale callbacks cannot re-admit',async()=>{
 let release;const w=worker({open:()=>new Promise(resolve=>release=resolve)});w.send({id:1,op:'load',generation:1,canRefresh:true});await turn();const request=w.sources[0].refresh({url:'https://example.test/old'}),rejected=assert.rejects(request,/replaced/i);w.send({id:2,op:'load',generation:2});await rejected;
 await assert.rejects(w.sources[0].refresh({url:'https://example.test/stale'}),/replaced/i);w.send({id:3,op:'close'});release();await w.drain();assert.equal(w.messages.filter(message=>message.type==='refresh').length,1);
});
test('actual frozen pause keeps snapshot available without reopening picture delivery',async()=>{
 const w=worker();await pause(w);w.send({id:2,op:'snapshot'});await w.drain();assert.equal(w.messages.find(message=>message.id===2).result.blob,'snapshot');assert.equal(vm.runInContext('lifecycle.picturePaused',w.context),true);await w.close();
});

test('actual native command scheduling failure rejects without invoking the engine',async()=>{
 const w=worker({scheduleError:ms=>ms===15000});w.send({id:1,op:'command',args:['set','volume','20']});await w.drain();assert.match(w.messages.find(message=>message.id===1).error,/timer unavailable/);assert.equal(w.commands.length,0);await w.close();
});
test('actual pump scheduling failure closes instead of leaving an unobserved rejection',async()=>{
 const w=worker({draws:0,scheduleError:ms=>ms===8});await w.pump();await turn();assert.equal(vm.runInContext('lifecycle.phase',w.context),'closed');assert.match(w.messages.find(message=>message.type==='fatal').error,/timer unavailable/);
});
test('pure late subtitle acceptance cannot mutate retired or replacing inventory',()=>{
 const original=ready(),retired=policy.retirePlaybackWorker(original).state,replacing=policy.receivePlaybackWorkerLoad(original).state;
 assert.equal(policy.acceptPlaybackWorkerSubtitle(retired,10),retired);assert.equal(policy.acceptPlaybackWorkerSubtitle(replacing,10),replacing);assert.equal(policy.acceptPlaybackWorkerSubtitle(original,10).subtitleBytes,10);
});
for(const args of [['set','volume','20'],['set','speed','1.5'],['set','cache','yes'],['expand-text','${time-pos}']])test('nonvisual '+args.join(' ')+' preserves a settled paused picture',async()=>{
 const w=worker();await pause(w);w.send({id:2,op:'command',args});await turn();w.host.draws=2;const pumping=w.pump();await turn();if(vm.runInContext('!!lifecycle.capture',w.context))w.bitmap();await pumping;await w.drain();assert.equal(w.messages.filter(message=>message.type==='picture').length,1);assert.equal(vm.runInContext('lifecycle.picturePaused',w.context),true);await w.close();
});

test('actual picture send failure closes the untransferred bitmap before retiring the worker',async()=>{
 let closed=0;const w=worker({bitmapClosed:()=>closed++});w.context.postMessage=message=>{if(message.type==='picture')throw Error('transfer rejected');w.messages.push(message);};const pumping=w.pump();await turn();w.bitmap();await pumping;await turn();assert.equal(closed,1);assert.match(w.messages.find(message=>message.type==='fatal').error,/transfer rejected/);assert.equal(vm.runInContext('lifecycle.phase',w.context),'closed');
});

test('successful replacement destruction is recorded before reentrant close can destroy again',async()=>{
 const w=worker();w.host.created=true;let tail=Promise.resolve(),closing;
 w.host.serial=operation=>{const next=tail.then(operation);tail=next.catch(()=>{});return next;};
 w.host.destroy=()=>w.host.serial(async()=>{if(w.host.created){await w.engine.call('web_destroy');w.host.setNativeDestroyed();}return{};});
 vm.runInContext('source={close(){}};',w.context);
 w.engine.call=async name=>{w.calls.push(name);if(name==='web_destroy'&&!closing)closing=vm.runInContext('close()',w.context);return 0;};
 w.send({id:1,op:'load',generation:2});await w.drain();await closing;
 assert.equal(w.calls.filter(name=>name==='web_destroy').length,1);
 assert.equal(w.host.created,false);assert.match(w.messages.find(message=>message.id===1).error,/replaced/i);
});
test('RPC ingress bounds blocked caller chains and preserves current load on overload',async()=>{
 const w=worker();let release;w.host.command=()=>new Promise(resolve=>release=resolve);
 for(let id=1;id<=128;id++)w.send({id,op:'command',args:['expand-text','ok']});await turn();
 w.send({id:129,op:'load',generation:99});assert.match(w.messages.find(m=>m.id===129).error,/RPC capacity/);
 assert.equal(vm.runInContext('lifecycle.rpcs.length',w.context),128);assert.equal(vm.runInContext('lifecycle.loadSerial',w.context),0);
 w.send({id:130,op:'close'});assert.equal(vm.runInContext('lifecycle.rpcs.length',w.context),129);
 w.send({id:131,op:'command',args:['expand-text','late']});assert.match(w.messages.find(m=>m.id===131).error,/closed/);
 release();await w.drain();assert.equal(vm.runInContext('lifecycle.rpcs.length',w.context),0);assert.equal(w.messages.filter(m=>m.id>=1&&m.id<=128).length,128);
});
test('RPC copied payload aggregate rejects excess before retaining another closure',async()=>{
 const w=worker();let release;w.host.command=()=>new Promise(resolve=>release=resolve);const bytes=new ArrayBuffer(33*1024*1024);
 w.send({id:1,op:'command',args:['expand-text','ok'],bytes});await turn();w.send({id:2,op:'command',args:['expand-text','ok'],bytes});
 assert.match(w.messages.find(m=>m.id===2).error,/RPC capacity/);assert.equal(vm.runInContext('lifecycle.rpcs.length',w.context),1);
 w.send({id:3,op:'close'});release();await w.drain();assert.equal(vm.runInContext('lifecycle.rpcs.length',w.context),0);
});
test('RPC envelope traversal rejects excessive depth without changing load ownership',async()=>{
 const w=worker();let nested={};for(let i=0;i<20;i++)nested={nested};w.send({id:1,op:'load',nested});assert.match(w.messages.find(m=>m.id===1).error,/envelope capacity/);assert.equal(vm.runInContext('lifecycle.loadSerial',w.context),0);await w.close();
});
test('pure async command refresh and presentation maps have separate finite capacities',()=>{
 let command=ready();for(let i=0;i<128;i++){const result=policy.admitPlaybackWorkerCommand(command,false,0);assert.ok(result.request);command=result.state;}assert.match(policy.admitPlaybackWorkerCommand(command,false,0).error,/capacity/);
 let refresh=loaded(ready());for(let i=0;i<128;i++){const result=policy.admitPlaybackWorkerRefresh(refresh,refresh.load.id,0);assert.ok(result.request);refresh=result.state;}assert.equal(policy.admitPlaybackWorkerRefresh(refresh,refresh.load.id,0).request,null);
 let presentation=ready();for(let i=0;i<128;i++){const result=policy.pausePlaybackWorkerPresentation(presentation,1,0);assert.ok(result.fence);presentation=result.state;}assert.match(policy.pausePlaybackWorkerPresentation(presentation,1,0).error,/capacity/);
 const exhausted={...ready(),rpcSerial:Number.MAX_SAFE_INTEGER};assert.match(policy.admitPlaybackWorkerRPC(exhausted,0).error,/identity exhausted/);const close=policy.admitPlaybackWorkerRPC(exhausted,0,true);assert.equal(close.id,0);assert.equal(policy.finishPlaybackWorkerRPC(close.state,0).rpcs.length,0);
});
test('oversized setting is rejected before persisting its replay value',async()=>{
 const w=worker();w.send({id:1,op:'command',args:['set','vf','x'.repeat(16385)]});await w.drain();assert.match(w.messages.find(m=>m.id===1).error,/Invalid playback command/);assert.equal(vm.runInContext("lifecycle.settings.some(entry=>entry[0]==='vf')",w.context),false);await w.close();
});
test('native cleanup proceeds after retirement source cleanup throws and completion is shared',async()=>{
 const w=worker(),calls=[];w.context.retireFailure=Error('source close failed');vm.runInContext('source={close(){throw retireFailure;}}',w.context);
 w.engine.source.cancelSource=()=>{calls.push('cancel');};w.host.destroy=async()=>{calls.push('destroy');return{};};w.engine.dispose=()=>{calls.push('dispose');};
 const closing=vm.runInContext('close()',w.context);assert.equal(vm.runInContext('close()',w.context),closing);await assert.rejects(closing,/source close failed/);assert.deepEqual(calls,['cancel','destroy','dispose']);assert.equal(vm.runInContext('lifecycle.phase',w.context),'closed');
});
test('failed load retirement releases its ingress reservation before closing native resources',async()=>{
 const w=worker();let disposed=0;w.engine.dispose=()=>disposed++;vm.runInContext("source={close(){throw Error('bad source close');}}",w.context);w.send({id:1,op:'load',generation:2});await turn();
 assert.match(w.messages.find(m=>m.id===1).error,/bad source close/);assert.equal(vm.runInContext('lifecycle.rpcs.length',w.context),0);assert.equal(vm.runInContext('lifecycle.phase',w.context),'closed');assert.equal(disposed,1);
});
test('pending native replies are all rejected even if one timer removal fails',async()=>{
 const w=worker();let rejects=0;w.context.rejectReceipt=()=>rejects++;vm.runInContext("commands.set(1,{timer:1,reject:rejectReceipt});commands.set(2,{timer:2,reject:rejectReceipt});",w.context);w.context.clearTimeout=id=>{if(id===1)throw Error('timer removal failed');};
 await assert.rejects(vm.runInContext('close()',w.context),/timer removal failed/);assert.equal(rejects,2);assert.equal(vm.runInContext('commands.size',w.context),0);assert.equal(vm.runInContext('lifecycle.phase',w.context),'closed');
});
