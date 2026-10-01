// SPDX-License-Identifier: Apache-2.0
// Native files here test comparator failure modes, not packaged-runtime parity.
import {before, after, test} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compareParity, baselineTimelineBias} from './ffmpeg-parity.mjs';
import {prepareContainerFixture} from './container.mjs';

const exec = promisify(execFile);
let directory, input, baseline, shifted, biased, nonzeroOrigin, packetFragments, roundedAAC, corruptedAAC, audio, pcm, timing, packetEvidence;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'demuxe-parity-contracts-'));
  input = await prepareContainerFixture(directory);
  baseline = join(directory, 'baseline.mp4'); shifted = join(directory, 'shifted.mp4');
  biased = join(directory, 'abi-biased.mp4'); nonzeroOrigin = join(directory, 'nonzero-origin.mkv');
  for (const [file, offset] of [[baseline, '0'], [shifted, '0.04'], [biased, '1']]) await exec('ffmpeg', ['-v', 'error', '-y', '-i', input, '-map', '0:v:0', '-map', '0:a:0', '-c', 'copy', '-movflags', 'frag_keyframe+delay_moov+default_base_moof', '-output_ts_offset', offset, file]);
  await exec('ffmpeg', ['-v', 'error', '-y', '-i', input, '-map', '0', '-c', 'copy', '-output_ts_offset', '0.2', nonzeroOrigin]);
  packetFragments = join(directory, 'packet-fragments.mp4');
  await exec('ffmpeg', ['-v', 'error', '-y', '-i', input, '-map', '0', '-c', 'copy', '-movflags', 'frag_keyframe+delay_moov+default_base_moof', '-frag_duration', '1', packetFragments]);
  roundedAAC = join(directory, 'rounded-aac.mp4'); corruptedAAC = join(directory, 'corrupt-aac-duration.mp4');
  const fragments = await readFile(packetFragments);
  await writeFile(roundedAAC, finalAudioDuration(Buffer.from(fragments), 1008));
  await writeFile(corruptedAAC, finalAudioDuration(Buffer.from(fragments), 2944));
  const {stdout} = await exec('ffprobe', ['-v', 'error', '-show_streams', '-show_packets', '-show_data_hash', 'sha256', '-of', 'json', baseline]);
  const reference = JSON.parse(stdout);
  packetEvidence = {
    tracks: reference.streams.map(s => ({number: s.index + 7, kind: s.codec_type, codec: s.codec_type === 'video' ? 'V_MPEG4/ISO/AVC' : 'A_AAC', configSHA256: s.extradata_hash.slice(7).toLowerCase(), width: s.width, height: s.height, channels: s.channels, sampleRate: Number(s.sample_rate), timeBaseSeconds: 0.001})),
    packetDescriptions: reference.packets.map(p => ({track: p.stream_index + 7, sha256: p.data_hash.slice(7).toLowerCase(), ptsSeconds: Number(p.pts_time), key: p.flags.includes('K')})),
  };
  audio = join(directory, 'audio.flac');
  await exec('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'aevalsrc=0.2*sin(2*PI*997*t)|0.1*sin(2*PI*1511*t):s=48000:d=0.12', '-c:a', 'flac', '-sample_fmt', 's32', '-bits_per_raw_sample', '24', audio]);
  pcm = (await exec('ffmpeg', ['-v', 'error', '-i', audio, '-f', 'f32le', '-'], {encoding: 'buffer'})).stdout;
  const frames = JSON.parse((await exec('ffprobe', ['-v', 'error', '-show_frames', '-select_streams', 'a:0', '-of', 'json', audio])).stdout).frames;
  timing = {segments: frames.map(f => ({pts: Number(f.pts), samples: Number(f.nb_samples)})), toleranceSamples: 0};
});
after(async () => { if (directory) await rm(directory, {recursive: true, force: true}); });
function finalAudioDuration(data, duration) {
  const boxes = (start, end) => {
    const result = [];
    for (let offset = start; offset < end;) {
      const size = data.readUInt32BE(offset); assert.ok(size >= 8 && offset + size <= end);
      result.push({type: data.toString('ascii', offset + 4, offset + 8), start: offset + 8, end: offset + size}); offset += size;
    }
    return result;
  };
  let position;
  for (const moof of boxes(0, data.length).filter(b => b.type === 'moof')) {
    for (const traf of boxes(moof.start, moof.end).filter(b => b.type === 'traf')) {
      const children = boxes(traf.start, traf.end), tfhd = children.find(b => b.type === 'tfhd');
      if (data.readUInt32BE(tfhd.start + 4) !== 2) continue;
      const trun = children.find(b => b.type === 'trun'), flags = data.readUInt32BE(trun.start) & 0xffffff;
      const count = data.readUInt32BE(trun.start + 4);
      assert.equal(count, 1, 'Regression fixture must have single-packet fragments');
      if (flags & 0x100) position = trun.start + 8 + (flags & 1 ? 4 : 0) + (flags & 4 ? 4 : 0);
      else {
        const headerFlags = data.readUInt32BE(tfhd.start) & 0xffffff;
        assert.ok(headerFlags & 8, 'Regression audio fragment lacks sample duration');
        position = tfhd.start + 8 + (headerFlags & 1 ? 8 : 0) + (headerFlags & 2 ? 4 : 0);
      }
    }
  }
  assert.ok(position, 'Regression fixture has no audio fragments');
  data.writeUInt32BE(duration, position); return data;
}
const prepared = candidate => ({kind: 'prepared-file', input, candidate, profile: 'packet-copy', target: 'mp4', baselineTimelineBiasSeconds: 0});
async function readerJob(name, mutate = () => {}) {
  const evidence = structuredClone(packetEvidence); mutate(evidence);
  const candidatePackets = join(directory, name + '.json');
  await writeFile(candidatePackets, JSON.stringify(evidence));
  return {kind: 'container-reader', input, candidatePackets, profile: 'packet-copy', target: 'mp4', baselineTimelineBiasSeconds: 0};
}
async function audioJob(name, mutate = () => {}, actualTiming = timing) {
  const candidatePCM = join(directory, name + '.f32le'), data = Buffer.from(pcm); mutate(data);
  await writeFile(candidatePCM, data);
  return {kind: 'audio-decoder', input: audio, candidatePCM, sampleRate: 48000, channels: 2, timing: actualTiming, profile: 'flac24', baselineTimelineBiasSeconds: 0};
}

