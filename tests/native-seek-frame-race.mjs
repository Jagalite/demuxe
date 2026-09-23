// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {NativePlayer}=await import(process.env.NATIVE_PLAYER_MODULE?pathToFileURL(process.env.NATIVE_PLAYER_MODULE):'../web/generated/internal/native-player.js');
const tick=()=>new Promise(r=>setTimeout(r,0));
function fixture(){
 const video=new EventTarget(),callbacks=new Map();let id=0;
 Object.assign(video,{seeking:true,currentTime:3,paused:true,requestVideoFrameCallback:f=>{callbacks.set(++id,f);return id},cancelVideoFrameCallback:id=>callbacks.delete(id)});
 const remux={generation:1,timelineBias:1,expectedVideoFrame:()=>2,canSeekBuffered:()=>true};
 const player=Object.assign(Object.create(NativePlayer.prototype),{video,remux,stopped:false,seekPresentationRetries:0,cancelers:new Set()});
 const deliver=pts=>{const [id,callback]=callbacks.entries().next().value;callbacks.delete(id);callback(0,{mediaTime:pts});};
 const cancel=()=>{for(const fn of player.cancelers)fn(Error('Test cleanup'));};
 return {player,video,remux,callbacks,deliver,cancel};
}
test('source-correlated frame delivered before seeked completes a paused seek',async()=>{
 const f=fixture();let settled=false;const work=f.player.seekPresented(2,async()=>{}).then(()=>{settled=true});
 try{await tick();assert.ok(f.callbacks.size);f.deliver(3);assert.equal(settled,false);f.video.seeking=false;f.video.dispatchEvent(new Event('seeked'));await tick();assert.equal(settled,true);assert.equal(f.callbacks.size,0);await work;}
 finally{f.cancel();await work.catch(()=>{});}
});
test('seeked and a stale frame do not establish correct output',async()=>{
 const f=fixture();let settled=false;const work=f.player.seekPresented(2,async()=>{}).then(()=>{settled=true});
 try{await tick();f.deliver(1);f.video.seeking=false;f.video.dispatchEvent(new Event('seeked'));await tick();assert.equal(settled,false);f.deliver(3);await work;assert.equal(settled,true);assert.equal(f.callbacks.size,0);}
 finally{f.cancel();await work.catch(()=>{});}
});
test('retirement between frame and seeked rejects the obsolete operation',async()=>{
 const f=fixture();const work=f.player.seekPresented(2,async()=>{});const rejection=assert.rejects(work,/retired/);
 await tick();f.deliver(3);f.remux.generation++;f.video.seeking=false;f.video.dispatchEvent(new Event('seeked'));await rejection;assert.equal(f.callbacks.size,0);
});
test('cancellation settles an outstanding frame wait and removes its callback',async()=>{
 const f=fixture();const work=f.player.seekPresented(2,async()=>{}),rejection=assert.rejects(work,/Test cleanup/);
 await tick();assert.ok(f.callbacks.size);f.cancel();await rejection;assert.equal(f.callbacks.size,0);assert.equal(f.player.cancelers.size,0);
});
test('synchronous action failure clears the frame wait',async()=>{
 const f=fixture();await assert.rejects(f.player.seekPresented(2,()=>{throw Error('Action failed')}),/Action failed/);assert.equal(f.callbacks.size,0);assert.equal(f.player.cancelers.size,0);
});

test('a callback clipped to the seek point still identifies the correct source frame',async()=>{
 const f=fixture();f.video.currentTime=3.25;f.remux.expectedVideoFrame=()=>2.233;
 const work=f.player.seekPresented(2.25,async()=>{});await tick();f.deliver(3.25);f.video.seeking=false;f.video.dispatchEvent(new Event('seeked'));await work;assert.equal(f.callbacks.size,0);
});
test('frames outside the source interval cannot satisfy a fractional seek',async()=>{
 const f=fixture();f.video.currentTime=3.25;f.remux.expectedVideoFrame=()=>2.233;let settled=false;
 const work=f.player.seekPresented(2.25,async()=>{}).then(()=>{settled=true});await tick();f.video.seeking=false;
 f.deliver(3.20);await tick();assert.equal(settled,false);f.deliver(3.267);await tick();assert.equal(settled,false);f.deliver(3.25);await work;assert.equal(f.callbacks.size,0);
});
test('a sub-millisecond buffered seek across a source-frame boundary verifies presentation',async()=>{
 const f=fixture();let verified=0;
 Object.assign(f.video,{currentTime:7.3326,videoWidth:640,seeking:false});
 Object.assign(f.remux,{expectedVideoFrame:t=>t<6.333?6.3:6.333,pause:()=>{},seek:async()=>{}});
 f.player.refresh=()=>{};f.player.seekPresented=async()=>{verified++;};
 await f.player.seekVideo(6.3331);assert.equal(verified,1);
});

