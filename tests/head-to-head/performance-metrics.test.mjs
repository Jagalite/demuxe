// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {frameObservation,validateFrameWindow,cpuGain} from './performance-metrics.mjs';
const samples=Array.from({length:11},(_,i)=>({at:i*2000,state:{video:{total:i*60,dropped:0}}}));
test('CPU gains keep sign, do not divide by zero, and do not pool baselines',()=>{
 assert.equal(cpuGain(20,10),50);assert.equal(cpuGain(10,20),-100);assert.throws(()=>cpuGain(0,1));assert.throws(()=>cpuGain(NaN,1));
});
test('route counters preserve semantics and unavailable drops',()=>{
 assert.equal(frameObservation({diagnostics:{backend:{presentation:{drawn:45}}}},{player:'demuxe'}).dropped,null);
 assert.equal(frameObservation({stats:{videoFrameRenderCount:30,videoFrameDropCount:2}},{player:'libmedia'}).presented,30);
 assert.equal(frameObservation({renderQuality:{totalVideoFrames:32,droppedVideoFrames:2}},{player:'movi'}).presented,30);
 assert.throws(()=>frameObservation({diagnostics:{backend:{rendered:42}}},{player:'demuxe'}),/UNQUALIFIED/);
 assert.equal(validateFrameWindow([{at:0,state:{}},{at:20000,state:{}}],{video:false}).counter,'audio-only');
});
test('cadence rejects frozen output, counter resets, poor cadence and excessive drops',()=>{
 assert.equal(validateFrameWindow(samples,{}).presentedFrames,600);
 for(const change of [s=>s[5].state.video.total=s[4].state.video.total,s=>s[5].state.video.total=0,s=>s.forEach(x=>x.state.video.total/=2),s=>s.at(-1).state.video.dropped=8]){
  const s=structuredClone(samples);change(s);assert.throws(()=>validateFrameWindow(s,{}));
 }
});

test('browser retirement requires process exit, not only acknowledgment',async()=>{
 const {closeBrowserObserved}=await import('./browser-exit.mjs');
 const late={close:()=>new Promise(()=>{})};
 const result=await closeBrowserObserved(late,[1],{remaining:()=>[],delay:async()=>{},attempts:1});
 assert.equal(result.playwrightCloseAcknowledged,false);assert.deepEqual(result.remainingProcessIDs,[]);
 await assert.rejects(closeBrowserObserved({close:async()=>{}},[1],{remaining:()=>[1],delay:async()=>{},attempts:1}),/remain/);
});
