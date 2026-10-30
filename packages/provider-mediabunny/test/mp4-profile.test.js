// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createBoundedReader} from '../bounded-reader.js';
import {inspectMp4PacketProfile,inspectMp4TrackProfiles} from '../mp4-profile.js';
import {createMP4VideoPreparer} from '../mp4-preparation.js';

const join=parts=>new Uint8Array(Buffer.concat(parts.map(part=>Buffer.from(part))));
const u32=n=>{const bytes=Buffer.alloc(4);bytes.writeUInt32BE(n);return bytes;};
const box=(type,...parts)=>{const body=join(parts);return join([u32(body.length+8),new TextEncoder().encode(type),body]);};
const full=(type,...parts)=>box(type,u32(0),...parts);
function fixture({editDuration=200,offset=0,external=false,fragment=false,audio=false,audioOnly=false,roll=-1,firstRoll=false}={}){
  // Authored table fixture only, not an encoded-media/playback fixture.
  const mediaHeader=full('mdhd',u32(0),u32(0),u32(1000),u32(200));
  const description=new Uint8Array(78);description[7]=1;
  const samples=box('stbl',
    full('stsd',u32(1),box('avc1',description,box('avcC',new Uint8Array([1,66,0,31])))),
    full('stts',u32(1),u32(2),u32(100)),full('stsz',u32(4),u32(2)),
    full('ctts',u32(1),u32(2),u32(offset)),full('stss',u32(1),u32(1)));
  const references=box('dinf',full('dref',u32(1),box('url ',u32(external?0:1))));
  const track=box('trak',full('tkhd',u32(0),u32(0),u32(1),u32(0),u32(200)),box('edts',full('elst',u32(1),u32(editDuration),u32(0),u32(65536))),
    box('mdia',mediaHeader,box('minf',references,samples)));
  const soundDescription=new Uint8Array(28);soundDescription[7]=1;soundDescription[17]=2;soundDescription[19]=16;
  new DataView(soundDescription.buffer).setUint32(24,48000*65536);
  const recovery=Buffer.alloc(2);recovery.writeInt16BE(roll);
  const soundSamples=box('stbl',
    full('stsd',u32(1),box('mp4a',soundDescription,box('esds',u32(0)))),
    full('stts',u32(1),u32(2),u32(1024)),full('stsz',u32(4),u32(2)),
    box('sgpd',u32(0x01000000),new TextEncoder().encode('roll'),u32(2),u32(1),recovery),
    full('sbgp',new TextEncoder().encode('roll'),u32(2),u32(1),u32(firstRoll?1:0),u32(1),u32(1)));
  const soundMedia=box('mdia',full('mdhd',u32(0),u32(0),u32(48000),u32(2048)),box('minf',references,soundSamples));
  const sound=box('trak',full('tkhd',u32(0),u32(0),u32(2),u32(0),u32(43)),box('edts',full('elst',u32(1),u32(43),u32(0),u32(65536))),soundMedia);
  return join([box('ftyp',new TextEncoder().encode('isom'),u32(0)),
    box('moov',full('mvhd',u32(0),u32(0),u32(1000),u32(audioOnly?43:200)),...(audioOnly?[]:[track]),...(audio||audioOnly?[sound]:[]),...(fragment?[box('mvex')]:[]))]);
}
async function inspect(bytes,options){
  const reader=createBoundedReader({size:bytes.length,read:async(at,n)=>bytes.slice(at,at+n)},{maxReads:4096,...options});
  try{return await reader.run(()=>options?.tracks?inspectMp4TrackProfiles(reader):inspectMp4PacketProfile(reader));}finally{await reader.close();}
}
test('A/V table profiles retain track identity, AAC packet extent and one-packet preroll',async()=>{
  const tracks=await inspect(fixture({audio:true}),{tracks:true});
  assert.deepEqual(tracks.map(track=>[track.id,track.type]),[[1,'video'],[2,'audio']]);
  assert.deepEqual(tracks[1].packets.map(packet=>[packet.timestamp,packet.duration]),[[0,1024/48000],[1024/48000,1024/48000]]);
  await assert.rejects(inspect(fixture({audio:true,roll:-2}),{tracks:true}),{code:'PROVIDER_PROFILE_MISMATCH'});
});
test('audio-only AAC tables retain exact extent and decline unsupported recovery/reference profiles',async()=>{
  const tracks=await inspect(fixture({audioOnly:true}),{tracks:true});
  assert.deepEqual(tracks.map(track=>[track.id,track.type,track.duration]),[[2,'audio',2048/48000]]);
  assert.deepEqual(tracks[0].packets.map(packet=>[packet.timestamp,packet.duration]),[[0,1024/48000],[1024/48000,1024/48000]]);
  for(const options of [{roll:-2},{firstRoll:true},{external:true},{fragment:true}])await assert.rejects(inspect(fixture({audioOnly:true,...options}),{tracks:true}),{code:'PROVIDER_PROFILE_MISMATCH'});
  await assert.rejects(inspect(fixture({audioOnly:true})),{code:'PROVIDER_PROFILE_MISMATCH'},'video-only inspector contract remains video-only');
});
test('unqualified AAC layouts and extra audio selections acquire no runtime',async()=>{
  let loads=0;const prepare=createMP4VideoPreparer({load:async()=>{loads++;throw Error('Unexpected acquisition');}});
  const video={id:'v',type:'video',codec:'h264'},audio={id:'a',type:'audio',codec:'aac',sampleRate:48000,channels:2};
  for(const tracks of [[video,{...audio,sampleRate:44100}],[video,{...audio,channels:6}],[video,audio,{...audio,id:'b'}],[video,{...audio,codec:'opus'}],[{...audio,sampleRate:44100}],[{...audio,channels:6}],[audio,{...audio,id:'b'}],[{...audio,codec:'opus'}]])assert.equal(await prepare(new Blob(['fixture']),{sourceTracks:tracks}),undefined);
  assert.equal(loads,0);
});
test('authored classic sample tables retain exact timing, sizes and sync identity',async()=>{
  assert.deepEqual(await inspect(fixture()),[{timestamp:0,duration:.1,size:4,type:'key'},{timestamp:.1,duration:.1,size:4,type:'delta'}]);
});
test('nonidentity edits, composition offsets, external references and fragments decline',async()=>{
  for(const options of [{editDuration:100},{offset:1},{external:true},{fragment:true}])await assert.rejects(inspect(fixture(options)),{code:'PROVIDER_PROFILE_MISMATCH'});
});
test('truncated atoms, read budgets and cancellation preserve bounded failures',async()=>{
  await assert.rejects(inspect(new Uint8Array([0,0,0,100,109,111,111,118])),{code:'PROVIDER_PROFILE_MISMATCH'});
  await assert.rejects(inspect(fixture(),{maxReads:1}),{code:'INSPECTION_BUDGET'});
  const controller=new AbortController();controller.abort();await assert.rejects(inspect(fixture(),{signal:controller.signal}),{name:'AbortError'});
});
test('MP4 preflight cannot acquire runtime for unsupported or incomplete source tracks',async()=>{
  let loads=0;const prepare=createMP4VideoPreparer({load:async()=>{loads++;throw Error('Unexpected acquisition');}});
  for(const sourceTracks of [undefined,[],[{id:'v',type:'video',codec:'vp8'}],[{id:'v',type:'video',codec:'h264',attachedPicture:true}],[{id:'v',type:'video',codec:'h264'},{id:'s',type:'subtitle',codec:'mov_text'}]])assert.equal(await prepare(new Blob(['fixture']),{sourceTracks}),undefined);
  assert.equal(loads,0);
});
