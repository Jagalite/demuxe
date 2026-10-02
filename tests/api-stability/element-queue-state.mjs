// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialElementQueue,transitionElementQueue,queueSelectionAllowed,queueClosesRollback} from '../../web/generated/internal/machine/element-queue.js';
const step=(state,command)=>transitionElementQueue(state,command);
const append=(state,names)=>step(state,{type:'append',names,terminal:false});
const start=(state,index)=>step(state,{type:'start',index,terminal:false});
const opened=(state,operation,sourceId,defaultPlay=false)=>step(state,{type:'opened',operation,sourceId,defaultPlay});
const settled=(state,operation)=>step(state,{type:'settled',operation});
const advance=(state,sourceId,patch={})=>step(state,{type:'advance',sourceId,status:'ended',pending:false,terminal:false,...patch});

test('queue keeps only immutable display metadata with monotonic resource and operation identities',()=>{
 const original=initialElementQueue(),names=['one','two'];const added=append(original,names);names[0]='mutated';
 assert.deepEqual(added.added,[{id:1,name:'one'},{id:2,name:'two'}]);assert.equal(added.activate,0);assert.deepEqual(original.items,[]);
 assert.ok(Object.isFrozen(added.state.items));assert.ok(Object.isFrozen(added.state.items[0]));
 const first=start(added.state,0),reset=step(first.state,{type:'reset'}),next=append(reset.state,['three']),second=start(next.state,0);
 assert.equal(next.added[0].id,3);assert.ok(second.operation>first.operation);assert.equal(opened(second.state,first.operation,10).accepted,false);
});

test('opening preserves latest play or pause intent and only current operation may settle',()=>{
 for(const defaults of [true,false])for(const sequence of [[],[true],[false],[true,false],[false,true],[true,false,true,false]]){
  const first=start(append(initialElementQueue(),['one','two']).state,0);let state=first.state;
  for(const play of sequence)state=step(state,{type:'intent',play}).state;
  const accepted=opened(state,first.operation,10,defaults);assert.equal(accepted.play,sequence.at(-1)??defaults);
  const second=start(accepted.state,1);assert.equal(settled(second.state,first.operation).accepted,false);assert.equal(second.state.operation,second.operation);
  assert.equal(opened(second.state,first.operation,10).error,'superseded');
  state=settled(opened(second.state,second.operation,11).state,second.operation).state;
  assert.equal(state.operation,null);assert.equal(state.sourceId,11);assert.equal(step(state,{type:'intent',play:true}).state,state);
 }
});

test('ended observations advance only the current completed source and deduplicate reentrant notifications',()=>{
 const first=start(append(initialElementQueue(),['one','two','three']).state,0);
 let state=opened(first.state,first.operation,10).state;
 assert.equal(advance(state,10).accepted,false);
 state=settled(state,first.operation).state;
 for(const patch of [{pending:true},{terminal:true},{status:'paused'}])assert.equal(advance(state,10,patch).accepted,false);
 assert.equal(advance(state,11).accepted,false);
 const next=advance(state,10);assert.equal(next.activate,1);assert.equal(advance(next.state,10).accepted,false);
 const second=start(next.state,1);state=settled(opened(second.state,second.operation,11).state,second.operation).state;
 assert.equal(advance(state,10).accepted,false);assert.equal(advance(state,11).activate,2);
 const final=start(state,2);state=settled(opened(final.state,final.operation,12).state,final.operation).state;
 assert.equal(advance(state,12).accepted,false);
});

test('queue removal chooses the adjacent item and rollback cleanup cannot target a newer operation',()=>{
 let state=append(initialElementQueue(),['one','two','three']).state;
 const first=start(state,1);state=settled(opened(first.state,first.operation,20).state,first.operation).state;
 let removed=step(state,{type:'remove',index:0,pending:false,sourceControls:true});assert.equal(removed.activate,undefined);assert.equal(removed.state.index,0);
 removed=step(removed.state,{type:'remove',index:0,pending:false,sourceControls:true});assert.equal(removed.activate,0);assert.equal(removed.removedId,2);
 const replacement=start(removed.state,removed.activate);assert.equal(queueClosesRollback(replacement.state,replacement.operation,true),true);
 assert.equal(queueClosesRollback(replacement.state,first.operation,true),false);assert.equal(queueClosesRollback(replacement.state,replacement.operation,false),false);
 state=opened(replacement.state,replacement.operation,30).state;assert.equal(queueClosesRollback(state,replacement.operation,true),false);
 state=settled(state,replacement.operation).state;removed=step(state,{type:'remove',index:0,pending:false,sourceControls:true});assert.equal(removed.close,true);assert.equal(removed.activate,undefined);
});

test('manual queue admissions preserve pending source ownership and external replacement retires metadata',()=>{
 const added=append(initialElementQueue(),['one','two']).state;
 for(const facts of [{terminal:true,pending:false},{terminal:false,pending:true}])assert.equal(queueSelectionAllowed(added,facts),false);
 assert.equal(queueSelectionAllowed(added,{terminal:false,pending:false}),true);
 const first=start(added,0);assert.equal(queueSelectionAllowed(first.state,{terminal:false,pending:false}),false);
 for(const patch of [{pending:true},{sourceControls:false},{index:-1},{index:20}])assert.equal(step(added,{type:'remove',index:0,pending:false,sourceControls:true,...patch}).accepted,false);
 assert.equal(step(first.state,{type:'observe-source',sourceId:44}).reset,false);
 const ready=settled(opened(first.state,first.operation,10).state,first.operation).state;
 assert.equal(step(ready,{type:'observe-source',sourceId:10}).reset,false);
 const reset=step(ready,{type:'observe-source',sourceId:11});assert.equal(reset.reset,true);assert.equal(reset.state.items.length,0);assert.equal(reset.state.index,-1);
 assert.equal(step(reset.state,{type:'start',index:0,terminal:true}).error,'destroyed');
 assert.equal(start(reset.state,0).accepted,false);
});

test('queue shell rejects autoplay getter reentry without overwriting the replacement queue',async()=>{
 const {DemuxePlayerElement}=await import('../../web/generated/player/index.js');
 const {initialElementLifecycle}=await import('../../web/generated/internal/machine/element-lifecycle.js');
 const element=Object.create(DemuxePlayerElement.prototype);let plays=0;
 Object.assign(element,{lifecycle:initialElementLifecycle(),queueState:initialElementQueue(),queueResources:new Map(),renderQueue(){},openSource:async()=>{},core:{state:{sourceId:1,status:'paused',playbackIntent:'pause'},async play(){plays++;}}});
 element.appendQueue([{source:'one',name:'one',options:{}}]);
 await assert.rejects(element.activateQueue(0,()=>{element.resetQueue();element.appendQueue([{source:'two',name:'two',options:{}}]);return true;}),error=>error.code==='ABORTED');
 assert.deepEqual(element.queueState.items.map(item=>item.name),['two']);assert.equal(element.queueState.operation,null);assert.equal(plays,0);
});
