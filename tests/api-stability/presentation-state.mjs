// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  initialPresentationState,transitionPresentation,presentationLocksSurface,projectPresentation,
  initialMediaSessionLease,allocateMediaSessionOwner,transitionMediaSession,ownsMediaSession,
} from '../../web/generated/internal/machine/presentation.js';
import {PlayerPresentation} from '../../web/generated/presentation.js';

const enterFullscreen={type:'fullscreen.request',containsHost:true,supported:true};
const enterPiP=kind=>({type:'pip.request',kind,supported:true,eligible:true,documentOpen:false});
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}

test('fullscreen retirement keeps its lane reserved until settlement and ignores old completions',()=>{
  const initial=initialPresentationState(),first=transitionPresentation(initial,enterFullscreen);
  assert.equal(first.requestId,1);
  assert.equal(initial.fullscreen,null);
  let state=transitionPresentation(first.state,{type:'fullscreen.exit'}).state;
  assert.equal(state.fullscreen.retired,true);
  assert.equal(transitionPresentation(state,enterFullscreen).error.code,'UNSUPPORTED_FEATURE');
  assert.equal(transitionPresentation(state,{type:'target',override:true,fullscreen:false,containsHost:true}).error.code,'UNSUPPORTED_FEATURE');
  assert.equal(transitionPresentation(state,{type:'fullscreen.check',id:1,containsHost:true}).error.code,'ABORTED');
  state=transitionPresentation(state,{type:'fullscreen.settled',id:1}).state;
  const second=transitionPresentation(state,enterFullscreen);
  assert.equal(second.requestId,2);
  assert.deepEqual(transitionPresentation(second.state,{type:'fullscreen.settled',id:1}).state,second.state);
  assert.equal(transitionPresentation(second.state,{type:'fullscreen.check',id:1,containsHost:true}).retired,true);
  assert.equal(transitionPresentation(second.state,{type:'fullscreen.check',id:2,containsHost:true}).error,undefined);
  assert.ok(Object.isFrozen(second.state.fullscreen));
});

test('fresh fullscreen observations decide admission, target changes and late host retirement',()=>{
  const state=initialPresentationState();
  assert.equal(transitionPresentation(state,{...enterFullscreen,containsHost:false}).error.code,'INVALID_ARGUMENT');
  assert.equal(transitionPresentation(state,{...enterFullscreen,supported:false}).error.code,'UNSUPPORTED_FEATURE');
  assert.equal(transitionPresentation(state,{type:'target',override:true,containsHost:false,fullscreen:false}).error.code,'INVALID_ARGUMENT');
  assert.equal(transitionPresentation(state,{type:'target',override:true,containsHost:true,fullscreen:true}).error.code,'UNSUPPORTED_FEATURE');
  const target=transitionPresentation(state,{type:'target',override:true,containsHost:true,fullscreen:false}).state;
  assert.equal(target.targetOverride,true);
  const pending=transitionPresentation(target,enterFullscreen);
  assert.equal(transitionPresentation(pending.state,{type:'fullscreen.check',id:pending.requestId,containsHost:false}).error.code,'ABORTED');
});

test('video PiP locks presentation while pending and rejects changed surfaces or subtitles',()=>{
  const initial=initialPresentationState(),pending=transitionPresentation(initial,enterPiP('video'));
  assert.equal(presentationLocksSurface(initial,false),false);
  assert.equal(presentationLocksSurface(pending.state,false),true);
  for(const observation of [{sameSurface:false,subtitles:false},{sameSurface:true,subtitles:true}]) {
    assert.equal(transitionPresentation(pending.state,{type:'pip.check',id:pending.requestId,...observation}).error.code,'ABORTED');
  }
  assert.equal(transitionPresentation(pending.state,enterPiP('document')).error.code,'UNSUPPORTED_FEATURE');
  const retired=transitionPresentation(pending.state,{type:'pip.exit'}).state;
  assert.equal(presentationLocksSurface(retired,false),true);
  assert.equal(transitionPresentation(retired,{type:'pip.check',id:pending.requestId,sameSurface:true,subtitles:false}).retired,true);
  const settled=transitionPresentation(retired,{type:'pip.settled',id:pending.requestId}).state;
  assert.equal(presentationLocksSurface(settled,false),false);
  assert.equal(presentationLocksSurface(settled,true),true);
});

