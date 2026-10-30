// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createWebMVideoPreparer} from '../file-preparation.js';
import * as runtime from 'mediabunny';
import {matroskaFixture} from './matroska-fixture.js';

async function webmFixture({decoderConfig = {}, metadata = {}} = {}) {
  const target = new runtime.BufferTarget();
  const output = new runtime.Output({format: new runtime.WebMOutputFormat(), target});
  const source = new runtime.EncodedVideoPacketSource('vp8');
  output.addVideoTrack(source, metadata);
  await output.start();
  // Container-only fixture: a recognizable VP8 keyframe header, not playback
  // qualification. No native decoder is needed to exercise mux timing.
  for (let i = 0; i < 3; i++) await source.add(new runtime.EncodedPacket(new Uint8Array([16, 0, 0, 157, 1, 42, 16, 0, 16, 0, 0]), 'key', i / 10, .1), {decoderConfig: {codec: 'vp8', codedWidth: 16, codedHeight: 16, ...decoderConfig}});
  source.close(); await output.finalize();
  return new Uint8Array(target.buffer);
}

test('prepared file retains source identity and exact parsed packet timeline', async () => {
  const prepare = createWebMVideoPreparer({load: async () => runtime});
  const result = await prepare(new Blob([await webmFixture()]), {sourceTracks: [{id: 'original-video', type: 'video', codec: 'vp8'}]});
  assert.equal(result.tracks[0].id, 'original-video');
  const input = new runtime.Input({formats: [runtime.WEBM], source: new runtime.BlobSource(result.file)});
  try {
    const packets = [];
    for await (const packet of new runtime.EncodedPacketSink((await input.getTracks())[0]).packets()) packets.push([packet.timestamp, packet.duration]);
    assert.deepEqual(packets, [[0, .1], [.1, .1], [.2, .1]]);
  } finally { input.dispose(); }
});

test('independently authored Matroska VP8 is prepared as WebM with identical payload and timeline', async () => {
  const packets = Array.from({length: 3}, (_, i) => ({data: new Uint8Array([16, 0, 0, 157, 1, 42, 16, 0, 16, 0, i]), type: 'key', timestamp: i / 10, duration: .1}));
  const file = new Blob([matroskaFixture(packets, {width: 16, height: 16})]);
  const prepare = createWebMVideoPreparer({load: async () => runtime});
  const result = await prepare(file, {sourceTracks: [{id: 'authored-track', type: 'video', codec: 'vp8'}]});
  assert.ok(result);
  assert.equal(result.diagnostics.profile, 'matroska-vp8-video-only-v1');
  assert.equal(result.tracks[0].id, 'authored-track');
  const input = new runtime.Input({formats: [runtime.WEBM], source: new runtime.BlobSource(result.file)});
  try {
    assert.equal((await input.getFormat()).name.toLowerCase(), 'webm');
    const track = (await input.getTracks())[0];
    assert.equal(await track.getName(), 'Independent VP8');
    assert.equal(await track.getLanguageCode(), 'eng');
    const actual = [];
    for await (const packet of new runtime.EncodedPacketSink(track).packets()) actual.push({data: packet.data, type: packet.type, timestamp: packet.timestamp, duration: packet.duration});
    assert.deepEqual(actual, packets);
  } finally { input.dispose(); }
});

test('authored Matroska packet gaps are declined when the packet API normalizes them', async () => {
  const packets = Array.from({length: 3}, (_, i) => ({data: new Uint8Array([16, 0, 0, 157, 1, 42, 16, 0, 16, 0, i]), type: 'key', timestamp: i / 10, duration: i === 2 ? .1 : .05}));
  const file = new Blob([matroskaFixture(packets, {width: 16, height: 16})]);
  const input = new runtime.Input({formats: [runtime.MATROSKA], source: new runtime.BlobSource(file)});
  try {
    const durations = [];
    for await (const packet of new runtime.EncodedPacketSink((await input.getTracks())[0]).packets()) durations.push(packet.duration);
    // The authored BlockDuration values above are .05, .05, .1; this API view
    // loses that distinction. Admission must check the source envelope too.
    assert.deepEqual(durations, [.1, .1, .1]);
  } finally { input.dispose(); }
  const prepare = createWebMVideoPreparer({load: async () => runtime});
  assert.equal(await prepare(file, {sourceTracks: [{id: 'v', type: 'video', codec: 'vp8'}]}), undefined);
});

