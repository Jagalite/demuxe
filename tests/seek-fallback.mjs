// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from './helpers/unit-player.mjs';
import {PlayerError} from '../web/generated/internal/errors.js';
function fixture(t,automatic=true,error=Error('No frame at requested source time')){
 const p=unitPlayer(),source={kind:'local',file:new ArrayBuffer(1)},calls=[],backendCalls=[];
 const attempt=p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode:'hybrid',preserve:false,planId:'hybrid'}).id;
 for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])p.dispatchControl({type,attempt});
 p.dispatchControl({type:'source.accept',attempt,operationEpoch:p.operationEpoch,settings:{...p.settings,pause:true,gain:.5},planMatches:true});p.dispatchControl({type:'source.finished',attempt});
 Object.assign(p,{automatic,source,attempts:[{mode:'hybrid',outcome:'selected',reason:'Startup accepted'}],current:{backend:{properties:new Map([['time-pos',5]]),pause:async()=>{backendCalls.push('pause');},seek:async()=>{backendCalls.push('seek');throw error;},destroy:async()=>{}},surface:{remove(){}}},select:async(...args)=>calls.push(args)});
 Object.defineProperty(p,'state',{get:()=>({sourceId:p.control.source.serial,seekable:[{start:0,end:30}]})});
 t.after(()=>p.destroy());return {p,source,settings:p.settings,calls,backendCalls};
}
test('automatic seek fallback records failure and preserves source, gain, intent and target',async t=>{
 const {p,source,settings,calls,backendCalls}=fixture(t);await p.seek(24);assert.deepEqual(backendCalls,['seek']);assert.equal(calls.length,1);
 const [s,policy,preserve,tracks,start,target,history]=calls[0];assert.equal(s,source);assert.equal(policy,settings);assert.equal(preserve,true);assert.equal(start,2);assert.equal(target,24);assert.deepEqual(tracks,[]);
 assert.deepEqual(history,[{mode:'hybrid',outcome:'failed',reason:'Seek presentation failure: No frame at requested source time'}]);
});
test('explicit Hybrid seek failures do not override mode',async t=>{
 const {p,calls,backendCalls}=fixture(t,false);await assert.rejects(p.seek(24),/No frame/);assert.deepEqual(backendCalls,['seek']);assert.equal(calls.length,0);
});
test('aborted seek cannot open a fallback source',async t=>{
 const {p,calls}=fixture(t),controller=new AbortController();controller.abort();await assert.rejects(p.seek(24,{signal:controller.signal}));assert.equal(calls.length,0);
});
