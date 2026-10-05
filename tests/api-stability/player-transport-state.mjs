// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {PlayerError} from '../../web/generated/internal/errors.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {Player} from '../../web/generated/unified-player.js';
import {StartupEvidenceTimeout} from '../../web/generated/internal/runtime-capability.js';
function model({mode='native',paused=false,automatic=true,providerPreferences=[]}={}){
 let state=initialPlayerControl();
 const send=input=>{const before=JSON.stringify(state),old=state,result=transitionPlayer(state,input);assert.equal(JSON.stringify(old),before);state=result.state;return result;};
 send({type:'routing.deployment',epoch:0,operation:null,change:{kind:'configure',selection:{policy:'off',runtime:'pthread',isolated:true,jspi:false,providerPreferences}}});
 const attempt=send({type:'source.begin',operationEpoch:0,mode,preserve:false,planId:'fixture'}).id;
 for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])send({type,attempt});
 send({type:'source.accept',attempt,operationEpoch:0,settings:{...state.settings,pause:paused},planMatches:true});send({type:'source.finished',attempt});send({type:'source.configure',automatic});
 const operation=send({type:'operation.admit',kind:'seeking'}).id;send({type:'operation.start',id:operation});
 return {get state(){return state;},send,operation,play(extra={}){const intent=send({type:'play.request'}).id;return send({type:'transport.play.begin',intent,position:42,trialSame:true,trialVerified:false,local:true,backendPlan:'direct',nativeRemux:'auto',fallbackAvailable:true,...extra});},seek(extra={}){const intent=send({type:'seek.request',latest:false}).id;return send({type:'transport.seek.begin',intent,target:75,previous:42,seekable:null,...extra});}};
}
test('bounded play trial falls back, restores original position and retries with ordinary budget',()=>{
 const m=model(),begin=m.play(),id=begin.id;assert.deepEqual(begin.transportEffect,{kind:'verify',budget:1500});
 let d=m.send({type:'transport.play.failed',id,compatible:false,inconclusive:true,streaming:false});
 assert.deepEqual(d.transportEffect,{kind:'fallback',start:0,requirements:{nativeRemux:'always'},target:42});
 d=m.send({type:'transport.play.fallback-failed',id,compatible:false,code:'ASSET_LOAD_FAILED'});assert.deepEqual(d.transportEffect,{kind:'restore',target:42});
 assert.equal(m.send({type:'transport.complete',id}).accepted,false);
 assert.deepEqual(m.send({type:'transport.play.restored',id}).transportEffect,{kind:'verify'});
 assert.equal(m.send({type:'transport.complete',id}).accepted,true);assert.equal(m.send({type:'transport.complete',id}).accepted,false);
});
test('pause supersedes delayed fallback and restoration without restarting playback',()=>{
 for(const phase of ['selecting','restoring']){
  const m=model(),id=m.play().id;m.send({type:'transport.play.failed',id,compatible:false,inconclusive:true,streaming:false});
  if(phase==='restoring')m.send({type:'transport.play.fallback-failed',id,compatible:false,code:'ASSET_LOAD_FAILED'});
  m.send({type:'play.retire'});
  const d=m.send(phase==='selecting'?{type:'transport.play.fallback-failed',id,compatible:false,code:'ASSET_LOAD_FAILED'}:{type:'transport.play.restored',id});
  assert.deepEqual(d.transportEffect,{kind:'ignore'});assert.equal(m.state.transport.pending.phase,'finished');
 }
});
test('pinned playback pauses on failure and never enters fallback',()=>{
 const m=model({automatic:false}),begin=m.play();assert.equal(begin.transportEffect.budget,undefined);
 const d=m.send({type:'transport.play.failed',id:begin.id,compatible:true,inconclusive:false,streaming:false});
 assert.deepEqual(d.transportEffect,{kind:'pause'});assert.equal(m.state.settings.pause,true);
});
const softwareFirst=[{capability:'media.play.complete',providers:['mpv-software','mpv-hybrid']}];
test('provider ordered software can fall back on play, seek and failed restoration',()=>{
 for(const action of ['play','seek','restore']){
  const m=model({mode:'software',providerPreferences:softwareFirst}),id=action==='play'?m.play({backendPlan:'software'}).id:m.seek().id;
  if(action==='restore')m.send({type:'transport.seek.failed',id,boundary:true,terminal:false,code:'INVALID_ARGUMENT',invalidPosition:false,streaming:false});
  const result=m.send(action==='play'?{type:'transport.play.failed',id,compatible:true,inconclusive:false,streaming:false}:action==='seek'?{type:'transport.seek.failed',id,boundary:false,terminal:false,code:'DECODE_FAILED',invalidPosition:false,streaming:false}:{type:'transport.seek.restore-failed',id,code:'DECODE_FAILED'});
  assert.equal(result.transportEffect.kind,'fallback');assert.equal(result.transportEffect.start,1);
 }
 const m=model({mode:'software'}),id=m.seek().id;
 assert.equal(m.send({type:'transport.seek.failed',id,boundary:false,terminal:false,code:'DECODE_FAILED',invalidPosition:false,streaming:false}).transportEffect.kind,'reject');
});
test('provider preferences preserve pinned and terminal seek rejection',()=>{
 for(const facts of [{automatic:false,code:'DECODE_FAILED'},{automatic:true,code:'SOURCE_PERMISSION'},{automatic:true,code:'ABORTED'}]){
  const m=model({mode:'software',providerPreferences:softwareFirst,automatic:facts.automatic}),id=m.seek().id;
  assert.equal(m.send({type:'transport.seek.failed',id,boundary:false,terminal:false,invalidPosition:false,streaming:false,code:facts.code}).transportEffect.kind,'reject');
 }
});
test('seek admission rejects stale chapters and excluded ranges before issuing work',()=>{
 const m=model();assert.equal(m.seek({sourceId:0}).reason,'invalid');
 m.send({type:'preferences.change',value:{playbackRange:{start:10,end:80}}});
 assert.equal(m.seek({target:5}).reason,'invalid');assert.equal(m.seek({target:50,seekable:[{start:60,end:90}]}).reason,'invalid');
 assert.equal(m.state.transport.pending,null);
});
test('presentation-boundary seek restores prior position and prior playing intent',()=>{
 for(const paused of [false,true]){
  const m=model({paused}),id=m.seek().id;
  const d=m.send({type:'transport.seek.failed',id,boundary:true,terminal:false,code:'INVALID_ARGUMENT',invalidPosition:false,streaming:false});assert.deepEqual(d.transportEffect,{kind:'restore',target:42});
  assert.equal(m.send({type:'transport.complete',id}).accepted,false);
  assert.deepEqual(m.send({type:'transport.seek.restored',id}).transportEffect,{kind:paused?'reject':'resume'});
  if(!paused)assert.deepEqual(m.send({type:'transport.seek.resumed',id}).transportEffect,{kind:'reject'});
 }
});
test('failed restoration uses next automatic route but terminal seeks and canceled work cannot fall back',()=>{
 const m=model({mode:'hybrid'}),id=m.seek().id;
 m.send({type:'transport.seek.failed',id,boundary:true,terminal:false,code:'INVALID_ARGUMENT',invalidPosition:false,streaming:false});
 assert.deepEqual(m.send({type:'transport.seek.restore-failed',id}).transportEffect,{kind:'fallback',target:75,start:2,requirements:{}});
 m.send({type:'operation.cancel',id:m.operation});assert.equal(m.state.transport.pending,null);assert.equal(m.send({type:'transport.complete',id}).accepted,false);
 const terminal=model(),tid=terminal.seek().id;assert.deepEqual(terminal.send({type:'transport.seek.failed',id:tid,boundary:false,terminal:true,code:'SOURCE_PERMISSION',invalidPosition:false,streaming:false}).transportEffect,{kind:'reject'});
});
function fixture(t,{automatic=true,mode='native',providerPreferences=[]}={}){
 const p=unitPlayer(),m=model({automatic,mode,providerPreferences});m.send({type:'operation.finish',id:m.operation});m.send({type:'operation.release',id:m.operation});
 const deployment={...p.control.routing.deployment,selection:{...p.control.routing.deployment.selection,providerPreferences}};p.control={...m.state,routing:{...m.state.routing,deployment}};
 const calls=[],backend={properties:new Map([['time-pos',42]]),diagnostics:{plan:'direct'},play:async()=>{calls.push('play');},pause:async()=>{calls.push('pause');},seek:async target=>{calls.push(['seek',target]);},destroy:async()=>{}};
 p.current={backend,surface:{remove(){}}};p.source={kind:'local',file:new ArrayBuffer(1)};p.evidence=()=>({});p.acceptEvidence=()=>{};p.updateEvidence=()=>{};p.planDecisions=[{id:'native-remux',eligible:true}];p.settled=async()=>{};
 Object.defineProperty(p,'state',{get:()=>({seekable:null,sourceId:p.control.source.serial})});
 t.after(()=>p.destroy());return {p,backend,calls};
}
test('public play preserves immediate activation and executes bounded retry restoration',async t=>{
 const {p,calls}=fixture(t);let verifies=0,selections=0;
 p.playNativeVerified=async(_backend,_playing,budget)=>{verifies++;calls.push(['verify',budget]);if(verifies===1)throw new StartupEvidenceTimeout('output',1500);};
 p.select=async(...args)=>{selections++;assert.equal(args[5],42);assert.deepEqual(args[8],{nativeRemux:'always'});throw new PlayerError('ASSET_LOAD_FAILED','fixture missing');};
 const playing=p.play();assert.equal(calls[0],'play');await playing;
 assert.equal(selections,1);assert.deepEqual(calls,[ 'play',['verify',1500],['seek',42],['verify',undefined]]);assert.equal(p.control.transport.pending,null);
});
test('public seek fallback preserves requested position and terminal seek never selects',async t=>{
 const {p,backend}=fixture(t);const selected=[];p.select=async(...args)=>{selected.push(args);};backend.seek=async()=>{throw new PlayerError('DECODE_FAILED','seek decoder failed');};
 await p.seek(75);assert.equal(selected.length,1);assert.equal(selected[0][5],75);assert.equal(p.control.transport.pending,null);
 backend.seek=async()=>{throw new PlayerError('SOURCE_PERMISSION','denied');};await assert.rejects(p.seek(80),error=>error.code==='SOURCE_PERMISSION');assert.equal(selected.length,1);
});
test('public software play and seek use an available preferred successor',async t=>{
 for(const action of ['play','seek']){
  const {p,backend}=fixture(t,{mode:'software',providerPreferences:softwareFirst});const selected=[];
  backend.diagnostics={plan:'software'};backend[action]=async()=>{throw new PlayerError('DECODE_FAILED','recoverable software failure');};
  p.select=async(...args)=>{selected.push(args);};
  if(action==='play')await p.play();else await p.seek(75);
  assert.equal(selected.length,1);assert.equal(selected[0][4],1);assert.equal(selected[0][5],action==='play'?42:75);
  assert.equal(p.control.transport.pending,null);
 }
});

