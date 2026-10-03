// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import * as core from '../../web/generated/internal/machine/io-worker.js';
const source=await readFile(process.env.IO_WORKER_SOURCE??new URL('../../web/io-worker.js',import.meta.url),'utf8');
const turn=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
function fixture(){
 const opened=deferred(),reading=deferred(),posted=[],timers=new Map(),intervals=new Map(),memory=new SharedArrayBuffer(64+262144+24+4096);let serial=0,now=0,instance,timerFailure;
 class Reader{constructor(_options,refresh){instance=this;this.refresh=refresh;this.stats={};this.total=100n;this.closed=0;this.epochs=0;}open(){return opened.promise;}read(){return reading.promise;}close(){this.closed++;}beginEpoch(){this.epochs++;}}
 const context={...core,LocalFileReader:Reader,RangeReader:Reader,performance:{now:()=>now},Int32Array,Uint8Array,DataView,TextDecoder,BigInt,Number,Object,Error,Map,Promise,Atomics:{load:Atomics.load,store:Atomics.store,compareExchange:Atomics.compareExchange,notify:Atomics.notify},crypto:{randomUUID:()=>String(++serial)},self:{},postMessage:message=>posted.push(message),setTimeout(fn,delay){if(timerFailure)throw timerFailure;const id=++serial;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),setInterval(fn,delay){const id=++serial;intervals.set(id,{fn,delay});return id;},clearInterval:id=>intervals.delete(id)};
 const code=source.replace(/^import .*;\n/gm,'');vm.runInNewContext(code+`;globalThis.h={pump,...typeof refresh==='function'?{refresh}:{},get state(){return typeof control==='undefined'?undefined:control},get refreshes(){return refreshes}};`,context);
 return{h:context.h,posted,timers,intervals,opened,reading,memory,header:new Int32Array(memory,0,16),get reader(){return instance;},set now(value){now=value;},set timerFailure(value){timerFailure=value;},send:data=>context.self.onmessage({data}),init(){return context.self.onmessage({data:{type:'init',memory,pointer:0,options:{url:'fixture',format:'file'},canRefresh:true}});}};
}
test('pure IO lifecycle denies duplicate initialization and retains charged read until physical settlement',()=>{
 let s=core.transitionIOWorker(core.initialIOWorker(),{type:'init'}).state;assert.equal(core.transitionIOWorker(s,{type:'init'}).accepted,false);s=core.transitionIOWorker(s,{type:'ready'}).state;
 const d=core.transitionIOWorker(s,{type:'read',state:1,serial:5,epoch:7});assert.ok(d.read);assert.equal(core.transitionIOWorker(d.state,{type:'read',state:1,serial:6,epoch:7}).accepted,false);
 const closed=core.transitionIOWorker(d.state,{type:'close'}).state;assert.equal(closed.read.id,d.read.id);assert.equal(core.ioReadCurrent(closed,d.read,{state:1,serial:5,epoch:7}),false);assert.equal(core.transitionIOWorker(closed,{type:'finish',id:d.read.id}).state.read,null);
});
test('pure refresh capacity and deadlines are bounded and do not consume rejected identities',()=>{
 const s=core.transitionIOWorker(core.initialIOWorker(),{type:'init'}).state,d=core.transitionIOWorker(s,{type:'refresh',now:10});assert.equal(d.refresh.deadline,5010);assert.equal(core.transitionIOWorker(d.state,{type:'refresh',now:11}).state,d.state);assert.equal(core.transitionIOWorker(d.state,{type:'refreshed',id:d.refresh.id,now:5009}).remaining,1);assert.equal(core.transitionIOWorker(d.state,{type:'refreshed',id:d.refresh.id,now:5010}).state.refresh,null);
 for(const field of ['serial','refreshSerial']){const full={...s,phase:'ready',[field]:Number.MAX_SAFE_INTEGER};assert.equal(core.transitionIOWorker(full,field==='serial'?{type:'read',state:1,serial:1,epoch:0}:{type:'refresh',now:0}).accepted,false);}
});
test('close during asynchronous open never publishes ready or starts pump',async()=>{
 const f=fixture(),init=f.init();await f.send({type:'close'});f.opened.resolve({size:100});await init;assert.equal(f.reader.closed,1);assert.equal(f.posted.some(x=>x.type==='ready'),false);assert.equal(f.intervals.size,0);assert.equal(f.h.state.phase,'closed');
});
test('duplicate init cannot replace or retire accepted initialization',async()=>{
 const f=fixture(),first=f.init(),reader=f.reader,duplicate=f.init();assert.equal(f.reader,reader);await duplicate;assert.equal(reader.closed,0);f.opened.resolve({size:100});await first;assert.equal(f.posted.filter(x=>x.type==='ready').length,1);assert.equal(f.intervals.size,1);await f.send({type:'close'});
});
test('read completion after close cannot overwrite mailbox or emit stale stats',async()=>{
 const f=fixture(),init=f.init();f.opened.resolve({size:100});await init;Atomics.store(f.header,0,1);Atomics.store(f.header,1,1);Atomics.store(f.header,4,1);const work=f.h.pump();await turn();await f.send({type:'close'});f.reading.resolve(new Uint8Array([42]));await work;assert.equal(Atomics.load(f.header,0),1);assert.equal(new Uint8Array(f.memory,64,1)[0],0);assert.equal(f.posted.filter(x=>x.type==='stats').length,0);assert.equal(f.h.state.read,null);
});
test('native epoch change retires previous reader epoch and suppresses stale write',async()=>{
 const f=fixture(),init=f.init();f.opened.resolve({size:100});await init;Atomics.store(f.header,0,1);Atomics.store(f.header,1,1);Atomics.store(f.header,4,1);const work=f.h.pump();await turn();Atomics.store(f.header,3,2);await f.send({type:'epoch'});assert.equal(f.reader.epochs,1);f.reading.resolve(new Uint8Array([42]));await work;assert.equal(Atomics.load(f.header,0),1);assert.equal(f.h.state.read,null);await f.send({type:'close'});
});
test('authorization refresh flood stays one charged obligation and close settles it',async()=>{
 const f=fixture(),init=f.init(),refresh=f.reader.refresh;const first=refresh({url:'fixture'}),rejected=assert.rejects(first,/Closed/);const requests=Array.from({length:128},()=>refresh({url:'fixture'}));await Promise.all(requests.map(work=>assert.rejects(work,/capacity/)));assert.equal(f.h.refreshes.size,1);assert.equal(f.timers.size,1);await f.send({type:'close'});await rejected;assert.equal(f.h.refreshes.size,0);assert.equal(f.timers.size,0);f.opened.resolve({size:100});await init;
});
test('refresh timer registration failure releases metadata and preserves original error',async()=>{
 const f=fixture(),init=f.init(),failure=Error('timer');f.timerFailure=failure;await assert.rejects(f.reader.refresh({url:'fixture'}),e=>e===failure);assert.equal(f.h.refreshes.size,0);assert.equal(f.h.state.refresh,null);await f.send({type:'close'});f.opened.resolve({size:100});await init;
});
test('fresh read publishes bytes once and duplicate pump does not reread completed mailbox',async()=>{
 const f=fixture(),init=f.init();f.opened.resolve({size:100});await init;Atomics.store(f.header,0,1);Atomics.store(f.header,1,1);Atomics.store(f.header,4,1);const work=f.h.pump();f.reading.resolve(new Uint8Array([42]));await work;assert.equal(Atomics.load(f.header,0),2);assert.equal(Atomics.load(f.header,5),1);assert.equal(new Uint8Array(f.memory,64,1)[0],42);await f.h.pump();assert.equal(f.posted.filter(x=>x.type==='stats').length,1);await f.send({type:'close'});
});

test('fallback pump failure before read admission retires owner and does not leak a rejected callback',async()=>{
 const f=fixture(),init=f.init();f.opened.resolve({size:100});await init;f.reader.beginEpoch=()=>{throw Error('epoch reset failed');};Atomics.store(f.header,3,2);const callback=[...f.intervals.values()][0].fn;callback();await turn();assert.equal(f.h.state.phase,'failed');assert.equal(f.intervals.size,0);assert.equal(f.reader.closed,1);assert.equal(f.posted.filter(x=>x.type==='error'&&x.message.includes('epoch reset failed')).length,1);
});
