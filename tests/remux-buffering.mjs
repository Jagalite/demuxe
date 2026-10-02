// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {RemuxPlayer,windowedBrowserSupported} from '../web/native-remux-player.js';
import {initialRemuxLifecycle} from '../web/generated/internal/machine/remux-lifecycle.js';

function fixture(values){
 const {generation=0,stopped=false,starting=false,targetReady=false,recoveryPlaying=false,...resources}=values;
 const lifecycle=Object.freeze({...initialRemuxLifecycle(),generation,stopped,starting,targetReady,playing:recoveryPlaying,active:!stopped});
 return Object.assign(Object.create(RemuxPlayer.prototype),{lifecycle},resources);
}

function pump(ranges,extra={}){
 const sent=[],errors=[];
 const p=fixture({
  stopped:false,sb:{updating:false},busy:false,media:{readyState:'open'},
  video:{currentTime:1},timelineBias:1,target:0,targetReady:false,
  ranges:()=>ranges,raps:[],segments:[],pending:null,eof:false,
  stats:{peakBufferedSeconds:0,peakBufferedBytesUpperBound:0,gapSkips:[]},
  worker:{postMessage:m=>sent.push(m)},fail:e=>errors.push(e),...extra
 });
 p.pump();return {sent,errors};
}
test('paused Opus leading gap does not drain the source',()=>{
 const result=pump([[.001,5.581]]);assert.deepEqual(result,{sent:[],errors:[]});
});
test('fragmented future ranges fail before full-source remuxing',()=>{
 const result=pump([[.02,.53],[12.1,12.2]]);assert.equal(result.sent.length,0);assert.match(result.errors[0],/timeline gap/);
});
test('useful short contiguous buffering permits one further batch',()=>{
 const result=pump([[0,2]]);assert.deepEqual(result,{sent:[{type:'next',id:1}],errors:[]});
});

test('small MSE holes advance only a playing stalled output',()=>{
 for(const [paused,readyState,expected] of [[false,2,2.2],[true,2,2],[false,4,2]]){
  const video={currentTime:2,paused,readyState};pump([[0,1],[1.2,3]],{video,targetReady:true});assert.equal(video.currentTime,expected);
 }
 const video={currentTime:2,paused:false,readyState:2};pump([[0,1],[2,4]],{video,targetReady:true});assert.equal(video.currentTime,2);
});

test('both completed SourceBuffers release one append transaction exactly once',()=>{
 const a={updating:false},b={updating:false};let pulls=0;
 const player=fixture({generation:4,pendingUpdates:new Set([a,b]),receipts:new Map(),sbs:[a,b],busy:true,windowed:false,pump:()=>pulls++});
 player.updateFinished(a,3);assert.equal(pulls,0);assert.equal(player.pendingUpdates.size,2);
 player.updateFinished(a,4);assert.equal(pulls,0);assert.equal(player.busy,true);
 player.updateFinished(b,4);assert.equal(pulls,1);assert.equal(player.busy,false);
 player.updateFinished(a,4);player.updateFinished(b,4);assert.equal(pulls,1);
});
test('a pending conversion cannot be duplicated by a timer or update event',()=>{
 const result=pump([[0,1]],{pulling:true});assert.deepEqual(result,{sent:[],errors:[]});
});

test('a paused accepted window retains queued work without appending or evicting',()=>{
 const result=pump([[0,2]],{windowed:true,targetReady:true,recoveryPlaying:false,pending:[new ArrayBuffer(4)],sbs:[],append:()=>{throw Error('Paused append');}});
 assert.deepEqual(result,{sent:[],errors:[]});
});

test('windowed Native admission excludes the reproduced Firefox seek limitation',()=>{
 assert.equal(windowedBrowserSupported('Mozilla Chrome/152.0.0.0 Safari/537.36'),true);
 for(const ua of ['Mozilla Firefox/142.0','Mozilla Version/18 Safari/605','Chrome/152.0 Android Mobile','Chrome/152.0 Edg/152.0'])assert.equal(windowedBrowserSupported(ua),false);
});

test('seek preroll never expands the accepted source coverage across skipped media',()=>{
 const buffered={length:1,start:()=>1,end:()=>27};
 const player=fixture({windowed:true,video:{buffered},timelineBias:1,presentationFloor:23.5});
 assert.deepEqual(player.ranges(),[[23.5,26]]);
});

test('an internal window end is not source EOF even after final work was generated',()=>{
 const p=fixture({windowed:true,eof:true,pending:null,busy:false,duration:30,timelineBias:1,video:{ended:true,currentTime:29}});
 assert.equal(p.playbackEnded,false);p.video.currentTime=31;assert.equal(p.playbackEnded,true);p.pending=[new ArrayBuffer(1)];assert.equal(p.playbackEnded,false);
});

