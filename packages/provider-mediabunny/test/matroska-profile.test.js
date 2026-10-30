// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBoundedReader} from '../bounded-reader.js';
import {inspectMatroskaPacketProfile} from '../matroska-profile.js';
import {matroskaFixture} from './matroska-fixture.js';

function fixture() {
  return matroskaFixture([{data: new Uint8Array([1, 2, 3, 4]), type: 'key', timestamp: 0, duration: .05}, {data: new Uint8Array([5, 6, 7, 8]), type: 'delta', timestamp: .1, duration: .05}], {width: 16, height: 16});
}
async function inspect(bytes, options) {
  const reader = createBoundedReader({size: bytes.length, read: async (at, length) => bytes.slice(at, at + length)}, {maxReads: 4096, ...options});
  try { return await reader.run(() => inspectMatroskaPacketProfile(reader)); }
  finally { await reader.close(); }
}

test('source envelope retains explicit duration and key/delta truth before packet API normalization', async () => {
  assert.deepEqual(await inspect(fixture()), [{timestamp: 0, duration: .05, size: 4, type: 'key'}, {timestamp: .1, duration: .05, size: 4, type: 'delta'}]);
});

test('laced and invisible blocks cannot enter the single-packet copy profile', async () => {
  for (const flag of [2, 4, 8]) {
    const bytes = fixture();
    const prefix = [0xa1, 0x88, 0x81, 0, 0, 0, 1, 2, 3, 4];
    const at = bytes.findIndex((_, index) => prefix.every((value, offset) => bytes[index + offset] === value));
    assert.ok(at >= 0);
    bytes[at + 5] = flag;
    await assert.rejects(inspect(bytes), {code: 'PROVIDER_PROFILE_MISMATCH'});
  }
});

test('truncated or overlong EBML elements decline without out-of-range reads', async () => {
  for (const bytes of [new Uint8Array([0x1a]), new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0xfe, 0]), new Uint8Array([0, 0, 0, 0])]) await assert.rejects(inspect(bytes), {code: 'PROVIDER_PROFILE_MISMATCH'});
});

test('source envelope obeys the existing read budget and cancellation', async () => {
  await assert.rejects(inspect(fixture(), {maxReads: 1}), {code: 'INSPECTION_BUDGET'});
  const controller = new AbortController(); controller.abort();
  await assert.rejects(inspect(fixture(), {signal: controller.signal}), {name: 'AbortError'});
});
