// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {previewImageDimensions} from '../web/generated/internal/machine/preview-image.js';
import {previewImageBlob,rasterizePreview} from '../web/generated/preview/images.js';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+1sAAAAASUVORK5CYII=','base64');
const signal=()=>new AbortController().signal;
function large(){const bytes=Buffer.from(png);bytes.writeUInt32BE(4097,16);bytes.writeUInt32BE(4097,20);return bytes;}
test('bounded PNG/JPEG/WebP headers expose dimensions without decoding',()=>{
  assert.deepEqual(previewImageDimensions(png),{width:1,height:1});
  const jpeg=Buffer.from([255,216,255,224,0,4,0,0,255,194,0,11,8,0,135,0,240,1,1,17,0]);
  assert.deepEqual(previewImageDimensions(jpeg),{width:240,height:135});
  const webp=Buffer.alloc(26);webp.write('RIFF');webp.writeUInt32LE(18,4);webp.write('WEBPVP8L',8);webp.writeUInt32LE(5,16);webp[20]=47;webp.writeUInt32LE(239|(134<<14),21);
  assert.deepEqual(previewImageDimensions(webp),{width:240,height:135});
  const lossy=Buffer.alloc(30);lossy.write('RIFF');lossy.writeUInt32LE(22,4);lossy.write('WEBPVP8 ',8);lossy.writeUInt32LE(10,16);lossy.set([157,1,42],23);lossy.writeUInt16LE(240,26);lossy.writeUInt16LE(135,28);
  assert.deepEqual(previewImageDimensions(lossy),{width:240,height:135});
});
test('oversized Blob and raster inputs fail before createImageBitmap',async t=>{
  let calls=0;const previous=Object.getOwnPropertyDescriptor(globalThis,'createImageBitmap');
  Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:()=>{calls++;throw Error('must not decode');}});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'createImageBitmap',previous);else delete globalThis.createImageBitmap;});
  const blob=new Blob([large()],{type:'image/png'});
  await assert.rejects(rasterizePreview(blob,{width:240,height:135,signal:signal()}),/pixel budget/);
  await assert.rejects(previewImageBlob({blob},signal(),{width:240,height:135}),/pixel budget/);
  assert.equal(calls,0);
});
test('invalid, truncated and unsupported headers fail closed',()=>{
  for(let i=0;i<33;i++)assert.throws(()=>previewImageDimensions(png.subarray(0,i)));
  for(const bytes of [Buffer.from('<svg width="99999" height="99999"/>'),Buffer.from([255,216,255,224,255,255]),Buffer.alloc(30)])assert.throws(()=>previewImageDimensions(bytes));
  const zero=Buffer.from(png);zero.writeUInt32BE(0,16);assert.throws(()=>previewImageDimensions(zero),/Invalid/);
});
test('cancellation after header inspection prevents decoder allocation',async t=>{
  let calls=0;const previous=Object.getOwnPropertyDescriptor(globalThis,'createImageBitmap');
  Object.defineProperty(globalThis,'createImageBitmap',{configurable:true,value:async()=>{calls++;return {width:1,height:1,close(){}};}});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'createImageBitmap',previous);else delete globalThis.createImageBitmap;});
  const abort=new AbortController(),blob=new Blob([png]);
  const read=Promise.resolve(png.buffer.slice(png.byteOffset,png.byteOffset+png.byteLength));
  blob.arrayBuffer=()=>read;
  const request=rasterizePreview(blob,{width:1,height:1,signal:abort.signal});
  // Inspect resumes first, then cancellation runs before its caller resumes.
  read.then(()=>abort.abort());
  await assert.rejects(request,e=>e.name==='AbortError');
  assert.equal(calls,0);
});
test('oversized JPEG/WebP and inconsistent extended WebP headers are rejected',()=>{
  const jpeg=Buffer.from([255,216,255,192,0,11,8,16,1,16,1,1,1,17,0]);
  assert.throws(()=>previewImageDimensions(jpeg),/pixel budget/);
  const webp=Buffer.alloc(26);webp.write('RIFF');webp.writeUInt32LE(18,4);webp.write('WEBPVP8L',8);webp.writeUInt32LE(5,16);webp[20]=47;webp.writeUInt32LE(4096|(4096<<14),21);
  assert.throws(()=>previewImageDimensions(webp),/pixel budget/);
  const extended=Buffer.alloc(44);extended.write('RIFF');extended.writeUInt32LE(36,4);extended.write('WEBPVP8X',8);extended.writeUInt32LE(10,16);
  // Canvas 1x1, compressed lossless frame 2x1.
  extended.write('VP8L',30);extended.writeUInt32LE(5,34);extended[38]=47;extended.writeUInt32LE(1,39);
  assert.throws(()=>previewImageDimensions(extended),/Invalid/);
  extended.write('ANIM',30);assert.throws(()=>previewImageDimensions(extended),/Animated WebP/);
});
test('Blob previews honor encoded budget, cancellation and retain already-sized PNG bytes',async()=>{
  const blob=new Blob([png]);assert.equal(await previewImageBlob({blob},signal(),{width:240,height:135}),blob);
  await assert.rejects(previewImageBlob({blob:new Blob([new Uint8Array(4*1024*1024+1)])},signal()),/byte budget/);
  const abort=new AbortController();abort.abort();await assert.rejects(previewImageBlob({blob},abort.signal),e=>e.name==='AbortError');
});