test('a seek within the final 20 milliseconds accepts real remaining coverage',()=>{
 const p=fixture({windowed:true,target:29.995,duration:30,ranges:()=>[[29.9,30]]});
 assert.equal(p.hasStartupCoverage(),true);p.target=30;assert.equal(p.hasStartupCoverage(),false);
});
test('window recovery preserves play intent when the browser paused at an internal end',async()=>{
 for(const intent of [true,false]){
  let plays=0;const p=fixture({windowed:true,recoveryPlaying:intent,generation:1,stats:{errors:[],recoveries:[]},video:{currentTime:5,paused:true,play:async()=>{plays++;}},timelineBias:1,stopWorkers:()=>{},start:async()=>{}});
  p.fail('Remux mux worker failed');await new Promise(r=>setTimeout(r,0));assert.equal(p.recoveryPlaying,intent);assert.equal(plays,intent?1:0);
 }
});

test('portable remux goals scale with consumption rate but paused preload stays bounded',()=>{
 const buffering={preload:'auto',forwardSeconds:5,backwardSeconds:3,forwardLimitBytes:12*1024*1024};
 assert.equal(pump([[0,6]],{buffering,video:{currentTime:1,paused:false,playbackRate:2}}).sent.length,1);
 assert.equal(pump([[0,6]],{buffering,video:{currentTime:1,paused:true,playbackRate:2}}).sent.length,0);
 assert.equal(pump([[0,2]],{buffering:{...buffering,preload:'metadata'},video:{currentTime:1,paused:true}}).sent.length,0);
 assert.equal(pump([[0,2]],{buffering,segments:[{bytes:12*1024*1024}]}).sent.length,0);
});
test('remux history eviction stays before the retained GOP',()=>{
 const removed=[];pump([[0,20]],{video:{currentTime:21,paused:false},targetReady:true,buffering:{backwardSeconds:3},raps:[0,10,18,20],lastEviction:-Infinity,sb:{updating:false,remove:(a,b)=>removed.push([a,b])}});
 assert.deepEqual(removed,[[0,10.99999]]);
});

test('remux starvation observes stopped playback near an outstanding producer, not downloading',()=>{
 let changes=0;
 const p=fixture({generation:1,targetReady:true,timelineBias:1,pulling:true,video:{currentTime:5,paused:false,playbackRate:2},ranges:()=>[[0,4.6]],onBufferingChange:()=>changes++});
 p.observeStarvation(0);p.observeStarvation(749);assert.equal(!!p.waitingForMedia,false);
 p.observeStarvation(750);assert.equal(p.waitingForMedia,true);
 p.video.currentTime=5.1;p.observeStarvation(800);assert.equal(p.waitingForMedia,false);assert.equal(changes,2);
 for(const property of ['paused','seeking']){p.video[property]=true;p.observeStarvation(2000);assert.equal(p.waitingForMedia,false);p.video[property]=false;}
 p.observeStarvation(2100);p.pulling=false;p.observeStarvation(3000);assert.equal(p.waitingForMedia,false);
 p.pulling=true;p.ranges=()=>[[0,20]];p.observeStarvation(4000);assert.equal(p.waitingForMedia,false);
 p.ranges=()=>[[0,4.6]];p.lifecycle=Object.freeze({...p.lifecycle,generation:p.generation+1});p.observeStarvation(5000);assert.equal(p.waitingForMedia,false);
 p.video.currentTime=5.2;p.observeStarvation(6000);assert.equal(p.waitingForMedia,false);
});

test('runtime policy changes update remux scheduling without restarting its generation',()=>{
 const p=fixture({generation:9,video:{paused:false,playbackRate:1},buffering:{forwardSeconds:5}});
 p.setBuffering({forwardSeconds:30,backwardSeconds:10,preload:'auto'});
 assert.equal(p.forwardTargetSeconds(),30);assert.equal(p.generation,9);
 p.setBuffering({forwardSeconds:30,preload:'metadata'});p.video.paused=true;assert.equal(p.forwardTargetSeconds(),1);
});

test('worker remux forwards runtime policies and commits only acknowledged updates',async()=>{
 const {WorkerRemuxController}=await import('../web/worker-remux-controller.js');
 const calls=[],p=Object.assign(Object.create(WorkerRemuxController.prototype),{options:{},call:async(...args)=>calls.push(args)});
 const policy={forwardSeconds:15,backwardSeconds:2};await p.setBuffering(policy);
 assert.deepEqual(calls,[['setBuffering',policy]]);assert.deepEqual(p.options.buffering,policy);
 p.call=async()=>{throw Error('worker rejected');};await assert.rejects(p.setBuffering({forwardSeconds:30}),/worker rejected/);assert.deepEqual(p.options.buffering,policy);
 p.local={setBuffering:async value=>calls.push(['local',value])};await p.setBuffering({forwardSeconds:7});assert.equal(calls.at(-1)[0],'local');
});

