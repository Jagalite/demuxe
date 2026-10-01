// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const compiled=await mkdtemp(path.join(os.tmpdir(),'demuxe-wma-advanced-adapter-'));
execFileSync(process.execPath,['--no-maglev','node_modules/typescript/bin/tsc','packages/provider-audio/src/packet-decoder.ts','--target','ES2022','--module','ES2022','--strict','--skipLibCheck','--outDir',compiled]);
const {PacketAudioDecoder}=await import(pathToFileURL(path.join(compiled,'packet-decoder.js')));
const ffmpeg=process.env.WMA_REFERENCE_FFMPEG??'/tmp/demuxe-wma-native-reference/ffmpeg';
const root=process.env.WMA_ADVANCED_FIXTURE_ROOT??'/tmp/demuxe-wma-p23-fixtures';
const hash=b=>createHash('sha256').update(b).digest('hex');
const unhex=(s='')=>Uint8Array.from(Buffer.from(s.split('\n').filter(l=>l.includes(':')).map(l=>l.split(':')[1].split('  ')[0].replaceAll(' ','')).join(''),'hex'));
const pointer=JSON.parse(await readFile(process.env.WMA_ADVANCED_BUILD_POINTER??'/tmp/demuxe-wma-p23-builds/wma-advanced.json'));
const recordRaw=await readFile(pointer.directory+'/build-record.json');assert.equal(hash(recordRaw),pointer.recordSHA256);const record=JSON.parse(recordRaw);
const wasm=await readFile(pointer.directory+'/module.wasm');assert.equal(hash(wasm),record.artifacts['module.wasm'].sha256);
assert.equal(hash(await readFile(pointer.directory+'/module.mjs')),record.artifacts['module.mjs'].sha256);
const module=await (await import(pathToFileURL(path.resolve(pointer.directory,'module.mjs')))).default({wasmBinary:wasm});
assert.ok(module._mc_create_config_v2);const results=[];
function pcm(frame){if(frame.pcm)return Buffer.from(frame.pcm.buffer,frame.pcm.byteOffset,frame.pcm.byteLength);const out=new Float32Array(frame.samples*frame.channels);for(let i=0;i<out.length;i++)out[i]=frame.planes[i%frame.channels][Math.floor(i/frame.channels)];return Buffer.from(out.buffer);}
function compare(raw,frames,integer,voice=false){let offset=0,maxError=0,energy=0,errorEnergy=0;const h=createHash('sha256');for(const f of frames){const actual=pcm(f);h.update(actual);assert.ok(offset+actual.length<=raw.length,'original reference sample bound');if(integer)assert.deepEqual(actual,raw.subarray(offset,offset+actual.length),'original integer PCM exact');else for(let i=0;i<actual.length;i+=4){const a=actual.readFloatLE(i),b=raw.readFloatLE(offset+i);maxError=Math.max(maxError,Math.abs(a-b));energy+=b*b;errorEnergy+=(a-b)**2;}offset+=actual.length;}assert.equal(offset,raw.length,'full original sample count');const snr=10*Math.log10(energy/Math.max(errorEnergy,1e-30));assert.ok(voice?maxError<.01&&snr>=65:maxError<2e-5,'scalar host PCM error '+maxError+' SNR '+snr);return{maxError,snr,pcmSHA256:h.digest('hex')};}
for(const f of JSON.parse(await readFile(root+'/fixtures.json'))){if(process.env.WMA_ONLY&&!f.id.includes(process.env.WMA_ONLY))continue;const row={id:f.id,codec:f.codec,sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,inputSHA256:f.inputSHA256,sourceURL:f.sourceURL};try{
 assert.equal(hash(await readFile(f.input)),f.inputSHA256);const packetRaw=await readFile(root+'/'+f.id+'.packets.json');assert.equal(hash(packetRaw),f.packetSHA256);const data=JSON.parse(packetRaw),stream=data.streams[0],extra=unhex(stream.extradata);assert.equal(Buffer.from(extra).toString('hex'),f.framing.extradataHex);
 const config={sampleRate:f.sampleRate,channels:f.channels,bitsPerSample:f.bitsPerSample,extradata:extra,blockAlign:f.framing.blockAlign,bitRate:f.framing.bitRate};
 const packets=data.packets.map(p=>({bytes:unhex(p.data),pts:Math.round(Number(p.pts_time)*f.sampleRate)}));assert.ok(packets.every(p=>p.bytes.length===config.blockAlign&&Number.isSafeInteger(p.pts)));
 const d=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config);let drain=[],maximumFramesPerBlock=0,maximumScalarsPerBlock=0;
 function decode(start=0){const frames=[];for(const p of packets.slice(start)){const decoded=d.decode(p.bytes,p.pts);maximumFramesPerBlock=Math.max(maximumFramesPerBlock,decoded.length);maximumScalarsPerBlock=Math.max(maximumScalarsPerBlock,decoded.reduce((n,x)=>n+x.samples*x.channels,0));frames.push(...decoded);}drain=d.flush();frames.push(...drain);assert.deepEqual(d.flush(),[]);return frames;}
 try{
  if(f.expectedFailure){assert.throws(()=>decode(),e=>e.message==='Audio codec failed (-1163346256)');Object.assign(row,{passed:true,expectedFailure:f.expectedFailure});results.push(row);console.log(f.id,'PASS expected WMAPro-in-WMAVoice rejection');continue;}
  const frames=decode();assert.ok(frames.length);const raw=await readFile(root+'/'+f.id+(f.codec==='wmalossless'?'.s32':'.f32'));assert.equal(hash(raw),f.referenceSHA256);const comparison=compare(raw,frames,f.codec==='wmalossless',f.codec==='wmavoice');
  if(f.codec==='wmavoice'){
   const muted=frames.map(frame=>({...frame,planes:frame.planes.map(plane=>new Float32Array(plane.length))}));
   assert.throws(()=>compare(raw,muted,false,true),'mandatory silent-output control');row.silentControlRejected=true;
   const corrupt=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config);let rejected=false,corruptFrames=[];
   try{for(const packet of packets)corruptFrames.push(...corrupt.decode(new Uint8Array(packet.bytes.length),packet.pts));corruptFrames.push(...corrupt.flush());}catch(error){rejected=/^Audio codec failed /.test(error.message);if(!rejected)throw error;}finally{corrupt.dispose();}
   if(!rejected)assert.throws(()=>compare(raw,corruptFrames,false,true),'mandatory corrupt-block output control');row.corruptOutputControlRejected=true;row.corruptNativeError=rejected;
  }
  const frameRaw=await readFile(root+'/'+f.id+'.frames.json');assert.equal(hash(frameRaw),f.framesSHA256);const metadata=JSON.parse(frameRaw).frames;assert.equal(metadata.length,frames.length);let originalPTS=0;for(let i=0;i<frames.length;i++){assert.equal(frames[i].samples,metadata[i].nb_samples);if(metadata[i].pts_time!==undefined){assert.equal(frames[i].pts,Math.round(Number(metadata[i].pts_time)*f.sampleRate));assert.equal(frames[i].timestampOrigin,'native');originalPTS++;}else{assert.equal(frames[i].timestampOrigin,'packet-clock');}}
  d.reset();const repeat=decode();assert.deepEqual(repeat.map(x=>[x.pts,x.samples,x.layout]),frames.map(x=>[x.pts,x.samples,x.layout]));assert.equal(compare(raw,repeat,f.codec==='wmalossless',f.codec==='wmavoice').pcmSHA256,comparison.pcmSHA256);
  const seeks=[];for(const fraction of [.65,.2,.85,.35]){
   const target=Math.min(frames.length-1,Math.floor(fraction*frames.length));d.reset();const recovered=decode();assert.deepEqual(recovered[target].pcm,frames[target].pcm,'original stream predictor state preserved after fresh full restart/discard');const offset=frames.slice(0,target).reduce((n,f)=>n+f.samples*f.channels,0)*4;assert.deepEqual(pcm(recovered[target]),raw.subarray(offset,offset+pcm(recovered[target]).length),'independent scalar original PCM at seek destination');seeks.push({firstPacket:0,targetFrame:target,originalFramePTS:frames[target].pts,comparedSamples:frames[target].samples,integerExact:true,contract:'original-stream-restart-and-discard'});
  }
  Object.assign(row,{passed:true,frames:frames.length,drainFrames:drain.length,samples:raw.length/4/f.channels,referenceSHA256:f.referenceSHA256,integerExact:f.codec==='wmalossless',nativeTimestampFrames:originalPTS,maximumFramesPerBlock,maximumScalarsPerBlock,resetExact:true,seekQualification:'Fresh complete original stream decode followed by discard to target frame; exact original scalar PCM and original frame timestamp, no arbitrary packet restart or container composition admission.',timestampOrigins:[...new Set(frames.map(x=>x.timestampOrigin))],seeks,...comparison});
 }finally{d.dispose();d.dispose();}
 for(const changed of [{blockAlign:0},{bitRate:0},{blockAlign:1.5},{bitRate:Infinity},{extradata:new Uint8Array()},{extradata:new Uint8Array(19)},{channels:3},{sampleRate:22050}])assert.throws(()=>new PacketAudioDecoder(module,f.codec,new AbortController().signal,{...config,...changed}));
 for(const n of [config.blockAlign-1,config.blockAlign+1,config.blockAlign*2]){const bad=new PacketAudioDecoder(module,f.codec,new AbortController().signal,config);try{assert.throws(()=>bad.decode(new Uint8Array(n),0));}finally{bad.dispose();}}
 const aborted=new AbortController(),victim=new PacketAudioDecoder(module,f.codec,aborted.signal,config);aborted.abort();assert.throws(()=>victim.flush(),e=>e.name==='AbortError'); row.invalidFramingRejected=true;row.abort=true;
 console.log(f.id,'PASS',row.samples,row.maxError);
}catch(e){Object.assign(row,{passed:false,error:String(e.stack??e)});console.error(f.id,'FAILED',e.message);}results.push(row);}
const referenceRecordRaw=await readFile(path.join(path.dirname(ffmpeg),'build-record.json'));const referenceRecord=JSON.parse(referenceRecordRaw);assert.equal(hash(await readFile(ffmpeg)),referenceRecord.artifacts.ffmpeg.sha256);
const inputs=Object.fromEntries(await Promise.all(['native/audio-codecs/decoder.c','packages/provider-audio/src/packet-decoder.ts','scripts/build-audio-providers.py','tests/wma-p23-fixtures.py','tests/wma-p23-audio.mjs','scripts/build-wma-reference.py'].map(async p=>[p,hash(await readFile(p))])));
const preferred=process.env.WMA_PREFERRED_INPUTS??'/tmp/demuxe-wma-p23-source-inputs';for(const [name,expected]of Object.entries(record.inputs))assert.equal(hash(await readFile(path.join(preferred,name))),expected,'exact native build source identity');
const report={passed:results.every(r=>r.passed),scope:'Official bounded complete ASF codec-block WMA advanced packet decoding; no container, remux, playback, or implicit resampling admission.',referenceBuild:{recordSHA256:hash(referenceRecordRaw),...referenceRecord},referenceTool:execFileSync(ffmpeg,['-version'],{encoding:'utf8'}).split('\n')[0],inputs,build:{profile:record.profile,source:record.source,sourceKey:record.sourceKey,nativeBuildInputs:record.inputs,recordSHA256:pointer.recordSHA256,module:record.artifacts['module.mjs'],wasm:record.artifacts['module.wasm'],capabilities:record.capabilities},results};
await mkdir('results/media-components/codec-expansion',{recursive:true});await writeFile('results/media-components/codec-expansion/wma-p23.json',JSON.stringify(report,null,2)+'\n');if(!report.passed)process.exitCode=1;
