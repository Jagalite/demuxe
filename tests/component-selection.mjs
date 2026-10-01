// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {audioRepairRecipe} from '../web/generated/internal/component-recipes.js';
import {resolveProviderRecipe} from '../web/generated/internal/provider-resolution.js';
import {selectComponentBinding} from '../web/generated/internal/component-selection.js';
function fixture(codec='ac3',channels=2){
 const recipe=audioRepairRecipe(codec,channels),providers=new Map();
 for(const binding of recipe.bindings)for(const a of binding.assignments){const previous=providers.get(a.providerId);providers.set(a.providerId,{id:a.providerId,implementationIdentity:'test-'+a.providerId,technology:'wasm',delivery:['optional-assets'],offers:[...(previous?.offers??[]),...a.requirements],availability:{state:'configured-unverified'}});}
 const catalog={revision:'test',providers:[...providers.values()]},evidence=recipe.bindings.map(b=>({recipeId:recipe.id,bindingId:b.id,scopeKey:'test',implementationIdentities:Object.fromEntries(b.assignments.map(a=>[a.providerId,'test-'+a.providerId]))}));
 return {recipe,catalog,evidence};
}
test('fine and common are explicit qualified compositions for each codec',()=>{
 for(const codec of ['ac3','eac3','dts-core']){const {recipe,catalog,evidence}=fixture(codec);const r=resolveProviderRecipe(recipe,catalog,evidence,'test');assert.equal(r.state,'pending');assert.deepEqual(r.bindings.map(b=>b.state),['pending','pending']);assert.equal(selectComponentBinding(r,'fine').bindingId,'fine');}
 assert.throws(()=>audioRepairRecipe('unknown'));
 for(const codec of ['truehd','mlp','dts-hd']){
  const {recipe,catalog,evidence}=fixture(codec,codec==='dts-hd'?8:2);assert.deepEqual(recipe.bindings.map(b=>b.id),['fine']);
  assert.equal(selectComponentBinding(resolveProviderRecipe(recipe,catalog,evidence,'test'),'fine').bindingId,'fine');
  assert.throws(()=>selectComponentBinding(resolveProviderRecipe(recipe,catalog,[],'test'),'fine'),e=>e.code==='QUALIFICATION_REQUIRED');
  for(const channels of [1,2,6,8]){
   const allowed=codec==='truehd'||codec==='mlp'&&channels!==8||codec==='dts-hd'&&channels!==1;
   if(allowed)assert.ok(audioRepairRecipe(codec,channels).id);else assert.throws(()=>audioRepairRecipe(codec,channels));
  }
 }
 assert.throws(()=>audioRepairRecipe('ac3',8));
});
test('absent fine assets select the qualified common binding; absent both identify capabilities',()=>{
 const {recipe,catalog,evidence}=fixture();catalog.providers=catalog.providers.filter(p=>!['audio-ac3','audio-flac'].includes(p.id));let r=resolveProviderRecipe(recipe,catalog,evidence,'test');assert.equal(selectComponentBinding(r,'fine').bindingId,'common');catalog.providers=catalog.providers.filter(p=>p.id!=='audio-common');r=resolveProviderRecipe(recipe,catalog,evidence,'test');assert.throws(()=>selectComponentBinding(r,'fine'),e=>e.code==='DEPLOYMENT_UNAVAILABLE'&&/audio.decode.ac3/.test(e.message));
});
test('qualification and measured resource failures remain distinct from deployment absence',()=>{
 const {recipe,catalog,evidence}=fixture();assert.throws(()=>selectComponentBinding(resolveProviderRecipe(recipe,catalog,[],'test'),'fine'),e=>e.code==='QUALIFICATION_REQUIRED');
 const resolution=resolveProviderRecipe(recipe,catalog,evidence,'test'),policy={objective:'startup',maxAgeMs:1000,maxStartupMs:100,maxPeakBytes:100,minThroughputRatio:1};
 const records=['fine','common'].map((bindingId,i)=>({bindingId,contextKey:'exact-readiness',evidenceId:'test-'+i,measuredAt:1,samples:3,measurement:'complete-recipe',remainingStartupMs:i?20:40,steadyCpuMsPerSecond:1,peakBytes:10,throughputRatio:2,startupUncertaintyMs:1,cpuUncertaintyMsPerSecond:1}));
 assert.equal(selectComponentBinding(resolution,'fine',{records,contextKey:'exact-readiness',policy,now:2}).bindingId,'common');
 assert.equal(selectComponentBinding(resolution,'fine',{records,contextKey:'different-readiness',policy,now:2}).bindingId,'fine');
 assert.throws(()=>selectComponentBinding(resolution,'fine',{records,contextKey:'exact-readiness',policy:{...policy,maxPeakBytes:1},now:2}),e=>e.code==='RUNTIME_BUDGET_EXCEEDED');
});

