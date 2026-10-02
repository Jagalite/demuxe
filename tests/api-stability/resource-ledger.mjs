// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ResourceRegistry} from '../../web/generated/internal/effects/resources.js';

const owned = (id, scopeKey, value, release) => ({id, scopeKey, kind: 'fixture', ownership: 'owned', value, release});
function deferred() {
  let resolve;
  const promise = new Promise(yes => {resolve = yes;});
  return {promise, resolve};
}

test('owned release is immediate, idempotent and inaccessible while pending; borrowed handles are not released', async () => {
  const registry = new ResourceRegistry(), pending = deferred(), calls = [];
  const value = {secret: new Uint8Array(1024)}, borrowed = {close() {throw Error('Borrowed resource released');}};
  await registry.register(owned('owned', 'source', value, resource => {calls.push(resource); return pending.promise;}));
  await registry.register({id: 'borrowed', scopeKey: 'source', kind: 'host', ownership: 'borrowed', value: borrowed});
  assert.equal(registry.get('owned'), value);
  assert.equal(registry.get('borrowed'), borrowed);
  const first = registry.release('owned');
  assert.equal(registry.release('owned'), first);
  assert.deepEqual(calls, [value]);
  assert.throws(() => registry.get('owned'), /retired or released/);
  assert.equal(registry.diagnostics.releasing, 1);
  await registry.release('borrowed');
  assert.throws(() => registry.get('borrowed'), /retired or released/);
  pending.resolve();
  await first;
  assert.equal(registry.release('owned'), first);
  await registry.dispose();
  assert.equal(calls.length, 1);
  assert.equal(registry.diagnostics.released, 2);
});

test('scope retirement invalidates every handle before cleanup and unwinds in reverse order', async () => {
  const registry = new ResourceRegistry(), pending = deferred(), calls = [];
  assert.equal(registry.isScopeRetired('old'), false);
  assert.equal(registry.isScopeRetired('unknown'), false);
  assert.equal(registry.diagnostics.scopes, 0);
  await registry.register(owned('first', 'old', {}, () => {calls.push('first');}));
  await registry.register(owned('other', 'other', 'retained', () => {calls.push('other');}));
  await registry.register(owned('last', 'old', {}, () => {
    assert.equal(registry.isScopeRetired('old'), true);
    assert.equal(registry.isScopeRetired('other'), false);
    assert.throws(() => registry.get('first'), /retired or released/);
    assert.throws(() => registry.get('last'), /retired or released/);
    assert.equal(registry.get('other'), 'retained');
    calls.push('last');
    return pending.promise;
  }));
  const retirement = registry.retireScope('old');
  assert.equal(registry.isScopeRetired('old'), true);
  assert.equal(registry.isScopeRetired('unknown'), false);
  assert.equal(registry.retireScope('old'), retirement);
  assert.deepEqual(calls, ['last']);
  pending.resolve();
  await retirement;
  assert.deepEqual(calls, ['last', 'first']);
  assert.equal(registry.get('other'), 'retained');
  await registry.dispose();
  assert.equal(registry.isScopeRetired('unknown'), true);
  assert.deepEqual(calls, ['last', 'first', 'other']);
});

test('late registrations in retired, previously unknown and disposed scopes release immediately', async () => {
  const registry = new ResourceRegistry(), calls = [];
  await registry.retireScope('retired');
  const late = registry.register(owned('late', 'retired', 'late-value', value => {calls.push(value);}));
  assert.deepEqual(calls, ['late-value']);
  assert.throws(() => registry.get('late'), /retired or released/);
  await late;
  await registry.dispose();
  await registry.register(owned('after', 'new-after-dispose', 'after-value', value => {calls.push(value);}));
  await registry.register({id: 'borrowed', scopeKey: 'retired', kind: 'host', ownership: 'borrowed', value: {}});
  assert.deepEqual(calls, ['late-value', 'after-value']);
  assert.throws(() => registry.get('after'), /retired or released/);
  assert.throws(() => registry.get('borrowed'), /retired or released/);
  assert.equal(registry.diagnostics.active, 0);
});

test('scope cleanup attempts every resource after synchronous and asynchronous failures', async () => {
  const registry = new ResourceRegistry(), calls = [], sync = Error('sync'), async = Error('async');
  await registry.register(owned('first', 'scope', {}, () => {calls.push('first'); throw sync;}));
  await registry.register(owned('middle', 'scope', {}, () => {calls.push('middle');}));
  await registry.register(owned('last', 'scope', {}, () => {calls.push('last'); return Promise.reject(async);}));
  const retirement = registry.retireScope('scope');
  await assert.rejects(retirement, error => error instanceof AggregateError && assert.deepEqual(error.errors, [async, sync]) === undefined);
  assert.deepEqual(calls, ['last', 'middle', 'first']);
  assert.equal(registry.retireScope('scope'), retirement);
  await assert.rejects(registry.release('first'), error => error === sync);
  await assert.rejects(registry.dispose(), AggregateError);
  assert.deepEqual(calls, ['last', 'middle', 'first']);
  assert.equal(registry.diagnostics.failed, 2);
  assert.equal(registry.diagnostics.released, 1);
});

test('dispose invalidates independent scopes before callbacks and retains repeated failure completion', async () => {
  const registry = new ResourceRegistry(), calls = [];
  await registry.register(owned('a', 'one', {}, () => {calls.push('a');}));
  await registry.register(owned('b', 'two', {}, () => {
    assert.throws(() => registry.get('a'), /retired or released/);
    calls.push('b');
    throw Error('Cannot release b');
  }));
  const disposal = registry.dispose();
  assert.equal(registry.dispose(), disposal);
  await assert.rejects(disposal, AggregateError);
  assert.deepEqual(calls, ['b', 'a']);
  assert.equal(registry.dispose(), disposal);
  assert.equal(registry.diagnostics.retiredScopes, 2);
});

