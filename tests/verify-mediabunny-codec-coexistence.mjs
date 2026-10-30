// SPDX-License-Identifier: Apache-2.0
// Verify finite request isolation in a combined candidate deployment.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
const [deploymentArg, receiptPrefix] = process.argv.slice(2); assert.ok(deploymentArg && receiptPrefix);
const root = resolve(deploymentArg), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestBytes = await readFile(join(root, 'demuxe-providers.json')), manifest = JSON.parse(manifestBytes);
const codecHarness = sha(await readFile('tests/codec-preparation-candidate-player.mjs'));
const mediaHarness = sha(await readFile('packages/provider-mediabunny/test/browser-backup.mjs'));
for (const asset of manifest.assets) {const bytes = await readFile(join(root, asset.path)); assert.equal(bytes.length, asset.bytes); assert.equal(sha(bytes), asset.sha256);}
function codec(r, runtime, browser) {
  assert.equal(r.passed, true); assert.equal(r.family, browser); assert.equal(r.runtime, runtime);
  assert.equal(r.deploymentSHA256, sha(manifestBytes)); assert.equal(r.harnessSHA256, codecHarness);
  assert.equal(r.cases.length, 6); assert.ok(r.requests.length > 0);
  assert.ok(!r.requests.some(request => request.path.startsWith('/deployed/web/providers/mediabunny/')));
  for (const c of r.cases) {
    const prefix = c.id === 'dtshd-71' ? 'dts-hd' : 'truehd-mlp';
    const requests = r.requests.filter(request => request.case === c.id && request.path.startsWith('/deployed/web/providers/preparation/'));
    assert.ok(requests.length > 0);
    assert.ok(requests.every(request => request.path.startsWith(`/deployed/web/providers/preparation/${prefix}-${runtime}/`)));
    assert.deepEqual(c.wasmRequests, [`/deployed/web/providers/preparation/${prefix}-${runtime}/engine-adaptation-${runtime}/remux.wasm`]);
  }
  assert.equal(r.cancellation.reopened, true); assert.deepEqual(r.cleanup.remainingProcessIDs, []);
}
function mediabunny(r, kind, browser) {
  assert.equal(r.status, 'finite-real-backup-composition-passed-not-release'); assert.equal(r.browserEngine, browser);
  assert.equal(r.identities.harness, mediaHarness); assert.equal(r.completeMatrix, true); assert.equal(r.cases.length, 7);
  for (const c of r.cases) assert.ok(!c.deliveries.some(item => item.path.startsWith('/web/providers/preparation/')));
  const preferred = r.cases.find(c => c.name === 'preferred-mediabunny');
  const selected = kind === 'mp4' ? 'mp4.js' : 'mp4-stream.js';
  assert.deepEqual(preferred.deliveries.map(item => item.path), [`/web/providers/mediabunny/${selected}`]);
  assert.equal(preferred.ffmpegCalls, 0);
}
const json = async path => JSON.parse(await readFile(path)); let codecSample, mediaSample;
for (const runtime of ['asyncify', 'jspi']) for (const browser of ['chrome', 'firefox']) {
  const value = await json(`${receiptPrefix}-codec-${runtime}-${browser}.json`); codec(value, runtime, browser); codecSample ??= value;
}
for (const kind of ['mp4', 'stream']) for (const browser of ['chrome', 'firefox']) {
  const value = await json(`${receiptPrefix}-mediabunny-${kind}-${browser}.json`); mediabunny(value, kind, browser); mediaSample ??= value;
}
const mutations = [
  () => {const v = structuredClone(codecSample); v.requests.push({path:'/deployed/web/providers/mediabunny/mp4.js'}); assert.throws(() => codec(v, 'asyncify', 'chrome'));},
  () => {const v = structuredClone(codecSample); v.requests.push({case:v.cases[0].id,path:'/deployed/web/providers/preparation/dts-hd-asyncify/x'}); assert.throws(() => codec(v, 'asyncify', 'chrome'));},
  () => {const v = structuredClone(codecSample); v.deploymentSHA256 = 'wrong'; assert.throws(() => codec(v, 'asyncify', 'chrome'));},
  () => {const v = structuredClone(mediaSample); v.cases[2].deliveries.push({path:'/web/providers/preparation/dts-hd-jspi/x'}); assert.throws(() => mediabunny(v, 'mp4', 'chrome'));},
  () => {const v = structuredClone(mediaSample); v.cases[2].ffmpegCalls = 1; assert.throws(() => mediabunny(v, 'mp4', 'chrome'));},
];
for (const mutate of mutations) mutate();
console.log(JSON.stringify({status:'finite-combined-provider-request-isolation-verified-not-release',manifestSHA256:sha(manifestBytes),codecRuns:4,mediabunnyRuns:4,negativeControls:mutations.length}));
