// SPDX-License-Identifier: Apache-2.0
// Real native engines + maintained container composition, compared with FFmpeg.
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
const root='build/codec-expansion',out=root+'/compositions';await mkdir(out,{recursive:true});
const fixtures=JSON.parse(await readFile(root+'/decoder-fixtures/fixtures.json'));
const modules=new Map();
async function module(profile){
 if(!modules.has(profile)){
  const pointer=JSON.parse(await readFile(root+'/decoder-families/'+profile+'.json'));
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
  const bytes=await readFile(root+'/decoder-fixtures/'+f.id+'.s32');
  for(let i=0;i<bytes.length;i+=4)if((bytes.readInt32LE(i)&255)!==0)return true;
 }else if(f.codec.startsWith('pcm-f')){
  const doubles=f.codec==='pcm-f64le',bytes=await readFile(root+'/decoder-fixtures/'+f.id+(doubles?'.f64':'.f32')),width=doubles?8:4;
  for(let i=0;i<bytes.length;i+=width)if(!Number.isInteger((doubles?bytes.readDoubleLE(i):bytes.readFloatLE(i))*8388608))return true;
 }
 return false;
}
for(const f of fixtures.filter(f=>f.sampleRate===48000&&f.channels===2&&f.input.endsWith('.mkv')&&(!process.env.CODEC_EXPANSION_CODECS||process.env.CODEC_EXPANSION_CODECS.split(',').includes(f.codec)))){
 for(const output of (process.env.CODEC_EXPANSION_ENCODINGS??'flac,opus').split(',')){
  const signal=new AbortController(),decoder=await module(f.profile),encoder=await module(output==='flac'?'flac':'opus-encoder');
  const input=await readFile(f.input);
  const expectedPrecisionRejection=await precisionMustReject(f,output);
  let file;
  try {file=await repairMatroskaAudio(new Blob([input]),{codec:f.codec,channels:2,output,
   decoder:(codec,signal,config)=>new PacketAudioDecoder(decoder,codec,signal,config),
   encoder:(channels,signal)=>output==='flac'?new PacketFlacEncoder(encoder,channels,signal):new PacketOpusEncoder(encoder,channels,signal),
  },signal.signal);}
  catch(error){if(expectedPrecisionRejection&&/precision exceeds/.test(error.message)){results.push({id:f.id,codec:f.codec,output,precisionRejected:true,passed:true});continue;}throw error;}
  assert.ok(!expectedPrecisionRejection,f.id+' expected precision rejection, but composition succeeded');
  const name=out+'/'+f.id+'-'+output+'.mp4',bytes=Buffer.from(await file.arrayBuffer());await writeFile(name,bytes);
  const decode=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:a:0','-f','f32le','-c:a','pcm_f32le','-'],{maxBuffer:32*1024*1024});
  const reference=decode(f.input),actual=decode(name),a=new Float32Array(actual.buffer,actual.byteOffset,actual.length/4),b=new Float32Array(reference.buffer,reference.byteOffset,reference.length/4);
  let maxError=0,energy=0,error=0;
  assert.ok(actual.length>=reference.length,f.id+' missing output samples');
  if(output==='flac')assert.equal(actual.length,reference.length,f.id+' sample count');
  else assert.ok(actual.length-reference.length<=960*2*4,f.id+' Opus tail padding');
  for(let i=0;i<b.length;i++){maxError=Math.max(maxError,Math.abs(a[i]-b[i]));energy+=b[i]*b[i];error+=(a[i]-b[i])**2;}
  assert.ok(energy>0&&Number.isFinite(error));
  const snr=10*Math.log10(energy/Math.max(error,1e-30));
  if(output==='flac')assert.ok(maxError<2e-5,f.id+' PCM mismatch '+maxError);else assert.ok(snr>15,f.id+' Opus signal quality '+snr);
  let integerExact=false;
  if(output==='flac'&&['flac','alac','pcm-s16le','pcm-s24le','pcm-s32le'].includes(f.codec)){
   const integer=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:a:0','-f','s32le','-'],{maxBuffer:32*1024*1024});
   assert.deepEqual(integer(name),integer(f.input),f.id+' exact integer composition PCM');integerExact=true;
  }
  const video=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:v:0','-f','rawvideo','-'],{maxBuffer:32*1024*1024});
  assert.equal(sha(video(name)),sha(video(f.input)),f.id+' video changed');
  results.push({id:f.id,codec:f.codec,output,file:name,inputSHA256:sha(input),outputSHA256:sha(bytes),samples:actual.length/8,referenceSamples:reference.length/8,maxError,snr,integerExact,videoExact:true,passed:true});
  console.log(f.id,output,'passed');
 }
}
await writeFile(out+'/results.json',JSON.stringify({passed:true,scope:'48k stereo Matroska no-reordered AVC composition; exact video and reference audio, Opus explicitly lossy',results},null,2)+'\n');
