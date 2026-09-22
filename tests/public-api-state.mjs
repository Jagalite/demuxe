// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';
import {playerError,redact} from '../web/generated/internal/errors.js';import {ranges,cachedRanges,tracks,mediaInfo,freeze} from '../web/generated/internal/state.js';
test('runtime Wasm abort is asset failure; user AbortError is cancellation',()=>{assert.equal(playerError(Error('Aborted(both async and sync fetching of the wasm failed)')).code,'ASSET_LOAD_FAILED');assert.equal(playerError(new DOMException('Aborted','AbortError')).code,'ABORTED');assert.equal(playerError(new DOMException('play() failed','NotAllowedError')).code,'AUTOPLAY_BLOCKED');});
test('unknown ranges are distinct from known empty and invalid ranges remain unknown',()=>{assert.equal(ranges(undefined),null);assert.deepEqual(ranges([]),[]);assert.equal(ranges([{start:5,end:4}]),null);assert.deepEqual(ranges([{start:20,end:40}]),[{start:20,end:40}]);});
test('packet cache coverage clips negative preroll and preserves disjoint ranges and unknown state',()=>{
 assert.deepEqual(cachedRanges([{start:-.021,end:11.9895},{start:30,end:40}]),[{start:0,end:11.9895},{start:30,end:40}]);
 assert.deepEqual(cachedRanges([{start:-1,end:-.1}]),[]);assert.deepEqual(cachedRanges([]),[]);
 for(const value of [undefined,null,[null],[{start:5,end:4}],[{start:0,end:Infinity}]])assert.equal(cachedRanges(value),null);
});
test('normal diagnostics redact auth, userinfo, signed queries and fragments',()=>{const d=redact({headers:{Authorization:'Bearer SECRET'},url:'https://name:password@example.com/media?X-Amz-Signature=SECRET#private',message:'Bearer SECRET'});assert.ok(!JSON.stringify(d).includes('SECRET'));assert.ok(!JSON.stringify(d).includes('password'));assert.equal(d.url,'https://example.com/media?[redacted]');});
test('display geometry resolves Hybrid timing placeholders and anamorphic rotation',()=>{const raw={id:'1',type:'video',selected:true,'ff-index':0,'demux-w':720,'demux-h':576,'demux-par':16/15,'demux-rotation':90};const properties=new Map([['video-params',{w:2,h:2,dw:2,dh:2}],['track-list',[raw]]]);const list=tracks([raw],1,'hybrid');const info=mediaInfo(properties,'hybrid',undefined,list);assert.ok(Math.abs(info.aspectRatio-.75)<.00001);assert.equal(info.rotation,90);assert.equal(info.video.id,'1:video:stream:0');});
test('track identities are source scoped and compatible across mpv engines',()=>{const raw=[{id:'2',type:'audio','ff-index':3,lang:'jpn',selected:true}];assert.equal(tracks(raw,1,'hybrid')[0].id,tracks(raw,1,'software')[0].id);assert.notEqual(tracks(raw,1,'hybrid')[0].id,tracks(raw,2,'hybrid')[0].id);const state=freeze({tracks:tracks(raw,1,'hybrid')});assert.throws(()=>state.tracks[0].label='bad');});
test('external subtitle demuxers do not alias one another or embedded stream IDs',()=>{
 const raw=[{id:'1',type:'sub','ff-index':0},{id:'2',type:'sub',external:true,'ff-index':0},{id:'3',type:'sub',external:true,'ff-index':0}];
 const hybrid=tracks(raw,1,'hybrid'),software=tracks(raw,1,'software');
 assert.equal(new Set(hybrid.map(t=>t.id)).size,3);assert.deepEqual(hybrid.map(t=>t.id),software.map(t=>t.id));
});
test('multi-track labels retain language, title and file dispositions without changing selection',()=>{
 const raw=[{id:'1',type:'audio',lang:'jpn',title:'2.0 FLAC',codec:'flac',default:true,selected:true},{id:'2',type:'audio',lang:'eng',title:'2.0 FLAC',codec:'flac',selected:false},{id:'1',type:'sub',lang:'eng',title:'Signs & Songs',codec:'ass',default:true,selected:true},{id:'2',type:'sub',lang:'eng',title:'Dialogue',codec:'ass',selected:false},{id:'3',type:'sub',lang:'fra',title:'Forced dialogue',forced:true}];
 const list=tracks(raw,1,'hybrid');
 assert.deepEqual(list.map(t=>t.label),['Japanese · 2.0 FLAC · File default','English · 2.0 FLAC','English · Signs & Songs · ASS · File default','English · Dialogue · ASS','French · Forced dialogue · Forced']);
 assert.deepEqual(list.map(t=>t.selected),[true,false,true,false,false]);
 assert.equal(list[0].language,'jpn');
});
test('missing or duplicate metadata remains distinguishable without inventing languages or layouts',()=>{
 const raw=[{id:'1',type:'audio',title:'2.0 FLAC',codec:'flac'},{id:'2',type:'audio',title:'2.0 FLAC',codec:'flac'},{id:'3',type:'audio',lang:'und',codec:'aac',channels:6},{id:'1',type:'sub',lang:'not_a_valid_language!'},{id:'2',type:'sub'}];
 const list=tracks(raw,3,'native','remux');
 assert.deepEqual(list.map(t=>t.label),['2.0 FLAC · Track 1','2.0 FLAC · Track 2','AAC · 6 channels','not_a_valid_language!','Subtitle 2']);
 assert.notEqual(list[0].id,list[1].id);
});
test('known language titles avoid repetition and labels survive backend switches',()=>{
 const raw=[{id:'1',type:'audio',title:'English commentary',lang:'eng',codec:'aac','demux-channel-count':2,'ff-index':1},{id:'1',type:'sub',title:'English SDH',lang:'en','ff-index':2}];
 assert.deepEqual(tracks(raw,4,'hybrid').map(t=>t.label),['English commentary · AAC · Stereo','English SDH']);
 assert.deepEqual(tracks(raw,4,'hybrid'),tracks(raw,4,'software'));
});
