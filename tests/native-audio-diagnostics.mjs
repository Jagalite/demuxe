// SPDX-License-Identifier: Apache-2.0
import {initialRemuxLifecycle} from '../web/generated/internal/machine/remux-lifecycle.js';
import test from 'node:test';
import {initialNativeBackend} from '../web/generated/internal/machine/native-backend.js';
import assert from 'node:assert/strict';
import {NativeMpvAudio} from '../web/generated/internal/native-mpv-audio.js';
import {RemuxPlayer} from '../web/native-remux-player.js';
import {WorkerRemuxController} from '../web/worker-remux-controller.js';
import {NativePlayer} from '../web/generated/internal/native-player.js';
import {backendPlan} from '../web/generated/internal/backend.js';
import {bufferingPolicy} from '../web/generated/internal/buffering.js';
import {watchdogPolicy} from '../web/generated/internal/watchdogs.js';

function audio(){
  return Object.assign(Object.create(NativeMpvAudio.prototype),{
    points:[],generation:1,running:true,errors:[],header:new Int32Array(16),
    video:{playbackRate:1,paused:false,seeking:false,ended:false,readyState:4,ownerDocument:{hidden:false}},context:{state:'running'},engine:{properties:new Map()},watchdogs:watchdogPolicy(),
    time:()=>10,requestedRate:1,effectiveRate:1,maxAbsError:0,sustained:0,release:0,
  });
}
test('clock preserves due, generation, ordering, freshness and paused semantics',()=>{
  const a=audio(),origin=performance.timeOrigin;
  const point=(wallTime,mediaTime,rate=1,generation=1)=>({wallTime:origin+wallTime,mediaTime,rate,generation});
  a.points=[point(90,4,2),point(110,99),point(80,3),point(95,88,1,0),point(90,77)];
  assert.equal(a.estimatedAudioPresentationTime(100),4.02);
  a.running=false;assert.equal(a.estimatedAudioPresentationTime(100),4);
  assert.equal(a.estimatedAudioPresentationTime(79),null);
  assert.equal(a.estimatedAudioPresentationTime(361),null);
  a.generation=2;assert.equal(a.estimatedAudioPresentationTime(100),null);
});
test('one clock sample supplies both position and error in a diagnostic snapshot',()=>{
  const a=audio();let calls=0;
  a.estimatedAudioPresentationTime=()=>{calls++;return 10.125;};
  const snapshot=a.diagnostics;
  assert.equal(calls,1);assert.equal(snapshot.estimatedAudioPresentationTime,10.125);assert.equal(snapshot.errorMs,125);
  a.estimatedAudioPresentationTime=()=>null;assert.equal(a.diagnostics.errorMs,null);
});
test('cached sync percentiles refresh when the full rolling window advances',()=>{
  const a=audio();a.errors=Array(1200).fill(0);a.errors.fill(20,600);
  a.estimatedAudioPresentationTime=()=>10.020;
  assert.equal(a.diagnostics.absErrorP50Ms,0);
  // Unchanged diagnostics must reuse the sorted history.
  a.errors[Symbol.iterator]=()=>{throw Error('unchanged history was sorted again');};
  assert.equal(a.diagnostics.absErrorP50Ms,0);
  delete a.errors[Symbol.iterator];
  a.observe();
  assert.equal(a.errors.length,1200);assert.ok(Math.abs(a.diagnostics.absErrorP50Ms-20)<1e-9);
});
test('native control-plane reads do not collect audio or video diagnostics',()=>{
  const player=Object.assign(Object.create(NativePlayer.prototype),{
    video:{preload:'auto',getVideoPlaybackQuality(){throw Error('video diagnostics collected');}},
    buffering:bufferingPolicy(),native:initialNativeBackend(),
    mpvAudio:{get diagnostics(){throw Error('audio diagnostics collected');}},
    requestedPlan:'native-video-mpv-audio',
  });
  assert.equal(backendPlan(player),'native-video-mpv-audio');
  assert.equal(player.bufferingDiagnostics.backend,'browser');
  player.requestedPlan='native-video-mpv-audio-subtitles';assert.equal(backendPlan(player),player.requestedPlan);
  player.mpvAudio=undefined;assert.equal(backendPlan(player),'direct');
  player.mpvSubs={};assert.equal(backendPlan(player),'direct-mpv');
  player.remux={snapshot:()=>({})};assert.equal(backendPlan(player),'remux-mpv');
  assert.equal(player.bufferingDiagnostics.backend,'remux');
  player.mpvSubs=undefined;assert.equal(backendPlan(player),'remux');
  player.native={...player.native,load:{...player.native.load,adapted:true}};player.audioAdaptation='flac';assert.equal(backendPlan(player),'adapted-flac');
  player.projection={};assert.equal(backendPlan(player),'adapted-flac24');
  player.native={...player.native,load:{...player.native.load,adapted:false}};assert.equal(backendPlan(player),'remux');
  assert.equal(backendPlan({diagnostics:{plan:'shaka-mse'}}),'shaka-mse');
  assert.equal(backendPlan(undefined),undefined);
});

for(const ownership of ['window','worker','worker-fallback'])test(`${ownership} buffering reads avoid remux diagnostic collection`,()=>{
  const video={playbackRate:1,paused:false,currentTime:1,preload:'auto',getVideoPlaybackQuality(){throw Error('video quality read');}};
  const remux=Object.assign(Object.create(RemuxPlayer.prototype),{video,forwardTargetSeconds:()=>30,lifecycle:Object.freeze({...initialRemuxLifecycle(),output:Object.freeze({...initialRemuxLifecycle().output,waiting:true})}),
    ranges(){throw Error('ranges collected');}});
  Object.defineProperty(remux,'stats',{get(){throw Error('statistics cloned');}});
  const expected={effectiveForwardSeconds:30,playbackRate:1,paused:false,waitingForMedia:true};
  const worker=new WorkerRemuxController(video,{},()=>undefined),owner=worker.transition({type:'boot'}).owner;worker.accept({snapshot:{buffering:expected}},owner);worker.local=ownership==='worker-fallback'?remux:undefined;
  const player=Object.assign(Object.create(NativePlayer.prototype),{video,buffering:bufferingPolicy(),remux:ownership==='window'?remux:worker});
  assert.equal(player.bufferingDiagnostics.backend,'remux');
  assert.deepEqual(player.bufferingDiagnostics.settings,expected);
  if(ownership!=='worker'){
    video.playbackRate=2;video.paused=true;remux.lifecycle=Object.freeze({...remux.lifecycle,output:Object.freeze({...remux.output,waiting:false})});
    assert.deepEqual(player.bufferingDiagnostics.settings,{...expected,playbackRate:2,paused:true,waitingForMedia:false});
  }else{
    worker.accept({snapshot:{buffering:{...expected,playbackRate:2}}},owner);
    assert.equal(player.bufferingDiagnostics.settings.playbackRate,2);
  }
});
