// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {playerReadinessAuthority} from '../../web/generated/internal/machine/player-readiness.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
const video={trackCount:1,hasVideo:true,selectedAudio:false,audioConfigured:false,unsupportedVideo:false,rendered:true,decoderCompatible:true,seeking:false,position:10};
function model(mode='hybrid'){
 let state=initialPlayerControl();const m={get state(){return state;},send(input){const old=state,json=JSON.stringify(state),decision=transitionPlayer(state,input);assert.equal(JSON.stringify(old),json);state=decision.state;return decision;},accept(preserve=false){const attempt=this.send({type:'source.begin',operationEpoch:state.operations.epoch,mode,preserve,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])this.send({type,attempt});this.send({type:'source.accept',attempt,operationEpoch:state.operations.epoch,settings:state.settings,planMatches:true});this.send({type:'source.finished',attempt});},begin(extra={}){return this.send({type:'readiness.begin',epoch:state.operations.epoch,operation:state.operations.active,session:state.source.acceptedSession,mode,target:10,now:100,...extra});},sample(facts=video,extra={}){return this.send({type:'readiness.sample',id:state.readiness.pending.id,now:101,failed:false,facts,...extra});},done(confirmed){return this.send({type:'readiness.completed',id:state.readiness.pending.id,phase:state.readiness.pending.phase,confirmed});}};
 m.accept();const id=m.send({type:'operation.admit',kind:'seeking'}).id;m.send({type:'operation.start',id});return m;
}
test('presentation requires output at the target and a completed confirmation',()=>{
 const m=model(),id=m.begin().id;assert.equal(m.state.readiness.pending.deadline,25100);assert.equal(m.sample().readinessEffects[0].kind,'readiness.confirm');assert.equal(m.state.readiness.pending.phase,'confirming');
 m.done(false);assert.equal(m.state.readiness.pending.phase,'waiting');m.done();m.sample();m.done(true);assert.equal(m.state.readiness.pending.phase,'finished');assert.ok(playerReadinessAuthority(m.state,id));m.send({type:'readiness.finished',id});assert.equal(m.state.readiness.pending,null);
});
test('unknown tracks, absent output, seeking, wrong decoder and distant output keep waiting',()=>{
 for(const patch of [{trackCount:0,hasVideo:false,rendered:false},{rendered:false},{seeking:true},{decoderCompatible:false},{position:null},{position:10.2},{position:NaN}]){
  const m=model();m.begin();assert.equal(m.sample({...video,...patch}).readinessEffects[0].kind,'readiness.wait');
 }
});
test('the established strict timestamp tolerance is retained',()=>{
 for(const [position,ready]of [[10.149,true],[9.851,true],[10.151,false],[9.849,false]]){const m=model();m.begin();assert.equal(m.sample({...video,position}).readinessEffects[0].kind,ready?'readiness.confirm':'readiness.wait');}
});
test('software output does not require an external decoder and absent confirmSeek remains successful',()=>{
 const m=model('software');m.begin();m.sample({...video,decoderCompatible:false});m.done(undefined);assert.equal(m.state.readiness.pending.phase,'finished');
});
test('audio-only preparation needs known tracks and selected decoder evidence',()=>{
 for(const [facts,ready]of [[{...video,hasVideo:false,trackCount:0,rendered:false},false],[{...video,hasVideo:false,selectedAudio:true,audioConfigured:false,rendered:false},false],[{...video,hasVideo:false,selectedAudio:true,audioConfigured:true,rendered:false},true],[{...video,hasVideo:false,selectedAudio:false,rendered:false},true]]){const m=model();m.begin();m.sample(facts);assert.equal(m.state.readiness.pending.phase,ready?'finished':'waiting');}
});
test('deadline, session error, timeline boundary and unsupported codec retain their precedence',()=>{
 const m=model();m.begin();assert.equal(m.sample(undefined,{now:25100,failed:true,boundary:9}).reason,'timeout');assert.equal(m.sample(undefined,{failed:true,boundary:9}).reason,'session-error');assert.equal(m.sample(undefined,{boundary:9}).reason,'boundary');assert.equal(m.sample({...video,unsupportedVideo:true}).reason,'unsupported');
});
test('Native preparation delegates captured expectations without consuming a Player clock',()=>{
 const m=model('native'),expected={video:true,audio:false},start=m.begin({now:undefined,expected});expected.audio=true;assert.deepEqual(start.readinessEffects,[{kind:'readiness.native',expected:{video:true,audio:false}}]);assert.equal(m.state.readiness.pending.deadline,null);m.done();assert.equal(m.state.readiness.pending.phase,'finished');
});
for(const phase of ['sampling','confirming','waiting','finished'])for(const retirement of ['cancel','replace','close','destroy'])test(retirement+' retires presentation verification in '+phase,()=>{
 const m=model(),id=m.begin().id;if(phase==='confirming'||phase==='finished')m.sample();if(phase==='finished')m.done(true);if(phase==='waiting')m.sample({...video,rendered:false});
 if(retirement==='replace')m.accept(true);else if(retirement==='close')m.send({type:'source.clear'});else m.send(retirement==='cancel'?{type:'operation.cancel',id:m.state.operations.active}:{type:'operation.retire',terminal:true});
 assert.equal(m.state.readiness.pending,null);assert.equal(m.send({type:'readiness.completed',id,phase,confirmed:true}).accepted,false);assert.equal(m.send({type:'readiness.sample',id,now:200,failed:false,facts:video}).accepted,false);
});
test('a candidate is verified under its own session identity before source acceptance',()=>{
 const m=model();const candidate=m.send({type:'source.begin',operationEpoch:m.state.operations.epoch,mode:'software',preserve:true,planId:'fixture'}).state.source.candidate;
 const start=m.begin({session:candidate.session,mode:'software'});assert.equal(start.accepted,true);assert.ok(playerReadinessAuthority(m.state,start.id));m.sample();m.done();m.send({type:'readiness.finished',id:start.id});
 assert.equal(m.begin({session:candidate.session+1}).accepted,false);
});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function physical(t,mode='hybrid'){
 const p=unitPlayer();p.dispatchControl({type:'source.configure',mode,automatic:false});acceptSourceIdentity(p,1);
 const backend={properties:new Map([['track-list',[{type:'video',selected:true,codec:'h264'}]]]),diagnostics:{rendered:1,decoder:'webcodecs',seeking:false,presentation:{position:10},presentedPosition:10},destroy:async()=>{}},session={backend,surface:{remove(){}}};p.current=session;p.source={kind:'local',file:new Blob()};t.after(()=>p.destroy());return {p,backend,session,run:()=>p.enqueue(()=>p.settled(session,mode,10),'seeking')};
}
test('actual confirmation rejection releases the verifier and a later retry succeeds',async t=>{
 const f=physical(t),error=Error('confirmation failed');f.backend.confirmSeek=async()=>{throw error;};await assert.rejects(f.run(),/confirmation failed/);assert.equal(f.p.control.readiness.pending,null);f.backend.confirmSeek=async()=>true;await f.run();assert.equal(f.p.control.readiness.pending,null);
});
test('close retires an ignored confirmation before it can qualify replacement output',async t=>{
 const f=physical(t),confirmation=deferred(),started=deferred();f.backend.confirmSeek=()=>{started.resolve();return confirmation.promise;};const work=f.run(),rejected=assert.rejects(work,{code:'ABORTED'});await started.promise;await f.p.close();await rejected;confirmation.resolve(true);await Promise.resolve();assert.equal(f.p.control.readiness.pending,null);
});
test('capturing diagnostics after source retirement cannot invoke a confirmation',async t=>{
 const f=physical(t);let calls=0,closing;f.backend.confirmSeek=async()=>{calls++;return true;};Object.defineProperty(f.backend,'diagnostics',{get(){closing=f.p.close();return {rendered:1,decoder:'webcodecs',presentation:{position:10}};}});await assert.rejects(f.run(),{code:'ABORTED'});await closing;assert.equal(calls,0);
});
test('actual Native verification preserves expected track observations and original backend failure',async t=>{
 const f=physical(t,'native'),error=Error('native failed');let expected;f.backend.verifyStartup=async value=>{expected=value;throw error;};await assert.rejects(f.run(),/native failed/);assert.equal(expected,undefined);assert.equal(f.p.control.readiness.pending,null);
});
test('a confirmation method getter cannot invoke its result after retiring the session',async t=>{
 const f=physical(t);let calls=0,closing;Object.defineProperty(f.backend,'confirmSeek',{get(){closing=f.p.close();return async()=>{calls++;return true;};}});
 await assert.rejects(f.run(),{code:'ABORTED'});await closing;assert.equal(calls,0);assert.equal(f.p.control.readiness.pending,null);
});
