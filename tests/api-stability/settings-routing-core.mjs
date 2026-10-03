// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
function core(){let state=initialPlayerControl();const send=input=>{const d=transitionPlayer(state,input);state=d.state;return d;};const op=send({type:'operation.admit',kind:'switching'}).id;send({type:'operation.start',id:op});return{send,op,get state(){return state;}};}
test('automatic route setting preserves accepted policy until outcome and rejects late completion',()=>{
 for(const outcome of ['accept','restored','retire']){
  const r=core();r.send({type:'source.configure',automatic:false});
  const begin=r.send({type:'setting.begin',command:{kind:'automatic',value:true},hasSource:true,hasBackend:true});
  assert.equal(begin.effects[0].kind,'source.reconfigure');assert.equal(r.state.source.automatic,false);
  if(outcome==='accept'){r.send({type:'setting.accept',id:begin.id});assert.equal(r.state.source.automatic,true);}
  else if(outcome==='restored'){assert.deepEqual(r.send({type:'setting.failed',id:begin.id}).effects,[]);r.send({type:'setting.restored',id:begin.id});assert.equal(r.state.source.automatic,false);}
  else {r.send({type:'operation.retire',terminal:false});assert.equal(r.send({type:'setting.accept',id:begin.id}).accepted,false);assert.equal(r.state.source.automatic,false);}
 }
});
test('mode pinning commits only after replacement and idle mode emits readiness',()=>{
 const r=core();r.send({type:'source.configure',automatic:true});
 const begin=r.send({type:'setting.begin',command:{kind:'mode',value:'software'},hasSource:true,hasBackend:true});
 assert.equal(begin.effects[0].kind,'source.replace');assert.equal(r.state.source.automatic,true);assert.equal(r.state.source.mode,'native');
 r.send({type:'setting.failed',id:begin.id});r.send({type:'setting.restored',id:begin.id});assert.equal(r.state.source.automatic,true);
 const idle=r.send({type:'setting.begin',command:{kind:'mode',value:'software'},hasSource:false,hasBackend:false});assert.deepEqual(idle.effects,[]);
 assert.deepEqual(r.send({type:'setting.accept',id:idle.id}).effects,[{kind:'mode.ready',mode:'software'}]);assert.equal(r.state.source.mode,'software');assert.equal(r.state.source.automatic,false);
});
test('gain routing chooses remux replacement and direct compensation with evidence after commit',()=>{
 for(const [plan,direct,expected] of [['remux-mpv',true,'source.reconfigure'],['native',false,'source.reconfigure'],['software',true,'gain']]){
  const r=core(),begin=r.send({type:'setting.begin',command:{kind:'routedGain',value:.5,plan,direct},hasSource:true,hasBackend:true});
  assert.equal(begin.effects[0].kind,expected);assert.equal(r.state.settings.gain,1);
  if(expected==='gain'){assert.deepEqual(r.send({type:'setting.failed',id:begin.id}).effects,[{kind:'gain',value:1}]);r.send({type:'setting.restored',id:begin.id});assert.equal(r.state.settings.gain,1);}
  else {r.send({type:'setting.accept',id:begin.id});assert.equal(r.state.settings.gain,.5);}
 }
 const r=core(),begin=r.send({type:'setting.begin',command:{kind:'routedGain',value:.5,direct:true},hasSource:true,hasBackend:true});
 assert.deepEqual(r.send({type:'setting.accept',id:begin.id}).effects,[{kind:'gain.evidence'}]);assert.equal(r.state.settings.gain,.5);
});
function source(r){const begin=r.send({type:'source.begin',operationEpoch:r.state.operations.epoch,mode:'native',preserve:false,planId:'fixture'});for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])r.send({type,attempt:begin.id});r.send({type:'source.accept',attempt:begin.id,operationEpoch:r.state.operations.epoch,settings:r.state.settings,planMatches:true});r.send({type:'source.finished',attempt:begin.id});return r.state.source.acceptedSession;}
test('track confirmation owns match, timeout, operation retirement and late observations',()=>{
 for(const outcome of ['match','timeout','cancel','close']){
  const r=core(),session=source(r),begin=r.send({type:'trackConfirmation.begin',session,track:'audio',value:'3',now:100});assert.equal(begin.accepted,true);
  const sample=(now,selected)=>r.send({type:'trackConfirmation.sample',id:begin.id,now,tracks:[{id:'3',type:'audio',selected}]});
  assert.equal(sample(5099,false).accepted,true);assert.equal(r.state.trackConfirmation.pending.phase,'waiting');
  if(outcome==='match'){sample(5100,true);assert.equal(r.state.trackConfirmation.pending.phase,'confirmed');assert.equal(sample(5101,false).accepted,false);}
  else if(outcome==='timeout'){sample(5100,false);assert.equal(r.state.trackConfirmation.pending.phase,'failed');assert.equal(sample(5101,true).accepted,false);}
  else {r.send(outcome==='cancel'?{type:'operation.cancel',id:r.op}:{type:'source.clear'});assert.equal(sample(200,true).accepted,false);}
  r.send({type:'trackConfirmation.finished',id:begin.id});assert.equal(r.state.trackConfirmation.pending,null);
 }
});
test('track confirmation auto/off matching and exclusive admission',()=>{
 for(const [value,tracks,phase] of [['auto',[],'confirmed'],['no',[{id:'1',type:'sub',selected:true}],'confirmed'],['no',[{id:'1',type:'audio',selected:true}],'waiting']]){
  const r=core(),session=source(r),begin=r.send({type:'trackConfirmation.begin',session,track:'audio',value,now:0});
  assert.equal(r.send({type:'trackConfirmation.begin',session,track:'audio',value:'1',now:0}).accepted,false);
  r.send({type:'trackConfirmation.sample',id:begin.id,now:1,tracks});assert.equal(r.state.trackConfirmation.pending.phase,phase);
 }
});

