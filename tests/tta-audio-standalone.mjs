// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {PacketAudioDecoder} from '../build/component-candidates/provider-audio/src/packet-decoder.js';
const {TtaReader,ttaCRC32}=await import(pathToFileURL(path.resolve(process.env.TTA_READER_MODULE??'build/component-candidates/provider-container/src/tta.js')));
const root=process.env.TTA_AUDIO_FIXTURE_ROOT??'/tmp/demuxe-tta-fixtures',sha=b=>createHash('sha256').update(b).digest('hex');
const unhex=(s='')=>Buffer.from(s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex');
const pointer=JSON.parse(await readFile(process.env.TTA_BUILD_POINTER??'/tmp/demuxe-archive-more-builds/archive-more.json')),raw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(raw),pointer.recordSHA256);const record=JSON.parse(raw),wasm=await readFile(pointer.directory+'/module.wasm'),mjs=await readFile(pointer.directory+'/module.mjs');assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);assert.equal(sha(mjs),record.artifacts['module.mjs'].sha256);const module=await(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default({wasmBinary:wasm});
const results=[];
for(const f of JSON.parse(await readFile(root+'/fixtures.json'))){if(f.codec!=='tta')continue;const row={id:f.id};try{
 const input=await readFile(f.input);assert.equal(sha(input),f.inputSHA256);const signal=new AbortController();
 if(f.expectedRejection||f.expectedDecodeRejection){await assert.rejects(()=>TtaReader.open(new Blob([input]),signal.signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');Object.assign(row,{passed:true,sourceProfileRejected:true});results.push(row);continue;}
 const reader=await TtaReader.open(new Blob([input]),signal.signal),track=reader.tracks[0],indexBytesRead=reader.bytesRead;assert.equal(track.rate,f.sampleRate);assert.equal(track.channels,f.channels);assert.equal(track.bitDepth,f.bitsPerSample);
 const packetRaw=await readFile(root+'/'+f.id+'.json');assert.equal(sha(packetRaw),f.packetSHA256);const packets=JSON.parse(packetRaw).packets,decoder=new PacketAudioDecoder(module,'tta',signal.signal,{sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:track.privateData});
 try{
  const frames=[];let count=0;for await(const p of reader.packets()){const host=packets[count++];assert.deepEqual(Buffer.from(p.data),unhex(host.data));assert.equal(p.startSample,Math.round(Number(host.pts_time)*f.sampleRate));frames.push(...decoder.decode(p.data,p.startSample));}frames.push(...decoder.flush());assert.equal(count,packets.length);
  const reference=await readFile(root+'/'+f.id+'.s32');assert.equal(sha(reference),f.referenceSHA256);assert.deepEqual(Buffer.concat(frames.map(f=>Buffer.from(f.pcm.buffer))),reference);assert.equal(reader.sampleCount,reference.length/(4*f.channels));
  const seeks=[];for(const seconds of reader.sampleCount/f.sampleRate>10?[48.25,4.75]:[4.25,.75]){const target=Math.round(seconds*f.sampleRate),preroll=Math.round(.5*f.sampleRate);decoder.reset();let compared=0,first;
   for await(const p of reader.packets(target,preroll)){first??=p.startSample;for(const frame of decoder.decode(p.data,p.startSample)){const from=Math.max(target,frame.pts),to=Math.min(target+Math.round(.4*f.sampleRate),frame.pts+frame.samples);if(to<=from)continue;assert.deepEqual(Buffer.from(frame.pcm.subarray((from-frame.pts)*f.channels,(to-frame.pts)*f.channels).buffer,frame.pcm.byteOffset+(from-frame.pts)*f.channels*4,(to-from)*f.channels*4),reference.subarray(from*f.channels*4,to*f.channels*4));compared+=to-from;}}
   assert.ok(first<=target-preroll);assert.equal(compared,Math.round(.4*f.sampleRate));seeks.push({seconds,firstSample:first,comparedSamples:compared,integerExact:true});
  }
  Object.assign(row,{passed:true,packets:count,samples:reader.sampleCount,packetExact:true,integerExact:true,seeks,indexBytesRead,bytesRead:reader.bytesRead});
 }finally{decoder.dispose();}
 const aborted=new AbortController();aborted.abort();await assert.rejects(()=>TtaReader.open(new Blob([input]),aborted.signal),e=>e.name==='AbortError');row.abort=true;console.log(f.id,'standalone PASS');
 }catch(e){Object.assign(row,{passed:false,error:String(e.stack??e)});console.error(f.id,'FAILED',e.message);}results.push(row);}
const original=await readFile(root+'/tta16-48000-2.tta');
for(const mode of ['magic','encrypted','channels','bits','rate','total','headerCRC','seekCRC','packetBudget','truncated','tag']){const bytes=Buffer.from(original),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);let data=bytes;
 if(mode==='magic')bytes[0]=0;if(mode==='encrypted')v.setUint16(4,2,true);if(mode==='channels')v.setUint16(6,8,true);if(mode==='bits')v.setUint16(8,32,true);if(mode==='rate')v.setUint32(10,96000,true);if(mode==='total')v.setUint32(14,0,true);if(mode==='headerCRC')bytes[18]^=1;else v.setUint32(18,ttaCRC32(bytes.subarray(0,18)),true);
 if(mode==='seekCRC')bytes[22]^=1;if(mode==='packetBudget'){v.setUint32(22,1048577,true);v.setUint32(46,ttaCRC32(bytes.subarray(22,46)),true);}if(mode==='truncated')data=bytes.subarray(0,bytes.length-1);if(mode==='tag')bytes[bytes.length-20]=0;
 await assert.rejects(()=>TtaReader.open(new Blob([data]),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH',mode);
}
const sourceSignal=new AbortController(),sourceReader=await TtaReader.open(new Blob([original]),sourceSignal.signal);for(const args of [[-1,0],[sourceReader.sampleCount,0],[0,-1],[0,Infinity]])await assert.rejects(()=>sourceReader.packets(...args).next(),e=>e.code==='PROVIDER_PROFILE_MISMATCH');sourceSignal.abort();await assert.rejects(()=>sourceReader.packets().next(),e=>e.name==='AbortError');
const inputs=Object.fromEntries(await Promise.all(['packages/provider-container/src/tta.ts','tests/tta-audio-standalone.mjs','packages/provider-audio/src/packet-decoder.ts'].map(async p=>[p,sha(await readFile(p))]))),report={adapterSHA256:sha(await readFile('build/component-candidates/provider-audio/src/packet-decoder.js')),passed:results.every(r=>r.passed),scope:'Bounded standalone unencrypted TTA1, header/seek-tableCRC and byte-budget proof; complete originalpacket/sampleclock/PCM with fresh forward/backward native reset+preroll,96rate/8wide/quiet6chpacketbudgets explicitlyreject; no source recipe admission implied',inputs,readerModuleSHA256:sha(await readFile(process.env.TTA_READER_MODULE??'build/component-candidates/provider-container/src/tta.js')),nativeBuildInputs:record.inputs,build:{recordSHA256:pointer.recordSHA256,module:record.artifacts['module.mjs'],wasm:record.artifacts['module.wasm']},results};await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/tta-audio-standalone.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
