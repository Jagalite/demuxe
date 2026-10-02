// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import {initialNativeBackend} from '../web/generated/internal/machine/native-backend.js';
import assert from 'node:assert/strict';
import {featureRejection, qualifiedAudioFilter, executionPlan} from '../web/generated/internal/playback-plans.js';
import {RemuxPlayer} from '../web/native-remux-player.js';
import {initialRemuxLifecycle} from '../web/generated/internal/machine/remux-lifecycle.js';

test('Hybrid scalar filtering is explicit and never admits unrelated effects',()=>{
 for(const af of ['volume=0','volume=0.5','lavfi=[volume=0.5]']){
  assert.equal(qualifiedAudioFilter(af),true);
  assert.equal(featureRejection('hybrid',{vf:'',af,toneMapping:'off',hybridAudioFilters:true}),undefined);
  assert.ok(featureRejection('native',{vf:'',af,toneMapping:'off',hybridAudioFilters:true}));
  assert.ok(featureRejection('hybrid',{vf:'',af,toneMapping:'off'}));
 }
 for(const af of ['volume=2','volume=nan','volume=0.5,aresample=44100','lavfi=[volume=0.5];hflip','volume=t'])assert.equal(qualifiedAudioFilter(af),false);
 assert.ok(featureRejection('hybrid',{vf:'hflip',af:'volume=0.5',toneMapping:'off',hybridAudioFilters:true}));
 assert.equal(executionPlan('hybrid',null,'volume=0.5').id,'hybrid-audio-filter');
});
function player(){
 const source={file:{}}, video={currentTime:3,buffered:{length:1,start:()=>1,end:()=>11}};
 return Object.assign(Object.create(RemuxPlayer.prototype),{video,source,bufferedSeeks:true,lifecycle:Object.freeze({...initialRemuxLifecycle(),schedule:Object.freeze({...initialRemuxLifecycle().schedule,raps:[0,2,4,6,8],target:8}),sourceId:1,acceptedSourceId:1,generation:4,acceptedGeneration:4,targetReady:true,active:true}),media:{readyState:'open'},sb:{updating:false},timelineBias:1,ranges:()=>[[0,10]],stats:{bufferedSeeks:0}});
}
test('buffered admission requires live media coverage, retained RAP and current authority',()=>{
 const p=player();assert.equal(p.canSeekBuffered(5),true);
 p.video.buffered={length:2,start:i=>i?7:1,end:i=>i?11:4};assert.equal(p.canSeekBuffered(5),false);
 p.video.buffered={length:1,start:()=>6,end:()=>11};assert.equal(p.canSeekBuffered(5.1),false);
 p.lifecycle=Object.freeze({...p.lifecycle,schedule:Object.freeze({...p.schedule,raps:[6,8]})});assert.equal(p.canSeekBuffered(5.1),false);
 p.lifecycle=Object.freeze({...p.lifecycle,schedule:Object.freeze({...p.schedule,raps:[4,6,8]})});p.video.buffered={length:1,start:()=>1,end:()=>11};p.lifecycle=Object.freeze({...p.lifecycle,acceptedGeneration:3});assert.equal(p.canSeekBuffered(5),false);
 p.lifecycle=Object.freeze({...p.lifecycle,acceptedGeneration:4});p.transitionLifecycle({type:'open'});p.source={file:{}};assert.equal(p.canSeekBuffered(5),false);
});
test('buffered seek keeps producer generation and resets the consumption target',async()=>{
 const p=player();let restarts=0;p.restart=async()=>restarts++;
 await p.seek(5);assert.equal(p.video.currentTime,6);assert.equal(p.target,5);assert.equal(p.generation,4);assert.equal(restarts,0);
});

