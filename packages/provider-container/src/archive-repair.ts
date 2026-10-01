// SPDX-License-Identifier: Apache-2.0
/* Internal original-clock integer converter shared by maintained standalone archive readers. */
import type {MatroskaTrack} from './matroska.js';
import {ContainerProfileError} from './matroska.js';
import {FragmentedMP4Writer} from './fmp4.js';
import type {AudioRepairComponents} from './audio-repair.js';
import type {AudioPacketDecoder,AudioFrame} from '../../provider-audio/src/packet-decoder.js';
import type {AudioPacketEncoder,FlacPacket} from '../../provider-audio/src/flac-encoder.js';
export type ArchiveRepairComponents=Omit<AudioRepairComponents,'container'>&{container?:'wavpack'|'ape'|'tta'|'tak'};
export interface ArchiveInput {
 codec:'wavpack'|'ape'|'tta'|'tak';
 open(file:Blob,signal:AbortSignal):Promise<{tracks:readonly MatroskaTrack[];sampleCount:number;packets():AsyncGenerator<{data:Uint8Array;startSample:number;durationSamples:number}>}>;
 admit?(track:MatroskaTrack):void;
}
function fail(message:string):never{throw new ContainerProfileError(message);}
export async function repairArchiveAudio(file:Blob,components:ArchiveRepairComponents,signal:AbortSignal,input:ArchiveInput):Promise<Blob>{
 if(file.size>64*1024*1024)fail('Small-file recipe byte budget');const parts:Uint8Array[]=[];let bytes=0;
 for await(const part of repairArchiveAudioFragments(file,components,signal,input)){bytes+=part.length;if(bytes>96*1024*1024||parts.length>=20000)fail('Prepared output budget');parts.push(part);}
 signal.throwIfAborted();return new Blob(parts as BlobPart[],{type:'audio/mp4'});
}
export async function* repairArchiveAudioFragments(file:Blob,components:ArchiveRepairComponents,signal:AbortSignal,input:ArchiveInput):AsyncGenerator<Uint8Array>{
 signal.throwIfAborted();if(components.container!==undefined&&components.container!==input.codec)fail('Source container differs from admitted archive recipe');
 const reader=await input.open(file,signal),track=reader.tracks[0],rate=track.rate!,channels=track.channels!,output=components.output??'flac';
 if(components.codec!==undefined&&components.codec!==input.codec||components.sampleRate!==undefined&&components.sampleRate!==rate||components.channels!==undefined&&components.channels!==channels)fail('Source codec, rate or channels differ from admitted archive recipe');
 input.admit?.(track);
 if(output!=='flac'&&output!=='opus')fail('Unknown audio output policy');if(output==='opus'&&(rate!==48000||channels!==2))fail('Opus composition requires stereo 48 kHz');
 let decoder:AudioPacketDecoder|undefined,encoder:AudioPacketEncoder|undefined;
 try{
  decoder=await components.decoder(input.codec,signal,{sampleRate:rate,channels,bitsPerSample:track.bitDepth,extradata:track.privateData});signal.throwIfAborted();encoder=await components.encoder(channels,signal,rate);signal.throwIfAborted();
  if(!Number.isInteger(encoder.blockSize)||encoder.blockSize<1||encoder.blockSize>65535)fail('Invalid encoder block size');
  const preSkip=output==='opus'?(encoder as AudioPacketEncoder&{preSkip:number}).preSkip:0;if(!Number.isInteger(preSkip)||preSkip<0||preSkip>65535)fail('Invalid output codec delay');
  const writer=new FragmentedMP4Writer([{id:1,codec:output==='opus'?'Opus':'fLaC',config:encoder.header,timescale:rate,channels}]);yield writer.initialization();signal.throwIfAborted();
  const queue:Uint8Array[]=[];let queuedBytes=0,decodedSamples=0,filled=0,encodedEnd=0;const pcm=new Int32Array(encoder.blockSize*channels),layout=({1:4,2:3,6:63,8:1599} as Record<number,number>)[channels];
  const encoded=(packets:readonly FlacPacket[])=>{for(const p of packets){const start=p.pts+preSkip;if(start!==encodedEnd||!Number.isSafeInteger(p.duration)||p.duration<=0)fail('Encoded archive output sample clock changed');encodedEnd+=p.duration;const part=writer.fragment(1,[{data:p.data,dts:start,pts:start,duration:p.duration,key:true}]);queuedBytes+=part.length;if(queuedBytes>16*1024*1024||queue.length>=4096)fail('Fragment queue budget');queue.push(part);}};
  const decoded=(frames:readonly AudioFrame[])=>{
   for(const frame of frames){
    if(frame.rate!==rate||frame.channels!==channels||!(channels===6?[63,1551]:[layout]).includes(frame.layout)||frame.pts!==decodedSamples||!Number.isInteger(frame.samples)||frame.samples<1)fail('Decoded archive sample clock or layout changed');
    if(!(frame.pcm instanceof Int32Array)||frame.pcm.length!==frame.samples*channels)fail('Missing lossless integer PCM');
    if(decodedSamples+frame.samples>reader.sampleCount)fail('Decoded archive sample extent exceeds original total');
    for(let i=0;i<frame.samples;i++){
     for(let c=0;c<channels;c++){const value=frame.pcm[i*channels+c];if(output==='flac'&&(value&255)!==0)fail('Source precision exceeds lossless FLAC24 recipe');pcm[filled*channels+c]=output==='opus'?(value&~255):value;}
     filled++;if(filled===encoder!.blockSize){encoded(encoder!.encode(pcm));filled=0;}
    }
    decodedSamples+=frame.samples;
   }
  };
  for await(const packet of reader.packets()){
   signal.throwIfAborted();if(packet.startSample!==decodedSamples)fail('archive packet and decoded sample clock differ');decoded(decoder.decode(packet.data,packet.startSample));
   if(decodedSamples!==packet.startSample+packet.durationSamples)fail('archive block duration differs from actual decoded samples');
   while(queue.length){const part=queue.shift()!;queuedBytes-=part.length;yield part;signal.throwIfAborted();}
  }
  decoded(decoder.flush());if(decodedSamples!==reader.sampleCount)fail('archive original sample extent was not fully decoded');
  if(filled)encoded(encoder.encode(pcm.subarray(0,filled*channels)));encoded(encoder.flush());if(encodedEnd!==decodedSamples+preSkip)fail('Encoder output differs from archive presentation duration');
  while(queue.length){const part=queue.shift()!;queuedBytes-=part.length;signal.throwIfAborted();yield part;}
 }finally{try{decoder?.dispose();}finally{encoder?.dispose();}}
}
