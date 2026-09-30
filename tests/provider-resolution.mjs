// SPDX-License-Identifier: Apache-2.0
// Authored under the no-build/no-test restriction; requires regenerated output.
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveProviderRecipe} from '../web/generated/internal/provider-resolution.js';
import {providerResolutionError, deploymentRejectionError} from '../web/generated/internal/provider-deployment-errors.js';
import {compareProviderCosts} from '../web/generated/internal/provider-cost.js';
import {playerError, PlayerError} from '../web/generated/internal/errors.js';
import {compatibilityFailure} from '../web/generated/internal/runtime-capability.js';
import {executionRecipe} from '../web/generated/internal/execution-recipes.js';
import {parseProviderDeployment, withProviderAvailability} from '../web/generated/internal/provider-catalog.js';
import {nextProviderPlan} from '../web/generated/internal/provider-plan-resolution.js';

const preparation={capability:'media.prepare.file',version:1,profile:'packet-copy'};
const presentation={capability:'media.present.prepared',version:1,profile:'selected-streams'};
const assignment=(providerId,requirements)=>({providerId,requirements});
const recipe={id:'copy',requirements:[preparation,presentation],bindings:[{id:'broad',assignments:[assignment('ffmpeg',[preparation]),assignment('browser',[presentation])]}]};
const fact=(id,offers,state='available')=>({id,implementationIdentity:id+'@1',technology:'mixed',delivery:['optional-assets'],offers,availability:{state}});
const ffmpeg=fact('ffmpeg',[preparation]),browser=fact('browser',[presentation]);
const evidence=[{recipeId:'copy',bindingId:'broad',scopeKey:'file/tracks/environment-1',implementationIdentities:{ffmpeg:'ffmpeg@1',browser:'browser@1'}}];
const resolve=(providers,proof=evidence,description=recipe)=>resolveProviderRecipe(description,{revision:'deployment-1',providers},proof,'file/tracks/environment-1');

