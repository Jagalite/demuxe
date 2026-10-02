// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRemuxLifecycle,transitionRemuxLifecycle} from '../../web/generated/internal/machine/remux-lifecycle.js';
import {expectedRemuxVideoFrame,matchesRemuxVideoFrame} from '../../web/generated/internal/machine/remux-output.js';
import {RemuxPlayer} from '../../web/native-remux-player.js';
function machine(){
 let state=initialRemuxLifecycle();const history=[];
 const send=command=>{const old=state,before=structuredClone(old),result=transitionRemuxLifecycle(state,command);assert.deepEqual(old,before);state=result.state;history.push(structuredClone(command));assert.ok(Object.isFrozen(state.output));return result;};
 return {get state(){return state;},send,command(command,generation=state.generation){return send({type:'output',generation,command}).output??{accepted:false};},begin(){send({type:'open'});const restart=send({type:'restart',target:2,duration:30});send({type:'begin',restartId:restart.restartId});send({type:'schedule',generation:state.generation,command:{type:'configure',windowed:true,trackBounds:{videoEnd:1,audioEnd:3}}});return state.generation;},prime(){this.command({type:'frames',presentation:[[1.98,.02]],timelineBias:1});return this.command({type:'prime',enabled:true,updating:false,videoEnd:1,bufferEnd:2,audioRanges:[[1,4]],timelineBias:1,now:0});},replay(){assert.deepEqual(history.reduce((state,command)=>transitionRemuxLifecycle(state,command).state,initialRemuxLifecycle()),state);}};
}
test('frame metadata has source-relative mux times, immutable inputs, and the existing 4096-pair bound',()=>{
 const m=machine();m.begin();const frames=Array.from({length:4100},(_,i)=>[i+1,.04]);m.command({type:'frames',presentation:frames,timelineBias:1});frames[4099][0]=-1;assert.equal(Object.isFrozen(frames),false);assert.equal(m.state.output.frames.length,4096);assert.deepEqual(m.state.output.frames[0],[4,.04]);assert.deepEqual(m.state.output.frames.at(-1),[4099,.04]);assert.equal(m.state.output.muxedFrames,true);
 m.command({type:'frames',frames:[[6.3,.033]],timelineBias:1});assert.deepEqual(m.state.output.frames.at(-1),[6.3,.033]);assert.equal(expectedRemuxVideoFrame(m.state.output,6.3326),6.3);assert.equal(matchesRemuxVideoFrame(m.state.output,6.3326,7.3,1),true);assert.equal(matchesRemuxVideoFrame(m.state.output,6.3326,7.1,1),false);m.replay();
});
test('fallback frame metadata alone cannot claim muxed presentation correspondence',()=>{
 const m=machine();m.begin();m.command({type:'frames',frames:[[.98,.02]],timelineBias:1});assert.equal(matchesRemuxVideoFrame(m.state.output,.99,1.98,1),undefined);m.command({type:'frames',presentation:[],timelineBias:1});assert.equal(matchesRemuxVideoFrame(m.state.output,.99,1.98,1),true);
});
test('starvation requires clock stagnation, an outstanding producer, active playback and edge proximity',()=>{
 const m=machine();m.begin();const facts={type:'starvation',active:true,position:5,sourceTime:4,pulling:true,ranges:[[0,4.5]],rate:1};
 m.command({...facts,now:0});assert.equal(m.command({...facts,now:749}).changed,false);assert.equal(m.command({...facts,now:750}).changed,true);assert.equal(m.state.output.waiting,true);
 assert.equal(m.command({...facts,position:5.1,now:800}).changed,true);assert.equal(m.state.output.waiting,false);
 for(const patch of [{active:false},{pulling:false},{ranges:[[0,20]]}]){m.command({...facts,now:2000,...patch});assert.equal(m.state.output.waiting,false);}
 m.command({...facts,now:3000});m.begin();m.command({...facts,now:5000});assert.equal(m.state.output.waiting,false);m.replay();
});
test('prime admission needs video tail coverage, expected frame and actual audio coverage',()=>{
 const m=machine();m.begin();const facts={type:'prime',enabled:true,updating:false,videoEnd:1,bufferEnd:2,audioRanges:[[1,4]],timelineBias:1,now:0};assert.equal(m.command(facts).accepted,false);m.command({type:'frames',frames:[[.98,.02]],timelineBias:1});
 for(const patch of [{enabled:false},{updating:true},{bufferEnd:1.99},{audioRanges:[[2,4]]}])assert.equal(m.command({...facts,...patch}).accepted,false);
 const prime=m.command(facts);assert.equal(prime.target,1.999);assert.equal(m.state.buffer.busy,true);assert.equal(m.command(facts).accepted,false);m.replay();
});
test('matching currentTime and seeked never substitute for a presented frame; completion commits all domains atomically',()=>{
 const m=machine();m.begin();const prime=m.prime(),facts={type:'presented',id:prime.id,position:1.999,seeking:false,timelineBias:1};
 assert.equal(m.command(facts).completed,undefined);assert.equal(m.command({...facts,mediaTime:1.8}).completed,undefined);assert.equal(m.state.schedule.primeVideo,true);
 assert.equal(m.command({...facts,mediaTime:1.98,seeking:true}).completed,undefined);assert.equal(m.state.output.prime.presented,1.98);
 const completed=m.command(facts);assert.equal(completed.completed,true);assert.equal(completed.presented,1.98);assert.equal(m.state.output.prime,null);assert.equal(m.state.buffer.busy,false);assert.equal(m.state.schedule.primeVideo,false);assert.equal(m.command(facts).accepted,false);m.replay();
});
test('prime deadline is exact and stale deadlines cannot fail a new request',()=>{
 const m=machine();m.begin();const old=m.prime();assert.equal(m.command({type:'prime-deadline',id:old.id,now:9999}).remaining,1);assert.match(m.command({type:'prime-deadline',id:old.id,now:10000}).error,/did not present/);m.begin();const next=m.prime();assert.ok(next.id>old.id);const before=m.state;assert.equal(m.command({type:'prime-deadline',id:old.id,now:10000}).accepted,false);assert.equal(m.state,before);
});
for(const type of ['open','restart','retire','failure','destroy'])test(type+' retires prime evidence and progress without changing historical frame diagnostics',()=>{
 const m=machine(),generation=m.begin(),prime=m.prime();m.send({open:{type},restart:{type,target:2,duration:30},retire:{type,generation},failure:{type,generation,message:'failed',playing:false},destroy:{type}}[type]);const before=m.state;
 assert.equal(m.state.output.prime,null);assert.equal(m.state.output.waiting,false);assert.equal(m.state.output.frames.length,1);assert.equal(m.command({type:'presented',id:prime.id,mediaTime:1.98,position:1.999,seeking:false,timelineBias:1},generation).accepted,false);assert.equal(m.state,before);m.replay();
});
function shell(t){
 const frames=new Map(),cancelled=[],handlers=new Set();let serial=0;
 const video={currentTime:1,paused:true,seeking:false,addEventListener(type,handler){handlers.add(handler);},removeEventListener(type,handler){handlers.delete(handler);},requestVideoFrameCallback(callback){const id=++serial;frames.set(id,callback);return id;},cancelVideoFrameCallback(id){cancelled.push(id);frames.delete(id);},pause(){},removeAttribute(){},load(){}};
 const p=new RemuxPlayer(video,{mseOwner:'window',runtime:'jspi'});clearInterval(p.timer);t.after(()=>p.destroy());
 const begin=()=>{p.transitionLifecycle({type:'open'});const restart=p.transitionLifecycle({type:'restart',target:2,duration:30});p.transitionLifecycle({type:'begin',restartId:restart.restartId});p.transitionSchedule({type:'configure',windowed:true,trackBounds:{videoEnd:1,audioEnd:3}});p.transitionOutput({type:'frames',presentation:[[1.98,.02]],timelineBias:1});};begin();
 p.sbs=[{updating:false,buffered:{length:1,start:()=>1,end:()=>2}},{updating:false,buffered:{length:1,start:()=>1,end:()=>4}}];p.sb=p.sbs[0];p.media={readyState:'ended'};let pumps=0;p.pump=()=>pumps++;
 return {p,video,frames,cancelled,handlers,begin,get pumps(){return pumps;},frame(mediaTime){const [id,callback]=frames.entries().next().value;frames.delete(id);callback(0,{mediaTime});}};
}
test('actual prime waits for rVFC evidence, commits state before cleanup reentry and releases exactly once',t=>{
 const f=shell(t),{p,video,handlers,cancelled}=f;p.primeLastVideo(p.generation);assert.equal(p.primeVideo,true);for(const handler of [...handlers])handler();assert.equal(p.primeVideo,true);assert.equal(p.busy,true);
 let observed;const remove=video.removeEventListener;video.removeEventListener=(...args)=>{observed={busy:p.busy,prime:p.primeVideo,request:p.output.prime};remove.apply(video,args);};f.frame(1.98);assert.deepEqual(observed,{busy:false,prime:false,request:null});assert.equal(f.pumps,1);assert.equal(p.stats.tailPrimes[0].frame,.98);p.stopWorkers();assert.deepEqual(cancelled,[]);assert.equal(handlers.size,0);
});
test('actual frame callback acquired after retirement is cancelled immediately and cannot seek the retired video',t=>{
 const {p,video,cancelled,handlers}=shell(t);const position=video.currentTime;video.requestVideoFrameCallback=()=>{p.stopWorkers();return 73;};p.primeLastVideo(p.generation);assert.deepEqual(cancelled,[73]);assert.equal(video.currentTime,position);assert.equal(handlers.size,0);assert.equal(p.output.prime,null);assert.equal(p.primeFrame,0);
});
test('actual EOS reentry retires the prime before any frame callback or seek effect',t=>{
 const {p,video,frames,handlers}=shell(t);p.media={readyState:'open',endOfStream(){p.stopWorkers();}};p.primeLastVideo(p.generation);assert.equal(frames.size,0);assert.equal(handlers.size,0);assert.equal(video.currentTime,1);assert.equal(p.output.prime,null);
});
test('actual seeked-listener acquisition after retirement is removed even if cleanup ran during registration',t=>{
 const {p,video,frames,handlers}=shell(t);video.addEventListener=(type,handler)=>{p.stopWorkers();handlers.add(handler);};p.primeLastVideo(p.generation);assert.equal(frames.size,0);assert.equal(handlers.size,0);assert.equal(video.currentTime,1);
});
test('actual retired frame callback cannot complete or clear a replacement prime',t=>{
 const {p,frames,begin}=shell(t);const sb=p.sb,sbs=p.sbs;p.primeLastVideo(p.generation);const old=frames.values().next().value;p.stopWorkers();begin();p.sb=sb;p.sbs=sbs;p.primeLastVideo(p.generation);const current=p.output.prime.id;old(0,{mediaTime:1.98});assert.equal(p.output.prime.id,current);assert.equal(p.primeVideo,true);assert.equal(p.busy,true);
});
test('actual early prime timer rescheduling failure retires its frame and startup ownership',t=>{
 const {p,cancelled,handlers}=shell(t);let now=0,callback,calls=0;t.mock.method(performance,'now',()=>now);t.mock.method(globalThis,'setTimeout',fn=>{if(++calls===2)throw Error('timer unavailable');callback=fn;return 1;});
 p.primeLastVideo(p.generation);assert.equal(p.primeFrame,1);now=1;callback();assert.equal(p.output.prime,null);assert.equal(p.primeFrame,0);assert.deepEqual(cancelled,[1]);assert.equal(handlers.size,0);assert.match(p.failureError.message,/timer unavailable/);
});
