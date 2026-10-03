// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeMpvAudio} from '../../web/generated/internal/native-mpv-audio.js';
import {NativePrivateMpvAudio} from '../../web/generated/internal/native-private-mpv-audio.js';
import {initialNativeAudio,beginNativeAudio} from '../../web/generated/internal/machine/native-audio.js';
import {createPrivateAudio,observeAudioContext,beginAudioContextWork,finishAudioContextWork,retirePrivateAudio} from '../../web/generated/internal/machine/private-audio.js';
import {watchdogPolicy} from '../../web/generated/internal/watchdogs.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const turn=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
test('same-stack native audio supersession keeps physical cancellation receipts within live domains',async()=>{
 const audio=Object.assign(Object.create(NativeMpvAudio.prototype),{machine:initialNativeAudio(watchdogPolicy()),operations:new Map(),header:new Int32Array(16)}),work=[];
 for(let i=0;i<1024;i++){work.push(audio.run('playback',async()=>{}).catch(()=>{}));assert.ok(audio.operations.size<=1,'retired physical receipt retained until microtask');}
 await Promise.all(work);assert.equal(audio.operations.size,0);
});
test('native audio refuses exhausted serial without retiring accepted operation',()=>{
 const initial=initialNativeAudio(watchdogPolicy()),admitted=beginNativeAudio(initial,'playback'),state={...admitted.state,serial:Number.MAX_SAFE_INTEGER},result=beginNativeAudio(state,'seek');assert.equal(result.lease,undefined);assert.equal(result.state,state);assert.deepEqual(result.retire,[]);
});
test('private context owner coalesces latest observation while one physical request is active',()=>{
 let state=createPrivateAudio();state=observeAudioContext(state,false,false).state;const first=beginAudioContextWork(state);state=first.state;
 for(let i=0;i<1024;i++){state=observeAudioContext(state,!!(i%2),false).state;assert.equal(beginAudioContextWork(state).request,null);}
 const done=finishAudioContextWork(state,first.request.id);assert.equal(done.playVideo,false);const next=beginAudioContextWork(done.state);assert.equal(next.request.id,state.contextObservation);assert.equal(next.request.active,true);assert.equal(finishAudioContextWork(retirePrivateAudio(next.state),next.request.id).accepted,false);
});
function fixture(t){
 const before={Worker:globalThis.Worker,location:globalThis.location};globalThis.Worker=class{terminate(){}};globalThis.location={origin:'https://fixture.test'};t.after(()=>{for(const key of Object.keys(before))if(before[key]===undefined)delete globalThis[key];else globalThis[key]=before[key];});
 const video=new EventTarget();video.paused=false;video.pause=()=>{video.paused=true;};video.play=async()=>{video.paused=false;};
 const audio=new NativePrivateMpvAudio(video,()=>0,new URL('https://fixture.test/'),'jspi',()=>{}),hold=deferred(),calls=[];audio.context={state:'suspended'};audio.audio={...audio.audio,running:true};audio.rpc=async(op,data)=>{calls.push([op,data.value]);if(calls.length===1)await hold.promise;};audio.fail=error=>{throw error;};return{audio,video,hold,calls};
}
test('actual context flood executes first and latest value without an unbounded promise chain',async t=>{
 const f=fixture(t);f.audio.contextChanged();await turn();for(let i=0;i<1024;i++){f.audio.context.state=i%2?'running':'suspended';f.audio.contextChanged();}assert.equal(f.calls.length,1);f.hold.resolve();await f.audio.contextTransition;assert.deepEqual(f.calls,[['context',false],['context',true]]);assert.equal(f.audio.audio.contextWork,null);assert.equal(f.video.paused,false);
});
test('pending physical video play keeps context lane charged through newer observations',async t=>{
 const f=fixture(t),play=deferred();f.video.play=()=>play.promise;f.audio.contextChanged();f.audio.context.state='running';f.audio.contextChanged();f.hold.resolve();await turn();assert.equal(f.calls.length,2);assert.notEqual(f.audio.audio.contextWork,null);f.audio.context.state='suspended';f.audio.contextChanged();await turn();assert.equal(f.calls.length,2);play.resolve();await f.audio.contextTransition;assert.equal(f.calls.length,3);assert.deepEqual(f.calls[2],['context',false]);assert.equal(f.audio.audio.contextWork,null);
});
test('context retirement while external acknowledgment is pending cannot issue latest queued work',async t=>{
 const f=fixture(t);f.audio.contextChanged();f.audio.context.state='running';f.audio.contextChanged();f.audio.requests={...f.audio.requests,phase:'closing'};f.audio.audio=retirePrivateAudio(f.audio.audio);f.hold.resolve();await f.audio.contextTransition;assert.equal(f.calls.length,1);assert.equal(f.audio.audio.contextWork,null);
});
