// SPDX-License-Identifier: Apache-2.0
import {MatroskaReader,ContainerProfileError} from './matroska.js';
import type {MatroskaPacket} from './matroska.js';
import {FragmentedMP4Writer} from './fmp4.js';
import type {AudioPacketDecoder,AudioFrame,PacketAudioCodec,AudioDecoderConfiguration} from '../../provider-audio/src/packet-decoder.js';
import type {AudioPacketEncoder,FlacPacket} from '../../provider-audio/src/flac-encoder.js';
/** Finite, bounded candidate recipe: AVC/HEVC packet copy + stereo 48 kHz
 * AC-3/E-AC-3/DTS-core float or TrueHD/MLP/DTS-HD integer decode + FLAC24 + fMP4. No source admission is implied.
 * The caller supplies qualified capability factories, independent of technology
 * and packaging. Acquisition happens after the container metadata guard. */
export interface AudioRepairComponents {
 /** Explicit admitted codec; A_DTS alone does not distinguish core from MA. */
 codec?: PacketAudioCodec;
 /** Opus is an explicit lossy output choice. */
 output?: 'flac'|'opus';
 channels?: 2|6|8;
 decoder(codec: PacketAudioCodec, signal: AbortSignal, configuration?: AudioDecoderConfiguration): AudioPacketDecoder | Promise<AudioPacketDecoder>;
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
 const codecs:Record<string,PacketAudioCodec>={A_AC3:'ac3',A_EAC3:'eac3',A_DTS:'dts-core',A_TRUEHD:'truehd',A_MLP:'mlp',A_AAC:'aac',A_OPUS:'opus',A_VORBIS:'vorbis',A_FLAC:'flac',A_ALAC:'alac','A_MPEG/L3':'mp3'};
 if(audio.codec==='A_PCM/INT/LIT'&&[16,24,32].includes(audio.bitDepth??0))codecs[audio.codec]=('pcm-s'+audio.bitDepth+'le') as PacketAudioCodec;
 if(audio.codec==='A_PCM/FLOAT/IEEE'&&[32,64].includes(audio.bitDepth??0))codecs[audio.codec]=('pcm-f'+audio.bitDepth+'le') as PacketAudioCodec;
 const codec=components.codec??codecs[audio.codec];
 if(!codec || (codec==='dts-hd'?audio.codec!=='A_DTS':codec!==codecs[audio.codec]))throw new ContainerProfileError('Source codec differs from admitted recipe');
 const integer=['truehd','mlp','dts-hd','flac','alac','pcm-s16le','pcm-s24le','pcm-s32le'].includes(codec),channels=audio.channels;
 const output=components.output??'flac';
 if(output!=='flac'&&output!=='opus')throw new ContainerProfileError('Unknown audio output policy');
 if(output==='opus'&&channels!==2)throw new ContainerProfileError('Opus composition requires stereo');
 if(!codecs[audio.codec]||!(['truehd','mlp','dts-hd'].includes(codec)?[2,6,8]:[2]).includes(channels??0)||audio.rate!==48000||!video.defaultDurationNs
  ||!['V_MPEG4/ISO/AVC','V_MPEGH/ISO/HEVC'].includes(video.codec))throw new ContainerProfileError('Unqualified audio-repair profile');
 if(components.channels!==undefined&&channels!==components.channels)throw new ContainerProfileError('Source channels differ from admitted recipe');
 const delay=Math.round((audio.codecDelayNs??0)*48000/1e9);
 if(delay<0||delay>6144||Math.abs(delay-(audio.codecDelayNs??0)*48000/1e9)>0.001)throw new ContainerProfileError('Unqualified codec delay');
 // libavcodec applies the OpusHead pre-skip and advances the first frame PTS.
 // Matroska repeats that value as CodecDelay; verify it, then trim only once.
 if(codec==='opus'&&(audio.privateData.length!==19||new TextDecoder().decode(audio.privateData.subarray(0,8))!=='OpusHead'
  ||new DataView(audio.privateData.buffer,audio.privateData.byteOffset,audio.privateData.byteLength).getUint16(10,true)!==delay))throw new ContainerProfileError('Opus header and container delay differ');
 const channelCount=channels!;
 const layout=({2:3,6:63,8:1599} as Record<number,number>)[channelCount];
 let extradata=audio.privateData;
 // Matroska FLAC CodecPrivate includes fLaC + the metadata block header.
 if(codec==='flac'&&extradata.length>=42&&new TextDecoder().decode(extradata.subarray(0,4))==='fLaC'){
  if((extradata[4]&127)!==0||((extradata[5]<<16)|(extradata[6]<<8)|extradata[7])!==34)throw new ContainerProfileError('Invalid FLAC stream info');
  extradata=extradata.slice(8,42);
 }
 const configured=!['ac3','eac3','dts-core','truehd','mlp','dts-hd'].includes(codec);
 const decoder=await components.decoder(codec,signal,configured?{sampleRate:48000,channels:channelCount,bitsPerSample:audio.bitDepth,extradata}:undefined);
 let encoder:AudioPacketEncoder|undefined;
 try {
  signal.throwIfAborted();encoder=await components.encoder(channelCount,signal);signal.throwIfAborted();
  const preSkip=output==='opus'?(encoder as AudioPacketEncoder & {preSkip:number}).preSkip:0;
  if(!Number.isInteger(preSkip)||preSkip<0||preSkip>65535)throw new ContainerProfileError('Invalid output codec delay');
  const writer=new FragmentedMP4Writer([
   {id:video.number,codec:video.codec==='V_MPEG4/ISO/AVC'?'avc1':'hvc1',config:video.privateData,timescale:1000000000,width:video.width,height:video.height,colour:video.colour},
   {id:audio.number,codec:output==='opus'?'Opus':'fLaC',config:encoder.header,timescale:48000,channels:channelCount},
  ]);
  yield writer.initialization();
  const parts:Uint8Array[]=[];let queuedBytes=0;
  const append=(part:Uint8Array)=>{queuedBytes+=part.length;if(queuedBytes>16*1024*1024||parts.length>=4096)throw new ContainerProfileError('Fragment queue budget');parts.push(part);};
  // Vorbis likewise consumes its initial overlap frame inside libavcodec.
  let pending:MatroskaPacket|undefined,audioBase:number|undefined,rawBase:number|undefined,samples=0,filled=0,skip=['opus','vorbis'].includes(codec)?0:delay,padded=false;
  const pcm=new Int32Array(encoder.blockSize*channelCount);
  const encoded=(packets:readonly FlacPacket[])=>{for(const p of packets)append(writer.fragment(audio.number,[{data:p.data,dts:audioBase!+p.pts+preSkip,pts:audioBase!+p.pts+preSkip,duration:p.duration,key:true}]));};
  const decoded=(frames:readonly AudioFrame[],discard=0)=>{
   const count=frames.reduce((n,f)=>n+f.samples,0);
   if(discard>count)throw new ContainerProfileError('Discard padding exceeds decoded block');
   let remaining=count-discard;
   for(const f of frames){
    // RFC 9639 defines FLAC 5.1 positions 4/5 as back/surround L/R.
    // Accept either FFmpeg 5.1 mask; do not reorder the six sample positions.
    if(f.channels!==channelCount||!(channelCount===6?[63,1551]:[layout]).includes(f.layout)||f.rate!==48000)throw new ContainerProfileError('Decoded channel layout changed');
    rawBase??=f.pts;
    // Matroska timestamps may be truncated rather than rounded to the tick.
    // Preserve the exact decoded sample clock within one container tick.
    if(Math.abs(f.pts-(rawBase+samples))>Math.ceil(reader.timecodeScale*48000/1e9))throw new ContainerProfileError('Audio discontinuity');
    for(let i=0;i<f.samples;i++){
     if(remaining--<=0)continue;
     if(skip){skip--;continue;}
     audioBase??=rawBase+samples+i-delay;
     if(audioBase<0&&audioBase>=-Math.ceil(reader.timecodeScale*48000/1e9))audioBase=0;
     if(audioBase<0)throw new ContainerProfileError('Negative audio presentation start');
     for(let c=0;c<channelCount;c++){
      if(integer){
       if(!f.pcm||f.pcm.length!==f.samples*channelCount)throw new ContainerProfileError('Missing lossless integer PCM');
       const value=f.pcm[i*channelCount+c];
       if(output==='flac'&&(value&255)!==0)throw new ContainerProfileError('Source precision exceeds lossless FLAC24 recipe');
       pcm[filled*channelCount+c]=output==='opus'?(value&~255):value;
      }else{
       const value=f.planes64?.[c][i]??f.planes[c][i];if(!Number.isFinite(value))throw new ContainerProfileError('Nonfinite PCM');
       if(codec.startsWith('pcm-f')){
        if(value< -1||value>=1)throw new ContainerProfileError('PCM float exceeds supported range');
        if(output==='flac'&&!Number.isInteger(value*8388608))throw new ContainerProfileError('Source precision exceeds lossless FLAC24 recipe');
       }
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
