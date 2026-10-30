// SPDX-License-Identifier: Apache-2.0
// Verify finite test-owned codec candidate playback; never a release gate.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
const [receiptArg, setupArg, hostArg, coreInventoryArg] = process.argv.slice(2);
assert.ok(receiptArg && setupArg && hostArg && coreInventoryArg);
const json = async path => JSON.parse(await readFile(path));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const r = await json(receiptArg), setup = await json(setupArg), hostBytes = await readFile(hostArg), host = JSON.parse(hostBytes);
const manifestBytes = await readFile(join(setup.work, 'deployed/demuxe-providers.json')), manifest = JSON.parse(manifestBytes);
const inventory = await json(coreInventoryArg), harness = sha(await readFile('tests/codec-preparation-candidate-player.mjs'));
const coreArchive = await readFile(setup.archives[0].archive); assert.equal(sha(coreArchive), setup.archives[0].archiveSHA256);
for (const [path, fact] of Object.entries(inventory.files)) assert.equal(sha(await readFile(join(setup.work, 'deployed', path))), fact.sha256);
for (const asset of manifest.assets) {const bytes = await readFile(join(setup.work, 'deployed', asset.path)); assert.equal(bytes.length, asset.bytes); assert.equal(sha(bytes), asset.sha256);}
assert.equal(host.passed, true); assert.equal(host.results.length, 6);
for (const f of host.results) assert.equal(sha(await readFile(join('build/provider-lossless-audio', f.id + '.mkv'))), f.sourceSHA256);
function verify(value) {
  assert.equal(value.passed, true); assert.ok(['chrome', 'firefox'].includes(value.family)); assert.ok(['asyncify', 'jspi'].includes(setup.runtime)); assert.equal(value.runtime, setup.runtime);
  assert.equal(value.harnessSHA256, harness); assert.equal(value.deploymentSHA256, sha(manifestBytes)); assert.equal(value.hostSHA256, sha(hostBytes));
  assert.deepEqual(value.setup, setup); assert.equal(value.cases.length, 6);
  assert.deepEqual(value.cases.map(c => c.id), host.results.map(f => f.id));
  for (const [i, c] of value.cases.entries()) {
    const f = host.results[i], profile = f.codec === 'dts-hd' ? 'dts-hd' : 'truehd-mlp';
    assert.equal(c.sourceSHA256, f.sourceSHA256); assert.equal(c.played, true); assert.equal(c.nonblack, true);
    assert.equal(c.explanation.planId, 'native-transcode'); assert.ok(c.seekTime > 0);
    assert.deepEqual(c.wasmRequests, [`/deployed/web/providers/preparation/${profile}-${setup.runtime}/engine-adaptation-${setup.runtime}/remux.wasm`]);
  }
  assert.equal(value.cancellation.code, 'ABORTED'); assert.equal(value.cancellation.reopened, true); assert.equal(value.cancellation.destroyed, true);
  assert.deepEqual(value.cleanup.remainingProcessIDs, []); assert.ok(!value.error && !value.cleanupError);
}
verify(r);
const mutations = [v => v.cases.pop(), v => v.cases[0].sourceSHA256 = 'wrong', v => v.cases[0].played = false, v => v.cases[0].wasmRequests = [], v => v.cancellation.reopened = false, v => v.deploymentSHA256 = 'wrong'];
for (const mutate of mutations) {const altered = structuredClone(r); mutate(altered); assert.throws(() => verify(altered));}
console.log(JSON.stringify({status:'finite-codec-candidate-player-verified-not-release',browser:r.family,coreFiles:Object.keys(inventory.files).length,negativeControls:mutations.length}));
