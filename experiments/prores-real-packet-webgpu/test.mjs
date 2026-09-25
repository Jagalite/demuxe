// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {parseCapture, parsePackedCapture} from './capture.js';
import {LiveProResService} from './service.js';

const chunks=[];
const tag=value=>chunks.push(new TextEncoder().encode(value));
const u32=value=>{const bytes=new Uint8Array(4);new DataView(bytes.buffer).setUint32(0,value,true);chunks.push(bytes);};
tag('DPC1');tag('FRAM');[0,16,16,0,0,0].forEach(u32);
tag('SLIC');[0,0,0,0,0,1,7,0,0,0,0].forEach(u32);
chunks.push(new Uint8Array(64));chunks.push(new Uint8Array(64).fill(2));
chunks.push(new Uint8Array(64).fill(3));
for(let component=0;component<3;component++){
  const blocks=component===0?4:2;
  tag('COMP');[0,0,0,component,blocks].forEach(u32);
  const values=new Int16Array(blocks*64).fill(component+1);
  chunks.push(new Uint8Array(values.buffer));
}
const bytes=new Uint8Array(chunks.reduce((n,chunk)=>n+chunk.length,0));
let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
const parsed=parseCapture(bytes,16,16);
assert.equal(parsed.sliceCount,1);
assert.equal(parsed.descriptorWords[4],7);
assert.equal(parsed.packedWords.byteLength,1024);
const packed=new Int16Array(parsed.packedWords.buffer);
assert.deepEqual([0,64,128,192,256,320,384,448].map(index=>packed[index]),
  [1,1,1,1,2,2,3,3]);
assert.equal(new Uint8Array(parsed.matrixWords.buffer)[0],2);
assert.equal(new Uint8Array(parsed.matrixWords.buffer)[64],3);

// The direct layout is a view of a live shared mailbox, with no coefficient
// or descriptor repack allocation in JavaScript.
const directMemory = new SharedArrayBuffer(80 + 64 + 40 * 23 * 1024 + 8192 + 128);
const directHeader = new Uint32Array(directMemory, 80, 16);
directHeader.set([0x31505044, 0, 640, 360, 64, 40 * 23 * 1024,
  64 + 40 * 23 * 1024, 64 + 40 * 23 * 1024 + 8192,
  64 + 40 * 23 * 1024 + 8192 + 128, 920, 1, 0, 0]);
assert.throws(()=>parsePackedCapture(directMemory,80,directHeader[8],new Uint32Array(4)),
  /Invalid direct-packed/); // Runtime limit is 256 slice descriptors.
directHeader[9] = 115; directHeader[10] = 8;
const directDescriptors = new Uint32Array(directMemory, 80 + directHeader[6], 115 * 8);
for(let i=0;i<115;i++)directDescriptors.set([i*8*256,(i*8)%40,
  Math.floor(i*8/40),8,7],i*8);
// Slices must not cross a macroblock row; this deliberately malformed layout fails.
directDescriptors[1] = 36;
assert.throws(()=>parsePackedCapture(directMemory,80,directHeader[8],new Uint32Array(4)),
  /Invalid direct-packed/);
for(let i=0;i<115;i++)directDescriptors.set([i*8*256,(i%5)*8,
  Math.floor(i/5),8,7],i*8);
const directFrame=parsePackedCapture(directMemory,80,directHeader[8],new Uint32Array(4));
assert.equal(directFrame.packedWords.buffer,directMemory);
assert.equal(directFrame.descriptorWords[4],7);
assert.equal(directFrame.sliceCount,115);

globalThis.GPUBufferUsage={STORAGE:128,COPY_DST:8,COPY_SRC:4};
assert.throws(()=>new LiveProResService({_web_decoder_ptr:()=>0}, {poolLimit:2}),
  /3\.\.8/);
let resets=0;
const service=new LiveProResService({_web_decoder_ptr:()=>0,HEAPU8:new Uint8Array(new SharedArrayBuffer(64))},
  {onReset:()=>resets++,poolLimit:3});
let next=0;service.runtime.buffer=({size})=>({size,id:++next});
const first=service.acquire(0,33333),second=service.acquire(33333,33333),third=service.acquire(66667,33333);
assert.equal(service.acquire(100000,33333),null);
assert.equal(service.diagnostics.poolPeak,3);
first.close();const reused=service.acquire(100000,33333);
assert.equal(reused.surface.buffer,first.surface.buffer);
first.close();assert.equal(service.diagnostics.held,3);
service.releaseFrames();
assert.equal(resets,1);
assert.notEqual(reused.generation,service.generation);
assert.equal(service.diagnostics.held,0);
assert.equal(service.diagnostics.freeSurfaces,3);
const nextFrame=service.acquire(133333,33333);
assert.equal(nextFrame.generation,service.generation);
assert.equal(service.diagnostics.allocatedSurfaces,3);
nextFrame.close();second.close();third.close();
await service.close();
console.log('Live ProRes capture packing, bounded ownership, and epoch invalidation passed');
