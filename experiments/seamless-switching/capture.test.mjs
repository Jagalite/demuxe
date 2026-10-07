// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
const code=await fs.readFile(new URL('./capture.js',import.meta.url),'utf8');
test('a startup clock jump discards the partial block and preserves later sample indexes',()=>{
 const messages=[];let Capture;
 const context=vm.createContext({currentFrame:0,AudioWorkletProcessor:class{constructor(){this.port={postMessage:m=>messages.push(m)};}},registerProcessor:(name,value)=>{Capture=value;}});
 vm.runInContext(code,context);const capture=new Capture();
 const process=frame=>{context.currentFrame=frame;capture.process([[new Float32Array(128).fill(.1)]],[[new Float32Array(128)]]);};
 process(0);for(let frame=512;frame<11000;frame+=128)process(frame);
 assert.equal(messages[0].discontinuity.discardedSamples,128);
 const blocks=messages.filter(m=>m.samples);assert.ok(blocks.length>=2);
 assert.equal(blocks[0].frame,512);assert.equal(blocks[1].frame,5312);
 assert.ok(blocks.every(b=>b.samples.length===4800));
});
