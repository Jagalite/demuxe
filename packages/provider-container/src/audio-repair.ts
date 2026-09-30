// SPDX-License-Identifier: Apache-2.0
import {MatroskaReader,ContainerProfileError} from './matroska.js';
import type {MatroskaPacket} from './matroska.js';
import {FragmentedMP4Writer} from './fmp4.js';
import type {AudioPacketDecoder,AudioFrame,PacketAudioCodec} from '../../provider-audio/src/packet-decoder.js';
import type {AudioPacketEncoder,FlacPacket} from '../../provider-audio/src/flac-encoder.js';
/** Finite, bounded candidate recipe: AVC/HEVC packet copy + stereo 48 kHz
 * AC-3/E-AC-3/DTS-core float or TrueHD/MLP/DTS-HD integer decode + FLAC24 + fMP4. No source admission is implied.
 * The caller supplies qualified capability factories, independent of technology
 * and packaging. Acquisition happens after the container metadata guard. */
export interface AudioRepairComponents {
 /** Explicit admitted codec; A_DTS alone does not distinguish core from MA. */
 codec?: PacketAudioCodec;
 channels?: 2|6|8;
 decoder(codec: PacketAudioCodec, signal: AbortSignal): AudioPacketDecoder | Promise<AudioPacketDecoder>;
 encoder(channels: number, signal: AbortSignal): AudioPacketEncoder | Promise<AudioPacketEncoder>;
}
/** Small-file convenience wrapper. Streaming consumers use the iterator below. */
export async function repairMatroskaAudio(file:Blob,components:AudioRepairComponents,signal:AbortSignal):Promise<Blob>{
 if(file.size>64*1024*1024)throw new ContainerProfileError('Small-file recipe byte budget');
 const parts:Uint8Array[]=[];let bytes=0;
 for await(const part of repairMatroskaAudioFragments(file,components,signal)){
  bytes+=part.length;if(bytes>96*1024*1024||parts.length>=20000)throw new ContainerProfileError('Prepared output budget');parts.push(part);
 }
 signal.throwIfAborted();return new Blob(parts as BlobPart[],{type:'video/mp4'});
}
/** Demand-driven complete preparation. Each yielded initialization/fragment is
 * owned. Iterator return, cancellation and failure dispose both codec owners.
 * Consumer owns MSE append/eviction and seek policy; no whole-output retention. */
