// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {writeFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {sha} from './package.mjs';
import {writeSigned24Fixture} from './audio-fixtures.mjs';

/** Shared independent FLAC round-trip gate, including final partial blocks. */
export async function runFlacEncoderChecks({createEncoder, outputDirectory, sampleRate = 48000, channels = 2}) {
  const controller = new AbortController();
  const encoder = await createEncoder({channels, sampleRate}, controller.signal);
  try {
    assert.ok(Number.isSafeInteger(encoder.blockSize) && encoder.blockSize > 0 && encoder.blockSize <= 65535);
    assert.equal(encoder.header.byteLength, 34, 'FLAC STREAMINFO size');
    const header = Uint8Array.from(encoder.header), packets = [], snapshots = [];
    const count = encoder.blockSize * 3 + 13;
    const pcm = Int32Array.from({length: count * channels}, (_, i) => ((i * 100003 % 16777216) - 8388608) * 256);
    const reference = Buffer.from(new Uint8Array(pcm.buffer));
    for (let offset = 0; offset < pcm.length; offset += encoder.blockSize * channels) {
      const block = pcm.slice(offset, offset + encoder.blockSize * channels), input = block.slice();
      const next = await encoder.encode(block);
      assert.deepEqual(block, input, 'Encoder modified PCM input');
      packets.push(...next); snapshots.push(...next.map(packet => Uint8Array.from(packet.data)));
    }
    const drained = await encoder.flush(); packets.push(...drained); snapshots.push(...drained.map(packet => Uint8Array.from(packet.data)));
    assert.deepEqual(await encoder.flush(), [], 'Drain must be idempotent');
    assert.deepEqual(Buffer.from(encoder.header), Buffer.from(header), 'Encoder changed owned stream info');
    let pts = 0;
    for (const [i, packet] of packets.entries()) {
      assert.equal(packet.pts, pts, 'Encoder packet timeline');
      assert.ok(Number.isSafeInteger(packet.duration) && packet.duration > 0);
      pts += packet.duration; assert.deepEqual(Buffer.from(packet.data), Buffer.from(snapshots[i]), 'Encoder reused output storage');
    }
    assert.equal(pts, count, 'Final partial block lost or padded');
    const stream = Buffer.concat([Buffer.from([102, 76, 97, 67, 128, 0, 0, 34]), header, ...packets.map(packet => packet.data)]);
    await mkdir(outputDirectory, {recursive: true}); const file = path.resolve(outputDirectory, 'roundtrip.flac'); await writeFile(file, stream);
    const decoded = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 's32le', '-'], {maxBuffer: 32 * 1024 * 1024});
    assert.deepEqual(decoded, reference, 'Independent FLAC decode differs from input');
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', file]));
    assert.equal(Number(probe.streams[0].sample_rate), sampleRate); assert.equal(probe.streams[0].channels, channels);
    const input = await writeSigned24Fixture({pcm: reference, sampleRate, channels}, outputDirectory);
    controller.abort(); await assert.rejects(async () => encoder.encode(pcm.subarray(0, channels)), 'Encoder ignored cancellation');
    return {scope: 'Generated signed 24-bit PCM; independent FFmpeg exact round trip, packet timeline, ownership, partial drain and cancellation',
      sampleRate, channels, samples: count, partialFinalBlock: true, integerExact: true, ownedCopies: true, cancelled: true, outputSHA256: sha(stream),
      parityJobs: [{kind: 'prepared-audio', input, candidate: file, sampleRate, channels, bitsPerSample: 24, codec: 'flac', profile: 'flac24',
        timing: {segments: [{pts: 0, samples: count}], toleranceSamples: 0},
        scope: 'Packaged FFmpeg preparation of immutable signed24 WAV source compared with candidate FLAC output'}]};
  } finally {controller.abort(); await encoder.dispose();}
}
