// SPDX-License-Identifier: Apache-2.0
// Maintained complete recipes, with host-decoded output and lifecycle checks.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {repairMatroskaAudio,repairMatroskaAudioFragments} from '../build/component-candidates/provider-container/src/audio-repair.js';
import {MatroskaReader} from '../build/component-candidates/provider-container/src/matroska.js';
import {PacketAudioDecoder} from '../build/component-candidates/provider-audio/src/packet-decoder.js';
import {PacketFlacEncoder} from '../build/component-candidates/provider-audio/src/flac-encoder.js';
const root=process.env.AUDIO_BUILD_ROOT??'build/audio-providers-production';
const work='build/provider-lossless-audio',hash=b=>createHash('sha256').update(b).digest('hex');
await mkdir(work,{recursive:true});
async function load(profile){
 const pointer=JSON.parse(await readFile(root+'/'+profile+'.json','utf8'));
 const raw=await readFile(pointer.directory+'/build-record.json');assert.equal(hash(raw),pointer.recordSHA256);
 const record=JSON.parse(raw),bytes=await readFile(pointer.directory+'/module.wasm');assert.equal(hash(bytes),record.artifacts['module.wasm'].sha256);
 const factory=(await import(pathToFileURL(path.resolve(pointer.directory,'module.mjs')))).default;
 return {module:await factory({wasmBinary:bytes}),record};
}
const pair=await load('truehd-mlp'),dts=await load('dts-hd'),flac=await load('flac');
assert.equal(pair.record.sourceKey,dts.record.sourceKey);assert.equal(pair.record.sourceKey,flac.record.sourceKey);
assert.equal(pair.module._mc_create(5),0);assert.equal(dts.module._mc_create(2),0);
const {fixtures}=JSON.parse(await readFile(work+'/fixtures.json','utf8'));
const ff=(args)=>execFileSync('ffmpeg',['-v','error',...args],{maxBuffer:128*1024*1024});
const raw=(file,format)=>ff(['-i',file,'-map',format==='rawvideo'?'0:v:0':'0:a:0','-f',format,'-']);
const results=[];
for(const f of fixtures){
 const input=work+'/'+f.id+'.mkv',output=work+'/'+f.id+'.mp4';
 const source=await readFile(input),controller=new AbortController(),module=f.codec==='dts-hd'?dts.module:pair.module;
 const components={codec:f.codec,channels:f.channels,decoder:(codec,signal)=>new PacketAudioDecoder(module,codec,signal),encoder:(channels,signal)=>new PacketFlacEncoder(flac.module,channels,signal)};
 const began=performance.now();
 const repaired=await repairMatroskaAudio(new Blob([source]),components,controller.signal);
 const preparationMs=performance.now()-began;
 const bytes=new Uint8Array(await repaired.arrayBuffer());await writeFile(output,bytes);
 const before=raw(input,'s32le'),after=raw(output,'s32le');assert.deepEqual(after,before,f.id+' PCM');
 const reference=raw(output,'f32le');await writeFile(work+'/'+f.id+'.reference.f32',reference);
 assert.deepEqual(raw(output,'rawvideo'),raw(input,'rawvideo'),f.id+' video');
 const streamed=[];
 for await(const part of repairMatroskaAudioFragments(new Blob([source]),components,controller.signal))streamed.push(part);
 assert.equal(hash(Buffer.concat(streamed)),hash(bytes));
 let destroyed=0;
 const iterator=repairMatroskaAudioFragments(new Blob([source]),{...components,decoder:(codec,signal)=>{const d=new PacketAudioDecoder(module,codec,signal);const dispose=d.dispose.bind(d);d.dispose=()=>{destroyed++;dispose();};return d;}},controller.signal);
 assert.equal((await iterator.next()).done,false);await iterator.return();assert.equal(destroyed,1);
 const repeat=await repairMatroskaAudio(new Blob([source]),components,controller.signal);assert.equal(hash(new Uint8Array(await repeat.arrayBuffer())),hash(bytes));
 const reader=await MatroskaReader.open(new Blob([source]),controller.signal),audio=reader.tracks.find(t=>t.kind==='audio');
 const decoder=new PacketAudioDecoder(module,f.codec,controller.signal);let first;
 for await(const p of reader.packets())if(p.track===audio.number){const frames=decoder.decode(p.data,Math.round(p.timestampNs*48000/1e9));if(frames.length){first=frames;break;}}
 assert.ok(first?.length);const held=first[0].pcm.slice();decoder.reset();assert.deepEqual(first[0].pcm,held);decoder.dispose();decoder.dispose();
 await assert.rejects(()=>repairMatroskaAudio(new Blob([source.subarray(0,100)]),components,controller.signal));
 await assert.rejects(()=>repairMatroskaAudio(new Blob([source]),{...components,codec:f.codec==='truehd'?'mlp':'truehd'},controller.signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');
 controller.abort();await assert.rejects(()=>repairMatroskaAudio(new Blob([source]),components,controller.signal),e=>e.name==='AbortError');
 const result={...f,input,output,sourceSHA256:hash(source),outputSHA256:hash(bytes),outputBytes:bytes.length,audioSamples:before.length/(4*f.channels),audioDecodedExact:true,videoDecodedExact:true,repeatExact:true,ownedPCM:true,reset:true,truncationRejected:true,wrongCodecRejected:true,abort:true,streamExact:true,iteratorReturnDisposes:true,preparationMs};results.push(result);console.log(result.id,'passed');
}
await mkdir('results/media-components/production-audio',{recursive:true});
await writeFile('results/media-components/production-audio/host-recipes.json',JSON.stringify({passed:true,scope:'maintained bounded 48 kHz integer repair recipes; host output only',builds:[pair.record,dts.record,flac.record],results},null,2)+'\n');
