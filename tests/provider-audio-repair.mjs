// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {repairMatroskaAudio} from '../build/component-candidates/provider-container/src/audio-repair.js';
import {PacketAudioDecoder} from '../build/component-candidates/provider-audio/src/packet-decoder.js';
import {PacketFlacEncoder} from '../build/component-candidates/provider-audio/src/flac-encoder.js';
const root=process.env.AUDIO_BUILD_ROOT??'build/audio-providers';
const pointer=JSON.parse(await readFile(root+'/common.json','utf8'));
const record=JSON.parse(await readFile(pointer.directory+'/build-record.json','utf8'));
const bytes=await readFile(pointer.directory+'/module.wasm');assert.equal(createHash('sha256').update(bytes).digest('hex'),record.artifacts['module.wasm'].sha256);
const factory=(await import(pathToFileURL(pointer.directory+'/module.mjs'))).default;
await mkdir('build/provider-audio/repair',{recursive:true});const results=[];
for(const codec of ['ac3','eac3','dca']){
 const input=`build/provider-audio/repair/${codec}.mkv`,output=`build/provider-audio/repair/${codec}.mp4`;
 execFileSync('ffmpeg',['-v','error','-y','-i','fixtures/example.mp4','-t','3','-map','0:v:0','-map','0:a:0','-c:v','libx264','-bf','0','-pix_fmt','yuv420p','-c:a',codec,'-strict','-2','-ar','48000','-ac','2',input]);
 const source=await readFile(input),module=await factory({wasmBinary:bytes}),controller=new AbortController();
 const components={decoder:(codec,signal)=>new PacketAudioDecoder(module,codec,signal),encoder:(channels,signal)=>new PacketFlacEncoder(module,channels,signal)};
 const blob=await repairMatroskaAudio(new Blob([source]),components,controller.signal);await writeFile(output,new Uint8Array(await blob.arrayBuffer()));
 const raw=(file,fmt)=>execFileSync('ffmpeg',['-v','error','-i',file,'-map',fmt==='rawvideo'?'0:v:0':'0:a:0','-f',fmt,'-'],{maxBuffer:64*1024*1024});
 assert.deepEqual(raw(output,'rawvideo'),raw(input,'rawvideo'));
 const before=raw(input,'f32le'),after=raw(output,'f32le');assert.equal(before.length,after.length);let maxError=0;for(let i=0;i<before.length;i+=4)maxError=Math.max(maxError,Math.abs(before.readFloatLE(i)-after.readFloatLE(i)));assert.ok(maxError<0.000001,`${codec}: ${maxError}`);
 controller.abort();await assert.rejects(()=>repairMatroskaAudio(new Blob([source]),components,controller.signal),e=>e.name==='AbortError');
 results.push({codec,videoDecodedExact:true,audioSamples:before.length/8,maxAudioError:maxError,output,fixtureSHA256:createHash('sha256').update(source).digest('hex'),wasmSHA256:record.artifacts['module.wasm'].sha256});
}
const resultRoot=process.env.AUDIO_RESULT_ROOT??'results/media-components/audio-provider';
await mkdir(resultRoot,{recursive:true});await writeFile(resultRoot+'/repair.json',JSON.stringify({passed:true,scope:'local no-reorder AVC + stereo 48 kHz audio repair to FLAC24; host decoded output only',results},null,2)+'\n');console.log(results);
