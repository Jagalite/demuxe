// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createResourceLedger,transitionResourceLedger,resourceMetadata,resourceAvailable,resourceScopeRetired,resourceLedgerDiagnostics} from '../../web/generated/internal/machine/resource-ledger.js';
const registration=(id='r',scopeKey='s')=>({type:'register',id,scopeKey,kind:'backend',ownership:'owned'});
const step=(state,input)=>transitionResourceLedger(state,input).state;
const acquired=()=>step(createResourceLedger(),registration());
const releasing=()=>step(acquired(),{type:'release',id:'r'});

test('admission copies scalar metadata and rejects invalid ownership without consuming capacity',()=>{
  const initial=createResourceLedger({maxResources:1}),input=registration();
  const invalid=transitionResourceLedger(initial,{...input,ownership:'other'});
  assert.equal(invalid.accepted,false);assert.equal(invalid.reason,'invalid-ownership');assert.equal(invalid.state,initial);
  input.value={private:true};const accepted=transitionResourceLedger(initial,input);input.id='changed';
  assert.deepEqual(accepted.state.resources,[{id:'r',scopeKey:'s',kind:'backend',ownership:'owned',state:'active'}]);
  assert.equal(Object.isFrozen(input),false);assert.equal(Object.isFrozen(input.value),false);
  for(const value of [accepted,accepted.state,accepted.state.resources,accepted.state.resources[0],accepted.state.scopes[0]])assert.ok(Object.isFrozen(value));
  assert.equal(initial.resources.length,0);
});

test('resource and scope tombstones stay bounded across successful cleanup',()=>{
  let state=createResourceLedger({maxResources:1,maxScopes:1});
  assert.equal(resourceScopeRetired(state,'unseen'),false);assert.equal(state.scopes.length,0);
  state=step(state,registration());state=step(state,{type:'release',id:'r'});state=step(state,{type:'physical-result',id:'r',success:true});
  for(const [input,reason]of [[registration(),'duplicate'],[registration('new'),'resource-capacity'],[{type:'retire-scope',scopeKey:'new'},'scope-capacity']]){
    const rejected=transitionResourceLedger(state,input);assert.equal(rejected.reason,reason);assert.equal(rejected.state,state);
  }
  assert.equal(resourceMetadata(state,'r').state,'released');assert.equal(state.resources.length,1);assert.equal(state.scopes.length,1);
});

test('scope retirement and disposal invalidate all handles before reverse cleanup starts',()=>{
  let state=createResourceLedger();for(const [id,scope]of [['a','one'],['b','two'],['c','one']])state=step(state,registration(id,scope));
  const before=state,retired=transitionResourceLedger(state,{type:'retire-scope',scopeKey:'one'});state=retired.state;
  assert.deepEqual(retired.ids,['c','a']);assert.equal(resourceAvailable(state,'a'),false);assert.equal(resourceAvailable(state,'c'),false);assert.equal(resourceAvailable(state,'b'),true);
  assert.equal(resourceAvailable(before,'a'),true);assert.equal(resourceLedgerDiagnostics(state).retiring,2);
  const disposed=transitionResourceLedger(state,{type:'dispose'});assert.deepEqual(disposed.scopeKeys,['two','one']);
  assert.equal(resourceAvailable(disposed.state,'b'),false);assert.equal(resourceScopeRetired(disposed.state,'unknown'),true);
  assert.equal(transitionResourceLedger(disposed.state,{type:'dispose'}).state,disposed.state);
});

test('late registration into retired or disposed scopes is unavailable and cannot resurrect them',()=>{
  for(const event of [{type:'retire-scope',scopeKey:'s'},{type:'dispose'}]){
    let state=step(createResourceLedger(),event);state=step(state,registration());
    assert.equal(resourceScopeRetired(state,'s'),true);assert.equal(resourceAvailable(state,'r'),false);
    assert.equal(resourceLedgerDiagnostics(state).retiring,1);
    const release=transitionResourceLedger(state,{type:'release',id:'r'});assert.equal(release.start,true);
    state=step(release.state,{type:'physical-result',id:'r',success:true});assert.equal(resourceAvailable(state,'r'),false);
  }
});

