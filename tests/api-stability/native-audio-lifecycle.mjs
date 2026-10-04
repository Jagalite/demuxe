// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {NativeMpvAudio} from '../../web/generated/internal/native-mpv-audio.js';
import fs from 'node:fs';
import vm from 'node:vm';
import * as workletCore from '../../web/generated/internal/machine/selective-worklet.js';
import {initialNativeAudio,beginNativeAudio,transitionNativeAudio} from '../../web/generated/internal/machine/native-audio.js';
import {watchdogPolicy} from '../../web/generated/internal/watchdogs.js';
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
function fixture(overrides={}){
 const calls=[],video={playbackRate:1,defaultPlaybackRate:1,paused:false,seeking:false,ended:false,readyState:4,duration:100,ownerDocument:{hidden:false},pause(){calls.push('video-pause');},async play(){calls.push('video-play');},removeEventListener(){calls.push('video-detach');},cancelVideoFrameCallback(){calls.push('frame-cancel');}};
 const context={state:'running',currentTime:0,addEventListener(){},removeEventListener(){calls.push('context-detach');},async resume(){calls.push('context-resume');},async suspend(){calls.push('context-suspend');}},engine={properties:new Map([['track-list',[{type:'audio',id:'1',selected:true,'ff-index':0}]]]),ready:Promise.resolve(),async play(){calls.push('engine-play');},async pause(){calls.push('engine-pause');},async destroy(){calls.push('engine-destroy');},async command(...args){calls.push(args);},async rate(value){calls.push(['rate',value]);},async seek(value){calls.push(['seek',value]);},async confirmSeek(){return true;},async inspectMetadata(){},async open(){},async openRemote(){}};
 const audio=Object.assign(Object.create(NativeMpvAudio.prototype),{machine:initialNativeAudio(watchdogPolicy()),operations:new Map(),contextOperations:Promise.resolve(),context,header:new Int32Array(16),video,time:()=>0,fadeOut:async()=>{},fadeIn(){calls.push('fade-in');},engine,hidden:{remove(){calls.push('hidden-remove');}},failed:error=>calls.push(error),...overrides});
 engine.selectiveAudioState=()=>({header:audio.header,context:audio.context,gain:{}});return{audio,calls,video,context,engine};
}
function clock(t){
 const original={performance:globalThis.performance,setTimeout,clearTimeout},timers=new Map();let now=0,serial=0;
 globalThis.performance={now:()=>now,timeOrigin:1000};globalThis.setTimeout=(callback,delay)=>{const id=++serial;timers.set(id,{callback,due:now+Number(delay)});return id;};globalThis.clearTimeout=id=>{timers.delete(id);};
 t.after(()=>Object.assign(globalThis,original));return{timers,set(value){now=value;},fire(id){const timer=timers.get(id);timers.delete(id);timer.callback();},async tick(value){now=value;for(let count=0;count<200;count++){const item=[...timers].find(([,timer])=>timer.due<=now);if(!item)break;timers.delete(item[0]);item[1].callback();await flush();}await flush();}};
}
const point=(generation=0,kind='timeline',rate=1,wallTime=1000)=>({kind,wallTime,mediaTime:0,rate,generation,epoch:0,audioFrame:0});
test('actual deferred native-audio play cannot re-enable shared PCM output after pause',async()=>{
 const hold=deferred(),{audio,calls,engine}=fixture();engine.play=()=>hold.promise;
 const playing=audio.play(async()=>{calls.push('video-play');});let rejected;const settled=playing.catch(error=>{rejected=error;});await flush();await audio.pause(()=>calls.push('video-pause'));assert.equal(Atomics.load(audio.header,12),0);hold.resolve();await flush();audio.onOutput(point(0,'timeline',1,performance.timeOrigin+performance.now()));await settled;
 assert.equal(Atomics.load(audio.header,12),0,'retired play must keep PCM output disabled');assert.equal(audio.running,false);assert.equal(calls.includes('fade-in'),false);assert.equal(calls.includes('video-play'),false);assert.equal(rejected?.name,'AbortError');assert.equal(audio.operations.size,0);assert.equal(audio.firstPoint,undefined);
});
test('destroy promptly rejects an uncooperative play and later success cannot publish',async()=>{
 const hold=deferred(),{audio,calls,engine}=fixture();engine.play=()=>hold.promise;const playing=audio.play(async()=>calls.push('video-play'));const rejected=assert.rejects(playing,{name:'AbortError'});await flush();const close=audio.destroy();assert.equal(audio.destroy(),close);await close;await rejected;hold.resolve();await flush();assert.equal(Atomics.load(audio.header,12),0);assert.equal(calls.includes('video-play'),false);assert.deepEqual(calls,['context-detach','video-detach','engine-destroy','hidden-remove']);
});
test('pause retires PCM timestamp wait immediately and late output cannot resume it',async t=>{
 const timer=clock(t),{audio,calls}=fixture();const playing=audio.play(async()=>calls.push('video-play')),rejected=assert.rejects(playing,{name:'AbortError'});await flush();assert.equal(Atomics.load(audio.header,12),1);assert.equal(timer.timers.size,1);await audio.pause(()=>calls.push('video-pause'));await rejected;audio.onOutput(point());await timer.tick(4000);assert.equal(Atomics.load(audio.header,12),0);assert.equal(calls.includes('video-play'),false);assert.equal(timer.timers.size,0);
});
test('current PCM timestamp starts video once and pause leaves output disabled',async t=>{
 const timer=clock(t),{audio,calls}=fixture();const playing=audio.play(async()=>calls.push('video-play'));await flush();audio.onOutput(point());await flush();await timer.tick(0);await playing;assert.equal(audio.running,true);assert.equal(Atomics.load(audio.header,12),1);assert.equal(calls.filter(value=>value==='video-play').length,1);assert.equal(audio.machine.publication,null);await audio.pause(()=>calls.push('video-pause'));assert.equal(audio.running,false);assert.equal(Atomics.load(audio.header,12),0);assert.equal(timer.timers.size,0);
});
test('early PCM timestamp timeout is rearmed against original absolute deadline',async t=>{
 const timer=clock(t),{audio}=fixture();const playing=audio.play(async()=>{});const rejection=assert.rejects(playing,/Selective PCM timestamp timeout/);await flush();timer.set(100);timer.fire([...timer.timers.keys()][0]);await flush();assert.equal(timer.timers.size,1);assert.equal(audio.machine.publication.deadline,3000);assert.equal([...timer.timers.values()][0].due,120);await timer.tick(2999);assert.ok(audio.firstPoint);await timer.tick(3000);await rejection;assert.equal(audio.firstPoint,undefined);assert.equal(audio.machine.publication,null);assert.equal(Atomics.load(audio.header,12),0);
});
test('late rate boundary is ignored after pause and next playback retains requested rate',async t=>{
 const timer=clock(t),{audio,video}=fixture();audio.machine={...audio.machine,running:true};const changing=audio.rate(2),rejection=assert.rejects(changing,{name:'AbortError'});await flush();assert.equal(audio.machine.rate.rate,2);await audio.pause(()=>{});await rejection;audio.onOutput(point(0,'rate-boundary',2));await timer.tick(5000);assert.equal(video.playbackRate,1);assert.equal(audio.resumeRate,2);assert.equal(audio.machine.rate,null);assert.equal(timer.timers.size,0);
});
test('future rate boundary updates browser only when its matching due time arrives',async t=>{
 const timer=clock(t),{audio,video}=fixture();audio.machine={...audio.machine,running:true};const changing=audio.rate(2);await flush();audio.onOutput(point(0,'rate-boundary',1.5,1100));assert.equal(timer.timers.size,1);audio.onOutput(point(0,'rate-boundary',2,1100));assert.equal(timer.timers.size,2);await timer.tick(99);assert.equal(video.playbackRate,1);await timer.tick(100);await changing;assert.equal(video.playbackRate,2);assert.equal(video.defaultPlaybackRate,2);assert.equal(audio.machine.drift.rateCount,1);assert.equal(timer.timers.size,0);
});
test('rate property setter retirement prevents second write and counters',async t=>{
 const timer=clock(t),{audio,video}=fixture();audio.machine={...audio.machine,running:true};Object.defineProperty(video,'defaultPlaybackRate',{set(){void audio.destroy();}});const changing=audio.rate(2),rejection=assert.rejects(changing,{name:'AbortError'});await flush();audio.onOutput(point(0,'rate-boundary',2));await timer.tick(0);await rejection;assert.equal(video.playbackRate,1);assert.equal(audio.machine.drift.rateCount,0);assert.equal(timer.timers.size,0);
});
test('seek retirement after video callback prevents native seek or PCM restart',async()=>{
 const {audio,calls,engine}=fixture();engine.seek=async()=>calls.push('engine-seek');const seeking=audio.seek(2,async()=>{void audio.pause(()=>{});});await assert.rejects(seeking,{name:'AbortError'});await flush();assert.equal(calls.includes('engine-seek'),false);assert.equal(calls.includes('engine-play'),false);assert.equal(Atomics.load(audio.header,12),0);assert.equal(audio.running,false);
});
test('destroy between ready and resource acquisition does not acquire native audio state',async()=>{
 const hold=deferred(),{audio,engine}=fixture();engine.ready=hold.promise;let acquired=0;engine.selectiveAudioState=()=>{acquired++;throw Error('unexpected');};const opening=audio.open({url:'https://media.test/a'}),rejected=assert.rejects(opening,{name:'AbortError'});await flush();await audio.destroy();await rejected;hold.resolve();await flush();assert.equal(acquired,0);
});
test('late context listener registration is removed after reentrant retirement',async()=>{
 const {audio,context,calls}=fixture();context.addEventListener=()=>{void audio.destroy();};const opening=audio.open({url:'https://media.test/a'});await assert.rejects(opening,{name:'AbortError'});assert.equal(calls.filter(value=>value==='context-detach').length,2);assert.equal(calls.some(value=>Array.isArray(value)&&value[0]==='set'),false);
});
test('destroy attempts every release and preserves first error through engine failure',async()=>{
 const first=Error('listener cleanup'),{audio,calls,context,engine}=fixture();context.removeEventListener=()=>{calls.push('context-detach');throw first;};engine.destroy=async()=>{calls.push('engine-destroy');throw Error('engine failure');};Atomics.store(audio.header,12,1);const closing=audio.destroy();assert.equal(audio.destroy(),closing);await assert.rejects(closing,error=>error===first);assert.deepEqual(calls,['context-detach','video-detach','engine-destroy','hidden-remove']);assert.equal(Atomics.load(audio.header,12),0);
});
test('destroy cleanup errors still reject both publication and rate callers',async t=>{
 const timer=clock(t),{audio}=fixture();const playing=audio.play(async()=>{}),playRejected=assert.rejects(playing,{name:'AbortError'});await flush();audio.machine={...audio.machine,running:true};const rate=audio.rate(2),rateRejected=assert.rejects(rate,{name:'AbortError'});await flush();const remove=globalThis.clearTimeout;globalThis.clearTimeout=id=>{remove(id);throw Error('timer cleanup');};await assert.rejects(audio.destroy(),/timer cleanup/);await Promise.all([playRejected,rateRejected]);assert.equal(audio.firstPoint,undefined);assert.equal(audio.pendingRate,undefined);assert.equal(timer.timers.size,0);
});
test('play getter that retires service is fenced before method invocation',async()=>{
 const {audio,engine}=fixture();let invoked=0;Object.defineProperty(engine,'play',{get(){void audio.destroy();return()=>{invoked++;return Promise.resolve();};}});await assert.rejects(audio.play(async()=>{}),{name:'AbortError'});assert.equal(invoked,0);assert.equal(Atomics.load(audio.header,12),0);
});
test('convergence wait uses original deadline and retirement releases timer',async t=>{
 const timer=clock(t),{audio}=fixture();const verification=audio.verifyOutput(),rejection=assert.rejects(verification,{name:'AbortError'});await flush();assert.equal(timer.timers.size,1);await audio.destroy();await rejection;assert.equal(timer.timers.size,0);assert.deepEqual(audio.machine.waits,[]);
});
test('context suspension retires deferred automatic resume before it can publish',async()=>{
 const hold=deferred(),{audio,context,engine,calls}=fixture();audio.machine={...audio.machine,running:true,playbackIntent:'play'};context.state='suspended';audio.observeContext();await flush();context.state='running';engine.play=()=>hold.promise;audio.observeContext();await flush();assert.equal(audio.contextPaused,false);context.state='suspended';audio.observeContext();await flush();assert.equal(audio.contextPaused,true);hold.resolve();await flush();assert.equal(Atomics.load(audio.header,12),0);assert.equal(audio.running,false);assert.equal(calls.includes('fade-in'),false);assert.equal(calls.includes('video-play'),false);assert.equal(audio.firstPoint,undefined);assert.equal(calls.some(value=>value instanceof Error),false);
});
test('manual pause suppresses subsequent context reactivation',async()=>{
 const {audio,context,calls}=fixture();audio.machine={...audio.machine,running:true,playbackIntent:'play'};context.state='suspended';audio.observeContext();await flush();await audio.pause(()=>{});context.state='running';audio.observeContext();await flush();assert.equal(audio.machine.playbackIntent,'pause');assert.equal(calls.includes('engine-play'),false);assert.equal(Atomics.load(audio.header,12),0);
});
test('frame callbacks use actual final200ms output evidence and reject duplicate callback identity',async()=>{
 const {audio,video}=fixture(),callbacks=[];let serial=0;video.requestVideoFrameCallback=callback=>{callbacks.push(callback);return ++serial;};audio.machine={...audio.machine,running:true};audio.scheduleFrame();callbacks[0](0,{mediaTime:99.79});assert.equal(Atomics.load(audio.header,7),0);assert.equal(callbacks.length,2);callbacks[0](0,{mediaTime:99.9});assert.equal(callbacks.length,2);assert.equal(Atomics.load(audio.header,7),0);callbacks[1](0,{mediaTime:99.8});assert.equal(Atomics.load(audio.header,7),1);assert.equal(callbacks.length,3);await audio.destroy();callbacks[2](0,{mediaTime:99.9});assert.equal(callbacks.length,3);
});
test('late acquired frame callback is cancelled after request method retires owner',async()=>{
 const {audio,video}=fixture(),cancelled=[];video.cancelVideoFrameCallback=id=>cancelled.push(id);video.requestVideoFrameCallback=()=>{void audio.destroy();return 0;};audio.scheduleFrame();await audio.destroy();assert.deepEqual(cancelled,[0]);assert.equal(audio.machine.frame,null);
});
test('frame duration getter retirement prevents tail output write',async()=>{
 const {audio,video}=fixture();let frame;video.requestVideoFrameCallback=callback=>{frame=callback;return 1;};Object.defineProperty(video,'duration',{get(){void audio.destroy();return 100;}});audio.machine={...audio.machine,running:true};audio.scheduleFrame();frame(0,{mediaTime:99.9});await audio.destroy();assert.equal(Atomics.load(audio.header,7),0);
});
for(const phase of ['publication','rate-timeout','rate-due'])test(`early ${phase} timer rearm releases handle acquired after retirement`,async t=>{
 const timer=clock(t),{audio}=fixture();if(phase!=='publication')audio.machine={...audio.machine,running:true};
 const work=phase==='publication'?audio.play(async()=>{}):audio.rate(2),rejected=assert.rejects(work,{name:'AbortError'});await flush();if(phase==='rate-due')audio.onOutput(point(0,'rate-boundary',2,1100));
 const first=phase==='rate-due'?[...timer.timers].find(([,item])=>item.due===100)[0]:[...timer.timers.keys()][0],arm=globalThis.setTimeout;
 globalThis.setTimeout=(callback,delay)=>{void audio.destroy();return arm(callback,delay);};timer.fire(first);await rejected;await audio.destroy();assert.equal(timer.timers.size,0);assert.equal(audio.firstPoint,undefined);assert.equal(audio.pendingRate,undefined);assert.equal(Atomics.load(audio.header,12),0);
});
test('retirement between owned helper resolution and outer play continuation blocks PCM writes',async()=>{
 const {audio,engine}=fixture();const original=audio.owned.bind(audio);let next=false;engine.play=async()=>{next=true;};audio.owned=(lease,work)=>{const result=original(lease,work);if(next){next=false;return result.then(value=>{queueMicrotask(()=>{void audio.pause(()=>{});});return value;});}return result;};await assert.rejects(audio.play(async()=>{}),{name:'AbortError'});await flush();assert.equal(Atomics.load(audio.header,12),0);assert.equal(audio.running,false);assert.equal(audio.firstPoint,undefined);
});
test('publication due time survives early timer delivery and publishes only at due time',async t=>{
 const timer=clock(t),{audio,calls}=fixture(),playing=audio.play(async()=>calls.push('video-play'));await flush();audio.onOutput(point(0,'timeline',1,1100));await flush();assert.equal(audio.machine.publication.due,100);timer.fire([...timer.timers.keys()][0]);await flush();assert.equal(calls.includes('video-play'),false);assert.equal(timer.timers.size,1);await timer.tick(100);await playing;assert.equal(calls.filter(value=>value==='video-play').length,1);
});
test('retired EOF failure cannot report into newer playback',async()=>{
 const hold=deferred(),{audio,calls,engine}=fixture();audio.machine={...audio.machine,running:true};engine.pause=()=>hold.promise;const draining=audio.finishEOF(),rejected=assert.rejects(draining,{name:'AbortError'});await flush();const paused=audio.pause(()=>{});await flush();hold.reject(Error('late old drain'));await rejected;await assert.rejects(paused,/late old drain/);assert.equal(calls.some(value=>value instanceof Error),false);
});
test('failed PCM timer acquisition never enables audio output or fades in',async t=>{
 clock(t);const {audio,calls}=fixture();globalThis.setTimeout=()=>{throw Error('timer unavailable');};await assert.rejects(audio.play(async()=>{}),/timer unavailable/);assert.equal(Atomics.load(audio.header,12),0);assert.equal(calls.includes('fade-in'),false);assert.equal(audio.firstPoint,undefined);
});

