// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemuxBuffer} from '../../web/generated/internal/machine/remux-buffer.js';
import {initialRemuxLifecycle,transitionRemuxLifecycle} from '../../web/generated/internal/machine/remux-lifecycle.js';
import {initialRemuxSchedule,remuxBuffering,transitionRemuxSchedule,remuxForwardSeconds,remuxStartupCoverage,remuxPlaybackEnded,selectRemuxPumpHead,selectRemuxPump,selectRemuxWindowResume,selectRemuxBufferedSeek} from '../../web/generated/internal/machine/remux-scheduling.js';
import {RemuxPlayer} from '../../web/native-remux-player.js';
const schedule=patch=>Object.freeze({...initialRemuxSchedule(),...patch}),buffer=patch=>Object.freeze({...initialRemuxBuffer(),...patch});
const pumpFacts=patch=>({targetReady:true,playing:true,position:10,paused:false,readyState:4,playbackRate:1,ranges:[[0,12]],laneStarts:[0],audioAdaptation:false,adaptationEnd:undefined,duration:40,...patch});
test('pump head preserves physical readiness, progressive delivery and paused-window precedence',()=>{
 const state=schedule({windowed:true}),facts={current:true,hasSourceBuffer:true,updating:false,mediaState:'ended',targetReady:true,playing:false};
 assert.equal(selectRemuxPumpHead(state,buffer(),facts),'wait');assert.equal(selectRemuxPumpHead(state,buffer({delivery:[{id:1,lane:0,bytes:3}],pull:1}),facts),'delivery');
 for(const blocked of [{current:false},{hasSourceBuffer:false},{updating:true},{mediaState:'closed'}])assert.equal(selectRemuxPumpHead(state,buffer({delivery:[{id:1,lane:0,bytes:3}]}),{...facts,...blocked}),'wait');
 assert.equal(selectRemuxPumpHead(state,buffer({pull:1}),{...facts,playing:true}),'wait');assert.equal(selectRemuxPumpHead(state,buffer(),{...facts,playing:true}),'body');
 assert.equal(selectRemuxPumpHead(schedule(),buffer(),{...facts,playing:true}),'wait');
});
test('byte-pressure eviction retains current RAP and precedes a queued append',()=>{
 const state=schedule({raps:[0,2,4,6,8,10,12],buffering:{backwardSeconds:60,forwardLimitBytes:12}}),pending=[{id:9,lane:0,bytes:2}],segments=[{lane:0,bytes:12,end:12}];
 const result=selectRemuxPump(state,buffer({pending,segments}),pumpFacts({position:10.25}));assert.deepEqual(result.action,{kind:'remove',lane:0,cut:10,allLanes:true});assert.equal(result.metrics.bytes,12);
 const noRap=selectRemuxPump(schedule({...state,raps:[0,12]}),buffer({pending,segments}),pumpFacts({position:10.25}));assert.equal(noRap.action.kind,'pending');
});
test('separate-lane removal retains final half second and aligns pressured audio to video RAP',()=>{
 const state=schedule({windowed:true,trackBounds:{videoEnd:8,audioEnd:30},raps:[0,2,4,6,8,10],lastEvictions:[6],buffering:{backwardSeconds:60,forwardLimitBytes:12}});
 const result=selectRemuxPump(state,buffer({segments:[{bytes:12}]}),pumpFacts({position:10.25,laneStarts:[6,0]}));assert.deepEqual(result.action,{kind:'remove',lane:1,cut:10,allLanes:false});
 const tail=selectRemuxPump(schedule({...state,lastEvictions:[],buffering:{backwardSeconds:0}}),buffer(),pumpFacts({position:29.9,laneStarts:[6,0]}));assert.deepEqual(tail.action,{kind:'remove',lane:1,cut:29.5,allLanes:false});
});
test('pending media append precedes a distant-range failure while empty pending completes EOF',()=>{
 const pending=[{id:1,lane:0,bytes:4}],facts=pumpFacts({position:0,ranges:[[.02,.53],[12.1,12.2]]});assert.equal(selectRemuxPump(schedule(),buffer({pending,eof:true}),facts).action.kind,'pending');
 const gap=selectRemuxPump(schedule(),buffer({pending:[{id:1,lane:0,bytes:0}],eof:true}),facts).action;assert.equal(gap.clearPending,true);assert.equal(gap.next.kind,'fail');assert.match(gap.next.error,/timeline gap/);
 const ended=selectRemuxPump(schedule(),buffer({pending:[],eof:true}),pumpFacts({position:0,ranges:[[0,1]],audioAdaptation:true,adaptationEnd:9})).action;assert.deepEqual(ended.next,{kind:'eof',duration:9});assert.equal(ended.clearPending,true);
});
test('gap skipping is limited to stalled playing output and the existing half-second source budget',()=>{
 for(const [paused,readyState,start,expected] of [[false,2,1.5,true],[false,2,1.50001,false],[true,2,1.2,false],[false,3,1.2,false]]){
  const action=selectRemuxPump(schedule(),buffer(),pumpFacts({position:1,paused,readyState,ranges:[[0,1],[start,3]]})).action;assert.equal(!!action.gap,expected);
 }
});
test('adaptation preparation and protected-GOP failures precede refill admission',()=>{
 const adapted=selectRemuxPump(schedule(),buffer(),pumpFacts({ranges:[[0,10.1]],audioAdaptation:true,adaptationEnd:15})).action;assert.match(adapted.next.error,/preparation budget/);
 const protectedGop=selectRemuxPump(schedule({raps:[0],buffering:{forwardLimitBytes:8}}),buffer({segments:[{bytes:9}]}),pumpFacts({ranges:[[0,10]]})).action;assert.match(protectedGop.next.error,/preserving the current GOP/);
 assert.equal(selectRemuxPump(schedule(),buffer(),pumpFacts({position:0,ranges:[[.001,5.581]],paused:true})).action.next.kind,'wait');
});
test('startup coverage preserves half-second leading tolerance and real final-frame margin',()=>{
 assert.equal(remuxStartupCoverage(0,30,[[.5,1]]),true);assert.equal(remuxStartupCoverage(0,30,[[.50001,1]]),false);assert.equal(remuxStartupCoverage(0,30,[[0,.02]]),false);assert.equal(remuxStartupCoverage(0,30,[[0,.02001]]),true);
 assert.equal(remuxStartupCoverage(29.995,30,[[29.9,30]]),true);assert.equal(remuxStartupCoverage(30,30,[[29.9,30]]),false);
 const state=schedule({windowed:true});assert.equal(selectRemuxPump(state,buffer(),pumpFacts({targetReady:false,position:0,ranges:[[0,.03]]})).action.next.kind,'wait');assert.equal(selectRemuxPump(schedule({...state,primeVideo:true}),buffer(),pumpFacts({targetReady:false,position:0,ranges:[[0,.03]]})).action.next.kind,'pull');
});
test('forward target scales playing rates while metadata preload and slow playback stay bounded',()=>{
 const state=remuxBuffering(schedule(),{preload:'auto',forwardSeconds:5});assert.equal(remuxForwardSeconds(state,false,2),10);assert.equal(remuxForwardSeconds(state,false,.5),5);assert.equal(remuxForwardSeconds(state,true,2),5);
 assert.equal(remuxForwardSeconds(remuxBuffering(state,{preload:'metadata',forwardSeconds:30}),true,4),1);assert.equal(remuxForwardSeconds(schedule(),true,4),5);
});
const seekFacts=patch=>({enabled:true,current:true,starting:false,targetReady:true,accepted:true,hasSourceBuffer:true,updating:false,mediaState:'open',timelineBias:0,ranges:[[0,10]],mediaRanges:[[0,10]],...patch});
test('buffered seek requires accepted live source, retained RAP and both actual coverage intervals',()=>{
 const state=schedule({raps:[0,2,4,6,8]});assert.equal(selectRemuxBufferedSeek(state,5,seekFacts()),true);
 for(const bad of [{current:false},{accepted:false},{starting:true},{updating:true},{mediaState:'closed'},{ranges:[[0,5.25]]},{mediaRanges:[[4.1,10]]},{mediaRanges:[[0,5.25]]}])assert.equal(selectRemuxBufferedSeek(state,5,seekFacts(bad)),false);
 assert.equal(selectRemuxBufferedSeek(schedule({...state,raps:[6,8]}),5,seekFacts()),false);assert.equal(selectRemuxBufferedSeek(schedule({...state,windowed:true,trackBounds:{videoEnd:5,audioEnd:20}}),5,seekFacts()),false);
});
test('window resume clears only internal EOF with new real coverage and preserves terminal source EOF',()=>{
 const state=schedule({windowed:true}),facts={current:true,playing:true,paused:true,starting:false,seeking:false,ended:true,position:9,bufferEnd:10,duration:30,timelineBias:1};
 assert.equal(selectRemuxWindowResume(state,buffer({eof:true}),facts),'seek');assert.equal(selectRemuxWindowResume(state,buffer(),{...facts,bufferEnd:9.05}),'wait');assert.equal(selectRemuxWindowResume(state,buffer(),{...facts,ended:false}),'play');
 assert.equal(selectRemuxWindowResume(state,buffer({eof:true}),{...facts,position:31,bufferEnd:33}),'wait');assert.equal(remuxPlaybackEnded(state,buffer({eof:true,pending:[]}),{...facts,position:31}),false);
});
test('schedule metadata detaches caller input and bounds retained RAP history',()=>{
 const bounds={videoEnd:10,audioEnd:30},policy={preload:'auto',forwardSeconds:9},raps=Array.from({length:300},(_,index)=>index);
 let state=remuxBuffering(schedule({target:24}),policy);state=transitionRemuxSchedule(state,{type:'configure',windowed:true,trackBounds:bounds}).state;state=transitionRemuxSchedule(state,{type:'raps',values:raps}).state;
 bounds.videoEnd=40;policy.forwardSeconds=1;raps[299]=999;assert.equal(state.trackBounds.videoEnd,10);assert.equal(state.presentationFloor,23.5);assert.equal(state.primeVideo,true);assert.equal(state.buffering.forwardSeconds,9);assert.equal(state.raps.length,256);assert.equal(state.raps.at(-1),299);assert.ok(Object.isFrozen(state.raps));
});
test('retired resume finally cannot clear a replacement request and buffering survives restart',()=>{
 let state=initialRemuxLifecycle();const send=command=>{const result=transitionRemuxLifecycle(state,command);state=result.state;return result;},begin=()=>{const restart=send({type:'restart',target:4,duration:40});send({type:'begin',restartId:restart.restartId});};
 send({type:'buffering',policy:{forwardSeconds:15}});begin();const generation=state.generation,first=send({type:'schedule',generation,command:{type:'resume'}}).schedule;begin();const second=send({type:'schedule',generation:state.generation,command:{type:'resume'}}).schedule;
 send({type:'schedule',generation,command:{type:'resumed',id:first.id}});assert.equal(state.schedule.resume,second.id);assert.notEqual(first.id,second.id);assert.equal(state.schedule.buffering.forwardSeconds,15);assert.equal(state.schedule.target,4);
});
function shell(t){
 const requests=[],video={currentTime:1,paused:true,ended:false,seeking:false,readyState:4,playbackRate:1,buffered:{length:1,start:()=>1,end:()=>20},pause(){},removeAttribute(){},load(){},play(){return Promise.resolve();}},p=new RemuxPlayer(video,{mseOwner:'window',runtime:'jspi'});clearInterval(p.timer);t.after(()=>p.destroy());
 const begin=()=>{p.transitionLifecycle({type:'open'});const restart=p.transitionLifecycle({type:'restart',target:0,duration:40});p.transitionLifecycle({type:'begin',restartId:restart.restartId});p.transitionLifecycle({type:'settle',restartId:restart.restartId});p.setBusy(false);};begin();
 p.sbs=[{updating:false,buffered:video.buffered,addEventListener(){},removeEventListener(){}}];p.sb=p.sbs[0];p.media={readyState:'open',endOfStream(){requests.push('eof');}};p.transitionNegotiation({type:'duration',duration:40});p.ranges=()=>[[0,1]];p.worker={postMessage:message=>requests.push(message),terminate(){}};
 return {p,video,requests,begin};
}
test('actual window play stays in the calling stack and old completion preserves a replacement resume',async t=>{
 const {p,video,begin}=shell(t),resolve=[];let calls=0;video.play=()=>{calls++;return new Promise(yes=>resolve.push(yes));};const configure=()=>{p.transitionSchedule({type:'configure',windowed:true,trackBounds:{videoEnd:30,audioEnd:40}});p.setPlaybackIntent(true);};configure();p.resumeWindow();assert.equal(calls,1);const old=p.schedule.resume;
 begin();configure();p.resumeWindow();const current=p.schedule.resume;assert.notEqual(old,current);resolve[0]();await new Promise(yes=>setImmediate(yes));assert.equal(p.schedule.resume,current);resolve[1]();await new Promise(yes=>setImmediate(yes));assert.equal(p.schedule.resume,null);
});
test('actual gap seek reentry retires the old pump before an EOF or refill effect',t=>{
 const {p,video,requests}=shell(t);p.transitionLifecycle({type:'accept',generation:p.generation});video.paused=false;video.readyState=2;p.ranges=()=>[[0,1],[1.2,3]];let position=2;Object.defineProperty(video,'currentTime',{get:()=>position,set:value=>{position=value;void p.destroy();}});p.lifecycle=Object.freeze({...p.lifecycle,buffer:buffer({eof:true})});p.pump();assert.equal(requests.includes('eof'),false);assert.equal(requests.some(request=>request.type==='next'),false);assert.equal(p.stopped,true);
});
for(const variation of ['prepared-budget','paused-preload'])test('actual gap reentry resamples '+variation+' without changing the original coverage clock',t=>{
 const {p,video,requests}=shell(t),errors=[];p.fail=error=>errors.push(error);p.transitionLifecycle({type:'accept',generation:p.generation});video.paused=false;video.readyState=2;
 if(variation==='prepared-budget'){p.audioAdaptation=true;p.remuxStats={adaptation:{sourceEnd:6}};p.ranges=()=>[[0,1],[1.2,3]];}else p.ranges=()=>[[1.2,3]];
 let position=2;Object.defineProperty(video,'currentTime',{get:()=>position,set:value=>{position=value;video.paused=true;p.setPlaybackIntent(false);p.setBuffering({preload:'metadata',forwardSeconds:5});}});
 p.pump();assert.equal(position,2.2);assert.deepEqual(errors,[]);assert.equal(requests.some(request=>request.type==='next'),false);
});
test('actual head observation retirement fences delivery before calling append',t=>{
 const {p}=shell(t);let appended=0;p.append=()=>appended++;p.lifecycle=Object.freeze({...p.lifecycle,buffer:buffer({delivery:[{id:1,lane:0,bytes:3}]})});p.bufferResources.set(1,new ArrayBuffer(3));Object.defineProperty(p.sb,'updating',{get(){void p.destroy();return false;}});
 p.pump();assert.equal(appended,0);assert.equal(p.stopped,true);assert.equal(p.bufferResources.size,0);
});
test('actual gap continuation waits for a reentrant final fragment append before ending MSE',t=>{
 const {p,video,requests}=shell(t);p.transitionLifecycle({type:'accept',generation:p.generation});video.paused=false;video.readyState=2;p.ranges=()=>[[0,1],[1.2,3]];
 let position=2,injected=false,appends=0;Object.defineProperty(video,'currentTime',{get:()=>position,set:value=>{position=value;if(injected)return;injected=true;const pull=p.transitionBuffer({type:'pull'});assert.equal(pull.accepted,true);p.acceptFragment({type:'fragment',id:pull.pullId,buffers:[new ArrayBuffer(3)],more:false});}});
 p.sb.appendBuffer=()=>{appends++;p.sb.updating=true;};p.pump();assert.equal(p.eof,true);assert.equal(p.pending.length,1);assert.equal(requests.includes('eof'),false);
 p.ranges=()=>[[0,4]];p.pump();assert.equal(appends,1);assert.equal(requests.includes('eof'),false);const receipt=p.bufferState.updates[0];p.sb.updating=false;p.updateFinished(p.sb,p.generation,receipt.id);assert.equal(requests.filter(request=>request==='eof').length,1);
});

