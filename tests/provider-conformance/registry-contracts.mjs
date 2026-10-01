// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {suites, selectSuite, fixtureMatches} from './registry.mjs';

test('built-in test tuples stay within the maintained capability contracts', async () => {
  const source = await readFile(new URL('../../src/internal/execution-capabilities.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022}}).outputText;
  const {EXECUTION_CAPABILITIES} = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
  for (const suite of suites) {
    const contract = EXECUTION_CAPABILITIES[suite.capability]; assert.ok(contract, suite.capability);
    assert.equal(suite.version, contract.version); assert.ok(contract.profiles.includes(suite.profile), suite.profile);
  }
});
test('test selection requires the exact contract version and profile', () => {
  const offer = {capability: 'audio.decode.ac3', version: 1, profile: '48khz-fltp'};
  assert.equal(selectSuite(offer).suite, 'audio-decoder');
  assert.equal(selectSuite({...offer, version: 2}), undefined); assert.equal(selectSuite({...offer, profile: 'other'}), undefined);
});
test('wrong codec, sample rate or layout cannot satisfy stereo packet fixture coverage', () => {
  const offer = {capability: 'audio.decode.aac', version: 1, profile: 'lc-48khz-stereo'};
  const fixture = {codec: 'aac', sampleRate: 48000, channels: 2}; assert.equal(fixtureMatches(offer, fixture), true);
  for (const changed of [{codec: 'mp3'}, {sampleRate: 44100}, {channels: 6}]) assert.equal(fixtureMatches(offer, {...fixture, ...changed}), false);
});
test('AC3, EAC3 and DTS core profiles admit explicit mono, stereo and 5.1 fixtures', () => {
  for (const [capability, codec, profile] of [['audio.decode.ac3', 'ac3', '48khz-fltp'], ['audio.decode.eac3', 'eac3', '48khz-fltp'], ['audio.decode.dts', 'dts-core', 'core-48khz-fltp']]) {
    const offer = {capability, version: 1, profile};
    for (const channels of [1, 2, 6]) assert.equal(fixtureMatches(offer, {codec, channels, sampleRate: 48000}), true);
    for (const channels of [0, 3, 8]) assert.equal(fixtureMatches(offer, {codec, channels, sampleRate: 48000}), false);
  }
});
test('every maintained optional audio/container offer has an explicit standard suite',async()=>{const catalog=JSON.parse(await readFile(new URL('../../licensing/provider-packages.json',import.meta.url)));let checked=0;for(const [target,profile]of Object.entries(catalog.profiles))if(target==='container'||target.startsWith('audio-'))for(const descriptor of Object.values(profile.descriptors??{}))for(const offer of descriptor.provides??[]){assert.ok(selectSuite(offer),'Missing '+JSON.stringify(offer));checked++;}assert.ok(checked>=78,'Unexpectedly reduced maintained offer inventory');});
