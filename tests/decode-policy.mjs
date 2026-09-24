// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDecodePolicy,mpvDecoderOptions,nextAdaptiveState,adaptiveDecodeSignal} from '../web/generated/internal/decode-policy.js';

const policy=(codec,decodeQuality='exact',adaptiveState='normal')=>resolveDecodePolicy({codec,decodeQuality,adaptiveState,maxDecodePixels:8294400,codedWidth:3840,codedHeight:2160,displayWidth:1280,displayHeight:720});

test('exact remains output preserving and keeps the allocation guard',()=>{
 for(const codec of ['h264','hevc','av1','mpeg4','mpeg2video','mjpeg','wmv2']){
  const p=policy(codec);assert.deepEqual(p.shortcuts,[]);assert.equal(p.threads,2);
  assert.equal(mpvDecoderOptions(p),'max_pixels=8294400');
 }
 const limited=resolveDecodePolicy({codec:'h264',decodeQuality:'balanced',maxDecodePixels:2073600});
 assert.equal(mpvDecoderOptions(limited),'max_pixels=2073600,skip_loop_filter=noref');
});
test('bounded profiles never admit screened unsafe controls',()=>{
 for(const codec of ['h264','hevc','av1','mpeg4','mpeg2video','mjpeg','wmv2'])for(const quality of ['balanced','performance']){
  const p=policy(codec,quality),options=mpvDecoderOptions(p);
  assert.deepEqual(p.shortcuts,['h264','hevc'].includes(codec)?['skip_loop_filter=noref']:codec==='av1'&&quality==='performance'?['libdav1d filmgrain=0']:[]);
  assert.equal(p.lowres,0);assert.equal(p.skipIdct,'default');
  for(const prohibited of ['skip_frame=bidir','skip_loop_filter=all','skip_idct=all','flags2','err_detect','ec=','strict='])assert.equal(options.includes(prohibited),false);
 }
});
test('emergency skips only qualified disposable pictures',()=>{
 for(const codec of ['mpeg2video','h264','hevc'])assert.equal(policy(codec,'exact','drop-non-reference').skipFrame,'noref');
 for(const codec of ['mpeg1video','mpeg4','av1','mjpeg','wmv2'])assert.equal(policy(codec,'performance','drop-non-reference').skipFrame,'default');
});
test('adaptive state requires sustained pressure and recovers in stages',()=>{
 assert.equal(nextAdaptiveState('normal','h264',true,false,2),'normal');
 assert.equal(nextAdaptiveState('normal','h264',true,false,3),'reduced-reconstruction');
 assert.equal(nextAdaptiveState('reduced-reconstruction','h264',true,false,3),'drop-non-reference');
 assert.equal(nextAdaptiveState('drop-non-reference','h264',false,true,4),'drop-non-reference');
 assert.equal(nextAdaptiveState('drop-non-reference','h264',false,true,5),'reduced-reconstruction');
 assert.equal(nextAdaptiveState('reduced-reconstruction','h264',false,true,5),'normal');
 assert.equal(nextAdaptiveState('normal','mpeg2video',true,false,3),'drop-non-reference');
 assert.equal(policy('h264','exact','reduced-reconstruction').effective,'balanced');
 assert.equal(policy('h264','exact','reduced-reconstruction').adaptiveState,'reduced-reconstruction');
});
test('adaptive signal follows playback rate and rejects display-only drops',()=>{
 const signal=(overrides={})=>adaptiveDecodeSignal({elapsedSeconds:2,playbackSpeed:1,advance:2,decoderDrops:0,presentationDrops:0,avsync:0,...overrides});
 assert.deepEqual(signal({playbackSpeed:.5,advance:1}),{pressure:false,recovered:true});
 assert.deepEqual(signal({playbackSpeed:2,advance:4,presentationDrops:60}),{pressure:false,recovered:true});
 assert.deepEqual(signal({playbackSpeed:4,advance:7,presentationDrops:120,avsync:1}),{pressure:true,recovered:false});
 assert.deepEqual(signal({decoderDrops:3}),{pressure:true,recovered:false});
});
