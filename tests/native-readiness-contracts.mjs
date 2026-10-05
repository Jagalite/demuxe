// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import {initialNativeBackend} from '../web/generated/internal/machine/native-backend.js';
import {unitPlayer} from './helpers/unit-player.mjs';
import {acceptSourceIdentity} from './helpers/player-control.mjs';
import {Player} from '../web/generated/unified-player.js';
import assert from 'node:assert/strict';
import {NativePlayer} from '../web/generated/internal/native-player.js';
import {bufferingPolicy} from '../web/generated/internal/buffering.js';
import {PlayerError,playerError} from '../web/generated/internal/errors.js';
import {compatibilityFailure} from '../web/generated/internal/runtime-capability.js';
import {StartupEvidenceTimeout} from '../web/generated/internal/runtime-capability.js';
function candidate(overrides={}){const p=Object.create(NativePlayer.prototype);Object.assign(p,{native:initialNativeBackend(),cancelers:new Set(),controlWait:new Map(),eventWaits:new Map(),captionWait:new Map(),captionEffects:new Map(),browserTracks:new Map(),ownedObjectURLs:new Map(),sourceCleanup:Promise.resolve(),captionURLs:new Set(),captionAssets:new Map(),video:{readyState:4,videoWidth:640,currentTime:0,paused:true,seeking:false,error:null,getVideoPlaybackQuality:()=>({totalVideoFrames:0}),cancelVideoFrameCallback(){},...overrides}});return p;}
test('paused current-data preparation does not require vendor counters or presentation',async()=>{const p=candidate();await p.verifyStartup({video:true,audio:true});assert.equal(p.capability.prepared,true);assert.notEqual(p.capability.videoPresented,true);assert.notEqual(p.capability.outputVerified,true);assert.equal(p.cancelers.size,0);});
// Avoid reading unrelated full Native diagnostics in these focused backend tests.
// Advance the injected monotonic clock with shortened deadline timers. Timer
// delivery alone cannot establish that an explicit core deadline has elapsed.
function shortenDeadlineTimers(delay=1){
 const original=globalThis.setTimeout,descriptor=Object.getOwnPropertyDescriptor(performance,'now'),clock=performance.now.bind(performance);let offset=0;
 Object.defineProperty(performance,'now',{configurable:true,value:()=>clock()+offset});
 globalThis.setTimeout=(callback,ms,...args)=>original(()=>{if(ms===10000)offset+=10000-delay;callback(...args);},ms===10000?delay:ms);
 return ()=>{globalThis.setTimeout=original;if(descriptor)Object.defineProperty(performance,'now',descriptor);else delete performance.now;};
}


test('metadata alone and absent presentation cannot verify output',async()=>{const restore=shortenDeadlineTimers();try{const metadata=candidate({readyState:1});await assert.rejects(()=>metadata.verifyStartup({video:true,audio:true}),StartupEvidenceTimeout);assert.notEqual(metadata.capability.prepared,true);const prepared=candidate();prepared.native={...prepared.native,capability:{outputVerified:true,videoPresented:true}};await prepared.verifyStartup({video:true,audio:true});await assert.rejects(()=>prepared.verifyOutput(),StartupEvidenceTimeout);assert.notEqual(prepared.capability.outputVerified,true);}finally{restore();}});
test('zero decoded audio at the short output deadline remains inconclusive',async()=>{const p=candidate({webkitAudioDecodedByteCount:0});await p.verifyStartup({video:true,audio:true});assert.equal(p.capability.prepared,true);const restore=shortenDeadlineTimers();try{await assert.rejects(()=>p.verifyOutput(),StartupEvidenceTimeout);assert.equal(p.cancelers.size,0);}finally{restore();}});
test('Firefox missing selected audio rejects paused A/V preparation',async()=>{const p=candidate({mozHasAudio:false});await assert.rejects(()=>p.verifyStartup({video:true,audio:true}),e=>e.code==='DECODE_FAILED');assert.notEqual(p.capability.prepared,true);assert.equal(p.cancelers.size,0);});
test('Firefox missing audio after preparation rejects output',async()=>{const p=candidate();await p.verifyStartup({video:true,audio:true});p.video.mozHasAudio=false;await assert.rejects(()=>p.verifyOutput(),e=>e.code==='DECODE_FAILED');assert.equal(p.capability.outputVerified,false);assert.equal(p.cancelers.size,0);});
test('media-error classification is single-flight and cancellation retires verification',async()=>{let calls=0,release;const p=candidate({error:{code:4}});p.classifyDirectFailure=()=>{calls++;return new Promise(r=>release=r)};const verification=p.verifyStartup({video:true,audio:true});const rejected=assert.rejects(verification,/cancelled/);await new Promise(r=>setTimeout(r,90));assert.equal(calls,1);for(const cancel of p.cancelers)cancel(Error('cancelled'));await rejected;release(Error('Source transport: HTTP 403'));await new Promise(r=>setTimeout(r,30));assert.equal(calls,1);assert.equal(p.cancelers.size,0);});
test('verified source may complete a short EOF interval without claiming fresh presentation',async()=>{const p=candidate({currentTime:11.995,ended:false});p.native={...p.native,capability:{...p.capability,outputVerified:true}};const output=p.verifyStartup({video:true,audio:true},true);p.video.currentTime=12;p.video.ended=true;await output;assert.equal(p.capability.completedAtEOF,true);assert.equal(p.capability.outputVerified,true);assert.equal(p.capability.videoPresented,false);assert.equal(p.capability.audioProgress,false);});
test('EOF alone never qualifies an unverified source',async()=>{const p=candidate({currentTime:12,ended:true});const restore=shortenDeadlineTimers();try{await assert.rejects(()=>p.verifyStartup({video:true,audio:true},true),StartupEvidenceTimeout);assert.notEqual(p.capability.outputVerified,true);}finally{restore();}});

