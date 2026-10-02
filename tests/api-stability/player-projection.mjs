// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import {acceptSourceIdentity} from '../helpers/player-control.mjs';
import assert from 'node:assert/strict';
import {projectPlayer,publicationEvents} from '../../web/generated/internal/machine/selectors.js';
import {capturePlayerObservation} from '../../web/generated/internal/effects/observations.js';
import {Player} from '../../web/generated/unified-player.js';
import {tracks} from '../../web/generated/internal/state.js';
import {trackAllowed} from '../../web/generated/internal/track-policy.js';
import {backendPlan} from '../../web/generated/internal/backend.js';

const eventNames=['statechange','sourcechange','durationchange','trackschange','capabilitieschange','volumechange','ratechange','timeupdate','play','playing','pause','waiting','ended'];
const sessionError=()=>({code:'DECODE_FAILED',message:'controlled failure',operationId:4,operation:'opening',scope:'session',retryable:false});
function selectedTrackAliases(state,label){
  assert.equal(state.mediaInfo.audio,state.audioTracks.find(track=>track.selected)??null,`${label}: selected audio aliases its inventory entry`);
  assert.equal(state.mediaInfo.subtitle,state.subtitleTracks.find(track=>track.selected)??null,`${label}: selected subtitle aliases its inventory entry`);
  assert.equal(state.mediaInfo.video,state.mediaInfo.videoTracks.find(track=>track.selected)??null,`${label}: selected video aliases its inventory entry`);
}
function audioTrack(sourceId=7){return {id:`${sourceId}:audio:stream:1`,type:'audio',label:'English',language:'en',codec:'aac',selected:true,external:false,title:null,streamIndex:1,default:true,forced:false,channels:2,sampleRate:48000,channelLayout:'stereo',frameRate:null,bitDepth:null,profile:null,roles:[],attachedPicture:false};}
function input(patch={}){
  const value={
    sourceId:7,sourcePresent:true,requestedLive:false,mode:'native',automaticSelection:false,
    pause:true,subtitlesVisible:true,volumePercent:50,muted:false,playbackRate:1,
    pendingOperation:null,error:null,observedPlaying:false,observedWaiting:false,busy:false,operationActive:false,
    observation:{time:2,duration:20,nativeLive:null,eof:false,paused:false,pausedForCache:false,nativeWaiting:false,seekable:true,nativeSeekable:[{start:0,end:20}],nativeBuffered:[{start:0,end:4}],cacheSeekable:null,cached:null},
    media:{mode:'native',videoSurface:null,videoOutput:null,videoInput:null,selectedRawVideo:null,chapters:null,tags:null,chapterCoverage:'complete',tagCoverage:'complete',duration:20},
    tracks:[],timing:{subtitleDelay:0,audioDelay:0,effectiveSubtitleDelay:0,effectiveAudioDelay:0,subtitleStyle:{fontSize:24},styleScope:'plain-text'},
    loop:false,playbackRange:null,streaming:null,audioOutputDevice:'',trackPolicy:{},
    capabilityFacts:{backendPlan:'direct',nativeASS:false,privateRemux:false,privateFull:false,providerRuntime:false,hybridAudioFilters:false,nativeRemux:'never',canInspectFFmpeg:false,remoteFormat:null,backendMpvSubtitles:false,backendSetQuality:false,backendSeekToLive:false,isolated:true,webCodecs:false,mediaSource:false,webAudio:false,bufferingBackend:'browser',bufferingControl:'hint'},
  };
  return {...value,...patch,observation:{...value.observation,...patch.observation},media:{...value.media,...patch.media},capabilityFacts:{...value.capabilityFacts,...patch.capabilityFacts}};
}
function source(patch={}){
  const {observation,media,...controls}=input();
  return {...controls,properties:new Map([['time-pos',2],['duration',20],['pause',false],['native-seekable',[{start:0,end:20}]],['native-buffered',[{start:0,end:4}]]]),...patch};
}

