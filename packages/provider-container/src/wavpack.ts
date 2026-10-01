// SPDX-License-Identifier: Apache-2.0
/** Bounded standalone integer-lossless WavPack. Header block indexes own the sample clock. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
function fail(message:string):never{throw new ContainerProfileError(message);}
const view=(bytes:Uint8Array)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
const magic=(bytes:Uint8Array)=>String.fromCharCode(...bytes.subarray(0,8));
const rates=[6000,8000,9600,11025,12000,16000,22050,24000,32000,44100,48000,64000,88200,96000,192000,0];
type Entry=Readonly<{offset:number;length:number;startSample:number;durationSamples:number}>;
export type WavPackPacket=Readonly<{data:Uint8Array;startSample:number;durationSamples:number}>;
export class WavPackReader {
 readonly tracks:readonly MatroskaTrack[];
 private reads=0;
 private constructor(private readonly file:Blob,private readonly signal:AbortSignal,private readonly entries:readonly Entry[],readonly sampleCount:number,rate:number,channels:number,bits:number){
  this.tracks=Object.freeze([Object.freeze({number:1,kind:'audio' as const,codec:'wavpack',privateData:new Uint8Array(),rate,channels,bitDepth:bits})]);
 }
 get bytesRead():number{return this.reads;}
 private async read(offset:number,length:number):Promise<Uint8Array>{
  this.signal.throwIfAborted();if(offset<0||length<0||length>1048576||offset+length>this.file.size)fail('WavPack read bounds');
  const bytes=new Uint8Array(await this.file.slice(offset,offset+length).arrayBuffer());this.signal.throwIfAborted();if(bytes.length!==length)fail('Short WavPack read');this.reads+=length;return bytes;
 }
 static async open(file:Blob,signal:AbortSignal):Promise<WavPackReader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<32)fail('Local WavPack Blob required');
  const scan=new WavPackReader(file,signal,[],0,0,0,0);let end=file.size;
  const footer=await scan.read(end-32,32);
  if(magic(footer)==='APETAGEX'){
   const f=view(footer),size=f.getUint32(12,true),count=f.getUint32(16,true),flags=f.getUint32(20,true);
   if(f.getUint32(8,true)!==2000||size<32||size>65536||count>256||flags!==0x80000000||footer.subarray(24).some(b=>b)||size+32>end)fail('Unqualified WavPack APEv2 footer');
   const header=await scan.read(end-size-32,32),h=view(header);if(magic(header)!=='APETAGEX'||h.getUint32(8,true)!==2000||h.getUint32(12,true)!==size||h.getUint32(16,true)!==count||h.getUint32(20,true)!==0xa0000000||header.subarray(24).some(b=>b))fail('WavPack APEv2 header mismatch');
   const tags=await scan.read(end-size,size-32);let p=0;const tv=view(tags);
   for(let i=0;i<count;i++){if(p+8>tags.length)fail('Truncated WavPack tag');const length=tv.getUint32(p,true),tagFlags=tv.getUint32(p+4,true);p+=8;const start=p;while(p<tags.length&&tags[p]){if(tags[p]<32||tags[p]>126||p-start>=255)fail('WavPack tag key bounds');p++;}if(p===start||p>=tags.length||tagFlags&~7)fail('Invalid WavPack tag');p++;if(length>tags.length-p)fail('WavPack tag value bounds');p+=length;}
   if(p!==tags.length)fail('WavPack tag trailing bytes');end-=size+32;
  }
  const entries:Entry[]=[];let offset=0,clock=0,declared:number|undefined,rate=0,bits=0,channels=0,streamVersion=0,packetOffset=0,packetSize=0,blockCount=0,packetSamples=0,groupChannels=0;
  while(offset<end){
   if(end-offset<32||entries.length>=100000)fail('WavPack block/index budget');const header=await scan.read(offset,32),h=view(header),length=h.getUint32(4,true)+8,version=h.getUint16(8,true),total=h.getUint32(12,true),index=h.getUint32(16,true),samples=h.getUint32(20,true),flags=h.getUint32(24,true);
   if(h.getUint32(0,false)!==0x7776706b||length<=32||length>1048576||length>end-offset||![0x403,0x410].includes(version)||h.getUint16(10,true)||!samples||samples>65536||(flags&0x80000088)!==0)fail('Unqualified standalone WavPack block');
   const blockRate=rates[(flags>>>23)&15],blockBits=((flags&3)+1)*8;
   if(![44100,48000,96000].includes(blockRate)||![16,24,32].includes(blockBits)||((flags>>>13)&31)!==0)fail('Unqualified WavPack rate or integer precision');
   if(!rate){rate=blockRate;bits=blockBits;declared=total;streamVersion=version;}else if(version!==streamVersion||rate!==blockRate||bits!==blockBits||(total!==0&&total!==0xffffffff&&declared!==total))fail('Changing WavPack stream parameters');
   if(declared===0xffffffff||!declared||index!==clock)fail('Unknown or discontinuous WavPack sample clock');
   if(!!(flags&0x800)!==(blockCount===0))fail('WavPack initial channel block order');
   if(!blockCount){packetOffset=offset;packetSamples=samples;groupChannels=0;}else if(packetSamples!==samples)fail('WavPack channel sample count mismatch');
   packetSize+=length;blockCount++;groupChannels+=(flags&4)?1:2;if(packetSize>1048576||blockCount>8)fail('WavPack packet/channel budget');
   // Channel metadata fixes surround order; single-block mono/stereo order is canonical.
   if(!entries.length&&!channels){
    if(flags&0x1000)channels=groupChannels;
    else{
     const block=await scan.read(offset+32,length-32),b=view(block);let p=0;
     while(p<block.length){const id=block[p++];if(p>=block.length)fail('Truncated WavPack metadata');let words=block[p++];if(id&128){if(p+2>block.length)fail('Truncated WavPack metadata size');words|=block[p++]<<8|block[p++]<<16;}const padded=words*2,size=padded-((id&64)?1:0);if(size<0||padded>block.length-p)fail('WavPack metadata bounds');if((id&63)===13){if(channels||size!==5)fail('Unqualified WavPack channel info');channels=block[p];const mask=b.getUint32(p+1,true);if(![6,8].includes(channels)||mask!==(channels===6?63:1599))fail('Unqualified WavPack channel layout');}p+=padded;}
     if(!channels)fail('Missing WavPack channel layout');
    }
   }
   offset+=length;
   if(flags&0x1000){if(groupChannels!==channels||![1,2,6,8].includes(channels))fail('WavPack channel group mismatch');entries.push(Object.freeze({offset:packetOffset,length:packetSize,startSample:clock,durationSamples:samples}));clock+=samples;if(clock>declared!)fail('WavPack sample extent exceeds declared total');packetSize=0;blockCount=0;}
  }
  if(rate===44100&&channels>2)fail('Unqualified WavPack 44.1 kHz surround');
  if(blockCount||!entries.length||clock!==declared)fail('Incomplete WavPack stream');
  const ready=new WavPackReader(file,signal,Object.freeze(entries),clock,rate,channels,bits);ready.reads=scan.reads;return ready;
 }
 async *packets(startSample=0,prerollSamples=0):AsyncGenerator<WavPackPacket>{
  if(!Number.isSafeInteger(startSample)||!Number.isSafeInteger(prerollSamples)||startSample<0||startSample>=this.sampleCount||prerollSamples<0)fail('Invalid WavPack seek range');
  const target=Math.max(0,startSample-prerollSamples);let start=0;while(start+1<this.entries.length&&this.entries[start+1].startSample<=target)start++;
  for(let i=start;i<this.entries.length;i++){const e=this.entries[i];yield {data:await this.read(e.offset,e.length),startSample:e.startSample,durationSamples:e.durationSamples};}
 }
}
