// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialSourcePreparation,claimSourcePreparation,completeSourcePreparation,sourcePreparationDone} from '../../web/generated/internal/machine/source-preparation.js';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer,sessionAuthority} from '../../web/generated/internal/machine/transition.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
const facts=(mode='native',extra={})=>({mode,settings:{pause:true,volume:37,speed:1.5,gain:1,aid:'3',sid:'4',subtitles:false,vf:'',af:''},videoFilters:'',subtitleDelay:.25,audioDelay:-.1,subtitleStyle:{color:'#fff',fontSize:24},overlapping:false,muted:false,...extra});
function program(input){let state=initialSourcePreparation();const effects=[];for(;;){const old=state,before=structuredClone(old),next=claimSourcePreparation(state);assert.equal(next.accepted,true);state=next.state;assert.deepEqual(old,before);if(!next.effect)break;effects.push(next.effect);assert.equal(claimSourcePreparation(state).accepted,false);const done=completeSourcePreparation(state,next.effect.step,input);assert.equal(done.accepted,true);state=done.state;assert.equal(completeSourcePreparation(state,next.effect.step,input).accepted,false);}assert.equal(sourcePreparationDone(state),true);return effects.map(({step,...effect})=>effect);}
test('native candidate preparation issues one ready, gain, volume, rate and source open in exact order',()=>{
 assert.deepEqual(program(facts()),[{kind:'ready'},{kind:'gain',value:1},{kind:'volume',value:37},{kind:'rate',value:1.5},{kind:'configured'},{kind:'open'}]);
});
test('software candidate preparation retains filter, timing, style and numeric track order',()=>{
 const input=facts('software',{videoFilters:'scale=320:180'});input.settings.af='volume=0.5';
 assert.deepEqual(program(input),[{kind:'ready'},{kind:'command',property:'vf',value:'scale=320:180'},{kind:'command',property:'af',value:'volume=0.5'},{kind:'command',property:'sub-delay',value:'0.25'},{kind:'command',property:'audio-delay',value:'-0.1'},{kind:'command',property:'sub-color',value:'#fff'},{kind:'command',property:'sub-font-size',value:'24'},{kind:'gain',value:1},{kind:'volume',value:37},{kind:'rate',value:1.5},{kind:'track',track:'audio',value:'3'},{kind:'track',track:'sub',value:'4'},{kind:'subtitles',value:false},{kind:'configured'},{kind:'open'}]);
});
test('candidate volume reflects mute and overlap while Native defers numeric tracks until after open',()=>{
 for(const mode of ['native','hybrid','software'])for(const muted of [false,true])for(const overlapping of [false,true]){const effects=program(facts(mode,{muted,overlapping}));assert.equal(effects.find(effect=>effect.kind==='volume').value,muted||overlapping?0:37);assert.equal(effects.filter(effect=>effect.kind==='track').length,mode==='native'?0:2);}
});
test('readiness completion detaches all caller settings and style without freezing caller graphs',()=>{
 const input=facts('software'),claim=claimSourcePreparation(initialSourcePreparation()),state=completeSourcePreparation(claim.state,claim.effect.step,input).state;input.settings.volume=99;input.subtitleStyle.color='#000';assert.equal(Object.isFrozen(input.settings),false);assert.equal(Object.isFrozen(input.subtitleStyle),false);assert.equal(state.commands.find(effect=>effect.kind==='volume').value,37);assert.equal(state.commands.find(effect=>effect.property==='sub-color').value,'#fff');
});
test('unclaimed, wrong and duplicate source preparation acknowledgments cannot skip work',()=>{
 let state=initialSourcePreparation();assert.equal(completeSourcePreparation(state,0,facts()).accepted,false);const claim=claimSourcePreparation(state);state=claim.state;assert.equal(completeSourcePreparation(state,1,facts()).accepted,false);assert.equal(completeSourcePreparation(state,0).accepted,false);state=completeSourcePreparation(state,0,facts()).state;assert.equal(completeSourcePreparation(state,0,facts()).accepted,false);assert.equal(claimSourcePreparation(state).effect.kind,'gain');
});
function control(){let state=initialPlayerControl();const send=input=>{const result=transitionPlayer(state,input);state=result.state;return result;};const operation=send({type:'operation.admit',kind:'opening'}).id;send({type:'operation.start',id:operation});const attempt=send({type:'source.begin',operationEpoch:state.operations.epoch,mode:'native',preserve:false,planId:'native-direct'}).id;send({type:'source.created',attempt,prepare:true});return {get state(){return state;},send,attempt,operation};}
test('composed preparation claims every step and refuses legacy phase bypass',()=>{
 const c=control();assert.equal(c.send({type:'source.configured',attempt:c.attempt}).accepted,false);const ready=c.send({type:'source.preparation.next',attempt:c.attempt});assert.equal(ready.preparationEffect.kind,'ready');assert.equal(c.send({type:'source.preparation.next',attempt:c.attempt}).accepted,false);
 c.send({type:'source.preparation.completed',attempt:c.attempt,step:ready.preparationEffect.step,facts:facts()});let effect;
 while((effect=c.send({type:'source.preparation.next',attempt:c.attempt}).preparationEffect)){const before=c.state.source.candidate.phase;assert.equal(c.send({type:'source.preparation.completed',attempt:c.attempt,step:effect.step}).accepted,true);assert.equal(c.state.source.candidate.phase,effect.kind==='configured'?'opening':effect.kind==='open'?'applying':before);}
 assert.equal(c.state.source.candidate.phase,'applying');assert.equal(c.state.source.serial,0);
});
test('composed candidate continuation cannot follow a different operation in the same epoch',()=>{
 const c=control(),effect=c.send({type:'source.preparation.next',attempt:c.attempt}).preparationEffect,session=c.state.source.candidate.session;c.send({type:'operation.finish',id:c.operation});c.send({type:'operation.release',id:c.operation});const replacement=c.send({type:'operation.admit',kind:'opening'}).id;c.send({type:'operation.start',id:replacement});assert.equal(sessionAuthority(c.state,session),'retired');const before=c.state;assert.equal(c.send({type:'source.preparation.completed',attempt:c.attempt,step:effect.step,facts:facts()}).accepted,false);assert.equal(c.state,before);assert.equal(c.send({type:'source.preparation.next',attempt:c.attempt}).accepted,false);assert.equal(c.send({type:'source.finished',attempt:c.attempt}).accepted,true);
});
test('composed source admission refuses old epoch or forged operation before a candidate is allocated',()=>{
 let state=initialPlayerControl();state=transitionPlayer(state,{type:'operation.retire',terminal:false}).state;for(const input of [{operationEpoch:0},{operationEpoch:1,operation:7}]){const decision=transitionPlayer(state,{type:'source.begin',...input,mode:'native',preserve:false,planId:'native-direct'});assert.equal(decision.accepted,false);assert.equal(decision.state.source.candidate,null);}
});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function fixture(t,options={}){
 const p=unitPlayer(),calls=[],caller=new AbortController(),mode=options.mode??'native',plan=mode==='native'?'native-direct':mode;
 const invoke=(kind,...args)=>{calls.push([kind,...args]);return options.effect?.(kind,args,p,caller);};
 const backend={ready:Promise.resolve(),properties:new Map([['duration',20]]),diagnostics:{plan:mode==='native'?'direct':mode},command:async(...args)=>invoke('command',...args),gain:async value=>invoke('gain',value),volume:async value=>invoke('volume',value),rate:async value=>invoke('rate',value),selectTrack:async(...args)=>invoke('track',...args),subtitleVisible:async value=>invoke('subtitles',value),open:async(...args)=>invoke('open',...args),openRemote:async(...args)=>invoke('remote',...args),destroy:async()=>invoke('destroy'),pause:async()=>{},play:async()=>{}};
 const session={backend,surface:{style:{display:'none'},remove(){}}};p.create=async()=>session;p.admissible=()=>[{id:plan,mode,eligible:true}];p.settled=async()=>{};p.applyTrackPolicy=async()=>{};const source=options.remote?{kind:'remote',options:{url:'https://media.test/movie.mp4'}}:{kind:'local',file:new File(['media'],'movie.mp4')};
 const open=()=>p.enqueue(()=>p.replace(source,mode,{...p.settings,volume:37,speed:1.5},false,[],undefined,false,plan),'opening',caller.signal);t.after(()=>p.destroy());return {p,backend,session,calls,caller,source,open};
}
for(const mode of ['native','hybrid','software'])test(`actual ${mode} preparation preserves the source-open boundary and settings`,async t=>{
 const f=fixture(t,{mode});await f.open();const open=f.calls.findIndex(call=>call[0]==='open');assert.ok(open>0);const before=f.calls.slice(0,open).map(call=>call[0]);assert.deepEqual(before,mode==='native'?['gain','volume','rate']:['command','command','gain','volume','rate','track','track','subtitles']);assert.deepEqual(f.calls.find(call=>call[0]==='volume'),['volume',37]);assert.equal(f.p.current,f.session);assert.equal(f.p.sourceSerial,1);assert.equal(f.p.control.source.candidate,null);
});
for(const stop of ['command','gain','volume','rate','track','subtitles','open'])test(`actual cancellation during candidate ${stop} cannot invoke any later source effect`,async t=>{
 const f=fixture(t,{mode:'software',effect(kind,args,p,caller){if(kind===stop)caller.abort();}});await assert.rejects(f.open(),{code:'ABORTED'});const stopIndex=f.calls.findIndex(call=>call[0]===stop);assert.ok(stopIndex>=0);assert.deepEqual(f.calls.slice(stopIndex+1).filter(call=>call[0]!=='destroy'),[]);assert.equal(f.p.sourceSerial,0);assert.equal(f.p.control.source.candidate,null);
});
test('actual readiness retirement never starts candidate configuration',async t=>{
 const hold=deferred(),entered=deferred(),f=fixture(t);Object.defineProperty(f.backend,'ready',{get(){entered.resolve();return hold.promise;}});const opening=f.open(),rejected=assert.rejects(opening,{code:'ABORTED'});await entered.promise;f.caller.abort();hold.resolve();await rejected;assert.deepEqual(f.calls.filter(call=>call[0]!=='destroy'),[]);
});
test('actual late command completion after close cannot execute or publish the retired successor steps',async t=>{
 const hold=deferred(),entered=deferred(),f=fixture(t,{effect(kind){if(kind==='gain'){entered.resolve();return hold.promise;}}});const opening=f.open(),rejected=assert.rejects(opening,{code:'ABORTED'});await entered.promise;const closing=f.p.close();hold.resolve();await rejected;await closing;assert.deepEqual(f.calls.filter(call=>call[0]!=='destroy'),[['gain',1]]);assert.equal(f.p.current,undefined);assert.equal(f.p.sourceSerial,0);
});
test('actual remote source options remain a shell handle and are passed only after configuration',async t=>{
 const f=fixture(t,{remote:true});await f.open();assert.equal(f.calls.find(call=>call[0]==='remote')[1],f.source.options);assert.equal(JSON.stringify(f.p.control).includes('media.test'),false);
});

test('actual backend method acquisition that closes cannot invoke its retired method',async t=>{
 const f=fixture(t);let closing,invocations=0;Object.defineProperty(f.backend,'volume',{get(){closing??=f.p.close();return async()=>{invocations++;};}});await assert.rejects(f.open(),{code:'ABORTED'});await closing;assert.equal(invocations,0);assert.deepEqual(f.calls.filter(call=>call[0]!=='destroy'),[['gain',1]]);
});
