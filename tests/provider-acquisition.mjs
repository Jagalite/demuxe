// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ProviderAcquisition} from '../web/generated/internal/provider-acquisition.js';
import {parseProviderDeployment} from '../web/generated/internal/provider-catalog.js';
import {providerResolutionError} from '../web/generated/internal/provider-deployment-errors.js';

const cap = {capability:'media.prepare.file',version:1,profile:'packet-copy'};
const data = new Uint8Array([1,2,3,4]);
const hash = createHash('sha256').update(data).digest('hex');
const manifest = () => ({schema:1,providerContractVersion:1,revision:'deployment1',
 assets:[{id:'common',path:'common.wasm',bytes:4,sha256:hash}],
 providers:['copy','audio'].map(id=>({id,implementationIdentity:id+'@1',technology:'wasm',delivery:['optional-assets'],assetIds:['common'],offers:[cap]}))});
const deployment = input => parseProviderDeployment(input ?? manifest(),new URL('https://example.invalid/assets/'));
const owner = (id,prepare=async()=>({state:'ready',dispose(){}}))=>({id,implementationIdentity:id+'@1',prepare});
const resolution = (loader,ids=['copy'],scopeKey='file:1')=>loader.resolve({id:'copy',requirements:[cap],bindings:[{id:'binding',assignments:ids.map(providerId=>({providerId,requirements:[cap]}))}]},
 [{recipeId:'copy',bindingId:'binding',scopeKey,implementationIdentities:Object.fromEntries(ids.map(id=>[id,id+'@1']))}],scopeKey);

