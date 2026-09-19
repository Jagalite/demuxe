// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {NativePlayer}=await import(process.env.NATIVE_PLAYER_MODULE?pathToFileURL(process.env.NATIVE_PLAYER_MODULE):'../web/generated/internal/native-player.js');
const tick=()=>new Promise(r=>setTimeout(r,0));
function fixture(){
 const video=new EventTarget(),callbacks=new Map();let id=0;
 Object.assign(video,{seeking:true,currentTime:3,requestVideoFrameCallback:f=>{callbacks.set(++id,f);return id},cancelVideoFrameCallback:id=>callbacks.delete(id)});
 const remux={generation:1,timelineBias:1,expectedVideoFrame:()=>2};
 const player=Object.assign(Object.create(NativePlayer.prototype),{video,remux,stopped:false,cancelers:new Set()});
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
