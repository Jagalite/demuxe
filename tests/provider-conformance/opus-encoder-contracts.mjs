// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {runOpusEncoderChecks, assertOpusPCMQuality} from './opus-encoder.mjs';

const factory = fault => async ({channels}) => {
  const header = new Uint8Array(19), view = new DataView(header.buffer);
  header.set(new TextEncoder().encode('OpusHead')); header[8] = 1; header[9] = fault === 'header' ? channels + 1 : channels;
  view.setUint32(12, 48000, true);
  let pts = 0;
  const reused = Uint8Array.of(0);
  return {header, preSkip: 0, blockSize: 4,
    encode(pcm) {
      const start = pts; pts += pcm.length / channels;
      if (fault === 'empty') return [];
      reused[0]++;
      return [{data: fault === 'reuse' ? reused : Uint8Array.of(1), pts: fault === 'timing' ? start + 1 : start, duration: fault === 'trim' ? pcm.length / channels + 1 : pcm.length / channels}];
    },
    flush() { return []; }, dispose() {}
  };
};
for (const [fault, message] of [['header', /strictly equal/], ['timing', /timeline mismatch/], ['trim', /timeline mismatch|final packet trim/], ['reuse', /Owned Opus packet changed/], ['empty', /emitted no packets/]]) {
  test('rejects Opus ' + fault + ' false pass before independent decode', async () => {
    const outputDirectory = await mkdtemp(path.join(os.tmpdir(), 'demuxe-opus-contract-'));
    try {
      await assert.rejects(runOpusEncoderChecks({createEncoder: factory(fault), createWriter() { throw Error('must not reach mux'); }, outputDirectory}), message);
    } finally { await rm(outputDirectory, {recursive: true, force: true}); }
  });
}
test('seek quality validator rejects silence and missing 80ms preroll alignment', () => {
  const pcm = Int32Array.from({length: 60000}, (_, i) => Math.round(Math.sin(2 * Math.PI * 440 * i / 48000) * 0x300000) * 256);
  const at = sample => Float32Array.from(pcm.subarray(sample, sample + 4800), value => value / 2147483648);
  assert.ok(assertOpusPCMQuality(pcm, at(48000), 0, 48000) > 15);
  assert.throws(() => assertOpusPCMQuality(pcm, new Float32Array(4800), 0, 48000), /PCM SNR/);
  assert.throws(() => assertOpusPCMQuality(pcm, at(48000 - 3840), 0, 48000), /PCM SNR/);
});
test('independent quality validator rejects nonfinite decoder output', () => {
  assert.throws(() => assertOpusPCMQuality(Int32Array.of(256), Float32Array.of(NaN)), /quality evidence/);
});
