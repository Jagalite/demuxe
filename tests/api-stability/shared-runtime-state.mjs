// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSharedAssets,transitionSharedAssets,reservedAssetBytes} from '../../web/generated/internal/machine/shared-assets.js';
import {initialSharedRuntime,admitSharedRuntimeLoad,failSharedRuntimeLoad,publishSharedRuntime,retireSharedRuntime} from '../../web/generated/internal/machine/shared-runtime.js';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {initialPresentationState,transitionPresentation} from '../../web/generated/internal/machine/presentation.js';
const provider=id=>Object.freeze({id,implementationIdentity:id,manifestMatches:true,assets:Object.freeze([]),profiles:Object.freeze([])});

test('cache sequences preserve budget, unique reservations, pending ownership and retirement',()=>{
  let visited=0;
  const walk=(state,depth)=>{
    assert.ok(Object.isFrozen(state));assert.ok(Object.isFrozen(state.entries));
    assert.ok(reservedAssetBytes(state)<=state.maxBytes);
    assert.equal(new Set(state.entries.map(e=>e.key)).size,state.entries.length);
    assert.equal(new Set(state.entries.map(e=>e.id)).size,state.entries.length);
    if(state.retired)assert.equal(state.entries.length,0);
    if(!depth)return;
    const commands=[{type:'reserve',key:'a',bytes:6},{type:'reserve',key:'b',bytes:4},{type:'reserve',key:'c',bytes:7},{type:'clear'},{type:'retire'},...state.entries.flatMap(e=>[{type:'ready',id:e.id},{type:'failed',id:e.id}]),{type:'ready',id:0}];
    for(const command of commands){
      const before=JSON.stringify(state),decision=transitionSharedAssets(state,Object.freeze(command));
      assert.deepEqual(decision,transitionSharedAssets(state,command),'deterministic replay');assert.equal(JSON.stringify(state),before,'input mutation');
      if(command.type==='reserve'&&!state.retired)for(const entry of state.entries.filter(e=>!e.ready))assert.ok(decision.state.entries.some(e=>e.id===entry.id),'pending reservation evicted');
      visited++;walk(decision.state,depth-1);
    }
  };
  walk(initialSharedAssets(10),5);assert.ok(visited>10000);
});

test('cache LRU touch, failed retry, clear and stale completion use distinct ownership',()=>{
  let state=initialSharedAssets(10);
  const send=c=>{const d=transitionSharedAssets(state,c);state=d.state;return d;};
  const a=send({type:'reserve',key:'a',bytes:5}).id;send({type:'ready',id:a});
  const b=send({type:'reserve',key:'b',bytes:5}).id;send({type:'ready',id:b});
  assert.equal(send({type:'reserve',key:'a',bytes:5}).id,a);
  send({type:'reserve',key:'c',bytes:5});assert.deepEqual(state.entries.map(e=>e.key),['a','c']);
  send({type:'clear'});assert.deepEqual(state.entries.map(e=>e.key),['c']);
  const retry=send({type:'reserve',key:'a',bytes:5}).id;assert.notEqual(retry,a);
  send({type:'failed',id:a});send({type:'ready',id:a});assert.equal(state.entries.find(e=>e.id===retry).ready,false);
  send({type:'failed',id:retry});assert.equal(reservedAssetBytes(state),5);
});

test('runtime concurrent loads, retry and stale publication cannot erase accepted providers',()=>{
  let state=initialSharedRuntime({a:'a',b:'b'});
  const a=admitSharedRuntimeLoad(state,'a');state=a.state;assert.equal(admitSharedRuntimeLoad(state,'a').start,false);
  const b=admitSharedRuntimeLoad(state,'b');state=b.state;
  state=failSharedRuntimeLoad(state,a.id);const retry=admitSharedRuntimeLoad(state,'a');state=retry.state;assert.notEqual(retry.id,a.id);
  state=failSharedRuntimeLoad(state,a.id);assert.ok(state.loads.some(load=>load.id===retry.id));
  let result=publishSharedRuntime(state,0,[provider('a')],true);assert.ok(result.published);state=result.state;
  assert.equal(publishSharedRuntime(state,0,[provider('b')],true).accepted,false);
  assert.equal(publishSharedRuntime(state,1,[provider('unknown')],true).accepted,false);
  result=publishSharedRuntime(state,1,[provider('b')],true);state=result.state;assert.deepEqual(state.providers.map(p=>p.id),['a','b']);
  assert.equal(publishSharedRuntime(state,2,[provider('a')],false).state,state);
  state=retireSharedRuntime(state);assert.equal(admitSharedRuntimeLoad(state,'c').id,undefined);assert.equal(publishSharedRuntime(state,2,[provider('a')],true).accepted,false);
});

test('composed routing consumes only observed notifications and rejects terminal updates',()=>{
  let state=initialPlayerControl();
  const send=input=>{const d=transitionPlayer(state,input);state=d.state;return d;};
  send({type:'routing.providers',change:{kind:'notify'}});const through=state.routing.providers.received;
  send({type:'routing.providers',change:{kind:'notify'}});send({type:'routing.providers',change:{kind:'consume',through}});
  assert.deepEqual(state.routing.providers,{received:2,consumed:1});
  send({type:'routing.providers',change:{kind:'consume',through:0}});assert.equal(state.routing.providers.consumed,1);
  state=Object.freeze({...state,operations:Object.freeze({...state.operations,terminal:true})});
  assert.equal(send({type:'routing.providers',change:{kind:'notify'}}).accepted,false);assert.equal(state.routing.providers.received,2);
});

test('presentation replacement generations fence reentry, failure cleanup, native entry and destruction',()=>{
  let state=initialPresentationState();const send=c=>{const d=transitionPresentation(state,c);state=d.state;return d;};
  const a=send({type:'viewport.replace'}).requestId;send({type:'viewport.install',id:a,present:true});
  const b=send({type:'viewport.replace'}).requestId;const c=send({type:'viewport.replace'}).requestId;
  send({type:'viewport.install',id:c,present:true});assert.equal(send({type:'viewport.check',id:b}).error.code,'ABORTED');
  send({type:'viewport.remove',id:a});assert.equal(state.viewportOwner,c);
  assert.equal(send({type:'viewport.request',available:true,nativePresentation:false}).requestId,c);
  send({type:'fullscreen.request',containsHost:true,supported:true});assert.equal(send({type:'viewport.request',available:true,nativePresentation:false}).error.code,'UNSUPPORTED_FEATURE');
  assert.equal(send({type:'metadata.check',sourceId:1,currentSourceId:2}).error.code,'ABORTED');
  send({type:'destroy'});assert.equal(state.viewportOwner,null);assert.equal(send({type:'viewport.install',id:c,present:true}).error.code,'ABORTED');
});


test('document viewport leases deny overlap and stale releases cannot retire a successor',async()=>{
 const {initialViewportLease,acquireViewportLease,releaseViewportLease}=await import('../../web/generated/internal/machine/viewport-lease.js');
 const initial=initialViewportLease(),a=acquireViewportLease(initial);
 assert.equal(initial.owner,null);assert.equal(a.id,1);
 assert.equal(acquireViewportLease(a.state).id,null);
 const released=releaseViewportLease(a.state,a.id),b=acquireViewportLease(released);
 assert.equal(b.id,2);assert.equal(releaseViewportLease(b.state,a.id),b.state);
 assert.equal(acquireViewportLease({...released,serial:Number.MAX_SAFE_INTEGER}).id,null);
});
