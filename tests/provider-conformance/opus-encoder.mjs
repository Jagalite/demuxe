// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

const throws = async (operation, message) => {
  let rejected = false;
  try { await operation(); } catch { rejected = true; }
  assert.ok(rejected, message);
};
const decode = (file, args = []) => {
  const bytes = execFileSync('ffmpeg', ['-v', 'error', ...args, '-f', 'f32le', '-'], {maxBuffer: 16 * 1024 * 1024});
  assert.equal(bytes.length % 4, 0, 'Misaligned decoded PCM');
  const pcm = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert.ok(pcm.every(Number.isFinite), 'Nonfinite independent decoded PCM');
  return pcm;
};
export function assertOpusPCMQuality(reference, decoded, start = 0, referenceStart = 0) {
  let signal = 0, error = 0;
  for (let i = start; i < decoded.length && referenceStart + i < reference.length; i++) {
    const value = reference[referenceStart + i] / 2147483648;
    signal += value * value; error += (value - decoded[i]) ** 2;
  }
  assert.ok(signal > 0 && Number.isFinite(error), 'Invalid independent audio quality evidence');
  const snr = 10 * Math.log10(signal / Math.max(error, Number.MIN_VALUE));
  assert.ok(snr > 15, 'Independent Opus PCM SNR ' + snr);
  return snr;
}

