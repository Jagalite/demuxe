// SPDX-License-Identifier: Apache-2.0
// Packet-only qualification against independent native FFprobe references.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {MpegTsReader} from '../build/mpegts-reader/mpegts.js';
const sha=b=>createHash('sha256').update(b).digest('hex'),results=[];
class LocalBlob extends Blob{reads=[];async arrayBuffer(){throw Error('Whole-file TS read forbidden');}slice(start,end,type){assert.ok(end-start<=65536);this.reads.push({start,end});return super.slice(start,end,type);}}
const fixtures=JSON.parse(await readFile('build/mpegts-fixtures/fixtures.json'));
for(const f of fixtures){
 const bytes=await readFile(f.input),file=new LocalBlob([bytes]),reader=await MpegTsReader.open(file,new AbortController().signal),actual=[];
 for await(const p of reader.packets())actual.push(p);
 const reference=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_packets','-show_data_hash','sha256','-of','json',f.input],{maxBuffer:4*1024*1024}));
 for(const stream of reference.streams){const pid=Number(stream.id),expected=reference.packets.filter(p=>p.stream_index===stream.index),packets=actual.filter(p=>p.track===pid);assert.equal(packets.length,expected.length);
  for(let i=0;i<packets.length;i++){const p=packets[i],e=expected[i];assert.equal(sha(p.data),e.data_hash.split(':')[1].toLowerCase());assert.equal(p.pts,Number(e.pts));assert.equal(p.dts,Number(e.dts));assert.equal(p.key,e.flags.includes('K'));assert.equal(p.timescale,90000);if(stream.codec_type==='audio')assert.equal(p.duration,Number(e.duration));else assert.equal(p.duration,undefined,'No invented video duration');}
 }
 assert.equal(reader.tracks.find(t=>t.kind==='audio').channels,f.channels);assert.equal(reader.tracks.find(t=>t.kind==='audio').sampleRate,48000);
 if(f.bframes)assert.ok(actual.some(p=>p.packetFormat==='annexb'&&p.pts!==p.dts),'Preserve reordered video timestamps');
 results.push({id:f.id,inputSHA256:sha(bytes),packets:actual.length,bytesRead:reader.bytesRead,maxRead:Math.max(...file.reads.map(r=>r.end-r.start)),referenceExact:true,passed:true});
}
const base=await readFile(fixtures[0].input),pid=b=>((b[1]&31)<<8)|b[2],payload=b=>{let p=4;if((b[3]>>4)&2)p=5+b[4];return p;};
function packetAt(b,number,start,occurrence=0){for(let p=0;p<b.length;p+=188){const packet=b.subarray(p,p+188);if(pid(packet)===number&&(start===undefined||!!(packet[1]&64)===start)&&occurrence--===0)return p;}throw Error('TS packet absent');}
function crc(b){let v=0xffffffff;for(const x of b){v^=x<<24;for(let i=0;i<8;i++)v=v&0x80000000?(v<<1)^0x04c11db7:v<<1;}return v>>>0;}
function section(b,number,occurrence=0){const p=packetAt(b,number,true,occurrence),start=p+payload(b.subarray(p,p+188))+1,length=3+(b.readUInt16BE(start+1)&4095);return {start,end:start+length};}
function recalc(b,x){b.writeUInt32BE(crc(b.subarray(x.start,x.end-4)),x.end-4);}
function pesHeader(b,number,occurrence=0){const p=packetAt(b,number,true,occurrence);return p+payload(b.subarray(p,p+188));}
function timestamp(b,p,value,prefix){b[p]=(prefix<<4)|((Math.floor(value/536870912)&14))|1;b[p+1]=Math.floor(value/4194304)&255;b[p+2]=(Math.floor(value/16384)&254)|1;b[p+3]=Math.floor(value/128)&255;b[p+4]=((value%128)<<1)|1;}
const pat=section(base,0),pmtPid=base.readUInt16BE(pat.start+10)&8191;
const rejects=[
 ['partial-ts-packet',b=>b.subarray(0,b.length-1)],
 ['sync-loss',b=>{b[0]=0;return b;}],
 ['transport-error',b=>{b[1]|=128;return b;}],
 ['scrambled',b=>{b[3]|=128;return b;}],
 ['pat-crc',b=>{const s=section(b,0);b[s.start+8]^=1;return b;}],
 ['pmt-crc',b=>{const s=section(b,pmtPid);b[s.start+12]^=1;return b;}],
 ['pat-program-change',b=>{const s=section(b,0,1);b[s.start+5]^=2;recalc(b,s);return b;}],
 ['pmt-program-change',b=>{const s=section(b,pmtPid,1);b[s.start+5]^=2;recalc(b,s);return b;}],
 ['unsupported-stream',b=>{const s=section(b,pmtPid);b[s.start+12]=36;recalc(b,s);return b;}],
 ['continuity-gap',b=>{const p=packetAt(b,256,undefined,1);b[p+3]=(b[p+3]&240)|((b[p+3]+3)&15);return b;}],
 ['adaptation-overrun',b=>{const p=packetAt(b,256,true);b[p+3]|=32;b[p+4]=184;return b;}],
 ['adaptation-discontinuity',b=>{const p=packetAt(b,256,true);assert.ok((b[p+3]>>4)&2);b[p+5]|=128;return b;}],
 ['invalid-pts-marker',b=>{const p=pesHeader(b,256);b[p+9]&=254;return b;}],
 ['video-dts-rollover',b=>{let p=pesHeader(b,256);timestamp(b,p+9,8589930000,2);p=pesHeader(b,256,1);timestamp(b,p+9,100,2);return b;}],
 ['unadvertised-pes',b=>{const p=packetAt(b,256,true);b[p+1]=(b[p+1]&224)|1;b[p+2]=44;return b;}],
 ['unbounded-audio-pes',b=>{const p=pesHeader(b,257);b.writeUInt16BE(0,p+4);return b;}],
 ['truncated-audio-pes',b=>{const p=pesHeader(b,257,1);b.writeUInt16BE(60000,p+4);return b;}],
 ['aac-pes-length-overrun',b=>{const p=pesHeader(b,257);b.writeUInt16BE(10,p+4);return b;}],
 ['aac-pts-gap',b=>{const p=pesHeader(b,257,1);timestamp(b,p+9,150000,2);return b;}],
 ['aac-rollover-in-pes',b=>{const p=pesHeader(b,257);timestamp(b,p+9,8589934000,2);return b;}],
];
for(const [id,mutate]of rejects){const data=mutate(Buffer.from(base));await assert.rejects(async()=>{const reader=await MpegTsReader.open(new Blob([data]),new AbortController().signal);for await(const p of reader.packets()){}},e=>e.code==='PROVIDER_PROFILE_MISMATCH',id);results.push({id,rejected:true,passed:true});}
// Keep a valid PAT/PMT and first audio PES, then challenge a bounded video PES.
const prefixPackets=[];for(let p=0;p<base.length;p+=188){const packet=base.subarray(p,p+188),number=pid(packet);if(number===0||number===pmtPid||number===17)prefixPackets.push(packet);if(number===256)break;}
let seenAudio=false;for(let p=0;p<base.length;p+=188){const packet=base.subarray(p,p+188);if(pid(packet)!==257)continue;if(packet[1]&64){if(seenAudio)break;seenAudio=true;}if(seenAudio)prefixPackets.push(packet);}
const big=[];const pesStart=pesHeader(base,256),pesPrefix=base.subarray(pesStart,pesStart+14);for(let i=0;i<29000;i++){const packet=Buffer.alloc(188);packet[0]=71;packet[1]=1|(i===0?64:0);packet[2]=0;packet[3]=16|(i&15);if(i===0)pesPrefix.copy(packet,4);big.push(packet);}
const oversized=new LocalBlob([...prefixPackets,...big]);await assert.rejects(async()=>{const reader=await MpegTsReader.open(oversized,new AbortController().signal);for await(const p of reader.packets()){}},e=>e.code==='PROVIDER_PROFILE_MISMATCH'&&/PES byte budget/.test(e.message));results.push({id:'oversized-unbounded-video-pes-rejected',bytes:oversized.size,passed:true});
const nullPacket=Buffer.alloc(188,255);nullPacket[0]=71;nullPacket[1]=31;nullPacket[2]=255;nullPacket[3]=16;const missingAudio=new LocalBlob([...prefixPackets.slice(0,3),...Array.from({length:29000},()=>nullPacket)]);await assert.rejects(()=>MpegTsReader.open(missingAudio,new AbortController().signal),e=>e.code==='PROVIDER_PROFILE_MISMATCH'&&/metadata scan budget/.test(e.message));results.push({id:'metadata-scan-budget-rejected',bytes:missingAudio.size,passed:true});
const before=new AbortController();before.abort();await assert.rejects(()=>MpegTsReader.open(new Blob([base]),before.signal),e=>e.name==='AbortError');results.push({id:'abort-before-open',passed:true});
const during=new AbortController(),reader=await MpegTsReader.open(new Blob([base]),during.signal),it=reader.packets();await it.next();during.abort();await assert.rejects(()=>it.next(),e=>e.name==='AbortError');results.push({id:'abort-during-packets',passed:true});
await mkdir('build/mpegts-reader',{recursive:true});await writeFile('build/mpegts-reader/results.json',JSON.stringify({passed:true,scope:'Packet-only clear singleprogram AVC/AAC-LC48k MPEG TS; independent rawpacket hashes and exactPTS/DTS; no remux/timestamprepair/seek/Player qualification',results},null,2)+'\n');console.log(results.length+' MPEG TS reader cases passed');
