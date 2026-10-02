// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDecodePolicy,mpvDecoderOptions,nextAdaptiveState,supportsEmergencyFrameDrop,adaptiveDecodeSignal} from '../web/generated/internal/decode-policy.js';
import {readFile} from 'node:fs/promises';
import * as policy from '../web/generated/internal/machine/private-playback-worker.js';
import vm from 'node:vm';
const source=(await readFile(new URL('../web/private-mpv/playback-worker.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
function session(host,opening,target,baseline){
 host.serial??=async operation=>operation();
 const context=vm.createContext({...policy,mpvDecoderOptions,AbortController,performance,Map,setTimeout:()=>0,clearTimeout(){},createImageBitmap:async()=>({close(){}}),postMessage(){},testHost:host});
 vm.runInContext(source,context);
 vm.runInContext(`host=testHost;lifecycle=admitPlaybackWorkerInit(lifecycle).state;lifecycle=finishPlaybackWorkerInit(lifecycle,true).state;
 lifecycle=beginPlaybackWorkerSeek(lifecycle,${target},${baseline});lifecycle=Object.freeze({...lifecycle,opening:${opening},lastDraws:${baseline},sentDraws:${baseline}});
 diagnostics=async()=>{};considerAdaptive=async()=>{};fail=async error=>{throw error;};`,context);
 return {pump:()=>vm.runInContext('pump()',context),target:()=>vm.runInContext('lifecycle.target===null?undefined:lifecycle.target',context)};
}
for(const opening of [true,false])test('frame preceding playback-restart satisfies '+(opening?'file':'seek')+' output readiness',async()=>{
 let step=0;const host={draws:4,properties:{'track-list':[{type:'video',selected:true}],'time-pos':2.5},async pump(){step++;this.draws=5;return step===2?[{event:'playback-restart'}]:[];}};
 const state=session(host,opening,opening?0:2.5,4);await state.pump();assert.notEqual(state.target(),undefined);
 await state.pump();assert.equal(state.target(),undefined);
});
test('a seek cannot finish on a picture at another position',async()=>{
 const host={draws:4,properties:{'track-list':[{type:'video',selected:true}],'time-pos':1.5},async pump(){this.draws=5;return [{event:'playback-restart'}];}};
 const state=session(host,false,2.5,4);await state.pump();assert.equal(state.target(),2.5);
 host.properties['time-pos']=2.5;await state.pump();assert.equal(state.target(),undefined);
});
test('native decoder failure reaches fatal cleanup instead of an output timeout',async()=>{
 const host={draws:0,properties:{},async pump(){return [{event:'end-file',reason:'error',error:'unsupported format'}];}};
 await assert.rejects(session(host,true,0,0).pump(),/Private Software decode failed: unsupported format/);
});
test('ordinary EOF remains a playback event',async()=>{
 const host={draws:5,properties:{'track-list':[{type:'video',selected:true}],'time-pos':4},async pump(){return [{event:'end-file',reason:'eof'}];}};
 await session(host,false,4,4).pump();
});


for(const replacement of [false,true])test('adaptive policy waits for native acknowledgement'+(replacement?' and discards a replaced source result':''),async()=>{
 let acknowledge;const requests=[];
 const submit=args=>{requests.push(args);return new Promise(resolve=>acknowledge=resolve);};
 const context=vm.createContext({...policy,mpvDecoderOptions,AbortController,performance,Map,setTimeout:()=>0,clearTimeout(){},postMessage(){},testSubmit:submit});vm.runInContext(source,context);
 vm.runInContext("host={properties:{'time-pos':0,avsync:.3,speed:1}};lifecycle=admitPlaybackWorkerInit(lifecycle).state;lifecycle=finishPlaybackWorkerInit(lifecycle,true).state;lifecycle=beginPlaybackWorkerControl(lifecycle,'pause',false).state;lifecycle=configurePlaybackWorkerDecode(lifecycle,{codec:'h264',decodeQuality:'exact',maxDecodePixels:8294400},false,true);submit=testSubmit;fail=async error=>{throw error;};",context);
 const state={sample:wall=>{context.wall=wall;return vm.runInContext("host.properties['time-pos']=wall/4000;considerAdaptive(wall)",context);},policy:()=>vm.runInContext('lifecycle.decodePolicy',context),replace:()=>vm.runInContext('lifecycle=receivePlaybackWorkerLoad(lifecycle).state',context)};
 for(const wall of [100,2100,4100])await state.sample(wall);
 const pending=state.sample(6100);assert.equal(requests.length,1);assert.match(requests[0][2],/max_pixels=8294400/);assert.match(requests[0][2],/skip_loop_filter=noref/);
 assert.equal(state.policy().effective,'exact');if(replacement)state.replace();acknowledge();await pending;
 assert.equal(state.policy().effective,replacement?'exact':'balanced');assert.equal(state.policy().threads,1);
});
