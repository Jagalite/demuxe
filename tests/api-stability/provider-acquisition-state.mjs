// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAcquisition,admitAcquisition,admitAcquisitionOwner,finishAcquisitionOwner,admitAcquisitionAsset,observeAcquisitionAsset,retireAcquisition,acquisitionReleases,closeAcquisition} from '../../web/generated/internal/machine/provider-acquisition.js';
const create=()=>createAcquisition({timeoutMs:100,maxResidentBytes:8,owners:['first','second'].map(id=>({id,availability:{state:'configured-unverified'}}))});
const binding={ticketEpoch:0,revisionMatches:true,scopeKey:'source:1',resolved:true};
test('binding tickets reject forged epochs and different scopes without changing authority',()=>{
 const initial=create();assert.equal(admitAcquisition(initial,{...binding,ticketEpoch:null}).effect.reason,'stale');
 const admitted=admitAcquisition(initial,binding);assert.equal(admitted.effect.kind,'accepted');assert.equal(initial.scopeKey,null);
 assert.equal(admitAcquisition(admitted.state,{...binding,scopeKey:'source:2'}).effect.reason,'stale');
 assert.equal(admitAcquisition(initial,{...binding,resolved:false}).effect.reason,'unresolved');
});
test('owner reservation precedes callbacks; completion invalidates earlier catalog tickets',()=>{
 let state=create();const first=admitAcquisitionOwner(state,'first');state=first.state;assert.equal(first.effect.kind,'start');
 assert.equal(admitAcquisitionOwner(state,'first').effect.kind,'join');
 state=finishAcquisitionOwner(state,'first',{kind:'ready'}).state;
 assert.equal(state.catalogEpoch,1);assert.equal(admitAcquisition(state,binding).effect.reason,'stale');
 assert.equal(finishAcquisitionOwner(state,'first',{kind:'failed'}).effect.kind,'ignore');
 assert.equal(state.owners[0].availability.state,'available');
});
test('asset failures retain reservations; duplicates spend no extra bytes and deadlines do not reset',()=>{
 let state=admitAcquisitionAsset(create(),'bundle',6,10).state;
 assert.equal(admitAcquisitionAsset(state,'bundle',6,80).effect.kind,'join');assert.equal(state.assets[0].deadline,110);
 assert.equal(admitAcquisitionAsset(state,'other',3,20).effect.reason,'budget');
 assert.equal(observeAcquisitionAsset(state,'bundle',{kind:'deadline',now:109}).effect.kind,'ignore');
 const deadline=observeAcquisitionAsset(state,'bundle',{kind:'deadline',now:110});assert.equal(deadline.effect.kind,'accepted');state=deadline.state;
 assert.equal(observeAcquisitionAsset(state,'bundle',{kind:'chunk',bytes:1}).effect.reason,'retired');
 state=observeAcquisitionAsset(state,'bundle',{kind:'failed'}).state;
 assert.equal(state.reservedBytes,6);assert.equal(admitAcquisitionAsset(state,'bundle',6,120).effect.kind,'join');
 assert.equal(closeAcquisition(retireAcquisition(state).state).reservedBytes,0);
});
test('partial bodies and digest verification cannot publish oversized or unverified bytes',()=>{
 let state=admitAcquisitionAsset(create(),'a',4,0).state;
 state=observeAcquisitionAsset(state,'a',{kind:'chunk',bytes:3}).state;
 assert.equal(observeAcquisitionAsset(state,'a',{kind:'body'}).effect.reason,'size');
 assert.equal(observeAcquisitionAsset(state,'a',{kind:'chunk',bytes:2}).effect.reason,'overflow');
 state=observeAcquisitionAsset(state,'a',{kind:'chunk',bytes:1}).state;
 assert.equal(observeAcquisitionAsset(state,'a',{kind:'body'}).effect.kind,'accepted');
 assert.equal(observeAcquisitionAsset(state,'a',{kind:'digest',matches:false}).effect.reason,'integrity');
 state=observeAcquisitionAsset(state,'a',{kind:'digest',matches:true}).state;assert.equal(state.assets[0].status,'ready');
});
test('retired owners release late ready handles once without recording provider failure',()=>{
 let state=admitAcquisitionOwner(create(),'first').state;state=retireAcquisition(state).state;
 const completion=finishAcquisitionOwner(state,'first',{kind:'ready'});assert.equal(completion.effect.kind,'release');
 assert.equal(completion.state.catalogEpoch,0);assert.equal(completion.state.owners[0].availability.state,'configured-unverified');
 assert.equal(finishAcquisitionOwner(completion.state,'first',{kind:'ready'}).effect.kind,'ignore');
 assert.deepEqual(acquisitionReleases(completion.state),[]);
});
test('ready owners are released in reverse completion order and retained inputs remain unchanged',()=>{
 const owners=[{id:'first',availability:{state:'configured-unverified'}},{id:'second',availability:{state:'configured-unverified'}}];
 let state=createAcquisition({timeoutMs:100,maxResidentBytes:8,owners});owners[0].availability.state='absent';
 const initial=state;for(const id of ['first','second'])state=admitAcquisitionOwner(state,id).state;
 for(const id of ['second','first'])state=finishAcquisitionOwner(state,id,{kind:'ready'}).state;
 assert.deepEqual(acquisitionReleases(state),['first','second']);assert.equal(initial.owners[0].availability.state,'configured-unverified');
 assert.equal(Object.isFrozen(state.owners[0].availability),true);
});
test('varied cancellation positions replay deterministically and never resurrect retired admission',()=>{
 for(let stop=0;stop<5;stop++){
  const run=()=>{let state=create();const history=[];const events=[s=>admitAcquisition(s,binding).state,s=>admitAcquisitionOwner(s,'first').state,s=>admitAcquisitionAsset(s,'a',4,0).state,s=>observeAcquisitionAsset(s,'a',{kind:'chunk',bytes:4}).state,s=>finishAcquisitionOwner(s,'first',{kind:'ready'}).state];
   for(let i=0;i<events.length;i++){if(i===stop)state=retireAcquisition(state).state;state=events[i](state);history.push(state);}return history;};
  const first=run();assert.deepEqual(run(),first);assert.equal(first.at(-1).phase,'retiring');assert.equal(admitAcquisitionOwner(first.at(-1),'second').effect.reason,'retired');
 }
});