test('prepared outputs compare copied packets, absolute timing and decoded content', async () => {
  assert.equal((await compareParity(prepared(baseline), baseline)).passed, true);
});
test('prepared output timestamp shift fails even with identical decoded content', async () => {
  await assert.rejects(() => compareParity(prepared(shifted), baseline), /Parity pts/);
});
test('packaged ABI bias comes from immutable source origin, with zero fallback', async () => {
  assert.equal((await baselineTimelineBias(input)).baselineTimelineBiasSeconds, 1);
  const offset = await baselineTimelineBias(nonzeroOrigin);
  assert.ok(Math.abs(offset.sourceOriginSeconds - 0.2) < 1e-9);
  assert.ok(Math.abs(offset.baselineTimelineBiasSeconds - 0.8) < 1e-9);
});
test('fixed documented ABI bias preserves parity and still rejects candidate drift', async () => {
  const origin = await baselineTimelineBias(input);
  assert.equal((await compareParity({...prepared(baseline), ...origin}, biased)).passed, true);
  await assert.rejects(() => compareParity({...prepared(shifted), ...origin}, biased), /Parity pts/);
});
test('immutable source millisecond quantum permits AAC duration representation rounding', async () => {
  const packets = JSON.parse((await exec('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_packets', '-of', 'json', roundedAAC])).stdout).packets;
  assert.equal(Number(packets.at(-1).duration), 1008, 'Regression must exercise the rounded duration');
  assert.equal((await compareParity(prepared(roundedAAC), packetFragments)).passed, true);
});
test('source quantum does not permit a 40 ms final AAC duration corruption', async () => {
  await assert.rejects(() => compareParity(prepared(corruptedAAC), packetFragments), /Parity duration/);
});
test('reader evidence with arbitrary track identities compares against measured baseline', async () => {
  assert.equal((await compareParity(await readerJob('reader'), baseline)).passed, true);
});
test('reader omitted packet fails', async () => {
  const job = await readerJob('omitted', evidence => evidence.packetDescriptions.splice(0, 1));
  await assert.rejects(() => compareParity(job, baseline), /packet count/);
});
test('reader timestamp shift fails without fitting an offset', async () => {
  const job = await readerJob('reader-shift', evidence => evidence.packetDescriptions.forEach(p => { p.ptsSeconds += 0.04; }));
  await assert.rejects(() => compareParity(job, baseline), /reader PTS/);
});
test('audio PCM and independently partitioned absolute timing match', async () => {
  assert.equal((await compareParity(await audioJob('audio'), audio)).passed, true);
  assert.equal((await compareParity({kind: 'prepared-audio', input: audio, candidate: audio, profile: 'flac24'}, audio)).passed, true);
});
test('audio sample corruption fails', async () => {
  const job = await audioJob('corrupt', data => data.writeFloatLE(0.5, 40));
  await assert.rejects(() => compareParity(job, audio), /PCM differs/);
});
test('audio swapped channels fails', async () => {
  const job = await audioJob('swapped', data => { for (let offset = 0; offset < data.length; offset += 8) { const a = data.readFloatLE(offset); data.writeFloatLE(data.readFloatLE(offset + 4), offset); data.writeFloatLE(a, offset + 4); } });
  await assert.rejects(() => compareParity(job, audio), /PCM differs/);
});
test('audio absolute timestamp shift fails', async () => {
  const shiftedTiming = {segments: timing.segments.map(s => ({...s, pts: s.pts + 480})), toleranceSamples: 0};
  await assert.rejects(() => audioJob('audio-shift', () => {}, shiftedTiming).then(job => compareParity(job, audio)), /absolute audio PTS/);
});
test('audio omitted presented sample fails', async () => {
  const job = await audioJob('missing-sample');
  await writeFile(job.candidatePCM, pcm.subarray(0, pcm.length - 8));
  await assert.rejects(() => compareParity(job, audio), /timing does not describe/);
});