function boundaryFixture(t){
 const fixtureValue=fixture(t,{mode:'hybrid'}),{p,backend,calls}=fixtureValue;
 backend.diagnostics={rendered:true,decoder:'webcodecs',presentation:{position:42}};
 backend.properties.set('track-list',[{type:'video',codec:'h264',selected:true}]);
 backend.seekBoundary=target=>target===75?50:undefined;backend.confirmSeek=async()=>true;
 backend.seek=async target=>{calls.push(['seek',target]);backend.properties.set('time-pos',target);backend.diagnostics.presentation.position=target;};
 p.settled=Player.prototype.settled.bind(p);p.select=async()=>assert.fail('restored boundary must not select another source');
 return fixtureValue;
}
test('public boundary seek restores the accepted position and resumes before rejecting unavailable target',async t=>{
 const {p,calls}=boundaryFixture(t);
 await assert.rejects(p.seek(75),error=>error.code==='INVALID_ARGUMENT'&&/audiovisual presentation end/.test(error.message));
 assert.deepEqual(calls,[['seek',75],['seek',42],'play']);assert.equal(p.settings.pause,false);assert.equal(p.control.transport.pending,null);
});
test('close during boundary restoration suppresses resume and fallback after late completion',async t=>{
 const {p,backend,calls}=boundaryFixture(t);let began,finish;const restoring=new Promise(resolve=>began=resolve),seek=backend.seek;
 backend.seek=async target=>{await seek(target);if(target===42){began();await new Promise(resolve=>finish=resolve);}};
 const seeking=p.seek(75),rejected=assert.rejects(seeking,error=>error.code==='ABORTED');await restoring;
 const closing=p.close();finish();await Promise.all([closing,rejected]);
 assert.deepEqual(calls,[['seek',75],['seek',42]]);assert.equal(p.control.transport.pending,null);assert.equal(p.source,undefined);
});
test('failed boundary restoration selects the next route with original requested target',async t=>{
 const {p,backend,calls}=boundaryFixture(t),seek=backend.seek;let selected;
 backend.seek=async target=>{if(target===42)throw new PlayerError('DECODE_FAILED','restore unavailable');await seek(target);};
 p.select=async(...args)=>{selected=args;};await p.seek(75);
 assert.equal(selected[4],2);assert.equal(selected[5],75);assert.match(selected[6].at(-1).reason,/accepted position recovery failed: restore unavailable/);
 assert.deepEqual(calls,[['seek',75]]);assert.equal(p.control.transport.pending,null);
});


