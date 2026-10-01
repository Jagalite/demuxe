// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
const compiledRoot=path.resolve(process.env.LEGACY_COMPONENT_ROOT??'build/component-candidates');
const {repairMatroskaAudio}=await import(pathToFileURL(compiledRoot+'/provider-container/src/audio-repair.js'));
const {PacketAudioDecoder}=await import(pathToFileURL(compiledRoot+'/provider-audio/src/packet-decoder.js'));
const {PacketFlacEncoder}=await import(pathToFileURL(compiledRoot+'/provider-audio/src/flac-encoder.js'));
const fixtureRoot=process.env.LEGACY_AUDIO_FIXTURE_ROOT??'/tmp/demuxe-legacy-audio-fixtures',out=process.env.LEGACY_AUDIO_OUTPUT_ROOT??'/tmp/demuxe-legacy-audio-compositions';await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex'),builds=[];
async function load(pointerPath){const pointer=JSON.parse(await readFile(pointerPath));const raw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(raw),pointer.recordSHA256);const record=JSON.parse(raw),wasm=await readFile(pointer.directory+'/module.wasm');assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);const moduleBytes=await readFile(pointer.directory+'/module.mjs');assert.equal(sha(moduleBytes),record.artifacts['module.mjs'].sha256);builds.push({moduleSHA256:sha(moduleBytes),profile:record.profile,sourceKey:record.sourceKey,recordSHA256:pointer.recordSHA256,wasmSHA256:sha(wasm)});return (await import(pathToFileURL(path.resolve(pointer.directory,'module.mjs')))).default({wasmBinary:wasm});}
const decoder=await load(process.env.LEGACY_BUILD_POINTER??'/tmp/demuxe-legacy-audio-builds/legacy.json'),encoder=await load(process.env.FLAC_BUILD_POINTER??'/tmp/demuxe-flac-rate-builds/flac.json'),results=[];
function audio(p,codec){const args=['-v','error','-cpuflags','0',...(codec==='mp2'?['-c:a','mp2float']:[]),'-i',p,'-map','0:a:0','-f','f32le','-'];return execFileSync('ffmpeg',args,{maxBuffer:64*1024*1024});}
const video=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:v:0','-f','rawvideo','-'],{maxBuffer:32*1024*1024});
for(const f of JSON.parse(await readFile(fixtureRoot+'/compositions.json'))){const row={id:f.id,codec:f.codec,sampleRate:f.sampleRate,channels:f.channels,inputSHA256:f.inputSHA256};try{
 const source=await readFile(f.input);assert.equal(sha(source),f.inputSHA256);const signal=new AbortController();
 const file=await repairMatroskaAudio(new Blob([source]),{codec:f.codec,channels:f.channels,sampleRate:f.sampleRate,output:'flac',decoder:(codec,signal,config)=>new PacketAudioDecoder(decoder,codec,signal,config),encoder:(channels,signal,rate)=>new PacketFlacEncoder(encoder,channels,signal,0,rate)},signal.signal);
 const bytes=Buffer.from(await file.arrayBuffer()),name=path.join(out,f.id+'.mp4');await writeFile(name,bytes);const original=audio(f.input,f.codec),converted=audio(name),a=new Float32Array(original.buffer,original.byteOffset,original.length/4),b=new Float32Array(converted.buffer,converted.byteOffset,converted.length/4);assert.equal(a.length,b.length,'exact complete source sample count');let error=0;for(let i=0;i<a.length;i++)error=Math.max(error,Math.abs(a[i]-b[i]));assert.ok(error<2e-5,'independent scalar PCM error '+error);
 const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_streams','-of','json',name],{encoding:'utf8'})).streams[0];assert.equal(Number(probe.sample_rate),f.sampleRate);assert.equal(probe.channels,f.channels);assert.equal(sha(video(name)),sha(video(f.input)),'decoded video copied exactly');
 Object.assign(row,{passed:true,outputSHA256:sha(bytes),referenceSHA256:sha(original),samples:a.length/f.channels,maxError:error,videoExact:true,sourceRatePreserved:true});console.log(f.id,'PASS',error);
 }catch(e){Object.assign(row,{passed:false,error:String(e.stack??e)});console.error(f.id,'FAILED',e.message);}results.push(row);}
const inputs=Object.fromEntries(await Promise.all(['tests/legacy-audio-compositions.mjs','packages/provider-container/src/audio-repair.ts','packages/provider-container/src/matroska.ts','packages/provider-container/src/wma-format.ts','packages/provider-audio/src/packet-decoder.ts','packages/provider-audio/src/flac-encoder.ts'].map(async p=>[p,sha(await readFile(p))])));
const report={passed:results.every(r=>r.passed),scope:'Exact listed MP2/WMAv1/WMAv2 mono/stereo rate tuples, no-reorder AVC MKV to FLAC24 fMP4; independently selected scalar float MPEG decoder, audio/video/samplecount/rate reference comparisons',inputs,builds,results};await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile(process.env.LEGACY_COMPOSITIONS_REPORT??'results/media-components/codec-expansion/legacy-audio-compositions.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
