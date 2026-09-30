// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {audioRepairRecipe} from '../web/generated/internal/component-recipes.js';
import {resolveProviderRecipe} from '../web/generated/internal/provider-resolution.js';
import {selectComponentBinding} from '../web/generated/internal/component-selection.js';
import {parseProviderDeployment} from '../web/generated/internal/provider-catalog.js';
import {ProviderRuntime} from '../web/generated/internal/provider-runtime.js';

test('new packet families require exact composition evidence and explicit lossy output',async()=>{
 const registry=JSON.parse(await readFile(new URL('../licensing/provider-packages.json',import.meta.url)));
 const codecs=['aac','opus','vorbis','flac','alac','mp3','pcm-s16le','pcm-s24le','pcm-s32le','pcm-f32le','pcm-f64le'];
 for(const codec of codecs)for(const output of ['flac','opus']){
  const recipe=audioRepairRecipe(codec,2,output),binding=recipe.bindings[0];
  assert.equal(recipe.bindings.length,1);
  const providers=binding.assignments.map(({providerId,requirements})=>{
   const profile=registry.profiles[providerId==='ts-container'?'container':providerId];
   assert.ok(profile,'missing package '+providerId);
   assert.ok(requirements.every(r=>profile.descriptors[providerId].provides.some(o=>JSON.stringify(o)===JSON.stringify(r))));
   return {id:providerId,implementationIdentity:'test-'+providerId,technology:'javascript',delivery:['application-bundle'],applicationBuild:'test',offers:requirements,availability:{state:'ready'}};
  });
  const parsed=parseProviderDeployment({schema:1,providerContractVersion:1,revision:'test',assets:[],providers},new URL('https://example.test/'));
  assert.throws(()=>selectComponentBinding(resolveProviderRecipe(recipe,parsed.catalog,[],'fixture'),'fine'),e=>e.code==='QUALIFICATION_REQUIRED');
  const evidence=[{recipeId:recipe.id,bindingId:'fine',scopeKey:'fixture',implementationIdentities:Object.fromEntries(providers.map(p=>[p.id,p.implementationIdentity]))}];
  assert.equal(selectComponentBinding(resolveProviderRecipe(recipe,parsed.catalog,evidence,'fixture'),'fine').bindingId,'fine');
  assert.equal(binding.assignments.at(-1).providerId,output==='opus'?'audio-opus-encoder':'audio-flac');
 }
 assert.notEqual(audioRepairRecipe('aac').id,audioRepairRecipe('aac',2,'opus').id);
 assert.throws(()=>audioRepairRecipe('truehd',6,'opus'));
 assert.throws(()=>audioRepairRecipe('aac',6));
});

test('AC3 full-file provider selection respects runtime, selected track and deployed identity',async t=>{
 const runtime=new ProviderRuntime(new URL('https://example.test/'),{});
 t.mock.method(runtime,'has',()=>true);
 t.mock.method(runtime,'hasOffer',(id)=>id==='ffmpeg-ac3-eac3-asyncify');
 const file=new File(['fixture'],'audio.mkv'),source={kind:'local',file};
 const video={id:'1',index:0,type:'video',codec:'h264'};
 const audio={id:'2',index:1,type:'audio',codec:'ac3',channels:2,sampleRate:48000};
 const probe={format:'matroska',tracks:[video,audio,{...audio,id:'3',index:2,codec:'eac3',channels:6}]};
 assert.equal(runtime.codecPreparation(source,probe,'asyncify').providerId,'ffmpeg-ac3-eac3-asyncify');
 assert.equal(runtime.codecPreparation(source,probe,'asyncify','3').audioIndex,2);
 assert.equal(runtime.codecPreparation(source,probe,'jspi'),undefined);
 assert.equal(runtime.codecPreparation(source,{...probe,tracks:[video,{...audio,channels:8}]},'asyncify'),undefined);
 assert.equal(runtime.codecPreparation(source,{...probe,tracks:[video,{...audio,sampleRate:96000}]},'asyncify'),undefined);
 assert.equal(runtime.codecPreparation(source,probe,'asyncify','no'),undefined);
 await runtime.destroy();
});
