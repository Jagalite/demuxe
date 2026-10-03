// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import * as policy from '../../web/generated/internal/machine/metadata-budget.js';
test('read and byte reservations charge before asynchronous read effects',()=>{
 const initial=policy.initialMetadataBudget(),first=policy.admitMetadataTransfer(initial,1,300000,0);assert.equal(initial.reads,0);assert.equal(first.reservedBytes,300000);assert.equal(policy.admitMetadataTransfer(first,1,300000,0),first);assert.equal(policy.admitMetadataTransfer(first,8,1,0),first);assert.equal(policy.recordMetadataBytes(first,300001),first);
});
test('parse clock excludes concurrent I/O and resumes only after final batch',()=>{
 let state=policy.admitMetadataTransfer(policy.initialMetadataBudget(),1,1,0);state=policy.admitMetadataTransfer(state,1,1,100);state=policy.finishMetadataTransfer(state,1000);assert.equal(policy.metadataParseMs(state,5000),0);state=policy.finishMetadataTransfer(state,5000);assert.equal(policy.metadataParseAvailable(state,5049),true);assert.equal(policy.metadataParseAvailable(state,5050),false);assert.equal(policy.admitMetadataTransfer(state,1,1,5050),state);
});
test('actual metadata shell refuses overlapping byte budget before second read',async()=>{
 const text=await readFile(process.env.METADATA_SOURCE??new URL('../../web/fast-source-inspector.js',import.meta.url),'utf8');const source=text.slice(text.indexOf('class Source {'),text.indexOf('\nfunction eachBox'));
 const context=vm.createContext({...policy,MAX_SCAN_MS:50,MAX_READS:8,MAX_BYTES:512*1024,MAX_META:1024*1024,READ_AHEAD:65536,IO_TIMEOUT_MS:3000,FAST_PROBE_BUDGET:{batches:8,concurrentReads:8},Unknown:Error,unknown:reason=>{throw Error(reason);},performance:{now:()=>0},AbortController,DOMException,Uint8Array,Blob,setTimeout,clearTimeout});vm.runInContext(source+'\nglobalThis.SourceClass=Source;',context);
 let calls=0;const file={size:1000000,slice(at,end){return {arrayBuffer:async()=>{calls++;return new ArrayBuffer(end-at);}};}};const reader=new context.SourceClass(file);
 const work=[reader.transfer([{at:0,n:300000}]),reader.transfer([{at:300000,n:300000}])];const result=await Promise.allSettled(work);assert.equal(result[0].status,'fulfilled');assert.equal(result[1].status,'rejected');assert.match(result[1].reason.message,/Metadata read budget/);assert.equal(calls,1);
});
