// SPDX-License-Identifier: Apache-2.0
/** Bounded canonical TAK integer reader. Frame CRCs own the packet index. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
const MAX_PACKET=1048576,MAX_FILE=64*1048576;
function fail(message:string):never{throw new ContainerProfileError(message);}
const le24=(b:Uint8Array,p=0)=>b[p]|b[p+1]<<8|b[p+2]<<16;
const table=Uint32Array.from({length:256},(_,i)=>{let crc=i<<16;for(let bit=0;bit<8;bit++)crc=((crc<<1)^((crc&0x800000)?0x864cfb:0))&0xffffff;return crc;});
export function takCRC24(bytes:Uint8Array):number{let crc=0xb704ce;for(const byte of bytes)crc=((crc<<8)^table[(crc>>>16)^byte])&0xffffff;return crc;}
function checksum(bytes:Uint8Array):boolean{return bytes.length>=4&&takCRC24(bytes.subarray(0,-3))===le24(bytes,bytes.length-3);}
class Bits{position=0;constructor(readonly bytes:Uint8Array){}get(count:number):number{if(this.position+count>this.bytes.length*8)throw Error('Short TAK bits');let value=0;for(let bit=0;bit<count;bit++){const offset=this.position++;value+=((this.bytes[offset>>>3]>>>(offset&7))&1)*2**bit;}return value;}}
function streamInfo(bytes:Uint8Array):number{
 if(bytes.length!==10)fail('TAK streaminfo size');const bits=new Bits(bytes);
 if(bits.get(6)!==2||bits.get(4)!==2||bits.get(4)!==1)fail('Unqualified TAK codec/profile/frame mode');const samples=bits.get(35);
 if(!samples||bits.get(3)!==0||bits.get(18)+6000!==44100||bits.get(5)+8!==16||bits.get(4)+1!==1||bits.get(1)!==0)fail('Unqualified TAK precision/rate/layout');return samples;
}
type Header=Readonly<{number:number;length:number;samples:number;key:boolean;last:boolean}>;
function frameHeader(bytes:Uint8Array,extra:Uint8Array):Header|undefined{
 try{const bits=new Bits(bytes);if(bits.get(16)!==0xa0ff)return;const flags=bits.get(3),number=bits.get(21);if(flags&4)return;const last=Boolean(flags&1),key=Boolean(flags&2);let samples=5512;
  if(last){samples=bits.get(14)+1;if(bits.get(2)!==0||samples>5512)return;}
  if(key){const start=bits.position>>>3;for(let i=0;i<10;i++)if(bits.get(8)!==extra[i])return;if(bits.get(6)!==0)return;bits.position=Math.ceil(bits.position/8)*8;if(start+10>bytes.length)return;}
  const length=bits.position/8+3;if(!Number.isInteger(length)||length>bytes.length||!checksum(bytes.subarray(0,length)))return;return{number,length,samples,key,last};
 }catch{return;}
}
type Entry=Readonly<{offset:number;length:number;startSample:number;durationSamples:number;key:boolean}>;
export type TakPacket=Readonly<{data:Uint8Array;startSample:number;durationSamples:number}>;
export class TakReader{
 readonly tracks:readonly MatroskaTrack[];private reads=0;
 private constructor(private readonly file:Blob,private readonly signal:AbortSignal,private readonly entries:readonly Entry[],readonly sampleCount:number,extra:Uint8Array){this.tracks=Object.freeze([Object.freeze({number:1,kind:'audio' as const,codec:'tak',rate:44100,channels:1,bitDepth:16,privateData:extra})]);}
 get bytesRead():number{return this.reads;}
 private async read(offset:number,length:number):Promise<Uint8Array>{this.signal.throwIfAborted();if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(length)||offset<0||length<0||length>MAX_PACKET||offset+length>this.file.size)fail('TAK read bounds');const bytes=new Uint8Array(await this.file.slice(offset,offset+length).arrayBuffer());this.signal.throwIfAborted();if(bytes.length!==length)fail('Short TAK read');this.reads+=length;return bytes;}
 static async open(file:Blob,signal:AbortSignal):Promise<TakReader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<32||file.size>MAX_FILE)fail('Bounded local TAK Blob required');const scan=new TakReader(file,signal,[],0,new Uint8Array());if(String.fromCharCode(...await scan.read(0,4))!=='tBaK')fail('TAK signature');
  let position=4,extra:Uint8Array|undefined,samples=0,lastOffset:number|undefined,lastSize=0,ended=false;const types=new Set<number>();
  for(let count=0;count<32;count++){
   const header=await scan.read(position,4),type=header[0]&127,size=le24(header,1);position+=4;if(header[0]&128||size>65536||position+size>file.size||position+size>65536)fail('TAK metadata bounds');
   if(type===0){if(size)fail('TAK end metadata size');ended=true;break;}if(types.has(type))fail('Duplicate TAK metadata');types.add(type);const data=await scan.read(position,size);position+=size;
   if([1,4,6,7].includes(type)&&!checksum(data))fail('TAK metadata checksum');
   if(type===1){extra=data.slice(0,-3);samples=streamInfo(extra);}
   else if(type===7){if(size!==11)fail('TAK last-frame metadata size');const bits=new Bits(data);lastOffset=bits.get(40);lastSize=bits.get(24);if(!lastSize||lastSize>MAX_PACKET)fail('TAK last-frame bounds');}
   else if(type===6){if(size!==19)fail('TAK MD5 metadata size');}
   else if(type===4){if(size!==7)fail('TAK encoder metadata size');}
   else if(type!==3&&type!==5)fail('Unqualified TAK metadata type');
  }
  if(!ended||!extra||!samples||lastOffset===undefined||position+lastOffset+lastSize!==file.size)fail('TAK exact data extent');
  const dataStart=position,lastStart=dataStart+lastOffset,dataEnd=file.size,entries:Entry[]=[];let current=dataStart,total=0,number=0;
  let cache:Uint8Array=new Uint8Array();let cacheStart=-1;
  const look=async(offset:number):Promise<Uint8Array>=>{if(offset<cacheStart||offset+Math.min(32,dataEnd-offset)>cacheStart+cache.length){cacheStart=offset;cache=await scan.read(offset,Math.min(65568,dataEnd-offset));}return cache.subarray(offset-cacheStart,offset-cacheStart+32);};
  let currentHeader=frameHeader(await look(current),extra);if(!currentHeader?.key||currentHeader.number!==0)fail('TAK initial key header');
  while(entries.length<100000){
   signal.throwIfAborted();let next:number|undefined,nextHeader:Header|undefined;
   if(currentHeader.last){if(current!==lastStart||dataEnd-current!==lastSize)fail('TAK last-frame index mismatch');next=dataEnd;}
   else for(let candidate=current+currentHeader.length+4;candidate<Math.min(dataEnd,current+MAX_PACKET+1);candidate++){
    const bytes=await look(candidate);if(bytes[0]!==255||bytes[1]!==160)continue;const header=frameHeader(bytes,extra);if(!header||header.number!==number+1)continue;
    const body=await scan.read(current+currentHeader.length,candidate-current-currentHeader.length);if(!checksum(body))continue;next=candidate;nextHeader=header;break;
   }
   if(next===undefined||next-current>MAX_PACKET||next<=current+currentHeader.length+3)fail('TAK frame index or byte budget');
   if(currentHeader.last&&!checksum(await scan.read(current+currentHeader.length,next-current-currentHeader.length)))fail('TAK frame body checksum');
   entries.push(Object.freeze({offset:current,length:next-current,startSample:total,durationSamples:currentHeader.samples,key:currentHeader.key}));total+=currentHeader.samples;if(total>samples)fail('TAK frame sample extent');
   if(currentHeader.last){if(total!==samples)fail('TAK final sample extent');break;}current=next;currentHeader=nextHeader!;number++;
  }
  if(!entries.length||total!==samples||!currentHeader.last)fail('TAK frame count budget');const ready=new TakReader(file,signal,Object.freeze(entries),samples,extra);ready.reads=scan.reads;return ready;
 }
 async *packets(startSample=0,prerollSamples=0):AsyncGenerator<TakPacket>{
  if(!Number.isSafeInteger(startSample)||!Number.isSafeInteger(prerollSamples)||startSample<0||startSample>=this.sampleCount||prerollSamples<0)fail('Invalid TAK seek range');const target=Math.max(0,startSample-prerollSamples);let start=0;for(let i=0;i<this.entries.length&&this.entries[i].startSample<=target;i++)if(this.entries[i].key)start=i;
  for(let i=start;i<this.entries.length;i++){const entry=this.entries[i];yield{data:await this.read(entry.offset,entry.length),startSample:entry.startSample,durationSamples:entry.durationSamples};}
 }
}
