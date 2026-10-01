// SPDX-License-Identifier: Apache-2.0
/** Bounded Shorten v2 signed16 RIFF reader. Chunks have no source timestamps. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
function fail(message:string):never{throw new ContainerProfileError(message);}
class Bits {
 private position=40;
 constructor(private readonly bytes:Uint8Array){}
 get(count:number):number{if(!Number.isInteger(count)||count<0||count>24||this.position+count>this.bytes.length*8)fail('Shorten header bit bounds');let value=0;while(count--){const at=this.position++;value=value*2+((this.bytes[at>>>3]>>>(7-(at&7)))&1);}return value;}
 rice(k:number):number{if(k>24)fail('Shorten Rice parameter');let q=0;while(!this.get(1))if(++q>4096)fail('Shorten Rice quotient');const value=q*2**k+this.get(k);if(!Number.isSafeInteger(value)||value>0xffffffff)fail('Shorten Rice value');return value;}
 uint():number{return this.rice(this.rice(2));}
}
export class ShortenReader {
 readonly tracks:readonly MatroskaTrack[]=Object.freeze([Object.freeze({number:1,kind:'audio' as const,codec:'shorten',rate:44100,channels:2,bitDepth:16,privateData:new Uint8Array()})]);
 private reads=0;
 private constructor(private readonly file:Blob,private readonly signal:AbortSignal,readonly sampleCount:number){}
 get bytesRead():number{return this.reads;}
 private async read(offset:number,length:number):Promise<Uint8Array>{this.signal.throwIfAborted();const data=new Uint8Array(await this.file.slice(offset,offset+length).arrayBuffer());this.signal.throwIfAborted();if(data.length!==length)fail('Short Shorten read');this.reads+=length;return data;}
 static async open(file:Blob,signal:AbortSignal):Promise<ShortenReader>{
  signal.throwIfAborted();if(!(file instanceof Blob)||file.size<64||file.size>64*1048576)fail('Bounded local Shorten Blob required');const scan=new ShortenReader(file,signal,0),header=await scan.read(0,Math.min(1024,file.size));
  if(String.fromCharCode(...header.subarray(0,4))!=='ajkg'||header[4]!==2)fail('Unqualified Shorten signature/version');const bits=new Bits(header);
  if(bits.uint()!==5||bits.uint()!==2||bits.uint()!==256||bits.uint()!==0||bits.uint()!==4||bits.uint()!==0||bits.rice(2)!==9||bits.rice(5)!==44)fail('Unqualified Shorten coded profile');
  const wave=new Uint8Array(44);for(let i=0;i<44;i++){const value=bits.rice(8);if(value>255)fail('Shorten verbatim byte');wave[i]=value;}const v=new DataView(wave.buffer),text=(offset:number,length:number)=>String.fromCharCode(...wave.subarray(offset,offset+length)),bytes=v.getUint32(40,true);
  if(text(0,4)!=='RIFF'||text(8,8)!=='WAVEfmt '||v.getUint32(16,true)!==16||v.getUint16(20,true)!==1||v.getUint16(22,true)!==2||v.getUint32(24,true)!==44100||v.getUint32(28,true)!==176400||v.getUint16(32,true)!==4||v.getUint16(34,true)!==16||text(36,4)!=='data'||!bytes||bytes%4||v.getUint32(4,true)!==bytes+36)fail('Unqualified Shorten embedded RIFF metadata');
  const ready=new ShortenReader(file,signal,bytes/4);ready.reads=scan.reads;return ready;
 }
 /** Always restarts at byte zero. Seeking requires decoding and discarding PCM. */
 async *chunks():AsyncGenerator<Uint8Array>{for(let offset=0;offset<this.file.size;offset+=1024)yield await this.read(offset,Math.min(1024,this.file.size-offset));}
}
