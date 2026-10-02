// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {createWasmSeek,beginWasmSeek,clearWasmSeek,observeWasmSeek,confirmWasmSeek,wasmSeekBoundary} from '../../web/generated/internal/machine/wasm-seek.js';

test('Wasm seek validation cannot replace an accepted observation and equal targets have separate identities',()=>{
 const first=beginWasmSeek(createWasmSeek(),2);for(const target of [-1,NaN,Infinity]){const denied=beginWasmSeek(first.state,target);assert.equal(denied.accepted,false);assert.equal(denied.state,first.state);}
 const second=beginWasmSeek(first.state,2);assert.notEqual(second.state.seek.id,first.state.seek.id);
 assert.equal(confirmWasmSeek(second.state,first.state.seek.id,2,2,true).confirmed,false);
 assert.equal(first.state.seek.restarted,false);assert.ok(Object.isFrozen(first.state.seek));
});

test('EOF clamping requires restart plus idle EOF, keeps strict tolerance and clears on source replacement',()=>{
 let state=beginWasmSeek(createWasmSeek(),10).state;
 state=observeWasmSeek(state,{kind:'cache',eof:true});state=observeWasmSeek(state,{kind:'position',position:8});assert.equal(wasmSeekBoundary(state,10),undefined);
 state=observeWasmSeek(state,{kind:'restart',eof:false});state=observeWasmSeek(state,{kind:'position',position:8});assert.equal(wasmSeekBoundary(state,10),undefined);
 state=observeWasmSeek(state,{kind:'cache',eof:true});state=observeWasmSeek(state,{kind:'position',position:9.85});assert.equal(wasmSeekBoundary(state,10),undefined);
 state=observeWasmSeek(state,{kind:'position',position:9.84});assert.equal(wasmSeekBoundary(state,10),9.84);assert.equal(wasmSeekBoundary(state,11),undefined);
 state=observeWasmSeek(state,{kind:'cache',eof:false});assert.equal(wasmSeekBoundary(state,10),undefined);
 assert.equal(clearWasmSeek(state).seek,null);
});

test('immutable restart observations retain confirmation authority while stale/invalid results cannot clamp',()=>{
 let state=beginWasmSeek(createWasmSeek(),5).state;const id=state.seek.id,prior=state;
 state=observeWasmSeek(state,{kind:'restart',eof:true});assert.notEqual(state.seek,prior.seek);
 const denied=confirmWasmSeek(state,id,5,3,false);assert.equal(denied.state,state);assert.equal(denied.confirmed,false);
 assert.equal(confirmWasmSeek(state,id,5,NaN,true).confirmed,false);
 const clamped=confirmWasmSeek(state,id,5,3,true);assert.equal(clamped.confirmed,false);assert.equal(wasmSeekBoundary(clamped.state,5),3);
 assert.equal(confirmWasmSeek(state,id,5,5.1,true).confirmed,true);assert.equal(wasmSeekBoundary(state,5),undefined);
});