test('EOF arriving before verification starts completes an already verified session',async()=>{const p=candidate({currentTime:12,ended:true,readyState:2});p.native={...p.native,capability:{...p.capability,outputVerified:true}};await p.verifyStartup({video:true,audio:true},true);assert.equal(p.capability.completedAtEOF,true);assert.equal(p.capability.videoPresented,false);});


test('a plain 200 manifest endpoint permits Native compatibility fallback without file range probing',async()=>{
  const original=globalThis.fetch;let cancelled=false,request;
  globalThis.fetch=async(url,init)=>{request={url,init};return new Response(new ReadableStream({cancel(){cancelled=true;}}),{status:200,headers:{'Content-Type':'application/vnd.apple.mpegurl'}});};
  try{const p=candidate();p.remoteSource={url:'https://media.test/vod.m3u8',format:'hls',credentials:'include'};const failed=new PlayerError('UNSUPPORTED_MEDIA','Browser cannot decode HLS');assert.equal(await p.classifyDirectFailure(failed),failed);assert.equal(compatibilityFailure(failed),true);assert.equal(request.init.credentials,'include');assert.equal(request.init.redirect,'error');assert.equal(new Headers(request.init.headers).has('range'),false);assert.equal(cancelled,true);assert.equal(p.cancelers.size,0);}finally{globalThis.fetch=original;}
});
test('HTTP authorization failure behind a Native manifest decode error remains terminal',async()=>{
  const original=globalThis.fetch;globalThis.fetch=async()=>new Response('denied',{status:403});
  try{const p=candidate();p.remoteSource={url:'https://media.test/vod.m3u8',format:'hls'};const result=await p.classifyDirectFailure(new PlayerError('UNSUPPORTED_MEDIA','Browser rejected manifest'));assert.equal(compatibilityFailure(result),false);assert.equal(playerError(result).code,'SOURCE_PERMISSION');assert.equal(p.cancelers.size,0);}finally{globalThis.fetch=original;}
});
test('retiring Native manifest classification aborts its transport and cannot admit fallback',async()=>{
  const original=globalThis.fetch;let signal,entered;const started=new Promise(resolve=>entered=resolve);
  globalThis.fetch=async(_url,init)=>{signal=init.signal;entered();return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true}));};
  try{const p=candidate();p.remoteSource={url:'https://media.test/vod.m3u8',format:'hls'};const pending=p.classifyDirectFailure(new PlayerError('UNSUPPORTED_MEDIA','Browser rejected manifest'));await started;p.changeNative({type:'stop'});for(const cancel of p.cancelers)cancel(Error('Player is destroyed'));const result=await pending;assert.equal(signal.aborted,true);assert.equal(compatibilityFailure(result),false);assert.equal(p.cancelers.size,0);}finally{globalThis.fetch=original;}
});
test('Native discovered live manifest without permission is terminal rather than a fallback bypass',async()=>{
  const oldLocation=globalThis.location,oldFetch=globalThis.fetch;globalThis.location=new URL('https://app.test/');let fetched=false;globalThis.fetch=async()=>{fetched=true;throw Error('Must not probe after a policy rejection');};
  try{const p=candidate({duration:Infinity,canPlayType:()=> 'probably'});p.loadPlan=async(_source,direct)=>direct();p.load=async()=>{};await assert.rejects(p.openRemote({url:'https://media.test/live.m3u8',format:'hls'}),e=>e.code==='SOURCE_PERMISSION'&&!compatibilityFailure(e));assert.equal(fetched,false);}finally{globalThis.fetch=oldFetch;if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;}
});

