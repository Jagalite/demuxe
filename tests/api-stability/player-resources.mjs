// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from '../helpers/unit-player.mjs';
function accept(player){const attempt=player.dispatchControl({type:'source.begin',operationEpoch:player.operationEpoch,mode:'native',preserve:false,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])player.dispatchControl({type,attempt});player.dispatchControl({type:'source.accept',attempt,operationEpoch:player.operationEpoch,settings:player.control.settings,planMatches:true});player.dispatchControl({type:'source.finished',attempt});return player.control.source.acceptedSession;}
const session=()=>{const calls=[];return {calls,value:{backend:Object.assign(new EventTarget(),{async destroy(){calls.push('destroy');}}),surface:{remove(){calls.push('remove');}}}};};
test('actual Player session cleanup joins reentry and retires core ownership before physical destroy',async()=>{
 const player=unitPlayer(),id=accept(player),f=session();await player.registerSession(f.value,id);let nested;
 f.value.backend.destroy=()=>{assert.equal(f.value.retired,true);nested=player.dispose(f.value);f.calls.push('destroy');return Promise.resolve();};
 const done=player.dispose(f.value);assert.equal(nested,done);await done;assert.equal(player.dispose(f.value),done);assert.deepEqual(f.calls,['destroy','remove']);assert.equal(player.control.resources.resources.length,0);
});
test('replacement retires old resource authority atomically while retaining new session',async()=>{
 const player=unitPlayer(),first=session(),one=accept(player);await player.registerSession(first.value,one);const two=accept(player),second=session();
 assert.equal(first.value.retired,true);assert.throws(()=>player.ownedResources.get(`resource:${one}`),/retired/);assert.deepEqual(first.calls,[]);
 await player.registerSession(second.value,two);assert.equal(second.value.retired,false);await player.dispose(first.value);assert.equal(second.value.retired,false);await player.dispose(second.value);
});
test('late backend acquisition after candidate retirement releases immediately and cannot revive source',async()=>{
 const player=unitPlayer(),attempt=player.dispatchControl({type:'source.begin',operationEpoch:player.operationEpoch,mode:'native',preserve:false,planId:'fixture'}).id,id=player.control.source.candidate.session;
 player.dispatchControl({type:'source.finished',attempt});const f=session();await player.registerSession(f.value,id);assert.equal(f.value.retired,true);assert.deepEqual(f.calls,['destroy','remove']);assert.equal(player.control.resources.resources.length,0);
});
test('session cleanup preserves original rejection, including undefined, and still removes surface',async()=>{
 for(const reason of [new Error('native failure'),undefined]){const player=unitPlayer(),id=accept(player),f=session();f.value.backend.destroy=()=>Promise.reject(reason);await player.registerSession(f.value,id);const done=player.dispose(f.value);let caught=false;await done.then(()=>assert.fail('expected rejection'),error=>{caught=true;assert.equal(error,reason);});assert.equal(caught,true);assert.deepEqual(f.calls,['remove']);assert.equal(player.dispose(f.value),done);}
});
test('failed duplicate registration leaves the admitted owner available for its own cleanup',async()=>{
 const player=unitPlayer(),id=accept(player),first=session(),duplicate=session();await player.registerSession(first.value,id);assert.throws(()=>player.registerSession(duplicate.value,id),/already registered/);await player.dispose(duplicate.value);assert.equal(first.value.retired,false);assert.deepEqual(first.calls,[]);await player.dispose(first.value);
});
test('many actual Player source replacements do not exhaust resource history limits',async()=>{
 const player=unitPlayer();for(let index=0;index<1100;index++){const id=accept(player),f=session();await player.registerSession(f.value,id);await player.dispose(f.value);assert.equal(player.control.resources.resources.length,0);assert.equal(player.control.resources.scopes.length,0);}
 assert.equal(player.control.resources.registeredTotal,1100);assert.equal(player.control.resources.releasedTotal,1100);assert.equal(player.ownedResources.completions.size,0);
});
test('actual allocation failure stops waiting at cleanup deadline and accounts for late physical release', {timeout:1000}, async t=>{
 const {NativePlayer}=await import('../../web/generated/internal/native-player.js');
 const player=unitPlayer();player.dispatchControl({type:'source.begin',operationEpoch:player.operationEpoch,mode:'native',preserve:false,planId:'native-direct'});
 const text=new EventTarget(),video=Object.assign(new EventTarget(),{style:{},textTracks:Object.assign([],{addEventListener:text.addEventListener.bind(text),removeEventListener:text.removeEventListener.bind(text)}),currentTime:0,duration:30,buffered:{length:0},seekable:{length:0},volume:1,playbackRate:1,paused:true,ended:false,remove(){removed++;}});
 let removed=0,deadline,release;const failure=new Error('watchdog setup failed');
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'document');globalThis.document={createElement:()=>video};t.after(()=>descriptor?Object.defineProperty(globalThis,'document',descriptor):delete globalThis.document);
 t.mock.method(NativePlayer.prototype,'setWatchdogs',()=>{throw failure;});t.mock.method(NativePlayer.prototype,'destroy',()=>new Promise(resolve=>release=resolve));
 player.ownedResources.scheduleCleanupTimeout=callback=>{deadline=callback;return()=>{};};
 const opening=player.create('native','auto',undefined,false,'native-direct'),rejected=assert.rejects(opening,error=>error===failure);
 for(let i=0;i<20&&!deadline;i++)await new Promise(setImmediate);assert.ok(deadline);deadline();await rejected;
 assert.equal(player.control.resources.resources[0].state,'detached');assert.equal(removed,0);
 release();for(let i=0;i<5;i++)await Promise.resolve();assert.equal(removed,1);assert.equal(player.control.resources.lateReleased,1);assert.equal(player.control.resources.resources.length,0);
});
test('actual late listener registration is removed when registration callback retires its session',async()=>{
 const player=unitPlayer(),id=accept(player),f=session();await player.registerSession(f.value,id);const add=f.value.backend.addEventListener.bind(f.value.backend),remove=f.value.backend.removeEventListener.bind(f.value.backend);let cleaned,adds=0,removes=0;
 f.value.backend.addEventListener=(...args)=>{adds++;cleaned=player.dispose(f.value);return add(...args);};f.value.backend.removeEventListener=(...args)=>{removes++;return remove(...args);};
 assert.throws(()=>player.observeBackend(f.value,id),/retired/);await cleaned;assert.equal(adds,1);assert.equal(removes,1);assert.equal(player.sessionListeners.get(f.value).length,0);
});
