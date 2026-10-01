// SPDX-License-Identifier: Apache-2.0
/** Bounded unfragmented, self-contained MOV/MP4 reader. Structural rejection
 * means this finite provider cannot preserve the source, not unsupported media. */
import {ContainerProfileError} from './matroska.js';
import type {MatroskaTrack,MatroskaPacket} from './matroska.js';
import {aacProfileNumber,validateExtendedAacConfiguration} from '../../provider-audio/src/aac-config.js';
import type {AacProfile} from '../../provider-audio/src/aac-config.js';
type Box={type:string;start:number;end:number;header:number};
type Timing={count:number;delta:number};
type Chunk={first:number;count:number};
type Table={track:MatroskaTrack;scale:number;count:number;fixed:number;sizes:number[];offsets:number[];chunks:Chunk[];timing:Timing[];keys?:Set<number>;pcm:boolean;discardSamples?:number};
const fail=(s:string):never=>{throw new ContainerProfileError(s);};
const u16=(b:Uint8Array,p:number)=>view(b,p,2).getUint16(0);
const u32=(b:Uint8Array,p:number)=>view(b,p,4).getUint32(0);
function view(b:Uint8Array,p:number,n:number):DataView{if(p<0||p+n>b.length)fail('Truncated ISO metadata');return new DataView(b.buffer,b.byteOffset+p,n);}
function u64(b:Uint8Array,p:number):number{const v=view(b,p,8),n=v.getUint32(0)*4294967296+v.getUint32(4);if(!Number.isSafeInteger(n))fail('ISO integer overflow');return n;}
const text=(b:Uint8Array,p:number,n:number)=>String.fromCharCode(...b.subarray(p,p+n));
function boxes(b:Uint8Array,start=0,end=b.length):Box[]{
 const result:Box[]=[];
 for(let p=start;p<end;){
  if(result.length>=250000||end-p<8)fail('ISO box budget or truncated header');
  let size=u32(b,p),header=8;const type=text(b,p+4,4);
  if(size===1){size=u64(b,p+8);header=16;}else if(size===0)size=end-p;
  if(size<header||!Number.isSafeInteger(p+size)||p+size>end)fail('ISO box bounds');
  result.push({type,start:p+header,end:p+size,header});p+=size;
 }
 return result;
}
function one(list:Box[],type:string):Box{const matches=list.filter(x=>x.type===type);if(matches.length!==1)fail('Missing or duplicate ISO '+type);return matches[0];}
function full(b:Uint8Array,x:Box,version=0):number{if(u32(b,x.start)!==version*16777216)fail('Unqualified ISO box version or flags: '+x.type);return x.start+4;}
function entries(b:Uint8Array,x:Box,width:number):{start:number;count:number}{const p=full(b,x),count=u32(b,p);if(count>250000||p+4+width*count!==x.end)fail('ISO table budget or length: '+x.type);return {start:p+4,count};}
function descriptor(b:Uint8Array,p:number,end:number):{tag:number;start:number;end:number}{
 const tag=b[p++];let n=0,done=false;
 for(let i=0;i<4&&p<end;i++){const v=b[p++];n=n*128+(v&127);if(!(v&128)){done=true;break;}}
 if(!done||p+n>end)fail('Invalid MPEG descriptor');return {tag,start:p,end:p+n};
}
function aacConfig(b:Uint8Array,x:Box,rate:number,channels:number,profile:AacProfile):Uint8Array{
 let p=full(b,x),d=descriptor(b,p,x.end);if(d.tag!==3||d.end!==x.end||d.end-d.start<3)fail('Unqualified ES descriptor');
 p=d.start+3;if(b[d.start+2]!==0)fail('External or dependent ES descriptor');d=descriptor(b,p,d.end);
 if(d.tag!==4||d.end-d.start<13||b[d.start]!==0x40||(b[d.start+1]>>2)!==5)fail('Unqualified AAC decoder descriptor');
 const config=descriptor(b,d.start+13,d.end);if(config.tag!==5||!(profile==='usac'?[7]:[2,5]).includes(config.end-config.start))fail('Unqualified AAC configuration');
 const c=b.slice(config.start,config.end);if(profile!=='lc'){validateExtendedAacConfiguration(profile,rate,channels,c);return c;}if(c.length===5&&(c[2]!==0x56||c[3]!==0xe5||c[4]!==0))fail('AAC extension requires another provider');if((c[0]>>3)!==2||({0:96000,3:48000,4:44100} as Record<number,number>)[((c[0]&7)<<1|c[1]>>7)]!==rate||((c[1]>>3)&15)!==channels||(c[1]&7)!==0)fail('Only bounded AAC-LC sample rates and channels admitted');return c;
}
function sampleDescription(b:Uint8Array,x:Box,kind:'audio'|'video',number:number,aacProfile:AacProfile):{track:MatroskaTrack;pcm:boolean}{
 const p=full(b,x);if(u32(b,p)!==1)fail('Multiple sample descriptions require another provider');
 const descriptions=boxes(b,p+4,x.end);if(descriptions.length!==1)fail('Multiple ISO sample entries');const e=descriptions[0],start=e.start;
 if(u16(b,start+6)!==1)fail('External sample data reference');
 if(kind==='video'){
  if(e.type!=='avc1'||e.end-start<78)fail('Unqualified ISO video codec');
  // Identity matrix, square pixels, no cropping, no colour metadata are the
  // initial copy profile. Reject presentation extensions rather than drop them.
  const children=boxes(b,start+78,e.end);if(children.some(v=>!['avcC','pasp','btrt'].includes(v.type)))fail('ISO video presentation extension');
  for(const v of children.filter(v=>v.type==='pasp'))if(v.end-v.start!==8||u32(b,v.start)!==1||u32(b,v.start+4)!==1)fail('Nonsquare ISO video pixels');
  const config=one(children,'avcC');return {track:{number,kind,codec:'V_MPEG4/ISO/AVC',privateData:b.slice(config.start,config.end),width:u16(b,start+24),height:u16(b,start+26)},pcm:false};
 }
 const version=u16(b,start+8);if(![0,1].includes(version)||e.end-start<(version===1?44:28))fail('Unqualified QuickTime audio version');
 const channels=u16(b,start+16);let rate=u32(b,start+24)/65536;
 if(![1,2,6,8].includes(channels)||![44100,48000].includes(rate))fail('Unqualified ISO audio sample rate or channels');
 const children=boxes(b,start+(version===1?44:28),e.end),flat=children.flatMap(v=>v.type==='wave'?boxes(b,v.start,v.end):[v]);
 if(e.type==='ima4'){
  if(version!==1||![1,2].includes(channels)||u16(b,start+18)!==16||u16(b,start+20)!==65534||u16(b,start+22)!==0||[28,32,36].some(p=>u32(b,start+p)!==0)||u32(b,start+40)!==2)fail('Unqualified MOV IMA-QT sample description');
  if(flat.some(v=>v.type!=='chan')||flat.length>1)fail('Unqualified MOV IMA-QT extension');
  for(const c of flat)if(c.end-c.start!==16||u32(b,c.start)!==0||u32(b,c.start+4)!==65536||u32(b,c.start+8)!==(channels===1?4:3)||u32(b,c.start+12)!==0)fail('Unqualified MOV IMA-QT channel bitmap');
  return {track:{number,kind,codec:'A_ADPCM/IMA_QT',privateData:new Uint8Array(),channels,rate,bitDepth:16},pcm:false};
 }
 const configurationType=({alac:'alac',fl32:'enda',fl64:'enda',mp4a:'esds',fLaC:'dfLa'} as Record<string,string>)[e.type];
 if(!configurationType||flat.some(v=>!['frma','chan','btrt','\0\0\0\0',configurationType].includes(v.type)))fail('ISO audio extension requires another provider');
 for(const f of flat.filter(v=>v.type==='frma'))if(f.end-f.start!==4||text(b,f.start,4)!==e.type)fail('ISO original format and sample entry disagree');
 for(const c of flat.filter(v=>v.type==='chan'))if(c.end-c.start!==16||u32(b,c.start)!==0||u32(b,c.start+4)!==({1:0x640001,2:0x650002,6:0x7c0006,8:0x7f0008} as Record<number,number>)[channels]||u32(b,c.start+8)!==0||u32(b,c.start+12)!==0)fail('Unqualified ISO channel layout');
 let codec='';let privateData:Uint8Array=new Uint8Array(),bitDepth:number|undefined,pcm=false;
 if(e.type==='alac'){
  if(![1,2].includes(channels))fail('Unqualified ISO ALAC channel layout');
  const config=one(flat,'alac');if(config.end-config.start!==28||u32(b,config.start)!==0)fail('Invalid ALAC configuration');
  privateData=b.slice(config.start-config.header,config.end);bitDepth=b[config.start+9];codec='A_ALAC';
  if(![16,24,32].includes(bitDepth)||b[config.start+13]!==channels||u32(b,config.start+24)!==rate)fail('ALAC header and sample entry disagree');
 }else if(['fl32','fl64'].includes(e.type)){
  const endian=one(flat,'enda');if(endian.end-endian.start!==2||u16(b,endian.start)!==1)fail('Only little-endian ISO float PCM admitted');
  if(version!==1||u32(b,start+28)!==1||u32(b,start+32)!==(e.type==='fl64'?8:4)||u32(b,start+36)!==(e.type==='fl64'?8:4)*channels)fail('Unqualified float PCM packet layout');
  bitDepth=e.type==='fl64'?64:32;codec='A_PCM/FLOAT/IEEE';pcm=true;
 }else if(e.type==='mp4a'){if(![1,2].includes(channels))fail('Unqualified ISO AAC channel layout');codec='A_AAC';privateData=aacConfig(b,one(flat,'esds'),rate,channels,aacProfile);}
 else if(e.type==='fLaC'){
  const config=one(flat,'dfLa'),q=full(b,config);if(config.end-q!==38||(b[q]&127)!==0||b[q+1]!==0||b[q+2]!==0||b[q+3]!==34)fail('Unqualified ISO FLAC metadata');
  privateData=b.slice(q+4,config.end);bitDepth=((privateData[12]&1)<<4)|(privateData[13]>>4);bitDepth++;
  codec='A_FLAC';
  const infoRate=(privateData[10]<<12)|(privateData[11]<<4)|(privateData[12]>>4),infoChannels=((privateData[12]>>1)&7)+1;let entryRate=infoRate;while(entryRate>65535)entryRate=Math.floor(entryRate/2);if(![44100,48000,96000].includes(infoRate)||entryRate!==rate||infoChannels!==channels)fail('FLAC stream info and sample entry disagree');rate=infoRate;
 }else fail('Unqualified ISO audio codec');
 return {track:{number,kind,codec,privateData,channels,rate,bitDepth},pcm};
}
export class IsoBmffReader {
 private reads=0;
 readonly timecodeScale:number;
 readonly tracks:readonly MatroskaTrack[];
 private constructor(private file:Blob,private signal:AbortSignal,private tables:Table[],private media:readonly Box[]){this.tracks=tables.map(t=>t.track);this.timecodeScale=Math.ceil(Math.max(...tables.map(t=>1e9/t.scale)));}
 get bytesRead():number{return this.reads;}
 private async read(offset:number,size:number):Promise<Uint8Array>{
  this.signal.throwIfAborted();if(!Number.isSafeInteger(offset)||!Number.isSafeInteger(size)||offset<0||size<0||size>8*1024*1024||offset+size>this.file.size)fail('ISO read bounds');
  const result=new Uint8Array(size);
  for(let p=0;p<size;p+=65536){const count=Math.min(65536,size-p),bytes=new Uint8Array(await this.file.slice(offset+p,offset+p+count).arrayBuffer());this.signal.throwIfAborted();if(bytes.length!==count)fail('Short ISO read');result.set(bytes,p);this.reads+=count;}
  return result;
 }
 static async open(file:Blob,signal:AbortSignal,options:{aacProfile?:AacProfile}={}):Promise<IsoBmffReader>{
  const aacProfile=options.aacProfile??'lc';aacProfileNumber(aacProfile);
  if(!(file instanceof Blob)||file.size<16)fail('Local ISO Blob required');
  const reader=new IsoBmffReader(file,signal,[],[]),top:Box[]=[];
  for(let p=0;p<file.size;){
   if(top.length>=4096)fail('ISO top-level box budget');const header=await reader.read(p,Math.min(16,file.size-p));let size=u32(header,0),h=8;
   if(size===1){size=u64(header,8);h=16;}else if(size===0)size=file.size-p;
   if(size<h||!Number.isSafeInteger(p+size)||p+size>file.size)fail('ISO top-level bounds');top.push({type:text(header,4,4),start:p+h,end:p+size,header:h});p+=size;
  }
  if(top.some(x=>!['ftyp','wide','free','skip','mdat','moov'].includes(x.type)))fail('Fragmented or unqualified ISO structure');
  const moov=one(top,'moov'),media=top.filter(x=>x.type==='mdat');if(!media.length||moov.end-moov.start>8*1024*1024)fail('ISO movie metadata budget');
  const b=await reader.read(moov.start,moov.end-moov.start),movie=boxes(b);if(movie.some(x=>!['mvhd','trak','udta','meta','free'].includes(x.type)))fail('Unqualified ISO movie extension');
  const mvhd=one(movie,'mvhd');if(![0,1].includes(b[mvhd.start])||(u32(b,mvhd.start)&16777215)!==0)fail('ISO movie header version');const movieScale=u32(b,mvhd.start+(b[mvhd.start]===1?20:12));if(!movieScale)fail('Invalid ISO movie clock');
  const tables:Table[]=[];
  for(const trak of movie.filter(x=>x.type==='trak')){
   if(tables.length>=2)fail('ISO track count');const children=boxes(b,trak.start,trak.end);if(children.some(x=>!['tkhd','edts','mdia'].includes(x.type)))fail('ISO track extension');
   const tkhd=one(children,'tkhd'),version=b[tkhd.start];if(![0,1].includes(version)||(u32(b,tkhd.start)&3)!==3||(u32(b,tkhd.start)&16777208)!==0)fail('ISO track header version or flags');
   const number=u32(b,tkhd.start+(version===1?20:12));if(!number||tables.some(t=>t.track.number===number))fail('ISO track identity');
   const matrix=tkhd.start+(version===1?52:40),identity=[65536,0,0,0,65536,0,0,0,1073741824];for(let i=0;i<9;i++)if(u32(b,matrix+i*4)!==identity[i])fail('Transformed ISO video requires another provider');
   const mdia=one(children,'mdia'),md=boxes(b,mdia.start,mdia.end);if(md.some(x=>!['mdhd','hdlr','minf'].includes(x.type)))fail('ISO media extension');const mdhd=one(md,'mdhd'),mv=b[mdhd.start];if(![0,1].includes(mv)||(u32(b,mdhd.start)&16777215)!==0)fail('ISO media header version');
   const scale=u32(b,mdhd.start+(mv===1?20:12)),duration=mv===1?u64(b,mdhd.start+24):u32(b,mdhd.start+16);if(!scale||scale>1000000000||!duration||duration/scale>86400||!Number.isSafeInteger(Math.round(duration*1e9/scale)))fail('Invalid ISO media clock or duration budget');
   const hdlr=one(md,'hdlr'),handler=text(b,hdlr.start+8,4);if(!['vide','soun'].includes(handler))fail('Unqualified ISO track kind');
   let editDelay=0,editDuration=duration/scale;
   const edit=children.filter(x=>x.type==='edts');if(edit.length>1)fail('Duplicate ISO edit');if(edit.length){
    const editBoxes=boxes(b,edit[0].start,edit[0].end);if(editBoxes.length!==1)fail('ISO edit extension');
    const elst=one(editBoxes,'elst'),p=full(b,elst);if(u32(b,p)!==1||elst.end-p!==16||u32(b,p+12)!==65536)fail('Nonidentity ISO edit requires another provider');
    editDelay=u32(b,p+8);editDuration=u32(b,p+4)/movieScale;
    if(editDelay>6144||Math.abs(editDuration+editDelay/scale-duration/scale)>1/movieScale||(!editDelay&&Math.abs(editDuration-duration/scale)>1e-9))fail('Unsupported ISO edit trim');
   }
   const minf=one(md,'minf'),mf=boxes(b,minf.start,minf.end),dinf=one(mf,'dinf'),dref=one(boxes(b,dinf.start,dinf.end),'dref'),dp=full(b,dref);
   const refs=boxes(b,dp+4,dref.end);if(u32(b,dp)!==1||refs.length!==1||refs[0].type!=='url '||refs[0].end-refs[0].start!==4||u32(b,refs[0].start)!==1)fail('External ISO data reference');
   const stbl=one(mf,'stbl'),st=boxes(b,stbl.start,stbl.end);if(st.some(x=>!['stsd','stts','stsc','stsz','stco','co64','stss','ctts','sgpd','sbgp'].includes(x.type)))fail('ISO sample extension requires another provider');
   const {track,pcm}=sampleDescription(b,one(st,'stsd'),handler==='vide'?'video':'audio',number,aacProfile);
   if(editDelay){if(track.codec!=='A_AAC'||editDelay!==(aacProfile==='usac'?2220:1024)||scale!==track.rate)fail('Nonidentity ISO edit requires another provider');(track as {codecDelayNs?:number}).codecDelayNs=Math.round(editDelay*1e9/scale);}
   const ts=entries(b,one(st,'stts'),8),timing:Timing[]=[];let timed=0,totalDuration=0;
   for(let i=0;i<ts.count;i++){const count=u32(b,ts.start+i*8),delta=u32(b,ts.start+i*8+4);if(!count||!delta)fail('Invalid ISO sample duration');timing.push({count,delta});timed+=count;totalDuration+=count*delta;}
   const sz=one(st,'stsz'),sp=full(b,sz),fixed=u32(b,sp),count=u32(b,sp+4),sizes:number[]=[];
   if(!count||count>(pcm?10000000:250000)||count!==timed||totalDuration!==duration||!Number.isSafeInteger(totalDuration)||sp+8+(fixed?0:count*4)!==sz.end)fail('ISO sample count or duration mismatch');
   if(!fixed)for(let i=0;i<count;i++){const n=u32(b,sp+8+i*4);if(!n||n>8*1024*1024)fail('ISO sample size budget');sizes.push(n);}
   else if(fixed>8*1024*1024)fail('ISO fixed sample size budget');
   const offsets:number[]=[],offsetBox=st.filter(x=>['stco','co64'].includes(x.type));if(offsetBox.length!==1)fail('Missing or duplicate ISO chunk offsets');
   const co=offsetBox[0],oe=entries(b,co,co.type==='co64'?8:4);for(let i=0;i<oe.count;i++)offsets.push(co.type==='co64'?u64(b,oe.start+i*8):u32(b,oe.start+i*4));
   const cs=entries(b,one(st,'stsc'),12),chunks:Chunk[]=[];for(let i=0;i<cs.count;i++){const p=cs.start+i*12,first=u32(b,p),n=u32(b,p+4);if(!n||!first||first>offsets.length||(i===0?first!==1:first<=chunks[i-1].first)||u32(b,p+8)!==1)fail('Invalid ISO chunk map');chunks.push({first,count:n});}
   if(!chunks.length||!offsets.length)fail('Empty ISO chunks');let mapped=0;for(let i=0;i<chunks.length;i++)mapped+=((chunks[i+1]?.first??offsets.length+1)-chunks[i].first)*chunks[i].count;if(mapped!==count)fail('ISO chunk sample count mismatch');
   const ctts=st.filter(x=>x.type==='ctts');if(ctts.length>1)fail('Duplicate ISO composition offsets');if(ctts.length){const ct=entries(b,ctts[0],8);let n=0;for(let i=0;i<ct.count;i++){n+=u32(b,ct.start+i*8);if(u32(b,ct.start+i*8+4)!==0)fail('Reordered ISO video requires another provider');}if(n!==count)fail('ISO composition sample count');}
   let keys:Set<number>|undefined;const ss=st.filter(x=>x.type==='stss');if(ss.length>1)fail('Duplicate ISO sync table');if(ss.length){const se=entries(b,ss[0],4);keys=new Set();let last=0;for(let i=0;i<se.count;i++){const n=u32(b,se.start+i*4);if(n<=last||n>count)fail('Invalid ISO sync sample');keys.add(n);last=n;}}
   const groups=st.filter(x=>['sgpd','sbgp'].includes(x.type));if(groups.length){
    if(track.codec!=='A_AAC'||groups.length!==2)fail('Unqualified ISO sample group');
    const description=one(groups,'sgpd'),assignment=one(groups,'sbgp'),d=full(b,description,1),a=full(b,assignment);
    if(description.end-d!==14||text(b,d,4)!=='roll'||u32(b,d+4)!==2||u32(b,d+8)!==1||u16(b,d+12)!==65535
     ||assignment.end-a!==16||text(b,a,4)!=='roll'||u32(b,a+4)!==1||u32(b,a+8)!==count||u32(b,a+12)!==1)fail('Unqualified AAC recovery group');
   }
   let discardSamples=0;
   if(track.kind==='audio'&&scale!==track.rate)fail('ISO audio clock differs from sample rate');
   if(track.codec==='A_AAC'){
    const frameSamples=aacProfile==='lc'||aacProfile==='usac'?1024:2048;
    if(aacProfile==='usac'&&editDelay!==2220||!['lc','usac'].includes(aacProfile)&&editDelay)fail('Unqualified AAC extension delay');
    for(let i=0;i<timing.length;i++)if(timing[i].delta!==frameSamples&&(i!==timing.length-1||timing[i].count!==1||timing[i].delta>frameSamples))fail('Unqualified AAC sample timing');
    discardSamples=frameSamples-timing[timing.length-1].delta;
    if(edit.length){const presented=Math.round(editDuration*scale);if(Math.abs(presented-editDuration*scale)>0.001)fail('Fractional ISO AAC edit sample');discardSamples=count*frameSamples-editDelay-presented;}
    if(discardSamples<0||discardSamples>=frameSamples)fail('AAC presentation trim exceeds final frame');
   }
   if(track.codec==='A_ADPCM/IMA_QT'){if(fixed!==34*track.channels!||keys||groups.length)fail('Unqualified MOV IMA-QT block mapping');for(let i=0;i<timing.length;i++)if(timing[i].delta!==64&&(i!==timing.length-1||timing[i].count!==1||timing[i].delta>64))fail('Unqualified MOV IMA-QT block timing');discardSamples=64-timing[timing.length-1].delta;}
   if(track.kind==='video'){if(timing.length!==1)fail('Variable ISO video frame timing requires another provider');(track as {defaultDurationNs?:number}).defaultDurationNs=Math.round(timing[0].delta*1e9/scale);}
   if(pcm&&(!fixed||fixed!==channelsBytes(track)||timing.length!==1||timing[0].delta!==1||scale!==track.rate))fail('Unqualified ISO PCM sample mapping');
   tables.push({track,scale,count,fixed,sizes,offsets,chunks,timing,keys,pcm,discardSamples});
  }
  if(tables.length!==2||tables.filter(t=>t.track.kind==='video').length!==1||tables.filter(t=>t.track.kind==='audio').length!==1)fail('Exactly one ISO video and audio track required');
  const ready=new IsoBmffReader(file,signal,tables,media);ready.reads=reader.reads;
  // Validate every chunk before any codec owner is acquired.
  const ranges:{start:number;end:number}[]=[];
  for(const t of tables){let index=0,map=0;for(let c=0;c<t.offsets.length;c++){while(t.chunks[map+1]?.first===c+1)map++;const count=t.chunks[map].count,start=t.offsets[c];let size=0;for(let i=0;i<count;i++)size+=t.fixed||t.sizes[index+i];const end=start+size;if(!Number.isSafeInteger(end)||!media.some(m=>start>=m.start&&end<=m.end))fail('ISO sample outside media data');ranges.push({start,end});index+=count;}}
  ranges.sort((a,b)=>a.start-b.start);for(let i=1;i<ranges.length;i++)if(ranges[i].start<ranges[i-1].end)fail('Overlapping ISO sample ranges');return ready;
 }
 private async *trackPackets(t:Table):AsyncGenerator<MatroskaPacket>{
  let index=0,map=0,run=0,left=t.timing[0].count,time=0;
  for(let c=0;c<t.offsets.length;c++){
   while(t.chunks[map+1]?.first===c+1)map++;let offset=t.offsets[c],remaining=t.chunks[map].count;
   while(remaining){
    this.signal.throwIfAborted();const n=t.pcm?Math.min(1024,remaining):1;let bytes=0,delta=0;
    for(let j=0;j<n;j++){bytes+=t.fixed||t.sizes[index+j];delta+=t.timing[run].delta;if(--left===0&&index+j+1<t.count){run++;left=t.timing[run].count;}}
    const packet={track:t.track.number,timestampNs:Math.round(time*1e9/t.scale),durationNs:Math.round(delta*1e9/t.scale),key:!t.keys||t.keys.has(index+1),data:await this.read(offset,bytes),...(index+n===t.count&&t.discardSamples?{discardPaddingNs:Math.round(t.discardSamples*1e9/t.scale)}:{})};
    index+=n;time+=delta;offset+=bytes;remaining-=n;yield packet;
   }
  }
 }
 async *packets():AsyncGenerator<MatroskaPacket>{
  const iterators=this.tables.map(t=>this.trackPackets(t)),heads=await Promise.all(iterators.map(it=>it.next()));
  try{for(;;){let chosen=-1;for(let i=0;i<heads.length;i++)if(!heads[i].done&&(chosen<0||heads[i].value!.timestampNs<heads[chosen].value!.timestampNs))chosen=i;if(chosen<0)break;yield heads[chosen].value!;heads[chosen]=await iterators[chosen].next();}}
  finally{await Promise.all(iterators.map(it=>it.return(undefined)));}
 }
}
function channelsBytes(track:MatroskaTrack):number{return (track.channels??0)*(track.bitDepth??0)/8;}
