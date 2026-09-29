// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PacketAudioDecoder} from '../build/component-candidates/provider-audio/src/packet-decoder.js';
import {PacketFlacEncoder} from '../build/component-candidates/provider-audio/src/flac-encoder.js';
const root=process.env.AUDIO_BUILD_ROOT??'build/audio-providers';
async function load(profile){
 const pointer=JSON.parse(await readFile(path.join(root,profile+'.json'),'utf8'));
 const recordBytes=await readFile(path.join(pointer.directory,'build-record.json'));
 assert.equal(createHash('sha256').update(recordBytes).digest('hex'),pointer.recordSHA256);
 const record=JSON.parse(recordBytes);
 for(const [file,fact] of Object.entries(record.artifacts)){const bytes=await readFile(path.join(pointer.directory,file));assert.equal(bytes.length,fact.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),fact.sha256);}
 const factory=(await import(pathToFileURL(path.join(pointer.directory,'module.mjs')))).default;
 const module=await factory({wasmBinary:await readFile(path.join(pointer.directory,'module.wasm'))});
 return {module,record};
}
const common=await load('common'),ac3=await load('ac3'),dts=await load('dts'),flac=await load('flac');
assert.equal(ac3.record.sourceKey,common.record.sourceKey);assert.equal(dts.record.sourceKey,common.record.sourceKey);assert.equal(flac.record.sourceKey,common.record.sourceKey);
const manifest=JSON.parse(await readFile('build/provider-audio/fixtures/manifest.json','utf8')),results=[];
for(const f of manifest.fixtures){
 const data=await readFile(f.file);
 function decode(m){const c=new AbortController(),d=new PacketAudioDecoder(m,['ac3','eac3','dts-core'][f.kind],c.signal);try{const frames=[];for(const p of f.packets)frames.push(...d.decode(data.subarray(p.pos,p.pos+p.size),p.pts));frames.push(...d.flush());return frames;}finally{d.dispose();}}
 const fine=decode(f.kind===2?dts.module:ac3.module),bundled=decode(common.module);
 assert.deepEqual(bundled,fine);results.push({fixture:f.name,frames:fine.length,fineBundledExact:true});
}
await mkdir('build/provider-audio/roundtrip',{recursive:true});
for(const channels of [1,2,6]){
 const encoded=[];
 for(const [name,m]of [['fine',flac.module],['common',common.module]]){
  const c=new AbortController(),e=new PacketFlacEncoder(m,channels,c.signal),count=e.blockSize*3+13;
  const pcm=Int32Array.from({length:count*channels},(_,i)=>((i*100003%16777216)-8388608)*256);
  const packets=[];
  for(let offset=0;offset<pcm.length;offset+=e.blockSize*channels)packets.push(...e.encode(pcm.subarray(offset,offset+e.blockSize*channels)));
  packets.push(...e.flush());assert.deepEqual(e.flush(),[]);
  const stream=Buffer.concat([Buffer.from([102,76,97,67,128,0,0,34]),e.header,...packets.map(p=>p.data)]);
  const file=`build/provider-audio/roundtrip/${name}-${channels}.flac`;await writeFile(file,stream);
  const decoded=execFileSync('ffmpeg',['-v','error','-i',file,'-f','s32le','-'],{maxBuffer:16*1024*1024});assert.deepEqual(decoded,Buffer.from(pcm.buffer));
  let pts=0;for(const p of packets){assert.equal(p.pts,pts);pts+=p.duration;}assert.equal(pts,count);
  c.abort();assert.throws(()=>e.encode(pcm.subarray(0,channels)));e.dispose();encoded.push(stream);
 }
 assert.deepEqual(encoded[0],encoded[1]);results.push({channels,flacRoundtripExact:true,fineBundledExact:true,partialFinalBlock:true,aborted:true});
}
await mkdir('results/media-components/audio-provider',{recursive:true});await writeFile('results/media-components/audio-provider/fine-bundled.json',JSON.stringify({passed:true,scope:'packet contracts; not automatic playback qualification',builds:[common,ac3,dts,flac].map(x=>x.record),results},null,2)+'\n');console.log(results);
