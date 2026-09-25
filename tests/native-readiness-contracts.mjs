// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';import assert from 'node:assert/strict';
import {NativePlayer} from '../web/generated/internal/native-player.js';
import {bufferingPolicy} from '../web/generated/internal/buffering.js';
import {PlayerError,playerError} from '../web/generated/internal/errors.js';
import {compatibilityFailure} from '../web/generated/internal/runtime-capability.js';
import {StartupEvidenceTimeout} from '../web/generated/internal/runtime-capability.js';
function candidate(overrides={}){const p=Object.create(NativePlayer.prototype);Object.assign(p,{buffering:bufferingPolicy(),stopped:false,capability:{},cancelers:new Set(),video:{readyState:4,videoWidth:640,currentTime:0,paused:true,seeking:false,error:null,getVideoPlaybackQuality:()=>({totalVideoFrames:0}),cancelVideoFrameCallback(){},...overrides}});return p;}
test('paused current-data preparation does not require vendor counters or presentation',async()=>{const p=candidate();await p.verifyStartup({video:true,audio:true});assert.equal(p.capability.prepared,true);assert.notEqual(p.capability.videoPresented,true);assert.notEqual(p.capability.outputVerified,true);assert.equal(p.cancelers.size,0);});
// Avoid reading unrelated full Native diagnostics in these focused backend tests.

test('metadata alone and absent presentation cannot verify output',async()=>{const original=globalThis.setTimeout;globalThis.setTimeout=(f,n,...args)=>original(f,n===10000?1:n,...args);try{const metadata=candidate({readyState:1});await assert.rejects(()=>metadata.verifyStartup({video:true,audio:true}),StartupEvidenceTimeout);assert.notEqual(metadata.capability.prepared,true);const prepared=candidate();prepared.capability={outputVerified:true,videoPresented:true};await prepared.verifyStartup({video:true,audio:true});await assert.rejects(()=>prepared.verifyOutput(),StartupEvidenceTimeout);assert.notEqual(prepared.capability.outputVerified,true);}finally{globalThis.setTimeout=original;}});
test('missing declared audio is a media failure only after output is requested',async()=>{const p=candidate({webkitAudioDecodedByteCount:0});await p.verifyStartup({video:true,audio:true});assert.equal(p.capability.prepared,true);const original=globalThis.setTimeout;globalThis.setTimeout=(f,n,...args)=>original(f,n===10000?1:n,...args);try{await assert.rejects(()=>p.verifyOutput(),e=>e.code==='DECODE_FAILED');assert.equal(p.cancelers.size,0);}finally{globalThis.setTimeout=original;}});
test('Firefox missing selected audio rejects paused A/V preparation',async()=>{const p=candidate({mozHasAudio:false});await assert.rejects(()=>p.verifyStartup({video:true,audio:true}),e=>e.code==='DECODE_FAILED');assert.notEqual(p.capability.prepared,true);assert.equal(p.cancelers.size,0);});
test('Firefox missing audio after preparation rejects output',async()=>{const p=candidate();await p.verifyStartup({video:true,audio:true});p.video.mozHasAudio=false;await assert.rejects(()=>p.verifyOutput(),e=>e.code==='DECODE_FAILED');assert.equal(p.capability.outputVerified,false);assert.equal(p.cancelers.size,0);});
test('media-error classification is single-flight and cancellation retires verification',async()=>{let calls=0,release;const p=candidate({error:{code:4}});p.classifyDirectFailure=()=>{calls++;return new Promise(r=>release=r)};const verification=p.verifyStartup({video:true,audio:true});const rejected=assert.rejects(verification,/cancelled/);await new Promise(r=>setTimeout(r,90));assert.equal(calls,1);for(const cancel of p.cancelers)cancel(Error('cancelled'));await rejected;release(Error('Source transport: HTTP 403'));await new Promise(r=>setTimeout(r,30));assert.equal(calls,1);assert.equal(p.cancelers.size,0);});
test('verified source may complete a short EOF interval without claiming fresh presentation',async()=>{const p=candidate({currentTime:11.995,ended:false});p.capability.outputVerified=true;const output=p.verifyStartup({video:true,audio:true},true);p.video.currentTime=12;p.video.ended=true;await output;assert.equal(p.capability.completedAtEOF,true);assert.equal(p.capability.outputVerified,true);assert.equal(p.capability.videoPresented,false);assert.equal(p.capability.audioProgress,false);});
test('EOF alone never qualifies an unverified source',async()=>{const p=candidate({currentTime:12,ended:true});const original=globalThis.setTimeout;globalThis.setTimeout=(f,n,...args)=>original(f,n===10000?1:n,...args);try{await assert.rejects(()=>p.verifyStartup({video:true,audio:true},true),StartupEvidenceTimeout);assert.notEqual(p.capability.outputVerified,true);}finally{globalThis.setTimeout=original;}});

