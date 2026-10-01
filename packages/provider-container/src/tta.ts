// SPDX-License-Identifier: Apache-2.0
/** Bounded unencrypted TTA1 header/seek-table reader with an exact sample clock. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
function fail(message:string):never{throw new ContainerProfileError(message);}
const view=(bytes:Uint8Array)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
export function ttaCRC32(bytes:Uint8Array):number{let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
type Entry=Readonly<{offset:number;length:number;startSample:number;durationSamples:number}>;
export type TtaPacket=Readonly<{data:Uint8Array;startSample:number;durationSamples:number}>;
export class TtaReader {
 readonly tracks:readonly MatroskaTrack[];
 private reads=0;
 private constructor(private readonly file:Blob,private readonly signal:AbortSignal,private readonly entries:readonly Entry[],readonly sampleCount:number,rate:number,channels:number,bits:number,extra:Uint8Array){
  this.tracks=Object.freeze([Object.freeze({number:1,kind:'audio' as const,codec:'tta',privateData:extra,rate,channels,bitDepth:bits})]);
 }
 get bytesRead():number{return this.reads;}
 private async read(offset:number,length:number):Promise<Uint8Array>{
  this.signal.throwIfAborted();if(offset<0||length<0||length>1048576||offset+length>this.file.size)fail('TTA read bounds');const bytes=new Uint8Array(await this.file.slice(offset,offset+length).arrayBuffer());this.signal.throwIfAborted();if(bytes.length!==length)fail('Short TTA read');this.reads+=length;return bytes;
 }
 static async open(file:Blob,signal:AbortSignal):Promise<TtaReader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<31)fail('Local TTA1 Blob required');const scan=new TtaReader(file,signal,[],0,0,0,0,new Uint8Array()),header=await scan.read(0,22),h=view(header),rate=h.getUint32(10,true),channels=h.getUint16(6,true),bits=h.getUint16(8,true),sampleCount=h.getUint32(14,true);
  if(h.getUint32(0,false)!==0x54544131||h.getUint16(4,true)!==1||![44100,48000].includes(rate)||![1,2,6].includes(channels)||![16,24].includes(bits)||!sampleCount||ttaCRC32(header.subarray(0,18))!==h.getUint32(18,true))fail('Unqualified TTA1 header');
  const frameSamples=Math.floor(rate*256/245),frames=Math.ceil(sampleCount/frameSamples);if(frames>100000)fail('TTA seek-table budget');const table=await scan.read(22,frames*4+4),t=view(table);if(ttaCRC32(table.subarray(0,frames*4))!==t.getUint32(frames*4,true))fail('TTA seek-table checksum');
  const entries:Entry[]=[];let offset=26+frames*4;for(let i=0;i<frames;i++){const length=t.getUint32(i*4,true);if(length<5||length>1048576||offset+length>file.size)fail('TTA frame byte bounds');entries.push(Object.freeze({offset,length,startSample:i*frameSamples,durationSamples:Math.min(frameSamples,sampleCount-i*frameSamples)}));offset+=length;}
  let end=file.size;
  if(end-offset>=128){const id3=await scan.read(end-128,3);if(String.fromCharCode(...id3)==='TAG')end-=128;}
  if(offset!==end){
   if(end-offset<32||end-offset>65536)fail('TTA trailing metadata budget');const tags=await scan.read(offset,end-offset),footer=tags.subarray(tags.length-32),f=view(footer),size=f.getUint32(12,true),count=f.getUint32(16,true),flags=f.getUint32(20,true),hasHeader=flags===0x80000000;
   if(String.fromCharCode(...footer.subarray(0,8))!=='APETAGEX'||f.getUint32(8,true)!==2000||count>256||![0,0x40000000,0x80000000].includes(flags)||footer.subarray(24).some(b=>b)||size<32||size+(hasHeader?32:0)!==tags.length)fail('Unqualified TTA APEv2 metadata');
   let p=0;if(hasHeader){const ah=view(tags);if(String.fromCharCode(...tags.subarray(0,8))!=='APETAGEX'||ah.getUint32(8,true)!==2000||ah.getUint32(12,true)!==size||ah.getUint32(16,true)!==count||ah.getUint32(20,true)!==0xa0000000||tags.subarray(24,32).some(b=>b))fail('TTA APEv2 header mismatch');p=32;}
   const tv=view(tags);for(let i=0;i<count;i++){if(p+8>tags.length-32)fail('Truncated TTA tag');const length=tv.getUint32(p,true),tagFlags=tv.getUint32(p+4,true);p+=8;const start=p;while(p<tags.length-32&&tags[p]){if(tags[p]<32||tags[p]>126||p-start>=255)fail('TTA tag key bounds');p++;}if(p===start||p>=tags.length-32||tagFlags&~7)fail('Invalid TTA tag');p++;if(length>tags.length-32-p)fail('TTA tag value bounds');p+=length;}if(p!==tags.length-32)fail('TTA tag trailing bytes');
  }
  const ready=new TtaReader(file,signal,Object.freeze(entries),sampleCount,rate,channels,bits,header);ready.reads=scan.reads;return ready;
 }
 async *packets(startSample=0,prerollSamples=0):AsyncGenerator<TtaPacket>{
  if(!Number.isSafeInteger(startSample)||!Number.isSafeInteger(prerollSamples)||startSample<0||startSample>=this.sampleCount||prerollSamples<0)fail('Invalid TTA seek range');const target=Math.max(0,startSample-prerollSamples);let start=0;while(start+1<this.entries.length&&this.entries[start+1].startSample<=target)start++;
  for(let i=start;i<this.entries.length;i++){const e=this.entries[i];yield {data:await this.read(e.offset,e.length),startSample:e.startSample,durationSamples:e.durationSamples};}
 }
}
