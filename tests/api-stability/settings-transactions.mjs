// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';

function core(){let state=initialPlayerControl();return{get state(){return state;},send(input){const old=state,text=JSON.stringify(old),decision=transitionPlayer(state,input);state=decision.state;assert.equal(JSON.stringify(old),text);return decision;},start(){const id=this.send({type:'operation.admit',kind:null}).id;this.send({type:'operation.start',id});return id;}};}
const commands=[
  [{kind:'volume',value:40},s=>s.settings.volume,100,40,{kind:'volume',value:100}],
  [{kind:'mute',value:true},s=>s.preferences.muted,false,true,{kind:'volume',value:100}],
  [{kind:'rate',value:1.5},s=>s.settings.speed,1,1.5,{kind:'rate',value:1}],
  [{kind:'gain',value:.5},s=>s.settings.gain,1,.5,{kind:'gain',value:1}],
  [{kind:'track',track:'audio',value:'3'},s=>s.settings.aid,'auto','3',{kind:'track',track:'audio',value:'auto'}],
  [{kind:'subtitles',value:false},s=>s.settings.subtitles,true,false,{kind:'subtitles',value:true}],
  [{kind:'output',value:'speakers'},s=>s.preferences.outputDeviceId,'','speakers',{kind:'output',value:''}],
  [{kind:'buffering',value:{preload:'metadata',profile:'low-latency'}},s=>s.preferences.buffering.profile,'balanced','low-latency',{kind:'buffering',value:{preload:'auto',profile:'balanced'}}],
  [{kind:'quality',value:{mode:'manual',id:'720'},previous:{mode:'auto'}},s=>s.preferences.qualityPolicy,null,{mode:'manual',id:'720'},{kind:'quality',value:{mode:'auto'}}],
];
for(const [command,select,before,after,rollback] of commands)test(`${command.kind}: pending, acceptance, failed compensation and retirement histories`,()=>{
  for(const outcome of ['accept','restored','degraded','close','cancel','finish']){
    const r=core(),op=r.start(),id=r.send({type:'setting.begin',command,hasBackend:true}).id;
    assert.deepEqual(select(r.state),before,'request changed accepted value');
    assert.ok(Object.isFrozen(r.state.settingsTransactions.pending));
    if(outcome==='accept'){assert.equal(r.send({type:'setting.accept',id}).accepted,true);assert.deepEqual(select(r.state),after);}
    else if(outcome==='restored'||outcome==='degraded'){
      assert.deepEqual(r.send({type:'setting.failed',id}).effects,[rollback]);
      assert.equal(r.send({type:'setting.accept',id}).accepted,false,'failed update accepted while compensation was pending');
      r.send({type:`setting.${outcome}`,id});assert.deepEqual(select(r.state),before);assert.equal(!!r.state.settingsTransactions.degraded,outcome==='degraded');
    }else{
      r.send(outcome==='close'?{type:'operation.retire',terminal:false}:{type:`operation.${outcome}`,id:op});
      const retired=r.state;assert.equal(r.send({type:'setting.accept',id}).accepted,false);assert.equal(r.send({type:'setting.failed',id}).accepted,false);assert.equal(r.state,retired);assert.deepEqual(select(r.state),before);
    }
    assert.equal(r.state.settingsTransactions.pending,null);assert.equal(r.send({type:'setting.accept',id}).accepted,false,'duplicate outcome');
  }
});
test('muted volume changes preserve the logical volume and compensate the actual zero output',()=>{
  const r=core();r.start();r.send({type:'preferences.change',value:{muted:true}});
  const begun=r.send({type:'setting.begin',command:{kind:'volume',value:25},hasBackend:true});
  assert.deepEqual(begun.effects,[{kind:'volume',value:0}]);assert.deepEqual(r.send({type:'setting.failed',id:begun.id}).effects,[{kind:'volume',value:0}]);
  r.send({type:'setting.restored',id:begun.id});assert.equal(r.state.settings.volume,100);assert.equal(r.state.preferences.muted,true);
});
test('settings capture caller data and source acceptance resets only source preferences atomically',()=>{
  const r=core();r.start();const range={start:1,end:5},style={fontSize:24},buffering={preload:'metadata',profile:'low-latency'};
  r.send({type:'preferences.change',value:{playbackRange:range,loopPolicy:range,qualityPolicy:{mode:'auto',maxHeight:720},subtitleStyle:style,muted:true,outputDeviceId:'sink'}});
  const request=r.send({type:'setting.begin',command:{kind:'buffering',value:buffering},hasBackend:true});
  range.end=99;style.fontSize=90;buffering.profile='resilient';
  assert.equal(r.state.preferences.playbackRange.end,5);assert.equal(r.state.preferences.subtitleStyle.fontSize,24);
  r.send({type:'setting.accept',id:request.id});assert.equal(r.state.preferences.buffering.profile,'low-latency');
  r.send({type:'source.clear'});assert.equal(r.state.preferences.playbackRange,null);assert.equal(r.state.preferences.loopPolicy,false);assert.equal(r.state.preferences.qualityPolicy,null);
  assert.equal(r.state.preferences.muted,true);assert.equal(r.state.preferences.outputDeviceId,'sink');assert.equal(r.state.preferences.subtitleStyle.fontSize,24);
});
test('a retired transaction outcome cannot accept or clear its queued successor',()=>{
  const r=core(),first=r.start(),old=r.send({type:'setting.begin',command:{kind:'volume',value:25},hasBackend:true}).id;
  r.send({type:'operation.cancel',id:first});r.send({type:'operation.finish',id:first});r.send({type:'operation.release',id:first});r.start();
  const next=r.send({type:'setting.begin',command:{kind:'volume',value:70},hasBackend:true}).id;
  for(const type of ['setting.accept','setting.failed','setting.restored','setting.degraded'])assert.equal(r.send({type,id:old}).accepted,false);
  assert.equal(r.state.settingsTransactions.pending.id,next);r.send({type:'setting.accept',id:next});assert.equal(r.state.settings.volume,70);
});
test('pause compensation follows previously accepted intent, not an unverified request',()=>{
  const r=core();r.start();r.send({type:'settings.change',value:{pause:false}});
  const id=r.send({type:'setting.begin',command:{kind:'pause'},hasBackend:true}).id;
  assert.equal(r.state.settings.pause,false);assert.deepEqual(r.send({type:'setting.failed',id}).effects,[{kind:'play'}]);r.send({type:'setting.restored',id});assert.equal(r.state.settings.pause,false);
});
test('track acceptance includes verification and restoration verifies the original selection',()=>{
  const r=core();r.start();r.send({type:'settings.change',value:{aid:'1'}});
  const begin=r.send({type:'setting.begin',command:{kind:'track',track:'audio',value:'2',verify:true},hasBackend:true});
  assert.deepEqual(begin.effects.map(effect=>[effect.kind,effect.value]),[['track','2'],['track.verify','2']]);assert.equal(begin.effects[1].settings.aid,'2');
  const failure=r.send({type:'setting.failed',id:begin.id});assert.deepEqual(failure.effects.map(effect=>[effect.kind,effect.value]),[['track','1'],['track.verify','1']]);assert.equal(failure.effects[1].settings.aid,'1');
});
test('candidate timing is private until atomic source acceptance and survives same-source cleanup',()=>{
  const r=core();r.start();const begun=r.send({type:'setting.begin',command:{kind:'subtitleDelay',value:2},hasBackend:true,hasSource:true});
  assert.equal(r.state.preferences.subtitleDelay,0);assert.equal(r.state.settingsTransactions.pending.preferences.subtitleDelay,2);
  const attempt=r.send({type:'source.begin',operationEpoch:r.state.operations.epoch,mode:'software',preserve:true,planId:'fixture'}).id;
  for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])r.send({type,attempt});
  r.send({type:'source.accept',attempt,operationEpoch:r.state.operations.epoch,settings:{...r.state.settings,aid:'7'},planMatches:true});
  assert.equal(r.state.preferences.subtitleDelay,2);assert.equal(r.state.settings.aid,'7');assert.equal(r.state.settingsTransactions.pending.phase,'accepted');
  assert.equal(r.send({type:'setting.failed',id:begun.id}).accepted,false,'accepted source cannot roll back for a late cleanup error');
  r.send({type:'settings.change',value:{pause:true,volume:60}});r.send({type:'preferences.change',value:{muted:true}});
  r.send({type:'source.finished',attempt});assert.equal(r.send({type:'setting.accept',id:begun.id}).accepted,true);assert.equal(r.state.settings.aid,'7');assert.equal(r.state.settings.volume,60);assert.equal(r.state.preferences.muted,true);assert.equal(r.state.settingsTransactions.pending,null);
});
test('direct setting acceptance merges only its owned values with later accepted observations',()=>{
  const r=core();r.start();r.send({type:'settings.change',value:{pause:false}});
  const id=r.send({type:'setting.begin',command:{kind:'volume',value:25},hasBackend:true}).id;
  r.send({type:'settings.change',value:{pause:true,speed:1.5}});r.send({type:'preferences.change',value:{muted:true}});r.send({type:'setting.accept',id});
  assert.equal(r.state.settings.volume,25);assert.equal(r.state.settings.pause,true);assert.equal(r.state.settings.speed,1.5);assert.equal(r.state.preferences.muted,true);
});

