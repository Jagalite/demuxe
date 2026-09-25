// SPDX-License-Identifier: Apache-2.0
import {inspectSimpleMP4} from './simple-mp4-inspector.js';
// Immutable local view only. Offsets, sample tables and payload stay unchanged;
// removed tracks' media remains present. This is never a redacted export.
const text=(b,p)=>String.fromCharCode(...b.subarray(p,p+4));
function boxes(b,start=0,end=b.length){const v=new DataView(b.buffer,b.byteOffset,b.byteLength),out=[];for(let p=start;p<end;){if(out.length>=128||p+8>end)throw Error('Box table');const n=v.getUint32(p);if(n<8||p+n>end)throw Error('Box bounds');out.push({type:text(b,p+4),p,n});p+=n;}return out;}
const one=(a,t)=>{const found=a.filter(x=>x.type===t);if(found.length!==1)throw Error('Ambiguous '+t);return found[0];};
export async function selectedMP4View(file,audioTrack,signal){
 const began=performance.now();let readBytes=0;
 const read=async(p,n)=>{signal.throwIfAborted();readBytes+=n;if(readBytes>2*262144)throw Error('Metadata budget');const b=new Uint8Array(await file.slice(p,p+n).arrayBuffer());signal.throwIfAborted();if(b.length!==n)throw Error('Short metadata');return b;};
 try{
  if(!(file instanceof Blob))return null;
  let moov,offset,mdat=false;
  for(let p=0,count=0;p<file.size;count++){
   if(count>=64)throw Error('Box budget');const h=await read(p,8),n=new DataView(h.buffer).getUint32(0),type=text(h,4);
   if(n<8||p+n>file.size)throw Error('Unsupported top-level size');
   if(type==='moov'){if(moov||n>262144)throw Error('Movie budget');offset=p;moov=await read(p,n);}
   else if(type==='mdat'){if(mdat)throw Error('Multiple media extents');mdat=true;}
   else if(!['ftyp','free','skip','wide'].includes(type))throw Error('Unsupported top-level box');
   p+=n;
  }
  if(!moov||!mdat)throw Error('Missing movie/media');
  const root=boxes(moov,8);if(root.some(x=>!['mvhd','trak','udta'].includes(x.type)))throw Error('Movie dependencies');
  const movie=one(root,'mvhd'),movieView=new DataView(moov.buffer);
  if(movie.n<108||movieView.getUint32(movie.p+8)!==0||!movieView.getUint32(movie.p+20)||!movieView.getUint32(movie.p+24))throw Error('Finite movie timeline');
  const movieDuration=movieView.getUint32(movie.p+24);
  const traks=root.filter(x=>x.type==='trak');if(traks.length!==3)throw Error('Qualified three-track profile required');
  const descriptors=traks.map((t,index)=>{
   const parts=boxes(moov,t.p+8,t.p+t.n);if(parts.some(x=>!['tkhd','edts','mdia'].includes(x.type)))throw Error('Track dependencies');
   const tkhd=one(parts,'tkhd'),mdia=one(parts,'mdia'),hdlr=one(boxes(moov,mdia.p+8,mdia.p+mdia.n),'hdlr');
   const view=new DataView(moov.buffer);if(moov[tkhd.p+8]!==0||view.getUint32(tkhd.p+20)!==index+1)throw Error('Track identity');
   if(view.getUint32(tkhd.p+28)!==movieDuration)throw Error('Unequal declared track tails');
   for(const edts of parts.filter(x=>x.type==='edts')){
    const edits=boxes(moov,edts.p+8,edts.p+edts.n),elst=one(edits,'elst');
    if(edits.length!==1||elst.n!==28||view.getUint32(elst.p+8)!==0||view.getUint32(elst.p+12)!==1||view.getUint32(elst.p+16)!==movieDuration||view.getInt32(elst.p+20)<0||view.getUint32(elst.p+24)!==65536)throw Error('Unqualified edit timeline');
   }
   const type=text(moov,hdlr.p+16);if(type!==(index===0?'vide':'soun'))throw Error('Track order');
   return {t,tkhd,index,id:String(index+1),type:index===0?'video':'audio',codec:index===0?'h264':'aac',enabled:!!(moov[tkhd.p+11]&1)};
  });
  if(audioTrack===undefined&&descriptors.filter(t=>t.type==='audio'&&t.enabled).length!==1)throw Error('Ambiguous default audio');
  const selected=audioTrack??descriptors.find(t=>t.type==='audio'&&t.enabled)?.index;
  if(![1,2].includes(selected))throw Error('Selected audio index');
  let output;
  // Qualify both alternatives so subsequent track switching cannot expose an
  // uninspected codec/data-reference configuration. No media payload is read.
  for(const index of [1,2]){
   const metadata=moov.slice();for(const d of descriptors){if(d.type==='audio'&&d.index!==index)metadata.set([102,114,101,101],d.t.p+4);else metadata[d.tkhd.p+11]|=1;}
   const candidate=new File([file.slice(0,offset),metadata,file.slice(offset+moov.length)],'selected.mp4',{type:'video/mp4'});
   const admitted=await inspectSimpleMP4(candidate,signal);readBytes+=admitted.bytesRead;
   if(!admitted.probe||admitted.probe.tracks.length!==2)throw Error('Selected destination profile rejected');
   if(index===selected)output=candidate;
  }
  return {file:output,tracks:descriptors.map(({id,type,codec,index})=>({id,type,codec,selected:index===0||index===selected})),diagnostics:{route:'selected-mp4-view',profile:'local-avc-two-aac',metadataBytes:moov.length,readBytes,payloadCopiedBytes:0,retainsUnselectedMedia:true,preparationMs:performance.now()-began}};
 }catch(error){if(signal.aborted)throw error;return null;}
}