test('prepared file preserves authored aspect ratio, color and track metadata', async () => {
  const prepare = createWebMVideoPreparer({load: async () => runtime});
  const result = await prepare(new Blob([await webmFixture({decoderConfig: {displayAspectWidth: 32, displayAspectHeight: 16, colorSpace: {primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false}}, metadata: {name: 'Authored video', languageCode: 'eng'}})]), {sourceTracks: [{id: 'v', type: 'video', codec: 'vp8'}]});
  assert.ok(result);
  const input = new runtime.Input({formats: [runtime.WEBM], source: new runtime.BlobSource(result.file)});
  try {
    const track = (await input.getTracks())[0];
    assert.equal(await track.getSquarePixelWidth(), 32);
    assert.equal(await track.getSquarePixelHeight(), 16);
    assert.equal(await track.getName(), 'Authored video');
    assert.equal(await track.getLanguageCode(), 'eng');
    assert.deepEqual((await track.getDecoderConfig()).colorSpace, {primaries: 'bt709', transfer: 'bt709', matrix: 'bt709', fullRange: false});
  } finally { input.dispose(); }
});

test('finer authored WebM timing is declined when output would quantize it', async () => {
  const bytes = await webmFixture();
  // Independently edit TimestampScale from 1,000,000ns to 100,001ns. This is a
  // valid finer-resolution input whose parsed PTS cannot survive a 1ms writer.
  const tag = [42, 215, 177, 131, 15, 66, 64];
  const at = bytes.findIndex((_, index) => tag.every((value, offset) => bytes[index + offset] === value));
  assert.ok(at >= 0);
  bytes.set([1, 134, 161], at + 4);
  const file = new Blob([bytes]);
  const input = new runtime.Input({formats: [runtime.WEBM], source: new runtime.BlobSource(file)});
  try {
    const packets = [];
    for await (const packet of new runtime.EncodedPacketSink((await input.getTracks())[0]).packets()) packets.push(packet.timestamp);
    assert.ok(Math.abs(packets[1] - .0100001) < 1e-12);
  } finally { input.dispose(); }
  const prepare = createWebMVideoPreparer({load: async () => runtime});
  assert.equal(await prepare(file, {sourceTracks: [{id: 'v', type: 'video', codec: 'vp8'}]}), undefined);
});

test('abort during output verification retires both parsers and cannot publish a late file', async () => {
  const file = new Blob([await webmFixture()]);
  const controller = new AbortController(), active = new Set();
  let count = 0, resume, blocked;
  const waiting = new Promise(resolve => { blocked = resolve; });
  const configured = {...runtime,
    Input: class extends runtime.Input {
      constructor(options) { super(options); active.add(this); }
      dispose() { active.delete(this); super.dispose(); }
    },
    CustomSource: class extends runtime.CustomSource {
      constructor(options) {
        const verification = ++count === 2;
        super({...options, read: verification ? async (...args) => {
          await new Promise(resolve => { resume = resolve; blocked(); });
          return options.read(...args);
        } : options.read});
      }
    },
  };
  const prepare = createWebMVideoPreparer({load: async () => configured});
  const pending = prepare(file, {signal: controller.signal, sourceTracks: [{id: 'v', type: 'video', codec: 'vp8'}]});
  // Attach the rejection observer before dispatching cancellation.
  const rejected = assert.rejects(pending, {name: 'AbortError'});
  await waiting;
  controller.abort();
  try { await rejected; assert.equal(active.size, 0); }
  finally { resume(); }
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(active.size, 0);
});

test('unsupported or incomplete track facts acquire no runtime', async () => {
  let loads = 0;
  const prepare = createWebMVideoPreparer({load: async () => { loads++; throw new Error('Unexpected acquisition'); }});
  for (const sourceTracks of [undefined, [], [{id: '1', type: 'video', codec: 'h264'}], [{id: '1', type: 'video', codec: 'vp8', attachedPicture: true}], [{id: '1', type: 'video', codec: 'vp8'}, {id: '2', type: 'subtitle', codec: 'webvtt'}]]) {
    assert.equal(await prepare(new Blob(['fixture']), {sourceTracks}), undefined);
  }
  assert.equal(loads, 0);
});