test('delayed decoded audio is allowed within the output deadline and records fresh evidence',async()=>{
 const p=candidate({webkitAudioDecodedByteCount:0,paused:false});
 const verified=p.verifyStartup({video:true,audio:true},true);
 setTimeout(()=>{p.video.webkitAudioDecodedByteCount=2048;p.video.currentTime=.1;p.video.getVideoPlaybackQuality=()=>({totalVideoFrames:1});},40);
 await verified;assert.equal(p.capability.outputVerified,true);assert.equal(p.capability.audioObservation.delta,2048);
});
test('video and clock advancement alone cannot verify audio',async()=>{
 const p=candidate({paused:false});const restore=shortenDeadlineTimers(100);
 try{const verified=p.verifyStartup({video:true,audio:true},true);p.video.currentTime=.2;p.video.getVideoPlaybackQuality=()=>({totalVideoFrames:1});await assert.rejects(verified,StartupEvidenceTimeout);assert.notEqual(p.capability.outputVerified,true);assert.equal(p.capability.audioEvidence,'unobservable');}finally{restore();}
});

// Keep the real operation queue and accepted source identity: transport admission
// requires both, and the public queue normalizes failures into operation errors.
test('automatic local and remote output trials preserve position without caching unknown as incompatibility',async()=>{
 for(const [kind,error,allowed] of [['local',new StartupEvidenceTimeout('output'),true],['remote',new StartupEvidenceTimeout('output'),true],['local',new PlayerError('SOURCE_PERMISSION','denied'),false],['remote',new PlayerError('NETWORK_TIMEOUT','transport timed out'),false],['local',new DOMException('activation required','NotAllowedError'),false]]){
  const p=unitPlayer(),properties=new Map([['time-pos',2]]);let selected,cached=0;
  const backend={properties,diagnostics:{plan:'direct'},play:()=>{properties.set('time-pos',9);return Promise.resolve();},pause:async()=>{},verifyOutput:async()=>{throw error;}};
  Object.assign(p,{current:{backend},source:kind==='remote'?{kind,options:{url:'https://media.test/movie.mp4'}}:{kind},automatic:true,settings:{pause:true},nativeRemux:'auto',evidence:()=>({prepared:true}),failedStreamingPlan:()=>undefined,runtimeCapabilities:{update(){}},tierAttempts:{failure(){cached++;}},select:async(...args)=>{selected=args;}});
  Object.defineProperties(p,{mode:{value:'native'},diagnostics:{value:{plan:{id:'native-direct'}}}});
  acceptSourceIdentity(p,1);
  if(allowed){await p.play();assert.equal(selected[5],2);assert.equal(cached,0);assert.equal(p.nativeRemux,'auto');}
  else{await assert.rejects(()=>p.play(),e=>{const expected=playerError(error);assert.equal(e.code,expected.code);assert.equal(e.message,expected.message);assert.equal(e.scope,'operation');assert.ok(Number.isSafeInteger(e.operationId));return true;});assert.equal(selected,undefined);assert.equal(cached,0);}
 }
});