for(const [name,patch,expected]of [
  ['absent session ignores backend playing',{sourceId:null,sourcePresent:false,pause:false,observedPlaying:true},'idle'],
  ['failed first open retains error without a source',{sourceId:null,sourcePresent:false,error:sessionError()},'error'],
  ['session error dominates every media flag',{error:sessionError(),pause:false,observedPlaying:true,observedWaiting:true,observation:{eof:true,paused:true}},'error'],
  ['EOF dominates requested pause and waiting',{observedWaiting:true,observation:{eof:true}},'ended'],
  ['requested pause dominates waiting and playing',{observedWaiting:true,observedPlaying:true},'paused'],
  ['backend pause dominates observed playing',{pause:false,observedPlaying:true,observation:{paused:true}},'paused'],
  ['waiting dominates observed playing',{pause:false,observedWaiting:true,observedPlaying:true},'buffering'],
  ['cache starvation dominates observed playing',{pause:false,observedPlaying:true,observation:{pausedForCache:true}},'buffering'],
  ['native waiting dominates observed playing',{pause:false,observedPlaying:true,observation:{nativeWaiting:true}},'buffering'],
  ['accepted play intent needs an observation',{pause:false},'paused'],
  ['observed output establishes playing',{pause:false,observedPlaying:true},'playing'],
  ['pending seek does not invent a new status',{pause:false,observedPlaying:true,pendingOperation:{id:8,kind:'seeking'},operationActive:true},'playing'],
])test(`projection precedence: ${name}`,()=>{
  const facts=input(patch),result=projectPlayer(undefined,facts);
  assert.equal(result.state.status,expected);assert.equal(result.state.playbackIntent,facts.pause?'pause':'play');
  assert.deepEqual(result.state.pendingOperation,facts.pendingOperation);
});

test('equal state retains object identity while preview priority still changes',()=>{
  const facts=input({pause:false,observedPlaying:true}),first=projectPlayer(undefined,facts);
  const busy=projectPlayer(first.state,{...facts,busy:true,operationActive:true});
  assert.equal(busy.state,first.state);assert.equal(busy.changed,false);assert.deepEqual(busy.notifications,[]);assert.equal(busy.enforceBoundary,false);
  assert.deepEqual(busy.preview,{playbackActive:true,suspended:true,duration:null,position:2});
  const released=projectPlayer(busy.state,facts);
  assert.equal(released.state,first.state);assert.deepEqual(released.preview,{playbackActive:true,suspended:false,duration:20,position:2});
});

test('unknown, empty, bounded and live seek windows retain distinct meaning',()=>{
  for(const value of [null,[]]){
    const state=projectPlayer(undefined,input({observation:{nativeSeekable:value,nativeBuffered:value}})).state;
    assert.deepEqual(state.seekable,value);assert.deepEqual(state.buffered,value);
    assert.equal(state.capabilities.features.seek.availability,value===null?'unknown':'unavailable');
  }
  const finite=projectPlayer(undefined,input({mode:'software',media:{mode:'software'},observation:{seekable:true}})).state;
  assert.deepEqual(finite.seekable,[{start:0,end:20}]);assert.equal(finite.buffered,null);
  const live=projectPlayer(undefined,input({mode:'hybrid',media:{mode:'hybrid'},requestedLive:true,observation:{cacheSeekable:[{start:40,end:60}],cached:[{start:41,end:50}]}})).state;
  assert.equal(live.duration,null);assert.equal(live.streamType,'live');assert.deepEqual(live.seekable,[{start:40,end:60}]);assert.deepEqual(live.cached,[{start:41,end:50}]);
  const observedVOD=projectPlayer(undefined,input({requestedLive:true,observation:{nativeLive:false}})).state;
  assert.equal(observedVOD.duration,20);assert.equal(observedVOD.streamType,'vod');
  const observedLive=projectPlayer(undefined,input({observation:{nativeLive:true}})).state;
  assert.equal(observedLive.duration,null);assert.equal(observedLive.streamType,'live');
});