export async function* repairMatroskaAudioFragments(file: Blob, components: AudioRepairComponents,
 signal: AbortSignal): AsyncGenerator<Uint8Array> {
 const reader=await MatroskaReader.open(file,signal);
 const videos=reader.tracks.filter(t=>t.kind==='video'),audios=reader.tracks.filter(t=>t.kind==='audio');
 if(videos.length!==1||audios.length!==1)throw new ContainerProfileError('Exactly one video and one audio required');
 const video=videos[0],audio=audios[0];
 const codecs:Record<string,PacketAudioCodec>={A_AC3:'ac3',A_EAC3:'eac3',A_DTS:'dts-core',A_TRUEHD:'truehd',A_MLP:'mlp'};
 const codec=components.codec??codecs[audio.codec];
 if(!codec || (codec==='dts-hd'?audio.codec!=='A_DTS':codec!==codecs[audio.codec]))throw new ContainerProfileError('Source codec differs from admitted recipe');
 const integer=['truehd','mlp','dts-hd'].includes(codec),channels=audio.channels;
 if(!codecs[audio.codec]||!(integer?[2,6,8]:[2]).includes(channels??0)||audio.rate!==48000||!video.defaultDurationNs
  ||!['V_MPEG4/ISO/AVC','V_MPEGH/ISO/HEVC'].includes(video.codec))throw new ContainerProfileError('Unqualified audio-repair profile');
 if(components.channels!==undefined&&channels!==components.channels)throw new ContainerProfileError('Source channels differ from admitted recipe');
 const delay=Math.round((audio.codecDelayNs??0)*48000/1e9);
 if(delay<0||delay>6144||Math.abs(delay-(audio.codecDelayNs??0)*48000/1e9)>0.001)throw new ContainerProfileError('Unqualified codec delay');
 const channelCount=channels!;
 const layout=({2:3,6:63,8:1599} as Record<number,number>)[channelCount];
 const decoder=await components.decoder(codec,signal);
 let encoder:AudioPacketEncoder|undefined;
 try {
  signal.throwIfAborted();encoder=await components.encoder(channelCount,signal);signal.throwIfAborted();
  const writer=new FragmentedMP4Writer([
   {id:video.number,codec:video.codec==='V_MPEG4/ISO/AVC'?'avc1':'hvc1',config:video.privateData,timescale:1000000000,width:video.width,height:video.height,colour:video.colour},
   {id:audio.number,codec:'fLaC',config:encoder.header,timescale:48000,channels:channelCount},
  ]);
  yield writer.initialization();
  const parts:Uint8Array[]=[];let queuedBytes=0;
  const append=(part:Uint8Array)=>{queuedBytes+=part.length;if(queuedBytes>16*1024*1024||parts.length>=4096)throw new ContainerProfileError('Fragment queue budget');parts.push(part);};
  let pending:MatroskaPacket|undefined,audioBase:number|undefined,rawBase:number|undefined,samples=0,filled=0,skip=delay,padded=false;
  const pcm=new Int32Array(encoder.blockSize*channelCount);
  const encoded=(packets:readonly FlacPacket[])=>{for(const p of packets)append(writer.fragment(audio.number,[{data:p.data,dts:audioBase!+p.pts,pts:audioBase!+p.pts,duration:p.duration,key:true}]));};
  const decoded=(frames:readonly AudioFrame[],discard=0)=>{
   const count=frames.reduce((n,f)=>n+f.samples,0);
   if(discard>count)throw new ContainerProfileError('Discard padding exceeds decoded block');
   let remaining=count-discard;
   for(const f of frames){
    // RFC 9639 defines FLAC 5.1 positions 4/5 as back/surround L/R.
    // Accept either FFmpeg 5.1 mask; do not reorder the six sample positions.
    if(f.channels!==channelCount||!(channelCount===6?[63,1551]:[layout]).includes(f.layout)||f.rate!==48000)throw new ContainerProfileError('Decoded channel layout changed');
    rawBase??=f.pts;
    if(Math.abs(f.pts-(rawBase+samples))>Math.ceil(reader.timecodeScale*48000/2e9))throw new ContainerProfileError('Audio discontinuity');
    for(let i=0;i<f.samples;i++){
     if(remaining--<=0)continue;
     if(skip){skip--;continue;}
     audioBase??=rawBase+samples+i-delay;
     if(audioBase<0)throw new ContainerProfileError('Negative audio presentation start');
     for(let c=0;c<channelCount;c++){
      if(integer){
       if(!f.pcm||f.pcm.length!==f.samples*channelCount)throw new ContainerProfileError('Missing lossless integer PCM');
       const value=f.pcm[i*channelCount+c];
       if((value&255)!==0)throw new ContainerProfileError('Source precision exceeds lossless FLAC24 recipe');
       pcm[filled*channelCount+c]=value;
      }else{
       const value=f.planes[c][i];if(!Number.isFinite(value))throw new ContainerProfileError('Nonfinite PCM');
       pcm[filled*channelCount+c]=Math.max(-8388608,Math.min(8388607,Math.round(value*8388608)))*256;
      }
     }
     filled++;if(filled===encoder!.blockSize){encoded(encoder!.encode(pcm));filled=0;}
    }
    samples+=f.samples;
   }
  };
  const emitVideo=(p:MatroskaPacket,duration:number)=>{if(p.durationNs!==undefined&&p.durationNs!==duration)throw new ContainerProfileError('Conflicting video duration');append(writer.fragment(video.number,[{data:p.data,dts:p.timestampNs,pts:p.timestampNs,duration,key:p.key}]));};
  for await(const p of reader.packets()){
   signal.throwIfAborted();
   if(p.track===video.number){
    if(p.discardPaddingNs)throw new ContainerProfileError('Video discard padding');
    if(pending){const duration=p.timestampNs-pending.timestampNs;if(duration<=0)throw new ContainerProfileError('Reordered video requires another provider');emitVideo(pending,duration);}
    pending=p;
   } else if(p.track===audio.number){
    if(padded)throw new ContainerProfileError('Audio follows final discard padding');
    if(codec==='dts-core'){
     const b=p.data;
     if(b.length<10||b[0]!==0x7f||b[1]!==0xfe||b[2]!==0x80||b[3]!==1||(((b[5]&3)<<12)|(b[6]<<4)|(b[7]>>>4))+1!==b.length)
      throw new ContainerProfileError('Only complete big-endian DTS core frames are admitted');
    }
    const discard=Math.round((p.discardPaddingNs??0)*48000/1e9);
    if(Math.abs(discard-(p.discardPaddingNs??0)*48000/1e9)>0.001)throw new ContainerProfileError('Fractional discard padding');
    decoded(decoder.decode(p.data,Math.round(p.timestampNs*48000/1e9)),discard);padded=discard>0;
   }
   while(parts.length){const part=parts.shift()!;queuedBytes-=part.length;yield part;signal.throwIfAborted();}
  }
  decoded(decoder.flush());
  if(filled)encoded(encoder.encode(pcm.subarray(0,filled*channelCount)));
  encoded(encoder.flush());
  if(skip)throw new ContainerProfileError('Codec delay exceeds decoded samples');
  if(!pending||audioBase===undefined||!samples)throw new ContainerProfileError('Missing selected media packets');
  emitVideo(pending,video.defaultDurationNs);
  while(parts.length){signal.throwIfAborted();yield parts.shift()!;}
 } finally {decoder.dispose();encoder?.dispose();}
}