test('adapted EOF retains the longest buffered lane, not the intersection or audio end',()=>{
 const next=selectRemuxPump(schedule(),buffer({eof:true}),pumpFacts({position:10,ranges:[[0,12.005]],laneEnds:[12.016,12.005],audioAdaptation:true,adaptationEnd:12.011})).action.next;
 assert.deepEqual(next,{kind:'eof',duration:12.016});
});

test('MSE finalizes multiplexed track duration without an unsafe explicit shrink',t=>{
 const {p,requests}=shell(t);p.transitionLifecycle({type:'accept',generation:p.generation});
 p.sb.buffered={length:1,start:()=>1,end:()=>13.005};p.ranges=()=>[[0,12.005]];
 p.audioAdaptation={};p.remuxStats={adaptation:{sourceEnd:12.011}};p.lifecycle=Object.freeze({...p.lifecycle,buffer:buffer({eof:true})});
 let duration=40;Object.defineProperty(p.media,'duration',{get:()=>duration,set:()=>assert.fail('Cannot infer coded-track end from intersected buffered ranges')});
 p.media.endOfStream=()=>{requests.push('eof');duration=13.026;};p.pump();
 assert.ok(requests.includes('eof'));assert.equal(p.duration,13.026-p.timelineBias);
});

test('preparation reports a protected-GOP budget impasse even while paused',()=>{
 const MiB=1024*1024;
 for(const windowed of [false,true])for(const paused of [false,true]){
  const state=schedule({target:10,windowed,raps:[8],buffering:{forwardLimitBytes:8*MiB}}),retained=buffer({segments:[{bytes:10339411}]}),facts=pumpFacts({targetReady:false,playing:!paused,paused,position:0,ranges:[[8,9.5146666667]]});
  const exhausted=selectRemuxPump(state,retained,facts).action.next;
  assert.equal(exhausted.kind,'fail');assert.match(exhausted.error,/cannot prepare the target.*coded-data budget/);
  assert.equal(selectRemuxPump(state,buffer({segments:[{bytes:7*MiB}]}),facts).action.next.kind,'pull');
  assert.equal(selectRemuxPump(state,retained,{...facts,ranges:[[8,10.1]]}).action.next.kind,'wait','covered target can still settle without another pull');
  assert.equal(selectRemuxPump(state,{...retained,pending:[{id:1,lane:0,bytes:1}]},facts).action.kind,'pending','deliver accepted media before deciding failure');
  assert.equal(selectRemuxPump(state,{...retained,eof:true},facts).action.next.kind,'eof','terminal source still drains');
 }
});

