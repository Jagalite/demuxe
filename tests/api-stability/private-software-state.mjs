// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/private-software.js';
import {PrivateSoftwarePlayer} from '../../web/generated/internal/private-software-player.js';
import {createBackendRequests} from '../../web/generated/internal/machine/backend-requests.js';
const facts=(patch={})=>({tracksKnown:true,trackCount:1,video:true,audio:false,audioCodec:false,audioWritten:0,audioConsumed:0,seeking:false,rendered:1,position:0,...patch});
const nextSource=state=>{const next=core.beginPrivateSoftwareLoad(state);return core.startPrivateSoftwareLoad(next.state,next.load);};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
function fixture(){const p=Object.create(PrivateSoftwarePlayer.prototype),messages=[],events=[];Object.assign(p,{policy:core.initialPrivateSoftware(),requests:createBackendRequests('software'),pending:new Map(),ready:Promise.resolve(),properties:new Map(),options:{},loading:new AbortController(),context:{state:'running',baseLatency:0,outputLatency:0,currentTime:0,resume:async()=>{},close:async()=>{}},worker:{postMessage:data=>messages.push(data),terminate(){}},gainNode:{gain:{setValueAtTime(){}},disconnect(){}},emit:(...args)=>events.push(args),request:async(op,data)=>{messages.push({op,...data});return {};}});return {p,messages,events};}
function video(p){p.properties.set('track-list',[{type:'video',selected:true}]);p.diagnostics={seeking:false,rendered:1,presentedPosition:0};p.policy=core.acceptPrivateSoftwarePicture(p.policy,p.generation,1);}