test('release and completion require matching identity and never execute twice',()=>{
  let state=acquired();const rejected=transitionResourceLedger(state,{type:'release',id:'r',expectedScopeKey:'other'});
  assert.equal(rejected.reason,'scope-mismatch');assert.equal(rejected.state,state);
  assert.equal(transitionResourceLedger(state,{type:'physical-result',id:'r',success:true}).state,state);
  const started=transitionResourceLedger(state,{type:'release',id:'r'});assert.equal(started.start,true);state=started.state;
  assert.equal(transitionResourceLedger(state,{type:'release',id:'r'}).start,false);
  state=step(state,{type:'physical-result',id:'r',success:true});
  for(const input of [{type:'release',id:'r'},{type:'physical-result',id:'r',success:false},{type:'deadline',id:'r',reason:'timeout'}]){
    const ignored=transitionResourceLedger(state,input);assert.equal(ignored.start,false);assert.equal(ignored.state,state);
  }
});

for(const success of [true,false])for(const deadlineFirst of [true,false])test(`cleanup ordering deadlineFirst=${deadlineFirst} success=${success}`,()=>{
  let state=releasing();const original=state;
  const deadline={type:'deadline',id:'r',reason:'timeout'},physical={type:'physical-result',id:'r',success};
  for(const input of deadlineFirst?[deadline,physical]:[physical,deadline])state=step(state,input);
  const info=resourceLedgerDiagnostics(state);
  assert.equal(resourceMetadata(state,'r').state,success?'released':'failed');assert.equal(info.detached,0);
  assert.equal(info.released,success?1:0);assert.equal(info.timedOut,deadlineFirst?1:0);
  assert.equal(info.failed,deadlineFirst||!success?1:0);assert.equal(info.lateReleased,deadlineFirst&&success?1:0);assert.equal(info.lateFailed,deadlineFirst&&!success?1:0);
  assert.equal(resourceMetadata(original,'r').state,'releasing');
});

test('scheduler failure records detachment separately from an elapsed deadline',()=>{
  const detached=transitionResourceLedger(releasing(),{type:'deadline',id:'r',reason:'scheduler'}).state;
  const info=resourceLedgerDiagnostics(detached);assert.equal(info.detached,1);assert.equal(info.released,0);assert.equal(info.timedOut,0);assert.equal(info.deadlineErrors,1);
  assert.equal(info.failures[0].name,'CleanupSchedulerError');
  const late=step(detached,{type:'physical-result',id:'r',success:true});assert.equal(late.lateReleased,1);assert.equal(late.failureCount,1);
  assert.equal(resourceMetadata(detached,'r').state,'detached');
});

test('failure summaries remain bounded independently of lifetime counters',()=>{
  let state=createResourceLedger({failureLimit:2});
  for(let i=0;i<5;i++){state=step(state,registration(String(i)));state=step(state,{type:'release',id:String(i)});state=step(state,{type:'physical-result',id:String(i),success:false});}
  assert.equal(state.failureCount,5);assert.deepEqual(state.failures.map(value=>value.id),['3','4']);assert.ok(Object.isFrozen(state.failures[0]));
});

for(const seed of [1,7,13,24301])test(`resource histories preserve retirement and phase accounting seed=${seed}`,()=>{
  let random=seed,state=createResourceLedger({maxResources:16,maxScopes:4,failureLimit:3});
  const next=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random;};
  const terminal=new Set(),retired=new Set();
  for(let i=0;i<400;i++){
    const id=String(next()%20),scopeKey=String(next()%6),choice=next()%7;
    const input=[registration(id,scopeKey),{type:'release',id},{type:'deadline',id,reason:'timeout'},{type:'physical-result',id,success:!!(next()%2)},{type:'retire-scope',scopeKey},{type:'physical-result',id,success:false},{type:'dispose'}][choice];
    if(input.type==='dispose'&&i<300)continue;
    state=step(state,input);const info=resourceLedgerDiagnostics(state);
    assert.ok(state.resources.length<=16);assert.ok(state.scopes.length<=4);assert.ok(state.failures.length<=3);
    assert.equal(info.active+info.retiring+info.releasing+info.released+info.detached+state.resources.filter(value=>value.state==='failed').length,state.resources.length);
    for(const entry of state.resources){if(terminal.has(entry.id))assert.ok(['released','failed'].includes(entry.state));if(['released','failed'].includes(entry.state))terminal.add(entry.id);}
    for(const scope of state.scopes){if(retired.has(scope.key))assert.equal(scope.retired,true);if(scope.retired)retired.add(scope.key);}
    if(state.disposed)assert.equal(info.active,0);
  }
});