function linkedWorklet(audio){
 const capacity=8192,buffer=new SharedArrayBuffer(64+capacity*8+capacity*16);audio.header=new Int32Array(buffer,0,16);
 let Processor;const messages=[],context={...workletCore,Atomics,Int32Array,Float32Array,Float64Array,currentFrame:0,sampleRate:48000,AudioWorkletProcessor:class{constructor(){this.port={postMessage(message){messages.push(message);audio.onOutput({...message,wallTime:performance.timeOrigin+performance.now()});}};}},registerProcessor(name,value){Processor=value;}};
 vm.runInNewContext(fs.readFileSync(new URL('../../web/selective-sync-worklet.js',import.meta.url),'utf8').replace(/^import .*;$/gm,''),context);
 const processor=new Processor({processorOptions:{buffer,capacity,channels:2}}),h=audio.header;
 return{h,messages,step(){processor.process([],[ [new Float32Array(128),new Float32Array(128)] ]);context.currentFrame+=128;},reset(epoch=2){Atomics.store(h,3,epoch);Atomics.store(h,0,0);Atomics.store(h,2,0);},fill(){processor.pcm.fill(.1);for(let i=0;i<capacity;i++){processor.meta[2*i]=i/48000;processor.meta[2*i+1]=1;}Atomics.store(h,0,capacity);Atomics.store(h,2,1);}};
}
for(const order of ['before','after'])test(`real selective worklet publishes first PCM when native AO initializes ${order} play resolution`,async t=>{
 const timer=clock(t),{audio,calls,engine}=fixture(),link=linkedWorklet(audio),hold=deferred();engine.play=()=>hold.promise;
 const playing=audio.play(async()=>calls.push('video-play'));let error;const done=playing.catch(value=>{error=value;});await flush();
 if(order==='before'){link.reset();link.step();link.step();link.fill();}
 hold.resolve();await flush();
 if(order==='after'){assert.equal(link.h[14],0);link.reset();link.step();link.step();link.fill();}
 link.step();await flush();await timer.tick(20);link.step();await flush();await timer.tick(20);
 if(!calls.includes('video-play'))await timer.tick(3000);await done;
 assert.equal(error,undefined);assert.equal(link.h[14],2);assert.ok(link.h[5]>0);assert.equal(calls.filter(value=>value==='video-play').length,1);assert.equal(timer.timers.size,0);
 await audio.pause(()=>{});
});
test('publication permit waits for even acknowledged native epoch and coherent reread',async t=>{
 const timer=clock(t),{audio,calls}=fixture(),link=linkedWorklet(audio),playing=audio.play(async()=>calls.push('video-play'));
 await flush();link.reset(1);link.step();link.step();link.fill();await timer.tick(20);link.step();assert.equal(link.h[14],0);assert.equal(link.h[5],0);
 link.reset(2);link.fill();await timer.tick(40);assert.equal(link.h[14],0,'unacknowledged epoch cannot be permitted');link.step();
 const read=audio.h.bind(audio);let reads=0;audio.h=index=>index===3&&++reads===2?4:read(index);await timer.tick(60);assert.equal(link.h[14],0,'torn epoch snapshot cannot be permitted');audio.h=read;
 await timer.tick(80);link.step();await flush();await timer.tick(80);await playing;assert.equal(link.h[14],2);assert.equal(calls.filter(value=>value==='video-play').length,1);await audio.pause(()=>{});
});
for(const retirement of ['pause','destroy'])test(`retired publication callback cannot authorize late initialized PCM after ${retirement}`,async t=>{
 const timer=clock(t),{audio,calls}=fixture(),link=linkedWorklet(audio),playing=audio.play(async()=>calls.push('video-play')),rejected=assert.rejects(playing,{name:'AbortError'});
 await flush();const callback=[...timer.timers.values()][0].callback;
 if(retirement==='pause')await audio.pause(()=>{});else await audio.destroy();await rejected;
 link.reset();link.step();link.step();link.fill();callback();link.step();await timer.tick(3000);
 assert.equal(link.h[14],0);assert.equal(link.h[12],0);assert.equal(link.h[5],0);assert.equal(calls.includes('video-play'),false);assert.equal(timer.timers.size,0);
});
test('completed publication does not authorize an unrelated later native reset',async t=>{
 const timer=clock(t),{audio,calls}=fixture(),link=linkedWorklet(audio);link.reset();link.step();link.step();link.fill();
 const playing=audio.play(async()=>calls.push('video-play'));await flush();const callback=[...timer.timers.values()][0].callback;link.step();await flush();await timer.tick(0);await playing;
 const consumed=link.h[5];link.reset(4);link.step();link.fill();callback();link.step();await timer.tick(100);
 assert.equal(link.h[14],2);assert.equal(link.h[5],consumed);assert.equal(calls.filter(value=>value==='video-play').length,1);assert.equal(timer.timers.size,0);await audio.pause(()=>{});
});
