import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const {IncrementalTransport}=await import(process.env.TRANSPORT_WEB
  ? pathToFileURL(resolve(process.env.TRANSPORT_WEB,'incremental-transport.js')).href
  : './files/web/incremental-transport.js');

const url = 'https://media.test/segment.m4s';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
function setup(t, fetcher, options = {}, limits = {}) {
  const previous = globalThis.fetch; globalThis.fetch = fetcher;
  const transport = new IncrementalTransport({url, ...options}, options.refresh,
    {absoluteMs: 2000, stallMs: 250, ...limits});
  t.after(() => {transport.close(); globalThis.fetch = previous;});
  return transport;
}
const kind = expected => error => error.kind === expected;

test('headers open before body, short reads are not EOF, and ownership is bounded', async t => {
  let controller;
  const transport = setup(t, async () => new Response(new ReadableStream({start(c) {controller = c;}})));
  const info = await transport.open(url);
  assert.equal(info.size, '-1'); assert.equal(info.seekable, false);
  let settled = false;
  const pending = transport.read(info.id, 0n, 262144).then(bytes => {settled = true; return bytes;});
  await delay(5); assert.equal(settled, false);
  controller.enqueue(Uint8Array.of(1, 2, 3));
  assert.deepEqual([...await pending], [1, 2, 3]);
  controller.enqueue(Uint8Array.of(4)); controller.close();
  assert.deepEqual([...await transport.read(info.id, 3n, 262144)], [4]);
  assert.equal((await transport.read(info.id, 4n, 262144)).length, 0);
  assert.equal(transport.stats.fetchedBytes, 4); assert.equal(transport.stats.consumedBytes, 4);
  assert.equal(transport.stats.retainedBytes, 0); assert.ok(transport.stats.peakRetainedBytes <= 3);
});

test('a segment larger than 8 MiB is consumed without materializing it', async t => {
  let remaining = 12 * 1024 * 1024, pulls = 0;
  const transport = setup(t, async () => new Response(new ReadableStream({pull(c) {
    pulls++; if (!remaining) {c.close(); return;}
    const size = Math.min(65536, remaining); remaining -= size; c.enqueue(new Uint8Array(size));
  }}, {highWaterMark: 0}), {headers: {'Content-Length': String(remaining)}}));
  const info = await transport.open(url);
  assert.equal(pulls, 0, 'open must not drain the body');
  let consumed = 0n;
  for (;;) {const bytes = await transport.read(info.id, consumed, 262144); if (!bytes.length) break; consumed += BigInt(bytes.length);}
  assert.equal(consumed, 12n * 1024n * 1024n);
  assert.equal(transport.stats.peakRetainedBytes, 65536);
});

test('backpressure leaves unread body chunks at the stream boundary', async t => {
  let pulls = 0;
  const transport = setup(t, async () => new Response(new ReadableStream({pull(c) {
    pulls++; c.enqueue(new Uint8Array(65536));
  }}, {highWaterMark: 0})));
  const info = await transport.open(url);
  assert.equal((await transport.read(info.id, 0n, 10)).length, 10);
  await delay(10); assert.equal(pulls, 1);
  assert.equal(transport.stats.retainedBytes, 65536);
  transport.closeHandle(info.id); assert.equal(transport.stats.retainedBytes, 0);
  assert.equal(transport.stats.discardedBytes, 65526);
});

test('declared truncation remains an error after earlier successful reads', async t => {
  const transport = setup(t, async () => new Response(Uint8Array.of(1, 2), {headers: {'Content-Length': '3'}}));
  const info = await transport.open(url);
  assert.equal((await transport.read(info.id, 0n, 20)).length, 2);
  await assert.rejects(transport.read(info.id, 2n, 20), kind('truncated'));
  await assert.rejects(transport.read(info.id, 2n, 20), kind('truncated'));
});

test('unknown size becomes EOF only after successful body completion', async t => {
  let controller;
  const transport = setup(t, async () => new Response(new ReadableStream({start(c) {controller = c;}})));
  const info = await transport.open(url); controller.enqueue(Uint8Array.of(1));
  await transport.read(info.id, 0n, 20); controller.error(Error('synthetic transport reset'));
  await assert.rejects(transport.read(info.id, 1n, 20), kind('io'));
});

test('empty delivered chunks do not become EOF', async t => {
  const transport = setup(t, async () => new Response(new ReadableStream({start(c) {
    c.enqueue(new Uint8Array()); c.enqueue(Uint8Array.of(8)); c.close();
  }})));
  const info = await transport.open(url);
  assert.deepEqual([...await transport.read(info.id, 0n, 20)], [8]);
  assert.equal((await transport.read(info.id, 1n, 20)).length, 0);
});

