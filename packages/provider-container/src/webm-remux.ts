// SPDX-License-Identifier: Apache-2.0
import {MatroskaReader,ContainerProfileError} from './matroska.js';
import type {MatroskaTrack} from './matroska.js';
import {WebmPacketWriter} from './webm.js';
function fail(s:string):never{throw new ContainerProfileError(s);}
/** Separate bounded WebM packet-copy route. Packet order and original PTS are
 * preserved; neither re-encoding nor MP4 decode timestamps are introduced. */
export async function remuxWebm(file:Blob,signal:AbortSignal):Promise<Blob>{
 signal.throwIfAborted();if(file.size>64*1024*1024)fail('Small-file recipe byte budget');
 const reader=await MatroskaReader.open(file,signal),video=reader.tracks.filter(t=>t.kind==='video'),audio=reader.tracks.filter(t=>t.kind==='audio');
 if(video.length!==1||audio.length!==1||reader.tracks.length!==2)fail('WebM requires exactly one video and one audio');
 const v=video[0],a=audio[0];validate(v,a);if(reader.durationNs===undefined)fail('WebM packet copy requires declared segment duration');
 const writer=new WebmPacketWriter(reader.tracks,reader.timecodeScale,reader.durationNs),parts:Uint8Array[]=[];let bytes=writer.header.length,videoCount=0,audioCount=0;
 for await(const p of reader.packets()){
  signal.throwIfAborted();if(p.track===v.number){if(videoCount===0&&!p.key)fail('WebM first video packet requires random access');if(p.timestampNs>=reader.durationNs!)fail('WebM packet exceeds declared duration');videoCount++;}else audioCount++;
  const fragment=writer.packet(p);bytes+=fragment.length;if(bytes>96*1024*1024)fail('WebM output budget');parts.push(fragment);
 }
 if(!videoCount||!audioCount)fail('Missing WebM media packets');signal.throwIfAborted();return writer.finish(parts);
}
function validate(v:MatroskaTrack,a:MatroskaTrack):void{
 if(!['V_VP8','V_VP9','V_AV1'].includes(v.codec)||!Number.isInteger(v.width)||!Number.isInteger(v.height)||v.width!<1||v.height!<1||v.width!>1920||v.height!>1080||!Number.isSafeInteger(v.defaultDurationNs)||v.defaultDurationNs!<1000000||v.defaultDurationNs!>1000000000)fail('Unqualified WebM video dimensions or duration');
 if(v.codec==='V_AV1'){const h=v.privateData;if(h.length<4||h.length>65536||h[0]!==0x81||h[1]>>>5!==0||(h[2]&0xfc)!==0x0c||(h[3]&0xe0))fail('Unqualified WebM AV1 configuration');}
 else if(v.privateData.length)fail('WebM VP8/VP9 private extensions require another profile');
 if(!['A_OPUS','A_VORBIS'].includes(a.codec)||a.rate!==48000||![1,2].includes(a.channels??0)||a.privateData.length>65536)fail('Unqualified WebM audio configuration');
 if(a.codec==='A_OPUS'){
  const h=a.privateData;if(h.length!==19||new TextDecoder().decode(h.subarray(0,8))!=='OpusHead'||h[8]!==1||h[9]!==a.channels||h[18]!==0)fail('Unqualified WebM Opus mapping');const view=new DataView(h.buffer,h.byteOffset,h.byteLength),preSkip=view.getUint16(10,true);
  if(view.getInt16(16,true)!==0||view.getUint32(12,true)!==48000||preSkip>3840||a.codecDelayNs===undefined||Math.abs(a.codecDelayNs-preSkip*1e9/48000)>1||a.seekPreRollNs!==80000000)fail('Unqualified WebM Opus delay/gain');
 }else{
  if(a.seekPreRollNs||!Number.isSafeInteger(a.codecDelayNs??0)||(a.codecDelayNs??0)<0||(a.codecDelayNs??0)>8192*1e9/48000)fail('Unqualified WebM Vorbis delay');const h=a.privateData;if(h[0]!==2)fail('Missing WebM Vorbis headers');let offset=1;const lengths:number[]=[];for(let i=0;i<2;i++){let n=0;while(offset<h.length){const b=h[offset++];n+=b;if(b!==255)break;}lengths.push(n);}lengths.push(h.length-offset-lengths[0]-lengths[1]);for(let i=0;i<3;i++){if(lengths[i]<7||h[offset]!==[1,3,5][i]||new TextDecoder().decode(h.subarray(offset+1,offset+7))!=='vorbis')fail('Unqualified WebM Vorbis header order');offset+=lengths[i];}
 }
}
