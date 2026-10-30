// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openPreparationSource,remotePreparationSize,snapshotPreparationSource,samePreparationSource} from '../../../web/generated/internal/preparation-source.js';
const base=new URL('../../../',import.meta.url);
const source={url:'https://media.test/file',format:'file',identity:{size:'200000',etag:'"v1"'}};
const data=Uint8Array.from({length:200000},(_,i)=>i%251);
function response(init,etag='"v1"'){
  const range=/bytes=(\d+)-(\d+)/.exec(new Headers(init.headers).get('Range'));
  const start=Number(range[1]),end=Math.min(Number(range[2]),data.length-1);
  return new Response(data.slice(start,end+1),{status:206,headers:{'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':String(end-start+1),ETag:etag}});
}
function location(t){const old=Object.getOwnPropertyDescriptor(globalThis,'location');Object.defineProperty(globalThis,'location',{configurable:true,value:{href:'https://app.test/'}});t.after(()=>{if(old)Object.defineProperty(globalThis,'location',old);else delete globalThis.location;});}

test('remote envelope excludes unknown identity, unbounded files and adaptive sources',()=>{
  assert.equal(remotePreparationSize(source),200000);
  for(const options of [{identity:undefined},{identity:{size:'33',etag:'W/"v1"'}},{identity:{size:'33554433',etag:'"v1"'}},{format:'hls'},{streaming:{}},{demuxer:'custom'}])assert.equal(remotePreparationSize({...source,...options}),undefined);
});
test('admission snapshots detect URL, identity and authorization policy changes',()=>{
  const current={...source,identity:{...source.identity},headers:{Authorization:'old'},allowedOrigins:['https://media.test']};
  const snapshot=snapshotPreparationSource(current);
  assert.ok(samePreparationSource(current,snapshot));
  current.headers.Authorization='new';assert.equal(samePreparationSource(current,snapshot),false);
  assert.equal(snapshot.headers.Authorization,'old');
  assert.equal(samePreparationSource(snapshot,{...snapshot,url:'https://other.test/file'}),false);
  assert.equal(samePreparationSource(snapshot,{...snapshot,identity:{...snapshot.identity,etag:'"v2"'}}),false);
});
test('remote preparation serializes concurrent A/V reads, crosses blocks and owns result buffers',async t=>{
  location(t);let requests=0;
  t.mock.method(globalThis,'fetch',async(_url,init)=>{requests++;assert.equal(new Headers(init.headers).get('If-Range'),'"v1"');return response(init);});
  const reader=await openPreparationSource(source,base,new AbortController().signal);
  try{
    assert.deepEqual(await reader.read(65530,100),data.slice(65530,65630));
    const [a,b]=await Promise.all([reader.read(131000,1000),reader.read(0,32)]);
    assert.deepEqual(a,data.slice(131000,132000));assert.deepEqual(b,data.slice(0,32));
    b.fill(255);assert.deepEqual(await reader.read(0,32),data.slice(0,32));
    assert.equal(a.buffer.byteLength,1000);assert.equal(a.byteOffset,0);assert.equal(requests,3);
  }finally{reader.close();}
  await assert.rejects(reader.read(0,1),{name:'AbortError'});
});
test('remote identity change is terminal instead of a successful short read',async t=>{
  location(t);let calls=0;
  t.mock.method(globalThis,'fetch',async(_url,init)=>response(init,++calls===1?'"v1"':'"v2"'));
  const reader=await openPreparationSource(source,base,new AbortController().signal);
  try{
    const outcomes=await Promise.allSettled([reader.read(65536,32),reader.read(131072,32)]);
    assert.equal(outcomes[0].status,'rejected');assert.match(outcomes[0].reason.message,/representation changed/);
    assert.equal(outcomes[1].status,'rejected');assert.equal(outcomes[1].reason.name,'AbortError');
    assert.equal(calls,2,'queued work cannot start transport after the source fails');
  }finally{reader.close();}
});
test('authorization refresh stays with the existing range transport',async t=>{
  location(t);let refreshes=0;
  t.mock.method(globalThis,'fetch',async(_url,init)=>new Headers(init.headers).get('Authorization')==='new'?response(init):new Response('denied',{status:401}));
  const reader=await openPreparationSource({...source,headers:{Authorization:'old'},refreshAuthorization:async()=>{refreshes++;return {headers:{Authorization:'new'}};}},base,new AbortController().signal);
  try{assert.deepEqual(await reader.read(0,32),data.slice(0,32));assert.equal(refreshes,1);}finally{reader.close();}
});
test('cancellation retires an ignored transport operation and prevents late byte publication',async t=>{
  location(t);let calls=0,release,waiting;
  const started=new Promise(resolve=>{waiting=resolve;});
  t.mock.method(globalThis,'fetch',async(_url,init)=>{if(++calls===1)return response(init);waiting();return new Promise(resolve=>{release=()=>resolve(response(init));});});
  const controller=new AbortController(),reader=await openPreparationSource(source,base,controller.signal);
  const pending=reader.read(65536,16),rejected=assert.rejects(pending,{name:'AbortError'});
  await started;controller.abort();
  try{await rejected;await assert.rejects(reader.read(0,1),{name:'AbortError'});}finally{release();reader.close();}
});
test('stream policy mutation interrupts a multi-block read before subsequent transport',async t=>{
  location(t);let calls=0,changed=false;
  const reason=Object.assign(Error('Source policy changed'),{code:'SOURCE_CHANGED'});
  t.mock.method(globalThis,'fetch',async(_url,init)=>{if(++calls===2)changed=true;return response(init);});
  const reader=await openPreparationSource(source,base,new AbortController().signal,{maxBytes:64*1024*1024,validate:()=>{if(changed)throw reason;}});
  try{
    await assert.rejects(reader.read(65530,131100),error=>error===reason);
    assert.equal(calls,2,'a third HTTP block must not start after policy mutation');
    await assert.rejects(reader.read(0,1),{name:'AbortError'});
  }finally{reader.close();}
});