test('destroy and supersession cancel outstanding MSE open before worker allocation',async t=>{
 const original={MediaSource:globalThis.MediaSource,Worker:globalThis.Worker,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 let allocations=0,revocations=0;
 class Media extends EventTarget {listeners=0;addEventListener(...args){this.listeners++;super.addEventListener(...args)}removeEventListener(...args){this.listeners--;super.removeEventListener(...args)}}
 globalThis.MediaSource=Media;globalThis.Worker=class {constructor(){allocations++}};URL.createObjectURL=()=> 'blob:test';URL.revokeObjectURL=()=>revocations++;
 t.after(()=>{globalThis.MediaSource=original.MediaSource;globalThis.Worker=original.Worker;URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke});
 const p=new RemuxPlayer({pause(){},removeAttribute(){},load(){}},{mseOwner:'window',runtime:'jspi'});t.after(()=>p.destroy());
 const first=p.open({file:{}});const firstRejected=assert.rejects(first,/Superseded/);const old=p.media;
 assert.equal(old.listeners,1); // Barrier: the first open is awaiting sourceopen.
 const second=p.open({file:{}});const secondRejected=assert.rejects(second,/Superseded/);const current=p.media;
 assert.equal(old.listeners,0);assert.equal(current.listeners,1);
 await p.destroy();await p.destroy();await Promise.all([firstRejected,secondRejected]);
 old.dispatchEvent(new Event('sourceopen'));current.dispatchEvent(new Event('sourceopen'));
 assert.equal(allocations,0);assert.equal(current.listeners,0);assert.equal(p.objectURL,null);assert.equal(revocations,2);
});

import {trackKey} from '../web/generated/internal/state.js';
import {NativePlayer} from '../web/generated/internal/native-player.js';
test('adapted and packet-copy Native share source stream identities with mpv',()=>{
 const raw={id:'3',type:'audio'};
 assert.equal(trackKey(raw,'native','adapted-flac'),'audio:stream:2');
 assert.equal(trackKey(raw,'native','remux'),trackKey({...raw,'ff-index':2},'hybrid'));
});
function seekingPlayer(){
 const video=new EventTarget();let serial=0;const callbacks=new Map();
 Object.assign(video,{seeking:false,currentTime:3.5,requestVideoFrameCallback(callback){callbacks.set(++serial,callback);return serial},cancelVideoFrameCallback(id){callbacks.delete(id)}});
 const p=Object.assign(Object.create(NativePlayer.prototype),{video,remux:{generation:4,timelineBias:1},native:initialNativeBackend(),cancelers:new Set(),controlWait:new Map()});
 return {p,video,frame(mediaTime){const [id,callback]=callbacks.entries().next().value;callbacks.delete(id);callback(0,{mediaTime})},callbacks};
}
test('seek presentation accepts a covering low-fps frame only after seeking completes',async()=>{
 const {p,video,frame,callbacks}=seekingPlayer();let completed=false;
 const seeking=p.seekPresented(2.5,async()=>{video.seeking=true;video.dispatchEvent(new Event('seeking'))}).then(()=>{completed=true});
 await Promise.resolve();assert.equal(video.seeking,true); // Barrier: the queued seek action has started.
 frame(3);await Promise.resolve();assert.equal(completed,false); // Decoder has not completed the seek.
 video.seeking=false;frame(4);await Promise.resolve();assert.equal(completed,false); // Future frame cannot cover the target.
 frame(3);await seeking;assert.equal(completed,true);assert.equal(callbacks.size,0);
});
test('a retired remux generation cannot complete a pending frame-verified seek',async()=>{
 const {p,video,frame,callbacks}=seekingPlayer();
 const seeking=p.seekPresented(2.5,async()=>{video.dispatchEvent(new Event('seeking'))});
 const rejected=assert.rejects(seeking,/retired/);p.remux.generation++;frame(3);await rejected;assert.equal(callbacks.size,0);
});
test('a buffered frame can complete the seek before queued DOM seeking events',async()=>{
 const {p,frame,callbacks}=seekingPlayer();
 const seeking=p.seekPresented(2.5,async()=>{});
 frame(3);await seeking;assert.equal(callbacks.size,0);
});


test('playing buffered seeks hold the clock until verified output then restore intent',async()=>{
 const calls=[];
 const video={paused:false,videoWidth:1280,currentTime:3,seeking:false};
 const remux={timelineBias:1,canSeekBuffered:()=>true,pause(){calls.push('pause');video.paused=true},async seek(t){calls.push('seek');video.currentTime=t+1},async play(){calls.push('play');video.paused=false}};
 const p=Object.assign(Object.create(NativePlayer.prototype),{video,remux,native:initialNativeBackend(),refresh(){},async seekPresented(target,action){assert.equal(video.paused,true);await action();calls.push('verified')}});
 await p.seek(5);assert.deepEqual(calls,['pause','seek','verified','play']);assert.equal(video.paused,false);
 calls.length=0;video.paused=true;await p.seek(7);assert.deepEqual(calls,['pause','seek','verified']);assert.equal(video.paused,true);
});
