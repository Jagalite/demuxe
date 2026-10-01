// SPDX-License-Identifier: Apache-2.0
// Actual PCM decoder/encoder integration, including precision rejection.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {repairPcmAudio} from '../build/component-candidates/provider-container/src/audio-repair.js';
import {PacketAudioDecoder} from '../build/component-candidates/provider-audio/src/packet-decoder.js';
import {PacketFlacEncoder} from '../build/component-candidates/provider-audio/src/flac-encoder.js';
import {PacketOpusEncoder} from '../build/component-candidates/provider-audio/src/opus-encoder.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const evidence=JSON.parse(await readFile('results/media-components/codec-expansion/wave-aiff.json'));
const out=await mkdtemp(path.join(os.tmpdir(),'demuxe-wave-compositions-'));
const builds={},modules={};
for(const profile of ['pcm','flac','opus-encoder']){
 const pointer=JSON.parse(await readFile('build/codec-expansion/decoder-families/'+profile+'.json'));
 const raw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(raw),pointer.recordSHA256);
 const record=JSON.parse(raw);
 for(const [file,item]of Object.entries(record.artifacts))assert.equal(sha(await readFile(pointer.directory+'/'+file)),item.sha256);
 const factory=(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default;
 modules[profile]=await factory({wasmBinary:await readFile(pointer.directory+'/module.wasm')});
 builds[profile]={recordSHA256:pointer.recordSHA256,sourceKey:record.sourceKey,artifacts:record.artifacts};
}
const ff=args=>execFileSync('ffmpeg',['-v','error','-cpuflags','0',...args],{maxBuffer:32*1024*1024});
const cases=evidence.results.filter(f=>f.format).map(f=>({...f,input:path.join(evidence.home,f.id+'.'+f.format)}));
// Independently generated floating PCM with exactly representable 24-bit values.
for(const f of cases.filter(f=>f.format==='wav'&&f.codec==='pcm-s24le'))for(const bits of [32,64]){
 const id=f.id+'-exact-f'+bits,input=out+'/'+id+'.wav';
 ff(['-y','-i',f.input,'-c:a','pcm_f'+bits+'le',input]);
 cases.push({...f,id,input,codec:'pcm-f'+bits+'le',inputSHA256:sha(await readFile(input)),exactFloat:true});
}
const results=[];
for(const f of cases)for(const output of (f.rate===48000&&f.channels===2?['flac','opus']:['flac'])){
 const source=await readFile(f.input);assert.equal(sha(source),f.inputSHA256);
 const reference=ff(['-i',f.input,'-map','0:a:0','-f','f64le','-']);
 let precisionRejected=false;
 if(output==='flac')for(let i=0;i<reference.length;i+=8)if(!Number.isInteger(reference.readDoubleLE(i)*8388608)){precisionRejected=true;break;}
 const abort=new AbortController();let blob;
 try{blob=await repairPcmAudio(new Blob([source]),{codec:f.codec,channels:f.channels,sampleRate:f.rate,output,
  decoder:(codec,signal,config)=>new PacketAudioDecoder(modules.pcm,codec,signal,config),
  encoder:(channels,signal,rate)=>output==='flac'?new PacketFlacEncoder(modules.flac,channels,signal,0,rate):new PacketOpusEncoder(modules['opus-encoder'],channels,signal),
 },abort.signal);}catch(error){if(precisionRejected&&/precision exceeds/.test(error.message)){results.push({id:f.id,output,passed:true,precisionRejected:true,inputSHA256:sha(source)});continue;}throw error;}finally{abort.abort();}
 assert.equal(precisionRejected,false,'Required precision rejection did not occur');assert.equal(blob.type,'audio/mp4');
 const bytes=Buffer.from(await blob.arrayBuffer()),file=out+'/'+f.id+'-'+output+'.mp4';await writeFile(file,bytes);
 const decoded=ff(['-i',file,'-map','0:a:0','-f','f64le','-']);
 const streams=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-of','json',file],{encoding:'utf8'})).streams;
 assert.equal(streams.length,1);assert.equal(streams[0].codec_type,'audio');assert.equal(Number(streams[0].sample_rate),f.rate);assert.equal(streams[0].channels,f.channels);
 if(output==='flac')assert.deepEqual(decoded,reference,'Exact original PCM changed');
 else{
  assert.ok(decoded.length>=reference.length&&decoded.length-reference.length<=960*f.channels*8);
  let energy=0,error=0;for(let i=0;i<reference.length;i+=8){const a=decoded.readDoubleLE(i),b=reference.readDoubleLE(i);energy+=b*b;error+=(a-b)**2;}
  assert.ok(10*Math.log10(energy/Math.max(error,1e-30))>15,'Opus signal quality');
 }
 results.push({id:f.id,codec:f.codec,output,rate:f.rate,channels:f.channels,samples:reference.length/(8*f.channels),inputSHA256:sha(source),outputSHA256:sha(bytes),exactPCM:output==='flac',passed:true});
}
const sources={};for(const f of ['packages/provider-container/src/audio-repair.ts','packages/provider-container/src/wave-aiff.ts','packages/provider-container/src/fmp4.ts','packages/provider-audio/src/packet-decoder.ts','packages/provider-audio/src/flac-encoder.ts','tests/provider-wave-aiff-compositions.mjs'])sources[f]=sha(await readFile(f));
await writeFile('results/media-components/codec-expansion/wave-aiff-compositions.json',JSON.stringify({schema:1,passed:true,scope:'Finite audio-only WAV/AIFF conversion; independent original PCM, exact rate/channels and mandatory FLAC24 precision guards; no browser qualification',builds,sources,results,scratch:out},null,2)+'\n');
console.log({passed:true,cases:results.length,precisionRejections:results.filter(r=>r.precisionRejected).length});
