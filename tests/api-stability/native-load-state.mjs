// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/native-load.js';
const policy={requested:false,original:false,remux:'auto',requiresRemux:false,adaptation:undefined};
const request={id:1,epoch:1,kind:'load'};
function model(kind='source',settings=policy){let state=core.beginNativeLoad(core.initialNativeLoad(),request,kind,settings,12,false);return{get state(){return state;},send(event,owner=request){const before=structuredClone(state),old=state,result=core.transitionNativeLoad(state,owner,event);assert.deepEqual(old,before);state=result.state;assert.ok(Object.isFrozen(state));return result;}};}
test('Native load route preserves explicit original/remux and permission precedence',()=>{
 for(const [options,expected] of [[{},'direct'],[{requested:true,original:true,remux:'always'},'direct'],[{requested:true,original:false,remux:'never'},'remux'],[{remux:'always'},'remux'],[{requiresRemux:true},'remux'],[{remux:'never'},'direct']])assert.equal(core.selectNativeLoadRoute({...policy,...options}).route,expected);
 assert.match(core.selectNativeLoadRoute({...policy,remux:'never',requiresRemux:true}).error,/cannot enforce/);
});
test('Native preparation policy preserves FLAC24 exclusions and selected MP4 eligibility',()=>{
 const facts={codecEngine:false,file:true,adaptation:'flac24',selectiveAudio:false,embeddedSubtitles:false,externalSubtitles:false,prepareAudio:true};
 assert.deepEqual(core.selectNativePreparation(facts),{audio:true,mp4:false});
 for(const change of [{codecEngine:true},{file:false},{selectiveAudio:true},{embeddedSubtitles:true},{externalSubtitles:true},{prepareAudio:false},{adaptation:'opus'}])assert.equal(core.selectNativePreparation({...facts,...change}).audio,false);
 assert.deepEqual(core.selectNativePreparation({...facts,adaptation:undefined}),{audio:false,mp4:true});
});
test('Native direct failure permits fallback only for auto route and media errors3/4',()=>{
 for(const [options,code,fallback] of [[{},3,true],[{},4,true],[{},2,false],[{requested:true},3,false],[{remux:'never'},4,false]]){const m=model('source',{...policy,...options});assert.equal(m.send({type:'direct-failed',code,reason:'failed'}).fallback,fallback);assert.equal(m.state.directFailure,fallback?'failed':undefined);}
});
test('Native adaptation fallback is exact, automatic and attempted once',()=>{
 const m=model('source',{...policy,adaptation:'opus'});assert.equal(m.send({type:'attempt-failed',reason:'Audio codec has no browser MP4 packet contract'}).fallback,true);assert.equal(m.send({type:'attempt-failed',reason:'transport failed'}).fallback,false);m.send({type:'attempt',adapted:true});assert.equal(m.state.adapted,true);assert.equal(m.send({type:'attempt-failed',reason:'Audio codec has no browser MP4 packet contract'}).fallback,false);
 const explicit=model('source',{...policy,requested:true,adaptation:'opus'});assert.equal(explicit.send({type:'attempt-failed',reason:'Audio codec has no browser MP4 packet contract'}).fallback,false);
});
test('Native track rollback and resume are admitted only to the owning transaction',()=>{
 const m=model('audio-track');assert.equal(core.nativeLoadOpening(m.state),true);assert.deepEqual(m.send({type:'track-failed'}).position,12);assert.equal(m.state.work.phase,'rollback');assert.equal(m.send({type:'track-failed'}).rollback,false);assert.equal(m.send({type:'track-settled'}).resume,true);assert.equal(core.nativeLoadOpening(m.state),false);assert.equal(m.send({type:'track-settled'}).accepted,false);
 const next={id:2,epoch:1,kind:'load'},state=core.beginNativeLoad(m.state,next,'audio-track',policy,20,true);for(const event of [{type:'finish'},{type:'track-failed'},{type:'track-settled'},{type:'attempt',adapted:false}]){const stale=core.transitionNativeLoad(state,request,event);assert.equal(stale.accepted,false);assert.equal(stale.state,state);}assert.equal(core.transitionNativeLoad(state,next,{type:'track-settled'}).resume,false);
});
test('Native services clear opening while retaining the load lease until final completion',()=>{
 const m=model();m.send({type:'services'});assert.equal(core.nativeLoadOpening(m.state),false);assert.equal(core.nativeLoadCurrent(m.state,request),true);m.send({type:'finish'});assert.equal(core.nativeLoadCurrent(m.state,request),false);assert.equal(m.send({type:'services'}).accepted,false);
});
test('Native load state detaches request and policy inputs and retirement never resurrects old work',()=>{
 const input={...request},settings={...policy},state=core.beginNativeLoad(core.initialNativeLoad(),input,'source',settings,0,true);input.id=100;settings.remux='never';assert.equal(state.work.request.id,1);assert.equal(state.work.policy.remux,'auto');const retired=core.retireNativeLoad(state);assert.equal(core.nativeLoadOpening(retired),false);assert.equal(core.transitionNativeLoad(retired,request,{type:'attempt',adapted:true}).accepted,false);
});

