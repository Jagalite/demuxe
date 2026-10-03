// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/native-subtitle-timeline.js';
import * as life from '../../web/generated/internal/machine/native-subtitle-lifetime.js';
import {NativeMpvSubtitles} from '../../web/generated/internal/native-mpv-subtitles.js';
const flush=async()=>{for(let i=0;i<32;i++)await Promise.resolve();};
const tracks=[{id:'1',mpvId:1,'ff-index':3,type:'sub',codec:'ass'},{id:'2',mpvId:2,'ff-index':4,type:'sub',codec:'ass'}];
const step=(state,input)=>core.transitionSubtitleTimeline(state,input).state;
function initial(selected=false){return step(core.initialNativeSubtitleTimeline(),{kind:'catalog',tracks:tracks.map((track,index)=>({...track,selected:selected&&index===0})),defaultStreamIndex:3});}
function operation(state,kind='verify'){state=step(state,{kind:'admit',operation:kind});return step(state,{kind:'start'});}
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
 install(t,'Worker',class{constructor(){worker=this;}postMessage(message){messages.push(message);if(message.type==='init')queueMicrotask(()=>this.onmessage({data:{id:message.id,tracks:options.tracks??[]}}));if(message.type==='close')queueMicrotask(()=>this.onmessage({data:{type:'closed'}}));if(message.type==='cancelDeadline')queueMicrotask(()=>this.onmessage({data:{id:message.id}}));}terminate(){calls.push('terminate');}addEventListener(){}removeEventListener(){}});
 install(t,'fetch',async()=>({ok:true,status:200,arrayBuffer:async()=>new ArrayBuffer(4)}));
 service=new NativeMpvSubtitles(video,()=>{options.time?.(service);return time;},new URL('https://media.test/'),[],{url:'https://media.test/movie'},error=>failures.push(error));t.after(async()=>{options.frame=undefined;options.interval=undefined;options.time=undefined;await service.destroy().catch(()=>{});});
 return {service,video,canvas,document,frames,intervals,timers,messages,failures,calls,worker,setTime(value){time=value;},frame(){const [id,callback]=frames.entries().next().value;frames.delete(id);callback();},reply(type,data={}){const request=messages.findLast(message=>message.type===type);assert.ok(request);worker.onmessage({data:{id:request.id,...data}});},bitmap(callback){let closes=0;return {value:{close(){closes++;callback?.(service);}},get closes(){return closes;}};}};
}
test('timeline catalog and automatic selection retain inspected default and external precedence',()=>{
 let state=initial(),before=structuredClone(state);assert.equal(core.subtitleSelection(state,'auto').mpvId,1);assert.equal(core.subtitleSelection(state,'no'),undefined);assert.equal(core.subtitleSelection(state,'2').mpvId,2);assert.equal(core.transitionSubtitleTimeline(state,{kind:'catalog',tracks,defaultStreamIndex:99}).error,'default');assert.deepEqual(state,before);
 state=operation(state,'add');state=step(state,{kind:'add',id:state.active,mpvId:8,attachmentId:'text-4',title:'External',language:'en',format:'srt'});const external=state.tracks.at(-1);assert.equal(external.id,'100001');state=step(state,{kind:'select.begin',id:state.active,requested:external.id});state=step(state,{kind:'select.accept',id:state.active});assert.equal(core.subtitleSelection(state,'auto').mpvId,8);
});
test('timeline queue cannot release another operation or overlap multi-RPC workflows',()=>{
 let state=operation(initial(),'select'),first=state.active;state=step(state,{kind:'admit',operation:'seek'});assert.equal(core.transitionSubtitleTimeline(state,{kind:'start'}).accepted,false);assert.equal(core.transitionSubtitleTimeline(state,{kind:'finish',id:first+1}).accepted,false);state=step(state,{kind:'finish',id:first});assert.equal(core.subtitleTimelineChanging(state),true);state=step(state,{kind:'start'});assert.equal(state.active,first+1);assert.equal(core.transitionSubtitleTimeline(state,{kind:'select.accept',id:first}).accepted,false);
});
test('verification plan retains sample precedence, distinct times, finite duration and bounded raster',()=>{
 let state=operation(initial(true));state=step(state,{kind:'verify.begin',id:state.active,seconds:2,duration:11,width:4000,height:3000});assert.deepEqual(state.verification.samples,[2,0,1,5,10]);assert.equal(state.verification.width,1920);assert.equal(state.verification.height,1080);const before=structuredClone(state);assert.deepEqual(core.subtitleVerificationSample(state,state.active),{kind:'sample',seconds:2,width:1920,height:1080});assert.deepEqual(state,before);
});
test('verification output cannot commit before restoration and requires selected internal output',()=>{
 let state=operation(initial(true)),id=state.active;state=step(state,{kind:'verify.begin',id,seconds:1,duration:2,width:640,height:360});assert.equal(core.transitionSubtitleTimeline(state,{kind:'verify.accept',id}).accepted,false);state=step(state,{kind:'verify.sample',id,visible:true});assert.equal(core.subtitleVerificationSample(state,id).kind,'restore');state=step(state,{kind:'verify.restore',id});state=step(state,{kind:'verify.restored',id});state=step(state,{kind:'verify.accept',id});assert.equal(state.verified,1);assert.equal(core.subtitleVerificationNeeded(state),false);
});
test('timeline lifetime retirement clears active and queued work with unchanged frozen history',()=>{
 let state=life.initialNativeSubtitleLifetime(),epoch=state.epoch;for(const input of [{kind:'admit',operation:'select'},{kind:'start'},{kind:'admit',operation:'seek'}])state=life.changeNativeSubtitleTimeline(state,epoch,input).state;const before=structuredClone(state),closed=life.closeNativeSubtitleLifetime(state,100).state;assert.deepEqual(state,before);assert.equal(closed.timeline.active,null);assert.equal(closed.timeline.queue.length,0);assert.equal(life.changeNativeSubtitleTimeline(closed,epoch,{kind:'start'}).accepted,false);
});
async function completeSelection(f){f.reply('select');await flush();f.reply('render',{hasOverlay:true,service:{}});await flush();f.reply('render',{hasOverlay:false,service:{}});await flush();f.reply('profile',{mode:'fallback'});await flush();}
test('actual concurrent selections hold one timeline slot through verification restoration and profile',async t=>{
 const f=fixture(t,{tracks});await f.service.ready;const first=f.service.select('1'),second=f.service.select('2');first.catch(()=>{});second.catch(()=>{});await flush();assert.deepEqual(f.messages.filter(message=>message.type==='select').map(message=>message.trackId),[1]);await completeSelection(f);await first;assert.deepEqual(f.messages.filter(message=>message.type==='select').map(message=>message.trackId),[1,2]);assert.equal(f.service.changingTrack,true);await completeSelection(f);await second;assert.equal(f.service.tracks.find(track=>track.selected).mpvId,2);assert.equal(f.service.verifiedTrack,2);assert.equal(f.service.changingTrack,false);assert.equal(f.service.timelineWork.size,0);
});
test('actual seek queued during verification waits for browser-clock restoration',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true}]});await f.service.ready;const verify=f.service.verify(),seek=f.service.seek(9);verify.catch(()=>{});seek.catch(()=>{});await flush();assert.equal(f.messages.some(message=>message.type==='seek'),false);f.reply('render',{hasOverlay:true,service:{}});f.setTime(4);await flush();assert.equal(f.messages.findLast(message=>message.type==='render').seconds,4);f.reply('render',{service:{}});await verify;await flush();assert.equal(f.messages.at(-1).type,'seek');f.reply('seek');await seek;assert.equal(f.service.changingTrack,false);
});
test('actual external unsuspend cannot clear an active verification owner',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true}]});await f.service.ready;f.service.suspend(true);const verify=f.service.verify();verify.catch(()=>{});f.service.suspend(false);assert.equal(f.service.changingTrack,true);f.reply('render',{hasOverlay:true,service:{}});await flush();f.reply('render',{service:{}});await verify;assert.equal(f.service.changingTrack,false);
});
test('actual cancelled verification retires sampling without restoration and releases next timeline owner',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true}]});await f.service.ready;const controller=new AbortController(),reason=Error('cancel verification'),verify=f.service.verify(controller.signal),cancelled=assert.rejects(verify,error=>error===reason),seek=f.service.seek(3);controller.abort(reason);await cancelled;await flush();assert.equal(f.messages.filter(message=>message.type==='render').length,1);assert.equal(f.messages.at(-1).type,'seek');f.reply('seek');await seek;assert.equal(f.service.verifiedTrack,undefined);
});
test('actual selection output failure restores old selection after bounded samples and restore',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true},tracks[1]]});await f.service.ready;f.video.duration=1;f.setTime(0);const selected=f.service.select('2'),rejected=assert.rejects(selected,/produced no output/);await flush();f.reply('select');await flush();f.reply('render',{hasOverlay:false,service:{}});await flush();f.reply('render',{service:{}});await flush();assert.equal(f.messages.at(-1).type,'select');assert.equal(f.messages.at(-1).trackId,1);f.reply('select');await rejected;assert.equal(f.service.tracks.find(track=>track.selected).mpvId,1);assert.equal(f.service.verifiedTrack,undefined);assert.equal(f.service.changingTrack,false);
});
test('actual external file without nearby cue verifies after restoring the playhead',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true,external:true}]});await f.service.ready;const verify=f.service.verify();f.reply('render',{hasOverlay:false,service:{}});await flush();f.reply('render',{service:{}});await verify;assert.equal(f.service.verifiedTrack,1);assert.equal(f.messages.filter(message=>message.type==='render').length,2);
});
test('actual close rejects active and queued timeline promises before any later selection',async t=>{
 const f=fixture(t,{tracks});await f.service.ready;const a=assert.rejects(f.service.select('1'),/destroyed/),b=assert.rejects(f.service.select('2'),/destroyed/);await flush();await f.service.destroy();await Promise.all([a,b]);assert.equal(f.messages.filter(message=>message.type==='select').length,1);assert.equal(f.service.timelineWork.size,0);assert.equal(f.service.lifetime.timeline.queue.length,0);
});
test('actual track projection is detached and cannot silently change accepted selection',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true}]});await f.service.ready;const projected=f.service.tracks;projected[0].selected=false;projected[0].id='foreign';projected.length=0;assert.equal(f.service.tracks.length,1);assert.equal(f.service.tracks[0].id,'1');assert.equal(f.service.tracks[0].selected,true);
});
test('actual cached verification skips host clock and dimension observations',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true}]});await f.service.ready;const verify=f.service.verify();f.reply('render',{hasOverlay:true,service:{}});await flush();f.reply('render',{service:{}});await verify;Object.defineProperty(f.video,'videoWidth',{get(){throw Error('unnecessary size observation');}});await f.service.verify();assert.equal(f.messages.filter(message=>message.type==='render').length,2);
});
test('actual concurrent external additions assign unique accepted metadata in timeline order',async t=>{
 const f=fixture(t);await f.service.ready;const one=f.service.add({attachmentId:'a',label:'A',language:'en',format:'srt'}),two=f.service.add({attachmentId:'b',label:'B',language:'fr',format:'ass'});await flush();assert.equal(f.messages.filter(message=>message.type==='add').length,1);f.reply('add',{mpvId:8});assert.equal(await one,'100001');await flush();assert.equal(f.messages.filter(message=>message.type==='add').length,2);f.reply('add',{mpvId:9});assert.equal(await two,'100002');assert.deepEqual(f.service.tracks.map(track=>[track.id,track.mpvId,track['attachment-id'],track.title]),[['100001',8,'a','A'],['100002',9,'b','B']]);
});
test('actual failed external default selection rolls back inventory and removes native attachment',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true}]});await f.service.ready;const added=f.service.add({attachmentId:'new',label:'New',format:'ass',select:true}),rejected=assert.rejects(added,/selection failed/);await flush();f.reply('add',{mpvId:9});await flush();f.reply('select',{error:'selection failed'});await flush();assert.equal(f.messages.at(-1).trackId,1);f.reply('select');await flush();assert.equal(f.messages.at(-1).type,'remove');assert.equal(f.messages.at(-1).trackId,9);f.reply('remove');await rejected;assert.equal(f.service.tracks.length,1);assert.equal(f.service.tracks[0].selected,true);
});
test('actual bitmap-close retirement during verification stops restoration and verified acceptance',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true}]});await f.service.ready;const verified=f.service.verify(),rejected=assert.rejects(verified,/destroyed/),bitmap=f.bitmap(service=>{void service.destroy();});f.reply('render',{bitmap:bitmap.value,hasOverlay:true,service:{}});await rejected;await flush();assert.equal(bitmap.closes,1);assert.equal(f.messages.filter(message=>message.type==='render').length,1);assert.equal(f.service.verifiedTrack,undefined);
});
test('actual already-aborted verification remains a rejected Promise',async t=>{
 const f=fixture(t);await f.service.ready;const controller=new AbortController(),reason=Error('aborted');controller.abort(reason);let work;assert.doesNotThrow(()=>{work=f.service.verify(controller.signal);});await assert.rejects(work,error=>error===reason);assert.equal(f.service.timelineWork.size,0);
});
test('actual queued verification cancellation settles without waiting for earlier selection RPC',async t=>{
 const f=fixture(t,{tracks});await f.service.ready;const select=f.service.select('1');select.catch(()=>{});await flush();const controller=new AbortController(),reason=Error('queued verification cancelled'),verify=f.service.verify(controller.signal),cancelled=assert.rejects(verify,error=>error===reason);controller.abort(reason);await cancelled;assert.equal(f.service.lifetime.timeline.queue.length,1);assert.equal(f.service.timelineWork.size,1);assert.equal(f.messages.filter(message=>message.type==='render').length,0);await completeSelection(f);await select;assert.equal(f.service.verifiedTrack,1);
});
test('actual cancellation from completion visibility sampling cannot leave timeline changing latched',async t=>{
 const f=fixture(t,{tracks});await f.service.ready;const select=f.service.select('1');select.catch(()=>{});await flush();const controller=new AbortController(),reason=Error('queued cancelled at handoff'),verify=f.service.verify(controller.signal),cancelled=assert.rejects(verify,error=>error===reason);let once=true;
 Object.defineProperty(f.video,'paused',{configurable:true,get(){if(once&&f.service.lifetime.timeline.active===null&&f.service.lifetime.timeline.queue.length){once=false;controller.abort(reason);}return true;}});
 await completeSelection(f);await select;await cancelled;assert.equal(f.service.changingTrack,false);assert.equal(f.service.lifetime.timeline.queue.length,0);assert.equal(f.service.timelineWork.size,0);
});
test('actual queued abort contains listener cleanup failure and preserves caller cancellation',async t=>{
 const f=fixture(t,{tracks});await f.service.ready;const select=f.service.select('1');select.catch(()=>{});await flush();const controller=new AbortController(),reason=Error('queued cancel'),signal=controller.signal,remove=signal.removeEventListener.bind(signal);signal.removeEventListener=(...args)=>{remove(...args);throw Error('listener cleanup failed');};const verify=f.service.verify(signal),rejected=assert.rejects(verify,error=>error===reason);assert.doesNotThrow(()=>controller.abort(reason));await rejected;await completeSelection(f);await select;assert.equal(f.service.changingTrack,false);assert.equal(f.service.timelineWork.size,0);
});

