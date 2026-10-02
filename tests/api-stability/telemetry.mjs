// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPlaybackStatistics,playbackStatisticsClockReads,selectPlaybackStatistics,transitionPlaybackStatistics,createNativeProgress,resetNativeProgress,sampleNativeProgress} from '../../web/generated/internal/machine/telemetry.js';
import {PlaybackStatistics} from '../../web/generated/internal/playback-statistics.js';
import {NativeProgressWatchdog} from '../../web/generated/internal/watchdogs.js';

const observe=(status,patch={})=>({kind:'observe',observation:{sourceId:3,status,playbackIntent:'play',operationPending:false,...patch}});
const apply=(state,command,...timestamps)=>transitionPlaybackStatistics(state,{...command,timestamps});

test('statistics distinguish startup, rebuffer, operation waits and preserving handoff',()=>{
  const empty=createPlaybackStatistics();let state=apply(empty,{kind:'accept',sourceId:3,preserve:false,elapsed:80},1000);
  const accepted=state;
  state=apply(state,observe('buffering'));assert.equal(state.data.rebufferCount,0);assert.equal(state.waitingAt,null);
  state=apply(state,observe('playing'),1250);assert.equal(state.data.firstPlayingMs,250);
  state=apply(state,observe('buffering'),1500);const waiting=state;
  assert.equal(selectPlaybackStatistics(state,1600).rebufferMs,100);assert.equal(state.data.rebufferMs,0);assert.equal(state.waitingAt,1500);
  state=apply(state,observe('buffering'));assert.equal(state,waiting,'Repeated waiting is not another rebuffer');
  state=apply(state,observe('buffering',{operationPending:true}),1800);assert.equal(state.data.rebufferMs,300);assert.equal(state.waitingAt,null);
  state=apply(state,observe('playing'));state=apply(state,{kind:'seek',milliseconds:18});
  state=apply(state,observe('buffering'),2200);state=apply(state,{kind:'accept',sourceId:3,preserve:true,elapsed:999},2400);
  assert.deepEqual(selectPlaybackStatistics(state),{sourceId:3,sessionEpoch:2,acceptedAtMs:1000,openToAcceptanceMs:80,firstPlayingMs:250,lastSeekMs:18,seekCount:1,rebufferCount:2,rebufferMs:500,decodedFrames:null,presentedFrames:null,droppedFrames:null,throughputBitsPerSecond:null});
  assert.equal(empty.data.sourceId,null);assert.equal(accepted.data.firstPlayingMs,null);assert.equal(waiting.data.rebufferMs,0);
});
test('new sources, clear and pre-acceptance seeks have separate statistics lifetimes',()=>{
  let state=createPlaybackStatistics();assert.equal(apply(state,{kind:'seek',milliseconds:10}),state);
  state=apply(state,{kind:'accept',sourceId:3,preserve:false,elapsed:20},100);
  state=apply(state,observe('playing'),125);state=apply(state,{kind:'seek',milliseconds:5});state=apply(state,observe('buffering'),150);
  state=apply(state,{kind:'accept',sourceId:4,preserve:false,elapsed:30},200,205);
  assert.equal(state.data.sourceId,4);assert.equal(state.data.sessionEpoch,1);assert.equal(state.data.acceptedAtMs,205);assert.equal(state.data.openToAcceptanceMs,30);
  assert.equal(state.data.firstPlayingMs,null);assert.equal(state.data.rebufferMs,0);assert.equal(state.data.rebufferCount,0);assert.equal(state.data.seekCount,0);assert.equal(state.waitingAt,null);
  const retained=selectPlaybackStatistics(state);state=apply(state,{kind:'clear'});assert.equal(state.data.sourceId,null);assert.equal(retained.sourceId,4);
  assert.equal(apply(state,{kind:'seek',milliseconds:10}),state);
});
test('paused intent, idle observations and existing waits preserve their distinct semantics',()=>{
  let state=apply(createPlaybackStatistics(),{kind:'accept',sourceId:3,preserve:false,elapsed:10},100);
  state=apply(state,observe('playing'),120);
  assert.equal(apply(state,observe('buffering',{playbackIntent:'pause'})),state);
  state=apply(state,observe('buffering'),150);
  const current=state;state=apply(state,observe('idle',{sourceId:null}));assert.equal(state,current,'Idle alone is not a substitute for clear');
  state=apply(state,observe('paused',{playbackIntent:'pause'}),200);assert.equal(state.data.rebufferMs,50);assert.equal(state.waitingAt,null);
  assert.equal(selectPlaybackStatistics(state).rebufferMs,50);
});
test('statistics clock requirements and wrapper sampling retain lazy read cadence',()=>{
  let now=100,reads=0;const wrapper=new PlaybackStatistics(()=>{reads++;return now++;});
  wrapper.snapshot();wrapper.seek(1);wrapper.observe({sourceId:null});assert.equal(reads,0);
  wrapper.accept(3,false,20);assert.equal(reads,1);assert.equal(wrapper.snapshot().acceptedAtMs,100);assert.equal(reads,1);
  const buffering={sourceId:3,status:'buffering',playbackIntent:'play',pendingOperation:null};
  wrapper.observe(buffering);assert.equal(reads,1,'Startup buffering does not sample a clock');
  wrapper.observe({...buffering,status:'playing'});assert.equal(reads,2);assert.equal(wrapper.snapshot().firstPlayingMs,1);
  wrapper.observe({...buffering,status:'playing'});assert.equal(reads,2);
  wrapper.observe(buffering);assert.equal(reads,3);wrapper.observe(buffering);assert.equal(reads,3);
  assert.equal(wrapper.snapshot().rebufferMs,1);assert.equal(reads,4);
  wrapper.accept(4,false,30);assert.equal(reads,6);assert.equal(wrapper.snapshot().acceptedAtMs,105);assert.equal(reads,6);
  wrapper.accept(4,true,50);assert.equal(reads,6);assert.equal(wrapper.snapshot().sessionEpoch,2);
  wrapper.clear();wrapper.snapshot();assert.equal(reads,6);
  const state=createPlaybackStatistics();assert.equal(playbackStatisticsClockReads(state,{kind:'snapshot'}),0);
  assert.throws(()=>apply(state,{kind:'accept',sourceId:3,preserve:false,elapsed:1}),/timestamp count/);
});
test('statistics inputs and snapshots remain detached and immutable',()=>{
  let state=apply(createPlaybackStatistics(),{kind:'accept',sourceId:3,preserve:false,elapsed:20},100);
  const input={...observe('playing'),timestamps:[150]},retained=state;
  state=transitionPlaybackStatistics(state,input);input.observation.status='buffering';input.timestamps[0]=999;
  assert.equal(retained.data.firstPlayingMs,null);assert.equal(state.data.firstPlayingMs,50);assert.equal(Object.isFrozen(input),false);assert.equal(Object.isFrozen(input.observation),false);
  for(const value of [state,state.data,selectPlaybackStatistics(state)])assert.equal(Object.isFrozen(value),true);
  state=apply(state,observe('buffering'),200);assert.throws(()=>selectPlaybackStatistics(state),/sampled timestamp/);
});