function adapter(t){const p=unitPlayer(),backend=new EventTarget();Object.assign(backend,{properties:new Map(),diagnostics:{plan:'direct'},pause:async()=>{},play:async()=>{},gain:async()=>{},destroy:async()=>{}});p.current={backend,surface:{remove(){}}};p.source={kind:'local',file:new Blob()};acceptSourceIdentity(p,1);t.after(()=>p.destroy());return{p,backend};}
test('public automatic selection rolls back requested policy after candidate failure',async t=>{
 const {p}=adapter(t);await p.setAutomaticSelection(false);let observed;
 p.select=async()=>{observed=p.automatic;assert.equal(p.control.source.automatic,false);throw Error('candidate failed');};
 await assert.rejects(p.setAutomaticSelection(true),/candidate failed/);assert.equal(observed,true);assert.equal(p.automatic,false);assert.equal(p.control.settingsTransactions.pending,null);
});
test('public mode selection pins only after successful replacement',async t=>{
 const {p}=adapter(t);p.replace=async()=>{assert.equal(p.automatic,true,'keep automatic track preservation until replacement commits');throw Error('replacement failed');};await assert.rejects(p.setMode('software'),/replacement failed/);assert.equal(p.automatic,true);
 p.replace=async()=>{assert.equal(p.automatic,true);};await p.setMode('software');assert.equal(p.automatic,false);assert.equal(p.mode,'software');
});
test('public gain replacement completion after close cannot commit the gain',async t=>{
 const {p,backend}=adapter(t);backend.gain=undefined;let resolve,started;const ready=new Promise(r=>started=r);
 p.select=()=>{started();return new Promise(r=>resolve=r);};
 const work=p.setAudioGain(.25),rejected=assert.rejects(work,{code:'ABORTED'});await ready;const closing=p.close();resolve();await rejected;await closing;assert.equal(p.settings.gain,1);assert.equal(p.control.settingsTransactions.pending,null);
});

