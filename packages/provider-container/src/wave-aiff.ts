// SPDX-License-Identifier: Apache-2.0
/** Bounded uncompressed WAV/AIFF packet reader. Descriptive metadata is not
 * retained; timeline-affecting extensions reject this finite implementation. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack,MatroskaPacket} from './matroska.js';
function fail(message:string):never{throw new ContainerProfileError(message);}
const text=(bytes:Uint8Array,start:number,count:number)=>String.fromCharCode(...bytes.subarray(start,start+count));
const rates=new Set([44100,48000,96000]);
const nanos=(sample:number,rate:number)=>Number((BigInt(sample)*1000000000n+BigInt(rate)/2n)/BigInt(rate));
type Format={rate:number;channels:number;bits:number;floating:boolean;frames?:number};
export class WaveAiffReader {
 readonly timecodeScale=1;
 private readCount=0;
 readonly tracks:readonly MatroskaTrack[];
 readonly sampleCount:number;
 private constructor(private readonly file:Blob,private readonly signal:AbortSignal,
   readonly format:'wav'|'aiff',private readonly audioStart:number,private readonly audioBytes:number,
   readonly sampleRate:number,readonly channels:number,readonly bitDepth:number,readonly floating:boolean){
  this.sampleCount=audioBytes/(channels*bitDepth/8);
  this.tracks=Object.freeze([Object.freeze({number:1,kind:'audio' as const,codec:bitDepth===8?(format==='wav'?'pcm-u8':'pcm-s8'):'pcm-'+(floating?'f':'s')+bitDepth+'le',
   privateData:new Uint8Array(),channels,rate:sampleRate,bitDepth})]);
 }
 get bytesRead():number{return this.readCount;}
 get sampleEncoding():'unsigned'|'signed'|'float'{return this.floating?'float':this.bitDepth===8&&this.format==='wav'?'unsigned':'signed';}
 get sourceByteOrder():'byte'|'little'|'big'{return this.bitDepth===8?'byte':this.format==='wav'?'little':'big';}
 private async read(start:number,size:number):Promise<Uint8Array>{
  this.signal.throwIfAborted();
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(size)||start<0||size<0||size>65536||start+size>this.file.size)fail('PCM container read bounds');
  const data=new Uint8Array(await this.file.slice(start,start+size).arrayBuffer());this.signal.throwIfAborted();
  if(data.length!==size)fail('Truncated PCM container read');this.readCount+=size;return data;
 }
 static async open(file:Blob,signal:AbortSignal):Promise<WaveAiffReader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<12)fail('Local PCM Blob required');
  let reads=0;const read=async(start:number,size:number)=>{signal.throwIfAborted();if(size>65536||start+size>file.size)fail('PCM metadata bounds');const bytes=new Uint8Array(await file.slice(start,start+size).arrayBuffer());signal.throwIfAborted();if(bytes.length!==size)fail('Truncated PCM metadata');reads+=size;return bytes;};
  const head=await read(0,12),signature=text(head,0,4),form=text(head,8,4);
  const wav=signature==='RIFF'&&form==='WAVE',aiff=signature==='FORM'&&form==='AIFF';if(!wav&&!aiff)fail('Only RIFF WAVE and uncompressed FORM AIFF are admitted');
  const u32=(bytes:Uint8Array,offset:number)=>new DataView(bytes.buffer,bytes.byteOffset+offset,4).getUint32(0,wav);
  if(u32(head,4)+8!==file.size)fail('PCM declared container size differs from Blob');
  let format:Format|undefined,start=-1,size=0,fact:number|undefined,chunkCount=0;
  for(let position=12;position<file.size;){
   if(++chunkCount>4096||file.size-position<8)fail('PCM chunk budget or truncated header');
   const header=await read(position,8),id=text(header,0,4),length=u32(header,4),data=position+8,end=data+length,next=end+(length&1);
   if(next>file.size)fail('PCM chunk bounds');
   if((wav&&id==='fmt ')||(aiff&&id==='COMM')){
    if(format)fail('Duplicate PCM format chunk');if(length>40||length<(wav?16:18))fail('Unsupported PCM format size');
    const bytes=await read(data,length),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
    if(wav){
     let tag=view.getUint16(0,true);const channels=view.getUint16(2,true),rate=view.getUint32(4,true),bits=view.getUint16(14,true),align=channels*bits/8;
     if(tag===0xfffe){
      if(length!==40||view.getUint16(16,true)!==22||view.getUint16(18,true)!==bits)fail('Unsupported WAVE extensible precision');
      const mask=view.getUint32(20,true);if(mask!==0&&mask!==(channels===1?4:3))fail('Unsupported WAVE channel mask');
      const guid=bytes.subarray(24);tag=view.getUint32(24,true);
      if(Array.from(guid.subarray(4)).join(',')!=='0,0,16,0,128,0,0,170,0,56,155,113')fail('Unsupported WAVE subtype GUID');
     }else if(![16,18].includes(length)||(length===18&&view.getUint16(16,true)!==0))fail('Unsupported WAVE extra format data');
     if(![1,3].includes(tag)||view.getUint16(12,true)!==align||view.getUint32(8,true)!==rate*align)fail('Unsupported or inconsistent WAVE format');
     format={channels,rate,bits,floating:tag===3};
    }else{
     if(length!==18)fail('Unsupported AIFF common chunk');const channels=view.getUint16(0),frames=view.getUint32(2),bits=view.getUint16(6),exponent=view.getUint16(8),mantissa=view.getBigUint64(10);
     // Admit only exactly represented finite rates; approximate IEEE80 values
     // must not silently become the same rounded JavaScript Number.
     const rate=[...rates].find(rate=>{const power=Math.floor(Math.log2(rate));return exponent===16383+power&&mantissa===(BigInt(rate)<<BigInt(63-power));});
     if(rate===undefined)fail('Unsupported or noncanonical AIFF sample rate');format={channels,rate,bits,floating:false,frames};
    }
   }else if((wav&&id==='data')||(aiff&&id==='SSND')){
    if(start!==-1)fail('Duplicate PCM audio chunk');
    if(wav){start=data;size=length;}else{
     if(length<8)fail('Truncated AIFF sound header');const bytes=await read(data,8),offset=u32(bytes,0),block=u32(bytes,4);
     if(block!==0||offset>length-8)fail('Unsupported AIFF sound block or offset');start=data+8+offset;size=length-8-offset;
    }
   }else if(wav&&id==='fact'){
    if(fact!==undefined||length!==4)fail('Unsupported or duplicate WAVE fact');fact=u32(await read(data,4),0);
   }else if(wav&&id==='LIST'){
    if(length<4||text(await read(data,4),0,4)!=='INFO')fail('Timeline-affecting WAVE list');
   }else if(!(wav?['JUNK','PAD ']:['NAME','AUTH','ANNO','(c) ']).includes(id))fail('Unsupported PCM metadata chunk: '+id);
   if(length&1){const padding=await read(end,1);if(padding[0]!==0)fail('Nonzero PCM chunk padding');}position=next;
  }
  if(!format||start===-1)fail('Missing PCM format or audio chunk');const {channels,rate,bits,floating,frames}=format;
  if(![1,2].includes(channels)||!rates.has(rate)||!(floating?[32,64]:[8,16,24,32]).includes(bits))fail('Unsupported PCM rate, channel count or sample width');
  const align=channels*bits/8,count=size/align;if(size===0||!Number.isSafeInteger(count))fail('PCM data is empty or not sample-frame aligned');
  if((frames!==undefined&&frames!==count)||(fact!==undefined&&fact!==count))fail('PCM declared sample count differs from data');
  const result=new WaveAiffReader(file,signal,wav?'wav':'aiff',start,size,rate,channels,bits,floating);result.readCount=reads;return result;
 }
 async *packets(startSample=0):AsyncGenerator<MatroskaPacket>{
  this.signal.throwIfAborted();if(!Number.isSafeInteger(startSample)||startSample<0||startSample>this.sampleCount)fail('PCM seek sample bounds');
  const width=this.bitDepth/8,align=this.channels*width,maxFrames=Math.floor(65536/align);
  for(let sample=startSample;sample<this.sampleCount;){
   const frames=Math.min(maxFrames,this.sampleCount-sample),data=await this.read(this.audioStart+sample*align,frames*align);
   if(this.format==='aiff'&&width>1)for(let p=0;p<data.length;p+=width)for(let left=0;left<width/2;left++){const right=width-1-left,value=data[p+left];data[p+left]=data[p+right];data[p+right]=value;}
   const timestampNs=nanos(sample,this.sampleRate),endNs=nanos(sample+frames,this.sampleRate);
   yield {track:1,timestampNs,durationNs:endNs-timestampNs,key:true,data};sample+=frames;
  }
 }
}
