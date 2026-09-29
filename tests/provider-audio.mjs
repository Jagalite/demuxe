// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PacketAudioDecoder} from '../build/provider-audio/packet-decoder.js';
const root=path.resolve('build/provider-audio');
const manifest=JSON.parse(await readFile(root+'/fixtures/manifest.json','utf8'));
const results=[];
for(const fixture of manifest.fixtures){
 const profile=fixture.kind===2?'dts-Oz':'ac3-Oz';const dir=root+'/assets/'+profile;
 const wasm=await readFile(dir+'/module.wasm');const provenance=JSON.parse(await readFile(dir+'/provenance.json','utf8'));
 assert.equal(createHash('sha256').update(wasm).digest('hex'),provenance.wasmSha256);
 const factory=(await import(pathToFileURL(dir+'/module.mjs'))).default;
 const m=await factory({wasmBinary:wasm});
 const controller=new AbortController();const decoder=new PacketAudioDecoder(m,['ac3','eac3','dts-core'][fixture.kind],controller.signal);
 const data=await readFile(fixture.file);assert.equal(createHash('sha256').update(data).digest('hex'),fixture.sha256);
 function run(){const frames=[];for(const p of fixture.packets)frames.push(...decoder.decode(data.subarray(p.pos,p.pos+p.size),p.pts));frames.push(...decoder.flush());assert.deepEqual(decoder.flush(),[]);return frames;}
 const frames=run();assert.ok(frames.length>0);assert.equal(frames[0].pts,fixture.packets[0].pts);
 const copied=frames[0].planes[0].slice();decoder.reset();const replay=run();assert.deepEqual(replay.map(f=>f.planes),frames.map(f=>f.planes));assert.equal(replay[0].generation,1);assert.deepEqual(frames[0].planes[0],copied);
 // Compare interleaved float output with fixture reference; tolerance covers
 // host implementation differences, not a claim of bit-exact pinned-reference qualification.
 const pcm=await readFile(fixture.pcm);let index=0,maxError=0;
 for(const f of frames){assert.equal(f.channels,fixture.channels);for(let i=0;i<f.samples;i++)for(let c=0;c<f.channels;c++){assert.ok(index+4<=pcm.length);maxError=Math.max(maxError,Math.abs(f.planes[c][i]-pcm.readFloatLE(index)));index+=4;}}
 assert.equal(index,pcm.length);assert.ok(maxError<0.00001,`${fixture.name}: ${maxError}`);
 controller.abort();assert.throws(()=>decoder.decode(data.subarray(0,10),0));decoder.dispose();
 results.push({fixture:fixture.name,frames:frames.length,pcmBytes:index,maxError,resetExact:true,ownedCopies:true,aborted:true,wasmSHA256:provenance.wasmSha256,fixtureSHA256:fixture.sha256});
}
await mkdir('results/media-components/audio-provider',{recursive:true});await writeFile('results/media-components/audio-provider/packet-decoder.json',JSON.stringify({scope:'packet decoder only; no playback admission',passed:true,results},null,2)+'\n');
console.log(results);
