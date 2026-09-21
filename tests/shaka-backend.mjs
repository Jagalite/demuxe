// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ShakaBackend} from '../web/generated/internal/shaka-backend.js';
const schemes=new Map();let pendingLoad=false,live=false,inProgress=false,variantOverride;
class FakePlayer extends EventTarget {
  static version='test';static LoadMode={MEDIA_SOURCE:2};static isBrowserSupported(){return true;}
  constructor(){super();this.audio=[{active:true,id:1,language:'en',label:'English',roles:[],channelsCount:2,codecs:'mp4a.40.2',audioSamplingRate:48000,spatialAudio:false},{active:false,id:2,language:'fr',label:'French',roles:[],channelsCount:2,codecs:'mp4a.40.2',audioSamplingRate:48000,spatialAudio:false}];this.text=[{active:true,id:20,language:'en',label:'English',codecs:'wvtt'},{active:false,id:21,language:'fr',label:'French',codecs:'wvtt'}];}
  getNetworkingEngine(){return {registerRequestFilter:filter=>this.filter=filter};}
  configure(value){this.config=value;return true;}
  async attach(video){this.video=video;}
  async load(){if(pendingLoad)await new Promise((resolve,reject)=>{this.rejectLoad=reject;});}
  getLoadMode(){return 2;}isLive(){return live;}isDynamic(){return live||inProgress;}seekRange(){return {start:live?5:0,end:30};}
  getVariantTracks(){return variantOverride??[{id:4,active:true,videoId:3,videoCodec:'avc1.640028',audioCodec:'mp4a.40.2',width:640,height:360,originalVideoId:'video-high',bandwidth:900000}];}
  getAudioTracks(){return this.audio;}getTextTracks(){return this.text;}
  selectTextTrack(track){for(const t of this.text)t.active=t===track;this.dispatchEvent(new Event('textchanged'));}
  selectAudioTrack(track){for(const t of this.audio)t.active=t===track;this.dispatchEvent(new Event('variantchanged'));}
  selectVariantTrack(track){this.selectedVariant=track;if(variantOverride)for(const variant of variantOverride)variant.active=variant.id===track.id;}
  async destroy(){this.rejectLoad?.(new DOMException('retired','AbortError'));this.video=undefined;}
}
class FakeError extends Error{static Severity={CRITICAL:2};static Category={NETWORK:1};static Code={};}
const runtime={Player:FakePlayer,polyfill:{installAll(){}},net:{HttpFetchPlugin:{parse(){throw Error('Unowned test request');}},NetworkingEngine:{RequestType:{LICENSE:2},registerScheme:(id,plugin)=>schemes.set(id,plugin),unregisterScheme:id=>schemes.delete(id)}},util:{Error:FakeError}};
globalThis.location=new URL('https://app.test/');
globalThis.fetch=async()=>new Response('// fake runtime');
globalThis.document={createElement:()=>({remove(){}}),head:{append(script){globalThis.shaka=runtime;queueMicrotask(()=>script.onload?.());}}};
function video(){const value=new EventTarget(),textEvents=new EventTarget();return Object.assign(value,{textTracks:Object.assign([],{addEventListener:textEvents.addEventListener.bind(textEvents),removeEventListener:textEvents.removeEventListener.bind(textEvents)}),paused:true,ended:false,currentTime:0,duration:30,volume:1,playbackRate:1,videoWidth:640,videoHeight:360,readyState:4,muted:false,buffered:{length:0},seekable:{length:0},getVideoPlaybackQuality:()=>({totalVideoFrames:1,droppedVideoFrames:0}),pause(){this.paused=true;},async play(){this.paused=false;},load(){},removeAttribute(){},replaceChildren(){}});}
const source={url:'https://media.test/main.mpd',format:'dash'};
test('Shaka backend preserves audio and text selection intent and exposes actual stream state',async()=>{
  const v=video(),backend=new ShakaBackend(v,new URL('https://app.test/'));
  try{await backend.gain(1);await backend.openRemote(source);await backend.verifyStartup();
    const raw=()=>backend.properties.get('track-list');const frenchAudio=raw().find(t=>t.type==='audio'&&t.lang==='fr'),frenchText=raw().find(t=>t.type==='sub'&&t.lang==='fr');
    assert.equal(raw().filter(t=>t.type==='video'&&t.selected).length,1);assert.equal(backend.diagnostics.plan,'shaka-mse');assert.equal(backend.startupEvidence().sourceBufferCreated,true);
    backend.player.audio[1].channelsCount=null;backend.player.audio[1].audioSamplingRate=null;await backend.selectTrack('audio',frenchAudio.id);backend.player.audio[1].channelsCount=2;backend.player.audio[1].audioSamplingRate=48000;backend.player.dispatchEvent(new Event('trackschanged'));assert.equal(raw().find(t=>t.id===frenchAudio.id).selected,true);
    await backend.selectTrack('sub',frenchText.id);await backend.subtitleVisible(false);assert.equal(raw().some(t=>t.type==='sub'&&t.selected),false);await backend.subtitleVisible(true);assert.equal(raw().find(t=>t.id===frenchText.id).selected,true);
    await assert.rejects(backend.selectTrack('audio','2'),e=>e.code==='UNSUPPORTED_FEATURE');await assert.rejects(backend.selectTrack('sub','2'),e=>e.code==='UNSUPPORTED_FEATURE');
    await backend.selectTrack('audio','no');assert.equal(v.muted,true);assert.equal(raw().some(t=>t.type==='audio'&&t.selected),false);
  }finally{await backend.destroy();assert.equal(backend.diagnostics.streaming.network.active,false);}
});
test('destroy during Shaka load aborts the candidate and removes session networking',async()=>{
  pendingLoad=true;const backend=new ShakaBackend(video(),new URL('https://app.test/'));let events=0;backend.addEventListener('mpv',()=>events++);
  const opening=backend.openRemote(source);await new Promise(resolve=>setTimeout(resolve,0));assert.equal(schemes.size,3);await backend.destroy();await assert.rejects(opening,e=>e.code==='ABORTED');const retiredEvents=events;await backend.destroy();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(events,retiredEvents);assert.equal(backend.diagnostics.streaming.network.active,false);pendingLoad=false;
});
test('live requires explicit intent and publishes a sliding seekable window',async()=>{
  live=true;for(const permitted of [false,true]){const backend=new ShakaBackend(video(),new URL('https://app.test/'));try{if(!permitted)await assert.rejects(backend.openRemote(source),e=>e.code==='SOURCE_PERMISSION');else{await backend.openRemote({...source,streaming:{live:true}});assert.equal(backend.properties.get('duration'),null);assert.deepEqual(backend.properties.get('native-seekable'),[{start:5,end:30}]);await assert.rejects(backend.seek(1),e=>e.code==='INVALID_ARGUMENT');}}finally{await backend.destroy();}}live=false;
});
test('source representation IDs beat numeric variant IDs and preserve active audio',async()=>{
  const primary={id:0,active:true,videoId:3,videoCodec:'avc1',audioCodec:'aac',language:'en',audioLanguage:'en',label:'English',audioRoles:[],originalLanguage:'en',channelsCount:2,originalVideoId:'high',bandwidth:900000};
  variantOverride=[primary,{...primary,id:4,active:false,originalVideoId:'0'},{...primary,id:5,active:false,originalVideoId:'0',language:'fr',audioLanguage:'fr',label:'French',originalLanguage:'fr'}];
  try{for(const representation of ['0','variant:4']){const backend=new ShakaBackend(video(),new URL('https://app.test/'));try{await backend.openRemote({...source,streaming:{representation}});assert.equal(backend.player.selectedVariant.id,4);}finally{await backend.destroy();}}
    for(const representation of ['variant:5','1']){const backend=new ShakaBackend(video(),new URL('https://app.test/'));try{await assert.rejects(backend.openRemote({...source,streaming:{representation}}),e=>e.code==='UNSUPPORTED_FEATURE');}finally{await backend.destroy();}}
    variantOverride=[primary,{...primary,id:4,active:false,originalVideoId:'renditions/high.m3u8'}];const backend=new ShakaBackend(video(),new URL('https://app.test/'));try{await backend.openRemote({...source,format:'hls',streaming:{representation:'renditions/high.m3u8'}});assert.equal(backend.player.selectedVariant.id,4);}finally{await backend.destroy();}
  }finally{variantOverride=undefined;}
});

