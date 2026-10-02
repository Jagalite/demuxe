// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemuxLifecycle,transitionRemuxLifecycle,remuxGenerationCurrent,remuxRestartCurrent,remuxRecoveryCurrent,remuxAcceptedGeneration} from '../../web/generated/internal/machine/remux-lifecycle.js';
import {RemuxPlayer} from '../../web/native-remux-player.js';
function machine(){
 let state=initialRemuxLifecycle();const commands=[];
 return {get state(){return state;},send(command){const before=structuredClone(state),old=state,result=transitionRemuxLifecycle(state,command);assert.deepEqual(old,before);assert.ok(Object.isFrozen(result.state));state=result.state;commands.push(command);return result;},begin(recoveryId){const restart=this.send({type:'restart',target:4,duration:30,recoveryId});const begin=this.send({type:'begin',restartId:restart.restartId});return {restartId:restart.restartId,generation:begin.generation};},accept(operation){this.send({type:'accept',generation:operation.generation});this.send({type:'settle',restartId:operation.restartId});},replay(){assert.deepEqual(commands.reduce((value,command)=>transitionRemuxLifecycle(value,command).state,initialRemuxLifecycle()),state);}};
}
test('remux admission validates targets and retires previous acceptance before physical cleanup',()=>{
 const m=machine();m.send({type:'open'});const first=m.begin();m.accept(first);assert.equal(remuxAcceptedGeneration(m.state),true);
 for(const target of [-1,NaN,Infinity,30]){const before=m.state;assert.equal(m.send({type:'restart',target,duration:30}).error,'Seek target out of range');assert.equal(m.state,before);}
 const next=m.begin();assert.equal(remuxAcceptedGeneration(m.state),false);assert.equal(remuxGenerationCurrent(m.state,first.generation),false);assert.equal(remuxGenerationCurrent(m.state,next.generation),true);
 m.send({type:'open'});assert.equal(remuxGenerationCurrent(m.state,next.generation),false);assert.equal(m.state.sourceId,2);m.replay();
});
test('initial packaging gets one distinct retry and startup failures do not consume automatic recovery',()=>{
 const m=machine();m.send({type:'open'});const first=m.begin();
 m.send({type:'packaging-failure',generation:first.generation,failed:true});
 assert.equal(m.send({type:'failure',generation:first.generation,message:'MSE SourceBuffer error',playing:true}).recoveryId,undefined);assert.equal(m.state.recoveryAttempts,0);
 assert.equal(m.send({type:'retry',restartId:first.restartId,mime:'video/mp4'}).retry,true);assert.deepEqual(m.state.rejected,['video/mp4']);
 const second=m.send({type:'begin',restartId:first.restartId});assert.equal(m.state.packagingFailure,false);assert.equal(m.send({type:'retry',restartId:first.restartId,mime:'video/webm'}).retry,false);
 m.send({type:'packaging-failure',generation:second.generation,failed:true});assert.equal(m.send({type:'retry',restartId:first.restartId,mime:'video/mp4'}).retry,false);assert.equal(m.send({type:'retry',restartId:first.restartId,mime:'video/webm'}).retry,false);m.replay();
});
test('one automatic transient recovery is allowed per explicit open and duplicate failures are inert',()=>{
 const m=machine();m.send({type:'open'});const first=m.begin();m.accept(first);
 const command={type:'failure',generation:first.generation,message:'Remux mux worker failed: crashed',playing:true},recovery=m.send(command);
 assert.equal(recovery.recoveryId,1);assert.equal(m.state.recoveryAttempts,1);assert.equal(m.send(command).aborted,true);
 const recovered=m.begin(recovery.recoveryId);m.accept(recovered);m.send({type:'recovered',recoveryId:recovery.recoveryId});
 const second=m.send({...command,generation:recovered.generation});assert.equal(second.report,true);assert.equal(second.recoveryId,undefined);
 m.send({type:'open'});const reopened=m.begin();m.accept(reopened);assert.equal(m.send({...command,generation:reopened.generation}).recoveryId,2);m.replay();
});
test('codec or source failures go directly to fallback without retrying transport',()=>{
 for(const message of ['Source transport: changed ETag','Unsupported MSE packaging for selected codecs','Unexpected remux fragment operation']){
  const m=machine();m.send({type:'open'});const operation=m.begin();m.accept(operation);assert.equal(m.send({type:'failure',generation:operation.generation,message,playing:false}).report,true);assert.equal(m.state.recoveryAttempts,0);
 }
});
test('late generation signals and restart settlement cannot change a replacement',()=>{
 const m=machine();m.send({type:'open'});const first=m.begin(),next=m.begin(),before=m.state;
 for(const command of [{type:'accept',generation:first.generation},{type:'failure',generation:first.generation,message:'worker failed',playing:true},{type:'packaging-failure',generation:first.generation,failed:true},{type:'retire',generation:first.generation},{type:'settle',restartId:first.restartId},{type:'retry',restartId:first.restartId,mime:'video/mp4'}])assert.equal(m.send(command).aborted,true);
 assert.equal(m.state,before);assert.equal(remuxRestartCurrent(m.state,next.restartId),true);assert.equal(m.state.starting,true);m.replay();
});
test('open, seek restart and destroy invalidate delayed recovery; pause remains current intent',()=>{
 for(const event of ['open','restart','destroy']){
  const m=machine();m.send({type:'open'});const first=m.begin();m.accept(first);const recovery=m.send({type:'failure',generation:first.generation,message:'QuotaExceededError',playing:true});
  const operation=m.begin(recovery.recoveryId);m.accept(operation);m.send({type:'intent',playing:false});assert.equal(m.state.playing,false);assert.equal(remuxRecoveryCurrent(m.state,recovery.recoveryId),true);
  m.send(event==='restart'?{type:event,target:7,duration:30}:{type:event});assert.equal(remuxRecoveryCurrent(m.state,recovery.recoveryId),false);assert.equal(m.send({type:'recovered',recoveryId:recovery.recoveryId}).accepted,undefined);m.replay();
 }
});
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function shell(t){
 const calls=[],video={currentTime:5,paused:false,pause(){this.paused=true;calls.push('pause');},play(){this.paused=false;calls.push('play');return Promise.resolve();},removeAttribute(){},load(){},cancelVideoFrameCallback(id){calls.push(['cancel-frame',id]);}};
 const player=new RemuxPlayer(video,{mseOwner:'window',runtime:'jspi'});clearInterval(player.timer);t.after(()=>player.destroy());
 player.start=async function(target,rejected,restartId){const result=this.transitionLifecycle({type:'begin',restartId});if(!result.accepted)throw new DOMException('Superseded','AbortError');this.transitionLifecycle({type:'accept',generation:result.generation});return {generation:result.generation,target};};
 return {player,video,calls};
}
test('actual recovery continuation never plays or reports errors after explicit replacement',async t=>{
 for(const outcome of ['resolve','reject']){
  const {player:p,calls}=shell(t);await p.open({file:{}});p.windowed=true;p.setPlaybackIntent(true);const original=p.start,hold=deferred();let held=true;p.start=async function(...args){const result=await original.apply(this,args);if(held)await hold.promise;return result;};
  const errors=[];p.onError=error=>errors.push(error);p.fail('Remux mux worker failed');await Promise.resolve();held=false;await p.open({file:{}});const generation=p.generation;
  outcome==='resolve'?hold.resolve():hold.reject(Error('retired failure'));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.generation,generation);assert.deepEqual(calls,[]);assert.deepEqual(errors,[]);assert.equal(p.stats.recoveries[0].restored,false);
 }
});
test('pause during a delayed recovery prevents its late play effect',async t=>{
 const {player:p,calls}=shell(t);await p.open({file:{}});p.windowed=true;p.setPlaybackIntent(true);const original=p.start,hold=deferred();p.start=async function(...args){const result=await original.apply(this,args);await hold.promise;return result;};
 p.fail('MSE SourceBuffer error');p.pause();hold.resolve();await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,['pause']);assert.equal(p.stats.recoveries[0].restored,true);assert.equal(p.recoveryPlaying,false);
});
test('retired worker callbacks cannot fail a new generation or repeat a failure',async t=>{
 const {player:p}=shell(t);await p.open({file:{}});const worker={};p.watchWorker(worker,p.generation,'mux');const failures=[];p.onError=error=>failures.push(error);await p.open({file:{}});worker.onerror({message:'old',preventDefault(){throw Error('stale event touched');}});assert.deepEqual(failures,[]);
 const current={};p.watchWorker(current,p.generation,'mux');current.onmessageerror({type:'messageerror'});current.onerror({type:'error'});await new Promise(resolve=>setImmediate(resolve));assert.equal(p.stats.recoveries.length,1);assert.deepEqual(failures,[]);
});
test('worker cleanup detaches retired handles before reentrant replacement and attempts all releases',async t=>{
 const {player:p}=shell(t);await p.open({file:{}});const calls=[],replacement={postMessage(){calls.push('new message');},terminate(){calls.push('new terminate');}};let opening;
 p.worker={postMessage(){calls.push('old close');throw Error('close failed');},terminate(){calls.push('old terminate');}};p.sourceWorker={postMessage(){calls.push('source close');},terminate(){calls.push('source terminate');}};p.sourcePort={close(){calls.push('port close');}};
 const original=p.start;p.start=async function(...args){const result=await original.apply(this,args);this.worker=replacement;this.stats.workers=1;return result;};
 p.cancelWait=()=>{assert.equal(p.worker,null);assert.equal(remuxGenerationCurrent(p.lifecycle,p.generation),false);opening=p.open({file:{}});};
 p.stopWorkers();await opening;assert.equal(p.worker,replacement);assert.equal(p.stats.workers,1);assert.deepEqual(calls,['port close','old close','source close','source terminate','old terminate']);assert.equal(p.stats.cleanupFailures,1);assert.equal(remuxAcceptedGeneration(p.lifecycle),true);
 p.worker=null;
});
test('repeated cleanup counts discarded pending bytes and releases each handle once',async t=>{
 const {player:p}=shell(t);await p.open({file:{}});let releases=0;p.worker={postMessage(){},terminate(){releases++;}};p.pending=[new ArrayBuffer(5)];p.delivery=[new ArrayBuffer(7)];p.stopWorkers();p.stopWorkers();assert.equal(releases,1);assert.equal(p.stats.discardedBytes,12);
});
test('actual prime cleanup cancels its frame once and worker release continues if listener cleanup throws',async t=>{
 for(const throws of [false,true]){
  const {player:p,video}=shell(t);await p.open({file:{}});const cancelled=[];let terminated=0;
  video.addEventListener=()=>{};video.removeEventListener=()=>{if(throws)throw Error('listener cleanup failed');};video.requestVideoFrameCallback=()=>41;video.cancelVideoFrameCallback=id=>cancelled.push(id);
  p.primeVideo=true;p.sb={updating:false,buffered:{length:1,start:()=>1,end:()=>2}};p.sbs=[p.sb,{updating:false,buffered:{length:1,start:()=>1,end:()=>3}}];p.trackBounds={videoEnd:1,audioEnd:2};p.expectedVideoFrame=()=>.98;p.media={readyState:'ended'};p.worker={postMessage(){},terminate(){terminated++;}};
  p.primeLastVideo(p.generation);assert.equal(p.primeFrame,41);p.stopWorkers();p.stopWorkers();assert.deepEqual(cancelled,[41]);assert.equal(terminated,1);assert.equal(p.stats.cleanupFailures??0,throws?1:0);
 }
});
test('actual start aborts reentrant media attachment without retiring replacement resources',async t=>{
 const original=globalThis.MediaSource;
 class Media extends EventTarget {listeners=0;addEventListener(...args){this.listeners++;super.addEventListener(...args);}removeEventListener(...args){this.listeners--;super.removeEventListener(...args);}}
 globalThis.MediaSource=Media;t.after(()=>{globalThis.MediaSource=original;});
 for(const action of ['destroy','open']){
  const attached=[];let replacementRejected;
  const video={currentTime:0,paused:true,pause(){},removeAttribute(){},load(){}};
  const player=new RemuxPlayer(video,{mseOwner:'window',runtime:'jspi',attachMedia(media){attached.push(media);if(attached.length===1){if(action==='destroy')void player.destroy();else replacementRejected=assert.rejects(player.open({file:{}}),{name:'AbortError'});}}});
  t.after(()=>player.destroy());
  await assert.rejects(player.open({file:{}}),{name:'AbortError'});
  assert.equal(attached[0].listeners,0,'retired start never installs its sourceopen listener');
  assert.equal(player.stats.workers,0,'retired attachment cannot allocate workers');
  if(action==='open'){
   assert.equal(attached.length,2);assert.equal(player.media,attached[1]);assert.equal(attached[1].listeners,1);assert.equal(player.starting,true);assert.equal(player.generationCurrent(player.generation),true);
   await player.destroy();await replacementRejected;assert.equal(attached[1].listeners,0);
  }else assert.equal(player.stopped,true);
 }
});