test('constructor and resolution perform no network or instantiation',async()=>{
 let calls=0;
 const a=new ProviderAcquisition(deployment(),[owner('copy',async()=>{calls++;return {state:'ready',dispose(){}};})],{fetch:async()=>{calls++;return new Response(data);}});
 assert.equal(resolution(a).state,'pending');assert.equal(calls,0);
 await a.acquire(resolution(a),'binding');assert.equal(calls,1);assert.equal(resolution(a).state,'available');await a.dispose();
});
test('only selected owners load; shared bundle fetches once and bytes cannot be mutated by another owner',async()=>{
 let fetches=0;const disposed=[];
 const a=new ProviderAcquisition(deployment(),['copy','audio'].map(id=>owner(id,async({asset})=>{
  const bytes=new Uint8Array(await asset('common'));assert.deepEqual(bytes,data);bytes[0]=99;
  return {state:'ready',dispose(){disposed.push(id);}};
 })),{fetch:async()=>{fetches++;return new Response(data);}});
 await a.acquire(resolution(a),'binding');assert.equal(fetches,1);assert.equal(a.catalog.providers[1].availability.state,'configured-unverified');
 await a.acquire(resolution(a,['copy','audio']),'binding');assert.equal(fetches,1);
 await a.dispose();await a.dispose();assert.deepEqual(disposed,['audio','copy']);
});
test('native and application-bundled implementations do not require assets',async()=>{
 for(const [technology,delivery]of [['browser-native','browser'],['javascript','application-bundle']]){
  const m=manifest();m.assets=[];m.providers=[{...m.providers[0],technology,delivery:[delivery],assetIds:[],applicationBuild:'app@1'}];
  const a=new ProviderAcquisition(deployment(m),[owner('copy')],{fetch:async()=>{throw Error('unexpected network');}});
  await a.acquire(resolution(a),'binding');assert.equal(resolution(a).state,'available');await a.dispose();
 }
});
test('absent owners reject deployment without fetching or changing media qualification',async()=>{
 const a=new ProviderAcquisition(deployment(),[],{fetch:async()=>{throw Error('unexpected network');}});
 const r=resolution(a);assert.equal(r.code,'DEPLOYMENT_UNAVAILABLE');assert.match(providerResolutionError([r]).message,/media.prepare.file/);
 await assert.rejects(a.acquire(r,'binding'),/unresolved/);await a.dispose();
});
test('runtime probes can report unavailability, while owner exceptions retain identity',async()=>{
 const a=new ProviderAcquisition(deployment(),[owner('copy',async()=>({state:'unavailable',reason:'Missing runtime primitive'}))]);
 await a.acquire(resolution(a),'binding');assert.equal(resolution(a).code,'DEPLOYMENT_UNAVAILABLE');await a.dispose();
 const failure=Error('ABI mismatch');const b=new ProviderAcquisition(deployment(),[owner('copy',async()=>{throw failure;})]);
 await assert.rejects(b.acquire(resolution(b),'binding'),e=>e===failure);assert.equal(providerResolutionError([resolution(b)]),failure);await b.dispose();
});
for(const [name,response,pattern]of [
 ['404',()=>new Response('missing',{status:404}),/could not be read/],
 ['short',()=>new Response(data.slice(0,2)),/size mismatch/],
 ['long',()=>new Response(new Uint8Array(5)),/exceeds declared/],
 ['wrong digest',()=>new Response(new Uint8Array(4)),/integrity mismatch/],
 ['network error',()=>{throw Error('secret network details');},/acquisition failed/],
])test(`configured ${name} asset is a terminal load failure, never deployment absence`,async()=>{
 const a=new ProviderAcquisition(deployment(),[owner('copy',async({asset})=>{await asset('common');return {state:'ready',dispose(){}};})],{fetch:async()=>response()});
 await assert.rejects(a.acquire(resolution(a),'binding'),e=>e.code==='ASSET_LOAD_FAILED'&&pattern.test(e.message));
 assert.equal(resolution(a).state,'failed');await a.dispose();
});
test('undeclared assets and memory budgets fail before network requests',async()=>{
 for(const [id,options]of [['not-deployed',{}],['common',{maxResidentBytes:3}]]){
  let calls=0;const a=new ProviderAcquisition(deployment(),[owner('copy',async({asset})=>{await asset(id);throw Error('unreachable');})],{...options,fetch:async()=>{calls++;return new Response(data);}});
  await assert.rejects(a.acquire(resolution(a),'binding'),e=>e.code==='ASSET_LOAD_FAILED');assert.equal(calls,0);await a.dispose();
 }
});
test('deadline aborts a pending fetch and preserves terminal classification',async()=>{
 const a=new ProviderAcquisition(deployment(),[owner('copy',async({asset})=>{await asset('common');throw Error('unreachable');})],{timeoutMs:10,fetch:async(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}))});
 await assert.rejects(a.acquire(resolution(a),'binding'),/deadline exceeded/);assert.equal(resolution(a).state,'failed');await a.dispose();
});
test('dispose aborts acquisition, does not cache cancellation as provider failure',async()=>{
 let started;const ready=new Promise(r=>started=r);let signal;
 const a=new ProviderAcquisition(deployment(),[owner('copy',async({asset})=>{await asset('common');throw Error('unreachable');})],{fetch:async(_,options)=>{signal=options.signal;started();return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}});
 const opening=a.acquire(resolution(a),'binding');const rejected=assert.rejects(opening,e=>e.name==='AbortError');await ready;await a.dispose();await rejected;
 assert.equal(signal.aborted,true);assert.equal(a.catalog.providers[0].availability.state,'configured-unverified');
});
test('a late ready owner is disposed after cancellation',async()=>{
 let release,started;const ready=new Promise(r=>started=r);let disposals=0;
 const a=new ProviderAcquisition(deployment(),[owner('copy',async()=>{started();await new Promise(r=>release=r);return {state:'ready',dispose(){disposals++;}};})]);
 const opening=a.acquire(resolution(a),'binding');const rejected=assert.rejects(opening,e=>e.name==='AbortError');await ready;const closing=a.dispose();release();await closing;await rejected;assert.equal(disposals,1);
});
test('cleanup attempts every owner even when one fails',async()=>{
 const done=[];const a=new ProviderAcquisition(deployment(),['copy','audio'].map(id=>owner(id,async()=>({state:'ready',dispose(){done.push(id);if(id==='audio')throw Error('cleanup');}}))));
 await a.acquire(resolution(a,['copy','audio']),'binding');const closing=a.dispose();assert.equal(a.dispose(),closing);await assert.rejects(closing,AggregateError);assert.deepEqual(done,['audio','copy']);
});
test('unqualified bindings, mismatched owner builds and changed scopes cannot acquire',async()=>{
 assert.throws(()=>new ProviderAcquisition(deployment(),[{...owner('copy'),implementationIdentity:'other'}]),/does not match/);
 const a=new ProviderAcquisition(deployment(),[owner('copy')]);
 await assert.rejects(a.acquire({...resolution(a),deploymentRevision:'stale'},'binding'),/Stale/);
 await assert.rejects(a.acquire({...resolution(a),bindings:[{bindingId:'binding',state:'unqualified',reason:'no evidence'}]},'binding'),/Stale/);
 const noEvidence=a.resolve({id:'copy',requirements:[cap],bindings:[{id:'binding',assignments:[{providerId:'copy',requirements:[cap]}]}]},[],'file:1');
 await assert.rejects(a.acquire(noEvidence,'binding'),/unresolved/);
 await a.acquire(resolution(a),'binding');await assert.rejects(a.acquire(resolution(a,['copy'],'file:2'),'binding'),/Stale/);await a.dispose();
});

test('resolution tickets cannot be forged, mutated or reused after availability changes',async()=>{
 const a=new ProviderAcquisition(deployment(),[owner('copy')]);
 const ticket=resolution(a);
 assert.throws(()=>{ticket.bindings[0].providerIds.push('audio');},TypeError);
 await assert.rejects(a.acquire({...ticket},'binding'),/Stale/);
 await a.acquire(ticket,'binding');await assert.rejects(a.acquire(ticket,'binding'),/Stale/);await a.dispose();
});

