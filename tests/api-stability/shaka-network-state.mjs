// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/shaka-network.js';
import {ShakaNetworkPolicy} from '../../web/generated/internal/shaka-network.js';
function machine(immutable=false,preview=false){let state=core.initialShakaNetwork(immutable,preview);return{get state(){return state;},apply(name,...args){const old=state,before=structuredClone(old),result=core[name](state,...args);assert.deepEqual(old,before);state=result.state??result;return result;},begin(kind='segment',timeout=100,now=0){const id=this.apply('beginShakaNetworkRequest',kind,timeout,now).id;this.apply('setShakaNetworkResource',id,id);return id;}};}
const facts=(patch={})=>({range:null,status:200,encoding:undefined,contentRange:undefined,contentLength:undefined,now:5,...patch});
test('pure transport admission preserves DRM, header and resource permission precedence',()=>{
 const allowed={license:false,drm:false,rangeOverride:false,ownedBlob:false,http:true,userinfo:false,allowed:true};
 assert.equal(core.shakaNetworkAdmission(allowed),undefined);
 for(const patch of [{http:false},{userinfo:true},{allowed:false},{rangeOverride:true}])assert.equal(core.shakaNetworkAdmission({...allowed,...patch}).code,'SOURCE_PERMISSION');
 assert.equal(core.shakaNetworkAdmission({...allowed,license:true,rangeOverride:true}).code,'UNSUPPORTED_FEATURE');
 assert.equal(core.shakaNetworkAdmission({...allowed,ownedBlob:true,http:false,allowed:false}),undefined);
});
test('pure explicit deadline, abort and retirement retain exactly one cancellation outcome',()=>{
 const m=machine(),a=m.begin('segment',100,20),b=m.begin('manifest',0,20);
 assert.equal(m.apply('expireShakaNetworkRequest',a,60).remaining,60);assert.equal(m.apply('expireShakaNetworkRequest',a,120).accepted,true);
 assert.equal(core.shakaNetworkRequest(m.state,a).cancelled,'timeout');assert.equal(m.apply('cancelShakaNetworkRequest',a).accepted,false);assert.equal(m.apply('expireShakaNetworkRequest',b,10000).accepted,false);
 m.apply('retireShakaNetwork');assert.equal(core.shakaNetworkCurrent(m.state,b),false);assert.equal(m.apply('beginShakaNetworkRequest','segment',10,0).accepted,false);assert.equal(m.state.requests.length,0);
});
test('pure authorization accepts one refresh per request and refuses replay or late result',()=>{
 const m=machine(),id=m.begin();assert.equal(m.apply('receiveShakaNetworkStatus',id,401,true).refresh,true);
 assert.equal(m.apply('receiveShakaNetworkStatus',id,401,true).accepted,false);m.apply('finishShakaNetworkRefresh',id);
 assert.equal(m.apply('receiveShakaNetworkStatus',id,403,true).failure.code,'SOURCE_PERMISSION');m.apply('cancelShakaNetworkRequest',id);assert.equal(m.apply('finishShakaNetworkRefresh',id).accepted,false);
 const noRefresh=m.begin();assert.equal(m.apply('receiveShakaNetworkStatus',noRefresh,401,false).failure.code,'SOURCE_PERMISSION');
});
test('pure ranges retain offsets above Number precision and exact 206 byte evidence',()=>{
 const m=machine(),id=m.begin();const input=facts({range:'bytes=9007199254740993-9007199254740997',status:206,contentRange:'bytes 9007199254740993-9007199254740997/9007199254741010',contentLength:'5'});
 assert.equal(m.apply('beginShakaNetworkBody',id,input).accepted,true);input.range='bytes=0-';assert.equal(core.shakaNetworkRequest(m.state,id).range.start,9007199254740993n);
 assert.deepEqual(m.apply('appendShakaNetworkBody',id,5,9).progress,{elapsed:4,bytes:5,remaining:0});const result=m.apply('completeShakaNetworkBody',id);assert.equal(result.streamRange,true);assert.equal(result.slice,undefined);assert.equal(m.state.totals[0].value,9007199254741010n);
});
test('pure complete 200 response slicing and validation happen before parser delivery',()=>{
 for(const [range,bytes,slice] of [['bytes=4-8',9,{start:4,end:9}],['bytes=4-',12,{start:4,end:12}],['bytes=4-99',12,{start:4,end:12}]]){
  const m=machine(),id=m.begin();m.apply('beginShakaNetworkBody',id,facts({range,contentLength:String(bytes)}));m.apply('appendShakaNetworkBody',id,bytes,10);assert.deepEqual(m.apply('completeShakaNetworkBody',id).slice,slice);
 }
 for(const patch of [{range:'items=1-2'},{range:'bytes=0-2',encoding:'gzip'},{status:206},{range:'bytes=4-8',status:206,contentRange:'bytes 3-7/12'}]){const m=machine(),id=m.begin();assert.equal(m.apply('beginShakaNetworkBody',id,facts(patch)).failure.code,'SOURCE_CHANGED');}
 const m=machine(),id=m.begin();m.apply('beginShakaNetworkBody',id,facts({range:'bytes=4-8',contentLength:'10'}));m.apply('appendShakaNetworkBody',id,9,10);assert.match(m.apply('completeShakaNetworkBody',id).failure.message,/Content-Length/);
});
test('pure preview/manifest budgets remain 4MiB and segments remain 16MiB',()=>{
 for(const [preview,kind,limit] of [[false,'segment',16],[false,'manifest',4],[true,'segment',4]]){
  const m=machine(false,preview),id=m.begin(kind);const size=limit*1024*1024;
  assert.equal(m.apply('beginShakaNetworkBody',id,facts({contentLength:String(size+1)})).failure.code,'SOURCE_PERMISSION');
  m.apply('beginShakaNetworkBody',id,facts());assert.equal(m.apply('appendShakaNetworkBody',id,size,10).accepted,true);assert.equal(m.apply('appendShakaNetworkBody',id,1,11).failure.code,'SOURCE_PERMISSION');assert.equal(core.shakaNetworkRequest(m.state,id).bytes,size);
 }
});
test('pure strong validator and range-total stores preserve insertion order and 4096 bounds',()=>{
 let state=core.initialShakaNetwork(true);
 for(let resource=1;resource<=4097;resource++){
  const begin=core.beginShakaNetworkRequest(state,'segment',0,0);state=core.setShakaNetworkResource(begin.state,begin.id,resource);
  state=core.observeShakaNetworkValidator(state,begin.id,'"same"',false).state;
  state=core.beginShakaNetworkBody(state,begin.id,facts({range:'bytes=0-0',status:206,contentRange:'bytes 0-0/20'})).state;
  state=core.appendShakaNetworkBody(state,begin.id,1,6).state;state=core.completeShakaNetworkBody(state,begin.id).state;state=core.finishShakaNetworkRequest(state,begin.id);
 }
 assert.equal(state.validators.length,4096);assert.equal(state.totals.length,4096);assert.equal(state.validators[0].resource,2);assert.equal(state.totals[0].resource,2);
 const begin=core.beginShakaNetworkRequest(state,'segment',0,0);state=core.setShakaNetworkResource(begin.state,begin.id,2);
 assert.equal(core.observeShakaNetworkValidator(state,begin.id,'W/"other"',false).state,state);assert.equal(core.observeShakaNetworkValidator(state,begin.id,'"other"',true).state,state);assert.equal(core.observeShakaNetworkValidator(state,begin.id,'"other"',false).failure.code,'SOURCE_CHANGED');
 state=core.observeShakaNetworkValidator(state,begin.id,'"same"',false).state;assert.equal(state.validators[0].resource,2);
 state=core.beginShakaNetworkBody(state,begin.id,facts({range:'bytes=0-0',status:206,contentRange:'bytes 0-0/21'})).state;state=core.appendShakaNetworkBody(state,begin.id,1,10).state;assert.equal(core.completeShakaNetworkBody(state,begin.id).failure.code,'SOURCE_CHANGED');
});
test('varied pure request histories cannot restore retired or aborted authority',()=>{
 for(let seed=1;seed<=30;seed++){
  const m=machine(),ids=[];let random=seed;
  for(let step=0;step<30;step++){random=(Math.imul(random,1664525)+1013904223)>>>0;const action=random%5,id=ids[random%Math.max(1,ids.length)];if(action===0)ids.push(m.begin());else if(id!==undefined){if(action===1)m.apply('cancelShakaNetworkRequest',id);if(action===2)m.apply('expireShakaNetworkRequest',id,150);if(action===3)m.apply('finishShakaNetworkRequest',id);if(action===4)m.apply('receiveShakaNetworkStatus',id,401,true);}}
  m.apply('retireShakaNetwork');for(const id of ids){const before=m.state;assert.equal(m.apply('finishShakaNetworkRefresh',id).accepted,false);assert.equal(m.state,before);}assert.equal(m.state.requests.length,0);
 }
});
class ShakaError extends Error{static Severity={RECOVERABLE:1,CRITICAL:2};static Category={NETWORK:1};static Code={HTTP_ERROR:1002,BAD_HTTP_STATUS:1001,TIMEOUT:1003,OPERATION_ABORTED:7001};constructor(severity,category,code,...data){super(`Shaka ${code}`);Object.assign(this,{severity,category,code,data});}}
function harness(source={},fetcher=async()=>new Response('body')){const schemes=new Map(),runtime={net:{HttpFetchPlugin:{parse(){throw Error('Unowned request');}},NetworkingEngine:{RequestType:{MANIFEST:0,SEGMENT:1,LICENSE:2},registerScheme:(name,plugin)=>schemes.set(name,plugin)}},util:{Error:ShakaError,AbortableOperation:class{constructor(promise,abort){this.promise=promise;this.abort=abort;}}}};const policy=new ShakaNetworkPolicy({url:'https://private.test/root?secret',...source},runtime,fetcher);const request=(extra={},progress=()=>{},received=()=>{})=>{const req={uris:['https://private.test/media?credential'],headers:{},method:'GET',body:null,retryParameters:{timeout:1000},...extra};policy.filter(1,req);return policy.plugin(req.uris[0],req,1,progress,received,{});};return{policy,request};}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};}
function response(){const counts={reads:0,cancels:0,releases:0};return{counts,value:{status:200,ok:true,url:'',headers:new Headers(),body:{getReader(){return{async read(){return counts.reads++?{done:true}:{done:false,value:new TextEncoder().encode('data')};},async cancel(){counts.cancels++;},releaseLock(){counts.releases++;}};}}}};}
test('actual received callback retirement stops reads and suppresses successful delivery',async()=>{
 const r=response(),h=harness({},async()=>r.value);const op=h.request({},()=>assert.fail('progress after retire'),()=>h.policy.destroy());await assert.rejects(op.promise,error=>error.severity===2&&error.code===1002);assert.deepEqual(r.counts,{reads:0,cancels:1,releases:1});assert.equal(h.policy.diagnostics.pendingRequests,0);
});
test('actual progress callback retirement stops incremental parser and later reads',async()=>{
 const r=response(),h=harness({},async()=>r.value);let parsed=0;const op=h.request({streamDataCallback:async()=>parsed++},()=>h.policy.destroy());await assert.rejects(op.promise);assert.equal(parsed,0);assert.deepEqual(r.counts,{reads:1,cancels:1,releases:1});
});
test('actual stream callback retirement cannot publish success for full or ranged data',async()=>{
 for(const ranged of [false,true]){const r=response(),h=harness({},async()=>r.value);let delivered;
  const op=h.request({headers:ranged?{Range:'bytes=1-2'}:{},streamDataCallback:async data=>{delivered=new TextDecoder().decode(data);h.policy.destroy();}});await assert.rejects(op.promise);assert.equal(delivered,ranged?'at':'data');assert.equal(r.counts.cancels,1);assert.equal(r.counts.releases,1);
 }
});
test('actual operation abort inside stream callback rejects with Shaka abort classification',async()=>{
 const r=response(),h=harness({},async()=>r.value);let operation;operation=h.request({streamDataCallback:async()=>operation.abort()});await assert.rejects(operation.promise,error=>error.code===7001);assert.equal(h.policy.terminalError,undefined);assert.equal(h.policy.diagnostics.pendingRequests,0);h.policy.destroy();
});
test('actual fetch completed after retirement releases unadopted body exactly once',async()=>{
 const pending=deferred();let cancelled=0;const h=harness({},()=>pending.promise),op=h.request();h.policy.destroy();pending.resolve({body:{async cancel(){cancelled++;}}});await assert.rejects(op.promise);assert.equal(cancelled,1);assert.equal(h.policy.terminalError,undefined);assert.equal(h.policy.resources.size,0);
});
test('actual unauthorized-body cleanup retirement prevents authorization renewal',async()=>{
 let refreshed=0;const h=harness({refreshAuthorization:async()=>{refreshed++;return{};}},async()=>({status:401,body:{async cancel(){h.policy.destroy();}}}));await assert.rejects(h.request().promise);assert.equal(refreshed,0);
});
test('actual callbacks retain receiver semantics while authorization and parser data remain shell-only',async()=>{
 let fetched=0,sourceReceiver,parserReceiver;const source={headers:{Authorization:'secret'},refreshAuthorization:async function(){sourceReceiver=this;return{headers:{Authorization:'renewed'}};}};
 const h=harness(source,async()=>++fetched===1?new Response('',{status:401}):new Response('data'));await h.request({streamDataCallback:async function(){parserReceiver=this;}}).promise;
 assert.equal(sourceReceiver.headers.Authorization,'secret');assert.equal(typeof parserReceiver.streamDataCallback,'function');assert.equal(JSON.stringify(h.policy.control).includes('private.test'),false);assert.equal(JSON.stringify(h.policy.control).includes('Authorization'),false);assert.equal(h.policy.resources.size,0);h.policy.destroy();
});
test('actual early/duplicate deadline callbacks only abort the matching request',async t=>{
 let now=0,id=0;const timers=new Map();t.mock.method(performance,'now',()=>now);t.mock.method(globalThis,'setTimeout',(callback,delay)=>{const key=++id;timers.set(key,{callback,delay});return key;});t.mock.method(globalThis,'clearTimeout',key=>timers.delete(key));
 const h=harness({},async(_uri,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('abort','AbortError')))));
 const first=h.request(),firstRejected=assert.rejects(first.promise,error=>error.code===1003),second=h.request(),secondRejected=assert.rejects(second.promise,error=>error.code===7001);const old=timers.get(1).callback;now=100;timers.delete(1);old();assert.equal(timers.get(3).delay,900);old();assert.equal(h.policy.diagnostics.pendingRequests,2);
 now=1000;const expired=timers.get(3).callback;timers.delete(3);expired();await firstRejected;assert.equal(h.policy.diagnostics.pendingRequests,1);await second.abort();await secondRejected;assert.equal(timers.size,0);h.policy.destroy();
});
test('actual deadline rescheduling failure aborts and releases request resources',async t=>{
 let calls=0,callback;t.mock.method(globalThis,'setTimeout',fn=>{if(++calls>1)throw Error('timer unavailable');callback=fn;return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});t.mock.method(performance,'now',()=>0);
 const h=harness({},async(_uri,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('abort','AbortError'))))),op=h.request();callback();await assert.rejects(op.promise,error=>error.code===7001);assert.equal(h.policy.diagnostics.pendingRequests,0);h.policy.destroy();
});
test('actual late AbortController acquisition is aborted after constructor retirement',async t=>{
 const Original=globalThis.AbortController;let acquired,fetched=0,policy;t.mock.method(globalThis,'AbortController',class extends Original{constructor(){super();acquired=this;policy.destroy();}});const h=harness({},async()=>{fetched++;return new Response('data');});policy=h.policy;await assert.rejects(h.request().promise);assert.equal(acquired.signal.aborted,true);assert.equal(fetched,0);assert.equal(policy.diagnostics.pendingRequests,0);
});
test('actual duplicate old deadline callback cannot rearm a replacement with a reused host handle',async t=>{
 let now=0;const callbacks=[];t.mock.method(performance,'now',()=>now);t.mock.method(globalThis,'setTimeout',callback=>{callbacks.push(callback);return 1;});t.mock.method(globalThis,'clearTimeout',()=>{});
 const h=harness({},async(_uri,init)=>new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('abort','AbortError'))))),op=h.request(),rejected=assert.rejects(op.promise,error=>error.code===1003);
 now=100;callbacks[0]();assert.equal(callbacks.length,2);now=200;callbacks[0]();assert.equal(callbacks.length,2);now=1000;callbacks[1]();await rejected;assert.equal(h.policy.diagnostics.pendingRequests,0);h.policy.destroy();
});
test('actual pending diagnostics include reader cleanup until its physical completion',async()=>{
 const cancelled=deferred(),entered=deferred(),r=response();const get=r.value.body.getReader;r.value.body.getReader=()=>({...get(),cancel(){r.counts.cancels++;entered.resolve();return cancelled.promise;}});
 const h=harness({},async()=>r.value),op=h.request();await entered.promise;assert.equal(h.policy.diagnostics.pendingRequests,1);cancelled.resolve();await op.promise;assert.equal(h.policy.diagnostics.pendingRequests,0);h.policy.destroy();
});
test('actual reader cleanup reentry preserves a successor using the same Shaka request object',async()=>{
 const r=response(),next=deferred();let fetches=0,successor;const h=harness({},async()=>++fetches===1?r.value:next.promise),request={uris:['https://private.test/shared'],headers:{},method:'GET',body:null,retryParameters:{timeout:1000}};
 const invoke=()=>{h.policy.filter(1,request);return h.policy.plugin(request.uris[0],request,1,()=>{},()=>{},{});};
 const get=r.value.body.getReader;r.value.body.getReader=()=>({...get(),async cancel(){r.counts.cancels++;successor=invoke();}});
 await invoke().promise;assert.equal(h.policy.diagnostics.pendingRequests,1);assert.equal(h.policy.requests.get(request).size,1);next.resolve(new Response('next'));assert.equal(new TextDecoder().decode((await successor.promise).data),'next');assert.equal(h.policy.diagnostics.pendingRequests,0);assert.equal(h.policy.requests.size,0);h.policy.destroy();
});
test('actual operation abort remains available while physical reader cleanup is pending',async()=>{
 const hold=deferred(),entered=deferred(),r=response();let signal;const get=r.value.body.getReader;r.value.body.getReader=()=>({...get(),cancel(){entered.resolve();return hold.promise;}});
 const h=harness({},async(_uri,init)=>{signal=init.signal;signal.addEventListener('abort',()=>hold.resolve());return r.value;}),op=h.request();await entered.promise;await op.abort();assert.equal(signal.aborted,true);await op.promise;assert.equal(h.policy.diagnostics.pendingRequests,0);h.policy.destroy();
});
