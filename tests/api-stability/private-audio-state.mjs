// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';
import {createPrivateAudio,selectPrivateAudioStream,privateAudioSettings,beginAudioControl,audioControlCurrent,finishAudioPlay,observeAudioContext,acknowledgeAudioContext,beginAudioPoll,finishAudioPoll,observeAudioClock,resetAudioClock,beginAudioEOF,audioEOFCurrent,finishAudioEOF,retirePrivateAudio,privateAudioReady,privateAudioDeadline,privateAudioDeadlineOpen} from '../../web/generated/internal/machine/private-audio.js';
import {NativePrivateMpvAudio} from '../../web/generated/internal/native-private-mpv-audio.js';
const playing=()=>{const start=beginAudioControl(createPrivateAudio(),'play');return finishAudioPlay(start.state,start.id).state;};
const sample=(error,videoRate=1)=>({active:true,contextRunning:true,videoPaused:false,videoSeeking:false,hidden:false,audioTime:error/1000,videoTime:0,videoRate});
test('pause, seek and retirement reject obsolete play completions without mutating snapshots',()=>{
 const initial=createPrivateAudio(),start=beginAudioControl(initial,'play');
 for(const state of [beginAudioControl(start.state,'pause').state,beginAudioControl(start.state,'seek').state,retirePrivateAudio(start.state)]){
  assert.equal(finishAudioPlay(state,start.id).accepted,false);assert.equal(audioControlCurrent(state,start.id),false);assert.equal(state.running,false);
 }
 assert.equal(initial.controlId,0);assert.equal(finishAudioPlay(start.state,start.id).state.running,true);
});
test('context recovery resumes only retained running intent and user pause clears that intent',()=>{
 const suspended=observeAudioContext(playing(),false,false);assert.equal(suspended.pauseVideo,true);assert.equal(suspended.state.resumeAfterContext,true);
 const observed=observeAudioContext(suspended.state,true,true),resumed=acknowledgeAudioContext(observed.state,observed.id);assert.equal(resumed.playVideo,true);assert.equal(resumed.state.resumeAfterContext,false);
 const paused=beginAudioControl(observed.state,'pause').state;assert.equal(acknowledgeAudioContext(paused,observed.id).playVideo,false);
 assert.equal(observeAudioContext(playing(),false,true).pauseVideo,false);
});
test('only the current active context observation can consume retained resume intent',()=>{
 const suspended=observeAudioContext(playing(),false,false),active=observeAudioContext(suspended.state,true,true),again=observeAudioContext(active.state,false,true);
 assert.equal(acknowledgeAudioContext(again.state,active.id).playVideo,false);assert.equal(acknowledgeAudioContext(again.state,again.id).playVideo,false);
 assert.equal(again.state.resumeAfterContext,true);const latest=observeAudioContext(again.state,true,true),resumed=acknowledgeAudioContext(latest.state,latest.id);
 assert.equal(resumed.playVideo,true);assert.equal(acknowledgeAudioContext(resumed.state,latest.id).playVideo,false);
 assert.equal(acknowledgeAudioContext(retirePrivateAudio(latest.state),latest.id).playVideo,false);assert.equal(suspended.state.contextActive,false);
});
test('EOF jobs admit once, retire before seek effects, and stale cleanup cannot clear a newer job',()=>{
 const first=beginAudioEOF(playing(),true);assert.notEqual(first.id,null);assert.equal(beginAudioEOF(first.state,true).id,null);
 const seek=beginAudioControl(first.state,'seek');assert.equal(seek.wasRunning,true);assert.equal(audioEOFCurrent(seek.state,first.id),false);
 const next=beginAudioEOF(seek.state,true);assert.notEqual(next.id,first.id);assert.equal(finishAudioEOF(next.state,first.id),next.state);assert.equal(finishAudioEOF(next.state,next.id).eofTask,null);
});
test('drift noise does not write rate; sustained pressure and recovery use three samples and bounded trim',()=>{
 let state=playing(),rate=1,writes=[];
 const observe=error=>{const result=observeAudioClock(state,sample(error,rate));state=result.state;if(result.rate!==null){rate=result.rate;writes.push(rate);}};
 for(const error of [-20,20,-10,10])observe(error);assert.deepEqual(writes,[]);
 observe(60);observe(60);assert.deepEqual(writes,[]);observe(60);assert.deepEqual(writes,[1.005]);
 for(let i=0;i<10;i++)observe(60);assert.equal(writes.length,1);
 observe(20);observe(20);observe(20);assert.equal(rate,1);assert.equal(state.trim,false);assert.equal(state.rateWrites,writes.length);
 const reset=resetAudioClock(state,1.005);assert.equal(reset.rate,1);assert.equal(reset.state.rateWrites,state.rateWrites);
});
test('watchdog requires eight active visible samples and histories retain only 1200 finite errors',()=>{
 let state=playing();for(let i=0;i<7;i++){const observed=observeAudioClock(state,sample(300));assert.equal(observed.failure,false);state=observed.state;}
 assert.equal(observeAudioClock(state,sample(300)).failure,true);assert.equal(observeAudioClock(state,{...sample(300),hidden:true}).state.badClock,0);
 const disabled=privateAudioSettings(state,{watchAudio:false});assert.equal(disabled.badClock,0);assert.equal(observeAudioClock(disabled,sample(NaN)).failure,false);
 state=playing();for(let i=0;i<1250;i++)state=observeAudioClock(state,sample(i%20)).state;assert.equal(state.errors.length,1200);assert.equal(Object.isFrozen(state.errors),true);
 assert.equal(observeAudioClock(state,{...sample(999),videoPaused:true}).state,state);
});
test('audio readiness distinguishes presentation clock, epoch acknowledgment, verified ownership and drained tail',()=>{
 const status={time:1.9,eof:false,produced:1024,consumed:512,epoch:4,ack:true,nativeEpoch:4,ackEpoch:4,feedbackCount:1,chains:1};
 assert.equal(privateAudioReady(status,{kind:'play',target:2}),false);assert.equal(privateAudioReady({...status,time:2},{kind:'play',target:2}),true);
 assert.equal(privateAudioReady({...status,eof:true,consumed:1024},{kind:'play',target:20}),true);assert.equal(privateAudioReady({...status,consumed:0},{kind:'verify'}),false);
 assert.equal(privateAudioReady({...status,chains:3},{kind:'verify'}),false);assert.equal(privateAudioReady(status,{kind:'verify'}),true);
 assert.equal(privateAudioReady(status,{kind:'epoch',previous:2}),true);assert.equal(privateAudioReady({...status,ackEpoch:2},{kind:'epoch',previous:2}),false);
 const deadline=privateAudioDeadline(5,10);assert.equal(privateAudioDeadlineOpen(deadline,14),true);assert.equal(privateAudioDeadlineOpen(deadline,15),false);
});
test('poll admission and settings are independent of retired physical requests',()=>{
 const initial=createPrivateAudio();assert.equal(selectPrivateAudioStream(initial,undefined).accepted,false);assert.equal(selectPrivateAudioStream(initial,7).state.streamIndex,7);
 const active=beginAudioPoll(initial,true);assert.equal(active.accepted,true);assert.equal(beginAudioPoll(active.state,true).accepted,false);assert.equal(beginAudioPoll(initial,false).accepted,false);
 const settings=privateAudioSettings(active.state,{volume:25,gain:.5,rate:2});assert.equal(settings.volume*settings.gain/100,.125);assert.equal(finishAudioPoll(settings).polling,false);assert.equal(initial.rate,1);
});
test('varied audio intent histories replay deterministically and preserve current operation identity',()=>{
 const actions=['play','pause','seek','play','pause','play','seek'];
 const run=seed=>{let state=createPrivateAudio(),expected=false;const history=[];for(let i=0;i<80;i++){
  const action=actions[(i*seed+i*i)%actions.length],control=beginAudioControl(state,action);state=control.state;
  if(action==='play'){if(control.id!==null)state=finishAudioPlay(state,control.id).state;expected=true;}else if(action==='pause')expected=false;else{expected=control.wasRunning;if(expected){const resumed=beginAudioControl(state,'play');state=finishAudioPlay(resumed.state,resumed.id).state;}}
  assert.equal(state.running,expected);history.push(state);
 }return history;};for(let seed=1;seed<10;seed++)assert.deepEqual(run(seed),run(seed));
});