function adapter(t){
  const p=unitPlayer(),backend=new EventTarget(),calls=[];
  Object.assign(backend,{properties:new Map(),diagnostics:{plan:'direct'},pause:async()=>{},play:async()=>{},volume:async value=>calls.push(['volume',value]),rate:async value=>calls.push(['rate',value]),gain:async value=>calls.push(['gain',value]),setBuffering:async value=>calls.push(['buffering',value]),destroy:async()=>{}});
  p.current={backend,surface:{remove(){}}};p.source={kind:'local',file:new Blob()};acceptSourceIdentity(p,1);
  t.after(()=>p.destroy());return{p,backend,calls};
}
for(const method of ['volume','rate','setMuted','setBuffering'])test(`actual ${method} completion after close cannot change retained preferences`,{timeout:5000},async t=>{
  const {p,backend}=adapter(t);let complete,started;const ready=new Promise(resolve=>started=resolve);
  backend[method==='setMuted'?'volume':method]=()=>{started();return new Promise(resolve=>complete=resolve);};
  const work=p[method](method==='setMuted'?true:method==='setBuffering'?{profile:'low-latency'}:method==='rate'?1.5:25);const rejected=assert.rejects(work,{code:'ABORTED'});
  await ready;const closing=p.close();complete();await rejected;await closing;
  assert.equal(p.settings.volume,100);assert.equal(p.settings.speed,1);assert.equal(p.muted,false);assert.equal(p.buffering.profile,'balanced');assert.equal(p.control.settingsTransactions.pending,null);
});
test('actual partially applied volume failure compensates before promise rejection',async t=>{
  const {p,backend,calls}=adapter(t);let physical=100;const failure=Error('volume applied then rejected');
  backend.volume=async value=>{physical=value;calls.push(value);if(value===25)throw failure;};
  await assert.rejects(p.volume(25),/volume applied then rejected/);assert.deepEqual(calls,[25,100]);assert.equal(physical,100);assert.equal(p.settings.volume,100);assert.equal(p.control.settingsTransactions.pending,null);
});
test('failed compensation is explicit session degradation and never pretends the old backend value was restored',async t=>{
  const {p,backend}=adapter(t);backend.volume=async()=>{throw Error('device lost');};
  await assert.rejects(p.volume(25),{code:'DECODE_FAILED'});assert.equal(p.settings.volume,100);assert.equal(p.sessionError.scope,'session');assert.equal(p.sessionError.code,'DECODE_FAILED');assert.ok(p.control.settingsTransactions.degraded);
});
test('close during compensation retires its outcome without changing accepted values or latching an obsolete error',{timeout:5000},async t=>{
  const {p,backend}=adapter(t);let started,finish;const ready=new Promise(resolve=>started=resolve);let count=0;
  backend.volume=async()=>{if(++count===1)throw Error('partial update');started();await new Promise(resolve=>finish=resolve);};
  const work=p.volume(25),rejected=assert.rejects(work,{code:'ABORTED'});await ready;const closing=p.close();finish();await rejected;await closing;
  assert.equal(p.settings.volume,100);assert.equal(p.sessionError,null);assert.equal(p.control.settingsTransactions.degraded,null);
});
test('close settles the settings command even when the retired backend never completes',{timeout:5000},async t=>{
  const {p,backend}=adapter(t);let started;const ready=new Promise(resolve=>started=resolve);
  backend.volume=()=>{started();return new Promise(()=>{});};
  const work=p.volume(25),rejected=assert.rejects(work,{code:'ABORTED'});await ready;await p.close();await rejected;await p.queue;
  assert.equal(p.queued,0);assert.equal(p.settings.volume,100);assert.equal(p.control.settingsTransactions.pending,null);
});
test('synchronous backend retirement observes its returned rejection before cancelling the command',async t=>{
  const {p,backend}=adapter(t);let closing;const unhandled=[],capture=error=>unhandled.push(error);
  process.on('unhandledRejection',capture);t.after(()=>process.off('unhandledRejection',capture));
  backend.volume=()=>{closing=p.close();return Promise.reject(Error('late physical failure'));};
  await assert.rejects(p.volume(25),{code:'ABORTED'});await closing;await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(unhandled,[]);assert.equal(p.settings.volume,100);assert.equal(p.control.settingsTransactions.pending,null);
});
test('actual track confirmation failure restores both backend selection and accepted settings',async t=>{
  const {p,backend,calls}=adapter(t);p.updateSettings({aid:'1'});let physical='1';
  backend.selectTrack=async(type,id)=>{physical=id;calls.push(['select',id]);};
  p.confirmTrackSelection=async(session,source,mode,settings,type,id)=>{calls.push(['verify',id]);assert.equal(settings.aid,id);if(id==='2')throw Error('selection failed verification');};
  await assert.rejects(p.enqueue(()=>p.applySetting({kind:'track',track:'audio',value:'2',verify:true})),/selection failed verification/);
  assert.deepEqual(calls,[['select','2'],['verify','2'],['select','1'],['verify','1']]);assert.equal(physical,'1');assert.equal(p.settings.aid,'1');
});
test('actual timing failure never publishes the requested value as accepted',async t=>{
  const {p}=adapter(t);p.select=async()=>{assert.equal(p.getTimingSettings().subtitleDelay,0);assert.equal(p.candidatePreferences.subtitleDelay,3);throw Error('candidate rejected');};
  await assert.rejects(p.setSubtitleDelay(3),/candidate rejected/);assert.equal(p.getTimingSettings().subtitleDelay,0);assert.equal(p.control.settingsTransactions.pending,null);
});
test('no-source timing and style updates accept copied values without creating a backend',async t=>{
  const p=unitPlayer();t.after(()=>p.destroy());const style={fontSize:30};let selects=0;p.select=async()=>{selects++;};
  const work=p.setSubtitleStyle(style);style.fontSize=90;await work;await p.setAudioDelay(-2);
  assert.equal(p.getTimingSettings().subtitleStyle.fontSize,30);assert.equal(p.getTimingSettings().audioDelay,-2);assert.equal(selects,0);
});
test('production transition trace is bounded and omits private setting payloads',async t=>{
  const p=unitPlayer();t.after(()=>p.destroy());
  p.updateSettings({vf:'private-filter-token'});p.updatePreferences({outputDeviceId:'private-output-token'});
  const retained=p.transitionTrace;assert.equal(JSON.stringify(retained).includes('private-filter-token'),false);assert.equal(JSON.stringify(retained).includes('private-output-token'),false);
  const original=JSON.stringify(retained);for(let n=0;n<70;n++)await p.volume(n);
  const trace=p.transitionTrace;assert.equal(trace.entries.length,256);assert.ok(trace.dropped>0);assert.equal(trace.exactExternalReplay,false);assert.equal(JSON.stringify(retained),original);assert.equal(p.settings.volume,69);
});
