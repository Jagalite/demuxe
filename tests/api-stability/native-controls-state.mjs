// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/native-controls.js';
import * as backend from '../../web/generated/internal/machine/native-backend.js';
import {NativePlayer} from '../../web/generated/internal/native-player.js';
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function model(){let state=backend.initialNativeBackend();const history=[];return{get state(){return state;},send(command){const old=state,before=structuredClone(state),result=backend.transitionNativeBackend(state,command);assert.deepEqual(old,before);state=result.state;history.push(command);return result;},begin(domain,paused){return this.send({type:'control.begin',domain,paused}).request;},replay(){assert.deepEqual(history.reduce((value,event)=>backend.transitionNativeBackend(value,event).state,backend.initialNativeBackend()),state);}};}
test('Native control domains independently own completion and replace only their own pending request',()=>{
 const m=model(),gain=m.begin('gain'),volume=m.begin('volume'),newGain=m.begin('gain');assert.equal(backend.nativeRequestCurrent(m.state,gain),false);assert.equal(backend.nativeRequestCurrent(m.state,volume),true);
 assert.equal(m.send({type:'control.value',request:gain,change:{type:'gain',value:.2}}).accepted,false);m.send({type:'control.value',request:newGain,change:{type:'gain',value:.4}});m.send({type:'control.value',request:volume,change:{type:'volume',value:70}});assert.equal(m.state.controls.gain,.4);assert.equal(m.state.controls.volume,70);
 const before=m.state;assert.equal(m.send({type:'control.value',request:volume,change:{type:'rate',value:2}}).accepted,false);assert.equal(m.state,before);m.replay();
});
test('Native playback intent retires older play and fences track rollback automatic resume',()=>{
 const m=model(),play=m.begin('playback',false),load=m.send({type:'load.begin',kind:'audio-track',policy:{requested:false,original:false,remux:'auto',requiresRemux:true},position:5,paused:false}).request;
 m.begin('playback',true);assert.equal(backend.nativeRequestCurrent(m.state,play),false);assert.equal(m.send({type:'load.event',request:load,event:{type:'track-settled'}}).resume,false);assert.equal(m.state.controls.paused,true);m.replay();
});
test('Native source and stop retire pending settings without discarding accepted preferences',()=>{
 for(const type of ['source','stop']){const m=model(),gain=m.begin('gain');m.send({type:'control.value',request:gain,change:{type:'gain',value:.3}});m.send({type});assert.equal(m.state.controls.gain,.3);assert.equal(backend.nativeRequestCurrent(m.state,gain),false);assert.equal(m.send({type:'control.value',request:gain,change:{type:'gain',value:.9}}).accepted,false);m.replay();}
});
test('Native activation deadline uses explicit time and is removed with its request',()=>{
 const m=model(),request=m.begin('playback',false);m.send({type:'control.activation',request,now:300});assert.equal(m.send({type:'control.deadline',request,now:600}).remaining,9700);assert.equal(m.send({type:'control.deadline',request,now:10300}).failure,'activation-timeout');m.send({type:'control.finish',request});assert.equal(m.send({type:'control.deadline',request,now:12000}).accepted,false);assert.deepEqual(m.state.controls.activation,{});m.replay();
});
test('Native gain plan preserves selective, unity, paused and output selection precedence',()=>{
 const facts={selective:false,graph:false,paused:false,outputDevice:'speaker'};
 assert.deepEqual(core.selectNativeGain(.5,facts),{selective:false,createGraph:true,resume:true,selectOutput:true});assert.equal(core.selectNativeGain(1,facts).createGraph,false);assert.equal(core.selectNativeGain(.5,{...facts,graph:true}).createGraph,false);assert.equal(core.selectNativeGain(.5,{...facts,selective:true}).createGraph,false);assert.equal(core.selectNativeGain(.5,{...facts,paused:true}).resume,false);
 for(const value of [NaN,Infinity,-.1,1.1])assert.match(core.selectNativeGain(value,facts).error,/between 0 and 1/);
 const buffering={preload:'metadata',profile:'balanced'},state=core.initialNativeControls(buffering);buffering.preload='auto';assert.equal(state.buffering.preload,'metadata');
});
function candidate(){const calls=[],video={paused:true,playbackRate:1,defaultPlaybackRate:1,volume:1,play(){calls.push('play');return Promise.resolve();},pause(){calls.push('pause');},getVideoPlaybackQuality:()=>({totalVideoFrames:0}),currentTime:0,preload:'auto',removeAttribute(){},replaceChildren(){},load(){}};const player=Object.assign(Object.create(NativePlayer.prototype),{native:backend.initialNativeBackend(),video,controlWait:new Map(),eventWaits:new Map(),captionWait:new Map(),captionEffects:new Map(),browserTracks:new Map(),sinkWait:new Map(),cancelers:new Set(),listeners:[],captionURLs:new Set(),captionAssets:new Map(),ownedObjectURLs:new Map(),sourceCleanup:Promise.resolve(),refresh(){calls.push('refresh');}});return{player,video,calls};}
test('actual Native pause rejects blocked play promptly and late resume cannot play video',async()=>{
 const f=candidate(),resume=deferred();f.player.gainContext={state:'suspended',resume:()=>resume.promise};const playing=f.player.play(),rejected=assert.rejects(playing,/retired/);await flush();await f.player.pause();await rejected;resume.resolve();await flush();assert.deepEqual(f.calls,['pause','refresh']);assert.equal(f.player.cancelers.size,0);assert.equal(f.player.controlWait.size,0);assert.deepEqual(f.player.native.controls.activation,{});
});
test('actual Native selective play captures owner and cannot call replacement media continuation',async()=>{
 const f=candidate(),hold=deferred();let callback;f.player.mpvAudio={play(start){callback=start;return hold.promise;}};const playing=f.player.play(),rejected=assert.rejects(playing,/retired/);f.player.retireNativeSource();f.player.remux={play:async()=>f.calls.push('replacement')};assert.throws(()=>callback(),/retired/);hold.resolve();await rejected;assert.deepEqual(f.calls,[]);
});
test('actual Native selective pause callback runs in same stack before returning',async()=>{
 const f=candidate();f.player.mpvAudio={pause(stop){f.calls.push('audio');stop();return Promise.resolve();}};const paused=f.player.pause();assert.deepEqual(f.calls,['audio','pause']);await paused;assert.deepEqual(f.calls,['audio','pause','refresh']);
});
test('actual Native old output selection cannot replace the newer accepted preference',async()=>{
 const f=candidate(),old=deferred();f.video.setSinkId=id=>id==='old'?old.promise:Promise.resolve();const first=f.player.setAudioOutputDevice('old'),rejected=assert.rejects(first,/retired/),next=f.player.setAudioOutputDevice('new');await rejected;assert.equal(f.player.outputDevice,'');old.resolve();await next;assert.equal(f.player.outputDevice,'new');assert.equal(f.player.controlWait.size,0);
});
test('actual Native independent volume and gain transactions preserve both accepted values',async()=>{
 const f=candidate(),hold=deferred();f.player.requestedPlan='native-video-mpv-audio';f.player.mpvAudio={volume:()=>hold.promise,gainValue:async()=>{}};const volume=f.player.volume(40);await f.player.gain(.2);hold.resolve();await volume;assert.equal(f.player.requestedVolume,40);assert.equal(f.player.gainValue,.2);
});
test('actual Native source retirement during playbackRate setter prevents remaining writes and publication',async()=>{
 const f=candidate();let writes=0;Object.defineProperty(f.video,'defaultPlaybackRate',{set(){f.player.retireNativeSource();}});Object.defineProperty(f.video,'playbackRate',{set(){writes++;}});await assert.rejects(f.player.rate(2),/retired/);assert.equal(writes,0);assert.deepEqual(f.calls,[]);
});
test('actual Native retired remux buffering completion cannot update replacement preload or core intent',async()=>{
 const f=candidate(),hold=deferred();f.player.remux={setBuffering:()=>hold.promise};const policy={preload:'metadata',profile:'resilient'},pending=f.player.setBuffering(policy),rejected=assert.rejects(pending,/retired/);f.player.retireNativeSource();hold.resolve();await rejected;assert.equal(f.video.preload,'auto');assert.equal(f.player.buffering.preload,'auto');
});
test('actual Native early activation timer re-arms against monotonic deadline and pause clears it',async t=>{
 const f=candidate(),hold=deferred(),timers=new Map();let id=0,now=0;t.mock.method(performance,'now',()=>now);t.mock.method(globalThis,'setTimeout',(callback,delay)=>{timers.set(++id,{callback,delay});return id;});t.mock.method(globalThis,'clearTimeout',key=>timers.delete(key));f.player.gainContext={state:'suspended',resume:()=>hold.promise};
 const pending=f.player.play(),rejected=assert.rejects(pending,/retired/);assert.equal(timers.get(1).delay,10000);const callback=timers.get(1).callback;now=300;timers.delete(1);callback();assert.equal(timers.get(2).delay,9700);assert.equal(f.player.native.controls.activation.playback.deadline,10000);await f.player.pause();await rejected;assert.equal(timers.size,0);hold.resolve();
});
test('actual Native direct play reaches the browser in the invoking stack',async()=>{const f=candidate(),pending=f.player.play();assert.deepEqual(f.calls,['play']);await pending;assert.deepEqual(f.calls,['play','refresh']);});
test('actual Native invalid gain leaves an existing gain transaction untouched',async()=>{const f=candidate(),hold=deferred();f.player.requestedPlan='native-video-mpv-audio';f.player.mpvAudio={gainValue:()=>hold.promise};const pending=f.player.gain(.4),request=f.player.native.controls.pending.gain;await assert.rejects(f.player.gain(NaN),/between 0 and 1/);assert.equal(f.player.native.controls.pending.gain,request);hold.resolve();await pending;assert.equal(f.player.gainValue,.4);});
function graph(t,f,{paused=true}={}){const calls=[],parameter={setValueAtTime(value){calls.push(['gain',value]);}},source={connect(){calls.push('source-connect');},disconnect(){calls.push('source-disconnect');}},node={gain:parameter,connect(){calls.push('gain-connect');},disconnect(){calls.push('gain-disconnect');}},context={state:'running',currentTime:1,destination:{},createMediaElementSource(){calls.push('source-create');return source;},createGain(){calls.push('gain-create');return node;},setSinkId(id){calls.push(['sink',id]);return Promise.resolve();},close(){calls.push('context-close');return Promise.resolve();}};f.video.paused=paused;installContext(t,function(){return context;});return {calls,parameter,source,node,context};}
test('actual Native gain waits for an earlier output selection before configuring its new graph',async t=>{
 const f=candidate(),hold=deferred();f.video.setSinkId=()=>hold.promise;const output=f.player.setAudioOutputDevice('speaker'),g=graph(t,f),gain=f.player.gain(.4);await flush();assert.deepEqual(g.calls,[]);hold.resolve();await output;await gain;assert.deepEqual(g.calls,[['sink','speaker'],'source-create','gain-create',['gain',.4],'source-connect','gain-connect',['gain',.4]]);assert.equal(f.player.gainValue,.4);assert.equal(f.player.outputDevice,'speaker');
});
test('actual Native AudioContext acquired after gain retirement is closed without installing it',async t=>{
 const f=candidate();let closes=0;installContext(t,function(){f.player.retireNativeSource();return {close:async()=>{closes++;}};});await assert.rejects(f.player.gain(.4),/retired/);assert.equal(closes,1);assert.equal(f.player.gainContext,undefined);
});
test('actual Native gain node acquired after source retirement is disconnected without installation',async t=>{
 const f=candidate(),g=graph(t,f);g.context.createGain=()=>{f.player.retireNativeSource();return g.node;};await assert.rejects(f.player.gain(.4),/retired/);assert.equal(f.player.gainNode,undefined);assert.equal(g.calls.includes('gain-disconnect'),true);assert.equal(g.calls.includes('source-connect'),false);
});

