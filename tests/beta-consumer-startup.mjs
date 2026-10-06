// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
import {startupEscalationPolicy} from '../web/generated/internal/startup-escalation.js';
import {startupPreparation,startupFallbackPlan} from '../web/generated/internal/machine/startup.js';
const source=ts.createSourceFile('beta-consumer.mjs',fs.readFileSync(new URL('./beta-consumer.mjs',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const classifier=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='classifyDirectStartupTraffic');assert.ok(classifier,'Consumer classifier remains bound into the hashed consumer script');
const classify=vm.runInNewContext('('+classifier.getText(source)+')',{URL});
const assetBase='https://example.test/vendor/demuxe/',path='web/engine-remux/remux.wasm',url=new URL(path,assetBase).href;
const facts=()=>({name:'automatic-local',mode:'native',plan:'native-direct',openPlan:'native-direct',runtime:'pthread',assetBase,manifestFiles:{[path]:{sha256:'immutable-release-sha256'}},requests:[],workers:[],observation:{policy:startupEscalationPolicy(),timeOrigin:0,openStarted:1000,instantiations:0,fetches:[]}});
const prefetch=()=>{const f=facts();f.requests=[{url,method:'GET'}];f.observation.fetches=[{url,at:1400,priority:'low'}];return f;};
const clean=f=>assert.equal(classify(f).violations.length,0,JSON.stringify(classify(f)));
const rejected=f=>assert.ok(classify(f).violations.length>0,JSON.stringify(f));
test('default direct startup accepts no work or precisely timed immutable remux prefetch',()=>{assert.deepEqual(startupEscalationPolicy(),{prefetchAfterMs:400,switchAfterMs:500});assert.equal(startupPreparation('native-remux','pthread',false,{backend:'NativePlayer'}).path,path);clean(facts());clean(prefetch());});
test('runtime-selected prefetch path follows the actual startup recipe',()=>{for(const runtime of ['jspi','asyncify']){const f=prefetch(),p=startupPreparation('native-remux',runtime,false,{backend:'NativePlayer'}).path;f.runtime=runtime;f.manifestFiles={[p]:{sha256:'immutable'}};f.requests[0].url=f.observation.fetches[0].url=new URL(p,assetBase).href;clean(f);}});
test('pinned native keeps in-tier prefetch while disabled startup never accepts engine bodies',()=>{const pinned=prefetch();pinned.name='native-no-isolation';clean(pinned);assert.equal(startupFallbackPlan(true,'native-direct','native-remux',[{id:'native-remux',included:true,eligible:true,fallback:true,rejected:false}]),'native-remux');const disabled=facts();disabled.name='automatic-local-escalation-disabled';disabled.observation.policy=startupEscalationPolicy(false)??null;clean(disabled);disabled.requests=prefetch().requests;disabled.observation.fetches=prefetch().observation.fetches;rejected(disabled);});
test('early, untimed, elevated-priority, repeated or unmanifested prefetch is rejected',()=>{for(const change of [f=>f.observation.fetches[0].at=1399,f=>f.observation.fetches=[],f=>f.observation.fetches[0].priority='high',f=>f.requests.push({...f.requests[0]}),f=>f.manifestFiles={}]){const f=prefetch();change(f);rejected(f);}});
test('other engine binaries, module bodies and inspector scripts remain forbidden',()=>{for(const suffix of ['web/engine-hybrid/player.wasm','web/engine-remux/remux.mjs','web/native-remux-worker.js','web/source-probe.js','web/engine-remux/remux.wasm?unexpected']){const f=prefetch();f.requests[0].url=f.observation.fetches[0].url=new URL(suffix,assetBase).href;rejected(f);}});
test('transient workers, Wasm instantiation and route changes cannot masquerade as warming',()=>{for(const change of [f=>f.workers.push('blob:retired-inspector'),f=>f.observation.instantiations=1,f=>f.plan='native-remux',f=>f.mode='hybrid']){const f=facts();change(f);rejected(f);}});

test('pure manifested worker policy and bridge helpers are not executable engine roots',()=>{const f=facts();f.requests=['web/generated/internal/runtime-worker.js','web/generated/internal/machine/io-worker.js','web/generated/internal/machine/remux-worker.js','web/worker-remux-controller.js'].map(name=>{f.manifestFiles[name]={sha256:'immutable'};return{url:new URL(name,assetBase).href,method:'GET'};});clean(f);});
test('direct startup rejects foreign and unmanifested executable bodies, including uppercase extensions',()=>{
 for(const name of ['automatic-local','automatic-local-escalation-disabled'])for(const url of ['https://foreign.test/extra.js','https://foreign.test/extra.mjs','https://foreign.test/EXTRA.JS','https://foreign.test/EXTRA.MJS','https://foreign.test/EXTRA.WASM',new URL('web/unmanifested.js',assetBase).href,new URL('web/generated/internal/unmanifested.js',assetBase).href,new URL(path+'?unselected',assetBase).href]){const f=facts();f.name=name;if(name.endsWith('-disabled'))f.observation.policy=null;f.requests=[{url,method:'GET'}];rejected(f);}
 const f=facts(),name='web/worker-remux-controller.js';f.manifestFiles[name]={sha256:'immutable'};f.requests=[{url:new URL(name,assetBase).href,method:'POST'}];rejected(f);
});

function fallback(){const f=prefetch();f.openPlan=f.plan='native-remux';f.openStartedAt=1000;f.attempts=[{mode:'native',outcome:'failed',reason:'native-direct: NativeLoadTimeout: Native loadeddata timed out'},{mode:'native',outcome:'selected',reason:'native-remux: Playback requirements and actual startup accepted'}];f.backend={path:'native',plan:'remux',remux:{remux:{transport:'pthread'}}};const paths=['web/native-mse-worker.js','web/native-remux-source-worker.js','web/native-remux-worker.js','web/engine-remux/remux.mjs'];for(const path of paths){const u=new URL(path,assetBase).href;f.requests.push({url:u,method:'GET',at:1500});f.manifestFiles[path]={sha256:'immutable'};}f.workers=paths.slice(0,3).map(path=>new URL(path,assetBase).href);f.workerEvents=f.workers.map(url=>({url,at:1500}));return f;}
test('observed default timeout allows only the selected native remux recipe after500ms',()=>{clean(fallback());const f=fallback();f.name='native-no-isolation';clean(f);});
test('wrong route, missing timeout, premature execution and unselected workers fail fallback admission',()=>{for(const change of [f=>f.openPlan='native-direct',f=>f.attempts=[],f=>f.attempts[0].reason='native-direct: Other error',f=>f.workerEvents[0].at=1499,f=>f.requests[1].at=1499,f=>f.workerEvents[0].url='blob:unselected',f=>f.workers.push('blob:hidden'),f=>f.backend.remux.remux.transport='asyncify',f=>f.plan='hybrid-retained']){const f=fallback();change(f);rejected(f);}});

test('fallback timing starts at actual browser player.open, not earlier host dispatch',()=>{const f=fallback();f.observation.timeOrigin=100;rejected(f);const missing=fallback();delete missing.observation.timeOrigin;rejected(missing);});
test('worker timing evidence must match every observed URL in order',()=>{const f=fallback();[f.workerEvents[0],f.workerEvents[1]]=[f.workerEvents[1],f.workerEvents[0]];rejected(f);});

const assNode=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='classifyAssStartupTraffic');assert.ok(assNode);
const classifyAss=vm.runInNewContext('('+assNode.getText(source)+')',{URL});
function assFacts(fallback=false){
 const f=facts();f.plan=f.openPlan=fallback?'native-remux-mpv':'native-direct-mpv';
 f.attempts=[{mode:'probe',outcome:'skipped',reason:'Fast local metadata:65536 bytes; Matroska alternate tracks need FFmpeg selection'},...(fallback?[{mode:'native',outcome:'failed',reason:'native-direct-mpv: NativeLoadTimeout: Native loadeddata timed out'}]:[]),{mode:'native',outcome:'selected',reason:f.plan+': Playback requirements and actual startup accepted'}];
 f.backend={path:'native',plan:fallback?'remux-mpv':'direct-mpv',mpvSubtitles:{bitmapUpdates:1,route:fallback?'native-remux + mpv-subtitles':'native-direct + mpv-subtitles'},...(fallback?{remux:{remux:{transport:'pthread'}}}:{})};
 const paths=['web/native-remux-source-worker.js','web/native-remux-worker.js',...fallback?['web/native-remux-source-worker.js','web/native-remux-worker.js']:[],'web/mpv-subtitle-worker.js','web/io-worker.js','web/engine-subtitles/service.mjs'];
 f.workers=paths.map(path=>new URL(path,assetBase).href);f.workerEvents=f.workers.map((url,index)=>({url,at:index<2?1100:1500}));
 f.manifestFiles={};for(const path of [...paths,'web/source-probe.js','web/engine-remux/remux.mjs','web/engine-remux/remux.wasm','web/engine-subtitles/service.wasm'])f.manifestFiles[path]={sha256:'immutable'};
 f.requests=Object.keys(f.manifestFiles).map(path=>({url:new URL(path,assetBase).href,method:'GET',status:200,at:1100}));f.browserRequests=f.requests.map(({status,...request})=>request);return f;
}
const assClean=f=>assert.equal(classifyAss(f).violations.length,0,JSON.stringify(classifyAss(f)));
const assRejected=f=>assert.ok(classifyAss(f).violations.length>0,JSON.stringify(f));
test('ASS accepts required inspection and rendered subtitles on direct native route',()=>assClean(assFacts()));
test('ASS accepts a separate timed remux fallback preserving required subtitle execution',()=>{
 assert.equal(startupFallbackPlan(true,'native-direct-mpv','native-remux-mpv',[{id:'native-remux-mpv',included:true,eligible:true,fallback:true,rejected:false}]),'native-remux-mpv');assClean(assFacts(true));
});
test('ASS cannot admit premature fallback, missing timeout/inspection, wrong recipe or invisible subtitles',()=>{
 for(const change of [f=>f.workerEvents[2].at=1499,f=>f.observation.timeOrigin=100,f=>delete f.observation.timeOrigin,f=>f.attempts.splice(1,1),f=>f.attempts[1].reason='native-direct-mpv: UnexpectedError',f=>f.attempts.shift(),f=>f.openPlan='native-direct-mpv',f=>f.mode='software',f=>f.plan='native-remux',f=>f.backend.remux.remux.transport='asyncify',f=>f.backend.mpvSubtitles.bitmapUpdates=0,f=>f.backend.mpvSubtitles.route='wrong',f=>f.observation.instantiations=1]){const f=assFacts(true);change(f);assRejected(f);}
});
test('ASS rejects unknown, reordered, missing or unmanifested executable work',()=>{
 for(const change of [f=>{const url=new URL('web/source-probe.js',assetBase).href;f.workers.push(url);f.workerEvents.push({url,at:1600});},f=>f.workers.push('blob:unexpected'),f=>f.workerEvents[0].url='blob:unexpected',f=>f.workerEvents.reverse(),f=>f.manifestFiles={},f=>f.requests=[],f=>f.requests.push({url:new URL('web/engine-software-yuv/player.wasm',assetBase).href,method:'GET',at:1600}),f=>f.requests[0].at=999,f=>f.requests[0].status=404,f=>f.requests[0].status=null,f=>{f.workers.splice(2,1);f.workerEvents.splice(2,1);}]){const f=assFacts(true);change(f);assRejected(f);}
});
test('ASS direct admission never hides a failed route or extra remux session',()=>{const f=assFacts();f.attempts.unshift({mode:'native',outcome:'failed',reason:'native-direct-mpv: NativeLoadTimeout: Native loadeddata timed out'});assRejected(f);const g=assFacts();g.workerEvents.push({...g.workerEvents[0]});g.workers.push(g.workers[0]);assRejected(g);});

test('ASS server completions cannot hide observed foreign or unserved executable requests',()=>{
 for(const url of ['https://unselected.test/EXTRA.MJS','https://unselected.test/EXTRA.JS','https://unselected.test/EXTRA.WASM','https://unselected.test/extra.mjs','https://unselected.test/web/generated/internal/extra.js',new URL('web/unmanifested.js',assetBase).href,'https://unselected.test/engine-other/player.wasm',new URL('web/engine-software-yuv/player.wasm',assetBase).href,new URL('web/source-probe.js?unselected',assetBase).href]){const f=assFacts(true);f.browserRequests.push({url,method:'GET',at:1600});assRejected(f);}
});

test('ASS ordinary manifested imports before open stay legal while hidden unmanifested scripts fail',()=>{
 const f=assFacts(),path='web/generated/internal/machine/startup.js',url=new URL(path,assetBase).href;
 f.manifestFiles[path]={sha256:'immutable'};f.requests.push({url,method:'GET',status:200,at:900});f.browserRequests.push({url,method:'GET',at:900});assClean(f);
 const unknown=assFacts();unknown.requests.push({url:new URL('web/unmanifested.js',assetBase).href,method:'GET',status:200,at:1600});assRejected(unknown);
});

const phaseNode=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='classifyPlaybackPhase');assert.ok(phaseNode);
const classifyPhase=vm.runInNewContext('('+phaseNode.getText(source)+')',{URL});
function phaseFacts(recovery=false){
 const phase={at:1000,firefox:false,mode:'native',state:{status:'playing',currentTime:.4,sourceId:1,pendingOperation:null},audioCounterAvailable:true,observation:{instantiations:0},verifications:[],requests:[],browserRequests:[],workers:[],workerEvents:[],diagnostics:{plan:{id:'native-direct'},remuxRuntime:{runtime:'pthread'},backend:{path:'native',plan:'direct'},selection:{attempts:[]},runtimeCapabilities:[{planId:'native-direct',evidence:{outputVerified:true,videoPresented:true,audioProgress:true,audioDecoded:true}}]}};
 const previous=structuredClone(phase),current=structuredClone(phase),f={name:'automatic-local',previous,current,phase:'first-play',assetBase,manifestFiles:{}};
 if(recovery){
  current.at=3000;current.diagnostics.plan.id='native-remux';current.diagnostics.backend={path:'native',plan:'remux',remux:{mseOwner:'worker',remux:{transport:'pthread'}}};current.diagnostics.runtimeCapabilities[0].planId='native-remux';
  current.verifications=[{phase:'first-play',started:1000,finished:2500,budget:1500,plan:'native-direct',automatic:true,sourceKind:'local',nativeRemux:'auto',error:{name:'StartupEvidenceTimeout',message:'Native output evidence timed out',stage:'output',evidenceTimeout:true}}];
  current.diagnostics.selection.attempts=[{mode:'native',outcome:'skipped',reason:'native-direct: This source policy requires controlled remux transport'},{mode:'native',outcome:'selected',reason:'native-remux: Playback requirements and actual startup accepted'}];
  const paths=['web/native-remux-source-worker.js','web/native-remux-worker.js','web/native-mse-worker.js','web/engine-remux/remux.mjs','web/engine-remux/remux.wasm','web/source-probe.js'];
  current.requests=paths.map(path=>({url:new URL(path,assetBase).href,at:2501,method:'GET',status:200}));current.browserRequests=structuredClone(current.requests);current.workers=paths.slice(0,3).map(path=>new URL(path,assetBase).href);current.workerEvents=current.workers.map(url=>({url,at:2501}));f.manifestFiles=Object.fromEntries(paths.map(path=>[path,{sha256:'immutable'}]));
 }
 return f;
}
const phaseClean=f=>assert.equal(classifyPhase(f).violations.length,0,JSON.stringify(classifyPhase(f)));
const phaseRejected=f=>assert.ok(classifyPhase(f).violations.length>0,JSON.stringify(f));
test('first-play separately accepts verified unchanged direct output or exact bounded output recovery',()=>{phaseClean(phaseFacts());phaseClean(phaseFacts(true));});
function firefoxRecovery(){
 const f=phaseFacts(true);f.previous.firefox=f.current.firefox=true;
 const failure=f.current.verifications[0];failure.budget=500;failure.finished=1500;
 delete f.current.diagnostics.backend.remux.mseOwner;
 const mse=new URL('web/native-mse-worker.js',assetBase).href;
 f.current.workers=f.current.workers.filter(url=>url!==mse);f.current.workerEvents=f.current.workerEvents.filter(event=>event.url!==mse);
 f.current.requests=f.current.requests.filter(request=>request.url!==mse);
 // Firefox does not report worker-imported module requests to Playwright.
 // The case-scoped server still records the completed module response.
 f.current.browserRequests=f.current.requests.filter(request=>!request.url.endsWith('remux.mjs'));
 return f;
}
test('Firefox recovery uses its 500ms output policy, window MSE and completed worker-import HTTP proof',()=>{
 const f=firefoxRecovery();phaseClean(f);
 const ass=firefoxRecovery();ass.name='automatic-ass';
 for(const phase of [ass.previous,ass.current]){
  phase.diagnostics.plan.id+='-mpv';phase.diagnostics.backend.plan+='-mpv';phase.diagnostics.backend.mpvSubtitles={bitmapUpdates:1};phase.diagnostics.runtimeCapabilities[0].planId+='-mpv';
 }
 ass.current.verifications[0].plan='native-direct-mpv';
 ass.current.diagnostics.selection.attempts=[{mode:'native',outcome:'skipped',reason:'native-direct-mpv: Source policy requires controlled remux transport'},{mode:'native',outcome:'selected',reason:'native-remux-mpv: Playback requirements and actual startup accepted'}];phaseClean(ass);
});
test('Firefox recovery still rejects wrong deadlines, premature fallback, missing bodies and missing required workers',()=>{
 for(const mutate of [f=>f.current.verifications[0].budget=1500,f=>f.current.verifications[0].finished=1499,f=>delete f.previous.firefox,f=>f.current.firefox=false,f=>f.current.workerEvents[0].at=1499,f=>f.current.requests.find(r=>r.url.endsWith('remux.mjs')).status=404,f=>f.current.requests=f.current.requests.filter(r=>!r.url.endsWith('remux.mjs')),f=>{f.current.workers.shift();f.current.workerEvents.shift();},f=>f.current.diagnostics.backend.remux.mseOwner='worker',f=>f.current.diagnostics.backend.remux.mseOwner='unknown']){const f=firefoxRecovery();mutate(f);phaseRejected(f);}
});
test('play recovery rejects absent, wrong, short or nonautomatic original verification failures',()=>{
 for(const mutate of [f=>f.current.verifications=[],f=>f.current.verifications[0].budget=500,f=>f.current.verifications[0].finished=2499,f=>f.current.verifications[0].error.name='Error',f=>f.current.verifications[0].error.stage='metadata',f=>f.current.verifications[0].automatic=false,f=>f.current.verifications[0].sourceKind='remote',f=>f.current.verifications[0].nativeRemux='always',f=>f.current.diagnostics.selection.attempts=[],f=>f.current.diagnostics.plan.id='hybrid',f=>f.current.diagnostics.backend.remux.remux.transport='jspi',f=>f.current.diagnostics.runtimeCapabilities[0].evidence.audioDecoded=false]){const f=phaseFacts(true);mutate(f);phaseRejected(f);}
});
test('post-open traffic still rejects premature, foreign and unselected executables and workers',()=>{
 for(const mutate of [f=>f.current.workerEvents[0].at=2499,f=>f.current.requests[0].at=2499,f=>f.current.requests.push({url:'https://foreign.test/extra.mjs',method:'GET',at:2501}),f=>f.current.browserRequests.push({url:new URL('web/engine-hybrid/player.wasm',assetBase).href,method:'GET',at:2501}),f=>f.current.workers.push('blob:hidden')]){const f=phaseFacts(true);mutate(f);phaseRejected(f);}
 const f=phaseFacts();f.current.requests.push({url:new URL('web/source-probe.js',assetBase).href,method:'GET',at:1001});f.manifestFiles['web/source-probe.js']={sha256:'immutable'};phaseRejected(f);
});
test('seek/replay cannot relabel an unobserved route change as initial-play recovery',()=>{const f=phaseFacts(true);f.phase='controls';f.current.state.currentTime=1.2;phaseRejected(f);});
test('captured phase snapshots do not mutate when later traffic or diagnostics change',async()=>{
 const node=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='captureStartupPhase');const capture=vm.runInNewContext('('+node.getText(source)+')',{structuredClone});
 const f=phaseFacts(),row={requestDetails:[],workerURLs:[],workerEvents:[]};const snapshot=await capture({evaluate:async()=>f.previous},row,'open');row.workerURLs.push('late-worker');row.requestDetails.push({url:'late'});f.previous.diagnostics.plan.id='native-remux';assert.equal(snapshot.workers.length,0);assert.equal(snapshot.requests.length,0);assert.equal(snapshot.diagnostics.plan.id,'native-direct');
});
test('observational verifier forwards actual arguments, resolution and original rejection unchanged',async()=>{
 const node=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='observeStartupVerification');let at=10,received;const error=Object.assign(Error('Native output evidence timed out'),{name:'StartupEvidenceTimeout',stage:'output',evidenceTimeout:true});
 const player={diagnostics:{plan:{id:'native-direct'}},automatic:true,source:{kind:'local'},nativeRemux:'auto',playNativeVerified(...args){received={self:this,args};return args[0]==='failure'?Promise.reject(error):Promise.resolve('exact-value');}};
 const context={player,performance:{timeOrigin:100,now:()=>at++}};context.window=context;vm.runInNewContext('('+node.getText(source)+')()',context);const intent={};assert.equal(await player.playNativeVerified('success',undefined,1500,intent),'exact-value');assert.equal(received.self,player);assert.equal(received.args[3],intent);await assert.rejects(player.playNativeVerified('failure',undefined,1500,intent),e=>e===error);assert.equal(context.startupVerifications[1].error.stage,'output');
});

