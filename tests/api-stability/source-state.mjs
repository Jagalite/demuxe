// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer,sessionAuthority} from '../../web/generated/internal/machine/transition.js';
import {sourceDesiredSettings} from '../../web/generated/internal/machine/source.js';
const phases=['source.created','source.configured','source.opened','source.applied','source.positioned'];
function fixture(){let state=initialPlayerControl();return{get state(){return state;},send(input){const old=state,bytes=JSON.stringify(old),result=transitionPlayer(state,input);state=result.state;assert.equal(JSON.stringify(old),bytes);return result;},begin(preserve=false,mode='native'){return this.send({type:'source.begin',operationEpoch:state.operations.epoch,mode,preserve,planId:'fixture'}).id;},prepare(attempt){for(const type of phases)assert.equal(this.send({type,attempt}).accepted,true);},accept(attempt,settings={...state.settings,pause:false}){return this.send({type:'source.accept',attempt,operationEpoch:state.operations.epoch,settings,planMatches:true});}};}
test('source acceptance atomically installs mode, source identity, settings and reset observations',()=>{
  const r=fixture(),attempt=r.begin(false,'software');r.send({type:'playback.observed',playing:true,waiting:true});r.prepare(attempt);
  assert.equal(r.state.source.serial,0);assert.equal(r.state.source.mode,'native');assert.equal(r.state.settings.pause,true);
  const previous=r.state;r.accept(attempt,{...r.state.settings,pause:false,volume:35});
  assert.equal(r.state.source.serial,1);assert.equal(r.state.source.mode,'software');assert.equal(r.state.settings.volume,35);assert.equal(r.state.settings.pause,false);
  assert.equal(r.state.playback.observedPlaying,false);assert.equal(r.state.playback.observedWaiting,false);assert.equal(previous.settings.volume,100);
});
test('same source replacement advances session identity while retaining public source identity',()=>{
  const r=fixture(),first=r.begin();r.prepare(first);r.accept(first);r.send({type:'source.finished',attempt:first});const original=r.state.source;
  const next=r.begin(true,'hybrid');r.prepare(next);r.accept(next);assert.equal(r.state.source.serial,original.serial);assert.ok(r.state.source.acceptedSession>original.acceptedSession);
});
for(const at of [0,1,2,3,4,5])test(`retirement at candidate phase ${at} cannot accept stale settings or source`,()=>{
  const r=fixture(),attempt=r.begin();for(const type of phases.slice(0,at))r.send({type,attempt});
  r.send({type:'operation.retire',terminal:false});for(const type of phases.slice(at))assert.equal(r.send({type,attempt}).accepted,false);
  const before=r.state;assert.equal(r.accept(attempt).accepted,false);assert.equal(r.state,before);assert.equal(r.state.source.serial,0);assert.equal(r.state.settings.pause,true);
  r.send({type:'source.finished',attempt});const replacement=r.begin();r.prepare(replacement);assert.equal(r.accept(replacement).accepted,true);
});
test('duplicate, out-of-order, failed-plan and stale candidate completions cannot commit',()=>{
  const r=fixture(),a=r.begin();assert.equal(r.send({type:'source.opened',attempt:a}).reason,'phase');assert.equal(r.accept(a).reason,'phase');
  r.prepare(a);assert.equal(r.send({type:'source.accept',attempt:a,operationEpoch:0,settings:r.state.settings,planMatches:false}).reason,'plan');
  r.send({type:'source.finished',attempt:a});const b=r.begin();assert.equal(r.send({type:'source.finished',attempt:a}).accepted,false);assert.equal(r.state.source.candidate.id,b);
  r.prepare(b);r.accept(b);const serial=r.state.source.serial;assert.equal(r.accept(b).accepted,false);assert.equal(r.state.source.serial,serial);
});
test('close clears accepted source and source selections while preserving player settings and monotonic identities',()=>{
  const r=fixture(),a=r.begin();r.prepare(a);r.accept(a,{...r.state.settings,pause:false,aid:'3',sid:'2',volume:50,speed:2,vf:'format=yuv420p'});r.send({type:'source.clear'});
  assert.equal(r.state.source.acceptedSession,null);assert.equal(r.state.source.serial,1);assert.equal(r.state.settings.pause,true);assert.equal(r.state.settings.aid,'auto');assert.equal(r.state.settings.sid,'auto');assert.equal(r.state.settings.volume,50);assert.equal(r.state.settings.speed,2);assert.equal(r.state.settings.vf,'format=yuv420p');
  r.send({type:'operation.retire',terminal:true});assert.equal(r.begin(),undefined);assert.equal(r.state.source.serial,1);
});
test('desired source settings preserve intent only on handoff and reset incompatible numeric track selections',()=>{
  const settings={...initialPlayerControl().settings,pause:false,aid:'4',sid:'2'};
  for(const preserve of [false,true])for(const previousSession of [false,true])for(const previousMode of ['native','hybrid','software'])for(const mode of ['native','hybrid','software']){
    const next=sourceDesiredSettings(settings,{preserve,previousPause:false,previousSession,previousMode,mode});
    assert.equal(next.pause,!preserve);const reset=!preserve&&previousSession||preserve&&(mode==='native')!==(previousMode==='native');
    assert.equal(next.aid,reset?'auto':'4');assert.equal(next.sid,reset?'auto':'2');assert.equal(settings.aid,'4');
  }
});

