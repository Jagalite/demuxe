// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {MatroskaReader} from '../build/component-candidates/provider-container/src/matroska.js';
import {parseWmaFormat} from '../build/component-candidates/provider-container/src/wma-format.js';
import {repairMatroskaAudio} from '../build/component-candidates/provider-container/src/audio-repair.js';
const fixtures=JSON.parse(await readFile((process.env.LEGACY_AUDIO_FIXTURE_ROOT??'/tmp/demuxe-legacy-audio-fixtures')+'/compositions.json'));
test('actual WMA Matroska framing agrees with independent ASF WAVEFORMATEX',async()=>{
 for(const f of fixtures.filter(f=>f.codec.startsWith('wma'))){
  const reader=await MatroskaReader.open(new Blob([await readFile(f.input)]),new AbortController().signal),a=reader.tracks.find(t=>t.kind==='audio');
  assert.equal(Buffer.from(a.privateData).toString('hex'),f.framing.waveFormatHex);
  const {codec,configuration}=parseWmaFormat(a.privateData,a.rate,a.channels,a.bitDepth);
  assert.equal(codec,f.codec);assert.equal(configuration.sampleRate,f.sampleRate);assert.equal(configuration.channels,f.channels);
  assert.equal(configuration.blockAlign,f.framing.blockAlign);assert.equal(configuration.bitRate,f.framing.bitRate);
  assert.equal(Buffer.from(configuration.extradata).toString('hex'),f.framing.extradataHex);
 }
});
test('bad WMA headers and selected codec mismatch reject before decoder creation',async()=>{
 const f=fixtures.find(f=>f.codec==='wmav1'),source=await readFile(f.input),header=Buffer.from(f.framing.waveFormatHex,'hex'),offset=source.indexOf(header);assert.ok(offset>=0);
 const edits=[b=>b.writeUInt16LE(0x162,0),b=>b.writeUInt16LE(6,2),b=>b.writeUInt32LE(32000,4),b=>b.writeUInt32LE(0,8),b=>b.writeUInt16LE(0,12),b=>b.writeUInt16LE(64,14),b=>b.writeUInt16LE(3,16)];
 for(const edit of edits){const data=Buffer.from(source),h=data.subarray(offset,offset+header.length);edit(h);let calls=0;
  await assert.rejects(()=>repairMatroskaAudio(new Blob([data]),{codec:f.codec,channels:f.channels,sampleRate:f.sampleRate,decoder(){calls++;throw Error('Decoder should not be created');},encoder(){throw Error('Encoder should not be created');}},new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');assert.equal(calls,0);
 }
 let calls=0;await assert.rejects(()=>repairMatroskaAudio(new Blob([source]),{codec:'wmav2',channels:f.channels,sampleRate:f.sampleRate,decoder(){calls++;throw Error('Decoder should not be created');},encoder(){throw Error('Encoder should not be created');}},new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');assert.equal(calls,0);
});
