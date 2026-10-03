// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {initialShakaBackend,transitionShakaBackend} from '../../web/generated/internal/machine/shaka-backend.js';
import {ShakaBackend} from '../../web/generated/internal/shaka-backend.js';
const initial=()=>initialShakaBackend({preload:'auto',profile:'balanced'});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
function fixture(){const backend=Object.setPrototypeOf(new EventTarget(),ShakaBackend.prototype),calls=[],owned=new Set();let id=0;
 const player={addTextTrackAsync:async()=>{calls.push('add');return{id:++id};},selectTextTrack(){calls.push('select');},getTextTracks:()=>[],destroy:async()=>calls.push('destroy')};
 Object.assign(backend,{control:initial(),player,policy:{authorize:uri=>uri,ownBlob:uri=>owned.add(uri),disownBlob:uri=>owned.delete(uri),destroy(){owned.clear();}},native:{destroy:async()=>{}},controlWaiters:new Map(),runtimeLoad:new AbortController(),listeners:[],blobs:new Set(),refresh(){},properties:new Map()});return{backend,player,calls,owned};
}
const track={src:'https://example.invalid/caption.vtt'};
const asset=()=>({format:'vtt',bytes:new TextEncoder().encode('WEBVTT\n\n00:00.000 --> 00:01.000\nText\n').buffer,label:'Caption',language:'en',select:false,attachmentId:'test'});
test('pure pending, committed and uncertain attachments share sixteen slots',()=>{
 let state=initial();const leases=[];for(let i=0;i<16;i++){const next=transitionShakaBackend(state,{type:'begin',domain:'attachment'});state=next.state;leases.push(next.lease);}
 assert.equal(transitionShakaBackend(state,{type:'begin',domain:'attachment'}).reason,'capacity');
 state=transitionShakaBackend(state,{type:'attachment.issued',lease:leases[0]}).state;state=transitionShakaBackend(state,{type:'finish',lease:leases[0]}).state;assert.equal(state.attachmentUncertain,1);assert.equal(transitionShakaBackend(state,{type:'begin',domain:'attachment'}).accepted,false);
 state=transitionShakaBackend(state,{type:'attached',lease:leases[1],id:7,select:false}).state;assert.equal(state.external.length,1);assert.equal(transitionShakaBackend(state,{type:'begin',domain:'attachment'}).accepted,false);
 state=transitionShakaBackend(state,{type:'finish',lease:leases[2]}).state;assert.equal(transitionShakaBackend(state,{type:'begin',domain:'attachment'}).accepted,true);
 state=transitionShakaBackend(state,{type:'close'}).state;assert.equal(state.attachmentUncertain,0);assert.equal(state.attachmentIssued.length,0);assert.equal(state.external.length,0);
});
test('concurrent caption overflow is rejected before provider calls',async()=>{
 const f=fixture(),hold=deferred();f.player.addTextTrackAsync=()=>{f.calls.push('add');return hold.promise;};const work=Array.from({length:16},()=>f.backend.addTextTrack(track));await assert.rejects(f.backend.addTextTrack(track),/capacity/);assert.equal(f.calls.length,16);assert.equal(f.backend.control.requests.length,16);hold.resolve({id:1});await Promise.all(work);assert.equal(f.backend.control.external.length,16);await f.backend.destroy();
});
test('uncertain native caption rejection retains its slot across repeated requests',async()=>{
 const f=fixture();f.player.addTextTrackAsync=async()=>{f.calls.push('add');throw Error('native failure after allocation');};for(let i=0;i<16;i++)await assert.rejects(f.backend.addTextTrack(track),/native failure/);await assert.rejects(f.backend.addTextTrack(track),/capacity/);assert.equal(f.calls.length,16);assert.equal(f.backend.control.attachmentUncertain,16);assert.equal(f.backend.control.requests.length,0);await f.backend.destroy();
});
test('pre-native authorization failures release attachment admission',async()=>{
 const f=fixture();f.backend.policy.authorize=()=>{throw Error('not allowed');};for(let i=0;i<40;i++)await assert.rejects(f.backend.addTextTrack(track),/not allowed/);assert.equal(f.calls.length,0);assert.equal(f.backend.control.attachmentUncertain,0);assert.equal(f.backend.control.requests.length,0);await f.backend.destroy();
});
test('blob subtitle admission precedes URL allocation and successful catalog retains only sixteen URLs',async t=>{
 const f=fixture();let created=0,revoked=0;t.mock.method(URL,'createObjectURL',()=>`blob:caption-${++created}`);t.mock.method(URL,'revokeObjectURL',()=>revoked++);
 for(let i=0;i<16;i++)await f.backend.addSubtitle(asset());await assert.rejects(f.backend.addSubtitle(asset()),/capacity/);assert.equal(created,16);assert.equal(f.backend.blobs.size,16);assert.equal(f.owned.size,16);await f.backend.destroy();assert.equal(revoked,16);
});
test('pre-native blob subtitle failure releases URL and authorization alias independently',async t=>{
 const f=fixture();let created=0,revoked=0;t.mock.method(URL,'createObjectURL',()=>`blob:caption-${++created}`);t.mock.method(URL,'revokeObjectURL',()=>revoked++);f.backend.policy.authorize=()=>{throw Error('caption admission failed');};for(let i=0;i<40;i++)await assert.rejects(f.backend.addSubtitle(asset()),/caption admission failed/);assert.equal(revoked,created);assert.equal(f.backend.blobs.size,0);assert.equal(f.owned.size,0);assert.equal(f.backend.control.attachmentUncertain,0);await f.backend.destroy();
});
test('failed pre-native URL cleanup retains counted uncertainty and original admission error',async t=>{
 const f=fixture();let created=0;t.mock.method(URL,'createObjectURL',()=>`blob:caption-${++created}`);const revoke=t.mock.method(URL,'revokeObjectURL',()=>{throw Error('cleanup failed');});f.backend.policy.authorize=()=>{throw Error('original admission failure');};
 for(let i=0;i<16;i++)await assert.rejects(f.backend.addSubtitle(asset()),/original admission failure/);await assert.rejects(f.backend.addSubtitle(asset()),/capacity/);assert.equal(created,16);assert.equal(f.backend.blobs.size,16);assert.equal(f.backend.control.attachmentUncertain,16);revoke.mock.mockImplementation(()=>{});await f.backend.destroy();
});
test('late blob acquisition after retirement is revoked and cannot call provider',async t=>{
 const f=fixture();let closing,revoked=0;t.mock.method(URL,'createObjectURL',()=>{closing=f.backend.destroy();return 'blob:late';});t.mock.method(URL,'revokeObjectURL',()=>revoked++);await assert.rejects(f.backend.addSubtitle(asset()),error=>error.code==='ABORTED');await closing;assert.equal(f.calls.filter(call=>call==='add').length,0);assert.equal(revoked,1);assert.equal(f.backend.blobs.size,0);
});