test('document PiP preserves the host across surface changes and terminal state retires every pending lane',()=>{
  let state=transitionPresentation(initialPresentationState(),enterFullscreen).state;
  const pip=transitionPresentation(state,enterPiP('document'));state=pip.state;
  assert.equal(presentationLocksSurface(state,false),false);
  assert.equal(transitionPresentation(state,{type:'pip.check',id:pip.requestId,sameSurface:false,subtitles:true}).error,undefined);
  state=transitionPresentation(state,{type:'destroy'}).state;
  assert.equal(state.fullscreen.retired,true);assert.equal(state.pip.retired,true);
  assert.equal(transitionPresentation(state,{type:'pip.check',id:pip.requestId,sameSurface:true,subtitles:false}).error.code,'ABORTED');
  for(const command of [enterFullscreen,enterPiP('video'),{type:'fullscreen.exit'},{type:'pip.exit'}]) assert.equal(transitionPresentation(state,command).error.code,'ABORTED');
  assert.deepEqual(transitionPresentation(state,{type:'destroy'}).state,state);
  assert.deepEqual(projectPresentation({fullscreen:true,documentPiP:true,videoPiP:true,mediaSession:false}),{fullscreen:true,pictureInPicture:'document',mediaSession:false});
});

test('Media Session lease fences competing owners and stale installation completion',()=>{
  const first=allocateMediaSessionOwner(initialMediaSessionLease()),second=allocateMediaSessionOwner(first.state);
  assert.notEqual(first.owner,second.owner);
  let acquired=transitionMediaSession(second.state,{type:'acquire',owner:first.owner});
  const retiredSerial=acquired.state.serial;
  assert.equal(acquired.outcome,'acquired');
  assert.equal(transitionMediaSession(acquired.state,{type:'acquire',owner:first.owner}).outcome,'retained');
  assert.equal(transitionMediaSession(acquired.state,{type:'acquire',owner:second.owner}).outcome,'denied');
  const vacant=transitionMediaSession(acquired.state,{type:'release',owner:first.owner,serial:retiredSerial}).state;
  acquired=transitionMediaSession(vacant,{type:'acquire',owner:first.owner});
  assert.equal(ownsMediaSession(acquired.state,first.owner,retiredSerial),false);
  for(const type of ['release','activate']) assert.equal(transitionMediaSession(acquired.state,{type,owner:first.owner,serial:retiredSerial}).state,acquired.state);
  const active=transitionMediaSession(acquired.state,{type:'activate',owner:first.owner,serial:acquired.state.serial}).state;
  assert.equal(active.phase,'active');assert.ok(Object.isFrozen(active));
});

