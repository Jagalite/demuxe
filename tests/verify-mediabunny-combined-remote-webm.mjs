// SPDX-License-Identifier: Apache-2.0
// Verify finite remote MP4 and local WebM request isolation in one deployment.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
const [deploymentArg, prefix] = process.argv.slice(2); assert.ok(deploymentArg && prefix);
const root = resolve(deploymentArg), sha = bytes => createHash('sha256').update(bytes).digest('hex');
const manifestBytes = await readFile(join(root, 'demuxe-providers.json')), manifest = JSON.parse(manifestBytes);
const mediaHarness = sha(await readFile('packages/provider-mediabunny/test/browser-backup.mjs'));
const webmHarness = sha(await readFile('tests/browser-mediabunny-webm-startup.mjs'));
for (const asset of manifest.assets) {const bytes = await readFile(join(root, asset.path)); assert.equal(bytes.length, asset.bytes); assert.equal(sha(bytes), asset.sha256);}
function remote(r, kind, browser) {
  assert.equal(r.status, 'finite-real-backup-composition-passed-not-release'); assert.equal(r.browserEngine, browser);
  assert.equal(r.deploymentRoot, root); assert.equal(r.remote, true); assert.equal(r.completeMatrix, true);
  assert.equal(r.identities.harness, mediaHarness); assert.equal(r.cases.length, 7);
  for (const c of r.cases) assert.ok(!c.deliveries.some(item => item.path.startsWith('/web/providers/preparation/')));
  const preferred = r.cases.find(c => c.name === 'preferred-mediabunny');
  assert.deepEqual(preferred.deliveries.map(item => item.path), [`/web/providers/mediabunny/${kind === 'mp4' ? 'mp4.js' : 'mp4-stream.js'}`]);
  assert.equal(preferred.ffmpegCalls, 0);
}
function webm(r, browser) {
  assert.equal(r.status, 'finite-packaged-webm-startup-passed-not-release'); assert.equal(r.browserEngine, browser);
  assert.equal(r.harnessSHA256, webmHarness); assert.equal(r.manifestSHA256, sha(manifestBytes));
  assert.deepEqual(r.cases.map(c => c.scenario), ['preferred', 'decline']);
  assert.ok(!r.requests.some(item => item.path.startsWith('/web/providers/preparation/')));
  const preferred = r.cases[0]; assert.deepEqual(preferred.deliveries.map(item => item.path), ['/web/providers/mediabunny/webm.js']);
  assert.equal(preferred.ffmpegCalls, 0);
  assert.ok(r.cases[1].deliveries.some(item => item.path === '/web/engine-remux/remux.wasm'));
  for (const c of r.cases) assert.equal(c.remainingWorkers, 0);
}
const json = async path => JSON.parse(await readFile(path)); let remoteSample, webmSample;
for (const kind of ['mp4', 'stream']) for (const browser of ['chrome', 'firefox']) {
  const r = await json(`${prefix}-remote-${kind}-${browser}.json`); remote(r, kind, browser); remoteSample ??= r;
}
for (const browser of ['chrome', 'firefox', 'webkit']) {const r = await json(`${prefix}-webm-${browser}.json`); webm(r, browser); webmSample ??= r;}
const mutations = [
  () => {const r = structuredClone(remoteSample); r.cases[2].deliveries.push({path:'/web/providers/preparation/dts-hd-jspi/x'}); assert.throws(() => remote(r, 'mp4', 'chrome'));},
  () => {const r = structuredClone(remoteSample); r.remote = false; assert.throws(() => remote(r, 'mp4', 'chrome'));},
  () => {const r = structuredClone(webmSample); r.requests.push({path:'/web/providers/preparation/dts-hd-jspi/x'}); assert.throws(() => webm(r, 'chrome'));},
  () => {const r = structuredClone(webmSample); r.manifestSHA256 = 'wrong'; assert.throws(() => webm(r, 'chrome'));},
  () => {const r = structuredClone(webmSample); r.cases[1].deliveries = []; assert.throws(() => webm(r, 'chrome'));},
];
for (const mutate of mutations) mutate();
console.log(JSON.stringify({status:'finite-combined-remote-webm-isolation-verified-not-release',manifestSHA256:sha(manifestBytes),remoteRuns:4,webmRuns:3,negativeControls:mutations.length}));