test('pre-aborted supported profile acquires no runtime', async () => {
  const controller = new AbortController(); controller.abort();
  const prepare = createWebMVideoPreparer({load: async () => { throw new Error('Unexpected acquisition'); }});
  await assert.rejects(prepare(new Blob(['fixture']), {signal: controller.signal, sourceTracks: [{id: '1', type: 'video', codec: 'vp8'}]}), {name: 'AbortError'});
});

test('runtime acquisition failures retain original error identity', async () => {
  const error = new Error('Declared provider integrity failure');
  const prepare = createWebMVideoPreparer({load: async () => { throw error; }});
  await assert.rejects(prepare(new Blob(['fixture']), {sourceTracks: [{id: '1', type: 'video', codec: 'vp8'}]}), actual => actual === error);
});

test('transport failure is not replaced by parser cleanup failure', async () => {
  const transport = Object.assign(new Error('Source access denied'), {code: 'SOURCE_PERMISSION'}), cleanup = new Error('Parser disposal failed');
  let disposed = 0;
  const configured = {WEBM: {}, MATROSKA: {}, CustomSource: class { constructor(options) { Object.assign(this, options); } },
    Input: class { constructor({source}) { this.source = source; } async canRead() { await this.source.read(0, 1); return true; } dispose() { disposed++; throw cleanup; } }};
  const prepare = createWebMVideoPreparer({load: async () => configured});
  const file = {kind: 'bytes', size: 64, read: async () => { throw transport; }};
  await assert.rejects(prepare(file, {sourceTracks: [{id: 'v', type: 'video', codec: 'vp8'}]}), error => error === transport);
  assert.equal(disposed, 1);
});

test('cleanup failure remains terminal when unsupported preparation would otherwise decline', async () => {
  const cleanup = new Error('Parser disposal failed'); let disposed = 0;
  const configured = {WEBM: {}, MATROSKA: {}, CustomSource: class {}, Input: class { async canRead() { return false; } dispose() { disposed++; throw cleanup; } }};
  const prepare = createWebMVideoPreparer({load: async () => configured});
  await assert.rejects(prepare(new Blob(['fixture']), {sourceTracks: [{id: 'v', type: 'video', codec: 'vp8'}]}), error => error === cleanup);
  assert.equal(disposed, 1);
});

test('profile mismatch cannot conceal a parser cleanup failure', async () => {
  const cleanup = new Error('Parser disposal failed'), mismatch = Object.assign(new Error('Unsupported profile'), {code: 'PROVIDER_PROFILE_MISMATCH'});
  const configured = {WEBM: {}, MATROSKA: {}, CustomSource: class {}, Input: class { async canRead() { return true; } async getFormat() { throw mismatch; } dispose() { throw cleanup; } }};
  const prepare = createWebMVideoPreparer({load: async () => configured});
  await assert.rejects(prepare(new Blob(['fixture']), {sourceTracks: [{id: 'v', type: 'video', codec: 'vp8'}]}), error => error === cleanup);
});

test('abort keeps its original reason when parser disposal throws', async () => {
  const cleanup = new Error('Parser disposal failed'), reason = new DOMException('Source retired', 'AbortError'), controller = new AbortController();
  let started, disposed = 0; const waiting = new Promise(resolve => { started = resolve; });
  const configured = {WEBM: {}, MATROSKA: {}, CustomSource: class {}, Input: class { canRead() { started(); return new Promise(() => {}); } dispose() { disposed++; throw cleanup; } }};
  const prepare = createWebMVideoPreparer({load: async () => configured}), pending = prepare(new Blob(['fixture']), {signal: controller.signal, sourceTracks: [{id: 'v', type: 'video', codec: 'vp8'}]});
  const rejected = assert.rejects(pending, error => error === reason); await waiting; controller.abort(reason); await rejected;
  assert.equal(disposed, 1);
});