test('only selecting transport work may survive accepted-session replacement',()=>{
 for(const phase of ['seeking','restoring','selecting']){
  const m=model({mode:'hybrid'}),id=m.seek().id;
  if(phase!=='seeking')m.send({type:'transport.seek.failed',id,boundary:phase==='restoring',terminal:false,code:'DECODE_FAILED',invalidPosition:false,streaming:false});
  const attempt=m.send({type:'source.begin',operationEpoch:m.state.operations.epoch,mode:'software',preserve:true,planId:'software'}).id;
  for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])m.send({type,attempt});
  m.send({type:'source.accept',attempt,operationEpoch:m.state.operations.epoch,settings:m.state.settings,planMatches:true});m.send({type:'source.finished',attempt});
  if(phase==='selecting'){assert.equal(m.state.transport.pending.id,id);assert.equal(m.send({type:'transport.complete',id}).accepted,true);}
  else {assert.equal(m.state.transport.pending,null);assert.equal(m.send({type:'transport.seek.restored',id}).accepted,false);}
 }
});
test('terminal source and autoplay restoration failures never select another route',()=>{
 for(const facts of [{code:'SOURCE_PERMISSION'},{code:'SOURCE_CHANGED'},{code:'ABORTED'},{code:'AUTOPLAY_BLOCKED'},{terminal:true,code:'DECODE_FAILED'}]){
  const m=model({mode:'hybrid'}),id=m.seek().id;
  m.send({type:'transport.seek.failed',id,boundary:true,terminal:false,code:'INVALID_ARGUMENT',invalidPosition:false,streaming:false});
  assert.deepEqual(m.send({type:'transport.seek.restore-failed',id,...facts}).transportEffect,{kind:'reject'});
 }
});
for(const code of ['SOURCE_PERMISSION','SOURCE_CHANGED','ABORTED','AUTOPLAY_BLOCKED'])test(`public boundary restoration ${code} rejection does not fall back`,async t=>{
 const {p,backend,calls}=boundaryFixture(t),seek=backend.seek;
 backend.seek=async target=>{if(target===42)throw new PlayerError(code,'fixture terminal restoration');await seek(target);};
 await assert.rejects(p.seek(75),error=>error.code===code);
 assert.deepEqual(calls,[['seek',75]]);assert.equal(p.control.transport.pending,null);
});
test('public boundary restoration preserves legacy terminal transport message classification',async t=>{
 const {p,backend}=boundaryFixture(t),seek=backend.seek;
 backend.seek=async target=>{if(target===42)throw new Error('Source transport: identity check failed');await seek(target);};
 await assert.rejects(p.seek(75),/Source transport: identity check failed/);assert.equal(p.control.transport.pending,null);
});