test('legacy previous-duration loop capability is explicit across snapshots',()=>{
  const facts=input(),unknown=projectPlayer(undefined,input({observation:{duration:null}})).state;
  assert.equal(projectPlayer(undefined,facts).state.capabilities.features.loop.availability,'available');
  const firstFinite=projectPlayer(unknown,facts);
  assert.equal(firstFinite.state.duration,20);assert.equal(firstFinite.state.capabilities.features.loop.availability,'unknown');
  assert.equal(projectPlayer(firstFinite.state,facts).state.capabilities.features.loop.availability,'available');
});

test('projection freezes owned output without freezing or retaining the input graph',()=>{
  const facts=input({tracks:[audioTrack()],trackPolicy:{audio:{allowed:[{language:'en'}]}},pendingOperation:{id:5,kind:'opening'},error:sessionError(),loop:{start:1,end:4},playbackRange:{start:0,end:5}});
  Object.freeze(facts.timing); // A frozen parent does not imply frozen descendants.
  const before=structuredClone(facts),result=projectPlayer(undefined,facts);
  assert.deepEqual(facts,before);assert.equal(Object.isFrozen(facts.timing.subtitleStyle),false);
  assert.equal(Object.isFrozen(facts.tracks[0]),false);assert.equal(Object.isFrozen(facts.trackPolicy.audio.allowed),false);
  assert.ok(Object.isFrozen(result.state));assert.ok(Object.isFrozen(result.state.timing.subtitleStyle));assert.ok(Object.isFrozen(result.state.audioTracks[0].roles));
  selectedTrackAliases(result.state,'independent projection');
  facts.tracks[0].label='Changed';facts.trackPolicy.audio.allowed[0].language='fr';facts.timing.subtitleStyle.fontSize=99;facts.loop.end=8;facts.error.message='Changed';facts.pendingOperation.id=6;
  assert.equal(result.state.audioTracks[0].label,'English');assert.equal(result.state.trackPolicy.audio.allowed[0].language,'en');assert.equal(result.state.timing.subtitleStyle.fontSize,24);
  assert.equal(result.state.loop.end,4);assert.equal(result.state.error.message,'controlled failure');assert.equal(result.state.pendingOperation.id,5);
});

test('capture retains one accepted tuple when its caller later installs another source',()=>{
  const live={isLive:false,seekable:{start:0,end:20},latencySeconds:null,nearLive:null};
  const accepted=source({tracks:[audioTrack()],streaming:{qualities:[],requested:{mode:'auto'},selectedId:null,presentedId:null,observedQuality:{observation:'playhead-buffer',position:2,contentType:'video',width:320,height:180,bandwidth:1000,codec:'avc1'},transition:'unknown',live},surface:{tagName:'VIDEO',videoWidth:320,videoHeight:180}});
  accepted.properties.set('metadata',{title:'Old movie'});accepted.properties.set('chapter-list',[{time:0,title:'Beginning'}]);
  const observed=capturePlayerObservation(accepted);
  assert.equal(Object.isFrozen(live),false);assert.equal(Object.isFrozen(live.seekable),false);assert.equal(Object.isFrozen(accepted.tracks[0]),false);
  accepted.sourceId=8;accepted.mode='software';accepted.volumePercent=75;accepted.tracks[0].id='8:audio:stream:1';accepted.tracks[0].label='New movie';
  accepted.properties.set('duration',40);accepted.properties.get('metadata').title='New movie';accepted.properties.get('chapter-list')[0].title='New beginning';accepted.surface.videoWidth=640;live.seekable.end=40;
  const old=projectPlayer(undefined,observed).state;
  assert.equal(old.sourceId,7);assert.equal(old.activeMode,'native');assert.equal(old.volume,.5);assert.equal(old.duration,20);assert.equal(old.audioTracks[0].id,'7:audio:stream:1');
  assert.equal(old.mediaInfo.displayWidth,320);assert.equal(old.mediaInfo.tags.title,'Old movie');assert.equal(old.mediaInfo.chapters[0].title,'Beginning');assert.equal(old.streaming.live.seekable.end,20);
  accepted.surface={tagName:'CANVAS'};
  const next=projectPlayer(old,capturePlayerObservation(accepted)).state;
  assert.equal(next.sourceId,8);assert.equal(next.activeMode,'software');assert.equal(next.volume,.75);assert.equal(next.duration,40);assert.equal(next.audioTracks[0].id,'8:audio:stream:1');
  assert.equal(old.duration,20);assert.equal(old.mediaInfo.tags.title,'Old movie');
});

