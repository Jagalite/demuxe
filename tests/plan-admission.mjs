// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planAdmission,executionPlan} from '../web/generated/internal/playback-plans.js';
import {losslessAdaptationRejection,audioTranscodeRejection} from '../web/generated/internal/selection.js';
const facts={automatic:true,vf:'',af:'',gain:1,toneMapping:'off',hybridAudioFilters:false,allowLossy:false,nativeASS:false,externalFormats:[],browserTextTracks:false,audioOutput:'stereo',nativeRemux:'auto',manifest:false,requiresRemux:false,isolated:true,mse:true,webCodecs:true,webAudio:true};
const eligible=extra=>planAdmission({...facts,...extra}).filter(p=>p.eligible).map(p=>p.id);
test('prohibited preparation is a policy rejection, distinct from unavailable runtime facilities',()=>{
 const prepared=['native-remux','native-remux-mpv','native-transcode','native-video-mpv-audio'];
 const qualified={...facts,mpvSubtitles:true,mpvSubtitleSourceQualified:true,selectiveAudioQualified:true,transcodeAssetsAvailable:true};
 for(const id of prepared){
  const denied=planAdmission({...qualified,nativeRemux:'never'}).find(p=>p.id===id);
  assert.equal(denied.eligible,false,id);assert.equal(denied.code,'POLICY_PROHIBITS_TRANSFORM',id);
  const missing=planAdmission({...qualified,mse:false}).find(p=>p.id===id);
  assert.equal(missing.eligible,false,id);assert.equal(missing.code,'DEPLOYMENT_UNAVAILABLE',id);
 }
});
test('ordinary automatic admission contains copy plans and never implicitly permits adaptation',()=>{
 assert.deepEqual(eligible({}),['native-direct','native-remux','hybrid','software']);
 assert.deepEqual(eligible({adaptation:'opus',allowLossy:true}),eligible({}));
});
test('finite Native ASS and gain combinations exclude missing components',()=>{
 assert.deepEqual(eligible({externalFormats:['ass'],nativeASS:true,gain:.5}),['native-direct-ass-gain','native-remux-ass-gain','hybrid-gain','software-gain']);
 assert.ok(!eligible({externalFormats:['unsupported'],nativeASS:true}).some(id=>id.startsWith('native')));
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
 for(const extra of [{vf:'hflip'},{audioOutput:'5.1'},{externalFormats:['ass'],nativeASS:true},{shakaSourceRejection:'Explicit demuxer'}])assert.ok(!eligible({manifest:true,...extra}).some(p=>p.startsWith('shaka-')));
 for(const extra of [{externalFormats:['browser-vtt']},{browserTextTracks:true}])assert.ok(eligible({manifest:true,...extra}).includes('shaka-mse'));
 assert.ok(!eligible({}).some(p=>p.startsWith('shaka-')));
 assert.ok(eligible({manifest:true,gain:.5}).includes('shaka-mse-gain'));
});

test('non-isolated deployment retains browser routes and excludes pthread preparation',()=>{
 assert.deepEqual(eligible({isolated:false}),['native-direct']);
 assert.deepEqual(eligible({isolated:false,requiresRemux:true}),[]);
 const decisions=planAdmission({...facts,isolated:false,nativeRemux:'always'});
 assert.equal(decisions.find(p=>p.id==='native-remux').code,'ISOLATION_REQUIRED');
});
test('selective native video plus mpv audio is finite and fail closed',()=>{
 const id='native-video-mpv-audio',qualified={selectiveAudioQualified:true};
 assert.ok(eligible(qualified).includes(id));
 assert.ok(eligible({...qualified,externalFormats:['browser-vtt'],browserTextTracks:true}).includes(id));
 for(const extra of [{automatic:false},{isolated:false},{mse:false},{webAudio:false},{nativeRemux:'never'},{vf:'hflip'},{toneMapping:'hdr-to-sdr'},{af:'volume=.5'},{gain:.8},{audioOutput:'5.1'},{externalFormats:['ass']},{selectiveAudioQualified:false,selectiveAudioReason:'Track bounds differ'}]){
  assert.ok(!eligible({...qualified,...extra}).includes(id),JSON.stringify(extra));
 }
});
test('selected embedded subtitles require the combined native video and mpv services plan',()=>{
 const qualified={selectiveAudioQualified:true,mpvSubtitles:true,mpvSubtitleSourceQualified:true,selectedEmbeddedSubtitle:true};
 const decisions=planAdmission({...facts,...qualified});
 assert.equal(decisions.find(p=>p.id==='native-video-mpv-audio').eligible,false);
 assert.equal(decisions.find(p=>p.id==='native-video-mpv-audio-subtitles').eligible,true);
 assert.equal(executionPlan('native','native-video-mpv-audio-subtitles','').owners.subtitle,'mpv-subtitle-service');
 for(const extra of [{mpvSubtitles:false},{mpvSubtitleSourceQualified:false},{audioOutput:'5.1'},{vf:'hflip'},{toneMapping:'hdr-to-sdr'},{mse:false},{webAudio:false}]){
  assert.equal(planAdmission({...facts,...qualified,...extra}).find(p=>p.id==='native-video-mpv-audio-subtitles').eligible,false,JSON.stringify(extra));
 }
});