test('actual preparation budget failure terminates workers and records the startup cause',t=>{
 const {p,video,requests}=shell(t);video.paused=true;
 p.transitionSchedule({type:'seek',target:10});p.setBuffering({forwardLimitBytes:8*1024*1024});
 p.lifecycle=Object.freeze({...p.lifecycle,targetReady:false,buffer:buffer({segments:[{bytes:10339411}]})});
 p.ranges=()=>[[8,9.5146666667]];let terminated=0;p.worker.terminate=()=>terminated++;
 p.pump();assert.match(p.failureError.message,/cannot prepare the target.*coded-data budget/);
 assert.equal(p.lifecycle.failedGeneration,p.generation);assert.equal(terminated,1);
 assert.equal(requests.some(request=>request.type==='next'),false);
});

test('protected GOP budget grows in bounded steps and rejects stale or forged growth',()=>{
 const MiB=1024*1024;
 let state=remuxBuffering(schedule({target:10}),{forwardLimitBytes:8*MiB,maxForwardLimitBytes:64*MiB});
 const facts=pumpFacts({targetReady:false,paused:true,ranges:[[8,9]],position:10});
 for(const [from,to] of [[8,16],[16,32],[32,64]]){
  const action=selectRemuxPump(state,buffer({segments:[{bytes:from*MiB}]}),facts).action.next;
  assert.deepEqual(action,{kind:'grow-budget',from:from*MiB,to:to*MiB});
  assert.equal(transitionRemuxSchedule(state,{type:'grow-budget',from:from*MiB,to:128*MiB}).accepted,false);
  const previous=state;state=transitionRemuxSchedule(state,{type:'grow-budget',...action}).state;
  assert.equal(state.budgetBytes,to*MiB);assert.equal(previous.budgetBytes,from===8?undefined:from*MiB);
  assert.equal(transitionRemuxSchedule(state,{type:'grow-budget',...action}).accepted,false);
 }
 assert.equal(state.budgetGrowths,3);
 const exhausted=selectRemuxPump(state,buffer({segments:[{bytes:64*MiB}]}),facts).action.next;
 assert.equal(exhausted.kind,'fail');assert.equal(exhausted.code,'REMUX_BUFFER_LIMIT');
 const reset=remuxBuffering(state,{forwardLimitBytes:8*MiB,maxForwardLimitBytes:8*MiB});
 assert.equal(reset.budgetBytes,undefined);assert.equal(reset.budgetGrowths,0);
 assert.equal(selectRemuxPump(reset,buffer({segments:[{bytes:8*MiB}]}),facts).action.next.kind,'fail');
});
test('adaptive budget honors non-power-of-two cap and normal buffering never grows',()=>{
 const MiB=1024*1024,state=remuxBuffering(schedule(),{forwardLimitBytes:32*MiB,maxForwardLimitBytes:40*MiB});
 assert.equal(selectRemuxPump(state,buffer({segments:[{bytes:32*MiB}]}),pumpFacts({ranges:[[0,10]]})).action.next.to,40*MiB);
 assert.equal(selectRemuxPump(state,buffer({segments:[{bytes:32*MiB}]}),pumpFacts({ranges:[[0,15]]})).action.next.kind,'wait');
 assert.equal(selectRemuxPump(state,buffer({segments:[{bytes:32*MiB}],eof:true}),pumpFacts()).action.next.kind,'eof');
 assert.equal(selectRemuxPump(state,buffer({segments:[{bytes:32*MiB}],pending:[{bytes:1}]}),pumpFacts()).action.kind,'pending');
});
test('adaptive runtime grows without worker restart and rejects obsolete generations',t=>{
 const {p,requests}=shell(t),MiB=1024*1024;
 p.setBuffering({forwardLimitBytes:8*MiB,maxForwardLimitBytes:64*MiB});
 p.transitionSchedule({type:'seek',target:10});p.ranges=()=>[[8,9]];
 p.lifecycle=Object.freeze({...p.lifecycle,buffer:buffer({segments:[{bytes:8*MiB}]})});
 const generation=p.generation;p.pump();
 assert.equal(p.bufferingDiagnostics.codedBudgetBytes,16*MiB);assert.equal(p.bufferingDiagnostics.budgetGrowths,1);
 assert.equal(p.generation,generation);assert.equal(requests.length,0);
 p.pump();assert.equal(requests.filter(r=>r.type==='next').length,1);
 assert.equal(p.transitionSchedule({type:'grow-budget',from:16*MiB,to:32*MiB},generation-1).accepted,false);
 const restart=p.transitionLifecycle({type:'restart',target:12,duration:40});
 p.transitionLifecycle({type:'begin',restartId:restart.restartId});
 assert.equal(p.schedule.budgetBytes,16*MiB);assert.equal(p.schedule.budgetGrowths,1);
 p.transitionLifecycle({type:'open',sourceChanged:true});
 assert.equal(p.schedule.budgetBytes,undefined);assert.equal(p.schedule.budgetGrowths,0);
});
test('protected-GOP refill grows before starvation and handles clock rounding at exhaustion',()=>{
 const MiB=1024*1024;
 const state=remuxBuffering(schedule(),{forwardLimitBytes:8*MiB,maxForwardLimitBytes:64*MiB});
 const coded=buffer({segments:[{bytes:8*MiB}]});
 assert.equal(selectRemuxPump(state,coded,pumpFacts({position:2,ranges:[[0,2.517333]]})).action.next.kind,'grow-budget');
 const fixed=remuxBuffering(state,{forwardLimitBytes:8*MiB,maxForwardLimitBytes:8*MiB});
 assert.equal(selectRemuxPump(fixed,coded,pumpFacts({position:2,ranges:[[0,2.517333]]})).action.next.kind,'wait');
 assert.equal(selectRemuxPump(fixed,coded,pumpFacts({position:1.449267,ranges:[[0,1.514666]],readyState:2})).action.next.code,'REMUX_BUFFER_LIMIT');
 assert.equal(selectRemuxPump(fixed,coded,pumpFacts({position:1.449267,ranges:[[0,1.514666]],readyState:3})).action.next.kind,'wait');
 assert.equal(selectRemuxPump(fixed,coded,pumpFacts({position:2.517332,ranges:[[0,2.517333]],readyState:2})).action.next.code,'REMUX_BUFFER_LIMIT');
});
test('budget exhaustion does not reject a playable tail before the next safe RAP',()=>{
 const MiB=1024*1024,state=remuxBuffering(schedule({raps:[0,2]}),{forwardLimitBytes:8*MiB,maxForwardLimitBytes:8*MiB}),coded=buffer({segments:[{bytes:8*MiB}]});
 assert.equal(selectRemuxPump(state,coded,pumpFacts({position:1.99,ranges:[[0,2]],readyState:4})).action.next.kind,'wait');
 assert.equal(selectRemuxPump(state,coded,pumpFacts({position:2,ranges:[[0,2]],readyState:4})).action.kind,'remove');
});
test('gap continuation uses the current byte policy with the captured byte accounting',async()=>{
 const {selectRemuxPumpContinuation}=await import('../../web/generated/internal/machine/remux-scheduling.js');
 const facts=pumpFacts({position:10,ranges:[[0,10]],readyState:2});
 const context={now:10,ranges:facts.ranges,bytes:9,byteLimit:8};
 const raised=remuxBuffering(schedule(),{forwardLimitBytes:16});
 assert.equal(selectRemuxPumpContinuation(raised,buffer(),facts,context).kind,'pull');
 const lowered=remuxBuffering(schedule(),{forwardLimitBytes:8});
 assert.equal(selectRemuxPumpContinuation(lowered,buffer(),facts,{...context,byteLimit:16}).code,'REMUX_BUFFER_LIMIT');
});
test('actual gap seek can raise a fixed budget without the old pump failing',t=>{
 const {p,video,requests}=shell(t),errors=[],MiB=1024*1024;
 p.transitionLifecycle({type:'accept',generation:p.generation});video.paused=false;video.readyState=2;
 p.setBuffering({forwardLimitBytes:8*MiB});p.ranges=()=>[[0,1],[1.2,1.4]];
 p.lifecycle=Object.freeze({...p.lifecycle,buffer:buffer({segments:[{bytes:9*MiB}]})});p.fail=error=>errors.push(error);
 let position=2;Object.defineProperty(video,'currentTime',{get:()=>position,set:value=>{position=value;p.setBuffering({forwardLimitBytes:16*MiB});}});
 p.pump();assert.deepEqual(errors,[]);assert.equal(requests.filter(r=>r.type==='next').length,1);
});
