// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/native-subtitle-presentation.js';
import * as life from '../../web/generated/internal/machine/native-subtitle-lifetime.js';
import {NativeMpvSubtitles} from '../../web/generated/internal/native-mpv-subtitles.js';
const step=(state,input)=>core.transitionSubtitlePresentation(state,input).state;
const running={paused:false,ended:false,hidden:false};
const render={kind:'render.begin',seconds:1,width:640,height:360,sourceWidth:1920,sourceHeight:1080};
function enabled(){return step(core.initialNativeSubtitlePresentation(),{kind:'enabled',value:true});}
const flush=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
test('presentation render admission and exact identity protect one bounded in-flight render',()=>{
 let state=enabled(),before=structuredClone(state);const admitted=core.transitionSubtitlePresentation(state,render);assert.deepEqual(state,before);state=admitted.state;assert.equal(admitted.accepted,true);assert.equal(state.render.force,true);assert.equal(core.transitionSubtitlePresentation(state,{...render,seconds:2}).accepted,false);assert.equal(core.transitionSubtitlePresentation(state,{kind:'render.finish',id:state.render.id+1}).accepted,false);const id=state.render.id;state=step(state,{kind:'render.accept',id,unchanged:false,size:40});state=step(state,{kind:'render.finish',id});assert.deepEqual(state.stats,{position:1,renders:1,bitmapUpdates:1,bytes:40,peakBytes:40,discarded:0,stateUpdates:0,scheduler:'frame'});assert.equal(core.transitionSubtitlePresentation(state,render).accepted,false);
});
test('presentation invalidation rejects obsolete render and preserves last accepted accounting',()=>{
 let state=step(enabled(),render),id=state.render.id;state=step(state,{kind:'invalidate'});assert.equal(core.subtitleRenderCurrent(state,id),false);assert.equal(core.transitionSubtitlePresentation(state,{kind:'render.accept',id,unchanged:false,size:999}).accepted,false);state=step(state,{kind:'render.discard',id});assert.equal(state.stats.discarded,1);assert.equal(state.stats.renders,0);assert.equal(state.stats.bytes,0);
});
test('presentation pump policy preserves playback, visibility and fallback exclusions',()=>{
 const state=step(enabled(),{kind:'mode',mode:'deadline'});for(const facts of [{...running,paused:true},{...running,ended:true},{...running,hidden:true}])assert.equal(core.subtitlePumpRunning(state,facts),false);assert.equal(core.subtitlePumpRunning(state,running),true);assert.equal(core.subtitlePumpRunning(step(state,{kind:'changing',value:true,revise:true}),running),false);assert.equal(core.subtitlePumpRunning(step(state,{kind:'mode',mode:'unknown'}),running),false);
});
test('presentation pump response cannot advance accepted scheduling after revision retires it',()=>{
 let state=step(step(enabled(),{kind:'mode',mode:'deadline'}),{kind:'pump.begin',facts:running}),id=state.pump.id;state=step(state,{kind:'invalidate'});assert.equal(core.transitionSubtitlePresentation(state,{kind:'pump.accept',id,deadlineEpoch:9}).accepted,false);assert.equal(state.stats.stateUpdates,0);assert.equal(state.deadlineEpoch,-1);assert.equal(core.transitionSubtitlePresentation(state,{kind:'pump.finish',id:id+1}).accepted,false);
});
test('presentation deadline uses exact epoch and4ms tolerance; timing wraps unsigned epochs',()=>{
 let state=step(step(enabled(),{kind:'mode',mode:'deadline'}),{kind:'deadline',epoch:7});assert.equal(core.subtitleDeadlineDue(state,7,{paused:false,hidden:false,seconds:.996,target:1}),'invalidate');assert.equal(core.subtitleDeadlineDue(state,7,{paused:false,hidden:false,seconds:.995,target:1}),'pump');assert.equal(core.subtitleDeadlineDue(state,6,{paused:false,hidden:false,seconds:2,target:1}),'ignore');state=step(state,{kind:'timing',epoch:1});assert.equal(core.subtitleTimingStale(state,state.revision,0xffffffff,false),true);state=step(state,{kind:'timing',epoch:0xffffffff});assert.equal(core.subtitleTimingStale(state,state.revision,1,false),false);
});
test('presentation layout retains aspect fit and bounded1920x1080 render without altering inputs',()=>{
 const facts={left:10,top:20,width:4000,height:3000,parentLeft:2,parentTop:3,sourceWidth:1920,sourceHeight:1080},before=structuredClone(facts);assert.deepEqual(core.subtitleLayout(facts),{left:8,top:392,width:4000,height:2250,renderWidth:1920,renderHeight:1080});assert.deepEqual(facts,before);assert.equal(core.subtitleLayout({...facts,width:0}),null);assert.equal(core.subtitleLayout({...facts,width:640,height:360,sourceWidth:0,sourceHeight:0}).renderWidth,640);
});
test('subtitle lifetime retirement atomically revokes frame interval render and pump owners',()=>{
 let state=life.initialNativeSubtitleLifetime();const epoch=state.epoch;for(const input of [{kind:'enabled',value:true},{kind:'mode',mode:'animated'},{kind:'frame.request'},{kind:'interval',facts:running},{kind:'pump.begin',facts:running},render])state=life.changeNativeSubtitlePresentation(state,epoch,input).state;const closed=life.closeNativeSubtitleLifetime(state,10).state;assert.deepEqual([closed.presentation.frame,closed.presentation.interval,closed.presentation.render,closed.presentation.pump],[null,null,null,null]);assert.equal(life.changeNativeSubtitlePresentation(closed,epoch,{kind:'enabled',value:true}).accepted,false);
});
function install(t,name,value){const prior=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});t.after(()=>{if(prior)Object.defineProperty(globalThis,name,prior);else delete globalThis[name];});}
function fixture(t,options={}){
 let serial=0,worker,service,time=1;const frames=new Map(),intervals=new Map(),timers=new Map(),messages=[],failures=[],calls=[];
 const context={clearRect(){calls.push('clear');},drawImage(){calls.push('draw');options.draw?.(service);}};
 const canvas={style:{},width:0,height:0,getContext:()=>context,remove:()=>calls.push('remove')};
 const parent={style:{},append(){},getBoundingClientRect:()=>({left:0,top:0,width:640,height:360})};
 const video=Object.assign(new EventTarget(),{parentElement:parent,style:{},paused:true,ended:false,playbackRate:1,videoWidth:640,videoHeight:360,width:640,height:360,duration:60,getBoundingClientRect:()=>({left:0,top:0,width:640,height:360})});
 const document=Object.assign(new EventTarget(),{hidden:false,createElement:()=>canvas});install(t,'document',document);install(t,'location',{origin:'https://media.test',href:'https://media.test/'});install(t,'crossOriginIsolated',true);
 install(t,'requestAnimationFrame',callback=>{const id=++serial;frames.set(id,callback);options.frame?.(service);return id;});install(t,'cancelAnimationFrame',id=>{calls.push('cancel-frame');frames.delete(id);});
 install(t,'setInterval',callback=>{const id=++serial;intervals.set(id,callback);options.interval?.(service);return id;});install(t,'clearInterval',id=>{calls.push('clear-interval');intervals.delete(id);});
 install(t,'setTimeout',callback=>{const id=++serial;timers.set(id,callback);return id;});install(t,'clearTimeout',id=>timers.delete(id));
 install(t,'ResizeObserver',class{observe(){}disconnect(){}});
 install(t,'Worker',class{constructor(){worker=this;}postMessage(message){messages.push(message);if(message.type==='init')queueMicrotask(()=>this.onmessage({data:{id:message.id,tracks:[]}}));if(message.type==='close')queueMicrotask(()=>this.onmessage({data:{type:'closed'}}));if(message.type==='cancelDeadline')queueMicrotask(()=>this.onmessage({data:{id:message.id}}));}terminate(){calls.push('terminate');}addEventListener(){}removeEventListener(){}});
 install(t,'fetch',async()=>({ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(4)}));
 service=new NativeMpvSubtitles(video,()=>{options.time?.(service);return time;},new URL('https://media.test/'),[],{url:'https://media.test/movie'},error=>failures.push(error));t.after(async()=>{options.frame=undefined;options.interval=undefined;options.time=undefined;await service.destroy().catch(()=>{});});
 return {service,video,canvas,document,frames,intervals,timers,messages,failures,calls,worker,setTime(value){time=value;},frame(){const [id,callback]=frames.entries().next().value;frames.delete(id);callback();},reply(type,data={}){const request=messages.findLast(message=>message.type===type);assert.ok(request);worker.onmessage({data:{id:request.id,...data}});},bitmap(callback){let closes=0;return {value:{close(){closes++;callback?.(service);}},get closes(){return closes;}};}};
}
test('actual render paints accepted bitmap once and accounts only accepted output',async t=>{
 const f=fixture(t);await f.service.ready;f.service.visible(true);f.frame();const bitmap=f.bitmap();f.reply('render',{bitmap:bitmap.value,size:80,service:{frames:1},mode:'fallback'});await flush();assert.equal(bitmap.closes,1);assert.equal(f.calls.filter(call=>call==='draw').length,1);assert.equal(f.service.stats.renders,1);assert.equal(f.service.stats.bytes,80);assert.equal(f.service.lifetime.presentation.render,null);
});
test('actual obsolete render closes bitmap without applying its scheduler or service',async t=>{
 const f=fixture(t);await f.service.ready;f.service.visible(true);f.frame();const bitmap=f.bitmap();f.service.suspend(true);f.reply('render',{bitmap:bitmap.value,size:80,service:{obsolete:true},mode:'animated'});await flush();assert.equal(bitmap.closes,1);assert.equal(f.calls.includes('draw'),false);assert.equal(f.service.stats.discarded,1);assert.equal(f.service.schedulerMode,'fallback');assert.deepEqual(f.service.service,{});
});
test('actual first mode-change reply is discarded then deadline invalidation schedules replacement',async t=>{
 const f=fixture(t);await f.service.ready;f.service.visible(true);f.frame();const bitmap=f.bitmap();f.reply('render',{bitmap:bitmap.value,size:80,service:{},mode:'deadline',schedule:{epoch:4}});await flush();assert.equal(bitmap.closes,1);assert.equal(f.service.stats.discarded,1);assert.equal(f.service.stats.renders,0);assert.equal(f.service.schedulerMode,'deadline');assert.equal(f.frames.size,1);f.frame();assert.equal(f.messages.filter(message=>message.type==='render').length,2);
});
test('actual bitmap late after destroy is released without canvas or accounting mutation',async t=>{
 const f=fixture(t);await f.service.ready;f.service.visible(true);f.frame();const bitmap=f.bitmap();await f.service.destroy();const closedService=structuredClone(f.service.service);f.reply('render',{bitmap:bitmap.value,size:80,service:{obsolete:true},mode:'animated'});await flush();assert.equal(bitmap.closes,1);assert.equal(f.calls.includes('draw'),false);assert.equal(f.service.stats.renders,0);assert.deepEqual(f.service.service,closedService);
});
test('actual canvas resize reentry retires render before further canvas effects',async t=>{
 const f=fixture(t);await f.service.ready;f.service.visible(true);f.frame();Object.defineProperty(f.canvas,'width',{configurable:true,get:()=>640,set:()=>{void f.service.destroy();}});const bitmap=f.bitmap();f.reply('render',{bitmap:bitmap.value,size:80,service:{},mode:'fallback'});await flush();assert.equal(bitmap.closes,1);assert.equal(f.calls.includes('draw'),false);assert.equal(f.service.stats.renders,0);
});
test('actual drawing failure still closes bitmap and is reported through service failure',async t=>{
 const failure=Error('draw failed'),f=fixture(t,{draw(){throw failure;}});await f.service.ready;f.service.visible(true);f.frame();const bitmap=f.bitmap();f.reply('render',{bitmap:bitmap.value,size:80,service:{},mode:'fallback'});await flush();assert.equal(bitmap.closes,1);assert.deepEqual(f.failures,[failure]);assert.equal(f.service.stats.renders,0);
});
test('actual unchanged render also releases an unexpected transferred bitmap',async t=>{
 const f=fixture(t);await f.service.ready;f.service.visible(true);f.frame();const bitmap=f.bitmap();f.reply('render',{bitmap:bitmap.value,size:80,unchanged:true,service:{},mode:'fallback'});await flush();assert.equal(bitmap.closes,1);assert.equal(f.calls.includes('draw'),false);assert.equal(f.service.stats.renders,1);assert.equal(f.service.stats.bitmapUpdates,0);
});
test('actual frame acquisition after retirement releases late handle and cannot restart output',async t=>{
 const options={},f=fixture(t,options);await f.service.ready;options.frame=service=>{void service.destroy();};f.service.visible(true);await flush();assert.equal(f.frames.size,0);assert.equal(f.service.lifetime.presentation.frame,null);assert.equal(f.messages.some(message=>message.type==='render'),false);
});
test('actual interval acquisition after retirement releases late handle without pumping',async t=>{
 const options={},f=fixture(t,options);await f.service.ready;f.video.paused=false;f.service.visible(true);options.interval=service=>{void service.destroy();};f.service.applyMode('animated');await flush();assert.equal(f.intervals.size,0);assert.equal(f.service.lifetime.presentation.interval,null);assert.equal(f.messages.some(message=>message.type==='pump'),false);
});
test('actual delayed pump after suspend cannot replace accepted scheduler state',async t=>{
 const f=fixture(t);await f.service.ready;f.video.paused=false;f.service.visible(true);f.service.applyMode('animated');assert.equal(f.messages.filter(message=>message.type==='pump').length,1);f.service.suspend(true);f.reply('pump',{mode:'deadline',service:{obsolete:true},schedule:{epoch:9}});await flush();assert.equal(f.service.schedulerMode,'animated');assert.equal(f.service.stats.stateUpdates,0);assert.deepEqual(f.service.service,{});assert.equal(f.service.lifetime.presentation.pump,null);
});
test('actual ignored deadline notification does not sample the media clock',async t=>{
 const options={},f=fixture(t,options);await f.service.ready;options.time=()=>assert.fail('irrelevant notification must not observe clock');f.worker.onmessage({data:{type:'subtitleDeadline',epoch:5,target:2}});assert.equal(f.failures.length,0);
});

