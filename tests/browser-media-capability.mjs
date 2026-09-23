// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeBrowserCapabilities} from '../web/generated/internal/browser-media-capability.js';
import {remuxRejection} from '../web/generated/internal/selection.js';
import {localContainerFormat} from '../web/source-probe.js';
const video={index:0,id:'1',type:'video',codec:'h264',codecString:'avc1.640028'};
const audio={index:1,id:'1',type:'audio',codec:'aac',aacObject:2,default:true};
const probe=(tracks=[video,audio],format='matroska,webm')=>({tracks,format,duration:10});
const browser={canPlayType:mime=>mime.includes('ac-3')?'':'probably',isTypeSupported:mime=>!mime.includes('ac-3')};
test('selected unsupported audio excludes both direct and packet-copy Native before loading',()=>{
 const result=nativeBrowserCapabilities(probe([video,{...audio,codec:'ac3'}]),'auto',browser);
 for(const kind of ['direct','remux']){assert.equal(result[kind].status,'unsupported');assert.match(result[kind].reason,/ac-3/);assert.ok(result[kind].queries.some(q=>q.mime.includes('ac-3')));}
 assert.equal(result.flac.status,'supported');assert.equal(result.opus.status,'supported');
});
test('selection, disabled audio and attached pictures define the capability request',()=>{
 const tracks=[{...video,attachedPicture:true,codecString:'unsupported'},video,audio,{...audio,index:2,id:'2',default:false,codec:'ac3'}];
 assert.equal(nativeBrowserCapabilities(probe(tracks),'auto',browser).direct.status,'supported');
 assert.equal(nativeBrowserCapabilities(probe(tracks),'2',browser).direct.status,'unsupported');
 const muted=nativeBrowserCapabilities(probe(tracks),'no',browser).direct;
 assert.equal(muted.status,'supported');assert.deepEqual(muted.tracks.map(t=>t.index),[0]);
});
test('browser answers, not browser name or a codec allowlist, determine support',()=>{
 const ac3=probe([video,{...audio,codec:'ac3'}]);
 assert.equal(nativeBrowserCapabilities(ac3,'auto',{canPlayType:()=> 'probably',isTypeSupported:()=>true}).direct.status,'supported');
 assert.equal(nativeBrowserCapabilities(probe(),'auto',{canPlayType:()=> '',isTypeSupported:()=>false}).direct.status,'unsupported');
});
test('source container and remux destination are queried separately',()=>{
 const result=nativeBrowserCapabilities(probe(),'auto',{canPlayType:()=>'',isTypeSupported:mime=>mime.startsWith('video/mp4')});
 assert.equal(result.direct.status,'unsupported');assert.equal(result.remux.status,'supported');
 assert.ok(result.direct.queries.every(q=>q.mime.startsWith('video/x-matroska')));
 assert.ok(result.remux.queries.every(q=>q.mime.startsWith('video/mp4')));
});
test('combined codec rejection excludes a route even when individual codecs are accepted',()=>{
 const result=nativeBrowserCapabilities(probe(),'auto',{canPlayType:mime=>mime.includes(',')?'':'probably',isTypeSupported:mime=>!mime.includes(',')});
 assert.equal(result.direct.status,'unsupported');assert.equal(result.remux.status,'unsupported');
});
test('incomplete video configuration does not conceal a known unsupported audio track',()=>{
 const result=nativeBrowserCapabilities(probe([{...video,codecString:undefined},{...audio,codec:'ac3'}]),'auto',browser);
 assert.equal(result.direct.status,'unsupported');assert.equal(result.remux.status,'unsupported');
});
test('unknown configuration, missing APIs, exceptions and maybe never claim support',()=>{
 assert.equal(nativeBrowserCapabilities(probe([{...video,codecString:undefined},audio]),'auto',browser).direct.status,'unknown');
 assert.equal(nativeBrowserCapabilities(probe(),'auto',{canPlayType:()=> 'maybe'}).direct.status,'unknown');
 assert.equal(nativeBrowserCapabilities(probe(),'auto',{canPlayType:()=> {throw Error('unavailable');}}).direct.status,'unknown');
 assert.equal(nativeBrowserCapabilities(probe(),'auto',{canPlayType:()=> 'probably'}).remux.status,'unknown');
 assert.equal(nativeBrowserCapabilities(probe(undefined,'unmapped'),'auto',browser).direct.status,'unknown');
});
test('exact source profiles and AAC object type are preserved in requests',()=>{
 const result=nativeBrowserCapabilities(probe([{...video,codecString:'avc1.6e0033'},{...audio,aacObject:5}],'mov,mp4'),'auto',browser);
 assert.ok(result.direct.queries.some(q=>q.mime==='video/mp4; codecs="avc1.6e0033,mp4a.40.5"'));
});
test('WebM-only MSE support remains eligible when MP4 packaging is rejected',()=>{
 const result=nativeBrowserCapabilities(probe([{...video,codec:'vp8',codecString:undefined},{...audio,codec:'opus'}],'webm'),'auto',{canPlayType:()=> 'probably',isTypeSupported:mime=>mime.startsWith('video/webm')});
 assert.equal(result.remux.status,'supported');
});
test('browser AC3 support does not override the packet-copy initialization limit',()=>{
 const source=probe([video,{...audio,codec:'ac3'}]);
 assert.match(remuxRejection(source,{aid:'auto'}),/AC3 initialization/);
 assert.match(remuxRejection(source,{aid:'no'}),/AC3 initialization/);
 assert.equal(remuxRejection(probe([video,audio,{...audio,id:'2',index:2,codec:'ac3',default:false}]),{aid:'auto'}),undefined);
});
test('local EBML DocType distinguishes actual WebM from the shared Matroska demuxer name',async()=>{
 for(const name of ['webm','matroska']){
  const data=Uint8Array.from([0x1a,0x45,0xdf,0xa3,0x80+3+name.length,0x42,0x82,0x80+name.length,...new TextEncoder().encode(name)]);
  assert.equal(await localContainerFormat(new Blob([data]),'matroska,webm'),name);
 }
 assert.equal(await localContainerFormat(new Blob(['invalid']),'matroska,webm'),'matroska,webm');
});
test('DTS family is queried instead of accepting video-only capability evidence',()=>{
 const source=probe([video,{...audio,codec:'dts'}]);
 const denied={canPlayType:m=>m.includes('dts')?'':'probably',isTypeSupported:m=>!m.includes('dts')};
 const result=nativeBrowserCapabilities(source,'auto',denied);
 assert.equal(result.direct.status,'unsupported');assert.equal(result.remux.status,'unsupported');
 for(const variant of ['dtsc','dtsh','dtsl','dtse','dtsx','dtsy'])assert.ok(result.direct.queries.some(q=>q.mime.includes(variant)));
 assert.equal(result.direct.unqueriedAudio,false);
 const ambiguous=nativeBrowserCapabilities(source,'auto',{canPlayType:m=>m.includes('dts')&&!m.includes('dtsc')?'':'probably'});
 assert.equal(ambiguous.direct.status,'unknown','Core-only support cannot certify an unknown DTS-HD profile');
 assert.equal(ambiguous.direct.tracks.find(t=>t.type==='audio').codecString,undefined);
});
test('raw FLAC and ADTS use bare MIME queries while MP4 keeps codec parameters',()=>{
 for(const [format,name,mime] of [['flac','flac','audio/flac'],['aac','aac','audio/aac']]){
  const queries=[];
  const result=nativeBrowserCapabilities(probe([{...audio,codec:name,aacObject:0}],format),'auto',{canPlayType:m=>{queries.push(m);return m===mime?'probably':'';}});
  assert.equal(result.direct.status,'supported');assert.deepEqual(queries,[mime]);assert.equal(result.direct.unqueriedAudio,false);
 }
 assert.ok(nativeBrowserCapabilities(probe([audio],'mp4'),'auto',browser).direct.queries.some(q=>q.mime==='audio/mp4; codecs="mp4a.40.2"'));
});
test('an unmapped selected audio track is explicitly unqueried; disabling it removes the requirement',()=>{
 const source=probe([video,{...audio,codec:'future-audio'}]);
 assert.equal(nativeBrowserCapabilities(source,'auto',browser).direct.unqueriedAudio,true);
 assert.equal(nativeBrowserCapabilities(source,'no',browser).direct.unqueriedAudio,false);
 const wav=nativeBrowserCapabilities(probe([{...audio,codec:'pcm_s16le'}],'wav'),'auto',browser).direct;
 assert.equal(wav.unqueriedAudio,false);assert.equal(wav.queries[0].mime,'audio/wav; codecs="1"');
});