test('enabled browser audio tracks provide explicit presence evidence without vendor counters',async()=>{
 const p=candidate({paused:false,audioTracks:[{enabled:true}]});
 const verified=p.verifyStartup({video:true,audio:true},true);setTimeout(()=>{p.video.currentTime=.1;p.video.getVideoPlaybackQuality=()=>({totalVideoFrames:1});},30);
 await verified;assert.equal(p.capability.audioEvidence,'enabled-browser-audio-track-and-clock');assert.equal(p.capability.audioEvidenceStrength,'presence');assert.equal(p.capability.audioDecoded,false);assert.equal(p.capability.audioObservation.enabledTrack,true);
});
test('disabled browser audio tracks cannot qualify output',async()=>{
 const restore=shortenDeadlineTimers(100);
 try{const p=candidate({paused:false,audioTracks:[{enabled:false}]});const verified=p.verifyStartup({video:true,audio:true},true);setTimeout(()=>{p.video.currentTime=.1;p.video.getVideoPlaybackQuality=()=>({totalVideoFrames:1});},30);await assert.rejects(verified,StartupEvidenceTimeout);}finally{restore();}
});
test('failed play cancels and settles its verifier before allowing a retry',async()=>{
 const p=candidate();await p.verifyStartup({video:true,audio:true});
 const error=new DOMException('activation required','NotAllowedError');
 await assert.rejects(()=>Player.prototype.playNativeVerified.call({},p,new Promise((_,reject)=>setTimeout(()=>reject(error),40))),e=>e===error);
 assert.equal(p.cancelers.size,0);assert.equal(p.capability.outputVerified,false);
 p.video.paused=false;const next=p.verifyOutput();setTimeout(()=>{p.video.webkitAudioDecodedByteCount=2048;p.video.currentTime=.1;p.video.getVideoPlaybackQuality=()=>({totalVideoFrames:1});},30);
 await next;assert.equal(p.capability.outputVerified,true);assert.equal(p.cancelers.size,0);
});

test('audio adapters prefer decoding evidence without upgrading presence to decoded output',async()=>{
 const {observeBrowserAudio}=await import('../web/generated/internal/browser-evidence-adapters.js');
 assert.equal(observeBrowserAudio({webkitAudioDecodedByteCount:4,mozHasAudio:true},true).strength,'decoded');
 assert.equal(observeBrowserAudio({webkitAudioDecodedByteCount:0,mozHasAudio:true},true).ready,false);
 assert.equal(observeBrowserAudio({mozHasAudio:true},true).strength,'presence');
 assert.equal(observeBrowserAudio({audioTracks:[{enabled:true}]},true).strength,'presence');
 assert.equal(observeBrowserAudio({},true).ready,false);
});

test('play rejection cancels subtitle sampling and restoration RPCs without waiting for the worker',async t=>{
 const priorDocument=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{hidden:false}});t.after(()=>{if(priorDocument)Object.defineProperty(globalThis,'document',priorDocument);else delete globalThis.document;});
 const {NativeMpvSubtitles}=await import('../web/generated/internal/native-mpv-subtitles.js');
 for(const phase of ['sample','restore']){
  const service=Object.create(NativeMpvSubtitles.prototype);const sent=[];
  const {initialNativeSubtitleLifetime,changeNativeSubtitleTimeline,changeNativeSubtitlePresentation}=await import('../web/generated/internal/machine/native-subtitle-lifetime.js');
  const lifetime=initialNativeSubtitleLifetime(),catalog=changeNativeSubtitleTimeline(lifetime,lifetime.epoch,{kind:'catalog',tracks:[{id:'1',selected:true,mpvId:1,'ff-index':0,type:'sub'}]}).state,waiting=changeNativeSubtitlePresentation(catalog,lifetime.epoch,{kind:'frame.request'}).state;
  Object.assign(service,{lifetime:waiting,timelineWork:new Map(),pending:new Map(),video:{videoWidth:640,videoHeight:360,duration:10},time:()=>0,frame:{epoch:lifetime.epoch,id:waiting.presentation.frame,handle:1},worker:{postMessage(message){sent.push(message);if(phase==='restore'&&sent.length===1)queueMicrotask(()=>service.completeRequest(message.id,true,{hasOverlay:true,service:{}}));}}});
  const p=candidate();p.mpvSubs=service;
  const denied=new DOMException('blocked','NotAllowedError');
  await assert.rejects(()=>Player.prototype.playNativeVerified.call({},p,new Promise((_,reject)=>setTimeout(()=>reject(denied),30))),e=>e===denied);
  assert.equal(service.pending.size,0);assert.equal(service.verifiedTrack,undefined);assert.equal(sent.length,phase==='sample'?1:2);assert.equal(p.capability.outputVerified,false);
  service.worker.postMessage=message=>queueMicrotask(()=>service.completeRequest(message.id,true,{hasOverlay:true,service:{}}));
  await service.verify();assert.equal(service.verifiedTrack,1);assert.equal(service.pending.size,0);
 }
});

