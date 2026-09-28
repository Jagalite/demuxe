// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {waitInitialOutput} from './initial-output.mjs';
import {markedAudio} from './checks.mjs';
function fixture(snapshot){
 const calls=[],stages=[],timeouts=[];let clock=0;
 const page={async waitForFunction(fn,_arg,options){calls.push(options.timeout);globalThis.api={snapshot:()=>snapshot};try{if(!fn()){const error=Error('observation timed out');error.name='TimeoutError';throw error;}clock+=700;}finally{delete globalThis.api;}}};
 return {calls,stages,timeouts,run:audio=>waitInitialOutput(page,{audio,stage:s=>stages.push(s),audioTimeout:e=>timeouts.push(e),now:()=>clock})};
}
test('an advancing clock with silent or quiet audio fails the output gate within the original budget',async()=>{
 for(const rms of [0,.012,.015]){const f=fixture({position:2,audio:[{channel:0,rms,hz:440},{channel:1,rms,hz:880}]});await assert.rejects(f.run(true),/Marked left\/right audio missing or incorrect/);assert.deepEqual(f.stages,['initial-playback','initial-output']);assert.deepEqual(f.calls,[10000,9300]);assert.equal(f.timeouts.length,1);}
});
test('stalled playback retains its playback failure, even when audio is present',async()=>{const f=fixture({position:0,audio:[{rms:.1}]});await assert.rejects(f.run(true),/observation timed out/);assert.deepEqual(f.stages,['initial-playback']);assert.equal(f.timeouts.length,0);});
test('audio presence does not replace the marked stereo oracle',async()=>{const snapshot={position:2,audio:[{channel:0,rms:.1,hz:200},{channel:1,rms:.1,hz:300}]},f=fixture(snapshot);await f.run(true);assert.equal(markedAudio(snapshot),false);assert.deepEqual(f.calls,[10000,9300]);});
test('silent-video fixtures do not require an audio track',async()=>{const f=fixture({position:2,audio:[]});await f.run(false);assert.deepEqual(f.calls,[10000]);});
test('browser errors retain their identity rather than becoming audio failures',async()=>{const error=Error('Target closed');let count=0;const page={async waitForFunction(){if(count++)throw error;}};await assert.rejects(waitInitialOutput(page,{audio:true,stage(){},audioTimeout(){assert.fail('not a timeout');}}),e=>e===error);});
