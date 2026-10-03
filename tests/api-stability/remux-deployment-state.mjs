// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemuxDeployment,transitionRemuxDeployment,remuxDeploymentCandidates} from '../../web/generated/internal/machine/remux-deployment.js';
import {selectRemuxRuntime} from '../../web/generated/internal/remux-runtime.js';
import {EnginePreparation} from '../../web/generated/internal/engine-preparation.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
const selection=(policy='auto',isolated=true,jspi=true)=>selectRemuxRuntime({remuxRuntime:policy},{isolated,jspi});
function configure(p,choice=selection()){p.control={...p.control,routing:{...p.control.routing,deployment:initialRemuxDeployment(choice)}};}
function provider(extra={}){return{load:async()=>{},destroy(){},hasOffer:()=>true,has:()=>false,codecInspector:()=>undefined,...extra};}
test('deployment owner configures once, detaches inputs and fences competing observations by revision',()=>{
 const input={...selection()},initial=initialRemuxDeployment(),configured=transitionRemuxDeployment(initial,{kind:'configure',selection:input});input.runtime='asyncify';assert.equal(configured.selection.runtime,'pthread');assert.equal(initial.selection,null);assert.equal(transitionRemuxDeployment(configured,{kind:'configure',selection:selection('asyncify')}),configured);
 const next=transitionRemuxDeployment(configured,{kind:'resolved',revision:1,available:{asyncify:true}});assert.equal(next.selection.runtime,'asyncify');assert.equal(configured.selection.runtime,'pthread');assert.equal(transitionRemuxDeployment(next,{kind:'resolved',revision:1,available:{pthread:true}}),next);assert.equal(Object.isFrozen(next.selection),true);
 assert.equal(transitionRemuxDeployment({...next,revision:Number.MAX_SAFE_INTEGER},{kind:'resolved',revision:Number.MAX_SAFE_INTEGER,available:{pthread:true}}).revision,Number.MAX_SAFE_INTEGER);
});
test('candidate order preserves explicit policy, isolation, JSPI support and absent-deployment fallback',()=>{
 assert.deepEqual(remuxDeploymentCandidates(selection()),['pthread','jspi','asyncify']);assert.deepEqual(remuxDeploymentCandidates(selection('auto',false,false)),['asyncify']);assert.deepEqual(remuxDeploymentCandidates(selection('on',true,true)),['jspi','asyncify']);
 for(const policy of ['off','jspi','asyncify']){const state=initialRemuxDeployment(selection(policy));assert.deepEqual(remuxDeploymentCandidates(state.selection),[]);assert.equal(transitionRemuxDeployment(state,{kind:'resolved',revision:0,available:{pthread:true,jspi:true,asyncify:true}}).selection.runtime,state.selection.runtime);}
 const state=initialRemuxDeployment(selection());assert.equal(transitionRemuxDeployment(state,{kind:'resolved',revision:0,available:{}}).selection.runtime,'pthread');
});
test('actual Player has one immutable runtime selection and preserves provider short-circuit ordering',()=>{
 const p=unitPlayer();configure(p);const calls=[];p.providerRuntime=provider({hasOffer(id){calls.push(['offer',id]);return true;},has(path){calls.push(['has',path]);return path.includes('-jspi/');},codecInspector(runtime){calls.push(['inspector',runtime]);}});assert.equal(p.selectDeployedRuntime(),true);assert.equal(p.remuxRuntime,'jspi');assert.equal(p.remuxSelection,p.control.routing.deployment.selection);assert.throws(()=>p.remuxRuntime='asyncify',TypeError);assert.deepEqual(calls,[['offer','ffmpeg-file-preparation'],['has','web/engine-remux/remux.wasm'],['inspector','pthread'],['offer','ffmpeg-file-preparation-jspi'],['has','web/engine-remux-jspi/remux.wasm']]);
});
for(const policy of ['off','jspi','asyncify'])test(`explicit ${policy} selection does not access provider probe methods`,()=>{const p=unitPlayer();configure(p,selection(policy));p.providerRuntime=provider();for(const key of ['hasOffer','has','codecInspector'])Object.defineProperty(p.providerRuntime,key,{get(){throw Error('unexpected provider access');}});assert.equal(p.selectDeployedRuntime(),true);assert.equal(p.remuxRuntime,selection(policy).runtime);});
for(const site of ['offer-get','offer-call','has-get','has-call','inspector-get','inspector-call'])test(`deployment retirement at ${site} stops later callbacks and cannot commit`,async()=>{
 const p=unitPlayer();configure(p);const saved=p.remuxSelection;let closing,retired=false,after=0;const hit=where=>{if(retired)after++;if(where===site){retired=true;closing=p.close();}};
 const host=provider();for(const [name,label,result] of [['hasOffer','offer',true],['has','has',false],['codecInspector','inspector',undefined]])Object.defineProperty(host,name,{get(){hit(label+'-get');return function(){assert.equal(this,host);hit(label+'-call');return result;};}});p.providerRuntime=host;assert.equal(p.selectDeployedRuntime(),false);assert.equal(after,0);assert.equal(p.remuxSelection,saved);await closing;
});
test('nested deployment selection wins without outer stale availability commit',()=>{
 const p=unitPlayer();configure(p);let nested=false;const host=provider({hasOffer(){if(!nested){nested=true;p.selectDeployedRuntime();}return true;},has(path){return path.includes('-asyncify/');}});p.providerRuntime=host;assert.equal(p.selectDeployedRuntime(),false);assert.equal(p.remuxRuntime,'asyncify');assert.equal(p.control.routing.deployment.revision,1);
});
test('provider failure leaves selection unchanged and a later valid selection succeeds',()=>{
 const p=unitPlayer();configure(p);const saved=p.remuxSelection,error=Error('provider failed');p.providerRuntime=provider({hasOffer(){throw error;}});assert.throws(()=>p.selectDeployedRuntime(),value=>value===error);assert.equal(p.remuxSelection,saved);p.providerRuntime=provider({has:()=>true});assert.equal(p.selectDeployedRuntime(),true);
});
test('preparation does not allocate or warm after deployment lookup retires its request',async t=>{
 const p=unitPlayer();configure(p);let closed,warmed=0;p.providerRuntime=provider({hasOffer(){closed=p.close();return true;}});t.mock.method(EnginePreparation.prototype,'warm',async()=>{warmed++;return{milliseconds:0,assets:[]};});const report=await p.prepare([]);await closed;assert.equal(warmed,0);assert.equal(p.preparation,undefined);assert.deepEqual(report,{milliseconds:0,assets:[]});
});
test('preparation load getter retirement does not invoke its returned method',async()=>{
 const p=unitPlayer();configure(p);let called=0,closed;const host=provider();Object.defineProperty(host,'load',{get(){closed=p.close();return async()=>{called++;};}});p.providerRuntime=host;await p.prepare([]);await closed;assert.equal(called,0);assert.equal(p.preparation,undefined);
});
test('late preparation controller acquisition is destroyed once and never published or warmed',async t=>{
 const p=unitPlayer();configure(p);const Original=globalThis.AbortController;let fired=false,closed,warmed=0,retired=0;const destroy=EnginePreparation.prototype.destroy;t.mock.method(EnginePreparation.prototype,'destroy',function(){retired++;return destroy.call(this);});t.mock.method(EnginePreparation.prototype,'warm',async()=>{warmed++;return{milliseconds:0,assets:[]};});
 t.mock.method(globalThis,'AbortController',class extends Original{constructor(){super();if(!fired){fired=true;closed=p.close();}}});await p.prepare([]);await closed;assert.equal(retired,1);assert.equal(warmed,0);assert.equal(p.preparation,undefined);
});
test('pending provider load cannot warm after close and retains normal load-failure reports',async t=>{
 const p=unitPlayer();configure(p);let release,warmed=0;p.providerRuntime=provider({load:()=>new Promise(resolve=>release=resolve)});t.mock.method(EnginePreparation.prototype,'warm',async()=>{warmed++;return{milliseconds:0,assets:[{name:'inspector',status:'failed'}]};});const task=p.prepare([]);await p.close();release();await task;assert.equal(warmed,0);
 p.providerRuntime=provider({load:async()=>{throw Error('missing deployment');}});const report=await p.prepare([]);assert.equal(warmed,1);assert.equal(report.assets[0].status,'failed');p.preparation.destroy();
});
