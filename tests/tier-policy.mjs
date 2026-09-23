// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TierAttempts,preferredPlans} from '../web/generated/internal/tier-policy.js';
import {planAdmission,executionPlan} from '../web/generated/internal/playback-plans.js';
import {Player} from '../web/generated/unified-player.js';
import {PlayerError} from '../web/generated/internal/errors.js';
test('negative evidence is isolated by source, settings and plan, expires and stays bounded',()=>{
 const history=new TierAttempts(),a={},b={};history.failure(a,'captions','native','unsupported',0);
 assert.equal(history.reason(a,'captions','native',1),'unsupported');
 for(const args of [[b,'captions','native'],[a,'hidden','native'],[a,'captions','hybrid']])assert.equal(history.reason(...args,1),undefined);
 assert.equal(history.reason(a,'captions','native',60001),undefined);
 for(let i=0;i<65;i++)history.failure(a,String(i),'native','unsupported',0);
 assert.equal(history.reason(a,'0','native',1),undefined);history.clear();assert.equal(history.reason(a,'64','native',1),undefined);
});
test('promotion never retries the accepted or lower ranked plans',()=>{
 const plans=[{id:'native',eligible:false},{id:'hybrid',eligible:true},{id:'software',eligible:true}];
 assert.deepEqual(preferredPlans(plans,'software').map(p=>p.id),['hybrid']);
 assert.deepEqual(preferredPlans(plans,'hybrid'),[]);assert.deepEqual(preferredPlans(plans,'absent'),[]);
});
test('playback decode failure retires the failed plan before fallback',async()=>{
 const p=Object.create(Player.prototype),source={},failures=new TierAttempts(),selected=[];
 Object.assign(p,{source,automatic:true,currentMode:'native',destroyed:false,queued:0,
  current:{backend:{diagnostics:{plan:'direct'},play:async()=>{throw new PlayerError('DECODE_FAILED','Missing selected audio');}}},
  settings:{pause:true},nativeRemux:'never',nativeTracks:[],tierAttempts:failures,
  runtimeCapabilities:{update(){}},evidence:()=>({}),failedStreamingPlan:()=>false,
  tierConfiguration:()=> 'same-settings',enqueue:async action=>action(),select:async(...args)=>selected.push(args)});
 Object.defineProperty(p,'diagnostics',{value:{plan:{id:'native-direct'}}});
 await p.play();
 assert.equal(selected.length,1);
 assert.equal(selected[0][4],1);
 assert.match(failures.reason(source,'same-settings','native-direct'),/Missing selected audio/);
 assert.equal(failures.reason({},'same-settings','native-direct'),undefined);
});
test('mpv subtitles are a distinct finite local isolated copy plan',()=>{
 const facts={automatic:true,vf:'',af:'',gain:1,toneMapping:'off',hybridAudioFilters:false,allowLossy:false,nativeASS:false,externalFormats:[],browserTextTracks:false,audioOutput:'stereo',nativeRemux:'auto',manifest:false,requiresRemux:false,isolated:true,mse:true,webCodecs:true,webAudio:true,mpvSubtitles:true,mpvSubtitleSourceQualified:true,nativeSourceRejection:'Embedded subtitles require mpv rendering'};
 const admitted=extra=>planAdmission({...facts,...extra}).find(p=>p.id==='native-remux-mpv').eligible;
 assert.equal(admitted({}),true);
 for(const extra of [{mpvSubtitles:false},{mpvSubtitleSourceQualified:false},{isolated:false},{manifest:true},{externalFormats:['ass']},{audioOutput:'5.1'},{gain:.5},{vf:'hflip'},{nativeRemux:'never'},{mpvSubtitleAVRejection:'Missing selected audio'},{remuxSourceRejection:'No codec mapping'}])assert.equal(admitted(extra),false);
 assert.equal(executionPlan('native','remux-mpv','').owners.subtitle,'mpv-subtitle-service');
});