test('non-reentrant projection preserves independent event ordering',()=>{
  const first=projectPlayer(undefined,input());assert.deepEqual(first.notifications,['statechange']);assert.equal(first.enforceBoundary,false);
  const next=projectPlayer(first.state,input({sourceId:8,pause:false,observedPlaying:true,volumePercent:75,muted:true,playbackRate:1.5,tracks:[audioTrack(8)],observation:{duration:30,time:3}}));
  assert.deepEqual(next.notifications,['statechange','sourcechange','durationchange','trackschange','capabilitieschange','volumechange','ratechange','timeupdate','play','playing']);
  assert.equal(next.enforceBoundary,true);assert.ok(Object.isFrozen(next.notifications));
  assert.deepEqual(publicationEvents(next.state,next.state,false),[]);
});

test('looping suppresses ended notification while retaining ended state',()=>{
  const playing=input({pause:false,observedPlaying:true}),previous=projectPlayer(undefined,playing).state;
  for(const loop of [true,{start:1,end:4}]){
    const ended=projectPlayer(previous,{...playing,loop,observation:{...playing.observation,eof:true}});
    assert.equal(ended.state.status,'ended');assert.equal(ended.state.playbackIntent,'play');assert.deepEqual(ended.notifications,['statechange']);
  }
  assert.deepEqual(projectPlayer(previous,{...playing,observation:{...playing.observation,eof:true}}).notifications,['statechange','ended']);
});

test('capture preserves recorded malformed-value compatibility boundaries',()=>{
  const sample=source();sample.properties.set('time-pos',Infinity);
  assert.equal(projectPlayer(undefined,capturePlayerObservation(sample)).state.currentTime,Infinity);
  sample.properties.set('native-seekable',[null]);assert.throws(()=>capturePlayerObservation(sample),TypeError);
  sample.mode='software';sample.properties.set('demuxer-cache-state',{'seekable-ranges':[null]});
  assert.equal(capturePlayerObservation(sample).observation.cached,null);
});

