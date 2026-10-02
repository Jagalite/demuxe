// SPDX-License-Identifier: Apache-2.0
import {test,after} from 'node:test';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {initialInspection,transitionInspection,selectInitialInspectionEffect,inspectionFailureRouteCheck} from '../../web/generated/internal/machine/route-inspection.js';
import {initialPlayerControl} from '../../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../../web/generated/internal/machine/transition.js';
import {PlayerError} from '../../web/generated/internal/errors.js';
import {unitPlayer} from '../helpers/unit-player.mjs';
const fixtureRoot=await mkdtemp(join(tmpdir(),'demuxe-initial-inspection-'));
await mkdir(join(fixtureRoot,'web'));
await writeFile(join(fixtureRoot,'package.json'),'{"type":"module"}');
await writeFile(join(fixtureRoot,'web/fast-source-inspector.js'),'export const inspectFastSource=(...args)=>globalThis.__inspectionFast(...args);');
await writeFile(join(fixtureRoot,'web/source-probe.js'),'export const probeSource=(...args)=>globalThis.__inspectionProbe(...args);');
after(()=>rm(fixtureRoot,{recursive:true,force:true}));
const probe=()=>({duration:12,format:'matroska',tracks:[{id:'1',index:0,type:'video',codec:'h264',width:640,height:360},{id:'2',index:1,type:'audio',codec:'aac',channels:2,sampleRate:48000}]});
const selected={aid:'auto',sid:'auto',subtitles:true};
const facts=(extra={})=>({automatic:true,mode:'native',privateRemux:false,provider:false,canInspect:true,quality:'exact',adaptive:false,inspected:false,start:0,videoFilters:'',audioFilters:'',toneMapping:'off',...extra});
function model(extra={},options={}){let state=initialInspection(),history=[];const api={get state(){return state;},get phase(){return selectInitialInspectionEffect(state)?.kind;},send(change){const old=state,before=structuredClone(old);state=transitionInspection(state,change);assert.deepEqual(old,before);history.push(change);return state;},step(kind,values={}){return this.send({kind:'work.'+kind,id:state.work?.id,...values});},replay(){assert.deepEqual(history.reduce(transitionInspection,initialInspection()),state);}};api.send({kind:'work.begin',epoch:1,operation:3,source:1,provider:false,preserve:false,inspectOnly:false,...options});api.step('configured',{facts:facts(extra)});return api;}
function normal(m,fastAllowed=false){m.step('prepared',{componentRepairRetry:false});m.step('normal-start',{fastAllowed});}
function classify(m){m.step('classified',{settings:selected});m.step('assets');}
const failure=(extra={})=>({code:'DECODE_FAILED',message:'Error: probe unavailable',terminalSource:false,provider:false,rangeReturnedWhole:false,optional:{privateRemux:true,policy:'auto',preserve:false,inspectOnly:false,remote:true,identity:false,aid:'auto',sid:'auto',provider:false,retired:false,assetFailure:false,terminalSource:false,rangeReturnedWhole:false,directAdmitted:true},...extra});
test('pure explicit private inspection is ordered before assets and optional quality is skipped after metadata',()=>{
 const m=model({automatic:false,mode:'software',privateRemux:true,quality:'balanced'});assert.equal(m.phase,'private-probe');m.step('private-probe',{probe:probe(),settings:selected});assert.equal(m.phase,'private-assets');m.step('private-assets');assert.equal(m.phase,'replace');m.replay();
 const hybrid=model({automatic:false,mode:'hybrid',privateRemux:true});hybrid.step('private-probe',{probe:probe(),settings:selected});hybrid.step('private-assets');assert.equal(hybrid.phase,'webgpu');hybrid.step('webgpu');assert.equal(hybrid.phase,'replace');
});
test('pure optional quality failure preserves explicit replacement while required transport failures stay terminal',()=>{
 for(const code of ['DECODE_FAILED','SOURCE_PERMISSION']){const m=model({automatic:false,mode:'software',quality:'balanced'});assert.equal(m.phase,'quality');m.step('failed',{failure:failure({code,terminalSource:code==='SOURCE_PERMISSION'})});assert.equal(m.phase,code==='DECODE_FAILED'?'replace':'failed');}
 const m=model({automatic:false,mode:'software',privateRemux:true});m.step('failed',{failure:failure()});assert.equal(m.phase,'failed');
});
test('pure normal fast evidence can trigger exactly one full-inspector pass before publishing admission',()=>{
 const m=model();normal(m,true);const input=probe();m.step('fast',{probe:input,available:['streams'],bytes:128});input.tracks[0].codec='mutated';assert.equal(m.state.work.candidate.tracks[0].codec,'h264');assert.equal(m.state.probe,null);classify(m);assert.equal(m.phase,'fast-admission');
 m.step('fast-admission',{missing:['selected-track-bounds'],first:'native-remux'});assert.equal(m.phase,'ffmpeg');assert.equal(m.state.work.pass,1);assert.equal(m.state.probe,null);
 m.step('ffmpeg',{probe:probe()});classify(m);assert.equal(m.phase,'publish');assert.equal(m.state.fastSource,null);m.step('published');assert.equal(m.phase,'discover');m.replay();
});
test('pure satisfied fast admission retains source provenance and exact native rejection',()=>{
 const m=model();normal(m,true);m.step('fast',{probe:probe(),available:['streams'],bytes:40});m.step('classified',{settings:selected,nativeReason:'codec rejected'});m.step('assets');m.step('fast-admission',{missing:[],first:'software-private'});assert.equal(m.phase,'publish');assert.equal(m.state.fastSource,1);assert.equal(m.state.work.nativeReason,'codec rejected');
});
test('pure fast skip without Wasm preserves both ordered skip notices',()=>{
 const m=model({canInspect:false});normal(m,true);m.step('fast',{available:[],bytes:8,reason:'unsupported family'});assert.equal(m.phase,'unavailable');assert.match(m.state.work.notice.reason,/8 bytes; unsupported family/);m.step('unavailable');assert.equal(m.phase,'publish');assert.match(m.state.work.notice.reason,/cross-origin isolation/);
});
test('pure initial reset and manifest precedence match legacy private and explicit demuxer policies',()=>{
 for(const [extra,phase] of [[{remoteFormat:'hls',privateRemux:true},'manifest'],[{localDemuxer:'mpegts'},'manifest'],[{videoFilters:'scale=1:1'},'publish'],[{videoFilters:'scale=1:1',privateRemux:true},'normal-start']]){const m=model(extra);m.step('prepared',{componentRepairRetry:false});assert.equal(m.phase,phase);}
 const m=model({start:1});m.send({kind:'probe',value:{source:1,probe:probe(),settings:selected}});m.send({kind:'fast',source:1});m.step('prepared',{componentRepairRetry:true});assert.equal(m.phase,'fallback');m.step('fallback',{nativeReason:'reinspected'});assert.equal(m.phase,'publish');assert.equal(m.state.work.nativeReason,'reinspected');
});
test('pure optional Direct fallback does not swallow identity, transport or provider failures',()=>{
 for(const [patch,phase] of [[{},'publish'],[{identity:true},'failed'],[{directAdmitted:false},'failed'],[{provider:true},'failed'],[{inspectOnly:true},'failed']]){
  const m=model({privateRemux:true});normal(m);const error=failure({code:'ASSET_LOAD_FAILED'});error.optional={...error.optional,assetFailure:true,...patch};m.step('failed',{failure:error});assert.equal(m.phase,phase);if(phase==='publish')assert.equal(m.state.work.nativeReason,undefined);
 }
});
test('pure work finish cannot mutate a successor and serial remains monotonic across clear and restore',()=>{
 const m=model(),old={...m.state.work},snapshot=m.state;m.step('finished',{epoch:1,operation:3});m.send({kind:'clear'});m.send({kind:'work.begin',source:2,epoch:2,operation:4,provider:false,preserve:false,inspectOnly:false});const next=m.state;assert.equal(next.work.id,old.id+1);m.send({kind:'work.finished',id:old.id,epoch:1,operation:3});assert.equal(m.state,next);m.send({kind:'restore',value:snapshot});assert.equal(m.state.workSerial,next.workSerial);
});
test('composed cleanup accepts only stored original lease after operation retirement, rejecting retagged completion',()=>{
 let state=initialPlayerControl(),begin=transitionPlayer(state,{type:'operation.admit',kind:'opening'});state=transitionPlayer(begin.state,{type:'operation.start',id:begin.id}).state;const scope={epoch:state.operations.epoch,operation:begin.id};state=transitionPlayer(state,{type:'routing.inspection',...scope,change:{kind:'work.begin',...scope,source:1,provider:false,preserve:false,inspectOnly:false}}).state;const id=state.routing.inspection.work.id;
 state=transitionPlayer(state,{type:'operation.retire',terminal:false}).state;const blocked=transitionPlayer(state,{type:'routing.inspection',epoch:state.operations.epoch,operation:begin.id,change:{kind:'work.finished',id,epoch:state.operations.epoch,operation:begin.id}});assert.equal(blocked.accepted,false);
 const disguised=transitionPlayer(state,{type:'routing.inspection',epoch:state.operations.epoch,operation:state.operations.active,change:{kind:'work.finished',id,...scope}});assert.equal(disguised.accepted,false);assert.equal(disguised.state,state);
 assert.equal(transitionPlayer(state,{type:'routing.inspection',...scope,change:{kind:'work.configured',id,facts:facts()}}).accepted,false);
 const done=transitionPlayer(state,{type:'routing.inspection',...scope,change:{kind:'work.finished',...scope,id}});assert.equal(done.accepted,true);assert.equal(done.state.routing.inspection.work,null);
});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function player(t){const p=unitPlayer();t.after(()=>p.destroy());p.automatic=true;p.remuxRuntime='pthread';p.assetBase=pathToFileURL(fixtureRoot+'/');p.preparation=undefined;Object.defineProperty(p,'canInspectFFmpeg',{get:()=>true});const prior=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{createElement:()=>({canPlayType:()=> 'probably'})}});t.after(()=>{if(prior)Object.defineProperty(globalThis,'document',prior);else delete globalThis.document;});p.checkInspectedAssets=async()=>{};p.discover=async()=>{};p.replace=async()=>{};globalThis.__inspectionProbe=async()=>probe();globalThis.__inspectionFast=async()=>({status:'satisfied',evidence:probe(),available:['streams','selected-track-bounds'],bytesRead:32});return p;}
const remote=()=>({kind:'remote',options:{url:'https://media.test/file',format:'file'}});
test('actual forced private probe publishes metadata before asset checks and replaces once',async t=>{
 const p=player(t),source=remote(),order=[];p.automatic=false;p.currentMode='software';p.remuxRuntime='asyncify';p.inspectWithFFmpeg=async()=>{order.push('probe');return probe();};p.checkInspectedAssets=async()=>{order.push('assets');assert.equal(p.sourceInspection.source,source);};p.replace=async()=>order.push('replace');await p.enqueue(()=>p.select(source,p.settings,false,[]),'opening');assert.deepEqual(order,['probe','assets','replace']);assert.equal(p.control.routing.inspection.work,null);
});
test('actual selection observer close stops subsequent asset and route effects',async t=>{
 const p=player(t),source={kind:'local',file:new File(['x'],'file.mp4')};let closed,assets=0,routes=0;p.checkInspectedAssets=async()=>assets++;p.discover=async()=>routes++;p.addEventListener('selectionchange',()=>{closed??=p.close();});
 await assert.rejects(p.enqueue(()=>p.select(source,p.settings,false,[]),'opening'),error=>error.code==='ABORTED');await closed;assert.equal(assets,0);assert.equal(routes,0);assert.equal(p.inspectionSources.size,0);assert.equal(p.control.routing.inspection.work,null);
});
test('actual inspection observer close prevents provider inspector lookup after event delivery',async t=>{
 const p=player(t),source=remote();let closed,afterEvent=false,lookups=0;p.providerRuntime={destroy(){},load:async()=>{},codecInspector(){if(afterEvent)lookups++;return undefined;},codecPreparation:()=>false,audioRepairCandidate:()=>false};p.selectDeployedRuntime=()=>{};
 p.addEventListener('inspectionchange',()=>{afterEvent=true;closed??=p.close();});await assert.rejects(p.enqueue(()=>p.select(source,p.settings,false,[]),'opening'),error=>error.code==='ABORTED');await closed;assert.equal(lookups,0);assert.equal(p.control.routing.inspection.work,null);
});
test('actual provider result arriving after close cannot configure inspection or publish route effects',async t=>{
 const p=player(t),hold=deferred(),entered=deferred();let configured=0;p.providerRuntime={destroy(){},load(){entered.resolve();return hold.promise;}};p.selectDeployedRuntime=()=>configured++;const pending=p.enqueue(()=>p.select(remote(),p.settings,false,[]),'opening');await entered.promise;const closed=p.close();hold.resolve();await assert.rejects(pending,error=>error.code==='ABORTED');await closed;assert.equal(configured,0);assert.equal(p.control.routing.inspection.work,null);assert.equal(p.inspectionSources.size,0);
});
test('actual fast missing evidence invokes one full probe and records both inspector decisions',async t=>{
 const p=player(t),source={kind:'local',file:new File(['x'],'file.mp4')};let full=0,routes=0;globalThis.__inspectionFast=async()=>({status:'satisfied',evidence:probe(),available:[],bytesRead:4});p.inspectWithFFmpeg=async()=>{full++;return probe();};p.admissible=()=>[{id:'native-remux',mode:'native',eligible:true}];p.discover=async()=>routes++;
 await p.enqueue(()=>p.select(source,p.settings,false,[]),'opening');assert.equal(full,1);assert.equal(routes,1);assert.equal(p.fastInspectedSource,undefined);assert.equal(p.attempts.filter(value=>value.reason.includes('FFmpeg inspection required')).length,1);assert.equal(p.sourceInspection.source,source);
});
test('actual late scoped probe completion after cancellation cannot replace accepted inspection',async t=>{
 const p=player(t),hold=deferred(),entered=deferred(),source=remote();p.inspectWithFFmpeg=async()=>{entered.resolve();return hold.promise;};const abort=new AbortController(),pending=p.enqueue(()=>p.select(source,p.settings,false,[]),'opening',abort.signal);await entered.promise;abort.abort();hold.resolve(probe());await assert.rejects(pending,error=>error.code==='ABORTED');assert.equal(p.sourceInspection,undefined);assert.equal(p.control.routing.inspection.work,null);
});

