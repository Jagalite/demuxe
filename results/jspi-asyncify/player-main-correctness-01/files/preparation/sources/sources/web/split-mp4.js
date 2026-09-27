// SPDX-License-Identifier: Apache-2.0
// Packaging-only split of the maintained muxer's clear, default-base-is-moof
// fragments. Sample bytes, decode times, composition offsets and sample metadata
// are preserved. Other BMFF addressing schemes are rejected, never guessed.
const text=b=>String.fromCharCode(...b);
function boxes(bytes){
 const result=[],view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 for(let at=0;at<bytes.length;){
  if(result.length>=4096)throw Error('MP4 box budget exceeded');
  if(at+8>bytes.length)throw Error('Truncated MP4 box');
  const size=view.getUint32(at);if(size<8||at+size>bytes.length)throw Error('Unsupported or truncated MP4 box size');
  result.push({type:text(bytes.subarray(at+4,at+8)),at,bytes:bytes.subarray(at,at+size)});at+=size;
 }
 return result;
}
const u32=(b,n)=>new DataView(b.buffer,b.byteOffset,b.byteLength).getUint32(n);
function join(parts){const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const part of parts){out.set(part,at);at+=part.length;}return out;}
function box(type,parts){const payload=join(parts),out=new Uint8Array(payload.length+8);new DataView(out.buffer).setUint32(0,out.length);out.set([...type].map(c=>c.charCodeAt(0)),4);out.set(payload,8);return out;}
const children=b=>boxes(b.subarray(8));
export class SplitMP4 {
 constructor(){this.ids=[];this.defaults=new Map();}
 split(input){
  if(input.byteLength>8*1024*1024)throw Error('Split MP4 input budget exceeded');
  const bytes=new Uint8Array(input),top=boxes(bytes),out=[[],[]];
  for(let n=0;n<top.length;n++){
   const current=top[n];
   if(current.type==='ftyp'){for(const lane of out)lane.push(current.bytes);}
   else if(current.type==='moov'){
    if(this.ids.length)throw Error('Unexpected MP4 reinitialization');
    const parts=children(current.bytes),tracks=parts.filter(p=>p.type==='trak');
    if(tracks.length!==2)throw Error('Split MP4 requires exactly two tracks');
    const roles=new Map();
    for(const track of tracks){
     const sub=children(track.bytes),tkhd=sub.find(p=>p.type==='tkhd')?.bytes,mdia=sub.find(p=>p.type==='mdia')?.bytes;
     if(!tkhd||!mdia)throw Error('Missing track identity');
     const handler=children(mdia).find(p=>p.type==='hdlr')?.bytes;
     if(!handler)throw Error('Missing track handler');
     const role=text(handler.subarray(16,20)),id=u32(tkhd,tkhd[8]===1?28:20);
     if(!['vide','soun'].includes(role)||roles.has(role))throw Error('Unsupported track roles');
     roles.set(role,{id,bytes:track.bytes});
    }
    this.ids=['vide','soun'].map(role=>roles.get(role).id);
    const mvex=parts.find(p=>p.type==='mvex');if(!mvex)throw Error('Missing fragment defaults');
    for(const p of children(mvex.bytes))if(p.type==='trex')this.defaults.set(u32(p.bytes,12),u32(p.bytes,24));
    for(let lane=0;lane<2;lane++){
     const track=roles.get(lane?'soun':'vide');
     out[lane].push(box('moov',parts.flatMap(p=>p.type==='trak'?(p.bytes===track.bytes?[p.bytes]:[]):p.type==='mvex'?[box('mvex',children(p.bytes).filter(c=>c.type!=='trex'||u32(c.bytes,12)===track.id).map(c=>c.bytes))]:[p.bytes])));
    }
   }else if(current.type==='moof'){
    if(this.ids.length!==2)throw Error('Fragment before track initialization');
    const data=top[++n];if(data?.type!=='mdat')throw Error('Expected adjacent media data');
    const used=[],parts=children(current.bytes),header=parts.find(p=>p.type==='mfhd');if(!header)throw Error('Missing fragment sequence');
    for(const traf of parts.filter(p=>p.type==='traf')){
     const fields=children(traf.bytes),tfhd=fields.find(p=>p.type==='tfhd')?.bytes;
     if(!tfhd)throw Error('Missing fragment track identity');
     const flags=u32(tfhd,8)&0xffffff,id=u32(tfhd,12),lane=this.ids.indexOf(id);
     if(lane<0||!(flags&0x020000)||(flags&1))throw Error('Unsupported fragment addressing');
     let at=16;if(flags&2)at+=4;if(flags&8)at+=4;
     const defaultSize=flags&16?u32(tfhd,at):this.defaults.get(id)??0;
     const runs=[],payload=[];
     for(const field of fields){
      if(!['tfhd','tfdt','trun','sgpd','sbgp'].includes(field.type))throw Error('Unsupported fragment auxiliary data');
      if(field.type!=='trun')continue;
      const trun=field.bytes,f=u32(trun,8)&0xffffff,count=u32(trun,12);
      if(!(f&1)||count>20000)throw Error('Unsupported sample run addressing or count');
      const start=current.at+new DataView(trun.buffer,trun.byteOffset,trun.length).getInt32(16);
      let cursor=20+(f&4?4:0),length=0;
      for(let i=0;i<count;i++){
       if(f&0x100)cursor+=4;
       const size=f&0x200?u32(trun,cursor):defaultSize;
       if(f&0x200)cursor+=4;if(f&0x400)cursor+=4;if(f&0x800)cursor+=4;
       if(cursor>trun.length||!size)throw Error('Invalid sample description');length+=size;
      }
      if(cursor!==trun.length||start<data.at+8||start+length>data.at+data.bytes.length)throw Error('Sample run exceeds media data');
      if(used.some(([a,b])=>start<b&&start+length>a))throw Error('Overlapping sample runs');
      used.push([start,start+length]);
      const copy=trun.slice();runs.push(copy);payload.push(bytes.subarray(start,start+length));field.bytes=copy;
     }
     const newTraf=box('traf',fields.map(p=>p.bytes));let offset=8+header.bytes.length+newTraf.length+8;
     for(let i=0;i<runs.length;i++){new DataView(runs[i].buffer).setInt32(16,offset);offset+=payload[i].length;}
     out[lane].push(box('moof',[header.bytes,box('traf',fields.map(p=>p.bytes))]),box('mdat',payload));
    }
    if(used.reduce((sum,[a,b])=>sum+b-a,0)!==data.bytes.length-8)throw Error('Unaccounted media data');
   }else if(current.type!=='mfra'&&current.type!=='free')throw Error('Unsupported top-level MP4 box: '+current.type);
   // mfra is the old combined-file seek index. The source demuxer owns seeking;
   // MSE does not consume this now-invalid byte-offset index.
  }
  return out.map(parts=>join(parts).buffer);
 }
}

