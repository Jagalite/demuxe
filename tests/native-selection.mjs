// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';
import {nativeRejection,nativeManifestRejection} from '../web/generated/internal/selection.js';
const settings={aid:'auto',sid:'auto',subtitles:true};
const v={id:'1',index:0,type:'video',codec:'h264'},a={id:'1',index:1,type:'audio',codec:'aac',aacObject:2,default:true};
const reason=(tracks,s={})=>nativeRejection({tracks,duration:10},{...settings,...s});
test('unknown Native audio mapping is not browser incompatibility, including PCM24 regression',()=>{
 for(const codec of ['pcm_s24le','dts','future-codec'])assert.equal(reason([v,{...a,codec,channels:2,sampleRate:48000}]),undefined);
 assert.equal(reason([v,{...a,aacObject:0}]),undefined);
});
test('semantic admission checks selected tracks, not a static browser codec table',()=>{
 const other={...a,id:'2',index:2,codec:'dts'};
 assert.equal(reason([v,a,other],{aid:'2'}),undefined);
 assert.match(reason([v,a],{aid:'3'}),/not found/);
 assert.match(reason([]),/No selected/);
});
test('required embedded subtitles remain a hard gate',()=>{
 const sub={id:'1',index:2,type:'sub',codec:'ass'};
 assert.match(reason([v,a,sub]),/subtitles/);
 assert.equal(reason([v,a,sub],{subtitles:false}),undefined);
 assert.equal(reason([v,a,sub],{sid:'no'}),undefined);
});
test('negative browser hints and unknown AAC configuration cannot veto direct discovery',()=>{
 const browser={canPlayType:()=>{throw Error('Semantic admission must not query the browser');}};
 assert.equal(nativeRejection({tracks:[v,a],duration:1},settings,browser),undefined);
 assert.equal(nativeRejection({tracks:[v,{...a,aacObject:0}],duration:1},settings,{canPlayType:()=>''}),undefined);
});

test('HLS VOD permits a direct runtime trial without bypassing manifest requirements',()=>{
 const source={url:'https://media.test/video.m3u8',format:'hls'};
 assert.equal(nativeManifestRejection(source,settings),undefined);
 assert.equal(nativeManifestRejection({...source,streaming:{live:false}},settings),undefined);
 assert.equal(nativeManifestRejection(source,{...settings,aid:'no',sid:'no'}),undefined);
 for(const extra of [{format:'dash'},{demuxer:'hls'},{streaming:{live:true}},{streaming:{maxBandwidth:1000000}},{streaming:{representation:'low'}}]){
  assert.match(nativeManifestRejection({...source,...extra},settings),/mpv inspection/);
 }
 assert.match(nativeManifestRejection(source,{...settings,aid:'2'}),/track selection/);
 assert.match(nativeManifestRejection(source,{...settings,sid:'2'}),/track selection/);
});
