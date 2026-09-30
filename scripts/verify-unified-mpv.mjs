// SPDX-License-Identifier: Apache-2.0
// Local candidate evidence only; this does not qualify a release.
import assert from 'node:assert/strict';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {verifyBundleBinding} from './bundle-evidence.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const report=JSON.parse(await readFile(process.argv[2]??'results/media-components/bundling/unified-mpv-review.json'));
assert.equal(report.releaseQualified,false);
assert.equal(report.results.length,8);
const modes=new Set();
for(const result of report.results){
 await verifyBundleBinding('build/bundle-flexibility/'+result.bundleName,result.binding);
 const file=result.item.file==='example.mp4'?'fixtures/example.mp4':'build/provider-lossless-audio/'+result.item.file;
 assert.equal(sha(await readFile(file)),result.fixtureSHA256);
 assert.deepEqual(result.seeks?.map(s=>s.target),[2,.5]);
 for(const seek of result.seeks)assert.ok(Math.abs(seek.arrival-seek.target)<=.25,'Seek missed target');
 assert.deepEqual(result.audio?.map(a=>a.stage),['initial','seek-2','seek-0.5']);
 for(const audio of result.audio){assert.ok(audio.peak>=.001,'Missing audio');if(audio.stage!=='initial')assert.ok(audio.end>=audio.start+.25,'No post-seek progression');}
 assert.equal(result.plan,result.item.plan);assert.ok(result.time>=.8);assert.equal(result.nonblack,true);assert.deepEqual(result.errors,[]);
 modes.add(result.delivery+':'+result.item.id.replace('-controlled',''));
 if(result.delivery==='embedded'){assert.equal(result.after?.disposed,true);assert.equal(result.after.workers,0);assert.equal(result.after.objectURLs,0);}
}
assert.equal(modes.size,8);
assert.equal(report.parity.length,9);assert.deepEqual(report.parityErrors,[]);
for(const row of report.parity){assert.equal(row.passed,true);assert.ok(row.pixels.mean<2);assert.ok(row.pixels.changedFraction<.02);}
const candidate=JSON.parse(await readFile(report.candidate.path));
assert.equal(candidate.identity,report.candidate.identity);assert.equal(candidate.wasmFiles.length,1);
const licenses=JSON.parse(await readFile(path.join(path.dirname(report.candidate.path),'provider/license-map.json')));
for(const extension of ['mjs','wasm'])assert.deepEqual(licenses['runtime/web/engine-mpv/player.'+extension],report.engineLicenses);
for(const [name,expected]of Object.entries(report.sources))assert.equal(sha(await readFile(name)),expected,'Evidence source changed: '+name);
const wasm=await readFile(candidate.native+'/player.wasm');assert.equal(sha(wasm),candidate.wasmFiles[0].sha256);
console.log(JSON.stringify({passed:true,playbackCases:8,imageComparisons:9,wasmBytes:wasm.length,releaseQualified:false}));
