// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import {acceptSourceIdentity,publishControlSnapshot} from './helpers/player-control.mjs';
import {initialPlayerControl} from '../web/generated/internal/machine/state.js';
import assert from 'node:assert/strict';
import {PlaybackStatistics} from '../web/generated/internal/playback-statistics.js';
import {materializeSource,CUSTOM_SOURCE_PLAYBACK_LIMIT} from '../web/generated/sources.js';
import {tracks,mediaInfo} from '../web/generated/internal/state.js';

test('statistics distinguish startup, buffering, seeks and source epochs',()=>{
 let now=100;const stats=new PlaybackStatistics(()=>now);
 assert.equal(stats.snapshot().sourceId,null);assert.equal(stats.snapshot().presentedFrames,null);
 stats.accept(1,false,20);
 const state={sourceId:1,status:'buffering',playbackIntent:'play',pendingOperation:null};
 stats.observe(state);now=150;stats.observe({...state,status:'playing'});
 assert.equal(stats.snapshot().firstPlayingMs,50);assert.equal(stats.snapshot().rebufferCount,0);
 now=200;stats.observe(state);now=250;assert.equal(stats.snapshot().rebufferMs,50);
 stats.observe({...state,pendingOperation:{kind:'seeking'}});now=300;stats.observe({...state,status:'playing'});
 assert.equal(stats.snapshot().rebufferMs,50);stats.seek(10);assert.equal(stats.snapshot().seekCount,1);
 stats.accept(1,true,100);assert.equal(stats.snapshot().sessionEpoch,2);assert.equal(stats.snapshot().openToAcceptanceMs,20);
 stats.accept(2,false,15);assert.equal(stats.snapshot().seekCount,0);stats.clear();assert.equal(stats.snapshot().sourceId,null);
});

test('custom staging serializes short reads, copies provider buffers and releases ownership',async()=>{
 let active=0,peak=0,closed=0;
 const file=await materializeSource({kind:'bytes',transport:'application-managed',id:'test',size:10,ownership:'owned',close:()=>closed++,read:async(offset,length)=>{peak=Math.max(peak,++active);await Promise.resolve();active--;return new Uint8Array(Math.min(length,3)).fill(offset);}});
 assert.deepEqual([...new Uint8Array(await file.arrayBuffer())],[0,0,0,3,3,3,6,6,6,9]);assert.equal(peak,1);assert.equal(closed,1);
});

test('custom reads enforce bounds, abort late reads, and never close borrowed sources',async()=>{
 const base={kind:'bytes',transport:'application-managed',id:'test',size:2,read:async()=>new Uint8Array()};
 await assert.rejects(materializeSource(base),e=>e.code==='SOURCE_CHANGED');
 await assert.rejects(materializeSource({...base,size:CUSTOM_SOURCE_PLAYBACK_LIMIT+1}),e=>e.code==='UNSUPPORTED_FEATURE');
 let start,release,closed=0;const ready=new Promise(resolve=>{start=resolve;});const controller=new AbortController();
 const work=materializeSource({...base,close:()=>closed++,read:async()=>{start();return new Promise(resolve=>{release=resolve;});}},controller.signal);
 await ready;controller.abort();await assert.rejects(work,e=>e.code==='ABORTED');release(new Uint8Array(2));assert.equal(closed,0);
});

test('attachment identity survives ordinal removal and chapters are source scoped',()=>{
 const raw=[{id:2,type:'sub',external:true,'attachment-id':'subtitle-2','external-index':2}];
 assert.equal(tracks(raw,1,'software')[0].id,tracks([{...raw[0],id:1,'external-index':1}],1,'native')[0].id);
 assert.equal(tracks(raw,1,'native','shaka-mse')[0].id,tracks(raw,1,'software')[0].id);
 const properties=new Map([['chapter-list',[{time:10,title:'B'},{time:0,title:'A'}]],['duration',20]]);
 const info=mediaInfo(properties,'native',undefined,[],3);assert.deepEqual(info.chapters.map(c=>[c.id,c.start,c.end]),[['3:chapter:1',0,10],['3:chapter:0',10,20]]);
 assert.equal(mediaInfo(new Map(),'native',undefined,[]).chapters,null);
});

test('mutable source identity fails instead of combining different byte sources',async()=>{
 const source={kind:'bytes',transport:'application-managed',id:'one',size:8,read:async()=>{source.id='two';return new Uint8Array(8);}};
 await assert.rejects(materializeSource(source),e=>e.code==='SOURCE_CHANGED');
});

