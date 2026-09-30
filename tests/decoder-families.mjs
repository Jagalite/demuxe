// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PacketAudioDecoder} from '../build/codec-expansion/decoder-js/packet-decoder.js';
const root='build/codec-expansion/decoder-fixtures',build=process.env.DECODER_BUILD_ROOT??'/tmp/demuxe-decoder-families';
const fixtures=JSON.parse(await readFile(root+'/fixtures.json'));
const modules=new Map(),builds=[],results=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
function unhex(s=''){return Uint8Array.from(Buffer.from(s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex'));}
for(const f of fixtures.filter(f=>!process.env.DECODER_PROFILE||f.profile===process.env.DECODER_PROFILE)){
 if(!modules.has(f.profile)){const pointer=JSON.parse(await readFile(build+'/'+f.profile+'.json'));const recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(hash(recordRaw),pointer.recordSHA256);const record=JSON.parse(recordRaw);const wasm=await readFile(pointer.directory+'/module.wasm');assert.equal(hash(wasm),record.artifacts['module.wasm'].sha256);builds.push({profile:f.profile,sourceKey:record.sourceKey,recordSHA256:pointer.recordSHA256,wasm:record.artifacts['module.wasm']});const factory=(await import(pathToFileURL(path.resolve(pointer.directory,'module.mjs')))).default;modules.set(f.profile,await factory({wasmBinary:wasm}));}
 const m=modules.get(f.profile),data=JSON.parse(await readFile(root+'/'+f.id+'.json')),stream=data.streams[0],configuration={sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:unhex(stream.extradata)};
 const signal=new AbortController(),d=new PacketAudioDecoder(m,f.codec,signal.signal,configuration);
 function decode(){let frames=[];for(const p of data.packets){const pts=Math.round(Number(p.pts_time)*f.sampleRate);frames.push(...d.decode(unhex(p.data),pts));}frames.push(...d.flush());assert.deepEqual(d.flush(),[]);return frames;}
 const frames=decode();assert.ok(frames.length);const held=frames.map(f=>f.pcm?.slice()??f.planes.map(p=>p.slice()));d.reset();const repeat=decode();assert.deepEqual(repeat.map(({generation,...f})=>f),frames.map(({generation,...f})=>f));assert.deepEqual(frames.map(f=>f.pcm??f.planes),held);d.dispose();d.dispose();assert.throws(()=>d.decode(new Uint8Array([0]),0));
 const actual=Float32Array.from(frames.flatMap(frame=>Array.from({length:frame.samples*f.channels},(_,i)=>frame.pcm?frame.pcm[i]/2147483648:frame.planes[i%f.channels][Math.floor(i/f.channels)])));
 if(f.codec==='pcm-f64le') {
  assert.ok(frames.every(frame=>frame.planes64));
  const doubles=Float64Array.from(frames.flatMap(frame=>Array.from({length:frame.samples*f.channels},(_,i)=>frame.planes64[i%f.channels][Math.floor(i/f.channels)])));
  assert.deepEqual(Buffer.from(doubles.buffer),await readFile(root+'/'+f.id+'.f64'),f.id+' exact double PCM');
 }
 const raw=await readFile(root+'/'+f.id+'.f32'),reference=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
 // Apply only demuxer-declared skip/discard metadata; no signal alignment search.
 const side=data.packets.flatMap(p=>p.side_data_list??[]).filter(d=>d.side_data_type==='Skip Samples');
 const decoderSkippedSamples=f.codec==='vorbis'?side.reduce((n,d)=>n+(d.skip_samples??0),0):f.codec==='opus'?new DataView(configuration.extradata.buffer,configuration.extradata.byteOffset).getUint16(10,true):0;
 const skip=side.reduce((n,d)=>n+(d.skip_samples??0),0)-decoderSkippedSamples,discard=side.reduce((n,d)=>n+(d.discard_padding??0),0);
 const trimmed=actual.subarray(skip*f.channels,actual.length-discard*f.channels);
 assert.equal(trimmed.length,reference.length,f.id+' complete sample count');
 let maxError=0;for(let i=0;i<trimmed.length;i++)maxError=Math.max(maxError,Math.abs(trimmed[i]-reference[i]));
 assert.ok(maxError<2e-5,f.id+' reference error '+maxError);
 if(f.profile==='lossless'||f.profile==='pcm') {
   assert.equal(skip,0);assert.equal(discard,0);
   if(frames[0].pcm){const referencePCM=await readFile(root+'/'+f.id+'.s32');assert.deepEqual(Buffer.concat(frames.map(f=>Buffer.from(f.pcm.buffer))),referencePCM,f.id+' exact integer PCM');}
   else assert.deepEqual(trimmed,reference,f.id+' exact floating PCM');
 }
 if(!f.codec.startsWith('pcm-')) {
   const corrupt=new PacketAudioDecoder(m,f.codec,new AbortController().signal,configuration);
   let output=[];try { output=corrupt.decode(new Uint8Array([0xff]),0); } catch {} finally {corrupt.dispose();} assert.equal(output.length,0, f.id+' corrupt packet produces no frame');
 }
 if(!f.codec.startsWith('pcm-'))for(const change of [{sampleRate:32000},{channels:f.channels===1?2:1}]) {
  let mismatch;try { assert.throws(()=>{mismatch=new PacketAudioDecoder(m,f.codec,new AbortController().signal,{...configuration,...change});for(const p of data.packets)mismatch.decode(unhex(p.data),Math.round(Number(p.pts_time)*32000));mismatch.flush();},f.id+' configured profile mismatch'); } finally {mismatch?.dispose();}
 }
 if(f.id==='aac-48000-2') {
  const mutable={...configuration},stable=new PacketAudioDecoder(m,f.codec,new AbortController().signal,mutable);mutable.sampleRate=32000;mutable.channels=1;
  try {const output=stable.decode(unhex(data.packets[0].data),0);assert.ok(output.length);assert.equal(output[0].rate,48000);assert.equal(output[0].channels,2);}finally{stable.dispose();}
 }
 const wrongKind=m._mc_create_config(999,f.sampleRate,f.channels,0,0,0);assert.equal(wrongKind,0);
 if(['vorbis','alac'].includes(f.codec))assert.throws(()=>new PacketAudioDecoder(m,f.codec,new AbortController().signal,{...configuration,extradata:new Uint8Array([0])}));
 if(f.codec==='aac') {
   const extra=configuration.extradata.slice();extra[0]=(extra[0]&7)|8; // AudioSpecificConfig AAC Main, outside finite LC contract.
   const main=new PacketAudioDecoder(m,f.codec,new AbortController().signal,{...configuration,extradata:extra});
   assert.throws(()=>main.decode(unhex(data.packets[0].data),Math.round(Number(data.packets[0].pts_time)*f.sampleRate)),e=>e.code==='PROVIDER_PROFILE_MISMATCH');main.dispose();
 }
 const bad=new PacketAudioDecoder(m,f.codec,new AbortController().signal,configuration);assert.throws(()=>bad.decode(new Uint8Array(),0));bad.dispose();
 const aborted=new AbortController(),victim=new PacketAudioDecoder(m,f.codec,aborted.signal,configuration);aborted.abort();assert.throws(()=>victim.flush(),e=>e.name==='AbortError');
 assert.throws(()=>new PacketAudioDecoder(m,f.codec,new AbortController().signal,{...configuration,sampleRate:0}));
 results.push({...f,passed:true,frames:frames.length,actualSamples:actual.length/f.channels,referenceSamples:reference.length/f.channels,comparedSamples:trimmed.length/f.channels,skipSamples:skip,decoderSkippedSamples,discardSamples:discard,maxError,configuredMismatchRejected:!f.codec.startsWith('pcm-'),integerExact:frames[0].pcm!==undefined,doubleExact:f.codec==='pcm-f64le',resetExact:true,ownedFrames:true,flush:true,abort:true,emptyPacketRejected:true});console.log(f.id,'passed',maxError);
}
const inputs=Object.fromEntries(await Promise.all(['native/audio-codecs/decoder.c','packages/provider-audio/src/packet-decoder.ts','scripts/build-audio-providers.py','tests/decoder-family-fixtures.py','tests/decoder-families.mjs'].map(async p=>[p,hash(await readFile(p))])));
await writeFile('build/codec-expansion/decoder-results.json',JSON.stringify({passed:true,inputs,builds,referenceNote:'Vorbis reference uses host FFmpeg -cpuflags 0 because host8.1.2 NEON right-channel output differs; pinned Wasm agrees with scalar host',scope:'packet decoder ABI and host-reference PCM; demuxer metadata skip/discard applied; exact lossless PCM',results},null,2)+'\n');