test('backend observations retain emitter session identity and reject duplicates, stale sessions and terminal output',()=>{
  const r=fixture(),a=r.begin();r.prepare(a);r.accept(a);r.send({type:'source.finished',attempt:a});const session=r.state.source.acceptedSession;
  r.send({type:'playback.sample',session,sequence:2,observation:'playing'});assert.equal(r.state.playback.observedPlaying,true);
  const before=r.state;r.send({type:'playback.sample',session,sequence:1,observation:'waiting'});assert.equal(r.state,before);
  const b=r.begin(true,'hybrid');r.prepare(b);r.accept(b);r.send({type:'source.finished',attempt:b});
  r.send({type:'playback.sample',session,sequence:99,observation:'playing'});assert.equal(r.state.playback.observedPlaying,false);
  r.send({type:'playback.sample',session:r.state.source.acceptedSession,sequence:1,observation:'playing'});assert.equal(r.state.playback.observedPlaying,true);
  r.send({type:'operation.retire',terminal:true});const terminal=r.state;r.send({type:'playback.sample',session:r.state.source.acceptedSession,sequence:2,observation:'waiting'});assert.equal(r.state,terminal);
});

test('close retires accepted observations immediately, before physical source cleanup settles',()=>{
  const r=fixture(),a=r.begin();r.prepare(a);r.accept(a);r.send({type:'source.finished',attempt:a});const session=r.state.source.acceptedSession;
  r.send({type:'operation.retire',terminal:false});const closing=r.state;
  r.send({type:'playback.sample',session,sequence:10,observation:'waiting'});assert.equal(r.state,closing);
  r.send({type:'source.clear'});const b=r.begin();r.prepare(b);r.accept(b);r.send({type:'source.finished',attempt:b});
  r.send({type:'playback.sample',session:r.state.source.acceptedSession,sequence:1,observation:'playing'});assert.equal(r.state.playback.observedPlaying,true);
});

test('session authority fences late errors/recovery from retired owners while retaining candidate error collection',()=>{
 const r=fixture(),a=r.begin(),candidate=r.state.source.candidate.session;
 assert.equal(sessionAuthority(r.state,candidate),'candidate');r.prepare(a);r.accept(a);assert.equal(sessionAuthority(r.state,candidate),'accepted');
 r.send({type:'source.finished',attempt:a});const b=r.begin(true),next=r.state.source.candidate.session;
 assert.equal(sessionAuthority(r.state,candidate),'accepted');assert.equal(sessionAuthority(r.state,next),'candidate');
 r.send({type:'operation.retire',terminal:false});assert.equal(sessionAuthority(r.state,candidate),'retired');assert.equal(sessionAuthority(r.state,next),'retired');
});

