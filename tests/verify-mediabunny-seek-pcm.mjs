// SPDX-License-Identifier: Apache-2.0
// Verify packet and post-preroll PCM equivalence after a finite worker seek.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {build} from 'esbuild';
const [receiptPath,deploymentPath]=process.argv.slice(2);if(!deploymentPath)throw Error('Pass receipt and deployment');
const root=resolve(deploymentPath),hash=x=>createHash('sha256').update(x).digest('hex'),manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes),receipt=JSON.parse(await readFile(receiptPath));
const fixture=await readFile(new URL('../packages/provider-mediabunny/qualification/fixtures/avc-aac-320x240.mp4',import.meta.url)),asset=manifest.assets.find(x=>x.path==='web/providers/mediabunny/mp4-stream.js');assert.ok(asset);
const worker=await readFile(join(root,asset.path));assert.equal(worker.length,asset.bytes);assert.equal(hash(worker),asset.sha256);
const harness=hash(await readFile(new URL('./browser-mediabunny-seek-pcm.mjs',import.meta.url))),packageRoot=resolve('packages/provider-mediabunny'),library=await build({entryPoints:[join(packageRoot,'node_modules/mediabunny/dist/modules/src/index.js')],bundle:true,platform:'browser',format:'esm',write:false});
function verify(value){
 assert.equal(value.status,'finite-seek-worker-packet-pcm-passed-not-mse');assert.ok(['webkit','chrome'].includes(value.browserEngine));assert.ok(value.browser);assert.equal(value.target,1.25);assert.equal(value.harnessSHA256,harness);assert.equal(value.manifestSHA256,hash(manifestBytes));assert.equal(value.fixtureSHA256,hash(fixture));assert.equal(value.workerSHA256,asset.sha256);assert.equal(value.librarySHA256,hash(library.outputFiles[0].contents));
 const r=value.result;assert.ok(r.workerRetired&&r.fragments>0&&r.outputBytes>0);assert.match(r.outputSHA256,/^[a-f0-9]{64}$/);assert.deepEqual(r.sourceTracks.map(x=>x.type),['audio','video']);assert.deepEqual(r.tracks.map(x=>x.type),['audio','video']);
 for(let i=0;i<2;i++){
  const source=r.sourceTracks[i],output=r.tracks[i],start=source.packets.findIndex(x=>x.time===output.packets[0]?.time);assert.ok(start>=0);assert.equal(output.codec,source.codec);assert.deepEqual(output.description,source.description);assert.deepEqual(output.packets,source.packets.slice(start));
  assert.ok(output.packets.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));const compared=r.comparisons.find(x=>x.type===output.type);assert.equal(compared.start,start);assert.ok(compared.packetsMatch&&compared.configurationMatch&&compared.pcmAfterPrerollMatch);
  if(output.type==='audio'){assert.equal(start,45);assert.equal(source.packets.length,150);assert.equal(output.packets.length,105);assert.equal(output.frames,107520);assert.equal(output.pcm.length,210);assert.deepEqual(output.pcm.slice(2),source.pcm.slice((start+1)*2));assert.ok(output.audioSignal[0].rms>.01&&output.audioSignal[0].tone440>2*output.audioSignal[0].tone660);assert.ok(output.audioSignal[1].rms>.01&&output.audioSignal[1].tone660>2*output.audioSignal[1].tone440);}
  else{assert.equal(start,10);assert.equal(source.packets.length,30);assert.equal(output.packets.length,20);assert.equal(output.packets[0].type,'key');assert.equal(output.packets[0].time,1);}
 }
 assert.ok(r.tracks[0].packets[0].time<r.tracks[1].packets[0].time);
}
verify(receipt);
const mutations=[v=>{v.result.tracks[0].pcm[3]='0'.repeat(64);},v=>{v.result.tracks[0].packets.pop();},v=>{v.result.tracks[0].audioSignal[0].rms=0;},v=>{v.result.tracks[1].packets[0].type='delta';},v=>{v.target=0;},v=>{v.workerSHA256='wrong';},v=>{v.fixtureSHA256='wrong';}];
for(const mutate of mutations){const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>verify(changed));}
console.log(JSON.stringify({status:'finite-seek-worker-packet-pcm-verified-not-mse',browser:receipt.browser,target:receipt.target,audioPackets:105,decodedFrames:107520,pcmFramesComparedAfterPreroll:106496,videoPackets:20,negativeControls:mutations.length}));
