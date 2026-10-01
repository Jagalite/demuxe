// SPDX-License-Identifier: Apache-2.0
/** Bounded modern standalone APE; seek-table alignment and packet prefixes follow pinned FFmpeg ape.c. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
function fail(message:string):never{throw new ContainerProfileError(message);}
const view=(bytes:Uint8Array)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
type Entry=Readonly<{offset:number;length:number;skip:number;startSample:number;durationSamples:number}>;
export type ApePacket=Readonly<{data:Uint8Array;startSample:number;durationSamples:number}>;
export class ApeReader {
 readonly tracks:readonly MatroskaTrack[];
 private reads=0;
 private constructor(private readonly file:Blob,private readonly signal:AbortSignal,private readonly entries:readonly Entry[],readonly sampleCount:number,rate:number,channels:number,bits:number,extra:Uint8Array){
  this.tracks=Object.freeze([Object.freeze({number:1,kind:'audio' as const,codec:'ape',privateData:extra,rate,channels,bitDepth:bits})]);
 }
 get bytesRead():number{return this.reads;}
 private async read(offset:number,length:number):Promise<Uint8Array>{
  this.signal.throwIfAborted();if(offset<0||length<0||length>1048576||offset+length>this.file.size)fail('APE read bounds');const bytes=new Uint8Array(await this.file.slice(offset,offset+length).arrayBuffer());this.signal.throwIfAborted();if(bytes.length!==length)fail('Short APE read');this.reads+=length;return bytes;
 }
 static async open(file:Blob,signal:AbortSignal):Promise<ApeReader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<80)fail('Local modern APE Blob required');const scan=new ApeReader(file,signal,[],0,0,0,0,new Uint8Array()),descriptor=await scan.read(0,52),d=view(descriptor),version=d.getUint16(4,true);
  if(d.getUint32(0,false)!==0x4d414320||version<3980||version>3990||d.getUint16(6,true)||d.getUint32(8,true)!==52||d.getUint32(12,true)!==24||d.getUint32(28,true)||d.getUint32(32,true))fail('Unqualified modern APE descriptor');
  const seekLength=d.getUint32(16,true),wavHeaderLength=d.getUint32(20,true),audioLength=d.getUint32(24,true),header=await scan.read(52,24),h=view(header),compression=h.getUint16(0,true),formatFlags=h.getUint16(2,true),blocks=h.getUint32(4,true),finalBlocks=h.getUint32(8,true),frames=h.getUint32(12,true),bits=h.getUint16(16,true),channels=h.getUint16(18,true),rate=h.getUint32(20,true);
  if(![1000,2000,3000,4000,5000].includes(compression)||formatFlags||!blocks||blocks>294912||!finalBlocks||finalBlocks>blocks||!frames||frames>100000||seekLength!==frames*4||wavHeaderLength>65536||![16,24].includes(bits)||![1,2].includes(channels)||![44100,48000,96000].includes(rate))fail('Unqualified modern APE stream parameters');
  const first=76+seekLength+wavHeaderLength,audioEnd=first+audioLength;if(!audioLength||audioEnd>file.size)fail('APE declared audio bounds');
  if(audioEnd!==file.size){
   if(file.size-audioEnd<32||file.size-audioEnd>65536)fail('APE trailing metadata budget');const tags=await scan.read(audioEnd,file.size-audioEnd),footer=tags.subarray(tags.length-32),f=view(footer);
   // The pinned real 3990 fixture uses the legacy no-header footer flag 0x40000000; FFmpeg accepts it.
   if(String.fromCharCode(...footer.subarray(0,8))!=='APETAGEX'||f.getUint32(8,true)!==2000||f.getUint32(12,true)!==tags.length||f.getUint32(16,true)>256||![0,0x40000000].includes(f.getUint32(20,true))||footer.subarray(24).some(b=>b))fail('Unqualified APE trailing tag');
   let p=0;const tv=view(tags);for(let i=0;i<f.getUint32(16,true);i++){if(p+8>tags.length-32)fail('Truncated APE tag item');const length=tv.getUint32(p,true),flags=tv.getUint32(p+4,true);p+=8;const start=p;while(p<tags.length-32&&tags[p]){if(tags[p]<32||tags[p]>126||p-start>=255)fail('APE tag key bounds');p++;}if(p===start||p>=tags.length-32||flags&~7)fail('Invalid APE tag item');p++;if(length>tags.length-32-p)fail('APE tag value bounds');p+=length;}if(p!==tags.length-32)fail('APE tag trailing bytes');
  }
  const table=await scan.read(76,seekLength),t=view(table),positions=Array.from({length:frames},(_,i)=>t.getUint32(i*4,true));if(positions[0]!==first)fail('APE initial seek entry mismatch');
  const entries:Entry[]=[];for(let i=0;i<frames;i++){
   const position=positions[i],next=positions[i+1];if(position<first||position>=audioEnd||i&&position<=positions[i-1])fail('APE seek entry bounds or order');
   const skip=(position-first)%4,offset=position-skip,rawLength=i+1<frames?next-position:Math.floor((file.size-position)/4)*4;
   const alignedLength=Math.ceil((rawLength+skip)/4)*4,length=Math.min(alignedLength,file.size-offset);if(length<=0||length+8>1048576)fail('APE packet byte budget');
   entries.push(Object.freeze({offset,length,skip,startSample:i*blocks,durationSamples:i+1===frames?finalBlocks:blocks}));
  }
  const sampleCount=(frames-1)*blocks+finalBlocks;if(!Number.isSafeInteger(sampleCount))fail('APE sample clock overflow');const extra=new Uint8Array(6),e=view(extra);e.setUint16(0,version,true);e.setUint16(2,compression,true);e.setUint16(4,formatFlags,true);
  const ready=new ApeReader(file,signal,Object.freeze(entries),sampleCount,rate,channels,bits,extra);ready.reads=scan.reads;return ready;
 }
 async *packets(startSample=0,prerollSamples=0):AsyncGenerator<ApePacket>{
  if(!Number.isSafeInteger(startSample)||!Number.isSafeInteger(prerollSamples)||startSample<0||startSample>=this.sampleCount||prerollSamples<0)fail('Invalid APE seek range');
  const target=Math.max(0,startSample-prerollSamples);let start=0;while(start+1<this.entries.length&&this.entries[start+1].startSample<=target)start++;
  for(let i=start;i<this.entries.length;i++){const entry=this.entries[i],bytes=await this.read(entry.offset,entry.length),data=new Uint8Array(bytes.length+8),h=view(data);h.setUint32(0,entry.durationSamples,true);h.setUint32(4,entry.skip,true);data.set(bytes,8);yield {data,startSample:entry.startSample,durationSamples:entry.durationSamples};}
 }
}
