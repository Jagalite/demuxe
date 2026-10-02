// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isAbsolute, join} from 'node:path';

const exec = promisify(execFile);
const sha256 = data => createHash('sha256').update(data).digest('hex');
const aborted = error => error?.name === 'AbortError';
const profileMismatch = error => error?.code === 'PROVIDER_PROFILE_MISMATCH';

async function native(command, args, signal, maxBuffer = 64 * 1024 * 1024) {
  return (await exec(command, args, {signal, maxBuffer, encoding: 'buffer'})).stdout;
}
async function probe(input, signal) {
  return JSON.parse(await native('ffprobe', ['-v', 'error', '-show_packets', '-show_streams', '-show_data_hash', 'sha256', '-of', 'json', input], signal));
}
function absoluteInput(input) {
  assert.ok(isAbsolute(input), 'Fixture input must be an absolute path');
}

// ffprobe's Matroska stream_index is its TrackEntry ordinal, not TrackNumber.
// Read only fixture identities here, independently of the candidate reader.
function ebmlInteger(data, position, id = false) {
  const first = data[position];
  assert.ok(first, 'Invalid reference EBML integer');
  let length = 1;
  while (length <= 8 && !(first & (128 >> (length - 1)))) length++;
  assert.ok(length <= (id ? 4 : 8) && position + length <= data.length, 'Truncated reference EBML integer');
  let value = id ? first : first & ((1 << (8 - length)) - 1);
  for (let index = 1; index < length; index++) value = value * 256 + data[position + index];
  assert.ok(Number.isSafeInteger(value), 'Reference EBML integer overflow');
  return {value, length};
}
function *referenceElements(data, start = 0, end = data.length) {
  for (let position = start; position < end;) {
    const id = ebmlInteger(data, position, true), size = ebmlInteger(data, position + id.length);
    const payload = position + id.length + size.length, next = payload + size.value;
    assert.ok(Number.isSafeInteger(next) && next <= end && next > position, 'Reference EBML element bounds');
    yield {id: id.value, start: payload, end: next};
    position = next;
  }
}
function referenceTrackNumbers(data) {
  const segment = [...referenceElements(data)].find(element => element.id === 0x18538067);
  assert.ok(segment, 'Reference Matroska segment missing');
  const tracks = [...referenceElements(data, segment.start, segment.end)].find(element => element.id === 0x1654ae6b);
  assert.ok(tracks, 'Reference Matroska tracks missing');
  const numbers = [];
  for (const track of referenceElements(data, tracks.start, tracks.end)) {
    if (track.id !== 0xae) continue;
    const number = [...referenceElements(data, track.start, track.end)].find(element => element.id === 0xd7);
    assert.ok(number && number.end - number.start <= 8, 'Reference Matroska TrackNumber missing');
    let value = 0;
    for (const byte of data.subarray(number.start, number.end)) value = value * 256 + byte;
    assert.ok(Number.isSafeInteger(value) && value > 0 && !numbers.includes(value), 'Invalid reference TrackNumber');
    numbers.push(value);
  }
  return numbers;
}

