// SPDX-License-Identifier: Apache-2.0
/** Finite WebM packet writer. Original presentation timestamps and packet order
 * are preserved; no decode timestamps, clock, codec config or references are invented. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack,MatroskaPacket} from './matroska.js';
function fail(s:string):never{throw new ContainerProfileError(s);}
const concat=(parts:readonly Uint8Array[])=>{const size=parts.reduce((s,p)=>s+p.length,0);if(size>16*1024*1024)fail('WebM element budget');const result=new Uint8Array(size);let offset=0;for(const p of parts){result.set(p,offset);offset+=p.length;}return result;};
function uint(n:number):Uint8Array{if(!Number.isSafeInteger(n)||n<0)fail('WebM integer overflow');let size=1;while(n>=2**(size*8))size++;const result=new Uint8Array(size);for(let i=size-1;i>=0;i--){result[i]=n%256;n=Math.floor(n/256);}return result;}
function size(n:number):Uint8Array{if(!Number.isSafeInteger(n)||n<0)fail('WebM size overflow');let width=1;while(n>=2**(7*width)-1)width++;if(width>8)fail('WebM size overflow');const result=new Uint8Array(width);for(let i=width-1;i>=0;i--){result[i]=n%256;n=Math.floor(n/256);}result[0]|=1<<(8-width);return result;}
const element=(id:number,...parts:Uint8Array[])=>{const payload=concat(parts);return concat([uint(id),size(payload.length),payload]);};
const text=(s:string)=>new TextEncoder().encode(s);
const value=(id:number,n:number)=>element(id,uint(n));
function floatValue(id:number,n:number):Uint8Array{if(!Number.isFinite(n)||n<=0)fail('WebM float range');const b=new Uint8Array(8);new DataView(b.buffer).setFloat64(0,n);return element(id,b);}
function uint8(n:number):Uint8Array{const b=uint(n);if(b.length>8)fail('WebM position overflow');const result=new Uint8Array(8);result.set(b,8-b.length);return result;}
function trackEntry(t:MatroskaTrack):Uint8Array{
 const parts=[value(0xd7,t.number),value(0x73c5,t.number),value(0x83,t.kind==='video'?1:2),element(0x86,text(t.codec)),value(0x9c,0)];
 if(t.privateData.length)parts.push(element(0x63a2,t.privateData));if(t.defaultDurationNs)parts.push(value(0x23e383,t.defaultDurationNs));
 if(t.codecDelayNs!==undefined)parts.push(value(0x56aa,t.codecDelayNs));if(t.seekPreRollNs!==undefined)parts.push(value(0x56bb,t.seekPreRollNs));
 if(t.kind==='video'){
  const fields=[value(0xb0,t.width!),value(0xba,t.height!),value(0x9a,2)];if(t.colour)fields.push(element(0x55b0,value(0x55b1,t.colour.matrix),value(0x55ba,t.colour.transfer),value(0x55bb,t.colour.primaries),value(0x55b9,t.colour.fullRange?2:1)));parts.push(element(0xe0,...fields));
 }else{const rate=new Uint8Array(8);new DataView(rate.buffer).setFloat64(0,t.rate!);parts.push(element(0xe1,element(0xb5,rate),value(0x9f,t.channels!),...(t.bitDepth?[value(0x6264,t.bitDepth)]:[])));}
 return element(0xae,...parts);
}
export class WebmPacketWriter{
 readonly header:Uint8Array;private count=0;private packetBytes=0;private readonly cues:{time:number;track:number;offset:number}[]=[];private readonly info:Uint8Array;private readonly trackBytes:Uint8Array;
 constructor(readonly tracks:readonly MatroskaTrack[],readonly timecodeScale:number,readonly durationNs?:number){
  if(tracks.length!==2||new Set(tracks.map(t=>t.number)).size!==2||tracks.some(t=>!Number.isInteger(t.number)||t.number<1||t.number>126)||!Number.isSafeInteger(timecodeScale)||timecodeScale<1||timecodeScale>1000000000)fail('WebM track or clock configuration');
  this.info=element(0x1549a966,value(0x2ad7b1,timecodeScale),...(durationNs!==undefined?[floatValue(0x4489,durationNs/timecodeScale)]:[]),element(0x4d80,text('Demuxe')),element(0x5741,text('Demuxe')));this.trackBytes=element(0x1654ae6b,...tracks.map(trackEntry));
  this.header=element(0x1a45dfa3,value(0x4286,1),value(0x42f7,1),value(0x42f2,4),value(0x42f3,8),element(0x4282,text('webm')),value(0x4287,4),value(0x4285,2));
 }
 packet(p:MatroskaPacket):Uint8Array{
  const track=this.tracks.find(t=>t.number===p.track);if(!track||!Number.isSafeInteger(p.timestampNs)||p.timestampNs<0||p.timestampNs%this.timecodeScale||!p.data.length||p.data.length>1048576||++this.count>18000)fail('WebM packet bounds or timestamp');
  const block=concat([Uint8Array.of(0x80|p.track,0,0,p.key?0x80:0),p.data]);
  if(p.durationNs!==undefined&&(!Number.isSafeInteger(p.durationNs)||p.durationNs<=0||p.durationNs%this.timecodeScale))fail('WebM block duration');
  if(p.discardPaddingNs!==undefined&&(!Number.isSafeInteger(p.discardPaddingNs)||p.discardPaddingNs<0||track.kind!=='audio'))fail('WebM discard padding');
  if(track.kind==='video'&&p.durationNs!==undefined)fail('WebM video BlockGroup references require another profile');
  const fields:Uint8Array[]=[];
  if(p.discardPaddingNs!==undefined||p.durationNs!==undefined){fields.push(element(0xa1,block));if(p.durationNs!==undefined)fields.push(value(0x9b,p.durationNs/this.timecodeScale));if(p.discardPaddingNs!==undefined){let signed=uint(p.discardPaddingNs);if(signed[0]&128)signed=concat([Uint8Array.of(0),signed]);fields.push(element(0x75a2,signed));}}
  if(fields.length&&!p.key)fail('WebM BlockGroup reference mapping requires another profile');
  const part=element(0x1f43b675,value(0xe7,p.timestampNs/this.timecodeScale),fields.length?element(0xa0,...fields):element(0xa3,block));
  if(track.kind==='video'&&p.key)this.cues.push({time:p.timestampNs/this.timecodeScale,track:p.track,offset:this.packetBytes});this.packetBytes+=part.length;return part;
 }
 /** Finite Segment length permits both independent demuxing and the bounded reader. */
 finish(packets:readonly Uint8Array[]):Blob{
  const packetBytes=packets.reduce((s,p)=>s+p.length,0);if(packetBytes>96*1024*1024)fail('WebM output budget');if(packetBytes!==this.packetBytes||packets.length!==this.count)fail('WebM packet collection changed');
  const seek=(info:number,tracks:number,cues:number)=>element(0x114d9b74,...[[0x1549a966,info],[0x1654ae6b,tracks],[0x1c53bb6b,cues]].map(([id,position])=>element(0x4dbb,element(0x53ab,uint(id)),element(0x53ac,uint8(position)))));
  const seekLength=seek(0,0,0).length,clusterStart=seekLength+this.info.length+this.trackBytes.length;
  const cueBytes=element(0x1c53bb6b,...this.cues.sort((a,b)=>a.time-b.time).map(c=>element(0xbb,value(0xb3,c.time),element(0xb7,value(0xf7,c.track),value(0xf1,clusterStart+c.offset)))));
  const seekHead=seek(seekLength,seekLength+this.info.length,clusterStart+packetBytes),length=clusterStart+packetBytes+cueBytes.length;if(length>96*1024*1024)fail('WebM output budget');
  return new Blob([this.header,uint(0x18538067),size(length),seekHead,this.info,this.trackBytes,...packets,cueBytes] as BlobPart[],{type:'video/webm'});
 }
}
