// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {audioRepairRecipe} from '../web/generated/internal/component-recipes.js';
import {resolveProviderRecipe} from '../web/generated/internal/provider-resolution.js';
test('new source envelopes still require exact composition evidence',()=>{
 for(const [codec,container,rate,channels] of [['pcm-s24le','wave-aiff',96000,1],['aac','isobmff',44100,1],['wmav2','matroska',44100,2],['wavpack','matroska',96000,8]]){
  const recipe=audioRepairRecipe(codec,channels,'flac',container,rate),providers=recipe.bindings[0].assignments.map(a=>({id:a.providerId,implementationIdentity:'exact-'+a.providerId,technology:'javascript',delivery:['optional-assets'],offers:a.requirements,availability:{state:'configured-unverified'}}));
  const catalog={revision:'test',providers};
  assert.equal(resolveProviderRecipe(recipe,catalog,[],'source').bindings[0].state,'unqualified');
  const evidence=[{recipeId:recipe.id,bindingId:'fine',scopeKey:'source',implementationIdentities:Object.fromEntries(providers.map(p=>[p.id,p.implementationIdentity]))}];
  assert.equal(resolveProviderRecipe(recipe,catalog,evidence,'source').bindings[0].state,'pending');
  providers[1].implementationIdentity+='-changed';
  const changed=resolveProviderRecipe(recipe,catalog,evidence,'source').bindings[0];
  assert.equal(changed.state,'unavailable');
  assert.equal(changed.missing[0].reason,'implementation-not-qualified');
 }
});
test('unqualified containers, codec modes and output rates are excluded',()=>{
 for(const args of [['ape',2,'flac','matroska',48000],['mp1',2,'flac','matroska',48000],['wmav2',6,'flac','matroska',48000],['wmav1',2,'flac','matroska',96000],['wavpack',2,'flac','isobmff',48000],['aac',2,'flac','wave-aiff',48000],['pcm-s24le',2,'opus','wave-aiff',44100],['flac',2,'flac','mpegts',48000]])assert.throws(()=>audioRepairRecipe(...args));
});
test('header-owned lossless recipes select only qualified rate/layout profiles',()=>{
 for(const codec of ['truehd','mlp'])for(const rate of [44100,96000])for(const channels of [1,2,6]){
  const recipe=audioRepairRecipe(codec,channels,'flac','matroska',rate),assignment=recipe.bindings[0].assignments.find(a=>a.providerId==='audio-truehd-mlp');
  assert.ok(assignment);assert.ok(assignment.requirements.some(r=>r.capability==='audio.decode.'+codec&&r.profile==='configured-integer'));
 }
 for(const channels of [2,6,8]){
  const recipe=audioRepairRecipe('dts-hd',channels,'flac','matroska',48000),assignment=recipe.bindings[0].assignments.find(a=>a.providerId==='audio-dts-hd');
  assert.ok(assignment);assert.ok(assignment.requirements.some(r=>r.profile===(channels===8?'ma-48khz-s32p':'ma-configured-integer')));
 }
 for(const codec of ['truehd','mlp']){const recipe=audioRepairRecipe(codec,1,'flac','matroska',48000);assert.ok(recipe.bindings[0].assignments.find(a=>a.providerId==='audio-truehd-mlp').requirements.some(r=>r.profile==='configured-integer'));}
 assert.throws(()=>audioRepairRecipe('dts-hd',1,'flac','matroska',48000));
 for(const codec of ['truehd','mlp'])for(const rate of [44100,96000])assert.throws(()=>audioRepairRecipe(codec,8,'flac','matroska',rate));
 for(const channels of [2,6,8])assert.throws(()=>audioRepairRecipe('dts-hd',channels,'flac','matroska',44100));
 assert.throws(()=>audioRepairRecipe('dts-hd',2,'flac','matroska',96000));
 for(const channels of [6,8]){const recipe=audioRepairRecipe('dts-hd',channels,'flac','matroska',96000);assert.ok(recipe.requirements.some(r=>r.profile==='ma-high-rate-integer'));}
 assert.throws(()=>audioRepairRecipe('dts-hd',6,'flac','matroska',192000));
 assert.throws(()=>audioRepairRecipe('mlp',8,'flac','matroska',48000));
 for(const codec of ['truehd','dts-hd'])assert.doesNotThrow(()=>audioRepairRecipe(codec,8,'flac','matroska',48000));
});