test('Pause retires compensating resume while keeping seek restoration authoritative',()=>{
 const m=model({mode:'hybrid'}),id=m.seek().id;
 m.send({type:'transport.seek.failed',id,boundary:true,terminal:false,code:'INVALID_ARGUMENT',invalidPosition:false,streaming:false});
 m.send({type:'play.retire'});assert.equal(m.state.transport.pending.phase,'restoring');assert.equal(m.state.settings.pause,false);
 assert.deepEqual(m.send({type:'transport.seek.restored',id}).transportEffect,{kind:'reject'});
});
test('Pause during boundary restoration suppresses transient play before the queued pause',async t=>{
 const {p,backend,calls}=boundaryFixture(t);let began,finish;const restoring=new Promise(resolve=>began=resolve),seek=backend.seek;
 backend.seek=async target=>{await seek(target);if(target===42){began();await new Promise(resolve=>finish=resolve);}};
 const seeking=p.seek(75),rejected=assert.rejects(seeking,error=>error.code==='INVALID_ARGUMENT');await restoring;
 const paused=p.pause();finish();await Promise.all([paused,rejected]);
 assert.deepEqual(calls,[['seek',75],['seek',42],'pause']);assert.equal(p.settings.pause,true);assert.equal(p.control.transport.pending,null);
});