test('source acceptance commits automatic policy atomically and retains candidate track confirmation lease',()=>{
 const r=core();source(r);r.send({type:'source.configure',automatic:false});
 const setting=r.send({type:'setting.begin',command:{kind:'automatic',value:true},hasSource:true,hasBackend:true});
 const attempt=r.send({type:'source.begin',operationEpoch:r.state.operations.epoch,mode:'software',preserve:true,planId:'fixture'}).id;
 const session=r.state.source.candidate.session;
 const confirmation=r.send({type:'trackConfirmation.begin',session,track:'audio',value:'2',now:10}).id;
 for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])r.send({type,attempt});
 const acceptance=r.send({type:'source.accept',attempt,operationEpoch:r.state.operations.epoch,settings:r.state.settings,planMatches:true});
 assert.equal(acceptance.accepted,true);assert.equal(acceptance.state.source.automatic,true,'source listeners must see committed policy');
 assert.equal(acceptance.state.settingsTransactions.pending.phase,'accepted');assert.equal(acceptance.state.trackConfirmation.pending.id,confirmation);
 assert.equal(r.send({type:'trackConfirmation.sample',id:confirmation,now:20,tracks:[{id:'2',type:'audio',selected:true}]}).accepted,true);
 assert.equal(r.state.trackConfirmation.pending.phase,'confirmed');r.send({type:'trackConfirmation.finished',id:confirmation});
 r.send({type:'source.finished',attempt});assert.equal(r.send({type:'setting.accept',id:setting.id}).accepted,true);assert.equal(r.state.source.automatic,true);
});
test('track deadline event is authoritative even without a final backend sample',()=>{
 const r=core(),session=source(r),begin=r.send({type:'trackConfirmation.begin',session,track:'audio',value:'2',now:0});
 assert.equal(r.send({type:'trackConfirmation.timeout',id:begin.id,now:4999}).accepted,false);
 assert.equal(r.send({type:'trackConfirmation.timeout',id:begin.id,now:5000}).accepted,true);assert.equal(r.state.trackConfirmation.pending.phase,'failed');
 assert.equal(r.send({type:'trackConfirmation.sample',id:begin.id,now:5000,tracks:[{id:'2',type:'audio',selected:true}]}).accepted,false);
});
test('public automatic source acceptance survives later cleanup failure',async t=>{
 const {p}=adapter(t);await p.setAutomaticSelection(false);
 p.select=async()=>{
  const attempt=p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode:'software',preserve:true,planId:'fixture'}).id;
  for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])p.dispatchControl({type,attempt});
  p.dispatchControl({type:'source.accept',attempt,operationEpoch:p.operationEpoch,settings:p.settings,planMatches:true});
  assert.equal(p.control.source.automatic,true);p.dispatchControl({type:'source.finished',attempt});throw Error('old backend cleanup failed');
 };
 await assert.rejects(p.setAutomaticSelection(true),/old backend cleanup failed/);assert.equal(p.automatic,true);assert.equal(p.control.settingsTransactions.pending,null);
});
test('gain evidence cannot update route state after an admission observation closes the player',async t=>{
 const {p}=adapter(t);let closing,lateEvidence=0;
 p.admissible=()=>{closing=p.close();return[];};p.runtimeCapabilities.begin=()=>{lateEvidence++;};p.acceptEvidence=()=>{};
 await assert.rejects(p.setAudioGain(.5),{code:'ABORTED'});await closing;assert.equal(lateEvidence,0);
});
test('public direct gain partial failure restores accepted gain without publishing evidence',async t=>{
 const {p,backend}=adapter(t),calls=[];let physical=1,evidence=0;
 backend.gain=async value=>{physical=value;calls.push(value);if(value===.5)throw Error('gain applied then failed');};p.admissible=()=>{evidence++;return[];};
 await assert.rejects(p.setAudioGain(.5),/gain applied then failed/);assert.deepEqual(calls,[.5,1]);assert.equal(physical,1);assert.equal(p.settings.gain,1);assert.equal(evidence,0);
});