test('EOF arriving before verification starts completes an already verified session',async()=>{const p=candidate({currentTime:12,ended:true,readyState:2});p.capability.outputVerified=true;await p.verifyStartup({video:true,audio:true},true);assert.equal(p.capability.completedAtEOF,true);assert.equal(p.capability.videoPresented,false);});


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
  try{const p=candidate();p.remoteSource={url:'https://media.test/vod.m3u8',format:'hls'};const pending=p.classifyDirectFailure(new PlayerError('UNSUPPORTED_MEDIA','Browser rejected manifest'));await started;p.stopped=true;for(const cancel of p.cancelers)cancel(Error('Player is destroyed'));const result=await pending;assert.equal(signal.aborted,true);assert.equal(compatibilityFailure(result),false);assert.equal(p.cancelers.size,0);}finally{globalThis.fetch=original;}
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
 const p=candidate({paused:false});const original=globalThis.setTimeout;
 globalThis.setTimeout=(f,n,...args)=>original(f,n===10000?100:n,...args);
 try{const verified=p.verifyStartup({video:true,audio:true},true);p.video.currentTime=.2;p.video.getVideoPlaybackQuality=()=>({totalVideoFrames:1});await assert.rejects(verified,StartupEvidenceTimeout);assert.notEqual(p.capability.outputVerified,true);assert.equal(p.capability.audioEvidence,'unobservable');}finally{globalThis.setTimeout=original;}
});

test('bounded local output trials preserve position without caching unknown as incompatibility',async()=>{
 const {Player}=await import('../web/generated/unified-player.js');
 for(const [kind,error,allowed] of [['local',new StartupEvidenceTimeout('output'),true],['remote',new StartupEvidenceTimeout('output'),false],['local',new PlayerError('SOURCE_PERMISSION','denied'),false],['local',new DOMException('activation required','NotAllowedError'),false]]){
  const p=Object.create(Player.prototype),properties=new Map([['time-pos',2]]);let selected,cached=0;
  const backend={properties,diagnostics:{plan:'direct'},play:()=>{properties.set('time-pos',9);return Promise.resolve();},pause:async()=>{},verifyOutput:async()=>{throw error;}};
  Object.assign(p,{current:{backend},source:{kind},queued:0,destroyed:false,automatic:true,settings:{pause:true},nativeRemux:'auto',nativeTracks:[],enqueue:f=>f(),evidence:()=>({prepared:true}),failedStreamingPlan:()=>undefined,runtimeCapabilities:{update(){}},tierAttempts:{failure(){cached++;}},select:async(...args)=>{selected=args;}});
  Object.defineProperties(p,{mode:{value:'native'},diagnostics:{value:{plan:{id:'native-direct'}}}});
  if(allowed){await p.play();assert.equal(selected[5],2);assert.equal(cached,0);assert.equal(p.nativeRemux,'auto');}
  else{await assert.rejects(()=>p.play(),e=>e===error);assert.equal(selected,undefined);assert.equal(cached,0);}
 }
});

test('enabled browser audio tracks provide explicit presence evidence without vendor counters',async()=>{
 const p=candidate({paused:false,audioTracks:[{enabled:true}]});
 const verified=p.verifyStartup({video:true,audio:true},true);setTimeout(()=>{p.video.currentTime=.1;p.video.getVideoPlaybackQuality=()=>({totalVideoFrames:1});},30);
 await verified;assert.equal(p.capability.audioEvidence,'enabled-browser-audio-track-and-clock');assert.equal(p.capability.audioEvidenceStrength,'presence');assert.equal(p.capability.audioDecoded,false);assert.equal(p.capability.audioObservation.enabledTrack,true);
});
test('disabled browser audio tracks cannot qualify output',async()=>{
 const original=globalThis.setTimeout;globalThis.setTimeout=(f,n,...args)=>original(f,n===10000?100:n,...args);
 try{const p=candidate({paused:false,audioTracks:[{enabled:false}]});const verified=p.verifyStartup({video:true,audio:true},true);setTimeout(()=>{p.video.currentTime=.1;p.video.getVideoPlaybackQuality=()=>({totalVideoFrames:1});},30);await assert.rejects(verified,StartupEvidenceTimeout);}finally{globalThis.setTimeout=original;}
});
test('failed play cancels and settles its verifier before allowing a retry',async()=>{
 const {Player}=await import('../web/generated/unified-player.js');
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

test('play rejection cancels subtitle sampling and restoration RPCs without waiting for the worker',async()=>{
 const {Player}=await import('../web/generated/unified-player.js');
 const {NativeMpvSubtitles}=await import('../web/generated/internal/native-mpv-subtitles.js');
 for(const phase of ['sample','restore']){
  const service=Object.create(NativeMpvSubtitles.prototype);const sent=[];
  Object.assign(service,{stopped:false,sequence:0,pending:new Map(),tracks:[{selected:true,mpvId:1}],video:{videoWidth:640,videoHeight:360,duration:10},time:()=>0,revision:0,frame:1,worker:{postMessage(message){sent.push(message);if(phase==='restore'&&sent.length===1)queueMicrotask(()=>service.pending.get(message.id)?.resolve({hasOverlay:true,service:{}}));}}});
  const p=candidate();p.mpvSubs=service;
  const denied=new DOMException('blocked','NotAllowedError');
  await assert.rejects(()=>Player.prototype.playNativeVerified.call({},p,new Promise((_,reject)=>setTimeout(()=>reject(denied),30))),e=>e===denied);
  assert.equal(service.pending.size,0);assert.equal(service.verifiedTrack,undefined);assert.equal(sent.length,phase==='sample'?1:2);assert.equal(p.capability.outputVerified,false);
  service.worker.postMessage=message=>queueMicrotask(()=>service.pending.get(message.id)?.resolve({hasOverlay:true,service:{}}));
  await service.verify();assert.equal(service.verifiedTrack,1);assert.equal(service.pending.size,0);
 }
});