test('actual obsolete render rejection cannot fail newer suspended presentation',async t=>{
 const f=fixture(t);await f.service.ready;f.service.visible(true);f.frame();f.service.suspend(true);f.reply('render',{error:'Selected old track failed'});await flush();assert.deepEqual(f.failures,[]);assert.equal(f.service.stopped,false);assert.equal(f.service.lifetime.presentation.render,null);
});
test('actual obsolete pump rejection cannot fail newer suspended presentation',async t=>{
 const f=fixture(t);await f.service.ready;f.video.paused=false;f.service.visible(true);f.service.applyMode('animated');f.service.suspend(true);f.reply('pump',{error:'Old cue pump failed'});await flush();assert.deepEqual(f.failures,[]);assert.equal(f.service.stopped,false);assert.equal(f.service.lifetime.presentation.pump,null);
});
test('actual bitmap cleanup reentry followed by throw cannot fail newer presentation',async t=>{
 const f=fixture(t);await f.service.ready;f.service.visible(true);f.frame();const bitmap=f.bitmap(service=>{service.suspend(true);throw Error('retired bitmap cleanup');});f.reply('render',{bitmap:bitmap.value,size:80,service:{},mode:'fallback'});await flush();assert.equal(bitmap.closes,1);assert.deepEqual(f.failures,[]);assert.equal(f.service.stopped,false);assert.equal(f.service.changingTrack,true);
});
