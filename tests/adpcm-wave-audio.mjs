// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex'),root=process.env.ADPCM_FIXTURE_ROOT??'/tmp/demuxe-adpcm-wave-fixtures';
const inputPaths=['native/audio-codecs/decoder.c','scripts/build-audio-providers.py','packages/provider-audio/src/packet-decoder.ts','packages/provider-container/src/adpcm-wave.ts','tests/adpcm-wave-fixtures.py','tests/adpcm-wave-audio.mjs'];
const inputs=Object.fromEntries(await Promise.all(inputPaths.map(async p=>[p,sha(await readFile(p))])));
const adapterPath=process.env.ADPCM_ADAPTER_MODULE??'build/component-candidates/provider-audio/src/packet-decoder.js';
const {PacketAudioDecoder}=await import(pathToFileURL(path.resolve(adapterPath)));
const pointer=JSON.parse(await readFile(process.env.ADPCM_BUILD_POINTER??'/tmp/demuxe-adpcm-builds/adpcm-wave.json')),recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(recordRaw),pointer.recordSHA256);const record=JSON.parse(recordRaw);
const retained=JSON.parse(await readFile(process.env.ADPCM_PREFERRED_INPUTS??'/tmp/demuxe-adpcm-source-inputs/recovered-retained.json')).recovered;for(const [p,hash] of Object.entries(record.inputs))assert.equal(sha(await readFile(retained[p]??p)),hash,'native preferred input identity '+p);
const wasm=await readFile(pointer.directory+'/module.wasm'),js=await readFile(pointer.directory+'/module.mjs');assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);assert.equal(sha(js),record.artifacts['module.mjs'].sha256);
const module=await(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default({wasmBinary:wasm}),rows=[];
for(const f of JSON.parse(await readFile(root+'/fixtures.json'))){
 const source=await readFile(f.input);assert.equal(sha(source),f.inputSHA256);const fmt=f.offsets.fmt,extra=source.subarray(fmt+18,fmt+18+source.readUInt16LE(fmt+16)),config={sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:4,extradata:extra,...f.framing};
 const padded=await readFile(root+'/'+f.id+'.padded.s32'),reference=await readFile(root+'/'+f.id+'.s32');assert.equal(sha(padded),f.paddedReferenceSHA256);assert.equal(sha(reference),f.referenceSHA256);
 const count=f.decodedSamples/f.samplesPerBlock,blocks=Array.from({length:count},(_,i)=>source.subarray(f.offsets.data+i*f.blockAlign,f.offsets.data+(i+1)*f.blockAlign));
 const controller=new AbortController(),d=new PacketAudioDecoder(module,f.codec,controller.signal,config);let frames;
 const decodeAll=()=>{const out=[];for(let i=0;i<blocks.length;i++)out.push(...d.decode(blocks[i],i*f.samplesPerBlock));out.push(...d.flush());assert.deepEqual(d.flush(),[]);return out;};
 try{
  frames=decodeAll();assert.equal(frames.length,count);for(let i=0;i<count;i++){const frame=frames[i];assert.equal(frame.pts,i*f.samplesPerBlock);assert.equal(frame.samples,f.samplesPerBlock);assert.equal(frame.rate,f.sampleRate);assert.equal(frame.channels,f.channels);assert.equal(frame.layout,f.channels===1?4:3);assert.ok(frame.pcm);}
  const pcm=Buffer.concat(frames.map(f=>Buffer.from(f.pcm.buffer)));assert.deepEqual(pcm,padded,'independent complete block PCM');assert.deepEqual(pcm.subarray(0,f.referenceSamples*f.channels*4),reference,'explicit fact tail trim');
  d.reset();assert.deepEqual(decodeAll().map(({generation,...frame})=>frame),frames.map(({generation,...frame})=>frame),'reset and owned frames');
  for(const index of [...new Set([0,Math.floor(count*.25),Math.floor(count*.7),count-1])]){d.reset();const actual=[...d.decode(blocks[index],index*f.samplesPerBlock),...d.flush()];assert.equal(actual.length,1);assert.equal(actual[0].pts,index*f.samplesPerBlock);assert.deepEqual(Buffer.from(actual[0].pcm.buffer),padded.subarray(index*f.samplesPerBlock*f.channels*4,(index+1)*f.samplesPerBlock*f.channels*4),'original block independent restart');}
 }finally{d.dispose();d.dispose();}
 for(const change of [{sampleRate:96000},{channels:6},{bitsPerSample:16},{blockAlign:f.blockAlign-1},{bitRate:0},{extradata:extra.subarray(1)}])assert.throws(()=>new PacketAudioDecoder(module,f.codec,new AbortController().signal,{...config,...change}),e=>e.code==='PROVIDER_PROFILE_MISMATCH');
 const altered=Uint8Array.from(extra);altered[0]^=1;assert.throws(()=>new PacketAudioDecoder(module,f.codec,new AbortController().signal,{...config,extradata:altered}),e=>e.code==='PROVIDER_PROFILE_MISMATCH');
 for(const mode of ['partial','grouped','header','secondary','negativePTS','overflowEndPTS']){const decoder=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config);try{let packet=Uint8Array.from(blocks[0]);if(mode==='partial')packet=packet.subarray(1);if(mode==='grouped')packet=Buffer.concat([packet,packet]);if(mode==='header')packet[f.codec==='adpcm-ms'?0:2]=255;if(mode==='secondary'){if(f.codec==='adpcm-ms')packet[f.channels]=packet[f.channels+1]=0;else packet[3]=1;}assert.throws(()=>decoder.decode(packet,mode==='negativePTS'?-1:mode==='overflowEndPTS'?Number.MAX_SAFE_INTEGER:0),e=>e.code==='PROVIDER_PROFILE_MISMATCH');assert.throws(()=>decoder.flush());}finally{decoder.dispose();}}
 // Independently bypass JS guards to prove native one-block/header admission.
 const ep=module._malloc(extra.length);module.HEAPU8.set(extra,ep);const owner=module._mc_create_config_v2(f.codec==='adpcm-ms'?29:30,f.sampleRate,f.channels,4,ep,extra.length,f.blockAlign,config.bitRate);module._free(ep);assert.ok(owner);const pp=module._malloc(f.blockAlign*2);try{module.HEAPU8.set(blocks[0],pp);assert.ok(module._mc_decode(owner,pp,f.blockAlign-1,0)<0);const bad=Uint8Array.from(blocks[0]);bad[f.codec==='adpcm-ms'?0:2]=255;module.HEAPU8.set(bad,pp);assert.ok(module._mc_decode(owner,pp,bad.length,0)<0);}finally{module._free(pp);module._mc_destroy(owner);}
 const aborted=new AbortController(),victim=new PacketAudioDecoder(module,f.codec,aborted.signal,config);aborted.abort();assert.throws(()=>victim.decode(blocks[0],0),e=>e.name==='AbortError');victim.dispose();
 rows.push({id:f.id,codec:f.codec,sampleRate:f.sampleRate,channels:f.channels,sourceSHA256:f.inputSHA256,referenceSHA256:f.referenceSHA256,paddedReferenceSHA256:f.paddedReferenceSHA256,blocks:count,decodedSamples:f.decodedSamples,presentationSamples:f.referenceSamples,discardPaddingSamples:f.decodedSamples-f.referenceSamples,integerExact:true,independentBlockRestarts:4});console.log('ADPCM PASS',f.id,count,'blocks');
}
for(const [p,hash] of Object.entries(inputs))assert.equal(sha(await readFile(p)),hash,'proof input unchanged '+p);
const report={passed:true,scope:'WAV ADPCM one complete original block per packet, exact signed16 PCM, original packet sample clock, explicit final fact clipping; no public composition route.',inputs,adapterSHA256:sha(await readFile(adapterPath)),build:{recordSHA256:pointer.recordSHA256,inputs:record.inputs,module:record.artifacts['module.mjs'],wasm:record.artifacts['module.wasm']},rows};await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/adpcm-wave-audio.json',JSON.stringify(report,null,2)+'\n');
