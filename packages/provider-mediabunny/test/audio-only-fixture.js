// SPDX-License-Identifier: Apache-2.0
/** Author an audio-only variant without re-encoding, moving sample bytes or
 * rewriting timing: the retained synthetic source's video trak becomes free. */
export function audioOnlyFixture(input){
 const bytes=new Uint8Array(input),view=new DataView(bytes.buffer);
 const text=at=>String.fromCharCode(...bytes.subarray(at,at+4));
 const boxes=(start,end)=>{
  const result=[];
  while(start<end){
   if(end-start<8)throw Error('Truncated fixture box');
   const size=view.getUint32(start),type=text(start+4);
   if(size<8||size>end-start)throw Error('Unsupported fixture box');
   result.push({start,end:start+size,type});start+=size;
  }
  return result;
 };
 const movie=boxes(0,bytes.length).find(box=>box.type==='moov');
 if(!movie)throw Error('Missing fixture movie');
 let video=0,audio=0;
 for(const track of boxes(movie.start+8,movie.end).filter(box=>box.type==='trak')){
  const media=boxes(track.start+8,track.end).find(box=>box.type==='mdia');
  if(!media)throw Error('Missing fixture media');
  const handler=boxes(media.start+8,media.end).find(box=>box.type==='hdlr');
  if(!handler||handler.end-handler.start<20)throw Error('Missing fixture handler');
  const kind=text(handler.start+16);
  if(kind==='vide'){bytes.set(new TextEncoder().encode('free'),track.start+4);video++;}
  else if(kind==='soun')audio++;else throw Error('Unexpected fixture track');
 }
 if(video!==1||audio!==1)throw Error('Expected retained one-video/one-audio fixture');
 return bytes;
}
