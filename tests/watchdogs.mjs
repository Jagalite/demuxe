// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {watchdogPolicy,NativeProgressWatchdog} from '../web/generated/internal/watchdogs.js';
import {NativePlayer} from '../web/generated/internal/native-player.js';
import {NativeMpvAudio} from '../web/generated/internal/native-mpv-audio.js';
import {compatibilityFailure} from '../web/generated/internal/runtime-capability.js';
import {PlayerError} from '../web/generated/internal/errors.js';

test('watchdog policy defaults, master disable and independent switches',()=>{
 const enabled=watchdogPolicy(),disabled=watchdogPolicy(false);
 for(const key of ['nativeProgress','hybridDecoder','decoderOutput','selectiveAudio']){
  assert.equal(enabled[key],true);assert.equal(disabled[key],false);
  const partial=watchdogPolicy({[key]:false});assert.equal(partial[key],false);
  for(const other of ['nativeProgress','hybridDecoder','decoderOutput','selectiveAudio'].filter(k=>k!==key))assert.equal(partial[other],true);
 }
 assert.equal(enabled.nativeProgressTimeoutMs,10000);assert.ok(Object.isFrozen(enabled));
 assert.deepEqual(watchdogPolicy(true),enabled);
 const input={nativeProgress:false};const result=watchdogPolicy(input);input.nativeProgress=true;assert.equal(result.nativeProgress,false);
 for(const value of [null,[],0,'false',{nativeProgress:0},{typo:false},{nativeProgressTimeoutMs:999},{nativeProgressTimeoutMs:Infinity}])assert.throws(()=>watchdogPolicy(value),e=>e.code==='INVALID_ARGUMENT');
});
test('native clock stall needs consecutive eligible observations',()=>{
 const w=new NativeProgressWatchdog(),s={eligible:true,time:1,rate:1};
 for(const time of [0,500,1000,1500])assert.equal(w.sample(time,s,2000),undefined);
 assert.equal(w.sample(2000,s,2000),'clock');
});
test('normal clock progression and high playback rate remain healthy',()=>{
 for(const rate of [.1,1,8]){
  const w=new NativeProgressWatchdog();
  for(let time=0;time<30000;time+=500)assert.equal(w.sample(time,{eligible:true,time:time/1000*rate,rate},2000),undefined);
 }
});
test('ineligible periods and event-loop suspension reset accumulated suspicion',()=>{
 const w=new NativeProgressWatchdog(),s={eligible:true,time:1};
 w.sample(0,s,2000);w.sample(1500,s,2000);w.sample(2000,{...s,eligible:false},2000);
 assert.equal(w.sample(20000,s,2000),undefined);assert.equal(w.sample(21500,s,2000),undefined);
 assert.equal(w.sample(22000,s,2000),'clock');
 const z=new NativeProgressWatchdog();z.sample(0,s,2000);z.sample(1500,s,2000);
 assert.equal(z.sample(9000,s,2000),undefined);assert.equal(z.sample(10500,s,2000),undefined);
});
test('seeks, rate changes and explicit resets grant a fresh budget',()=>{
 for(const next of [{time:0},{time:10},{time:1,rate:2}]){
  const w=new NativeProgressWatchdog();w.sample(0,{eligible:true,time:1,rate:1},2000);w.sample(1500,{eligible:true,time:1,rate:1},2000);
  assert.equal(w.sample(2000,{eligible:true,rate:1,...next},2000),undefined);
  w.reset();assert.equal(w.sample(4000,{eligible:true,time:1,rate:1},2000),undefined);
 }
});
test('known active video can stall while audio clock advances',()=>{
 const w=new NativeProgressWatchdog();
 for(let time=0;time<2000;time+=500)assert.equal(w.sample(time,{eligible:true,time:time/1000,frames:2,frameIntervalMs:40},2000),undefined);
 assert.equal(w.sample(2000,{eligible:true,time:2,frames:2,frameIntervalMs:40},2000),'video');
});
test('sparse frames and unobservable video do not inherit a normal-cadence deadline',()=>{
 for(const frameIntervalMs of [undefined,10000]){
  const w=new NativeProgressWatchdog();
  for(let time=0;time<12000;time+=500)assert.equal(w.sample(time,{eligible:true,time:time/1000,frames:2,frameIntervalMs},2000),undefined);
 }
});
function nativeSample(videoOverrides={},playerOverrides={}){
 const player=Object.create(NativePlayer.prototype);
 const video={currentTime:2,duration:20,playbackRate:1,paused:false,seeking:false,ended:false,error:null,readyState:4,videoWidth:640,
  buffered:{length:1,start:()=>0,end:()=>20},getVideoPlaybackQuality:()=>({totalVideoFrames:20,droppedVideoFrames:2})};
 Object.defineProperties(video,Object.getOwnPropertyDescriptors(videoOverrides));
 Object.assign(player,{video,stopped:false,opening:false,capability:{outputVerified:true},...playerOverrides});
 return player.nativeProgressSample();
}
test('Native eligibility excludes pause, seek, buffering, EOF, and unverified startup',()=>{
 assert.equal(nativeSample().eligible,true);assert.equal(nativeSample().frames,18);
 for(const state of [{paused:true},{seeking:true},{ended:true},{error:{}},{readyState:2},{playbackRate:0},{currentTime:19.8},{buffered:{length:0}},{buffered:{length:1,start:()=>0,end:()=>2.2}}])assert.equal(nativeSample(state).eligible,false,JSON.stringify(state));
 for(const state of [{stopped:true},{opening:true},{capability:{outputVerified:false}}])assert.equal(nativeSample({},state).eligible,false);
});
test('a health heuristic cannot cache a codec rejection even with misleading diagnostic text',()=>{
 const error=new PlayerError('PLAYBACK_STALLED','Decoder failed despite buffered media',null,null,'session',true);
 assert.equal(compatibilityFailure(error),false);
});
test('selective audio health switches reset suspicion without disabling explicit failures',()=>{
 const service=Object.create(NativeMpvAudio.prototype),errors=[];
 Object.assign(service,{running:true,video:{paused:false,seeking:false,ended:false,readyState:4,ownerDocument:{hidden:false}},context:{state:'running'},
  watchdogs:watchdogPolicy(),missingTimeline:0,largeError:0,engine:{setWatchdogs(){}},estimatedAudioPresentationTime:()=>null,failed:error=>errors.push(error)});
 service.setWatchdogs(watchdogPolicy(false));for(let i=0;i<20;i++)service.observe();assert.equal(errors.length,0);
 service.setWatchdogs(watchdogPolicy({selectiveAudio:true}));for(let i=0;i<7;i++)service.observe();assert.equal(errors.length,0);
 service.video.paused=true;service.observe();service.video.paused=false;
 for(let i=0;i<7;i++)service.observe();assert.equal(errors.length,0);
 service.observe();assert.equal(errors.length,1);assert.equal(errors[0].code,'PLAYBACK_STALLED');
 service.failedOnce=false;service.setWatchdogs(watchdogPolicy(false));service.fail(new PlayerError('SOURCE_CHANGED','Identity changed'));
 assert.equal(errors[1].code,'SOURCE_CHANGED');
});

test('hidden selective audio keeps sync corrections but suppresses heuristic failures',()=>{
 const service=Object.create(NativeMpvAudio.prototype),rates=[],failures=[];
 Object.assign(service,{running:true,video:{paused:false,seeking:false,ended:false,readyState:4,ownerDocument:{hidden:true}},context:{state:'running'},
 watchdogs:watchdogPolicy(),missingTimeline:7,largeError:7,errors:[],maxAbsError:0,sustained:0,release:0,requestedRate:1,effectiveRate:1,softCount:0,
 engine:{rate:async rate=>rates.push(rate)},estimatedAudioPresentationTime:()=>1.4,time:()=>1,failed:error=>failures.push(error)});
 for(let i=0;i<10;i++)service.observe();
 assert.equal(failures.length,0);assert.equal(service.largeError,0);assert.equal(service.missingTimeline,0);assert.ok(rates[0]<1);assert.equal(service.errors.length,10);
});
test('ineligible Native sampling avoids browser quality and buffer reads',()=>{
 assert.equal(nativeSample({paused:true,get buffered(){throw Error('unexpected buffer read');},getVideoPlaybackQuality(){throw Error('unexpected quality read');}}).eligible,false);
});
