// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialElementLifecycle,transitionElementLifecycle,elementSourceCurrent,initialMediaElementBinding,transitionMediaElementBinding,mediaElementBindingCurrent} from '../../web/generated/internal/machine/element-lifecycle.js';
const step=(state,command)=>transitionElementLifecycle(state,command);

test('connection ownership distinguishes reparenting from permanent detach across arbitrarily ordered microtasks',()=>{
 const first=step(initialElementLifecycle(),{type:'connect'}),disconnect=step(first.state,{type:'disconnect'}),second=step(disconnect.state,{type:'connect'});
 assert.equal(step(second.state,{type:'disconnect-ready',connection:disconnect.connection,connected:true}).accepted,false);
 assert.equal(step(second.state,{type:'connect-ready',connection:first.connection,connected:true}).accepted,false);
 assert.equal(step(second.state,{type:'connect-ready',connection:second.connection,connected:true}).accepted,true);
 const next=step(second.state,{type:'disconnect'}),retired=step(next.state,{type:'disconnect-ready',connection:next.connection,connected:false});
 assert.equal(retired.accepted,true);assert.equal(retired.state.source,second.state.source+1);
 assert.equal(step(retired.state,{type:'connect-ready',connection:second.connection,connected:false}).accepted,false);
});

test('source authority retires before abort effects and stale completions cannot name a replacement source',()=>{
 let state=initialElementLifecycle();const first=step(state,{type:'source-start'}),second=step(first.state,{type:'source-start'});state=second.state;
 assert.equal(elementSourceCurrent(state,first.source,{aborted:false,sameOwner:true}),false);
 assert.equal(elementSourceCurrent(state,second.source,{aborted:false,sameOwner:true}),true);
 assert.equal(elementSourceCurrent(state,second.source,{aborted:true,sameOwner:true}),false);
 assert.equal(elementSourceCurrent(state,second.source,{aborted:false,sameOwner:false}),false);
 state=step(state,{type:'source-retire'}).state;assert.equal(elementSourceCurrent(state,second.source,{aborted:false,sameOwner:true}),false);
 const next=step(state,{type:'source-start'});assert.ok(next.source>second.source);
 state=step(next.state,{type:'destroy'}).state;assert.equal(elementSourceCurrent(state,next.source,{aborted:false,sameOwner:true}),false);
});

test('destruction is terminal and repeated cleanup leaves generation stable',()=>{
 const original=initialElementLifecycle(),destroyed=step(original,{type:'destroy'});assert.equal(original.terminal,false);assert.equal(destroyed.state.terminal,true);
 assert.equal(step(destroyed.state,{type:'destroy'}).state,destroyed.state);
 assert.equal(step(destroyed.state,{type:'source-start'}).accepted,false);
 assert.equal(step(destroyed.state,{type:'connect'}).accepted,false);
 assert.equal(step(destroyed.state,{type:'disconnect-ready',connection:destroyed.state.connection,connected:false}).accepted,false);
 assert.ok(Object.isFrozen(destroyed.state));
});

test('attribute changes coalesce but flush observes current owner and terminal state',()=>{
 const initial=initialElementLifecycle(),scheduled=step(initial,{type:'schedule-attribute'});assert.equal(scheduled.accepted,true);
 assert.equal(step(scheduled.state,{type:'schedule-attribute'}).accepted,false);
 const empty=step(scheduled.state,{type:'flush-attribute',hasOwner:false});assert.equal(empty.accepted,false);assert.equal(empty.state.attributeScheduled,false);
 assert.equal(step(step(empty.state,{type:'schedule-attribute'}).state,{type:'flush-attribute',hasOwner:true}).accepted,true);
 const destroyed=step(scheduled.state,{type:'destroy'}).state;assert.equal(step(destroyed,{type:'flush-attribute',hasOwner:true}).accepted,false);
});

test('borrowed media binding rejects overlap, fences event delivery and permits a fresh generation after disposal',()=>{
 const step=transitionMediaElementBinding,initial=initialMediaElementBinding(),bound=step(initial,{type:'bind'});assert.equal(bound.accepted,true);assert.equal(step(bound.state,{type:'bind'}).accepted,false);
 const generation=bound.state.generation;assert.equal(mediaElementBindingCurrent(bound.state,generation),true);
 const disposed=step(bound.state,{type:'dispose'});assert.equal(mediaElementBindingCurrent(disposed.state,generation),false);assert.equal(step(disposed.state,{type:'dispose'}).state,disposed.state);
 const rebound=step(disposed.state,{type:'bind'});assert.equal(rebound.accepted,true);assert.equal(mediaElementBindingCurrent(rebound.state,generation),false);assert.equal(mediaElementBindingCurrent(rebound.state,rebound.state.generation),true);
});

test('borrowed media element disconnect microtasks cannot dispose a later connected binding',()=>{
 const step=transitionMediaElementBinding,bound=step(initialMediaElementBinding(),{type:'bind'}).state;
 const detached=step(bound,{type:'disconnect'}).state,reconnected=step(detached,{type:'connect'}).state;
 assert.equal(step(reconnected,{type:'disconnect-ready',connection:detached.connection,connected:false}).accepted,false);
 const next=step(reconnected,{type:'disconnect'}).state;
 assert.equal(step(next,{type:'disconnect-ready',connection:next.connection,connected:true}).accepted,false);
 assert.equal(step(next,{type:'disconnect-ready',connection:next.connection,connected:false}).accepted,true);
});

test('muted initialization completion admits same-owner reparenting but cannot resolve a detached or replacement readiness',async()=>{
 const connected=step(initialElementLifecycle(),{type:'connect'});let state=connected.state,sameOwner=true,isConnected=true;
 const finish=()=>step(state,{type:'owner-ready',sameOwner,connected:isConnected}).accepted;
 // A user activation or host relocation can move the same owner while mute is pending.
 state=step(state,{type:'disconnect'}).state;state=step(state,{type:'connect'}).state;
 await Promise.resolve();assert.equal(finish(),true);
 // Permanent disconnection installs a new readiness promise; old completion or rejection is ignored.
 const detached=step(state,{type:'disconnect'});state=step(detached.state,{type:'disconnect-ready',connection:detached.connection,connected:false}).state;
 isConnected=false;sameOwner=false;await Promise.resolve();assert.equal(finish(),false);
 state=step(state,{type:'connect'}).state;isConnected=true;assert.equal(finish(),false,'Old initialization must not settle replacement readiness');
 sameOwner=true;assert.equal(finish(),true);
 state=step(state,{type:'destroy'}).state;assert.equal(finish(),false);
});
