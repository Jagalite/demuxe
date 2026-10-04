// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProviderPreferences} from '../web/generated/internal/provider-cost.js';
import {audioRepairRecipe,selectComponentBinding,executeComponentBinding,ProviderAcquisition,parseProviderDeployment} from '../web/generated/components.js';
import {resolveProviderRecipe} from '../web/generated/internal/provider-resolution.js';
import {selectRemuxRuntime,deployedRemuxRuntime} from '../web/generated/internal/remux-runtime.js';
import {initialRemuxDeployment,resolveRemuxDeployment} from '../web/generated/internal/machine/remux-deployment.js';
import {preferProviderPlans} from '../web/generated/internal/execution-recipes.js';
import {selectNativePreparation} from '../web/generated/internal/machine/native-load.js';
import {ProviderRuntime} from '../web/generated/internal/provider-runtime.js';
import {unitPlayer} from './helpers/unit-player.mjs';
const prefer=(capability,...providers)=>[{capability,providers}];
const common=()=>prefer('audio.decode.ac3','audio-common','audio-ac3');
function fixture(){
 const recipe=audioRepairRecipe('ac3'),providers=new Map();
 for(const binding of recipe.bindings)for(const a of binding.assignments){const previous=providers.get(a.providerId);providers.set(a.providerId,{id:a.providerId,implementationIdentity:'test-'+a.providerId,technology:'javascript',delivery:['application-bundle'],applicationBuild:'test',offers:[...(previous?.offers??[]),...a.requirements],availability:{state:'configured-unverified'}});}
 const catalog={revision:'test',providers:[...providers.values()]},evidence=recipe.bindings.map(b=>({recipeId:recipe.id,bindingId:b.id,scopeKey:'test',implementationIdentities:Object.fromEntries(b.assignments.map(a=>[a.providerId,'test-'+a.providerId]))}));
 return {recipe,catalog,evidence,resolve:()=>resolveProviderRecipe(recipe,catalog,evidence,'test')};
}
test('preferences capture immutable policy and reject malformed, duplicate and excessive rules',()=>{
 const input=common(),captured=normalizeProviderPreferences(input);input[0].providers.reverse();input.push(...prefer('audio.encode.flac','audio-flac'));
 assert.deepEqual(captured,common());assert.ok(Object.isFrozen(captured[0].providers));
 for(const value of [null,{},[null],new Array(1),prefer('audio.decode.ac3',...new Array(257).fill('x')),prefer('invalid','x'),prefer('audio.decode.ac3',''),prefer('audio.decode.ac3',' x'),prefer('audio.decode.ac3','x','x'),[...common(),...common()],[{capability:'audio.decode.ac3',providers:new Array(1)}]])assert.throws(()=>normalizeProviderPreferences(value),{code:'INVALID_ARGUMENT'});
 assert.deepEqual(normalizeProviderPreferences(undefined),[]);
});
test('component preferences choose a qualified common decoder and preserve default and irrelevant-policy order',()=>{
 const f=fixture(),r=f.resolve();
 assert.equal(selectComponentBinding(r,'fine').bindingId,'fine');
 assert.deepEqual(selectComponentBinding(r,'fine',undefined,{recipe:f.recipe,providerPreferences:common()}),{bindingId:'common',reason:'provider-preference',evidenceIds:[],excluded:[]});
 assert.equal(selectComponentBinding(r,'fine',undefined,{recipe:f.recipe,providerPreferences:prefer('audio.decode.aac','audio-common')}).bindingId,'fine');
 assert.equal(selectComponentBinding(r,'fine',undefined,{recipe:f.recipe,providerPreferences:prefer('audio.decode.ac3','unknown-optional-provider')}).bindingId,'fine');
});
test('earlier capability rules resolve decoder/encoder preference conflicts',()=>{
 const f=fixture(),r=f.resolve(),encode=prefer('audio.encode.flac','audio-flac');
 assert.equal(selectComponentBinding(r,'fine',undefined,{recipe:f.recipe,providerPreferences:[...common(),...encode]}).bindingId,'common');
 assert.equal(selectComponentBinding(r,'fine',undefined,{recipe:f.recipe,providerPreferences:[...encode,...common()]}).bindingId,'fine');
});
test('priority never admits absent, incompatible or unqualified providers and does not mask a failure',()=>{
 for(const kind of ['absent','profile','identity','evidence','failed']){
  const f=fixture(),provider=f.catalog.providers.find(p=>p.id==='audio-common'),error=Error('integrity failure');
  if(kind==='absent')provider.availability={state:'absent',reason:'not installed'};
  if(kind==='profile')provider.offers=[];
  if(kind==='identity')provider.implementationIdentity='different';
  if(kind==='evidence')f.evidence.splice(f.evidence.findIndex(e=>e.bindingId==='common'),1);
  if(kind==='failed')provider.availability={state:'failed',error};
  const select=()=>selectComponentBinding(f.resolve(),'fine',undefined,{recipe:f.recipe,providerPreferences:common()});
  if(kind==='failed')assert.throws(select,e=>e===error);else assert.equal(select().bindingId,'fine',kind);
 }
});
test('explicit preference beats measured speed but never measured resource exclusions',()=>{
 const f=fixture(),r=f.resolve(),measurement={contextKey:'exact',now:2,policy:{objective:'startup',maxAgeMs:100,maxStartupMs:100,maxPeakBytes:100,minThroughputRatio:1},records:['fine','common'].map((bindingId,i)=>({bindingId,contextKey:'exact',evidenceId:bindingId,measuredAt:1,samples:3,measurement:'complete-recipe',remainingStartupMs:i?50:10,peakBytes:10,throughputRatio:2,startupUncertaintyMs:0}))};
 const select=()=>selectComponentBinding(r,'fine',measurement,{recipe:f.recipe,providerPreferences:common()});
 assert.equal(select().bindingId,'common');measurement.records[1].peakBytes=101;assert.equal(select().bindingId,'fine');measurement.records[0].peakBytes=101;assert.throws(select,{code:'RUNTIME_BUDGET_EXCEEDED'});
});
test('execution acquires preferred providers, retries runtime absence and snapshots caller preferences',async()=>{
 for(const outcome of ['ready','unavailable','failed']){
  const f=fixture(),calls=[],error=Error('asset failure'),preferences=common();
  const deployment=parseProviderDeployment({schema:1,providerContractVersion:1,revision:'test',assets:[],providers:f.catalog.providers.map(p=>({...p,assetIds:[]}))},new URL('https://example.test/'));
  const acquisition=new ProviderAcquisition(deployment,f.catalog.providers.map(p=>({id:p.id,implementationIdentity:p.implementationIdentity,async prepare(){calls.push(p.id);preferences[0].providers.reverse();if(p.id==='audio-common'){if(outcome==='failed')throw error;if(outcome==='unavailable')return {state:'unavailable',reason:'runtime unsupported'};}return {state:'ready',dispose(){}};}})));
  try{
   const result=executeComponentBinding(acquisition,f.recipe,f.evidence,'test','fine',async id=>id,undefined,preferences);
   if(outcome==='failed')await assert.rejects(result,e=>e===error);
   else assert.equal((await result).value,outcome==='ready'?'common':'fine');
   assert.ok(calls.includes('audio-common'));if(outcome!=='unavailable')assert.ok(!calls.includes('audio-ac3'));
  }finally{await acquisition.dispose();}
 }
});
test('runtime preference respects browser support, explicit policies and deployed fallback',()=>{
 const providerPreferences=prefer('media.prepare.file','ffmpeg-file-preparation-asyncify','ffmpeg-file-preparation-jspi');
 const caps={isolated:true,jspi:true},selection=selectRemuxRuntime({providerPreferences},caps);
 assert.equal(selection.runtime,'asyncify');assert.equal(deployedRemuxRuntime(selection,r=>r==='jspi').runtime,'jspi');
 assert.equal(deployedRemuxRuntime(selection,r=>r==='pthread').runtime,'pthread');
 for(const [policy,expected] of [['off','pthread'],['jspi','jspi'],['asyncify','asyncify']])assert.equal(selectRemuxRuntime({remuxRuntime:policy,providerPreferences},caps).runtime,expected);
 assert.equal(selectRemuxRuntime({providerPreferences:prefer('media.prepare.file','ffmpeg-file-preparation-jspi')},{isolated:false,jspi:false}).runtime,'asyncify');
 const owned=initialRemuxDeployment({...selection,providerPreferences});providerPreferences[0].providers.reverse();assert.equal(owned.selection.providerPreferences[0].providers[0],'ffmpeg-file-preparation-asyncify');
});
test('actual Player captures preferences and probes preferred runtime before its default',async t=>{
 const input=prefer('media.prepare.file','ffmpeg-file-preparation-asyncify');
 const p=unitPlayer({providerPreferences:input});t.after(()=>p.destroy());input[0].providers[0]='ffmpeg-file-preparation';
 const calls=[];p.providerRuntime={hasOffer(id){calls.push(id);return true;},has:()=>true,codecInspector:()=>undefined,destroy(){}};
 assert.equal(p.selectDeployedRuntime(),true);assert.equal(p.remuxRuntime,'asyncify');assert.deepEqual(calls,['ffmpeg-file-preparation-asyncify']);
});
test('complete playback priorities keep distinct jobs in place and keep slots stable across admission refreshes',()=>{
 const plans=[{id:'native-direct',eligible:true},{id:'native-remux',eligible:true},{id:'hybrid',eligible:true},{id:'software',eligible:true}],preferences=prefer('media.play.complete','mpv-software','mpv-hybrid');
 const expected=['native-direct','native-remux','software','hybrid'];
 assert.deepEqual(preferProviderPlans(plans,preferences,'pthread').map(p=>p.id),expected);
 const unavailable=plans.map(p=>({...p,eligible:p.id!=='software'}));const ordered=preferProviderPlans(unavailable,preferences,'pthread');
 assert.deepEqual(ordered.map(p=>p.id),expected);assert.equal(ordered[2].eligible,false);
 assert.deepEqual(plans.map(p=>p.id),['native-direct','native-remux','hybrid','software']);
});
test('Native MP4 preparation preference cannot bypass source guards or absent broad assets',()=>{
 const facts={file:true,codecEngine:false,adaptation:undefined,selectiveAudio:false,embeddedSubtitles:false,externalSubtitles:false,prepareAudio:false,runtime:'asyncify',broadAvailable:true,providerPreferences:prefer('media.prepare.file','ffmpeg-file-preparation-asyncify','selected-mp4-view')};
 assert.equal(selectNativePreparation(facts).mp4,false);
 assert.equal(selectNativePreparation({...facts,broadAvailable:false}).mp4,true);
 assert.equal(selectNativePreparation({...facts,providerPreferences:[]}).mp4,true);
 assert.equal(selectNativePreparation({...facts,file:false,providerPreferences:prefer('media.prepare.file','selected-mp4-view')}).mp4,false);
});
test('full-file preparation prefers broad only when qualified deployment is available',async t=>{
 const preferences=prefer('media.prepare.file','ffmpeg-file-preparation-asyncify','ffmpeg-truehd-mlp-asyncify'),runtime=new ProviderRuntime(new URL('https://example.test/'),{},preferences);t.after(()=>runtime.destroy());
 let broad=true;t.mock.method(runtime,'has',path=>!path.startsWith('web/engine-')||broad);t.mock.method(runtime,'hasOffer',id=>id==='ffmpeg-truehd-mlp-asyncify'||broad&&id==='ffmpeg-file-preparation-asyncify');
 const file=new File([new Uint8Array(16)],'movie.mkv'),source={kind:'local',file},probe={format:'matroska',duration:120,tracks:[{id:'1',index:0,type:'video',codec:'h264'},{id:'2',index:1,type:'audio',codec:'truehd',sampleRate:48000,channels:2}]};
 assert.equal(runtime.codecPreparation(source,probe,'asyncify'),undefined);
 broad=false;assert.equal(runtime.codecPreparation(source,probe,'asyncify').providerId,'ffmpeg-truehd-mlp-asyncify');
 assert.equal(runtime.codecPreparation(source,{...probe,format:'mp4'},'asyncify'),undefined);
});
test('actual Player admission honors complete-playback preferences without changing eligibility',async t=>{
 const preferred=unitPlayer({remuxRuntime:'off',providerPreferences:prefer('media.play.complete','mpv-software','mpv-hybrid')}),baseline=unitPlayer({remuxRuntime:'off'});t.after(async()=>{await preferred.destroy();await baseline.destroy();});
 const source={kind:'local',file:new File([new Uint8Array(16)],'movie.mkv')};
 const before=baseline.admissible(source,baseline.settings,[],[]),after=preferred.admissible(source,preferred.settings,[],[]);
 assert.ok(before.findIndex(p=>p.id==='hybrid')<before.findIndex(p=>p.id==='software'));
 assert.ok(after.findIndex(p=>p.id==='software')<after.findIndex(p=>p.id==='hybrid'));
 for(const plan of before)assert.deepEqual(after.find(p=>p.id===plan.id),plan);
 assert.equal(after[0].id,before[0].id);
});
test('broad preparation preference reaches the actual preparation executor',async t=>{
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{},prefer('media.prepare.file','ffmpeg-file-preparation-asyncify'));t.after(()=>runtime.destroy());
 t.mock.method(runtime,'load',async()=>{});
 t.mock.method(runtime,'hasOffer',(id,profile)=>id==='ffmpeg-file-preparation-asyncify'&&profile==='flac24');
 t.mock.method(runtime,'has',path=>{assert.equal(path,'web/engine-adaptation-asyncify/remux.wasm');return true;});
 assert.equal(await runtime.prepareAudio(new File(['media'],'movie.mkv'),new AbortController().signal,'asyncify'),undefined);
});
test('runtime ranking ignores an absent preferred provider even if that runtime has another provider',async t=>{
 const p=unitPlayer({providerPreferences:prefer('media.prepare.file','ffmpeg-file-preparation-jspi','ffmpeg-file-preparation-asyncify')});t.after(()=>p.destroy());
 // Both browser runtimes are supported; only Asyncify has the preferred broad implementation.
 p.control={...p.control,routing:{...p.control.routing,deployment:initialRemuxDeployment(selectRemuxRuntime({providerPreferences:prefer('media.prepare.file','ffmpeg-file-preparation-jspi','ffmpeg-file-preparation-asyncify')},{isolated:true,jspi:true}))}};
 const calls=[];p.providerRuntime={preferenceProviders:()=>['ffmpeg-truehd-mlp-jspi','ffmpeg-file-preparation-asyncify'],hasOffer(id){calls.push(id);return id==='ffmpeg-file-preparation-asyncify';},has:()=>true,codecInspector:()=>({providerId:'ffmpeg-truehd-mlp-jspi'}),destroy(){}};
 assert.equal(p.selectDeployedRuntime(),true);assert.equal(p.remuxRuntime,'asyncify');assert.deepEqual(calls,['ffmpeg-file-preparation-asyncify']);
});
test('codec slice preferences can select their supported runtime',()=>{
 const selected=selectRemuxRuntime({providerPreferences:prefer('media.prepare.file','ffmpeg-truehd-mlp-asyncify')},{isolated:true,jspi:true});
 assert.equal(selected.runtime,'asyncify');
});

