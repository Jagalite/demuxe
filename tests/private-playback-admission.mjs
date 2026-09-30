// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {privatePlaybackRejection,privatePlaybackAssets,readPrivatePlaybackAssets} from '../web/generated/internal/private-playback-admission.js';
import {planAdmission,executionPlan} from '../web/generated/internal/playback-plans.js';
const probe={duration:36,tracks:[{type:'video',codec:'mpeg2video',width:320,height:180},{type:'audio',codec:'ac3',channels:2,sampleRate:48000}]};
const source={finite:true,bytes:1504000},features={vf:'',af:'',toneMapping:'off',audioOutput:'stereo',gain:1,speed:1,externalSubtitles:false,customFonts:false,subtitleStyle:false};
const facts={automatic:true,...features,hybridAudioFilters:false,allowLossy:false,nativeASS:false,externalFormats:[],browserTextTracks:false,nativeRemux:'auto',manifest:false,requiresRemux:false,isolated:false,privateRemux:true,mse:true,webCodecs:true,webAudio:true,offscreenCanvas:true,privatePlaybackAssetsAvailable:true};
test('qualified inspected Software file can use cooperative runtime without isolation',()=>{
 assert.equal(privatePlaybackRejection(probe,source,features),undefined);
 const plans=planAdmission(facts);assert.equal(plans.find(p=>p.id==='software-private').eligible,true);
 assert.equal(plans.find(p=>p.id==='software').eligible,false);assert.equal(plans.find(p=>p.id==='hybrid').eligible,false);
 assert.equal(executionPlan('software','software-private','').id,'software-private');
 assert.equal(executionPlan('software','software-private','',.4).id,'software-private-gain');
});
test('missing components and unsupported features cannot admit private Software',()=>{
 for(const patch of [{privatePlaybackAssetsAvailable:false},{webAudio:false},{offscreenCanvas:false},{privatePlaybackSourceRejection:'unsupported source'},{vf:'hflip'},{af:'rubberband'},{externalFormats:['ass']},{browserTextTracks:true},{manifest:true}])assert.equal(planAdmission({...facts,...patch}).find(p=>p.id==='software-private').eligible,false,JSON.stringify(patch));
});
test('source, codec and settings bounds fail before worker construction',()=>{
 for(const [p,s,f] of [[undefined,source,features],[probe,{...source,finite:false},features],[probe,{...source,bytes:NaN},features],[probe,{...source,bytes:65*1024*1024},features],[{...probe,duration:61},source,features],[{...probe,tracks:[{...probe.tracks[0],codec:'hevc'}]},source,features],[{...probe,tracks:[probe.tracks[0],{...probe.tracks[1],channels:6}]},source,features],[probe,source,{...features,customFonts:true}],[probe,source,{...features,externalSubtitles:true}],[probe,source,{...features,gain:2}],[probe,source,{...features,speed:3}]])assert.ok(privatePlaybackRejection(p,s,f));
});

test('full profile requires concrete software decoders and retained Hybrid assets',()=>{
 const assets={codecProfile:'playback-full',retainedDecoder:true,decoders:['h264','ac3','libdav1d','flac']};
 const h264={...probe,tracks:[{...probe.tracks[0],codec:'h264'},probe.tracks[1]]};
 assert.equal(privatePlaybackRejection(h264,source,features,assets),undefined);
 assert.equal(privatePlaybackRejection(h264,source,features,{...assets,decoders:['ac3']}), 'Installed private playback video decoder is unavailable');
 assert.equal(privatePlaybackRejection(h264,source,features,assets,'hybrid'),undefined);
 assert.ok(privatePlaybackRejection(h264,source,features,{...assets,retainedDecoder:false},'hybrid'));
 assert.equal(planAdmission({...facts,privateHybridAssetsAvailable:true}).find(p=>p.id==='hybrid-private').eligible,true);
 assert.equal(executionPlan('hybrid','hybrid-private','',.4).id,'hybrid-private-gain');
 const manifest={schema:1,backend:'jspi',profile:'playback',...assets};
 assert.deepEqual(privatePlaybackAssets(manifest,'jspi'),assets);
 for(const patch of [{backend:'asyncify'},{decoders:[]},{decoders:[true]},{retainedDecoder:'true'},{codecProfile:'unknown'}])assert.equal(privatePlaybackAssets({...manifest,...patch},'jspi'),undefined);
});

test('full profile admits qualified resampling, surround input and device output policy',()=>{
 const assets={codecProfile:'playback-full',retainedDecoder:true,decoders:['mpeg2video','ac3']};
 for(const channels of [2,6,8])for(const sampleRate of [44100,48000])for(const audioOutput of ['stereo','5.1','7.1','auto']){
  assert.equal(privatePlaybackRejection({...probe,tracks:[probe.tracks[0],{...probe.tracks[1],channels,sampleRate}]},source,{...features,audioOutput},assets),undefined);
  assert.equal(planAdmission({...facts,privatePlaybackFull:true,audioOutput}).find(p=>p.id==='software-private').eligible,true);
 }
 assert.ok(privatePlaybackRejection({...probe,tracks:[...probe.tracks,probe.tracks[1]]},source,features,assets));
});

