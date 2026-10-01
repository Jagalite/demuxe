// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {runOpusEncoderChecks} from './provider-conformance/opus-encoder.mjs';
import {PacketOpusEncoder} from '../build/component-candidates/provider-audio/src/opus-encoder.js';
import {FragmentedMP4Writer} from '../build/component-candidates/provider-container/src/fmp4.js';
const root=process.env.OPUS_BUILD_ROOT??'build/codec-expansion/opus-encoder';
const pointer=JSON.parse(await readFile(path.join(root,'opus-encoder.json'),'utf8'));
const recordBytes=await readFile(path.join(pointer.directory,'build-record.json'));
assert.equal(createHash('sha256').update(recordBytes).digest('hex'),pointer.recordSHA256);
const record=JSON.parse(recordBytes);
for(const [file,fact] of Object.entries(record.artifacts))assert.equal(createHash('sha256').update(await readFile(path.join(pointer.directory,file))).digest('hex'),fact.sha256);
const factory=(await import(pathToFileURL(path.join(pointer.directory,'module.mjs')))).default;
const module=await factory({wasmBinary:await readFile(path.join(pointer.directory,'module.wasm'))});
const out=process.env.OPUS_RESULT_ROOT??'build/codec-expansion/opus-results';await mkdir(out,{recursive:true});
const checks=await runOpusEncoderChecks({
 createEncoder:({channels},signal)=>new PacketOpusEncoder(module,channels,signal),
 createWriter:tracks=>new FragmentedMP4Writer(tracks),outputDirectory:out
});
await writeFile(path.join(out,'report.json'),JSON.stringify({...checks,scope:'Real Wasm encoding, independent FFmpeg decode and MP4 seek with required80ms Opus preroll; browser qualification separate',record},null,2)+'\n');
console.log(checks.results);
