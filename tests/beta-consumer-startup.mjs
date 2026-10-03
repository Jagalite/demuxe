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

test('pure imported worker policy and bridge helpers are not executable engine roots',()=>{const f=facts();f.requests=['web/generated/internal/runtime-worker.js','web/generated/internal/machine/io-worker.js','web/generated/internal/machine/remux-worker.js','web/worker-remux-controller.js'].map(name=>({url:new URL(name,assetBase).href,method:'GET'}));clean(f);});

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
