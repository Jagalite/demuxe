// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {MatroskaReader} from '../build/component-candidates/provider-container/src/matroska.js';
import {FragmentedMP4Writer} from '../build/component-candidates/provider-container/src/fmp4.js';
await mkdir('build/provider-container',{recursive:true});
const input='build/provider-container/no-reorder.mkv',output='build/provider-container/remux.mp4';
execFileSync('ffmpeg',['-v','error','-y','-i','fixtures/example.mp4','-t','3','-map','0:v:0','-map','0:a:0','-c:v','libx264','-bf','0','-pix_fmt','yuv420p','-c:a','copy',input]);
const file=await readFile(input),reader=await MatroskaReader.open(new Blob([file]),new AbortController().signal);
const tracks=reader.tracks.map(t=>({id:t.number,codec:t.kind==='video'?'avc1':'mp4a',config:t.privateData,timescale:t.kind==='video'?1000:48000,width:t.width,height:t.height,channels:t.channels}));
const writer=new FragmentedMP4Writer(tracks),parts=[writer.initialization()],tails=new Map(),counts=new Map();
const packets=[];for await(const p of reader.packets())packets.push(p);
for(let index=0;index<packets.length;index++){
 const p=packets[index];
 const t=tracks.find(t=>t.id===p.track),source=reader.tracks.find(t=>t.number===p.track);
 const dts=t.codec==='avc1'?Math.round(p.timestampNs/1e6):(tails.get(p.track)??Math.round(p.timestampNs*48000/1e9));
 const next=packets.slice(index+1).find(q=>q.track===p.track);
 const duration=t.codec==='avc1'?(next?Math.round(next.timestampNs/1e6)-dts:Math.round(source.defaultDurationNs/1e6)):1024;
 if(t.codec==='mp4a')assert.ok(Math.abs(dts/48000-p.timestampNs/1e9)<0.0011);
 parts.push(writer.fragment(p.track,[{data:p.data,pts:dts,dts,duration,key:p.key}]));tails.set(p.track,dts+duration);counts.set(p.track,(counts.get(p.track)??0)+1);
}
await writeFile(output,Buffer.concat(parts));
const probe=f=>JSON.parse(execFileSync('ffprobe',['-v','error','-show_packets','-show_data_hash','sha256','-of','json',f],{maxBuffer:16*1024*1024}));
const before=probe(input),after=probe(output);assert.equal(after.packets.length,before.packets.length);
for(let stream=0;stream<2;stream++){
 const a=before.packets.filter(p=>p.stream_index===stream),b=after.packets.filter(p=>p.stream_index===stream);assert.deepEqual(b.map(p=>p.data_hash),a.map(p=>p.data_hash));
 for(let i=0;i<a.length;i++)assert.ok(Math.abs(Number(a[i].pts_time)-Number(b[i].pts_time))<0.0011);
}
const raw=(f,format)=>execFileSync('ffmpeg',['-v','error','-i',f,'-map',format==='rawvideo'?'0:v:0':'0:a:0','-f',format,'-'],{maxBuffer:64*1024*1024});
assert.deepEqual(raw(output,'rawvideo'),raw(input,'rawvideo'));assert.deepEqual(raw(output,'f32le'),raw(input,'f32le'));
assert.throws(()=>writer.fragment(1,[{data:new Uint8Array([1]),dts:0,pts:0,duration:1,key:true}]),/timeline/);
const result={passed:true,scope:'AVC without reordered pictures + AAC 48 kHz; TS mux packet and decoded-output equivalence',packets:after.packets.length,output};
await mkdir('results/media-components/container-provider',{recursive:true});await writeFile('results/media-components/container-provider/mux.json',JSON.stringify(result,null,2)+'\n');console.log(result);
