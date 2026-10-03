// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from './helpers/unit-player.mjs';
import {StartupEvidenceTimeout} from '../web/generated/internal/runtime-capability.js';
import {PlayerError} from '../web/generated/internal/errors.js';
import {Player} from '../web/generated/unified-player.js';

function fixture() {
 const p=unitPlayer(),calls=[];
 const attempt=p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode:'native',preserve:false,planId:'native-direct'}).id;
 for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])p.dispatchControl({type,attempt});
 p.dispatchControl({type:'source.accept',attempt,operationEpoch:p.operationEpoch,settings:p.settings,planMatches:true});p.dispatchControl({type:'source.finished',attempt});
 const backend={properties:new Map([['time-pos',1]]),diagnostics:{plan:'direct'},
  play:async()=>{calls.push('play');},pause:async()=>{calls.push('pause');},verifyOutput:async()=>{}};
 Object.assign(p,{source:{kind:'local'},current:{backend},nativeRemux:'never',evidence:()=>({outputVerified:true}),acceptEvidence(){}});
 Object.defineProperty(p,'diagnostics',{value:{plan:{id:'native-direct'}}});
 p.select=async()=>assert.fail('Pause must not trigger codec fallback');
 return {p,backend,calls};
}
test('Pause cancels active output verification and releases the operation queue',async()=>{
 const {p,backend,calls}=fixture();let started,signal;
 const ready=new Promise(resolve=>started=resolve);
 backend.verifyOutput=s=>{signal=s;started();return new Promise((resolve,reject)=>s.addEventListener('abort',()=>reject(s.reason),{once:true}));};
 const playing=p.play();await ready;const paused=p.pause();
 await Promise.all([playing,paused]);await p.queue;
 assert.equal(signal.aborted,true);assert.deepEqual(calls,['play','pause']);assert.equal(p.settings.pause,true);
 assert.equal(p.pendingOperation,null);assert.equal(p.queued,0);assert.equal(p.playRequests.size,0);
});
test('Pause before the Play queue starts prevents verification and still stops immediate playback',async()=>{
 const {p,backend,calls}=fixture();backend.verifyOutput=async()=>assert.fail('Superseded Play must not verify');
 await Promise.all([p.play(),p.pause()]);assert.deepEqual(calls,['play','pause']);assert.equal(p.settings.pause,true);
});
test('Play after Pause gets a fresh intent and resumes normally',async()=>{
 const {p,calls}=fixture();await Promise.all([p.play(),p.pause(),p.play()]);await p.queue;
 assert.deepEqual(calls,['play','pause','play']);assert.equal(p.settings.pause,false);assert.equal(p.playRequests.size,0);
});
test('retiring an operation cancels its native output verification',async()=>{
 const {p,backend}=fixture();let started,signal;const ready=new Promise(resolve=>started=resolve);
 backend.verifyOutput=s=>{signal=s;started();return new Promise((resolve,reject)=>s.addEventListener('abort',()=>reject(s.reason),{once:true}));};
 const work=p.play(),rejected=assert.rejects(work,{code:'ABORTED'});await ready;
 p.activeOperation.controller.abort();await rejected;assert.equal(signal.aborted,true);await p.queue;
});
test('Pause also cancels verification after a bounded trial restores the accepted route',async()=>{
 const {p,backend}=fixture();let started,calls=0;const ready=new Promise(resolve=>started=resolve),errors=[];
 Object.assign(p,{nativeRemux:'auto',evidence:()=>({}),planDecisions:[{id:'native-remux',eligible:true}],
  select:async()=>{throw new PlayerError('ASSET_LOAD_FAILED','Unavailable replacement');}});
 backend.seek=async()=>{};backend.verifyOutput=signal=>{
  if(++calls===1)return Promise.reject(new StartupEvidenceTimeout('output'));
  started();return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 };
 p.addEventListener('error',e=>errors.push(e.detail));const play=p.play();await ready;await p.pause();await play;
 assert.equal(calls,2);assert.equal(p.settings.pause,true);assert.deepEqual(errors,[]);assert.equal(p.nativeRemux,'auto');
});
test('default Pause retains the accepted backend even when a higher ranked plan is admitted',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const p=unitPlayer(),source={kind:'local'},backend={pause:async()=>{},properties:new Map()};let replacements=0;
 Object.assign(p,{source,current:{backend},currentMode:'software',schedulePromotion:Player.prototype.schedulePromotion,
  sourceInspection:{source,probe:{tracks:[]},settings:{aid:'auto',sid:'auto',subtitles:false}},
  admissible:()=>[{id:'native-direct',mode:'native',eligible:true},{id:'software',mode:'software',eligible:true}],
  replace:async()=>{replacements++;}});
 Object.defineProperty(p,'diagnostics',{value:{plan:{id:'software'}}});
 await p.pause();t.mock.timers.tick(500);await p.queue;
 assert.equal(replacements,0);assert.equal(p.current.backend,backend);assert.equal(p.pendingOperation,null);
});
test('late capability answers cannot restart promotion after default Pause; explicit opt-in is preserved',async()=>{
 const {p}=fixture();let promotions=0;p.schedulePromotion=()=>promotions++;
 p.sourceInspection={source:p.source,probe:{tracks:[]}};
 await p.pause();p.mediaCapabilityQueries.onLateAnswer();await p.queue;assert.equal(promotions,0);
 p.backgroundPromotion={maxKnownBytes:256*1024*1024};await p.pause();assert.equal(promotions,1);
 p.mediaCapabilityQueries.onLateAnswer();assert.equal(promotions,2);
});

test('synchronous immediate play failure retires its logical intent and controller',async()=>{
 const {p,backend}=fixture(),failure=new Error('synchronous backend failure');
 backend.play=()=>{throw failure;};
 assert.throws(()=>p.play(),error=>error===failure);
 assert.equal(p.playRequests.size,0);assert.deepEqual(p.control.playback.plays,[]);assert.equal(p.queued,0);
 backend.play=async()=>{};await p.play();await p.queue;
 assert.equal(p.settings.pause,false);assert.equal(p.playRequests.size,0);
});


test('Pause during original-position restoration prevents a second backend play',async()=>{
 const {p,backend,calls}=fixture();let began,finish;const restoring=new Promise(resolve=>began=resolve);
 Object.assign(p,{nativeRemux:'auto',evidence:()=>({}),planDecisions:[{id:'native-remux',eligible:true}],select:async()=>{throw new PlayerError('ASSET_LOAD_FAILED','Unavailable replacement');}});
 backend.verifyOutput=async()=>{throw new StartupEvidenceTimeout('output');};
 backend.seek=()=>{began();return new Promise(resolve=>finish=resolve);};
 const playing=p.play();await restoring;const paused=p.pause();finish();await Promise.all([playing,paused]);
 assert.deepEqual(calls,['play','pause']);assert.equal(p.settings.pause,true);assert.equal(p.control.transport.pending,null);
});
