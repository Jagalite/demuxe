// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {NativePlayer} from '../web/generated/internal/native-player.js';

for(const plan of ['native-video-mpv-audio','native-video-mpv-audio-subtitles','native-remux-mpv']){
 test(`${plan} shares inspected URL policy with remux and services`,async t=>{
  const prior=Object.getOwnPropertyDescriptor(globalThis,'location');
  Object.defineProperty(globalThis,'location',{value:{href:'https://media.example/player'},configurable:true});
  t.after(()=>{if(prior)Object.defineProperty(globalThis,'location',prior);else delete globalThis.location;});
  const identity={size:'12345',etag:'"original"'};
  const source={url:'/movie.mkv',format:'file',identity,headers:{Authorization:'Bearer original'},
   credentials:'omit',allowedOrigins:['https://media.example'],refreshAuthorization:async()=>({headers:{Authorization:'Bearer renewed'}})};
  let preparation,services;
  const player=Object.create(NativePlayer.prototype);
  Object.assign(player,{requestedPlan:plan,initialAudioTrack:3,video:{},assertActive(){},
   async loadPlan(input,direct,required){preparation={input,required};},
   async openServices(input){services=input;}});
  await player.openRemote(source);
  assert.equal(preparation.required,true);
  assert.equal(preparation.input.videoOnly,plan.startsWith('native-video-mpv-audio'));
  assert.equal(preparation.input.audioTrack,3);
  assert.deepEqual(preparation.input.options,{...source,url:'https://media.example/movie.mkv'});
  assert.deepEqual(services,preparation.input.options);
  assert.equal(services.identity,identity);
  assert.equal(services.refreshAuthorization,source.refreshAuthorization);
 });
}
test('failed video preparation does not start independent services',async t=>{
 const prior=Object.getOwnPropertyDescriptor(globalThis,'location');
 Object.defineProperty(globalThis,'location',{value:{href:'https://media.example/player'},configurable:true});
 t.after(()=>{if(prior)Object.defineProperty(globalThis,'location',prior);else delete globalThis.location;});
 const player=Object.create(NativePlayer.prototype),failure=Error('Source transport: Media representation changed');
 let services=false;
 Object.assign(player,{requestedPlan:'native-video-mpv-audio',video:{},assertActive(){},
  async loadPlan(){throw failure;},async openServices(){services=true;}});
 await assert.rejects(player.openRemote({url:'/movie.mkv'}),error=>error===failure);
 assert.equal(services,false);
});

// Exercise the real service's ownership checks and the Auto classifier, without
// replacing transport failures with a generic decoder failure.
for(const [label,tracks,stream] of [
 ['missing selected stream',[{id:'2',type:'audio','ff-index':1,selected:true}],3],
 ['unexpected video owner',[{id:'1',type:'video',selected:true},{id:'2',type:'audio',selected:true}],undefined],
 ['missing audio owner',[{id:'2',type:'audio',selected:false}],undefined],
]){
 test(`URL selective audio ${label} admits compatibility fallback`,async()=>{
  const {NativeMpvAudio}=await import('../web/generated/internal/native-mpv-audio.js');
  const {compatibilityFailure}=await import('../web/generated/internal/runtime-capability.js');
  const service=Object.create(NativeMpvAudio.prototype);
  service.engine={ready:Promise.resolve(),selectiveAudioState:()=>({}),command:async()=>{},
   openRemote:async()=>{},inspectMetadata:async()=>{},properties:new Map([['track-list',tracks]])};
  await assert.rejects(service.open({url:'https://media.example/movie.mkv'},stream),error=>
   error.code==='DECODE_FAILED'&&compatibilityFailure(error));
 });
}
for(const message of ['Source transport: HTTP 403','Source transport: Media representation changed','Source transport: Media read retry deadline exceeded']){
 test(`URL selective audio preserves terminal failure: ${message}`,async()=>{
  const {NativeMpvAudio}=await import('../web/generated/internal/native-mpv-audio.js');
  const {compatibilityFailure}=await import('../web/generated/internal/runtime-capability.js');
  const failure=Error(message),service=Object.create(NativeMpvAudio.prototype);
  service.engine={ready:Promise.resolve(),selectiveAudioState:()=>({}),command:async()=>{},openRemote:async()=>{throw failure;}};
  await assert.rejects(service.open({url:'https://media.example/movie.mkv'}),error=>error===failure&&!compatibilityFailure(error));
 });
}
for(const name of ['AbortError','NotAllowedError']){
 test(`URL selective audio preserves ${name}`,async()=>{
  const {NativeMpvAudio}=await import('../web/generated/internal/native-mpv-audio.js');
  const {compatibilityFailure}=await import('../web/generated/internal/runtime-capability.js');
  const failure=new DOMException(name,name),service=Object.create(NativeMpvAudio.prototype);
  service.engine={ready:Promise.resolve(),selectiveAudioState:()=>({}),command:async()=>{},openRemote:async()=>{throw failure;}};
  await assert.rejects(service.open({url:'https://media.example/movie.mkv'}),error=>error===failure&&!compatibilityFailure(error));
 });
}
