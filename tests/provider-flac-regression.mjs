// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {PacketFlacEncoder} from '../build/component-candidates/provider-audio/src/flac-encoder.js';
import {runFlacEncoderChecks} from './provider-conformance/flac-encoder.mjs';
const root = process.env.FLAC_BUILD_ROOT ?? 'build/codec-expansion/decoder-families';
const pointer = JSON.parse(await readFile(root + '/flac.json', 'utf8'));
const recordBytes = await readFile(pointer.directory + '/build-record.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(hash(recordBytes), pointer.recordSHA256);
const record = JSON.parse(recordBytes);
for (const [file, fact] of Object.entries(record.artifacts)) assert.equal(hash(await readFile(pointer.directory + '/' + file)), fact.sha256);
const factory = (await import(pathToFileURL(pointer.directory + '/module.mjs'))).default;
const module = await factory({wasmBinary: await readFile(pointer.directory + '/module.wasm')});
const out = process.env.FLAC_RESULT_ROOT ?? 'build/codec-expansion/flac-results';
await mkdir(out, {recursive: true});
const results = [];
for (const sampleRate of [44100, 48000, 96000]) for (const channels of [1, 2, 6, 8]) {
  const result = await runFlacEncoderChecks({
    createEncoder: ({channels, sampleRate}, signal) => new PacketFlacEncoder(module, channels, signal, 0, sampleRate),
    outputDirectory: out,
    channels, sampleRate,
  });
  await copyFile(out + '/roundtrip.flac', out + `/flac-${sampleRate}-${channels}.flac`);
  results.push({sampleRate, channels, samples: result.samples, exactRoundtrip: result.integerExact, partialFinalBlock: result.partialFinalBlock, aborted: result.cancelled});
}
await writeFile(out + '/report.json', JSON.stringify({passed: true, record, results}, null, 2) + '\n');
console.log(results);
