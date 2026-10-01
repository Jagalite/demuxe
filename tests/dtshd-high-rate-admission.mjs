// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {assertDtsHdAdmission} from './dtshd-high-rate-admission-controls.mjs';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const sha=b=>createHash('sha256').update(b).digest('hex'),home=await mkdtemp(path.join(os.tmpdir(),'demuxe-dtshd-admission-'));
execFileSync(process.execPath,['node_modules/typescript/bin/tsc','--target','ES2022','--module','ES2022','--strict','--skipLibCheck','--outDir',home,'packages/provider-audio/src/packet-decoder.ts']);
const {PacketAudioDecoder}=await import(pathToFileURL(home+'/packet-decoder.js'));
const controls=assertDtsHdAdmission(PacketAudioDecoder);
const recordPath=process.env.DTSHD_NATIVE_RECORD||'build/codec-expansion/lossless-original-provenance/engine-build.json',raw=await readFile(recordPath),record=JSON.parse(raw),directory=path.resolve('web/providers/audio/dts-hd');
for(const name of ['module.mjs','module.wasm']){const b=await readFile(directory+'/'+name);assert.equal(sha(b),record.artifacts['web/providers/audio/dts-hd/'+name].sha256);}
const module=await(await import(pathToFileURL(directory+'/module.mjs'))).default({wasmBinary:await readFile(directory+'/module.wasm')});
const manifestPath=process.env.DTSHD_ADMISSION_FIXTURES||'build/codec-expansion/recovery-06/lossless-resolved-descriptors.json',manifestRaw=await readFile(manifestPath),fixtures=JSON.parse(manifestRaw).filter(f=>f.codec==='dts-hd'&&!f.id.includes('repeat60')),results=[];
assert.equal(fixtures.length,6);
const unhex=(text='')=>Uint8Array.from(Buffer.from(text.split('\n').filter(line=>line.includes(':')).map(line=>line.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex'));
for(const fixture of fixtures){
 const packetRaw=await readFile(fixture.packetFile),reference=await readFile(fixture.integerReference);assert.equal(sha(packetRaw),fixture.packetSHA256);assert.equal(sha(reference),fixture.referenceSHA256);assert.equal(sha(await readFile(fixture.input)),fixture.inputSHA256);
 const packets=JSON.parse(packetRaw),config={sampleRate:fixture.sampleRate,channels:fixture.channels,bitsPerSample:fixture.bitsPerSample,extradata:unhex(packets.streams[0].extradata)};
 for(const configured of fixture.sampleRate===48000?[true,false]:[true]){
  const decoder=new PacketAudioDecoder(module,'dts-hd',new AbortController().signal,configured?config:undefined),chunks=[];
  const collect=frames=>{for(const frame of frames){assert.equal(frame.channels,fixture.channels);assert.equal(frame.rate,fixture.sampleRate);assert.ok(frame.pcm);chunks.push(Buffer.from(frame.pcm.buffer,frame.pcm.byteOffset,frame.pcm.byteLength));}};
  try{for(const packet of packets.packets)collect(decoder.decode(unhex(packet.data),Math.round(Number(packet.pts_time)*fixture.sampleRate)));collect(decoder.flush());assert.deepEqual(Buffer.concat(chunks),reference,fixture.id+' exact original PCM');}finally{decoder.dispose();}
  results.push({id:fixture.id,sampleRate:fixture.sampleRate,channels:fixture.channels,bitsPerSample:fixture.bitsPerSample,configured,inputSHA256:fixture.inputSHA256,packetSHA256:fixture.packetSHA256,referenceSHA256:fixture.referenceSHA256,exactPCM:true});
 }
}
const report={passed:true,scope:'DTS-HD finite decoded tuples apply with and without configuration; exact original PCM preserved for all six maintained packet tuples. No native rebuild or composition broadening.',inputs:Object.fromEntries(await Promise.all(['packages/provider-audio/src/packet-decoder.ts','tests/dtshd-high-rate-admission.mjs','tests/dtshd-high-rate-admission-controls.mjs'].map(async p=>[p,sha(await readFile(p))]))),adapterSHA256:sha(await readFile(home+'/packet-decoder.js')),nativeRecordSHA256:sha(raw),fixtureManifestSHA256:sha(manifestRaw),controls,results};
await writeFile(process.env.DTSHD_ADMISSION_REPORT||'build/mpv-merge-recovery-01/runtime-review/dtshd-admission.json',JSON.stringify(report,null,2)+'\n');console.log('DTS-HD admission PASS',controls.length,'negative controls',results.length,'exact native decodes');
