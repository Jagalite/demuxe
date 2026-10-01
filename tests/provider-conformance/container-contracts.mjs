// SPDX-License-Identifier: Apache-2.0
import {before, after, test} from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp, readFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {prepareContainerFixture, runContainerChecks, runMuxChecks} from './container.mjs';

const exec = promisify(execFile);
let directory, input, reference, tracks, nativeMux, shiftedMux, MatroskaReader, FragmentedMP4Writer, arbitraryTracksInput;
const unpackHex = dump => Buffer.from(dump.split('\n').filter(Boolean).map(line => line.slice(10, 49).replace(/\s/g, '')).join(''), 'hex');
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'demuxe-container-contracts-'));
  input = await prepareContainerFixture(directory);
  const {stdout} = await exec('ffprobe', ['-v', 'error', '-show_packets', '-show_streams', '-show_data', '-of', 'json', input], {maxBuffer: 16 * 1024 * 1024});
  const probe = JSON.parse(stdout);
  reference = probe.packets.map(packet => ({
    track: packet.stream_index + 1,
    timestampNs: Math.round(Number(packet.pts_time) * 1e9),
    key: packet.flags.includes('K'),
    data: unpackHex(packet.data),
  }));
  tracks = probe.streams.map(stream => ({number: stream.index + 1, kind: stream.codec_type, codec: stream.codec_type === 'video' ? 'V_MPEG4/ISO/AVC' : 'A_AAC', privateData: unpackHex(stream.extradata), width: stream.width, height: stream.height, channels: stream.channels, rate: Number(stream.sample_rate), defaultDurationNs: stream.codec_type === 'video' ? 40000000 : undefined}));
  for (const [name, offset] of [['native.mp4', '0'], ['shifted.mp4', '0.04']]) {
    await exec('ffmpeg', ['-v', 'error', '-y', '-i', input, '-map', '0:v:0', '-map', '0:a:0', '-c', 'copy', '-movflags', 'frag_keyframe+delay_moov+default_base_moof', '-output_ts_offset', offset, join(directory, name)]);
  }
  nativeMux = await readFile(join(directory, 'native.mp4'));
  shiftedMux = await readFile(join(directory, 'shifted.mp4'));
  const {build} = await import('esbuild');
  const compiled = await build({entryPoints: [fileURLToPath(new URL('../../packages/provider-container/src/matroska.ts', import.meta.url)), fileURLToPath(new URL('../../packages/provider-container/src/fmp4.ts', import.meta.url))], bundle: true, format: 'esm', platform: 'node', outdir: join(directory, 'actual'), outExtension: {'.js': '.mjs'}});
  assert.equal(compiled.errors.length, 0);
  ({MatroskaReader} = await import(pathToFileURL(join(directory, 'actual/matroska.mjs'))));
  ({FragmentedMP4Writer} = await import(pathToFileURL(join(directory, 'actual/fmp4.mjs'))));
  arbitraryTracksInput = join(directory, 'arbitrary-track-numbers.mkv');
  await writeFile(arbitraryTracksInput, replaceTrackNumbers(Buffer.from(await readFile(input))));
});
after(async () => { if (directory) await rm(directory, {recursive: true, force: true}); });

function replaceTrackNumbers(data) {
  const integer = (position, id = false) => {
    const first = data[position];
    let length = 1;
    while (!(first & (128 >> (length - 1)))) length++;
    let value = id ? first : first & ((1 << (8 - length)) - 1);
    for (let index = 1; index < length; index++) value = value * 256 + data[position + index];
    return {value, length};
  };
  const walk = (start, end) => {
    for (let position = start; position < end;) {
      const id = integer(position, true), size = integer(position + id.length);
      const payload = position + id.length + size.length, next = payload + size.value;
      if (id.value === 0xbf) {
        // CRCs for mutated Tracks/Clusters become equivalent optional Void bytes.
        data[position] = 0xec;
      } else if ([0xd7, 0xf7].includes(id.value)) {
        assert.equal(next - payload, 1);
        assert.ok([1, 2].includes(data[payload]));
        data[payload] = data[payload] === 1 ? 7 : 11;
      } else if ([0xa3, 0xa1].includes(id.value)) {
        assert.ok([0x81, 0x82].includes(data[payload]));
        data[payload] = data[payload] === 0x81 ? 0x87 : 0x8b;
      } else if ([0x18538067, 0x1654ae6b, 0xae, 0x1f43b675, 0xa0, 0x1c53bb6b, 0xbb, 0xb7].includes(id.value)) walk(payload, next);
      position = next;
    }
  };
  walk(0, data.length);
  return data;
}

