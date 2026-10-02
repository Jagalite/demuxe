// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialShakaBackend,transitionShakaBackend} from '../../web/generated/internal/machine/shaka-backend.js';
import {shakaAudioCatalog,shakaRequestedAudio,shakaSelectAudio,shakaInitialRepresentation,shakaSelectText,shakaExpectedOutput} from '../../web/generated/internal/machine/shaka-selection.js';
import {ShakaBackend} from '../../web/generated/internal/shaka-backend.js';
const state=(source={format:'dash',live:false})=>transitionShakaBackend(initialShakaBackend({preload:'auto',profile:'balanced'}),{type:'open',source}).state;
const audio=(extra={})=>({language:'en',originalLanguage:'en',label:'English',roles:[],spatialAudio:false,accessibilityPurpose:null,channelsCount:2,codecs:'aac',active:true,...extra});
const variant=(extra={})=>({id:4,active:true,audioLanguage:'en',originalLanguage:'en',label:'English',audioRoles:[],spatialAudio:false,accessibilityPurpose:null,channelsCount:2,audioCodec:'aac',videoCodec:'avc1',originalVideoId:'video',bandwidth:900000,height:720,...extra});
test('public audio identity excludes metadata learned only after selection',()=>{
 const one=audio(),two=audio({channelsCount:6,codecs:'ac3',active:false});assert.equal(shakaAudioCatalog([one])[0].id,shakaAudioCatalog([two])[0].id);assert.equal(shakaAudioCatalog([one])[0].id,'shaka-audio-'+encodeURIComponent(JSON.stringify(['en','en','English',[],false,null])));
});
test('ambiguous public identity rejects explicit selection while unique active auto remains permitted',()=>{
 const tracks=[audio(),audio({active:false})],catalog=shakaAudioCatalog(tracks);assert.ok(catalog.every(x=>x.ambiguous));assert.notEqual(catalog[0].id,catalog[1].id);assert.deepEqual(shakaRequestedAudio(tracks,catalog[0].id),{kind:'failure',reason:'identity'});assert.deepEqual(shakaRequestedAudio(tracks,'auto'),{kind:'selected',index:0});assert.deepEqual(shakaRequestedAudio(tracks.map(x=>({...x,active:true})),'auto'),{kind:'failure',reason:'identity'});
});
test('off and empty auto admission do not require variant facts',()=>{
 assert.deepEqual(shakaSelectAudio(state(),[],[],'no'),{kind:'disabled'});assert.deepEqual(shakaSelectAudio(state(),[],[],'auto'),{kind:'empty'});assert.deepEqual(shakaSelectAudio(state(),[],[],'missing'),{kind:'failure',reason:'identity'});
});
test('pinned audio selection requires exactly one variant satisfying channels codec and bandwidth',()=>{
 const s=state({format:'dash',live:false,representation:'video',maxBandwidth:1e6}),a=[audio()];assert.deepEqual(shakaSelectAudio(s,a,[variant()],'auto'),{kind:'variant',index:0,variant:4,commitQuality:true});for(const v of [variant({bandwidth:1000001}),variant({channelsCount:6}),variant({audioCodec:'ac3'}),variant({audioLanguage:'fr'})])assert.deepEqual(shakaSelectAudio(s,a,[v],'auto'),{kind:'failure',reason:'pin'});assert.equal(shakaSelectAudio(s,a,[variant(),variant({id:5})],'auto').kind,'failure');
});
test('runtime manual quality and automatic ceilings use the accepted policy',()=>{
 const a=[audio()],variants=[variant(),variant({id:5,height:360,bandwidth:400000})];let s={...state(),runtimeQuality:true,quality:{mode:'manual',id:'variant:5'}};assert.deepEqual(shakaSelectAudio(s,a,variants,'auto'),{kind:'variant',index:0,variant:5,commitQuality:false});s={...s,quality:{mode:'auto',maxHeight:360,maxBandwidth:500000}};assert.deepEqual(shakaSelectAudio(s,a,variants,'auto'),{kind:'audio',index:0});assert.deepEqual(shakaSelectAudio(s,a,[variants[0]],'auto'),{kind:'failure',reason:'constraints'});
});
test('default unconstrained audio selection preserves permissive legacy admission',()=>{
 assert.deepEqual(shakaSelectAudio(state(),[audio()],[],'auto'),{kind:'audio',index:0});assert.deepEqual(shakaSelectAudio(state({format:'dash',live:false,maxBandwidth:1e6}),[audio()],[],'auto'),{kind:'failure',reason:'constraints'});
});
test('initial representation preserves active audio identity and supports audio-only original IDs',()=>{
 const tracks=[variant(),variant({id:5,active:false,audioLanguage:'fr'}),variant({id:6,active:false,originalVideoId:'small'})];assert.equal(shakaInitialRepresentation(tracks,'small'),6);assert.equal(shakaInitialRepresentation(tracks,'variant:5'),null);assert.equal(shakaInitialRepresentation([variant({videoCodec:null,originalVideoId:null,originalAudioId:'audio'})],'audio'),4);
});
test('text auto and output expectations remain independent of unknown media facts',()=>{
 assert.equal(shakaSelectText([{id:1},{id:2,active:true}],'auto'),2);assert.equal(shakaSelectText([{id:1},{id:2}],'auto'),1);assert.equal(shakaSelectText([{id:1}],'shaka-sub-2'),null);assert.deepEqual(shakaExpectedOutput([variant()],false),{video:true,audio:true});assert.deepEqual(shakaExpectedOutput([variant()],true),{video:true,audio:false});assert.deepEqual(shakaExpectedOutput([],false),{video:false,audio:false});
});
test('selection plans are immutable data and never retain or freeze provider records',()=>{
 const s=state(),a=[audio()],v=[variant()],before=structuredClone({s,a,v}),result=shakaSelectAudio(s,a,v,'auto');assert.ok(Object.isFrozen(result));assert.deepEqual({s,a,v},before);assert.equal(Object.isFrozen(a[0]),false);a[0].language='fr';assert.deepEqual(result,{kind:'audio',index:0});
});
function fixture(){const backend=Object.setPrototypeOf(new EventTarget(),ShakaBackend.prototype),calls=[],tracks=[audio()],variants=[variant()];const player={getAudioTracks(){calls.push('audio');return tracks;},getVariantTracks(){calls.push('variants');return variants;},getTextTracks(){return [];},selectAudioTrack(track){calls.push('select-audio');tracks.forEach(t=>t.active=t===track);},selectVariantTrack(track){calls.push('select-variant');variants.forEach(t=>t.active=t===track);},isBuffering(){return false;},isDynamic(){return false;},seekRange(){return{start:0,end:10};},async destroy(){calls.push('destroy-shaka');}};Object.assign(backend,{control:state(),controlWaiters:new Map(),player,native:{properties:new Map(),destroy:async()=>calls.push('destroy-native')},properties:new Map(),video:{muted:false},runtimeLoad:new AbortController(),listeners:[],blobs:new Set()});return{backend,player,calls,tracks,variants};}
test('actual audio catalog retirement stops before variant observation or physical selection',async()=>{
 const f=fixture();let destroyed;f.player.getAudioTracks=()=>{f.calls.push('audio');destroyed=f.backend.destroy();return f.tracks;};await assert.rejects(f.backend.selectTrack('audio','auto'),error=>error.code==='ABORTED');await destroyed;assert.deepEqual(f.calls,['audio','destroy-shaka','destroy-native']);
});
test('actual audio fact getter retirement prevents subsequent provider observation',async()=>{
 const f=fixture();let destroyed;Object.defineProperty(f.tracks[0],'language',{get(){destroyed=f.backend.destroy();return'en';}});await assert.rejects(f.backend.selectTrack('audio','auto'),error=>error.code==='ABORTED');await destroyed;assert.equal(f.calls.includes('variants'),false);assert.equal(f.calls.includes('select-audio'),false);
});
test('actual off selection does not require provider catalogs',async()=>{
 const f=fixture();f.backend.refresh=()=>{};f.player.getAudioTracks=()=>assert.fail('unexpected audio observation');f.player.getVariantTracks=()=>assert.fail('unexpected variants');await f.backend.selectTrack('audio','no');assert.equal(f.backend.video.muted,true);assert.equal(f.backend.control.audioDisabled,true);
});
test('actual pinned selection applies planned variant and commits its quality',async()=>{
 const f=fixture();f.backend.control=state({format:'dash',live:false,representation:'video',maxBandwidth:1e6});await f.backend.selectTrack('audio','auto');assert.equal(f.calls.filter(x=>x==='select-variant').length,1);assert.deepEqual(f.backend.control.quality,{mode:'manual',id:'variant:4'});assert.equal(f.backend.video.muted,false);
});
test('second-id getter retirement cannot cause selection after owner destruction',async()=>{
 const f=fixture();f.backend.control=state({format:'dash',live:false,representation:'video'});let reads=0,destroyed;Object.defineProperty(f.variants[0],'id',{get(){if(++reads===2)destroyed=f.backend.destroy();return 4;}});await assert.rejects(f.backend.selectTrack('audio','auto'));await destroyed;assert.equal(reads,2);assert.ok(f.calls.indexOf('select-variant')<f.calls.indexOf('destroy-shaka'));assert.equal(f.calls.filter(call=>call==='select-variant').length,1);
});
test('text selection uses captured facts without a second host identity read',async()=>{
 const f=fixture();let reads=0,destroyed;const track={active:true};Object.defineProperty(track,'id',{get(){if(++reads===2)destroyed=f.backend.destroy();return 8;}});f.player.getTextTracks=()=>[track];f.player.selectTextTrack=()=>f.calls.push('select-text');f.backend.applyText();await destroyed;assert.equal(reads,1);assert.equal(destroyed,undefined);assert.deepEqual(f.calls,['select-text']);await f.backend.destroy();
});
