// SPDX-License-Identifier: Apache-2.0
/** Finite packet-only MPEG-TS reader. It preserves source PTS/DTS and framing;
 * timestamp repair, muxing, seeking and Player admission require separate proof. */
import {ContainerProfileError} from './matroska.js';
export type MpegTsTrack=Readonly<{number:number;kind:'video'|'audio';codec:'h264'|'aac';packetFormat:'annexb'|'adts';timescale:90000;sampleRate?:48000;channels?:1|2;privateData:Uint8Array}>;
export type MpegTsPacket=Readonly<{track:number;pts:number;dts:number;timescale:90000;duration?:number;key:boolean;data:Uint8Array;packetFormat:'annexb'|'adts'}>;
type Pes={parts:Uint8Array[];bytes:number;expected?:number;headerRead?:boolean};
function fail(message:string):never{throw new ContainerProfileError(message);}
const u16=(b:Uint8Array,p:number)=>{if(p+2>b.length)fail('Truncated TS metadata');return b[p]*256+b[p+1];};
function crc(b:Uint8Array):number{let value=0xffffffff;for(const byte of b){value^=byte<<24;for(let i=0;i<8;i++)value=value&0x80000000?(value<<1)^0x04c11db7:value<<1;}return value>>>0;}
function concat(parts:readonly Uint8Array[],length:number):Uint8Array{const result=new Uint8Array(length);let p=0;for(const part of parts){result.set(part,p);p+=part.length;}return result;}
function stamp(b:Uint8Array,p:number,prefix:number):number{
 if(p+5>b.length||(b[p]>>4)!==prefix||!(b[p]&1)||!(b[p+2]&1)||!(b[p+4]&1))fail('Invalid MPEG PES timestamp');
 return (b[p]&14)*536870912+b[p+1]*4194304+(b[p+2]&254)*16384+b[p+3]*128+(b[p+4]>>1);
}
function pesData(bytes:Uint8Array,kind:'audio'|'video'):{data:Uint8Array;pts:number;dts:number}{
 if(bytes.length<14||bytes[0]!==0||bytes[1]!==0||bytes[2]!==1||(kind==='video'?(bytes[3]&240)!==224:(bytes[3]&224)!==192)||(bytes[6]&192)!==128||(bytes[6]&63)!==0)fail('Unqualified PES header');
 const flags=bytes[7],header=9+bytes[8];if(![128,192].includes(flags)||header>bytes.length||bytes[8]!==((flags===192)?10:5))fail('Unsupported PES extension or missing timestamp');
 const pts=stamp(bytes,9,flags===192?3:2),dts=flags===192?stamp(bytes,14,1):pts;
 return {data:bytes.slice(header),pts,dts};
}
function h264Key(bytes:Uint8Array):boolean{
 let aud=0,vcl=0,pictures=0,key=false;
 for(let p=0;p+4<bytes.length;p++){
  let start=-1;if(bytes[p]===0&&bytes[p+1]===0&&bytes[p+2]===1)start=p+3;else if(bytes[p]===0&&bytes[p+1]===0&&bytes[p+2]===0&&bytes[p+3]===1)start=p+4;
  if(start<0)continue;const type=bytes[start]&31;if(bytes[start]&128)fail('Invalid AVC NAL header');
  if(type===9)aud++;if(type===1||type===5){vcl++;pictures+=!!(bytes[start+1]&128)?1:0;key||=type===5;}p=start;
 }
 if(aud!==1||!vcl||pictures!==1)fail('TS video requires one AUD-delimited AVC access unit per PES');return key;
}
function adts(bytes:Uint8Array):{packets:Uint8Array[];channels:1|2;config:Uint8Array}{
 const packets:Uint8Array[]=[];let channels:1|2|undefined;
 for(let p=0;p<bytes.length;){
  if(packets.length>=4096||p+7>bytes.length||bytes[p]!==255||(bytes[p+1]&254)!==240||!(bytes[p+1]&1)||(bytes[p+2]>>6)!==1||((bytes[p+2]>>2)&15)!==3||(bytes[p+6]&3))fail('Unqualified AAC-LC ADTS framing');
  const ch=((bytes[p+2]&1)<<2)|(bytes[p+3]>>6),size=((bytes[p+3]&3)<<11)|(bytes[p+4]<<3)|(bytes[p+5]>>5);
  if(![1,2].includes(ch)||size<7||p+size>bytes.length||channels!==undefined&&channels!==ch)fail('ADTS configuration changed or truncated frame');
  channels=ch as 1|2;packets.push(bytes.slice(p,p+size));p+=size;
 }
 if(!packets.length||!channels)fail('Empty ADTS PES');return {packets,channels,config:new Uint8Array([0x11,0x80|(channels<<3)])};
}
export class MpegTsReader{
 readonly tracks:readonly MpegTsTrack[]=[];
 private reads=0;
 private constructor(private file:Blob,private signal:AbortSignal){}
 get bytesRead():number{return this.reads;}
 static async open(file:Blob,signal:AbortSignal):Promise<MpegTsReader>{
  if(!(file instanceof Blob)||file.size<188*3||file.size%188)fail('Only complete 188-byte MPEG-TS packets admitted');
  const reader=new MpegTsReader(file,signal);let audio=false;
  for await(const packet of reader.scan(true)){if(packet.packetFormat==='adts'){audio=true;break;}}
  if(!audio||reader.tracks.length!==2)fail('Missing TS AVC/AAC metadata');return reader;
 }
 private async *transport(metadataOnly:boolean):AsyncGenerator<Uint8Array>{
  for(let offset=0;offset<this.file.size;offset+=188*348){
   this.signal.throwIfAborted();if(metadataOnly&&offset>=4*1024*1024)fail('TS metadata scan budget');
   const size=Math.min(188*348,this.file.size-offset),bytes=new Uint8Array(await this.file.slice(offset,offset+size).arrayBuffer());this.signal.throwIfAborted();if(bytes.length!==size)fail('Short TS read');this.reads+=size;
   for(let p=0;p<bytes.length;p+=188){this.signal.throwIfAborted();yield bytes.subarray(p,p+188);}
  }
 }
 private async *scan(metadataOnly=false):AsyncGenerator<MpegTsPacket>{
  let program:number|undefined,pmtPid:number|undefined,patSignature:string|undefined,pmtSignature:string|undefined;
  const streams=new Map<number,MpegTsTrack>(),continuity=new Map<number,number>(),sections=new Map<number,Uint8Array>(),pes=new Map<number,Pes>(),lastDts=new Map<number,number>(),lastPts=new Map<number,number>(),audioNext=new Map<number,number>();
  let packets=0;
  const table=(pid:number,section:Uint8Array)=>{
   if(section.length<12||crc(section)!==0||(section[1]&240)!==176||!(section[5]&1)||section[6]!==0||section[7]!==0)fail('Invalid, multisection or future TS table');
   const signature=Array.from(section).join(',');
   if(pid===0){
    if(section[0]!==0||(section.length-12)%4)fail('Invalid PAT');if(patSignature&&signature!==patSignature)fail('PAT changed');patSignature=signature;
    let found=0;for(let p=8;p<section.length-4;p+=4){const number=u16(section,p),target=u16(section,p+2)&8191;if(!number)fail('Network PAT entry requires another provider');if(++found!==1||target<32||target===8191)fail('Only one TS program admitted');program=number;pmtPid=target;}if(found!==1)fail('Empty PAT');
   }else{
    if(section[0]!==2||u16(section,3)!==program||section.length<16||u16(section,10)!==0xf000)fail('Unqualified PMT');if(pmtSignature&&signature!==pmtSignature)fail('PMT changed');pmtSignature=signature;
    const parsed:MpegTsTrack[]=[];
    for(let p=12;p<section.length-4;){if(p+5>section.length-4)fail('Truncated PMT stream');const type=section[p],number=u16(section,p+1)&8191,length=u16(section,p+3)&4095;if(length||number<32||number===pmtPid||number===8191||parsed.some(t=>t.number===number))fail('PMT descriptors or stream identity requires another provider');
     if(![27,15].includes(type))fail('Only AVC and AAC-LC TS streams admitted');parsed.push({number,kind:type===27?'video':'audio',codec:type===27?'h264':'aac',timescale:90000,packetFormat:type===27?'annexb':'adts',privateData:new Uint8Array()});p+=5;
    }
    if(parsed.length!==2||parsed.filter(t=>t.kind==='video').length!==1)fail('Exactly one AVC and AAC TS stream required');
    const pcrPid=u16(section,8)&8191;if(!parsed.some(t=>t.number===pcrPid))fail('External TS PCR track');
    for(const t of parsed)streams.set(t.number,streams.get(t.number)??t);
    if(!this.tracks.length)(this as {tracks:readonly MpegTsTrack[]}).tracks=Array.from(streams.values());
    else if(parsed.some(t=>!this.tracks.some(old=>old.number===t.number&&old.codec===t.codec)))fail('TS deployment metadata changed');
   }
  };
  const sectionPayload=(pid:number,data:Uint8Array,start:boolean)=>{
   if(start){if(sections.get(pid)?.length)fail('Incomplete PSI section before new table');if(!data.length||data[0]!==0)fail('Unsupported PSI pointer');data=data.subarray(1);}
   else if(!sections.has(pid))fail('PSI continuation before section');
   let bytes=concat([sections.get(pid)??new Uint8Array(),data],(sections.get(pid)?.length??0)+data.length);sections.delete(pid);
   while(bytes.length&&bytes[0]!==255){if(bytes.length<3){sections.set(pid,bytes);return;}const length=3+(u16(bytes,1)&4095);if(length<12||length>1024)fail('PSI section byte budget');if(bytes.length<length){sections.set(pid,bytes);return;}table(pid,bytes.subarray(0,length));bytes=bytes.subarray(length);}
   if(bytes.some(x=>x!==255))fail('Invalid PSI stuffing');
  };
  const decode=(pid:number,state:Pes):MpegTsPacket[]=>{
   const track=streams.get(pid)!;const parsed=pesData(concat(state.parts,state.bytes),track.kind),oldDts=lastDts.get(pid),oldPts=lastPts.get(pid);
   if(oldDts!==undefined&&parsed.dts<=oldDts||oldPts!==undefined&&Math.abs(parsed.pts-oldPts)>4294967296)fail('TS timestamps regress or cross 33-bit rollover');lastDts.set(pid,parsed.dts);lastPts.set(pid,parsed.pts);
   if(track.kind==='video')return [{track:pid,pts:parsed.pts,dts:parsed.dts,timescale:90000,key:h264Key(parsed.data),data:parsed.data,packetFormat:'annexb'}];
   const audio=adts(parsed.data),prior=this.tracks.find(t=>t.number===pid)!,next=audioNext.get(pid);
   if(parsed.pts!==parsed.dts||next!==undefined&&parsed.pts!==next||parsed.pts+audio.packets.length*1920>=8589934592)fail('AAC clock discontinuity or 33-bit rollover');audioNext.set(pid,parsed.pts+audio.packets.length*1920);
   if(prior.channels!==undefined&&prior.channels!==audio.channels)fail('AAC channel count changed');
   if(prior.channels===undefined){const enriched={...prior,sampleRate:48000 as const,channels:audio.channels,privateData:audio.config};(this as {tracks:readonly MpegTsTrack[]}).tracks=this.tracks.map(t=>t.number===pid?enriched:t);streams.set(pid,enriched);}
   return audio.packets.map((data,index)=>({track:pid,pts:parsed.pts+index*1920,dts:parsed.dts+index*1920,timescale:90000,duration:1920,key:true,data,packetFormat:'adts'}));
  };
  for await(const bytes of this.transport(metadataOnly)){
   if(++packets>10000000||bytes[0]!==71||(bytes[1]&128)||(bytes[3]&192))fail('TS packet budget, sync, transport error or scrambling');
   const pid=((bytes[1]&31)<<8)|bytes[2],start=!!(bytes[1]&64),mode=(bytes[3]>>4)&3,cc=bytes[3]&15;let pos=4;
   if(!mode)fail('Reserved TS adaptation control');if(mode&2){const length=bytes[4];pos=5+length;if(pos>188||(mode===2&&pos!==188))fail('Invalid TS adaptation length');if(length&&(bytes[5]&143))fail('TS discontinuity or extended adaptation requires another provider');}
   if(!(mode&1)||pos===188)continue;
   if(pid!==0&&pid!==pmtPid&&!streams.has(pid)){if(start&&bytes[pos]===0&&bytes[pos+1]===0&&bytes[pos+2]===1)fail('Unadvertised TS elementary stream');continue;}
   const previous=continuity.get(pid);if(previous!==undefined&&cc!==((previous+1)&15))fail('TS continuity gap or duplicate');continuity.set(pid,cc);
   const payload=bytes.subarray(pos);
   if(pid===0||pid===pmtPid){sectionPayload(pid,payload,start);continue;}
   let state=pes.get(pid);
   if(start){if(state){if(state.expected&&state.bytes!==state.expected)fail('Truncated declared PES');for(const p of decode(pid,state))yield p;}state={parts:[],bytes:0};pes.set(pid,state);}
   if(!state)fail('PES continuation before start');state.parts.push(payload.slice());state.bytes+=payload.length;if(state.bytes>4*1024*1024||state.parts.length>32768)fail('PES byte budget');
   if(!state.headerRead&&state.bytes>=6){state.headerRead=true;const prefix=concat(state.parts,state.bytes),length=u16(prefix,4);if(length)state.expected=length+6;else if(streams.get(pid)!.kind!=='video')fail('Unbounded audio PES');}
   if(state.expected&&state.bytes>=state.expected){if(state.bytes!==state.expected)fail('PES length overrun');for(const p of decode(pid,state))yield p;pes.delete(pid);}
  }
  if(sections.size)fail('Truncated PSI section');
  for(const [pid,state]of pes){if(state.expected&&state.bytes!==state.expected)fail('Truncated final PES');for(const p of decode(pid,state))yield p;}
  if(!program||!pmtSignature||streams.size!==2)fail('Missing PAT/PMT');
 }
 async *packets():AsyncGenerator<MpegTsPacket>{yield* this.scan();}
}
