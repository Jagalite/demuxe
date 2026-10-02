// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeMpvAudio} from '../web/generated/internal/native-mpv-audio.js';
import {initialNativeAudio} from '../web/generated/internal/machine/native-audio.js';
import {watchdogPolicy} from '../web/generated/internal/watchdogs.js';
function audio(duration=37,rate=1){
 const callbacks=[],cancelled=[];let serial=0;
 const a=Object.assign(Object.create(NativeMpvAudio.prototype),{machine:{...initialNativeAudio(watchdogPolicy()),running:true},operations:new Map(),header:new Int32Array(16),video:{duration,playbackRate:rate,requestVideoFrameCallback(callback){callbacks.push(callback);return serial++;},cancelVideoFrameCallback(id){cancelled.push(id);},removeEventListener(){}},hidden:{remove(){}},engine:{async destroy(){}}});
 return{a,callbacks,cancelled};
}
test('actual displayed frame arms final200ms independently of playback rate',async()=>{
 for(const rate of [.5,1,2]){const {a,callbacks}=audio(37,rate);a.scheduleFrame();callbacks[0](0,{mediaTime:36.79});assert.equal(a.header[7],0);callbacks[1](0,{mediaTime:36.8});assert.equal(a.header[7],1);await a.destroy();}
});
test('current browser output evidence remains valid during pending rate boundary',async()=>{
 const {a,callbacks}=audio();a.machine={...a.machine,requestedRate:2,rate:{id:5,rate:2,generation:0,deadline:3000,due:null}};a.scheduleFrame();callbacks[0](0,{mediaTime:36.9});assert.equal(a.header[7],1);await a.destroy();
});
test('paused or actively draining presentation does not arm or overwrite EOF',async()=>{
 for(const marker of [0,2]){const {a,callbacks}=audio();a.machine={...a.machine,running:false};a.header[7]=marker;a.scheduleFrame();callbacks[0](0,{mediaTime:36.9});assert.equal(a.header[7],marker);await a.destroy();}
});
test('unknown and live duration never turn a displayed frame into EOF evidence',async()=>{
 for(const duration of [NaN,Infinity]){const {a,callbacks}=audio(duration);a.scheduleFrame();callbacks[0](0,{mediaTime:1e9});assert.equal(a.header[7],0);await a.destroy();}
});
test('short tail waits for a fresh frame rather than inferring it from browser currentTime',async()=>{
 const {a,callbacks}=audio();a.video.currentTime=36.99;a.scheduleFrame();assert.equal(a.header[7],0);callbacks[0](0,{mediaTime:36.5});assert.equal(a.header[7],0);callbacks[1](0,{mediaTime:36.99});assert.equal(a.header[7],1);await a.destroy();
});
test('duplicate and retired frame callbacks cannot acquire new registrations',async()=>{
 const {a,callbacks,cancelled}=audio();a.scheduleFrame();callbacks[0](0,{mediaTime:36.79});assert.equal(callbacks.length,2);callbacks[0](0,{mediaTime:36.9});assert.equal(callbacks.length,2);assert.equal(a.header[7],0);await a.destroy();assert.deepEqual(cancelled,[1]);callbacks[1](0,{mediaTime:36.9});assert.equal(callbacks.length,2);assert.equal(a.header[7],0);
});
