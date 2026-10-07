// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {decide} from './policy.mjs';
const context={candidates:[{id:'low'},{id:'high'}],currentId:'low',requestedId:'high',pending:null};
test('unavailable choices, asynchronous results and callback failures use the default',()=>{
 for(const select of [()=>({type:'switch',id:'missing',safeMargin:0,clearBuffer:true}),()=>Promise.resolve({type:'keep'}),()=>{throw Error('caller');},()=>({type:'switch',id:'high',safeMargin:NaN,clearBuffer:true})])assert.deepEqual(decide(context,select),{type:'switch',id:'high',clearBuffer:false,safeMargin:0});
});
test('callback can retain current playback and cannot mutate supplied candidates',()=>{
 assert.deepEqual(decide(context,c=>{assert.ok(Object.isFrozen(c));assert.ok(Object.isFrozen(c.candidates));assert.throws(()=>{c.candidates[0].id='invalid';});return {type:'keep'};}),{type:'keep'});
 assert.equal(context.candidates[0].id,'low');
});
test('default does not supersede a pending switch',()=>assert.deepEqual(decide({...context,pending:'high'}),{type:'keep'}));
