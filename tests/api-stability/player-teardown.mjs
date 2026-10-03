// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {unitPlayer} from '../helpers/unit-player.mjs';
function source(player){const id=player.dispatchControl({type:'source.begin',operationEpoch:player.operationEpoch,mode:'software',preserve:false,planId:'fixture'}).id;for(const type of ['source.created','source.configured','source.opened','source.applied','source.positioned'])player.dispatchControl({type,attempt:id});player.dispatchControl({type:'source.accept',attempt:id,operationEpoch:player.operationEpoch,settings:player.control.settings,planMatches:true});player.dispatchControl({type:'source.finished',attempt:id});}
async function fixture(){const player=unitPlayer(),calls=[];source(player);const session={backend:new EventTarget(),surface:{remove(){calls.push('surface');}}};session.backend.destroy=async()=>{calls.push('backend');};await player.registerSession(session,player.control.source.acceptedSession);player.current=session;player.root.remove=()=>calls.push('root');return{player,session,calls};}
test('close installs its join promise and retires authority before cleanup reentry',async()=>{
 const f=await fixture();let nested,observed;f.session.backend.destroy=()=>{nested=f.player.close();observed=f.player.control.source.acceptedEpoch!==f.player.operationEpoch;return Promise.resolve();};const done=f.player.close();assert.equal(nested,done);assert.equal(observed,true);await done;assert.equal(f.player.current,undefined);assert.equal(f.player.closing,undefined);assert.deepEqual(f.calls,['surface']);
});
test('destroy joins preparation and backend reentry after terminal authority commits',async()=>{
 const f=await fixture(),nested=[];f.player.preparation={destroy(){nested.push(f.player.destroy());assert.equal(f.player.destroyed,true);}};f.session.backend.destroy=()=>{nested.push(f.player.destroy(),f.player.close());return Promise.resolve();};const done=f.player.destroy();assert.deepEqual(nested,[done,done,done]);await done;assert.equal(f.player.destroy(),done);assert.deepEqual(f.calls,['surface','root']);
});
test('destroy contains independent cleanup failures and preserves original first rejection',async()=>{
 for(const failure of [new Error('cleanup'),undefined]){const f=await fixture();f.player.preparation={destroy(){f.calls.push('preparation');throw failure;}};f.player.providerRuntime={destroy(){f.calls.push('provider');return Promise.reject(new Error('later'));}};f.player.presentation.destroy=()=>{f.calls.push('presentation');throw new Error('presentation');};let rejected=false;await f.player.destroy().then(()=>assert.fail('expected failure'),error=>{rejected=true;assert.equal(error,failure);});assert.equal(rejected,true);assert.deepEqual(f.calls,['preparation','provider','presentation','backend','surface','root']);assert.equal(f.player.current,undefined);assert.equal(f.player.control.resources.resources.length,0);}
});
test('failed close still clears source and permits a subsequent close',async()=>{
 const f=await fixture(),failure=Error('backend cleanup');f.session.backend.destroy=()=>Promise.reject(failure);await assert.rejects(f.player.close(),error=>error.code==='DECODE_FAILED'&&error.message===failure.message);assert.equal(f.player.current,undefined);assert.equal(f.player.control.source.acceptedSession,null);assert.equal(f.player.closing,undefined);await f.player.close();assert.deepEqual(f.calls,['surface']);
});
test('destroy during close cleanup supersedes closing without duplicate physical release',async()=>{
 const f=await fixture();let destroyed;f.session.backend.destroy=()=>{f.calls.push('backend');destroyed=f.player.destroy();return Promise.resolve();};const closed=f.player.close();await assert.rejects(closed,error=>error.code==='ABORTED');await destroyed;assert.deepEqual(f.calls,['backend','surface','root']);assert.equal(f.player.current,undefined);
});
test('close contains throwing promotion cleanup and settles its installed promise',async()=>{
 const f=await fixture();let calls=0;f.player.cancelPromotion=()=>{calls++;throw Error('timer cleanup');};let done;assert.doesNotThrow(()=>{done=f.player.close();});await assert.rejects(done,/timer cleanup/);assert.equal(calls,1);assert.equal(f.player.closing,undefined);assert.equal(f.player.current,undefined);assert.deepEqual(f.calls,['backend','surface']);
});
test('cleanup-enqueued successor runs after the closing barrier and remains current',async()=>{
 const f=await fixture();let successor;const next={backend:new EventTarget(),surface:{remove(){}}};next.backend.destroy=async()=>{};f.player.select=async()=>{source(f.player);f.player.current=next;await f.player.registerSession(next,f.player.control.source.acceptedSession);};f.session.backend.destroy=()=>{successor=f.player.open(new ArrayBuffer(1));return Promise.resolve();};await f.player.close();await successor;assert.equal(f.player.current,next);assert.equal(next.retired,false);await f.player.destroy();
});
test('close retires PiP before releasing surfaces and waits for native exit',async()=>{
 const f=await fixture();let finish,settled=false;
 f.player.presentation.exitPictureInPicture=()=>{f.calls.push('pip-exit');return new Promise(resolve=>{finish=resolve;});};
 const closed=f.player.close().then(()=>{settled=true;});await Promise.resolve();
 assert.deepEqual(f.calls.slice(0,2),['pip-exit','backend']);assert.equal(settled,false);
 finish();await closed;assert.equal(f.player.current,undefined);
});
test('failed PiP exit does not skip source cleanup or leave close permanently pending',async()=>{
 const f=await fixture();f.player.presentation.exitPictureInPicture=async()=>{throw Error('PiP exit failed');};
 await assert.rejects(f.player.close(),/PiP exit failed/);
 assert.equal(f.player.current,undefined);assert.equal(f.player.closing,undefined);
 assert.deepEqual(f.calls,['backend','surface']);
});
test('active PiP rejects source selection before inspection or route fallback',async()=>{
 const f=await fixture(),current=f.player.current;let inspections=0;
 Object.defineProperty(f.player.presentation,'locksSurface',{get:()=>true});
 f.player.captureInspection=()=>{inspections++;throw Error('must not inspect');};
 await assert.rejects(f.player.select({kind:'local',file:new ArrayBuffer(1)},f.player.settings,false,[]),error=>error.code==='UNSUPPORTED_FEATURE'&&/Picture-in-Picture/.test(error.message));
 assert.equal(inspections,0);assert.equal(f.player.current,current);assert.deepEqual(f.calls,[]);
 await f.player.close();
});
