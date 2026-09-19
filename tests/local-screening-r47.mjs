// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import vm from 'node:vm';
const file=process.env.REMUX_WORKER||'web/native-remux-worker.js';
const source=readFileSync(file,'utf8');
const declarations=source.slice(source.indexOf('let engine,'),source.indexOf('const adaptationABI='));
function flush(pieces){const context={ArrayBuffer,Uint8Array,pieces};vm.createContext(context);vm.runInContext(declarations+';chunks=pieces;bytes=pieces.reduce((n,b)=>n+b.length,0);globalThis.output=flush();globalThis.counts=stats;',context);return context;}
test('sole owned output transfers once and detaches its donor',()=>{const piece=new Uint8Array([1,2,3]),r=flush([piece]);assert.equal(r.output,piece);assert.equal(r.counts.gatherCopiedBytes,0);const moved=structuredClone(r.output.buffer,{transfer:[r.output.buffer]});assert.equal(piece.byteLength,0);assert.deepEqual([...new Uint8Array(moved)],[1,2,3]);});
test('partial and shared views retain independent gather ownership',()=>{for(const buffer of [new ArrayBuffer(8),new SharedArrayBuffer(8)]){const source=new Uint8Array(buffer);source.set([1,2,3,4]);const piece=new Uint8Array(buffer,1,2),r=flush([piece]);assert.notEqual(r.output.buffer,buffer);source.fill(99);assert.deepEqual([...r.output],[2,3]);assert.equal(r.counts.gatherCopiedBytes,2);}});
test('multiple pieces and empty output keep their order and byte counts',()=>{const a=new Uint8Array([1,2]),b=new Uint8Array([3]),r=flush([a,b]);a.fill(9);b.fill(9);assert.deepEqual([...r.output],[1,2,3]);assert.equal(r.counts.gatherCopiedBytes,3);assert.equal(flush([]).output.length,0);});