test('automatic FLAC24 follows copy plans and obeys Worklet and lossless-only policies',()=>{
 const extra={transcodeAssetsAvailable:true,transcodeSourceRejection:undefined};
 const ids=eligible(extra);
 assert.ok(ids.indexOf('native-transcode')>ids.indexOf('native-remux'));
 assert.ok(ids.indexOf('native-transcode')<ids.indexOf('hybrid'));
 assert.equal(executionPlan('native','adapted-flac24','').id,'native-transcode');
 for(const blocked of [{audioPlayback:'worklet'},{automaticLossless:true},{automatic:false},{adaptation:'flac'},{transcodeAssetsAvailable:false},{transcodeSourceRejection:'Unknown layout'},{isolated:false},{mse:false},{nativeRemux:'never'},{audioOutput:'5.1'},{af:'volume=0.5'},{gain:.5},{manifest:true},{externalFormats:['browser-vtt']},{selectedEmbeddedSubtitle:true}])assert.ok(!eligible({...extra,...blocked}).includes('native-transcode'),JSON.stringify(blocked));
 assert.ok(!eligible({...extra,automaticLossless:true,adaptationSourceQualified:true,audioPlayback:'worklet'}).includes('native-flac'));
 const subtitled={...extra,selectedEmbeddedSubtitle:true,mpvSubtitles:true,mpvSubtitleSourceQualified:true};
 assert.ok(eligible(subtitled).includes('native-transcode-mpv'));
 assert.ok(!eligible({...subtitled,mpvSubtitles:false}).includes('native-transcode-mpv'));
 assert.equal(executionPlan('native','native-transcode-mpv','').id,'native-transcode-mpv');
});

test('private adaptation composes external ASS with explicit subtitle ownership',()=>{
 const extra={privateRemux:true,externalFormats:['ass'],nativeASS:true,transcodeAssetsAvailable:true};
 assert.ok(eligible(extra).includes('native-transcode-ass'));
 assert.ok(eligible({...extra,isolated:false}).includes('native-transcode-ass'));
 assert.ok(eligible({...extra,externalFormats:['srt']}).includes('native-transcode-ass'));
 assert.ok(!eligible({...extra,privateRemux:false,isolated:false}).includes('native-transcode-ass'));
 assert.ok(!eligible(extra).includes('native-transcode'));
 assert.equal(executionPlan('native','adapted-flac24','',1,true).id,'native-transcode-ass');
 assert.equal(executionPlan('native','adapted-flac24','',1,true).owners.subtitle,'mpv-subtitle-service');
 for(const blocked of [{nativeASS:false},{externalFormats:['browser-vtt']},{externalFormats:['unsupported']},{externalFormats:['ass','browser-vtt']},{externalFormats:[]},{browserTextTracks:true},{manifest:true},{selectedEmbeddedSubtitle:true},{gain:.5},{audioPlayback:'worklet'},{transcodeAssetsAvailable:false},{transcodeSourceRejection:'Unsupported source'}]){
  assert.ok(!eligible({...extra,...blocked}).includes('native-transcode-ass'),JSON.stringify(blocked));
 }
 for(const policy of [{automaticLossless:true,adaptationSourceQualified:true},{automatic:false,adaptation:'flac'}]){
  assert.ok(eligible({...extra,...policy}).includes('native-flac-ass'));
  assert.ok(eligible({...extra,...policy,isolated:false}).includes('native-flac-ass'));
 }
});