test('pure reserved loads fence predecessors before buffering finishes and start alone advances source identity',()=>{
 const initial=core.initialPrivateSoftware(),first=core.beginPrivateSoftwareLoad(initial),second=core.beginPrivateSoftwareLoad(first.state);
 assert.equal(first.state.generation,0);assert.equal(second.state.generation,0);assert.equal(core.startPrivateSoftwareLoad(second.state,first.load),second.state);
 const active=core.startPrivateSoftwareLoad(second.state,second.load);assert.equal(active.generation,1);assert.equal(active.load.phase,'loading');assert.equal(core.finishPrivateSoftwareLoad(active,first.load),active);assert.equal(core.finishPrivateSoftwareLoad(active,second.load).load.phase,'ready');assert.equal(initial.load,null);
});
test('pure playback supersession is independent of seek and every source start retires both',()=>{
 let state=nextSource(core.initialPrivateSoftware());const play=core.beginPrivateSoftwareControl(state,'play');state=core.startPrivateSoftwareControl(play.state,play.control);
 const seek=core.beginPrivateSoftwareControl(state,'seek'),pause=core.beginPrivateSoftwareControl(seek.state,'pause');state=core.startPrivateSoftwareControl(pause.state,pause.control);
 assert.equal(state.userPaused,true);assert.equal(core.privateSoftwareControlCurrent(state,play.control),false);assert.equal(core.privateSoftwareControlCurrent(state,seek.control),true);assert.equal(core.finishPrivateSoftwareControl(state,play.control),state);
 state=nextSource(state);assert.equal(state.playback,null);assert.equal(state.seek,null);assert.equal(core.privateSoftwareControlCurrent(state,seek.control),false);
});
test('pure readiness requires selected output and preserves audio decoder versus PCM distinctions',()=>{
 let state=core.initialPrivateSoftware();assert.equal(core.privateSoftwareReady(state,facts(),'load'),false);state=core.acceptPrivateSoftwarePicture(state,0,1);assert.equal(core.privateSoftwareReady(state,facts(),'load'),true);assert.equal(core.privateSoftwareReady(state,facts({seeking:true}),'load'),false);
 const audio=facts({video:false,audio:true,audioCodec:true});assert.equal(core.privateSoftwareReady(core.initialPrivateSoftware(),audio,'load'),true);assert.equal(core.privateSoftwareReady(state,audio,'output'),false);assert.equal(core.privateSoftwareReady(state,{...audio,audioWritten:1},'output'),true);assert.equal(core.privateSoftwareReady(state,facts({video:false,audio:false}),'output'),false);
 assert.equal(core.privateSoftwareReady(state,facts({rendered:2,position:2}),'seek',2),false);assert.equal(core.privateSoftwareReady(state,facts({rendered:1,position:2.14}),'seek',2),true);assert.equal(core.privateSoftwareReady(state,facts({position:2.16}),'seek',2),false);
});
test('pure metadata evidence and wait deadlines retain null and empty track behavior',()=>{
 const state=core.initialPrivateSoftware();assert.equal(core.privateSoftwareEvidence(state,facts({trackCount:0})).metadata,true);assert.equal(core.privateSoftwareEvidence(state,facts({tracksKnown:false})).metadata,false);
 assert.equal(core.privateSoftwareWait(state,0,24999,25000,false),'wait');assert.equal(core.privateSoftwareWait(state,0,25000,25000,true),'timeout');assert.equal(core.privateSoftwareWait(nextSource(state),0,1,25000,true),'retired');assert.equal(core.privateSoftwareWait(core.retirePrivateSoftware(state),0,1,25000,true),'closed');
});
test('pure stale picture output and attachment rollback never mutate a replacement',()=>{
 let state=core.initialPrivateSoftware();const old=core.beginPrivateSoftwareAttachment(state,'old');state=nextSource(old.state);const current=core.beginPrivateSoftwareAttachment(state,'new');state=current.state;
 assert.equal(core.removePrivateSoftwareAttachment(state,old.attachment),state);assert.equal(core.acceptPrivateSoftwareOutput(state,0),state);assert.equal(core.acceptPrivateSoftwarePicture(state,0,99),state);assert.deepEqual(state.attachments.map(item=>item.attachmentId),['new']);
 const later=core.beginPrivateSoftwareAttachment(state,'later');state=core.removePrivateSoftwareAttachment(later.state,current.attachment);assert.deepEqual(state.attachments.map(item=>item.attachmentId),['later']);
});
test('pure buffering snapshots detach mutable caller values and audio layouts retain fallback policy',()=>{
 const buffering={preload:'metadata',profile:'balanced',memoryBudget:10},state=core.initialPrivateSoftware(buffering);buffering.memoryBudget=99;assert.equal(state.buffering.memoryBudget,10);assert.equal(Object.isFrozen(buffering),false);assert.equal(Object.isFrozen(state.buffering),true);
 assert.deepEqual(core.privateSoftwareAudioLayout('auto',8,false),{channels:8,reject:false});assert.deepEqual(core.privateSoftwareAudioLayout('7.1',2,false),{channels:2,reject:false});assert.deepEqual(core.privateSoftwareAudioLayout('7.1',2,true),{channels:2,reject:true});
});
test('varied source control observation and retirement histories preserve immutable source authority',()=>{
 let state=core.initialPrivateSoftware();for(let i=0;i<90;i++){const previous=state,generation=state.generation;state=nextSource(state);const control=core.beginPrivateSoftwareControl(state,i%2?'play':'pause');state=core.startPrivateSoftwareControl(control.state,control.control);assert.equal(core.acceptPrivateSoftwarePicture(state,generation,42),state);assert.equal(previous.generation,generation);state=core.acceptPrivateSoftwarePicture(state,state.generation,i+1);state=core.acceptPrivateSoftwareOutput(state,state.generation);assert.equal(state.outputVerified,true);assert.ok(Object.isFrozen(state));}state=core.retirePrivateSoftware(state);assert.equal(core.beginPrivateSoftwareLoad(state).load,null);assert.equal(core.beginPrivateSoftwareControl(state,'play').control,null);
});
for(const boundary of ['resume','context'])test('actual newer pause retires delayed play at '+boundary+' before any late unpause',async()=>{
 const {p,messages,events}=fixture(),pending=deferred(),entered=deferred();
 if(boundary==='resume')p.context.resume=()=>{entered.resolve();return pending.promise;};
 else p.request=async(op,data)=>{messages.push({op,...data});if(op==='context'){entered.resolve();await pending.promise;}return {};};
 const playing=p.play();void playing.catch(()=>{});await entered.promise;await p.pause();pending.resolve();const outcome=await playing.then(()=>null,error=>error);
 assert.equal(p.userPaused,true);assert.equal(messages.filter(message=>message.op==='pause'&&message.value===false).length,0,'retired play must never send a later unpause');assert.equal(outcome?.code,'ABORTED');assert.deepEqual(events,[['activity','pause']]);
});
test('actual obsolete load cannot resume buffering into a newer accepted source',async()=>{
 const {p,messages}=fixture(),pending=deferred(),entered=deferred();let first=true;
 p.request=async(op,data)=>{messages.push({op,...data});if(op==='command'&&data.args[0]==='set'&&first){first=false;entered.resolve();await pending.promise;}if(op==='load')video(p);return op==='command'?'yes':{};};
 const old=p.load({name:'old'});void old.catch(()=>{});await entered.promise;await p.load({name:'new'});pending.resolve();await assert.rejects(old,error=>error.code==='ABORTED');assert.deepEqual(messages.filter(message=>message.op==='load').map(message=>message.name),['new']);assert.equal(p.properties.get('seekable'),true);assert.equal(p.policy.load.phase,'ready');
});
test('actual refresh callbacks and responses are fenced across both microtask and I/O retirement',async()=>{
 const {p,messages}=fixture();let calls=0;p.refresh=async()=>{calls++;return {};};p.receive({type:'refresh',generation:0,refreshId:1});p.policy=nextSource(p.policy);await turn();assert.equal(calls,0);assert.equal(messages.length,0);
 const pending=deferred();p.refresh=()=>{calls++;return pending.promise;};p.receive({type:'refresh',generation:1,refreshId:2});await turn();p.policy=nextSource(p.policy);pending.resolve({headers:{stale:'yes'}});await turn();assert.equal(calls,1);assert.equal(messages.length,0);
});
test('actual drawing reentry cannot credit a replacement with the obsolete rendered count',()=>{
 const {p,messages}=fixture();let closes=0;p.presentation={canvas:{width:2,height:2},drawImage(){p.policy=nextSource(p.policy);}};
 p.receive({type:'picture',generation:0,pictureId:8,rendered:99,bitmap:{width:2,height:2,close(){closes++;}}});assert.equal(p.generation,1);assert.equal(p.presentedDraws,0);assert.equal(closes,1);assert.deepEqual(messages,[{op:'picture-presented',pictureId:8}]);
});
test('actual seek and output verification cannot finish with replacement metadata',async()=>{
 const {p}=fixture(),pending=deferred();p.request=()=>pending.promise;
 const seek=p.seek(2);void seek.catch(()=>{});await turn();p.policy=nextSource(p.policy);video(p);p.diagnostics.presentedPosition=2;pending.resolve();await assert.rejects(seek,error=>error.code==='ABORTED');
 p.properties.set('track-list',[]);const verification=p.verifyOutput();void verification.catch(()=>{});await turn();p.policy=nextSource(p.policy);video(p);await assert.rejects(verification,error=>error.code==='ABORTED');assert.equal(p.outputVerified,false);
});
test('actual old subtitle failure cannot remove a replacement attachment',async()=>{
 const {p}=fixture(),pending=deferred(),entered=deferred();let first=true;p.request=async()=>{if(first){first=false;entered.resolve();return pending.promise;}p.properties.set('track-list',[{type:'sub',external:true}]);return {};};
 const old=p.addSubtitle({attachmentId:'old',bytes:new ArrayBuffer(1)});void old.catch(()=>{});await entered.promise;p.policy=nextSource(p.policy);await p.addSubtitle({attachmentId:'new',bytes:new ArrayBuffer(1)});pending.reject(Error('old failed'));await assert.rejects(old,/old failed/);assert.deepEqual(p.attachmentIds,['new']);
});
test('actual close retires intent before abort listeners and deferred work can resume',async()=>{
 const {p,messages}=fixture(),pending=deferred(),entered=deferred();p.context.resume=()=>{entered.resolve();return pending.promise;};let sourceActive;p.loading.signal.addEventListener('abort',()=>{sourceActive=core.privateSoftwareSourceCurrent(p.policy,p.generation);});
 const playing=p.play();void playing.catch(()=>{});await entered.promise;await p.destroy();pending.resolve();await assert.rejects(playing,error=>error.code==='ABORTED');assert.equal(sourceActive,false);assert.equal(messages.some(message=>message.op==='pause'&&message.value===false),false);
});

