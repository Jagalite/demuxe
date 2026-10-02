// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/native-captions.js';
import * as backend from '../../web/generated/internal/machine/native-backend.js';
import {NativePlayer} from '../../web/generated/internal/native-player.js';
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function model(){let state=backend.initialNativeBackend();const history=[];return {get state(){return state;},send(event){const before=structuredClone(state),old=state,result=backend.transitionNativeBackend(state,event);assert.deepEqual(old,before);state=result.state;history.push(event);return result;},begin(kind='browser-url'){return this.send({type:'caption.begin',kind,now:100,attachmentId:'caption'}).request;},replay(){assert.deepEqual(history.reduce((state,event)=>backend.transitionNativeBackend(state,event).state,backend.initialNativeBackend()),state);}};}
test('caption attachment acceptance preserves stable identities and ignores retired sources',()=>{
 const m=model(),one=m.begin('browser-file'),two=m.begin('browser-file');m.send({type:'caption.accept',request:two,publicId:null,select:false});m.send({type:'caption.accept',request:one,publicId:null,select:false});assert.equal(core.nativeCaptionAttachment(m.state.captions,two.id).publicId,'200001');assert.equal(core.nativeCaptionAttachment(m.state.captions,one.id).publicId,'200002');m.send({type:'caption.finish',request:one});assert.equal(backend.nativeRequestCurrent(m.state,one),true);m.send({type:'source'});assert.equal(m.send({type:'caption.accept',request:one,publicId:'late',select:true}).accepted,false);assert.equal(m.state.captions.nextIndex,1);m.replay();
});
test('caption deadlines use explicit time and finish removes only unaccepted reservations',()=>{
 const m=model(),one=m.begin();assert.equal(m.send({type:'caption.deadline',request:one,now:500}).remaining,14600);assert.equal(m.send({type:'caption.deadline',request:one,now:15100}).failure,'caption-timeout');m.send({type:'caption.finish',request:one});assert.equal(m.state.captions.attachments.length,0);const overlay=m.begin('overlay');assert.equal(m.send({type:'caption.deadline',request:overlay,now:100000}).accepted,false);m.replay();
});
test('new explicit selection fences late default overlay selection while retaining attachment',()=>{
 const m=model(),attachment=m.begin('overlay'),selection=m.send({type:'control.begin',domain:'subtitles'}).request;m.send({type:'caption.selection',request:selection,selected:'chosen'});m.send({type:'caption.accept',request:attachment,publicId:'late',select:true});assert.equal(m.state.captions.selected,'chosen');assert.equal(core.nativeCaptionAttachment(m.state.captions,attachment.id).publicId,'late');m.replay();
});
test('caption effect ownership retains active physical work across logical supersession',()=>{
 const m=model(),first=m.send({type:'control.begin',domain:'subtitles'}).request;m.send({type:'caption.effect.begin',request:first});const second=m.send({type:'control.begin',domain:'subtitles'}).request;m.send({type:'caption.effect.begin',request:second});assert.equal(backend.nativeRequestCurrent(m.state,first),false);assert.equal(m.state.captions.effect.id,first.id);assert.equal(m.send({type:'caption.effect.finished',request:first}).captionStart.id,second.id);const gain=m.send({type:'control.begin',domain:'gain'}).request;assert.equal(m.send({type:'caption.effect.begin',request:gain}).accepted,false);m.send({type:'source'});assert.equal(m.send({type:'caption.effect.finished',request:second}).accepted,false);m.replay();
});
test('caption presentation keeps explicit, auto, visibility and overlay precedence',()=>{
 const state=core.initialNativeCaptions(),facts={overlaySelected:false,preferredIndex:null,tracks:[{id:'200001',caption:true},{id:'1',caption:false},{id:'2',caption:false}]};assert.deepEqual(core.selectNativeCaptionPresentation(state,facts),{overlay:false,modes:['disabled','showing','disabled']});assert.deepEqual(core.selectNativeCaptionPresentation(state,{...facts,preferredIndex:0}).modes,['showing','disabled','disabled']);assert.deepEqual(core.selectNativeCaptionPresentation({...state,selected:'2'},facts).modes,['disabled','disabled','showing']);assert.deepEqual(core.selectNativeCaptionPresentation(state,{...facts,overlaySelected:true}),{overlay:true,modes:['disabled','disabled','disabled']});assert.equal(core.selectNativeCaptionPresentation({...state,visible:false},{...facts,overlaySelected:true}).overlay,false);assert.equal(core.selectNativeCaptionPresentation({...state,selected:'no'},{...facts,overlaySelected:true}).overlay,false);
});
test('caption fidelity and experimental admission preserve prior precise policy',()=>{
 const cue={start:1,end:2,text:'hello'};assert.equal(core.nativeCaptionFidelity([cue],[{start:4,end:5,text:'hello'}],3),true);assert.equal(core.nativeCaptionFidelity([cue],[{start:4,end:5,text:'other'}],3),false);assert.equal(core.nativeCaptionFidelity([cue],[{start:4.01,end:5,text:'hello'}],3),false);assert.equal(core.nativeCaptionFidelity([cue],[],3),false);assert.match(core.nativeOverlayAdmission({adapted:true,adaptation:'opus',enabled:false,format:'ass'}),/Opus/);assert.match(core.nativeOverlayAdmission({adapted:false,enabled:false,format:'ass'}),/experimental/);assert.equal(core.nativeOverlayAdmission({adapted:false,enabled:true,format:'ass'}),undefined);
});
function install(t,name,value){const old=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});t.after(()=>{if(old)Object.defineProperty(globalThis,name,old);else delete globalThis[name];});}
function candidate(t){
 const elements=[],revoked=[],created=[];let appended,createdHook,serial=0;
 const textTracks=[];const trackEvents=new EventTarget();textTracks.addEventListener=trackEvents.addEventListener.bind(trackEvents);textTracks.removeEventListener=trackEvents.removeEventListener.bind(trackEvents);
 const video=Object.assign(new EventTarget(),{textTracks,paused:true,muted:false,currentTime:0,duration:10,ended:false,volume:1,playbackRate:1,preload:'auto',buffered:{length:0},seekable:{length:0},getVideoPlaybackQuality:()=>({totalVideoFrames:0}),pause(){this.paused=true;},load(){},removeAttribute(){},replaceChildren(){for(const element of [...elements])element.remove();},querySelector:()=>elements.find(track=>track.default),querySelectorAll:()=>[...elements],append(element){elements.push(element);textTracks.push(element.track);appended?.(element);}});
 function makeTrack(){const listeners=new Map(),track=Object.assign(new EventTarget(),{default:false,track:{mode:'disabled',cues:[],label:'Caption',language:'en'},removes:0,remove(){this.removes++;let index=elements.indexOf(this);if(index>=0)elements.splice(index,1);index=textTracks.indexOf(this.track);if(index>=0)textTracks.splice(index,1);}});const add=track.addEventListener.bind(track),remove=track.removeEventListener.bind(track);track.addEventListener=(name,fn,opts)=>{add(name,fn,opts);if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);track.onAdd?.(name,fn);};track.removeEventListener=(name,fn,opts)=>{listeners.get(name)?.delete(fn);remove(name,fn,opts);};track.listeners=listeners;created.push(track);createdHook?.(track);return track;}
 install(t,'document',{createElement:()=>makeTrack()});install(t,'location',{href:'https://media.test/player'});t.mock.method(URL,'createObjectURL',()=>`blob:caption-${++serial}`);t.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));
 const player=new NativePlayer(video);player.nativeASS=true;
 const f={player,video,elements,created,revoked,load(element=elements.at(-1),cues=[]){element.track.cues=cues;element.dispatchEvent(new Event('load'));},set append(fn){appended=fn;},set create(fn){createdHook=fn;}};
 t.after(()=>player.destroy());return f;
}
const asset=(select=false)=>({attachmentId:'file',format:'vtt',label:'Caption',language:'en',select,bytes:new TextEncoder().encode('WEBVTT\n\n00:01.000 --> 00:02.000\nhello\n')});
const overlayAsset=(id,select=false)=>({attachmentId:id,format:'ass',label:id,select,bytes:new Uint8Array()});
function overlay(f,add){const service={ready:Promise.resolve(),tracks:[{id:'embedded',selected:true}],visible(){},select:async id=>{service.tracks=service.tracks.map(track=>({...track,selected:track.id===id}));},add,destroy:async()=>{}};f.player.mpvSubs=service;return service;}
test('actual browser caption preserves cue fidelity, file identity and URL-backed ID range',async t=>{
 const f=candidate(t),file=f.player.addSubtitle(asset());f.load(undefined,[{startTime:1,endTime:2,text:'hello'}]);await file;const url=f.player.addTextTrack({src:'/caption.vtt',label:'URL'},'url');f.load();await url;const tracks=f.player.properties.get('track-list');assert.deepEqual(tracks.map(track=>[track.id,track['attachment-id']]),[['200001','file'],['1','url']]);assert.equal(f.player.captionWait.size,0);assert.equal(f.player.native.captions.attachments.length,2);await f.player.destroy();assert.deepEqual(f.revoked,['blob:caption-1']);assert.equal(f.elements.length,0);
});
test('actual failed fidelity removes only owned track and revokes its URL once',async t=>{
 const f=candidate(t),first=f.player.addSubtitle(asset());f.load(undefined,[{startTime:1,endTime:2,text:'changed'}]);await assert.rejects(first,/fidelity/);assert.equal(f.elements.length,0);assert.equal(f.player.native.captions.attachments.length,0);assert.deepEqual(f.revoked,['blob:caption-1']);await f.player.destroy();assert.deepEqual(f.revoked,['blob:caption-1']);
});
test('actual source replacement rejects pending browser attachment and removes old listeners',async t=>{
 const f=candidate(t),pending=f.player.addTextTrack({src:'/old.vtt',label:'old'}),rejected=assert.rejects(pending,/retired/),old=f.elements[0];f.player.loadPlan=async()=>{};await f.player.openRemote({url:'https://media.test/new.mp4'});await rejected;old.dispatchEvent(new Event('load'));assert.equal(f.elements.length,0);assert.equal(old.removes,1);assert.equal([...old.listeners.values()].reduce((n,set)=>n+set.size,0),0);assert.equal(f.player.native.captions.attachments.length,0);
});
test('actual late browser element acquisition after destruction is removed before insertion',async t=>{
 const f=candidate(t);f.create=()=>{void f.player.destroy();};await assert.rejects(f.player.addTextTrack({src:'/a.vtt',label:'a'}),/destroyed/);assert.equal(f.created[0].removes,1);assert.equal(f.elements.length,0);assert.equal(f.player.browserTracks.size,0);
});
test('actual listener registration arriving after retirement is removed',async t=>{
 const f=candidate(t);f.create=track=>{track.onAdd=()=>{track.onAdd=undefined;void f.player.destroy();};};await assert.rejects(f.player.addTextTrack({src:'/a.vtt',label:'a'}),/destroyed/);assert.equal([...f.created[0].listeners.values()].reduce((n,set)=>n+set.size,0),0);assert.equal(f.elements.length,0);
});
test('actual browser load callback can retire source without accepting caption or publishing',async t=>{
 const f=candidate(t);let source;f.append=element=>{Object.defineProperty(element.track,'cues',{get(){f.player.retireNativeSource();return [];}});source=element;};const pending=f.player.addTextTrack({src:'/a.vtt',label:'a'}),rejected=assert.rejects(pending,/retired/);f.player.remux={timelineBias:0,destroy:async()=>{}};source.dispatchEvent(new Event('load'));await rejected;assert.equal(f.player.native.captions.attachments.length,0);assert.equal(f.elements.length,0);
});
test('actual early caption timer re-arms once and stale reused-handle callback cannot fire again',async t=>{
 const f=candidate(t),callbacks=[],delays=[];let now=100;t.mock.method(performance,'now',()=>now);t.mock.method(globalThis,'setTimeout',(fn,delay)=>{callbacks.push(fn);delays.push(delay);return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});const pending=f.player.addTextTrack({src:'/a.vtt',label:'a'}),rejected=assert.rejects(pending,/timed out/);now=500;callbacks[0]();assert.deepEqual(delays,[15000,14600]);callbacks[0]();assert.deepEqual(delays,[15000,14600]);now=15100;callbacks[1]();await rejected;assert.equal(f.player.captionWait.size,0);assert.equal(f.elements.length,0);
});
test('actual timer reschedule failure settles attachment and releases its DOM resources',async t=>{
 const f=candidate(t),failure=Error('timer unavailable');let callback,count=0;t.mock.method(performance,'now',()=>0);t.mock.method(globalThis,'setTimeout',fn=>{if(count++)throw failure;callback=fn;return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});const pending=f.player.addTextTrack({src:'/a.vtt',label:'a'}),rejected=assert.rejects(pending,error=>error===failure);callback();await rejected;assert.equal(f.player.captionWait.size,0);assert.equal(f.elements.length,0);
});
test('actual overlay additions serialize acquisition and acceptance on one source owner',async t=>{
 const f=candidate(t),a=deferred(),b=deferred(),calls=[];overlay(f,asset=>{calls.push(asset.attachmentId);return asset.attachmentId==='a'?a.promise:b.promise;});const first=f.player.addSubtitle(overlayAsset('a')),second=f.player.addSubtitle(overlayAsset('b'));await flush();assert.deepEqual(calls,['a']);a.resolve('a');await first;await flush();assert.deepEqual(calls,['a','b']);b.resolve('b');await second;assert.equal(f.player.captionEffects.size,0);assert.equal(f.player.native.captions.effect,null);assert.equal(f.player.native.captions.attachments.length,2);
});
test('actual superseded overlay selection cannot finish after newer selection physically',async t=>{
 const f=candidate(t),first=deferred(),calls=[];let physical='embedded';const service=overlay(f,async()=> 'unused');service.tracks.push({id:'next',selected:false});service.select=id=>{calls.push(id);return (id==='embedded'?first.promise:Promise.resolve()).then(()=>{physical=id;});};const old=f.player.selectTrack('sub','embedded'),rejected=assert.rejects(old,/retired/),next=f.player.selectTrack('sub','next');await rejected;assert.deepEqual(calls,['embedded']);first.resolve();await next;assert.deepEqual(calls,['embedded','next']);assert.equal(physical,'next');assert.equal(f.player.selectedSub,'next');assert.equal(f.player.captionEffects.size,0);
});
test('actual late default attachment cannot override newer explicit subtitle selection',async t=>{
 const f=candidate(t),hold=deferred();overlay(f,()=>hold.promise);const attachment=f.player.addSubtitle(overlayAsset('late',true));await flush();const selection=f.player.selectTrack('sub','no');hold.resolve('late');await Promise.all([attachment,selection]);assert.equal(f.player.selectedSub,'no');
});
test('actual overlay retirement rejects promptly while late completion cannot enter replacement',async t=>{
 const f=candidate(t),hold=deferred(),calls=[];overlay(f,()=>hold.promise);const pending=f.player.addSubtitle(overlayAsset('old',true)),rejected=assert.rejects(pending,/retired/);await flush();f.player.retireNativeSource();await rejected;f.player.mpvSubs={tracks:[],visible(){calls.push('replacement');},destroy:async()=>{}};hold.resolve('old');await flush();assert.deepEqual(calls,[]);assert.equal(f.player.native.captions.attachments.length,0);
});
test('actual subtitle visibility reentry stops old browser-mode writes',async t=>{
 const f=candidate(t),first=f.player.addTextTrack({src:'/a.vtt',label:'a'});f.load();await first;const service=overlay(f,async()=> 'unused');let reentered=false;service.visible=()=>{if(!reentered){reentered=true;void f.player.subtitleVisible(true);}};await assert.rejects(f.player.subtitleVisible(false),/retired/);await flush();assert.equal(f.player.subsVisible,true);assert.equal(f.player.native.controls.pending['subtitle-visibility'],undefined);
});
test('URL browser tracks without supplied attachment identity retain legacy projection',async t=>{const f=candidate(t),pending=f.player.addTextTrack({src:'/plain.vtt',label:'plain'});f.load();await pending;const track=f.player.properties.get('track-list')[0];assert.equal('external' in track,false);assert.equal('attachment-id' in track,false);});
test('media-event waits compose source retirement and exact loading versus operation budgets',()=>{
 const m=model(),load=m.send({type:'event.begin',event:'loadeddata',now:100,loadBudget:500}).request,seek=m.send({type:'event.begin',event:'seeked',now:100,loadBudget:500}).request;
 assert.equal(m.send({type:'event.deadline',request:load,now:300}).remaining,300);assert.deepEqual(m.send({type:'event.deadline',request:load,now:600}).eventTimeout,{event:'loadeddata',loading:true,budget:500});assert.equal(m.send({type:'event.deadline',request:seek,now:600}).remaining,24500);m.send({type:'event.finish',request:load});assert.equal(m.state.waits.length,1);m.send({type:'source'});assert.equal(m.send({type:'event.deadline',request:seek,now:30000}).accepted,false);assert.deepEqual(m.state.waits,[]);m.replay();
});
test('actual media wait installs listeners then invokes start in the same stack',async t=>{
 const f=candidate(t),calls=[];const pending=f.player.wait('seeked',()=>{calls.push('start');f.video.dispatchEvent(new Event('seeked'));});assert.deepEqual(calls,['start']);await pending;assert.equal(f.player.eventWaits.size,0);assert.equal(f.player.native.waits.length,0);
});
test('actual media wait source retirement cannot complete a replacement wait',async t=>{
 const f=candidate(t),old=f.player.wait('seeked',()=>{}),rejected=assert.rejects(old,/retired/);f.player.retireNativeSource();await rejected;const next=f.player.wait('seeked',()=>{});assert.equal(f.player.native.waits.length,1);f.video.dispatchEvent(new Event('seeked'));await next;assert.equal(f.player.eventWaits.size,0);
});
test('actual media deadline rejects at explicit budget and ignores a reused timer callback',async t=>{
 const f=candidate(t),callbacks=[],delays=[];let now=0;t.mock.method(performance,'now',()=>now);t.mock.method(globalThis,'setTimeout',(fn,delay)=>{callbacks.push(fn);delays.push(delay);return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});f.player.loadTimeoutMs=800;const pending=f.player.wait('loadedmetadata',()=>{}),rejected=assert.rejects(pending,error=>error.name==='NativeLoadTimeout'&&error.budgetMs===800);now=200;callbacks[0]();assert.deepEqual(delays,[800,600]);callbacks[0]();assert.deepEqual(delays,[800,600]);now=800;callbacks[1]();await rejected;assert.equal(f.player.native.waits.length,0);
});
test('actual media timer reschedule failure settles wait without lingering authority',async t=>{
 const f=candidate(t),failure=Error('timer unavailable');let callback,count=0;t.mock.method(performance,'now',()=>0);t.mock.method(globalThis,'setTimeout',fn=>{if(count++)throw failure;callback=fn;return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});const pending=f.player.wait('seeked',()=>{}),rejected=assert.rejects(pending,error=>error===failure);callback();await rejected;assert.equal(f.player.eventWaits.size,0);assert.equal(f.player.native.waits.length,0);
});
test('actual media listener acquisition after retirement is released before start',async t=>{
 const f=candidate(t),add=f.video.addEventListener.bind(f.video),remove=f.video.removeEventListener.bind(f.video),listeners=new Set();let started=false;
 f.video.addEventListener=(name,fn,opts)=>{add(name,fn,opts);listeners.add(fn);f.player.retireNativeSource();};f.video.removeEventListener=(name,fn,opts)=>{listeners.delete(fn);remove(name,fn,opts);};await assert.rejects(f.player.wait('seeked',()=>{started=true;}),/retired/);assert.equal(started,false);assert.equal(listeners.size,0);assert.equal(f.player.native.waits.length,0);
});
test('actual media cleanup errors still release wait state and all listeners',async t=>{
 const f=candidate(t),failure=Error('timer cleanup failed');let removes=0;t.mock.method(globalThis,'setTimeout',()=>1);t.mock.method(globalThis,'clearTimeout',()=>{throw failure;});const remove=f.video.removeEventListener.bind(f.video);f.video.removeEventListener=(...args)=>{removes++;return remove(...args);};const pending=f.player.wait('seeked',()=>{}),rejected=assert.rejects(pending,error=>error===failure);f.video.dispatchEvent(new Event('seeked'));await rejected;assert.equal(removes,2);assert.equal(f.player.eventWaits.size,0);assert.equal(f.player.native.waits.length,0);
});