test('phase identity, completion, and verifier clock bounds cannot be omitted or replaced',()=>{for(const mutate of [f=>f.current.state.sourceId=2,f=>f.current.state.pendingOperation={kind:'opening'},f=>delete f.current.verifications[0].finished,f=>f.current.verifications[0].finished=3001,f=>f.current.verifications[0].started=999]){const f=phaseFacts(true);mutate(f);phaseRejected(f);}});

const selectorNode=source.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='selectConsumerCases');assert.ok(selectorNode);
const selectCases=vm.runInNewContext('('+selectorNode.getText(source)+')');
test('standard consumer scope stays fixed while explicit optional selection remains available',()=>{const standard=['standard-a','standard-b'],available=[...standard,'optional'];assert.equal(JSON.stringify(selectCases(standard,available,undefined)),JSON.stringify(standard));assert.equal(JSON.stringify(selectCases(standard,available,'all')),JSON.stringify(available));assert.equal(JSON.stringify(selectCases(standard,available,'optional,standard-a')),JSON.stringify(['optional','standard-a']));});
test('consumer selection rejects unknown, empty, duplicate and unavailable optional cases',()=>{for(const value of ['',',','standard-a,','standard-a,standard-a','missing','optional'])assert.throws(()=>selectCases(['standard-a'],['standard-a'],value));});