function pressureFixture(windowed=false){
 const removals=[],sent=[],errors=[],MiB=1024*1024;
 const buffers=Array.from({length:windowed?2:1},(_,lane)=>{
  let start=1;
  return {updating:false,buffered:{length:1,start:()=>start,end:()=>13},remove(a,b){removals.push({lane,start:a,end:b});start=b;this.updating=true;}};
 });
 const p=fixture({
  generation:1,stopped:false,windowed,recoveryPlaying:true,targetReady:true,target:0,timelineBias:1,
  video:{currentTime:11.25,paused:false,playbackRate:1,readyState:4},
  sb:buffers[0],sbs:buffers,media:{readyState:'open',endOfStream(){}},
  ranges:()=>[[Math.max(...buffers.map(b=>b.buffered.start(0)))-1,12]],
  raps:[0,2,4,6,8,10,12],lastEviction:-Infinity,lastEvictions:[],trackBounds:{videoEnd:100,audioEnd:100},
  segments:buffers.flatMap((_,lane)=>[2,4,6,8,10,12].map(end=>({lane,end,bytes:2*MiB/buffers.length}))),
  pendingUpdates:new Set(),receipts:new Map(),busy:false,pending:null,eof:false,
  stats:{peakBufferedSeconds:0,peakBufferedBytesUpperBound:0,gapSkips:[]},
  worker:{postMessage:value=>sent.push(value)},fail:value=>errors.push(value),
 });
 const finish=()=>{for(let i=0;i<5&&p.pendingUpdates.size;i++){const sb=[...p.pendingUpdates][0];sb.updating=false;p.updateFinished(sb,1);}};
 return {p,removals,sent,errors,finish,MiB};
}
for(const windowed of [false,true]){
 test(`byte pressure shortens long history and resumes fetching (${windowed?'separate lanes':'muxed'})`,()=>{
  const {p,removals,sent,errors,finish,MiB}=pressureFixture(windowed);
  if(windowed)for(const segment of p.segments)segment.bytes*=2; // Pressure remains until both lanes release history.
  p.setBuffering({preload:'auto',forwardSeconds:30,backwardSeconds:60,forwardLimitBytes:12*MiB});
  p.pump();assert.equal(sent.length,0,'wait for eviction completion');
  finish();assert.equal(sent.length,1);assert.deepEqual(errors,[]);
  assert.equal(removals.length,windowed?2:1);
  for(const removal of removals)assert.ok(removal.end<=11&&removal.end>10.99,'preserve current GOP beginning at source time 10');
  assert.ok(p.segments.every(s=>s.end===12));assert.ok(p.stats.bufferedBytesUpperBound<12*MiB);
 });
 test(`reducing runtime budget reclaims history without changing playback (${windowed?'separate lanes':'muxed'})`,()=>{
  const {p,removals,sent,errors,finish,MiB}=pressureFixture(windowed);
  p.setBuffering({preload:'auto',forwardSeconds:1,backwardSeconds:60,forwardLimitBytes:16*MiB});p.pump();
  assert.equal(removals.length,0);assert.equal(sent.length,0);
  p.setBuffering({preload:'auto',forwardSeconds:30,backwardSeconds:60,forwardLimitBytes:8*MiB});p.pump();finish();
  assert.equal(sent.length,1);assert.deepEqual(errors,[]);assert.equal(p.video.currentTime,11.25);assert.equal(p.generation,1);
 });
}
test('pressure does not remove the current GOP when no older RAP can be evicted',()=>{
 const {p,removals,MiB}=pressureFixture();p.raps=[0,12];
 p.setBuffering({preload:'auto',backwardSeconds:60,forwardLimitBytes:8*MiB});p.pump();
 assert.equal(removals.length,0);assert.equal(p.segments.length,6);
});

test('an exhausted protected GOP reports budget failure instead of silently stalling',()=>{
 const {p,removals,sent,errors,MiB}=pressureFixture();p.raps=[0];p.ranges=()=>[[0,10.25]];
 p.setBuffering({preload:'auto',backwardSeconds:60,forwardLimitBytes:8*MiB});p.pump();
 assert.equal(removals.length,0);assert.equal(sent.length,0);assert.match(errors[0],/coded-data budget.*current GOP/);
});
