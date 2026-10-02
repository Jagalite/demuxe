// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {playbackStatisticsClockReads} from '../../web/generated/internal/machine/telemetry.js';
import {Player} from '../../web/generated/unified-player.js';
import {PreviewController} from '../../web/generated/preview/controller.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
function facts(patch={}){return {
 sourceId:null,sourcePresent:false,requestedLive:false,mode:'native',automaticSelection:true,pause:true,subtitlesVisible:true,volumePercent:100,muted:false,playbackRate:1,pendingOperation:null,error:null,observedPlaying:false,observedWaiting:false,busy:false,operationActive:false,
 observation:{time:0,duration:null,nativeLive:null,eof:false,paused:false,pausedForCache:false,nativeWaiting:false,seekable:null,nativeSeekable:null,nativeBuffered:null,cacheSeekable:null,cached:null},
 media:{mode:'native',videoSurface:null,videoOutput:null,videoInput:null,selectedRawVideo:null,chapters:null,tags:null,chapterCoverage:'complete',tagCoverage:'complete',duration:null},
 tracks:[],timing:{subtitleDelay:0,audioDelay:0,effectiveSubtitleDelay:0,effectiveAudioDelay:0,subtitleStyle:{fontSize:24},styleScope:'plain-text'},loop:false,playbackRange:null,streaming:null,audioOutputDevice:'',trackPolicy:{},
 capabilityFacts:{backendPlan:null,nativeASS:false,privateRemux:false,privateFull:false,providerRuntime:false,hybridAudioFilters:false,nativeRemux:'never',canInspectFFmpeg:false,remoteFormat:null,backendMpvSubtitles:false,backendSetQuality:false,backendSeekToLive:false,isolated:false,webCodecs:false,mediaSource:false,webAudio:false,bufferingBackend:'browser',bufferingControl:'hint'},...patch
};}
function model(){let state=initialPlayerControl();return{get state(){return state;},send(input){const before=JSON.stringify(state),old=state,result=transitionPlayer(state,input);assert.equal(JSON.stringify(old),before);state=result.state;assert.ok(Object.isFrozen(state));return result;},accept(preserve=false,timestamps=[100]){const attempt=this.send({type:'source.begin',operationEpoch:state.operations.epoch,mode:'native',preserve,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])this.send({type,attempt});this.send({type:'source.accept',attempt,operationEpoch:state.operations.epoch,settings:state.settings,planMatches:true,timing:{elapsed:20,timestamps}});this.send({type:'source.finished',attempt});},prepare(input=facts()){const id=this.send({type:'publication.begin'}).id;const prepared=this.send({type:'publication.prepare',id,captureRevision:state.captureRevision,input});assert.equal(prepared.accepted,true);return id;},commit(id,timestamps=[]){return this.send({type:'publication.commit',id,captureRevision:state.captureRevision,timestamps});}};}
test('publication microtask IDs coalesce and stale callbacks cannot clear a successor',()=>{
 const m=model(),revision=m.state.captureRevision,first=m.send({type:'publication.schedule'}).id;assert.equal(m.send({type:'publication.schedule'}).accepted,false);assert.equal(m.state.captureRevision,revision);
 m.send({type:'publication.scheduled',id:first});const second=m.send({type:'publication.schedule'}).id;assert.ok(second>first);assert.equal(m.send({type:'publication.scheduled',id:first}).accepted,false);assert.equal(m.state.publication.queued,second);assert.equal(m.state.captureRevision,revision);
});
test('bookkeeping reentry preserves prepared projection but domain changes reject it',()=>{
 const m=model(),id=m.prepare(),captureRevision=m.state.captureRevision;m.send({type:'publication.schedule'});assert.equal(m.state.captureRevision,captureRevision);assert.equal(m.send({type:'publication.commit',id,captureRevision,timestamps:[]}).accepted,true);
 const next=m.prepare(),before=m.state.publication.snapshot,revision=m.state.captureRevision;m.send({type:'settings.change',value:{volume:25}});assert.equal(m.send({type:'publication.commit',id:next,captureRevision:revision,timestamps:[]}).accepted,false);assert.equal(m.state.publication.snapshot,before);assert.equal(m.commit(next).accepted,false,'freshly retagged old prepared data is still stale');
});
test('newer publication wins before stale preparation or commit can publish',()=>{
 const m=model(),first=m.prepare(facts({volumePercent:25})),revision=m.state.captureRevision,second=m.prepare(facts({volumePercent:75}));m.commit(second);const latest=m.state.publication.snapshot;
 assert.equal(m.send({type:'publication.prepare',id:first,captureRevision:revision,input:facts()}).accepted,false);assert.equal(m.commit(first).accepted,false);assert.equal(m.state.publication.snapshot,latest);assert.equal(latest.volume,.75);
});
test('snapshot commit and first-playing statistics are one atomic transition',()=>{
 const m=model();m.accept();const id=m.prepare(facts({sourceId:1,sourcePresent:true,pause:false,observedPlaying:true}));assert.equal(m.state.publication.snapshot,null);assert.equal(m.state.publication.statistics.data.firstPlayingMs,null);
 const accepted=m.commit(id,[150]);assert.equal(accepted.publication.state,m.state.publication.snapshot);assert.equal(m.state.publication.snapshot.status,'playing');assert.equal(m.state.publication.statistics.data.firstPlayingMs,50);
 const snapshot=m.state.publication.snapshot,stats=m.state.publication.statistics;m.commit(m.prepare(facts({sourceId:1,sourcePresent:true,pause:false,observedPlaying:true})));assert.equal(m.state.publication.snapshot,snapshot);assert.equal(m.state.publication.statistics,stats);
});
test('handoff finishes waiting with explicit time and preserves source counters; close clears them',()=>{
 const m=model();m.accept();m.commit(m.prepare(facts({sourceId:1,sourcePresent:true,pause:false,observedPlaying:true})),[150]);m.commit(m.prepare(facts({sourceId:1,sourcePresent:true,pause:false,observedWaiting:true})),[200]);assert.equal(m.state.publication.statistics.waitingAt,200);
 m.accept(true,[500]);assert.equal(m.state.publication.statistics.data.sourceId,1);assert.equal(m.state.publication.statistics.data.sessionEpoch,2);assert.equal(m.state.publication.statistics.data.rebufferMs,300);assert.equal(m.state.publication.statistics.waitingAt,null);
 m.send({type:'source.clear'});assert.equal(m.state.publication.statistics.data.sourceId,null);assert.equal(m.state.publication.statistics.data.rebufferMs,0);
});
test('errors are copied and an old session cannot overwrite replacement or closed state',()=>{
 const m=model();m.accept();const session=m.state.source.acceptedSession,epoch=m.state.operations.epoch,error={code:'DECODE_FAILED',message:'failed',scope:'session',retryable:true,operation:null,operationId:null};
 m.send({type:'publication.error',epoch,session,error});error.message='changed';assert.equal(m.state.publication.error.message,'failed');assert.equal(Object.isFrozen(error),false);
 m.accept(true,[]);assert.equal(m.state.publication.error,null);assert.equal(m.send({type:'publication.error',epoch,session,error}).accepted,false);m.send({type:'source.clear'});assert.equal(m.send({type:'publication.error',epoch,session,error}).accepted,false);
});
for(const kind of ['close','replace','retire','destroy'])test(kind+' retires an already prepared publication',()=>{
 const m=model();m.accept();const id=m.prepare(facts({sourceId:1,sourcePresent:true}));if(kind==='close')m.send({type:'source.clear'});else if(kind==='replace')m.accept(true,[]);else m.send({type:'operation.retire',terminal:kind==='destroy'});
 assert.equal(m.commit(id).accepted,false);assert.equal(m.state.publication.prepared,null);
});
test('seek timing accepts only the current active operation identity',()=>{
 const m=model();m.accept();const id=m.send({type:'operation.admit',kind:'seeking'}).id;m.send({type:'operation.start',id});const epoch=m.state.operations.epoch;
 assert.equal(m.send({type:'publication.operation-start',id:id+1,epoch,now:500}).accepted,false);m.send({type:'publication.operation-start',id,epoch,now:500});m.send({type:'publication.seek',id,epoch,now:560});assert.equal(m.state.publication.statistics.data.lastSeekMs,60);assert.equal(m.state.publication.statistics.data.seekCount,1);assert.equal(m.send({type:'publication.operation-start',id,epoch,now:800}).accepted,false);assert.equal(m.send({type:'publication.seek',id,epoch,now:900}).accepted,false);
 m.send({type:'operation.retire',terminal:false});assert.equal(m.send({type:'publication.seek',id,epoch,now:900}).accepted,false);assert.equal(m.state.publication.statistics.data.seekCount,1);
});
function physical(t){const p=unitPlayer();p.publish=()=>Player.prototype.publish.call(p);p.enforceBoundary=()=>{};p.publish();t.after(()=>p.destroy());return p;}
test('actual schedule-only preview callback does not suppress the synchronous publication',async t=>{
 const p=physical(t),events=[],original=PreviewController.prototype.setPlaybackActive;let scheduled=false;
 t.mock.method(PreviewController.prototype,'setPlaybackActive',function(value){if(!scheduled){scheduled=true;p.schedulePublish();}return original.call(this,value);});p.addEventListener('statechange',e=>events.push(e.detail.volume));
 p.updateSettings({volume:25});p.publish();assert.equal(p.state.volume,.25);assert.deepEqual(events,[.25]);await Promise.resolve();assert.deepEqual(events,[.25]);
});
test('actual subscriber sees first-playing statistics already committed with its snapshot',async t=>{
 const p=physical(t);acceptSourceIdentity(p,1,{timing:{elapsed:20,timestamps:[100]}});const backend=new EventTarget();Object.assign(backend,{properties:new Map([['duration',20],['time-pos',0],['pause',false]]),diagnostics:{plan:'direct'},destroy:async()=>{}});p.current={backend,surface:{remove(){}}};p.source={kind:'local',file:new Blob()};p.updateSettings({pause:false});p.dispatchControl({type:'playback.observed',playing:true});
 const seen=[];p.subscribe(snapshot=>{if(snapshot.status==='playing')seen.push({source:snapshot.sourceId,stats:p.getStats()});});t.mock.method(performance,'now',()=>150);p.publish();assert.equal(seen.length,1);assert.equal(seen[0].source,1);assert.equal(seen[0].stats.firstPlayingMs,50);assert.equal(seen[0].stats.sourceId,1);
});
test('output dimensions commit as one preference and survive reentrant resize and close',async t=>{
 const p=physical(t),before=p.control.preferences,seen=[];
 p.current={backend:{properties:new Map(),destroy:async()=>{},resize(width,height){seen.push([width,height,p.control.preferences.outputSize]);if(width===800)p.resize(320,240);}},surface:{remove(){}}};
 p.resize(800,450);assert.deepEqual(seen,[[800,450,{width:800,height:450}],[320,240,{width:320,height:240}]]);assert.deepEqual(before.outputSize,{width:640,height:360});
 const accepted=p.control.preferences.outputSize;assert.throws(()=>p.resize(1921,1080),{code:'INVALID_ARGUMENT'});assert.equal(p.control.preferences.outputSize,accepted);await p.close();assert.deepEqual(p.control.preferences.outputSize,{width:320,height:240});
});
test('a pending unrelated settings transaction cannot roll back a newer output size',()=>{
 const m=model();m.accept();const operation=m.send({type:'operation.admit',kind:null}).id;m.send({type:'operation.start',id:operation});const volume=m.send({type:'setting.begin',command:{kind:'volume',value:50},hasBackend:true});
 m.send({type:'preferences.change',value:{outputSize:{width:800,height:450}}});m.send({type:'setting.accept',id:volume.id});assert.deepEqual(m.state.preferences.outputSize,{width:800,height:450});assert.equal(m.state.settings.volume,50);
});
