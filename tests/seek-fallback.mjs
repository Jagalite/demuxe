// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../web/generated/unified-player.js';
import {PlayerError} from '../web/generated/internal/errors.js';
function fixture(automatic=true,error=Error('No frame at requested source time')){
 const p=Object.create(Player.prototype),source={kind:'local',file:{}},settings={pause:true,gain:.5},calls=[];
 Object.assign(p,{automatic,source,settings,nativeTracks:[],attempts:[{mode:'hybrid',outcome:'selected',reason:'Startup accepted'}],current:{backend:{seek:async()=>{throw error;}}},enqueue:async f=>f(),select:async(...args)=>calls.push(args)});
 Object.defineProperties(p,{mode:{value:'hybrid'},state:{value:{seekable:[{start:0,end:30}]}}});
 return {p,source,settings,calls};
}
test('automatic seek fallback records failure and preserves source, gain, intent and target',async()=>{
 const {p,source,settings,calls}=fixture();await p.seek(24);assert.equal(calls.length,1);
 const [s,policy,preserve,tracks,start,target,history]=calls[0];assert.equal(s,source);assert.equal(policy,settings);assert.equal(preserve,true);assert.equal(start,2);assert.equal(target,24);assert.deepEqual(tracks,[]);
 assert.deepEqual(history,[{mode:'hybrid',outcome:'failed',reason:'Seek presentation failure: No frame at requested source time'}]);
});
test('explicit Hybrid seek failures do not override mode',async()=>{
 const {p,calls}=fixture(false);await assert.rejects(p.seek(24),/No frame/);assert.equal(calls.length,0);
});
test('aborted seek cannot open a fallback source',async()=>{
 const {p,calls}=fixture();p.activeOperation={controller:new AbortController()};p.activeOperation.controller.abort();await assert.rejects(p.seek(24));assert.equal(calls.length,0);
});
