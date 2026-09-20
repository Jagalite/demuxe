// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planAdmission} from '../web/generated/internal/playback-plans.js';
import {losslessAdaptationRejection} from '../web/generated/internal/selection.js';
const facts={automatic:true,vf:'',af:'',gain:1,toneMapping:'off',hybridAudioFilters:false,allowLossy:false,nativeASS:false,externalFormats:[],browserTextTracks:false,audioOutput:'stereo',nativeRemux:'auto',manifest:false,requiresRemux:false,isolated:true,mse:true,webCodecs:true,webAudio:true};
const eligible=extra=>planAdmission({...facts,...extra}).filter(p=>p.eligible).map(p=>p.id);
test('ordinary automatic admission contains copy plans and never implicitly permits adaptation',()=>{
 assert.deepEqual(eligible({}),['native-direct','native-remux','hybrid','software']);
 assert.deepEqual(eligible({adaptation:'opus',allowLossy:true}),eligible({}));
});
test('finite Native ASS and gain combinations exclude missing components',()=>{
 assert.deepEqual(eligible({externalFormats:['ass'],nativeASS:true,gain:.5}),['native-direct-ass-gain','native-remux-ass-gain','hybrid-gain','software-gain']);
 assert.ok(!eligible({externalFormats:['srt'],nativeASS:true}).some(id=>id.startsWith('native')));
});
test('source, deployment and filter requirements actually remove plans',()=>{
 assert.ok(!eligible({nativeSourceRejection:'Required embedded subtitles'}).some(id=>id.startsWith('native')));
 assert.deepEqual(eligible({requiresRemux:true,isolated:false}),[]);
 assert.deepEqual(eligible({af:'volume=0.5',hybridAudioFilters:true,gain:.5}),['hybrid-audio-filter-gain','software-gain']);
 assert.deepEqual(eligible({af:'rubberband',hybridAudioFilters:true}),['software']);
});
test('explicit adaptation respects profile, lossy permission and manifest boundary',()=>{
 assert.ok(eligible({automatic:false,adaptation:'flac'}).includes('native-flac'));
 assert.ok(!eligible({automatic:false,adaptation:'opus'}).includes('native-opus'));
 assert.ok(eligible({automatic:false,adaptation:'opus',allowLossy:true}).includes('native-opus'));
 assert.ok(!eligible({automatic:false,adaptation:'opus',allowLossy:true,manifest:true}).includes('native-opus'));
 assert.ok(!eligible({automatic:false,adaptation:'opus',allowLossy:true,nativeASS:true,externalFormats:['ass']}).includes('native-opus'));
});
test('automatic lossless permission requires source evidence and never admits Opus',()=>{
 assert.ok(!eligible({automaticLossless:true}).includes('native-flac'));
 const ids=eligible({automaticLossless:true,adaptationSourceQualified:true});
 assert.deepEqual(ids,['native-direct','native-remux','native-flac','hybrid','software']);
 assert.deepEqual(eligible({automaticLossless:true,adaptationSourceQualified:true,nativeSourceRejection:'Embedded subtitles require mpv'}),['hybrid','software']);
 assert.ok(!eligible({automaticLossless:true,adaptationSourceQualified:false,adaptationSourceRejection:'Unequal tails'}).includes('native-flac'));
 assert.ok(!eligible({automaticLossless:true,adaptationSourceQualified:true,manifest:true}).includes('native-flac'));
});
test('automatic FLAC inspects the selected track, known endpoints and exact PCM configuration',()=>{
 const video={id:'1',index:0,type:'video',codec:'h264',width:1280,height:720,startTime:0,endTime:16};
 const audio={id:'1',index:1,type:'audio',codec:'pcm_s24le',sampleRate:48000,channels:2,bits:24,startTime:0,endTime:16};
 const other={...audio,id:'2',index:2,sampleRate:44100};
 const settings={aid:'auto',sid:'no',subtitles:false};
 const probe={format:'matroska,webm',duration:16,tracks:[video,audio,other]};
 assert.equal(losslessAdaptationRejection(probe,settings),undefined);
 assert.match(losslessAdaptationRejection(probe,{...settings,aid:'2'}),/48 kHz/);
 for(const endTime of [undefined,-1,1,30])assert.ok(losslessAdaptationRejection({...probe,tracks:[video,{...audio,endTime}]},settings));
 assert.ok(losslessAdaptationRejection({...probe,tracks:[video,{...audio,bits:32}]},settings));
 assert.ok(losslessAdaptationRejection({...probe,tracks:[{...video,endTime:1},audio]},settings));
});

test('isolation admission remains structurally distinct from unsupported media',()=>{
 const decisions=planAdmission({...facts,isolated:false});
 for(const id of ['hybrid','software','native-remux'])assert.equal(decisions.find(p=>p.id===id).code,'ISOLATION_REQUIRED');
 assert.equal(decisions.find(p=>p.id==='native-direct').eligible,true);
 const ass=planAdmission({...facts,isolated:false,nativeASS:true,externalFormats:['ass']});
 assert.equal(ass.find(p=>p.id==='native-direct-ass').code,'ISOLATION_REQUIRED');
});

test('HLS direct admission retains controlled transport and feature boundaries',()=>{
 assert.deepEqual(eligible({manifest:true}),['native-direct','shaka-mse','hybrid','software']);
 assert.deepEqual(eligible({manifest:true,requiresRemux:true}),['shaka-mse','hybrid','software']);
 assert.deepEqual(eligible({manifest:true,nativeRemux:'always'}),['shaka-mse','hybrid','software']);
 assert.deepEqual(eligible({manifest:true,vf:'hflip'}),['software']);
 assert.ok(!eligible({manifest:true,audioOutput:'5.1'}).includes('native-direct'));
 assert.ok(!eligible({manifest:true,nativeASS:true,externalFormats:['ass']}).some(p=>p.startsWith('native')));
});
test('qualified external plain VTT retains browser A/V but never erases other requirements',()=>{
 assert.deepEqual(eligible({externalFormats:['browser-vtt']}),eligible({}));
 for(const extra of [{manifest:true},{nativeSourceRejection:'Embedded subtitles require mpv rendering'},{externalFormats:['browser-vtt','ass'],nativeASS:true}])assert.ok(!eligible({externalFormats:['browser-vtt'],...extra}).some(id=>id.startsWith('native')));
 assert.ok(!eligible({externalFormats:['vtt']}).some(id=>id.startsWith('native')));
});

test('Shaka owns controlled adaptive execution without weakening file or feature gates',()=>{
 assert.deepEqual(eligible({manifest:true,nativeSourceRejection:'Use Shaka',isolated:false,requiresRemux:true}),['shaka-mse']);
 assert.deepEqual(eligible({manifest:true,nativeSourceRejection:'Use Shaka',streamingFallbackRejection:'Cannot preserve quality'}),['shaka-mse']);
 assert.deepEqual(eligible({manifest:true,nativeSourceRejection:'Use Shaka',mse:false}),['hybrid','software']);
 for(const extra of [{vf:'hflip'},{audioOutput:'5.1'},{externalFormats:['ass'],nativeASS:true},{externalFormats:['browser-vtt']},{browserTextTracks:true},{shakaSourceRejection:'Explicit demuxer'}])assert.ok(!eligible({manifest:true,...extra}).some(p=>p.startsWith('shaka-')));
 assert.ok(!eligible({}).some(p=>p.startsWith('shaka-')));
 assert.ok(eligible({manifest:true,gain:.5}).includes('shaka-mse-gain'));
});
