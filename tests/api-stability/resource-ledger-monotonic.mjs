// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createResourceLedger,transitionResourceLedger,resourceScopeRetired,resourceAvailable} from '../../web/generated/internal/machine/resource-ledger.js';
import {ResourceRegistry} from '../../web/generated/internal/effects/resources.js';
const reg=(id,scope)=>({type:'register',id:`resource:${id}`,scopeKey:`scope:${scope}`,kind:'backend',ownership:'owned'});
test('many source lifetimes retain bounded metadata without permitting resource or scope resurrection',()=>{
 let state=createResourceLedger({monotonic:true,maxResources:2,maxScopes:2});
 const send=input=>{const result=transitionResourceLedger(state,input);state=result.state;return result;};
 for(let id=1;id<=5000;id++){
  assert.equal(send(reg(id,id)).accepted,true);assert.equal(resourceAvailable(state,`resource:${id}`),true);
  send({type:'retire-scope',scopeKey:`scope:${id}`});send({type:'release',id:`resource:${id}`});send({type:'physical-result',id:`resource:${id}`,success:true});
  assert.equal(state.resources.length,0);assert.equal(state.scopes.length,0);
 }
 assert.equal(state.registeredTotal,5000);assert.equal(state.releasedTotal,5000);assert.equal(send(reg(1,1)).reason,'duplicate');
 assert.equal(send(reg(5001,1)).accepted,true);assert.equal(resourceScopeRetired(state,'scope:1'),true);assert.equal(resourceAvailable(state,'resource:5001'),false);
});
test('physical cleanup timeout retains capacity until the late result really releases it',()=>{
 let state=createResourceLedger({monotonic:true,maxResources:1,maxScopes:1});const send=input=>{const result=transitionResourceLedger(state,input);state=result.state;return result;};
 send(reg(1,1));send({type:'release',id:'resource:1'});send({type:'deadline',id:'resource:1',reason:'timeout'});send({type:'retire-scope',scopeKey:'scope:1'});
 assert.equal(send(reg(2,2)).reason,'resource-capacity');assert.equal(state.resources[0].state,'detached');
 send({type:'physical-result',id:'resource:1',success:true});assert.equal(state.lateReleased,1);assert.equal(state.resources.length,0);assert.equal(send(reg(2,2)).accepted,true);
});
test('out-of-order scope retirement cannot expire an older still-active scope',()=>{
 let state=createResourceLedger({monotonic:true});const send=input=>{const result=transitionResourceLedger(state,input);state=result.state;return result;};
 send(reg(1,1));send(reg(2,2));send({type:'retire-scope',scopeKey:'scope:2'});send({type:'release',id:'resource:2'});send({type:'physical-result',id:'resource:2',success:true});
 assert.equal(resourceAvailable(state,'resource:1'),true);assert.equal(send(reg(3,1)).accepted,true);assert.equal(resourceAvailable(state,'resource:3'),true);
 send({type:'retire-scope',scopeKey:'scope:1'});assert.equal(resourceAvailable(state,'resource:3'),false);
});
test('monotonic admission rejects noncanonical or unsafe identities without host work',()=>{
 const state=createResourceLedger({monotonic:true});for(const id of ['opaque','resource:0','resource:01','resource:-1','resource:9007199254740992'])assert.equal(transitionResourceLedger(state,{...reg(1,1),id}).accepted,false);
 for(const scopeKey of ['opaque','scope:0','scope:01'])assert.equal(transitionResourceLedger(state,{...reg(1,1),scopeKey}).accepted,false);
});
test('resource adapter can share one external pure owner and bounds settled handle maps',async()=>{
 let state=createResourceLedger({monotonic:true,maxResources:2,maxScopes:2}),released=0;
 const registry=new ResourceRegistry({store:{read:()=>state,dispatch:input=>{const result=transitionResourceLedger(state,input);state=result.state;return result;}}});
 for(let id=1;id<=100;id++){await registry.register({...reg(id,id),value:{id},release:()=>{released++;}});await registry.retireScope(`scope:${id}`);await Promise.resolve();}
 assert.equal(released,100);assert.equal(registry.diagnostics.registered,100);assert.equal(registry.diagnostics.released,100);assert.equal(registry.handles.size,0);assert.equal(registry.completions.size,0);assert.equal(registry.scopes.size,0);
 await registry.register({...reg(101,1),value:{},release:()=>released++});assert.equal(released,101);assert.equal(registry.handles.size,0);
});
test('monotonic raw registry forgets completed identities but never readmits them',async()=>{
 const registry=new ResourceRegistry({monotonic:true});await registry.register({...reg(1,1),value:{},release(){}});await registry.release('resource:1');
 await assert.rejects(registry.release('resource:1'),/missing/);assert.throws(()=>registry.register({...reg(1,1),value:{},release(){}}),/already registered/);
});