// An oracle adapter isolates harness assertions from any installed provider.
function oracle(defect) {
  return async (blob, signal) => {
    if (defect !== 'ignore-open-cancellation') signal.throwIfAborted();
    const bytes = Buffer.from(await blob.arrayBuffer());
    const reject = message => { throw Object.assign(new Error(message), {code: 'PROVIDER_PROFILE_MISMATCH'}); };
    if (blob.size === 50) reject('Truncated input');
    if (blob.size < 200) {
      const hasDisplay = [Buffer.from('54b0', 'hex'), Buffer.from('54ba', 'hex')].some(id => bytes.includes(id));
      if (hasDisplay && defect !== 'accept-display-metadata') reject('Container presentation metadata requires another provider');
      return {tracks: [{width: 640, height: 360}]};
    }
    return {
      tracks: defect === 'wrong-track-metadata' ? tracks.map(track => ({...track, width: 999})) : tracks,
      async *packets() {
        if (defect !== 'ignore-packet-cancellation') signal.throwIfAborted();
        if (defect === 'empty-packets') return;
        const pool = new Uint8Array(Math.max(...reference.map(packet => packet.data.length)));
        for (let index = 0; index < reference.length; index++) {
          const packet = {...reference[index], data: Uint8Array.from(reference[index].data)};
          if (index === 0) {
            if (defect === 'corrupt-payload') packet.data[0] ^= 255;
            if (defect === 'wrong-timestamp') packet.timestampNs += 1000000;
            if (defect === 'wrong-key-flag') packet.key = !packet.key;
            if (defect === 'wrong-track') packet.track = 99;
          }
          if (defect === 'reuse-payload') {
            pool.set(packet.data);
            packet.data = pool.subarray(0, packet.data.length);
          }
          yield packet;
        }
      },
    };
  };
}

test('independent packet oracle passes the full shared container contract', async () => {
  const result = await runContainerChecks({openReader: oracle(), input, outputDirectory: join(directory, 'valid')});
  assert.equal(result.passed, true);
  assert.equal(result.packets, reference.length);
  assert.equal(result.ownedOutput, true);
});

for (const [defect, assertion] of [
  ['empty-packets', /Packet count/],
  ['corrupt-payload', /hash differs/],
  ['wrong-timestamp', /timestamp differs/],
  ['wrong-key-flag', /key flag differs/],
  ['wrong-track', /track differs/],
  ['wrong-track-metadata', /Track width differs/],
  ['reuse-payload', /Retained packet changed/],
  ['ignore-packet-cancellation', /Packet iteration must honor cancellation/],
  ['ignore-open-cancellation', /Opening must honor cancellation/],
  ['accept-display-metadata', /must reject unsupported presentation metadata/],
]) test(`container harness cannot pass ${defect}`, async () => {
  const outputDirectory = join(directory, defect);
  await assert.rejects(() => runContainerChecks({openReader: oracle(defect), input, outputDirectory}), assertion);
  await assert.rejects(() => readFile(join(outputDirectory, 'packets.json')), {code: 'ENOENT'});
});

test('already aborted conformance request stops before opening a provider', async () => {
  const controller = new AbortController();
  controller.abort();
  let opened = false;
  await assert.rejects(() => runContainerChecks({openReader: async () => { opened = true; }, input, outputDirectory: join(directory, 'cancelled'), signal: controller.signal}), {name: 'AbortError'});
  assert.equal(opened, false);
});

