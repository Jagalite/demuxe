// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recoveryRoute} from '../../web/generated/internal/machine/route-recovery.js';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {PlayerError} from '../../web/generated/internal/errors.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
const tick=()=>new Promise(setImmediate);
function model(){let state=initialPlayerControl();return {get state(){return state;},send(input){const before=state,encoded=JSON.stringify(before),decision=transitionPlayer(state,input);state=decision.state;assert.equal(JSON.stringify(before),encoded);return decision;},accept(preserve=false,mode='native'){
 const attempt=this.send({type:'source.begin',operationEpoch:state.operations.epoch,preserve,mode,planId:'fixture'}).id;
 for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])this.send({type,attempt});
 this.send({type:'source.accept',attempt,operationEpoch:state.operations.epoch,settings:state.settings,planMatches:true});this.send({type:'source.finished',attempt});return state.source.acceptedSession;
 },recover(session=state.source.acceptedSession){return this.send({type:'routing.recovery',change:{kind:'begin',epoch:state.operations.epoch,session}});},finish(id=state.routing.recovery.pending.id){return this.send({type:'routing.recovery',change:{kind:'finished',id}});}};}
function install(p,{mode='native',error=new PlayerError('DECODE_FAILED','decoder failed'),source={kind:'local',file:new ArrayBuffer(1)}}={}){
 const m=model();m.accept(false,mode);p.control=m.state;
 const session={backend:{properties:new Map(),diagnostics:{plan:'direct'},pause:async()=>{},destroy:async()=>{}},surface:{remove(){}},error};p.current=session;p.source=source;p.evidence=()=>({});return session;
}
test('one recovery lease belongs to the accepted session and repeated requests remain one shot',()=>{
 const m=model();assert.equal(m.recover(1).accepted,false);const first=m.accept();assert.equal(m.recover(first).accepted,true);const id=m.state.routing.recovery.pending.id;
 assert.equal(m.recover(first).accepted,false);m.finish();assert.equal(m.recover(first).accepted,false);
 const next=m.accept(true,'hybrid');assert.equal(m.recover(first).accepted,false);assert.equal(m.recover(next).accepted,true);assert.equal(m.finish(id).accepted,false);assert.equal(m.state.routing.recovery.pending.session,next);
});
test('terminal, retired, manual and Software sessions cannot begin automatic recovery',()=>{
 for(const condition of ['terminal','retired','manual','software']){
  const m=model(),session=m.accept(false,condition==='software'?'software':'native');
  if(condition==='terminal'||condition==='retired')m.send({type:'operation.retire',terminal:condition==='terminal'});
  if(condition==='manual')m.send({type:'source.configure',automatic:false});assert.equal(m.recover(session).accepted,false);
 }
});
test('source and operation retirement reject stale recovery completion without clearing a successor',()=>{
 for(const clear of [true,false]){const m=model();m.accept();m.recover();const old=m.state.routing.recovery.pending.id;
  m.send(clear?{type:'source.clear'}:{type:'operation.retire',terminal:false});assert.equal(m.state.routing.recovery.pending,null);
  m.accept();m.recover();const pending=m.state.routing.recovery.pending;assert.equal(m.finish(old).accepted,false);assert.equal(m.state.routing.recovery.pending,pending);
 }
});
test('streaming failures are bounded accepted-source metadata retained only across preserving handoffs',()=>{
 const m=model(),session=m.accept(),source=m.state.source.serial;
 const reject=(plan,extra={})=>m.send({type:'routing.recovery',change:{kind:'streaming.failed',session,source,plan,...extra}});
 assert.equal(reject('native-direct',{session:session+1}).accepted,false);reject('native-direct');assert.equal(reject('native-direct').accepted,true);
 for(let i=0;i<140;i++)reject('fixture-'+i);assert.equal(m.state.routing.recovery.failedStreaming.plans.length,128);assert.equal(m.state.routing.recovery.failedStreaming.plans[0],'fixture-12');
 const saved=m.state.routing.recovery.failedStreaming;m.accept(true);assert.equal(m.state.routing.recovery.failedStreaming,saved);assert.equal(reject('late').accepted,false);
 m.accept(false);assert.equal(m.state.routing.recovery.failedStreaming,null);
});
test('recovery routes preserve direct versus subtitle-direct and explicit never semantics',()=>{
 for(const trigger of ['runtime','play'])for(const nativeRemux of ['auto','never','always'])for(const backendPlan of ['direct','direct-mpv','remux'])for(const streaming of [false,true]){
  const route=recoveryRoute({mode:'native',backendPlan,nativeRemux,streaming,trigger});assert.equal(route.start,0);
  const remux=!streaming&&nativeRemux!=='never'&&(backendPlan==='direct'||trigger==='play'&&backendPlan==='direct-mpv');assert.deepEqual(route.requirements,remux?{nativeRemux:'always'}:{});
 }
 assert.deepEqual(recoveryRoute({mode:'hybrid',backendPlan:undefined,nativeRemux:'auto',streaming:false,trigger:'runtime'}),{start:2,requirements:{}});
 assert.equal(recoveryRoute({mode:'hybrid',backendPlan:undefined,nativeRemux:'auto',streaming:true,trigger:'runtime'}).start,0);
});
test('real recovery retries once with explicit remux requirements and stable configured policy',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const session=install(p);p.nativeRemux='auto';const calls=[];p.select=async(...args)=>{assert.equal(p.nativeRemux,'auto');calls.push(args);};
 p.recover(session);assert.equal(p.recovering,true);p.recover(session);await p.queue;await tick();assert.equal(p.recovering,false);assert.equal(calls.length,1);assert.equal(calls[0][4],0);assert.deepEqual(calls[0][8],{nativeRemux:'always'});
 p.recover(session);await p.queue;assert.equal(calls.length,1);assert.equal(p.nativeRemux,'auto');
});
test('terminal recovery error pauses and emits only once after releasing recovery ownership',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const session=install(p,{error:new PlayerError('SOURCE_PERMISSION','denied')});let paused=0,errors=0;session.backend.pause=async()=>{paused++;};p.select=async()=>assert.fail('terminal failure must not fall through');
 p.addEventListener('error',()=>{errors++;assert.equal(p.recovering,false);p.recover(session);});p.recover(session);await tick();assert.equal(paused,1);assert.equal(errors,1);assert.equal(p.recovering,false);
});
test('retirement during physical pause rejects recovery before any candidate selection',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const session=install(p);let resolve,began;const started=new Promise(r=>began=r);session.backend.pause=()=>new Promise(r=>{resolve=r;began();});let selected=0;p.select=async()=>{selected++;};
 p.recover(session);await started;const closing=p.close();resolve();await closing;await tick();assert.equal(selected,0);assert.equal(p.recovering,false);assert.equal(p.source,undefined);
});
test('evidence callback retirement cannot repopulate capability or enqueue a stale recovery',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const session=install(p);p.runtimeCapabilities.begin(p.source,[{id:'native-direct',eligible:true}]);let closing,selected=0;p.select=async()=>{selected++;};p.evidence=()=>{closing=p.close();return {outputVerified:true};};
 p.recover(session);await closing;await tick();assert.equal(selected,0);assert.deepEqual(p.runtimeCapabilities.snapshot(),[]);assert.equal(p.recovering,false);
});
test('explicit discovery requirements reach admission and replacement without changing configuration',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());install(p);p.nativeRemux='auto';const seen=[];
 p.admissible=(_source,_settings,_attachments,_tracks,_reason,_automatic,requirements)=>{seen.push(requirements);assert.equal(p.nativeRemux,'auto');return [{id:'native-remux',mode:'native',eligible:true}];};
 p.replace=async(...args)=>{seen.push(args[9]);assert.equal(p.nativeRemux,'auto');};p.inspectForQualifiedWebGPU=async()=>{};
 p.current.error=undefined;await p.discover(p.source,p.settings,true,[],undefined,true,undefined,0,{nativeRemux:'always'});assert.ok(seen.length>=2);assert.ok(seen.every(requirements=>requirements?.nativeRemux==='always'));assert.equal(p.nativeRemux,'auto');
});

test('terminal pause reentry suppresses the retired session error',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const session=install(p,{error:new PlayerError('SOURCE_PERMISSION','denied')});let closing,errors=0;
 session.backend.pause=async()=>{closing=p.close();};p.addEventListener('error',()=>errors++);p.recover(session);await closing;await tick();assert.equal(errors,0);assert.equal(p.recovering,false);
});
