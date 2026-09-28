// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceFixture} from './specialist-contract.mjs';
const fixture={probe:{streams:[{codec_type:'video',avg_frame_rate:'24/1'},{codec_type:'audio'}]}};
test('known unmarked base recipes use presence-only references and their own frame rate',()=>{
  const result=referenceFixture('dv5',fixture,{label:'Dolby Vision 5'});
  assert.equal(result.markedAudio,false);assert.equal(result.markedVideo,false);assert.equal(result.frameRate,24);
  assert.equal(result.label,'Dolby Vision 5');assert.equal(result.referenceScreen,true);
});
test('unknown recipes cannot silently inherit marker claims',()=>{
  assert.throws(()=>referenceFixture('unknown',fixture),/Missing explicit/);
  const result=referenceFixture('authored',{...fixture,markedAudio:true,markedVideo:true});
  assert.equal(result.markedAudio,true);assert.equal(result.markedVideo,true);
});
test('missing streams and invalid cadence cannot create a qualification contract',()=>{
  assert.throws(()=>referenceFixture('dv5',{}),/Missing probed/);
  assert.throws(()=>referenceFixture('dv5',{probe:{streams:[{codec_type:'video',avg_frame_rate:'0/0'}]}}),/Invalid specialist frame rate/);
});