test('queued boundary work honors the latest range and cannot pause a replacement',async()=>{
 const {Player}=await import('../web/generated/unified-player.js');
 const player=Object.create(Player.prototype);let run,reject,pauses=0;
 const source={},session={backend:{pause:async()=>{pauses++;},seek:async()=>{},play:async()=>{}}};
 Object.assign(player,{control:initialPlayerControl(),operationResources:new Map(),source,current:session,settings:{pause:false},playbackRange:{start:1,end:2},loopPolicy:false,publish(){},settled:async()=>{},enqueue(work){run=work;return new Promise((_,no)=>{reject=no;});}});
 acceptSourceIdentity(player,1);publishControlSnapshot(player,{currentTime:3,duration:10,status:'playing'});player.playbackRange={start:1,end:2};player.enforceBoundary();player.playbackRange=null;await run();assert.equal(pauses,0,'removed range cannot issue a stale pause/seek');
 player.current={backend:session.backend};player.source={};acceptSourceIdentity(player,2);reject(Error('retired boundary'));await new Promise(resolve=>setImmediate(resolve));assert.equal(player.settings.pause,false,'old failure cannot change replacement intent');
});

test('late video PiP entry is locked during the request and retired on destroy',async()=>{
 const {PlayerPresentation}=await import('../web/generated/presentation.js');
 const previousDocument=globalThis.document,previousVideo=globalThis.HTMLVideoElement;let finish;
 class Video {requestPictureInPicture(){return new Promise(resolve=>{finish=()=>{document.pictureInPictureElement=this;resolve();};});}}
 const doc={pictureInPictureElement:null,fullscreenElement:null,exitPictureInPicture:async()=>{doc.pictureInPictureElement=null;}};
 globalThis.document=doc;globalThis.HTMLVideoElement=Video;
 const player={surface:new Video(),state:{subtitlesVisible:false,mediaInfo:{subtitle:null}}},presentation=new PlayerPresentation(player,()=>({ownerDocument:doc}));
 try{const request=presentation.requestPictureInPicture();assert.equal(presentation.locksSurface,true);await presentation.destroy();finish();await assert.rejects(request,e=>e.code==='ABORTED');assert.equal(doc.pictureInPictureElement,null);}
 finally{globalThis.document=previousDocument;globalThis.HTMLVideoElement=previousVideo;}
});

test('document PiP rejects concurrent entry and ignores retired window events',async()=>{
 const {PlayerPresentation}=await import('../web/generated/presentation.js');
 const oldDocument=globalThis.document,oldAPI=globalThis.documentPictureInPicture;let restores=0,calls=0;
 const doc={pictureInPictureElement:null,fullscreenElement:null,createComment:()=>({parentNode:{},replaceWith(){restores++;this.parentNode=null;}})};
 const host={ownerDocument:doc,before(){}};
 const windows=[0,1].map(()=>({closed:false,document:{body:{style:{},append(){}}},addEventListener(type,listener){this.hide=listener;},removeEventListener(){},close(){this.closed=true;}}));
 globalThis.document=doc;globalThis.documentPictureInPicture={requestWindow:async()=>windows[calls++]};
 const presentation=new PlayerPresentation({surface:null,state:{}},()=>host);
 try{
  const first=presentation.requestPictureInPicture('document');await assert.rejects(presentation.requestPictureInPicture('document'),e=>e.code==='UNSUPPORTED_FEATURE');await first;
  await presentation.exitPictureInPicture();await presentation.requestPictureInPicture('document');windows[0].hide();assert.equal(restores,1);assert.equal(presentation.state.pictureInPicture,'document');await presentation.destroy();assert.equal(restores,2);
 }finally{globalThis.document=oldDocument;globalThis.documentPictureInPicture=oldAPI;}
});

test('idle controls cannot create source-scoped seek statistics',()=>{
 const stats=new PlaybackStatistics(()=>100);stats.seek(12);assert.equal(stats.snapshot().sourceId,null);assert.equal(stats.snapshot().seekCount,0);assert.equal(stats.snapshot().lastSeekMs,null);
 stats.accept(1,false,20);stats.seek(10);assert.equal(stats.snapshot().seekCount,1);stats.clear();stats.seek(5);assert.equal(stats.snapshot().seekCount,0);
});
