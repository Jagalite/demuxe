// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/remux-port-reader.js';
import {portReader} from '../../web/private-remux.js';
const signal=()=>new AbortController().signal;
function fixture(){const sent=[],port={onmessage:null,onmessageerror:null,closes:0,postMessage(value){sent.push(value);},close(){this.closes++;}},reader=portReader(port,1024);return{port,reader,sent,reply(data){port.onmessage({data});}};}
function fakeSignal(){const listeners=new Set();let addHook,removeHook,aborted=false;return{get aborted(){return aborted;},addEventListener(_type,listener){addHook?.(listener);listeners.add(listener);},removeEventListener(_type,listener){removeHook?.(listener);listeners.delete(listener);},set addHook(value){addHook=value;},set removeHook(value){removeHook=value;},abort(){aborted=true;for(const listener of [...listeners])listener();},get listeners(){return listeners;}};}
test('pure source and range admission preserve one read and the exact byte limit',()=>{
 for(const size of [0,-1,NaN,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>core.initialRemuxPortReader(size),/Invalid/);const state=core.initialRemuxPortReader(1024*1024),before=structuredClone(state),read=core.beginRemuxPortRead(state,0,262144,false);assert.equal(read.accepted,true);assert.deepEqual(state,before);assert.equal(core.beginRemuxPortRead(read.state,0,1,false).error,'concurrent');for(const[offset,count]of [[-1,1],[0,0],[0,262145],[1048576,1],[.5,1],[0,1.5]])assert.equal(core.beginRemuxPortRead(state,offset,count,false).error,'range');assert.equal(core.beginRemuxPortRead(read.state,0,1,true).error,'cancelled');
});
test('pure response settlement clears ownership before replacement and keeps sequence monotonic',()=>{
 let state=core.initialRemuxPortReader(1024);const history=[];for(let index=1;index<=100;index++){const read=core.beginRemuxPortRead(state,0,4,false);assert.equal(read.request.id,index);const reply=core.replyRemuxPortRead(read.state,{object:true,id:index,error:false,buffer:true,bytes:2});assert.equal(reply.accepted,true);assert.equal(reply.state.pending,null);history.push([read.state,reply.state]);state=reply.state;}assert.equal(state.sequence,100);assert.ok(history.every(([a,b])=>a.pending&&b.pending===null));
});
test('invalid response closes the current request and rejects every subsequent admission',()=>{
 for(const facts of [{object:false,id:null},{object:true,id:2},{object:true,id:1,error:true},{object:true,id:1,buffer:false},{object:true,id:1,bytes:0},{object:true,id:1,bytes:5}]){const a=core.beginRemuxPortRead(core.initialRemuxPortReader(10),0,4,false),reply=core.replyRemuxPortRead(a.state,{object:true,id:1,error:false,buffer:true,bytes:4,...facts});assert.equal(reply.state.closed,true);assert.equal(reply.request.id,1);assert.equal(core.beginRemuxPortRead(reply.state,0,1,false).error,'cancelled');assert.equal(core.closeRemuxPortReader(reply.state).accepted,false);}
});
test('actual source transfers accepted short bytes and permits the next exact request',async()=>{
 const f=fixture(),one=f.reader.read(7,4,signal());assert.deepEqual(f.sent,[{type:'read',id:1,offset:7,count:4}]);f.reply({id:1,buffer:Uint8Array.of(8,9).buffer});assert.deepEqual(await one,Uint8Array.of(8,9));const two=f.reader.read(9,3,signal());assert.equal(f.sent[1].id,2);f.reply({id:2,buffer:Uint8Array.of(10,11,12).buffer});assert.deepEqual(await two,Uint8Array.of(10,11,12));f.reader.close();assert.equal(f.port.closes,1);
});
test('actual error responses preserve source transport classification and close once',async()=>{
 const f=fixture(),pending=f.reader.read(0,4,signal());f.reply({id:1,error:'permission denied'});await assert.rejects(pending,/Source transport: permission denied/);assert.equal(f.port.closes,1);f.reader.close();f.port.onmessageerror();assert.equal(f.port.closes,1);await assert.rejects(f.reader.read(0,4,signal()),error=>error.name==='AbortError');
});
test('actual cleanup reentry cannot erase a newly admitted read',async()=>{
 const f=fixture(),firstSignal=fakeSignal();let nested;firstSignal.removeHook=()=>{firstSignal.removeHook=null;nested=f.reader.read(4,4,signal());};const first=f.reader.read(0,4,firstSignal);f.reply({id:1,buffer:Uint8Array.of(1,2).buffer});assert.deepEqual(await first,Uint8Array.of(1,2));assert.equal(f.sent[1].id,2);f.reply({id:2,buffer:Uint8Array.of(3,4).buffer});assert.deepEqual(await nested,Uint8Array.of(3,4));f.reader.close();
});
test('actual cleanup failure cannot strand an accepted response or reactivate its stale abort',async()=>{
 const f=fixture(),firstSignal=fakeSignal(),error=Error('listener cleanup failed');firstSignal.removeHook=()=>{throw error;};const first=f.reader.read(0,4,firstSignal);f.reply({id:1,buffer:Uint8Array.of(1).buffer});assert.deepEqual(await first,Uint8Array.of(1));const second=f.reader.read(4,4,signal());firstSignal.abort();assert.equal(f.port.closes,0);f.reply({id:2,buffer:Uint8Array.of(2).buffer});assert.deepEqual(await second,Uint8Array.of(2));assert.throws(()=>f.reader.close(),value=>value===error);assert.equal(f.port.closes,1);
});
test('actual cancellation settles pending work despite throwing listener and port cleanup',async()=>{
 const f=fixture(),s=fakeSignal(),cleanup=Error('remove failed');s.removeHook=()=>{throw cleanup;};f.port.close=()=>{f.port.closes++;throw Error('close failed');};const pending=f.reader.read(0,4,s);s.abort();await assert.rejects(pending,error=>error.name==='AbortError');assert.equal(f.port.closes,1);assert.throws(()=>f.reader.close(),error=>error===cleanup);
});
test('aborted observation retirement cannot resurrect an admitted read or post after close',async()=>{
 const f=fixture(),s={get aborted(){f.reader.close();return false;}};await assert.rejects(f.reader.read(0,4,s),error=>error.name==='AbortError');assert.equal(f.sent.length,0);assert.equal(f.port.closes,1);
});
test('late abort listener acquisition is removed when registration synchronously retires source',async()=>{
 const f=fixture(),s=fakeSignal();s.addHook=()=>f.reader.close();const pending=f.reader.read(0,4,s);await assert.rejects(pending,error=>error.name==='AbortError');assert.equal(s.listeners.size,0);assert.equal(f.sent.length,0);assert.equal(f.port.closes,1);
});
test('post method acquisition retirement prevents the physical send',async()=>{
 const f=fixture();Object.defineProperty(f.port,'postMessage',{get(){f.reader.close();return()=>assert.fail('late post');}});await assert.rejects(f.reader.read(0,4,signal()),error=>error.name==='AbortError');assert.equal(f.sent.length,0);assert.equal(f.port.closes,1);
});
test('listener registration and post failures reject with the original exception',async()=>{
 for(const action of ['registration','post']){const f=fixture(),s=fakeSignal(),error=Error(action);if(action==='registration')s.addHook=()=>{throw error;};else f.port.postMessage=()=>{throw error;};await assert.rejects(f.reader.read(0,4,s),value=>value===error);assert.equal(f.port.closes,1);assert.equal(s.listeners.size,0);}
});
test('malformed bytes and response identity cannot complete the wrong read',async()=>{
 for(const data of [null,{id:2,buffer:new ArrayBuffer(4)},{id:1,buffer:new ArrayBuffer(0)},{id:1,buffer:new ArrayBuffer(5)},{id:1,buffer:new Uint8Array(4)}]){const f=fixture(),pending=f.reader.read(0,4,signal());f.reply(data);await assert.rejects(pending,/Unexpected private source response|Invalid private source bytes/);assert.equal(f.port.closes,1);}
});
test('late valid response after close cannot settle a replacement or reopen transport',async()=>{
 const f=fixture(),pending=f.reader.read(0,4,signal());f.reader.close();await assert.rejects(pending,error=>error.name==='AbortError');f.reply({id:1,buffer:new ArrayBuffer(4)});await assert.rejects(f.reader.read(0,4,signal()),error=>error.name==='AbortError');assert.equal(f.sent.length,1);assert.equal(f.port.closes,1);
});

test('falsey host rejection reasons remain rejections with exact identity',async()=>{
 for(const error of [undefined,null,0,false]){const f=fixture();f.port.postMessage=()=>{throw error;};const observed=await f.reader.read(0,4,signal()).then(value=>({ok:true,value}),reason=>({ok:false,reason}));assert.equal(observed.ok,false);assert.equal(observed.reason,error);assert.equal(f.port.closes,1);}
});

test('throwing transport error conversion cannot orphan a retired pending response',async()=>{
 const f=fixture(),error=Error('error conversion failed'),pending=f.reader.read(0,4,signal());f.reply({id:1,error:{toString(){throw error;}}});await assert.rejects(pending,value=>value===error);assert.equal(f.port.closes,1);
});

test('response getter reentry cannot poison the successor of an accepted read',async()=>{
 const f=fixture(),s=fakeSignal();let second;s.removeHook=()=>{s.removeHook=null;second=f.reader.read(4,4,signal());};const first=f.reader.read(0,4,s);f.reply({id:1,get error(){f.reply({id:1,buffer:Uint8Array.of(1).buffer});return null;},buffer:Uint8Array.of(9).buffer});assert.deepEqual(await first,Uint8Array.of(1));assert.equal(f.port.closes,0);f.reply({id:2,buffer:Uint8Array.of(2).buffer});assert.deepEqual(await second,Uint8Array.of(2));f.reader.close();
});
test('throwing stale response observation cannot close a newer read',async()=>{
 const f=fixture(),s=fakeSignal();let second;s.removeHook=()=>{s.removeHook=null;second=f.reader.read(4,4,signal());};const first=f.reader.read(0,4,s);f.reply({id:1,get error(){f.reply({id:1,buffer:Uint8Array.of(1).buffer});throw Error('retired response observation');}});await first;assert.equal(f.port.closes,0);f.reply({id:2,buffer:Uint8Array.of(2).buffer});await second;f.reader.close();
});
test('falsey deferred cleanup failures retain their exact presence and reason',async()=>{
 for(const error of [undefined,null,0,false])for(const step of ['listener','port']){const f=fixture(),s=fakeSignal();if(step==='listener')s.removeHook=()=>{throw error;};else f.port.close=()=>{throw error;};const pending=f.reader.read(0,4,s);f.reply({id:1,buffer:Uint8Array.of(1).buffer});await pending;let threw=false;try{f.reader.close();}catch(reason){threw=true;assert.equal(reason,error);}assert.equal(threw,true);}
});