test('short output trials remain inconclusive even with a zero audio counter',async()=>{
 const p=candidate({webkitAudioDecodedByteCount:0,paused:false});
 await p.verifyStartup({video:true,audio:true});
 await assert.rejects(()=>p.verifyOutput(undefined,20),e=>e instanceof StartupEvidenceTimeout&&e.stage==='output');
 assert.equal(p.cancelers.size,0);assert.equal(p.capability.outputVerified,false);
});

test('only automatic unverified local direct output with an admitted alternative gets a short trial',async()=>{
 for(const change of [{},{automatic:false},{source:{kind:'remote',options:{url:'https://media.test/movie.mp4'}}},{nativeRemux:'never'},{verified:true},{planDecisions:[]}]){
  const p=unitPlayer(),budgets=[];
  const backend={properties:new Map([['time-pos',2]]),diagnostics:{plan:'direct-mpv'},play:async()=>{},verifyOutput:async(_signal,budget)=>{budgets.push(budget);}};
  Object.assign(p,{current:{backend},source:{kind:'local'},automatic:true,nativeRemux:'auto',settings:{pause:true},planDecisions:[{id:'hybrid',eligible:true}],evidence:()=>({outputVerified:!!change.verified}),acceptEvidence(){},...change});
  Object.defineProperties(p,{mode:{value:'native'},diagnostics:{value:{plan:{id:'native-direct-mpv'}}}});
  acceptSourceIdentity(p,1);
  await p.play();assert.deepEqual(budgets,[Object.keys(change).length?undefined:1500]);
 }
});

test('inconclusive local direct-mpv output preserves position and restores full verification if fallback assets fail',async()=>{
 const p=unitPlayer(),budgets=[],seeks=[];let selected,cached=0;
 const backend={properties:new Map([['time-pos',2]]),diagnostics:{plan:'direct-mpv'},play:async()=>{},seek:async time=>{seeks.push(time);},verifyOutput:async(_signal,budget)=>{budgets.push(budget);if(budgets.length===1)throw new StartupEvidenceTimeout('output');}};
 Object.assign(p,{current:{backend},source:{kind:'local'},automatic:true,nativeRemux:'auto',settings:{pause:true},planDecisions:[{id:'hybrid',eligible:true}],evidence:()=>({prepared:true}),acceptEvidence(){},failedStreamingPlan:()=>undefined,runtimeCapabilities:{update(){}},tierAttempts:{failure(){cached++;}},select:async(...args)=>{selected=args;assert.equal(p.nativeRemux,'auto');assert.deepEqual(args[8],{nativeRemux:'always'});throw new PlayerError('ASSET_LOAD_FAILED','missing fallback');}});
 Object.defineProperties(p,{mode:{value:'native'},diagnostics:{value:{plan:{id:'native-direct-mpv'}}}});
 acceptSourceIdentity(p,1);
 await p.play();assert.deepEqual(seeks,[2]);assert.deepEqual(budgets,[1500,undefined]);assert.equal(selected[5],2);assert.equal(cached,0);assert.equal(p.nativeRemux,'auto');assert.equal(p.settings.pause,false);
});

test('a short trial never retries the original route after terminal fallback errors',async()=>{
 for(const error of [new PlayerError('SOURCE_PERMISSION','denied'),new DOMException('cancelled','AbortError'),new DOMException('activation required','NotAllowedError')]){
  const p=unitPlayer();let verifications=0;
  const backend={properties:new Map([['time-pos',2]]),diagnostics:{plan:'direct-mpv'},play:async()=>{},verifyOutput:async()=>{verifications++;throw new StartupEvidenceTimeout('output');}};
  Object.assign(p,{current:{backend},source:{kind:'local'},automatic:true,nativeRemux:'auto',settings:{pause:true},planDecisions:[{id:'hybrid',eligible:true}],evidence:()=>({prepared:true}),failedStreamingPlan:()=>undefined,runtimeCapabilities:{update(){}},tierAttempts:{failure(){assert.fail('Unknown output must not poison admission');}},select:async()=>{throw error;}});
  Object.defineProperties(p,{mode:{value:'native'},diagnostics:{value:{plan:{id:'native-direct-mpv'}}}});
  acceptSourceIdentity(p,1);
  await assert.rejects(()=>p.play(),e=>{const expected=playerError(error);assert.equal(e.code,expected.code);assert.equal(e.message,expected.message);assert.equal(e.scope,'operation');assert.ok(Number.isSafeInteger(e.operationId));return true;});assert.equal(verifications,1);assert.equal(p.nativeRemux,'auto');
 }
});
