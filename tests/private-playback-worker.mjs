// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDecodePolicy,mpvDecoderOptions,nextAdaptiveState,supportsEmergencyFrameDrop,adaptiveDecodeSignal} from '../web/generated/internal/decode-policy.js';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../web/private-mpv/playback-worker.js',import.meta.url),'utf8');
const pump=source.slice(source.indexOf('async function pump()'),source.indexOf('function close()'));
function session(host,opening,target,baseline){
 const make=new Function('host','post','diagnostics','fail','setTimeout','createImageBitmap','postMessage',`
 let closing=false,replacing=false,pumping=false,restarted=false,contextRunning=true,userPaused=true,generation=1,timer;
 let target=${target},opening=${opening},lastDraws=${baseline},targetDrawBaseline=${baseline};
 const considerAdaptive=async()=>{};const commands=new Map();let pictureId=0,pendingPicture=0,sentDraws=lastDraws;
 ${pump}
 return {pump,target:()=>target};`);
 host.serial??=async operation=>operation();return make(host,()=>{},async()=>{},async error=>{throw error;},()=>0,async()=>({close(){}}),()=>{});
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

const adaptive=source.slice(source.indexOf('const privateDecodePolicy='),source.indexOf('const loading ='));
for(const replacement of [false,true])test('adaptive policy waits for native acknowledgement'+(replacement?' and discards a replaced source result':''),async()=>{
 let acknowledge;const requests=[];
 const submit=args=>{requests.push(args);return new Promise(resolve=>acknowledge=resolve);};
 const make=new Function('resolveDecodePolicy','mpvDecoderOptions','nextAdaptiveState','supportsEmergencyFrameDrop','adaptiveDecodeSignal','submit',`
 let decodeInput={codec:'h264',decodeQuality:'exact',maxDecodePixels:8294400},decodePolicy,adaptiveFrameDrop=true,retained=false,adaptiveSwitching=false,replacing=false,closing=false,userPaused=false,contextRunning=true,target,generation=1;
 let adaptivePrevious,adaptiveStreak=0,adaptiveDirection='',adaptiveCooldown=0,adaptiveReason='disabled';
 const host={properties:{'time-pos':0,avsync:.3,speed:1}};const fail=async error=>{throw error;};
 ${adaptive}
 decodePolicy=privateDecodePolicy('normal');
 return {sample:async wall=>{host.properties['time-pos']=wall/4000;return considerAdaptive(wall);},policy:()=>decodePolicy,replace:()=>{generation++;replacing=true;}};`);
 const state=make(resolveDecodePolicy,mpvDecoderOptions,nextAdaptiveState,supportsEmergencyFrameDrop,adaptiveDecodeSignal,submit);
 for(const wall of [100,2100,4100])await state.sample(wall);
 const pending=state.sample(6100);assert.equal(requests.length,1);assert.match(requests[0][2],/max_pixels=8294400/);assert.match(requests[0][2],/skip_loop_filter=noref/);
 assert.equal(state.policy().effective,'exact');if(replacement)state.replace();acknowledge();await pending;
 assert.equal(state.policy().effective,replacement?'exact':'balanced');assert.equal(state.policy().threads,1);
});
