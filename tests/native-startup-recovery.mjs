// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {Player} from '../web/generated/unified-player.js';
import {initialPlayerControl} from '../web/generated/internal/machine/state.js';
import {transitionPlayer} from '../web/generated/internal/machine/transition.js';
import {BrowserCaptionUnsupported} from '../web/generated/internal/plain-vtt.js';
import {NativeLoadTimeout,StartupEvidenceTimeout} from '../web/generated/internal/runtime-capability.js';
import {PlayerError} from '../web/generated/internal/errors.js';

function discovery(remuxFailure,options={}){
 const player=Object.create(Player.prototype),source=options.remote?{kind:'remote',url:'https://example.test/sample.mkv',options:{}}:{kind:'local',file:new File(['fixture'],'sample.mkv')};
 const settings={aid:'auto',sid:'auto',subtitles:true,vf:'',af:'',gain:1};
 const attempts=[],plans=options.plans??[{id:'native-direct-mpv',mode:'native',eligible:true},{id:'native-remux-mpv',mode:'native',eligible:true},{id:'hybrid',mode:'hybrid',eligible:true}];
 Object.assign(player,{startupEscalation:options.disabled?undefined:{prefetchAfterMs:options.prefetch??400,switchAfterMs:options.switch??500},control:transitionPlayer(initialPlayerControl(),{type:'routing.deployment',epoch:0,operation:null,change:{kind:'configure',selection:{policy:'auto',runtime:'pthread',isolated:true,jspi:false}}}).state,operationResources:new Map(),admissionContext:{},sourceInspection:{source,probe:{format:options.format??'matroska',tracks:[]}},
  runtimeCapabilities:{begin(){},admission(){},update(){}},tierAttempts:{reason(){},failure(){}},
  assertOperation(){},admissible(){return plans;},record(){},acceptEvidence(){},inspectForQualifiedWebGPU:async()=>{},
  replace:async(_source,_mode,_settings,_preserve,_tracks,_target,_automatic,id,budget)=>{
   attempts.push({id,budget});
   if(id==='native-direct-mpv')throw options.directFailure??new NativeLoadTimeout('loadeddata',budget??25000);
   if(id==='native-remux-mpv')throw remuxFailure;
  },
 });
 return {player,attempts,run:pinned=>player.discover(source,settings,false,[],undefined,true,pinned)};
}
test('shared subtitle failure skips the full direct retry and reaches Hybrid',async()=>{
 const d=discovery(new BrowserCaptionUnsupported('Subtitle packet deadline exceeded'));await d.run();
 assert.deepEqual(d.attempts.map(a=>a.id),['native-direct-mpv','native-remux-mpv','hybrid']);
 assert.equal(d.attempts[0].budget,500);
});
test('remote output deadlines advance through native alternatives to a working route',async()=>{
 const timeout=new StartupEvidenceTimeout('output',2000),d=discovery(timeout,{remote:true,directFailure:timeout});
 await d.run();assert.deepEqual(d.attempts.map(a=>a.id),['native-direct-mpv','native-remux-mpv','hybrid']);
});
test('source permission remains terminal and never falls through to Hybrid',async()=>{
 const failure=new PlayerError('SOURCE_PERMISSION','Denied'),d=discovery(failure);
 await assert.rejects(d.run(),error=>error===failure);
 assert.deepEqual(d.attempts.map(a=>a.id),['native-direct-mpv','native-remux-mpv']);
});
test('missing remux assets retain the full-budget original retry',async()=>{
 const d=discovery(new PlayerError('ASSET_LOAD_FAILED','Missing remux assets'));
 await assert.rejects(d.run(),NativeLoadTimeout);
 assert.deepEqual(d.attempts.map(a=>a.id),['native-direct-mpv','native-remux-mpv','native-direct-mpv']);
 assert.equal(d.attempts[2].budget,25000);
});

