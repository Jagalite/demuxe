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
test('remote native output uncertainty recovers without declaring codec incompatibility',async t=>{
 const {p}=fixture(t);p.source={kind:'remote',url:'https://example.test/movie.mkv',options:{}};
 const evidence=[],selected=[];p.updateEvidence=(...args)=>evidence.push(args);
 p.playNativeVerified=async()=>{throw new StartupEvidenceTimeout('output',2000);};
 p.select=async(...args)=>selected.push(args);
 await p.play();assert.equal(selected.length,1);assert.equal(selected[0][5],42);
 assert.deepEqual(selected[0][8],{nativeRemux:'always'});
 assert.equal(p.control.transport.pending,null);
 assert.ok(evidence.every(args=>args[1]==='prepared'&&args[4]===undefined));
});
test('remote pinned or terminal play failures never enter automatic fallback',()=>{
 for(const facts of [{automatic:false,inconclusive:true},{automatic:true,inconclusive:false}]){
  const m=model({automatic:facts.automatic}),begin=m.play({local:false});
  assert.equal(m.send({type:'transport.play.failed',id:begin.id,compatible:false,inconclusive:facts.inconclusive,streaming:false}).transportEffect.kind,'pause');
 }
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
 assert.deepEqual(calls,['pause',['seek',75],['seek',42],'play']);assert.equal(p.settings.pause,false);assert.equal(p.control.transport.pending,null);
});
test('close during boundary restoration suppresses resume and fallback after late completion',async t=>{
 const {p,backend,calls}=boundaryFixture(t);let began,finish;const restoring=new Promise(resolve=>began=resolve),seek=backend.seek;
 backend.seek=async target=>{await seek(target);if(target===42){began();await new Promise(resolve=>finish=resolve);}};
 const seeking=p.seek(75),rejected=assert.rejects(seeking,error=>error.code==='ABORTED');await restoring;
 const closing=p.close();finish();await Promise.all([closing,rejected]);
 assert.deepEqual(calls,['pause',['seek',75],['seek',42]]);assert.equal(p.control.transport.pending,null);assert.equal(p.source,undefined);
});
test('failed boundary restoration selects the next route with original requested target',async t=>{
 const {p,backend,calls}=boundaryFixture(t),seek=backend.seek;let selected;
 backend.seek=async target=>{if(target===42)throw new PlayerError('DECODE_FAILED','restore unavailable');await seek(target);};
 p.select=async(...args)=>{selected=args;};await p.seek(75);
 assert.equal(selected[4],2);assert.equal(selected[5],75);assert.match(selected[6].at(-1).reason,/accepted position recovery failed: restore unavailable/);
 assert.deepEqual(calls,['pause',['seek',75]]);assert.equal(p.control.transport.pending,null);
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
 assert.deepEqual(calls,['pause',['seek',75]]);assert.equal(p.control.transport.pending,null);
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
 assert.deepEqual(calls,['pause',['seek',75],['seek',42],'pause']);assert.equal(p.settings.pause,true);assert.equal(p.control.transport.pending,null);
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

test('Wasm moving seeks hold transport and only resume a current playing intent',()=>{
 for(const mode of ['hybrid','software'])for(const paused of [false,true])for(const pauseDuringSeek of [false,true]){
  const m=model({mode,paused}),begin=m.seek(),id=begin.id;
  assert.equal(begin.transportEffect.kind,paused?'seek':'hold-seek');
  if(pauseDuringSeek)m.send({type:'play.retire'});
  const verified=m.send({type:'transport.seek.verified',id});assert.equal(verified.accepted,true);
  assert.equal(verified.transportEffect?.kind,!paused&&!pauseDuringSeek?'resume':undefined);
  if(verified.transportEffect){assert.equal(m.send({type:'transport.complete',id}).accepted,true);}
  assert.equal(m.state.transport.pending.phase,'finished');
 }
});
test('retired seek verification cannot resume a replacement source or cancelled operation',()=>{
 for(const retirement of ['operation.cancel','operation.retire']){
  const m=model({mode:'hybrid'}),id=m.seek().id;
  m.send(retirement==='operation.cancel'?{type:retirement,id:m.operation}:{type:retirement,terminal:false});
  assert.equal(m.send({type:'transport.seek.verified',id}).accepted,false);
 }
});

test('delayed seek confirmation holds playback and Pause suppresses its resume',async t=>{
 for(const mode of ['hybrid','software'])for(const pauseDuringSeek of [false,true]){
  const {p,backend,calls}=fixture(t,{mode});let presented,release;
  const ready=new Promise(r=>presented=r);
  p.settled=async()=>{assert.equal(calls[0],'pause');presented();await new Promise(r=>release=r);};
  const seeking=p.seek(4);await ready;const paused=pauseDuringSeek?p.pause():undefined;
  release();await seeking;await paused;
  assert.deepEqual(calls,['pause',['seek',4],pauseDuringSeek?'pause':'play']);
 }
});

test('failed seek resume is contained by a pause and does not trigger route fallback',async t=>{
 const {p,backend,calls}=fixture(t,{mode:'hybrid'});backend.play=async()=>{calls.push('play');throw Error('resume failed');};
 p.select=async()=>assert.fail('resume failure is not a seek decoder failure');
 await assert.rejects(p.seek(4),/resume failed/);assert.deepEqual(calls,['pause',['seek',4],'play','pause']);assert.equal(p.settings.pause,true);
});

test('failed held restoration reports paused playback',async t=>{
 const {p,backend}=boundaryFixture(t),seek=backend.seek;
 backend.seek=async target=>{if(target===42)throw new PlayerError('SOURCE_PERMISSION','restore denied');await seek(target);};
 await assert.rejects(p.seek(75),error=>error.code==='SOURCE_PERMISSION');
 assert.equal(p.settings.pause,true);
});
test('failed boundary resume pauses without selecting a new route',async t=>{
 const {p,backend,calls}=boundaryFixture(t);
 backend.play=async()=>{calls.push('play');throw Error('boundary resume failed');};
 await assert.rejects(p.seek(75),/boundary resume failed/);
 assert.deepEqual(calls,['pause',['seek',75],['seek',42],'play','pause']);
 assert.equal(p.settings.pause,true);
});

for(const mode of ['hybrid','software'])test(`aborting a held ${mode} seek reports the physical paused state`,async t=>{
 const {p,backend}=fixture(t,{mode});let started,release;
 const ready=new Promise(r=>started=r),controller=new AbortController();
 backend.properties.set('pause',false);
 backend.pause=async()=>backend.properties.set('pause',true);
 backend.play=async()=>backend.properties.set('pause',false);
 p.settled=async()=>{started();await new Promise(r=>release=r);};
 const pending=p.seek(4,{signal:controller.signal}),rejected=assert.rejects(pending,e=>e.code==='ABORTED');
 await ready;controller.abort();release();await rejected;
 assert.equal(backend.properties.get('pause'),true);assert.equal(p.settings.pause,true);
 assert.equal(p.control.transport.pending,null);
});
test('a latest seek successor retains playing intent through predecessor cancellation',async t=>{
 const {p,calls}=fixture(t,{mode:'hybrid'});let started,release,count=0;
 const ready=new Promise(r=>started=r);
 p.settled=async()=>{if(count++===0){started();await new Promise(r=>release=r);}};
 const first=p.seek(4,{policy:'latest'}),rejected=assert.rejects(first,e=>e.code==='ABORTED');await ready;
 const successor=p.seek(6,{policy:'latest'});release();await Promise.all([rejected,successor]);
 assert.equal(p.settings.pause,false);assert.deepEqual(calls,['pause',['seek',4],'pause',['seek',6],'play']);
});
test('cancelling a native seek does not change playing intent',()=>{
 const m=model(),id=m.seek().id;m.send({type:'operation.cancel',id:m.operation});
 assert.equal(m.state.settings.pause,false);assert.equal(m.state.transport.pending,null);
});

for(const action of ['abort-successor','pause','replace-successor'])test(`cancelled hold handles ${action} without reviving retired intent`,async t=>{
 const {p,calls}=fixture(t,{mode:'hybrid'});let started,release,count=0;
 const ready=new Promise(r=>started=r),controller=new AbortController();
 p.settled=async()=>{if(count++===0){started();await new Promise(r=>release=r);}};
 const first=p.seek(4,{policy:'latest'}),rejected=assert.rejects(first,e=>e.code==='ABORTED');await ready;
 const second=p.seek(6,{policy:'latest',signal:controller.signal});
 const secondResult=action==='pause'?second:assert.rejects(second,e=>e.code==='ABORTED');
 let last;
 if(action==='abort-successor')controller.abort();
 if(action==='pause')last=p.pause();
 if(action==='replace-successor')last=p.seek(8,{policy:'latest'});
 release();await Promise.all([rejected,secondResult,last]);
 assert.equal(p.settings.pause,action!=='replace-successor');
 assert.equal(calls.includes('play'),action==='replace-successor');
 assert.equal(p.control.transport.resumeSeek,undefined);
});

test('a replacement seek restores playing intent after boundary recovery',async t=>{
 const {p,backend,calls}=boundaryFixture(t);let started,release,count=0;
 const ready=new Promise(r=>started=r),settled=p.settled;
 p.settled=async(...args)=>{await settled(...args);if(count++===0){started();await new Promise(r=>release=r);}};
 const first=p.seek(4,{policy:'latest'}),rejected=assert.rejects(first,e=>e.code==='ABORTED');await ready;
 const second=p.seek(75,{policy:'latest'}),boundary=assert.rejects(second,e=>e.code==='INVALID_ARGUMENT');
 release();await Promise.all([rejected,boundary]);
 assert.equal(p.settings.pause,false);assert.equal(backend.properties.get('time-pos'),4);
 assert.deepEqual(calls,['pause',['seek',4],'pause',['seek',75],['seek',4],'play']);
});

test('replacement seek fallback retains the inherited playing intent',async t=>{
 const {p,backend}=fixture(t,{mode:'hybrid'});let started,release,selected;
 const ready=new Promise(r=>started=r),seek=backend.seek;
 p.settled=async()=>{started();await new Promise(r=>release=r);};
 backend.seek=async target=>{if(target===6)throw new PlayerError('DECODE_FAILED','fixture recovery');await seek(target);};
 p.select=async(...args)=>{selected=args;};
 const first=p.seek(4,{policy:'latest'}),rejected=assert.rejects(first,e=>e.code==='ABORTED');await ready;
 const second=p.seek(6,{policy:'latest'});release();await Promise.all([rejected,second]);
 assert.equal(selected[1].pause,false);assert.equal(selected[5],6);
});
 test('queued seek preserves latest successor resume',async t=>{
 const {p,calls}=fixture(t,{mode:'hybrid'});let started,release,count=0;
 const ready=new Promise(r=>started=r);
 p.settled=async()=>{if(count++===0){started();await new Promise(r=>release=r);}};
 const first=p.seek(4,{policy:'latest'}),rejected=assert.rejects(first,e=>e.code==='ABORTED');await ready;
 const queued=p.seek(5);
 const successor=p.seek(6,{policy:'latest'});release();await Promise.all([rejected,queued,successor]);
 assert.deepEqual(calls,['pause',['seek',4],['seek',5],'pause',['seek',6],'play']);
 assert.equal(p.settings.pause,false);
 });
 test('cancel held seek during fallback selection reports pause',async t=>{
 const {p,backend}=fixture(t,{mode:'hybrid'});let started,release;
 const ready=new Promise(r=>started=r),controller=new AbortController();
 backend.properties.set('pause',false);
 backend.pause=async()=>backend.properties.set('pause',true);
 backend.seek=async()=>{throw new PlayerError('DECODE_FAILED','fixture recovery');};
 p.select=async()=>{started();await new Promise(r=>release=r);p.assertOperation();};
 const pending=p.seek(4,{signal:controller.signal}),rejected=assert.rejects(pending,e=>e.code==='ABORTED');
 await ready;assert.equal(p.control.transport.pending.phase,'selecting');controller.abort();release();await rejected;

 assert.equal(p.settings.pause,backend.properties.get('pause'));
 });

test('replacement resumes after cancelling a held seek in fallback selection',async t=>{
 const {p,backend,calls}=fixture(t,{mode:'hybrid'});let started,release;
 const ready=new Promise(r=>started=r),seek=backend.seek;
 backend.seek=async target=>{if(target===4)throw new PlayerError('DECODE_FAILED','fixture recovery');await seek(target);};
 p.select=async()=>{started();await new Promise(r=>release=r);p.assertOperation();};
 const first=p.seek(4,{policy:'latest'}),rejected=assert.rejects(first,e=>e.code==='ABORTED');await ready;
 const successor=p.seek(6,{policy:'latest'});release();await Promise.all([rejected,successor]);
 assert.equal(p.settings.pause,false);assert.deepEqual(calls,['pause','pause',['seek',6],'play']);
});

// Characterization only: an earlier routing index is not proof of a usable
// replacement with the same source/representation/authentication constraints.
test('investigation: failed streaming seek restoration currently loses its route-zero context',()=>{
 for(const [mode,providerPreferences,restoredStart] of [['hybrid',[],2],['hybrid',softwareFirst,1],['software',softwareFirst,1]]){
  const ordinary=model({mode,providerPreferences}),first=ordinary.seek().id;
  const normal=ordinary.send({type:'transport.seek.failed',id:first,boundary:false,terminal:false,code:'DECODE_FAILED',invalidPosition:false,streaming:true});
  const restoring=model({mode,providerPreferences}),second=restoring.seek().id;
  restoring.send({type:'transport.seek.failed',id:second,boundary:true,terminal:false,code:'INVALID_ARGUMENT',invalidPosition:false,streaming:true});
  const restored=restoring.send({type:'transport.seek.restore-failed',id:second,code:'DECODE_FAILED'});
  assert.equal(normal.transportEffect.start,0);assert.equal(restored.transportEffect.start,restoredStart);
 }
});
