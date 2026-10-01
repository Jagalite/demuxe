// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const adapter=process.env.LOSSLESS_EXTENSION_ADAPTER_MODULE??'build/component-candidates/provider-audio/src/packet-decoder.js';
const {PacketAudioDecoder}=await import(pathToFileURL(path.resolve(adapter)));
const root=process.env.LOSSLESS_EXTENSION_FIXTURE_ROOT??'/tmp/demuxe-lossless-extensions',sha=b=>createHash('sha256').update(b).digest('hex');
const unhex=(s='')=>Uint8Array.from(Buffer.from(s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex'));
const modules=new Map(),builds=[];
for(const profile of ['truehd-mlp','dts-hd']){const pointer=JSON.parse(await readFile('/Volumes/seed2/Projects/demuxe-media-components/build/audio-providers-production/'+profile+'.json'));const raw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(raw),pointer.recordSHA256);const record=JSON.parse(raw),wasm=await readFile(pointer.directory+'/module.wasm'),js=await readFile(pointer.directory+'/module.mjs');assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);assert.equal(sha(js),record.artifacts['module.mjs'].sha256);modules.set(profile,await(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default({wasmBinary:wasm}));builds.push({profile,recordSHA256:pointer.recordSHA256,nativeBuildInputs:record.inputs,module:record.artifacts['module.mjs'],wasm:record.artifacts['module.wasm']});}
const results=[];
const adapterSHA256=sha(await readFile(adapter));

for(const f of JSON.parse(await readFile(root+'/fixtures.json'))){const row={...f},module=modules.get(f.profile);try{
 assert.equal(sha(await readFile(f.input)),f.inputSHA256);const raw=await readFile(root+'/'+f.id+'.json');assert.equal(sha(raw),f.packetSHA256);const data=JSON.parse(raw),config={sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:unhex(data.streams[0].extradata)},packets=data.packets.map(p=>({...p,bytes:unhex(p.data),ptsSamples:Math.round(Number(p.pts_time)*f.sampleRate)}));
 for(const changed of [{sampleRate:32000},{channels:3},{bitsPerSample:32},{extradata:new Uint8Array([1])},{blockAlign:10},{bitRate:128000},...(f.codec==='mlp'?[{channels:8}]:[])])assert.throws(()=>new PacketAudioDecoder(module,f.codec,new AbortController().signal,{...config,...changed}));
 const d=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config);
 const decodeFrom=start=>{const out=[];for(const p of packets.slice(start))out.push(...d.decode(p.bytes,p.ptsSamples));out.push(...d.flush());assert.deepEqual(d.flush(),[]);return out;};
 try{
  if(f.expectedRejection){assert.throws(()=>decodeFrom(0),e=>e.code===f.expectedRejection);Object.assign(row,{passed:true,precisionProfileRejected:true});results.push(row);console.log(f.id,'correctly rejected');continue;}
  const frames=decodeFrom(0);assert.ok(frames.length);const hostBytes=await readFile(root+'/'+f.id+'.frames.json');assert.equal(sha(hostBytes),f.framesSHA256);const hostFrames=JSON.parse(hostBytes).frames;assert.equal(hostFrames.length,frames.length);for(let i=0;i<frames.length;i++){assert.equal(frames[i].pts,Math.round(Number(hostFrames[i].pts_time)*f.sampleRate));assert.equal(frames[i].samples,hostFrames[i].nb_samples);}assert.ok(frames.every(frame=>frame.pcm&&frame.rate===f.sampleRate&&frame.channels===f.channels));
  const actual=Buffer.concat(frames.map(frame=>Buffer.from(frame.pcm.buffer))),reference=await readFile(root+'/'+f.id+'.s32');assert.equal(sha(reference),f.referenceSHA256);assert.deepEqual(actual,reference,'byte-exact complete original integer PCM');
  d.reset();const repeat=decodeFrom(0);assert.deepEqual(repeat.map(({generation,...f})=>f),frames.map(({generation,...f})=>f),'exact reset including owned PCM');
  const index=new Map(frames.map(frame=>[`${frame.pts}:${frame.samples}`,frame])),duration=reference.length/(4*f.channels*f.sampleRate),seeks=[];
  for(const seconds of [.68,.28,.8,.12].map(x=>x*duration)){
   const target=Math.round(seconds*f.sampleRate);let start=0;for(let i=0;i<packets.length;i++){if(packets[i].ptsSamples<=target-Math.round(.5*f.sampleRate)){if(f.codec==='dts-hd'||packets[i].flags?.includes('K'))start=i;}else break;}
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
 for(const changed of [{sampleRate:f.sampleRate===44100?48000:44100},{channels:f.channels===1?2:1},{bitsPerSample:f.bitsPerSample===16?24:16}]){assert.throws(()=>{const bad=new PacketAudioDecoder(module,f.codec,new AbortController().signal,{...config,...changed});try{for(const p of packets.slice(0,8))bad.decode(p.bytes,p.ptsSamples);}finally{bad.dispose();}},e=>e.code==='PROVIDER_PROFILE_MISMATCH','source frame metadata must match admitted config at construction or decoded header');}row.metadataMismatchRejected=true;
 const signal=new AbortController(),victim=new PacketAudioDecoder(module,f.codec,signal.signal,config);signal.abort();assert.throws(()=>victim.flush(),e=>e.name==='AbortError');row.abort=true;console.log(f.id,'PASS');
 }catch(e){Object.assign(row,{passed:false,error:String(e.stack??e)});console.error(f.id,'FAILED',e.message);}results.push(row);}
const inputs=Object.fromEntries(await Promise.all(['packages/provider-audio/src/packet-decoder.ts','tests/lossless-audio-extension-fixtures.py','tests/lossless-audio-extension.mjs'].map(async p=>[p,sha(await readFile(p))])));await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile(process.env.LOSSLESS_EXTENSION_REPORT??'results/media-components/codec-expansion/lossless-audio-extension.json',JSON.stringify({passed:results.every(r=>r.passed),scope:'Exact packet-only legacy header-owned ABI qualification; not composition/browser admission. DTS-HD officialcompletepacketprefixes exclude independentlyrejected corruptfinalpacket.',adapterSHA256,inputs,builds,results},null,2)+'\n');if(!results.every(r=>r.passed))process.exitCode=1;
