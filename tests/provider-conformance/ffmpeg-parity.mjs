// SPDX-License-Identifier: Apache-2.0
// The baseline file must be produced by the verified packaged FFmpeg runtime.
// Native tools measure both outputs; they do not create the baseline here.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';

const exec = promisify(execFile);
async function native(command, args, signal) {
  return (await exec(command, args, {signal, encoding: 'buffer', maxBuffer: 128 * 1024 * 1024})).stdout;
}
async function probe(file, signal, frames = false) {
  return JSON.parse(await native('ffprobe', ['-v', 'error', '-show_streams', frames ? '-show_frames' : '-show_packets', '-show_data_hash', 'sha256', '-of', 'json', file], signal));
}
// rm_open uses AVFormatContext.start_time (or zero when absent). rm_step
// subtracts origin - 1 second to retain decoder preroll in unsigned MP4 tfdt.
// Read the immutable source origin; never infer this bias from output alignment.
export async function baselineTimelineBias(input, {signal} = {}) {
  assert.ok(isAbsolute(input), 'Baseline source must be absolute');
  const source = JSON.parse(await native('ffprobe', ['-v', 'error', '-show_format', '-of', 'json', input], signal));
  const value = source.format?.start_time;
  const sourceOriginSeconds = value === undefined || value === 'N/A' ? 0 : Number(value);
  assert.ok(Number.isFinite(sourceOriginSeconds), 'Invalid baseline source origin');
  return {sourceOriginSeconds, baselineTimelineBiasSeconds: 1 - sourceOriginSeconds,
    provenance: 'rm_open: origin = format.start_time or 0; rm_step: packet PTS/DTS subtract origin - 1 second'};
}
const quantum = stream => {
  const [n, d] = String(stream.time_base).split('/').map(Number);
  assert.ok(n > 0 && d > 0, 'Invalid measured time base');
  return n / d;
};
const hash = value => String(value).replace(/^SHA256:/, '').toLowerCase();
const ratio = (value, fallback) => {
  const [n, d] = String(value).split(':').map(Number);
  return n > 0 && d > 0 ? n / d : fallback;
};
function close(actual, expected, tolerance, label) {
  assert.ok(Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance + 1e-9,
    `${label} differs: ${actual} vs ${expected}, tolerance ${tolerance}`);
}
function streamPairs(actual, expected) {
  assert.equal(actual.length, expected.length, 'Parity track count differs');
  return expected.map((reference, index) => {
    // Current fixtures have one track of each kind. Fail ambiguity rather than
    // silently compare only the first matching track of a future fixture.
    assert.equal(expected.filter(s => s.codec_type === reference.codec_type).length, 1, 'Parity fixture track kind is ambiguous');
    const candidate = actual.find(s => s.codec_type === reference.codec_type);
    assert.ok(candidate, `Parity ${reference.codec_type} track missing (${index})`);
    return [candidate, reference];
  });
}
function checkConfig(actual, expected, copy) {
  assert.equal(actual.codec_name, expected.codec_name, 'Parity codec differs');
  if (copy) {
    assert.ok(actual.extradata_hash && expected.extradata_hash, 'Parity codec configuration is missing');
    assert.equal(hash(actual.extradata_hash), hash(expected.extradata_hash), 'Parity codec configuration differs');
  }
  if (expected.codec_type === 'video') {
    assert.equal(actual.width, expected.width, 'Parity width differs');
    assert.equal(actual.height, expected.height, 'Parity height differs');
    const a = ratio(actual.sample_aspect_ratio, 1), b = ratio(expected.sample_aspect_ratio, 1);
    close(a, b, 1e-9, 'Parity sample aspect');
    close(ratio(actual.display_aspect_ratio, actual.width / actual.height * a), ratio(expected.display_aspect_ratio, expected.width / expected.height * b), 1e-9, 'Parity display aspect');
  } else {
    assert.equal(Number(actual.sample_rate), Number(expected.sample_rate), 'Parity sample rate differs');
    assert.equal(actual.channels, expected.channels, 'Parity channel count differs');
    assert.equal(actual.channel_layout, expected.channel_layout, 'Parity channel layout differs');
  }
}
function checkPackets(actualProbe, expectedProbe, sourceProbe, baselineBias) {
  for (const [actualStream, expectedStream] of streamPairs(actualProbe.streams, expectedProbe.streams)) {
    checkConfig(actualStream, expectedStream, true);
    const actual = actualProbe.packets.filter(p => p.stream_index === actualStream.index);
    const expected = expectedProbe.packets.filter(p => p.stream_index === expectedStream.index);
    assert.ok(expected.length > 0, 'Baseline has no packets');
    assert.equal(actual.length, expected.length, 'Parity packet count differs');
    const sourceStream = sourceProbe.streams.find(s => s.codec_type === expectedStream.codec_type);
    assert.ok(sourceStream && sourceProbe.streams.filter(s => s.codec_type === expectedStream.codec_type).length === 1, 'Parity source track missing or ambiguous');
    // A copied Matroska AAC packet may retain its millisecond duration while
    // the component writer uses 1024 sample ticks. Include the independently
    // measured immutable source quantum; never infer tolerance from errors.
    const tolerance = quantum(sourceStream) + quantum(actualStream) + quantum(expectedStream);
    for (let index = 0; index < actual.length; index++) {
      assert.equal(hash(actual[index].data_hash), hash(expected[index].data_hash), `Parity packet ${index} payload differs`);
      assert.equal(actual[index].flags.includes('K'), expected[index].flags.includes('K'), 'Parity key flag differs');
      for (const field of ['pts', 'dts']) close(Number(actual[index][field]) * quantum(actualStream), Number(expected[index][field]) * quantum(expectedStream) - baselineBias, tolerance, `Parity ${field} packet ${index}`);
      const actualDuration = Number(actual[index].duration) * quantum(actualStream), expectedDuration = Number(expected[index].duration) * quantum(expectedStream);
      assert.ok(actualDuration > 0 && expectedDuration > 0, 'Parity packet duration must be positive');
      close(actualDuration, expectedDuration, tolerance, `Parity duration packet ${index}`);
    }
  }
}
function comparePCM(actual, expected) {
  assert.equal(actual.length % 4, 0, 'Candidate PCM is not f32le');
  assert.equal(expected.length % 4, 0, 'Baseline PCM is not f32le');
  assert.equal(actual.length, expected.length, 'Parity PCM sample count differs');
  assert.ok(actual.length > 0, 'Parity PCM is empty');
  let maximum = 0, squares = 0;
  for (let offset = 0; offset < actual.length; offset += 4) {
    const a = actual.readFloatLE(offset), b = expected.readFloatLE(offset);
    assert.ok(Number.isFinite(a) && Number.isFinite(b), 'Parity PCM contains nonfinite samples');
    const error = Math.abs(a - b);
    maximum = Math.max(maximum, error); squares += error * error;
  }
  const rms = Math.sqrt(squares / (actual.length / 4));
  assert.ok(maximum <= 1e-6 && rms <= 1e-6, `Parity PCM differs: max ${maximum}, RMS ${rms}`);
  return {samples: actual.length / 4, maximumError: maximum, rmsError: rms, tolerance: 1e-6};
}
async function decoded(file, kind, signal) {
  return native('ffmpeg', ['-v', 'error', '-cpuflags', '0', '-i', file, '-map', kind === 'video' ? '0:v:0' : '0:a:0', ...(kind === 'video' ? ['-pix_fmt', 'yuv420p', '-f', 'rawvideo'] : ['-f', 'f32le']), '-'], signal);
}
function checkTiming(actual, expected, toleranceSamples) {
  assert.ok(actual.length && expected.length, 'Parity timing is empty');
  assert.equal(actual.reduce((n, s) => n + s.samples, 0), expected.reduce((n, s) => n + s.samples, 0), 'Parity timed sample count differs');
  let ai = 0, bi = 0, ao = 0, bo = 0;
  while (ai < actual.length && bi < expected.length) {
    const a = actual[ai], b = expected[bi];
    assert.ok(Number.isSafeInteger(a.samples) && a.samples > 0 && Number.isSafeInteger(b.samples) && b.samples > 0, 'Invalid parity timing segment');
    close(a.pts + ao, b.pts + bo, toleranceSamples, 'Parity absolute audio PTS');
    const consumed = Math.min(a.samples - ao, b.samples - bo);
    ao += consumed; bo += consumed;
    if (ao === a.samples) { ai++; ao = 0; }
    if (bo === b.samples) { bi++; bo = 0; }
  }
}