test('pure failures preserve the fast inner catch and optional quality boundaries',()=>{
 for(const [code,provider,expected] of [['DECODE_FAILED',false,'ffmpeg'],['DEPLOYMENT_UNAVAILABLE',false,'ffmpeg'],['DEPLOYMENT_UNAVAILABLE',true,'publish'],['ASSET_LOAD_FAILED',true,'failed']]){
  const m=model({provider});normal(m,true);const error=failure({code,provider});assert.equal(inspectionFailureRouteCheck(m.state,error),false);m.step('failed',{failure:error});assert.equal(m.phase,expected);
 }
 for(const code of ['ABORTED','AUTOPLAY_BLOCKED','ASSET_LOAD_FAILED']){
  const m=model({automatic:false,mode:'software',quality:'balanced'}),error=failure({code,optional:{...failure().optional,assetFailure:true}});assert.equal(inspectionFailureRouteCheck(m.state,error),false);m.step('failed',{failure:error});assert.equal(m.phase,'replace');
 }
 const m=model({privateRemux:true});normal(m);assert.equal(inspectionFailureRouteCheck(m.state,failure({code:'ASSET_LOAD_FAILED',optional:{...failure().optional,assetFailure:true}})),true);
});
test('composed forward inspection cannot rebind stored work to a newer current epoch',()=>{
 let state=initialPlayerControl(),admission=transitionPlayer(state,{type:'operation.admit',kind:'opening'});state=transitionPlayer(admission.state,{type:'operation.start',id:admission.id}).state;const scope={epoch:state.operations.epoch,operation:admission.id};state=transitionPlayer(state,{type:'routing.inspection',...scope,change:{kind:'work.begin',...scope,source:1,provider:false,preserve:false,inspectOnly:false}}).state;const id=state.routing.inspection.work.id;
 state=transitionPlayer(state,{type:'operation.retire',terminal:false}).state;
 const rebound=transitionPlayer(state,{type:'routing.inspection',epoch:state.operations.epoch,operation:state.operations.active,change:{kind:'work.configured',id,facts:facts()}});assert.equal(rebound.accepted,false);assert.equal(rebound.state,state);assert.equal(state.routing.inspection.work.phase,'configure');
});
test('actual optional quality errors never evaluate normal browser Direct admission',async t=>{
 const p=player(t);p.automatic=false;p.currentMode='software';p.decodeQuality='balanced';let replacement=0,admission=0;p.admissible=()=>{admission++;throw Error('unexpected optional route check');};p.replace=async()=>replacement++;globalThis.__inspectionProbe=async()=>{throw new PlayerError('ASSET_LOAD_FAILED','optional unavailable');};
 await p.enqueue(()=>p.select({kind:'local',file:new File(['x'],'file.mp4')},p.settings,false,[]),'opening');assert.equal(replacement,1);assert.equal(admission,0);assert.equal(p.sourceInspection,undefined);
});
test('actual fallback inspection observer retirement cannot publish its late probe or route',async t=>{
 const p=player(t),source=remote();p.sourceInspection={source,probe:probe(),settings:selected};p.fastInspectedSource=source;let closed,probes=0,routes=0;globalThis.__inspectionProbe=async()=>{probes++;return probe();};p.discover=async()=>routes++;p.addEventListener('inspectionchange',()=>{closed??=p.close();});
 await assert.rejects(p.enqueue(()=>p.select(source,p.settings,true,[],1),'opening'),error=>error.code==='ABORTED');await closed;assert.equal(probes,0);assert.equal(routes,0);assert.equal(p.sourceInspection,undefined);assert.equal(p.inspectionSources.size,0);
});

