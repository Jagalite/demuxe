// SPDX-License-Identifier: Apache-2.0
import {createFragmentStream} from './fragment-stream.js';
const mismatch=message=>{throw Object.assign(new Error(message),{code:'PROVIDER_PROFILE_MISMATCH'});};
/** Internal packet producer. The source and presentation lifetimes belong to
 * their existing owners; no MediaSource, clock or network transport is created. */
export async function createMP4PacketStream(runtime,input,{trackIds,authoredTracks,signal,target=0,timelineBias=1,maxFragmentBytes=8*1024*1024}={}){
  signal?.throwIfAborted();
  if(!Array.isArray(trackIds)||!trackIds.length||new Set(trackIds).size!==trackIds.length||!Array.isArray(authoredTracks)||!Number.isFinite(target)||target<0||timelineBias!==1)throw new TypeError('Invalid streaming preparation request');
  const all=await input.getTracks();signal?.throwIfAborted();
  if(all.length!==trackIds.length||all.some(track=>!trackIds.includes(track.id)))mismatch('Streaming requires the complete selected track set');
  const video=all.filter(track=>track.type==='video'),audio=all.filter(track=>track.type==='audio');
  if(video.length!==1||video[0].codec!=='avc'||audio.length>1||all.length!==video.length+audio.length||audio.some(track=>track.codec!=='aac'))mismatch('Unsupported streaming codec composition');
  if(await video[0].getRotation()!==0||await video[0].getFlip()||await video[0].canBeTransparent())mismatch('Unsupported streaming transform or alpha profile');
  const entries=[];
  for(const track of all){
    signal?.throwIfAborted();
    const authored=authoredTracks.find(candidate=>String(candidate.id)===String(track.id));
    if(!authored||authored.type!==track.type||!authored.packets.length||authored.packets[0].timestamp!==0)mismatch('Missing authored streaming timeline');
    const config=await track.getDecoderConfig();
    if(!config)mismatch('Missing streaming decoder configuration');
    if(track.type==='audio'){
      const bytes=config.description?new Uint8Array(config.description.buffer??config.description,config.description.byteOffset??0,config.description.byteLength):undefined;
      if(config.codec!=='mp4a.40.2'||config.sampleRate!==48000||![1,2].includes(config.numberOfChannels)||!bytes||bytes.length!==2||(bytes[0]>>3)!==2||(((bytes[0]&7)<<1)|(bytes[1]>>7))!==3||((bytes[1]>>3)&15)!==config.numberOfChannels||(bytes[1]&7))mismatch('Unsupported streaming AAC configuration');
    }
    const resolution=track.type==='audio'?48000:57600;
    for(const packet of authored.packets){
      if(Math.round(packet.timestamp*resolution)/resolution!==packet.timestamp||Math.round(packet.duration*resolution)/resolution!==packet.duration)mismatch('Streaming output cannot represent the authored clock exactly');
    }
    // Verify the packet API has not normalized authored timing before any init
    // segment is published. Encoded data remains unread during this pass.
    let index=0;
    for await(const packet of new runtime.EncodedPacketSink(track).packets(undefined,undefined,{metadataOnly:true})){
      signal?.throwIfAborted();const expected=authored.packets[index++];
      if(!expected||expected.timestamp!==packet.timestamp||expected.duration!==packet.duration||expected.type!==packet.type||expected.size!==packet.byteLength)mismatch('Streaming parser normalized authored packet metadata');
    }
    if(index!==authored.packets.length)mismatch('Streaming parser omitted authored packets');
    entries.push({track,config,authored:authored.packets,name:await track.getName(),languageCode:await track.getLanguageCode(),transformationMatrix:track.type==='video'?await track.getTransformationMatrix():undefined});
  }
  if(entries.reduce((n,entry)=>n+entry.authored.length,0)>100000)mismatch('Streaming packet budget exceeded');
  const duration=Math.max(...authoredTracks.map(track=>track.duration));
  if(!Number.isFinite(duration)||target>duration)mismatch('Streaming target is outside finite media');
  const picture=entries.find(entry=>entry.track.type==='video');
  // Conservative GOP bound includes audio and per-sample mux metadata. This
  // bounds the muxer's retained compressed data before target backpressure.
  const boundaries=picture.authored.filter(packet=>packet.type==='key').map(packet=>packet.timestamp);
  let last=0;const cuts=[0];
  for(const timestamp of boundaries)if(timestamp>=last+.5){cuts.push(timestamp);last=timestamp;}
  const buckets=new Array(cuts.length).fill(4096);
  for(const entry of entries){let bucket=0;for(const packet of entry.authored){while(bucket+1<cuts.length&&packet.timestamp>=cuts[bucket+1])bucket++;buckets[bucket]+=packet.size+32;if(buckets[bucket]>maxFragmentBytes-131072)mismatch('Streaming GOP exceeds the bounded fragment profile');}}
  const sourceVideoStart=picture.authored.filter(packet=>packet.type==='key'&&packet.timestamp<=target).at(-1)?.timestamp;
  if(sourceVideoStart===undefined)mismatch('Streaming target has no random-access point');
  for(const entry of entries){
    let start=entry.authored.findLastIndex(packet=>packet.timestamp<=sourceVideoStart&&(entry.track.type==='audio'||packet.type==='key'));
    if(entry.track.type==='audio')start=Math.max(0,start-1);
    entry.start=Math.max(0,start);
  }
  const stream=createFragmentStream({maxFragmentBytes});
  const output=new runtime.Output({format:new runtime.Mp4OutputFormat({fastStart:'fragmented',minimumFragmentDuration:.5}),target:new runtime.StreamTarget(stream.writable,{chunked:false})});
  for(const entry of entries){
    entry.source=entry.track.type==='video'?new runtime.EncodedVideoPacketSource('avc'):new runtime.EncodedAudioPacketSource('aac');
    const metadata={...(entry.name===null?{}:{name:entry.name}),languageCode:entry.languageCode};
    if(entry.track.type==='video')output.addVideoTrack(entry.source,{...metadata,transformationMatrix:entry.transformationMatrix});else output.addAudioTrack(entry.source,metadata);
  }
  let packetCount=0,cancellation,complete=false,cancelled=false,cancelReason;
  const cancel=(error=new DOMException('Stream retired','AbortError'))=>{
    if(complete)return Promise.resolve();
    if(!cancelled){cancelled=true;cancelReason=error;stream.abort(error);}
    cancellation??=Promise.resolve().then(()=>output.cancel()).catch(()=>{});return cancellation;
  };
  const aborted=()=>{void cancel(signal.reason);};
  signal?.addEventListener('abort',aborted,{once:true});
  const done=(async()=>{
    try{
      signal?.throwIfAborted();await output.start();
      const load=async entry=>{
        const value=await entry.iterator.next();signal?.throwIfAborted();
        if(value.done){
          if(entry.index!==entry.authored.length)mismatch('Streaming source ended before its authored extent');
          entry.current=undefined;entry.source.close();return;
        }
        const packet=value.value,expected=entry.authored[entry.index];
        if(!expected||packet.timestamp!==expected.timestamp||packet.duration!==expected.duration||packet.type!==expected.type||packet.data.byteLength!==expected.size)mismatch('Streaming source changed after preflight');
        entry.current=packet;
      };
      const add=async entry=>{
        const packet=entry.current,resolution=entry.track.type==='audio'?48000:57600;
        const timestamp=(Math.round(packet.timestamp*resolution)+timelineBias*resolution)/resolution;
        const shifted=new runtime.EncodedPacket(packet.data,packet.type,timestamp,packet.duration,packet.sequenceNumber,undefined,packet.sideData);
        await entry.source.add(shifted,entry.index++===entry.start?{decoderConfig:entry.config}:undefined);packetCount++;entry.current=undefined;
      };
      await Promise.all(entries.map(async entry=>{
        const sink=new runtime.EncodedPacketSink(entry.track),start=await sink.getPacket(entry.authored[entry.start].timestamp);
        if(!start)mismatch('Streaming start packet is unavailable');
        entry.iterator=sink.packets(start)[Symbol.asyncIterator]();entry.index=entry.start;await load(entry);
      }));
      // The first configurations must arrive together. Afterwards merge by PTS
      // instead of draining independent tracks: a faster audio/video input must
      // not build an arbitrarily large lead inside the muxer's track queues.
      await Promise.all(entries.map(entry=>add(entry)));
      await Promise.all(entries.map(entry=>load(entry)));
      for(;;){
        signal?.throwIfAborted();
        const next=entries.filter(entry=>entry.current).sort((a,b)=>a.current.timestamp-b.current.timestamp)[0];
        if(!next)break;
        await add(next);await load(next);
      }
      await output.finalize();complete=true;
    }catch(error){if(!complete)await cancel(error);throw cancelled?cancelReason:error;}
    finally{
      signal?.removeEventListener('abort',aborted);
      await Promise.allSettled(entries.map(entry=>entry.iterator?.return?.()));
    }
  })();
  void done.catch(()=>{});
  return {duration,timelineBias,mime:`video/mp4; codecs="${entries.map(entry=>entry.config.codec).join(',')}"`,trackIds:Object.freeze([...trackIds]),next:()=>stream.next(),cancel,done,get stats(){return {...stream.stats,packetCount};},[Symbol.asyncIterator](){return this;}};
}
