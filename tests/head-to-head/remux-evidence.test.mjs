// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {remuxEvidence,requireRemuxCPU,nonisolatedPlaybackLanes,playbackLane,requiresNonisolated,demuxeLaneOptions} from './remux-evidence.mjs';
const state=(lane,overrides={})=>({route:'native-transcode',diagnostics:{backend:{remux:{remux:{transport:lane,sharedHeap:false,crossOriginIsolated:false,sharedArrayBuffer:'undefined',jspiSuspending:'undefined',jspiPromising:'undefined',...overrides}}}}});
test('direct playback is observed as a bypass and cannot qualify runtime CPU',()=>{
  for(const lane of ['jspi','asyncify'])for(const route of ['native-direct','native-direct-ass']){
    assert.equal(remuxEvidence({lane},{route}).bypass,true);
    assert.throws(()=>requireRemuxCPU({lane},{route}),/bypassed/);
    assert.throws(()=>remuxEvidence({lane,forceRemux:true},{route}),/Forced remux/);
  }
});
test('requested private runtime must actually execute under its memory contract',()=>{
  for(const lane of ['jspi','asyncify']){
    assert.equal(requireRemuxCPU({lane},state(lane)).bypass,false);
    assert.throws(()=>remuxEvidence({lane},state(lane,{transport:'pthread'})),/Wrong actual/);
    assert.throws(()=>remuxEvidence({lane},state(lane,{sharedHeap:true})),/private memory/);
    assert.throws(()=>remuxEvidence({lane},{...state(lane),route:'software'}),/another route/);
  }
  assert.throws(()=>remuxEvidence({lane:'asyncify'},state('asyncify',{jspiPromising:'function'})),/without either JSPI/);
});
test('other lanes are unaffected, and missing runtime evidence is not a pass',()=>{
  assert.deepEqual(remuxEvidence({lane:'auto'},{route:'software'}),{requested:false});
  assert.throws(()=>remuxEvidence({lane:'jspi'},{route:'native-transcode'}),/UNQUALIFIED/);
});
test('composed mpv paths require their own matching private service evidence',()=>{
  const s=state('jspi');s.route='native-remux-mpv';
  assert.throws(()=>remuxEvidence({lane:'jspi'},s),/Missing private subtitle/);
  s.diagnostics.backend.mpvSubtitles={privateRuntime:{runtime:'jspi',memory:'ArrayBuffer',crossOriginIsolated:false,sharedArrayBuffer:'undefined'}};
  assert.equal(remuxEvidence({lane:'jspi'},s).services.mpvSubtitles.runtime,'jspi');
  s.diagnostics.backend.mpvSubtitles.privateRuntime.runtime='pthread';
  assert.throws(()=>remuxEvidence({lane:'jspi'},s),/Wrong private/);
});

test('forced reference permits verified Asyncify companion with JSPI APIs available',()=>{
  const s=state('asyncify');s.route='native-remux-mpv';
  s.diagnostics.backend.mpvSubtitles={privateRuntime:{runtime:'asyncify',memory:'ArrayBuffer',crossOriginIsolated:false,sharedArrayBuffer:'undefined',jspiSuspending:'function',jspiPromising:'function'}};
  assert.throws(()=>remuxEvidence({lane:'asyncify'},s),/without JSPI APIs/);
  assert.equal(remuxEvidence({lane:'asyncify',forceRemux:true},s).services.mpvSubtitles.runtime,'asyncify');
  s.diagnostics.backend.mpvSubtitles.privateRuntime.runtime='jspi';
  assert.throws(()=>remuxEvidence({lane:'asyncify',forceRemux:true},s),/Wrong private/);
});

test('private native-transcode-ass requires matching subtitle service evidence',()=>{
  for(const lane of ['jspi','asyncify']){
    const s=state(lane);s.route='native-transcode-ass';
    assert.throws(()=>remuxEvidence({lane},s),/Missing private subtitle/);
    s.diagnostics.backend.mpvSubtitles={privateRuntime:{runtime:lane,memory:'ArrayBuffer',crossOriginIsolated:false,sharedArrayBuffer:'undefined',jspiSuspending:'undefined',jspiPromising:'undefined'}};
    assert.equal(remuxEvidence({lane},s).services.mpvSubtitles.runtime,lane);
    s.diagnostics.backend.mpvSubtitles.privateRuntime.runtime='pthread';
    assert.throws(()=>remuxEvidence({lane},s),/Wrong private/);
  }
});

test('nonisolated playback lanes select explicit public modes and actual runtime evidence',()=>{
  for(const lane of nonisolatedPlaybackLanes){
    const {mode,runtime}=playbackLane(lane);
    assert.deepEqual(demuxeLaneOptions(lane),{mode,remuxRuntime:runtime});
    assert.equal(requiresNonisolated(lane),true);
    const s={route:mode+'-private',environment:{crossOriginIsolated:false,sharedArrayBuffer:'undefined',jspiSuspending:'function',jspiPromising:'function'},diagnostics:{mode,remuxRuntime:{runtime,isolated:false},backend:{plan:mode+'-private',path:'wasm',runtime,decoderBackend:mode==='hybrid'?'webcodecs':'ffmpeg'}}};
    assert.equal(requireRemuxCPU({lane},s).kind,'nonisolated-playback');
    const mutation=patch=>structuredClone({...s,...patch});
    assert.throws(()=>remuxEvidence({lane},mutation({route:'native-direct'})),/route/);
    assert.throws(()=>remuxEvidence({lane},mutation({environment:{crossOriginIsolated:true,sharedArrayBuffer:'function'}})),/nonisolated/);
    for(const [key,value] of [['runtime','pthread'],['plan','native-remux'],['path','native'],['decoderBackend',mode==='hybrid'?'ffmpeg':'webcodecs']]){
      const wrong=structuredClone(s);wrong.diagnostics.backend[key]=value;
      assert.throws(()=>remuxEvidence({lane},wrong),/UNQUALIFIED/);
    }
    const wrongMode=structuredClone(s);wrongMode.diagnostics.mode='auto';assert.throws(()=>remuxEvidence({lane},wrongMode),/mode/);
    const wrongSelection=structuredClone(s);wrongSelection.diagnostics.remuxRuntime.isolated=true;assert.throws(()=>remuxEvidence({lane},wrongSelection),/selected/);
    const audioOnly=structuredClone(s);delete audioOnly.diagnostics.backend.decoderBackend;
    assert.equal(remuxEvidence({lane,video:false},audioOnly).decoderBackend,'not-applicable');
  }
  assert.deepEqual(demuxeLaneOptions('jspi'),{experimentalRemuxRuntime:'jspi'});
  assert.deepEqual(demuxeLaneOptions('software'),{mode:'software'});
  assert.deepEqual(demuxeLaneOptions('auto'),{});
  assert.equal(requiresNonisolated('software'),false);
});
