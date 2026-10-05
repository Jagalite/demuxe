// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertFilterReferencePixels,assertGrayscaleReferencePixels} from './filter-reference.mjs';
const pixels=fn=>Uint8Array.from(Array.from({length:64*36},(_,i)=>fn(i%64,Math.floor(i/64))).flat());
const asymmetric=(x,y)=>y<18?(x<32?[255,0,0]:[0,255,0]):(x<32?[0,0,255]:[255,255,0]);
test('asymmetric colored quadrants reject every unapplied filter',()=>{
  const metrics=assertFilterReferencePixels(pixels(asymmetric));
  assert.ok(metrics.hflip>100&&metrics.vflip>100&&metrics.negate>100&&metrics.grayscale>100);
});
test('uniform, horizontally symmetric, vertically symmetric, and gray references fail closed',()=>{
  for(const image of [()=>[128,128,128],(_x,y)=>asymmetric(0,y),(x,_y)=>asymmetric(x,0),(x,y)=>{const c=x<32?(y<18?0:170):(y<18?85:255);return[c,c,c];}])
    assert.throws(()=>assertFilterReferencePixels(pixels(image)),/Unapplied/);
});
test('malformed decoded RGB is rejected',()=>assert.throws(()=>assertFilterReferencePixels(new Uint8Array(10))));
test('grayscale retains relative spatial intensities',()=>{
  const gray=(x,y)=>{const [r,g,b]=asymmetric(x,y),v=Math.round(.299*r+.587*g+.114*b);return[v,v,v];};
  assert.ok(assertGrayscaleReferencePixels(pixels(gray),pixels(asymmetric))>.99);
  assert.throws(()=>assertGrayscaleReferencePixels(pixels((x,y)=>gray(63-x,y)),pixels(asymmetric)),/reference pattern/);
});
test('every uniform gray output is rejected',()=>{
  const reference=pixels(asymmetric);
  for(let gray=0;gray<=255;gray++)assert.throws(()=>assertGrayscaleReferencePixels(pixels(()=>[gray,gray,gray]),reference),/spatial variation/);
});
