// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {bufferingPolicy,resolveBuffering,mpvBufferingOptions,shakaBufferingOptions} from '../web/generated/internal/buffering.js';
const MiB=1024*1024;
test('zero configuration delegates balanced auto with bounded mpv caching',()=>{
 const p=bufferingPolicy();assert.deepEqual(p,{preload:'auto',profile:'balanced'});
 assert.deepEqual(mpvBufferingOptions(p),{cache:'yes','demuxer-max-bytes':String(32*MiB),'demuxer-max-back-bytes':String(8*MiB)});
 assert.deepEqual(shakaBufferingOptions(p),{});
 assert.equal(resolveBuffering(p,'browser').control,'hint');
});
test('profiles stay within bounded coded-data budgets and favor forward playback',()=>{
 for(const profile of ['low-latency','balanced','resilient'])for(const memoryBudget of [8,16,40,64]){
  const r=resolveBuffering(bufferingPolicy({profile,memoryBudget:memoryBudget*MiB}),'mpv');
  assert.ok(r.forwardLimitBytes>r.backwardLimitBytes);assert.equal(r.forwardLimitBytes+r.backwardLimitBytes,Math.min(memoryBudget,profile==='low-latency'?10:profile==='resilient'?56:40)*MiB);
 }
 for(const input of [null,{profile:'fast'},{preload:'all'},{memoryBudget:1},{memoryBudget:Infinity},{memoryBudget:65*MiB}])assert.throws(()=>bufferingPolicy(input),e=>e.code==='INVALID_ARGUMENT');
});
test('non-auto preload reduces preparation without disabling the cache',()=>{
 for(const preload of ['none','metadata']){
  const p=bufferingPolicy({preload});assert.equal(mpvBufferingOptions(p)['cache-secs'],'1');assert.equal(mpvBufferingOptions(p,false)['cache-secs'],'3600000');assert.equal(mpvBufferingOptions(p).cache,'yes');
  assert.equal(shakaBufferingOptions(p).bufferingGoal,1);assert.deepEqual(shakaBufferingOptions(p,false),{});
 }
});

test('non-auto preload preserves synchronous audio resume for a user gesture',async()=>{
 const {WasmPlayer}=await import('../web/generated/internal/wasm-player.js');
 const calls=[];let release;
 const p=Object.assign(Object.create(WasmPlayer.prototype),{
  buffering:bufferingPolicy({preload:'metadata'}),
  audioContext:{state:'running',resume(){calls.push('resume');return Promise.resolve();}},
  sendTiming(){},configureBuffering(){calls.push('configure');return new Promise(resolve=>release=resolve);},
  async setPause(value){calls.push(['pause',value]);}
 });
 const playing=p.play();assert.equal(calls[0],'resume','resume must be invoked in the caller activation task');
 await Promise.resolve();release();await playing;assert.deepEqual(calls,['resume','configure',['pause',false]]);
});

test('custom time targets apply only to adapters that own time scheduling',()=>{
 const p=bufferingPolicy({aheadSeconds:30,behindSeconds:10});
 assert.equal(resolveBuffering(p,'remux').forwardSeconds,30);
 assert.equal(resolveBuffering(p,'remux').backwardSeconds,10);
 assert.deepEqual(shakaBufferingOptions(p,false),{bufferingGoal:30,bufferBehind:10});
 for(const backend of ['browser','mpv']){
  const r=resolveBuffering(p,backend);assert.equal(r.requestedAheadSeconds,30);assert.equal(r.forwardSeconds,undefined);
 }
 for(const input of [{strategy:'manual'},{aheadSeconds:0},{aheadSeconds:Infinity},{behindSeconds:-1},{behindSeconds:121}])assert.throws(()=>bufferingPolicy(input),e=>e.code==='INVALID_ARGUMENT');
});

test('public buffering updates replace policy, serialize and roll back without source replacement',async()=>{
 const {unitPlayer}=await import('./helpers/unit-player.mjs');const p=unitPlayer(),calls=[];
 const backend={setBuffering:async policy=>{calls.push(policy.profile);if(policy.profile==='resilient')throw Error('rejected');},get bufferingDiagnostics(){return resolveBuffering(p.buffering,'browser');}};
 p.current={backend};p.settings.pause=true;
 await p.setBuffering({profile:'low-latency',aheadSeconds:20});
 assert.equal(p.getBuffering().requested.aheadSeconds,20);assert.equal(p.getBuffering().capabilities.timeTargets,false);
 assert.equal(p.current.backend,backend);assert.equal(p.pendingOperation,null);assert.equal(p.settings.pause,true);
 await assert.rejects(p.setBuffering({profile:'resilient'}),/rejected/);
 assert.deepEqual(calls,['low-latency','resilient','low-latency']);assert.equal(p.getBuffering().requested.profile,'low-latency');
 const snapshot=p.getBuffering();assert.ok(Object.isFrozen(snapshot.requested));assert.ok(Object.isFrozen(snapshot.effective.notes));
 await p.setBuffering({});assert.deepEqual(p.getBuffering().requested,{preload:'auto',profile:'balanced'});
 backend.bufferingUpdateSupported=false;assert.equal(p.getBuffering().capabilities.runtimeUpdate,false);
 await assert.rejects(p.setBuffering({profile:'resilient'}),e=>e.code==='UNSUPPORTED_FEATURE');
 assert.equal(p.buffering.profile,'balanced');
});

test('mpv runtime updates reset preload throttling when returning to auto',async()=>{
 const {WasmPlayer}=await import('../web/generated/internal/wasm-player.js');
 const {PrivateSoftwarePlayer}=await import('../web/generated/internal/private-software-player.js');
 for(const [Class,extra] of [[WasmPlayer,{properties:new Map([['pause',true]]),bufferingSettings:{}}],[PrivateSoftwarePlayer,{ready:Promise.resolve(),options:{},userPaused:true}]]){
  const calls=[];const p=Object.assign(Object.create(Class.prototype),extra,{command:async(...args)=>calls.push(args)});
  await p.setBuffering(bufferingPolicy({preload:'metadata'}));assert.deepEqual(calls.at(-1),['set','cache-secs','1']);
  await p.setBuffering(bufferingPolicy());assert.deepEqual(calls.at(-1),['set','cache-secs','3600000']);
  assert.equal(p.bufferingDiagnostics.preload,'auto');
 }
});

test('native runtime updates change hints and reject providers without update support',async()=>{
 const {NativePlayer}=await import('../web/generated/internal/native-player.js');
 const video={preload:'auto'},p=Object.assign(Object.create(NativePlayer.prototype),{video,buffering:bufferingPolicy()});
 await p.setBuffering(bufferingPolicy({preload:'metadata'}));assert.equal(video.preload,'metadata');
 p.remux={};assert.equal(p.bufferingUpdateSupported,false);
 await assert.rejects(p.setBuffering(bufferingPolicy()),e=>e.code==='UNSUPPORTED_FEATURE');assert.equal(video.preload,'metadata');
 let received;p.remux={setBuffering:async value=>received=value};await p.setBuffering(bufferingPolicy({aheadSeconds:25}));assert.equal(received.forwardSeconds,25);
});