test('non-Matroska files use custom escalation budgets too',async()=>{
 const d=discovery(new BrowserCaptionUnsupported('No captions'),{format:'mov,mp4',prefetch:100,switch:250});await d.run();assert.equal(d.attempts[0].budget,250);
});
test('disabling escalation retains the ordinary direct deadline',async()=>{
 const d=discovery(new BrowserCaptionUnsupported('No captions'),{disabled:true});await d.run();assert.equal(d.attempts[0].budget,undefined);
});
test('without remux the next admitted Hybrid tier receives the short native timeout',async()=>{
 const d=discovery(undefined,{plans:[{id:'native-direct-mpv',mode:'native',eligible:true},{id:'hybrid',mode:'hybrid',eligible:true}]});await d.run();assert.deepEqual(d.attempts.map(a=>a.id),['native-direct-mpv','hybrid']);assert.equal(d.attempts[0].budget,500);
});
test('without an eligible fallback direct retains its full load deadline',async()=>{
 const d=discovery(undefined,{plans:[{id:'native-direct-mpv',mode:'native',eligible:true}]});await assert.rejects(d.run(),NativeLoadTimeout);assert.equal(d.attempts[0].budget,undefined);
});

test('pinned Native never prefetches or shortens for an out-of-mode Hybrid fallback',async()=>{
 const d=discovery(undefined,{plans:[{id:'native-direct-mpv',mode:'native',eligible:true},{id:'hybrid',mode:'hybrid',eligible:true}]});await assert.rejects(d.run('native'),NativeLoadTimeout);assert.equal(d.attempts[0].budget,undefined);assert.equal(d.attempts.length,1);
});
test('previously rejected alternatives do not justify a shortened direct deadline',async()=>{
 const d=discovery(undefined);d.player.tierAttempts.reason=(_source,_configuration,id)=>id==='native-direct-mpv'?undefined:'rejected';await assert.rejects(d.run(),NativeLoadTimeout);assert.equal(d.attempts[0].budget,undefined);
});

function nativePlayGate(){
 const player=Object.create(Player.prototype);Object.defineProperty(player,'activeOperation',{value:undefined});return player;
}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function outputVerifier(){
 const output=deferred();let signal;
 return {output,get signal(){return signal;},backend:{verifyOutput(value){signal=value;if(value.aborted)output.reject(new Error('Output aborted'));else value.addEventListener('abort',()=>output.reject(new Error('Output aborted')),{once:true});return output.promise;}}};
}
test('verified native output completes while the media play acknowledgement remains pending',async()=>{
 const playing=deferred(),v=outputVerifier(),run=nativePlayGate().playNativeVerified(v.backend,playing.promise);
 v.output.resolve();await run;assert.equal(v.signal.aborted,true);
 // A late media acknowledgement failure remains handled after positive output.
 playing.reject(new Error('Retired media play'));await new Promise(resolve=>setImmediate(resolve));
});
test('a successful play acknowledgement cannot bypass native output verification',async()=>{
 const v=outputVerifier();let complete=false;const run=nativePlayGate().playNativeVerified(v.backend,Promise.resolve()).finally(()=>{complete=true;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(complete,false);
 const failure=new Error('No executed output');v.output.reject(failure);await assert.rejects(run,error=>error===failure);
});
test('an early media play rejection aborts the owned native output verifier',async()=>{
 const playing=deferred(),v=outputVerifier(),failure=new Error('Autoplay denied'),run=nativePlayGate().playNativeVerified(v.backend,playing.promise);
 await Promise.resolve();playing.reject(failure);await assert.rejects(run,error=>error===failure);assert.equal(v.signal.aborted,true);
});
test('retiring the play intent cancels native output verification with pending acknowledgement',async()=>{
 const intent=new AbortController(),v=outputVerifier(),run=nativePlayGate().playNativeVerified(v.backend,new Promise(()=>{}),undefined,intent.signal);
 await Promise.resolve();intent.abort();await assert.rejects(run,/Output aborted/);assert.equal(v.signal.aborted,true);
});
