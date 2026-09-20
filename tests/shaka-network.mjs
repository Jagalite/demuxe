// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ShakaNetworkPolicy} from '../web/generated/internal/shaka-network.js';
class ShakaError extends Error {
  static Severity={RECOVERABLE:1,CRITICAL:2};static Category={NETWORK:1};static Code={HTTP_ERROR:1002,BAD_HTTP_STATUS:1001,TIMEOUT:1003,OPERATION_ABORTED:7001};
  constructor(severity,category,code,...data){super(`Shaka ${code}`);Object.assign(this,{severity,category,code,data});}
}
function harness(source={},fetcher=async()=>new Response('media')) {
  const schemes=new Map();
  const runtime={net:{HttpFetchPlugin:{parse(){throw Error('Unowned test request');}},NetworkingEngine:{RequestType:{MANIFEST:0,SEGMENT:1,LICENSE:2},registerScheme:(name,plugin)=>schemes.set(name,plugin),unregisterScheme:name=>schemes.delete(name)}},util:{Error:ShakaError,AbortableOperation:class{constructor(promise,abort){this.promise=promise;this.abort=abort;}}}};
  const policy=new ShakaNetworkPolicy({url:'https://media.test/main.mpd',...source},runtime,fetcher);
  const request=(uri='https://media.test/segment.m4s',extra={})=>{
    const req={uris:[uri],headers:{},method:'GET',body:null,retryParameters:{timeout:1000},...extra};
    policy.filter(1,req);
    return schemes.get(new URL(req.uris[0]).protocol.slice(0,-1))(req.uris[0],req,1,()=>{},()=>{},{});
  };
  return {policy,request,schemes};
}
test('disallowed media and key origins reject before any request; userinfo is forbidden',()=>{
  let fetched=0;const h=harness({},async()=>{fetched++;return new Response('x');});
  try{for(const uri of ['https://other.test/key','http://media.test/key','https://user:password@media.test/key','data:text/plain,secret'])assert.throws(()=>h.request(uri),e=>e.code==='SOURCE_PERMISSION');assert.equal(fetched,0);}finally{h.policy.destroy();}
});
test('credentials and custom headers preserve range; redirects are rejected before browser forwarding',async()=>{
  let init;const h=harness({credentials:'omit',headers:{Authorization:'Bearer test'}},async(_url,value)=>{init=value;return new Response('0123bytes');});
  try{const response=await h.request(undefined,{headers:{Range:'bytes=4-8'}}).promise;assert.equal(new TextDecoder().decode(response.data),'bytes');assert.equal(init.credentials,'omit');assert.equal(init.redirect,'error');assert.equal(init.headers.get('range'),'bytes=4-8');assert.equal(init.headers.get('authorization'),'Bearer test');assert.equal(response.uri,'https://media.test/segment.m4s');}finally{h.policy.destroy();}
});
test('one authorization refresh retries only the authorized URL and preserves request semantics',async()=>{
  const calls=[];let refreshed=0;
  const h=harness({allowedOrigins:['https://media.test','https://cdn.test'],refreshAuthorization:async resource=>{refreshed++;assert.equal(resource.url,'https://media.test/segment.m4s');return {url:'https://cdn.test/segment.m4s',headers:{Authorization:'Bearer renewed'}};}},async(url,init)=>{calls.push({url,range:init.headers.get('range'),auth:init.headers.get('authorization')});return calls.length===1?new Response('',{status:401}):new Response('ok');});
  try{await h.request().promise;assert.equal(refreshed,1);assert.deepEqual(calls.map(c=>c.url),['https://media.test/segment.m4s','https://cdn.test/segment.m4s']);assert.equal(calls[1].range,null);assert.equal(calls[1].auth,'Bearer renewed');}finally{h.policy.destroy();}
});
test('refreshed URL cannot escape allowed origins',async()=>{
  let fetched=0;const h=harness({refreshAuthorization:async()=>({url:'https://evil.test/steal'})},async()=>{fetched++;return new Response('',{status:403});});
  try{await assert.rejects(h.request().promise);assert.equal(fetched,1);assert.equal(h.policy.terminalError.code,'SOURCE_PERMISSION');}finally{h.policy.destroy();}
});
test('persistent 401/403 remains terminal permission failure, never codec fallback',async()=>{
  for(const status of [401,403]){let refreshed=0,calls=0;const h=harness({refreshAuthorization:async()=>{refreshed++;return {headers:{Authorization:'renewed'}};}},async()=>{calls++;return new Response('',{status});});try{await assert.rejects(h.request().promise);assert.equal(refreshed,1);assert.equal(calls,2);assert.equal(h.policy.terminalError.code,'SOURCE_PERMISSION');}finally{h.policy.destroy();}}
});
test('destroy cancels pending authorization, prevents late replacement requests and removes session request ownership',async()=>{
  let release,refreshStarted;const entered=new Promise(resolve=>refreshStarted=resolve),pending=new Promise(resolve=>release=resolve);let calls=0;
  const h=harness({refreshAuthorization:()=>{refreshStarted();return pending;}},async()=>{calls++;return new Response('',{status:401});});const operation=h.request();await entered;h.policy.destroy();release({url:'https://media.test/late'});await assert.rejects(operation.promise);assert.equal(calls,1);assert.equal(h.policy.diagnostics.active,false);assert.equal(h.policy.diagnostics.pendingRequests,0);assert.throws(()=>h.request(),e=>e.code==='ABORTED');h.policy.destroy();
});
test('Shaka operation abort reaches the in-flight fetch',async()=>{
  let signal;const h=harness({},async(_url,init)=>{signal=init.signal;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError'))));});
  try{const operation=h.request();await operation.abort();await assert.rejects(operation.promise,e=>e.code===7001);assert.equal(signal.aborted,true);assert.equal(h.policy.diagnostics.pendingRequests,0);}finally{h.policy.destroy();}
});
test('immutable segment validators detect identity changes',async()=>{
  let reads=0;const h=harness({immutable:true},async()=>new Response('media',{headers:{ETag:++reads===1?'"one"':'"two"'}}));
  try{await h.request().promise;await assert.rejects(h.request().promise);assert.equal(h.policy.terminalError.code,'SOURCE_CHANGED');}finally{h.policy.destroy();}
});
test('DRM license traffic is refused before transport',()=>{const h=harness();try{assert.throws(()=>h.policy.filter(2,{uris:['https://media.test/license']}),e=>e.code==='UNSUPPORTED_FEATURE');}finally{h.policy.destroy();}});
test('caller cannot override Shaka byte ranges, including refreshed headers',async()=>{
  assert.throws(()=>harness({headers:{rAnGe:'bytes=0-'}}),e=>e.code==='SOURCE_PERMISSION');
  let calls=0;const h=harness({refreshAuthorization:async()=>({headers:{Range:'bytes=0-'}})},async()=>{calls++;return new Response('',{status:401});});
  try{await assert.rejects(h.request().promise);assert.equal(calls,1);assert.equal(h.policy.terminalError.code,'SOURCE_PERMISSION');}finally{h.policy.destroy();}
});
test('immutable promise does not require validators or treat weak ETags as strong identity',async()=>{
  let reads=0;const h=harness({immutable:true},async()=>new Response('media',{headers:++reads===1?{}:{ETag:`W/"${reads}"`}}));
  try{await h.request().promise;await h.request().promise;await h.request().promise;assert.equal(h.policy.terminalError,undefined);}finally{h.policy.destroy();}
});
test('response budget rejects advertised and streaming excess, cancels the reader',async()=>{
  for(const advertised of [true,false]){
    let cancelled=false;let reads=0;
    const stream=new ReadableStream({pull(controller){if(!reads++)controller.enqueue(new Uint8Array(advertised?1:16*1024*1024+1));},cancel(){cancelled=true;}});
    const h=harness({},async()=>new Response(stream,{headers:advertised?{'Content-Length':String(16*1024*1024+1)}:{}}));
    try{await assert.rejects(h.request().promise);assert.equal(h.policy.terminalError.code,'SOURCE_PERMISSION');assert.equal(cancelled,true);}finally{h.policy.destroy();}
  }
});
test('total request deadline aborts both connection and body stalls',async()=>{
  for(const phase of ['connection','body']){
    const h=harness({},async(_url,init)=>phase==='connection'?new Promise((_,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')))):new Response(new ReadableStream({start(controller){init.signal.addEventListener('abort',()=>controller.error(new DOMException('cancelled','AbortError')));}})));
    try{await assert.rejects(h.request(undefined,{retryParameters:{timeout:10,connectionTimeout:0,stallTimeout:0}}).promise,e=>e.code===1003);assert.equal(h.policy.diagnostics.pendingRequests,0);}finally{h.policy.destroy();}
  }
});
test('request filter is idempotent across Shaka retries and keeps scheme selection stable',async()=>{
  const h=harness();const request={uris:['https://media.test/media.m4s'],headers:{},method:'GET',body:null,retryParameters:{timeout:1000}};
  try{h.policy.filter(1,request);h.policy.filter(1,request);assert.deepEqual(request.uris,['https://media.test/media.m4s']);await h.schemes.get('https')(request.uris[0],request,1,()=>{},()=>{},{}).promise;h.policy.filter(1,request);await h.schemes.get('https')(request.uris[0],request,1,()=>{},()=>{},{}).promise;}finally{h.policy.destroy();}
});
test('retiring a filtered request cannot make the shared plugin bypass policy during backoff',async()=>{
  let fetched=0;const h=harness({},async()=>{fetched++;return new Response('data');});const request={uris:['https://media.test/media.m4s'],headers:{},method:'GET',body:null,retryParameters:{timeout:1000}};
  h.policy.filter(1,request);h.policy.destroy();await assert.rejects(h.schemes.get('https')(request.uris[0],request,1,()=>{},()=>{},{}).promise,e=>e.severity===2&&e.code===1002);assert.equal(fetched,0);
});
test('matching 206 ranges accept exact bytes and reject mismatches before incremental parsing',async()=>{
  for(const contentRange of ['bytes 4-8/12','bytes 3-7/12','bytes 4-8/*','bytes 4-9/12']){
    let delivered=0;const h=harness({},async()=>new Response('bytes',{status:206,headers:{'Content-Range':contentRange}}));
    try{const operation=h.request(undefined,{headers:{Range:'bytes=4-8'},streamDataCallback:async()=>delivered++});if(contentRange==='bytes 4-8/12'){assert.equal(new TextDecoder().decode((await operation.promise).data),'bytes');assert.equal(delivered,1);}else{await assert.rejects(operation.promise);assert.equal(h.policy.terminalError.code,'SOURCE_CHANGED');assert.equal(delivered,0);}}finally{h.policy.destroy();}
  }
});
test('range resources cannot change length or use compressed byte offsets',async()=>{
  for(const encoded of [false,true]){let count=0;const h=harness({},async()=>new Response('bytes',{status:206,headers:{'Content-Range':`bytes 4-8/${++count===1?12:13}`,...(encoded?{'Content-Encoding':'gzip'}:{})}}));
    try{if(!encoded)await h.request(undefined,{headers:{Range:'bytes=4-8'}}).promise;await assert.rejects(h.request(undefined,{headers:{Range:'bytes=4-8'}}).promise);assert.equal(h.policy.terminalError.code,'SOURCE_CHANGED');}finally{h.policy.destroy();}}
});
test('retirement before a retry filter prevents the selected scheme plugin from running',async()=>{
  let fetches=0,pluginCalls=0;const h=harness({},async()=>{fetches++;return new Response('ok');});
  const request={uris:['https://media.test/media.m4s'],headers:{},method:'GET',body:null,retryParameters:{timeout:1000}};
  // NetworkingEngine chooses the scheme plugin before awaiting filters, but
  // invokes it only in the successful filter/backoff continuation.
  const selected=h.schemes.get('https');
  const attempt=()=>Promise.resolve().then(()=>h.policy.filter(1,request)).then(()=>{pluginCalls++;return selected(request.uris[0],request,1,()=>{},()=>{},{}).promise;});
  await attempt();h.policy.destroy();await assert.rejects(attempt(),e=>e.code==='ABORTED');assert.equal(pluginCalls,1);assert.equal(fetches,1);
});
