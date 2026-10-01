// SPDX-License-Identifier: Apache-2.0
/** Shorten full-stream integer conversion; compressed chunks have no packet PTS. */
import {ShortenReader} from './shorten.js';
import {ContainerProfileError} from './matroska.js';
import {FragmentedMP4Writer} from './fmp4.js';
import type {AudioRepairComponents} from './audio-repair.js';
import type {AudioPacketDecoder,AudioFrame} from '../../provider-audio/src/packet-decoder.js';
import type {AudioPacketEncoder,FlacPacket} from '../../provider-audio/src/flac-encoder.js';
export type ShortenRepairComponents=Omit<AudioRepairComponents,'codec'|'container'|'output'>&{codec?:'shorten';container?:'shorten';output?:'flac'};
function fail(message:string):never{throw new ContainerProfileError(message);}
export async function repairShortenAudio(file:Blob,components:ShortenRepairComponents,signal:AbortSignal):Promise<Blob>{
 if(file.size>64*1024*1024)fail('Small-file recipe byte budget');const parts:Uint8Array[]=[];let bytes=0;
 for await(const part of repairShortenAudioFragments(file,components,signal)){bytes+=part.length;if(bytes>96*1024*1024||parts.length>=20000)fail('Prepared output budget');parts.push(part);}
 signal.throwIfAborted();return new Blob(parts as BlobPart[],{type:'audio/mp4'});
}
export async function* repairShortenAudioFragments(file:Blob,components:ShortenRepairComponents,signal:AbortSignal):AsyncGenerator<Uint8Array>{
 signal.throwIfAborted();if(components.container!==undefined&&components.container!=='shorten')fail('Source container differs from admitted archive recipe');
 const reader=await ShortenReader.open(file,signal),track=reader.tracks[0],rate=track.rate!,channels=track.channels!,output=components.output??'flac';
 if(components.codec!==undefined&&components.codec!=='shorten'||components.sampleRate!==undefined&&components.sampleRate!==rate||components.channels!==undefined&&components.channels!==channels)fail('Source codec, rate or channels differ from admitted archive recipe');
 if(output!=='flac')fail('Shorten requires lossless FLAC output');
 let decoder:AudioPacketDecoder|undefined,encoder:AudioPacketEncoder|undefined;
 try{
  decoder=await components.decoder('shorten',signal,{sampleRate:rate,channels,bitsPerSample:track.bitDepth,extradata:track.privateData});signal.throwIfAborted();encoder=await components.encoder(channels,signal,rate);signal.throwIfAborted();
  if(!Number.isInteger(encoder.blockSize)||encoder.blockSize<1||encoder.blockSize>65535)fail('Invalid encoder block size');
  const preSkip=0;if(!Number.isInteger(preSkip)||preSkip<0||preSkip>65535)fail('Invalid output codec delay');
  const writer=new FragmentedMP4Writer([{id:1,codec:'fLaC',config:encoder.header,timescale:rate,channels}]);yield writer.initialization();signal.throwIfAborted();
  const queue:Uint8Array[]=[];let queuedBytes=0,decodedSamples=0,filled=0,encodedEnd=0;const pcm=new Int32Array(encoder.blockSize*channels),layout=({1:4,2:3,6:63,8:1599} as Record<number,number>)[channels];
  const encoded=(packets:readonly FlacPacket[])=>{for(const p of packets){const start=p.pts+preSkip;if(start!==encodedEnd||!Number.isSafeInteger(p.duration)||p.duration<=0)fail('Encoded archive output sample clock changed');encodedEnd+=p.duration;const part=writer.fragment(1,[{data:p.data,dts:start,pts:start,duration:p.duration,key:true}]);queuedBytes+=part.length;if(queuedBytes>16*1024*1024||queue.length>=4096)fail('Fragment queue budget');queue.push(part);}};
  const decoded=(frames:readonly AudioFrame[])=>{
   for(const frame of frames){
    if(frame.timestampOrigin!=='stream-clock'||frame.rate!==rate||frame.channels!==channels||!(channels===6?[63,1551]:[layout]).includes(frame.layout)||frame.pts!==decodedSamples||!Number.isInteger(frame.samples)||frame.samples<1)fail('Decoded archive sample clock or layout changed');
    if(!(frame.pcm instanceof Int32Array)||frame.pcm.length!==frame.samples*channels)fail('Missing lossless integer PCM');
    if(decodedSamples+frame.samples>reader.sampleCount)fail('Decoded archive sample extent exceeds original total');
    for(let i=0;i<frame.samples;i++){
     for(let c=0;c<channels;c++){const value=frame.pcm[i*channels+c];if(output==='flac'&&(value&255)!==0)fail('Source precision exceeds lossless FLAC24 recipe');pcm[filled*channels+c]=value;}
     filled++;if(filled===encoder!.blockSize){encoded(encoder!.encode(pcm));filled=0;}
    }
    decodedSamples+=frame.samples;
   }
  };
  for await(const chunk of reader.chunks()){
   signal.throwIfAborted();decoded(decoder.decode(chunk,0));
   while(queue.length){const part=queue.shift()!;queuedBytes-=part.length;yield part;signal.throwIfAborted();}
  }
  decoded(decoder.flush());if(decodedSamples!==reader.sampleCount)fail('archive original sample extent was not fully decoded');
  if(filled)encoded(encoder.encode(pcm.subarray(0,filled*channels)));encoded(encoder.flush());if(encodedEnd!==decodedSamples+preSkip)fail('Encoder output differs from archive presentation duration');
  while(queue.length){const part=queue.shift()!;queuedBytes-=part.length;signal.throwIfAborted();yield part;}
 }finally{try{decoder?.dispose();}finally{encoder?.dispose();}}
}