test('optional unmeasured metrics retain baseline only when the policy requires them',()=>{
 const {recipe,catalog,evidence}=fixture(),resolution=resolveProviderRecipe(recipe,catalog,evidence,'test');
 const records=['fine','common'].map((bindingId,i)=>({bindingId,contextKey:'c',evidenceId:'actual-'+i,measuredAt:1,samples:3,measurement:'complete-recipe',remainingStartupMs:i?20:40,throughputRatio:2,startupUncertaintyMs:1}));
 const measurement={records,contextKey:'c',policy:{objective:'startup',maxAgeMs:100,maxStartupMs:100,minThroughputRatio:1},now:2};
 assert.equal(selectComponentBinding(resolution,'fine',measurement).bindingId,'common');
 assert.equal(selectComponentBinding(resolution,'fine',{...measurement,policy:{...measurement.policy,maxPeakBytes:1000}}).bindingId,'fine');
 assert.equal(selectComponentBinding(resolution,'fine',{...measurement,policy:{...measurement.policy,objective:'steady-cpu'}}).bindingId,'fine');
});

test('execution retries only actual runtime absence and preserves terminal failure identity',async()=>{
 const {ProviderAcquisition}=await import('../web/generated/internal/provider-acquisition.js');
 const {parseProviderDeployment}=await import('../web/generated/internal/provider-catalog.js');
 const {executeComponentBinding}=await import('../web/generated/internal/component-selection.js');
 for(const fail of [false,true]){
  const {recipe,catalog,evidence}=fixture(),prepared=[],failure=Error('configured implementation failed');
  const deployment=parseProviderDeployment({schema:1,providerContractVersion:1,revision:'test',assets:[],providers:catalog.providers.map(p=>({...p,technology:'javascript',delivery:['application-bundle'],applicationBuild:'test',assetIds:[]}))},new URL('https://example.invalid/'));
  const acquisition=new ProviderAcquisition(deployment,catalog.providers.map(p=>({id:p.id,implementationIdentity:p.implementationIdentity,async prepare(){prepared.push(p.id);if(p.id==='audio-ac3'){if(fail)throw failure;return {state:'unavailable',reason:'runtime missing'};}return {state:'ready',dispose(){}};}})));
  try{
   const execution=executeComponentBinding(acquisition,recipe,evidence,'test','fine',async binding=>binding);
   if(fail){await assert.rejects(execution,e=>e===failure);assert.ok(!prepared.includes('audio-common'));}
   else assert.equal((await execution).value,'common');
  }finally{await acquisition.dispose();}
 }
});

for(const limit of ['startup','memory','throughput'])test(`runtime-absence retry retains ${limit} exclusion`,async()=>{
 const {ProviderAcquisition}=await import('../web/generated/internal/provider-acquisition.js');
 const {parseProviderDeployment}=await import('../web/generated/internal/provider-catalog.js');
 const {executeComponentBinding}=await import('../web/generated/internal/component-selection.js');
 const {recipe,catalog,evidence}=fixture(),prepared=[];
 const deployment=parseProviderDeployment({schema:1,providerContractVersion:1,revision:'test',assets:[],providers:catalog.providers.map(p=>({...p,technology:'javascript',delivery:['application-bundle'],applicationBuild:'test',assetIds:[]}))},new URL('https://example.invalid/'));
 const acquisition=new ProviderAcquisition(deployment,catalog.providers.map(p=>({id:p.id,implementationIdentity:p.implementationIdentity,async prepare(){prepared.push(p.id);return p.id==='audio-ac3'?{state:'unavailable',reason:'runtime missing'}:{state:'ready',dispose(){}};}})));
 const records=['fine','common'].map(bindingId=>({bindingId,contextKey:'c',evidenceId:'measured-'+bindingId,measuredAt:1,samples:3,measurement:'complete-recipe',remainingStartupMs:bindingId==='common'&&limit==='startup'?10000:10,peakBytes:bindingId==='common'&&limit==='memory'?10000:10,throughputRatio:bindingId==='common'&&limit==='throughput'?0.1:2,startupUncertaintyMs:0}));
 let executed=false;
 try{
  await assert.rejects(executeComponentBinding(acquisition,recipe,evidence,'test','fine',async()=>{executed=true;},{records,contextKey:'c',policy:{objective:'startup',maxAgeMs:100,maxStartupMs:100,maxPeakBytes:100,minThroughputRatio:1},now:2}),e=>e.code==='RUNTIME_BUDGET_EXCEEDED');
  assert.equal(executed,false);assert.ok(prepared.includes('audio-ac3'));assert.ok(!prepared.includes('audio-common'));
 }finally{await acquisition.dispose();}
});