// A precomputed native mux oracle isolates output validation from writer code.
function writerOracle(defect) {
  let fragments = 0;
  return () => ({
    initialization: () => defect === 'corrupt-mux' ? Buffer.from([1, 2, 3]) : defect === 'shifted-timestamps' ? shiftedMux : nativeMux,
    fragment() {
      if (++fragments > reference.length && defect !== 'accept-backward-timeline') throw new Error('Rejected backward DTS');
      return new Uint8Array();
    },
  });
}
test('native mux oracle passes packet and decoded-output equivalence', async () => {
  const result = await runMuxChecks({openReader: oracle(), createWriter: writerOracle(), input, outputDirectory: join(directory, 'valid-mux')});
  assert.equal(result.timelineRejected, true);
  assert.equal(result.packets, reference.length);
});
for (const [defect, assertion] of [
  ['corrupt-mux', /ffprobe|Invalid data/],
  ['shifted-timestamps', /Mux timestamps differ/],
  ['accept-backward-timeline', /Writer must reject backward sample timeline/],
]) test(`mux harness cannot pass ${defect}`, async () => {
  const outputDirectory = join(directory, defect);
  await assert.rejects(() => runMuxChecks({openReader: oracle(), createWriter: writerOracle(defect), input, outputDirectory}), assertion);
  await assert.rejects(() => readFile(join(outputDirectory, 'mux.json')), {code: 'ENOENT'});
});

const actualReader = (blob, signal) => MatroskaReader.open(blob, signal);
test('real reader with TrackNumbers 7 and 11 passes independent ffprobe checks', async () => {
  const result = await runContainerChecks({openReader: actualReader, input: arbitraryTracksInput, outputDirectory: join(directory, 'valid-arbitrary-tracks')});
  assert.deepEqual(result.tracks.map(track => track.number), [7, 11]);
  assert.equal(result.packets, reference.length);
});
test('real writer accepts normal Matroska-to-MP4 duration rounding', async () => {
  const result = await runMuxChecks({openReader: actualReader, createWriter: tracks => new FragmentedMP4Writer(tracks), input, outputDirectory: join(directory, 'valid-actual-mux')});
  assert.equal(result.passed, true);
});
test('real writer preserves valid arbitrary source track numbers', async () => {
  const result = await runMuxChecks({openReader: actualReader, createWriter: tracks => new FragmentedMP4Writer(tracks), input: arbitraryTracksInput, outputDirectory: join(directory, 'valid-arbitrary-mux')});
  assert.equal(result.passed, true);
});
function incorrectActualWriter(defect) {
  return configuration => {
    const writer = new FragmentedMP4Writer(configuration);
    const audio = configuration.find(track => track.codec === 'mp4a').id;
    const audioPackets = reference.filter(packet => packet.track === tracks.find(track => track.kind === 'audio').number).length;
    let sentAudio = 0;
    return {
      initialization() {
        const data = Buffer.from(writer.initialization());
        if (defect === 'display-aspect') {
          for (let position = 4; position < data.length - 4; position++) {
            if (data.toString('latin1', position, position + 4) !== 'tkhd') continue;
            const end = position - 4 + data.readUInt32BE(position - 4);
            const width = data.readUInt32BE(end - 8);
            if (width) { data.writeUInt32BE(width / 2, end - 8); break; }
          }
        }
        return data;
      },
      fragment(id, samples) {
        if (defect === 'final-aac-duration' && id === audio && ++sentAudio === audioPackets) samples = samples.map(sample => ({...sample, duration: sample.duration * 100}));
        return writer.fragment(id, samples);
      },
    };
  };
}
for (const [defect, assertion] of [
  ['final-aac-duration', /Mux packet duration differs/],
  ['display-aspect', /Mux sample aspect ratio differs|Mux display aspect ratio differs/],
]) test(`mux harness rejects real writer corruption of ${defect}`, async () => {
  const outputDirectory = join(directory, defect);
  await assert.rejects(() => runMuxChecks({openReader: actualReader, createWriter: incorrectActualWriter(defect), input, outputDirectory}), assertion);
  await assert.rejects(() => readFile(join(outputDirectory, 'mux.json')), {code: 'ENOENT'});
});