function legacyFixture(t){
  const names=['HTMLElement','HTMLCanvasElement','HTMLVideoElement','document'];
  const previous=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]));
  const document=new EventTarget();document.baseURI='http://localhost/';
  class Element extends EventTarget{ownerDocument=document;style={};constructor(tagName='DIV'){super();this.tagName=tagName;}append(){}remove(){this.removed=true;}}
  class Canvas extends Element{constructor(){super('CANVAS');}}
  class Video extends Element{videoWidth=320;videoHeight=180;constructor(){super('VIDEO');}}
  document.createElement=name=>name==='video'?new Video():name==='canvas'?new Canvas():new Element();
  Object.assign(globalThis,{document,HTMLElement:Element,HTMLCanvasElement:Canvas,HTMLVideoElement:Video});
  // No command/runtime migration is exercised here. Only observation wiring is
  // compared; watchdog scheduling and automatic boundary effects stay inactive.
  class TestPlayer extends Player{startWatchdogs(){}stopWatchdogs(){}schedulePromotion(){}enforceBoundary(){}}
  const p=new TestPlayer(new Element(),{mode:'native',nativeRemux:'never',assetBase:'http://localhost/',preview:false,watchdogs:false});
  t.after(async()=>{try{await p.destroy();}finally{for(const [name,descriptor]of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}});
  const backend=new EventTarget();Object.assign(backend,{properties:new Map(),diagnostics:{plan:'direct'},destroy:async()=>{}});
  return {p,backend,Video,Canvas};
}
function captureLegacy(p){
  const backend=p.current?.backend,plan=backendPlan(backend);let raw=p.sourceTracks();
  if(p.mode==='native'&&p.surface?.videoWidth&&!raw.some(track=>track.type==='video'))raw=[...raw,{id:'1',type:'video',selected:true}];
  const inventory=p.current?tracks(raw,p.sourceSerial,p.mode,plan).filter(track=>trackAllowed(track,track.type==='audio'?p.trackPolicy.audio:track.type==='subtitle'?p.trackPolicy.subtitles:undefined)):[];
  const buffering=p.bufferingResolution();
  return capturePlayerObservation({
    sourceId:p.current?p.sourceSerial:null,sourcePresent:!!p.source,requestedLive:p.source?.kind==='remote'&&p.source.options.streaming?.live===true,
    mode:p.mode,automaticSelection:p.automatic,pause:p.settings.pause,subtitlesVisible:p.settings.subtitles,volumePercent:p.settings.volume,muted:p.muted,playbackRate:p.settings.speed,
    pendingOperation:p.pendingOperation,error:p.sessionError,observedPlaying:p.observedPlaying,observedWaiting:p.observedWaiting,busy:p.busy,operationActive:!!p.activeOperation,
    tracks:inventory,timing:p.getTimingSettings(),loop:p.getLoop(),playbackRange:p.getPlaybackRange(),streaming:p.getStreamingState(),audioOutputDevice:p.outputDeviceId,trackPolicy:p.trackPolicy,
    properties:p.properties,surface:p.surface,capabilityFacts:{
      backendPlan:plan??null,nativeASS:p.nativeASS,privateRemux:p.privateRemux,privateFull:p.privatePlaybackAssets?.codecProfile==='playback-full',providerRuntime:!!p.providerRuntime,
      hybridAudioFilters:p.hybridAudioFilters,nativeRemux:p.nativeRemux,canInspectFFmpeg:p.canInspectFFmpeg,remoteFormat:p.source?.kind==='remote'?p.source.options.format??null:null,
      backendMpvSubtitles:!!backend?.diagnostics?.mpvSubtitles,backendSetQuality:!!backend?.setQuality,backendSeekToLive:!!backend?.seekToLive,
      isolated:globalThis.crossOriginIsolated===true,webCodecs:typeof VideoDecoder!=='undefined',mediaSource:typeof MediaSource!=='undefined',webAudio:typeof AudioContext!=='undefined',
      bufferingBackend:buffering.backend,bufferingControl:buffering.control,
    },
  });
}

