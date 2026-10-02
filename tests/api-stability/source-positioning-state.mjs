// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSourcePositioning,claimSourcePositioning,completeSourcePositioning,sourcePositioningDone} from '../../web/generated/internal/machine/source-positioning.js';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
const settings={pause:true,volume:37,speed:1,gain:1,aid:'auto',sid:'auto',subtitles:true,vf:'',af:''};
const facts=(extra={})=>({mode:'native',planId:'native-direct',target:0,overlapping:false,settings,...extra});
function history(input,observe=()=>undefined){let state=initialSourcePositioning(input);const effects=[];for(let count=0;count<40;count++){const before=structuredClone(state),old=state,claimed=claimSourcePositioning(state);assert.deepEqual(old,before);assert.equal(claimed.accepted,true);state=claimed.state;if(!claimed.effect)break;assert.equal(claimSourcePositioning(state).accepted,false);const {step,...effect}=claimed.effect;effects.push(effect);if(effect.kind==='reject')return{state,effects};const observation=observe(effect)??(effect.kind==='plan'?{kind:'plan',actual:input.planId,eligible:true}:effect.kind==='volume.observe'?{kind:'muted',value:false}:undefined),done=completeSourcePositioning(state,step,observation);assert.equal(done.accepted,true);state=done.state;assert.equal(completeSourcePositioning(state,step,observation).accepted,false);}assert.equal(sourcePositioningDone(state),true);return{state,effects};}
test('paused zero target verifies startup and plan without seek or play',()=>{
 assert.deepEqual(history(facts()).effects,[{kind:'settled',target:0},{kind:'position'},{kind:'positioned'},{kind:'candidate.error'},{kind:'plan'},{kind:'ready'}]);
});
test('positive target requires seek and target output evidence before phase verification',()=>{
 assert.deepEqual(history(facts({target:8})).effects.map(effect=>[effect.kind,effect.target]),[['settled',0],['position',undefined],['seek',8],['settled',8],['positioned',undefined],['candidate.error',undefined],['plan',undefined],['ready',undefined]]);
});
test('playing overlap waits startup then pauses and samples old clock before seeking and unmuting',()=>{
 const out=history(facts({target:2,overlapping:true,settings:{...settings,pause:false}}),effect=>effect.kind==='previous.time'?{kind:'time',value:6}:undefined);
 assert.deepEqual(out.effects.map(effect=>effect.kind),['settled','previous.pause','previous.time','monitor.release','position','seek','settled','positioned','candidate.error','plan','play','volume.observe','volume','ready']);assert.equal(out.state.target,6);assert.deepEqual(out.effects.find(effect=>effect.kind==='play'),{kind:'play',native:true});assert.equal(out.effects.find(effect=>effect.kind==='volume').value,37);
});
test('target normalization retains zero fallback and positive Infinity behavior',()=>{
 for(const [input,expected]of [[NaN,0],[-2,0],[0,0],[Infinity,Infinity],[1.25,1.25]]){const out=history(facts({overlapping:true}),effect=>effect.kind==='previous.time'?{kind:'time',value:input}:undefined);assert.equal(out.state.target,expected);assert.equal(out.effects.some(effect=>effect.kind==='seek'),expected>0);}
});
test('Hybrid and Software playback use direct executor while overlap unmute observes current mute',()=>{
 for(const mode of ['hybrid','software']){const out=history(facts({mode,planId:mode,settings:{...settings,pause:false}}));assert.deepEqual(out.effects.find(effect=>effect.kind==='play'),{kind:'play',native:false});}
 assert.equal(history(facts({overlapping:true}),effect=>effect.kind==='previous.time'?{kind:'time',value:0}:effect.kind==='volume.observe'?{kind:'muted',value:true}:undefined).effects.find(effect=>effect.kind==='volume').value,0);
});
test('plan identity and eligibility are both required before playback or unmute',()=>{
 for(const observation of [{kind:'plan',actual:'native-remux',eligible:true},{kind:'plan',actual:'native-direct',eligible:false},{kind:'plan',actual:null,eligible:false}]){const out=history(facts({settings:{...settings,pause:false}}),effect=>effect.kind==='plan'?observation:undefined);assert.equal(out.effects.at(-1).kind,'reject');assert.equal(out.effects.some(effect=>effect.kind==='play'),false);assert.equal(out.state.planMatches,false);}
});
test('unclaimed wrong-step and wrong observation acknowledgments cannot advance positioning',()=>{
 let state=initialSourcePositioning(facts({overlapping:true}));assert.equal(completeSourcePositioning(state,0).accepted,false);let next=claimSourcePositioning(state);assert.equal(completeSourcePositioning(next.state,1).accepted,false);state=completeSourcePositioning(next.state,0).state;next=claimSourcePositioning(state);state=completeSourcePositioning(next.state,next.effect.step).state;next=claimSourcePositioning(state);assert.equal(next.effect.kind,'previous.time');assert.equal(completeSourcePositioning(next.state,next.effect.step,{kind:'muted',value:false}).accepted,false);
});
function composed(extra={}){let state=initialPlayerControl();const send=input=>{const result=transitionPlayer(state,input);state=result.state;return result;};const operation=send({type:'operation.admit',kind:'opening'}).id;send({type:'operation.start',id:operation});const attempt=send({type:'source.begin',operationEpoch:state.operations.epoch,mode:'native',preserve:false,planId:'native-direct'}).id;for(const type of ['source.created','source.configured','source.opened'])send({type,attempt});send({type:'source.application.begin',attempt,facts:{mode:'native',preserve:false,planId:'native-direct',settings,quality:null,outputDevice:'',attachments:0,nativeTracks:0,indexes:[],publicSelections:[],audioPolicy:false,subtitlePolicy:false}});for(;;){const effect=send({type:'source.application.next',attempt}).applicationEffect;if(!effect)break;send({type:'source.application.completed',attempt,step:effect.step,observation:effect.kind==='metadata.inspect'?{kind:'support',available:false}:undefined});}assert.equal(send({type:'source.positioned',attempt}).accepted,false);send({type:'source.positioning.begin',attempt,target:0,overlapping:false,...extra});return{send,attempt,operation,get state(){return state;}};}
test('composed phase and acceptance cannot bypass claimed output/plan/activation steps',()=>{
 const c=composed();assert.equal(c.send({type:'source.positioned',attempt:c.attempt}).accepted,false);let plan=false;for(;;){const effect=c.send({type:'source.positioning.next',attempt:c.attempt}).positioningEffect;if(!effect)break;assert.equal(c.send({type:'source.accept',attempt:c.attempt,operationEpoch:c.state.operations.epoch,settings,planMatches:true}).accepted,false);c.send({type:'source.positioning.completed',attempt:c.attempt,step:effect.step,observation:effect.kind==='plan'?{kind:'plan',actual:'native-direct',eligible:true}:undefined});if(effect.kind==='positioned')assert.equal(c.state.source.candidate.phase,'verifying');if(effect.kind==='plan')plan=true;}assert.equal(plan,true);assert.equal(c.send({type:'source.accept',attempt:c.attempt,operationEpoch:c.state.operations.epoch,settings,planMatches:false}).accepted,true);assert.equal(c.state.source.serial,1);
});
test('cancel close and destroy reject every pending positioning completion and future effect',()=>{
 for(const retirement of ['cancel','close','destroy'])for(let index=0;index<6;index++){const c=composed();let effect;for(let n=0;n<=index;n++){effect=c.send({type:'source.positioning.next',attempt:c.attempt}).positioningEffect;if(n<index)c.send({type:'source.positioning.completed',attempt:c.attempt,step:effect.step,observation:effect.kind==='plan'?{kind:'plan',actual:'native-direct',eligible:true}:undefined});}c.send(retirement==='cancel'?{type:'operation.cancel',id:c.operation}:{type:'operation.retire',terminal:retirement==='destroy'});const before=c.state;assert.equal(c.send({type:'source.positioning.completed',attempt:c.attempt,step:effect.step}).accepted,false);assert.equal(c.send({type:'source.positioning.next',attempt:c.attempt}).accepted,false);assert.equal(c.send({type:'source.accept',attempt:c.attempt,operationEpoch:c.state.operations.epoch,settings,planMatches:true}).accepted,false);assert.equal(c.state,before);assert.equal(c.send({type:'source.finished',attempt:c.attempt}).accepted,true);}
});
function fixture(t,options={}){
 const p=unitPlayer(),calls=[],caller=new AbortController(),mode=options.mode??'native',plan=mode==='native'?'native-direct':mode;let session;
 const effect=(kind,...args)=>{calls.push([kind,...args]);return options.effect?.(kind,args,p,caller,session);};
 const backend={ready:Promise.resolve(),properties:new Map([['duration',20]]),diagnostics:{plan:mode==='native'?'direct':mode},command:async()=>{},gain:async()=>{},volume:async value=>effect('volume',value),rate:async()=>{},selectTrack:async()=>{},subtitleVisible:async()=>{},open:async()=>effect('open'),seek:async value=>effect('seek',value),play:async()=>effect('play'),pause:async()=>effect('pause'),destroy:async()=>effect('destroy')};session={backend,surface:{style:{display:'none'},remove(){}}};
 p.currentMode=mode;p.create=async()=>session;p.admissible=()=>[{id:plan,mode,eligible:true}];p.settled=async(_session,_mode,target)=>effect('settled',target);p.playNativeVerified=async value=>{await value.play();await effect('native.verify');};
 const source={kind:'local',file:new File(['media'],'movie.mp4')};let old;
 if(options.preserve){old={backend:{diagnostics:{},properties:new Map([['time-pos',options.oldTime??2]]),pause:async()=>effect('old.pause'),play:async()=>effect('old.play'),destroy:async()=>effect('old.destroy')},surface:{style:{},remove(){}}};p.current=old;p.source=source;p.settings={...p.settings,pause:options.paused??false};acceptSourceIdentity(p,1);}
 if(options.overlapping)p.backgroundPromotion={maxKnownBytes:512*1024*1024};
 const open=()=>p.enqueue(async()=>{if(options.overlapping){const facts={automatic:true,source:true,current:true,error:false,paused:false,background:true,waiting:false,queued:0};p.dispatchControl({type:'routing.promotion',change:{kind:'schedule',now:0,facts}});const id=p.control.routing.promotion.timer.id;for(const change of [{kind:'fired',id,now:200,facts},{kind:'start',id,facts},{kind:'trying',id}])p.dispatchControl({type:'routing.promotion',change});}await p.replace(source,mode,p.settings,options.preserve??false,[],options.target,false,plan);},'opening',caller.signal);t.after(()=>p.destroy());return{p,backend,session,old,caller,calls,open};
}
test('actual target seek is followed by exact target readiness before acceptance',async t=>{
 const f=fixture(t,{target:8});await f.open();const start=f.calls.findIndex(call=>call[0]==='open');assert.deepEqual(f.calls.slice(start+1),[['settled',0],['seek',8],['settled',8]]);assert.equal(f.p.current,f.session);
});
for(const mode of ['native','hybrid','software'])test(`actual preserved playing ${mode} activates only after positioned output`,async t=>{
 const f=fixture(t,{mode,preserve:true,oldTime:3});await f.open();const start=f.calls.findIndex(call=>call[0]==='open');assert.deepEqual(f.calls.slice(start+1),mode==='native'?[['settled',0],['seek',3],['settled',3],['play'],['native.verify'],['old.destroy']]:[['settled',0],['seek',3],['settled',3],['play'],['old.destroy']]);assert.equal(f.p.settings.pause,false);
});
test('actual startup cancellation cannot seek the retired candidate',async t=>{
 const f=fixture(t,{target:5,effect(kind,args,p,caller){if(kind==='settled'&&args[0]===0)caller.abort();}});await assert.rejects(f.open(),{code:'ABORTED'});assert.equal(f.calls.some(call=>call[0]==='seek'),false);assert.equal(f.p.sourceSerial,0);
});
test('actual seek cancellation cannot begin a new readiness wait',async t=>{
 const f=fixture(t,{target:5,effect(kind,args,p,caller){if(kind==='seek')caller.abort();}});await assert.rejects(f.open(),{code:'ABORTED'});assert.deepEqual(f.calls.filter(call=>call[0]==='settled'),[['settled',0]]);
});
test('actual seek method acquisition retirement cannot invoke returned stale method',async t=>{
 const f=fixture(t,{target:5});let closing,calls=0;Object.defineProperty(f.backend,'seek',{get(){closing??=f.p.close();return async()=>{calls++;};}});await assert.rejects(f.open(),{code:'ABORTED'});await closing;assert.equal(calls,0);
});
test('actual candidate failure after output prevents plan activation',async t=>{
 const failure=Error('candidate output failed'),f=fixture(t,{preserve:true,effect(kind,args,p,caller,session){if(kind==='settled')session.error=failure;}});await assert.rejects(f.open(),error=>error.message===failure.message);assert.equal(f.calls.some(call=>call[0]==='play'),false);assert.equal(f.p.current,f.old);
});
test('actual unexpected execution plan cannot play or accept candidate',async t=>{
 const f=fixture(t,{preserve:true});f.backend.diagnostics={plan:'remux'};await assert.rejects(f.open(),{code:'UNSUPPORTED_FEATURE'});assert.equal(f.calls.some(call=>call[0]==='play'),false);assert.equal(f.p.current,f.old);
});
test('actual plan observation retirement cannot activate its candidate',async t=>{
 const f=fixture(t,{preserve:true});let closing;Object.defineProperty(f.backend,'diagnostics',{get(){closing??=f.p.close();return{plan:'direct'};}});await assert.rejects(f.open(),{code:'ABORTED'});await closing;assert.equal(f.calls.some(call=>call[0]==='play'),false);
});
test('actual overlap resamples old paused clock, seeks there, then restores candidate volume',async t=>{
 const f=fixture(t,{preserve:true,overlapping:true,effect(kind){if(kind==='old.pause')f.old.backend.properties.set('time-pos',7);}});await f.open();const start=f.calls.findIndex(call=>call[0]==='open');assert.deepEqual(f.calls.slice(start+1),[['settled',0],['old.pause'],['seek',7],['settled',7],['play'],['native.verify'],['volume',100],['old.destroy']]);assert.deepEqual(f.calls.find(call=>call[0]==='volume'),['volume',0]);
});
test('actual overlap cancellation after old pause cannot sample into candidate seek',async t=>{
 const f=fixture(t,{preserve:true,overlapping:true,effect(kind,args,p,caller){if(kind==='old.pause')caller.abort();}});await assert.rejects(f.open(),{code:'ABORTED'});assert.equal(f.calls.some(call=>call[0]==='seek'),false);assert.equal(f.p.current,f.old);
});