test('late cleanup failures remain observable and diagnostic summaries are bounded and immutable', async () => {
  const registry = new ResourceRegistry({failureLimit: 1});
  await registry.retireScope('retired');
  const sensitive = 'https://private.invalid/media?token=secret';
  const failure = Error(sensitive);
  failure.name = sensitive;
  failure.resource = {secret: true};
  for (const [id, error] of [['one', failure], ['two', sensitive]]) {
    await assert.rejects(registry.register(owned(id, 'retired', {secret: true}, () => {throw error;})), value => value === error);
    assert.equal(JSON.stringify(registry.diagnostics).includes('private.invalid'), false);
    assert.equal(JSON.stringify(registry.diagnostics).includes('secret'), false);
  }
  const diagnostics = registry.diagnostics;
  assert.equal(diagnostics.failed, 2);
  assert.equal(diagnostics.failures.length, 1);
  assert.equal(diagnostics.failures[0].id, 'two');
  assert.equal(diagnostics.failures[0].name, 'CleanupError');
  assert.equal(diagnostics.failures[0].message, 'Resource cleanup failed');
  assert.equal(JSON.stringify(diagnostics).includes('secret'), false);
  for (const entry of diagnostics.resources) assert.deepEqual(Object.keys(entry).sort(), ['id', 'kind', 'ownership', 'scopeKey', 'state']);
  assert.ok(Object.isFrozen(diagnostics));
  assert.ok(Object.isFrozen(diagnostics.resources));
  assert.ok(Object.isFrozen(diagnostics.resources[0]));
  assert.ok(Object.isFrozen(diagnostics.failures[0]));
});

test('duplicate IDs never overwrite handles or transfer ownership of the rejected value', async () => {
  const registry = new ResourceRegistry(), calls = [], first = {};
  await registry.register(owned('same', 'scope', first, () => {calls.push('accepted');}));
  const rejected = owned('same', 'different', {}, () => {calls.push('rejected');});
  assert.throws(() => registry.register(rejected), /already registered/);
  assert.equal(registry.get('same'), first);
  await registry.release('same');
  assert.throws(() => registry.register(rejected), /already registered/);
  assert.deepEqual(calls, ['accepted']);
});

test('scope-checked lookup and release cannot touch another owner resource', async () => {
  const registry = new ResourceRegistry(), value = {}, calls = [];
  await registry.register(owned('resource', 'owner-one', value, () => {calls.push('released');}));
  assert.equal(registry.get('resource', 'owner-one'), value);
  assert.throws(() => registry.get('resource', 'owner-two'), /another scope/);
  assert.throws(() => registry.get('missing', 'owner-one'), /missing/);
  await assert.rejects(registry.release('resource', 'owner-two'), /another scope/);
  await assert.rejects(registry.release('missing', 'owner-one'), /missing/);
  assert.deepEqual(calls, []);
  assert.equal(registry.get('resource', 'owner-one'), value);
  await registry.retireScope('owner-one');
  await registry.release('resource', 'owner-one');
  await assert.rejects(registry.release('resource', 'owner-two'), /another scope/);
  assert.deepEqual(calls, ['released']);
});

test('lifetime resource and scope capacity rejects before ownership transfer', async () => {
  const resources = new ResourceRegistry({maxResources: 1}), calls = [];
  await resources.register(owned('first', 'scope', {}, () => {calls.push('first');}));
  await resources.release('first');
  assert.throws(() => resources.register(owned('rejected', 'scope', {}, () => {calls.push('rejected');})), /resource capacity/);
  const scopes = new ResourceRegistry({maxScopes: 1});
  await scopes.retireScope('retired');
  assert.throws(() => scopes.register(owned('new', 'new-scope', {}, () => {calls.push('new');})), /scope capacity/);
  assert.throws(() => scopes.retireScope('another-scope'), /scope capacity/);
  assert.equal(scopes.diagnostics.registered, 0);
  await scopes.register(owned('late', 'retired', {}, () => {calls.push('late');}));
  await resources.dispose();
  await scopes.dispose();
  assert.deepEqual(calls, ['first', 'late']);
});

test('reentrant release uses the existing completion and retirement covers a pending release', async () => {
  const registry = new ResourceRegistry(), pending = deferred();
  let nested;
  await registry.register(owned('resource', 'scope', {}, () => {
    nested = registry.release('resource');
    return pending.promise;
  }));
  const release = registry.release('resource');
  assert.equal(nested, release);
  const retirement = registry.retireScope('scope');
  let finished = false;
  void retirement.then(() => {finished = true;});
  await Promise.resolve();
  assert.equal(finished, false);
  pending.resolve();
  await retirement;
  assert.equal(registry.diagnostics.released, 1);
});

test('invalid ownership and limits do not invoke host callbacks or accept records', () => {
  for (const options of [{maxResources: 0}, {maxScopes: -1}, {failureLimit: -1}, {maxResources: Infinity}, {maxScopes: 1.5}]) {
    assert.throws(() => new ResourceRegistry(options), RangeError);
  }
  const registry = new ResourceRegistry();
  assert.throws(() => registry.register({id: 'r', scopeKey: 's', kind: 'k', value: {}, ownership: 'borrowed', release() {throw Error('Called');}}), /Borrowed/);
  assert.throws(() => registry.register({id: 'r', scopeKey: 's', kind: 'k', value: {}, ownership: 'owned'}), /release callback/);
  assert.equal(registry.diagnostics.registered, 0);
});
