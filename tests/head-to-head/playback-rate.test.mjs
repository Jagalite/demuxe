// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {observePlaybackRate,rateObservation,validatePlaybackRate} from './playback-rate.mjs';
const window=(advance,wall=2000)=>[{wallMs:1000,snapshotWallMs:5,position:3},{wallMs:1000+wall,snapshotWallMs:5,position:3+advance}];
test('sustained actual-wall rate accepts1.25x and rejects ignored1x setters',()=>{
  assert.equal(validatePlaybackRate(window(2.5)).passed,true);
  assert.throws(()=>validatePlaybackRate(window(2)),/does not match/);
  assert.throws(()=>validatePlaybackRate(window(0)),/does not match/);
  assert.throws(()=>validatePlaybackRate(window(4)),/does not match/);
  assert.equal(validatePlaybackRate(window(3,2400)).expectedAdvance,3);
});
test('snapshot timing uses midpoint and rejects gaps or invalid clocks',()=>{
  assert.deepEqual(rateObservation({position:4},100,120),{wallMs:110,snapshotWallMs:20,position:4});
  assert.throws(()=>rateObservation({position:4},100,500),/unbounded/);
  assert.throws(()=>rateObservation({position:NaN},100,120),/invalid/);
  for(const [advance,wall] of [[2.5,800],[2.5,4000],[-1,2000]])assert.throws(()=>validatePlaybackRate(window(advance,wall)),/bounds/);
  const bad=window(2.5);bad[1].snapshotWallMs=500;assert.throws(()=>validatePlaybackRate(bad),/observation/);
});

test('snapshot uncertainty cannot promote true1x progression into1.25x',()=>{
  // First state at call start, second at call end: true1x, midpoint appears1.125x.
  const biased=[{wallMs:1125,snapshotWallMs:250,position:1},{wallMs:3125,snapshotWallMs:250,position:3.25}];
  assert.throws(()=>validatePlaybackRate(biased),/snapshot uncertainty/);
  // A nominally correct midpoint with large uncertainty cannot prove the rate.
  assert.throws(()=>validatePlaybackRate([{...biased[0],position:1},{...biased[1],position:3.5}]),/snapshot uncertainty/);
  const actual=validatePlaybackRate(window(2.5));
  assert.ok(actual.minimumObservedRate>1.2&&actual.maximumObservedRate<1.3);
});

async function observed(rate,{period=250,phase=0,gap=10}={}){
  let wall=phase;
  return observePlaybackRate(()=>3+Math.floor(wall/period)*period/1000*rate,
    {now:()=>wall,sleep:async()=>{wall+=gap;}});
}
test('cached public state is measured at observed updates across sampling phases',async()=>{
  for(const period of [16,100,250,333])for(const phase of [0,17,129,249]){
    const samples=await observed(1.25,{period,phase});
    assert.equal(validatePlaybackRate(samples).passed,true,JSON.stringify({period,phase,samples}));
    assert.ok(samples.every(sample=>sample.snapshotWallMs===10));
  }
});
test('cached1x, slow and fast playback cannot pass the unchanged rate limits',async()=>{
  for(const rate of [0.75,1,1.5,2])for(const phase of [0,37,199]){
    const samples=await observed(rate,{phase});
    assert.throws(()=>validatePlaybackRate(samples),/does not match/);
  }
});
test('stalled, backward, invalid and unbounded observations fail closed',async()=>{
  await assert.rejects(observed(0),/bounded progression window/);
  await assert.rejects(observed(-1),/backward/);
  await assert.rejects(observed(NaN),/invalid/);
  await assert.rejects(observed(1.25,{gap:300}),/unbounded/);
});
