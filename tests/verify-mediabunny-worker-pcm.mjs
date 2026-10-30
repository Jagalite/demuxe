// SPDX-License-Identifier: Apache-2.0
// Check recorded worker packet and WebCodecs PCM equivalence, not MSE output.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {build} from 'esbuild';
const [receiptPath,deploymentPath]=process.argv.slice(2);if(!deploymentPath)throw Error('Pass receipt and deployment');
const root=resolve(deploymentPath),hash=x=>createHash('sha256').update(x).digest('hex'),manifestBytes=await readFile(join(root,'demuxe-providers.json')),manifest=JSON.parse(manifestBytes),receipt=JSON.parse(await readFile(receiptPath));
const fixture=await readFile(new URL('../packages/provider-mediabunny/qualification/fixtures/avc-aac-320x240.mp4',import.meta.url)),workerAsset=manifest.assets.find(x=>x.path==='web/providers/mediabunny/mp4-stream.js');assert.ok(workerAsset);
const worker=await readFile(join(root,workerAsset.path));assert.equal(worker.length,workerAsset.bytes);assert.equal(hash(worker),workerAsset.sha256);
const harness=hash(await readFile(new URL('./browser-mediabunny-webkit-pcm.mjs',import.meta.url))),packageRoot=resolve('packages/provider-mediabunny'),library=await build({entryPoints:[join(packageRoot,'node_modules/mediabunny/dist/modules/src/index.js')],bundle:true,platform:'browser',format:'esm',write:false}),libraryHash=hash(library.outputFiles[0].contents);
function verify(value){
 assert.equal(value.status,'finite-worker-packet-webcodecs-pcm-passed-not-mse');assert.ok(['webkit','chrome'].includes(value.browserEngine));assert.ok(value.browser);assert.equal(value.harnessSHA256,harness);assert.equal(value.manifestSHA256,hash(manifestBytes));assert.equal(value.fixtureSHA256,hash(fixture));assert.equal(value.workerSHA256,workerAsset.sha256);assert.equal(value.librarySHA256,libraryHash);
 const r=value.result;assert.ok(r.workerRetired);assert.ok(r.outputBytes>0&&/^[a-f0-9]{64}$/.test(r.outputSHA256));assert.ok(r.fragments>0);assert.deepEqual(r.sourceTracks,r.tracks);assert.deepEqual(r.tracks.map(x=>x.type),['audio','video']);
 const [audio,video]=r.tracks;assert.equal(audio.codec,'mp4a.40.2');assert.equal(audio.frames,153600);assert.equal(audio.packets.length,150);assert.equal(audio.pcm.length,300);assert.equal(video.packets.length,30);assert.equal(audio.audioSignal.length,2);
 for(const track of r.tracks)for(const packet of track.packets)assert.match(packet.sha256,/^[a-f0-9]{64}$/);
 for(const item of audio.pcm)assert.match(item,/^[a-f0-9]{64}$/);
 assert.ok(audio.audioSignal[0].rms>.01&&audio.audioSignal[0].tone440>2*audio.audioSignal[0].tone660);assert.ok(audio.audioSignal[1].rms>.01&&audio.audioSignal[1].tone660>2*audio.audioSignal[1].tone440);
}
verify(receipt);
const mutations=[v=>{v.result.tracks[0].pcm[0]='0'.repeat(64);},v=>{v.result.tracks[0].packets.pop();},v=>{v.result.tracks[0].audioSignal[0].rms=0;},v=>{v.result.sourceTracks[0].frames=0;},v=>{v.workerSHA256='wrong';},v=>{v.fixtureSHA256='wrong';}];
for(const mutate of mutations){const changed=structuredClone(receipt);mutate(changed);assert.throws(()=>verify(changed));}
console.log(JSON.stringify({status:'finite-worker-packet-pcm-evidence-verified-not-mse',browser:receipt.browser,audioPackets:150,decodedFrames:153600,videoPackets:30,negativeControls:mutations.length}));
