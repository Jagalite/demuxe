// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const {PacketAudioDecoder}=await import(pathToFileURL(path.resolve(process.env.LEGACY_ADAPTER_MODULE??'build/component-candidates/provider-audio/src/packet-decoder.js')));
const root=process.env.LEGACY_AUDIO_FIXTURE_ROOT??'/tmp/demuxe-legacy-audio-fixtures';
const hash=b=>createHash('sha256').update(b).digest('hex');
const unhex=(s='')=>Uint8Array.from(Buffer.from(s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex'));
const pointer=JSON.parse(await readFile(process.env.LEGACY_BUILD_POINTER??'/tmp/demuxe-legacy-audio-builds/legacy.json'));
const recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(hash(recordRaw),pointer.recordSHA256);const record=JSON.parse(recordRaw);
const wasm=await readFile(pointer.directory+'/module.wasm');assert.equal(hash(wasm),record.artifacts['module.wasm'].sha256);
const moduleBytes=await readFile(pointer.directory+'/module.mjs');assert.equal(hash(moduleBytes),record.artifacts['module.mjs'].sha256);
const factory=(await import(pathToFileURL(path.resolve(pointer.directory,'module.mjs')))).default,module=await factory({wasmBinary:wasm});
assert.ok(module._mc_create_config_v2,'framing ABI exported');
const results=[];
const pcm=frame=>Float32Array.from({length:frame.samples*frame.channels},(_,i)=>frame.planes[i%frame.channels][Math.floor(i/frame.channels)]);
function maxError(a,b){assert.equal(a.length,b.length);let m=0;for(let i=0;i<a.length;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return m;}
for(const f of JSON.parse(await readFile(root+'/fixtures.json'))){
 if(!f.generated){results.push({...f,passed:null,blocked:f.generationError});continue;}
 const row={...f};try{
  assert.equal(hash(await readFile(f.input)),f.inputSHA256,'Original source changed');
  const raw=await readFile(root+'/'+f.id+'.json');assert.equal(hash(raw),f.packetSHA256);const data=JSON.parse(raw),extra=unhex(data.streams[0].extradata);
  const config={sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:extra,...(f.framing.blockAlign?{blockAlign:f.framing.blockAlign,bitRate:f.framing.bitRate}:{})};
  if(f.codec.startsWith('wma'))assert.equal(Buffer.from(extra).toString('hex'),f.framing.extradataHex,'ASF header matches ffprobe decoder metadata');
  const packets=data.packets.map(p=>({...p,bytes:unhex(p.data),ptsSamples:Math.round(Number(p.pts_time)*f.sampleRate)}));
  const d=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config);
  let drainFrames=[];
  const decodeFrom=start=>{const frames=[];for(const p of packets.slice(start))frames.push(...d.decode(p.bytes,p.ptsSamples));drainFrames=d.flush();frames.push(...drainFrames);assert.deepEqual(d.flush(),[]);return frames;};
  try{
   const frames=decodeFrom(0),fullDrain=drainFrames;assert.ok(frames.length);
   if(f.codec.startsWith('wma')){
    const frameRaw=await readFile(root+'/'+f.id+'.frames.json');assert.equal(hash(frameRaw),f.framesSHA256);const metadata=JSON.parse(frameRaw).frames;assert.equal(metadata.length,frames.length,'host framecount');
    for(let i=0;i<metadata.length;i++){assert.equal(frames[i].samples,metadata[i].nb_samples);if(metadata[i].pts_time!==undefined)assert.equal(frames[i].pts,Math.round(Number(metadata[i].pts_time)*f.sampleRate),'host frame timestamp');}
    assert.equal(fullDrain.length,1,'exact delayed frame delivered on drain');assert.equal(metadata.at(-1).pts_time,undefined,'host confirms missing final packetPTS');assert.equal(fullDrain[0].pts,frames.at(-2).pts+frames.at(-2).samples,'recovered drain timestamp continues established clock');row.hostFramePTSExact=true;row.drainFramePTSRecovered=true;
   }assert.ok(frames.every(x=>x.channels===f.channels&&x.rate===f.sampleRate));
   const actual=Float32Array.from(frames.flatMap(f=>Array.from(pcm(f)))),referenceRaw=await readFile(root+'/'+f.id+'.f32'),reference=new Float32Array(referenceRaw.buffer,referenceRaw.byteOffset,referenceRaw.length/4);
   if(f.referenceF32SHA256)assert.equal(hash(referenceRaw),f.referenceF32SHA256,'Independent PCM changed');
   const side=data.packets.flatMap(p=>p.side_data_list??[]).filter(x=>x.side_data_type==='Skip Samples'),skip=side.reduce((n,x)=>n+(x.skip_samples??0),0),discard=side.reduce((n,x)=>n+(x.discard_padding??0),0);const trimmed=actual.subarray(skip*f.channels,actual.length-discard*f.channels);
   const error=maxError(trimmed,reference);assert.ok(error<2e-5,'independent scalar reference PCM '+error);
   d.reset();const repeat=decodeFrom(0);assert.deepEqual(repeat.map(({generation,...f})=>f),frames.map(({generation,...f})=>f),'reset entire output exact');
   const baseline=new Map(frames.map(frame=>[`${frame.pts}:${frame.samples}`,frame])),seeks=[];
   const duration=actual.length/f.channels/f.sampleRate,preroll=Math.min(.5,duration*.2),window=Math.min(.3,duration*.2);
   for(const seconds of duration<1?[.7,.3,.85,.15].map(x=>x*duration):[4.25,1.75,5.5,0.75]){
    const target=Math.round(seconds*f.sampleRate);let start=0;for(let i=0;i<packets.length;i++){if(packets[i].ptsSamples<=target-Math.round(preroll*f.sampleRate))start=i;else break;}
    if(f.seekContract==='restart-from-start-and-discard')start=0;
    d.reset();const seekFrames=decodeFrom(start);let count=0,error=0,energy=0,squareError=0,resetReferenceError;
    if(f.codec.startsWith('wma')){
     const format=Buffer.from(f.framing.waveFormatHex,'hex'),payload=Buffer.concat(packets.slice(start).map(p=>Buffer.from(p.bytes)));
     const fmt=Buffer.alloc(8);fmt.write('fmt ');fmt.writeUInt32LE(format.length,4);const data=Buffer.alloc(8);data.write('data');data.writeUInt32LE(payload.length,4);const body=Buffer.concat([Buffer.from('WAVE'),fmt,format,data,payload,...(payload.length%2?[Buffer.alloc(1)]:[])]),header=Buffer.alloc(8);header.write('RIFF');header.writeUInt32LE(body.length,4);
     const input=path.join(root,`${f.id}-reset-${start}.wav`);await writeFile(input,Buffer.concat([header,body]));
     const raw=execFileSync('ffmpeg',['-v','error','-cpuflags','0','-i',input,'-map','0:a:0','-f','f32le','-'],{maxBuffer:16*1024*1024}),reference=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);
     resetReferenceError=maxError(Float32Array.from(seekFrames.flatMap(frame=>Array.from(pcm(frame)))),reference);assert.ok(resetReferenceError<2e-5,'independent reset sequence PCM');
    }
    for(const frame of seekFrames){if(frame.pts<target||frame.pts>=target+Math.round(window*f.sampleRate))continue;const source=baseline.get(`${frame.pts}:${frame.samples}`);assert.ok(source,'corresponding seek timestamp');const a=pcm(frame),b=pcm(source);error=Math.max(error,maxError(a,b));for(let i=0;i<a.length;i++){energy+=b[i]*b[i];squareError+=(a[i]-b[i])**2;}count+=frame.samples;}
    assert.ok(count>Math.min(.15,duration*.08)*f.sampleRate,'fresh seek audio');const snr=10*Math.log10(energy/Math.max(squareError,1e-30));if(f.codec==='wmav1'&&f.seekContract!=='restart-from-start-and-discard'){assert.ok(snr>40,'WMA1 reset noise variation quality '+snr);}else assert.ok(error<2e-5,'seek PCM reconstruction '+error);seeks.push({seconds,startPacket:start,prerollSeconds:preroll,comparedSamples:count,maxError:error,snr,...(resetReferenceError!==undefined?{independentResetReferenceError:resetReferenceError}:{})});
   }
   Object.assign(row,{passed:true,frames:frames.length,samples:trimmed.length/f.channels,decodedSamples:actual.length/f.channels,skipSamples:skip,discardSamples:discard,maxError:error,referenceSHA256:hash(referenceRaw),channelMasks:[...new Set(frames.map(x=>x.layout))],resetExact:true,seeks});
  }finally{d.dispose();d.dispose();}
  if(f.codec.startsWith('wma')){
   for(const changed of [{blockAlign:0},{bitRate:0},{sampleRate:96000},{channels:6},{blockAlign:1.5},{bitRate:Infinity},{extradata:new Uint8Array()},{extradata:new Uint8Array(2)},{extradata:new Uint8Array(64)}])assert.throws(()=>new PacketAudioDecoder(module,f.codec,new AbortController().signal,{...config,...changed}));
   assert.equal(module._mc_create_config(f.codec==='wmav1'?19:20,f.sampleRate,f.channels,f.bitsPerSample,0,0),0,'old ABI cannot silently initialize WMA without framing');
   for(const size of [config.blockAlign-1,config.blockAlign+1,config.blockAlign*2]){const framed=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config);try{assert.throws(()=>framed.decode(new Uint8Array(size),0),'WMA requires exactly one complete block');}finally{framed.dispose();}}
   row.invalidFramingRejected=true;row.groupedPacketRejected=true;row.malformedExtraRejected=true;row.oldABIRejectsWMA=true;
  }
  const aborted=new AbortController(),victim=new PacketAudioDecoder(module,f.codec,aborted.signal,config);aborted.abort();assert.throws(()=>victim.flush(),e=>e.name==='AbortError');row.abort=true;
  const bad=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config);let corrupt=[];try{corrupt=bad.decode(new Uint8Array([255]),0);}catch{}finally{bad.dispose();}assert.equal(corrupt.length,0);row.truncatedPacketRejected=true;
  console.log(f.id,'PASS',row.maxError);
 }catch(e){Object.assign(row,{passed:false,error:String(e.stack??e)});console.error(f.id,'FAILED',e.message);}
 results.push(row);
}
const inputs=Object.fromEntries(await Promise.all(['native/audio-codecs/decoder.c','packages/provider-audio/src/packet-decoder.ts','scripts/build-audio-providers.py',process.env.LEGACY_FIXTURE_GENERATOR??'tests/legacy-audio-fixtures.py','tests/legacy-audio.mjs'].map(async p=>[p,hash(await readFile(p))])));
const report={passed:results.filter(r=>r.generated).every(r=>r.passed),scope:'Exact listed MP1/MP2/WMA v1/v2 source tuples, ASF framing metadata, independent scalar reference and reset/preroll seeks. No container or playback admission implied. Source binaries stay in scratch storage.',referenceDecoders:{mp1:'mp1float',mp2:'mp2float',wmav1:'wmav1',wmav2:'wmav2'},resetReferenceNote:'WMAv1 noise-table state resets: seek PCM is compared independently with scalar FFmpeg decoding of the same WAVEFORMATEX/block sequence; full-stream noise variation is retained with SNR.',referenceTool:execFileSync('ffmpeg',['-version'],{encoding:'utf8'}).split('\n')[0],inputs,build:{profile:record.profile,source:record.source,sourceKey:record.sourceKey,nativeBuildInputs:record.inputs,recordSHA256:pointer.recordSHA256,module:record.artifacts['module.mjs'],wasm:record.artifacts['module.wasm'],capabilities:record.capabilities},results};
await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile(process.env.LEGACY_AUDIO_REPORT??'results/media-components/codec-expansion/legacy-audio.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
