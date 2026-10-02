// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialAdvancedControls,transitionAdvancedControls,advancedControlsBlocked,advancedFeatureDisabled,advancedShouldSync,advancedControlValue} from '../../web/generated/internal/machine/advanced-controls.js';

const initial=()=>initialAdvancedControls({apply:'Apply',reset:'Reset'});
const owner={ownerId:1,sourceId:10};
const start=(state,patch={})=>transitionAdvancedControls(state,{type:'start',...owner,destroyed:false,connected:true,pending:false,...patch});

test('advanced controls reject overlapping and detached work while source replacement retires pending ownership',()=>{
  const first=start(initial());assert.equal(first.accepted,true);assert.equal(first.state.busy,true);
  assert.equal(start(first.state).accepted,false);
  const replacement=start(first.state,{sourceId:11});assert.equal(replacement.accepted,true);
  assert.ok(replacement.operation>first.operation);
  const stale=transitionAdvancedControls(replacement.state,{type:'settled',operation:first.operation});
  assert.equal(stale.accepted,false);assert.equal(stale.state.busy,true);
  const finished=transitionAdvancedControls(stale.state,{type:'settled',operation:replacement.operation});
  assert.equal(finished.state.busy,false);
  for(const patch of [{connected:false},{destroyed:true},{pending:true},{ownerId:null,sourceId:null}]) assert.equal(start(initial(),patch).accepted,false);
});

test('same source ID under a replacement owner clears source drafts and ignores the old operation',()=>{
  const first=start(initial());
  const drafted=transitionAdvancedControls(first.state,{type:'dirty',field:'advanced-vf',value:'hflip'}).state;
  const signed=transitionAdvancedControls(drafted,{type:'signature',field:'chapter',value:'old'}).state;
  const changed=transitionAdvancedControls(signed,{type:'reconcile',ownerId:2,sourceId:10}).state;
  assert.equal(changed.busy,false);assert.deepEqual(changed.dirty,[]);assert.deepEqual(changed.drafts,{});assert.deepEqual(changed.signatures,{});
  assert.equal(transitionAdvancedControls(changed,{type:'settled',operation:first.operation}).accepted,false);
  assert.equal(start(changed,{ownerId:2}).accepted,true);
});

test('failed or obsolete Apply cannot clear a replacement draft; current success clears only its fields',()=>{
  const operation=start(initial());
  let state=transitionAdvancedControls(operation.state,{type:'dirty',field:'advanced-vf',value:'hflip'}).state;
  state=transitionAdvancedControls(state,{type:'dirty',field:'advanced-af',value:'volume=0.5'}).state;
  state=transitionAdvancedControls(state,{type:'settled',operation:operation.operation}).state;
  assert.equal(advancedControlValue(state,'advanced-vf','external renderer text'),'hflip');
  const cleaned=transitionAdvancedControls(state,{type:'clean',fields:['advanced-vf'],operation:operation.operation}).state;
  assert.deepEqual(cleaned.dirty,['advanced-af']);assert.deepEqual(cleaned.drafts,{'advanced-af':'volume=0.5'});
  const next=start(cleaned,{sourceId:11});
  state=transitionAdvancedControls(next.state,{type:'dirty',field:'advanced-vf',value:'replacement'}).state;
  const stale=transitionAdvancedControls(state,{type:'clean',fields:['advanced-vf'],operation:operation.operation});
  assert.equal(stale.accepted,false);assert.equal(stale.state.drafts['advanced-vf'],'replacement');
});

test('draft and focus merge policy preserves edits until current accepted settings replace them',()=>{
  const state=transitionAdvancedControls(initial(),{type:'dirty',field:'vf',value:'typed'}).state;
  assert.equal(advancedShouldSync(state,'vf',true,false,true),false);
  assert.equal(advancedShouldSync(state,'vf',false,false,true),true);
  assert.equal(advancedShouldSync(state,'clean',true,true,false),false);
  assert.equal(advancedShouldSync(state,'clean',true,true,true),true);
  assert.equal(advancedControlValue(state,'vf','old'),'typed');
  assert.equal(advancedControlValue(state,'other','observed'),'observed');
});

test('control and feature availability preserve permission attempts and switchable route actions',()=>{
  const state=initial(),facts={destroyed:false,pending:false,sourceId:1};
  assert.equal(advancedControlsBlocked(state,facts),false);
  for(const patch of [{destroyed:true},{pending:true},{sourceId:null}]) assert.equal(advancedControlsBlocked(state,{...facts,...patch}),true);
  assert.equal(advancedControlsBlocked(start(state).state,facts),true);
  const unknown={availability:'unknown',reason:'Permission unknown'};
  for(const feature of ['snapshot','audioOutputDevice']) assert.equal(advancedFeatureDisabled(false,feature,unknown),false);
  assert.equal(advancedFeatureDisabled(false,'videoFilters',unknown),true);
  assert.equal(advancedFeatureDisabled(false,'videoFilters',{availability:'switch',mode:'software',reason:'Switch'}),false);
  assert.equal(advancedFeatureDisabled(true,'snapshot',{availability:'available'}),true);
});

test('labels and option signatures are immutable configuration and cannot erase current drafts',()=>{
  const labels={apply:'Go'},original=initial();
  let state=transitionAdvancedControls(original,{type:'dirty',field:'vf',value:'hflip'}).state;
  const first=transitionAdvancedControls(state,{type:'signature',field:'chapter',value:'one'});assert.equal(first.changed,true);state=first.state;
  assert.equal(transitionAdvancedControls(state,{type:'signature',field:'chapter',value:'one'}).changed,false);
  state=transitionAdvancedControls(state,{type:'labels',labels}).state;labels.apply='mutated';
  assert.equal(state.labels.apply,'Go');assert.deepEqual(state.signatures,{});assert.equal(state.drafts.vf,'hflip');
  assert.deepEqual(original.drafts,{});assert.ok(Object.isFrozen(state.drafts));assert.ok(Object.isFrozen(state.labels));
});

test('owner allocation and repeated reconciliation do not disturb current accepted actions',()=>{
  const one=transitionAdvancedControls(initial(),{type:'allocate-owner'}),two=transitionAdvancedControls(one.state,{type:'allocate-owner'});
  assert.equal(one.ownerId,1);assert.equal(two.ownerId,2);
  const pending=start(two.state);
  const same=transitionAdvancedControls(pending.state,{type:'reconcile',...owner});
  assert.equal(same.state,pending.state);
  assert.equal(same.changed,false);
  assert.equal(same.state.busy,true);
  const retirement=transitionAdvancedControls(same.state,{type:'reconcile',ownerId:null,sourceId:null});
  assert.equal(retirement.changed,true);
  const detached=retirement.state;
  assert.equal(detached.busy,false);assert.ok(detached.operation>pending.operation);
});
