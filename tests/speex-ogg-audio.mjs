// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
const root=process.env.SPEEX_OGG_FIXTURE_ROOT??'/tmp/demuxe-speex-ogg-fixtures';
const referenceRoot=process.env.SPEEX_OGG_REFERENCE_ROOT??'/tmp/demuxe-speex-ogg-nofma-reference';
const referenceBuildRaw=await readFile(referenceRoot+'/build-record.json'),referenceBuild=JSON.parse(referenceBuildRaw);
for(const name of ['ffmpeg','ffprobe'])assert.equal(sha(await readFile(referenceRoot+'/'+name)),referenceBuild.artifacts[name].sha256);
const adapter=process.env.SPEEX_OGG_ADAPTER_MODULE??path.resolve('build/component-candidates/provider-audio/src/packet-decoder.js');
const {PacketAudioDecoder}=await import(pathToFileURL(adapter));
const pointer=JSON.parse(await readFile('/tmp/demuxe-speex-signed-builds/speech.json'));
const recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(recordRaw),pointer.recordSHA256);
const record=JSON.parse(recordRaw),wasm=await readFile(pointer.directory+'/module.wasm'),js=await readFile(pointer.directory+'/module.mjs');
assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);assert.equal(sha(js),record.artifacts['module.mjs'].sha256);
const module=await(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default({wasmBinary:wasm});
const unhex=s=>Uint8Array.from(Buffer.from(s.split('\n').filter(s=>s.includes(':')).map(s=>s.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex'));
function compare(actual,reference,whole=true){
 assert.equal(actual.length*4,reference.length);let maxAbsoluteError=0,energy=0,error=0;
 for(let i=0;i<actual.length;i++){const ref=reference.readFloatLE(i*4),diff=actual[i]-ref;assert.ok(Number.isFinite(actual[i])&&Number.isFinite(ref));maxAbsoluteError=Math.max(maxAbsoluteError,Math.abs(diff));energy+=ref*ref;error+=diff*diff;}
 const snr=10*Math.log10(energy/Math.max(error,1e-30));assert.ok(maxAbsoluteError<7e-5&&(!whole||snr>80),`Speex scalar error ${maxAbsoluteError}, SNR ${snr}`);return{maxAbsoluteError,snr};
}
const manifestRaw=await readFile(root+'/fixtures.json'),fixtures=JSON.parse(manifestRaw),results=[];let controls=0;
for(const f of fixtures){
 assert.equal(sha(referenceBuildRaw),f.referenceBuildSHA256);assert.equal(sha(await readFile(f.input)),f.inputSHA256);const packetsRaw=await readFile(root+'/'+f.id+'.json'),framesRaw=await readFile(root+'/'+f.id+'.frames.json'),reference=await readFile(root+'/'+f.id+'.f32');
 assert.equal(sha(packetsRaw),f.packetSHA256);assert.equal(sha(framesRaw),f.framesSHA256);assert.equal(sha(reference),f.referenceF32SHA256);
 const data=JSON.parse(packetsRaw),header=unhex(data.streams[0].extradata),metadata=JSON.parse(framesRaw).frames;
 const packets=data.packets.map(p=>({bytes:unhex(p.data),originalPTS:Number(p.pts),pts:Number(p.pts)}));
 assert.equal(sha(header),f.extraDataSHA256);
 const config={sampleRate:f.sampleRate,channels:1,bitsPerSample:0,extradata:header},signal=new AbortController().signal,d=new PacketAudioDecoder(module,'speex',signal,config);
 const full=()=>{const frames=[];for(let i=0;i<packets.length;i++){const p=packets[i],out=d.decode(p.bytes,p.pts);assert.equal(out.length,1);const frame=out[0];assert.equal(frame.pts,p.pts);assert.equal(frame.duration,0);assert.equal(frame.samples,metadata[i].nb_samples);assert.equal(metadata[i].pts,p.originalPTS);assert.equal(frame.timestampOrigin,undefined);assert.equal(module._mc_info(d.owner,11),0);assert.equal(frame.rate,f.sampleRate);assert.equal(frame.channels,1);assert.equal(frame.layout,4);frames.push(frame);}assert.deepEqual(d.flush(),[]);assert.deepEqual(d.flush(),[]);return frames;};
 let original,comparison;const seeks=[];
 try{
  original=full();const pcm=Float32Array.from(original.flatMap(f=>Array.from(f.planes[0])));comparison=compare(pcm,reference);assert.equal(pcm.length,f.referenceSamples);
  assert.throws(()=>compare(new Float32Array(pcm.length),reference));controls++;
  d.reset();assert.deepEqual(full().map(({generation,...frame})=>frame),original.map(({generation,...frame})=>frame));
  for(const fraction of [.8,.3,.95,.1]){d.reset();const target=Math.floor(packets.length*fraction);let frame;for(let i=0;i<=target;i++)frame=d.decode(packets[i].bytes,packets[i].pts)[0];assert.deepEqual(frame.planes,original[target].planes);seeks.push({packet:target,originalPTS:packets[target].originalPTS,nativePTS:frame.pts,...compare(frame.planes[0],reference.subarray(target*f.frameSamples*4,(target+1)*f.frameSamples*4),false)});}
 }finally{d.dispose();d.dispose();}
 // Header/configuration mutation rejects before any native owner is acquired.
 for(const offset of [0,28,32,36,40,44,48,52,56,60,64,68,72,76]){const extra=header.slice();extra[offset]^=1;assert.throws(()=>new PacketAudioDecoder(module,'speex',signal,{...config,extradata:extra}),e=>e.code==='PROVIDER_PROFILE_MISMATCH');controls++;}
 for(const changed of [{sampleRate:16000},{channels:2},{bitsPerSample:16},{blockAlign:1},{bitRate:8000},{extradata:header.subarray(0,79)},{extradata:new Uint8Array()}]){assert.throws(()=>new PacketAudioDecoder(module,'speex',signal,{...config,...changed}),e=>e.code==='PROVIDER_PROFILE_MISMATCH');controls++;}
 const corrupt=new PacketAudioDecoder(module,'speex',signal,config);try{assert.throws(()=>{const pcm=[];for(const packet of packets){const changed=packet.bytes.slice();changed.fill(0);for(const frame of corrupt.decode(changed,packet.pts))pcm.push(...frame.planes[0]);}for(const frame of corrupt.flush())pcm.push(...frame.planes[0]);compare(Float32Array.from(pcm),reference);});controls++;}finally{corrupt.dispose();}
 for(const pts of [-f.frameSamples,Infinity,Number.MAX_SAFE_INTEGER]){const bad=new PacketAudioDecoder(module,'speex',signal,config);try{assert.throws(()=>bad.decode(packets[0].bytes,pts));controls++;}finally{bad.dispose();}}
 const abort=new AbortController(),victim=new PacketAudioDecoder(module,'speex',abort.signal,config);abort.abort();assert.throws(()=>victim.flush(),e=>e.name==='AbortError');victim.dispose();controls++;
 // Independent C header checks cannot be bypassed by a different adapter.
 const p=module._malloc(80);try{for(const offset of [0,28,32,36,40,44,48,52,56,60,64,68,72,76]){const extra=header.slice();extra[offset]^=1;module.HEAPU8.set(extra,p);assert.equal(module._mc_create_config(35,f.sampleRate,1,0,p,80),0);controls++;}}finally{module._free(p);}
 const h=module._malloc(80),payload=module._malloc(packets[0].bytes.length);let owner=0;try{module.HEAPU8.set(header,h);module.HEAPU8.set(packets[0].bytes,payload);owner=module._mc_create_config(35,f.sampleRate,1,0,h,80);assert.ok(owner);for(const pts of [-f.frameSamples,NaN,Infinity,.5,Number.MAX_SAFE_INTEGER]){assert.ok(module._mc_decode(owner,payload,packets[0].bytes.length,pts)<0);controls++;}assert.equal(module._mc_decode(owner,payload,packets[0].bytes.length,f.originalFirstPTS),0);assert.equal(module._mc_frame(owner),0);assert.equal(module._mc_info(owner,4),f.originalFirstPTS);assert.equal(module._mc_info(owner,11),0);}finally{if(owner)module._mc_destroy(owner);module._free(h);module._free(payload);}
 results.push({id:f.id,inputSHA256:f.inputSHA256,generated:f.generated,originalFirstPTS:f.originalFirstPTS,frameSamples:f.frameSamples,decodedSamples:f.referenceSamples,presentationEndSample:f.presentationEndSample,resetExact:true,seeks,...comparison});
}
const paths=['native/audio-codecs/decoder.c','packages/provider-audio/src/packet-decoder.ts','packages/provider-audio/src/speex-config.ts','scripts/build-speex-ogg-reference.py','tests/speex-ogg-fixtures.py','tests/speex-ogg-audio.mjs'];
const report={passed:true,scope:'Actual Ogg headers: generated Xiph speech8k narrowband and original VideoLAN32k ultrawideband mono, one CBR frame per packet. Full coded PCM with unchanged signed original packet PTS; no Ogg presentation conversion, FLV gap composition, Player, release or broad mode qualification.',controls,results,fixtureSHA256:sha(manifestRaw),adapterSHA256:sha(await readFile(adapter)),sourceInputs:Object.fromEntries(await Promise.all(paths.map(async p=>[p,sha(await readFile(p))]))),native:{recordSHA256:pointer.recordSHA256,...record},referenceBuild:{recordSHA256:sha(referenceBuildRaw),...referenceBuild}};
await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/speex-ogg-audio.json',JSON.stringify(report,null,2)+'\n');console.log('Speex Ogg native PASS',results.length,'streams',controls,'controls');
