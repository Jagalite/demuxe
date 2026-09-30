// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,open} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {repairMatroskaAudio,repairMatroskaAudioFragments} from '../build/component-candidates/provider-container/src/audio-repair.js';
import {PacketAudioDecoder} from '../build/component-candidates/provider-audio/src/packet-decoder.js';
import {PacketFlacEncoder} from '../build/component-candidates/provider-audio/src/flac-encoder.js';
const work='build/provider-lossless-audio';await mkdir(work,{recursive:true});
async function load(profile){const pointer=JSON.parse(await readFile('build/audio-providers-production/'+profile+'.json'));const factory=(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default;return factory({wasmBinary:await readFile(pointer.directory+'/module.wasm')});}
const decoderModule=await load('truehd-mlp'),encoderModule=await load('flac');
const signal=new AbortController().signal;
const components={codec:'truehd',channels:2,decoder:(codec,signal)=>new PacketAudioDecoder(decoderModule,codec,signal),encoder:(channels,signal)=>new PacketFlacEncoder(encoderModule,channels,signal)};
const source=await readFile(work+'/truehd-stereo.mkv');
const padding=65*1024*1024,voidSize=Buffer.from([0x10|(padding>>>24),padding>>>16&255,padding>>>8&255,padding&255]);
const large=new Blob([source,Buffer.from([0xec]),voidSize,new Uint8Array(padding)]);
assert.ok(large.size>64*1024*1024);await assert.rejects(()=>repairMatroskaAudio(large,components,signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH');
const output=[];for await(const part of repairMatroskaAudioFragments(large,components,signal))output.push(part);
const host=JSON.parse(await readFile('results/media-components/production-audio/host-recipes.json'));
const hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(Buffer.concat(output)),host.results.find(f=>f.id==='truehd-stereo').outputSHA256);
const input=work+'/long-truehd.mkv',file=work+'/long-truehd.mp4';
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','testsrc2=size=160x90:rate=30','-f','lavfi','-i','aevalsrc=0.08*sin(2*PI*220*t)|0.08*sin(2*PI*330*t):s=48000:d=120:c=stereo','-map','0:v:0','-map','1:a:0','-t','120','-c:v','libx264','-bf','0','-preset','ultrafast','-c:a','truehd','-strict','-2',input]);
const longSource=await readFile(input);let calls=0,disposed=0;
const counted={...components,decoder:(codec,signal)=>{const d=new PacketAudioDecoder(decoderModule,codec,signal),decode=d.decode.bind(d),dispose=d.dispose.bind(d);d.decode=(...args)=>{calls++;return decode(...args);};d.dispose=()=>{disposed++;dispose();};return d;}};
const partial=repairMatroskaAudioFragments(new Blob([longSource]),counted,signal);
await partial.next();assert.equal(calls,0);await partial.next();assert.ok(calls>0&&calls<1200);await partial.return();assert.equal(disposed,1);
const handle=await open(file,'w');let total=0,maxChunkBytes=0,chunks=0;const began=performance.now();
try{for await(const part of repairMatroskaAudioFragments(new Blob([longSource]),components,signal)){total+=part.length;chunks++;maxChunkBytes=Math.max(maxChunkBytes,part.length);await handle.write(part);}}finally{await handle.close();}
const preparationMs=performance.now()-began;
for(const [stream,fmt]of [['0:a:0','s32le'],['0:v:0','rawvideo']]){
 const digest=file=>{const data=execFileSync('ffmpeg',['-v','error','-i',file,'-map',stream,'-f',fmt,'-'],{maxBuffer:512*1024*1024});return {bytes:data.length,sha256:hash(data)};};assert.deepEqual(digest(file),digest(input));
}
const result={passed:true,scope:'120-second technical AVC + TrueHD streaming recipe with host-exact PCM/video, demand-driven output and iterator cleanup; no seek restart or broad media qualification',largeSourceBytes:large.size,largeSourceExact:true,longSeconds:120,longSourceSHA256:hash(longSource),outputBytes:total,chunks,maxChunkBytes,preparationMs,throughputRatio:120/(preparationMs/1000),wasmResidentBytes:decoderModule.HEAPU8.byteLength+encoderModule.HEAPU8.byteLength,headerDecodeCalls:0,firstFragmentDecodeCalls:calls,iteratorReturnDisposes:true};
await writeFile('results/media-components/production-audio/stream.json',JSON.stringify(result,null,2)+'\n');console.log(result);