for(const boundary of ['draw','close'])test('actual retired picture '+boundary+' failure cannot destroy its replacement',()=>{
 const {p,messages}=fixture();let closes=0,failures=0;p.fail=()=>failures++;
 const retire=()=>{p.policy=nextSource(p.policy);throw Error('obsolete presentation failed');};
 p.presentation={canvas:{width:2,height:2},drawImage(){if(boundary==='draw')retire();}};
 p.receive({type:'picture',generation:0,pictureId:9,rendered:1,bitmap:{width:2,height:2,close(){closes++;if(boundary==='close')retire();}}});
 assert.equal(closes,1);assert.equal(failures,0);assert.equal(p.policy.stopped,false);assert.equal(p.presentedDraws,0);assert.deepEqual(messages,[{op:'picture-presented',pictureId:9}]);
});

for(const outcome of ['throw','abort','replace','deadline','ready'])test(`actual private output predicate ${outcome} releases wait authority`,async t=>{
 const {p}=fixture(),controller=new AbortController(),failure=Error('predicate failure');let now=0,calls=0;
 t.mock.method(performance,'now',()=>now);
 const result=p.waitUntil(()=>{calls++;
  if(outcome==='throw')throw failure;
  if(outcome==='abort')controller.abort();
  if(outcome==='replace')p.policy=nextSource(p.policy);
  if(outcome==='deadline')now=25000;
  return true;
 },controller.signal);
 if(outcome==='ready')await result;
 else await assert.rejects(result,error=>outcome==='throw'?error===failure:outcome==='deadline'?error.code==='PLAYBACK_STALLED':outcome==='abort'?error.name==='AbortError':error.code==='ABORTED');
 assert.equal(calls,1);assert.equal(p.policy.waits.length,0);
 await p.waitUntil(()=>true);assert.equal(p.policy.waits.length,0);
});
