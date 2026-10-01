// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const adapterPath=process.env.TAK_ADAPTER_MODULE??'build/component-candidates/provider-audio/src/packet-decoder.js';const {PacketAudioDecoder}=await import(pathToFileURL(path.resolve(adapterPath)));
const {TakReader,takCRC24}=await import(pathToFileURL(path.resolve(process.env.TAK_READER_MODULE??'build/component-candidates/provider-container/src/tak.js')));
const root=process.env.TAK_AUDIO_FIXTURE_ROOT??'/tmp/demuxe-tak-fixtures',sha=b=>createHash('sha256').update(b).digest('hex');
const unhex=(s='')=>Buffer.from(s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex');
const pointer=JSON.parse(await readFile(process.env.TAK_BUILD_POINTER??'/tmp/demuxe-tak-builds/archive-next.json')),raw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(raw),pointer.recordSHA256);const record=JSON.parse(raw),wasm=await readFile(pointer.directory+'/module.wasm'),mjs=await readFile(pointer.directory+'/module.mjs');assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);assert.equal(sha(mjs),record.artifacts['module.mjs'].sha256);const module=await(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default({wasmBinary:wasm});
const results=[];
for(const f of JSON.parse(await readFile(root+'/fixtures.json'))){if(f.codec!=='tak')continue;const row={id:f.id};try{
 const input=await readFile(f.input);assert.equal(sha(input),f.inputSHA256);const signal=new AbortController();
 if(f.expectedRejection||f.expectedDecodeRejection){await assert.rejects(()=>TakReader.open(new Blob([input]),signal.signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');Object.assign(row,{passed:true,sourceProfileRejected:true});results.push(row);continue;}
 const reader=await TakReader.open(new Blob([input]),signal.signal),track=reader.tracks[0],indexBytesRead=reader.bytesRead;assert.equal(track.rate,f.sampleRate);assert.equal(track.channels,f.channels);assert.equal(track.bitDepth,f.bitsPerSample);
 const packetRaw=await readFile(root+'/'+f.id+'.json');assert.equal(sha(packetRaw),f.packetSHA256);const packets=JSON.parse(packetRaw).packets,decoder=new PacketAudioDecoder(module,'tak',signal.signal,{sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:track.privateData});
 try{
  const frames=[];let count=0;for await(const p of reader.packets()){const host=packets[count++];assert.deepEqual(Buffer.from(p.data),unhex(host.data));assert.equal(p.startSample,Math.round(Number(host.pts_time)*f.sampleRate));frames.push(...decoder.decode(p.data,p.startSample));}frames.push(...decoder.flush());assert.equal(count,packets.length);
  const reference=await readFile(root+'/'+f.id+'.s32');assert.equal(sha(reference),f.referenceSHA256);assert.deepEqual(Buffer.concat(frames.map(f=>Buffer.from(f.pcm.buffer))),reference);assert.equal(reader.sampleCount,reference.length/(4*f.channels));
  const seeks=[];for(const seconds of reader.sampleCount/f.sampleRate>10?[96.25,16.75,120.5,4.75]:[4.25,.75]){const target=Math.round(seconds*f.sampleRate),preroll=Math.round(.5*f.sampleRate);decoder.reset();let compared=0,first;
   for await(const p of reader.packets(target,preroll)){first??=p.startSample;for(const frame of decoder.decode(p.data,p.startSample)){const from=Math.max(target,frame.pts),to=Math.min(target+Math.round(.4*f.sampleRate),frame.pts+frame.samples);if(to<=from)continue;assert.deepEqual(Buffer.from(frame.pcm.subarray((from-frame.pts)*f.channels,(to-frame.pts)*f.channels).buffer,frame.pcm.byteOffset+(from-frame.pts)*f.channels*4,(to-from)*f.channels*4),reference.subarray(from*f.channels*4,to*f.channels*4));compared+=to-from;}}
   assert.ok(first<=target-preroll);assert.equal(compared,Math.round(.4*f.sampleRate));seeks.push({seconds,firstSample:first,comparedSamples:compared,integerExact:true});
  }
  Object.assign(row,{passed:true,packets:count,samples:reader.sampleCount,packetExact:true,integerExact:true,seeks,indexBytesRead,bytesRead:reader.bytesRead});
 }finally{decoder.dispose();}
 const aborted=new AbortController();aborted.abort();await assert.rejects(()=>TakReader.open(new Blob([input]),aborted.signal),e=>e.name==='AbortError');row.abort=true;console.log(f.id,'standalone PASS');
 }catch(e){Object.assign(row,{passed:false,error:String(e.stack??e)});console.error(f.id,'FAILED',e.message);}results.push(row);}
const original=await readFile(root+'/tak-canonical.tak');const writeCRC=(bytes,offset,length)=>{const crc=takCRC24(bytes.subarray(offset,offset+length-3));for(let i=0;i<3;i++)bytes[offset+length-3+i]=crc>>>(8*i)&255;};
const metadata=[];let cursor=4;while(true){const type=original[cursor]&127,size=original[cursor+1]|original[cursor+2]<<8|original[cursor+3]<<16;metadata.push({type,offset:cursor,data:cursor+4,size});cursor+=4+size;if(!type)break;}const dataStart=cursor,lastMeta=metadata.find(m=>m.type===7),packetData=JSON.parse(await readFile(root+'/tak-canonical.json')).packets,firstPacket=unhex(packetData[0].data),lastFrameOffset=Number(original.readUIntLE(lastMeta.data,5)),lastStart=dataStart+lastFrameOffset;
let negativeControls=0;
for(const mode of ['magic','streamCRC','profile','precision','lastCRC','lastExtent','unknownMetadata','duplicateMetadata','endSize','frameHeaderCRC','frameBodyCRC','finalSamples','truncated','trailing']){const bytes=Buffer.from(original);let data=bytes;
 if(mode==='magic')bytes[0]^=1;if(mode==='streamCRC')bytes[18]^=1;
 if(mode==='profile'){bytes[8]^=1;writeCRC(bytes,8,13);}if(mode==='precision'){bytes[16]^=1;writeCRC(bytes,8,13);}
 if(mode==='lastCRC')bytes[lastMeta.data+8]^=1;if(mode==='lastExtent'){bytes[lastMeta.data]^=1;writeCRC(bytes,lastMeta.data,lastMeta.size);}
 if(mode==='unknownMetadata')bytes[metadata.find(m=>m.type===3).offset]=2;if(mode==='duplicateMetadata')bytes[metadata.find(m=>m.type===4).offset]=1;
 if(mode==='endSize')bytes[metadata.at(-1).offset+1]=1;if(mode==='frameHeaderCRC')bytes[dataStart+16]^=1;if(mode==='frameBodyCRC')bytes[dataStart+firstPacket.length-1]^=1;
 if(mode==='finalSamples'){bytes[lastStart+5]^=1;writeCRC(bytes,lastStart,21);}if(mode==='truncated')data=bytes.subarray(0,-1);if(mode==='trailing')data=Buffer.concat([bytes,Buffer.from([0])]);
 await assert.rejects(()=>TakReader.open(new Blob([data]),new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH',mode);negativeControls++;
}
const sourceSignal=new AbortController(),sourceReader=await TakReader.open(new Blob([original]),sourceSignal.signal);for(const args of [[-1,0],[sourceReader.sampleCount,0],[0,-1],[0,Infinity]])await assert.rejects(()=>sourceReader.packets(...args).next(),e=>e.code==='PROVIDER_PROFILE_MISMATCH');sourceSignal.abort();await assert.rejects(()=>sourceReader.packets().next(),e=>e.name==='AbortError');
const inputs=Object.fromEntries(await Promise.all(['packages/provider-container/src/tak.ts','tests/tak-audio-standalone.mjs','packages/provider-audio/src/packet-decoder.ts'].map(async p=>[p,sha(await readFile(p))]))),report={adapterSHA256:sha(await readFile(adapterPath)),passed:results.every(r=>r.passed),scope:'Bounded canonical TAK codec2/profile2,44100mono16,125ms frames; validatedmetadata+header/bodyCRC index, originalpacket/sampleclock/PCM with exactnativeforward/backwardHAS_INFOkeyseeks. Full compressedpayload scan required; not sparse metadata-only opening. Other profiles/tags unsupported.',negativeControls,inputs,readerModuleSHA256:sha(await readFile(process.env.TAK_READER_MODULE??'build/component-candidates/provider-container/src/tak.js')),nativeBuildInputs:record.inputs,build:{recordSHA256:pointer.recordSHA256,module:record.artifacts['module.mjs'],wasm:record.artifacts['module.wasm']},results};await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/tak-audio-standalone.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
