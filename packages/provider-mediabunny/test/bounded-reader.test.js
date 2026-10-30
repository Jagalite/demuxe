// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBoundedReader} from '../bounded-reader.js';

const source = (read, extra = {}) => ({size: 100, read, ...extra});

test('concurrent reads reserve budgets before transport starts', async () => {
  let finish, calls = 0;
  const reader = createBoundedReader(source(() => { calls++; return new Promise(resolve => { finish = resolve; }); }), {maxBytes: 10});
  try {
    const pending = reader.read(0, 8);
    const rejected = assert.rejects(pending, {code: 'INSPECTION_BUDGET'});
    await Promise.resolve();
    await assert.rejects(reader.read(8, 8), {code: 'INSPECTION_BUDGET'});
    assert.equal(reader.bytesRead, 8);
    finish(new Uint8Array(8));
    await rejected;
    assert.equal(calls, 1);
  } finally { await reader.close(); }
});

test('transport errors retain their original identity', async () => {
  const error = new Error('authorization failed');
  const reader = createBoundedReader(source(async () => { throw error; }));
  try {
    await assert.rejects(reader.read(0, 1), actual => actual === error);
    assert.equal(reader.failure, error);
    await assert.rejects(reader.read(1, 1), actual => actual === error);
  } finally { await reader.close(); }
});

test('abort settles even when transport ignores signal and late bytes are discarded', async () => {
  const controller = new AbortController();
  let finish;
  const reader = createBoundedReader(source(() => new Promise(resolve => { finish = resolve; })), {signal: controller.signal});
  const pending = reader.read(0, 1);
  await Promise.resolve();
  controller.abort();
  await assert.rejects(pending, {name: 'AbortError'});
  finish(new Uint8Array(1));
  await reader.close();
});

test('owned source closes once; borrowed source stays open', async () => {
  for (const ownership of ['owned', 'borrowed']) {
    let closed = 0;
    const reader = createBoundedReader(source(async () => new Uint8Array(1), {ownership, close: () => { closed++; }}));
    await Promise.all([reader.close(), reader.close()]);
    assert.equal(closed, ownership === 'owned' ? 1 : 0);
    await assert.rejects(reader.read(0, 1), {name: 'AbortError'});
  }
});

test('short reads fail and invalid ranges never reach transport', async () => {
  let calls = 0;
  const reader = createBoundedReader(source(async () => { calls++; return new Uint8Array(); }));
  try {
    await assert.rejects(reader.read(100, 1), RangeError);
    assert.equal(calls, 0);
    await assert.rejects(reader.read(0, 1), /incomplete/);
  } finally { await reader.close(); }
});

test('deadline bounds an unresponsive source', async () => {
  const reader = createBoundedReader(source(() => new Promise(() => {})), {timeoutMs: 10});
  try { await assert.rejects(reader.read(0, 1), {name: 'TimeoutError'}); }
  finally { await reader.close(); }
});

test('abort before queued work starts does not invoke it', async () => {
  const controller = new AbortController();
  const reason = new Error('cancelled before work');
  let calls = 0;
  const reader = createBoundedReader(source(async () => new Uint8Array(1)), {signal: controller.signal});
  try {
    const pending = reader.run(() => { calls++; });
    controller.abort(reason);
    await assert.rejects(pending, error => error === reason);
    await Promise.resolve();
    assert.equal(calls, 0);
  } finally { await reader.close(); }
});

test('owned close is bounded, invoked once and shares its retained promise', async () => {
  let calls = 0;
  const reader = createBoundedReader(source(async () => new Uint8Array(1), {ownership: 'owned', close: () => { calls++; return new Promise(() => {}); }}));
  const closing = reader.close();
  assert.equal(reader.close(), closing);
  await assert.rejects(closing, {name: 'TimeoutError'});
  assert.equal(calls, 1);
  assert.equal(reader.close(), closing);
});

test('falsy source failures remain failures and retain original value', async () => {
  const reader = createBoundedReader(source(async () => { throw null; }));
  try {
    await assert.rejects(reader.read(0, 1), value => value === null);
    assert.equal(reader.hasFailure, true);
    await assert.rejects(reader.read(1, 1), value => value === null);
  } finally { await reader.close(); }
});

test('abort-handler reentry cannot duplicate owned source retirement', async () => {
  let calls=0,nested;
  const reader=createBoundedReader(source(async()=>new Uint8Array(1),{ownership:'owned',close:()=>{calls++;}}));
  reader.signal.addEventListener('abort',()=>{nested=reader.close();},{once:true});
  const closing=reader.close();
  assert.equal(nested,closing);await closing;assert.equal(calls,1);
});
