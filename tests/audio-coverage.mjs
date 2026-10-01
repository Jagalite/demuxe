// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PacketAudioDecoder} from '../build/codec-expansion/decoder-js/packet-decoder.js';
const root=process.env.AUDIO_COVERAGE_ROOT??'build/codec-expansion/audio-coverage';
const build=process.env.DECODER_BUILD_ROOT??'/tmp/demuxe-decoder-families';
const hash=b=>createHash('sha256').update(b).digest('hex');
const unhex=(s='')=>Uint8Array.from(Buffer.from(s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex'));
const fixtures=JSON.parse(await readFile(root+'/fixtures.json')),modules=new Map(),builds=[],results=[];
function pcm(frame){return Float32Array.from({length:frame.samples*frame.channels},(_,i)=>frame.pcm?frame.pcm[i]/2147483648:frame.planes[i%frame.channels][Math.floor(i/frame.channels)]);}
function error(actual,reference){assert.equal(actual.length,reference.length);let max=0;for(let i=0;i<actual.length;i++)max=Math.max(max,Math.abs(actual[i]-reference[i]));return max;}
for(const f of fixtures.filter(f=>!process.env.DECODER_PROFILE||f.profile===process.env.DECODER_PROFILE)){
 const row={...f};if(f.generated===false){results.push({...row,passed:null,blocked:'Host encoder cannot generate this layout'});continue;}try{
  if(!modules.has(f.profile)){const pointer=JSON.parse(await readFile(build+'/'+f.profile+'.json'));const recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(hash(recordRaw),pointer.recordSHA256);const record=JSON.parse(recordRaw);const wasm=await readFile(pointer.directory+'/module.wasm');assert.equal(hash(wasm),record.artifacts['module.wasm'].sha256);builds.push({profile:f.profile,sourceKey:record.sourceKey,recordSHA256:pointer.recordSHA256,wasmSHA256:hash(wasm)});const factory=(await import(pathToFileURL(path.resolve(pointer.directory,'module.mjs')))).default;modules.set(f.profile,await factory({wasmBinary:wasm}));}
  const dataRaw=await readFile(root+'/'+f.id+'.json');assert.equal(hash(dataRaw),f.packetSHA256);const data=JSON.parse(dataRaw),configuration={sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:unhex(data.streams[0].extradata)};
  if(f.codec==='opus')row.opusMapping={family:configuration.extradata[18],preSkip:new DataView(configuration.extradata.buffer,configuration.extradata.byteOffset).getUint16(10,true),...(configuration.extradata[18]?{streams:configuration.extradata[19],coupled:configuration.extradata[20],map:Array.from(configuration.extradata.subarray(21))}:{})};
  const packets=data.packets.map(p=>({...p,bytes:unhex(p.data),ptsSamples:Math.round(Number(p.pts_time)*f.sampleRate)}));
  const d=new PacketAudioDecoder(modules.get(f.profile),f.codec,new AbortController().signal,configuration);
  try{
   const decodeFrom=start=>{const frames=[];for(const p of packets.slice(start))frames.push(...d.decode(p.bytes,p.ptsSamples));frames.push(...d.flush());assert.deepEqual(d.flush(),[]);return frames;};
   const frames=decodeFrom(0);assert.ok(frames.length);const actual=Float32Array.from(frames.flatMap(f=>Array.from(pcm(f))));
   const side=data.packets.flatMap(p=>p.side_data_list??[]).filter(d=>d.side_data_type==='Skip Samples');
   const decoderSkip=f.codec==='vorbis'?side.reduce((n,d)=>n+(d.skip_samples??0),0):f.codec==='opus'?new DataView(configuration.extradata.buffer,configuration.extradata.byteOffset).getUint16(10,true):0;
   const skip=side.reduce((n,d)=>n+(d.skip_samples??0),0)-decoderSkip,discard=side.reduce((n,d)=>n+(d.discard_padding??0),0);
   const raw=await readFile(root+'/'+f.id+'.f32'),reference=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4),trimmed=actual.subarray(skip*f.channels,actual.length-discard*f.channels);
   const maxError=error(trimmed,reference);assert.ok(maxError<2e-5,'scalar PCM error '+maxError);
   if(frames[0].pcm){const referencePCM=await readFile(root+'/'+f.id+'.s32');assert.deepEqual(Buffer.concat(frames.map(f=>Buffer.from(f.pcm.buffer))),referencePCM,'exact integer PCM');}
   if(f.codec==='pcm-f64le'){const doubles=Float64Array.from(frames.flatMap(frame=>Array.from({length:frame.samples*f.channels},(_,i)=>frame.planes64[i%f.channels][Math.floor(i/f.channels)])));assert.deepEqual(Buffer.from(doubles.buffer),await readFile(root+'/'+f.id+'.f64'),'exact double PCM');}
   const index=new Map(frames.map(frame=>[`${frame.pts}:${frame.samples}`,frame]));const seeks=[];
   // Independent packets are decoded after a reset; 500 ms preroll covers overlap and reservoirs.
   // Timestamp matching compares corresponding decoded frames, never searches for signal alignment.
   for(const seconds of [4.25,1.75,5.5,0.75]){
    const target=Math.round(seconds*f.sampleRate),preroll=Math.round(.5*f.sampleRate);let start=0;
    for(let i=0;i<packets.length;i++){if(packets[i].ptsSamples<=target-preroll)start=i;else break;}
    d.reset();const resumed=decodeFrom(start);let compared=0,max=0;
    for(const frame of resumed){if(frame.pts<target||frame.pts>=target+Math.round(.3*f.sampleRate))continue;const baseline=index.get(`${frame.pts}:${frame.samples}`);assert.ok(baseline,'seek frame timestamp maps to full decode');max=Math.max(max,error(pcm(frame),pcm(baseline)));compared+=frame.samples;}
    assert.ok(compared>=Math.round(.15*f.sampleRate),'seek produced fresh interval');assert.ok(max<2e-5,'seek reconstruction error '+max);
    seeks.push({seconds,startPacket:start,prerollSeconds:.5,comparedSamples:compared,maxError:max});
   }
   row.passed=true;Object.assign(row,{frames:frames.length,channelMasks:[...new Set(frames.map(frame=>frame.layout))],referenceSamples:reference.length/f.channels,decodedSamples:actual.length/f.channels,skipSamples:skip,decoderSkipSamples:decoderSkip,discardSamples:discard,maxError,referenceSHA256:hash(raw),integerExact:Boolean(frames[0].pcm),doubleExact:f.codec==='pcm-f64le',seeks});
  }finally{d.dispose();}
 }catch(e){row.passed=false;row.error=String(e.stack??e);console.error(f.id,'FAILED',e.message);}
 results.push(row);if(row.passed)console.log(f.id,'PASS',row.maxError);
}
const inputs=Object.fromEntries(await Promise.all(['native/audio-codecs/decoder.c','packages/provider-audio/src/packet-decoder.ts','tests/audio-coverage-fixtures.py','tests/audio-coverage.mjs'].map(async p=>[p,hash(await readFile(p))])));
const report={campaignDate:new Date().toISOString(),referenceTool:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],referenceFlags:['-cpuflags','0'],passed:results.filter(r=>r.generated!==false).every(r=>r.passed),scope:'Finite 6.137-second synthetic packet decoder qualification. Host FFmpeg scalar reference. Forward/backward reset + 500 ms packet preroll. No container/player/browser admission expansion.',inputs,builds,results};
await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/audio-coverage.json',JSON.stringify(report,null,2)+'\n');
if(!report.passed)process.exitCode=1;