test('a preferred complete player still requires its source inspection dependency',()=>{
 const selection=selectRemuxRuntime({providerPreferences:prefer('media.play.complete','mpv-playback-asyncify')},{isolated:true,jspi:true});
 const resolved=resolveRemuxDeployment(selection,{asyncify:false,jspi:true},['mpv-playback-asyncify','ffmpeg-file-preparation-jspi']);
 assert.equal(resolved.runtime,'jspi');
});
test('runtime preference excludes codec slices incompatible with the inspected source',async t=>{
 const preferences=prefer('media.prepare.file','ffmpeg-truehd-mlp-asyncify','ffmpeg-ac3-eac3-jspi');
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{},preferences),p=unitPlayer({providerPreferences:preferences});t.after(()=>p.destroy());
 const ids=['ffmpeg-truehd-mlp-asyncify','ffmpeg-ac3-eac3-jspi'];
 runtime.deployment={catalog:{providers:ids.map(id=>({id,offers:[{capability:'media.prepare.file',profile:'flac24'}]}))}};
 t.mock.method(runtime,'hasOffer',id=>ids.includes(id));t.mock.method(runtime,'has',()=>true);
 p.providerRuntime=runtime;p.control={...p.control,routing:{...p.control.routing,deployment:initialRemuxDeployment(selectRemuxRuntime({providerPreferences:preferences},{isolated:false,jspi:true}))}};
 const source={kind:'local',file:new File(['media'],'movie.mkv')},probe={format:'matroska',duration:120,tracks:[{id:'1',index:0,type:'video',codec:'h264'},{id:'2',index:1,type:'audio',codec:'ac3',sampleRate:48000,channels:2}]};
 assert.equal(p.selectDeployedRuntime(),true);assert.equal(p.remuxRuntime,'asyncify');
 assert.deepEqual(runtime.preferenceProviders(source,probe),['ffmpeg-ac3-eac3-jspi']);
 assert.equal(p.selectDeployedRuntime(source,probe),true);assert.equal(p.remuxRuntime,'jspi');
 assert.equal(runtime.codecPreparation(source,probe,p.remuxRuntime).providerId,'ffmpeg-ac3-eac3-jspi');
 assert.equal(p.selectDeployedRuntime(source,probe),true);assert.equal(p.remuxRuntime,'jspi');
});

test('source-aware runtime fallback preserves an explicit runtime pin',async t=>{
 const p=unitPlayer({remuxRuntime:'asyncify',providerPreferences:prefer('media.prepare.file','ffmpeg-ac3-eac3-jspi')});t.after(()=>p.destroy());
 p.providerRuntime={preferenceProviders:()=>['ffmpeg-ac3-eac3-jspi'],hasOffer(){assert.fail('explicit pins must not probe alternatives');},destroy(){}};
 assert.equal(p.selectDeployedRuntime({kind:'local',file:new File(['media'],'movie.mkv')},{format:'matroska',duration:1,tracks:[]}),true);assert.equal(p.remuxRuntime,'asyncify');
});
