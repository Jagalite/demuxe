// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTrace,appendTrace,selectTrace,tracePlayerTransition} from '../../web/generated/internal/machine/trace.js';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {replaySimulatedHistory,shrinkSimulatedHistory} from './replay-harness.mjs';
const scope={lifetime:1,sourceId:2,sessionId:3,operationId:4};
const decision={accepted:true,status:'paused',effectCount:0,pendingCount:0,reason:'none'};
const input=(name='play')=>({kind:'control',scope:{...scope},control:{name}});

test('trace keeps a bounded immutable suffix with stable order and explicit time',()=>{
  let trace=createTrace(3);const first=trace;
  for(let i=0;i<8;i++)trace=appendTrace(trace,input(),decision,i);
  const result=selectTrace(trace);assert.equal(first.entries.length,0);assert.equal(result.dropped,5);
  assert.deepEqual(result.entries.map(x=>[x.sequence,x.tick]),[[6,5],[7,6],[8,7]]);
  assert.equal(result.completeControlHistory,false);assert.equal(result.exactExternalReplay,false);
  for(const value of [trace,trace.entries,trace.entries[0],trace.entries[0].input,trace.entries[0].input.scope])assert.ok(Object.isFrozen(value));
});
test('trace copies only whitelisted DTO fields and never freezes or traverses caller graphs',()=>{
  const raw=input(),outcome={...decision};raw.url='https://private.invalid/?token=secret';raw.control.headers={authorization:'secret'};
  Object.defineProperty(raw,'bytes',{get(){throw Error('Private graph traversed');}});
  outcome.message='secret';const trace=appendTrace(createTrace(),raw,outcome,1);raw.scope.sessionId=99;raw.control.name='destroy';
  assert.equal(Object.isFrozen(raw),false);assert.equal(Object.isFrozen(raw.scope),false);
  assert.equal(trace.entries[0].input.scope.sessionId,3);assert.equal(trace.entries[0].input.control.name,'play');
  assert.equal(JSON.stringify(trace).includes('secret'),false);assert.equal(JSON.stringify(trace).includes('private.invalid'),false);
});
test('unsafe names, nonnumeric identities and opaque payloads are explicitly omitted',()=>{
  let trace=createTrace();
  for(const entry of [{kind:'control',control:{name:'https://secret.invalid',value:'token'}},{kind:'effect',effectId:1,name:'fetch',phase:'issued'},{kind:'omitted',category:'source',reason:'private-payload',source:{url:'secret'}}])trace=appendTrace(trace,{...entry,scope:{...scope,sourceId:'secret'}},decision,1);
  assert.equal(selectTrace(trace).omitted,3);assert.equal(selectTrace(trace).completeControlHistory,false);
  assert.ok(trace.entries.every(x=>x.input.scope.sourceId===null));assert.equal(JSON.stringify(trace).includes('secret'),false);
});
test('safe scalar controls survive export while replay scope remains explicit',()=>{
  let trace=createTrace();for(const control of [{name:'volume',value:37},{name:'mute',value:true},{name:'mode',value:'software'},{name:'seek',value:2.75}])trace=appendTrace(trace,{kind:'control',scope,control},decision,5);
  assert.deepEqual(selectTrace(trace).entries.map(x=>x.input.control.value),[37,true,'software',2.75]);
  assert.equal(selectTrace(trace).replayableControls,4);assert.equal(selectTrace(trace).exactExternalReplay,false);
  assert.throws(()=>appendTrace(trace,input(),decision,4),RangeError);assert.throws(()=>appendTrace(trace,input(),decision,Infinity),RangeError);
  for(const capacity of [0,-1,4097,Infinity,1.5])assert.throws(()=>createTrace(capacity),RangeError);
});
test('production mapper retains safe control values and marks private/compound/lifetime inputs',()=>{
  let state=initialPlayerControl(),trace=createTrace();
  const inputs=[{type:'settings.change',value:{volume:37}},{type:'settings.change',value:{vf:'private-filter-token'}},{type:'settings.accept',value:{...state.settings,vf:'secret'}},{type:'source.begin',operationEpoch:0,mode:'native',preserve:false,planId:'https://secret.invalid'},{type:'seek.request',latest:true}];
  for(const value of inputs){const before=state,result=transitionPlayer(state,value);state=result.state;trace=tracePlayerTransition(trace,value,before,result,state.revision);}
  assert.deepEqual(trace.entries[0].input.control,{name:'volume',value:37});
  assert.deepEqual(trace.entries.slice(1).map(x=>[x.input.kind,x.input.reason]),[['omitted','private-payload'],['omitted','compound-settings'],['omitted','private-payload'],['omitted','missing-payload']]);
  assert.equal(JSON.stringify(trace).includes('secret'),false);assert.equal(JSON.stringify(trace).includes('private-filter'),false);
  assert.ok(trace.entries.every(x=>x.decision.status==='unknown'));
});
test('fixed simulated adapters replay deferred and retired effects deterministically',async()=>{
  const history=[{type:'submit',kind:'backend.play',lane:'scheduled'},{type:'flush'},{type:'retire'},{type:'resolve',call:1},{type:'submit',kind:'timer.wait',lane:'immediate',deadline:10},{type:'advance',time:10}];
  const first=await replaySimulatedHistory(history),second=await replaySimulatedHistory(history);
  assert.deepEqual(first,second);assert.deepEqual(first.outcomes,[{id:1,kind:'retired'},{id:2,kind:'completed'}]);assert.equal(first.pending,0);assert.equal(first.timers,0);
  assert.equal(first.trace.exactExternalReplay,false);
});
test('schedule shrinking preserves an identity-check mutant and produces a replayable minimal witness',async()=>{
  const history=[{type:'advance',time:1},{type:'submit',kind:'backend.play',lane:'immediate'},{type:'advance',time:2},{type:'retire'},{type:'advance',time:3},{type:'resolve',call:1},{type:'advance',time:4}];
  const fails=async steps=>{try{const correct=await replaySimulatedHistory(steps),mutant=await replaySimulatedHistory(steps,{ignoreRetirement:true});return JSON.stringify(correct.outcomes)!==JSON.stringify(mutant.outcomes);}catch{return false;}};
  const result=await shrinkSimulatedHistory(history,fails);assert.equal(result.oneMinimal,true);assert.equal(result.budgetExhausted,false);
  assert.deepEqual(result.history.map(x=>x.type),['submit','retire','resolve']);assert.equal(await fails(result.history),true);
  for(let i=0;i<result.history.length;i++)assert.equal(await fails(result.history.filter((_,j)=>i!==j)),false);
  assert.deepEqual(await shrinkSimulatedHistory(history,fails),result);
});
test('replay and shrink budgets reject unsupported actions and never pretend an exhausted search is minimal',async()=>{
  await assert.rejects(replaySimulatedHistory([{type:'fetch',url:'https://secret.invalid'}]),/Unsupported/);
  await assert.rejects(replaySimulatedHistory(Array.from({length:129},()=>({type:'flush'}))),/limit/);
  const result=await shrinkSimulatedHistory([{type:'flush'},{type:'retire'}],async()=>true,{maxTrials:1});
  assert.equal(result.trials,1);assert.equal(result.budgetExhausted,true);assert.equal(result.oneMinimal,false);
  await assert.rejects(shrinkSimulatedHistory([],async()=>false),/does not reproduce/);
});
