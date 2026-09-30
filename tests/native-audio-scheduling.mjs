// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeMpvAudio} from '../web/generated/internal/native-mpv-audio.js';

function audio(position,rate=1){
 return Object.assign(Object.create(NativeMpvAudio.prototype),{
  header:new Int32Array(16),video:{duration:37,currentTime:position,playbackRate:rate,seeking:false,ended:false},
  requestedRate:rate,running:true,stopped:false,estimatedAudioPresentationTime:()=>null,missingTimeline:0,
 });
}
test('EOF guard accounts for observation delay at slow and fast rates on the video timeline',()=>{
 for(const rate of [.5,1,2]){
  const a=audio(35,rate);a.armEOF();assert.equal(a.header[7],0);
  // This is within the next observer interval of the old final-200ms guard.
  a.video.currentTime=37-.2-rate*.24;a.armEOF();assert.equal(a.header[7],1);
 }
});
test('pending faster rate still arms EOF while sync correction waits for its boundary',()=>{
 const a=audio(36.4);a.requestedRate=2;a.pendingRate={rate:2};
 a.estimatedAudioPresentationTime=()=>{throw Error('sync observation should wait for rate boundary');};
 a.observe();assert.equal(a.header[7],1);
});
test('EOF observation respects paused/seeking state and does not overwrite active draining',()=>{
 const a=audio(36.9);a.running=false;a.observe();assert.equal(a.header[7],0);
 a.running=true;a.video.seeking=true;a.observe();assert.equal(a.header[7],0);
 a.video.seeking=false;a.header[7]=2;a.armEOF();assert.equal(a.header[7],2);
 a.header[7]=0;a.stopped=true;a.armEOF();assert.equal(a.header[7],0);
});
test('unknown and live durations never arm EOF',()=>{
 for(const duration of [NaN,Infinity]){const a=audio(100);a.video.duration=duration;a.armEOF();assert.equal(a.header[7],0);}
});
test('publication arms a very short tail immediately without waiting for the observer',async()=>{
 const a=audio(36.99);a.generation=1;a.running=false;a.fadeIn=()=>{};a.stopped=false;
 a.time=()=>36.99;
 const pending=a.publish(async()=>{});
 a.firstPoint.resolve({wallTime:performance.timeOrigin+performance.now(),mediaTime:36.99});clearTimeout(a.firstPoint.timer);
 await pending;assert.equal(a.running,true);assert.equal(a.header[7],1);
});
