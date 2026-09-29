// SPDX-License-Identifier: Apache-2.0
import {MatroskaReader,ContainerProfileError} from './matroska.js';
import type {MatroskaPacket} from './matroska.js';
import {FragmentedMP4Writer} from './fmp4.js';
/** TS-only packet copy for finite AVC/HEVC without reordered pictures and AAC-LC
 * 48 kHz mono/stereo. Delays, trims and SBR require a different admitted recipe. */
export async function remuxMatroska(file:Blob,signal:AbortSignal):Promise<Blob>{
 if(file.size>64*1024*1024)throw new ContainerProfileError('Small-file recipe byte budget');
 const reader=await MatroskaReader.open(file,signal),videos=reader.tracks.filter(t=>t.kind==='video'),audios=reader.tracks.filter(t=>t.kind==='audio');
 if(videos.length!==1||audios.length!==1)throw new ContainerProfileError('Exactly one video and one audio required');
 const video=videos[0],audio=audios[0],config=audio.privateData;
 if(!['V_MPEG4/ISO/AVC','V_MPEGH/ISO/HEVC'].includes(video.codec)||!video.defaultDurationNs||audio.codec!=='A_AAC'||audio.rate!==48000||![1,2].includes(audio.channels??0)||audio.codecDelayNs
  ||!([2,5].includes(config.length))||config[0]>>>3!==2||((config[0]&7)<<1|config[1]>>>7)!==3||(config[1]>>>3&15)!==audio.channels||(config[1]&7)!==0
  ||(config.length===5&&(config[2]!==0x56||config[3]!==0xe5||config[4]!==0)))throw new ContainerProfileError('Unqualified packet-copy configuration');
 const writer=new FragmentedMP4Writer([
  {id:video.number,codec:video.codec==='V_MPEG4/ISO/AVC'?'avc1':'hvc1',config:video.privateData,timescale:1000000000,width:video.width,height:video.height,colour:video.colour},
  {id:audio.number,codec:'mp4a',config,timescale:48000,channels:audio.channels},
 ]);
 const parts:Uint8Array[]=[writer.initialization()];let bytes=parts[0].length,pending:MatroskaPacket|undefined,tail:number|undefined;
 const append=(b:Uint8Array)=>{bytes+=b.length;if(bytes>96*1024*1024||parts.length>=20000)throw new ContainerProfileError('Prepared output budget');parts.push(b);};
 const emit=(p:MatroskaPacket,duration:number)=>{
  if(duration<=0||(p.durationNs!==undefined&&p.durationNs!==duration))throw new ContainerProfileError('Reordered or conflicting video timeline');
  append(writer.fragment(video.number,[{data:p.data,dts:p.timestampNs,pts:p.timestampNs,duration,key:p.key}]));
 };
 for await(const p of reader.packets()){
  if(p.discardPaddingNs)throw new ContainerProfileError('Packet-copy trimming requires another provider');
  if(p.track===video.number){if(pending)emit(pending,p.timestampNs-pending.timestampNs);pending=p;}
  else if(p.track===audio.number){
   const pts=Math.round(p.timestampNs*48000/1e9);tail??=pts;
   if(Math.abs(pts-tail)>Math.ceil(reader.timecodeScale*48000/1e9))throw new ContainerProfileError('Audio discontinuity');
   append(writer.fragment(audio.number,[{data:p.data,dts:tail,pts:tail,duration:1024,key:true}]));tail+=1024;
  }
 }
 if(!pending||tail===undefined)throw new ContainerProfileError('Missing media packets');emit(pending,video.defaultDurationNs);
 signal.throwIfAborted();return new Blob(parts as BlobPart[],{type:'video/mp4'});
}