test('FLAC24 source admission follows the selected stream and finite file constraints',()=>{
 const probe={duration:18,format:'matroska',tracks:[{type:'video',id:'1',index:0,codec:'hevc'},{type:'audio',id:'2',index:1,codec:'ac3',sampleRate:48000,channels:2},{type:'audio',id:'3',index:2,codec:'unknown',sampleRate:48000,channels:2}]};
 assert.equal(audioTranscodeRejection(probe,{aid:'2'}),undefined);
 assert.match(audioTranscodeRejection(probe,{aid:'3'}),/decoder/);
 assert.match(audioTranscodeRejection(probe,{aid:'no'}),/decoder/);
 assert.match(audioTranscodeRejection({...probe,duration:Infinity},{aid:'2'}),/finite/);
 assert.match(audioTranscodeRejection({...probe,format:'mpegts'},{aid:'2'}),/file/);
 assert.match(audioTranscodeRejection({...probe,tracks:[probe.tracks[0],{...probe.tracks[1],channels:0}]},{aid:'2'}),/channel/);
});

test('private remux opt-in admits file preparation without admitting mpv or transforms',()=>{
 const decisions=planAdmission({...facts,isolated:false,privateRemux:true,requiresRemux:true});
 assert.ok(decisions.find(p=>p.id==='native-remux').eligible);
 for(const isolated of [false,true])for(const p of planAdmission({...facts,isolated,privateRemux:true})){
  if(p.mode!=='native'||p.id.includes('mpv')||p.id.includes('ass'))assert.equal(p.eligible,false,p.id);
 }
 assert.equal(planAdmission({...facts,isolated:false,requiresRemux:true}).find(p=>p.id==='native-remux').eligible,false);
 assert.equal(planAdmission({...facts,isolated:false,privateRemux:true,manifest:true}).find(p=>p.id==='native-remux').eligible,false);
});

test('automatic private selection preserves browser streaming and direct gain',()=>{
 for(const isolated of [false,true]){
  const direct=planAdmission({...facts,isolated,privateRemux:true,gain:.5});
  assert.equal(direct.find(p=>p.id==='native-direct-gain').eligible,true);
  for(const gain of [1,.5]){
   const streaming=planAdmission({...facts,isolated,privateRemux:true,manifest:true,gain});
   assert.equal(streaming.find(p=>p.id===(gain===1?'shaka-mse':'shaka-mse-gain')).eligible,true);
  }
 }
});

test('private mpv admission keeps service, source and composition qualifications',()=>{
 const base={...facts,isolated:false,privateRemux:true,mpvSubtitles:true,mpvSubtitleSourceQualified:true,selectedEmbeddedSubtitle:true,requiresRemux:true};
 const result=planAdmission(base);
 assert.ok(result.find(p=>p.id==='native-remux-mpv').eligible);
 assert.ok(!result.find(p=>p.id==='hybrid').eligible);
 assert.ok(!result.find(p=>p.id==='software').eligible);
 assert.ok(planAdmission({...base,selectiveAudioQualified:true}).find(p=>p.id==='native-video-mpv-audio-subtitles').eligible);
 for(const extra of [{mpvSubtitleSourceQualified:false},{mpvSubtitles:false},{externalFormats:['ass']},{manifest:true},{audioOutput:'5.1'}]){
  const decisions=planAdmission({...base,...extra});assert.ok(!decisions.find(p=>p.id==='native-remux-mpv').eligible);
 }
 assert.ok(!planAdmission({...base,selectiveAudioQualified:false}).find(p=>p.id==='native-video-mpv-audio-subtitles').eligible);
});

test('modular private preparation does not suppress independent atomic mpv fallback',()=>{
 for(const isolated of [false,true]){
  const plans=planAdmission({...facts,privateRemux:true,atomicMpvProviders:true,isolated});
  for(const id of ['hybrid','software']){
   const plan=plans.find(p=>p.id===id);assert.equal(plan.eligible,isolated,id);
   if(!isolated)assert.equal(plan.code,'ISOLATION_REQUIRED');
  }
 }
});
