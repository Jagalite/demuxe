// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {NativePrivateMpvAudio}=await import(process.env.PRIVATE_MPV_AUDIO_MODULE?pathToFileURL(process.env.PRIVATE_MPV_AUDIO_MODULE):'../web/generated/internal/native-private-mpv-audio.js');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(t){
 t.mock.method(globalThis,'setInterval',()=>0);
 const priorWorker=globalThis.Worker,priorLocation=globalThis.location,priorDocument=globalThis.document;
 globalThis.Worker=class {terminate(){} postMessage(){}};globalThis.location=new URL('http://localhost/');
 globalThis.document={hidden:false};
 t.after(()=>{globalThis.Worker=priorWorker;globalThis.location=priorLocation;globalThis.document=priorDocument;});
 const video=Object.assign(new EventTarget(),{paused:false,pause(){this.paused=true;},play:async()=>{video.paused=false;}}),errors=[];
 const audio=new NativePrivateMpvAudio(video,()=>0,new URL('http://localhost/'),'jspi',error=>errors.push(error));
 let suspended=0,epoch=2;const calls=[];
 audio.context={state:'running',suspend:async()=>{suspended++;},close:async()=>{},removeEventListener(){}};
 audio.running=true;audio.play=async()=>{audio.running=true;video.paused=false;};
 audio.rpc=async(op)=>{calls.push(op);if(op==='seek')epoch+=2;return op==='status'?{eof:true,epoch,ack:true,header:[0,0,0,epoch,0,0,0,epoch]}:{};};
 return {audio,video,errors,calls,suspended:()=>suspended};
}
test('replay cancels an EOF task waiting for the previous PCM drain',async t=>{
 const f=fixture(t),rpc=f.audio.rpc;let release;
 f.audio.rpc=op=>{if(op==='status'&&!release)return new Promise(resolve=>{release=resolve;});return rpc(op);};
 f.video.dispatchEvent(new Event('ended'));await tick();assert.ok(release);
 await f.audio.seek(0,async()=>{});release({eof:true,header:[0,0]});await tick();
 assert.equal(f.audio.running,true);assert.equal(f.suspended(),0);assert.deepEqual(f.errors,[]);
 assert.equal(f.calls.filter(op=>op==='pause').length,1);await f.audio.destroy();
});
test('replay also cancels context suspension after an old EOF pause is in flight',async t=>{
 const f=fixture(t);let release;f.audio.pause=()=>new Promise(resolve=>{release=resolve;});
 f.video.dispatchEvent(new Event('ended'));await tick();assert.ok(release);
 await f.audio.seek(0,async()=>{});release();await tick();
 assert.equal(f.audio.running,true);assert.equal(f.suspended(),0);assert.deepEqual(f.errors,[]);await f.audio.destroy();
});
test('clock sampling noise does not repeatedly change browser playback rate',async t=>{
 const f=fixture(t),writes=[];let rate=1,error=0;
 Object.defineProperty(f.video,'playbackRate',{get:()=>rate,set:value=>{rate=value;writes.push(value);}});
 f.audio.time=()=>10;f.audio.latency=()=>0;
 f.audio.rpc=async op=>op==='status'?{time:10+error/1000}:{};
 for(error of [-20,20,-10,10,5,-5])await f.audio.observe();
 assert.deepEqual(writes,[]);
 error=60;await f.audio.observe();await f.audio.observe();assert.deepEqual(writes,[]);
 await f.audio.observe();assert.deepEqual(writes,[1.005]);
 for(let i=0;i<10;i++)await f.audio.observe();assert.equal(writes.length,1);
 error=20;await f.audio.observe();await f.audio.observe();await f.audio.observe();
 assert.equal(rate,1);assert.equal(writes.at(-1),1);
 const settled=writes.length;
 for(error of [-5,5,-10,10])await f.audio.observe();assert.equal(writes.length,settled);
 assert.deepEqual(f.errors,[]);await f.audio.destroy();
});
