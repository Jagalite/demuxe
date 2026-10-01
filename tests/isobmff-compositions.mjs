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
const root='build/codec-expansion',out='build/isobmff-compositions';await mkdir(out,{recursive:true});
const fixtures=JSON.parse(await readFile('build/isobmff-fixtures/fixtures.json'));
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
async function precisionMustReject(f,output){return output==='flac'&&!!f.precisionReject;}
for(const f of fixtures){
 for(const output of (process.env.CODEC_EXPANSION_ENCODINGS??(f.sampleRate===48000&&f.channels===2?'flac,opus':'flac')).split(',')){
  const signal=new AbortController(),decoder=await module(f.profile),encoder=await module(output==='flac'?'flac':'opus-encoder');
  const input=await readFile(f.input);
  const expectedPrecisionRejection=await precisionMustReject(f,output);
  let file;
  try {file=await repairMatroskaAudio(new Blob([input]),{codec:f.codec,channels:f.channels,sampleRate:f.sampleRate,output,container:'isobmff',
   decoder:(codec,signal,config)=>new PacketAudioDecoder(decoder,codec,signal,config),
   encoder:(channels,signal,rate)=>output==='flac'?new PacketFlacEncoder(encoder,channels,signal,0,rate):new PacketOpusEncoder(encoder,channels,signal),
  },signal.signal);}
  catch(error){if(expectedPrecisionRejection&&/precision exceeds/.test(error.message)){results.push({id:f.id,codec:f.codec,output,precisionRejected:true,passed:true});continue;}throw error;}
  assert.ok(!expectedPrecisionRejection,f.id+' expected precision rejection, but composition succeeded');
  const name=out+'/'+f.id+'-'+output+'.mp4',bytes=Buffer.from(await file.arrayBuffer());await writeFile(name,bytes);
  const audioStream=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=duration_ts,time_base','-of','json',f.input])).streams[0];
  const timelineSamples=Math.round(Number(audioStream.duration_ts)*f.sampleRate/Number(audioStream.time_base.split('/')[1]));
  const decode=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:a:0',...(p===f.input&&f.codec==='aac'?['-af','atrim=end_sample='+timelineSamples]:[]),'-f','f32le','-c:a','pcm_f32le','-'],{maxBuffer:32*1024*1024});
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
  let float64Exact=false;
  if(output==='flac'&&f.codec==='pcm-f64le'){
   const doubles=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:a:0','-f','f64le','-'],{maxBuffer:32*1024*1024});
   assert.deepEqual(doubles(name),doubles(f.input),f.id+' exact original float64 PCM');float64Exact=true;
  }
  const video=p=>execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',p,'-map','0:v:0','-f','rawvideo','-'],{maxBuffer:32*1024*1024});
  assert.equal(sha(video(name)),sha(video(f.input)),f.id+' video changed');
  results.push({id:f.id,codec:f.codec,output,file:name,inputSHA256:sha(input),outputSHA256:sha(bytes),sampleRate:f.sampleRate,channels:f.channels,samples:actual.length/(4*f.channels),referenceSamples:reference.length/(4*f.channels),maxError,snr,integerExact,float64Exact,videoExact:true,passed:true});
  console.log(f.id,output,'passed');
 }
}
await writeFile(out+'/results.json',JSON.stringify({passed:true,scope:'Finite mono/stereo/surround44.1/48/96k MOV/MP4 no-reordered AVC composition; exact video, independent reference PCM, Opus explicitly lossy; f64 FLAC24 precision rejection',results},null,2)+'\n');
