// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ProgressiveMP4,fragmentSamples} from '../web/progressive-mp4.js';
// Historical R006 output remains a generic fragment-parser fixture, not a runtime dependency.
const movie=new Uint8Array(readFileSync('results/remux-jspi/2026-09-21T19-49-23.972Z/public-player.mp4'));
let start=0;while(String.fromCharCode(...movie.subarray(start+4,start+8))!=='moof')start+=new DataView(movie.buffer,movie.byteOffset+start).getUint32(0);
const moofSize=new DataView(movie.buffer,movie.byteOffset+start).getUint32(0),mdatSize=new DataView(movie.buffer,movie.byteOffset+start+moofSize).getUint32(0),fragment=movie.slice(start,start+moofSize+mdatSize),ends=fragmentSamples(fragment.subarray(0,moofSize),mdatSize);
const join=chunks=>Buffer.concat(chunks.map(c=>Buffer.from(c)));
test('first sample minus one byte releases only metadata; complete samples preserve every byte',()=>{
 const output=[],p=new ProgressiveMP4(b=>output.push(b),{minimum:0,batch:1});const boundary=moofSize+ends[0];
 p.push(fragment.slice(0,boundary-1));assert.equal(join(output).length,moofSize+8);
 p.push(fragment.slice(boundary-1,boundary));assert.equal(join(output).length,boundary);
 for(let i=boundary;i<fragment.length;i+=127)p.push(fragment.slice(i,i+127));assert.equal(p.finish(),true);assert.deepEqual(join(output),Buffer.from(fragment));
});
test('transferring emitted ownership cannot corrupt remaining sample bytes',()=>{
 const output=[],p=new ProgressiveMP4(b=>{const owned=b.byteOffset===0&&b.byteLength===b.buffer.byteLength?b:b.slice();output.push(new Uint8Array(structuredClone(owned.buffer,{transfer:[owned.buffer]})));},{minimum:0,batch:1});
 for(let i=0;i<fragment.length;i+=509)p.push(fragment.slice(i,i+509));assert.equal(p.finish(),true);assert.deepEqual(join(output),Buffer.from(fragment));
});
test('incomplete admitted mdat cannot be mistaken for EOF',()=>{const p=new ProgressiveMP4(()=>{},{minimum:0,batch:1});p.push(fragment.slice(0,-1));assert.throws(()=>p.finish(),/Truncated/);});
test('complete or small fragments retain generic delivery',()=>{for(const minimum of [0,131072]){const p=new ProgressiveMP4(()=>assert.fail('unexpected split'),{minimum});p.push(fragment.slice());assert.equal(p.finish(),false);}});
test('overlapping sample addresses fail before any metadata is released',()=>{
 const bad=fragment.slice(),marker=Buffer.from(bad).indexOf(Buffer.from('trun'));new DataView(bad.buffer).setInt32(marker+12,0);
 const p=new ProgressiveMP4(()=>assert.fail('unqualified metadata released'),{minimum:0,batch:1});p.push(bad.slice(0,moofSize+8));assert.equal(p.rejected,true);assert.equal(p.finish(),false);
});
test('unproven decode-time repair is rejected',()=>{const bad=fragment.slice(),marker=Buffer.from(bad).indexOf(Buffer.from('tfdt'));bad.set([102,114,101,101],marker);assert.throws(()=>fragmentSamples(bad.subarray(0,moofSize),mdatSize),/extensions/);});

test('a partial or unexpected trailer cannot be accepted as EOF',()=>{const p=new ProgressiveMP4(()=>{},{minimum:0,batch:1});p.push(fragment.slice(0,1000));p.push(fragment.slice(1000));p.push(new Uint8Array([0,0,0,8,98,97,100,33]));assert.throws(()=>p.finish(),/tail/);});
