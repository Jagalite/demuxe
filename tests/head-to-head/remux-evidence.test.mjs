// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {remuxEvidence,requireRemuxCPU} from './remux-evidence.mjs';
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
  assert.throws(()=>remuxEvidence({lane:'jspi'},{route:'native-transcode'}),/Wrong actual/);
});
test('composed mpv paths require their own matching private service evidence',()=>{
  const s=state('jspi');s.route='native-remux-mpv';
  assert.throws(()=>remuxEvidence({lane:'jspi'},s),/Missing private subtitle/);
  s.diagnostics.backend.mpvSubtitles={privateRuntime:{runtime:'jspi',memory:'ArrayBuffer',crossOriginIsolated:false}};
  assert.equal(remuxEvidence({lane:'jspi'},s).services.mpvSubtitles.runtime,'jspi');
  s.diagnostics.backend.mpvSubtitles.privateRuntime.runtime='pthread';
  assert.throws(()=>remuxEvidence({lane:'jspi'},s),/Wrong private/);
});