// Each invocation owns its output directory; callers supply an isolated directory.
export async function prepareContainerFixture(outputDirectory, {signal} = {}) {
  assert.ok(isAbsolute(outputDirectory), 'Fixture output directory must be absolute');
  await mkdir(outputDirectory, {recursive: true});
  const input = join(outputDirectory, 'avc-aac.mkv');
  const source = join(outputDirectory, 'avc-aac-source.mp4');
  const audio = join(outputDirectory, 'avc-aac-packets.aac');
  await native('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=96x64:rate=25', '-f', 'lavfi', '-i', 'sine=frequency=997:sample_rate=48000', '-t', '0.6', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-threads', '1', '-bf', '0', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-ac', '1', source], signal);
  // This fixture tests whole coded AAC packets, not gapless edit/trim metadata.
  // MP4-to-Matroska copy is insufficient: newer muxers preserve its encoder
  // priming and tail. ADTS explicitly supplies complete packets without edits.
  await native('ffmpeg', ['-v', 'error', '-y', '-i', source, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', audio], signal);
  await native('ffmpeg', ['-v', 'error', '-y', '-i', source, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-avoid_negative_ts', 'make_zero', input], signal);
  const reference = await probe(input, signal);
  assert.ok(reference.packets.every(packet => !(packet.side_data_list ?? []).some(side =>
    side.side_data_type === 'Skip Samples' && (Number(side.skip_samples) || Number(side.discard_padding)))),
  'Whole-packet fixture must not carry priming or tail trimming');
  return input;
}
export const prepareMuxFixture = prepareContainerFixture;

const bytes = (...values) => Buffer.from(values);
const uint = n => n > 255 ? bytes(n >>> 8, n & 255) : bytes(n);
function element(id, data) {
  const hex = id.toString(16);
  assert.equal(hex.length % 2, 0);
  assert.ok(data.length < 127);
  return Buffer.concat([Buffer.from(hex, 'hex'), bytes(0x80 | data.length), data]);
}
export const metadataField = (id, n) => element(id, uint(n));
const group = (id, ...children) => element(id, Buffer.concat(children));
export function createMetadataContainer(display = []) {
  const video = group(0xe0, metadataField(0xb0, 640), metadataField(0xba, 360), ...display);
  const track = group(0xae, metadataField(0xd7, 1), metadataField(0x83, 1), element(0x86, Buffer.from('V_MPEG4/ISO/AVC')), video);
  const header = group(0x1a45dfa3, element(0x4282, Buffer.from('matroska')));
  return new Blob([header, group(0x18538067, group(0x1549a966), group(0x1654ae6b, track))]);
}
export const displayMetadataCases = [
  ['DisplayWidth', [metadataField(0x54b0, 480)]],
  ['DisplayHeight', [metadataField(0x54ba, 480)]],
  ['both', [metadataField(0x54b0, 480), metadataField(0x54ba, 360)]],
];
export async function assertContainerPixelDimensions(openReader) {
  const reader = await openReader(createMetadataContainer(), new AbortController().signal);
  assert.equal(reader.tracks[0].width, 640);
  assert.equal(reader.tracks[0].height, 360);
}
export async function assertContainerDisplayRejection(openReader, name, display) {
  await assert.rejects(() => openReader(createMetadataContainer(display), new AbortController().signal),
    profileMismatch, `${name} must reject unsupported presentation metadata`);
}
export async function runContainerMetadataChecks(openReader) {
  await assertContainerPixelDimensions(openReader);
  for (const [name, display] of displayMetadataCases) {
    await assertContainerDisplayRejection(openReader, name, display);
  }
  return {displayMetadataRejected: true};
}

export async function runContainerChecks({openReader, input, outputDirectory, signal}) {
  absoluteInput(input);
  assert.equal(typeof openReader, 'function', 'Adapter must expose openReader');
  signal?.throwIfAborted();
  const data = await readFile(input), controller = new AbortController();
  signal?.throwIfAborted();
  const onAbort = () => controller.abort(signal.reason);
  signal?.addEventListener('abort', onAbort, {once: true});
  try {
    const reader = await openReader(new Blob([data]), controller.signal);
    const packets = [], snapshots = [];
    for await (const packet of reader.packets()) {
      assert.ok(packet.data instanceof Uint8Array, 'Packets must own byte-array payloads');
      packets.push(packet);
      snapshots.push(Buffer.from(packet.data));
    }
    const expected = await probe(input, signal);
    const trackNumbers = referenceTrackNumbers(data);
    assert.equal(trackNumbers.length, expected.streams.length, 'Reference track mapping differs from ffprobe');
    assert.ok(expected.packets.length > 0, 'Fixture must have reference packets');
    assert.equal(reader.tracks.length, expected.streams.length, 'Track count differs from ffprobe');
    for (const stream of expected.streams) {
      const number = trackNumbers[stream.index];
      const track = reader.tracks.find(track => track.number === number);
      assert.ok(track, `Missing track ${number}`);
      assert.equal(track.kind, stream.codec_type, 'Track kind differs from ffprobe');
      const codec = {h264: 'V_MPEG4/ISO/AVC', aac: 'A_AAC'}[stream.codec_name];
      assert.ok(codec, 'Container fixture must use the AVC/AAC check profile');
      assert.equal(track.codec, codec, 'Track codec differs from ffprobe');
      assert.equal('SHA256:' + sha256(track.privateData), stream.extradata_hash, 'Track codec configuration differs from ffprobe');
      if (track.kind === 'video') {
        assert.equal(track.width, stream.width, 'Track width differs from ffprobe');
        assert.equal(track.height, stream.height, 'Track height differs from ffprobe');
      } else {
        assert.equal(track.channels, stream.channels, 'Track channels differ from ffprobe');
        assert.equal(track.rate, Number(stream.sample_rate), 'Track sample rate differs from ffprobe');
      }
    }
    assert.equal(packets.length, expected.packets.length, 'Packet count differs from ffprobe');
    for (let index = 0; index < packets.length; index++) {
      const actual = packets[index], reference = expected.packets[index];
      assert.deepEqual(Buffer.from(actual.data), snapshots[index], 'Retained packet changed during iteration');
      assert.equal('SHA256:' + sha256(actual.data), reference.data_hash, `Packet ${index} hash differs`);
      assert.ok(Math.abs(actual.timestampNs / 1e9 - Number(reference.pts_time)) < 1e-8, `Packet ${index} timestamp differs`);
      assert.equal(actual.track, trackNumbers[reference.stream_index], `Packet ${index} track differs`);
      assert.equal(actual.key, reference.flags.includes('K'), `Packet ${index} key flag differs`);
    }
    // Mutating one owned payload cannot change any other retained packet or a new read.
    const first = packets[0];
    assert.ok(first.data.length > 0, 'Fixture first packet must have payload');
    first.data[0] ^= 255;
    for (let index = 1; index < packets.length; index++) assert.deepEqual(Buffer.from(packets[index].data), snapshots[index], 'Packet payloads alias');
    const reread = reader.packets()[Symbol.asyncIterator]();
    const rereadFirst = await reread.next();
    assert.deepEqual(Buffer.from(rereadFirst.value.data), snapshots[0], 'Mutated packet changed subsequent reads');
    await reread.return?.();
    first.data[0] ^= 255;
    controller.abort();
    await assert.rejects(async () => { for await (const packet of reader.packets()) void packet; }, aborted, 'Packet iteration must honor cancellation');
    const cancelled = new AbortController();
    cancelled.abort();
    await assert.rejects(() => openReader(new Blob([data]), cancelled.signal), aborted, 'Opening must honor cancellation');
    await assert.rejects(() => openReader(new Blob([data.subarray(0, 50)]), new AbortController().signal), profileMismatch, 'Truncated input must reject with profile mismatch');
    const metadata = await runContainerMetadataChecks(openReader);
    const candidatePackets = join(outputDirectory, 'packets.json');
    const result = {passed: true, scope: 'finite local unlaced AVC/AAC Matroska packet equivalence, ownership, cancellation and display metadata rejection', packets: packets.length, tracks: reader.tracks.map(track => ({number: track.number, kind: track.kind, codec: track.codec, configSHA256: sha256(track.privateData), width: track.width, height: track.height, channels: track.channels, sampleRate: track.rate, timeBaseSeconds: 0.001})), packetDescriptions: packets.map(packet => ({track: packet.track, kind: reader.tracks.find(track => track.number === packet.track).kind, sha256: sha256(packet.data), ptsSeconds: packet.timestampNs / 1e9, key: packet.key})), fixtureSHA256: sha256(data), bytesRead: reader.bytesRead, cancelled: true, truncationRejected: true, ownedOutput: true, parityJobs: [{kind: 'container-reader', input, candidatePackets, profile: 'packet-copy', target: 'mp4'}], ...metadata};
    await mkdir(outputDirectory, {recursive: true});
    await writeFile(candidatePackets, JSON.stringify(result, null, 2) + '\n');
    return result;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

export async function runMuxChecks({openReader, createWriter, input, outputDirectory, signal}) {
  absoluteInput(input);
  signal?.throwIfAborted();
  const reader = await openReader(new Blob([await readFile(input)]), signal ?? new AbortController().signal);
  assert.equal(reader.tracks.length, 2, 'Mux fixture must have video and audio');
  assert.deepEqual(new Set(reader.tracks.map(track => track.codec)), new Set(['V_MPEG4/ISO/AVC', 'A_AAC']), 'Mux fixture requires AVC and AAC');
  const tracks = reader.tracks.map(track => ({id: track.number, codec: track.kind === 'video' ? 'avc1' : 'mp4a', config: track.privateData, timescale: track.kind === 'video' ? 1000 : 48000, width: track.width, height: track.height, channels: track.channels}));
  const writer = await createWriter(tracks), parts = [await writer.initialization()], tails = new Map();
  const packets = [];
  for await (const packet of reader.packets()) packets.push(packet);
  for (let index = 0; index < packets.length; index++) {
    const packet = packets[index], track = tracks.find(track => track.id === packet.track), source = reader.tracks.find(track => track.number === packet.track);
    const dts = track.codec === 'avc1' ? Math.round(packet.timestampNs / 1e6) : (tails.get(packet.track) ?? Math.round(packet.timestampNs * 48000 / 1e9));
    const next = packets.slice(index + 1).find(next => next.track === packet.track);
    const duration = track.codec === 'avc1' ? (next ? Math.round(next.timestampNs / 1e6) - dts : Math.round(source.defaultDurationNs / 1e6)) : 1024;
    if (track.codec === 'mp4a') assert.ok(Math.abs(dts / 48000 - packet.timestampNs / 1e9) < 0.0011, 'AAC input timeline differs from 48 kHz frames');
    parts.push(await writer.fragment(packet.track, [{data: packet.data, pts: dts, dts, duration, key: packet.key}]));
    tails.set(packet.track, dts + duration);
  }
  await mkdir(outputDirectory, {recursive: true});
  const output = join(outputDirectory, 'remux.mp4');
  await writeFile(output, Buffer.concat(parts));
  const before = await probe(input, signal), after = await probe(output, signal);
  assert.ok(before.packets.length > 0, 'Mux fixture must have reference packets');
  assert.equal(after.packets.length, before.packets.length, 'Mux packet count differs');
  for (const sourceStream of before.streams) {
    const outputStream = after.streams.find(stream => stream.codec_type === sourceStream.codec_type);
    assert.ok(outputStream, 'Mux output track missing');
    assert.equal(outputStream.codec_name, sourceStream.codec_name, 'Mux track codec differs');
    assert.equal(outputStream.extradata_hash, sourceStream.extradata_hash, 'Mux codec configuration differs');
    if (sourceStream.codec_type === 'video') {
      assert.equal(outputStream.width, sourceStream.width, 'Mux video width differs');
      assert.equal(outputStream.height, sourceStream.height, 'Mux video height differs');
      const ratio = (value, fallback) => {
        const [numerator, denominator] = (value ?? '').split(':').map(Number);
        return numerator > 0 && denominator > 0 ? numerator / denominator : fallback;
      };
      const sourceAspect = ratio(sourceStream.sample_aspect_ratio, 1), outputAspect = ratio(outputStream.sample_aspect_ratio, 1);
      assert.equal(outputAspect, sourceAspect, 'Mux sample aspect ratio differs');
      assert.equal(ratio(outputStream.display_aspect_ratio, outputStream.width / outputStream.height * outputAspect), ratio(sourceStream.display_aspect_ratio, sourceStream.width / sourceStream.height * sourceAspect), 'Mux display aspect ratio differs');
    } else {
      assert.equal(outputStream.sample_rate, sourceStream.sample_rate, 'Mux sample rate differs');
      assert.equal(outputStream.channels, sourceStream.channels, 'Mux channel count differs');
      assert.equal(outputStream.channel_layout, sourceStream.channel_layout, 'Mux channel layout differs');
    }
    const source = before.packets.filter(packet => packet.stream_index === sourceStream.index), actual = after.packets.filter(packet => packet.stream_index === outputStream.index);
    const quantum = stream => { const [numerator, denominator] = stream.time_base.split('/').map(Number); return numerator / denominator; };
    // Matroska commonly rounds AAC's 1024/48000-second frame to milliseconds;
    // MP4 uses sample ticks. Include one tick from each representation.
    const durationTolerance = quantum(sourceStream) + quantum(outputStream) + 1e-6;
    const duration = (packet, stream) => packet.duration !== undefined ? Number(packet.duration) * quantum(stream) : Number(packet.duration_time);
    assert.deepEqual(actual.map(packet => packet.data_hash), source.map(packet => packet.data_hash), 'Mux packet hashes differ');
    for (let index = 0; index < source.length; index++) {
      assert.ok(Math.abs(Number(source[index].pts_time) - Number(actual[index].pts_time)) < 0.0011, 'Mux timestamps differ');
      const sourceDuration = duration(source[index], sourceStream), outputDuration = duration(actual[index], outputStream);
      assert.ok(Number.isFinite(sourceDuration) && sourceDuration > 0 && Number.isFinite(outputDuration) && outputDuration > 0, 'Mux packet duration must be positive');
      assert.ok(Math.abs(sourceDuration - outputDuration) <= durationTolerance, 'Mux packet duration differs');
      assert.equal(actual[index].flags.includes('K'), source[index].flags.includes('K'), 'Mux key flags differ');
    }
  }
  for (const format of ['rawvideo', 'f32le']) {
    const args = file => ['-v', 'error', '-i', file, '-map', format === 'rawvideo' ? '0:v:0' : '0:a:0', '-f', format, '-'];
    const actual = await native('ffmpeg', args(output), signal), expected = await native('ffmpeg', args(input), signal);
    assert.ok(actual.equals(expected), `Mux decoded ${format} differs: ${actual.length}/${expected.length} bytes, SHA256 ${sha256(actual)}/${sha256(expected)}`);
  }
  const video = tracks.find(track => track.codec === 'avc1');
  const firstVideo = packets.find(packet => packet.track === video.id);
  await assert.rejects(async () => writer.fragment(video.id, [{data: firstVideo.data, dts: 0, pts: 0, duration: Math.round(reader.tracks.find(track => track.number === video.id).defaultDurationNs / 1e6), key: firstVideo.key}]), 'Writer must reject backward sample timeline');
  const result = {passed: true, scope: 'AVC without reordered pictures + AAC 48 kHz; fMP4 packet, duration, display aspect and native decoded-output equivalence', packets: after.packets.length, output, fixtureSHA256: sha256(await readFile(input)), packetDurationsEquivalent: true, displayAspectPreserved: true, timelineRejected: true, parityJobs: [{kind: 'prepared-file', input, candidate: output, profile: 'packet-copy', target: 'mp4'}]};
  await writeFile(join(outputDirectory, 'mux.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}