test('production observation wiring matches explicit capture over a controlled history',async t=>{
  const {p,backend,Video,Canvas}=legacyFixture(t),events=[],delivered=[],retained=[];
  for(const name of eventNames)p.addEventListener(name,event=>events.push({name,detail:event.detail}));
  const unsubscribe=p.subscribe(state=>delivered.push(state));t.after(unsubscribe);
  const properties=backend.properties;let activeId;
  const begin=kind=>{activeId=p.dispatchControl({type:'operation.admit',kind}).id;p.operationResources.set(activeId,{controller:new AbortController(),detachCallerAbort(){}});p.dispatchControl({type:'operation.start',id:activeId});};
  const finish=()=>{p.dispatchControl({type:'operation.finish',id:activeId});p.dispatchControl({type:'operation.release',id:activeId});p.operationResources.delete(activeId);};
  const actions=[
    ['idle',()=>{}],
    ['accepted Native source',()=>{p.current={backend,surface:new Video()};p.source={kind:'local',file:new Blob()};acceptSourceIdentity(p,1);for(const [key,value]of [['time-pos',0],['duration',20],['pause',true],['native-seekable',[{start:0,end:20}]],['native-buffered',[]],['track-list',[{id:'1',type:'audio','ff-index':1,selected:true,codec:'aac'}]]])properties.set(key,value);}],
    ['previous duration establishes loop capability',()=>{}],
    ['identical observation retains identity',()=>{}],
    ['accepted play intent before output',()=>{p.updateSettings({pause:false});properties.set('pause',false);}],
    ['observed playing',()=>{p.dispatchControl({type:'playback.observed',playing:true});}],
    ['time advancement',()=>{properties.set('time-pos',2);}],
    ['waiting while playing',()=>{p.dispatchControl({type:'playback.observed',waiting:true});}],
    ['pending seek does not replace accepted source',()=>{begin('seeking');}],
    ['seek settles and playing resumes',()=>{finish();p.dispatchControl({type:'playback.observed',waiting:false});properties.set('time-pos',5);}],
    ['failed replacement keeps accepted tuple',()=>{begin('opening');p.dispatchControl({type:'source.begin',operationEpoch:p.operationEpoch,mode:p.mode,preserve:false,planId:'fixture'});p.candidate={backend:{properties:new Map([['duration',99]]),destroy:async()=>{}},surface:new Video()};}],
    ['replacement failure retires candidate',()=>{finish();p.dispatchControl({type:'source.finished',attempt:p.control.source.candidate.id});p.candidate=undefined;}],
    ['same source changes to Hybrid',()=>{p.currentMode='hybrid';p.current={backend,surface:new Canvas()};backend.diagnostics={plan:'hybrid'};properties.set('seekable',true);properties.set('demuxer-cache-state',{'seekable-ranges':[{start:-1,end:8}]});}],
    ['loop reaches EOF without external ended',()=>{p.loopPolicy=true;properties.set('eof-reached',true);}],
    ['loop resumes',()=>{properties.set('eof-reached',false);properties.set('time-pos',0);}],
    ['session error dominates output',()=>{p.sessionError=sessionError();}],
    ['new accepted remote live tuple',()=>{p.sessionError=null;acceptSourceIdentity(p,2);p.source={kind:'remote',options:{url:'https://example.invalid/live',streaming:{live:true}}};p.loopPolicy=false;properties.set('demuxer-cache-state',{'seekable-ranges':[{start:40,end:60}]});properties.set('time-pos',42);}],
    ['backend live false overrides requested hint',()=>{properties.set('native-live',false);}],
    ['new accepted Native tuple resets source data',()=>{acceptSourceIdentity(p,3);p.source={kind:'local',file:new Blob()};p.currentMode='native';p.current={backend,surface:new Video()};backend.diagnostics={plan:'direct'};p.settings={...p.settings,pause:true,volume:25,speed:1.5};p.dispatchControl({type:'playback.observed',playing:false});properties.clear();properties.set('duration',9);properties.set('time-pos',1);properties.set('native-seekable',[{start:0,end:9}]);properties.set('track-list',[{id:'3',type:'audio','ff-index':2,selected:true,codec:'opus'}]);}],
    ['closed accepted session',()=>{p.current=undefined;p.source=undefined;p.updateSettings({pause:true});p.dispatchControl({type:'playback.observed',playing:false});p.dispatchControl({type:'playback.observed',waiting:false});}],
    ['idle unchanged',()=>{}],
  ];
  for(const [label,mutate]of actions){
    mutate();events.length=0;delivered.length=0;
    const before=p.state,observed=captureLegacy(p),projection=projectPlayer(before,observed);
    p.publish();
    assert.deepEqual(projection.state,p.state,label);
    assert.equal(projection.changed,p.state!==before,label);
    assert.deepEqual(projection.notifications,events.map(event=>event.name),label);
    assert.equal(delivered.length,projection.changed?1:0,label);
    assert.ok(events.every(event=>event.detail===p.state),label);
    if(projection.changed)assert.equal(delivered[0],p.state,label);
    selectedTrackAliases(p.state,`${label}: legacy`);selectedTrackAliases(projection.state,`${label}: candidate`);
    if(!projection.changed)assert.equal(projection.state,before,label);
    retained.push({snapshot:p.state,serialized:JSON.stringify(p.state)});
    for(const old of retained)assert.equal(JSON.stringify(old.snapshot),old.serialized,`${label}: previously published snapshot mutated`);
  }
});

test('reentrant subscriber publication stops the obsolete notification batch',async t=>{
  const {p}=legacyFixture(t),events=[],seen=[];
  for(const name of eventNames)p.addEventListener(name,event=>events.push([name,event.detail.volume]));
  let nested=false;
  const unsubscribe=p.subscribe(state=>{
    if(state.volume===.25&&!nested){nested=true;p.updateSettings({volume:75});p.publish();}
  });t.after(unsubscribe);
  const unsubscribeSecond=p.subscribe(state=>seen.push(state.volume));t.after(unsubscribeSecond);seen.length=0;
  p.updateSettings({volume:25});p.publish();
  assert.deepEqual(events,[['statechange',.75],['volumechange',.75]]);
  assert.deepEqual(seen,[.75]);assert.equal(p.state.volume,.75);
});