test('actual private asset availability stops immediately when a provider callback retires inspection',async t=>{
 const p=player(t),source=remote();p.automatic=false;p.currentMode='software';p.remuxRuntime='asyncify';delete p.checkInspectedAssets;p.inspectWithFFmpeg=async()=>probe();let closed,lookups=0,bytes=0,replacements=0;p.providerRuntime={destroy(){},load:async()=>{},has(){lookups++;closed??=p.close();return true;},bytes(){bytes++;return new Uint8Array();}};p.selectDeployedRuntime=()=>{};p.replace=async()=>replacements++;
 await assert.rejects(p.enqueue(()=>p.select(source,p.settings,false,[]),'opening'),error=>error.code==='ABORTED');await closed;assert.equal(lookups,1);assert.equal(bytes,0);assert.equal(replacements,0);assert.equal(p.privatePlaybackAssetsAvailable,false);
});
test('actual scoped manifest completion after close cannot initialize metadata or a replacement',async t=>{
 const p=player(t),source=remote(),started=deferred(),hold=deferred();p.automatic=false;p.currentMode='software';p.remuxRuntime='asyncify';delete p.checkInspectedAssets;p.inspectWithFFmpeg=async()=>probe();let replacements=0;p.providerRuntime={destroy(){},load:async()=>{},has:()=>true,bytes(){started.resolve();return hold.promise;}};p.selectDeployedRuntime=()=>{};p.replace=async()=>replacements++;
 const pending=p.enqueue(()=>p.select(source,p.settings,false,[]),'opening');await started.promise;const closed=p.close();hold.resolve(new TextEncoder().encode('{}'));await assert.rejects(pending,error=>error.code==='ABORTED');await closed;assert.equal(replacements,0);assert.equal(p.privatePlaybackAssets,undefined);assert.equal(p.privatePlaybackAssetsFailure,undefined);assert.equal(p.inspectionSources.size,0);
});
test('composed cancellation at every inspection phase forbids all later forward publication',()=>{
 const flows=[
  [['configured',{facts:facts()},'prepare'],['prepared',{componentRepairRetry:false},'normal-start'],['normal-start',{fastAllowed:false},'ffmpeg'],['ffmpeg',{probe:probe()},'classify'],['classified',{settings:selected},'assets'],['assets',{},'publish'],['published',{},'discover']],
  [['configured',{facts:facts()},'prepare'],['prepared',{componentRepairRetry:false},'normal-start'],['normal-start',{fastAllowed:true},'fast'],['fast',{probe:probe(),available:['streams'],bytes:4},'classify'],['classified',{settings:selected},'assets'],['assets',{},'fast-admission'],['fast-admission',{missing:[],first:'native-direct'},'publish'],['published',{},'discover']],
  [['configured',{facts:facts({automatic:false,mode:'software',privateRemux:true})},'private-probe'],['private-probe',{probe:probe(),settings:selected},'private-assets'],['private-assets',{},'replace']],
  [['configured',{facts:facts({automatic:false,mode:'software',quality:'balanced'})},'quality'],['quality',{probe:probe(),settings:selected},'replace']]
 ];
 for(const flow of flows)for(let cut=0;cut<flow.length;cut++)for(const retirement of ['caller','close','destroy']){
  let state=initialPlayerControl(),admission=transitionPlayer(state,{type:'operation.admit',kind:'opening'});state=transitionPlayer(admission.state,{type:'operation.start',id:admission.id}).state;const scope={epoch:state.operations.epoch,operation:admission.id};state=transitionPlayer(state,{type:'routing.inspection',...scope,change:{kind:'work.begin',...scope,source:1,provider:false,preserve:false,inspectOnly:false}}).state;const id=state.routing.inspection.work.id;
  for(const [kind,data,expected]of flow.slice(0,cut)){const before=structuredClone(state),old=state;state=transitionPlayer(state,{type:'routing.inspection',...scope,change:{kind:'work.'+kind,id,...data}}).state;assert.deepEqual(old,before);assert.equal(state.routing.inspection.work.phase,expected);}
  state=transitionPlayer(state,retirement==='caller'?{type:'operation.cancel',id:admission.id}:{type:'operation.retire',terminal:retirement==='destroy'}).state;
  for(const [kind,data]of flow.slice(cut)){const next=transitionPlayer(state,{type:'routing.inspection',...scope,change:{kind:'work.'+kind,id,...data}});assert.equal(next.accepted,false);assert.equal(next.state,state);}
  const cleanup=transitionPlayer(state,{type:'routing.inspection',...scope,change:{kind:'work.finished',id,...scope}});assert.equal(cleanup.accepted,true);assert.equal(cleanup.state.routing.inspection.work,null);assert.equal(transitionPlayer(cleanup.state,{type:'routing.inspection',...scope,change:{kind:'work.finished',id,...scope}}).accepted,false);
 }
});

test('actual codec preparation observation cannot invoke a second provider after retirement',async t=>{
 const p=player(t),source=remote();p.sourceInspection={source,probe:probe(),settings:selected};let closed,second=0,route=0;p.providerRuntime={destroy(){},load:async()=>{},codecPreparation(){closed??=p.close();return false;},audioRepairCandidate(){second++;return false;}};p.selectDeployedRuntime=()=>{};p.discover=async()=>route++;
 await assert.rejects(p.enqueue(()=>p.select(source,p.settings,true,[],1),'opening'),error=>error.code==='ABORTED');await closed;assert.equal(second,0);assert.equal(route,0);
});
