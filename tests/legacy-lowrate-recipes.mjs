// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['src/internal/component-recipes.ts'],bundle:true,format:'esm',platform:'node',write:false});
const {audioRepairRecipe}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
test('lower-rate legacy recipes select their finite offer and low-rate encoder',()=>{
 for(const codec of ['mp2','wmav1','wmav2'])for(const rate of codec==='mp2'?[32000]:[8000,16000,22050,32000])for(const channels of [1,2]){
  const recipe=audioRepairRecipe(codec,channels,'flac','matroska',rate);
  assert(recipe.requirements.some(r=>r.capability==='audio.decode.'+codec&&r.profile==='lower-rate-pcm'));
  assert(recipe.requirements.some(r=>r.capability==='audio.encode.flac'&&r.profile==='low-rate-s24'));
  assert(recipe.bindings.some(b=>b.assignments.some(a=>a.providerId==='audio-legacy')));
 }
});
test('lower-rate extensions preserve unsupported codec, transport and output bounds',()=>{
 for(const args of [['mp2',2,'flac','matroska',8000],['wmav1',6,'flac','matroska',16000],['wmav2',2,'opus','matroska',32000],['wmav1',2,'flac','isobmff',16000],['aac',2,'flac','matroska',32000]])assert.throws(()=>audioRepairRecipe(...args));
 for(const codec of ['mp2','wmav1','wmav2'])for(const rate of [44100,48000])assert(audioRepairRecipe(codec,2,'flac','matroska',rate).requirements.some(r=>r.capability==='audio.decode.'+codec&&r.profile==='configured-pcm'));
});