test('reentrant source replacement cannot reuse prior-session immediate Play or verified evidence',async t=>{
 const {p,backend,calls}=fixture(t),next={...backend,properties:new Map([['time-pos',0]]),play:async()=>{calls.push('next-play');}};
 p.evidence=()=>({outputVerified:true});
 let replacement;
 backend.play=()=>{
  calls.push('old-play');
  replacement=p.enqueue(async()=>{
   const attempt=p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode:'native',preserve:false,planId:'native-direct'}).id;
   for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])p.dispatchControl({type,attempt});
   p.dispatchControl({type:'source.accept',attempt,operationEpoch:p.operationEpoch,settings:p.settings,planMatches:true});p.dispatchControl({type:'source.finished',attempt});
   p.current={backend:next,surface:{remove(){}}};p.source={kind:'local',file:new ArrayBuffer(2)};
  },'opening');
  return Promise.resolve();
 };
 p.playNativeVerified=async(observed,playing,budget)=>{assert.equal(observed,next);await playing;calls.push(['verify-next',budget]);};
 await p.play();await replacement;
 assert.deepEqual(calls,['old-play','next-play',['verify-next',1500]]);assert.equal(p.control.transport.pending,null);
});

// Recovery remains symptom-driven: healthy completion never selects a fallback.
test('Firefox local direct resumes use a short trial without changing initial route',()=>{
 for(const trialVerified of [false,true]){
  const m=model(),begin=m.play({firefox:true,trialVerified});
  assert.equal(begin.transportEffect.budget,500);
  assert.equal(m.send({type:'transport.complete',id:begin.id}).transportEffect,undefined);
 }
 const m=model(),begin=m.play({firefox:true,trialVerified:true});
 const failed=m.send({type:'transport.play.failed',id:begin.id,compatible:false,inconclusive:true,streaming:false});
 assert.equal(failed.transportEffect.kind,'fallback');assert.deepEqual(failed.transportEffect.requirements,{nativeRemux:'always'});
});
test('Firefox fast resume excludes remote, pinned, disabled-remux and alternative routes',()=>{
 for(const extra of [{firefox:false},{local:false},{nativeRemux:'never'},{fallbackAvailable:false},{backendPlan:'remux'},{backendPlan:'hybrid'}]){
  const m=model(),begin=m.play({firefox:true,trialVerified:true,...extra});assert.equal(begin.transportEffect.budget,undefined,JSON.stringify(extra));
 }
 const m=model({automatic:false});assert.equal(m.play({firefox:true,trialVerified:true}).transportEffect.budget,undefined);
});
test('Firefox quick recovery remains cancelable by Pause before selection',()=>{
 const m=model(),begin=m.play({firefox:true,trialVerified:true});m.send({type:'play.retire'});
 assert.equal(m.send({type:'transport.play.failed',id:begin.id,compatible:false,inconclusive:true,streaming:false}).transportEffect.kind,'ignore');
});
test('public Firefox resume passes the short budget and retains existing remux recovery',async t=>{
 const {p}=fixture(t);p.root.ownerDocument.defaultView={navigator:{userAgent:'Mozilla/5.0 Gecko/20100101 Firefox/157.0'}};
 p.evidence=()=>({outputVerified:true});let selected=0;
 p.playNativeVerified=async(_backend,_playing,budget)=>{assert.equal(budget,500);throw new StartupEvidenceTimeout('output',budget);};
 p.select=async(...args)=>{selected++;assert.deepEqual(args[8],{nativeRemux:'always'});};
 await p.play();assert.equal(selected,1);assert.equal(p.control.transport.pending,null);
});
