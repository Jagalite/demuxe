// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PacketAudioDecoder} from '../build/component-candidates/provider-audio/src/packet-decoder.js';
const root=process.env.ARCHIVE_AUDIO_FIXTURE_ROOT??'/tmp/demuxe-archive-audio-fixtures',sha=b=>createHash('sha256').update(b).digest('hex');
const unhex=(s='')=>Uint8Array.from(Buffer.from(s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex'));
const pointer=JSON.parse(await readFile(process.env.ARCHIVE_BUILD_POINTER??'/tmp/demuxe-archive-audio-builds/archive.json')),recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(recordRaw),pointer.recordSHA256);const record=JSON.parse(recordRaw),wasm=await readFile(pointer.directory+'/module.wasm');assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);const moduleBytes=await readFile(pointer.directory+'/module.mjs');assert.equal(sha(moduleBytes),record.artifacts['module.mjs'].sha256);const module=await (await import(pathToFileURL(path.resolve(pointer.directory,'module.mjs')))).default({wasmBinary:wasm});
const results=[];
for(const f of JSON.parse(await readFile(root+'/fixtures.json'))){const row={...f};try{
 const raw=await readFile(root+'/'+f.id+'.json');assert.equal(sha(raw),f.packetSHA256);const data=JSON.parse(raw),config={sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:unhex(data.streams[0].extradata)},packets=data.packets.map(p=>({...p,bytes:unhex(p.data),ptsSamples:Math.round(Number(p.pts_time)*f.sampleRate)}));
 const d=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config);
 const decodeFrom=start=>{const out=[];for(const p of packets.slice(start))out.push(...d.decode(p.bytes,p.ptsSamples));out.push(...d.flush());assert.deepEqual(d.flush(),[]);return out;};
 try{
  if(f.expectedRejection){assert.throws(()=>decodeFrom(0),e=>e.code===f.expectedRejection);Object.assign(row,{passed:true,precisionProfileRejected:true});results.push(row);console.log(f.id,'correctly rejected');continue;}
  const frames=decodeFrom(0);assert.ok(frames.length);assert.ok(frames.every(frame=>frame.pcm&&frame.rate===f.sampleRate&&frame.channels===f.channels));
  const actual=Buffer.concat(frames.map(frame=>Buffer.from(frame.pcm.buffer))),reference=await readFile(root+'/'+f.id+'.s32');assert.equal(sha(reference),f.referenceSHA256);assert.deepEqual(actual,reference,'byte-exact complete original integer PCM');
  d.reset();const repeat=decodeFrom(0);assert.deepEqual(repeat.map(({generation,...f})=>f),frames.map(({generation,...f})=>f),'exact reset including owned PCM');
  const index=new Map(frames.map(frame=>[`${frame.pts}:${frame.samples}`,frame])),duration=reference.length/(4*f.channels*f.sampleRate),seeks=[];
  for(const seconds of duration>10?[48.25,16.75,58.5,4.75]:[4.25,1.75,5.5,.75]){
   const target=Math.round(seconds*f.sampleRate);let start=0;for(let i=0;i<packets.length;i++){if(packets[i].ptsSamples<=target-Math.round(.5*f.sampleRate))start=i;else break;}
   d.reset();const recovered=decodeFrom(start);let compared=0;
   for(const frame of recovered){const from=Math.max(0,target-frame.pts),to=Math.min(frame.samples,target+Math.round(.6*f.sampleRate)-frame.pts);if(to<=from)continue;const original=index.get(`${frame.pts}:${frame.samples}`);assert.ok(original,'seek frame maps by timestamp');assert.deepEqual(frame.pcm.subarray(from*f.channels,to*f.channels),original.pcm.subarray(from*f.channels,to*f.channels),'exact fresh seek PCM');compared+=to-from;}
   assert.ok(compared>=Math.min(.15,f.codec==='ape'?.1:.15)*f.sampleRate,'fresh seek interval');seeks.push({seconds,startPacket:start,prerollSeconds:.5,comparedSamples:compared,integerExact:true});
  }
  Object.assign(row,{passed:true,frames:frames.length,maxFrameSamples:Math.max(...frames.map(frame=>frame.samples)),maxPacketBytes:Math.max(...packets.map(packet=>packet.bytes.length)),samples:reference.length/(f.channels*4),referencePCMHash:sha(reference),channelMasks:[...new Set(frames.map(frame=>frame.layout))],integerExact:true,resetExact:true,seeks});
 }finally{d.dispose();d.dispose();}
 if(f.codec==='ape'){
  for(const changed of [{bitsPerSample:8},{channels:6},{extradata:new Uint8Array(5)},{extradata:new Uint8Array([0,0,0,0,0,0])}])assert.throws(()=>new PacketAudioDecoder(module,f.codec,new AbortController().signal,{...config,...changed}));
  const invalid=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config),packet=new Uint8Array(8);new DataView(packet.buffer).setUint32(0,294913,true);try{assert.throws(()=>invalid.decode(packet,0),'declared APE sample budget');}finally{invalid.dispose();}row.oldVersionAndOverbudgetRejected=true;
 }
 if(f.codec==='wavpack'){
  for(const flags of [0x8,0x80,0x80000000]){const bad=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config),packet=packets[0].bytes.slice(),view=new DataView(packet.buffer);view.setUint32(24,view.getUint32(24,true)|flags,true);try{assert.throws(()=>bad.decode(packet,0),e=>e.code==='PROVIDER_PROFILE_MISMATCH','unsupported WavPack flags');}finally{bad.dispose();}}
  const bad=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config),packet=packets[0].bytes.slice();new DataView(packet.buffer).setUint32(4,packet.length+16,true);try{assert.throws(()=>bad.decode(packet,0),e=>e.code==='PROVIDER_PROFILE_MISMATCH','bad WavPack block size');}finally{bad.dispose();}row.hybridFloatDsdAndMalformedHeaderRejected=true;
 }
 const signal=new AbortController(),victim=new PacketAudioDecoder(module,f.codec,signal.signal,config);signal.abort();assert.throws(()=>victim.flush(),e=>e.name==='AbortError');row.abort=true;console.log(f.id,'PASS');
 }catch(e){Object.assign(row,{passed:false,error:String(e.stack??e)});console.error(f.id,'FAILED',e.message);}results.push(row);}
const ape=results.find(r=>r.id==='ape-canonical'),wv=results.find(r=>r.id==='wavpack-canonical');if(ape?.passed&&wv?.passed)assert.equal(ape.referencePCMHash,wv.referencePCMHash,'official paired codecs decode the same original PCM');
const inputs=Object.fromEntries(await Promise.all(['native/audio-codecs/decoder.c','packages/provider-audio/src/packet-decoder.ts','scripts/build-audio-providers.py','tests/archive-audio-fixtures.py','tests/archive-audio.mjs'].map(async p=>[p,sha(await readFile(p))])));
const report={passed:results.every(r=>r.passed),scope:'Canonical60.48sec APE/WavPack and finite synthetic integer WavPack decoder PCM/reset/seek proof; float WavPack rejected. Modern APE3930-3990,16/24bit mono/stereo,≤1MiB packets and294912declaredsamples; no new container/player admission.',inputs,referenceTool:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],build:{profile:record.profile,source:record.source,sourceKey:record.sourceKey,nativeBuildInputs:record.inputs,recordSHA256:pointer.recordSHA256,module:record.artifacts['module.mjs'],wasm:record.artifacts['module.wasm'],capabilities:record.capabilities},results};await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/archive-audio.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