test('live:true is permission and also accepts an ordinary VOD manifest',async()=>{const backend=new ShakaBackend(video(),new URL('https://app.test/'));try{await backend.openRemote({...source,streaming:{live:true}});assert.equal(backend.properties.get('native-live'),false);assert.equal(backend.properties.get('duration'),30);}finally{await backend.destroy();}});


test('audio selection cannot escape a pinned representation or bandwidth ceiling',async()=>{
  const en={id:4,active:true,videoId:3,videoCodec:'avc1',audioCodec:'mp4a.40.2',language:'en',audioLanguage:'en',label:'English',audioRoles:[],originalLanguage:undefined,channelsCount:2,spatialAudio:false,originalVideoId:'high',bandwidth:900000};
  const french={...en,id:5,active:false,language:'fr',audioLanguage:'fr',label:'French',originalVideoId:'low'};
  for(const scenario of ['incompatible-video','over-bandwidth','compatible-pair','exact-variant']){
    variantOverride=[{...en},{...french,originalVideoId:scenario==='incompatible-video'?'low':'high',bandwidth:scenario==='over-bandwidth'?1100000:950000}];
    const backend=new ShakaBackend(video(),new URL('https://app.test/'));
    try{await backend.openRemote({...source,streaming:{representation:scenario==='exact-variant'?'variant:4':'high',maxBandwidth:1000000}});
      const frenchId=backend.properties.get('track-list').find(t=>t.type==='audio'&&t.lang==='fr').id;
      const initial=backend.player.selectedVariant.id;
      if(scenario==='compatible-pair'){await backend.selectTrack('audio',frenchId);assert.equal(backend.player.selectedVariant.id,5);assert.equal(backend.player.selectedVariant.originalVideoId,'high');assert.ok(backend.player.selectedVariant.bandwidth<=1000000);}
      else{await assert.rejects(backend.selectTrack('audio',frenchId),e=>e.code==='UNSUPPORTED_FEATURE');assert.equal(backend.player.selectedVariant.id,initial);assert.equal(variantOverride.find(t=>t.active).id,4);}
    }finally{await backend.destroy();variantOverride=undefined;}
  }
});

