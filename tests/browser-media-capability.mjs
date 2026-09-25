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
test('Matroska negative syntax stays unknown while exact MSE negatives reject',()=>{
 const result=nativeBrowserCapabilities(probe([video,{...audio,codec:'ac3',codecString:'ac-3'}]),'auto',browser);
 for(const kind of ['direct','remux']){assert.equal(result[kind].status,kind==='direct'?'unknown':'unsupported');assert.ok(result[kind].queries.some(q=>q.mime.includes('ac-3')));}
 assert.equal(result.flac.status,'supported');assert.equal(result.opus.status,'supported');
});
test('selection, disabled audio and attached pictures define the capability request',()=>{
 const tracks=[{...video,attachedPicture:true,codecString:'unsupported'},video,audio,{...audio,index:2,id:'2',default:false,codec:'ac3',codecString:'ac-3'}];
 assert.equal(nativeBrowserCapabilities(probe(tracks),'auto',browser).direct.status,'supported');
 assert.equal(nativeBrowserCapabilities(probe(tracks),'2',browser).direct.status,'unknown');
 const muted=nativeBrowserCapabilities(probe(tracks),'no',browser).direct;
 assert.equal(muted.status,'supported');assert.deepEqual(muted.tracks.map(t=>t.index),[0]);
});
test('browser answers, not browser name or a codec allowlist, determine support',()=>{
 const ac3=probe([video,{...audio,codec:'ac3',codecString:'ac-3'}]);
 assert.equal(nativeBrowserCapabilities(ac3,'auto',{canPlayType:()=> 'probably',isTypeSupported:()=>true}).direct.status,'supported');
 assert.equal(nativeBrowserCapabilities(probe(),'auto',{canPlayType:()=> '',isTypeSupported:()=>false}).direct.status,'unknown');
});
test('source container and remux destination are queried separately',()=>{
 const result=nativeBrowserCapabilities(probe(),'auto',{canPlayType:()=>'',isTypeSupported:mime=>mime.startsWith('video/mp4')});
 assert.equal(result.direct.status,'unknown');assert.equal(result.remux.status,'supported');
 assert.ok(result.direct.queries.every(q=>/^video\/(?:x-)?matroska/.test(q.mime)));
 assert.ok(result.remux.queries.every(q=>q.mime.startsWith('video/mp4')));
});
test('combined negatives reject MSE but unqualified Matroska remains unknown',()=>{
 const result=nativeBrowserCapabilities(probe(),'auto',{canPlayType:mime=>mime.includes(',')?'':'probably',isTypeSupported:mime=>!mime.includes(',')});
 assert.equal(result.direct.status,'unknown');assert.equal(result.remux.status,'unsupported');
});
test('incomplete selected configuration keeps negative partial queries inconclusive',()=>{
 const result=nativeBrowserCapabilities(probe([{...video,codecString:undefined},{...audio,codec:'ac3',codecString:'ac-3'}]),'auto',browser);
 assert.equal(result.direct.status,'unknown');assert.equal(result.remux.status,'unknown');
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
 const result=nativeBrowserCapabilities(probe([{...video,codec:'vp8',codecString:'vp8'},{...audio,codec:'opus',codecString:'opus'}],'webm'),'auto',{canPlayType:()=> 'probably',isTypeSupported:mime=>mime.startsWith('video/webm')});
 assert.equal(result.remux.status,'supported');
});
test('browser AC3 support does not override the packet-copy initialization limit',()=>{
 const source=probe([video,{...audio,codec:'ac3',codecString:'ac-3'}]);
 assert.match(remuxRejection(source,{aid:'auto'}),/AC3 initialization/);
 assert.match(remuxRejection(source,{aid:'no'}),/AC3 initialization/);
 assert.equal(remuxRejection(probe([video,audio,{...audio,id:'2',index:2,codec:'ac3',codecString:'ac-3',default:false}]),{aid:'auto'}),undefined);
});
test('local EBML DocType distinguishes actual WebM from the shared Matroska demuxer name',async()=>{
 for(const name of ['webm','matroska']){
  const data=Uint8Array.from([0x1a,0x45,0xdf,0xa3,0x80+3+name.length,0x42,0x82,0x80+name.length,...new TextEncoder().encode(name)]);
  assert.equal(await localContainerFormat(new Blob([data]),'matroska,webm'),name);
 }
 assert.equal(await localContainerFormat(new Blob(['invalid']),'matroska,webm'),'matroska,webm');
});
test('codec families without inspected configuration stay unknown instead of querying guessed profiles',()=>{
 for(const codec of ['dts','future-audio']){
  const source=probe([video,{...audio,codec,aacObject:undefined}]);
  const result=nativeBrowserCapabilities(source,'auto',browser);
  assert.equal(result.direct.status,'unknown');
  assert.equal(result.direct.unqueriedAudio,true);
  assert.deepEqual(result.direct.queries.map(q=>q.mime),['video/matroska; codecs="avc1.640028"','video/x-matroska; codecs="avc1.640028"']);
 }
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
 assert.equal(wav.unqueriedAudio,true);assert.equal(wav.status,'unknown');assert.equal(wav.queries[0].mime,'audio/wav; codecs="1"');
});

test('PCM family tokens stay incomplete for both positive and negative answers',()=>{
 const source=probe([video,{...audio,codec:'pcm_s24le',bits:24,sampleRate:48000,channels:2}]);
 const yes=nativeBrowserCapabilities(source,'auto',browser);
 assert.equal(yes.direct.status,'unknown');assert.equal(yes.direct.unqueriedAudio,true);
 assert.ok(yes.direct.queries.some(q=>q.mime==='video/x-matroska; codecs="1"'));
 assert.equal(yes.remux.status,'unknown');assert.equal(yes.remux.unqueriedAudio,true);
 const no=nativeBrowserCapabilities(source,'auto',{canPlayType:()=>'',isTypeSupported:()=>false});
 assert.equal(no.direct.status,'unknown');
});

test('Matroska aliases and inconclusive answers cannot be collapsed into rejection',()=>{
 for(const positive of ['probably','maybe']){
  const result=nativeBrowserCapabilities(probe(),'auto',{canPlayType:m=>m.startsWith('video/x-')?'':positive});
  assert.equal(result.direct.status,positive==='probably'?'supported':'unknown');
 }
 const result=nativeBrowserCapabilities(probe(),'auto',{canPlayType:()=> 'probably',isTypeSupported:()=>false});
 assert.equal(result.direct.status,'supported');assert.equal(result.remux.status,'unsupported');
});

test('query validity is distinct from complete metadata',()=>{
 const negative={canPlayType:()=>'',isTypeSupported:()=>false};
 const mkv=nativeBrowserCapabilities(probe(),'auto',negative).direct;
 assert.ok(mkv.tracks.every(t=>t.serializationComplete));assert.equal(mkv.status,'unknown');
 assert.ok(mkv.queries.every(q=>q.adapter==='matroska-direct'&&!q.negativeDecisive));
 const mp4=nativeBrowserCapabilities(probe(undefined,'mp4'),'auto',negative).direct;
 assert.equal(mp4.status,'unsupported');assert.ok(mp4.queries.every(q=>q.negativeDecisive));
});
