// Injected backend and actual Player operation queue; no playback claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
if(!process.env.UNIFIED_PLAYER_MODULE)throw Error('Set UNIFIED_PLAYER_MODULE to compiled Player');
const {Player}=await import(pathToFileURL(resolve(process.env.UNIFIED_PLAYER_MODULE)));
function player(mode='hybrid',seekable=[{start:0,end:60}],extraState={}) {
  const p=new EventTarget(),calls=[];Object.setPrototypeOf(p,Player.prototype);
  Object.assign(p,{queue:Promise.resolve(),queued:0,operationSerial:0,operationEpoch:0,destroyed:false,
    pendingSeeks:new Set(),pendingOperation:null,current:{backend:{seek:async seconds=>calls.push(seconds)}},
    publish(){},settled:async()=>{}});
  Object.defineProperties(p,{mode:{value:mode},state:{value:{seekable,...extraState}}});
  return {p,calls};
}
for(const mode of ['hybrid','software']) {
  test(`${mode}: an inadmissible seek preserves the queued valid seek`,async()=>{
    const {p,calls}=player(mode),results=await Promise.allSettled([p.seek(10),p.seek(100)]);
    assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.code,'INVALID_ARGUMENT');
    assert.deepEqual(calls,[10]);assert.equal(p.pendingSeeks.size,0);
  });
  test(`${mode}: a valid newer target supersedes the previous target`,async()=>{
    const {p,calls}=player(mode),results=await Promise.allSettled([p.seek(10),p.seek(20)]);
    assert.equal(results[0].reason.code,'ABORTED');assert.equal(results[1].status,'fulfilled');
    assert.deepEqual(calls,[20]);assert.equal(p.pendingSeeks.size,0);
  });
}
test('Native keeps FIFO seeks',async()=>{
  const {p,calls}=player('native');await Promise.all([p.seek(10),p.seek(20)]);assert.deepEqual(calls,[10,20]);
});
test('A queued source change still validates against its accepted window',async()=>{
  const window=[{start:0,end:60}],{p,calls}=player('hybrid',window);
  const opening=p.enqueue(async()=>{window[0].end=120;},'opening');
  await Promise.all([opening,p.seek(100)]);assert.deepEqual(calls,[100]);
});
for(const mode of ['hybrid','software']) {
  test(`${mode}: a live end boundary cannot cancel a valid queued seek`,async()=>{
    const {p,calls}=player(mode,[{start:8,end:24}],{streamType:'live',quality:{available:true}});
    const results=await Promise.allSettled([p.seek(16),p.seek(24)]);
    assert.equal(results[0].status,'fulfilled');assert.equal(results[1].reason.code,'INVALID_ARGUMENT');assert.deepEqual(calls,[16]);
    await p.seek(8);await p.seek(23.95);assert.deepEqual(calls,[16,8,23.95]);
  });
}
test('Finite media retains its existing end-boundary API',async()=>{
 const {p,calls}=player('hybrid',[{start:8,end:24}],{streamType:'vod',quality:{available:true}});
 await p.seek(24);assert.deepEqual(calls,[24]);
});

// Exercise the actual state publisher with native diagnostics, without DOM or
// playback. An inactive coordinator must not hide compatibility cache ranges.
function timelinePlayer(mode,quality) {
 const p=new EventTarget();Object.setPrototypeOf(p,Player.prototype);
 Object.assign(p,{currentMode:mode,sourceSerial:1,subscribers:new Set(),
  settings:{pause:true,volume:100,speed:1,subtitles:true},
  source:{kind:'remote',options:{streaming:{live:true}}},
  current:{backend:{diagnostics:{quality},properties:new Map([
   ['duration',null],['demuxer-cache-state',{'seekable-ranges':[{start:20,end:40}]}]
  ])}}});
 return p;
}
for(const mode of ['hybrid','software']) {
 test(`${mode}: inactive native windows preserve compatibility live ranges`,()=>{
  const q={available:false,window:{live:false,known:false,start:0,end:0,error:0}},p=timelinePlayer(mode,q);
  p.publish();assert.equal(p.state.streamType,'live');assert.equal(p.state.duration,null);
  assert.deepEqual(p.state.seekable,[{start:20,end:40}]);
  q.window={live:false,known:true,start:0,end:100,error:0};p.publish();
  assert.equal(p.state.streamType,'live');assert.deepEqual(p.state.seekable,[{start:20,end:40}]);
 });
 test(`${mode}: admitted integrated windows remain authoritative when unknown or final`,()=>{
  const q={available:true,qualities:[],window:{live:true,known:false,start:0,end:0,error:0}},p=timelinePlayer(mode,q);
  p.source.options.streaming={}; // Native live identity does not require a caller hint.
  p.publish();assert.equal(p.state.streamType,'live');assert.equal(p.state.seekable,null);
  q.window={live:true,known:true,start:24,end:38,error:0};p.publish();
  assert.deepEqual(p.state.seekable,[{start:24,end:38}]);
  q.window.live=false;p.current.backend.properties.set('duration',38);p.publish();
  assert.equal(p.state.streamType,'vod');assert.equal(p.state.duration,38);
  assert.deepEqual(p.state.seekable,[{start:24,end:38}]);
 });
}
