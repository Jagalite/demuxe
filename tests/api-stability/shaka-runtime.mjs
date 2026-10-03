// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createShakaRuntime,joinShakaRuntime,leaveShakaRuntime,finishShakaRuntime,shakaRuntimeDeadline} from '../../web/generated/internal/machine/shaka-runtime.js';
import {ShakaRuntimeLoader} from '../../web/generated/internal/shaka-runtime.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const turn=()=>new Promise(setImmediate);
test('shared runtime consumers are unique and only the final pending departure cancels',()=>{
 const initial=createShakaRuntime(),first=joinShakaRuntime(initial,'asset',100),second=joinShakaRuntime(first.state,'asset',200);assert.equal(initial.loads.length,0);assert.equal(first.start,true);assert.equal(second.start,false);assert.equal(first.load,second.load);assert.notEqual(first.consumer,second.consumer);assert.equal(second.state.loads[0].deadline,15100);
 const leave=leaveShakaRuntime(second.state,first.load,first.consumer);assert.equal(leave.cancel,false);assert.equal(leaveShakaRuntime(leave.state,first.load,first.consumer).accepted,false);const final=leaveShakaRuntime(leave.state,second.load,second.consumer);assert.equal(final.cancel,true);assert.equal(final.state.loads.length,0);
});
test('ready values remain reusable and failed generations do not block a retry',()=>{
 for(const success of [true,false]){const first=joinShakaRuntime(createShakaRuntime(),'asset',0),finished=finishShakaRuntime(first.state,first.load,success),second=joinShakaRuntime(finished.state,'asset',1);assert.equal(second.start,!success);const left=leaveShakaRuntime(second.state,first.load,first.consumer);assert.equal(left.cancel,false);assert.equal(finishShakaRuntime(left.state,first.load,!success).accepted,false);assert.ok(left.state.loads.some(load=>load.id===second.load));}
});
test('deadline observation stays explicit and cannot retire a replacement',()=>{
 const first=joinShakaRuntime(createShakaRuntime(),'asset',50);assert.deepEqual(shakaRuntimeDeadline(first.state,first.load,51),{current:true,remaining:14999});assert.equal(shakaRuntimeDeadline(first.state,first.load,15050).remaining,0);const retired=leaveShakaRuntime(first.state,first.load,first.consumer),next=joinShakaRuntime(retired.state,'asset',60);assert.ok(next.load>first.load);assert.equal(shakaRuntimeDeadline(next.state,first.load,20000).current,false);
});
function fixture(t){
 const requests=[],scripts=[],revoked=[],removed=[],timers=new Set(),runtime={Player:class{}},saved=new Map();let now=0,fetchHook,appendHook,clearHook,removeHook,blobHook;
 const set=(name,value)=>{saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});};
 set('performance',{now:()=>now});set('shaka',runtime);
 set('setTimeout',(callback,delay)=>{const timer={callback,delay};timers.add(timer);return timer;});set('clearTimeout',timer=>{timers.delete(timer);clearHook?.();});
 set('fetch',(url,options)=>{const result=deferred();requests.push({url,options,...result});fetchHook?.();return result.promise;});
 set('document',{createElement(){const script={remove(){script.appended=false;removed.push(script);removeHook?.();}};scripts.push(script);return script;},head:{append(script){appendHook?.(script);script.appended=true;}}});
 t.mock.method(URL,'createObjectURL',()=>{const url='blob:runtime-'+(scripts.length+1);blobHook?.();return url;});t.mock.method(URL,'revokeObjectURL',url=>revoked.push(url));
 t.after(()=>{for(const [name,descriptor]of saved)descriptor?Object.defineProperty(globalThis,name,descriptor):delete globalThis[name];});
 const loader=new ShakaRuntimeLoader(),base=new URL('https://assets.test/');
 return {loader,base,requests,scripts,timers,removed,revoked,runtime,get now(){return now;},set now(value){now=value;},set fetchHook(value){fetchHook=value;},set appendHook(value){appendHook=value;},set clearHook(value){clearHook=value;},set removeHook(value){removeHook=value;},set blobHook(value){blobHook=value;},async fetched(index=0){requests[index].resolve({ok:true,text:async()=>''});await turn();},fire(){const timer=[...timers][0];assert.ok(timer);timers.delete(timer);timer.callback();}};
}
test('actual shared fetch is installed before synchronous fetch reentry',async t=>{
 const f=fixture(t),first=new AbortController(),second=new AbortController();let nested;f.fetchHook=()=>{f.fetchHook=undefined;nested=f.loader.load(f.base,second.signal);};const initial=f.loader.load(f.base,first.signal);assert.equal(f.requests.length,1);await f.fetched();f.scripts[0].onload();assert.equal(await initial,f.runtime);assert.equal(await nested,f.runtime);assert.equal(f.timers.size,0);assert.equal(f.revoked.length,1);
 const cached=await f.loader.load(f.base,new AbortController().signal);assert.equal(cached,f.runtime);assert.equal(f.requests.length,1);
});
test('aborting one consumer preserves shared work until the final consumer retires',async t=>{
 const f=fixture(t),a=new AbortController(),b=new AbortController(),first=f.loader.load(f.base,a.signal),second=f.loader.load(f.base,b.signal);a.abort();await assert.rejects(first,{code:'ABORTED'});assert.equal(f.requests[0].options.signal.aborted,false);b.abort();await assert.rejects(second,{code:'ABORTED'});assert.equal(f.requests[0].options.signal.aborted,true);assert.equal(f.timers.size,0);
 let cancelled=0;f.requests[0].resolve({ok:true,body:{cancel:async()=>cancelled++},text:async()=>{throw Error('retired read');}});await turn();assert.equal(cancelled,1);assert.equal(f.scripts.length,0);
});
test('abort from fetch synchronous prefix settles its installed consumer and prevents late script execution',async t=>{
 const f=fixture(t),controller=new AbortController();f.fetchHook=()=>controller.abort();const work=f.loader.load(f.base,controller.signal);await assert.rejects(work,{code:'ABORTED'});assert.equal(f.requests[0].options.signal.aborted,true);await f.fetched();assert.equal(f.scripts.length,0);assert.equal(f.timers.size,0);
});
test('script failure retires its load before cleanup can start a replacement',async t=>{
 const f=fixture(t),first=f.loader.load(f.base,new AbortController().signal);await f.fetched();let second;f.removeHook=()=>{f.removeHook=undefined;second=f.loader.load(f.base,new AbortController().signal);};f.scripts[0].onerror();await assert.rejects(first,{code:'ASSET_LOAD_FAILED'});assert.equal(f.requests.length,2);await f.fetched(1);f.scripts[1].onload();assert.equal(await second,f.runtime);assert.equal(f.revoked.length,2);
});
test('an early deadline rearms against the sampled clock and late load does not revive it',async t=>{
 const f=fixture(t),work=f.loader.load(f.base,new AbortController().signal);f.now=10;f.fire();assert.equal([...f.timers][0].delay,14990);await f.fetched();const late=f.scripts[0].onload;f.now=15000;f.fire();await assert.rejects(work,/timed out/);late();assert.equal(f.loader.state.loads.length,0);assert.equal(f.requests[0].options.signal.aborted,true);
});
test('throwing cleanup still settles consumers and releases every other physical resource',async t=>{
 const f=fixture(t),work=f.loader.load(f.base,new AbortController().signal);await f.fetched();f.clearHook=()=>{throw Error('timer cleanup');};f.removeHook=()=>{throw Error('node cleanup');};f.scripts[0].onload();assert.equal(await work,f.runtime);assert.equal(f.revoked.length,1);assert.equal(f.timers.size,0);
});
test('abort during object URL acquisition revokes the late acquired URL',async t=>{
 const f=fixture(t),controller=new AbortController(),work=f.loader.load(f.base,controller.signal);const rejected=assert.rejects(work,{code:'ABORTED'});f.blobHook=()=>controller.abort();await f.fetched();await rejected;assert.equal(f.revoked.length,1);assert.equal(f.scripts.length,0);
});
test('pre-aborted callers consume no runtime or fetch ownership',async t=>{
 const f=fixture(t),controller=new AbortController();controller.abort();await assert.rejects(f.loader.load(f.base,controller.signal),{code:'ABORTED'});assert.equal(f.loader.state.loads.length,0);assert.equal(f.requests.length,0);
});