function environment(t){
  const keys=['document','HTMLVideoElement','ShadowRoot','documentPictureInPicture'];
  const previous=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  t.after(()=>{for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
  class Video{}
  globalThis.HTMLVideoElement=Video;globalThis.ShadowRoot=class {};
  const handlers=new Map(),media={playbackState:'none',setActionHandler(name,handler){handlers.set(name,handler);},setPositionState(){}};
  const doc={fullscreenElement:null,pictureInPictureElement:null,defaultView:{navigator:{mediaSession:media}},
    async exitFullscreen(){doc.fullscreenElement=null;},async exitPictureInPicture(){doc.pictureInPictureElement=null;},
    createComment(){return {parentNode:{},replaceWith(host){host.ownerDocument=doc;this.parentNode=null;}};},
  };
  globalThis.document=doc;delete globalThis.documentPictureInPicture;
  const make=()=>{
    const host={ownerDocument:doc,parentNode:null,before(){},async requestFullscreen(){doc.fullscreenElement=host;}};
    const state={sourceId:1,playbackIntent:'pause',duration:10,currentTime:1,playbackRate:1,subtitlesVisible:false,mediaInfo:{subtitle:null}};
    const listeners=new Set(),calls=[];
    const player={surface:new Video(),state,play:async()=>{calls.push('play');},pause:async()=>{calls.push('pause');},seek:async time=>{calls.push(['seek',time]);},subscribe(listener){listeners.add(listener);listener(state);return ()=>listeners.delete(listener);}};
    player.surface.requestPictureInPicture=async()=>{doc.pictureInPictureElement=player.surface;};
    const presentation=new PlayerPresentation(player,()=>host);
    return {host,player,presentation,listeners,calls};
  };
  return {doc,media,handlers,make,Video};
}

test('presentation construction does not inspect a Player host before its field initialization completes',async t=>{
  const env=environment(t);let host,reads=0;
  const player={surface:null,state:{}};
  const presentation=new PlayerPresentation(player,()=>{reads++;return host;});
  assert.equal(reads,0);
  host={ownerDocument:env.doc};
  assert.equal(presentation.state.mediaSession,false);
  await presentation.destroy();
});

test('shell invokes gesture APIs immediately and observes external fullscreen changes on every read',async t=>{
  const env=environment(t),{host,presentation}=env.make(),wait=deferred();let invoked=false;
  host.requestFullscreen=()=>{invoked=true;return wait.promise;};
  const request=presentation.requestFullscreen();
  assert.equal(invoked,true);
  assert.equal(presentation.state.fullscreen,false);
  env.doc.fullscreenElement=host;assert.equal(presentation.state.fullscreen,true);
  await presentation.exitFullscreen();
  env.doc.fullscreenElement=host;wait.resolve();
  await assert.rejects(request,error=>error.code==='ABORTED');
  assert.equal(env.doc.fullscreenElement,null);
  host.requestFullscreen=async()=>{env.doc.fullscreenElement=host;};
  await presentation.requestFullscreen();
  env.doc.fullscreenElement=null;assert.equal(presentation.state.fullscreen,false);
  await presentation.destroy();
});

test('shell restores video PiP after late entry into a destroyed owner or changed surface',async t=>{
  const env=environment(t);
  for(const action of ['destroy','replace','subtitles']){
    const {player,presentation}=env.make(),surface=player.surface,wait=deferred();let invoked=false;
    surface.requestPictureInPicture=()=>{invoked=true;return wait.promise;};
    const request=presentation.requestPictureInPicture();assert.equal(invoked,true);assert.equal(presentation.locksSurface,true);
    if(action==='destroy')await presentation.destroy();
    if(action==='replace')player.surface=new env.Video();
    if(action==='subtitles'){player.state.subtitlesVisible=true;player.state.mediaInfo.subtitle={id:'sub'};}
    env.doc.pictureInPictureElement=surface;wait.resolve();
    await assert.rejects(request,error=>error.code==='ABORTED');
    assert.equal(env.doc.pictureInPictureElement,null);assert.equal(presentation.locksSurface,false);
    await presentation.destroy();
  }
});

test('document PiP shell rejects late windows and stale pagehide cannot restore a replacement',async t=>{
  const env=environment(t),{presentation}=env.make(),wait=deferred();let invoked=false;
  const windows=[];
  const window=()=>{const win={closed:false,document:{body:{style:{},append(){}}},addEventListener(_name,callback){this.hide=callback;},removeEventListener(){},close(){this.closed=true;}};windows.push(win);return win;};
  globalThis.documentPictureInPicture={requestWindow(){invoked=true;return wait.promise;}};
  const first=presentation.requestPictureInPicture('document');assert.equal(invoked,true);
  await presentation.exitPictureInPicture();const retired=window();wait.resolve(retired);
  await assert.rejects(first,error=>error.code==='ABORTED');assert.equal(retired.closed,true);
  globalThis.documentPictureInPicture={requestWindow:async()=>window()};
  await presentation.requestPictureInPicture('document');const old=windows.at(-1);
  await presentation.exitPictureInPicture();await presentation.requestPictureInPicture('document');
  old.hide();assert.equal(presentation.state.pictureInPicture,'document');
  await presentation.destroy();assert.equal(windows.at(-1).closed,true);
});

test('Media Session shell enforces document ownership and retired handlers cannot control another source',async t=>{
  const env=environment(t),a=env.make(),b=env.make();
  a.presentation.setMediaSessionEnabled(true);
  const retired=env.handlers.get('play');
  assert.equal(a.presentation.state.mediaSession,true);
  assert.throws(()=>b.presentation.setMediaSessionEnabled(true),error=>error.code==='UNSUPPORTED_FEATURE');
  env.handlers.get('play')();await Promise.resolve();assert.deepEqual(a.calls,['play']);
  await a.presentation.destroy();b.presentation.setMediaSessionEnabled(true);
  retired();await Promise.resolve();assert.deepEqual(a.calls,['play']);
  env.handlers.get('pause')();await Promise.resolve();assert.deepEqual(b.calls,['pause']);
  await b.presentation.destroy();assert.equal(env.media.playbackState,'none');
  assert.equal(a.listeners.size,0);assert.equal(b.listeners.size,0);
});

test('Media Session installation survives synchronous disable and reacquire in the initial subscriber',async t=>{
  const env=environment(t),entry=env.make();let nested=false,stopped=0;
  entry.player.subscribe=listener=>{
    listener(entry.player.state);
    if(!nested){nested=true;entry.presentation.setMediaSessionEnabled(false);entry.presentation.setMediaSessionEnabled(true);}
    return ()=>{stopped++;};
  };
  entry.presentation.setMediaSessionEnabled(true);
  assert.equal(stopped,1,'Retired installation must release its late unsubscribe handle');
  assert.equal(entry.presentation.state.mediaSession,true);
  env.handlers.get('play')();await Promise.resolve();assert.deepEqual(entry.calls,['play']);
  await entry.presentation.destroy();assert.equal(stopped,2);
});

test('Media Session release cannot clear a different owner installed during unsubscribe',async t=>{
  const env=environment(t),a=env.make(),b=env.make();
  a.player.subscribe=listener=>{listener(a.player.state);return ()=>b.presentation.setMediaSessionEnabled(true);};
  a.presentation.setMediaSessionEnabled(true);a.presentation.setMediaSessionEnabled(false);
  assert.equal(b.presentation.state.mediaSession,true);
  assert.equal(env.media.playbackState,'paused');
  env.handlers.get('play')();await Promise.resolve();assert.deepEqual(b.calls,['play']);
  await a.presentation.destroy();await b.presentation.destroy();
});

for(const boundary of ['marker','style','append','listener'])test(`document PiP rolls back ${boundary} acquisition failure`,async t=>{
 const env=environment(t),{host,presentation}=env.make(),failure=Error(boundary);let restored=0,closed=0;const listeners=new Set();
 env.doc.createComment=()=>({parentNode:{},replaceWith(){this.parentNode=null;restored++;}});
 const body={style:{},append(){if(boundary==='append')throw failure;}},win={document:{body},addEventListener(_name,fn){listeners.add(fn);if(boundary==='listener')throw failure;},removeEventListener(_name,fn){listeners.delete(fn);},close(){closed++;}};
 if(boundary==='marker')host.before=()=>{throw failure;};if(boundary==='style')Object.defineProperty(body,'style',{get(){throw failure;}});
 globalThis.documentPictureInPicture={requestWindow:async()=>win};await assert.rejects(presentation.requestPictureInPicture('document'),e=>e===failure);assert.equal(closed,1);assert.equal(restored,1);assert.equal(listeners.size,0);assert.equal(presentation.control.pip,null);assert.equal(presentation.pipWindow,undefined);await presentation.destroy();
});
test('document PiP retirement during host movement restores before closing late window',async t=>{
 const env=environment(t),{presentation}=env.make();let destroyed,restored=0,closed=0,registered=0;
 env.doc.createComment=()=>({parentNode:{},replaceWith(){this.parentNode=null;restored++;}});
 const win={document:{body:{style:{},append(){destroyed=presentation.destroy();}}},addEventListener(){registered++;},removeEventListener(){},close(){closed++;}};
 globalThis.documentPictureInPicture={requestWindow:async()=>win};await assert.rejects(presentation.requestPictureInPicture('document'),e=>e.code==='ABORTED');await destroyed;assert.equal(restored,1);assert.equal(closed,1);assert.equal(registered,0);assert.equal(presentation.pipWindow,undefined);
});
test('presentation destruction attempts window and fullscreen release after host restoration fails',async t=>{
 const env=environment(t),{host,presentation}=env.make(),failure=Error('restore');let closed=0,exited=0,nested;
 presentation.pipWindow={close(){closed++;}};presentation.restore=()=>{nested=presentation.destroy();throw failure;};env.doc.fullscreenElement=host;env.doc.exitFullscreen=async()=>{exited++;env.doc.fullscreenElement=null;};
 const done=presentation.destroy();assert.equal(nested,done);assert.equal(presentation.destroy(),done);await assert.rejects(done,e=>e===failure);assert.equal(closed,1);assert.equal(exited,1);
});
for(const api of ['fullscreen','document'])test(`${api} method getter retirement prevents gesture invocation`,async t=>{
 const env=environment(t),{host,presentation}=env.make();let calls=0,done;
 if(api==='fullscreen')Object.defineProperty(host,'requestFullscreen',{get(){done=presentation.destroy();return()=>{calls++;};}});
 else globalThis.documentPictureInPicture={get requestWindow(){done=presentation.destroy();return()=>{calls++;};}};
 await assert.rejects(api==='fullscreen'?presentation.requestFullscreen():presentation.requestPictureInPicture('document'),e=>e.code==='ABORTED');await done;assert.equal(calls,0);
});