/** Generic Opus encoder contract, validated by an independent native decoder. */
export async function runOpusEncoderChecks({createEncoder, createWriter, outputDirectory}) {
  assert.equal(typeof createEncoder, 'function', 'Missing encoder factory');
  assert.equal(typeof createWriter, 'function', 'Missing MP4 writer factory');
  await mkdir(outputDirectory, {recursive: true});
  const results = [];
  for (const channels of [1, 2]) for (const count of [13, 960, 48000 * 2 + 137, 48000 * 2 + 959]) {
    const controller = new AbortController(), encoder = await createEncoder({channels, sampleRate: 48000}, controller.signal);
    const pcm = Int32Array.from({length: count * channels}, (_, i) => Math.round(Math.sin(2 * Math.PI * (channels === 2 && i % 2 ? 660 : 440) * Math.floor(i / channels) / 48000) * 0x300000) * 256);
    const packets = [], owned = [];
    const header = encoder.header;
    const blockSize = encoder.blockSize, preSkip = encoder.preSkip;
    const checkOwned = () => {
      assert.equal(encoder.blockSize, blockSize, 'Opus block size changed');
      assert.equal(encoder.preSkip, preSkip, 'Opus delay changed');
      assert.deepEqual(encoder.header, headerCopy, 'Owned Opus header changed');
      for (const {packet, data, pts, duration} of owned) {
        assert.deepEqual(packet.data, data, 'Owned Opus packet changed');
        assert.equal(packet.pts, pts, 'Owned Opus packet PTS changed');
        assert.equal(packet.duration, duration, 'Owned Opus packet duration changed');
      }
    };
    let headerCopy;
    try {
      assert.ok(Number.isSafeInteger(encoder.blockSize) && encoder.blockSize > 0 && encoder.blockSize <= 65535, 'Invalid Opus block size');
      assert.ok(header instanceof Uint8Array && header.length === 19 && new TextDecoder().decode(header.subarray(0, 8)) === 'OpusHead', 'Invalid Opus header');
      const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
      assert.ok(Number.isSafeInteger(encoder.preSkip) && encoder.preSkip >= 0 && encoder.preSkip <= 65535, 'Invalid Opus delay');
      assert.equal(header[8], 1); assert.equal(header[9], channels); assert.equal(header[18], 0);
      assert.equal(view.getUint16(10, true), encoder.preSkip); assert.equal(view.getUint32(12, true), 48000); assert.equal(view.getInt16(16, true), 0);
      headerCopy = header.slice();
      const collect = batch => {
        checkOwned(); assert.ok(Array.isArray(batch), 'Encoder must return packet arrays');
        for (const packet of batch) {
          assert.ok(packet.data instanceof Uint8Array && packet.data.length > 0 && Number.isSafeInteger(packet.pts) && Number.isSafeInteger(packet.duration) && packet.duration > 0, 'Invalid Opus packet');
          owned.push({packet, data: packet.data.slice(), pts: packet.pts, duration: packet.duration}); packets.push(packet);
        }
      };
      for (let offset = 0; offset < pcm.length; offset += encoder.blockSize * channels) {
        const block = pcm.slice(offset, offset + encoder.blockSize * channels), copy = block.slice();
        collect(await encoder.encode(block)); assert.deepEqual(block, copy, 'Encoder modified PCM input');
      }
      collect(await encoder.flush()); assert.deepEqual(await encoder.flush(), []); checkOwned();
      assert.ok(packets.length > 0, 'Encoder emitted no packets');
      let pts = -encoder.preSkip;
      for (const packet of packets) { assert.equal(packet.pts, pts, 'Opus packet timeline mismatch'); pts += packet.duration; }
      assert.equal(pts, count, 'Opus final packet trim mismatch');
      const writer = await createWriter([{id: 1, codec: 'Opus', timescale: 48000, channels, config: headerCopy}]);
      const file = path.join(outputDirectory, `opus-${channels}-${count}.mp4`);
      await writeFile(file, Buffer.concat([await writer.initialization(), await writer.fragment(1, packets.map(packet => ({data: packet.data, dts: packet.pts + encoder.preSkip, pts: packet.pts + encoder.preSkip, duration: packet.duration, key: true})))]));
      const float = decode(file, ['-i', file]);
      assert.ok(float.length >= pcm.length, 'Independent decoded Opus sample count');
      assert.ok(float.length / channels - count < 960, 'Excess Opus tail padding');
      if (count >= 960) assert.ok(float.some(value => Math.abs(value) > 1e-6), 'Silent independent Opus output');
      const snr = count > 4800 ? assertOpusPCMQuality(pcm, float.subarray(0, pcm.length), 4800 * channels) : null;
      let seekSnr = null;
      if (count > 48000) {
        const seekPCM = decode(file, ['-seek_timestamp', '1', '-ss', '0.92', '-i', file, '-ss', '0.08', '-t', '0.1']);
        assert.equal(seekPCM.length, 4800 * channels, 'Independent Opus seek sample count');
        seekSnr = assertOpusPCMQuality(pcm, seekPCM, 0, 48000 * channels);
      }
      await throws(() => encoder.encode(pcm.subarray(0, channels)), 'Drained Opus encoder accepted PCM');
      await encoder.dispose(); await encoder.dispose(); checkOwned();
      await throws(() => encoder.flush(), 'Disposed Opus encoder accepted flush');
      controller.abort();
      results.push({channels, inputSamples: count, decodedSamples: float.length / channels, preSkip: encoder.preSkip, packets: packets.length, snrDb: snr, seekSamples: count > 48000 ? 4800 : 0, seekSnrDb: seekSnr, seekPrerollSamples: count > 48000 ? 3840 : 0, partialFinalBlock: count % encoder.blockSize !== 0, aborted: true, ownership: true, lifecycle: true});
    } finally { controller.abort(); await encoder.dispose(); }
  }
  const withEncoder = async (channels, callback) => {
    const controller = new AbortController(), encoder = await createEncoder({channels, sampleRate: 48000}, controller.signal);
    try { await callback(encoder, controller); } finally { controller.abort(); await encoder.dispose(); }
  };
  await withEncoder(1, async encoder => { assert.deepEqual(await encoder.flush(), []); assert.deepEqual(await encoder.flush(), []); });
  await withEncoder(2, async (encoder, controller) => {
    await encoder.encode(new Int32Array(encoder.blockSize * 2)); controller.abort();
    await throws(() => encoder.flush(), 'Aborted Opus encoder accepted flush');
    await throws(() => encoder.encode(new Int32Array(2)), 'Aborted Opus encoder accepted PCM');
  });
  await withEncoder(1, async encoder => {
    await throws(() => encoder.encode(Int32Array.of(1)), 'Opus encoder accepted unsupported PCM precision');
    await throws(() => encoder.flush(), 'Opus encoder remained usable after invalid precision');
  });
  for (const channels of [0, 3, 6, 8]) {
    let unexpected;
    try { await throws(async () => { unexpected = await createEncoder({channels, sampleRate: 48000}, new AbortController().signal); }, 'Opus encoder accepted invalid channels ' + channels); }
    finally { await unexpected?.dispose(); }
  }
  const aborted = new AbortController(); aborted.abort(); let unexpected;
  try { await throws(async () => { unexpected = await createEncoder({channels: 1, sampleRate: 48000}, aborted.signal); }, 'Opus encoder accepted pre-aborted signal'); }
  finally { await unexpected?.dispose(); }
  return {passed: true, scope: 'Independent FFmpeg decode and MP4 seek with 80ms Opus preroll; browser qualification separate', results,
    parityJobs: [{kind: 'prepared-audio', profile: 'opus-permitted', status: 'blocked',
      reason: 'Packaged FFmpeg baseline manifest does not declare an opus-permitted preparation offer',
      scope: 'Opus encoder parity requires a declared Opus preparation profile; independent host decode and seek checks remain separate'}]};
}