test('full private subtitle ownership admits plain VTT attachments',()=>{
 assert.equal(planAdmission({...facts,privatePlaybackFull:true,externalFormats:['browser-vtt']}).find(p=>p.id==='software-private').eligible,true);
 assert.equal(planAdmission({...facts,externalFormats:['browser-vtt']}).find(p=>p.id==='software-private').eligible,false);
});

test('full profile permits audio-only and mono while still rejecting empty sources',()=>{
 const assets={codecProfile:'playback-full',retainedDecoder:true,decoders:['mpeg2video','ac3']};
 assert.equal(privatePlaybackRejection({...probe,tracks:[probe.tracks[1]]},source,features,assets),undefined);
 assert.equal(privatePlaybackRejection({...probe,tracks:[probe.tracks[0],{...probe.tracks[1],channels:1}]},source,features,assets),undefined);
 assert.ok(privatePlaybackRejection({...probe,tracks:[]},source,features,assets));
});

test('manifest reading cancels oversized chunked bodies and validates heap metadata types',async()=>{
 let cancelled=false;const body=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(40000));},cancel(){cancelled=true;}});
 await assert.rejects(readPrivatePlaybackAssets(new Response(body),'jspi'),/byte limit/);assert.equal(cancelled,true);
 const manifest={schema:1,backend:'jspi',profile:'playback',codecProfile:'playback-full',retainedDecoder:true,decoders:['h264'],filters:['zscale','tonemap'],maxHeapBytes:536870912};
 assert.equal((await readPrivatePlaybackAssets(new Response(JSON.stringify(manifest)),'jspi')).maxHeapBytes,536870912);
 assert.equal(privatePlaybackAssets({...manifest,maxHeapBytes:'536870912'},'jspi'),undefined);
});

test('multiple audio tracks require the installed EOF seek repair',()=>{
 const multi={...probe,tracks:[...probe.tracks,{...probe.tracks[1],index:2}]};
 const assets={codecProfile:'playback-full',retainedDecoder:true,decoders:['mpeg2video','ac3']};
 assert.ok(privatePlaybackRejection(multi,source,features,assets));
 assert.equal(privatePlaybackRejection(multi,source,features,{...assets,features:['track-switch-seek']}),undefined);
});

test('4K admission requires the full 512 MiB heap profile',()=>{
 const large={...probe,tracks:[{...probe.tracks[0],width:3840,height:2160},probe.tracks[1]]};
 const assets={codecProfile:'playback-full',retainedDecoder:true,decoders:['mpeg2video','ac3']};
 assert.ok(privatePlaybackRejection(large,source,features,assets));
 assert.equal(privatePlaybackRejection(large,source,features,{...assets,maxHeapBytes:536870912}),undefined);
 assert.ok(privatePlaybackRejection({...large,tracks:[{...large.tracks[0],width:7680,height:4320}]},source,features,{...assets,maxHeapBytes:536870912}));
});

test('full Software codec admission follows linked decoder inventory',()=>{
 const extended={...probe,tracks:[{...probe.tracks[0],codec:'ffv1'},{...probe.tracks[1],codec:'pcm_f32le'}]};
 const assets={codecProfile:'playback-full',retainedDecoder:true,decoders:['ffv1','pcm_f32le']};
 assert.equal(privatePlaybackRejection(extended,source,features,assets),undefined);
 assert.ok(privatePlaybackRejection(extended,source,features,{...assets,decoders:['ffv1']}));
 assert.ok(privatePlaybackRejection(extended,source,features,assets,'hybrid'));
 assert.ok(privatePlaybackRejection(extended,source,features,{...assets,codecProfile:'playback'}));
});

test('full profile admits decoder input rates and layouts while rejecting invalid metadata',()=>{
 const assets={codecProfile:'playback-full',retainedDecoder:true,decoders:['mpeg2video','ac3']};
 for(const [channels,sampleRate] of [[1,8000],[4,32000],[2,96000],[8,192000]])assert.equal(privatePlaybackRejection({...probe,tracks:[probe.tracks[0],{...probe.tracks[1],channels,sampleRate}]},source,features,assets),undefined);
 for(const patch of [{channels:0},{channels:65},{channels:1.5},{sampleRate:0},{sampleRate:NaN},{sampleRate:48000.5},{sampleRate:2147483648}])assert.ok(privatePlaybackRejection({...probe,tracks:[probe.tracks[0],{...probe.tracks[1],...patch}]},source,features,assets));
});

test('full finite files can have unknown duration without weakening byte bounds',()=>{
 const assets={codecProfile:'playback-full',retainedDecoder:true,decoders:['sbc']};
 const raw={duration:0,tracks:[{type:'audio',codec:'sbc',channels:2,sampleRate:48000}]};
 assert.equal(privatePlaybackRejection(raw,source,features,assets),undefined);
 for(const duration of [-1,NaN,Infinity])assert.ok(privatePlaybackRejection({...raw,duration},source,features,assets));
 assert.ok(privatePlaybackRejection(raw,{finite:false,bytes:source.bytes},features,assets));
 assert.ok(privatePlaybackRejection({...probe,duration:0},source,features));
});
