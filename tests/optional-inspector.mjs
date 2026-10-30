// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inspectMedia} from '../web/generated/sources.js';
const result=()=>({id:'optional',sourceIdentity:'provider-claimed',status:'partial',completeFor:['container'],format:'test',duration:null,tracks:null,chapters:null,tags:null,reason:'partial',bytesRead:999,reads:999});
const options=inspector=>({assetBase:'https://inspection.test/',maxBytes:64,maxReads:2,timeoutMs:1000,inspector});
test('optional inspector borrows owned bytes and cannot replace source identity or accounting',async()=>{
 const data=new Uint8Array(128).fill(7);let closed=0,lease;
 const source={kind:'bytes',transport:'application-managed',id:'owner',size:data.length,ownership:'owned',read:async(at,n)=>data.subarray(at,at+n),close(){closed++;}};
 const inspection=await inspectMedia(source,options(async(reader,budget)=>{
  lease=reader;assert.equal(reader.ownership,'borrowed');assert.equal(reader.close,undefined);assert.equal(budget.maxBytes,64);assert.equal(budget.maxReads,2);
  const bytes=await reader.read(0,64);data.fill(9);assert.equal(bytes[0],7);return result();
 }));
 assert.equal(closed,1);assert.equal(inspection.sourceIdentity,'owner');assert.equal(inspection.bytesRead,64);assert.equal(inspection.reads,1);assert.equal(inspection.status,'partial');assert.ok(Object.isFrozen(inspection));
 await assert.rejects(lease.read(0,1),error=>error.code==='ABORTED');
});
test('optional inspector keeps borrowed source ownership and enforces its real byte budget',async()=>{
 let closed=0,reads=0;
 const source={kind:'bytes',transport:'application-managed',id:'borrowed',size:128,ownership:'borrowed',read:async(_at,n)=>{reads++;return new Uint8Array(n);},close(){closed++;}};
 await assert.rejects(inspectMedia(source,options(async reader=>{await reader.read(0,64);await reader.read(64,1);return result();})),/byte budget/i);
 assert.equal(reads,1);assert.equal(closed,0);
});
test('optional parser cannot conceal a failed source read as partial metadata',async()=>{
 const failure=new Error('authorization expired');let closed=0;
 const source={kind:'bytes',transport:'application-managed',id:'denied',size:128,ownership:'owned',read:async()=>{throw failure;},close(){closed++;}};
 await assert.rejects(inspectMedia(source,options(async reader=>{try{await reader.read(0,1);}catch{}return result();})),error=>error.message.includes(failure.message));
 assert.equal(closed,1);
});
test('caller cancellation retires the optional lease before an ignored late read completes',async()=>{
 let began,late,closed=0;const started=new Promise(resolve=>{began=resolve;}),controller=new AbortController();
 const source={kind:'bytes',transport:'application-managed',id:'late',size:128,ownership:'owned',read:async(_at,n)=>{began();return new Promise(resolve=>{late=()=>resolve(new Uint8Array(n));});},close(){closed++;}};
 const pending=inspectMedia(source,{...options(async reader=>{await reader.read(0,64);return result();}),signal:controller.signal});
 await started;controller.abort();await assert.rejects(pending,error=>error.code==='ABORTED');assert.equal(closed,1);late();
});

test('optional inspection preserves falsy inspector rejections',async()=>{
 const source={kind:'bytes',transport:'application-managed',id:'input',size:128,read:async(_at,n)=>new Uint8Array(n)};
 for(const reason of [undefined,null,false,0,'']) {
  let rejected=false,caught;
  try{await inspectMedia(source,options(async()=>{throw reason;}));}catch(error){rejected=true;caught=error;}
  assert.equal(rejected,true,`Expected rejection for ${String(reason)}`);assert.equal(caught,reason);
 }
});
test('owned inspection cleanup cannot replace the source failure',async()=>{
 const source={kind:'bytes',transport:'application-managed',id:'input',size:128,ownership:'owned',read:async()=>{throw new Error('source permission denied');},close(){throw new Error('close failed');}};
 await assert.rejects(inspectMedia(source,options(async reader=>{await reader.read(0,1);return result();})),error=>error.code==='SOURCE_PERMISSION'&&error.message.includes('source permission denied'));
});
test('owned inspection cleanup failure remains visible after a successful inspection',async()=>{
 const failure=new Error('close failed');const source={kind:'bytes',transport:'application-managed',id:'input',size:128,ownership:'owned',read:async(_at,n)=>new Uint8Array(n),close(){throw failure;}};
 await assert.rejects(inspectMedia(source,options(async()=>result())),error=>error===failure);
});

test('inspection cancellation is preserved if owned close also fails',async()=>{
 const controller=new AbortController();let start;const started=new Promise(resolve=>{start=resolve;});
 const source={kind:'bytes',transport:'application-managed',id:'input',size:128,ownership:'owned',read:async()=>new Promise(()=>{}),close(){throw new Error('close failed');}};
 const pending=inspectMedia(source,{...options(async reader=>{start();await reader.read(0,1);return result();}),signal:controller.signal});
 await started;controller.abort();await assert.rejects(pending,error=>error.code==='ABORTED');
});
test('owned close rejection with an undefined reason remains a rejection',async()=>{
 const source={kind:'bytes',transport:'application-managed',id:'input',size:128,ownership:'owned',read:async(_at,n)=>new Uint8Array(n),close(){return Promise.reject(undefined);}};
 let rejected=false,caught;try{await inspectMedia(source,options(async()=>result()));}catch(error){rejected=true;caught=error;}
 assert.equal(rejected,true);assert.equal(caught,undefined);
});
