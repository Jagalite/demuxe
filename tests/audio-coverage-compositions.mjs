// SPDX-License-Identifier: Apache-2.0
// Longer finite rate/layout qualification. Real native engines + maintained container composition, compared with FFmpeg.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {repairMatroskaAudio} from '../build/component-candidates/provider-container/src/audio-repair.js';
import {PacketAudioDecoder} from '../build/component-candidates/provider-audio/src/packet-decoder.js';
import {PacketFlacEncoder} from '../build/component-candidates/provider-audio/src/flac-encoder.js';
import {PacketOpusEncoder} from '../build/component-candidates/provider-audio/src/opus-encoder.js';
const root='build/codec-expansion',out=process.env.AUDIO_COVERAGE_OUTPUT_ROOT??root+'/audio-coverage-compositions';await mkdir(out,{recursive:true});
const fixtureRoot=process.env.AUDIO_COVERAGE_COMPOSITION_ROOT??root+'/audio-coverage-composition';
const fixtures=JSON.parse(await readFile(fixtureRoot+'/fixtures.json'));
const modules=new Map(),builds=[];
async function module(profile){
 if(!modules.has(profile)){
  const pointer=JSON.parse(await readFile(profile==='flac'?(process.env.FLAC_BUILD_POINTER??'/tmp/demuxe-flac-rate-builds/flac.json'):root+'/decoder-families/'+profile+'.json'));
  const recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(sha(recordRaw),pointer.recordSHA256);const record=JSON.parse(recordRaw);const wasm=await readFile(pointer.directory+'/module.wasm');assert.equal(sha(wasm),record.artifacts['module.wasm'].sha256);builds.push({profile,sourceKey:record.sourceKey,recordSHA256:pointer.recordSHA256,wasmSHA256:sha(wasm)});
  const factory=(await import(pathToFileURL(path.resolve(pointer.directory,'module.mjs')))).default;
  modules.set(profile,await factory({wasmBinary:await readFile(pointer.directory+'/module.wasm')}));
 }
 return modules.get(profile);
}
const sha=b=>createHash('sha256').update(b).digest('hex');
const results=[];
async function precisionMustReject(f,output){
 if(output!=='flac')return false;
 if(['flac','alac','pcm-s16le','pcm-s24le','pcm-s32le'].includes(f.codec)){
  const bytes=await readFile(fixtureRoot+'/'+f.id+'.s32');
  for(let i=0;i<bytes.length;i+=4)if((bytes.readInt32LE(i)&255)!==0)return true;
 }else if(f.codec.startsWith('pcm-f')){
  const doubles=f.codec==='pcm-f64le',bytes=await readFile(fixtureRoot+'/'+f.id+(doubles?'.f64':'.f32')),width=doubles?8:4;
  for(let i=0;i<bytes.length;i+=width)if(!Number.isInteger((doubles?bytes.readDoubleLE(i):bytes.readFloatLE(i))*8388608))return true;
 }
 return false;
}
for(const f of fixtures.filter(f=>f.generated!==false&&f.input.endsWith('.mkv')&&(!process.env.CODEC_EXPANSION_CODECS||process.env.CODEC_EXPANSION_CODECS.split(',').includes(f.codec)))){
 for(const output of (process.env.CODEC_EXPANSION_ENCODINGS??'flac').split(',')){
  try {
  const signal=new AbortController(),decoder=await module(f.profile),encoder=await module(output==='flac'?'flac':'opus-encoder');
  const input=await readFile(f.input);
  const expectedPrecisionRejection=await precisionMustReject(f,output);
  let file;
  try {file=await repairMatroskaAudio(new Blob([input]),{codec:f.codec,channels:f.channels,sampleRate:f.sampleRate,output,
   decoder:(codec,signal,config)=>new PacketAudioDecoder(decoder,codec,signal,config),
   encoder:(channels,signal,rate)=>output==='flac'?new PacketFlacEncoder(encoder,channels,signal,0,rate):new PacketOpusEncoder(encoder,channels,signal),
  },signal.signal);}
  catch(error){if(expectedPrecisionRejection&&/precision exceeds/.test(error.message)){results.push({id:f.id,codec:f.codec,output,precisionRejected:true,passed:true});continue;}throw error;}
  assert.ok(!expectedPrecisionRejection,f.id+' expected precision rejection, but composition succeeded');
  const name=out+'/'+f.id+'-'+output+'.mp4',bytes=Buffer.from(await file.arrayBuffer());await writeFile(name,bytes);
  const decode=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:a:0','-f','f32le','-c:a','pcm_f32le','-'],{maxBuffer:32*1024*1024});
  const reference=decode(f.input),actual=decode(name),a=new Float32Array(actual.buffer,actual.byteOffset,actual.length/4),b=new Float32Array(reference.buffer,reference.byteOffset,reference.length/4);
  let maxError=0,energy=0,error=0;
  assert.ok(actual.length>=reference.length,f.id+' missing output samples');
  if(output==='flac')assert.equal(actual.length,reference.length,f.id+' sample count');
  else assert.ok(actual.length-reference.length<=960*f.channels*4,f.id+' Opus tail padding');
  for(let i=0;i<b.length;i++){maxError=Math.max(maxError,Math.abs(a[i]-b[i]));energy+=b[i]*b[i];error+=(a[i]-b[i])**2;}
  assert.ok(energy>0&&Number.isFinite(error));
  const snr=10*Math.log10(energy/Math.max(error,1e-30));
  if(output==='flac')assert.ok(maxError<2e-5,f.id+' PCM mismatch '+maxError);else assert.ok(snr>15,f.id+' Opus signal quality '+snr);
  let integerExact=false;
  if(output==='flac'&&['flac','alac','pcm-s16le','pcm-s24le','pcm-s32le'].includes(f.codec)){
   const integer=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:a:0','-f','s32le','-'],{maxBuffer:32*1024*1024});
   assert.deepEqual(integer(name),integer(f.input),f.id+' exact integer composition PCM');integerExact=true;
  }
  const stream=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_streams','-of','json',name],{encoding:'utf8'})).streams[0];assert.equal(Number(stream.sample_rate),f.sampleRate,'sample rate preserved');assert.equal(stream.channels,f.channels,'channel count preserved');
  const video=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:v:0','-f','rawvideo','-'],{maxBuffer:32*1024*1024});
  assert.equal(sha(video(name)),sha(video(f.input)),f.id+' video changed');
  results.push({id:f.id,codec:f.codec,output,file:name,inputSHA256:sha(input),outputSHA256:sha(bytes),samples:actual.length/(f.channels*4),referenceSamples:reference.length/(f.channels*4),sampleRate:f.sampleRate,channels:f.channels,maxError,snr,integerExact,videoExact:true,passed:true});
  console.log(f.id,output,'passed');
  }catch(error){results.push({id:f.id,codec:f.codec,sampleRate:f.sampleRate,channels:f.channels,output,passed:false,error:String(error.stack??error)});console.error(f.id,'FAILED',error.message);}
 }
}
const inputs=Object.fromEntries(await Promise.all(['tests/audio-coverage-compositions.mjs','tests/audio-coverage-fixtures.py','packages/provider-container/src/audio-repair.ts','packages/provider-audio/src/flac-encoder.ts'].map(async p=>[p,sha(await readFile(p))])));
await mkdir('results/media-components/codec-expansion',{recursive:true});
await writeFile('results/media-components/codec-expansion/audio-coverage-compositions.json',JSON.stringify({passed:results.every(r=>r.passed),inputs,builds,scope:'6.137-second Matroska no-reordered AVC compositions; original 44.1/48/96k rates and1/2/6/8channels; exact video and scalar reference PCM. Precision rejects remain mandatory.',results},null,2)+'\n');

if(results.some(r=>!r.passed))process.exitCode=1;
