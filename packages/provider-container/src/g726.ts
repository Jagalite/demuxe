// SPDX-License-Identifier: Apache-2.0
/** Finite canonical G726 WAV and explicitly configured raw G726 reader. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
export type G726Codec='adpcm-g726'|'adpcm-g726le';
export type G726Bits=2|3|4|5;
export type G726RawConfiguration=Readonly<{codec:G726Codec;bitsPerSample:G726Bits;sampleCount?:number}>;
export type G726Track=MatroskaTrack&Readonly<{codec:G726Codec;bitDepth:G726Bits;bitRate:number;decodedBitDepth:16;bitOrder:'most-significant-first'|'least-significant-first'}>;
export type G726Packet=Readonly<{data:Uint8Array;startSample:number;durationSamples:number;decodedDurationSamples:number;discardPaddingSamples:number}>;
const MAX_FILE=64*1048576,PACKET_BYTES=1020;
function fail(message:string):never{throw new ContainerProfileError(message);}
const text=(b:Uint8Array,o:number,n:number)=>String.fromCharCode(...b.subarray(o,o+n));
const period=(bits:G726Bits)=>bits===2?4:bits===4?2:8;
function count(bytes:number,bits:G726Bits,presentation?:number):number{
 if(bytes<1||bytes*8%bits)fail('G726 complete coded byte groups required');const decoded=bytes*8/bits;
 if(presentation===undefined)return decoded;
 if(!Number.isSafeInteger(presentation)||presentation<=decoded-period(bits)||presentation>decoded||presentation<1)fail('G726 original final bit-group sample extent');return presentation;
}
export class G726Reader{
 readonly tracks:readonly G726Track[];private reads=0;
 private constructor(private readonly file:Blob,private readonly signal:AbortSignal,readonly container:'wave-g726'|'raw-g726',private readonly dataStart:number,private readonly dataBytes:number,readonly bitsPerSample:G726Bits,readonly sampleCount:number,codec:G726Codec){
  this.tracks=Object.freeze([Object.freeze({number:1,kind:'audio' as const,codec,rate:8000,channels:1,bitDepth:bitsPerSample,decodedBitDepth:16 as const,bitRate:8000*bitsPerSample,privateData:new Uint8Array(),bitOrder:codec==='adpcm-g726'?'most-significant-first' as const:'least-significant-first' as const})]);
 }
 get decodedSampleCount():number{return this.dataBytes*8/this.bitsPerSample;}
 get bytesRead():number{return this.reads;}
 private async read(offset:number,length:number):Promise<Uint8Array>{this.signal.throwIfAborted();if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<0||length>65536||offset+length>this.file.size)fail('G726 read bounds');const b=new Uint8Array(await this.file.slice(offset,offset+length).arrayBuffer());this.signal.throwIfAborted();if(b.length!==length)fail('Truncated G726 read');this.reads+=length;return b;}
 static async openRaw(file:Blob,configuration:G726RawConfiguration,signal:AbortSignal):Promise<G726Reader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<1||file.size>MAX_FILE)fail('Bounded raw G726 Blob required');
  if(!configuration||!['adpcm-g726','adpcm-g726le'].includes(configuration.codec)||![2,3,4,5].includes(configuration.bitsPerSample)||Object.keys(configuration).some(k=>!['codec','bitsPerSample','sampleCount'].includes(k)))fail('Explicit raw G726 codec and coded width required');
  const n=count(file.size,configuration.bitsPerSample,configuration.sampleCount);if(Math.ceil(file.size/PACKET_BYTES)>100000)fail('G726 packet count budget');return new G726Reader(file,signal,'raw-g726',0,file.size,configuration.bitsPerSample,n,configuration.codec);
 }
 static async openWave(file:Blob,signal:AbortSignal):Promise<G726Reader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<12||file.size>MAX_FILE)fail('Bounded G726 WAV Blob required');const scan=new G726Reader(file,signal,'wave-g726',0,0,4,0,'adpcm-g726'),h=await scan.read(0,12);if(text(h,0,4)!=='RIFF'||text(h,8,4)!=='WAVE'||new DataView(h.buffer).getUint32(4,true)+8!==file.size)fail('G726 RIFF declared extent');let bits:G726Bits|undefined,fact:number|undefined,dataStart=-1,dataBytes=0,chunks=0;
  for(let p=12;p<file.size;){if(++chunks>4096||file.size-p<8)fail('G726 WAV chunk budget');const b=await scan.read(p,8),name=text(b,0,4),length=new DataView(b.buffer).getUint32(4,true),start=p+8,end=start+length,next=end+(length&1);if(next>file.size)fail('G726 WAV chunk bounds');
   if(name==='fmt '){if(bits!==undefined||length!==18)fail('G726 duplicate or unsupported format');const fmt=await scan.read(start,length),v=new DataView(fmt.buffer),width=v.getUint16(14,true),rate=v.getUint32(4,true),avg=v.getUint32(8,true),align=v.getUint16(12,true);if(v.getUint16(0,true)!==0x45||v.getUint16(2,true)!==1||rate!==8000||![2,3,4,5].includes(width)||avg*8!==8000*width||align!==(width===3?3:width===5?5:1)||v.getUint16(16,true)!==0)fail('Unqualified canonical G726 WAV format');bits=width as G726Bits;}
   else if(name==='fact'){if(fact!==undefined||length!==4)fail('G726 duplicate or invalid fact');fact=new DataView((await scan.read(start,4)).buffer).getUint32(0,true);}
   else if(name==='data'){if(dataStart>=0)fail('G726 duplicate audio data');dataStart=start;dataBytes=length;}
   else if(name==='LIST'){if(length<4||text(await scan.read(start,4),0,4)!=='INFO')fail('G726 timeline-affecting LIST');}
   else if(!['JUNK','PAD '].includes(name))fail('Unsupported G726 WAV chunk: '+name);
   if(length&1&&(await scan.read(end,1))[0]!==0)fail('G726 nonzero chunk padding');p=next;
  }
  if(bits===undefined||fact===undefined||dataStart<0)fail('G726 format, fact and data required');const n=count(dataBytes,bits,fact);if(Math.ceil(dataBytes/PACKET_BYTES)>100000)fail('G726 packet count budget');const ready=new G726Reader(file,signal,'wave-g726',dataStart,dataBytes,bits,n,'adpcm-g726');ready.reads=scan.reads;return ready;
 }
 async *packets(startSample=0):AsyncGenerator<G726Packet>{
  this.signal.throwIfAborted();if(!Number.isSafeInteger(startSample)||startSample<0||startSample>this.sampleCount)fail('G726 seek bounds');if(startSample===this.sampleCount)return;
  // Every non-EOF seek restores predictor history from the original stream origin.
  for(let offset=0;offset<this.dataBytes;offset+=PACKET_BYTES){const data=await this.read(this.dataStart+offset,Math.min(PACKET_BYTES,this.dataBytes-offset)),start=offset*8/this.bitsPerSample,decoded=data.length*8/this.bitsPerSample,duration=Math.min(decoded,this.sampleCount-start);yield{data,startSample:start,durationSamples:duration,decodedDurationSamples:decoded,discardPaddingSamples:decoded-duration};}
 }
}