function progressHistory(samples,timeout=2000){
  let state=createNativeProgress();const wrapper=new NativeProgressWatchdog(),outcomes=[];
  for(const [now,sample,expected] of samples){
    const before=state,result=sampleNativeProgress(state,now,sample,timeout);state=result.state;outcomes.push(result.stalled);
    assert.equal(result.stalled,expected,`Core sample at ${now}`);assert.equal(wrapper.sample(now,sample,timeout),expected,`Wrapper sample at ${now}`);
    assert.equal(Object.isFrozen(state),true);if(state.previous)assert.equal(Object.isFrozen(state.previous),true);assert.equal(Object.isFrozen(before),true);
  }
  return {state,outcomes};
}
test('clock stalls require a full budget and take priority over simultaneous video stalls',()=>{
  progressHistory([0,500,1000,1500,2000].map(now=>[now,{eligible:true,time:1,rate:1,frames:2,frameIntervalMs:40},now===2000?'clock':undefined]));
  progressHistory([0,500,1000,1500,2000].map(now=>[now,{eligible:true,time:now/1000000},now===2000?'clock':undefined]));
});
test('normal low and high rate clock progression does not create failures',()=>{
  for(const rate of [.1,1,8])progressHistory(Array.from({length:61},(_,index)=>{const now=index*500;return [now,{eligible:true,time:now/1000*rate,rate},undefined];}));
});
test('sparse frames use three intervals while unknown cadence cannot establish a video stall',()=>{
  progressHistory(Array.from({length:13},(_,index)=>{const now=index*500;return [now,{eligible:true,time:now/1000,frames:2,frameIntervalMs:2000},now===6000?'video':undefined];}));
  for(const frameIntervalMs of [undefined,NaN])progressHistory(Array.from({length:31},(_,index)=>{const now=index*500;return [now,{eligible:true,time:now/1000,frames:2,frameIntervalMs},undefined];}));
});
test('new cadence or newly observable frames start a fresh frame budget',()=>{
  progressHistory(Array.from({length:10},(_,index)=>{const now=index*500;return [now,{eligible:true,time:now/1000,frames:2,frameIntervalMs:now<1500?40:1000},now===4500?'video':undefined];}));
  progressHistory(Array.from({length:8},(_,index)=>{const now=index*500;return [now,{eligible:true,time:now/1000,frames:now<1500?undefined:2,frameIntervalMs:40},now===3500?'video':undefined];}));
});
test('ineligible and invalid clock samples reset suspicion before playback resumes',()=>{
  for(const rejected of [{eligible:false,time:1},{eligible:true,time:NaN},{eligible:true,time:Infinity}])progressHistory([
    [0,{eligible:true,time:1},undefined],[1500,{eligible:true,time:1},undefined],[2000,rejected,undefined],
    [10000,{eligible:true,time:1},undefined],[11500,{eligible:true,time:1},undefined],[12000,{eligible:true,time:1},'clock'],
  ]);
});
test('seeks, rate changes and backward sampling clocks reset both budgets',()=>{
  for(const discontinuity of [{time:0,rate:1},{time:10,rate:1},{time:1,rate:2}])progressHistory([
    [0,{eligible:true,time:1,rate:1},undefined],[1500,{eligible:true,time:1,rate:1},undefined],
    [2000,{eligible:true,...discontinuity},undefined],[3500,{eligible:true,...discontinuity},undefined],[4000,{eligible:true,...discontinuity},'clock'],
  ]);
  progressHistory([[0,{eligible:true,time:1},undefined],[1500,{eligible:true,time:1},undefined],[1000,{eligible:true,time:1},undefined],[2500,{eligible:true,time:1},undefined],[3000,{eligible:true,time:1},'clock']]);
});
test('event-loop suspension cutoff is strictly greater than two seconds',()=>{
  progressHistory([[0,{eligible:true,time:1},undefined],[1500,{eligible:true,time:1},undefined],[3500,{eligible:true,time:1},'clock']]);
  progressHistory([[0,{eligible:true,time:1},undefined],[1500,{eligible:true,time:1},undefined],[3501,{eligible:true,time:1},undefined],[5001,{eligible:true,time:1},undefined],[5501,{eligible:true,time:1},'clock']]);
});
test('explicit watchdog reset and copied observations never mutate retained state',()=>{
  const sample={eligible:true,time:1,frames:2,frameIntervalMs:40};let state=sampleNativeProgress(createNativeProgress(),0,sample,2000).state;
  const retained=state;sample.time=100;sample.frames=99;assert.equal(state.previous.time,1);assert.equal(state.previous.frames,2);assert.equal(Object.isFrozen(sample),false);
  state=sampleNativeProgress(state,1500,{eligible:true,time:1,frames:2,frameIntervalMs:40},2000).state;
  state=resetNativeProgress(state);assert.equal(state.previous,null);assert.equal(state.lastSample,null);assert.equal(retained.previous.time,1);
  assert.equal(sampleNativeProgress(state,2000,{eligible:true,time:1,frames:2,frameIntervalMs:40},2000).stalled,undefined);
  const wrapper=new NativeProgressWatchdog();wrapper.sample(0,{eligible:true,time:1},2000);wrapper.sample(1500,{eligible:true,time:1},2000);wrapper.reset();assert.equal(wrapper.sample(2000,{eligible:true,time:1},2000),undefined);
});
