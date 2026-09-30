// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {privatePlaybackRejection} from '../web/generated/internal/private-playback-admission.js';
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
