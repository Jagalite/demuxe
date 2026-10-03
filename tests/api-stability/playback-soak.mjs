// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {soakPlayback} from './playback-soak-harness.mjs';
import {soakControls} from './playback-controls-soak.mjs';
import {VirtualEffects} from './virtual-effects.mjs';
const seeds=[1,7,42,2026,0x12345678,0xdecafbad],reports=[];
for(const seed of seeds)test(`sustained playback/effect/resource and control histories: seed ${seed}`,async()=>{
 const playback=await soakPlayback({seed,steps:6000}),controls=soakControls({seed,steps:4000});reports.push({playback,controls});
 assert.ok(playback.virtualDays>=78&&controls.virtualDays>=29);
 assert.ok(playback.registered>500&&playback.checks>10000&&controls.checks>40000);
 for(const branch of ['physical-success','physical-failure','cleanup-success','cleanup-failure','preserved-source','fresh-source','close-reopen','pause','resume','duplicate-or-late-result','premature-source-accept','large-timestamp','backend.play:immediate','backend.play:scheduled','backend.pause:immediate','backend.pause:scheduled','timer.wait:immediate','timer.wait:scheduled'])assert.ok(playback.coverage.includes(branch),branch);
 for(const branch of ['accept','restored','degraded','retired','pause-during-setting','latest-seek','loop','range-stop','volume','rate','gain','track:audio','track:sub','subtitles','output','pause'])assert.ok(controls.coverage.includes(branch),branch);
 assert.ok(playback.cleanupTimeouts>0&&playback.lateReleased>0&&playback.lateFailed>0);
});
for(const mutation of ['drop-pause','leak-release'])test(`sustained oracle detects ${mutation}`,async()=>{
 await assert.rejects(soakPlayback({seed:1,steps:128,mutation}),error=>error.cause?.code==='ERR_ASSERTION');
});
test('sustained control oracle detects missing compensation',()=>{
 assert.throws(()=>soakControls({seed:1,steps:128,mutation:'drop-rollback'}),error=>error.cause?.code==='ERR_ASSERTION'&&error.cause.message.includes('rollback'));
});
test('short seeded replay produces identical accounting',async()=>{
 assert.deepEqual(await soakPlayback({seed:42,steps:128}),await soakPlayback({seed:42,steps:128}));
 assert.deepEqual(soakControls({seed:42,steps:128}),soakControls({seed:42,steps:128}));
});
test('virtual clock honors cancellation and newly scheduled intermediate deadlines',()=>{
 const clock=new VirtualEffects(),seen=[];let cancel;
 clock.scheduleDeadline(()=>{seen.push(clock.now());cancel();clock.scheduleDeadline(()=>seen.push(clock.now()),5);},10);
 cancel=clock.scheduleDeadline(()=>assert.fail('canceled timer fired'),20);
 clock.advanceTo(30);assert.deepEqual(seen,[10,15]);assert.equal(clock.now(),30);assert.equal(clock.timers.size,0);
 clock.scheduleDeadline(()=>seen.push('first'),0);clock.scheduleDeadline(()=>seen.push('second'),0);clock.advanceTo(30);assert.deepEqual(seen.slice(-2),['first','second']);
 assert.throws(()=>clock.advanceTo(29),/monotonic/);
});
test('virtual clock bounds same-time recursive scheduling',()=>{
 const clock=new VirtualEffects(),repeat=()=>clock.scheduleDeadline(repeat,0);repeat();assert.throws(()=>clock.advanceTo(0),/quiesce/);
});
test('soak receipt records measured simulated scope',()=>{
 assert.equal(reports.length,seeds.length);
 console.log(JSON.stringify({playbackSoak:{seeds,operations:reports.reduce((n,r)=>n+r.playback.steps+r.controls.steps,0),checkedTransitions:reports.reduce((n,r)=>n+r.playback.checks+r.controls.checks,0),reports,scope:'persistent pure player core plus synthetic EffectRuntime/ResourceRegistry; source mode labels do not instantiate routes; no actual decoding, A/V synchronization, browser lifetime, provider memory, throughput or wall-clock endurance qualification'}}));
});
