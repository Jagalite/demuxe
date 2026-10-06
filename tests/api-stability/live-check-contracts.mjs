// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assertExactBytes,collectFailureDiagnostics,liveEvidenceInputs,validLiveReceipt} from './live-check-helpers.mjs';

test('a stalled page cannot prevent diagnostics from returning to cleanup', {timeout:1000},async()=>{
 const calls=[];
 const page={evaluate(){calls.push('trace');return new Promise(()=>{});},screenshot(){calls.push('screenshot');return new Promise(()=>{});}};
 const result=await collectFailureDiagnostics(page,'unused.png',10);
 calls.push('cleanup');
 assert.deepEqual(calls,['trace','screenshot','cleanup']);
 assert.equal(result.trace,null);
 assert.equal(result.diagnosticErrors.length,2);
});
test('diagnostics tolerate closed pages and preserve available traces',async()=>{
 const closed={evaluate(){throw Error('closed');},screenshot(){return Promise.reject(Error('closed'));}};
 assert.equal((await collectFailureDiagnostics(closed,'unused.png',10)).diagnosticErrors.length,2);
 const trace=[{kind:'started'}];
 assert.deepEqual(await collectFailureDiagnostics({evaluate:async()=>trace,screenshot:async()=>{}},'unused.png',10),{trace,diagnosticErrors:[]});
});
test('range assertions reject empty, short, oversized and corrupt reads',()=>{
 const expected=Uint8Array.from({length:16},(_,i)=>i);
 for(const actual of [new Uint8Array(),expected.slice(0,1),expected.slice(0,15),new Uint8Array(17),expected.map(v=>v+1)])assert.throws(()=>assertExactBytes(actual,expected,16,'wrong bytes'),/wrong bytes/);
 assertExactBytes(expected.slice(),expected,16,'wrong bytes');
});
const receipt=()=>({passed:true,negativeControl:false,family:'chromium',browser:'145',revision:'a'.repeat(40),checks:[{scenario:'example',passed:true,errors:[]}],hashes:Object.fromEntries(liveEvidenceInputs.map(path=>[path,'b'.repeat(64)])),servedHashes:Object.fromEntries(liveEvidenceInputs.filter(path=>path.startsWith('web/')).map(path=>[path,'b'.repeat(64)]))});
test('only complete successful receipts can be used for input matching',()=>{
 assert.equal(validLiveReceipt(receipt()),true);
 const mutations=[
  r=>delete r.hashes,r=>r.hashes={},r=>delete r.hashes[liveEvidenceInputs[0]],
  r=>r.hashes[liveEvidenceInputs[0]]='invalid',r=>r.servedHashes={},
  r=>delete r.browser,r=>delete r.revision,r=>r.family='unknown',
  r=>r.negativeControl=true,r=>r.passed=false,r=>r.passed='true',
  r=>delete r.checks,r=>r.checks=[],r=>r.checks[0].passed=false,
  r=>r.checks[0].errors=['Page crashed'],r=>r.checks.push({...r.checks[0]})
 ];
 for(const mutate of mutations){const r=receipt();mutate(r);assert.equal(validLiveReceipt(r),false,String(mutate));}
});