export async function compareParity(job, baselineFile, {signal} = {}) {
  signal?.throwIfAborted();
  if (job.status === 'blocked') return {passed: false, status: 'blocked', kind: job.kind, profile: job.profile, reason: job.reason, scope: job.scope};
  assert.ok(isAbsolute(baselineFile) && isAbsolute(job.input), 'Parity files must be absolute');
  const bias = job.baselineTimelineBiasSeconds ?? 0;
  assert.ok(Number.isFinite(bias), 'Baseline timeline bias must be a recorded finite constant');
  const baseline = await probe(baselineFile, signal);
  if (job.kind === 'container-reader') {
    assert.equal(job.profile, 'packet-copy', 'Reader parity requires packet-copy');
    const candidate = JSON.parse(await readFile(job.candidatePackets));
    assert.ok(Array.isArray(candidate.packetDescriptions), 'Candidate packet evidence missing');
    assert.equal(candidate.tracks.length, baseline.streams.length, 'Parity track count differs');
    for (const stream of baseline.streams) {
      assert.equal(baseline.streams.filter(s => s.codec_type === stream.codec_type).length, 1, 'Parity fixture track kind is ambiguous');
      const track = candidate.tracks.find(t => t.kind === stream.codec_type);
      assert.ok(track, 'Parity reader track missing');
      assert.equal(track.codec, {h264: 'V_MPEG4/ISO/AVC', aac: 'A_AAC'}[stream.codec_name], 'Parity reader codec differs');
      assert.equal(track.configSHA256, hash(stream.extradata_hash), 'Parity reader codec configuration differs');
      if (track.kind === 'video') { assert.equal(track.width, stream.width); assert.equal(track.height, stream.height); }
      else { assert.equal(track.channels, stream.channels); assert.equal(track.sampleRate, Number(stream.sample_rate)); }
      const actual = candidate.packetDescriptions.filter(p => p.track === track.number);
      const expected = baseline.packets.filter(p => p.stream_index === stream.index);
      assert.ok(expected.length > 0, 'Baseline has no packets');
      assert.equal(actual.length, expected.length, 'Parity packet count differs');
      const tolerance = track.timeBaseSeconds + quantum(stream);
      assert.ok(tolerance >= 0 && tolerance <= 0.002, 'Invalid reader timing quantum');
      actual.forEach((packet, index) => {
        assert.equal(packet.sha256, hash(expected[index].data_hash), 'Parity reader payload differs');
        assert.equal(packet.key, expected[index].flags.includes('K'), 'Parity reader key flag differs');
        close(packet.ptsSeconds, Number(expected[index].pts) * quantum(stream) - bias, tolerance, 'Parity reader PTS');
      });
    }
    assert.equal(candidate.packetDescriptions.length, baseline.packets.length, 'Parity unexpected reader packets');
    return {passed: true, kind: job.kind, packets: baseline.packets.length, baselineTimelineBiasSeconds: bias, scope: 'copied packet payload, absolute PTS, key flags and exposed codec configuration; reader API does not expose DTS or packet durations'};
  }
  if (job.kind === 'prepared-file') {
    assert.equal(job.profile, 'packet-copy', 'Prepared-file parity requires packet-copy');
    const candidate = await probe(job.candidate, signal);
    checkPackets(candidate, baseline, await probe(job.input, signal), bias);
    const decodedEvidence = [];
    for (const stream of baseline.streams) {
      const a = await decoded(job.candidate, stream.codec_type, signal), b = await decoded(baselineFile, stream.codec_type, signal);
      if (stream.codec_type === 'video') { assert.deepEqual(a, b, 'Parity decoded pixels differ'); decodedEvidence.push({kind: 'video', bytes: a.length, exact: true}); }
      else decodedEvidence.push({kind: 'audio', ...comparePCM(a, b)});
    }
    return {passed: true, kind: job.kind, packets: baseline.packets.length, decoded: decodedEvidence, baselineTimelineBiasSeconds: bias, scope: 'copied payloads, key flags, absolute PTS/DTS/durations, configuration, channels, aspect and decoded pixels/PCM'};
  }
  assert.ok(['audio-decoder', 'prepared-audio'].includes(job.kind), 'Unknown parity job kind');
  assert.equal(job.profile, 'flac24', 'Audio parity requires the explicit FLAC24 profile');
  const stream = baseline.streams.find(s => s.codec_type === 'audio');
  assert.ok(stream && baseline.streams.length === 1 && stream.codec_name === 'flac', 'Baseline must be a single FLAC24 audio track');
  assert.ok(Number(stream.bits_per_raw_sample) <= 24 && Number(stream.bits_per_raw_sample) > 0, 'Baseline exceeds the declared FLAC24 precision');
  const rate = Number(stream.sample_rate), channels = stream.channels;
  const frames = (await probe(baselineFile, signal, true)).frames.filter(f => f.media_type === 'audio');
  const expectedTiming = frames.map(frame => ({pts: Number(frame.pts) * quantum(stream) * rate - bias * rate, samples: Number(frame.nb_samples)}));
  const referencePCM = await decoded(baselineFile, 'audio', signal);
  let candidatePCM, timing;
  if (job.kind === 'audio-decoder') {
    assert.equal(job.sampleRate, rate, 'Parity sample rate differs');
    assert.equal(job.channels, channels, 'Parity channel count differs');
    candidatePCM = await readFile(job.candidatePCM); timing = job.timing;
  } else {
    const actual = await probe(job.candidate, signal, true);
    const [actualStream] = actual.streams;
    assert.equal(actual.streams.length, 1, 'Candidate audio track count differs');
    checkConfig(actualStream, stream, false);
    timing = {segments: actual.frames.filter(f => f.media_type === 'audio').map(f => ({pts: Number(f.pts) * quantum(actualStream) * rate, samples: Number(f.nb_samples)})), toleranceSamples: quantum(actualStream) * rate};
    candidatePCM = await decoded(job.candidate, 'audio', signal);
  }
  assert.ok(timing && Array.isArray(timing.segments) && Number.isFinite(timing.toleranceSamples) && timing.toleranceSamples >= 0, 'Candidate audio timing evidence missing');
  // Tolerance is fixture timestamp quantization, not a freely adjustable shift.
  assert.ok(timing.toleranceSamples <= Math.ceil(rate / 1000), 'Audio timing tolerance exceeds the bounded millisecond fixture quantum');
  const toleranceSamples = timing.toleranceSamples + quantum(stream) * rate;
  checkTiming(timing.segments, expectedTiming, toleranceSamples);
  assert.equal(timing.segments.reduce((n, s) => n + s.samples, 0) * channels * 4, candidatePCM.length, 'Candidate timing does not describe presented PCM');
  const pcm = comparePCM(candidatePCM, referencePCM);
  return {passed: true, kind: job.kind, sampleRate: rate, channels, pcm, toleranceSamples, baselineTimelineBiasSeconds: bias, rawPrecisionParity: job.rawPrecisionParity, scope: 'absolute presented audio timeline and channel-ordered PCM within FLAC24 quantization tolerance; higher precision losslessness is qualified separately, compressed encoder bytes are not compared'};
}