test('close in an acceptance observer suppresses late ready events after old-session cleanup',{timeout:5000},async()=>{
 const {unitPlayer}=await import('../helpers/unit-player.mjs');const {acceptSourceIdentity}=await import('../helpers/player-control.mjs');
 const p=unitPlayer(),surface=()=>({style:{display:'none'},remove(){}}),events=[];let releaseOld,closing,accepted;
 const acceptedSignal=new Promise(resolve=>accepted=resolve),oldCleanup=new Promise(resolve=>releaseOld=resolve);
 const old={surface:surface(),backend:{properties:new Map(),pause:async()=>{},destroy:()=>oldCleanup}};
 const backend={ready:Promise.resolve(),properties:new Map([['duration',20]]),diagnostics:{plan:'direct'},gain:async()=>{},volume:async()=>{},rate:async()=>{},open:async()=>{},selectTrack:async()=>{},subtitleVisible:async()=>{},destroy:async()=>{}};
 const candidate={backend,surface:surface()},source={kind:'local',file:new File(['media'],'movie.mp4')};
 p.current=old;p.source={kind:'local',file:new File(['old'],'old.mp4')};acceptSourceIdentity(p,1);
 p.create=async()=>candidate;p.settled=async()=>{};p.admissible=()=>[{id:'native-direct',mode:'native',eligible:true}];
 p.publish=()=>{if(p.current===candidate&&!closing){closing=p.close();accepted();}};
 p.addEventListener('mpv',event=>events.push(event.detail.event));p.addEventListener('modechange',event=>events.push(event.detail.phase));
 const opening=p.enqueue(()=>p.replace(source,'native',p.settings,false,[],undefined,false,'native-direct'),'opening');
 const rejected=assert.rejects(opening,{code:'ABORTED'});await acceptedSignal;
 assert.equal(candidate.surface.style.display,'none');releaseOld();await rejected;await closing;
 assert.equal(events.includes('file-loaded'),false);assert.equal(events.includes('ready'),false);assert.equal(p.current,undefined);
});

for(const at of [0,1,2,3,4])test(`caller cancellation rejects forward candidate effects at phase ${at}`,()=>{
 const r=fixture(),op=r.send({type:'operation.admit',kind:'opening'}).id;r.send({type:'operation.start',id:op});
 const attempt=r.begin();for(const type of phases.slice(0,at))r.send({type,attempt});r.send({type:'operation.cancel',id:op});
 const retired=r.state;assert.equal(r.send({type:phases[at],attempt}).accepted,false);assert.equal(r.state,retired);
 assert.equal(r.send({type:'source.finished',attempt}).accepted,true,'retirement still permits cleanup bookkeeping');
});

test('an error observer can close without forwarding the retired backend event',{timeout:5000},async()=>{
 const {unitPlayer}=await import('../helpers/unit-player.mjs');const {acceptSourceIdentity}=await import('../helpers/player-control.mjs');
 const p=unitPlayer(),backend=new EventTarget(),events=[];let closing;
 Object.assign(backend,{properties:new Map(),diagnostics:{plan:'software'},destroy:async()=>{}});
 const session={backend,surface:{remove(){}}};p.current=session;p.source={kind:'local',file:new File(['media'],'movie.mp4')};p.automatic=false;acceptSourceIdentity(p,1);
 p.observeBackend(session,p.control.source.acceptedSession);
 p.addEventListener('error',()=>{events.push('error');closing=p.close();});p.addEventListener('mpv',()=>events.push('mpv'));
 backend.dispatchEvent(new CustomEvent('mpv',{detail:{event:'end-file',reason:'error',file_error:'controlled decode failure'}}));
 assert.deepEqual(events,['error']);await closing;
 backend.dispatchEvent(new CustomEvent('error',{detail:new Error('late failure')}));assert.deepEqual(events,['error']);
});

test('cancel during candidate configuration prevents starting source I/O',{timeout:5000},async()=>{
 const {unitPlayer}=await import('../helpers/unit-player.mjs');const p=unitPlayer(),caller=new AbortController();let opens=0;
 const backend={ready:Promise.resolve(),properties:new Map(),diagnostics:{plan:'direct'},gain:async()=>{caller.abort();},volume:async()=>{},rate:async()=>{},open:async()=>{opens++;},selectTrack:async()=>{},subtitleVisible:async()=>{},destroy:async()=>{}};
 p.create=async()=>({backend,surface:{style:{},remove(){}}});p.admissible=()=>[{id:'native-direct',mode:'native',eligible:true}];
 const source={kind:'local',file:new File(['media'],'movie.mp4')};
 await assert.rejects(p.enqueue(()=>p.replace(source,'native',p.settings,false,[],undefined,false,'native-direct'),'opening',caller.signal),{code:'ABORTED'});
 assert.equal(opens,0);await p.queue;assert.equal(p.queued,0);assert.equal(p.sourceSerial,0);
});
