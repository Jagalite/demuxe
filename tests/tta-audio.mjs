// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PacketAudioDecoder} from '../build/component-candidates/provider-audio/src/packet-decoder.js';
const root=process.env.TTA_AUDIO_FIXTURE_ROOT??'/tmp/demuxe-tta-fixtures',sha=b=>createHash('sha256').update(b).digest('hex');
const unhex=(s='')=>Uint8Array.from(Buffer.from(s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex'));
const pointer=JSON.parse(await readFile(process.env.TTA_BUILD_POINTER??'/tmp/demuxe-archive-more-builds/archive-more.json')),recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(recordRaw),pointer.recordSHA256);const record=JSON.parse(recordRaw),wasm=await readFile(pointer.directory+'/module.wasm');assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);const moduleBytes=await readFile(pointer.directory+'/module.mjs');assert.equal(sha(moduleBytes),record.artifacts['module.mjs'].sha256);const module=await (await import(pathToFileURL(path.resolve(pointer.directory,'module.mjs')))).default({wasmBinary:wasm});
const results=[];
for(const f of JSON.parse(await readFile(root+'/fixtures.json'))){const row={...f};try{
 const raw=await readFile(root+'/'+f.id+'.json');assert.equal(sha(raw),f.packetSHA256);const data=JSON.parse(raw),config={sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:unhex(data.streams[0].extradata)},packets=data.packets.map(p=>({...p,bytes:unhex(p.data),ptsSamples:Math.round(Number(p.pts_time)*f.sampleRate)}));
 if(f.expectedRejection){assert.throws(()=>new PacketAudioDecoder(module,f.codec,new AbortController().signal,config),e=>e.code===f.expectedRejection);Object.assign(row,{passed:true,unsupportedRateOrLayoutRejected:true});results.push(row);console.log(f.id,'correctly rejected');continue;}
 const d=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config);
 const decodeFrom=start=>{const out=[];for(const p of packets.slice(start))out.push(...d.decode(p.bytes,p.ptsSamples));out.push(...d.flush());assert.deepEqual(d.flush(),[]);return out;};
 try{
  if(f.expectedDecodeRejection){assert.ok(Math.max(...packets.map(p=>p.bytes.length))>1048576);assert.throws(()=>decodeFrom(0),/Invalid audio packet/);Object.assign(row,{passed:true,packetBudgetRejected:true,maxPacketBytes:Math.max(...packets.map(p=>p.bytes.length))});results.push(row);console.log(f.id,'packet budget correctly rejected');continue;}
  if(f.expectedRejection){assert.throws(()=>decodeFrom(0),e=>e.code===f.expectedRejection);Object.assign(row,{passed:true,precisionProfileRejected:true});results.push(row);console.log(f.id,'correctly rejected');continue;}
  const frames=decodeFrom(0);assert.ok(frames.length);assert.ok(frames.every(frame=>frame.pcm&&frame.rate===f.sampleRate&&frame.channels===f.channels));
  const frameBytes=await readFile(root+'/'+f.id+'.frames.json');assert.equal(sha(frameBytes),f.framesSHA256);const hostFrames=JSON.parse(frameBytes).frames;assert.equal(frames.length,hostFrames.length);for(let i=0;i<frames.length;i++){assert.equal(frames[i].pts,Math.round(Number(hostFrames[i].pts_time)*f.sampleRate));assert.equal(frames[i].samples,hostFrames[i].nb_samples);assert.equal(frames[i].layout,f.channels===1?4:f.channels===2?3:63);}
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
 const crc32=bytes=>{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;};
 for(const mode of ['size','magic','encrypted','rate','channels','bits','empty','crc']){
  const extra=config.extradata.slice(),h=new DataView(extra.buffer);if(mode==='magic')extra[0]=0;if(mode==='encrypted')h.setUint16(4,2,true);if(mode==='rate')h.setUint32(10,96000,true);if(mode==='channels')h.setUint16(6,8,true);if(mode==='bits')h.setUint16(8,32,true);if(mode==='empty')h.setUint32(14,0,true);if(mode==='crc')extra[18]^=1;else h.setUint32(18,crc32(extra.subarray(0,18)),true);const invalid=mode==='size'?extra.subarray(0,21):extra;
  assert.throws(()=>new PacketAudioDecoder(module,'tta',new AbortController().signal,{...config,extradata:invalid}),e=>e.code==='PROVIDER_PROFILE_MISMATCH',mode);
  const p=module._malloc(invalid.length);try{module.HEAPU8.set(invalid,p);const owner=module._mc_create_config(23,config.sampleRate,config.channels,config.bitsPerSample,p,invalid.length);if(owner)module._mc_destroy(owner);assert.equal(owner,0,'native header guard '+mode);}finally{module._free(p);}
 }
 const damaged=new PacketAudioDecoder(module,'tta',new AbortController().signal,config),badPacket=packets[0].bytes.slice();badPacket[badPacket.length-1]^=1;try{assert.throws(()=>damaged.decode(badPacket,0),'native TTA packet CRC enforced');}finally{damaged.dispose();}row.headerGuardsAndPacketCRCRejected=true;
 const signal=new AbortController(),victim=new PacketAudioDecoder(module,f.codec,signal.signal,config);signal.abort();assert.throws(()=>victim.flush(),e=>e.name==='AbortError');row.abort=true;console.log(f.id,'PASS');
 }catch(e){Object.assign(row,{passed:false,error:String(e.stack??e)});console.error(f.id,'FAILED',e.message);}results.push(row);}
const canonical=results.find(r=>r.id==='tta-canonical');assert.equal(canonical?.referencePCMHash,'8e96d4eba1b732365ccf582d7bd94593c5c554c4d4a9f87ea773b78604a5aca8','official paired archive codecs decode identical original PCM');
const inputs=Object.fromEntries(await Promise.all(['native/audio-codecs/decoder.c','packages/provider-audio/src/packet-decoder.ts','scripts/build-audio-providers.py','tests/tta-audio-fixtures.py','tests/tta-audio.mjs'].map(async p=>[p,sha(await readFile(p))])));
const report={adapterSHA256:sha(await readFile('build/component-candidates/provider-audio/src/packet-decoder.js')),passed:results.every(r=>r.passed),scope:'Canonical60.48sec TTA1 and finite441/48mono/stereo6 integer16/24 decoderPCM/reset/seek; exactvalidated22byte unencryptedheaderCRC+nativepacketCRC, monoheaderprovesmask4;96framebudget/8wide/32/encryptedblocked; no new container/player admission.',inputs,referenceTool:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],build:{profile:record.profile,source:record.source,sourceKey:record.sourceKey,nativeBuildInputs:record.inputs,recordSHA256:pointer.recordSHA256,module:record.artifacts['module.mjs'],wasm:record.artifacts['module.wasm'],capabilities:record.capabilities},results};await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/tta-audio.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
