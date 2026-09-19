// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {AudioRelay}=await import(process.env.RUNTIME_PACKAGE?pathToFileURL(path.resolve(process.env.RUNTIME_PACKAGE,'web/audio-relay.js')).href:'./files/web/audio-relay.js');
function setup(channels=2){
 const memory=new WebAssembly.Memory({initial:6,maximum:9,shared:true}),pointer=65536,buffer=new SharedArrayBuffer(64+8192*channels*4);
 const relay=new AudioRelay(memory.buffer,pointer,buffer,channels);let PCM;
 const context=vm.createContext({AudioWorkletProcessor:class{constructor(){this.port={};}},registerProcessor:(name,klass)=>PCM=klass,Int32Array,Float32Array,Atomics,currentFrame:0,sampleRate:48000});
 vm.runInContext(readFileSync(new URL('./files/web/audio-worklet.js',import.meta.url),'utf8'),context);
 const output=new PCM({processorOptions:{buffer,capacity:8192,channels}}),h=relay.native,a=relay.header;
 const process=()=>{const channelsOut=Array.from({length:channels},()=>new Float32Array(128));output.process([], [channelsOut]);return channelsOut;};
 Atomics.store(h,3,2);relay.pump();process();relay.pump();
 return {memory,pointer,buffer,relay,h,a,output,process};
}
for(const channels of [2,6,8])test(`relay preserves ${channels}-channel PCM and native consumption feedback`,()=>{
 const {relay,h,a,process}=setup(channels);
 for(let i=0;i<128*channels;i++)relay.source[i]=i/1024;
 Atomics.store(h,0,128);Atomics.store(h,2,1);relay.pump();const out=process();
 for(let i=0;i<128;i++)for(let c=0;c<channels;c++)assert.equal(out[c][i],(i*channels+c)/1024);
 relay.pump();assert.equal(Atomics.load(h,1),128);assert.equal(Atomics.load(h,7),2);assert.equal(Atomics.load(a,6),0);
});
test('native reset handshake prevents old counters and PCM from being accepted',()=>{
 const {relay,h,a,process}=setup();Atomics.store(h,0,128);Atomics.store(h,2,1);relay.pump();process();
 Atomics.store(h,3,3);Atomics.store(h,0,0);Atomics.store(h,1,0);relay.pump();assert.equal(relay.epoch,2);
 Atomics.store(h,3,4);relay.pump();assert.equal(Atomics.load(a,2),0);process();relay.pump();assert.equal(Atomics.load(h,1),0);assert.equal(Atomics.load(h,7),4);
});
test('seek gate silences output while mpv has not yet completed the seek',()=>{
 const {relay,h,a,process}=setup();relay.source.fill(.1);Atomics.store(h,0,256);Atomics.store(h,2,1);Atomics.store(a,8,1);relay.pump();assert.equal(process()[0][0],0);assert.equal(Atomics.load(a,1),0);
 Atomics.store(a,8,0);relay.pump();assert.ok(process()[0][0]>.09);
});
test('shared Wasm growth preserves the fixed native ring prefix',()=>{
 const {memory,pointer,relay,h,process}=setup();const oldLength=relay.native.buffer.byteLength;memory.grow(2);
 const grown=new Float32Array(memory.buffer,pointer+32,8192*2);grown.fill(.25,0,256);
 Atomics.store(h,0,128);Atomics.store(h,2,1);relay.pump();assert.equal(process()[0][0],.25);assert.ok(memory.buffer.byteLength>oldLength);
});
test('invalid native counts fail instead of reading outside the ring',()=>{
 const {relay,h}=setup();Atomics.store(h,0,8193);assert.throws(()=>relay.pump(),/capacity/);
 relay.close();assert.equal(Atomics.load(relay.header,2),0);
});

test('consumer seek gate wins over a relay run publication racing the seek',()=>{
 const {relay,h,a,process}=setup();relay.source.fill(.25);Atomics.store(h,0,128);Atomics.store(h,2,1);relay.pump();
 Atomics.store(a,8,1);Atomics.store(a,2,1); // A relay tick that began before the seek can publish run last.
 const output=process();assert.ok(output.every(c=>c.every(v=>v===0)));assert.equal(Atomics.load(a,1),0);assert.equal(Atomics.load(a,5),0);
 Atomics.store(a,8,0);assert.equal(process()[0][0],.25);
});
