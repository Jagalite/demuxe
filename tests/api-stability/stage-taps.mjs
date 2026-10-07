// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {transitionStageTaps as step} from '../../web/generated/internal/machine/stage-taps.js';
const tap=(at,patch={})=>({id:1,x:30,y:100,at,side:-1,source:1,...patch});
function run(commands){let state={};const seeks=[];for(const command of commands){const result=step(state,command);state=result.state;if(result.seek)seeks.push(result.seek);}return {state,seeks};}
const event=(type,at,patch={},eligible=true)=>({type,tap:tap(at,patch),eligible});
const pair=patch=>[event('down',0,patch),event('up',40,patch),event('down',120,patch),event('up',160,patch)];
test('two short nearby taps seek once per pair, in either direction',()=>{
 for(const side of [-1,1])assert.deepEqual(run(pair({side})).seeks,[side]);
 assert.deepEqual(run([...pair({}),event('down',200),event('up',240)]).seeks,[-1]);
});
test('center, cross-side, distant, slow and long taps do not seek',()=>{
 for(const commands of [pair({side:0}),[...pair({}).slice(0,2),event('down',120,{side:1}),event('up',160,{side:1})],[...pair({}).slice(0,2),event('down',120,{x:90}),event('up',160,{x:90})],[...pair({}).slice(0,2),event('down',500),event('up',540)],[event('down',0),event('up',400),event('down',450),event('up',500)]])assert.deepEqual(run(commands).seeks,[]);
});
test('movement, cancellation, multitouch and unavailable controls discard the pair',()=>{
 for(const interruption of [event('move',130,{x:80}),{type:'cancel'},event('down',130,{id:2},false),event('move',130,{},false)])assert.deepEqual(run([...pair({}).slice(0,3),interruption,event('up',160)]).seeks,[]);
});
test('source changes cannot carry a tap or press into the next media',()=>{
 assert.deepEqual(run([...pair({}).slice(0,2),event('down',120,{source:2}),event('up',160,{source:2})]).seeks,[]);
 assert.deepEqual(run([...pair({}).slice(0,3),event('up',160,{source:2})]).seeks,[]);
});
