// SPDX-License-Identifier: Apache-2.0
// Verify six finite selected-format observations against two composed deployments.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, join} from 'node:path';
const [prefix, formatArg, inventoryArg] = process.argv.slice(2);
assert.ok(prefix && formatArg && inventoryArg, 'Pass receipt/deployment prefix, format build and core inventory');
const repo = process.cwd(), root = resolve(prefix), format = resolve(formatArg), hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async path => JSON.parse(await readFile(path));
const builds = (await json(join(format, 'format-delivery.json'))).entries;
const inventory = await json(resolve(inventoryArg));
const harness = hash(await readFile(join(repo, 'tests/mediabunny-format-deployment.mjs')));
const fixtures = {};
for (const kind of ['mp4', 'webm']) fixtures[kind] = await readFile(join(repo, 'packages/provider-mediabunny/qualification/fixtures', kind === 'mp4' ? 'avc-aac-320x240.mp4' : 'vp8-pattern-changing.webm'));
const deployments = {};
for (const kind of ['mp4', 'webm']) {
  const dir = root + '-format-' + kind, entries = (await json(join(dir, 'demuxe-mediabunny-format-assets.json'))).entries;
  assert.deepEqual(entries.map(entry => entry.name), ['inspect-' + kind, 'preview-' + kind]);
  for (const [path, fact] of Object.entries(inventory.files)) assert.equal(hash(await readFile(join(dir, path))), fact.sha256);
  for (const entry of entries) {
    const bytes = await readFile(join(dir, entry.path)), source = builds.find(item => item.name === entry.name);
    assert.equal(entry.path, 'web/providers/mediabunny/formats/' + entry.name + '.js');
    assert.equal(hash(bytes), entry.sha256); assert.equal(bytes.length, entry.bytes);
    assert.equal(source.sha256, entry.sha256); assert.equal(source.bytes, entry.bytes);
  }
  const other = kind === 'mp4' ? 'webm' : 'mp4';
  for (const owner of ['inspect', 'preview']) await assert.rejects(readFile(join(dir, `web/providers/mediabunny/formats/${owner}-${other}.js`)), {code: 'ENOENT'});
  deployments[kind] = entries;
}
function verify(r, kind, browser) {
  assert.equal(r.status, 'selected-format-delivery-fixture-passed-not-release'); assert.equal(r.kind, kind); assert.equal(r.browserEngine, browser); assert.ok(r.browser);
  assert.equal(r.harnessSHA256, harness); assert.deepEqual(r.fixture, {bytes: fixtures[kind].length, sha256: hash(fixtures[kind])});
  assert.deepEqual(r.entries, deployments[kind]); assert.deepEqual(r.requests, deployments[kind].map(entry => '/' + entry.path));
  assert.equal(r.result.status, 'partial'); assert.deepEqual(r.result.completeFor, ['container']);
  assert.deepEqual(r.result.tracks, kind === 'mp4' ? ['video', 'audio'] : ['video']);
  assert.ok(r.result.bytesRead > 0 && r.result.bytesRead <= fixtures[kind].length);
  assert.deepEqual(r.preview.size, [64, 48]); assert.ok(Math.abs(r.preview.time - .2) < .001);
  assert.equal(r.preview.accuracy, 'approximate'); assert.equal(r.preview.fidelity, 'reduced');
  const [red, green, blue, alpha] = r.preview.color; assert.ok(red > 180 && green < 80 && blue < 110 && alpha === 255);
}
let sample;
for (const kind of ['mp4', 'webm']) for (const browser of ['chrome', 'firefox', 'webkit']) {
  const receipt = await json(root + `-format-${kind}-${browser}.json`); verify(receipt, kind, browser);
  if (!sample) sample = receipt;
}
const mutations = [r => r.requests.shift(), r => r.preview.time = 0, r => r.fixture.sha256 = 'wrong', r => r.entries[0].sha256 = 'wrong', r => r.browserEngine = 'firefox', r => r.result.completeFor.push('tracks')];
for (const mutate of mutations) {const copy = structuredClone(sample); mutate(copy); assert.throws(() => verify(copy, 'mp4', 'chrome'));}
console.log(JSON.stringify({status: 'six-selected-format-observations-verified-not-release', coreFilesPerDeployment: Object.keys(inventory.files).length, negativeControls: mutations.length}));
