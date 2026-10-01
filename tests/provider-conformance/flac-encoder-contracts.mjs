// SPDX-License-Identifier: Apache-2.0
import {before, after, test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runFlacEncoderChecks} from './flac-encoder.mjs';

const blockSize = 512, count = blockSize * 3 + 13, channels = 2, sampleRate = 48000;
let directory, good, wrong;
async function reference(changed = false) {
  const pcm = Int32Array.from({length: count * channels}, (_, index) => ((index * 100003 % 16777216) - 8388608) * 256);
  if (changed) pcm[0] += 256;
  const source = join(directory, changed ? 'wrong.s32le' : 'reference.s32le');
  const output = source + '.flac';
  await writeFile(source, Buffer.from(pcm.buffer));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 's32le', '-ar', String(sampleRate), '-ac', String(channels), '-i', source, '-c:a', 'flac', '-sample_fmt', 's32', '-bits_per_raw_sample', '24', '-frame_size', String(blockSize), output]);
  const data = await readFile(output);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_packets', '-of', 'json', output]));
  const packets = probe.packets.map(packet => ({pts: Number(packet.pts), duration: Number(packet.duration), data: Uint8Array.from(data.subarray(Number(packet.pos), Number(packet.pos) + Number(packet.size)))}));
  assert.equal(packets.length, 4, 'Native oracle must have three blocks and one partial block');
  assert.equal(packets.at(-1).duration, 13);
  return {header: Uint8Array.from(data.subarray(8, 42)), packets};
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'demuxe-flac-contracts-'));
  good = await reference();
  wrong = await reference(true);
});
after(async () => { if (directory) await rm(directory, {recursive: true, force: true}); });

function oracle(defect, disposed = () => {}) {
  return async (_config, signal) => {
    const source = defect === 'different-pcm' ? wrong : good;
    const header = defect === 'mutate-buffer-header' ? Buffer.from(source.header) : source.header.slice();
    const capacity = Math.max(...source.packets.map(packet => packet.data.length));
    const pool = defect === 'reuse-buffer-storage' ? Buffer.alloc(capacity) : new Uint8Array(capacity);
    let position = 0, pending = false, flushed = false;
    const next = () => {
      const packet = {...source.packets[position++], data: source.packets[position - 1].data.slice()};
      if (defect === 'wrong-timeline' && position === 1) packet.pts++;
      if (defect === 'padded-partial' && position === 4) packet.duration++;
      if (defect === 'reuse-storage' || defect === 'reuse-buffer-storage') { pool.set(packet.data); packet.data = pool.subarray(0, packet.data.length); }
      return packet;
    };
    return {
      blockSize, header,
      encode(pcm) {
        if (defect !== 'ignore-cancellation') signal.throwIfAborted();
        if (signal.aborted) return [];
        if (defect === 'mutate-input') pcm.fill(0);
        if (defect === 'mutate-header' || defect === 'mutate-buffer-header') header[0] = 255;
        if (defect === 'empty-output') return [];
        if (pcm.length < blockSize * channels) { pending = true; return []; }
        return [next()];
      },
      flush() {
        if (flushed) return defect === 'repeat-flush' ? [source.packets.at(-1)] : [];
        flushed = true;
        if (!pending) return [];
        return [next()];
      },
      dispose: disposed,
    };
  };
}

test('native-backed oracle passes shared FLAC encoder exact round trip', async () => {
  let disposed = false;
  const result = await runFlacEncoderChecks({createEncoder: oracle(undefined, () => { disposed = true; }), outputDirectory: join(directory, 'valid')});
  assert.equal(result.integerExact, true);
  assert.equal(result.samples, count);
  assert.equal(disposed, true);
});

for (const [defect, assertion] of [
  ['empty-output', /Final partial block lost or padded/],
  ['wrong-timeline', /Encoder packet timeline/],
  ['padded-partial', /Final partial block lost or padded/],
  ['repeat-flush', /Drain must be idempotent/],
  ['mutate-header', /Encoder changed owned stream info/],
  ['mutate-buffer-header', /Encoder changed owned stream info/],
  ['reuse-storage', /Encoder reused output storage/],
  ['reuse-buffer-storage', /Encoder reused output storage/],
  ['different-pcm', /Independent FLAC decode differs from input/],
  ['ignore-cancellation', /Encoder ignored cancellation/],
  ['mutate-input', /Encoder modified PCM input/],
]) test(`FLAC encoder harness cannot pass ${defect} and disposes on failure`, async () => {
  let disposed = false;
  await assert.rejects(() => runFlacEncoderChecks({createEncoder: oracle(defect, () => { disposed = true; }), outputDirectory: join(directory, defect)}), assertion);
  assert.equal(disposed, true);
});
