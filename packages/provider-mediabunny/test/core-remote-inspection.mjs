// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as r from 'mediabunny';
import {inspectRemoteFastSource} from '../../../web/generated/internal/remote-fast-inspection.js';
const base=new URL('../../../',import.meta.url);
async function fixture(packetBytes=8,{mov=false,audio=false}={}){
  const target=new r.BufferTarget(),output=new r.Output({format:mov?new r.MovOutputFormat({fastStart:false}):new r.Mp4OutputFormat({fastStart:false}),target});
  const video=new r.EncodedVideoPacketSource('avc');output.addVideoTrack(video,{frameRate:10});const sound=audio?new r.EncodedAudioPacketSource('aac'):undefined;if(sound)output.addAudioTrack(sound);await output.start();
  const audioPump=(async()=>{if(sound){for(let i=0;i<2;i++)await sound.add(new r.EncodedPacket(new Uint8Array(10),'key',i*1024/48000,1024/48000),{decoderConfig:{codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,description:new Uint8Array([0x11,0x90])}});sound.close();}})();void audioPump.catch(()=>{});
  // Container-only fixture: opaque packets are not decoder qualification.
  const description=new Uint8Array([1,66,0,1,255,225,0,20,39,66,0,1,137,138,48,97,188,8,48,204,212,4,52,4,30,16,8,77,1,0,4,40,206,60,128]);
  for(let i=0;i<2;i++)await video.add(new r.EncodedPacket(new Uint8Array(packetBytes),'key',i/10,.1),{decoderConfig:{codec:'avc1.420001',codedWidth:64,codedHeight:48,description}});
  video.close();await audioPump;await output.finalize();return new Uint8Array(target.buffer);
}
const small=await fixture(),large=await fixture(70000);
function location(t){const old=Object.getOwnPropertyDescriptor(globalThis,'location');Object.defineProperty(globalThis,'location',{configurable:true,value:{href:'https://app.test/'}});t.after(()=>{if(old)Object.defineProperty(globalThis,'location',old);else delete globalThis.location;});}
function response(data,init,etag='"v1"',total=data.length){
  const range=/bytes=(\d+)-(\d+)/.exec(new Headers(init.headers).get('Range')),start=Number(range[1]),end=Math.min(Number(range[2]),total-1);
  const body=data.slice(start,end+1);return new Response(body,{status:206,headers:{'Content-Range':`bytes ${start}-${end}/${total}`,'Content-Length':String(body.length),...(etag?{ETag:etag}:{})}});
}
test('remote metadata reuses the complete inspector and publishes its pinned identity',async t=>{
  location(t);let calls=0;t.mock.method(globalThis,'fetch',async(_url,init)=>{calls++;return response(small,init);});
  const result=await inspectRemoteFastSource({url:'https://media.test/movie'},base,new AbortController().signal);
  assert.equal(result.status,'satisfied');assert.deepEqual(result.available,['container','tracks','duration']);assert.equal(result.evidence.tracks.length,1);assert.equal(result.evidence.tracks[0].codec,'h264');assert.deepEqual(result.evidence.identity,{size:String(small.length),etag:'"v1"'});assert.ok(result.bytesRead<=512*1024);assert.equal(calls,1);
});
test('weak or missing representation identity cannot grant complete remote inspection',async t=>{
  location(t);
  for(const etag of ['W/"v1"',undefined]){
    t.mock.method(globalThis,'fetch',async(_url,init)=>response(small,init,etag??''));
    await assert.rejects(inspectRemoteFastSource({url:'https://media.test/movie'},base,new AbortController().signal),error=>error.code==='UNSUPPORTED_FEATURE'&&/Source transport:/.test(error.message));
  }
});
test('explicit immutable transport permits a pinned size without an ETag',async t=>{
  location(t);t.mock.method(globalThis,'fetch',async(_url,init)=>response(small,init,''));
  const result=await inspectRemoteFastSource({url:'https://media.test/movie',immutable:true},base,new AbortController().signal);
  assert.equal(result.status,'satisfied');assert.equal(result.evidence.identity.size,String(small.length));assert.equal(result.evidence.identity.etag,undefined);
});
test('changed ETag during metadata is a terminal source failure, not incomplete evidence',async t=>{
  location(t);let calls=0;t.mock.method(globalThis,'fetch',async(_url,init)=>response(large,init,++calls===1?'"v1"':'"v2"'));
  await assert.rejects(inspectRemoteFastSource({url:'https://media.test/movie'},base,new AbortController().signal),error=>/representation changed/i.test(error.message));assert.equal(calls,2);
});
test('authorization failure remains terminal and refresh belongs to RangeReader',async t=>{
  location(t);t.mock.method(globalThis,'fetch',async()=>new Response('denied',{status:401}));
  await assert.rejects(inspectRemoteFastSource({url:'https://media.test/movie'},base,new AbortController().signal),error=>/401|permission/i.test(error.message));
  let refreshes=0;t.mock.method(globalThis,'fetch',async(_url,init)=>new Headers(init.headers).get('Authorization')==='fresh'?response(small,init):new Response('denied',{status:401}));
  const result=await inspectRemoteFastSource({url:'https://media.test/movie',headers:{Authorization:'old'},refreshAuthorization:async()=>{refreshes++;return {headers:{Authorization:'fresh'}};}},base,new AbortController().signal);
  assert.equal(result.status,'satisfied');assert.equal(refreshes,1);
});
test('policy changes during metadata cannot publish a complete probe',async t=>{
  location(t);let calls=0;const source={url:'https://media.test/movie',headers:{Authorization:'old'}};
  t.mock.method(globalThis,'fetch',async(_url,init)=>{if(++calls===2)source.headers.Authorization='changed';return response(large,init);});
  await assert.rejects(inspectRemoteFastSource(source,base,new AbortController().signal),{code:'SOURCE_CHANGED'});assert.equal(calls,2);
});
test('cancellation closes an uncooperative metadata request and discards late success',async t=>{
  location(t);let started,release;const active=new Promise(resolve=>{started=resolve;});
  t.mock.method(globalThis,'fetch',(_url,init)=>{started();return new Promise(resolve=>{release=()=>resolve(response(small,init));});});
  const controller=new AbortController(),pending=inspectRemoteFastSource({url:'https://media.test/movie'},base,controller.signal),reason=new DOMException('Open replaced','AbortError');
  await active;controller.abort(reason);await assert.rejects(pending,error=>error===reason);release();
});
test('unrecognized bytes remain incomplete and do not assert subtitle absence',async t=>{
  location(t);t.mock.method(globalThis,'fetch',async(_url,init)=>response(new Uint8Array(512),init));
  const result=await inspectRemoteFastSource({url:'https://media.test/movie'},base,new AbortController().signal);
  assert.notEqual(result.status,'satisfied');assert.equal(result.evidence,undefined);
});

test('known QuickTime AAC v1 metadata preserves type-scoped IDs while unsupported layouts remain incomplete',async t=>{
 location(t);const bytes=await fixture(8,{mov:true,audio:true});
 t.mock.method(globalThis,'fetch',async(_url,init)=>response(bytes,init));
 const result=await inspectRemoteFastSource({url:'https://media.test/movie'},base,new AbortController().signal);
 assert.equal(result.status,'satisfied');assert.deepEqual(result.evidence.tracks.map(track=>[track.type,track.id]),[['video','1'],['audio','1']]);assert.equal(result.evidence.tracks[1].sampleRate,48000);
 for(const version of [1,2]){
  const changed=bytes.slice(),at=Buffer.from(changed).indexOf('mp4a');assert.ok(at>0);const view=new DataView(changed.buffer);view.setUint16(at+12,version);if(version===1)view.setUint32(at+32,1);
  t.mock.method(globalThis,'fetch',async(_url,init)=>response(changed,init));
  const declined=await inspectRemoteFastSource({url:'https://media.test/movie'},base,new AbortController().signal);assert.notEqual(declined.status,'satisfied');assert.equal(declined.evidence,undefined);
 }
});