test('catalog offers cannot grant composition qualification',()=>{
  assert.equal(resolve([ffmpeg,browser],[]).state,'unqualified');
  assert.equal(resolve([ffmpeg,browser],[{...evidence[0],scopeKey:'other-tracks'}]).code,'QUALIFICATION_REQUIRED');
});
test('absent qualified provider is a deployment failure, not incompatible media',()=>{
  const result=resolve([browser]);
  assert.equal(result.code,'DEPLOYMENT_UNAVAILABLE');
  assert.deepEqual(result.bindings[0].missing.map(m=>[m.providerId,m.reason]),[['ffmpeg','not-configured']]);
  const error=providerResolutionError([result]);
  assert.equal(playerError(error).code,'DEPLOYMENT_UNAVAILABLE');
  assert.match(error.message,/media.prepare.file\/packet-copy requires ffmpeg/);
  assert.equal(compatibilityFailure(error),false);
});
test('configured is pending, while actual availability permits acquisition',()=>{
  const pending=resolve([{...ffmpeg,availability:{state:'configured-unverified'}},browser]);
  assert.equal(pending.state,'pending');
  assert.equal(providerResolutionError([pending]),undefined);
  assert.equal(resolve([ffmpeg,browser]).state,'available');
});
test('wrong build cannot inherit a binding qualification',()=>{
  const wrong=resolve([{...ffmpeg,implementationIdentity:'ffmpeg@2'},browser]);
  assert.equal(wrong.code,'DEPLOYMENT_UNAVAILABLE');
  assert.ok(wrong.bindings[0].missing.some(m=>m.reason==='implementation-not-qualified'));
  assert.deepEqual(wrong.bindings[0].missing.map(m=>m.providerId),['ffmpeg']);
});
test('individual evidence cannot be combined into an untested composition',()=>{
  const fragmented=[{...evidence[0],implementationIdentities:{ffmpeg:'ffmpeg@1'}},{...evidence[0],implementationIdentities:{browser:'browser@1'}}];
  assert.equal(resolve([ffmpeg,browser],fragmented).state,'unqualified');
});
test('acquisition failure retains identity and never becomes absence',()=>{
  const failure=new PlayerError('ASSET_LOAD_FAILED','Required engine failed integrity validation');
  const result=resolve([{...ffmpeg,availability:{state:'failed',error:failure}},browser]);
  assert.equal(result.state,'failed');
  assert.equal(providerResolutionError([result]),failure);
});
test('bundled provider can fulfill several roles without separate acquisitions',()=>{
  const bundled={...recipe,bindings:[{id:'bundle',assignments:[assignment('common',[preparation,presentation])]}]};
  const proof=[{...evidence[0],bindingId:'bundle',implementationIdentities:{common:'common@1'}}];
  const result=resolve([fact('common',[preparation,presentation])],proof,bundled);
  assert.deepEqual(result.bindings[0].providerIds,['common']);
});
test('legacy terminal deployment diagnostic retains route context',()=>{
  const error=deploymentRejectionError([{id:'native-transcode',code:'DEPLOYMENT_UNAVAILABLE',reason:'FLAC24 preparation assets are unavailable'}]);
  assert.equal(error.code,'DEPLOYMENT_UNAVAILABLE');
  assert.match(error.message,/media.prepare.file\/flac24/);
  assert.equal(deploymentRejectionError([{id:'hybrid',code:'QUALIFICATION_REQUIRED'}]),undefined);
});
test('recipe construction keeps the exceptional Native MSE and service owners',()=>{
  assert.equal(executionRecipe('native-remux-mpv').native.mseOwner,'window');
  assert.equal(executionRecipe('native-transcode-mpv').native.mseOwner,'auto');
  assert.equal(executionRecipe('native-video-mpv-audio').native.selectedAudio,true);
  assert.equal(executionRecipe('native-direct-ass').native.subtitles,'external');
  const externalTranscode=executionRecipe('native-transcode-ass');
  assert.equal(externalTranscode.native.adaptation,'flac24');
  assert.equal(externalTranscode.native.mseOwner,'auto');
  assert.equal(externalTranscode.native.subtitles,'external');
  assert.ok(externalTranscode.bindings.every(b=>b.providers.some(p=>p.provider==='mpv-external-subtitles'&&p.request.profile==='external-file')));
  assert.equal(executionRecipe('native-remux').bindings.some(b=>b.id==='selected-mp4-view'),true);
  assert.equal(executionRecipe('native-flac').bindings.some(b=>b.id==='selected-mp4-view'),false);
  assert.equal(executionRecipe('__proto__'),undefined);
});

const cost=(bindingId,cpu,startup=10)=>({bindingId,contextKey:'same-workload-readiness',evidenceId:bindingId+'-run',measuredAt:100,samples:3,measurement:'complete-recipe',remainingStartupMs:startup,steadyCpuMsPerSecond:cpu,peakBytes:1000,throughputRatio:2,startupUncertaintyMs:1,cpuUncertaintyMsPerSecond:1});
const policy={objective:'steady-cpu',maxAgeMs:100,maxStartupMs:100,maxPeakBytes:10000,minThroughputRatio:1};
const compare=(records,options=policy)=>compareProviderCosts(['native','wasm'],'native',records,'same-workload-readiness',options,150);
test('measured execution cost can outweigh a native/loaded baseline',()=>{
  assert.equal(compare([cost('native',80,1),cost('wasm',30,30)]).bindingId,'wasm');
});
test('missing, stale or incomparable data does not become zero cost',()=>{
  assert.equal(compare([cost('native',80)]).reason,'incomplete-evidence');
  assert.equal(compare([cost('native',80),{...cost('wasm',1),contextKey:'different-browser'}]).bindingId,'native');
  assert.equal(compare([cost('native',80),{...cost('wasm',1),measuredAt:1}]).bindingId,'native');
});
test('noise retains baseline and resource limits precede measured cost',()=>{
  assert.equal(compare([cost('native',31),cost('wasm',30)]).reason,'uncertain-difference');
  assert.equal(compare([cost('native',80),{...cost('wasm',1),peakBytes:20000}]).bindingId,'native');
  assert.equal(compare([cost('native',80),cost('wasm',30)],{...policy,maxPeakBytes:1}),undefined);
});

