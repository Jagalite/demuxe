// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PacketFlacEncoder} from '../build/component-candidates/provider-audio/src/flac-encoder.js';
const root=process.env.FLAC_BUILD_ROOT??'build/codec-expansion/decoder-families';
const pointer=JSON.parse(await readFile(root+'/flac.json','utf8'));
const recordBytes=await readFile(pointer.directory+'/build-record.json');
const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(recordBytes),pointer.recordSHA256);
const record=JSON.parse(recordBytes);
for(const [file,fact] of Object.entries(record.artifacts))assert.equal(hash(await readFile(pointer.directory+'/'+file)),fact.sha256);
const factory=(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default;
const module=await factory({wasmBinary:await readFile(pointer.directory+'/module.wasm')});
const out=process.env.FLAC_RESULT_ROOT??'build/codec-expansion/flac-results';await mkdir(out,{recursive:true});const results=[];
for(const sampleRate of [44100,48000,96000])for(const channels of [1,2,6,8]){
 const c=new AbortController(),e=new PacketFlacEncoder(module,channels,c.signal,0,sampleRate),count=e.blockSize*3+13;
 const pcm=Int32Array.from({length:count*channels},(_,i)=>(i*100003%16777216-8388608)*256),packets=[];
 for(let offset=0;offset<pcm.length;offset+=e.blockSize*channels)packets.push(...e.encode(pcm.subarray(offset,offset+e.blockSize*channels)));
 packets.push(...e.flush());assert.deepEqual(e.flush(),[]);let pts=0;for(const p of packets){assert.equal(p.pts,pts);pts+=p.duration;}assert.equal(pts,count);
 const file=out+`/flac-${sampleRate}-${channels}.flac`;await writeFile(file,Buffer.concat([Buffer.from([102,76,97,67,128,0,0,34]),e.header,...packets.map(p=>p.data)]));
 const stream=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',file],{encoding:'utf8'})).streams[0];
 assert.equal(Number(stream.sample_rate),sampleRate);assert.equal(stream.channels,channels);
 const decoded=execFileSync('ffmpeg',['-v','error','-i',file,'-f','s32le','-'],{maxBuffer:16*1024*1024});assert.deepEqual(decoded,Buffer.from(pcm.buffer));
 c.abort();assert.throws(()=>e.encode(pcm.subarray(0,channels)));e.dispose();results.push({sampleRate,channels,samples:count,exactRoundtrip:true,partialFinalBlock:true,aborted:true});
}
await writeFile(out+'/report.json',JSON.stringify({passed:true,record,results},null,2)+'\n');console.log(results);