test('abort before synchronous append attachment removes the late attached node',async t=>{
 const f=fixture(t),controller=new AbortController(),work=f.loader.load(f.base,controller.signal),rejected=assert.rejects(work,{code:'ABORTED'});f.appendHook=()=>controller.abort();await f.fetched();await rejected;assert.equal(f.scripts[0].appended,false);assert.equal(f.revoked.length,1);assert.equal(f.timers.size,0);
});
test('throwing handler cleanup cannot prevent script node removal or settlement',async t=>{
 const f=fixture(t),work=f.loader.load(f.base,new AbortController().signal);await f.fetched();const script=f.scripts[0],complete=script.onload;Object.defineProperty(script,'onload',{get:()=>complete,set(){throw Error('handler cleanup');}});complete();assert.equal(await work,f.runtime);assert.equal(script.appended,false);assert.equal(script.onerror,null);assert.equal(f.revoked.length,1);
});
test('aborted fetch acquisitions keep all32 slots charged until physical completion',async t=>{
 const f=fixture(t);
 for(let i=0;i<32;i++){const c=new AbortController(),work=f.loader.load(new URL(`https://assets.test/${i}/`),c.signal);c.abort();await assert.rejects(work,{code:'ABORTED'});}
 assert.equal(f.loader.state.loads.length,32);assert.equal(f.loader.handles.size,32);
 await assert.rejects(f.loader.load(f.base,new AbortController().signal),/capacity/);assert.equal(f.requests.length,32);
 await f.fetched(0);assert.equal(f.loader.state.loads.length,31);assert.equal(f.loader.handles.size,31);
 const c=new AbortController(),next=f.loader.load(f.base,c.signal);assert.equal(f.requests.length,33);c.abort();await assert.rejects(next);
});
test('consumer capacity rejects before callback or fetch acquisition and reopens on leave',async t=>{
 const f=fixture(t),controllers=[],works=[];
 for(let i=0;i<128;i++){const c=new AbortController();controllers.push(c);works.push(f.loader.load(f.base,c.signal));}
 await assert.rejects(f.loader.load(f.base,new AbortController().signal),/capacity/);assert.equal(f.requests.length,1);
 controllers[0].abort();await assert.rejects(works[0]);const next=f.loader.load(f.base,new AbortController().signal);
 await f.fetched();f.scripts[0].onload();await Promise.all([...works.slice(1),next]);assert.equal(f.loader.state.loads[0].consumers.length,0);
});
test('ready module cache and monotonic identities have finite admission',()=>{
 let state=createShakaRuntime();for(let i=0;i<32;i++){const joined=joinShakaRuntime(state,String(i),0);state=finishShakaRuntime(joined.state,joined.load,true).state;state=leaveShakaRuntime(state,joined.load,joined.consumer).state;}
 assert.equal(joinShakaRuntime(state,'extra',0).accepted,false);assert.equal(joinShakaRuntime(state,'0',0).start,false);
 assert.equal(joinShakaRuntime({...state,nextConsumer:Number.MAX_SAFE_INTEGER},'0',0).accepted,false);
 assert.equal(joinShakaRuntime({...createShakaRuntime(),nextLoad:Number.MAX_SAFE_INTEGER},'new',0).accepted,false);
});
test('deadline during pending response text retains native acquisition charge',async t=>{
 const f=fixture(t),body=deferred(),work=f.loader.load(f.base,new AbortController().signal);f.requests[0].resolve({ok:true,text:()=>body.promise});await turn();
 f.now=15000;f.fire();await assert.rejects(work,/timed out/);assert.equal(f.loader.state.loads.length,1);assert.equal(f.loader.handles.size,1);
 body.resolve('');await turn();assert.equal(f.loader.state.loads.length,0);assert.equal(f.loader.handles.size,0);assert.equal(f.scripts.length,0);
});
