// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/native-backend.js';
import {NativePlayer} from '../../web/generated/internal/native-player.js';
const audio={decodedBytes:undefined,present:undefined,tracksPresent:false,enabledTrack:false};
const sample={now:50,readyState:4,videoWidth:640,time:0,frames:0,decodedFrames:undefined,seeking:false,paused:true,ended:false,audio};
function model(initial=core.initialNativeBackend()){
 let state=initial;const history=[];
 return {get state(){return state;},send(command){const before=structuredClone(state),old=state,result=core.transitionNativeBackend(state,command);assert.deepEqual(old,before);state=result.state;history.push(structuredClone(command));assert.ok(Object.isFrozen(state));return result;},verify(options={}){const request=this.send({type:'verify.begin',output:!!options.output,budget:options.budget??10000,expected:options.expected??{video:true,audio:false}}).request;this.send({type:'verify.start',request,now:20,time:0,frames:0,audioBytes:undefined,videoWidth:640,selectiveAudio:false,metadataPreparation:false,timelineBias:0,...options});return request;},replay(){assert.deepEqual(history.reduce((value,command)=>core.transitionNativeBackend(value,command).state,initial),state);}};
}
test('paused native preparation records readiness without claiming executed output',()=>{
 const m=model(),request=m.verify();assert.equal(m.send({type:'verify.sample',request,facts:sample}).completed,true);assert.equal(m.state.capability.prepared,true);assert.equal(m.state.capability.videoPresented,undefined);assert.equal(m.state.capability.outputVerified,undefined);assert.equal(m.state.verification.phase,'complete');assert.equal(m.send({type:'verify.sample',request,facts:{...sample,frames:1}}).accepted,false);m.replay();
});
test('native metadata preload differs from current-data preparation and still requires declared video dimensions',()=>{
 for(const [metadataPreparation,videoWidth,completed] of [[true,640,true],[false,640,false],[true,0,false]]){const m=model(),request=m.verify({metadataPreparation});assert.equal(!!m.send({type:'verify.sample',request,facts:{...sample,readyState:1,videoWidth}}).completed,completed);}
});
test('native output requires advancing clock, actual frame and declared audio evidence',()=>{
 for(const facts of [{...sample,frames:1,audio:{...audio,decodedBytes:4}},{...sample,time:.1,paused:false,audio:{...audio,decodedBytes:4}},{...sample,time:.1,paused:false,frames:1}]){const m=model(),request=m.verify({output:true,expected:{video:true,audio:true}});assert.equal(m.send({type:'verify.sample',request,facts}).completed,undefined);}
 const m=model(),request=m.verify({output:true,expected:{video:true,audio:true}});
 assert.equal(m.send({type:'verify.sample',request,facts:{...sample,time:.1,paused:false,frames:1,audio:{...audio,decodedBytes:4}}}).completed,true);assert.equal(m.state.capability.audioEvidenceStrength,'decoded');assert.equal(m.state.capability.outputVerified,true);assert.equal(m.state.capability.timing.outputAccepted,50);m.replay();
});
test('audio evidence keeps numeric counters ahead of presence and never upgrades presence to decoding',()=>{
 assert.deepEqual(core.nativeAudioEvidence({...audio,decodedBytes:0,present:true},true),{adapter:'decoded-byte-counter',ready:false,strength:'unknown'});
 assert.deepEqual(core.nativeAudioEvidence({...audio,present:true},true),{adapter:'browser-audio-presence-and-clock',ready:true,strength:'presence'});
 assert.deepEqual(core.nativeAudioEvidence({...audio,tracksPresent:true,enabledTrack:true},true),{adapter:'enabled-browser-audio-track-and-clock',ready:true,strength:'presence'});
 assert.equal(core.nativeAudioEvidence({...audio,tracksPresent:true,enabledTrack:true},false).ready,false);assert.equal(core.nativeAudioEvidence(audio,true).ready,false);
});
test('explicit absent selected audio fails preparation without recording prepared evidence',()=>{const m=model(),request=m.verify({expected:{video:true,audio:true}});assert.equal(m.send({type:'verify.sample',request,facts:{...sample,audio:{...audio,present:false}}}).failure,'missing-audio');assert.equal(m.state.capability.prepared,undefined);});
test('verification deadline starts after preflight; early timers reschedule and short trials stay inconclusive',()=>{
 for(const budget of [1500,10000]){const m=model(),request=m.send({type:'verify.begin',output:true,budget,expected:{video:true,audio:true}}).request;assert.equal(m.send({type:'verify.deadline',request,now:40000,readyState:4,videoWidth:640,audioBytes:0}).accepted,false);m.send({type:'verify.start',request,now:50000,time:0,frames:0,audioBytes:0,videoWidth:640,selectiveAudio:false,metadataPreparation:false,timelineBias:0});assert.equal(m.send({type:'verify.deadline',request,now:50001,readyState:4,videoWidth:640,audioBytes:0}).remaining,budget-1);assert.equal(m.send({type:'verify.deadline',request,now:50000+budget,readyState:4,videoWidth:640,audioBytes:0}).failure,budget<10000?'verification-timeout':'missing-output');m.replay();}
});
test('already verified EOF and shorter-track tails preserve completion versus fresh output evidence',()=>{
 const initial={...core.initialNativeBackend(),capability:{outputVerified:true}},eof=model(initial),eofRequest=eof.verify({output:true});assert.equal(eof.send({type:'verify.sample',request:eofRequest,facts:{...sample,readyState:2,ended:true}}).completed,true);assert.equal(eof.state.capability.completedAtEOF,true);assert.equal(eof.state.capability.videoPresented,false);
 const tail=model(initial),request=tail.verify({output:true,expected:{video:true,audio:true},time:5.1,videoEnd:5,audioEnd:12});assert.equal(tail.state.verification.active.video,false);assert.equal(tail.send({type:'verify.sample',request,facts:{...sample,time:5.2,paused:false,audio:{...audio,decodedBytes:4}}}).completed,true);assert.equal(tail.state.capability.videoPresented,false);
 const fresh=model(),freshRequest=fresh.verify({output:true});assert.equal(fresh.send({type:'verify.sample',request:freshRequest,facts:{...sample,ended:true}}).completed,undefined);
});
test('selective audio has a separate owned completion after browser video evidence',()=>{
 const m=model(),request=m.verify({output:true,selectiveAudio:true,expected:{video:true,audio:true}});assert.equal(m.send({type:'verify.sample',request,facts:{...sample,time:.1,paused:false,frames:1}}).completed,true);assert.equal(m.state.verification.phase,'audio');assert.equal(m.send({type:'verify.sample',request,facts:sample}).accepted,false);m.send({type:'verify.audio',request});assert.equal(m.state.capability.audioEvidenceStrength,'consumed');assert.equal(m.state.capability.audioProgress,true);m.replay();
});
test('retired verifier errors and observations cannot clear a successor output claim',()=>{
 const m=model(),old=m.verify({output:true}),next=m.verify({output:true});m.send({type:'verify.sample',request:next,facts:{...sample,time:.1,paused:false,frames:1}});for(const command of [{type:'verify.finish',failed:true},{type:'verify.presented'},{type:'verify.classify'},{type:'verify.audio'}])assert.equal(m.send({...command,request:old}).accepted,false);assert.equal(m.state.capability.outputVerified,true);m.replay();
});
test('native command domains reject a current request belonging to the other domain',()=>{
 const m=model(),verification=m.verify({output:true}),seek=m.send({type:'seek.begin',target:2,mediaTarget:3,correlated:true,now:0}).request;
 const before=m.state;
 for(const command of [{type:'verify.finish',request:seek,failed:true},{type:'verify.presented',request:seek},{type:'seek.finish',request:verification},{type:'seek.completed',request:verification}])assert.equal(m.send(command).accepted,false);
 assert.equal(m.state,before);m.replay();
});
for(const event of ['source','stop'])test('native '+event+' retires verifier and seek before shell cleanup',()=>{
 const m=model(),verification=m.verify({output:true}),seek=m.send({type:'seek.begin',target:2,mediaTarget:3,correlated:true,now:0}).request;m.send({type:event});assert.equal(core.nativeRequestCurrent(m.state,verification),false);assert.equal(core.nativeRequestCurrent(m.state,seek),false);assert.equal(m.send({type:'seek.completed',request:seek}).accepted,false);assert.equal(m.send({type:'verify.finish',request:verification,failed:true}).accepted,false);assert.equal(m.state.verification,null);assert.equal(m.state.seek,null);m.replay();
});
test('native seek joins correlated frame, seeked and action completion in any delivery order',()=>{
 for(const order of [['frame','seeked','completed'],['completed','frame','seeked'],['completed','seeked','frame']]){const m=model(),request=m.send({type:'seek.begin',target:2,mediaTarget:3,correlated:true,now:0}).request;let done=false;for(const item of order){const result=item==='frame'?m.send({type:'seek.frame',request,facts:{position:3,seeking:!order.slice(0,order.indexOf(item)).includes('seeked')},mediaTime:3,matches:true}):item==='seeked'?m.send({type:'seek.seeked',request,facts:{position:3,seeking:false},now:20}):m.send({type:'seek.completed',request});done||=!!result.completed;}assert.equal(done,true);assert.equal(m.state.seek.accepted,true);assert.equal(m.state.seek.completed,true);m.replay();}
});
test('native seek currentTime and seeked alone cannot supply correlated frame evidence',()=>{
 const m=model(),request=m.send({type:'seek.begin',target:2,mediaTarget:3,correlated:true,now:0}).request;m.send({type:'seek.completed',request});assert.equal(m.send({type:'seek.seeked',request,facts:{position:3,seeking:false},now:20}).completed,undefined);assert.equal(m.send({type:'seek.frame',request,facts:{position:3,seeking:false},mediaTime:1,matches:false}).completed,false);assert.equal(m.state.seek.accepted,false);assert.equal(m.send({type:'seek.deadline',request,now:9999}).remaining,1);assert.equal(m.send({type:'seek.deadline',request,now:10000}).failure,'seek-timeout');
});
test('native paused buffered seek retries once at 100ms and commits before physical seek effects',()=>{
 const m=model(),request=m.send({type:'seek.begin',target:2,mediaTarget:3,correlated:true,now:0}).request;m.send({type:'seek.seeked',request,facts:{position:3,seeking:false},now:50});assert.equal(m.send({type:'seek.retry',request,facts:{position:3,seeking:false},now:149,paused:true,buffered:true}).remaining,1);assert.equal(m.send({type:'seek.retry',request,facts:{position:3,seeking:false},now:150,paused:true,buffered:true}).retry,true);assert.equal(m.state.seekPresentationRetries,1);assert.equal(m.send({type:'seek.seeked',request,facts:{position:3,seeking:false},now:200}).remaining,undefined);assert.equal(m.send({type:'seek.retry',request,facts:{position:3,seeking:false},now:250,paused:true,buffered:true}).accepted,false);m.replay();
});
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const flush=async()=>{for(let i=0;i<6;i++)await Promise.resolve();};
function candidate(t,overrides={}){
 let now=0,serial=0;const callbacks=new Map(),cancelled=[],video=new EventTarget();
 t.mock.method(performance,'now',()=>now);t.mock.timers.enable({apis:['setTimeout','setInterval']});
 Object.assign(video,{readyState:4,videoWidth:640,currentTime:0,paused:true,seeking:false,ended:false,error:null,frames:0,getVideoPlaybackQuality(){return {totalVideoFrames:this.frames};},requestVideoFrameCallback(callback){callbacks.set(++serial,callback);return serial;},cancelVideoFrameCallback(id){cancelled.push(id);callbacks.delete(id);},...overrides});
 const player=Object.assign(Object.create(NativePlayer.prototype),{native:core.initialNativeBackend(),video,cancelers:new Set(),controlWait:new Map()});
 return {player,video,callbacks,cancelled,tick(ms){now+=ms;t.mock.timers.tick(ms);},frame(mediaTime=video.currentTime){const [id,callback]=callbacks.entries().next().value;callbacks.delete(id);callback(now,{mediaTime});}};
}
test('actual native verifier retires blocked subtitle preflight promptly and ignores its late completion',async t=>{
 const f=candidate(t),hold=deferred();let samples=0;f.player.mpvSubs={verify(){return ++samples===1?hold.promise:Promise.resolve();}};
 const old=f.player.verifyStartup({video:true,audio:false}),rejected=assert.rejects(old,/retired/);await flush();
 await f.player.verifyStartup({video:true,audio:false});await rejected;assert.equal(f.player.capability.prepared,true);hold.resolve();await flush();assert.equal(f.player.cancelers.size,0);assert.equal(f.player.native.verification,null);
});
test('actual old selective-audio rejection cannot clear successfully verified successor output',async t=>{
 const f=candidate(t,{paused:false}),hold=deferred();let calls=0;f.player.mpvAudio={verifyOutput(){return ++calls===1?hold.promise:Promise.resolve();}};
 const old=f.player.verifyOutput(),rejected=assert.rejects(old,/retired/);await flush();f.video.currentTime=.1;f.video.frames=1;f.frame();await flush();assert.equal(calls,1);
 const next=f.player.verifyOutput();await flush();f.video.currentTime=.2;f.video.frames=2;f.frame();await next;await rejected;assert.equal(f.player.capability.outputVerified,true);hold.reject(Error('obsolete audio failure'));await flush();assert.equal(f.player.capability.outputVerified,true);assert.equal(f.player.capability.audioEvidenceStrength,'consumed');assert.equal(f.player.cancelers.size,0);
});
test('actual source retirement during browser fact capture rejects before committing stale evidence',async t=>{
 const f=candidate(t);const pending=f.player.verifyOutput(),rejected=assert.rejects(pending,/retired/);await flush();
 f.video.getVideoPlaybackQuality=()=>{f.player.retireNativeSource();return {totalVideoFrames:1};};f.video.currentTime=.1;f.video.paused=false;f.tick(25);await rejected;assert.deepEqual(f.player.capability,{});assert.equal(f.player.cancelers.size,0);assert.equal(f.callbacks.size,0);
});
test('actual frame registration acquired after verification cancellation is cancelled exactly once',async t=>{
 const f=candidate(t);f.video.requestVideoFrameCallback=callback=>{f.callbacks.set(9,callback);f.player.verificationCancel.cancel(Error('cancelled during acquisition'));return 9;};
 await assert.rejects(f.player.verifyOutput(),/cancelled during acquisition/);assert.deepEqual(f.cancelled,[9]);assert.equal(f.callbacks.size,0);assert.equal(f.player.cancelers.size,0);
});
test('actual seek cancellation before its queued action prevents any physical seek',async t=>{
 const f=candidate(t);f.player.remux={generation:1,timelineBias:1,expectedVideoFrame:()=>2};let actions=0;
 const pending=f.player.seekPresented(2,async()=>{actions++;}),rejected=assert.rejects(pending,/cancelled/);f.player.seekCancel.cancel(Error('cancelled'));await rejected;await flush();assert.equal(actions,0);assert.equal(f.callbacks.size,0);assert.equal(f.player.cancelers.size,0);
});
test('actual seek commits retry before cancellation callback reentry can retire its source',async t=>{
 const f=candidate(t,{currentTime:3}),writes=[];f.player.remux={generation:1,timelineBias:1,expectedVideoFrame:()=>2,canSeekBuffered:()=>true};
 Object.defineProperty(f.video,'currentTime',{get:()=>3,set:value=>writes.push(value)});
 const pending=f.player.seekPresented(2,async()=>{}),rejected=assert.rejects(pending,/retired/);await flush();f.video.dispatchEvent(new Event('seeked'));
 f.video.cancelVideoFrameCallback=id=>{f.cancelled.push(id);f.callbacks.delete(id);f.player.remux={...f.player.remux,generation:2};};
 f.tick(100);await rejected;assert.equal(f.player.seekPresentationRetries,1);assert.deepEqual(writes,[]);assert.equal(f.callbacks.size,0);
});
test('actual seek matches getter retirement before accepting the callback or arming a successor',async t=>{
 const f=candidate(t,{currentTime:3}),remux={generation:1,timelineBias:1,expectedVideoFrame:()=>2};f.player.remux=remux;
 remux.matchesVideoFrame=()=>{f.player.remux={...remux,generation:2};return true;};const pending=f.player.seekPresented(2,async()=>{}),rejected=assert.rejects(pending,/retired/);await flush();f.frame(3);await rejected;assert.equal(f.callbacks.size,0);assert.equal(f.player.cancelers.size,0);
});
test('actual buffered seek pause reentry cannot redirect the seek into a replacement remux',async t=>{
 const f=candidate(t,{currentTime:3,paused:false}),calls=[];
 f.player.remux={timelineBias:1,playbackPaused:false,expectedVideoFrame:value=>value,canSeekBuffered:()=>true,pause(){f.player.remux={seek:async()=>calls.push('replacement')};},seek:async()=>calls.push('original')};
 await assert.rejects(f.player.seekVideo(5),/retired/);assert.deepEqual(calls,[]);
});
test('actual old remux seek completion cannot resume a replacement source',async t=>{
 const f=candidate(t,{currentTime:3,paused:false}),hold=deferred(),calls=[];
 f.player.remux={timelineBias:1,playbackPaused:false,canSeekBuffered:()=>false,seek:()=>hold.promise,play:async()=>calls.push('old play')};
 const pending=f.player.seekVideo(5),rejected=assert.rejects(pending,/retired/);f.player.remux={play:async()=>calls.push('replacement play')};hold.resolve();await rejected;assert.deepEqual(calls,[]);
});
test('actual old native load completion cannot mark replacement metadata ready',async t=>{
 const f=candidate(t),hold=deferred();f.player.wait=()=>hold.promise;
 const pending=f.player.load('https://media.test/old.mp4'),rejected=assert.rejects(pending,/retired/);f.player.retireNativeSource();hold.resolve();await rejected;assert.deepEqual(f.player.capability,{});
});