function installContext(t,Constructor){const prior=Object.getOwnPropertyDescriptor(globalThis,'AudioContext');Object.defineProperty(globalThis,'AudioContext',{value:Constructor,configurable:true,writable:true});t.after(()=>{if(prior)Object.defineProperty(globalThis,'AudioContext',prior);else delete globalThis.AudioContext;});}
test('actual Native track switch completion cannot undo a later explicit pause',async()=>{
 const f=candidate(),hold=deferred();f.video.paused=false;f.player.remux={tracks:[{id:'2',type:'audio',selected:false}],timelineBias:0,pause(){f.calls.push('remux-pause');}};f.player.remuxSource={options:{url:'https://media.test/a'}};f.player.startRemux=()=>hold.promise;
 const track=f.player.selectTrack('audio','2');await flush();await f.player.pause();hold.resolve();await track;assert.deepEqual(f.calls,['remux-pause','refresh','refresh']);assert.equal(f.player.native.controls.paused,true);
});
test('actual Native gain activation starts in the invoking stack before graph redirection',async t=>{
 const f=candidate(),g=graph(t,f,{paused:false}),resume=deferred();g.context.state='suspended';g.context.resume=()=>{g.calls.push('resume');return resume.promise;};const gain=f.player.gain(.5);assert.deepEqual(g.calls,['resume']);resume.resolve();await gain;assert.equal(g.calls.includes('source-connect'),true);assert.equal(f.player.gainValue,.5);
});
test('actual Native failed graph connection releases partial node and can retry with its owned source',async t=>{
 const f=candidate(),g=graph(t,f);let fail=true;g.node.connect=()=>{if(fail)throw Error('connection failed');g.calls.push('gain-connect');};await assert.rejects(f.player.gain(.5),/connection failed/);assert.equal(f.player.gainNode,undefined);assert.equal(g.calls.filter(value=>value==='gain-disconnect').length,1);fail=false;await f.player.gain(.3);assert.equal(g.calls.filter(value=>value==='source-create').length,1);assert.equal(f.player.gainValue,.3);
});
test('actual Native activation reschedule failure settles control and releases timer accounting',async t=>{
 const f=candidate(),hold=deferred(),failure=Error('timer unavailable');let callback,calls=0;t.mock.method(performance,'now',()=>100);t.mock.method(globalThis,'setTimeout',fn=>{if(++calls>1)throw failure;callback=fn;return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});f.player.gainContext={state:'suspended',resume:()=>hold.promise};const pending=f.player.play(),rejected=assert.rejects(pending,error=>error===failure);callback();await rejected;assert.equal(f.player.cancelers.size,0);assert.equal(f.player.controlWait.size,0);hold.resolve();
});
test('Native physical sink queue retains one active and at most one current request per domain',()=>{
 const m=model(),first=m.begin('output');m.send({type:'control.sink.begin',request:first});let last;
 for(let i=0;i<100;i++){last=m.begin('output');m.send({type:'control.sink.begin',request:last});assert.equal(m.state.controls.sink.queued.length,1);}
 const next=m.send({type:'control.sink.finished',request:first});assert.equal(next.sinkStart.id,last.id);assert.equal(m.state.controls.sink.queued.length,0);m.send({type:'source'});assert.equal(m.state.controls.sink.active.id,last.id);m.send({type:'control.sink.finished',request:last});assert.equal(m.state.controls.sink.active,null);m.replay();
});
test('actual Native gain sink completion cannot overwrite a newer output-device choice',async t=>{
 const f=candidate(),g=graph(t,f),first=deferred(),second=deferred();let physical='A';f.player.native={...f.player.native,controls:{...f.player.native.controls,outputDevice:'A'}};
 g.context.setSinkId=id=>{g.calls.push(['sink',id]);return (id==='A'?first.promise:second.promise).then(()=>{physical=id;});};
 const gain=f.player.gain(.5);await flush();const output=f.player.setAudioOutputDevice('B');second.resolve();await flush();assert.deepEqual(g.calls,[['sink','A']]);assert.equal(f.player.outputDevice,'A');first.resolve();await Promise.all([gain,output]);assert.equal(physical,'B');assert.equal(f.player.outputDevice,'B');assert.equal(f.player.sinkWait.size,0);assert.equal(f.player.native.controls.sink.active,null);
});
test('actual Native superseded queued output never reaches the physical sink and releases its entry',async()=>{
 const f=candidate(),first=deferred(),calls=[];f.video.setSinkId=id=>{calls.push(id);return id==='first'?first.promise:Promise.resolve();};
 const initial=f.player.setAudioOutputDevice('first'),initialRejected=assert.rejects(initial,/retired/);const old=f.player.setAudioOutputDevice('old'),oldRejected=assert.rejects(old,/retired/);const next=f.player.setAudioOutputDevice('next');await initialRejected;await oldRejected;assert.deepEqual(calls,['first']);assert.equal(f.player.sinkWait.size,2);first.resolve();await next;assert.deepEqual(calls,['first','next']);assert.equal(f.player.outputDevice,'next');assert.equal(f.player.sinkWait.size,0);
});
test('actual Native rejected sink values remain rejections and cannot commit device preference',async()=>{const f=candidate();f.video.setSinkId=()=>Promise.reject(undefined);await f.player.setAudioOutputDevice('rejected').then(()=>assert.fail('sink rejection was lost'),error=>assert.equal(error,undefined));assert.equal(f.player.outputDevice,'');assert.equal(f.player.sinkWait.size,0);assert.equal(f.player.native.controls.sink.active,null);});