test('reentrant statechange carries its own snapshot and retires later obsolete events',async t=>{
  const {p}=legacyFixture(t),events=[];let nested=false;
  p.addEventListener('statechange',event=>{
    events.push(['statechange',event.detail.volume]);
    if(!nested){nested=true;p.updateSettings({volume:75});p.publish();}
  });
  p.addEventListener('volumechange',event=>events.push(['volumechange',event.detail.volume]));
  p.updateSettings({volume:25});p.publish();
  assert.deepEqual(events,[['statechange',.25],['statechange',.75],['volumechange',.75]]);
});

test('close from a subscriber retires the old batch before cleanup settles',async t=>{
  const {p}=legacyFixture(t),events=[];let closing;
  p.addEventListener('volumechange',event=>events.push(event.detail.volume));
  const unsubscribe=p.subscribe(state=>{if(state.volume===.25&&!closing)closing=p.close();});t.after(unsubscribe);
  p.updateSettings({volume:25});p.publish();
  assert.deepEqual(events,[]);await closing;assert.equal(p.state.sourceId,null);
});

test('throwing initial and update subscribers, including their reporter, are isolated',async t=>{
  const {p}=legacyFixture(t),old=Object.getOwnPropertyDescriptor(globalThis,'reportError'),reports=[],seen=[];
  globalThis.reportError=error=>{reports.push(error.message);throw new Error('reporter failure');};
  t.after(()=>{if(old)Object.defineProperty(globalThis,'reportError',old);else delete globalThis.reportError;});
  const unsubscribe=p.subscribe(()=>{throw new Error('observer failure');});t.after(unsubscribe);
  const second=p.subscribe(state=>seen.push(state.volume));t.after(second);
  p.updateSettings({volume:25});p.publish();
  assert.deepEqual(reports,['observer failure','observer failure']);assert.deepEqual(seen,[1,.25]);
  unsubscribe();p.updateSettings({volume:75});p.publish();assert.equal(reports.length,2);
});

test('streaming readback copies backend-owned nested observations before freezing',async t=>{
  const {p,backend,Video}=legacyFixture(t);
  const live={isLive:true,seekable:{start:10,end:20},latencySeconds:1,nearLive:true};
  const observedQuality={observation:'playhead-buffer',position:11,contentType:'video',width:320,height:180,bandwidth:1000,codec:'avc1'};
  backend.streamingState=()=>({qualities:[],requested:{mode:'auto'},selectedId:null,presentedId:null,observedQuality,transition:'unknown',live});
  p.current={backend,surface:new Video()};acceptSourceIdentity(p,3);
  const snapshot=p.getStreamingState();assert.equal(Object.isFrozen(live),false);assert.equal(Object.isFrozen(observedQuality),false);
  live.seekable.end=30;observedQuality.width=640;
  assert.equal(snapshot.live.seekable.end,20);assert.equal(snapshot.observedQuality.width,320);assert.ok(Object.isFrozen(snapshot.live.seekable));
});

test('reentrant observation reads cannot overwrite a newer accepted publication',async t=>{
  const {p,backend,Video}=legacyFixture(t);p.current={backend,surface:new Video()};p.source={kind:'local',file:new Blob()};acceptSourceIdentity(p,1);
  backend.properties.set('duration',20);let replaced=false;
  const originalGet=backend.properties.get.bind(backend.properties);
  backend.properties.get=key=>{
    if(key==='duration'&&!replaced){replaced=true;acceptSourceIdentity(p,2);p.updateSettings({volume:75});p.publish();}
    return originalGet(key);
  };
  p.publish();await Promise.resolve();
  assert.equal(p.state.sourceId,2);assert.equal(p.state.volume,.75);assert.equal(p.state.duration,20);
});
