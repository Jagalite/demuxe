// SPDX-License-Identifier: Apache-2.0
// Check finite independent-MOV preview receipts; not a release gate.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const sha=data=>createHash('sha256').update(data).digest('hex');
const fixture=await readFile('tests/fixtures/mediabunny-independent-avc-red.mov');
const harness=await readFile('tests/mediabunny-independent-preview.mjs');
const bundle=await build({stdin:{contents:"export {PreviewController} from './src/preview/controller.ts';export {createMediaBunnyPreviewProvider} from './packages/provider-mediabunny/preview-mp4.js';",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',write:false});
function verify(r,family){
 assert.equal(r.status,'independent-preview-passed-not-release');assert.equal(r.family,family);
 assert.equal(r.fixtureSHA256,sha(fixture));assert.equal(r.fixtureBytes,fixture.length);
 assert.equal(r.harnessSHA256,sha(harness));assert.equal(r.bundleSHA256,sha(bundle.outputFiles[0].contents));
 const o=r.observation;assert.equal(o.exactDeclined,true);assert.ok(Math.abs(o.actualTime-.2)<.002);
 assert.equal(o.temporalAccuracy,'approximate');assert.equal(o.fidelity,'reduced');
 assert.ok(o.pixel[0]>170&&o.pixel[1]<100&&o.pixel[2]<130);assert.ok(o.reads>0);
 assert.equal(o.closedBeforeDestroy,2);assert.equal(o.closedAfterDestroy,2);
 assert.equal(o.diagnostics.cacheEntries,0);assert.equal(o.diagnostics.active,false);assert.equal(o.diagnostics.pending,false);
 assert.equal(r.cleanup.playwrightCloseAcknowledged,true);if(family!=='webkit')assert.deepEqual(r.cleanup.remainingProcessIDs,[]);
 assert.ok(!r.cleanupError);
}
const results=[];let controls=0;
for(const family of ['chrome','firefox','webkit']){
 const raw=await readFile(`packages/provider-mediabunny/qualification/reader-independent-preview-${family}.json`),r=JSON.parse(raw);verify(r,family);
 results.push({family,browser:r.browser,actualTime:r.observation.actualTime,pixel:r.observation.pixel,receiptSHA256:sha(raw)});
 for(const mutate of [v=>v.fixtureSHA256='wrong',v=>v.observation.closedAfterDestroy=1,v=>v.observation.actualTime=1]){
  const bad=structuredClone(r);mutate(bad);assert.throws(()=>verify(bad,family));controls++;
 }
}
console.log(JSON.stringify({status:'independent-avc-mov-preview-passed-not-release',fixtureSHA256:sha(fixture),fixtureBytes:fixture.length,bundleSHA256:sha(bundle.outputFiles[0].contents),harnessSHA256:sha(harness),results,negativeControls:controls,limits:['Synthetic constant-color FFmpeg-authored MOV and test bundle; no format-delivery, production or general MOV qualification.','WebKit process census not established by the available close helper.','Initial runs used the default one-second preview bucket and failed the test assumption; retained separately.']},null,2));
