// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as runtime from 'mediabunny';
import {createMP4PacketStream} from '../mp4-stream.js';
import {inspectMp4TrackProfiles} from '../mp4-profile.js';
import {createBoundedReader} from '../bounded-reader.js';
async function fixture({frameRate=10,transformationMatrix,displayAspectWidth,displayAspectHeight}={}){
  const target=new runtime.BufferTarget(),output=new runtime.Output({format:new runtime.Mp4OutputFormat({fastStart:false}),target});
  const source=new runtime.EncodedVideoPacketSource('avc');output.addVideoTrack(source,{frameRate,transformationMatrix});await output.start();
  // AVC configuration from the browser fixture; tiny opaque IDR payloads are
  // container tests only and do not constitute decoder/playback qualification.
  const description=new Uint8Array([1,66,0,1,255,225,0,20,39,66,0,1,137,138,48,97,188,8,48,204,212,4,52,4,30,16,8,77,1,0,4,40,206,60,128]);
  for(let i=0;i<30;i++)await source.add(new runtime.EncodedPacket(new Uint8Array([0,0,0,2,0x65,i]),'key',i/frameRate,1/frameRate),{decoderConfig:{codec:'avc1.420001',codedWidth:64,codedHeight:48,description,displayAspectWidth,displayAspectHeight}});
  source.close();await output.finalize();
  const file=new Blob([target.buffer]),reader=createBoundedReader({size:file.size,read:async(at,n)=>new Uint8Array(await file.slice(at,at+n).arrayBuffer())},{maxReads:4096});
  let authored;
  try{authored=await inspectMp4TrackProfiles(reader);}finally{await reader.close();}
  const input=new runtime.Input({formats:[runtime.MP4],source:new runtime.BlobSource(file)});
  return {input,authored};
}
test('real muxer emits incremental fragments and stops advancing under consumer backpressure',async()=>{
  const {input,authored}=await fixture();
  let stream,decoded;
  try{
    stream=await createMP4PacketStream(runtime,input,{trackIds:(await input.getTracks()).map(track=>track.id),authoredTracks:authored});
    const initialization=await stream.next();assert.equal(initialization.value.kind,'initialization');
    await new Promise(resolve=>setImmediate(resolve));
    const paused=stream.stats.packetCount;
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(stream.stats.packetCount,paused);assert.ok(paused<30,'the producer must not finish input while a fragment is unconsumed');
    const parts=[initialization.value.bytes];
    for await(const part of stream){assert.equal(part.kind,'fragment');parts.push(part.bytes);}
    await stream.done;assert.ok(stream.stats.fragments>1);assert.equal(stream.stats.packetCount,30);
    decoded=new runtime.Input({formats:[runtime.MP4],source:new runtime.BlobSource(new Blob(parts))});
    const packets=[];
    for await(const packet of new runtime.EncodedPacketSink((await decoded.getTracks())[0]).packets())packets.push({timestamp:(Math.round(packet.timestamp*57600)-57600)/57600,duration:packet.duration,data:Array.from(packet.data)});
    assert.equal(packets.length,30);
    assert.deepEqual(packets,Array.from({length:30},(_,i)=>({timestamp:i/10,duration:.1,data:[0,0,0,2,0x65,i]})));
  }finally{if(stream)await stream.cancel();decoded?.dispose();input.dispose();}
});
test('retiring a paused producer rejects consumption and settles mux ownership',async()=>{
  const {input,authored}=await fixture();let stream;
  try{
    stream=await createMP4PacketStream(runtime,input,{trackIds:(await input.getTracks()).map(track=>track.id),authoredTracks:authored});
    await stream.next();const reason=new DOMException('Source replaced','AbortError');
    const failure=assert.rejects(stream.done,actual=>actual===reason);
    await stream.cancel(reason);await failure;await assert.rejects(stream.next(),actual=>actual===reason);
  }finally{input.dispose();}
});
test('seek producer starts at the source random-access point and retains the absolute clock',async()=>{
  const {input,authored}=await fixture();let stream,decoded;
  try{
    stream=await createMP4PacketStream(runtime,input,{trackIds:(await input.getTracks()).map(track=>track.id),authoredTracks:authored,target:1.25});
    const parts=[];for await(const part of stream)parts.push(part.bytes);await stream.done;
    decoded=new runtime.Input({formats:[runtime.MP4],source:new runtime.BlobSource(new Blob(parts))});
    const packets=[];for await(const packet of new runtime.EncodedPacketSink((await decoded.getTracks())[0]).packets())packets.push(packet);
    assert.equal(packets.length,18);assert.equal(packets[0].timestamp,2.2);assert.equal(packets[0].data.at(-1),12);
    assert.equal(stream.duration,3);assert.equal(stream.timelineBias,1);
  }finally{decoded?.dispose();input.dispose();}
});
test('unrepresentable authored clocks decline before any output is created',async()=>{
  const {input,authored}=await fixture({frameRate:30000/1001});let outputs=0;
  const configured={...runtime,Output:class extends runtime.Output{constructor(...args){outputs++;super(...args);}}};
  try{await assert.rejects(createMP4PacketStream(configured,input,{trackIds:(await input.getTracks()).map(track=>track.id),authoredTracks:authored}),{code:'PROVIDER_PROFILE_MISMATCH'});assert.equal(outputs,0);}
  finally{input.dispose();}
});

test('incremental output retains authored translation and pixel aspect metadata',async()=>{
  const {input,authored}=await fixture({transformationMatrix:[1,0,0,0,1,0,5,7,1],displayAspectWidth:128,displayAspectHeight:48});let stream,decoded;
  try{
    const source=(await input.getTracks())[0];
    stream=await createMP4PacketStream(runtime,input,{trackIds:[source.id],authoredTracks:authored});
    const parts=[];for await(const part of stream)parts.push(part.bytes);await stream.done;
    decoded=new runtime.Input({formats:[runtime.MP4],source:new runtime.BlobSource(new Blob(parts))});
    const result=(await decoded.getTracks())[0];
    assert.deepEqual(await result.getTransformationMatrix(),await source.getTransformationMatrix());
    assert.equal(await result.getSquarePixelWidth(),await source.getSquarePixelWidth());
    assert.equal(await result.getSquarePixelHeight(),await source.getSquarePixelHeight());
  }finally{await stream?.cancel();decoded?.dispose();input.dispose();}
});
