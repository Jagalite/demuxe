import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const readJSON = path => JSON.parse(readFileSync(path));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const harness = digest(readFileSync(join(root, 'tests/mediabunny-format-deployment.mjs')));
const builds = readJSON('/private/tmp/demuxe-retire-format-bundles/format-delivery.json').entries;
function verify(receipt, kind, engine) {
  const deployed = `/private/tmp/demuxe-retire-deployed-${kind}`;
  const entries = readJSON(join(deployed, 'demuxe-mediabunny-format-assets.json')).entries;
  const fixture = readFileSync(join(root, 'packages/provider-mediabunny/qualification/fixtures', kind === 'mp4' ? 'avc-aac-320x240.mp4' : 'vp8-resource.webm'));
  assert.equal(receipt.status, 'selected-format-delivery-fixture-passed-not-release');
  assert.equal(receipt.kind, kind); assert.equal(receipt.browserEngine, engine);
  assert.ok(receipt.browser); assert.equal(receipt.harnessSHA256, harness);
  assert.deepEqual(receipt.fixture, { bytes: fixture.length, sha256: digest(fixture) });
  assert.deepEqual(receipt.entries, entries);
  assert.deepEqual(entries.map(x => x.name), [`inspect-${kind}`, `preview-${kind}`]);
  for (const entry of entries) {
    assert.equal(entry.path, `web/providers/mediabunny/formats/${entry.name}.js`);
    const bytes = readFileSync(join(deployed, entry.path));
    assert.equal(bytes.length, entry.bytes); assert.equal(digest(bytes), entry.sha256);
    const build = builds.find(x => x.name === entry.name);
    assert.equal(build.bytes, entry.bytes); assert.equal(build.sha256, entry.sha256);
  }
  assert.deepEqual(receipt.requests, entries.map(x => `/${x.path}`));
  assert.equal(receipt.result.status, 'partial');
  assert.deepEqual(receipt.result.completeFor, ['container']);
  assert.deepEqual(receipt.result.tracks, kind === 'mp4' ? ['video', 'audio'] : ['video']);
  assert.equal(receipt.result.bytesRead, fixture.length);
  assert.deepEqual(receipt.preview.size, [64, 48]); assert.equal(receipt.preview.time, 0.2);
  assert.equal(receipt.preview.accuracy, 'approximate'); assert.equal(receipt.preview.fidelity, 'reduced');
  const [r,g,b,a] = receipt.preview.color;
  assert.ok(r > 180 && g < 80 && b < 110 && a === 255);
}
for (const kind of ['mp4', 'webm']) for (const engine of ['chrome', 'firefox', 'webkit']) {
  verify(readJSON(`/private/tmp/demuxe-retire-format-${kind}-${engine}.json`), kind, engine);
}
const sample = readJSON('/private/tmp/demuxe-retire-format-mp4-chrome.json');
for (const mutate of [x => x.requests.shift(), x => x.preview.time = 0, x => x.fixture.sha256 = '0', x => x.entries[0].sha256 = '0', x => x.browserEngine = 'firefox']) {
  const bad = structuredClone(sample); mutate(bad); assert.throws(() => verify(bad, 'mp4', 'chrome'));
}
for (const kind of ['mp4', 'webm', 'stream']) {
  const rebuild = readJSON(`/private/tmp/demuxe-retire-rebuild-${kind}.json`);
  assert.deepEqual(rebuild.formatRebuild, builds.map(({name, bytes, sha256}) => ({name, bytes, sha256})));
}
console.log(JSON.stringify({status:'six-format-receipts-and-five-negative-controls-passed-not-release', harnessSHA256:harness, limits:'Does not independently bind all deployed core modules or establish release qualification.'}));
