// SPDX-License-Identifier: Apache-2.0
import {initialRemuxDeployment} from '../../web/generated/internal/machine/remux-deployment.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialDiscovery,transitionDiscovery,discoveryPlanPolicy,discoveryOptionalProbe,localDiscoveryRemux} from '../../web/generated/internal/machine/route-discovery.js';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {PlayerError} from '../../web/generated/internal/errors.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
const failure=(id,extra={})=>({id,message:'unsupported fixture',code:'UNSUPPORTED_MEDIA',compatible:true,interrupted:false,nativeTimeout:false,budget:0,inconclusiveOutput:false,fast:false,...extra});
function model(extra={}){let state=transitionDiscovery(initialDiscovery(),{kind:'begin',automatic:true,start:0,...extra});return {get state(){return state;},get current(){return state.current;},send(change){const before=state,encoded=JSON.stringify(before);state=transitionDiscovery(state,{id:state.current?.id,...change});assert.equal(JSON.stringify(before),encoded);return state.current;},fail(f){this.send({kind:'attempt',planId:f.id});return this.send({kind:'failed',attempt:state.current.pendingAttempt.id,failure:f});}};}
const plan=(id,extra={})=>({id,mode:id.startsWith('native')?'native':id.startsWith('hybrid')?'hybrid':'software',eligible:true,...extra});
test('discovery follows mode pin and recovery start without changing registry order',()=>{
 const plans=['native-direct','native-remux','hybrid-private','software-private'].map(id=>plan(id));
 assert.deepEqual(plans.filter(p=>discoveryPlanPolicy(model({start:1}).current,p).included).map(p=>p.id),['hybrid-private','software-private']);
 assert.deepEqual(plans.filter(p=>discoveryPlanPolicy(model({start:2,pinnedMode:'native'}).current,p).included).map(p=>p.id),['native-direct','native-remux']);
});
test('short direct timeout permits one full-budget original restoration after a missing remux replacement',()=>{
 const r=model();r.fail(failure('native-direct',{compatible:false,code:'NETWORK_TIMEOUT',nativeTimeout:true,budget:1500,retryRemux:'native-remux'}));
 assert.equal(r.current.cursor,1);assert.equal(r.current.interruptedDirect.id,'native-direct');
 r.fail(failure('native-remux',{compatible:false,code:'ASSET_LOAD_FAILED'}));
 assert.equal(r.current.phase,'restore');assert.equal(r.current.restoreId,'native-direct');assert.equal(r.current.interruptedDirect,null);
 const lease=r.current.pendingAttempt.id;r.send({kind:'restore.failed',attempt:lease,failure:failure('native-direct')});
 assert.equal(r.current.phase,'failed');assert.equal(r.current.failure.id,'native-remux');
 assert.deepEqual(r.current.errors,['native-direct: unsupported fixture','native-direct: unsupported fixture']);
 // The original missing-assets error is terminal after a compatible original failure,
 // retaining the previous public failure precedence.
});
test('compatible remux and restored direct failures resume finite discovery with ordered evidence',()=>{
 const r=model();r.fail(failure('native-direct',{nativeTimeout:true,budget:1500,retryRemux:'native-remux'}));r.fail(failure('native-remux'));
 const lease=r.current.pendingAttempt.id;r.send({kind:'restore.failed',attempt:lease,failure:failure('native-direct',{message:'original incompatible'})});
 assert.equal(r.current.phase,'plans');assert.equal(r.current.cursor,2);assert.equal(r.current.interruptedDirect,null);
 assert.deepEqual(r.current.errors,['native-direct: unsupported fixture','native-direct: original incompatible','native-remux: unsupported fixture']);
 r.fail(failure('hybrid-private'));assert.equal(r.current.phase,'plans');assert.equal(r.current.restoreId,null);
});
for(const code of ['SOURCE_PERMISSION','SOURCE_CHANGED','ABORTED','AUTOPLAY_BLOCKED'])test(`restored original ${code} remains terminal`,()=>{
 const r=model();r.fail(failure('native-direct',{nativeTimeout:true,budget:1500,retryRemux:'native-remux'}));r.fail(failure('native-remux'));
 r.send({kind:'restore.failed',attempt:r.current.pendingAttempt.id,failure:failure('native-direct',{compatible:false,code})});assert.equal(r.current.phase,'failed');assert.equal(r.current.failure.code,code);
});
test('caption failure excludes subsequent native plans and suppresses original restoration',()=>{
 const r=model();r.fail(failure('native-direct',{nativeTimeout:true,budget:1500,retryRemux:'native-remux'}));r.fail(failure('native-remux',{caption:'renderer failed'}));
 assert.equal(r.current.phase,'plans');assert.equal(r.current.interruptedDirect,null);assert.equal(discoveryPlanPolicy(r.current,plan('native-flac')).captionFailure,'renderer failed');assert.equal(discoveryPlanPolicy(r.current,plan('hybrid-private')).captionFailure,undefined);
});
test('fast metadata can trigger exactly one full inspection and restarts the finite registry once',()=>{
 const r=model();r.fail(failure('native-direct',{fast:true}));assert.equal(r.current.phase,'inspect');r.send({kind:'reinspected',nativeReason:'not direct'});assert.equal(r.current.cursor,0);assert.equal(r.current.nativeReason,'not direct');
 r.fail(failure('native-direct',{fast:true}));assert.equal(r.current.phase,'plans');assert.equal(r.current.cursor,1);assert.equal(r.current.reinspections,1);
});
test('full-budget timeout does not create a short-trial restoration lease and local output uncertainty can fall through',()=>{
 const r=model();r.fail(failure('native-direct',{compatible:false,nativeTimeout:true,budget:25000,retryRemux:'native-remux'}));assert.equal(r.current.interruptedDirect,null);assert.equal(r.current.phase,'plans');
 const uncertain=model();uncertain.fail(failure('native-direct',{compatible:false,code:'NETWORK_TIMEOUT',inconclusiveOutput:true}));assert.equal(uncertain.current.phase,'plans');
});
test('explicit unsupported timeline stays precise while automatic compatible discovery may continue',()=>{
 const explicit=model({automatic:false});explicit.fail(failure('native-direct',{code:'UNSUPPORTED_TIMELINE'}));assert.equal(explicit.current.phase,'failed');
 const automatic=model();automatic.fail(failure('native-direct',{code:'UNSUPPORTED_TIMELINE'}));assert.equal(automatic.current.phase,'plans');
});
test('duplicate attempt completion and reinspection cannot advance a successor or replace its evidence',()=>{
 const r=model();r.send({kind:'attempt',planId:'native-direct'});const old=r.current.pendingAttempt.id;r.send({kind:'failed',attempt:old,failure:failure('native-direct')});r.send({kind:'attempt',planId:'native-remux'});const saved=r.state;
 r.send({kind:'failed',attempt:old,failure:failure('native-direct')});assert.equal(r.state,saved);r.send({kind:'reinspected',nativeReason:'stale'});assert.equal(r.state,saved);
 r.send({kind:'finished'});assert.equal(r.current,null);const finished=r.state;r.send({kind:'failed',id:1,attempt:old,failure:failure('native-direct')});assert.equal(r.state,finished);
});
const facts=(extra={})=>({flacOffer:true,audioPlayback:'auto',automaticLossless:false,inspected:true,pcm:true,losslessInspected:false,local:true,transcodeChecked:false,audioAdaptation:false,selectiveChecked:false,fileServices:true,audioOutput:'stereo',gain:1,...extra});
test('optional probes stay lazy at their own registry rows and retain their semantic prerequisites',()=>{
 const r=model();for(const id of ['native-direct','native-remux','hybrid-private','software-private'])assert.equal(discoveryOptionalProbe(r.current,plan(id),facts({automaticLossless:true})),undefined);
 assert.equal(discoveryOptionalProbe(r.current,plan('native-flac'),facts({automaticLossless:true})),'lossless');
 for(const extra of [{flacOffer:false},{pcm:false},{losslessInspected:true},{local:false},{audioPlayback:'worklet'}])assert.equal(discoveryOptionalProbe(r.current,plan('native-flac'),facts({automaticLossless:true,...extra})),undefined);
 const transcode=plan('native-transcode',{eligible:false,code:'DEPLOYMENT_UNAVAILABLE',reason:'FLAC24 preparation assets are unavailable'});assert.equal(discoveryOptionalProbe(r.current,transcode,facts()),'transcode');assert.equal(discoveryOptionalProbe(r.current,transcode,facts({automaticLossless:true})),undefined);
 const selective=plan('native-video-mpv-audio');assert.equal(discoveryOptionalProbe(r.current,selective,facts()),'selective');for(const extra of [{gain:2},{audioOutput:'5.1'},{selectiveChecked:true},{fileServices:false}])assert.equal(discoveryOptionalProbe(r.current,selective,facts(extra)),undefined);
 assert.equal(discoveryOptionalProbe(r.current,{...selective,browserCapability:{status:'unsupported'}},facts()),undefined);
});
test('local remux trials match complete gain/subtitle plans and admitted codec repair only',()=>{
 const variants=[['native-direct','native-remux'],['native-direct-gain','native-remux-gain'],['native-direct-ass','native-remux-ass'],['native-direct-ass-gain','native-remux-ass-gain'],['native-direct-mpv','native-remux-mpv']];
 for(const [direct,remux]of variants){const f={local:true,inspected:true,codecRepair:false,eligible:[remux],rejected:[]};assert.equal(localDiscoveryRemux(direct,f),remux);assert.equal(localDiscoveryRemux(direct,{...f,local:false}),undefined);assert.equal(localDiscoveryRemux(direct,{...f,rejected:[remux]}),undefined);}
 assert.equal(localDiscoveryRemux('native-direct',{local:true,inspected:true,codecRepair:true,eligible:['native-transcode'],rejected:[]}),'native-transcode');assert.equal(localDiscoveryRemux('native-direct-gain',{local:true,inspected:true,codecRepair:true,eligible:['native-transcode'],rejected:[]}),undefined);
});
test('operation retirement clears discovery and rejects late original attempt, probe and finish events',()=>{
 let state=initialPlayerControl();const send=input=>{const result=transitionPlayer(state,input);state=result.state;return result;};const op=send({type:'operation.admit',kind:'opening'}).id;send({type:'operation.start',id:op});const scope={epoch:state.operations.epoch,operation:op};
 send({type:'routing.discovery',...scope,change:{kind:'begin',automatic:true,start:0}});const id=state.routing.discovery.current.id;send({type:'routing.discovery',...scope,change:{kind:'attempt',id,planId:'native-direct'}});send({type:'operation.retire',terminal:false});assert.equal(state.routing.discovery.current,null);
 for(const change of [{kind:'failed',id,attempt:1,failure:failure('native-direct')},{kind:'reinspected',id},{kind:'finished',id}])assert.equal(send({type:'routing.discovery',...scope,change}).accepted,false);
 assert.equal(send({type:'routing.discovery',epoch:state.operations.epoch,operation:op,change:{kind:'begin',automatic:true,start:0}}).accepted,false);
});
test('actual discovery stops after a failure observer closes the player before fallback',async t=>{
 const p=unitPlayer();t.after(()=>p.destroy());const source={kind:'local',file:new ArrayBuffer(1)};p.control={...p.control,routing:{...p.control.routing,deployment:initialRemuxDeployment({...p.remuxSelection,runtime:'pthread'})}};p.admissible=()=>['native-direct','hybrid-private','software-private'].map(id=>plan(id));p.inspectForQualifiedWebGPU=async()=>{};let tries=0,closing;
 p.replace=async()=>{tries++;throw new PlayerError('UNSUPPORTED_MEDIA','fixture incompatible');};p.addEventListener('selectionchange',event=>{if(event.detail.outcome==='failed')closing=p.close();});
 await assert.rejects(p.discover(source,p.settings,false,[],undefined,true),error=>error.code==='ABORTED');await closing;assert.equal(tries,1);assert.equal(p.control.routing.discovery.current,null);
});
