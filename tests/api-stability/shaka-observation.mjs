// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialShakaBackend,transitionShakaBackend} from '../../web/generated/internal/machine/shaka-backend.js';
import {shakaStreamingProjection,shakaTrackProjection,shakaSeekTarget,shakaPreviewChoice} from '../../web/generated/internal/machine/shaka-observation.js';
import {ShakaBackend} from '../../web/generated/internal/shaka-backend.js';
const state=()=>transitionShakaBackend(initialShakaBackend({preload:'auto'}),{type:'open',source:{format:'dash',live:false}}).state;
const variant=(extra={})=>({id:1,active:true,audioIdentity:'en',videoCodec:'avc1',originalVideoId:'v',originalAudioId:'a',bandwidth:100,height:720,width:1280,videoId:7,frameRate:30,audioCodec:'aac',hdr:null,...extra});
const observed={live:true,start:10,end:20,time:19,now:10000,playheadDate:7000};
test('streaming projection distinguishes selected, presented, and observed quality',()=>{
 const value=shakaStreamingProjection(state(),[variant()],observed);assert.equal(value.selectedId,'variant:1');assert.equal(value.presentedId,null);assert.equal(value.observedQuality,null);assert.equal(value.transition,'unknown');assert.equal(value.live.latencySeconds,3);assert.equal(value.live.nearLive,true);assert.deepEqual(value.live.seekable,{start:10,end:20});
});
test('streaming projection preserves audio eligibility and normalizes invalid metrics',()=>{
 const tracks=[variant({width:NaN,height:-1,frameRate:Infinity}),variant({id:2,active:false,audioIdentity:'fr'}),variant({id:3,active:false,audioIdentity:'en',height:1080})];const before=structuredClone(tracks),value=shakaStreamingProjection(state(),tracks,{...observed,playheadDate:11000});assert.deepEqual(value.qualities.map(t=>t.id),['variant:1','variant:3']);assert.equal(value.qualities[0].width,null);assert.equal(value.qualities[0].height,null);assert.equal(value.qualities[0].frameRate,null);assert.equal(value.live.latencySeconds,null);assert.deepEqual(tracks,before);
});
test('VOD and empty seek window do not imply live-edge or latency evidence',()=>{
 const value=shakaStreamingProjection(state(),[],{...observed,live:false,start:0,end:0});assert.equal(value.live.seekable,null);assert.equal(value.live.nearLive,null);assert.equal(value.live.latencySeconds,null);assert.equal(value.selectedId,null);
});
test('track projection retains stable audio identity, explicit off, and external subtitle metadata',()=>{
 const control={...state(),audioDisabled:true,selectedSub:'no',external:[{id:8,index:1,attachmentId:'attachment:1'}]},audio=[{language:'en',active:true,codecs:'aac'}],texts=[{id:8,active:true,mimeType:'text/vtt'}];
 const tracks=shakaTrackProjection(control,audio,texts,[variant()]);assert.match(tracks[0].id,/^shaka-audio-/);assert.equal(tracks[0].selected,false);assert.equal(tracks[1].selected,false);assert.equal(tracks[1]['attachment-id'],'attachment:1');assert.equal(tracks[2].id,'shaka-video-7');
});
test('seek tolerance clamps only admitted finite targets',()=>{
 assert.equal(shakaSeekTarget(10,20,9.995),10);assert.equal(shakaSeekTarget(10,20,20.005),20);assert.equal(shakaSeekTarget(10,20,9.98),null);assert.equal(shakaSeekTarget(10,20,NaN),null);
});
test('image selection requires eligible metadata and preserves closest-width stable ties',()=>{
 const streams=[{id:1,encrypted:false,indexed:false,mimeType:'image/jpeg'},{id:2,encrypted:false,indexed:true,mimeType:'image/png'},{id:3,encrypted:true,indexed:true,mimeType:'image/jpeg'}],tracks=[{id:1,width:100},{id:2,width:200},{id:3,width:150}];
 assert.deepEqual(shakaPreviewChoice('dash',false,150,streams,tracks),{id:1,stream:0,createIndex:true});assert.deepEqual(shakaPreviewChoice('hls',false,150,streams,tracks),{id:2,stream:1,createIndex:false});assert.equal(shakaPreviewChoice('dash',true,100,[streams[0]],[tracks[0]]),null);
});
function fixture(){
 const backend=Object.setPrototypeOf(new EventTarget(),ShakaBackend.prototype),calls=[],tracks=[{...variant(),audioLanguage:'en',language:'en'}];
 const player={getVariantTracks(){calls.push('variants');return tracks;},getTextTracks(){calls.push('texts');return[];},getAudioTracks(){calls.push('audio');return[];},isBuffering(){calls.push('buffering');return false;},isDynamic(){calls.push('live');return false;},seekRange(){calls.push('range');return{start:0,end:20};},getManifest(){return{imageStreams:[]};},getImageTracks(){return[];},async destroy(){calls.push('destroy');}};
 Object.assign(backend,{control:state(),controlWaiters:new Map(),player,native:{properties:new Map([['time-pos',1]]),destroy:async()=>{},seek:async value=>calls.push(['seek',value])},properties:new Map([['sentinel',1]]),video:{currentTime:2},runtimeLoad:new AbortController(),listeners:[],blobs:new Set()});return{backend,player,calls,tracks};
}
test('refresh retirement stops subsequent observations and does not publish a partial catalog',async()=>{
 const f=fixture();let close;f.player.getVariantTracks=()=>{f.calls.push('variants');close=f.backend.destroy();return f.tracks;};f.backend.refresh();await close;assert.deepEqual(f.calls,['buffering','variants','destroy']);assert.deepEqual([...f.backend.properties],[['sentinel',1]]);
});
test('refresh captures all facts before publishing track and range observations',()=>{
 const f=fixture();f.backend.refresh();assert.equal(f.backend.properties.get('time-pos'),1);assert.equal(f.backend.properties.get('track-list')[0].type,'video');assert.deepEqual(f.backend.properties.get('native-seekable'),[{start:0,end:20}]);
});
test('streaming observation retirement cannot sample the next provider surface',async()=>{
 const f=fixture();let close;f.player.getVariantTracks=()=>{close=f.backend.destroy();return f.tracks;};assert.throws(()=>f.backend.streamingState(),error=>error.code==='ABORTED');await close;assert.equal(f.calls.includes('live'),false);
});
test('seek range callback retirement prevents a physical seek',async()=>{
 const f=fixture();let close;f.player.seekRange=()=>{close=f.backend.destroy();return{start:0,end:20};};await assert.rejects(f.backend.seek(2),error=>error.code==='ABORTED');await close;assert.equal(f.calls.some(call=>Array.isArray(call)),false);
});
test('preview retirement during index creation prevents thumbnail lookup',async()=>{
 const f=fixture();let close,thumbnails=0;f.player.getManifest=()=>({imageStreams:[{id:1,encrypted:false,mimeType:'image/jpeg',segmentIndex:null,createSegmentIndex:async()=>{close=f.backend.destroy();}}]});f.player.getImageTracks=()=>[{id:1,width:160}];f.player.getThumbnails=()=>{thumbnails++;return null;};
 assert.equal(await f.backend.previewFrame({signal:new AbortController().signal,width:160,time:1}),null);await close;assert.equal(thumbnails,0);
});
test('preview capture retirement stops before consulting image tracks',async()=>{
 const f=fixture();let close,images=0;f.player.getManifest=()=>{close=f.backend.destroy();return{imageStreams:[]};};f.player.getImageTracks=()=>{images++;return[];};
 assert.equal(await f.backend.previewFrame({signal:new AbortController().signal,width:160,time:1}),null);await close;assert.equal(images,0);
});
test('preview abort during network acquisition cancels the newly returned operation',async()=>{
 const f=fixture(),controller=new AbortController();let aborted=0,destroyed=0;
 f.player.getManifest=()=>({imageStreams:[{id:1,encrypted:false,mimeType:'image/jpeg',segmentIndex:{}}]});f.player.getImageTracks=()=>[{id:1,width:160}];f.player.getThumbnails=async()=>({uris:['https://example.test/preview.jpg'],startByte:0,endByte:null});
 const policy={filter(){},plugin(){controller.abort();return{promise:Promise.resolve({data:new ArrayBuffer(1)}),abort:async()=>{aborted++;}};},destroy(){destroyed++;}};
 f.backend.policy={forkForPreview:()=>policy};f.backend.runtime={net:{NetworkingEngine:{RequestType:{SEGMENT:1},defaultRetryParameters:()=>({}),makeRequest:()=>({headers:{}})}}};
 await assert.rejects(f.backend.previewFrame({signal:controller.signal,width:160,time:1}),error=>error.name==='AbortError');assert.equal(aborted,1);assert.equal(destroyed,1);
});
test('VOD and empty live snapshots preserve lazy clock and playhead observation',t=>{
 const original=Date.now;t.after(()=>{Date.now=original;});Date.now=()=>assert.fail('clock not needed without playhead date');
 for(const live of [false,true]){const f=fixture();f.player.isDynamic=()=>live;f.player.seekRange=()=>({start:0,end:0});Object.defineProperty(f.backend.video,'currentTime',{get:()=>assert.fail('playhead not needed without live window')});assert.equal(f.backend.streamingState().live.nearLive,null);}
});
