// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {harnesses} from '../../scripts/codec-expansion-ci.mjs';
const page=await readFile(new URL('../codec-expansion-page.mjs',import.meta.url),'utf8');
const context=vm.createContext({document:{querySelector:()=>({})}});
vm.runInContext(page+'\nglobalThis.selectShared=usesSharedPacketChecks;',context);
test('shared conformance preserves dedicated extended codec and rejection gates',()=>{
 const baseline={codec:'aac',profile:'aac',sampleRate:48000,channels:2};
 assert.equal(context.selectShared(baseline),true);
 for(const changed of [{aacProfile:'he'},{expectedRejection:'PROVIDER_PROFILE_MISMATCH'},{expectedDecodeRejection:'packet-budget'},{sampleRate:44100},{channels:1},{codec:'pcm-u8',profile:'pcm'},{codec:'adpcm-ima-qt',profile:'adpcm-qt'},{codec:'adpcm-g726',profile:'g726'},{codec:'speex',profile:'speech'}])assert.equal(context.selectShared({...baseline,...changed}),false);
});
test('portable codec matrix includes shared browser checks and native timing helper',()=>{
 for(const name of ['tests/provider-conformance/audio-decoder.mjs','tests/provider-conformance/audio-fixtures.mjs'])assert.ok(harnesses.includes(name),name);
});
