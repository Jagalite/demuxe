// SPDX-License-Identifier: Apache-2.0
/** Single-stream Ogg audio framing. Granules are codec sample positions; packet
 * clocks are supplied only when the packet format determines them exactly. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
function fail(message:string):never{throw new ContainerProfileError(message);}
const magic=(b:Uint8Array,p:number,n:number)=>String.fromCharCode(...b.subarray(p,p+n));
const view=(b:Uint8Array)=>new DataView(b.buffer,b.byteOffset,b.byteLength);
const crcTable=Uint32Array.from({length:256},(_,n)=>{let value=n<<24;for(let bit=0;bit<8;bit++)value=(value<<1)^((value&0x80000000)?0x04c11db7:0);return value>>>0;});
export function oggCRC(bytes:Uint8Array):number{let crc=0;for(let i=0;i<bytes.length;i++)crc=((crc<<8)^crcTable[((crc>>>24)^((i>=22&&i<26)?0:bytes[i]))&255])>>>0;return crc;}
type RawPacket={data:Uint8Array;granuleEndSamples?:number;endOfStream:boolean;pageSequence:number;bos:boolean};
export type OggAudioPacket=Readonly<{data:Uint8Array;granuleEndSamples?:number;endOfStream:boolean;pageSequence:number;startSample?:number;durationSamples?:number}>;
type Header={codec:'opus'|'vorbis'|'flac'|'speex';rate:number;channels:number;bits:number;preSkip:number;count:number;streamInfo?:Uint8Array;declaredSamples?:number;maximumBlockSamples?:number;frameSamples?:number;firstSample?:number};
function opusSamples(packet:Uint8Array):number{
 if(!packet.length)fail('Empty Opus packet');const config=packet[0]>>3,code=packet[0]&3;
 const frame=config>=16?120<<(config&3):config>=12?480<<(config&1):(config&3)===3?2880:480<<(config&3);
 const count=code===0?1:code===3?(packet.length>1?packet[1]&63:0):2,total=frame*count;
 if(!count||total>5760)fail('Invalid Opus frame count or duration');return total;
}
function comments(bytes:Uint8Array,start:number,framing:boolean,padding:boolean):void{
 const v=view(bytes);let p=start;const take=()=>{if(p+4>bytes.length)fail('Truncated Ogg comments');const n=v.getUint32(p,true);p+=4;return n;};
 const vendor=take();if(p+vendor>bytes.length)fail('Ogg comment vendor bounds');p+=vendor;const count=take();if(count>4096)fail('Ogg comment count budget');
 for(let i=0;i<count;i++){const length=take();if(p+length>bytes.length)fail('Ogg comment bounds');p+=length;}
 if(framing){if(p+1!==bytes.length||bytes[p]!==1)fail('Missing Vorbis comment framing');}else if(!padding&&p!==bytes.length)fail('Unexpected FLAC comment padding');
}
function header(first:Uint8Array):Header{
 const v=view(first);
 if(magic(first,0,8)==='Speex   '){
  if(first.length!==80)fail('Unsupported Ogg Speex identification');
  const rate=v.getUint32(36,true),mode=rate===8000?0:rate===32000?2:-1,frame=rate===8000?160:640;
  if(mode<0||v.getUint32(28,true)!==1||v.getUint32(32,true)!==80||v.getUint32(40,true)!==mode||v.getUint32(44,true)!==4||v.getUint32(48,true)!==1||v.getInt32(52,true)!==-1||v.getUint32(56,true)!==frame||v.getUint32(60,true)!==0||v.getUint32(64,true)!==1||v.getUint32(68,true)!==0||v.getUint32(72,true)!==0||v.getUint32(76,true)!==0)fail('Unsupported Ogg Speex identification');
  return {codec:'speex',rate,channels:1,bits:0,preSkip:0,count:2,frameSamples:frame};
 }
 if(magic(first,0,8)==='OpusHead'){
  if(first.length!==19||first[8]!==1||![1,2].includes(first[9])||v.getInt16(16,true)!==0||first[18]!==0)fail('Unsupported Ogg Opus version, mapping, gain or channels');
  const preSkip=v.getUint16(10,true);if(preSkip>3840)fail('Ogg Opus pre-skip budget');return {codec:'opus',rate:48000,channels:first[9],bits:0,preSkip,count:2};
 }
 if(first[0]===1&&magic(first,1,6)==='vorbis'){
  if(first.length!==30||v.getUint32(7,true)!==0||![1,2].includes(first[11])||![44100,48000].includes(v.getUint32(12,true))||first[29]!==1)fail('Unsupported Ogg Vorbis identification');
  const small=first[28]&15,large=first[28]>>4;if(small<6||large>13||small>large)fail('Invalid Vorbis block sizes');return {codec:'vorbis',rate:v.getUint32(12,true),channels:first[11],bits:0,preSkip:0,count:3,maximumBlockSamples:(1<<large)/2};
 }
 if(first[0]===127&&magic(first,1,4)==='FLAC'){
  if(first.length!==51||first[5]!==1||first[6]!==0||magic(first,9,4)!=='fLaC'||first[13]!==0||first[14]!==0||first[15]!==0||first[16]!==34)fail('Unsupported Ogg FLAC mapping');
  const count=v.getUint16(7)+1;if(count<2||count>17)fail('Unknown or excessive Ogg FLAC header count');const info=first.slice(17),iv=view(info);
  const rate=info[10]*4096+info[11]*16+(info[12]>>4),channels=((info[12]>>1)&7)+1,bits=((info[12]&1)<<4)+(info[13]>>4)+1,declaredSamples=(info[13]&15)*4294967296+iv.getUint32(14);
  if(![44100,48000,96000].includes(rate)||![1,2].includes(channels)||![16,24,32].includes(bits)||iv.getUint16(0)<16||iv.getUint16(2)<iv.getUint16(0))fail('Unsupported Ogg FLAC stream parameters');
  return {codec:'flac',rate,channels,bits,preSkip:0,count,streamInfo:info,declaredSamples};
 }
 return fail('Unqualified Ogg codec');
}
function flacSamples(packet:Uint8Array):number{
 if(packet.length<8||packet[0]!==255||(packet[1]&254)!==248||(packet[3]&1))fail('Invalid Ogg FLAC frame header');
 const block=packet[2]>>4;if(!block)fail('Reserved FLAC block size');let p=4,first=packet[p++],extra=0;
 if(first>=128){let mask=128;while(first&mask){extra++;mask>>=1;}if(extra<2||extra>7)fail('Invalid FLAC frame number');for(let i=1;i<extra;i++){if(p>=packet.length||(packet[p++]&192)!==128)fail('Truncated FLAC frame number');}}
 if(block===6){if(p>=packet.length)fail('Truncated FLAC block size');return packet[p]+1;}
 if(block===7){if(p+2>packet.length)fail('Truncated FLAC block size');return packet[p]*256+packet[p+1]+1;}
 return block===1?192:block<=5?576<<(block-2):256<<(block-8);
}
function vorbisExtra(headers:readonly Uint8Array[]):Uint8Array{
 const laces:number[]=[2];for(const bytes of headers.slice(0,2)){let length=bytes.length;while(length>=255){laces.push(255);length-=255;}laces.push(length);}
 const size=laces.length+headers.reduce((n,b)=>n+b.length,0);if(size>65536)fail('Vorbis codec header budget');const result=new Uint8Array(size);result.set(laces);let p=laces.length;for(const bytes of headers){result.set(bytes,p);p+=bytes.length;}return result;
}
export class OggAudioReader {
 private reads=0;
 readonly tracks:readonly MatroskaTrack[];
 readonly sampleCount:number;
 private constructor(private readonly file:Blob,private readonly signal:AbortSignal,private readonly headers:Header,
  readonly granuleEndSamples:number,readonly packetCount:number,extra:Uint8Array){
  this.sampleCount=granuleEndSamples-(headers.codec==='speex'?headers.firstSample!:headers.preSkip);
  this.tracks=Object.freeze([Object.freeze({number:1,kind:'audio' as const,codec:headers.codec,rate:headers.rate,channels:headers.channels,bitDepth:headers.bits,privateData:extra})]);
 }
 get preSkip():number{return this.headers.preSkip;}
 /** Speex retains the signed initial packet position inferred from its first
  * completed audio page. This is not a decoder timestamp normalization. */
 get firstSample():number{return this.headers.firstSample??-this.preSkip;}
 get bytesRead():number{return this.reads;}
 private async read(start:number,length:number):Promise<Uint8Array>{
  this.signal.throwIfAborted();if(start<0||length<0||length>65536||start+length>this.file.size)fail('Ogg page read bounds');const bytes=new Uint8Array(await this.file.slice(start,start+length).arrayBuffer());this.signal.throwIfAborted();if(bytes.length!==length)fail('Short Ogg page read');this.reads+=length;return bytes;
 }
 private async *raw():AsyncGenerator<RawPacket>{
  let offset=0,serial:number|undefined,sequence=0,ended=false,totalPackets=0,parts:Uint8Array[]=[],length=0,lastGranule=0;
  for(let pages=0;offset<this.file.size;pages++){
   if(pages>=100000||ended||this.file.size-offset<27)fail('Ogg page budget, chaining or truncated header');const h=await this.read(offset,27),v=view(h),flags=h[5],n=h[26];
   if(magic(h,0,4)!=='OggS'||h[4]!==0||(flags&248)||!n)fail('Invalid Ogg page header');
   if(v.getUint32(18,true)!==sequence||((flags&2)!==0)!==(sequence===0)||Boolean(flags&1)!==Boolean(parts.length))fail('Ogg sequence, BOS or continuation mismatch');
   if(serial===undefined)serial=v.getUint32(14,true);else if(serial!==v.getUint32(14,true))fail('Multiplexed Ogg streams require another provider');
   const laces=await this.read(offset+27,n),size=laces.reduce((n,b)=>n+b,0),data=await this.read(offset+27+n,size),page=new Uint8Array(27+n+size);page.set(h);page.set(laces,27);page.set(data,27+n);if(oggCRC(page)!==v.getUint32(22,true))fail('Ogg page checksum mismatch');
   const g=v.getBigUint64(6,true),granule=g===0xffffffffffffffffn?undefined:Number(g);if(granule!==undefined&&(!Number.isSafeInteger(granule)||granule<lastGranule))fail('Ogg granule overflow or reversal');
   const complete:Uint8Array[]=[];let p=0;
   for(const lace of laces){if(lace){parts.push(data.slice(p,p+lace));length+=lace;p+=lace;}if(length>1048576)fail('Ogg packet assembly budget');if(lace<255){if(!length)fail('Empty Ogg codec packet');const packet=new Uint8Array(length);let at=0;for(const piece of parts){packet.set(piece,at);at+=piece.length;}complete.push(packet);parts=[];length=0;if(++totalPackets>1000000)fail('Ogg packet count budget');}}
   if((complete.length===0)!==(granule===undefined))fail('Ogg page granule does not identify a completed packet');
   if(sequence===0&&(complete.length!==1||parts.length||granule!==0))fail('Ogg identification must occupy one BOS page');
   if(flags&4){if(parts.length||granule===undefined||!complete.length)fail('Incomplete Ogg end of stream');ended=true;}
   for(let i=0;i<complete.length;i++){this.signal.throwIfAborted();yield {data:complete[i],pageSequence:sequence,bos:sequence===0,granuleEndSamples:i===complete.length-1?granule:undefined,endOfStream:ended&&i===complete.length-1};}
   if(granule!==undefined)lastGranule=granule;offset+=page.length;sequence++;
  }
  if(!ended||parts.length)fail('Missing or incomplete Ogg end of stream');
 }
 static async open(file:Blob,signal:AbortSignal):Promise<OggAudioReader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<27)fail('Local Ogg Blob required');const scan=new OggAudioReader(file,signal,{codec:'opus',rate:48000,channels:2,bits:0,preSkip:0,count:2},0,0,new Uint8Array());
  let info:Header|undefined,packets=0,granuleEnd=0,codedSamples=0,lastDuration=0;const headers:Uint8Array[]=[];
  for await(const packet of scan.raw()){
   if(!info){info=header(packet.data);headers.push(packet.data);if(packet.endOfStream)fail('Ogg stream has no audio');continue;}
   if(headers.length<info.count){
    const index=headers.length,bytes=packet.data;if(info.codec==='vorbis'&&headers.reduce((n,b)=>n+b.length,bytes.length+8)>65536)fail('Vorbis codec header budget');
    if(info.codec==='speex')comments(bytes,0,false,false);
    else if(info.codec==='opus'){if(magic(bytes,0,8)!=='OpusTags')fail('Missing Ogg Opus comments');comments(bytes,8,false,true);}
    else if(info.codec==='vorbis'){if(bytes[0]!==[1,3,5][index]||magic(bytes,1,6)!=='vorbis')fail('Missing or reordered Vorbis header');if(index===1)comments(bytes,7,true,false);if(index===2&&bytes.length<8)fail('Truncated Vorbis setup');}
    else{const last=index===info.count-1;if(bytes.length<4||((bytes[0]&128)!==0)!==last||(bytes[0]&127)!==(index===1?4:1)||bytes.length!==4+bytes[1]*65536+bytes[2]*256+bytes[3])fail('Unsupported Ogg FLAC metadata');if(index===1)comments(bytes,4,false,false);}
    headers.push(bytes);if(packet.endOfStream||packet.granuleEndSamples!==undefined&&packet.granuleEndSamples!==0)fail('Ogg header granule or premature EOS');if(headers.length===info.count&&packet.granuleEndSamples!==0)fail('Ogg headers and audio share a page');continue;
   }
   if(info.codec==='speex'&&packet.data.length>2048)fail('Ogg Speex packet budget');
   if(info.codec==='vorbis'&&(packet.data[0]&1))fail('Unexpected Vorbis header in audio');const duration=info.codec==='opus'?opusSamples(packet.data):info.codec==='flac'?flacSamples(packet.data):info.codec==='speex'?info.frameSamples!:0;if(info.codec==='flac'&&duration>view(info.streamInfo!).getUint16(2))fail('FLAC block exceeds STREAMINFO');codedSamples+=duration;lastDuration=duration;packets++;
   if(packet.granuleEndSamples!==undefined){const g=packet.granuleEndSamples;
    if(info.codec==='speex'&&info.firstSample===undefined){if(packet.endOfStream)fail('Ogg Speex requires a separate initial audio page');const first=g-codedSamples;if(first>0||first<=-duration)fail('Ogg Speex initial granule bounds');info.firstSample=first;}
    const expected=codedSamples+(info.firstSample??0);if(info.codec==='vorbis'&&g>(packets-1)*info.maximumBlockSamples!)fail('Vorbis granule exceeds possible decoded sample extent');if(info.codec!=='vorbis'&&((!packet.endOfStream&&g!==expected)||(packet.endOfStream&&(g>expected||(info.codec==='speex'?g<=expected-lastDuration:g<expected-lastDuration)))))fail('Ogg granule differs from coded sample clock');granuleEnd=g;}
  }
  if(!info||headers.length!==info.count||!packets||granuleEnd<=info.preSkip)fail('Missing Ogg codec headers or audio samples');if(info.codec==='flac'&&info.declaredSamples&&info.declaredSamples!==granuleEnd)fail('Ogg FLAC total samples disagree');
  const extra=info.codec==='vorbis'?vorbisExtra(headers):info.codec==='flac'?info.streamInfo!:headers[0];const ready=new OggAudioReader(file,signal,info,granuleEnd,packets,extra);ready.reads=scan.reads;return ready;
 }
 async *packets():AsyncGenerator<OggAudioPacket>{
  let index=0,samples=0;
  for await(const packet of this.raw()){
   if(index++<this.headers.count)continue;const duration=this.headers.codec==='opus'?opusSamples(packet.data):this.headers.codec==='flac'?flacSamples(packet.data):this.headers.codec==='speex'?this.headers.frameSamples:undefined;
   yield {data:packet.data,granuleEndSamples:packet.granuleEndSamples,endOfStream:packet.endOfStream,pageSequence:packet.pageSequence,...(duration===undefined?{}:{startSample:samples+(this.headers.codec==='speex'?this.firstSample:-this.preSkip),durationSamples:duration})};samples+=duration??0;
  }
 }
}
