// SPDX-License-Identifier: Apache-2.0
/** Finite G.711 WAV / GSM-MS WAV / raw GSM reader, preserving original sample extent. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
export type TelephonyCodec='pcm-alaw'|'pcm-mulaw'|'gsm'|'gsm-ms';
export type TelephonyTrack=MatroskaTrack&Readonly<{codec:TelephonyCodec;blockAlign:number;samplesPerBlock:number;bitRate:number;decodedBitDepth:16}>;
export type TelephonyPacket=Readonly<{data:Uint8Array;startSample:number;durationSamples:number;decodedDurationSamples:number;discardPaddingSamples:number}>;
type Format=Readonly<{codec:TelephonyCodec;channels:number;rate:number;align:number;samples:number;bitRate:number;extra:Uint8Array;bits:number;packetBytes:number}>;
const MAX_FILE=64*1048576,MAX_READ=65536;
function fail(message:string):never{throw new ContainerProfileError(message);}
const text=(bytes:Uint8Array,offset:number,length:number)=>String.fromCharCode(...bytes.subarray(offset,offset+length));
function format(bytes:Uint8Array):Format{
 if(bytes.length<16)fail('Telephony format bounds');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.length),tag=v.getUint16(0,true),channels=v.getUint16(2,true),rate=v.getUint32(4,true),average=v.getUint32(8,true),align=v.getUint16(12,true),bits=v.getUint16(14,true);
 if(tag===6||tag===7){if(![16,18].includes(bytes.length)||(bytes.length===18&&v.getUint16(16,true)!==0)||![1,2].includes(channels)||![8000,16000].includes(rate)||align!==channels||average!==rate*channels||bits!==8)fail('Unqualified G711 format');return{codec:tag===6?'pcm-alaw':'pcm-mulaw',channels,rate,align,samples:512,bitRate:average*8,extra:new Uint8Array(),bits,packetBytes:512*channels};}
 if(tag!==49||bytes.length!==20||v.getUint16(16,true)!==2||v.getUint16(18,true)!==320||rate!==8000||channels!==1||align!==65||average!==1625||bits!==0)fail('Unqualified GSM-MS format');return{codec:'gsm-ms',channels,rate,align,samples:320,bitRate:13000,extra:bytes.slice(18),bits,packetBytes:65};
}
export class TelephonyReader{
 readonly tracks:readonly TelephonyTrack[];private reads=0;
 private constructor(private readonly file:Blob,private readonly signal:AbortSignal,private readonly f:Format,private readonly dataStart:number,private readonly dataBytes:number,readonly sampleCount:number,readonly container:'wave'|'gsm'){
  this.tracks=Object.freeze([Object.freeze({number:1,kind:'audio' as const,codec:f.codec,rate:f.rate,channels:f.channels,bitDepth:f.bits,decodedBitDepth:16 as const,privateData:f.extra,blockAlign:f.align,samplesPerBlock:f.samples,bitRate:f.bitRate})]);
 }
 get bytesRead():number{return this.reads;}
 get decodedSampleCount():number{return this.f.codec.startsWith('pcm-')?this.dataBytes/this.f.channels:this.dataBytes/this.f.align*this.f.samples;}
 private async read(offset:number,length:number):Promise<Uint8Array>{this.signal.throwIfAborted();if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<0||length>MAX_READ||offset+length>this.file.size)fail('Telephony read bounds');const bytes=new Uint8Array(await this.file.slice(offset,offset+length).arrayBuffer());this.signal.throwIfAborted();if(bytes.length!==length)fail('Truncated telephony read');this.reads+=length;return bytes;}
 static async open(file:Blob,signal:AbortSignal):Promise<TelephonyReader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<12||file.size>MAX_FILE)fail('Bounded local telephony Blob required');const scan=new TelephonyReader(file,signal,{} as Format,0,0,0,'wave'),head=await scan.read(0,12);
  if(text(head,0,4)!=='RIFF'){
   if(file.size%33||file.size/33>100000)fail('Raw GSM complete frame byte budget');
   for(let offset=0;offset<file.size;offset+=33*1024){const bytes=await scan.read(offset,Math.min(33*1024,file.size-offset));for(let i=0;i<bytes.length;i+=33)if(bytes[i]>>>4!==13)fail('Raw GSM frame magic');}
   const f:Format={codec:'gsm',channels:1,rate:8000,align:33,samples:160,bitRate:13200,extra:new Uint8Array(),bits:0,packetBytes:33},ready=new TelephonyReader(file,signal,f,0,file.size,file.size/33*160,'gsm');ready.reads=scan.reads;return ready;
  }
  if(text(head,8,4)!=='WAVE'||new DataView(head.buffer).getUint32(4,true)+8!==file.size)fail('Telephony RIFF declared extent');let f:Format|undefined,fact:number|undefined,dataStart=-1,dataBytes=0,count=0;
  for(let position=12;position<file.size;){
   if(++count>4096||file.size-position<8)fail('Telephony chunk budget');const h=await scan.read(position,8),id=text(h,0,4),length=new DataView(h.buffer).getUint32(4,true),start=position+8,end=start+length,next=end+(length&1);if(next>file.size)fail('Telephony chunk bounds');
   if(id==='fmt '){if(f||length>20)fail('Telephony duplicate or oversized format');f=format(await scan.read(start,length));}
   else if(id==='fact'){if(fact!==undefined||length!==4)fail('Telephony duplicate or invalid fact');fact=new DataView((await scan.read(start,4)).buffer).getUint32(0,true);}
   else if(id==='data'){if(dataStart!==-1)fail('Telephony duplicate audio data');dataStart=start;dataBytes=length;}
   else if(id==='LIST'){if(length<4||text(await scan.read(start,4),0,4)!=='INFO')fail('Telephony timeline-affecting LIST');}
   else if(!['JUNK','PAD '].includes(id))fail('Unsupported telephony WAV chunk: '+id);
   if(length&1&&(await scan.read(end,1))[0]!==0)fail('Nonzero telephony chunk padding');position=next;
  }
  if(!f||dataStart<0||!dataBytes||dataBytes%f.align)fail('Telephony whole block data required');const total=f.codec==='gsm-ms'?dataBytes/65*320:dataBytes/f.channels;
  if(f.codec==='gsm-ms'?(fact===undefined||!fact||fact<=total-320||fact>total):(fact!==undefined&&fact!==total))fail('Telephony fact sample extent');
  if(Math.ceil(dataBytes/f.packetBytes)>100000)fail('Telephony packet count budget');const ready=new TelephonyReader(file,signal,f,dataStart,dataBytes,fact??total,'wave');ready.reads=scan.reads;return ready;
 }
 async *packets(startSample=0,prerollSamples=0):AsyncGenerator<TelephonyPacket>{
  this.signal.throwIfAborted();if(!Number.isSafeInteger(startSample)||!Number.isSafeInteger(prerollSamples)||startSample<0||startSample>=this.sampleCount||prerollSamples<0)fail('Telephony seek bounds');
  // GSM predictor state requires original stream history. G711 has independent codewords.
  const first=this.f.codec.startsWith('pcm-')?Math.floor(Math.max(0,startSample-prerollSamples)/512):0;
  for(let offset=first*this.f.packetBytes;offset<this.dataBytes;offset+=this.f.packetBytes){const data=await this.read(this.dataStart+offset,Math.min(this.f.packetBytes,this.dataBytes-offset));if(this.f.codec==='gsm'&&data[0]>>>4!==13)fail('Raw GSM frame magic');const sample=this.f.codec.startsWith('pcm-')?offset/this.f.channels:offset/this.f.align*this.f.samples,decoded=this.f.codec.startsWith('pcm-')?data.length/this.f.channels:this.f.samples,duration=Math.min(decoded,this.sampleCount-sample);yield{data,startSample:sample,durationSamples:duration,decodedDurationSamples:decoded,discardPaddingSamples:decoded-duration};}
 }
}
