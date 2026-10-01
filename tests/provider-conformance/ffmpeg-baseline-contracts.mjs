// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {selectBaselineArtifacts} from './ffmpeg-baseline.mjs';
import {parseArguments, resolveConfig} from '../../scripts/test-providers.mjs';
const provider = (runtime = 'asyncify', profiles = ['packet-copy', 'flac24']) => ({name: '@demuxe/provider-ffmpeg-' + runtime,
  manifest: {provides: [{id: 'ffmpeg-' + runtime, offers: profiles.map(profile => ({capability: 'media.prepare.file', version: 1, profile}))}]},
  artifactPaths: () => ['web/private-ffmpeg/bridge.js', 'web/private-ffmpeg/range-source.js', 'web/private-ffmpeg/single-owner.js',
    ...['remux', 'adaptation'].flatMap(engine => ['mjs', 'wasm'].map(ext => 'web/engine-' + engine + '-' + runtime + '/remux.' + ext))]});
test('packaged baseline selection uses exact declared preparation profiles and fact artifacts', () => {
  const copy = selectBaselineArtifacts(provider(), 'packet-copy'), repair = selectBaselineArtifacts(provider(), 'flac24');
  assert.equal(copy.names.factoryURL, 'web/engine-remux-asyncify/remux.mjs');
  assert.equal(repair.names.factoryURL, 'web/engine-adaptation-asyncify/remux.mjs');
  assert.equal(selectBaselineArtifacts(provider('jspi'), 'flac24').runtime, 'jspi');
  assert.match(selectBaselineArtifacts(provider(), 'opus-permitted').blocked, /does not declare/);
});
test('baseline cannot load an artifact absent from its selected fact closure', () => {
  const candidate = provider(); candidate.artifactPaths = () => ['web/private-ffmpeg/bridge.js'];
  assert.throws(() => selectBaselineArtifacts(candidate, 'packet-copy'), /outside selected fact/);
});
test('unsupported packaged runtime is blocked without a host-native fallback', () => {
  const candidate = provider(); candidate.name = '@demuxe/provider-ffmpeg';
  assert.match(selectBaselineArtifacts(candidate, 'packet-copy').blocked, /No maintained Worker/);
});
test('existing runner accepts packaged baseline and an external collaborative browser', async () => {
  const config = await resolveConfig(parseArguments(['--provider', 'candidate', '--baseline', 'baseline', '--browser', 'external']));
  assert.equal(config.baseline, process.cwd() + '/baseline'); assert.equal(config.browser, 'external');
  await assert.rejects(() => resolveConfig(parseArguments(['--provider', 'candidate', '--browser', 'unknown'])), /Baseline browser/);
});
