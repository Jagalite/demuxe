// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {PacketOpusEncoder} from '../build/component-candidates/provider-audio/src/opus-encoder.js';
import {FragmentedMP4Writer} from '../build/component-candidates/provider-container/src/fmp4.js';
const root=process.env.OPUS_BUILD_ROOT??'build/codec-expansion/opus-encoder';
const pointer=JSON.parse(await readFile(path.join(root,'opus-encoder.json'),'utf8'));
const recordBytes=await readFile(path.join(pointer.directory,'build-record.json'));
assert.equal(createHash('sha256').update(recordBytes).digest('hex'),pointer.recordSHA256);
const record=JSON.parse(recordBytes);
for(const [file,fact] of Object.entries(record.artifacts))assert.equal(createHash('sha256').update(await readFile(path.join(pointer.directory,file))).digest('hex'),fact.sha256);
const factory=(await import(pathToFileURL(path.join(pointer.directory,'module.mjs')))).default;
const module=await factory({wasmBinary:await readFile(path.join(pointer.directory,'module.wasm'))});
const out=process.env.OPUS_RESULT_ROOT??'build/codec-expansion/opus-results';await mkdir(out,{recursive:true});
const results=[];
for(const channels of [1,2])for(const count of [13,960,48000*2+137,48000*2+959]){
 const c=new AbortController(),e=new PacketOpusEncoder(module,channels,c.signal);
 const pcm=Int32Array.from({length:count*channels},(_,i)=>Math.round(Math.sin(2*Math.PI*(channels===2&&i%2?660:440)*Math.floor(i/channels)/48000)*0x300000)*256);
 const packets=[];
 for(let offset=0;offset<pcm.length;offset+=e.blockSize*channels)packets.push(...e.encode(pcm.subarray(offset,offset+e.blockSize*channels)));
 packets.push(...e.flush());assert.deepEqual(e.flush(),[]);
 let pts=-e.preSkip;for(const p of packets){assert.equal(p.pts,pts);pts+=p.duration;}assert.equal(pts,count);
 const w=new FragmentedMP4Writer([{id:1,codec:'Opus',timescale:48000,channels,config:e.header}]);
 const file=path.join(out,`opus-${channels}-${count}.mp4`);
 await writeFile(file,Buffer.concat([w.initialization(),w.fragment(1,packets.map(p=>({data:p.data,dts:p.pts+e.preSkip,pts:p.pts+e.preSkip,duration:p.duration,key:true})))]));
 const decoded=execFileSync('ffmpeg',['-v','error','-i',file,'-f','f32le','-'],{maxBuffer:16*1024*1024});
 const float=new Float32Array(decoded.buffer,decoded.byteOffset,decoded.length/4);
 assert.ok(float.length>=pcm.length,`decoded ${float.length/channels}, expected ${count}`);
 assert.ok(float.length/channels-count<960,'Excess Opus tail padding');
 let signal=0,error=0;for(let i=4800*channels;i<pcm.length;i++){const v=pcm[i]/2147483648;signal+=v*v;error+=(v-float[i])**2;}
 const snr=count>4800?10*Math.log10(signal/error):null;if(snr!==null)assert.ok(snr>15,`SNR ${snr}`);
 let seekSnr=null;
 if(count>48000){
 const seek=execFileSync('ffmpeg',['-v','error','-seek_timestamp','1','-ss','0.92','-i',file,'-ss','0.08','-t','0.1','-f','f32le','-'],{maxBuffer:16*1024*1024});assert.equal(seek.length,4800*channels*4);
 const seekPCM=new Float32Array(seek.buffer,seek.byteOffset,seek.length/4);
 let seekSignal=0,seekError=0;for(let i=0;i<seekPCM.length;i++){const v=pcm[48000*channels+i]/2147483648;seekSignal+=v*v;seekError+=(v-seekPCM[i])**2;}
 seekSnr=10*Math.log10(seekSignal/seekError);assert.ok(seekSnr>15,`seek SNR ${seekSnr}`);
 }
 c.abort();assert.throws(()=>e.encode(pcm.subarray(0,channels)));e.dispose();
 results.push({channels,inputSamples:count,decodedSamples:float.length/channels,preSkip:e.preSkip,packets:packets.length,snrDb:snr,seekSamples:count>48000?4800:0,seekSnrDb:seekSnr,seekPrerollSamples:count>48000?3840:0,partialFinalBlock:count%e.blockSize!==0,aborted:true});
}
{
 const c=new AbortController(),e=new PacketOpusEncoder(module,1,c.signal);
 assert.deepEqual(e.flush(),[]);assert.deepEqual(e.flush(),[]);e.dispose();
 const pending=new AbortController(),active=new PacketOpusEncoder(module,2,pending.signal);
 active.encode(new Int32Array(active.blockSize*2));pending.abort();assert.throws(()=>active.flush());active.dispose();
 const invalid=new PacketOpusEncoder(module,1,new AbortController().signal);
 assert.throws(()=>invalid.encode(Int32Array.of(1)),/left-justified/);assert.throws(()=>invalid.flush(),/disposed/);
}
for(const channels of [0,3,6,8])assert.throws(()=>new PacketOpusEncoder(module,channels,new AbortController().signal));
await writeFile(path.join(out,'report.json'),JSON.stringify({passed:true,scope:'Real Wasm encoding, independent FFmpeg decode and MP4 seek with required80ms Opus preroll; browser qualification separate',record,results},null,2)+'\n');
console.log(results);