test('in-progress presentations require live permission and publish live state until finished',async()=>{
  inProgress=true;
  try{for(const permitted of [false,true]){
    const backend=new ShakaBackend(video(),new URL('https://app.test/'));
    try{if(!permitted)await assert.rejects(backend.openRemote(source),e=>e.code==='SOURCE_PERMISSION');
      else{await backend.openRemote({...source,streaming:{live:true}});assert.equal(backend.properties.get('native-live'),true);assert.equal(backend.properties.get('duration'),null);assert.equal(backend.diagnostics.streaming.live,true);
        inProgress=false;backend.player.dispatchEvent(new Event('trackschanged'));assert.equal(backend.properties.get('native-live'),false);assert.equal(backend.properties.get('duration'),30);}
    }finally{await backend.destroy();}
  }}finally{inProgress=false;}
});

test('shared runtime download survives one cancellation and remains cached after success',async()=>{
  const fetcher=globalThis.fetch,requests=[];
  globalThis.fetch=(_url,options)=>new Promise((resolve,reject)=>{requests.push({resolve,signal:options.signal});options.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});});
  const base=new URL('https://app.test/shared-runtime/'),a=new ShakaBackend(video(),base),b=new ShakaBackend(video(),base);
  try{const first=a.openRemote(source),second=b.openRemote(source);const rejected=assert.rejects(first,e=>e.code==='ABORTED');
    assert.equal(requests.length,1);await a.destroy();await rejected;assert.equal(requests[0].signal.aborted,false);
    requests[0].resolve(new Response('// shared runtime'));await second;await b.destroy();
    const cached=new ShakaBackend(video(),base);try{await cached.openRemote(source);assert.equal(requests.length,1);}finally{await cached.destroy();}
  }finally{await a.destroy();await b.destroy();globalThis.fetch=fetcher;}
});

