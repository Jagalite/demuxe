// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {runAudioDecoderChecks, packetTrimMetadata} from './audio-decoder.mjs';
const fixture = {id: 'contract', codec: 'aac', sampleRate: 48000, channels: 1};
const packets = [{data: Uint8Array.of(1), pts: 0}, {data: Uint8Array.of(2), pts: 2}];
const reference = Float32Array.of(.1, .2, .3, .4);
const timingReference = {segments: [{pts: 0, samples: 2}, {pts: 2, samples: 2}], toleranceSamples: 0};
function factory(fault) {
  return async (_fixture, signal) => {
    if (fault !== 'cancel') signal.throwIfAborted();
    let disposed = false, drained = false, generation = 0;
    const reused = new Float32Array(2);
    const enter = () => { if (fault !== 'cancel') signal.throwIfAborted(); if (disposed) throw Error('disposed'); };
    return {
      decode(packet, pts) {
        enter(); if (drained) throw Error('drained');
        let plane = reference.slice((packet[0] - 1) * 2, packet[0] * 2);
        if (fault === 'corrupt' || fault === 'reset' && generation > 0) plane[0] += .01;
        if (fault === 'silent') plane.fill(0);
        if (fault === 'nonfinite') plane[0] = NaN;
        if (fault === 'reuse') { reused.set(plane); plane = reused; }
        return [{samples: 2, channels: 1, layout: 4, rate: 48000, generation, duration: 2, pts: fault === 'timing' ? -pts : fault === 'fixed-timing' ? 0 : pts, planes: [plane]}];
      },
      flush() { enter(); drained = true; return []; },
      reset() { enter(); generation++; drained = false; },
      dispose() { disposed = true; }
    };
  };
}
const run = fault => runAudioDecoderChecks({timingReference, createDecoder: factory(fault), fixture, packets, reference});
test('valid decoder passes output, reset, ownership, lifecycle and cancellation checks', async () => {
  assert.deepEqual(await run(), {samples: 4, maxError: 0, integerExact: false, doubleExact: false, reset: true, ownership: true, cancellation: true, lifecycle: true, timing: true, timingToleranceSamples: 0});
});
for (const [fault, message] of [['corrupt', /PCM error/], ['silent', /PCM error/], ['reset', /Reset PCM mismatch/], ['reuse', /Retained PCM buffer changed/], ['nonfinite', /Nonfinite decoded PCM/], ['cancel', /Pre-aborted decoder was accepted/], ['timing', /timing moved backwards/], ['fixed-timing', /Absolute decoded PTS differs/]]) {
  test('rejects ' + fault + ' decoder false positives', async () => assert.rejects(run(fault), message));
}
test('rejects active abort ignored even when constructor checks pre-aborted signals', async () => {
  const createDecoder = async (f, signal) => { signal.throwIfAborted(); return factory('cancel')(f, signal); };
  await assert.rejects(runAudioDecoderChecks({timingReference, createDecoder, fixture, packets, reference}), /Aborted decoder accepted decode/);
});
const biasedFactory = bias => async (f, signal) => {
  const decoder = await factory()(f, signal), decode = decoder.decode;
  decoder.decode = (packet, pts) => decode(packet, pts).map(frame => ({...frame, pts: frame.pts + bias}));
  return decoder;
};
test('rejects a constant PTS bias that preserves relative replay timing and PCM', async () => {
  await assert.rejects(runAudioDecoderChecks({timingReference, createDecoder: biasedFactory(10000), fixture, packets, reference}), /Absolute decoded PTS differs/);
});
test('native timing tolerance accepts container quantization but rejects larger biases', async () => {
  const coarse = {...timingReference, toleranceSamples: 48};
  assert.equal((await runAudioDecoderChecks({timingReference: coarse, createDecoder: biasedFactory(-24), fixture, packets, reference})).timingToleranceSamples, 48);
  await assert.rejects(runAudioDecoderChecks({timingReference: coarse, createDecoder: biasedFactory(49), fixture, packets, reference}), /Absolute decoded PTS differs/);
});
test('compares native sample timelines after decoder priming trim across frame boundaries', async () => {
  const trimmed = {segments: [{pts: 1, samples: 1}, {pts: 2, samples: 2}], toleranceSamples: 0};
  assert.equal((await runAudioDecoderChecks({timingReference: trimmed, createDecoder: factory(), fixture, packets, reference: reference.slice(1), skipSamples: 1})).samples, 3);
});
test('requires independent decoded timing evidence before claiming timing conformance', async () => {
  await assert.rejects(runAudioDecoderChecks({createDecoder: factory(), fixture, packets, reference}), /native timing reference/);
});
test('rejects incorrect channel layout even when decoded PCM matches', async () => {
  const createDecoder = async (f, signal) => {
    const decoder = await factory()(f, signal), decode = decoder.decode;
    decoder.decode = (packet, pts) => decode(packet, pts).map(frame => ({...frame, layout: 1}));
    return decoder;
  };
  await assert.rejects(runAudioDecoderChecks({timingReference, createDecoder, fixture, packets, reference}), /channel layout differs/);
});
test('rejects missing exact integer references', async () => {
  await assert.rejects(runAudioDecoderChecks({timingReference, createDecoder: factory(), fixture: {...fixture, codec: 'flac'}, packets, reference}), /Missing integer PCM reference/);
});
test('rejects disposal that leaves the decoder usable', async () => {
  const createDecoder = async (f, signal) => ({...await factory()(f, signal), dispose() {}});
  await assert.rejects(runAudioDecoderChecks({timingReference, createDecoder, fixture, packets, reference}), /Disposed decoder accepted flush/);
});
test('checks original integer bits even when float PCM matches', async () => {
  const integerReference = Int32Array.of(536870912, 1073741824, 1610612736, -1073741824);
  const floats = Float32Array.from(integerReference, value => value / 2147483648);
  const createDecoder = async (f, signal) => {
    const decoder = await factory()(f, signal), decode = decoder.decode;
    decoder.decode = (packet, pts) => decode(packet, pts).map(frame => {
      const pcm = integerReference.slice((packet[0] - 1) * 2, packet[0] * 2); pcm[0]++;
      return {...frame, planes: [], pcm};
    });
    return decoder;
  };
  await assert.rejects(runAudioDecoderChecks({timingReference, createDecoder, fixture: {...fixture, codec: 'flac'}, packets, reference: floats, integerReference}), /Exact integer PCM mismatch/);
});
test('checks original double bits even when float PCM matches', async () => {
  const doubleReference = Float64Array.from(reference);
  const createDecoder = async (f, signal) => {
    const decoder = await factory()(f, signal), decode = decoder.decode;
    decoder.decode = (packet, pts) => decode(packet, pts).map(frame => ({...frame, planes64: [Float64Array.from(frame.planes[0], value => value + 1e-12)]}));
    return decoder;
  };
  await assert.rejects(runAudioDecoderChecks({timingReference, createDecoder, fixture: {...fixture, codec: 'pcm-f64le'}, packets, reference, doubleReference}), /Exact double PCM mismatch/);
});
test('rejects invalid fixture reference before invoking decoder', async () => {
  await assert.rejects(runAudioDecoderChecks({timingReference, createDecoder() { throw Error('must not run'); }, fixture, packets, reference: Float32Array.of(NaN)}), /Invalid PCM reference/);
});
test('accounts for decoder-owned Opus and Vorbis priming', () => {
  const extra = new Uint8Array(19); new DataView(extra.buffer).setUint16(10, 312, true);
  const probe = [{side_data_list: [{side_data_type: 'Skip Samples', skip_samples: 312, discard_padding: 27}]}];
  assert.deepEqual(packetTrimMetadata('opus', extra, probe), {skipSamples: 0, discardSamples: 27});
  assert.deepEqual(packetTrimMetadata('vorbis', extra, probe), {skipSamples: 0, discardSamples: 27});
  assert.deepEqual(packetTrimMetadata('mp3', extra, probe), {skipSamples: 312, discardSamples: 27});
});
