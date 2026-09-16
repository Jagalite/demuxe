import test from 'node:test';
import assert from 'node:assert/strict';
import {RemuxPlayer,windowedBrowserSupported} from '../web/native-remux-player.js';

function pump(ranges,extra={}){
 const sent=[],errors=[];
 const p=Object.assign(Object.create(RemuxPlayer.prototype),{
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
 const player=Object.assign(Object.create(RemuxPlayer.prototype),{generation:4,pendingUpdates:new Set([a,b]),receipts:new Map(),sbs:[a,b],busy:true,windowed:false,pump:()=>pulls++});
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
 const player=Object.assign(Object.create(RemuxPlayer.prototype),{windowed:true,video:{buffered},timelineBias:1,presentationFloor:23.5});
 assert.deepEqual(player.ranges(),[[23.5,26]]);
});

test('an internal window end is not source EOF even after final work was generated',()=>{
 const p=Object.assign(Object.create(RemuxPlayer.prototype),{windowed:true,eof:true,pending:null,busy:false,duration:30,timelineBias:1,video:{ended:true,currentTime:29}});
 assert.equal(p.playbackEnded,false);p.video.currentTime=31;assert.equal(p.playbackEnded,true);p.pending=[new ArrayBuffer(1)];assert.equal(p.playbackEnded,false);
});

test('a seek within the final 20 milliseconds accepts real remaining coverage',()=>{
 const p=Object.assign(Object.create(RemuxPlayer.prototype),{windowed:true,target:29.995,duration:30,ranges:()=>[[29.9,30]]});
 assert.equal(p.hasStartupCoverage(),true);p.target=30;assert.equal(p.hasStartupCoverage(),false);
});
test('window recovery preserves play intent when the browser paused at an internal end',async()=>{
 for(const intent of [true,false]){
  let plays=0;const p=Object.assign(Object.create(RemuxPlayer.prototype),{windowed:true,recoveryPlaying:intent,generation:1,stats:{errors:[],recoveries:[]},video:{currentTime:5,paused:true,play:async()=>{plays++;}},timelineBias:1,stopWorkers:()=>{},restart:async()=>{}});
  p.fail('Remux mux worker failed');await new Promise(r=>setTimeout(r,0));assert.equal(p.recoveryPlaying,intent);assert.equal(plays,intent?1:0);
 }
});