test('ordered admitted plans use only configured qualified providers across deployment sets',async()=>{
 const {nextProviderPlan}=await import('../web/generated/internal/provider-plan-resolution.js');
 const {MEDIA_PROVIDERS}=await import('../web/generated/internal/media-providers.js');
 const {resolvableExecutionRecipe}=await import('../web/generated/internal/execution-recipes.js');
 const plans=[{id:'native-remux',eligible:true},{id:'hybrid',eligible:true},{id:'software',eligible:true}];
 // Synthetic qualification envelopes exercise deployment policy only. They are
 // never shipped as qualification of any actual media/runtime implementation.
 const evidence=plans.flatMap(p=>resolvableExecutionRecipe(p.id).bindings.filter(b=>b.id!=='selected-mp4-view').map(b=>({recipeId:p.id,bindingId:b.id,scopeKey:'synthetic-scope',implementationIdentities:Object.fromEntries(b.assignments.map(a=>[a.providerId,a.providerId+'@test']))})));
 for(const [ids,expected]of [
  [['browser-prepared'],undefined],
  [['browser-prepared','ffmpeg-file-preparation'],'native-remux'],
  [['browser-prepared','mpv-hybrid','mpv-software'],'hybrid'],
  [['browser-prepared','ffmpeg-file-preparation','mpv-hybrid','mpv-software'],'native-remux'],
 ]){
  const initialized=[];
  const m={schema:1,providerContractVersion:1,revision:'test-deployment',assets:[],providers:ids.map(id=>({id,implementationIdentity:id+'@test',technology:'javascript',delivery:['application-bundle'],applicationBuild:'test',offers:MEDIA_PROVIDERS[id].provides}))};
  const loader=new ProviderAcquisition(deployment(m),ids.map(id=>({id,implementationIdentity:id+'@test',async prepare(){initialized.push(id);return {state:'ready',dispose(){}};}})));
  const decision=nextProviderPlan(plans,loader.catalog,evidence,'synthetic-scope');
  if(!expected){assert.equal(decision.state,'exhausted');assert.equal(decision.error.code,'DEPLOYMENT_UNAVAILABLE');assert.match(decision.error.message,/ffmpeg-file-preparation/);assert.match(decision.error.message,/mpv-software/);}
  else{
   assert.equal(decision.planId,expected);assert.equal(decision.state,'pending');
   const recipe=resolvableExecutionRecipe(expected),ticket=loader.resolve(recipe,evidence,'synthetic-scope');
   await loader.acquire(ticket,recipe.bindings[0].id);
   assert.equal(nextProviderPlan(plans,loader.catalog,evidence,'synthetic-scope').state,'available');
  }
  assert.deepEqual(initialized,expected==='native-remux'?['ffmpeg-file-preparation','browser-prepared']:expected==='hybrid'?['mpv-hybrid']:[]);
  await loader.dispose();
 }
});

test('synchronous abort listeners cannot start a second cleanup',async()=>{
 let reentrant,disposals=0;
 const a=new ProviderAcquisition(deployment(),[owner('copy',async({signal})=>{
  signal.addEventListener('abort',()=>{reentrant=a.dispose();},{once:true});
  return {state:'ready',dispose(){disposals++;}};
 })]);
 await a.acquire(resolution(a),'binding');const closing=a.dispose();assert.equal(reentrant,closing);await closing;assert.equal(disposals,1);
});

test('inspection reads require exact deployed identity and closure without granting ready state',async()=>{
 let calls=0;const a=new ProviderAcquisition(deployment(),[],{fetch:async()=>{calls++;return new Response(data);}});
 assert.throws(()=>a.readAsset('copy','wrong','common'),e=>e.code==='DEPLOYMENT_UNAVAILABLE');
 assert.throws(()=>a.readAsset('copy','copy@1','missing'),e=>e.code==='DEPLOYMENT_UNAVAILABLE');
 assert.equal(calls,0);const bytes=await a.readAsset('copy','copy@1','common');new Uint8Array(bytes)[0]=55;
 assert.deepEqual(new Uint8Array(await a.readAsset('audio','audio@1','common')),data);assert.equal(calls,1);
 assert.equal(a.catalog.providers[0].availability.state,'absent');await a.dispose();assert.throws(()=>a.readAsset('copy','copy@1','common'),e=>e.name==='AbortError');
});
test('dispose waits for a pending inspection read to observe cancellation',async()=>{
 let started,retired=false;const ready=new Promise(r=>started=r);
 const a=new ProviderAcquisition(deployment(),[],{fetch:async(_,options)=>{started();return new Promise((_,reject)=>options.signal.addEventListener('abort',()=>{setTimeout(()=>{retired=true;reject(options.signal.reason);},10);},{once:true}));}});
 const reading=assert.rejects(a.readAsset('copy','copy@1','common'),e=>e.name==='AbortError');await ready;await a.dispose();assert.equal(retired,true);await reading;
});
