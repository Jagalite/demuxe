// SPDX-License-Identifier: Apache-2.0
// Verify the finite installed WebM direct-color comparison; not release qualification.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, join, sep} from 'node:path';
import {build} from 'esbuild';
const [receiptPath, consumerArg, candidateArg, fixtureArg] = process.argv.slice(2);
assert.ok(receiptPath && consumerArg && candidateArg);
const repo = process.cwd(), consumer = resolve(consumerArg), candidate = resolve(candidateArg);
const core = join(consumer, 'node_modules/demuxe'), pkg = join(repo, 'packages/provider-mediabunny');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const r = JSON.parse(await readFile(receiptPath)), manifest = JSON.parse(await readFile(join(candidate, 'demuxe-mediabunny-candidate.json')));
const fixture = await readFile(fixtureArg ? resolve(fixtureArg) : join(pkg, 'qualification/fixtures/vp8-resource.webm'));
const worker = await readFile(join(candidate, manifest.assets[0].path));
assert.equal(sha(worker), manifest.assets[0].sha256);
const app = await build({absWorkingDir: pkg, stdin: {contents: "export {Player,DemuxeRuntime,inspectMedia} from 'demuxe';", resolveDir: consumer}, bundle: true, format: 'esm', platform: 'browser', write: false, metafile: true});
const inputs = {};
for (const path of Object.keys(app.metafile.inputs).filter(path => !path.startsWith('<'))) {
  const file = resolve(pkg, path); assert.ok(file.startsWith(core + sep)); inputs[path] = sha(await readFile(file));
}
const format = {};
for (const owner of ['inspect', 'preview']) {
  const built = await build({absWorkingDir: pkg, stdin: {contents: `export * from '@demuxe/provider-mediabunny/${owner}/webm';`, resolveDir: consumer}, bundle: true, format: 'esm', platform: 'browser', write: false});
  const bytes = built.outputFiles[0].contents; format['/format-' + owner + '.js'] = {bytes: bytes.length, sha256: sha(bytes)};
}
const harness = sha(await readFile(join(pkg, 'test/browser-public.mjs')));
function verify(value) {
  assert.equal(value.status, 'public-player-direct-frame-comparison-passed-not-release');
  assert.equal(value.browserEngine, 'firefox'); assert.ok(value.browser);
  assert.deepEqual(value.fixture, {sha256: sha(fixture), bytes: fixture.length, origin: 'external-encoded-bytes'});
  assert.equal(value.identities.harness, harness); assert.equal(value.identities.provider, manifest.providers[0].implementationIdentity);
  assert.equal(value.identities.worker, sha(worker)); assert.equal(value.identities.presenter, 'sha256:' + sha(app.outputFiles[0].contents));
  assert.deepEqual(value.identities.installedCoreInputs, inputs); assert.ok(Object.keys(inputs).length > 100);
  assert.deepEqual(value.identities.formatDelivery, format);
  const c = value.checks; assert.equal(c.container, 'webm'); assert.equal(c.remote, false); assert.equal(c.av, false);
  assert.equal(c.directControlPolicy, 'startupEscalation:false'); assert.equal(c.directAcquired, false); assert.equal(c.plan, 'native-remux');
  assert.equal(c.directColor.length, 4); assert.equal(c.directColor[3], 255); assert.ok(c.directColor[0] >= 100);
  assert.ok(c.color.every((v, i) => Math.abs(v - c.directColor[i]) <= 3)); assert.ok(c.freshFrame > 1.25);
  const playback = c.playbackFrameComparison, preview = c.preview;
  assert.equal(playback.width, 64); assert.equal(playback.height, 48); assert.equal(playback.tolerance, 3);
  assert.equal(playback.channelsOverTolerance, 0); assert.ok(playback.maxChannelDifference <= 3);
  assert.ok(Math.abs(playback.directFrameTime - playback.preparedFrameTime) <= .001);
  assert.equal(preview.frameComparison.width, 32); assert.equal(preview.frameComparison.height, 24);
  assert.equal(preview.frameComparison.tolerance, 3); assert.equal(preview.frameComparison.channelsOverTolerance, 0);
  assert.ok(preview.frameComparison.maxChannelDifference <= 3);
  assert.ok(Math.abs(preview.frameComparison.directFrameTime - preview.frameComparison.previewFrameTime) <= .001);
  assert.equal(preview.exactRequestDeclined, true); assert.equal(preview.temporalAccuracy, 'approximate');
  for (const key of ['deferredDuringPlayback', 'resumedAfterPause', 'sourceReplacement', 'lateReadDiscarded']) assert.equal(preview[key], true);
  assert.ok(preview.decodersCreated > 0); assert.equal(preview.remainingDecoders, 0);
  assert.equal(c.cancelledDuringPreparation, true); assert.equal(c.remainingWorkers, 0); assert.equal(c.remainingURLs, 0);
  assert.equal(c.lifecycle.originalSourceRetired, true); assert.equal(c.lifecycle.replacementAfterCancelledPreparation, true);
  assert.ok(c.lifecycle.peerProgressAfterOtherClose > c.lifecycle.concurrentFrames[1]);
  assert.equal(value.requests.worker, 1); assert.deepEqual(value.requests.forbidden, []);
}
verify(r);
const mutations = [v => v.checks.color[1] += 10, v => v.checks.directColor[3] = 0, v => v.identities.worker = 'wrong', v => v.checks.remainingWorkers = 1, v => v.checks.lifecycle.originalSourceRetired = false, v => v.checks.playbackFrameComparison.channelsOverTolerance = 1, v => v.checks.preview.frameComparison.directFrameTime += .1, v => v.checks.preview.remainingDecoders = 1];
for (const mutate of mutations) {const copy = structuredClone(r); mutate(copy); assert.throws(() => verify(copy));}
console.log(JSON.stringify({status: 'finite-webm-direct-comparison-verified-not-release', coreInputs: Object.keys(inputs).length, negativeControls: mutations.length}));
