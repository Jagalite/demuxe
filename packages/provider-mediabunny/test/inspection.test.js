// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createMediaBunnyInspector} from '../index.js';
// Exercise the pinned upstream Node bundle, including its real WAVE parser.
const runtime = createRequire(import.meta.url)('../node_modules/mediabunny/dist/bundles/mediabunny.node.cjs');

function wave() {
  const bytes = Buffer.alloc(2044);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(16000, 28);
  bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36); bytes.writeUInt32LE(2000, 40);
  return bytes;
}

test('real WAVE inspection preserves partial track evidence and bounded reads', async () => {
  const bytes = wave();
  let closed = 0;
  const inspect = createMediaBunnyInspector({formats: [runtime.WAVE], load: async () => runtime});
  const result = await inspect({id: 'wave-fixture', size: bytes.length, read: async (at, length) => bytes.subarray(at, at + length), ownership: 'owned', close: () => { closed++; }});
  assert.equal(result.sourceIdentity, 'wave-fixture');
  assert.equal(result.format, 'WAVE');
  assert.equal(result.status, 'partial');
  assert.deepEqual(result.completeFor, ['container']);
  assert.equal(result.tracks.length, 1);
  assert.equal(result.tracks[0].type, 'audio');
  assert.equal(result.duration, 0.125);
  assert.equal(result.chapters, null);
  assert.ok(result.reads > 0 && result.reads <= 32);
  assert.ok(result.bytesRead <= 512 * 1024);
  assert.equal(closed, 1);
});

test('real parser cannot swallow original transport failure', async () => {
  const error = new Error('source changed');
  const inspect = createMediaBunnyInspector({formats: [runtime.WAVE], load: async () => runtime});
  await assert.rejects(inspect({id: 'broken', size: 2044, read: async () => { throw error; }}), actual => actual === error);
});

test('read budget exhaustion stops further transport and is not parse success', async () => {
  let calls = 0;
  const bytes = wave();
  const inspect = createMediaBunnyInspector({formats: [runtime.WAVE], load: async () => runtime});
  await assert.rejects(inspect({id: 'budget', size: bytes.length, read: async (at, n) => { calls++; return bytes.subarray(at, at + n); }}, {maxBytes: 64, maxReads: 1}), {code: 'INSPECTION_BUDGET'});
  assert.equal(calls, 1);
});

test('pre-aborted inspection acquires no runtime and closes its owned lease', async () => {
  let loads = 0, closed = 0;
  const inspect = createMediaBunnyInspector({formats: [runtime.WAVE], load: async () => { loads++; return runtime; }});
  const controller = new AbortController(); controller.abort();
  await assert.rejects(inspect({id: 'aborted', size: 2044, read: async () => { throw new Error('Unexpected read'); }, ownership: 'owned', close: () => { closed++; }}, {signal: controller.signal}), {name: 'AbortError'});
  assert.equal(loads, 0); assert.equal(closed, 1);
});

test('inspection deadline bounds a runtime loader that never settles', async () => {
  const inspect = createMediaBunnyInspector({formats: [runtime.WAVE], load: () => new Promise(() => {})});
  await assert.rejects(inspect({id: 'loading', size: 2044, read: async () => new Uint8Array()}, {timeoutMs: 10}), {name: 'TimeoutError'});
});

test('secondary cleanup failure cannot replace a primary acquisition error', async () => {
  const primary = new Error('integrity failed');
  const inspect = createMediaBunnyInspector({formats: [runtime.WAVE], load: async () => { throw primary; }});
  await assert.rejects(inspect({id: 'owned', size: 1, ownership: 'owned', read: async () => new Uint8Array(1), close: async () => { throw new Error('close failed'); }}), error => error === primary);
});

test('inspection abort preserves its reason when parser disposal throws', async () => {
  const reason = new DOMException('Inspection retired', 'AbortError'), controller = new AbortController(); let started, disposed = 0;
  const waiting = new Promise(resolve => { started = resolve; });
  class Input { getFormat() { started(); return new Promise(() => {}); } dispose() { disposed++; throw new Error('dispose failed'); } }
  const inspect = createMediaBunnyInspector({formats: [{}], load: async () => ({Input, CustomSource: class {}})});
  const pending = inspect({id: 'source', size: 1, read: async () => new Uint8Array(1)}, {signal: controller.signal});
  const rejected = assert.rejects(pending, error => error === reason); await waiting; controller.abort(reason); await rejected;
  await new Promise(resolve => setImmediate(resolve)); assert.equal(disposed, 1);
});

test('inspection reports parser disposal failure after successful work', async () => {
  const failure = new Error('dispose failed'); let disposed = 0;
  class Input { async getFormat() { return {name: 'fixture'}; } async getTracks() { return []; } async getDurationFromMetadata() { return 1; } dispose() { disposed++; throw failure; } }
  const inspect = createMediaBunnyInspector({formats: [{}], load: async () => ({Input, CustomSource: class {}})});
  await assert.rejects(inspect({id: 'source', size: 1, read: async () => new Uint8Array(1)}), error => error === failure); assert.equal(disposed, 1);
});
