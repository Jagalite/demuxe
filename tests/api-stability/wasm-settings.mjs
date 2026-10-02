// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import test from 'node:test';
import {createWasmSettings,updateWasmSettings,planWasmGain,effectiveWasmGain,planWasmBuffering,planWasmAudioOutput} from '../../web/generated/internal/machine/wasm-settings.js';
import {createWasmLifecycle,applyWasmSetting,markWasmInitialized,retireWasmLifecycle} from '../../web/generated/internal/machine/wasm-lifecycle.js';

test('mute gates the physical gain without losing the accepted independent gain',()=>{
 let state=createWasmSettings();state=updateWasmSettings(state,{kind:'gain',value:.4}).state;
 assert.equal(effectiveWasmGain(state),.4);state=updateWasmSettings(state,{kind:'volume',value:0}).state;
 assert.equal(effectiveWasmGain(state),0);assert.equal(state.gain,.4);
 state=updateWasmSettings(state,{kind:'gain',value:.2}).state;assert.equal(effectiveWasmGain(state),0);
 state=updateWasmSettings(state,{kind:'volume',value:50}).state;assert.equal(effectiveWasmGain(state),.2);
 assert.deepEqual(planWasmGain(state,1,false),{valid:true,createStage:false,effective:1});
 assert.deepEqual(planWasmGain(state,.3,false),{valid:true,createStage:true,effective:.3});
});

test('invalid scalar settings preserve prior immutable state and reject',()=>{
 const state=createWasmSettings();for(const [kind,values]of [['volume',[-1,101,NaN,Infinity]],['gain',[-.01,1.01,NaN,Infinity]]])for(const value of values){const next=updateWasmSettings(state,{kind,value});assert.equal(next.state,state);assert.equal(next.accepted,false);}
});

test('buffering decisions preserve byte budgets and metadata preparation semantics',()=>{
 const state=createWasmSettings();assert.deepEqual(planWasmBuffering(state,{kind:'configure',preparing:true}),{cache:'yes','demuxer-max-bytes':'33554432','demuxer-max-back-bytes':'8388608'});
 const policy={profile:'low-latency',preload:'metadata'};
 assert.deepEqual(planWasmBuffering(state,{kind:'update',policy,paused:true}),{cache:'yes','demuxer-max-bytes':'8388608','demuxer-max-back-bytes':'2097152','cache-secs':'1'});
 assert.equal(planWasmBuffering(state,{kind:'update',policy,paused:false})['cache-secs'],'3600000');
 assert.equal(planWasmBuffering(state,{kind:'update',policy:{profile:'balanced',preload:'auto'},paused:true})['cache-secs'],'3600000');
});

test('buffering snapshots isolate caller policy while individual physical acknowledgments remain explicit',()=>{
 const original=createWasmSettings(),policy={profile:'resilient',preload:'none'};
 const accepted=updateWasmSettings(original,{kind:'buffer-policy',policy}).state;policy.profile='low-latency';
 assert.equal(accepted.buffering.profile,'resilient');assert.equal(Object.isFrozen(policy),false);
 const partiallyApplied=updateWasmSettings(original,{kind:'buffer-setting',key:'cache',value:'yes'}).state;
 assert.equal(partiallyApplied.buffering,original.buffering);assert.deepEqual(partiallyApplied.bufferingSettings,{cache:'yes'});assert.deepEqual(original.bufferingSettings,{});
});

test('timing sends once per observation change and explicitly forced sample',()=>{
 let state=createWasmSettings(),next=updateWasmSettings(state,{kind:'timing',latencyUs:24000,running:true,force:false});assert.equal(next.send,true);state=next.state;
 next=updateWasmSettings(state,{kind:'timing',latencyUs:24000,running:true,force:false});assert.equal(next.send,false);assert.equal(next.state,state);
 next=updateWasmSettings(state,{kind:'timing',latencyUs:24000,running:true,force:true});assert.equal(next.send,true);
 assert.equal(updateWasmSettings(state,{kind:'timing',latencyUs:24000,running:false,force:false}).send,true);
});

test('settings join one lifecycle and cannot revive retired backend authority',()=>{
 let state=createWasmLifecycle(false);const before=state;state=applyWasmSetting(state,{kind:'watchdog',decoderOutput:true}).state;
 assert.equal(before.settings.decoderOutput,false);assert.equal(state.settings.decoderOutput,true);
 assert.equal(applyWasmSetting(state,{kind:'watchdog',decoderOutput:false}).send,false);
 state=markWasmInitialized(state);assert.equal(applyWasmSetting(state,{kind:'watchdog',decoderOutput:false}).send,true);
 state=retireWasmLifecycle(state).state;
 for(const input of [{kind:'volume',value:0},{kind:'gain',value:.2},{kind:'watchdog',decoderOutput:false},{kind:'buffer-setting',key:'cache',value:'yes'},{kind:'timing',latencyUs:0,running:false,force:true}]){const next=applyWasmSetting(state,input);assert.equal(next.state,state);assert.equal(next.accepted,false);assert.equal(next.send,false);}
});

test('audio layout plans use advertised device width and explicit fallback policy',()=>{
 assert.deepEqual(planWasmAudioOutput('auto',8,'reject'),{channels:8,unavailable:false});
 assert.deepEqual(planWasmAudioOutput('auto',6,'stereo'),{channels:6,unavailable:false});
 assert.deepEqual(planWasmAudioOutput('auto',5,'stereo'),{channels:2,unavailable:false});
 assert.deepEqual(planWasmAudioOutput('7.1',6,'stereo'),{channels:2,unavailable:false});
 assert.deepEqual(planWasmAudioOutput('7.1',6,'reject'),{channels:2,unavailable:true});
});