// Read the maintained muxer's actual presentation intervals. In B-frame MP4,
// duration follows decode-order deltas and can differ from rounded input packet
// durations. Do not infer the presented frame solely from the latest input PTS.
export class MP4VideoTiming {
 constructor(){this.track=undefined;this.scale=0;this.shift=0;this.defaults=new Map();}
 read(input){
  if(input.byteLength>8*1024*1024)throw Error('MP4 timing input budget exceeded');
  const frames=[];
  for(const top of boxes(new Uint8Array(input))){
   if(top.type==='moov'){
    if(this.track!==undefined)throw Error('Unexpected timing reinitialization');
    const parts=children(top.bytes),movie=parts.find(p=>p.type==='mvhd')?.bytes;
    const movieScale=movie?u32(movie,movie[8]===1?28:20):0;
    for(const p of parts){
     if(p.type==='mvex')for(const d of children(p.bytes))if(d.type==='trex')this.defaults.set(u32(d.bytes,12),u32(d.bytes,20));
     if(p.type!=='trak')continue;
     const fields=children(p.bytes),header=fields.find(p=>p.type==='tkhd')?.bytes,mdia=fields.find(p=>p.type==='mdia')?.bytes;
     if(!header||!mdia)throw Error('Missing timing track');
     const media=children(mdia),handler=media.find(p=>p.type==='hdlr')?.bytes,time=media.find(p=>p.type==='mdhd')?.bytes;
     if(!handler||!time)throw Error('Missing media time base');
     if(text(handler.subarray(16,20))!=='vide')continue;
     if(this.track!==undefined)throw Error('Multiple timing video tracks');
     this.track=u32(header,header[8]===1?28:20);this.scale=u32(time,time[8]===1?28:20);
     if(!this.scale)throw Error('Invalid media time base');
     const edits=fields.find(p=>p.type==='edts')?.bytes;
     if(edits){
      const list=children(edits).find(p=>p.type==='elst')?.bytes;
      if(!list||!movieScale||list[8]>1)throw Error('Unsupported video edit timing');
      const count=u32(list,12),view=new DataView(list.buffer,list.byteOffset,list.length);let cursor=16,movieTime=0,mediaFound=false;
      if(!count||count>2)throw Error('Unsupported video edit count');
      for(let i=0;i<count;i++){
       const wide=list[8]===1,length=wide?Number(view.getBigUint64(cursor)):u32(list,cursor);cursor+=wide?8:4;
       const time=wide?Number(view.getBigInt64(cursor)):view.getInt32(cursor);cursor+=wide?8:4;
       if(!Number.isSafeInteger(length)||!Number.isSafeInteger(time)||view.getInt16(cursor)!==1||view.getInt16(cursor+2)!==0)throw Error('Unsupported video edit rate or time');cursor+=4;
       if(time===-1&&!mediaFound)movieTime+=length/movieScale;
       else if(time>=0&&!mediaFound){this.shift=movieTime-time/this.scale;mediaFound=true;if(length)throw Error('Finite video edit not qualified for progressive timing');}
       else throw Error('Unsupported video edit sequence');
      }
      if(!mediaFound||cursor!==list.length)throw Error('Invalid video edit timing');
     }
    }
   }
   if(top.type!=='moof')continue;
   if(this.track===undefined)throw Error('Timing fragment before initialization');
   for(const p of children(top.bytes).filter(p=>p.type==='traf')){
    const fields=children(p.bytes),header=fields.find(p=>p.type==='tfhd')?.bytes,base=fields.find(p=>p.type==='tfdt')?.bytes;
    if(!header||!base)throw Error('Missing fragment timing');
    if(u32(header,12)!==this.track)continue;
    const flags=u32(header,8)&0xffffff;let at=16+(flags&1?8:0)+(flags&2?4:0);
    const duration=flags&8?u32(header,at):this.defaults.get(this.track);
    let dts=base[8]===1?Number(new DataView(base.buffer,base.byteOffset,base.length).getBigUint64(12)):u32(base,12);
    if(!Number.isSafeInteger(dts))throw Error('Unrepresentable fragment decode time');
    for(const run of fields.filter(p=>p.type==='trun')){
     const b=run.bytes,f=u32(b,8)&0xffffff,count=u32(b,12);at=16+(f&1?4:0)+(f&4?4:0);
     if(count+frames.length>4096)throw Error('Video timing sample budget exceeded');
     for(let i=0;i<count;i++){
      const length=f&0x100?u32(b,at):duration;if(f&0x100)at+=4;
      if(f&0x200)at+=4;if(f&0x400)at+=4;
      const cts=f&0x800?(b[8]===1?new DataView(b.buffer,b.byteOffset,b.length).getInt32(at):u32(b,at)):0;if(f&0x800)at+=4;
      if(!length||at>b.length||!Number.isSafeInteger(dts+cts+length))throw Error('Invalid video presentation interval');
      frames.push([(dts+cts)/this.scale+this.shift,length/this.scale]);dts+=length;
     }
     if(at!==b.length)throw Error('Unexpected video timing fields');
    }
   }
  }
  return frames;
 }
}
