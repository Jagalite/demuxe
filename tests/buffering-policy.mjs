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
