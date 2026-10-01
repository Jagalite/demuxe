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
 assert.equal(audioRepairRecipe('aac',6).requirements[2].profile,'lc-configured');
 assert.equal(audioRepairRecipe('flac',2,'flac','matroska',96000).requirements[3].profile,'configured-s24');
 assert.equal(audioRepairRecipe('alac',2,'flac','isobmff',44100).requirements[0].capability,'container.read.isobmff');
 assert.throws(()=>audioRepairRecipe('aac',2,'opus','matroska',44100));
 assert.throws(()=>audioRepairRecipe('aac',2,'flac','matroska',96000));
 assert.throws(()=>audioRepairRecipe('vorbis',6));
 assert.throws(()=>audioRepairRecipe('aac',6,'flac','isobmff'));
 assert.throws(()=>audioRepairRecipe('alac',2,'flac','isobmff',96000));
 assert.equal(audioRepairRecipe('pcm-s24le',1,'flac','wave-aiff',44100).requirements[0].capability,'container.read.wave-aiff');
 assert.throws(()=>audioRepairRecipe('aac',2,'flac','wave-aiff'));
 assert.throws(()=>audioRepairRecipe('pcm-s24le',6,'flac','wave-aiff'));
 assert.throws(()=>audioRepairRecipe('opus',2,'flac','isobmff'));
 assert.equal(audioRepairRecipe('truehd',2,'flac','matroska',44100).requirements[2].profile,'configured-integer');
 assert.throws(()=>audioRepairRecipe('truehd',1,'flac','matroska',48000));
 for(const channels of [2,6])assert.equal(audioRepairRecipe('dts-hd',channels,'flac','matroska',48000).requirements[2].profile,'ma-configured-integer');
 assert.equal(audioRepairRecipe('dts-hd',8,'flac','matroska',48000).requirements[2].profile,'ma-48khz-s32p');
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

test('explicit AAC extensions select finite offers and keep the LC default distinct',()=>{
 for(const [profile,rate,offer]of [['he',48000,'he-stereo48'],['he-v2',44100,'he-v2-stereo44100']]){
  const recipe=audioRepairRecipe('aac',2,'flac','isobmff',rate,profile);
  assert.equal(recipe.requirements[2].profile,offer);assert.equal(recipe.bindings[0].assignments[1].providerId,'audio-aac');
  const lc=audioRepairRecipe('aac',2,'flac','isobmff',rate);assert.match(lc.requirements[2].profile,/^lc-/);assert.notEqual(recipe.id,lc.id);
  for(const args of [['aac',1,'flac','isobmff',rate,profile],['aac',2,'flac','matroska',rate,profile],['aac',2,'flac','isobmff',rate===48000?44100:48000,profile],['alac',2,'flac','isobmff',rate,profile]])assert.throws(()=>audioRepairRecipe(...args));
 }
 assert.throws(()=>audioRepairRecipe('aac',2,'opus','isobmff',44100,'he-v2'));
 assert.equal(audioRepairRecipe('aac',2,'opus','isobmff',48000,'he').requirements[2].profile,'he-stereo48');
});
