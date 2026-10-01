// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {verifyProvider, checkUnchanged, sha} from './package.mjs';
import {loadAdapter} from './adapters.mjs';
import {fixtureMatches} from './registry.mjs';
import {collectHarnessInputs} from './harness-inputs.mjs';

const workerData = await new Promise(resolve => process.once('message', resolve));
const {item, factId, offer, suite, outputDirectory, coreVersion} = workerData;
const result = {status: 'failed', checks: [], parityJobs: [], fixtureInputs: {}, adapterInputs: {}, importedArtifacts: []};
let loaded, provider;
try {
  provider = await verifyProvider(item.path, coreVersion);
  assert.deepEqual(provider.inputs, workerData.expectedInputs, 'Candidate changed after parent verification');
  const fact = provider.manifest.provides.find(fact => fact.id === factId);
  assert.ok(fact, 'Provider disappeared');
  const selectedAdapter = item.adapters?.find(spec => (!spec.providerId || spec.providerId === factId)
    && (!spec.capability || spec.capability === offer.capability) && (!spec.profile || spec.profile === offer.profile)) ?? item.adapter;
  loaded = await loadAdapter(provider, fact, selectedAdapter, path.join(outputDirectory, 'adapter'));
  result.adapter = loaded.name; result.adapterInputs = loaded.harnessInputs; result.importedArtifacts = loaded.imports;
  const adapter = loaded.adapter;
  if (suite === 'audio-decoder') {
    if (!adapter.createDecoder) result.status = 'blocked';
    else {
      const {runAudioDecoderChecks} = await import('./audio-decoder.mjs');
      const {prepareAudioFixture, generateAudioFixture} = await import('./audio-fixtures.mjs');
      let fixtures = (item.fixtures ?? []).filter(fixture => fixtureMatches(offer, fixture));
      if (!fixtures.length && !(item.fixtures?.length)) {
        const codec = workerData.codec;
        if (['he-stereo48','he-v2-stereo44100','usac-mono48','he-configured-float','he-v2-stereo32','usac-stereo-configured','lc-pce8-44100'].includes(offer.profile)) result.reason='AAC extension requires retained packet/PCM/native timing references';
        else if (offer.profile==='integer-8bit') result.reason='PCM8 requires explicitly supplied signed/unsigned fixture descriptors';
        else if (['adpcm-ima-qt','adpcm-g726','adpcm-g726le'].includes(codec)) result.reason = 'Codec requires explicit SHA256-pinned retained packet fixtures';
        else if (codec === 'dts-hd') result.reason = 'DTS-HD requires an independently sourced fixture';
        else if (codec === 'pcm') {
          fixtures = await Promise.all(['pcm-s16le', 'pcm-s24le', 'pcm-s32le', 'pcm-f32le', 'pcm-f64le'].map(codec => generateAudioFixture({codec}, outputDirectory)));
        } else fixtures = [await generateAudioFixture({codec}, outputDirectory)];
      }
      if (!fixtures.length) {result.status = 'blocked'; result.reason ??= 'No fixture matches the offered codec/profile';}
      else {
        const {isAacSyntaxNegative,runAacSyntaxNegative,assertPositiveFixtureCoverage}=await import('./aac-negative.mjs');
        if(fixtures.some(f=>f.expectedRejection))assert.ok(fixtures.filter(f=>f.expectedRejection).every(isAacSyntaxNegative),'Unregistered expected rejection cannot qualify an audio offer');
        assertPositiveFixtureCoverage(fixtures);
        for (const [i, fixture] of fixtures.entries()) {
          assert.ok(fixtureMatches(offer, fixture), 'Generated fixture does not match offered profile');
          if(isAacSyntaxNegative(fixture)){const check=await runAacSyntaxNegative({createDecoder:adapter.createDecoder,fixture});result.checks.push(check);Object.assign(result.fixtureInputs,check.fixtureInputs);continue;}
          const input = await readFile(fixture.input); result.fixtureInputs[fixture.input] = sha(input);
          for (const key of ['reference', 'integerReference', 'doubleReference', 'packetFile', 'timingFile']) if (fixture[key]) result.fixtureInputs[fixture[key]] = sha(await readFile(fixture[key]));
          const fixtureDirectory = path.join(outputDirectory, 'fixture-' + i);
          const prepared = await prepareAudioFixture(fixture, fixtureDirectory);
          const digest = value => value && sha(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
          result.checks.push({id: fixture.id, fixture: prepared.fixture,
            referenceSHA256: digest(prepared.reference), integerReferenceSHA256: digest(prepared.integerReference),
            doubleReferenceSHA256: digest(prepared.doubleReference),
            timingReferenceSHA256: sha(Buffer.from(JSON.stringify(prepared.timingReference, null, 2) + '\n')),
            ...await runAudioDecoderChecks({...prepared, createDecoder: adapter.createDecoder,
              parityOutput: {directory: fixtureDirectory, input: fixture.input}})});
        }
        result.status = 'passed';
      }
    }
  } else if (suite === 'retained-packet') {
    const {runRetainedPacketChecks}=await import('./retained-packet.mjs');
    const rows=(item.fixtures??[]).filter(f=>fixtureMatches(offer,f));
    if(!adapter.createDecoder||!rows.length){result.status='blocked';result.reason='Missing exact retained codec fixture/adapter';}
    else{for(const fixture of rows){const check=await runRetainedPacketChecks({adapter,offer,fixture});result.checks.push(check);Object.assign(result.fixtureInputs,check.fixtureInputs);Object.assign(result.adapterInputs,check.harnessInputs);}result.status='passed';}
  } else if (suite === 'matroska') {
    if (!adapter.openReader) result.status = 'blocked';
    else {
      const {runContainerChecks, prepareContainerFixture} = await import('./container.mjs');
      const input = item.containerFixture ?? await prepareContainerFixture(outputDirectory);
      result.fixtureInputs[input] = sha(await readFile(input));
      result.checks.push(await runContainerChecks({openReader: adapter.openReader, input, outputDirectory})); result.status = 'passed';
    }
  } else if (suite === 'fmp4') {
    if (!adapter.createWriter || !(adapter.openReader ?? adapter.fixtureReader)) {result.status = 'blocked'; result.reason = 'Mux check requires candidate createWriter and a fixture reader adapter';}
    else {
      const {runMuxChecks, prepareMuxFixture} = await import('./container.mjs');
      const input = item.muxFixture ?? await prepareMuxFixture(outputDirectory);
      result.fixtureInputs[input] = sha(await readFile(input));
      result.checks.push(await runMuxChecks({openReader: adapter.openReader ?? adapter.fixtureReader, createWriter: adapter.createWriter, input, outputDirectory})); result.status = 'passed';
    }
  } else if (suite === 'flac-encoder') {
    if (!adapter.createEncoder) result.status = 'blocked';
    else {
      const {runFlacEncoderChecks} = await import('./flac-encoder.mjs');
      const rates = offer.profile === 'configured-s24' ? [44100,48000,96000] : offer.profile === 'low-rate-s24' ? [8000,16000,22050,32000] : [48000];
      for (const sampleRate of rates) for (const channels of (offer.profile==='low-rate-s24'?[1,2]:[1,2,6,8])) {
        result.checks.push(await runFlacEncoderChecks({createEncoder: adapter.createEncoder, sampleRate, channels,
          outputDirectory: path.join(outputDirectory, sampleRate + '-' + channels)}));
      }
      result.status = 'passed';
    }
  } else if (suite === 'opus-encoder') {
    if (!(adapter.createOpusEncoder ?? adapter.createEncoder) || !(adapter.createWriter ?? adapter.fixtureWriter)) result.status = 'blocked';
    else {
      const {runOpusEncoderChecks} = await import('./opus-encoder.mjs');
      result.checks.push(await runOpusEncoderChecks({createEncoder: adapter.createOpusEncoder ?? adapter.createEncoder,
        createWriter: adapter.createWriter ?? adapter.fixtureWriter, outputDirectory})); result.status = 'passed';
    }
  } else if (suite === 'container-specific') {
    const filename = new URL('./container-specific.mjs',import.meta.url);
    Object.assign(result.adapterInputs,await collectHarnessInputs(filename.pathname));
    const {runChecks}=await import('./container-specific.mjs');
    const check=await runChecks({adapter,offer,outputDirectory,fixtures:item.containerFixtures??item.fixtures??[]});
    assert.equal(check?.passed,true,'Container suite did not explicitly pass');
    assert.ok(check.scope,'Container suite must state bounded scope');
    for(const [filename,digest] of Object.entries(check.fixtureInputs??{})){assert.ok(path.isAbsolute(filename)&&/^[a-f0-9]{64}$/.test(digest),'Invalid container fixture pin');assert.equal(sha(await readFile(filename)),digest,'Container fixture changed');result.fixtureInputs[filename]=digest;}
    result.checks.push(check);result.status='passed';
  } else if (suite?.module) {
    Object.assign(result.adapterInputs, await collectHarnessInputs(suite.module));
    const custom = await import(pathToFileURL(suite.module).href);
    const check = await custom.runChecks({adapter, offer, outputDirectory, fixtures: item.fixtures ?? []});
    assert.equal(check?.passed, true, 'Custom suite did not explicitly pass');
    if(check.fixtureInputs){for(const [filename,digest] of Object.entries(check.fixtureInputs)){assert.ok(path.isAbsolute(filename)&&/^[a-f0-9]{64}$/.test(digest),'Invalid custom fixture pin');assert.equal(sha(await readFile(filename)),digest,'Custom fixture changed');result.fixtureInputs[filename]=digest;}}
    assert.ok(typeof check.scope === 'string' && check.scope, 'Custom suite must state fixture scope');
    result.checks.push(check); result.status = 'passed';
  }
  if (result.status === 'blocked') result.reason ??= 'No adapter for the selected contract';
  result.parityJobs = result.checks.flatMap(check => check.parityJobs ?? []);
} catch (error) {
  result.status = 'failed'; result.error = String(error.stack ?? error);
} finally {
  try {await loaded?.adapter?.dispose?.();} catch (error) {result.status = 'failed'; result.cleanupError = String(error);}
  try {
    if (provider) await checkUnchanged(provider);
    for (const [filename, digest] of Object.entries({...result.fixtureInputs, ...result.adapterInputs, ...loaded?.stagedInputs})) {
      assert.equal(sha(await readFile(filename)), digest, 'Test input changed during execution or cleanup: ' + filename);
    }
  } catch (error) {result.status = 'failed'; result.error = String(error.stack ?? error);}
}
process.send(result);
