// SPDX-License-Identifier: Apache-2.0
// FFmpeg fallback admission only; production adaptive behavior is tested through Shaka.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateFallbackOptions,validateFallbackManifest} from '../web/fallback-stream-policy.js';
const encode=text=>new TextEncoder().encode(text);
const hls='#EXTM3U\n#EXTINF:2,\na.ts\n#EXT-X-ENDLIST\n';
const dash='<MPD type="static"><Period><AdaptationSet><Representation id="v"/></AdaptationSet></Period></MPD>';
test('fallback retains source quality intent by refusing unenforceable constraints',()=>{
  validateFallbackOptions();validateFallbackOptions({live:true});
  for(const options of [{maxBandwidth:1},{representation:'v'},{representation:0}])assert.throws(()=>validateFallbackOptions(options),/cannot preserve/);
});
test('live fallback remains explicit while FFmpeg owns playlist refresh and timelines',()=>{
  validateFallbackManifest(encode(hls),'hls');validateFallbackManifest(encode(dash),'dash');
  for(const [format,text] of [['hls',hls.replace('#EXT-X-ENDLIST','')],['dash',dash.replace('static','dynamic')]]){
    assert.throws(()=>validateFallbackManifest(encode(text),format),/streaming.live/);
    validateFallbackManifest(encode(text),format,{live:true});
  }
});
test('FFmpeg can inspect original representations and discontinuities without a JS scheduler',()=>{
  validateFallbackManifest(encode('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1\na\n#EXT-X-STREAM-INF:BANDWIDTH=2\nb\n'),'hls');
  validateFallbackManifest(encode(hls.replace('#EXTINF','#EXT-X-DISCONTINUITY\n#EXTINF')),'hls');
  validateFallbackManifest(encode(dash.replace('<Representation','<Representation id="other"/><Representation')),'dash');
});
test('fallback cannot silently discard segmented text tracks or DASH periods',()=>{
  for(const tag of ['#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="s",URI="s.m3u8"','#EXT-X-MEDIA:GROUP-ID="s",TYPE=SUBTITLES,URI="s.m3u8"']){
    assert.throws(()=>validateFallbackManifest(encode(hls+tag),'hls'),/subtitle semantics/);
  }
  assert.throws(()=>validateFallbackManifest(encode(dash.replace('</MPD>','<Period/></MPD>')),'dash'),/period semantics/);
  for(const attr of ['contentType="text"','mimeType="text/vtt"','codecs="stpp"','codecs="wvtt"']){
    assert.throws(()=>validateFallbackManifest(encode(dash.replace('<AdaptationSet>',`<AdaptationSet ${attr}>`)),'dash'),/track semantics/);
  }
});
test('unsupported encrypted, low-latency and XML external features fail closed in fallback',()=>{
  for(const tag of ['KEY:METHOD=AES-128','SESSION-KEY:METHOD=AES-128','PART:URI="p"','SERVER-CONTROL:CAN-BLOCK-RELOAD=YES']){
    assert.throws(()=>validateFallbackManifest(encode(hls+'#EXT-X-'+tag),'hls'),/requires Shaka/);
  }
  for(const value of ['<!DOCTYPE MPD>'+dash,dash.replace('<AdaptationSet>','<AdaptationSet contentType="te&#120;t">'),dash.replace('<MPD','<x:MPD'),dash.replace('<Period>','<Period><ContentProtection/>'),dash.replace('<Period>','<Period xlink:href="https://evil.invalid/"/>')]){
    assert.throws(()=>validateFallbackManifest(encode(value),'dash'));
  }
  validateFallbackManifest(encode(dash+'<!-- <Period/><ContentProtection/> -->'),'dash');
});
