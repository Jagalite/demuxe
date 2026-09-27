// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {portReader,privateRemux} from '../web/private-remux.js';

test('private source transfers the requested bytes without shared memory',async()=>{
 const {port1,port2}=new MessageChannel(),reader=portReader(port1,100);
 try{
  port2.onmessage=({data})=>{assert.deepEqual(data,{type:'read',id:1,offset:20,count:3});const b=new Uint8Array([1,2,3]).buffer;port2.postMessage({id:1,buffer:b},[b]);};
  assert.deepEqual(await reader.read(20,3,new AbortController().signal),new Uint8Array([1,2,3]));
 }finally{reader.close();port2.close();}
});
test('close cancels an observed pending read and prevents reuse',async()=>{
 const {port1,port2}=new MessageChannel(),reader=portReader(port1,100),controller=new AbortController();
 try{
  const observed=new Promise(resolve=>port2.onmessage=resolve);
  const read=reader.read(0,5,controller.signal);const rejected=assert.rejects(read,{name:'AbortError'});
  await observed;controller.abort();await rejected;
  await assert.rejects(reader.read(0,5,new AbortController().signal),{name:'AbortError'});
  port2.postMessage({id:1,buffer:new Uint8Array(5).buffer});
 }finally{reader.close();port2.close();}
});
test('overlapping reads are rejected while the first result remains valid',async()=>{
 const {port1,port2}=new MessageChannel(),reader=portReader(port1,100),signal=new AbortController().signal;
 try{
  const observed=new Promise(resolve=>port2.onmessage=resolve),first=reader.read(0,1,signal);
  await observed;await assert.rejects(reader.read(1,1,signal),/Concurrent/);
  port2.postMessage({id:1,buffer:new Uint8Array([9]).buffer});assert.equal((await first)[0],9);
 }finally{reader.close();port2.close();}
});
test('malformed responses poison the reader instead of writing oversized bytes',async()=>{
 for(const response of [null,42,{id:99,buffer:new ArrayBuffer(1)},{id:1,buffer:new ArrayBuffer(6)},{id:1,buffer:3}]){
  const {port1,port2}=new MessageChannel(),reader=portReader(port1,100),signal=new AbortController().signal;
  try{port2.onmessage=()=>port2.postMessage(response);await assert.rejects(reader.read(0,5,signal),/Unexpected|Invalid/);await assert.rejects(reader.read(0,5,signal),/cancelled/);}
  finally{reader.close();port2.close();}
 }
});
test('source errors retain their cause and invalid runtimes do not load assets',async()=>{
 const {port1,port2}=new MessageChannel(),reader=portReader(port1,100);
 try{port2.onmessage=()=>port2.postMessage({id:1,error:'Expected HTTP 206; received 401'});await assert.rejects(reader.read(0,5,new AbortController().signal),/401/);await assert.rejects(reader.read(0,5,new AbortController().signal),/cancelled/);}
 finally{reader.close();port2.close();}
 await assert.rejects(privateRemux('unknown',{}),/Invalid private remux runtime/);
});
