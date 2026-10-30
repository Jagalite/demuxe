// SPDX-License-Identifier: Apache-2.0
// Verify finite real-File candidate playback receipts, including partial failures.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const [receiptArg, setupArg, fixtureManifestArg, coreInventoryArg] = process.argv.slice(2);
assert.ok(receiptArg && setupArg && fixtureManifestArg && coreInventoryArg);
const json = async path => JSON.parse(await readFile(path));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const r = await json(receiptArg), setup = await json(setupArg), fixtureBytes = await readFile(fixtureManifestArg), fixtures = JSON.parse(fixtureBytes);
const manifestBytes = await readFile(join(setup.work, 'deployed/demuxe-providers.json')), manifest = JSON.parse(manifestBytes), inventory = await json(coreInventoryArg);
const harness = sha(await readFile('tests/codec-preparation-candidate-real-player.mjs'));
assert.equal(sha(await readFile(setup.archives[0].archive)), setup.archives[0].archiveSHA256);
for (const [path, fact] of Object.entries(inventory.files)) assert.equal(sha(await readFile(join(setup.work, 'deployed', path))), fact.sha256);
for (const asset of manifest.assets) {const bytes=await readFile(join(setup.work,'deployed',asset.path)); assert.equal(bytes.length,asset.bytes); assert.equal(sha(bytes),asset.sha256);}
assert.equal(fixtures.cases.length, 5);
for (const fixture of fixtures.cases) {const bytes=await readFile(fixture.file); assert.equal(bytes.length,fixture.bytes); assert.equal(sha(bytes),fixture.sha256);}
function verify(value) {
  assert.ok(['chrome','firefox'].includes(value.family)); assert.ok(['asyncify','jspi'].includes(setup.runtime)); assert.equal(value.runtime,setup.runtime);
  assert.equal(value.harnessSHA256,harness); assert.equal(value.deploymentSHA256,sha(manifestBytes)); assert.equal(value.fixtureManifestSHA256,sha(fixtureBytes)); assert.deepEqual(value.setup,setup);
  const expected = value.family === 'chrome' ? 5 : 3;
  assert.equal(value.passed, value.family === 'chrome'); assert.equal(value.cases.length,expected);
  assert.deepEqual(value.cases.map(c=>c.id),fixtures.cases.slice(0,expected).map(f=>f.id));
  for (const [i,c] of value.cases.entries()) {
    const f=fixtures.cases[i]; assert.equal(c.sourceSHA256,f.sha256); assert.equal(c.played,true); assert.equal(c.nonblack,true);
    assert.equal(c.explanation.planId,'native-transcode'); assert.ok(c.seekTime>0);
    const providers=f.multipleAudio?['truehd-mlp','dts-hd']:[f.profile];
    assert.deepEqual(c.wasmRequests,[...providers].map(p=>`/deployed/web/providers/preparation/${p}-${setup.runtime}/engine-adaptation-${setup.runtime}/remux.wasm`).sort());
    if(f.large){const s=c.diagnostics.backend.remux.source;assert.ok(s.peakActiveBytes<=262144 && s.peakOwnedBytes<=524288 && s.fetchedBytes<f.bytes/2);}
  }
  if(value.family==='firefox')assert.match(value.error,/No available deployment satisfies the remaining playback candidates/);
  else {assert.ok(!value.error);assert.ok(!value.requests.some(x=>x.path.startsWith('/deployed/web/providers/mediabunny/')));}
  assert.ok(!value.cleanupError);assert.deepEqual(value.cleanup.remainingProcessIDs,[]);
}
verify(r);
const mutations=[v=>v.cases.pop(),v=>v.cases[0].sourceSHA256='wrong',v=>v.cases[0].played=false,v=>v.cases[1].diagnostics.backend.remux.source.peakOwnedBytes=999999,v=>v.deploymentSHA256='wrong'];
for(const mutate of mutations){const copy=structuredClone(r);mutate(copy);assert.throws(()=>verify(copy));}
console.log(JSON.stringify({status:'finite-real-file-candidate-receipt-verified-not-release',browser:r.family,runtime:r.runtime,passed:r.passed,cases:r.cases.length,coreFiles:Object.keys(inventory.files).length,negativeControls:mutations.length}));
