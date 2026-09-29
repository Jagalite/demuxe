// SPDX-License-Identifier: Apache-2.0
/** Small fragmented MP4 writer. Timing and codec configuration are explicit
 * caller contracts; this writer never derives DTS from presentation timestamps. */
export type MP4Track = Readonly<{
 id: number; codec: 'avc1' | 'hvc1' | 'mp4a' | 'fLaC'; config: Uint8Array;
 timescale: number; colour?: Readonly<{primaries:number;transfer:number;matrix:number;fullRange:boolean}>; width?: number; height?: number; channels?: number;
}>;
export type MP4Sample = Readonly<{
 data: Uint8Array; dts: number; pts: number; duration: number; key: boolean;
}>;
const bytes = (...n: number[]) => new Uint8Array(n);
const text = (s: string) => Uint8Array.from(s, c => c.charCodeAt(0));
function join(parts: readonly Uint8Array[]): Uint8Array {
 const n = parts.reduce((sum,p)=>sum+p.length,0); if(n>32*1024*1024)throw Error('MP4 allocation budget');
 const b=new Uint8Array(n);let at=0;for(const p of parts){b.set(p,at);at+=p.length;}return b;
}
function u32(...values: number[]): Uint8Array {
 const b=new Uint8Array(values.length*4),v=new DataView(b.buffer);
 values.forEach((n,i)=>{if(!Number.isInteger(n)||n<0||n>0xffffffff)throw Error('MP4 uint32 overflow');v.setUint32(i*4,n);});return b;
}
const u16=(n:number)=>{if(!Number.isInteger(n)||n<0||n>65535)throw Error('MP4 uint16 overflow');return bytes(n>>>8,n);};
const box=(name:string,...parts:Uint8Array[])=>{const data=join(parts);return join([u32(data.length+8),text(name),data]);};
const full=(name:string,flags:number,...parts:Uint8Array[])=>box(name,u32(flags),...parts);
const matrix=()=>u32(0x10000,0,0,0,0x10000,0,0,0,0x40000000);
const descriptor=(tag:number,payload:Uint8Array)=>{
 if(payload.length>127)throw Error('AAC descriptor budget');return join([bytes(tag,payload.length),payload]);
};
function sampleEntry(t: MP4Track): Uint8Array {
 const common=join([new Uint8Array(6),u16(1)]);
 if(t.codec==='avc1'||t.codec==='hvc1'){
  if(!t.width||!t.height||t.config[0]!==1||t.config.length<(t.codec==='avc1'?7:23))throw Error('Invalid video configuration');
  const visual=join([common,new Uint8Array(16),u16(t.width),u16(t.height),u32(0x480000,0x480000,0),u16(1),new Uint8Array(32),u16(24),u16(0xffff)]);
  return box(t.codec,visual,box(t.codec==='avc1'?'avcC':'hvcC',t.config),...(t.colour?[box('colr',text('nclx'),u16(t.colour.primaries),u16(t.colour.transfer),u16(t.colour.matrix),bytes(t.colour.fullRange?128:0))]:[]));
 }
 if(!t.channels||![1,2,6].includes(t.channels)||t.timescale!==48000)throw Error('Unqualified audio configuration');
 const audio=join([common,new Uint8Array(8),u16(t.channels),u16(t.codec==='fLaC'?24:16),u32(0),u32(t.timescale*65536)]);
 if(t.codec==='fLaC'){
  if(t.config.length!==34)throw Error('FLAC stream info required');
  return box('fLaC',audio,full('dfLa',0,bytes(0x80,0,0,34),t.config));
 }
 if(t.config.length<2||t.config.length>64)throw Error('AAC configuration required');
 const decoder=descriptor(4,join([bytes(0x40,0x15,0,0,0),u32(0,0),descriptor(5,t.config)]));
 return box('mp4a',audio,full('esds',0,descriptor(3,join([u16(t.id),bytes(0),decoder,descriptor(6,bytes(2))]))));
}
function trackBox(t: MP4Track): Uint8Array {
 const video=t.codec==='avc1'||t.codec==='hvc1';
 const tkhd=full('tkhd',7,u32(0,0,t.id,0,0),new Uint8Array(8),u16(0),u16(0),u16(video?0:0x100),u16(0),matrix(),u32((t.width??0)*65536,(t.height??0)*65536));
 const mdhd=full('mdhd',0,u32(0,0,t.timescale,0),u16(0x55c4),u16(0));
 const hdlr=full('hdlr',0,u32(0),text(video?'vide':'soun'),new Uint8Array(12),text('Demuxe'),bytes(0));
 const stbl=box('stbl',full('stsd',0,u32(1),sampleEntry(t)),full('stts',0,u32(0)),full('stsc',0,u32(0)),full('stsz',0,u32(0,0)),full('stco',0,u32(0)));
 const dinf=box('dinf',full('dref',0,u32(1),full('url ',1)));
 const minf=box('minf',video?full('vmhd',1,new Uint8Array(8)):full('smhd',0,new Uint8Array(4)),dinf,stbl);
 return box('trak',tkhd,box('mdia',mdhd,hdlr,minf));
}
export class FragmentedMP4Writer {
 private sequence=0;
 private readonly tracks: readonly MP4Track[];
 private readonly tails=new Map<number,number>();
 constructor(tracks: readonly MP4Track[]) {
  if(!tracks.length||tracks.length>2||new Set(tracks.map(t=>t.id)).size!==tracks.length)throw Error('One or two distinct tracks required');
  for(const t of tracks)if(!Number.isInteger(t.id)||t.id<1||t.id>65534||!Number.isInteger(t.timescale)||t.timescale<1||t.timescale>1000000000||t.config.length>65536)throw Error('Invalid MP4 track');
  this.tracks=tracks.map(t=>({...t,config:t.config.slice()}));
 }
 initialization(): Uint8Array {
  const mvhd=full('mvhd',0,u32(0,0,1000,0,0x10000),u16(0x100),new Uint8Array(10),matrix(),new Uint8Array(24),u32(Math.max(...this.tracks.map(t=>t.id))+1));
  return join([box('ftyp',text('iso6'),u32(1),text('iso6mp41dash')),box('moov',mvhd,...this.tracks.map(trackBox),box('mvex',...this.tracks.map(t=>full('trex',0,u32(t.id,1,0,0,0)))))]);
 }
 fragment(trackId: number,samples: readonly MP4Sample[]): Uint8Array {
  if(!this.tracks.some(t=>t.id===trackId)||!samples.length||samples.length>4096||this.sequence>=0xffffffff)throw Error('Invalid MP4 fragment');
  let tail=this.tails.get(trackId)??samples[0].dts, total=0;
  for(const s of samples){
   if(!Number.isSafeInteger(s.dts)||s.dts<0||!Number.isSafeInteger(s.pts)||!Number.isInteger(s.duration)||s.duration<=0||s.duration>0xffffffff||s.dts!==tail||!s.data.length)throw Error('Invalid or discontinuous sample timeline');
   const cts=s.pts-s.dts;if(!Number.isInteger(cts)||cts< -2147483648||cts>2147483647)throw Error('Composition offset overflow');
   total+=s.data.length;if(total>16*1024*1024)throw Error('Fragment byte budget');tail=s.dts+s.duration;
   if(!Number.isSafeInteger(tail))throw Error('Decode timeline overflow');
  }
  const base=samples[0].dts,entries=samples.map(s=>u32(s.duration,s.data.length,s.key?0x02000000:0x01010000,(s.pts-s.dts)>>>0));
  const make=(offset:number)=>box('moof',full('mfhd',0,u32(this.sequence+1)),box('traf',full('tfhd',0x020000,u32(trackId)),full('tfdt',0x01000000,u32(Math.floor(base/0x100000000),base%0x100000000)),full('trun',0x01000f01,u32(samples.length,offset),...entries)));
  const draft=make(0),moof=make(draft.length+8),result=join([moof,box('mdat',...samples.map(s=>s.data))]);
  this.tails.set(trackId,tail);this.sequence++;return result;
 }
}
