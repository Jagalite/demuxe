// SPDX-License-Identifier: Apache-2.0
// Real FFmpeg containers -> bounded reader -> exact PCM -> native packet decoder.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const sha=b=>createHash('sha256').update(b).digest('hex'),home=await mkdtemp(path.join(os.tmpdir(),'demuxe-wave-aiff-'));
const sources=['packages/provider-container/src/wave-aiff.ts','packages/provider-audio/src/packet-decoder.ts','packages/provider-container/src/matroska.ts'];
const sourceHashes=Object.fromEntries(await Promise.all([...sources,'tests/provider-wave-aiff.mjs'].map(async p=>[p,sha(await readFile(p))])));
execFileSync('node_modules/.bin/tsc',['--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--lib','ES2022,DOM','--strict','--skipLibCheck','--outDir',home+'/compiled',...sources],{stdio:'inherit'});
await writeFile(home+'/compiled/package.json','{"type":"module"}');
const {WaveAiffReader}=await import(pathToFileURL(home+'/compiled/provider-container/src/wave-aiff.js'));
const {PacketAudioDecoder}=await import(pathToFileURL(home+'/compiled/provider-audio/src/packet-decoder.js'));
const pointer=JSON.parse(await readFile(process.env.PCM_BUILD_POINTER??'build/codec-expansion/decoder-families/pcm.json'));
const buildRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(buildRaw),pointer.recordSHA256);const build=JSON.parse(buildRaw),wasm=await readFile(pointer.directory+'/module.wasm');assert.equal(sha(wasm),build.artifacts['module.wasm'].sha256);const moduleBytes=await readFile(pointer.directory+'/module.mjs');assert.equal(sha(moduleBytes),build.artifacts['module.mjs'].sha256);
const factory=(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default,module=await factory({wasmBinary:wasm});
const results=[];let maxRead=0;
class MeteredBlob extends Blob{async arrayBuffer(){throw Error('Whole-file read forbidden');}slice(start=0,end=this.size,type){maxRead=Math.max(maxRead,end-start);return super.slice(start,end,type);}}
const ffmpeg=args=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-y',...args],{maxBuffer:16*1024*1024});
for(const format of ['wav','aiff'])for(const rate of [44100,48000,96000])for(const channels of [1,2])for(const codec of (format==='wav'?['s16','s24','s32','f32','f64']:['s16','s24','s32']))test(`${format} ${codec} ${rate} ${channels} exact native decode`,async()=>{
 const id=[format,codec,rate,channels].join('-'),file=home+'/'+id+'.'+format,native='pcm_'+codec+(format==='aiff'?'be':'le'),target='pcm_'+codec+'le',rawFormat=codec+'le';
 ffmpeg(['-f','lavfi','-i',`aevalsrc=0.35*sin(2*PI*443*t)${channels===2?'|0.2*sin(2*PI*787*t)':''}:s=${rate}:d=0.731`,'-c:a',native,file]);
 const source=await readFile(file),reader=await WaveAiffReader.open(new MeteredBlob([source]),new AbortController().signal),track=reader.tracks[0],reference=ffmpeg(['-i',file,'-map','0:a:0','-c:a',target,'-f',rawFormat,'-']);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',file],{encoding:'utf8'})).streams[0];assert.equal(track.channels,channels);assert.equal(track.rate,rate);assert.equal(track.bitDepth,Number(codec.slice(1)));assert.equal(reader.sampleCount,reference.length/(channels*track.bitDepth/8));assert.equal(Number(probe.sample_rate),rate);
 assert.ok(reader.bytesRead<4096,'Opening should scan metadata without reading PCM');
 const packets=[];for await(const p of reader.packets())packets.push(p);assert.deepEqual(Buffer.concat(packets.map(p=>Buffer.from(p.data))),reference);let sample=0;for(const p of packets){assert.equal(p.timestampNs,Math.round(sample*1e9/rate));sample+=p.data.length/(channels*track.bitDepth/8);assert.equal(p.timestampNs+p.durationNs,Math.round(sample*1e9/rate));}assert.equal(sample,reader.sampleCount);
 const decoder=new PacketAudioDecoder(module,track.codec,new AbortController().signal,{sampleRate:rate,channels,bitsPerSample:track.bitDepth});let frames=[];try{for(const p of packets)frames.push(...decoder.decode(p.data,Math.round(p.timestampNs*rate/1e9)));frames.push(...decoder.flush());}finally{decoder.dispose();}
 const integer=codec.startsWith('s'),decoded=integer?Buffer.concat(frames.map(f=>Buffer.from(f.pcm.buffer,f.pcm.byteOffset,f.pcm.byteLength))):Buffer.from(Float64Array.from(frames.flatMap(f=>Array.from({length:f.samples*channels},(_,i)=>codec==='f64'?f.planes64[i%channels][Math.floor(i/channels)]:f.planes[i%channels][Math.floor(i/channels)]))).buffer);
 const expected=ffmpeg(['-i',file,'-map','0:a:0','-c:a',integer?'pcm_s32le':'pcm_f64le','-f',integer?'s32le':'f64le','-']);assert.deepEqual(decoded,expected,'Native PCM precision');
 const start=Math.floor(reader.sampleCount/3);const tail=[];for await(const p of reader.packets(start))tail.push(p);assert.deepEqual(Buffer.concat(tail.map(p=>Buffer.from(p.data))),reference.subarray(start*channels*track.bitDepth/8));assert.equal(tail[0].timestampNs,Math.round(start*1e9/rate));await assert.rejects(async()=>{for await(const p of reader.packets(-1))void p;},/seek sample bounds/);
 assert.deepEqual(Buffer.from(packets[0].data),reference.subarray(0,packets[0].data.length),'Owned packets unchanged after repeat');assert.ok(maxRead<=65536);
 results.push({id,format,codec:track.codec,rate,channels,samples:reader.sampleCount,packets:packets.length,bytesRead:reader.bytesRead,inputSHA256:sha(source),referenceSHA256:sha(reference),exactPCM:true,nativeExact:true,sampleSeek:true});
});
const chunk=(id,data,little=true)=>{const header=Buffer.alloc(8);header.write(id);little?header.writeUInt32LE(data.length,4):header.writeUInt32BE(data.length,4);return Buffer.concat([header,data,...(data.length&1?[Buffer.alloc(1)]:[])]);};
const wrap=(chunks,aiff=false)=>{const body=Buffer.concat([Buffer.from(aiff?'AIFF':'WAVE'),...chunks]),header=Buffer.alloc(8);header.write(aiff?'FORM':'RIFF');aiff?header.writeUInt32BE(body.length,4):header.writeUInt32LE(body.length,4);return Buffer.concat([header,body]);};
const fmt=()=>{const b=Buffer.alloc(16);b.writeUInt16LE(1,0);b.writeUInt16LE(2,2);b.writeUInt32LE(48000,4);b.writeUInt32LE(192000,8);b.writeUInt16LE(4,12);b.writeUInt16LE(16,14);return b;};
test('reject structural, codec, alignment, extension and timeline mismatches',async()=>{
 const valid=()=>wrap([chunk('fmt ',fmt()),chunk('data',Buffer.alloc(16))]);const mutations=[];
 for(const [offset,value]of [[0,'RF64'],[0,'RIFX'],[8,'AIFC']]){const b=valid();b.write(value,offset);mutations.push(b);}
 for(const edit of [b=>b.writeUInt16LE(6,0),b=>b.writeUInt16LE(6,2),b=>b.writeUInt32LE(32000,4),b=>b.writeUInt16LE(8,14),b=>b.writeUInt16LE(1,12),b=>b.writeUInt32LE(1,8)]){const f=fmt();edit(f);mutations.push(wrap([chunk('fmt ',f),chunk('data',Buffer.alloc(16))]));}
 mutations.push(wrap([chunk('fmt ',fmt()),chunk('data',Buffer.alloc(15))]),wrap([chunk('fmt ',fmt()),chunk('data',Buffer.alloc(16)),chunk('data',Buffer.alloc(16))]),wrap([chunk('fmt ',fmt()),chunk('fmt ',fmt()),chunk('data',Buffer.alloc(16))]),wrap([chunk('fmt ',fmt()),chunk('data',Buffer.alloc(16)),chunk('smpl',Buffer.alloc(36))]),wrap([chunk('fmt ',fmt()),chunk('data',Buffer.alloc(16)),chunk('fact',Buffer.alloc(4))]),wrap([chunk('fmt ',fmt()),chunk('data',Buffer.alloc(16)),chunk('LIST',Buffer.from('adtl'))]));
 for(const bytes of mutations)await assert.rejects(()=>WaveAiffReader.open(new Blob([bytes]),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');
 const canceled=new AbortController();canceled.abort();await assert.rejects(()=>WaveAiffReader.open(new Blob([valid()]),canceled.signal),e=>e.name==='AbortError');const later=new AbortController(),reader=await WaveAiffReader.open(new Blob([valid()]),later.signal);later.abort();await assert.rejects(async()=>{for await(const p of reader.packets())void p;},e=>e.name==='AbortError');
 const padded=wrap([chunk('JUNK',Buffer.alloc(2*1024*1024)),chunk('fmt ',fmt()),chunk('data',Buffer.alloc(16))]),bounded=await WaveAiffReader.open(new MeteredBlob([padded]),new AbortController().signal);assert.ok(bounded.bytesRead<100);assert.ok(maxRead<=65536);
 results.push({id:'structural-controls',rejections:mutations.length,abort:true,metadataSkip:true});
});
test('AIFF rejects rounded rates, wrong frame count, block alignment and loop metadata',async()=>{
 const source=await readFile(home+'/aiff-s16-48000-2.aiff'),comm=source.indexOf(Buffer.from('COMM'))+8,sound=source.indexOf(Buffer.from('SSND'))+8;const cases=[];
 for(const edit of [b=>b[comm+17]^=1,b=>b.writeUInt32BE(1,comm+2),b=>b.writeUInt32BE(1,sound+4),b=>b.writeUInt32BE(0xffffffff,sound)]){const b=Buffer.from(source);edit(b);cases.push(b);}
 cases.push(wrap([source.subarray(12),chunk('INST',Buffer.alloc(20),false)],true));
 for(const bytes of cases)await assert.rejects(()=>WaveAiffReader.open(new Blob([bytes]),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');results.push({id:'aiff-negative-controls',rejections:cases.length});
});
test('large declared files seek with exact integer nanoseconds and bounded reads',async()=>{
 const audioBytes=3200000000,header=wrap([chunk('fmt ',fmt()),chunk('data',Buffer.alloc(4))]).subarray(0,44);header.writeUInt32LE(audioBytes+36,4);header.writeUInt32LE(audioBytes,40);
 class SparseBlob extends Blob{get size(){return audioBytes+44;}slice(start=0,end=this.size){assert.ok(end-start<=65536);return new Blob([start<44?header.subarray(start,end):Buffer.alloc(end-start)]);}async arrayBuffer(){throw Error('Whole file read forbidden');}}
 const reader=await WaveAiffReader.open(new SparseBlob(),new AbortController().signal),start=reader.sampleCount-1;const result=await reader.packets(start).next(),expected=Number((BigInt(start)*1000000000n+24000n)/48000n);assert.equal(result.value.timestampNs,expected);assert.equal(result.value.data.length,4);assert.ok(reader.bytesRead<100);results.push({id:'large-sparse-control',declaredBytes:reader.sampleCount*4,boundedRead:true,exactTimestamp:true});
});
test.after(async()=>{for(const [name,hash]of Object.entries(sourceHashes))assert.equal(sha(await readFile(name)),hash,'Source changed during matrix');const report={schema:1,passed:results.length===51,scope:'Uncompressed PCM packet reader plus actual Wasm decoder; no public route or playback qualification',sources:sourceHashes,ffmpegVersion:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],compilerVersion:execFileSync('node_modules/.bin/tsc',['--version'],{encoding:'utf8'}).trim(),moduleSHA256:sha(moduleBytes),nativeBuildSHA256:pointer.recordSHA256,wasmSHA256:sha(wasm),maximumBlobRead:maxRead,results,home};await writeFile(home+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('WAV/AIFF evidence: '+home+'/report.json');});