test('actual external-only overlay reset removes embedded catalog through pure owner before add',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true},tracks[1]]});await f.service.ready;const snapshot=f.service.tracks;f.service.resetTracks();assert.equal(f.service.tracks.length,0);assert.equal(snapshot.length,2);assert.equal(f.service.verifiedTrack,undefined);const addition=f.service.add({attachmentId:'external-only',label:'External',format:'ass'});await flush();f.reply('add',{mpvId:9});assert.equal(await addition,'100001');assert.deepEqual(f.service.tracks.map(track=>[track.id,track.external,track['attachment-id']]),[['100001',true,'external-only']]);
});
test('actual catalog reset cannot overwrite an active verification or retired lifetime',async t=>{
 const f=fixture(t,{tracks:[{...tracks[0],selected:true}]});await f.service.ready;const verify=f.service.verify(),rejected=assert.rejects(verify,/destroyed/);assert.throws(()=>f.service.resetTracks(),/busy/);assert.equal(f.service.tracks[0].selected,true);await f.service.destroy();await rejected;assert.throws(()=>f.service.resetTracks(),/destroyed/);
});

test('subtitle timeline bounds active plus queued work and refuses unsafe identities',()=>{
 let state=initial();for(let n=0;n<128;n++){const admitted=core.transitionSubtitleTimeline(state,{kind:'admit',operation:'select'});assert.equal(admitted.accepted,true);state=admitted.state;if(n===0)state=step(state,{kind:'start'});}
 assert.equal(state.queue.length,128);const denied=core.transitionSubtitleTimeline(state,{kind:'admit',operation:'seek'});assert.equal(denied.error,'capacity');assert.equal(denied.state,state);
 state=step(state,{kind:'cancel',id:state.queue.at(-1).id});assert.equal(core.transitionSubtitleTimeline(state,{kind:'admit',operation:'seek'}).accepted,true);
 const exhausted={...initial(),serial:Number.MAX_SAFE_INTEGER};assert.equal(core.transitionSubtitleTimeline(exhausted,{kind:'admit',operation:'seek'}).error,'identity');
});
test('subtitle shell charges readiness-blocked calls before allocating an unbounded promise queue',async()=>{
 const service=Object.create(NativeMpvSubtitles.prototype);let release;Object.assign(service,{lifetime:life.initialNativeSubtitleLifetime(),timelineWork:new Map(),ready:new Promise(resolve=>release=resolve),syncPump(){},invalidate(){}});
 let calls=0;service.selectTimeline=async()=>{calls++;};const work=Array.from({length:128},()=>service.select('no'));
 await assert.rejects(service.select('no'),/capacity/);assert.equal(service.timelineWork.size,128);assert.equal(calls,0);
 release();await Promise.all(work);assert.equal(calls,128);assert.equal(service.timelineWork.size,0);assert.equal(service.lifetime.timeline.queue.length,0);
});
