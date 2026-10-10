// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ShakaRecovery} from '../web/generated/internal/shaka-recovery.js';
import {initialShakaRecovery,transitionShakaRecovery,shakaRecoverySnapshot} from '../web/generated/internal/machine/shaka-recovery.js';
const idle={status:'idle',retryingRequests:0},snapshot=n=>({status:'retrying',retryingRequests:n});
const flush=()=>new Promise(setImmediate);
function fixture(t){
 const player=new EventTarget(),network=new EventTarget(),events=[],operations=[];
 network.request=function(type,request,context){
  assert.equal(this,network);let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const op={promise,abort:async()=>reject(Error('cancelled during backoff')),progress:'preserved'};
  operations.push({type,request,context,resolve,reject,op});return op;
 };
 const original=network.request,recovery=new ShakaRecovery(player,network,1003,()=>events.push(recovery.snapshot));t.after(()=>recovery.destroy());
 const request=()=>{const value={uris:['https://media.test/private?token=secret'],headers:{Authorization:'secret'}};return {value,op:network.request(1,value,{context:true}),work:operations.at(-1)};};
 const failed=(value,error={},aborted=false)=>player.dispatchEvent(Object.assign(new Event('downloadfailed'),{request:value,error,aborted}));
 const retry=(value,{aborted=false,cancel=false,critical=false}={})=>{
  const error={code:aborted?7001:1001,severity:critical?2:1};failed(value,error,aborted);
  const event=Object.assign(new Event('retry',{cancelable:true}),{error:aborted?{code:1003}:error});
  if(cancel)event.preventDefault();network.dispatchEvent(event);return event;
 };
 return {player,network,recovery,events,request,retry,failed,original,operations};
}
test('recovery tracks the unchanged logical operation through backoff and success',async t=>{
 const f=fixture(t),a=f.request();assert.equal(a.op,a.work.op);assert.equal(a.op.progress,'preserved');assert.deepEqual(f.recovery.snapshot,idle);
 f.retry(a.value);await flush();assert.deepEqual(f.recovery.snapshot,snapshot(1));assert.ok(Object.isFrozen(f.recovery.snapshot));
 // Time passing, ordinary buffering and unrelated success cannot report recovery.
 const b=f.request();b.work.resolve({});await flush();assert.deepEqual(f.recovery.snapshot,snapshot(1));
 a.work.resolve({});await flush();assert.deepEqual(f.recovery.snapshot,idle);assert.deepEqual(f.events,[snapshot(1),idle]);
 assert.ok(!JSON.stringify(f.events).includes('secret'));
});
test('concurrent retries settle independently and repeated attempts do not inflate the count',async t=>{
 const f=fixture(t),a=f.request(),b=f.request();f.retry(a.value);f.retry(b.value);await flush();assert.deepEqual(f.recovery.snapshot,snapshot(2));
 f.retry(a.value);await flush();assert.equal(f.events.length,2);
 a.work.resolve({});await flush();assert.deepEqual(f.recovery.snapshot,snapshot(1));b.work.reject(Error('exhausted'));await flush();assert.deepEqual(f.recovery.snapshot,idle);
});
test('aborting a retry in backoff clears recovery without waiting for another attempt',async t=>{
 const f=fixture(t),a=f.request();f.retry(a.value);await flush();assert.deepEqual(f.recovery.snapshot,snapshot(1));
 await a.op.abort();await flush();assert.deepEqual(f.recovery.snapshot,idle);
});
test('a cancelled retry event and a terminal failure never report an automatic retry',async t=>{
 const f=fixture(t),a=f.request();f.network.addEventListener('retry',e=>e.preventDefault());f.retry(a.value);await flush();assert.deepEqual(f.recovery.snapshot,idle);
 a.work.reject(Error('terminal'));await flush();assert.deepEqual(f.events,[]);
 const b=f.request();f.failed(b.value,{severity:2});b.work.reject(Error('critical'));await flush();assert.deepEqual(f.events,[]);
});
test('Shaka timeout normalization correlates only the failed logical request',async t=>{
 const f=fixture(t),a=f.request();f.retry(a.value,{aborted:true});await flush();assert.deepEqual(f.recovery.snapshot,snapshot(1));a.work.resolve({});await flush();
 const b=f.request();f.failed(b.value,{code:7001},false);f.network.dispatchEvent(Object.assign(new Event('retry'),{error:{code:1003}}));await flush();assert.deepEqual(f.recovery.snapshot,idle);b.work.resolve({});
});
test('a failed download cannot lend its identity to a later unrelated retry event',async t=>{
 const f=fixture(t),a=f.request(),error={code:1003};f.failed(a.value,error,true);await flush();f.network.dispatchEvent(Object.assign(new Event('retry'),{error}));await flush();assert.deepEqual(f.recovery.snapshot,idle);a.work.resolve({});
});
test('retirement removes hooks and rejects old completions and queued retry notifications',async t=>{
 const f=fixture(t),a=f.request();f.retry(a.value);f.recovery.destroy();assert.equal(f.network.request,f.original);await flush();assert.deepEqual(f.events,[]);
 a.work.reject(Error('old source'));await flush();assert.deepEqual(f.recovery.snapshot,idle);assert.deepEqual(f.events,[]);
});
test('retiring one source leaves a fresh source idle and drops its old request identities',async t=>{
 const old=fixture(t),a=old.request();old.retry(a.value);await flush();old.recovery.destroy();
 const next=fixture(t);old.retry(a.value);a.work.resolve({});await flush();assert.deepEqual(next.recovery.snapshot,idle);assert.deepEqual(next.events,[]);assert.deepEqual(old.events,[snapshot(1)]);
});
test('listener acquisition rollback restores the exact original request function',()=>{
 const player=new EventTarget(),network=new EventTarget(),request=()=>{};network.request=request;const callbacks=new Set();
 player.addEventListener=(_name,fn)=>{callbacks.add(fn);throw Error('registration');};player.removeEventListener=(_name,fn)=>callbacks.delete(fn);
 assert.throws(()=>new ShakaRecovery(player,network,1003,()=>{}),/registration/);assert.equal(callbacks.size,0);assert.equal(network.request,request);
});
test('retry bookkeeping is immutable, replayable, and terminal under every short command trace',()=>{
 const commands=[{type:'begin'},{type:'retry',id:1},{type:'settle',id:1},{type:'retry',id:2},{type:'settle',id:2},{type:'retire'}];
 const visit=(state,depth)=>{
  assert.ok(Object.isFrozen(state));assert.ok(Object.isFrozen(state.requests));assert.ok(Object.isFrozen(state.retrying));
  assert.ok(state.retrying.every(id=>state.requests.includes(id)));assert.equal(new Set(state.retrying).size,state.retrying.length);
  assert.deepEqual(shakaRecoverySnapshot(state),state.retrying.length?snapshot(state.retrying.length):idle);
  if(!depth)return;
  for(const command of commands){const before=JSON.stringify(state),next=transitionShakaRecovery(state,command);assert.deepEqual(next,transitionShakaRecovery(state,command));assert.equal(JSON.stringify(state),before);if(!state.active)assert.equal(next,state);visit(next,depth-1);}
 };visit(initialShakaRecovery(),5);
});
