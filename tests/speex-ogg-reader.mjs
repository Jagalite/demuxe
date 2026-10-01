// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex'),root=process.env.SPEEX_OGG_FIXTURE_ROOT??'/tmp/demuxe-speex-ogg-fixtures',readerPath=process.env.SPEEX_OGG_READER_MODULE??path.resolve('build/component-candidates/provider-container/src/ogg.js');
const {OggAudioReader,oggCRC}=await import(pathToFileURL(readerPath));
const unhex=s=>Buffer.from(s.split('\n').filter(s=>s.includes(':')).map(s=>s.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex');
const manifestRaw=await readFile(root+'/fixtures.json'),fixtures=JSON.parse(manifestRaw),results=[];let controls=0,maxRead=0;
class MeteredBlob extends Blob{slice(start,end,type){maxRead=Math.max(maxRead,end-start);return super.slice(start,end,type);}}
function pages(bytes){const rows=[];for(let pos=0;pos<bytes.length;){const n=bytes[pos+26],length=27+n+bytes.subarray(pos+27,pos+27+n).reduce((a,b)=>a+b,0);rows.push(Buffer.from(bytes.subarray(pos,pos+length)));pos+=length;}return rows;}
for(const f of fixtures){
 const bytes=await readFile(f.input);assert.equal(sha(bytes),f.inputSHA256);const raw=await readFile(root+'/'+f.id+'.json');assert.equal(sha(raw),f.packetSHA256);const reference=JSON.parse(raw),controller=new AbortController();
 const reader=await OggAudioReader.open(new MeteredBlob([bytes]),controller.signal),track=reader.tracks[0];assert.equal(track.codec,'speex');assert.equal(track.rate,f.sampleRate);assert.equal(track.channels,1);assert.deepEqual(Buffer.from(track.privateData),unhex(reference.streams[0].extradata));assert.equal(reader.firstSample,f.originalFirstPTS);assert.equal(reader.sampleCount,Number(reference.streams[0].duration_ts));assert.equal(reader.granuleEndSamples,f.presentationEndSample);
 const emitted=[];for await(const p of reader.packets())emitted.push(p);assert.equal(emitted.length,reference.packets.length);
 for(let i=0;i<emitted.length;i++){const packet=emitted[i],native=reference.packets[i];assert.deepEqual(Buffer.from(packet.data),unhex(native.data));assert.equal(packet.startSample,Number(native.pts));assert.equal(packet.durationSamples,f.frameSamples);if(i===emitted.length-1){assert.equal(packet.granuleEndSamples,Number(native.pts)+Number(native.duration));assert.ok(Number(native.duration)<=packet.durationSamples);}else assert.equal(packet.durationSamples,Number(native.duration));}
 const original=emitted[0].data.slice();emitted[1].data.fill(0);assert.deepEqual(emitted[0].data,original);const again=[];for await(const p of reader.packets())again.push(p);assert.deepEqual(again[0].data,original);assert.notDeepEqual(again[1].data,emitted[1].data);controls++;
 const iterator=reader.packets();await iterator.next();await iterator.return();assert.equal((await reader.packets().next()).done,false);controls++;
 const baseline=pages(bytes),mutate=(page,edit)=>{const rows=baseline.map(b=>Buffer.from(b));edit(rows[page]);rows[page].writeUInt32LE(oggCRC(rows[page]),22);return Buffer.concat(rows);};
 for(const offset of [0,28,32,36,40,44,48,52,56,60,64,68,72,76]){await assert.rejects(()=>OggAudioReader.open(new Blob([mutate(0,p=>p[27+p[26]+offset]^=1)]),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');controls++;}
 for(const [page,edit] of [[2,p=>p.writeBigUInt64LE(999999n,6)],[3,p=>p.writeBigUInt64LE(p.readBigUInt64LE(6)+1n,6)],[baseline.length-1,p=>p.writeBigUInt64LE(p.readBigUInt64LE(6)+BigInt(f.frameSamples),6)],[1,p=>p.writeUInt32LE(0xffffffff,27+p[26])],[baseline.length-1,p=>p[5]&=~4]]){await assert.rejects(()=>OggAudioReader.open(new Blob([mutate(page,edit)]),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');controls++;}
 const before=new AbortController();before.abort();await assert.rejects(()=>OggAudioReader.open(new Blob([bytes]),before.signal),e=>e.name==='AbortError');controls++;
 controller.abort();await assert.rejects(()=>reader.packets().next(),e=>e.name==='AbortError');controls++;
 results.push({id:f.id,inputSHA256:f.inputSHA256,packets:emitted.length,firstSample:reader.firstSample,sampleCount:reader.sampleCount,granuleEndSamples:reader.granuleEndSamples,codedSamples:f.referenceSamples,headerSHA256:sha(track.privateData),packetBytesExact:true,originalPacketClocksExact:true});
}
const unqualifiedOriginal=await readFile(root+'/talk109-q5.spx');
await assert.rejects(()=>OggAudioReader.open(new Blob([unqualifiedOriginal]),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');controls++;
assert.ok(maxRead<=65536);const report={passed:true,scope:'Finite Ogg Speex8k/32k mono CBR one-frame headers, original signed packet starts, exact bytes and final granules; no decoder timestamp normalization, conversion or Player admission.',controls,maxRead,results,manifestSHA256:sha(manifestRaw),readerSHA256:sha(await readFile(readerPath)),sourceSHA256:sha(await readFile('packages/provider-container/src/ogg.ts'))};await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/speex-ogg-reader.json',JSON.stringify(report,null,2)+'\n');console.log('Speex Ogg reader PASS',results.length,controls,'controls');