test('cancelling a pending read invalidates its handle and never satisfies the next resource', async t => {
  let cancelled = 0, first = true;
  const transport = setup(t, async () => first ? (first = false, new Response(new ReadableStream({cancel() {cancelled++;}}))) : new Response(Uint8Array.of(9)));
  const old = await transport.open(url);
  const pending = transport.read(old.id, 0n, 20);
  transport.cancelPending();
  await assert.rejects(pending, kind('cancelled'));
  const next = await transport.open(url); assert.ok(next.id > old.id);
  assert.deepEqual([...await transport.read(next.id, 0n, 20)], [9]);
  await assert.rejects(transport.read(old.id, 0n, 20), kind('cancelled'));
  assert.equal(cancelled, 1);
});

test('closing a source rejects outstanding header fetch and discards a late response', async t => {
  let resolve, began, cancelled = 0;
  const started = new Promise(r => {began = r;});
  const transport = setup(t, () => new Promise(r => {resolve = r;began();}));
  const pending = transport.open(url); await started; transport.close();
  await assert.rejects(pending, kind('cancelled'));
  resolve(new Response(new ReadableStream({cancel() {cancelled++;}})));
  await delay(5); assert.equal(cancelled, 1); assert.equal(transport.handles.size, 0);
});

test('stalled read and absolute slow trickle deadline are distinct from EOF', async t => {
  let controller;
  const transport = setup(t, async () => new Response(new ReadableStream({start(c) {controller = c;}})), {}, {stallMs: 20, absoluteMs: 80});
  const first = await transport.open(url);
  await assert.rejects(transport.read(first.id, 0n, 20), kind('timeout'));
  const next = await transport.open(url);
  let position = 0n;
  const interval = setInterval(() => {try {controller.enqueue(Uint8Array.of(1));} catch {}}, 5);
  try {
    await assert.rejects((async () => {for (;;) {const data = await transport.read(next.id, position, 20); position += BigInt(data.length);}})(), kind('timeout'));
  } finally {clearInterval(interval);}
});

test('absolute ranged offsets are preserved without advertising arbitrary seeking', async t => {
  const transport = setup(t, async (_, options) => {
    assert.equal(options.headers.get('Range'), 'bytes=100-102');
    return new Response(Uint8Array.of(1, 2, 3), {status: 206, headers: {'Content-Range': 'bytes 100-102/1000', 'Content-Length': '3'}});
  });
  const info = await transport.open(url, {start: 100n, end: 103n});
  assert.equal(info.size, '1000'); assert.equal(info.seekable, false);
  await assert.rejects(transport.read(info.id, 0n, 20), kind('range'));
  assert.equal((await transport.read(info.id, 100n, 20)).length, 3);
  assert.equal((await transport.read(info.id, 103n, 20)).length, 0);
});

test('range responses and native integer domain are checked before consumption', async t => {
  const transport = setup(t, async () => new Response(Uint8Array.of(1), {status: 200, headers: {'Content-Length': '9223372036854775808'}}));
  await assert.rejects(transport.open(url), kind('range'));
  await assert.rejects(transport.open(url, {start: 0n, end: 1n}), kind('http'));
});

test('source authorization headers do not leak to another allowed origin', async t => {
  const seen = [];
  const transport = setup(t, async (url, options) => {seen.push([url, options.headers.get('Authorization'), options.redirect]); return new Response(Uint8Array.of(1));},
    {headers: {Authorization: 'test-secret'}, allowedOrigins: ['https://media.test', 'https://cdn.test']});
  await transport.open(url); await transport.open('https://cdn.test/segment');
  assert.equal(seen[0][1], 'test-secret'); assert.equal(seen[1][1], null);
  assert.equal(seen[0][2], 'error');
  await assert.rejects(transport.open('https://other.test/file'), kind('policy'));
});

test('authentication refresh stays scoped to the original resource origin', async t => {
  let calls = 0;
  const transport = setup(t, async (_, options) => {calls++; return new Response(Uint8Array.of(1), {status: options.headers.get('Authorization') === 'updated' ? 200 : 401});},
    {refresh: async () => ({headers: {Authorization: 'updated'}})});
  const info = await transport.open(url);
  assert.equal(calls, 2); assert.equal((await transport.read(info.id, 0n, 20)).length, 1);
});

test('retryable HTTP failure is retried before any bytes are exposed', async t => {
  let calls = 0;
  const transport = setup(t, async () => new Response(Uint8Array.of(7), {status: ++calls === 1 ? 503 : 200}));
  const info = await transport.open(url);
  assert.equal(transport.stats.retries, 1);
  assert.deepEqual([...await transport.read(info.id, 0n, 20)], [7]);
});

test('handle and backing-buffer budgets are enforced and released on close', async t => {
  const transport = setup(t, async () => new Response(new Uint8Array(32)), {}, {handles: 1, chunk: 16, retained: 16});
  const info = await transport.open(url);
  await assert.rejects(transport.open(url), kind('budget'));
  await assert.rejects(transport.read(info.id, 0n, 20), kind('budget'));
  assert.equal(transport.stats.discardedBytes, 32);
  transport.closeHandle(info.id); assert.equal(transport.stats.handles, 0);
});