const deployment=()=>({schema:1,providerContractVersion:1,revision:'r1',assets:[
  {id:'wasm',path:'ffmpeg/engine.wasm',sha256:'a'.repeat(64),bytes:100},
  {id:'loader',path:'ffmpeg/engine.mjs',sha256:'b'.repeat(64),bytes:10,dependencies:['wasm']},
],providers:[{id:'ffmpeg',implementationIdentity:'ffmpeg@1',technology:'wasm',delivery:['optional-assets'],assetIds:['loader'],offers:[preparation],packageName:'@demuxe/provider-ffmpeg'}]});
test('deployment parser records closure without granting availability',()=>{
  const parsed=parseProviderDeployment(deployment(),new URL('https://example.invalid/media/'));
  assert.deepEqual(parsed.providerAssets.ffmpeg,['wasm','loader']);
  assert.equal(parsed.catalog.providers[0].availability.state,'configured-unverified');
  const updated=withProviderAvailability(parsed.catalog,'r1',[{id:'ffmpeg',implementationIdentity:'ffmpeg@1',availability:{state:'available'}}]);
  assert.equal(updated.providers[0].availability.state,'available');
  assert.equal(parsed.catalog.providers[0].availability.state,'configured-unverified');
  assert.throws(()=>withProviderAvailability(updated,'old',[]),/Stale/);
  assert.throws(()=>withProviderAvailability(updated,'r1',[{id:'ffmpeg',implementationIdentity:'ffmpeg@2',availability:{state:'available'}}]),/mismatched/);
});
test('undeployed/cyclic assets and traversal are rejected before loading',()=>{
  const missing=deployment();missing.assets[1].dependencies=['missing'];
  assert.throws(()=>parseProviderDeployment(missing,new URL('https://example.invalid/')),/Undeployed/);
  const cyclic=deployment();cyclic.assets[0].dependencies=['loader'];
  assert.throws(()=>parseProviderDeployment(cyclic,new URL('https://example.invalid/')),/Cyclic/);
  const unsafe=deployment();unsafe.assets[0].path='../other.wasm';
  assert.throws(()=>parseProviderDeployment(unsafe,new URL('https://example.invalid/')),/path/);
});

test('deployment stage preserves admitted order and never assumes mpv exists',()=>{
  const plans=[{id:'native-direct',eligible:true},{id:'software',eligible:true}];
  const proof=[
    {recipeId:'native-direct',bindingId:'original',scopeKey:'scope',implementationIdentities:{'browser-original':'browser@1'}},
    {recipeId:'software',bindingId:'mpv-software',scopeKey:'scope',implementationIdentities:{'mpv-software':'mpv@1'}},
  ];
  const mpv={...fact('mpv-software',[{capability:'media.play.complete',version:1,profile:'source-tracks'}]),implementationIdentity:'mpv@1'};
  const found=nextProviderPlan(plans,{revision:'r1',providers:[mpv]},proof,'scope');
  assert.equal(found.planId,'software');
  assert.equal(found.decisions[0].code,'DEPLOYMENT_UNAVAILABLE');
  const absent=nextProviderPlan(plans,{revision:'r1',providers:[]},proof,'scope');
  assert.equal(absent.state,'exhausted');
  assert.equal(absent.error.code,'DEPLOYMENT_UNAVAILABLE');
  const pending={...fact('browser-original',[{capability:'media.present.original',version:1,profile:'selected-source'}],'configured-unverified'),implementationIdentity:'browser@1'};
  assert.equal(nextProviderPlan(plans,{revision:'r1',providers:[pending,mpv]},proof,'scope').planId,'native-direct');
  assert.equal(nextProviderPlan([{...plans[0],eligible:false},plans[1]],{revision:'r1',providers:[pending,mpv]},proof,'scope').planId,'software');
  assert.equal(nextProviderPlan([{id:'native-remux',eligible:false,code:'DEPLOYMENT_UNAVAILABLE',reason:'MSE unavailable'}],{revision:'r1',providers:[]},proof,'scope').error.code,'DEPLOYMENT_UNAVAILABLE');
});
