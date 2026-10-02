// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../../web/generated/internal/machine/remux-source-worker.js';
const source=fs.readFileSync(new URL('../../web/native-remux-source-worker.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const turn=()=>new Promise(setImmediate);
function fixture(hooks={}){
 let now=0,serial=0;const messages=[],readers=[],timers=new Map(),allTimers=[],waiters=[];
 const port={onmessage:null,onmessageerror:null,closes:0,messages:[],postMessage(data,transfer){hooks.post?.(data,transfer);this.messages.push({data,transfer});},close(){this.closes++;hooks.portClose?.();}};
 class Reader{
  constructor(options,refresh){this.options=options;this.refresh=refresh;this.closes=0;readers.push(this);hooks.construct?.(this);}
  open(){return hooks.open?.(this)??Promise.resolve({size:1048576});}
  read(offset,count){return hooks.read?.(this,offset,count)??Promise.resolve(new Uint8Array(count).fill(7));}
  get stats(){hooks.stats?.();return{reads:1};}
  close(){this.closes++;hooks.readerClose?.();}
 }
 const context={...core,LocalFileReader:Reader,RangeReader:Reader,Uint8Array,Int32Array,DataView,ArrayBuffer,SharedArrayBuffer,DOMException,Error,Promise,performance:{now(){hooks.clock?.();return now;}},self:{},postMessage(data){messages.push(data);hooks.message?.(data);},setTimeout(fn,delay){const timer={id:++serial,fn,delay};hooks.setTimer?.(timer);timers.set(timer.id,timer);allTimers.push(timer);return timer.id;},clearTimeout(id){hooks.clearTimer?.(id);timers.delete(id);},Atomics:{load:Atomics.load,store:Atomics.store,notify(h,index){Atomics.notify(h,index);for(const resolve of waiters.splice(0))resolve();},waitAsync(){const pending=deferred();waiters.push(pending.resolve);return{async:true,value:pending.promise};}}};
 vm.runInNewContext(source+'\nglobalThis.inspect=()=>({control,refreshes:refreshes.size,timers:timers.size,cleanupFailure,owner});',context);
 const f={hooks,context,port,readers,messages,timers,allTimers,send(data){return context.self.onmessage({data});},init(extra={}){return this.send({type:'init',file:{},port,...extra});},close(){return this.send({type:'close'});},request(extra={}){return port.onmessage({data:{type:'read',id:1,offset:0,count:4,...extra}});},inspect:context.inspect,set now(value){now=value;},get now(){return now;},fire(timer=allTimers.at(-1)){timers.delete(timer.id);timer.fn();}};return f;
}
test('pure admission owns one source, one read and exact byte limits without mutating history',()=>{
 const empty=core.initialRemuxSourceWorker(),opened=core.beginRemuxSource(empty,'port'),ready=core.openedRemuxSource(opened.state,opened.epoch,1048576).state;
 assert.equal(empty.phase,'idle');assert.equal(core.beginRemuxSource(ready,'port').accepted,false);
 const first=core.beginRemuxSourceRead(ready,opened.epoch,0,262144,1);assert.equal(first.accepted,true);assert.equal(ready.read,null);assert.equal(core.beginRemuxSourceRead(first.state,opened.epoch,0,1,2).error,'Invalid private source request');
 for(const[offset,count,id]of [[-1,1,1],[0,0,1],[0,262145,1],[1048576,1,1],[.5,1,1],[0,1.5,1],[0,1,null]])assert.equal(core.beginRemuxSourceRead(ready,opened.epoch,offset,count,id).accepted,false);
 const retired=core.retireRemuxSourceWorker(first.state,'closed');assert.equal(retired.read.id,1);assert.equal(retired.state.read,null);assert.equal(core.finishRemuxSourceRead(retired.state,first.request).accepted,false);
});
test('pure refresh deadlines and IDs reject stale replies across a replacement',()=>{
 let state=core.beginRemuxSource(core.initialRemuxSourceWorker(),'port').state;const first=core.beginRemuxSourceRefresh(state,state.epoch,10);assert.equal(first.request.deadline,5010);assert.equal(core.beginRemuxSourceRefresh(first.state,state.epoch,11).error,'Concurrent authorization refresh');
 const early=core.settleRemuxSourceRefresh(first.state,first.request.id,state.epoch,5009);assert.equal(early.remaining,1);assert.equal(early.state,first.state);
 state=core.settleRemuxSourceRefresh(first.state,first.request.id,state.epoch,5010).state;const second=core.beginRemuxSourceRefresh(state,state.epoch,6000);assert.equal(second.request.id,2);assert.equal(core.settleRemuxSourceRefresh(second.state,1,state.epoch).accepted,false);assert.equal(core.remuxSourceRefreshCurrent(second.state,second.request),true);
});
test('actual port read preserves owned bytes, response before stats and source budgets',async()=>{
 const backing=Uint8Array.of(0,8,9,0),f=fixture({read:()=>Promise.resolve(backing.subarray(1,3))});await f.init({file:undefined,options:{cacheBytes:999,blockBytes:3,readDeadlineMs:1},identity:{size:1048576}});
 assert.equal(f.readers[0].options.cacheBytes,2097152);assert.equal(f.readers[0].options.blockBytes,65536);assert.equal(f.readers[0].options.readDeadlineMs,45000);
 const order=[];f.hooks.post=()=>order.push('bytes');f.hooks.message=data=>order.push(data.type);await f.request();const response=f.port.messages[0];assert.deepEqual([...new Uint8Array(response.data.buffer)],[8,9]);assert.notEqual(response.data.buffer,backing.buffer);assert.equal(response.transfer[0],response.data.buffer);assert.deepEqual(order,['bytes','stats']);assert.equal(f.inspect().control.read,null);f.close();assert.equal(f.port.closes,1);assert.equal(f.readers[0].closes,1);
});
test('close during held local or remote open cannot publish ready or install transferred handlers',async()=>{
 for(const remote of [false,true]){const pending=deferred(),f=fixture({open:()=>pending.promise}),opening=f.init(remote?{file:undefined,options:{}}:{});f.close();pending.resolve({size:100});await opening;assert.equal(f.messages.length,0);assert.equal(f.port.onmessage,null);assert.equal(f.port.closes,1);assert.equal(f.readers[0].closes,1);assert.equal(f.inspect().control.phase,'closed');}
});
test('close during source construction releases the late reader exactly once',async()=>{
 const f=fixture({construct:()=>f.close()});await f.init();assert.equal(f.readers[0].closes,1);assert.equal(f.port.closes,1);assert.equal(f.messages.length,0);
});
test('open-method and input observation retirement prevent subsequent reader effects',async()=>{
 for(const which of ['open','file','options']){let opens=0;const f=fixture({construct(reader){if(which==='open')Object.defineProperty(reader,'open',{get(){f.close();return()=>{opens++;};}});}});const data={type:'init',file:{},port:f.port};if(which==='file')Object.defineProperty(data,'file',{get(){f.close();return{};}});if(which==='options'){data.file=null;Object.defineProperty(data,'options',{get(){f.close();return{};}});}await f.send(data);assert.equal(opens,0);assert.equal(f.messages.length,0);assert.equal(f.port.closes,1);assert.equal(f.readers.length,which==='open'?1:0);}
});
test('port acquisition retirement cannot resurrect the idle source',async()=>{
 const f=fixture();await f.send({type:'init',get port(){f.close();return f.port;},file:{}});assert.equal(f.inspect().control.phase,'closed');assert.equal(f.readers.length,0);assert.equal(f.port.closes,1);
});
test('close during read suppresses bytes and statistics after completion',async()=>{
 const pending=deferred(),f=fixture({read:()=>pending.promise});await f.init();const reading=f.request();f.close();pending.resolve(Uint8Array.of(1));await reading;assert.equal(f.port.messages.length,0);assert.deepEqual(f.messages.map(value=>value.type),['ready']);assert.equal(f.inspect().control.read,null);
});
test('invalid and concurrent requests retire the current source once',async()=>{
 for(const extra of [{count:262145},{offset:-1},{count:0},{offset:1048576},{id:NaN}]){const f=fixture();await f.init();await f.request(extra);assert.equal(f.inspect().control.phase,'failed');assert.equal(f.readers[0].closes,1);assert.equal(f.port.closes,1);assert.match(f.messages.at(-1).message,/Invalid private source request/);f.close();assert.equal(f.port.closes,1);}
 const pending=deferred(),f=fixture({read:()=>pending.promise});await f.init();const reading=f.request();await f.request({id:2});pending.resolve(Uint8Array.of(1));await reading;assert.equal(f.port.messages.length,0);assert.equal(f.inspect().control.phase,'failed');
});
test('request getter reentry cannot poison a newly admitted read',async()=>{
 const pending=deferred(),f=fixture({read:()=>pending.promise});await f.init();let nested;await f.port.onmessage({data:{type:'read',id:1,count:4,get offset(){nested=f.request({id:2});return 0;}}});pending.resolve(Uint8Array.of(2));await nested;assert.equal(f.inspect().control.phase,'ready');assert.equal(f.port.messages[0].data.id,2);f.close();
});
test('throwing stale request observation cannot fail its successor',async()=>{
 const pending=deferred(),f=fixture({read:()=>pending.promise});await f.init();let nested;const request={type:'read',id:1,count:4,get offset(){nested=f.request({id:2});throw Error('old observation');}};await f.port.onmessage({data:request});pending.resolve(Uint8Array.of(2));await nested;assert.equal(f.inspect().control.phase,'ready');assert.equal(f.port.messages[0].data.id,2);f.close();
});
test('reply delivery reentry cannot fail the successor when the old post throws',async()=>{
 const pending=deferred();let reads=0,nested;const f=fixture({read:()=>++reads===1?Promise.resolve(Uint8Array.of(1)):pending.promise});await f.init();f.hooks.post=()=>{f.hooks.post=null;nested=f.request({id:2});throw Error('old delivery');};await f.request();pending.resolve(Uint8Array.of(2));await nested;assert.equal(f.inspect().control.phase,'ready');assert.equal(f.port.messages[0].data.id,2);f.close();
});
test('refresh replies carry IDs and clear physical timer ownership',async()=>{
 const f=fixture();await f.init({file:undefined});const refresh=f.readers[0].refresh('opaque');const request=f.messages.at(-1);assert.equal(request.type,'refresh');assert.equal(request.id,1);assert.equal(f.allTimers[0].delay,5000);f.send({type:'refreshed',id:request.id,update:{token:'ok'}});assert.deepEqual(await refresh,{token:'ok'});assert.equal(f.timers.size,0);assert.equal(f.inspect().refreshes,0);f.close();
});
test('early refresh deadline rearms only once and a stale callback cannot erase replacement registration',async()=>{
 const f=fixture();await f.init({file:undefined});const refresh=f.readers[0].refresh('opaque'),rejected=assert.rejects(refresh,/timeout/),first=f.allTimers[0];f.now=4999;f.fire(first);assert.equal(f.allTimers.at(-1).delay,1);const second=f.allTimers.at(-1);f.fire(first);assert.equal(f.allTimers.length,2);assert.equal(f.timers.has(second.id),true);f.now=5000;f.fire(second);await rejected;assert.equal(f.inspect().refreshes,0);assert.equal(f.timers.size,0);f.close();
});
test('late refresh reply after timeout cannot settle the new request',async()=>{
 const f=fixture();await f.init({file:undefined});const first=f.readers[0].refresh('one'),rejected=assert.rejects(first,/timeout/);f.now=5000;f.fire();await rejected;const second=f.readers[0].refresh('two');let settled=false;second.then(()=>{settled=true;});f.send({type:'refreshed',id:1,update:'old'});await turn();assert.equal(settled,false);f.send({type:'refreshed',id:2,update:'new'});assert.equal(await second,'new');f.close();
});
test('refresh reply observation reentry cannot claim a newer physical request',async()=>{
 const f=fixture();await f.init({file:undefined});const first=f.readers[0].refresh('one');let second;f.send({type:'refreshed',get id(){f.send({type:'refreshed',id:1,update:'first'});second=f.readers[0].refresh('two');return 2;},update:'stale'});assert.equal(await first,'first');assert.equal(f.inspect().control.refresh.id,2);assert.equal(f.inspect().refreshes,1);f.send({type:'refreshed',id:2,update:'second'});assert.equal(await second,'second');f.close();
});
test('timer clear reentry retires once while the accepted refresh still settles',async()=>{
 const f=fixture();await f.init({file:undefined});const refresh=f.readers[0].refresh('one');let clears=0;f.hooks.clearTimer=()=>{clears++;f.close();};f.send({type:'refreshed',id:1,update:'accepted'});assert.equal(await refresh,'accepted');assert.equal(clears,1);assert.equal(f.readers[0].closes,1);assert.equal(f.port.closes,1);assert.equal(f.inspect().timers,0);
});
test('failed timer cleanup is retained until its late callback, without stranding a refresh',async()=>{
 const f=fixture();await f.init({file:undefined});const refresh=f.readers[0].refresh('one');let clears=0;f.hooks.clearTimer=()=>{clears++;throw Error('clear failed');};f.send({type:'refreshed',id:1,update:'ok'});assert.equal(await refresh,'ok');assert.equal(f.inspect().timers,1);f.close();assert.equal(clears,1);f.fire();assert.equal(f.inspect().timers,0);assert.equal(f.inspect().refreshes,0);
});
test('initial and early-rearm timer acquisition failures settle and retire refresh ownership',async()=>{
 for(const early of [false,true]){const f=fixture();await f.init({file:undefined});const error=Error('set failed');if(!early)f.hooks.setTimer=()=>{throw error;};const refresh=f.readers[0].refresh('one'),rejected=assert.rejects(refresh,value=>value===error);if(early){f.hooks.setTimer=()=>{throw error;};f.now=10;f.fire();}await rejected;assert.equal(f.inspect().refreshes,0);assert.equal(f.inspect().control.refresh,null);f.close();}
});
test('close from late timer acquisition clears the acquired handle and rejects refresh',async()=>{
 const f=fixture();await f.init({file:undefined});f.hooks.setTimer=()=>f.close();await assert.rejects(f.readers[0].refresh('one'),error=>error.name==='AbortError');assert.equal(f.timers.size,0);assert.equal(f.inspect().refreshes,0);assert.equal(f.messages.some(value=>value.type==='refresh'),false);
});
test('close settles pending refresh even if timer and reader cleanup throw',async()=>{
 const f=fixture({readerClose(){throw Error('reader close');},portClose(){throw Error('port close');}});await f.init({file:undefined});const refresh=f.readers[0].refresh('one'),rejected=assert.rejects(refresh,error=>error.name==='AbortError');f.hooks.clearTimer=()=>{throw Error('timer clear');};f.close();await rejected;assert.equal(f.readers[0].closes,1);assert.equal(f.port.closes,1);assert.equal(f.inspect().refreshes,0);f.fire();assert.equal(f.inspect().timers,0);
});
test('source read errors publish terminal response and continue independent cleanup despite hostile formatting',async()=>{
 const error={toString(){throw Error('format');}},f=fixture({read:()=>Promise.reject(error),readerClose(){throw Error('close');}});await f.init();await f.request();assert.equal(f.inspect().control.phase,'failed');assert.equal(f.port.messages[0].data.id,1);assert.equal(f.port.messages[0].data.error,'Private source failure');assert.equal(f.port.closes,1);assert.equal(f.readers[0].closes,1);assert.equal(f.messages.at(-1).type,'error');
});
test('shared mailbox publishes bytes and close wakes the waiting loop',async()=>{
 const mailbox=new SharedArrayBuffer(64+262144),h=new Int32Array(mailbox,0,16),view=new DataView(mailbox),f=fixture();const opening=f.init({port:undefined,mailbox});await turn();view.setFloat64(32,8,true);Atomics.store(h,2,4);Atomics.store(h,0,1);f.context.Atomics.notify(h,0);await turn();assert.equal(Atomics.load(h,0),2);assert.equal(Atomics.load(h,3),4);assert.deepEqual([...new Uint8Array(mailbox,64,4)],[7,7,7,7]);f.close();await opening;assert.equal(Atomics.load(h,4),1);assert.equal(Atomics.load(h,0),3);assert.equal(f.readers[0].closes,1);
});
test('shared mailbox close during read suppresses a late copy and completion status',async()=>{
 const pending=deferred(),mailbox=new SharedArrayBuffer(64+262144),h=new Int32Array(mailbox,0,16),f=fixture({read:()=>pending.promise});Atomics.store(h,2,4);Atomics.store(h,0,1);const opening=f.init({port:undefined,mailbox});await turn();f.close();pending.resolve(Uint8Array.of(1,2));await opening;assert.deepEqual([...new Uint8Array(mailbox,64,4)],[0,0,0,0]);assert.equal(Atomics.load(h,0),3);assert.equal(Atomics.load(h,4),1);assert.equal(f.messages.filter(value=>value.type==='stats').length,0);
});

test('duplicate init releases a distinct transferred port during opening and ready',async()=>{
 for(const held of [true,false]){const pending=deferred(),f=fixture(held?{open:()=>pending.promise}:{}),opening=f.init();if(!held)await opening;const rejected={closes:0,close(){this.closes++;}};await f.init({port:rejected});assert.equal(rejected.closes,1);assert.equal(f.readers.length,1);assert.equal(f.port.closes,0);await f.init();assert.equal(f.port.closes,0);if(held){pending.resolve({size:1048576});await opening;}assert.equal(f.messages.filter(value=>value.type==='ready').length,1);f.close();assert.equal(f.port.closes,1);}
});
