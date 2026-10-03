// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {NativePlayer} from '../../web/generated/internal/native-player.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
function tracked({failAt=Infinity,failure=Error('registration failed'),removeFailure,hook}={}){
 const live=new Map(),removals=[];let count=0;
 return{live,removals,addEventListener(type,listener){live.set(type,listener);hook?.(type,listener);if(++count===failAt)throw failure;},removeEventListener(type,listener){removals.push(type);if(live.get(type)===listener)live.delete(type);if(removeFailure)throw removeFailure;},get count(){return count;}};
}
for(const failAt of [1,2,6])test(`Player listener registration ${failAt} rolls back add-then-throw and earlier listeners`,()=>{
 const p=unitPlayer(),failure=Error('original registration'),backend=tracked({failAt,failure,removeFailure:Error('cleanup failed')}),session={backend};p.control={...p.control,source:{...p.control.source,acceptedSession:1,acceptedEpoch:p.control.operations.epoch}};
 assert.throws(()=>p.observeBackend(session,1),error=>error===failure);assert.equal(backend.live.size,0);assert.equal(backend.count,failAt);assert.equal(backend.removals.length,failAt);assert.equal(p.sessionListeners.has(session),false);
});
test('Player registration retirement rolls back current listener and preserves abort despite cleanup throwing',()=>{
 const p=unitPlayer();let session;const backend=tracked({hook:()=>{session.retired=true;},removeFailure:Error('cleanup failed')});session={backend};p.control={...p.control,source:{...p.control.source,acceptedSession:1,acceptedEpoch:p.control.operations.epoch}};
 assert.throws(()=>p.observeBackend(session,1),error=>error.code==='ABORTED');assert.equal(backend.live.size,0);assert.equal(backend.removals.length,1);assert.equal(p.sessionListeners.has(session),false);
});
function video({videoFailureAt,textFailureAt,refreshFailure,readTracksFailure,cleanupThrows=false}={}){
 const failure=Error('constructor original failure'),cleanup=cleanupThrows?Error('cleanup failed'):undefined,media=tracked({failAt:videoFailureAt,failure,removeFailure:cleanup}),text=Object.assign([] ,tracked({failAt:textFailureAt,failure,removeFailure:cleanup}));
 const value=Object.assign(media,{textTracks:text,currentTime:0,duration:30,buffered:{length:0},seekable:{length:0},volume:1,playbackRate:1,paused:true,ended:false});
 if(refreshFailure)Object.defineProperty(value,'currentTime',{get(){throw failure;}});
 if(readTracksFailure)Object.defineProperty(value,'textTracks',{get(){throw failure;}});
 return{value,media,text,failure};
}
for(const [name,options,expectedMedia,expectedText] of [['second media registration',{videoFailureAt:2},2,0],['error registration',{videoFailureAt:15},15,0],['text tracks getter',{readTracksFailure:true},15,0],['first text registration',{textFailureAt:1},15,1],['second text registration',{textFailureAt:2},15,2],['initial refresh',{refreshFailure:true},15,2]])for(const cleanupThrows of [false,true])test(`NativePlayer ${name} failure rolls back all acquired listeners${cleanupThrows?' despite cleanup failures':''}`,()=>{
 const f=video({...options,cleanupThrows});assert.throws(()=>new NativePlayer(f.value),error=>error===f.failure);assert.equal(f.media.live.size,0);assert.equal(f.text.live.size,0);assert.equal(f.media.removals.length,expectedMedia);assert.equal(f.text.removals.length,expectedText);
});
test('NativePlayer registration retirement stops construction before any further registration',async()=>{
 const f=video(),refresh=NativePlayer.prototype.refresh;let instance,destruction;
 NativePlayer.prototype.refresh=function(){instance=this;destruction=this.destroy();void destruction.catch(()=>{});};
 const add=f.value.addEventListener;f.value.addEventListener=(type,listener)=>{add(type,listener);listener();};
 try{assert.throws(()=>new NativePlayer(f.value),/destroyed/);assert.equal(f.media.count,1);assert.equal(instance.native.stopped,true);await destruction.catch(()=>{});assert.equal(f.media.live.size,0);assert.equal(f.text.live.size,0);}finally{NativePlayer.prototype.refresh=refresh;}
});
test('NativePlayer retained text callback is inert after construction rollback even when removal throws',()=>{
 const f=video(),refresh=NativePlayer.prototype.refresh;let refreshes=0;
 NativePlayer.prototype.refresh=function(){refreshes++;throw f.failure;};f.text.removeEventListener=()=>{throw Error('remove before release');};
 try{assert.throws(()=>new NativePlayer(f.value),error=>error===f.failure);assert.equal(f.text.live.size,2);for(const listener of f.text.live.values())listener();assert.equal(refreshes,1);}finally{NativePlayer.prototype.refresh=refresh;}
});
test('Player rollback-retained listeners are inert when physical removal throws',()=>{
 const p=unitPlayer(),failure=Error('add failed'),backend=tracked({failAt:2,failure}),session={backend};p.control={...p.control,source:{...p.control.source,acceptedSession:1,acceptedEpoch:p.control.operations.epoch}};let faults=0;p.recordSessionFault=()=>{faults++;};backend.removeEventListener=()=>{throw Error('remove before release');};assert.throws(()=>p.observeBackend(session,1),error=>error===failure);for(const listener of backend.live.values())listener({detail:Error('stale event')});assert.equal(faults,0);assert.equal(p.control.source.acceptedSession,1);assert.equal(session.retired,undefined);
});
