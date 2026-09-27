// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {subscribeSelector,bindPlayer,PlaybackBinding} from 'demuxe/integration';
import {MediaView,timeRanges} from '../web/generated/integration/media-view.js';
function fake(){
 const p=new EventTarget();p.state={sourceId:1,currentTime:0,duration:null,streamType:'unknown',playbackIntent:'pause',status:'paused',volume:1,muted:false,playbackRate:1,error:null,buffered:null,seekable:null,pendingOperation:null};
 const listeners=new Set();p.subscribe=fn=>{listeners.add(fn);fn(p.state);return()=>listeners.delete(fn);};p.publish=patch=>{p.state=Object.freeze({...p.state,...patch});for(const fn of listeners)fn(p.state);};p.play=()=>{p.publish({playbackIntent:'play'});return Promise.resolve();};p.pause=()=>{p.publish({playbackIntent:'pause'});return Promise.resolve();};p.destroy=()=>{p.isDestroyed=true;return Promise.resolve();};p.seek=async()=>{};p.setVolume=async()=>{};p.setMuted=async()=>{};p.setPlaybackRate=async()=>{};p.listeners=listeners;return p;
}
test('IC-04 initial selector, equality, observer isolation and idempotent cleanup',()=>{const p=fake(),values=[];const stop=subscribeSelector(p,s=>s.volume,v=>values.push(v));p.publish({currentTime:1});p.publish({volume:.5});assert.deepEqual(values,[1,.5]);stop();stop();assert.equal(p.listeners.size,0);assert.doesNotThrow(()=>subscribeSelector(p,()=>{throw Error('observer');},()=>{}));});
test('IC-13 borrowed disposal stops callbacks immediately and preserves owner',async()=>{const p=fake(),b=bindPlayer(p);let calls=0;b.subscribe(()=>calls++);const done=b.dispose();assert.equal(done,b.dispose());p.publish({currentTime:3});await done;assert.equal(calls,1);assert.equal(p.isDestroyed,undefined);await assert.rejects(b.play(),{code:'ABORTED'});});
test('IC-14 owned disposal joins cleanup and rejects terminal remount',async()=>{const p=fake();let finish;p.destroy=()=>{p.isDestroyed=true;return new Promise(r=>finish=r);};const b=new PlaybackBinding(p,'owned');const done=b.dispose();await Promise.resolve();assert.throws(()=>bindPlayer(p),{code:'ABORTED'});finish();await done;});
test('IC-05 immediate gesture forwarding and redacted synchronous failures',async()=>{const p=fake(),errors=[];let invoked=false;p.play=()=>{invoked=true;throw Error('https://user:pass@example.org/movie?secret=abc');};const b=bindPlayer(p,{onOperationError:e=>errors.push(e)});const task=b.play();assert.equal(invoked,true);await assert.rejects(task);assert.equal(errors.length,1);assert.ok(!JSON.stringify(errors).includes('secret=abc'));assert.equal(errors[0].sourceId,1);});
test('IC-06 accepted intent survives buffering; events observe current snapshots',async()=>{const p=fake(),v=new MediaView(p),events=[];for(const name of ['play','playing','waiting','pause'])v.addEventListener(name,()=>events.push([name,v.paused]));await v.play();p.publish({status:'playing'});p.publish({status:'buffering'});assert.equal(v.paused,false);v.pause();assert.deepEqual(events,[['play',false],['playing',false],['waiting',false],['pause',true]]);await v.dispose();});
test('IC-09 unknown duration/ranges are explicit and bounds throw',()=>{const v=new MediaView(fake());assert.ok(Number.isNaN(v.duration));assert.equal(v.state.buffered,null);assert.equal(v.buffered.length,0);assert.throws(()=>v.buffered.start(0),{name:'IndexSizeError'});assert.equal(timeRanges([{start:1,end:2}]).end(0),2);});
test('IC-08 late failures after disposal do not call removed observers',async()=>{const p=fake(),errors=[];let fail;p.play=()=>new Promise((_,r)=>fail=r);const b=bindPlayer(p,{onOperationError:e=>errors.push(e)});const work=b.play();await b.dispose();fail(Error('late'));await assert.rejects(work);assert.equal(errors.length,0);});
test('IC-16 package imports require no browser or external host',async()=>{for(const path of ['demuxe','demuxe/contracts','demuxe/integration','demuxe/media-element','demuxe/adapters/videojs'])await import(path);assert.equal(globalThis.customElements,undefined);});
test('IC-14 Video.js rejects terminal and cross-document hosts before moving them',async()=>{
 const {registerVideojsTech}=await import('demuxe/adapters/videojs');let Registered,constructed=0;class Tech{constructor(){constructed++;}}
 const target={getTech:name=>name==='Tech'?Tech:undefined,registerTech:(_,value)=>Registered=value};registerVideojsTech(target);
 assert.throws(()=>new Registered({demuxePlayer:{isDestroyed:true}}),{code:'ABORTED'});
 const previous=globalThis.document;try{globalThis.document={};assert.throws(()=>new Registered({demuxePlayer:{isDestroyed:false,host:{ownerDocument:{}}}}),{code:'UNSUPPORTED_FEATURE'});}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
 assert.equal(constructed,0);
});
test('review unsubscribe suppresses callbacks already copied by the publisher',()=>{
 const p=fake(),binding=bindPlayer(p);let calls=0,stop;
 p.publish=patch=>{p.state={...p.state,...patch};for(const fn of [...p.listeners])fn(p.state);};
 binding.subscribe(s=>{if(s.currentTime)stop();});stop=binding.subscribe(()=>calls++);
 p.publish({currentTime:1});assert.equal(calls,1);
});
test('review duration notifies unknown/live transitions without guessing finite time',()=>{
 const p=fake(),view=new MediaView(p),seen=[];view.addEventListener('durationchange',()=>seen.push(view.duration));
 p.publish({streamType:'live'});p.publish({streamType:'unknown'});assert.equal(seen[0],Infinity);assert.ok(Number.isNaN(seen[1]));assert.equal(seen.length,2);
});
test('review reentrant source publication does not emit events from the retired snapshot',()=>{
 const p=fake(),view=new MediaView(p),events=[];
 view.addEventListener('loadedmetadata',()=>p.publish({sourceId:null,currentTime:0,duration:null}));
 view.addEventListener('durationchange',()=>events.push(view.duration));
 p.publish({sourceId:2,duration:12});assert.equal(events.length,1);assert.ok(Number.isNaN(events[0]));
});
test('review synchronization exposes accepted settings without replaying ended or seeked',()=>{
 const p=fake(),view=new MediaView(p);p.publish({status:'ended',volume:.3});const events=[];
 for(const name of ['volumechange','ended','seeked'])view.addEventListener(name,event=>events.push([name,event.detail?.initial]));
 view.synchronize();assert.deepEqual(events,[['volumechange',true]]);
});
test('review loop boundaries do not become external ended events',()=>{
 const p=fake(),view=new MediaView(p);let ended=0;view.addEventListener('ended',()=>ended++);
 p.publish({loop:true,status:'ended'});assert.equal(ended,0);
 p.publish({status:'playing'});p.publish({loop:false,status:'ended'});assert.equal(ended,1);
});
