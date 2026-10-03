// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {Player} from '../../web/generated/unified-player.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
function model(mode='native'){
 let state=initialPlayerControl();const api={get state(){return state;},send(input){const before=JSON.stringify(state),old=state,d=transitionPlayer(state,input);state=d.state;assert.equal(JSON.stringify(old),before);return d;},accept(mode,preserve=false){const attempt=this.send({type:'source.begin',operationEpoch:state.operations.epoch,mode,preserve,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])this.send({type,attempt});this.send({type:'source.accept',attempt,operationEpoch:state.operations.epoch,settings:{...state.settings,pause:false},planMatches:true});this.send({type:'source.finished',attempt});},start(extra={}){return this.send({type:'monitor.reconcile',epoch:state.operations.epoch,session:state.source.acceptedSession,mode:state.source.mode,present:true,error:false,closing:false,backendPaused:false,backendEOF:false,hidden:false,...extra});},sample(now,extra={}){return this.send({type:'monitor.sample',id:state.monitor.current?.id,epoch:state.operations.epoch,session:state.source.acceptedSession,activity:state.monitor.activity,hidden:false,retired:false,error:false,now,native:{eligible:true,time:1,rate:1},timing:null,hasVideo:true,softwareDecoder:true,...extra});}};
 api.accept(mode);return api;
}
test('monitor start uses accepted source, policy and cheap playback eligibility',()=>{
 for(const extra of [{present:false},{error:true},{closing:true},{backendPaused:true},{backendEOF:true},{hidden:true}]){const m=model();m.start(extra);assert.equal(m.state.monitor.current,null);}
 const m=model();m.start();const owner=m.state.monitor.current;assert.equal(owner.session,m.state.source.acceptedSession);assert.equal(m.start().accepted,false);assert.equal(m.state.monitor.current,owner);
 m.send({type:'settings.change',value:{pause:true}});m.start();assert.equal(m.state.monitor.current,null);
 const software=model('software');software.start();assert.equal(software.state.monitor.current,null);
});
test('policy replacement retires old monitor even when replacement values are equal',()=>{
 const m=model();m.start();const old=m.state.monitor.current,policy=m.state.monitor.policy;
 m.send({type:'monitor.policy',policy});assert.equal(m.state.monitor.current,null);m.start();assert.ok(m.state.monitor.current.id>old.id);
 assert.equal(m.sample(0,{id:old.id}).accepted,false);
 m.send({type:'monitor.policy',policy:{...policy,nativeProgress:false}});m.start();assert.equal(m.state.monitor.current,null);
});
test('Native clock failure takes a full consecutive budget and retires the sample lease once',()=>{
 const m=model();m.send({type:'monitor.policy',policy:{...m.state.monitor.policy,nativeProgressTimeoutMs:1000}});m.start();const id=m.state.monitor.current.id;
 m.sample(0);m.sample(500);assert.equal(m.state.monitor.fault,null);m.sample(1000);assert.deepEqual(m.state.monitor.fault,{id,session:m.state.source.acceptedSession,reason:'clock'});assert.equal(m.state.monitor.current,null);
 assert.equal(m.sample(1500,{id}).accepted,false);
});
test('activity, hidden periods and queued operations reset suspicion without spending budget',()=>{
 for(const interruption of ['activity','hidden','queue']){const m=model();m.send({type:'monitor.policy',policy:{...m.state.monitor.policy,nativeProgressTimeoutMs:1000}});m.start();m.sample(0);m.sample(500);
  if(interruption==='activity')m.send({type:'monitor.activity'});
  if(interruption==='hidden')m.sample(750,{hidden:true});
  if(interruption==='queue'){const id=m.send({type:'operation.admit',kind:'seeking'}).id;m.sample(750);m.send({type:'operation.release',id});}
  m.sample(1000);m.sample(1500);assert.equal(m.state.monitor.fault,null);m.sample(2000);assert.equal(m.state.monitor.fault.reason,'clock');
 }
});
test('VFR frame failure needs declared active timeline and three maximum intervals',()=>{
 for(const timing of [null,{startTime:0,endTime:10,maxIntervalSeconds:2},{startTime:0,endTime:1,maxIntervalSeconds:.01}]){
  const m=model();m.send({type:'monitor.policy',policy:{...m.state.monitor.policy,nativeProgressTimeoutMs:1000}});m.start();
  for(let now=0;now<=6000;now+=500)m.sample(now,{native:{eligible:true,time:now/1000,rate:1,frames:4},timing});
  assert.equal(m.state.monitor.fault?.reason,timing?.endTime===10?'video':undefined);
 }
});
test('Hybrid inactivity requires four checks and a selected video with software decoder',()=>{
 for(const interruption of [{hasVideo:false},{softwareDecoder:false},{hidden:true}]){
  const m=model('hybrid');m.start();m.sample(undefined);m.sample(undefined);m.sample(undefined,interruption);
  for(let i=0;i<3;i++)m.sample(undefined);assert.equal(m.state.monitor.fault,null);m.sample(undefined);assert.equal(m.state.monitor.fault.reason,'hybrid');
 }
});
test('source replacement, close and operation retirement reject old monitor samples',()=>{
 for(const kind of ['replace','close','retire','destroy']){const m=model();m.start();const id=m.state.monitor.current.id,session=m.state.source.acceptedSession,epoch=m.state.operations.epoch;
  if(kind==='replace')m.accept('hybrid',true);else m.send(kind==='close'?{type:'source.clear'}:{type:'operation.retire',terminal:kind==='destroy'});
  assert.equal(m.state.monitor.current,null);assert.equal(m.sample(10000,{id,session,epoch}).accepted,false);assert.equal(m.state.monitor.fault,null);
 }
});
test('an activity change during sampling rejects the stale observation',()=>{
 const m=model();m.start();const activity=m.state.monitor.activity;m.send({type:'monitor.activity'});assert.equal(m.sample(0,{activity}).accepted,false);assert.equal(m.state.monitor.current.progress.previous,null);
});
function physical(t,mode='native'){
 const p=unitPlayer(),timers=[],cleared=[];
 p.dispatchControl({type:'monitor.policy',policy:initialPlayerControl().monitor.policy});
 const attempt=p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode,preserve:false,planId:'fixture'}).id;
 for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])p.dispatchControl({type,attempt});
 p.dispatchControl({type:'source.accept',attempt,operationEpoch:p.operationEpoch,settings:{...p.settings,pause:false},planMatches:true});p.dispatchControl({type:'source.finished',attempt});
 const backend={properties:new Map(),diagnostics:{decoder:'software'},pause:async()=>{},destroy:async()=>{},nativeProgressSample:()=>({eligible:true,time:1,rate:1})};
 p.current={backend,surface:{remove(){}}};p.source={kind:'local',file:new ArrayBuffer(1)};
 t.mock.method(globalThis,'setInterval',(callback,delay)=>{const handle={callback,delay};timers.push(handle);return handle;});t.mock.method(globalThis,'clearInterval',timer=>{if(timer)cleared.push(timer);});
 // Retain the production lifecycle even though the ordinary helper silences it.
 p.startWatchdogs=()=>Player.prototype.startWatchdogs.call(p);p.stopWatchdogs=()=>Player.prototype.stopWatchdogs.call(p);
 t.after(()=>p.destroy());return{p,backend,timers,cleared};
}
test('actual timer uses one physical handle and late callback cannot restart retired monitoring',async t=>{
 const {p,timers,cleared}=physical(t);p.startWatchdogs();p.startWatchdogs();assert.equal(timers.length,1);assert.equal(timers[0].delay,500);
 const old=timers[0];p.stopWatchdogs();assert.deepEqual(cleared,[old]);old.callback();assert.equal(p.control.monitor.current,null);assert.equal(p.control.monitor.fault,null);
});
for(const throwing of [false,true])test('same-lease timer acquisition reentry preserves nested handle'+(throwing?' when outer acquisition throws':''),async t=>{
 const {p,timers,cleared}=physical(t);let nested=false;
 t.mock.method(globalThis,'setInterval',(callback,delay)=>{
  const timer={callback,delay};timers.push(timer);
  if(!nested){nested=true;p.startWatchdogs();if(throwing)throw Error('outer acquisition failed');}
  return timer;
 });
 if(throwing)assert.throws(()=>p.startWatchdogs(),/outer acquisition failed/);else p.startWatchdogs();
 assert.equal(p.monitor,timers[1]);assert.equal(p.control.monitor.current.id,p.monitorHandleId);
 assert.deepEqual(cleared,throwing?[]:[timers[0]]);p.stopWatchdogs();assert.equal(cleared.at(-1),timers[1]);
});
test('same-lease timer cleanup reentry cannot overwrite the replacement physical handle',async t=>{
 const {p,timers,cleared}=physical(t);p.startWatchdogs();const old=timers[0];
 p.dispatchControl({type:'monitor.policy',policy:p.watchdogs});let nested=false;
 t.mock.method(globalThis,'clearInterval',timer=>{if(timer)cleared.push(timer);if(timer===old&&!nested){nested=true;p.startWatchdogs();}});
 p.startWatchdogs();assert.equal(timers.length,2);assert.equal(p.monitor,timers[1]);assert.equal(p.control.monitor.current.id,p.monitorHandleId);
 assert.deepEqual(cleared,[old]);p.stopWatchdogs();assert.deepEqual(cleared,[old,timers[1]]);
});
test('sampling copies backend observations and source retirement during sampling cannot emit failure',async t=>{
 const {p,backend,timers}=physical(t),sample={eligible:true,time:1,rate:1,frames:10};let errors=0,closing;p.addEventListener('error',()=>errors++);
 backend.nativeProgressSample=()=>sample;p.startWatchdogs();timers[0].callback();assert.equal(sample.frames,10);assert.equal(Object.isFrozen(sample),false);
 backend.nativeProgressSample=()=>{closing=p.close();return sample;};timers[0].callback();await closing;assert.equal(errors,0);assert.equal(p.control.monitor.current,null);
});
test('Hybrid fault is reported once and terminal pause reentry cannot emit a retired error',async t=>{
 const {p,backend,timers}=physical(t,'hybrid');backend.properties.set('track-list',[{type:'video',selected:true}]);p.automatic=false;
 let errors=0,closing;backend.pause=async()=>{closing=p.close();};p.addEventListener('error',()=>errors++);p.startWatchdogs();assert.equal(timers[0].delay,250);
 for(let i=0;i<4;i++)timers[0].callback();await closing;timers[0].callback();assert.equal(errors,0);assert.equal(p.control.monitor.current,null);
});
test('policy callbacks cannot apply an older policy to a candidate after reentrant replacement',async t=>{
 const {p,backend}=physical(t);const applied=[];p.candidate={backend:{setWatchdogs:policy=>applied.push(policy),destroy:async()=>{}},surface:{remove(){}}};let once=false;
 backend.setWatchdogs=()=>{if(!once){once=true;p.setWatchdogs(false);}};p.setWatchdogs(true);assert.equal(p.watchdogs.nativeProgress,false);assert.equal(applied.length,1);assert.equal(applied[0].nativeProgress,false);assert.equal(p.control.monitor.current,null);
});

for(const automatic of [false,true])test(`Hybrid watchdog ${automatic?'recovers automatic':'pauses pinned'} playback exactly once`,async t=>{
 const {p,backend,timers}=physical(t,'hybrid');backend.properties.set('track-list',[{type:'video',selected:true}]);p.automatic=automatic;
 let pauses=0,recoveries=0,errors=0;backend.pause=async()=>{pauses++;};p.recover=session=>{assert.equal(session,p.current);recoveries++;};p.addEventListener('error',()=>errors++);
 p.startWatchdogs();for(let i=0;i<5;i++)timers[0].callback();await Promise.resolve();
 assert.equal(recoveries,automatic?1:0);assert.equal(pauses,automatic?0:1);assert.equal(errors,automatic?0:1);
 assert.equal(p.settings.pause,!automatic);assert.equal(p.control.monitor.current,null);
});
