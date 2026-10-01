// SPDX-License-Identifier: Apache-2.0
/** Audio-only Ogg conversion. Framing/granules select the presentation extent;
 * decoder-emitted samples establish the clock. No rate conversion is implicit. */
import {OggAudioReader} from './ogg.js';
import {ContainerProfileError} from './matroska.js';
import {FragmentedMP4Writer} from './fmp4.js';
import type {AudioRepairComponents} from './audio-repair.js';
import type {AudioPacketDecoder,AudioFrame,PacketAudioCodec} from '../../provider-audio/src/packet-decoder.js';
import type {AudioPacketEncoder,FlacPacket} from '../../provider-audio/src/flac-encoder.js';
function fail(message:string):never{throw new ContainerProfileError(message);}
export async function repairOggAudio(file:Blob,components:AudioRepairComponents,signal:AbortSignal):Promise<Blob>{
 if(file.size>64*1024*1024)fail('Small-file recipe byte budget');const parts:Uint8Array[]=[];let bytes=0;
 for await(const part of repairOggAudioFragments(file,components,signal)){bytes+=part.length;if(bytes>96*1024*1024||parts.length>=20000)fail('Prepared output budget');parts.push(part);}
 signal.throwIfAborted();return new Blob(parts as BlobPart[],{type:'audio/mp4'});
}
export async function* repairOggAudioFragments(file:Blob,components:AudioRepairComponents,signal:AbortSignal):AsyncGenerator<Uint8Array>{
 signal.throwIfAborted();if(components.container!==undefined&&components.container!=='ogg')fail('Source container differs from admitted Ogg recipe');
 const reader=await OggAudioReader.open(file,signal),track=reader.tracks[0],codec=track.codec as PacketAudioCodec,rate=track.rate!,channels=track.channels!,output=components.output??'flac';
 if(components.codec!==undefined&&components.codec!==codec||components.sampleRate!==undefined&&components.sampleRate!==rate||components.channels!==undefined&&components.channels!==channels)fail('Source codec, rate or channels differ from admitted Ogg recipe');
 if(!['opus','vorbis','flac'].includes(codec)||![1,2].includes(channels)||![44100,48000,96000].includes(rate))fail('Unqualified Ogg audio profile');
 if(output!=='flac'&&output!=='opus')fail('Unknown audio output policy');if(output==='opus'&&(rate!==48000||channels!==2))fail('Opus composition requires stereo 48 kHz');
 let decoder:AudioPacketDecoder|undefined,encoder:AudioPacketEncoder|undefined;
 try{
  decoder=await components.decoder(codec,signal,{sampleRate:rate,channels,bitsPerSample:track.bitDepth,extradata:track.privateData});signal.throwIfAborted();encoder=await components.encoder(channels,signal,rate);signal.throwIfAborted();
  if(!Number.isInteger(encoder.blockSize)||encoder.blockSize<1||encoder.blockSize>65535)fail('Invalid encoder block size');
  const preSkip=output==='opus'?(encoder as AudioPacketEncoder&{preSkip:number}).preSkip:0;if(!Number.isInteger(preSkip)||preSkip<0||preSkip>65535)fail('Invalid output codec delay');
  const writer=new FragmentedMP4Writer([{id:1,codec:output==='opus'?'Opus':'fLaC',config:encoder.header,timescale:rate,channels}]);yield writer.initialization();signal.throwIfAborted();
  const queue:Uint8Array[]=[];let queuedBytes=0,decodedSamples=0,acceptedSamples=0,filled=0,encodedEnd=0;const pcm=new Int32Array(encoder.blockSize*channels),layout=channels===1?4:3;
  const encoded=(packets:readonly FlacPacket[])=>{for(const p of packets){const start=p.pts+preSkip;if(start!==encodedEnd||!Number.isSafeInteger(p.duration)||p.duration<=0)fail('Encoded Ogg output sample clock changed');encodedEnd+=p.duration;const part=writer.fragment(1,[{data:p.data,dts:start,pts:start,duration:p.duration,key:true}]);queuedBytes+=part.length;if(queuedBytes>16*1024*1024||queue.length>=4096)fail('Fragment queue budget');queue.push(part);}};
  const decoded=(frames:readonly AudioFrame[])=>{
   for(const frame of frames){
    if(frame.rate!==rate||frame.channels!==channels||frame.layout!==layout||frame.pts!==decodedSamples||!Number.isInteger(frame.samples)||frame.samples<1)fail('Decoded Ogg sample clock or layout changed');
    if(codec==='flac'&&(!frame.pcm||frame.pcm.length!==frame.samples*channels))fail('Missing lossless integer PCM');
    const count=Math.min(frame.samples,Math.max(0,reader.sampleCount-decodedSamples));
    for(let i=0;i<count;i++){
     for(let c=0;c<channels;c++){
      if(codec==='flac'){
       const value=frame.pcm![i*channels+c];if(output==='flac'&&(value&255)!==0)fail('Source precision exceeds lossless FLAC24 recipe');pcm[filled*channels+c]=output==='opus'?(value&~255):value;
      }else{
       const value=frame.planes64?.[c][i]??frame.planes[c][i];if(!Number.isFinite(value)||value< -1||value>=1)fail('Decoded Ogg float exceeds supported range');
       if(output==='flac'&&frame.planes64&&!Number.isInteger(value*8388608))fail('Source precision exceeds lossless FLAC24 recipe');pcm[filled*channels+c]=Math.max(-8388608,Math.min(8388607,Math.round(value*8388608)))*256;
      }
     }
     filled++;acceptedSamples++;if(filled===encoder!.blockSize){encoded(encoder!.encode(pcm));filled=0;}
    }
    decodedSamples+=frame.samples;
   }
  };
  for await(const packet of reader.packets()){
   signal.throwIfAborted();decoded(decoder.decode(packet.data,packet.startSample??decodedSamples));
   if(packet.granuleEndSamples!==undefined){
    const end=packet.granuleEndSamples-reader.preSkip;
    if(!packet.endOfStream&&end!==decodedSamples)fail('Ogg page granule differs from actual decoded sample clock');
    if(packet.endOfStream&&end>decodedSamples)fail('Ogg final granule exceeds decoded samples');
   }
   while(queue.length){const part=queue.shift()!;queuedBytes-=part.length;yield part;signal.throwIfAborted();}
  }
  decoded(decoder.flush());if(acceptedSamples!==reader.sampleCount)fail('Ogg granule presentation extent was not fully decoded');
  if(filled)encoded(encoder.encode(pcm.subarray(0,filled*channels)));encoded(encoder.flush());
  if(encodedEnd!==acceptedSamples+preSkip)fail('Encoder output differs from Ogg presentation duration');
  while(queue.length){const part=queue.shift()!;queuedBytes-=part.length;signal.throwIfAborted();yield part;}
 }finally{try{decoder?.dispose();}finally{encoder?.dispose();}}
}
