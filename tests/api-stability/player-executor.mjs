// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from '../helpers/unit-player.mjs';
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
async function fixture(){const player=unitPlayer(),calls=[],backend=Object.assign(new EventTarget(),{properties:new Map([['time-pos',0]]),planId:'software',play(){calls.push('play');return Promise.resolve();},pause(){calls.push('pause');return Promise.resolve();},destroy(){calls.push('destroy');return Promise.resolve();},audioDiagnostics(){return {};}}),session={backend,surface:{remove(){calls.push('remove');}}};
 const attempt=player.dispatchControl({type:'source.begin',operationEpoch:player.operationEpoch,mode:'software',preserve:false,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])player.dispatchControl({type,attempt});player.dispatchControl({type:'source.accept',attempt,operationEpoch:player.operationEpoch,settings:player.control.settings,planMatches:true});player.dispatchControl({type:'source.finished',attempt});player.current=session;player.evidence=()=>({outputVerified:true});await player.registerSession(session,player.control.source.acceptedSession);return{player,backend,session,calls};}
test('actual public play enters registered backend in the activation stack through the composed executor',async()=>{
 const f=await fixture(),hold=deferred();f.backend.play=()=>{f.calls.push('play');return hold.promise;};const playing=f.player.play();assert.deepEqual(f.calls,['play']);assert.equal(f.player.control.executor.pending[0].phase,'started');assert.equal(f.player.effectRuntime.localState,undefined);hold.resolve();await playing;assert.equal(f.player.control.executor.pending.length,0);assert.equal(f.player.effectErrors.size,0);
});
test('pause atomically retires uncooperative public play and runs without its physical completion',async()=>{
 const f=await fixture(),hold=deferred();f.backend.play=()=>{f.calls.push('play');return hold.promise;};const playing=f.player.play(),paused=f.player.pause();await paused;await playing;assert.deepEqual(f.calls,['play','pause']);assert.equal(f.player.control.executor.pending.length,0);assert.equal(f.player.settings.pause,true);hold.resolve();await Promise.resolve();assert.equal(f.player.settings.pause,true);
});
test('synchronous backend throw retains original public throw and clears effect bookkeeping',async()=>{
 const f=await fixture(),failure=new Error('sync');f.backend.play=()=>{throw failure;};assert.throws(()=>f.player.play(),error=>error===failure);assert.equal(f.player.control.executor.pending.length,0);assert.equal(f.player.effectErrors.size,0);
});
test('asynchronous backend rejection preserves autoplay classification through recovery policy',async()=>{
 const f=await fixture(),failure=new DOMException('gesture denied','NotAllowedError');f.backend.play=()=>Promise.reject(failure);await assert.rejects(f.player.play(),error=>error.code==='AUTOPLAY_BLOCKED'&&error.message===failure.message);assert.deepEqual(f.calls,['pause']);assert.equal(f.player.control.executor.pending.length,0);assert.equal(f.player.effectErrors.size,0);
});
test('backend method getter retiring the source prevents its returned play function from executing',async()=>{
 const f=await fixture();let invoked=0;Object.defineProperty(f.backend,'play',{get(){f.player.dispatchControl({type:'operation.retire',terminal:false});return()=>{invoked++;return Promise.resolve();};}});assert.throws(()=>f.player.play(),/retired/);assert.equal(invoked,0);assert.equal(f.player.control.executor.pending.length,0);
});
test('resource retirement settles typed work before an ignored physical result arrives',async()=>{
 const f=await fixture(),hold=deferred();f.backend.pause=()=>hold.promise;const work=f.player.backendEffect(f.session,'backend.pause'),rejected=assert.rejects(work,e=>e.code==='ABORTED');await f.player.dispose(f.session);await rejected;assert.equal(f.player.control.executor.pending.length,0);hold.reject(new Error('late'));await Promise.resolve();assert.equal(f.player.effectErrors.size,0);
});
test('Player executor derives authority and rejects a forged current completion after source retirement',async()=>{
 const f=await fixture(),hold=deferred();f.backend.pause=()=>hold.promise;const pending=f.player.backendEffect(f.session,'backend.pause'),rejected=assert.rejects(pending,e=>e.code==='ABORTED'),id=f.player.control.executor.pending[0].effect.id;f.player.dispatchControl({type:'source.clear'});await rejected;const before=f.player.control.executor;
 f.player.dispatchControl({type:'effect.event',input:{type:'physical-result',id,current:true,success:true}});assert.equal(f.player.control.executor,before);hold.resolve();
});