test('last runtime waiter cancels fetch, settles open and permits a fresh retry',async()=>{
  const fetcher=globalThis.fetch,requests=[];
  globalThis.fetch=(_url,options)=>new Promise((resolve,reject)=>{requests.push({resolve,signal:options.signal});options.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')),{once:true});});
  const base=new URL('https://app.test/cancel-runtime/'),a=new ShakaBackend(video(),base);
  try{const rejected=assert.rejects(a.openRemote(source),e=>e.code==='ABORTED');await a.destroy();await rejected;assert.equal(requests[0].signal.aborted,true);
    const retry=new ShakaBackend(video(),base);try{const opening=retry.openRemote(source);assert.equal(requests.length,2);requests[1].resolve(new Response('// retry'));await opening;}finally{await retry.destroy();}
  }finally{await a.destroy();globalThis.fetch=fetcher;}
});

test('cancellation removes a queued execution script, its listeners and blob URL',async()=>{
  const doc=globalThis.document,revoke=URL.revokeObjectURL;let script,removed=false;const revoked=[];
  URL.revokeObjectURL=url=>{revoked.push(url);revoke(url);};
  globalThis.document={createElement:()=>({remove(){removed=true;}}),head:{append(value){script=value;}}};
  const backend=new ShakaBackend(video(),new URL('https://app.test/queued-runtime/'));
  try{const rejected=assert.rejects(backend.openRemote(source),e=>e.code==='ABORTED');await new Promise(resolve=>setTimeout(resolve,0));assert.ok(script);
    await backend.destroy();await rejected;assert.equal(removed,true);assert.equal(script.onload,null);assert.equal(script.onerror,null);assert.deepEqual(revoked,[script.src]);
  }finally{await backend.destroy();globalThis.document=doc;URL.revokeObjectURL=revoke;}
});

test('portable buffering preserves Shaka defaults and delegates profile goals',async()=>{
 const {bufferingPolicy}=await import('../web/generated/internal/buffering.js');
 for(const [profile,expected] of [['balanced',{}],['low-latency',{bufferingGoal:3,bufferBehind:3}],['resilient',{bufferingGoal:30}]]){
  const backend=new ShakaBackend(video(),new URL('https://app.test/'),bufferingPolicy({profile}));
  try{await backend.openRemote(source);assert.deepEqual(backend.player.config.streaming,expected);assert.equal(backend.diagnostics.buffering.backend,'shaka');
   backend.player.isBuffering=()=>true;backend.player.dispatchEvent(new Event('buffering'));assert.equal(backend.properties.get('paused-for-cache'),true);
   backend.player.isBuffering=()=>false;backend.player.dispatchEvent(new Event('buffering'));assert.equal(backend.properties.get('paused-for-cache'),false);
  }finally{await backend.destroy();}
 }
});
test('Native preload maps literally and only promises hint control',async()=>{
 const {NativePlayer}=await import('../web/generated/internal/native-player.js');
 const {bufferingPolicy}=await import('../web/generated/internal/buffering.js');
 for(const preload of ['none','metadata','auto']){
  const v=video(),p=new NativePlayer(v,'never',new URL('https://app.test/'),false,undefined,undefined,false,[],undefined,bufferingPolicy({preload}));
  try{assert.equal(v.preload,preload);assert.equal(p.diagnostics.buffering.control,'hint');assert.equal(p.diagnostics.buffering.preload,preload);}finally{await p.destroy();}
 }
});