function replace(t,name,value){const old=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});t.after(()=>old?Object.defineProperty(globalThis,name,old):delete globalThis[name]);}
function fixture(t){
 let worker,epoch=2;const errors=[],video=Object.assign(new EventTarget(),{currentTime:2,paused:true,playbackRate:1,seeking:false,pause(){this.paused=true;},async play(){this.paused=false;}});
 replace(t,'location',new URL('http://localhost/'));replace(t,'document',{hidden:false});
 replace(t,'Worker',class{constructor(){worker=this;this.messages=[];}terminate(){}postMessage(data){this.messages.push(data);if(this.hold?.(data))return;if(data.op==='seek')epoch+=2;this.reply(data.id,data.op==='status'?{time:video.currentTime,eof:false,epoch,ack:true,header:[1024,512,0,epoch,0,0,0,epoch],feedbackCount:1,chains:1}:true);}reply(id,result){this.onmessage({data:{id,result}});}});
 const owner=new NativePrivateMpvAudio(video,()=>video.currentTime,new URL('http://localhost/'),'asyncify',error=>errors.push(error));
 const context=owner.context={state:'running',baseLatency:0,outputLatency:0,resumes:0,suspends:0,async resume(){this.resumes++;},async suspend(){this.suspends++;},async close(){this.state='closed';},removeEventListener(){}};
 return {owner,worker,video,context,errors};
}
test('real audio play invokes resume synchronously and cannot start video after a superseding pause',async t=>{
 const f=fixture(t);let resume,started=false;f.context.resume=()=>{f.context.resumes++;return new Promise(resolve=>resume=resolve);};
 const playing=f.owner.play(async()=>{started=true;}),rejected=assert.rejects(playing,error=>error.code==='ABORTED');assert.equal(f.context.resumes,1);
 await f.owner.pause(()=>f.video.pause());resume();await rejected;assert.equal(started,false);assert.equal(f.owner.running,false);assert.equal(f.worker.messages.some(message=>message.op==='pause'&&message.value===false),false);await f.owner.destroy();
});
test('a real delayed pause reply cannot stop or reset a newer successful play',async t=>{
 const f=fixture(t);let held,stops=0;f.worker.hold=data=>{if(data.op==='pause'&&data.value===true&&!held){held=data.id;return true;}};
 const pausing=f.owner.pause(()=>stops++),rejected=assert.rejects(pausing,error=>error.code==='ABORTED');await f.owner.play(()=>f.video.play());
 f.worker.reply(held,true);await rejected;assert.equal(stops,0);assert.equal(f.owner.running,true);assert.equal(f.video.paused,false);await f.owner.destroy();
});
test('a real rate request superseded during pause cannot issue speed commands or overwrite rate',async t=>{
 const f=fixture(t);let held;f.worker.hold=data=>{if(data.op==='pause'&&data.value===true&&!held){held=data.id;return true;}};
 const changing=f.owner.rate(2),rejected=assert.rejects(changing,error=>error.code==='ABORTED');await f.owner.seek(0,async()=>{f.video.currentTime=0;});f.worker.reply(held,true);await rejected;
 assert.equal(f.owner.rateValue,1);assert.equal(f.worker.messages.some(message=>message.op==='speed'),false);assert.equal(f.owner.running,false);await f.owner.destroy();
});
test('real adapter stays in expected play state through repeated pause/play/seek histories',async t=>{
 const f=fixture(t);let expected=false;
 for(const action of ['pause','play','play','seek','pause','pause','seek','play','seek','pause']){
  if(action==='play'){await f.owner.play(()=>f.video.play());expected=true;}
  else if(action==='pause'){await f.owner.pause(()=>f.video.pause());expected=false;}
  else await f.owner.seek(1,async()=>{f.video.currentTime=1;});
  assert.equal(f.owner.running,expected);assert.equal(f.video.paused,!expected);
 }
 assert.deepEqual(f.errors,[]);await f.owner.destroy();
});
test('real context replies cannot resume video after a newer suspension observation',async t=>{
 const f=fixture(t);await f.owner.play(()=>f.video.play());let resumes=0;const play=f.video.play.bind(f.video);f.video.play=async()=>{resumes++;await play();};
 const held=[];f.worker.hold=data=>{if(data.op==='context'){held.push(data);return true;}};
 for(const state of ['suspended','running','suspended']){f.context.state=state;f.owner.contextChanged();}
 for(let i=0;i<3;i++){await new Promise(resolve=>setImmediate(resolve));assert.equal(held.length,i+1);f.worker.reply(held[i].id,true);}
 await f.owner.contextTransition;await f.owner.destroy();
 assert.deepEqual(held.map(message=>message.value),[false,true,false]);assert.equal(resumes,0);assert.equal(f.video.paused,true);
});
