// SPDX-License-Identifier: Apache-2.0
// Verify finite original-error and cancellation observations in format bundles.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
const [prefixArg, rebuildArg] = process.argv.slice(2);
assert.ok(prefixArg && rebuildArg, 'Pass deployment/receipt prefix and preferred-source rebuild receipt');
const prefix = resolve(prefixArg), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async path => JSON.parse(await readFile(path));
const rebuild = await json(resolve(rebuildArg));
assert.equal(rebuild.status, 'preferred-typescript-worker-rebuild-passed-not-release');
const harness = sha(await readFile('tests/mediabunny-preview-source-failure.mjs'));
const expected = {};
for (const kind of ['mp4', 'webm']) {
  const root = prefix + '-format-' + kind, manifest = await json(join(root, 'demuxe-mediabunny-format-assets.json'));
  const entry = manifest.entries.find(x => x.name === 'preview-' + kind); assert.ok(entry);
  const bytes = await readFile(join(root, entry.path)), built = rebuild.formatRebuild.find(x => x.name === entry.name);
  assert.equal(bytes.length, entry.bytes); assert.equal(sha(bytes), entry.sha256);
  assert.equal(built.bytes, entry.bytes); assert.equal(built.sha256, entry.sha256);
  const fixture = await readFile(join('packages/provider-mediabunny/qualification/fixtures', kind === 'mp4' ? 'avc-aac-320x240.mp4' : 'vp8-pattern-changing.webm'));
  expected[kind] = {entry, fixture: {bytes: fixture.length, sha256: sha(fixture)}};
}
function verify(r, kind, engine) {
  assert.equal(r.status, 'preview-source-failure-browser-passed-not-release');
  assert.equal(r.kind, kind); assert.equal(r.browserEngine, engine); assert.ok(r.browser);
  assert.equal(r.harnessSHA256, harness); assert.deepEqual(r.fixture, expected[kind].fixture); assert.deepEqual(r.entry, expected[kind].entry);
  for (const mode of ['transport', 'abort']) {
    const value = r.observed[mode]; assert.equal(value.resolved, false); assert.equal(value.same, true);
    assert.ok(value.reads > 0); assert.equal(value.closes, 1);
  }
  assert.equal(r.observed.transport.message, 'original transport failure'); assert.equal(r.observed.abort.name, 'AbortError');
}
let sample;
for (const kind of ['mp4', 'webm']) for (const engine of ['chrome', 'firefox', 'webkit']) {
  const receipt = await json(prefix + `-preview-failure-${kind}-${engine}.json`); verify(receipt, kind, engine); sample ??= receipt;
}
const mutations = [r => r.observed.transport.same = false, r => r.observed.abort.name = 'Error', r => r.observed.abort.closes = 2, r => r.entry.sha256 = 'wrong', r => r.fixture.sha256 = 'wrong', r => r.browserEngine = 'firefox'];
for (const mutate of mutations) {const altered = structuredClone(sample); mutate(altered); assert.throws(() => verify(altered, 'mp4', 'chrome'));}
console.log(JSON.stringify({status:'six-preview-error-observations-verified-not-release',negativeControls:mutations.length}));
