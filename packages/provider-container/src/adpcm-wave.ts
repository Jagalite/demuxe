// SPDX-License-Identifier: Apache-2.0
/** Finite read-only Microsoft/IMA WAV ADPCM. Fact presentation extent is explicit. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
export type AdpcmWaveCodec='adpcm-ms'|'adpcm-ima-wav';
export type AdpcmWaveTrack=MatroskaTrack&Readonly<{codec:AdpcmWaveCodec;blockAlign:number;samplesPerBlock:number;bitRate:number;decodedBitDepth:16}>;
export type AdpcmWavePacket=Readonly<{data:Uint8Array;startSample:number;durationSamples:number;decodedDurationSamples:number;discardPaddingSamples:number}>;
const MAX_FILE=64*1048576,MAX_BLOCK=65536,RATES=new Set([8000,16000,22050,32000,44100,48000]);
const COEFFICIENTS=[256,0,512,-256,0,0,192,64,240,0,460,-208,392,-232];
function fail(message:string):never{throw new ContainerProfileError(message);}
const text=(bytes:Uint8Array,offset:number,length:number)=>String.fromCharCode(...bytes.subarray(offset,offset+length));
type Format=Readonly<{codec:AdpcmWaveCodec;channels:number;rate:number;align:number;samples:number;bitRate:number;extra:Uint8Array}>;
function format(bytes:Uint8Array):Format{
 if(bytes.length<20)fail('ADPCM format bounds');const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.length),tag=v.getUint16(0,true),channels=v.getUint16(2,true),rate=v.getUint32(4,true),average=v.getUint32(8,true),align=v.getUint16(12,true),bits=v.getUint16(14,true),size=v.getUint16(16,true),samples=v.getUint16(18,true);
 if(![2,17].includes(tag)||![1,2].includes(channels)||!RATES.has(rate)||bits!==4||size!==bytes.length-18||align<8*channels||align>MAX_BLOCK||!average||average>1250000||!samples)fail('Unqualified ADPCM format');
 const codec=tag===2?'adpcm-ms':'adpcm-ima-wav';
 if(tag===2){
  if(bytes.length!==50||size!==32||v.getUint16(20,true)!==7||samples!==2+(align-7*channels)*2/channels)fail('ADPCM MS block geometry or coefficient count');
  for(let i=0;i<COEFFICIENTS.length;i++)if(v.getInt16(22+i*2,true)!==COEFFICIENTS[i])fail('Unqualified ADPCM MS coefficients');
 }else if(bytes.length!==20||size!==2||(align-4*channels)%(4*channels)!==0||samples!==1+(align-4*channels)*2/channels)fail('ADPCM IMA block geometry');
 return {codec,channels,rate,align,samples,bitRate:average*8,extra:bytes.slice(18)};
}
function blockHeader(bytes:Uint8Array,f:Format):void{
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
 if(f.codec==='adpcm-ms')for(let c=0;c<f.channels;c++){if(bytes[c]>6||v.getInt16(f.channels+2*c,true)<=0)fail('Unqualified ADPCM MS predictor or delta');}
 else for(let c=0;c<f.channels;c++)if(bytes[4*c+2]>88||bytes[4*c+3]!==0)fail('Unqualified ADPCM IMA index or reserved header');
}
export class AdpcmWaveReader{
 readonly tracks:readonly AdpcmWaveTrack[];private reads=0;
 private constructor(private readonly file:Blob,private readonly signal:AbortSignal,private readonly f:Format,private readonly dataStart:number,readonly blockCount:number,readonly sampleCount:number){
  this.tracks=Object.freeze([Object.freeze({number:1,kind:'audio' as const,codec:f.codec,channels:f.channels,rate:f.rate,bitDepth:4,decodedBitDepth:16 as const,privateData:f.extra,blockAlign:f.align,samplesPerBlock:f.samples,bitRate:f.bitRate})]);
 }
 get bytesRead():number{return this.reads;}
 get decodedSampleCount():number{return this.blockCount*this.f.samples;}
 private async read(offset:number,length:number):Promise<Uint8Array>{this.signal.throwIfAborted();if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<0||length>MAX_BLOCK||offset+length>this.file.size)fail('ADPCM read bounds');const data=new Uint8Array(await this.file.slice(offset,offset+length).arrayBuffer());this.signal.throwIfAborted();if(data.length!==length)fail('Truncated ADPCM read');this.reads+=length;return data;}
 static async open(file:Blob,signal:AbortSignal):Promise<AdpcmWaveReader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<12||file.size>MAX_FILE)fail('Bounded local ADPCM WAV Blob required');
  let reads=0;const read=async(offset:number,length:number)=>{signal.throwIfAborted();if(length>MAX_BLOCK||offset+length>file.size)fail('ADPCM metadata bounds');const data=new Uint8Array(await file.slice(offset,offset+length).arrayBuffer());signal.throwIfAborted();if(data.length!==length)fail('Truncated ADPCM metadata');reads+=length;return data;};
  const head=await read(0,12);if(text(head,0,4)!=='RIFF'||text(head,8,4)!=='WAVE'||new DataView(head.buffer).getUint32(4,true)+8!==file.size)fail('ADPCM RIFF declared extent');
  let f:Format|undefined,fact:number|undefined,dataStart=-1,dataBytes=0,count=0;
  for(let position=12;position<file.size;){
   if(++count>4096||file.size-position<8)fail('ADPCM chunk budget');const h=await read(position,8),id=text(h,0,4),length=new DataView(h.buffer).getUint32(4,true),start=position+8,end=start+length,next=end+(length&1);if(next>file.size)fail('ADPCM chunk bounds');
   if(id==='fmt '){if(f||length>50)fail('ADPCM duplicate or oversized format');f=format(await read(start,length));}
   else if(id==='fact'){if(fact!==undefined||length!==4)fail('ADPCM duplicate or invalid fact');fact=new DataView((await read(start,4)).buffer).getUint32(0,true);}
   else if(id==='data'){if(dataStart!==-1)fail('ADPCM duplicate audio data');dataStart=start;dataBytes=length;}
   else if(id==='LIST'){if(length<4||text(await read(start,4),0,4)!=='INFO')fail('ADPCM timeline-affecting LIST');}
   else if(!['JUNK','PAD '].includes(id))fail('Unsupported ADPCM WAV chunk: '+id);
   if(length&1&&((await read(end,1))[0]!==0))fail('Nonzero ADPCM chunk padding');position=next;
  }
  if(!f||fact===undefined||!fact||dataStart<0||!dataBytes||dataBytes%f.align!==0)fail('ADPCM format/fact/whole block data required');const blocks=dataBytes/f.align,total=blocks*f.samples;
  if(blocks>100000||fact<=total-f.samples||fact>total)fail('ADPCM fact may clip only the final complete block');
  // Predictor/index validation owns admission before a future converter allocates codecs.
  const headerBytes=(f.codec==='adpcm-ms'?7:4)*f.channels;
  for(let i=0;i<blocks;i++)blockHeader(await read(dataStart+i*f.align,headerBytes),f);
  const ready=new AdpcmWaveReader(file,signal,f,dataStart,blocks,fact);ready.reads=reads;return ready;
 }
 async *packets(startSample=0,prerollSamples=0):AsyncGenerator<AdpcmWavePacket>{
  this.signal.throwIfAborted();if(!Number.isSafeInteger(startSample)||!Number.isSafeInteger(prerollSamples)||startSample<0||startSample>=this.sampleCount||prerollSamples<0)fail('ADPCM seek sample bounds');
  const start=Math.floor(Math.max(0,startSample-prerollSamples)/this.f.samples);
  for(let i=start;i<this.blockCount;i++){const data=await this.read(this.dataStart+i*this.f.align,this.f.align);blockHeader(data,this.f);const sample=i*this.f.samples,duration=Math.min(this.f.samples,this.sampleCount-sample);yield{data,startSample:sample,durationSamples:duration,decodedDurationSamples:this.f.samples,discardPaddingSamples:this.f.samples-duration};}
 }
}