import * as backend from '../../web/generated/internal/machine/native-backend.js';
import {NativePlayer} from '../../web/generated/internal/native-player.js';
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
function candidate(t){
 const calls=[],urls=[],revoked=[],video=new EventTarget();let serial=0;
 Object.assign(video,{paused:true,currentTime:0,muted:false,textTracks:[],buffered:{length:0},seekable:{length:0},duration:10,volume:1,playbackRate:1,seeking:false,readyState:4,videoWidth:640,getVideoPlaybackQuality:()=>({totalVideoFrames:0}),pause(){calls.push('pause');},play(){calls.push('play');return Promise.resolve();},removeAttribute(){calls.push('remove-src');},replaceChildren(){calls.push('remove-tracks');},load(){calls.push('load');}});
 t.mock.method(URL,'createObjectURL',()=>{const url='blob:test-'+(++serial);urls.push(url);return url;});t.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));
 const player=Object.assign(Object.create(NativePlayer.prototype),{native:backend.initialNativeBackend(),video,remuxPolicy:'auto',buffering:{preload:'auto'},assetBase:new URL('../../',import.meta.url),cancelers:new Set(),listeners:[],ownedObjectURLs:new Map(),sourceCleanup:Promise.resolve(),captionURLs:new Set(),captionAssets:new Map(),textAttachmentIds:new WeakMap(),shiftedCues:new WeakSet(),properties:new Map(),emit:(type,detail)=>calls.push([type,detail]),requestedVolume:100,requestedRate:1,gainValue:1,refresh(){}});
 return {player,video,calls,urls,revoked,file:new File(['data'],'source.mp4')};
}
test('composed Native load uses one epoch and serial with verifier/seek domains fenced',()=>{
 let state=backend.initialNativeBackend();const send=command=>{const result=backend.transitionNativeBackend(state,command);state=result.state;return result;};
 const first=send({type:'load.begin',kind:'source',policy,position:0,paused:true}).request,verify=send({type:'verify.begin',output:false,budget:10000}).request;
 assert.equal(first.epoch,verify.epoch);assert.equal(backend.nativeRequestCurrent(state,first),true);
 const track=send({type:'load.begin',kind:'audio-track',policy,position:5,paused:false}).request;assert.equal(track.epoch,first.epoch);assert.equal(backend.nativeRequestCurrent(state,verify),false);assert.equal(backend.nativeRequestCurrent(state,first),false);
 const before=state;assert.equal(send({type:'load.event',request:verify,event:{type:'finish'}}).accepted,false);assert.equal(state,before);
 const replacement=send({type:'load.begin',kind:'source',policy,position:0,paused:true}).request;assert.equal(replacement.epoch,first.epoch+1);assert.equal(send({type:'load.event',request:track,event:{type:'track-settled'}}).accepted,false);
});
test('actual retired open catch and finally preserve successor URL and opening state',async t=>{
 const f=candidate(t),old=deferred(),next=deferred();let loads=0;f.player.loadPlan=()=>++loads===1?old.promise:next.promise;
 const first=f.player.open(f.file),rejected=assert.rejects(first,/retired/);await flush();const second=f.player.open(f.file);await flush();await rejected;
 assert.equal(f.player.opening,true);assert.equal(f.player.objectURL,'blob:test-2');assert.deepEqual(f.revoked,['blob:test-1']);old.reject(Error('late old load'));await flush();assert.equal(f.player.opening,true);assert.equal(f.player.objectURL,'blob:test-2');
 next.resolve();await second;assert.equal(f.player.opening,false);assert.equal(f.player.native.load.work,null);assert.equal(f.player.cancelers.size,0);assert.deepEqual(f.revoked,['blob:test-1']);
});
test('actual replacement waits for detached remux cleanup before acquiring a new source',async t=>{
 const f=candidate(t),cleanup=deferred();f.player.remux={destroy(){f.calls.push('destroy-remux');return cleanup.promise;}};f.player.loadPlan=async()=>f.calls.push('new-plan');
 const opening=f.player.open(f.file);await flush();assert.equal(f.player.remux,undefined);assert.deepEqual(f.urls,[]);assert.deepEqual(f.calls,['destroy-remux']);cleanup.resolve();await opening;assert.equal(f.urls.length,1);assert.deepEqual(f.calls,['destroy-remux','new-plan']);
});
test('actual source cleanup reentry preserves replacement ownership and serializes physical cleanup',async t=>{
 const f=candidate(t),cleanup=deferred();let successor;f.player.loadPlan=async()=>f.calls.push('plan');
 f.player.remux={destroy(){successor=f.player.open(f.file);return cleanup.promise;}};
 const original=f.player.open(f.file),rejected=assert.rejects(original,/retired/);await flush();await rejected;assert.deepEqual(f.urls,[]);cleanup.resolve();await successor;assert.deepEqual(f.urls,['blob:test-1']);assert.equal(f.player.objectURL,'blob:test-1');assert.deepEqual(f.calls,['plan']);
});
test('actual retired preparation result cannot allocate URL or publish into replacement',async t=>{
 const f=candidate(t),prepared=deferred();f.player.audioAdaptation='flac24';f.player.providerRuntime={prepareAudio:()=>prepared.promise};
 const opening=f.player.withLoad('source',{...policy,adaptation:'flac24'},0,true,request=>f.player.startRemux({file:f.file},0,request)),rejected=assert.rejects(opening,/retired/);await flush();
 f.player.loadPlan=async()=>{};await f.player.open(f.file);await rejected;prepared.resolve({file:new Blob(['prepared']),tracks:[],diagnostics:{}});await flush();assert.deepEqual(f.urls,['blob:test-1']);assert.equal(f.player.objectURL,'blob:test-1');assert.deepEqual(f.calls,[]);
});
test('actual object URL acquired after source retirement is released without replacing successor',async t=>{
 const f=candidate(t);let successor,first=true;f.player.loadPlan=async()=>{};
 t.mock.method(URL,'createObjectURL',()=>{if(first){first=false;successor=f.player.open(f.file);return 'blob:retired';}return 'blob:successor';});
 await assert.rejects(f.player.open(f.file),/retired/);await successor;assert.deepEqual(f.revoked,['blob:retired']);assert.equal(f.player.objectURL,'blob:successor');assert.deepEqual([...f.player.ownedObjectURLs.keys()],['blob:successor']);
});
test('actual retired audio-track failure does not rollback or resume replacement',async t=>{
 const f=candidate(t),pending=deferred();f.video.paused=false;f.player.remux={tracks:[{id:'2',type:'audio',selected:false}],timelineBias:0,destroy:async()=>{}};f.player.remuxSource={file:f.file};let attempts=0;f.player.startRemux=()=>{attempts++;return pending.promise;};
 const selected=f.player.selectTrack('audio','2'),rejected=assert.rejects(selected,/retired/);await flush();f.player.loadPlan=async()=>{};await f.player.open(f.file);await rejected;pending.reject(Error('late selected-track error'));await flush();assert.equal(attempts,1);assert.equal(f.calls.includes('play'),false);assert.equal(f.player.opening,false);
});
test('actual failed audio-track rollback restores captured position and resumes once',async t=>{
 const f=candidate(t),source={file:f.file,audioTrack:0};f.video.paused=false;f.video.currentTime=8;f.player.remux={tracks:[{id:'2',type:'audio',selected:false}],timelineBias:2};f.player.remuxSource=source;
 const attempts=[],failure=Error('track failed');f.player.startRemux=async(value,position)=>{attempts.push([value,position]);if(attempts.length===1)throw failure;};
 await assert.rejects(f.player.selectTrack('audio','2'),error=>error===failure);assert.equal(attempts.length,2);assert.equal(attempts[0][0].audioTrack,1);assert.equal(attempts[1][0],source);assert.deepEqual(attempts.map(([,position])=>position),[6,6]);assert.deepEqual(f.calls,['play']);assert.equal(f.player.opening,false);
});
test('actual destruction is joinable before cleanup reentry and attempts every release despite failure',async t=>{
 const f=candidate(t),failure=Error('audio cleanup failed');let joined;
 f.player.mpvAudio={destroy(){joined=f.player.destroy();f.calls.push('audio');throw failure;}};f.player.mpvSubs={destroy(){f.calls.push('subtitles');}};f.player.remux={destroy(){f.calls.push('remux');}};
 f.player.objectURL='blob:owned';f.player.ownedObjectURLs.set('blob:owned',1);f.player.listeners=[()=>{f.calls.push('listener');}];
 const destroy=f.player.destroy();assert.equal(f.player.stopped,true);await assert.rejects(destroy,error=>error===failure);assert.equal(joined,destroy);assert.equal(f.player.destroy(),destroy);assert.deepEqual(f.calls,['audio','subtitles','remux','listener','pause','remove-src','remove-tracks','load']);assert.deepEqual(f.revoked,['blob:owned']);assert.equal(f.player.cancelers.size,0);
});
test('actual destruction waits for prior source cleanup and blocks a queued replacement',async t=>{
 const f=candidate(t),cleanup=deferred();f.player.remux={destroy:()=>cleanup.promise};f.player.loadPlan=async()=>f.calls.push('plan');
 const opening=f.player.open(f.file),rejected=assert.rejects(opening,/destroyed/);await flush();const destroy=f.player.destroy();await rejected;await flush();assert.deepEqual(f.calls,[]);cleanup.resolve();await destroy;assert.deepEqual(f.urls,[]);assert.deepEqual(f.calls,['pause','remove-src','remove-tracks','load']);
});
test('actual cleanup failure remains a barrier for later loads instead of reusing uncertain media',async t=>{
 const f=candidate(t),failure=Error('remux cleanup failed');f.player.remux={destroy:async()=>{throw failure;}};f.player.loadPlan=async()=>f.calls.push('plan');
 await assert.rejects(f.player.open(f.file),error=>error===failure);await assert.rejects(f.player.open(f.file),error=>error===failure);assert.deepEqual(f.urls,[]);assert.deepEqual(f.calls,[]);assert.equal(f.player.opening,false);
});
test('actual controller acquired after reentrant replacement never overwrites replacement waiter',async t=>{
 const f=candidate(t),Original=globalThis.AbortController;let first=true,successor;f.player.loadPlan=async()=>{};
 t.mock.method(globalThis,'AbortController',function(){const controller=new Original();if(first){first=false;successor=f.player.open(f.file);}return controller;});
 await assert.rejects(f.player.open(f.file),/retired/);await successor;assert.equal(f.player.loadWait,undefined);assert.equal(f.player.native.load.work,null);assert.deepEqual(f.urls,['blob:test-1']);
});
test('actual replacement observes cleanup registered after its initial barrier sample',async t=>{
 const f=candidate(t),late=deferred();f.player.loadPlan=async()=>f.calls.push('plan');
 const opening=f.player.open(f.file);f.player.queueSourceCleanup(()=>late.promise);await flush();assert.deepEqual(f.urls,[]);late.resolve();await opening;assert.deepEqual(f.calls,['plan']);
});
test('actual destruction joins cleanup registered during earlier resource release',async t=>{
 const f=candidate(t),late=deferred();f.player.mpvAudio={destroy(){f.player.queueSourceCleanup(()=>late.promise);}};
 const destroy=f.player.destroy();await flush();assert.deepEqual(f.calls,[]);late.resolve();await destroy;assert.deepEqual(f.calls,['pause','remove-src','remove-tracks','load']);
});
function constructed(t){const f=candidate(t),tracks=new EventTarget();tracks[Symbol.iterator]=function*(){};f.video.textTracks=tracks;const player=new NativePlayer(f.video);return {...f,player};}
test('constructed Native load owns and releases its URL and all DOM listeners',async t=>{
 const f=constructed(t);f.player.loadPlan=async()=>{};await f.player.open(f.file);assert.equal(f.player.objectURL,'blob:test-1');await f.player.destroy();assert.deepEqual(f.revoked,['blob:test-1']);assert.equal(f.player.listeners.length,0);assert.equal(f.player.native.load.work,null);
});
test('constructed Native old classified media error cannot report against replacement source',async t=>{
 const f=constructed(t),classification=deferred(),errors=[];f.player.classifyDirectFailure=()=>classification.promise;f.player.addEventListener('error',event=>errors.push(event.detail));
 f.video.error={code:3};f.video.dispatchEvent(new Event('error'));f.player.loadPlan=async()=>{};await f.player.open(f.file);classification.resolve(Error('old media failure'));await flush();assert.deepEqual(errors,[]);await f.player.destroy();
});
test('constructed Native refresh reentry cannot publish old activity after source replacement',async t=>{
 const f=constructed(t),activity=[];f.player.addEventListener('activity',event=>activity.push(event.detail));f.player.refresh=()=>f.player.retireNativeSource();f.video.dispatchEvent(new Event('timeupdate'));assert.deepEqual(activity,[]);await f.player.destroy();
});