test('consumer live loop invokes the scope selector and records exact selected identities',()=>{const text=source.getFullText();assert.match(text,/const selectedCases=selectConsumerCases\(standardCases,cases,process\.env\.CASES\),workerRetries=new Map\(\);result\.caseSelection=\[\.\.\.selectedCases\]/);assert.doesNotMatch(text,/selectedCases=cases\.filter/);assert.match(text,/result\.cases\.length===result\.caseSelection\?\.length/);});
test('ASS load defers only bitmap output; first-play still requires actual rendered subtitle evidence',()=>{
 const loading=assFacts();loading.requireBitmap=false;loading.backend.mpvSubtitles.bitmapUpdates=0;assert.equal(classifyAss(loading).violations.length,0);
 const f=phaseFacts();f.name='automatic-ass';for(const value of [f.previous,f.current]){value.diagnostics.plan.id='native-direct-mpv';value.diagnostics.backend={path:'native',plan:'direct-mpv',mpvSubtitles:{bitmapUpdates:1}};value.diagnostics.runtimeCapabilities[0].planId='native-direct-mpv';}phaseClean(f);f.current.diagnostics.backend.mpvSubtitles.bitmapUpdates=0;phaseRejected(f);
});
test('native audio evidence retains Firefox presence limits and requires decoder counters when exposed',()=>{const f=phaseFacts();f.current.audioCounterAvailable=false;f.current.diagnostics.runtimeCapabilities[0].evidence.audioDecoded=false;phaseClean(f);f.current.audioCounterAvailable=true;phaseRejected(f);});

test('fixture preparation normalizes explicit case names exactly like live selection',()=>{const text=source.getFullText();assert.match(text,/process\.env\.CASES\.split\(','\)\.map\(name=>name\.trim\(\)\)\.includes\('native-remux'\)/);assert.match(text,/process\.env\.CASES\.split\(','\)\.map\(name=>name\.trim\(\)\)\.some\(name=>/);assert.equal(JSON.stringify(selectCases(['native-remux'],['native-remux'],' native-remux ')),JSON.stringify(['native-remux']));});
