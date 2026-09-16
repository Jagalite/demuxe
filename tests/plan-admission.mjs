import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planAdmission} from '../web/generated/internal/playback-plans.js';
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
 assert.ok(!eligible({nativeSourceRejection:'Unsupported selected codec'}).some(id=>id.startsWith('native')));
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