test('a completed seek with no compositor callback retries the same buffered target once',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture();let time=3,writes=[],settled=false;
 Object.defineProperty(f.video,'currentTime',{get:()=>time,set:value=>{time=value;writes.push(value);f.video.seeking=true;}});
 const work=f.player.seekPresented(2,async()=>{}).then(()=>{settled=true;});await Promise.resolve();await Promise.resolve();
 f.video.seeking=false;f.video.dispatchEvent(new Event('seeked'));const oldHandle=[...f.callbacks.keys()][0];
 t.mock.timers.tick(99);assert.deepEqual(writes,[]);t.mock.timers.tick(1);
 assert.deepEqual(writes,[3]);assert.equal(f.callbacks.has(oldHandle),false);assert.equal(f.callbacks.size,1);assert.equal(f.player.seekPresentationRetries,1);
 // An obsolete frame or a second seeked event cannot establish presentation.
 f.deliver(1);f.video.seeking=false;f.video.dispatchEvent(new Event('seeked'));t.mock.timers.tick(200);await Promise.resolve();
 assert.deepEqual(writes,[3]);assert.equal(settled,false);
 f.deliver(3);await work;assert.equal(settled,true);assert.equal(f.callbacks.size,0);assert.equal(f.player.cancelers.size,0);
});
test('a missing frame after the single buffered retry still fails verification',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture();
 const work=f.player.seekPresented(2,async()=>{}),rejected=assert.rejects(work,/did not present the target/);
 f.video.seeking=false;f.video.dispatchEvent(new Event('seeked'));t.mock.timers.tick(100);
 f.video.dispatchEvent(new Event('seeked'));t.mock.timers.tick(9900);await rejected;
 assert.equal(f.player.seekPresentationRetries,1);assert.equal(f.callbacks.size,0);assert.equal(f.player.cancelers.size,0);
});
test('cancellation and decoder errors clear a pending buffered retry',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const error of [false,true]){
  const f=fixture(),work=f.player.seekPresented(2,async()=>{}),rejected=assert.rejects(work);
  f.video.seeking=false;f.video.dispatchEvent(new Event('seeked'));
  if(error){f.video.error={code:3,message:'decode failed'};f.video.dispatchEvent(new Event('error'));}else f.cancel();
  await rejected;t.mock.timers.tick(10000);
  assert.equal(f.player.seekPresentationRetries,0);assert.equal(f.callbacks.size,0);assert.equal(f.player.cancelers.size,0);
 }
});
test('a pending retry never seeks a replaced source or remux generation',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const replace of [false,true]){
  const f=fixture(),work=f.player.seekPresented(2,async()=>{}),rejected=assert.rejects(work,/retired/);
  f.video.seeking=false;f.video.dispatchEvent(new Event('seeked'));
  if(replace)f.player.remux={...f.remux};else f.remux.generation++;
  t.mock.timers.tick(100);await rejected;assert.equal(f.player.seekPresentationRetries,0);assert.equal(f.callbacks.size,0);
 }
});
test('recovery never moves a changed playhead or seeks evicted buffered media',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 for(const change of ['position','playing','eviction']){
  const f=fixture(),work=f.player.seekPresented(2,async()=>{}),rejected=assert.rejects(work,/Test cleanup/);
  f.video.seeking=false;f.video.dispatchEvent(new Event('seeked'));
  if(change==='position')f.video.currentTime=4;else if(change==='playing')f.video.paused=false;else f.remux.canSeekBuffered=()=>false;
  t.mock.timers.tick(100);assert.equal(f.player.seekPresentationRetries,0);f.cancel();await rejected;
 }
});

import {RemuxPlayer} from '../web/native-remux-player.js';
test('muxed B-frame overlap accepts either covering frame, not an older frame',()=>{
 const p=Object.assign(Object.create(RemuxPlayer.prototype),{muxedFrames:true,timelineBias:1,frames:[[6.233,.034],[6.267,.034],[6.3,.033],[6.333,.034]]});
 assert.equal(p.matchesVideoFrame(6.300974,7.267),true);
 assert.equal(p.matchesVideoFrame(6.300974,7.3),true);
 assert.equal(p.matchesVideoFrame(6.300974,7.233),false);
 assert.equal(p.matchesVideoFrame(6.300974,7.333),false);
 assert.equal(p.matchesVideoFrame(6.302,7.267),false);
 assert.equal(p.matchesVideoFrame(6.3326,7.3),true);
 assert.equal(p.expectedVideoFrame(6.3326),6.3);
});

test('windowed Native ranges retain the public object shape through refresh',async()=>{
 const {ranges}=await import('../web/generated/internal/state.js');
 const video={textTracks:[],duration:6,currentTime:2,volume:1,playbackRate:1};
 const remux={windowed:true,timelineBias:1,duration:30,ranges:()=>[[1,5]],playbackPaused:true,playbackEnded:false};
 const player=Object.assign(Object.create(NativePlayer.prototype),{video,remux,assAssets:[],properties:new Map(),emit:()=>{}});
 player.refresh();
 assert.deepEqual(ranges(player.properties.get('native-buffered')),[{start:1,end:5}]);
 assert.deepEqual(ranges(player.properties.get('native-seekable')),[{start:0,end:30}]);
 remux.ranges=()=>[];player.refresh();assert.deepEqual(ranges(player.properties.get('native-buffered')),[]);
});
