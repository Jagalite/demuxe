// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignExitCode} from './completion.mjs';
const release={catalogue:true,selection:'demuxe'};
const summary=cases=>({kind:'correctness',browserIdentity:'chromium/pinned/headless',passed:cases.every(c=>c.status==='passed'),cases});
test('complete passing and bounded-screen catalogues reach release comparison',()=>{
  assert.equal(campaignExitCode(summary([{status:'passed'}]),release),0);
  assert.equal(campaignExitCode(summary([{status:'passed'},{status:'blocked'}]),release),1);
  assert.equal(campaignExitCode(summary([{status:'blocked',screenPassed:true}]),release),1);
  assert.equal(campaignExitCode(summary([{status:'passed'},{status:'failed'}]),release),1);
});
test('missing browser and catalogues without a successful screen stop orchestration',()=>{
  for(const cases of [[],[{status:'blocked'}],[{status:'failed'}],[{status:'failed',screenPassed:true}],[{status:'skipped'}]])
    assert.equal(campaignExitCode(summary(cases),release),2);
  assert.equal(campaignExitCode({...summary([{status:'passed'}]),browserIdentity:null},release),2);
});
test('focused limitations and performance diagnostics retain their existing nonzero result',()=>{
  const blocked=summary([{status:'blocked'}]);
  assert.equal(campaignExitCode(blocked,{catalogue:true,selection:'demuxe.auto.specialist'}),1);
  assert.equal(campaignExitCode(blocked),1);
  assert.equal(campaignExitCode({...blocked,kind:'performance'},release),1);
});
