// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as runtime from 'mediabunny';
import {copySelectedPackets} from '../packet-copy.js';

function wave() {
  const data = Buffer.alloc(2044);
  data.write('RIFF'); data.writeUInt32LE(2036, 4); data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(8000, 24); data.writeUInt32LE(16000, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write('data', 36); data.writeUInt32LE(2000, 40);
  for (let i = 44; i < data.length; i++) data[i] = i % 251;
  return data;
}
async function input() {
  const value = new runtime.Input({formats: [runtime.WAVE], source: new runtime.BufferSource(wave())});
  const track = (await value.getTracks())[0];
  return {value, track};
}

test('PCM packet copy preserves selected audio payload and timeline', async () => {
  const {value, track} = await input();
  let output;
  try {
    const result = await copySelectedPackets(runtime, value, {trackIds: [track.id], format: new runtime.WavOutputFormat()});
    assert.deepEqual(result.trackIds, [track.id]);
    assert.ok(result.file.size > 2000);
    output = new runtime.Input({formats: [runtime.WAVE], source: new runtime.BufferSource(await result.file.arrayBuffer())});
    const after = (await output.getTracks())[0];
    const packets = async candidate => {
      const list = [];
      for await (const packet of new runtime.EncodedPacketSink(candidate).packets()) list.push({time: packet.timestamp, duration: packet.duration, data: [...packet.data]});
      return list;
    };
    assert.deepEqual(await packets(after), await packets(track));
  } finally { value.dispose(); output?.dispose(); }
});

test('unknown or duplicate selected tracks reject without partial success', async () => {
  const {value, track} = await input();
  try {
    await assert.rejects(copySelectedPackets(runtime, value, {trackIds: [track.id, track.id], format: new runtime.WavOutputFormat()}), /unique/);
    await assert.rejects(copySelectedPackets(runtime, value, {trackIds: ['missing'], format: new runtime.WavOutputFormat()}), /unavailable/);
  } finally { value.dispose(); }
});

test('bounded output failure publishes no file', async () => {
  const {value, track} = await input();
  try { await assert.rejects(copySelectedPackets(runtime, value, {trackIds: [track.id], format: new runtime.WavOutputFormat(), maxOutputBytes: 64}), /budget/); }
  finally { value.dispose(); }
});

test('pre-aborted copy acquires no track metadata', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(copySelectedPackets(runtime, {getTracks() { throw new Error('Unexpected acquisition'); }}, {trackIds: [1], format: new runtime.WavOutputFormat(), signal: controller.signal}), {name: 'AbortError'});
});
