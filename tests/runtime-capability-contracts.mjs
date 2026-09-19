// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';
import {RuntimeCapabilities,compatibilityFailure,nativeMediaError} from '../web/generated/internal/runtime-capability.js';
import {PlayerError} from '../web/generated/internal/errors.js';
import {nativeRejection,remuxRejection} from '../web/generated/internal/selection.js';
test('successful cached evidence never bypasses startup, and source identities are isolated',()=>{
 const cache=new RuntimeCapabilities(),a={},b={},plans=[{id:'native-direct',eligible:true},{id:'software',eligible:false,reason:'isolation'}];
 cache.begin(a,plans);const id=cache.snapshot()[0].sourceIdentity;
 cache.update('native-direct','probing');assert.equal(cache.snapshot()[0].state,'probing');
 cache.update('native-direct','verified',{decoderOutput:true});cache.begin(a,plans);
 assert.equal(cache.snapshot()[0].state,'untested');assert.equal(cache.snapshot()[0].previouslyVerified,true);
 cache.begin(b,plans);assert.notEqual(cache.snapshot()[0].sourceIdentity,id);assert.equal(cache.snapshot()[0].previouslyVerified,false);
 cache.update('software','verified');assert.equal(cache.snapshot()[1].state,'untested');
 for(let i=0;i<40;i++){cache.begin({},plans);cache.update('native-direct','verified');}assert.equal(cache.verified.size,32);
 cache.clear();assert.deepEqual(cache.snapshot(),[]);assert.equal(cache.verified.size,0);
});
test('transport, source identity, assets, permission, timeout, unknown and cancellation never become codec fallback',()=>{
 for(const error of [new Error('Source transport: HTTP 403'),new Error('representation changed'),new Error('integrity mismatch'),new Error('Source identity mismatch'),new Error('Native loadeddata timed out'),new Error('Unknown unexpected failure'),new Error('fetch module failed'),new DOMException('No','NotAllowedError'),new DOMException('Cancel','AbortError'),new PlayerError('SOURCE_CHANGED','Decoder failed')])assert.equal(compatibilityFailure(error),false,String(error));
 for(const code of [3,4])assert.equal(compatibilityFailure(nativeMediaError({code,message:'decode failed'})),true);
 for(const code of [1,2])assert.equal(compatibilityFailure(nativeMediaError({code,message:'media error'})),false);
 assert.equal(compatibilityFailure(new Error('Audio codec has no browser MP4 packet contract')),true);
});
test('PCM24 lacks packet-copy construction without losing direct browser eligibility',()=>{
 const probe={tracks:[{id:'1',type:'video',codec:'h264'},{id:'1',type:'audio',codec:'pcm_s24le',channels:2,sampleRate:48000}],duration:90};
 const settings={aid:'auto',sid:'no',subtitles:false};
 assert.equal(nativeRejection(probe,settings),undefined);assert.match(remuxRejection(probe,settings),/construction contract/);
});

test('known preparation limits permit fallback without weakening terminal failures',()=>{
 const messages=['Remux random-access interval exceeds fragment production budget','Remux timeline gap exceeds forward buffer budget','Adapted track timelines cannot progress within the preparation budget; use Hybrid'];
 for(const message of messages){
  assert.equal(compatibilityFailure(new Error(message)),true);
  assert.equal(compatibilityFailure(new Error(message+'\n    at worker')),true);
  assert.equal(compatibilityFailure(new PlayerError('SOURCE_CHANGED',message)),false);
  assert.equal(compatibilityFailure(new Error('Source transport: '+message)),false);
 }
 assert.equal(compatibilityFailure(new PlayerError('UNSUPPORTED_TIMELINE','Qualified timeline cannot be preserved')),true);
 assert.equal(compatibilityFailure(new Error('Unknown resource budget exceeded')),false);
});

test('TS construction limits never veto direct playback or block runtime fallback',()=>{
 const probe={format:'mpegts',duration:12,tracks:[{id:'1',type:'video',codec:'hevc'},{id:'2',type:'audio',codec:'aac'}]};
 assert.equal(nativeRejection(probe,{aid:'auto',sid:'no',subtitles:false}),undefined);
 assert.match(remuxRejection(probe,{aid:'auto'}),/TS timestamp-repair construction/);
 assert.equal(compatibilityFailure(new Error('FFmpeg error -1094995529: TS timestamp repair requires AVC with optional AAC audio')),true);
 assert.equal(compatibilityFailure(new Error('Source transport: FFmpeg error -1094995529: TS timestamp repair requires AVC with optional AAC audio')),false);
 assert.equal(compatibilityFailure(new Error('FFmpeg error -1: Unknown failure')),false);
 probe.tracks[0].codec='h264';assert.equal(remuxRejection(probe,{aid:'auto'}),undefined);
});
