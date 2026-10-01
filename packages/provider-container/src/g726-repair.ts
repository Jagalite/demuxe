// SPDX-License-Identifier: Apache-2.0
import {G726Reader} from './g726.js';
import type {G726Codec,G726Bits,G726RawConfiguration} from './g726.js';
import {ContainerProfileError} from './matroska.js';
import {FragmentedMP4Writer} from './fmp4.js';
import type {AudioRepairComponents} from './audio-repair.js';
import type {AudioPacketDecoder} from '../../provider-audio/src/packet-decoder.js';
import type {AudioPacketEncoder,FlacPacket} from '../../provider-audio/src/flac-encoder.js';
export type G726RepairComponents=Omit<AudioRepairComponents,'container'|'codec'|'sampleRate'>&{container?:'wave-g726'|'raw-g726';codec?:G726Codec;sampleRate?:8000;codedBits?:G726Bits};
function fail(message:string):never{throw new ContainerProfileError(message);}
export async function repairG726Audio(file:Blob,components:G726RepairComponents,signal:AbortSignal,raw?:G726RawConfiguration):Promise<Blob>{
 if(file.size>64*1048576)fail('Small-file recipe byte budget');const parts:Uint8Array[]=[];let bytes=0;
 for await(const part of repairG726AudioFragments(file,components,signal,raw)){bytes+=part.length;if(bytes>96*1048576||parts.length>=20000)fail('Prepared output budget');parts.push(part);}
 signal.throwIfAborted();return new Blob(parts as BlobPart[],{type:'audio/mp4'});
}
export async function* repairG726AudioFragments(file:Blob,components:G726RepairComponents,signal:AbortSignal,raw?:G726RawConfiguration):AsyncGenerator<Uint8Array>{
 signal.throwIfAborted();const reader=raw?await G726Reader.openRaw(file,raw,signal):await G726Reader.openWave(file,signal),track=reader.tracks[0],rate=8000,channels=1;
 if((components.output??'flac')!=='flac'||components.container!==undefined&&components.container!==reader.container||components.codec!==undefined&&components.codec!==track.codec||components.sampleRate!==undefined&&components.sampleRate!==rate||components.channels!==undefined&&components.channels!==channels||components.codedBits!==undefined&&components.codedBits!==track.bitDepth)fail('Source G726 mode, width, rate or channels differ from admitted recipe');
 let decoder:AudioPacketDecoder|undefined,encoder:AudioPacketEncoder|undefined;
 try{
  decoder=await components.decoder(track.codec,signal,{sampleRate:rate,channels,bitsPerSample:track.bitDepth,extradata:track.privateData,blockAlign:0,bitRate:track.bitRate});signal.throwIfAborted();
  encoder=await components.encoder(channels,signal,rate);signal.throwIfAborted();
  if(!Number.isInteger(encoder.blockSize)||encoder.blockSize<1||encoder.blockSize>65535)fail('Invalid encoder block size');
  const writer=new FragmentedMP4Writer([{id:1,codec:'fLaC',config:encoder.header,timescale:rate,channels}]);yield writer.initialization();signal.throwIfAborted();
  const queue:Uint8Array[]=[];let queuedBytes=0,decodedEnd=0,presentationEnd=0,encodedEnd=0,filled=0;const pcm=new Int32Array(encoder.blockSize*channels);
  const encoded=(packets:readonly FlacPacket[])=>{for(const packet of packets){if(packet.pts!==encodedEnd||!Number.isSafeInteger(packet.duration)||packet.duration<1)fail('Encoded G726 output sample clock changed');encodedEnd+=packet.duration;const part=writer.fragment(1,[{data:packet.data,dts:packet.pts,pts:packet.pts,duration:packet.duration,key:true}]);queuedBytes+=part.length;if(queuedBytes>16*1048576||queue.length>=4096)fail('Fragment queue budget');queue.push(part);}};
  for await(const packet of reader.packets()){
   signal.throwIfAborted();if(packet.startSample!==decodedEnd||packet.durationSamples<1||packet.decodedDurationSamples<1||packet.decodedDurationSamples>4080||packet.discardPaddingSamples!==packet.decodedDurationSamples-packet.durationSamples||packet.discardPaddingSamples<0||packet.discardPaddingSamples>0&&packet.startSample+packet.durationSamples!==reader.sampleCount)fail('G726 original block or final padding clock changed');
   const frames=decoder.decode(packet.data,packet.startSample);if(frames.length!==1)fail('G726 block must decode exactly one frame');const frame=frames[0];
   if(frame.rate!==rate||frame.channels!==channels||frame.layout!==(channels===1?4:3)||frame.pts!==decodedEnd||frame.samples!==packet.decodedDurationSamples||(frame.duration!==0&&frame.duration!==frame.samples))fail('Decoded G726 sample clock, duration or layout changed');
   if(!(frame.pcm instanceof Int32Array)||frame.pcm.length!==frame.samples*channels)fail('Missing exact G726 integer PCM');
   // Validate decoded precision for the entire original block, including discarded tail.
   for(const value of frame.pcm)if((value&65535)!==0)fail('G726 decoded precision exceeds signed16');
   for(let i=0;i<packet.durationSamples;i++){
    for(let c=0;c<channels;c++)pcm[filled*channels+c]=frame.pcm[i*channels+c];
    filled++;if(filled===encoder.blockSize){encoded(encoder.encode(pcm));filled=0;}
   }
   decodedEnd+=frame.samples;presentationEnd+=packet.durationSamples;
   while(queue.length){const part=queue.shift()!;queuedBytes-=part.length;yield part;signal.throwIfAborted();}
  }
  if(decoder.flush().length)fail('Unexpected delayed G726 frame');
  if(decodedEnd!==reader.decodedSampleCount||presentationEnd!==reader.sampleCount)fail('G726 declared original sample extent was not fully decoded');
  if(filled)encoded(encoder.encode(pcm.subarray(0,filled*channels)));encoded(encoder.flush());if(encodedEnd!==presentationEnd)fail('Encoder output differs from G726 fact presentation duration');
  while(queue.length){const part=queue.shift()!;queuedBytes-=part.length;signal.throwIfAborted();yield part;}
 }finally{try{decoder?.dispose();}finally{encoder?.dispose();}}
}
