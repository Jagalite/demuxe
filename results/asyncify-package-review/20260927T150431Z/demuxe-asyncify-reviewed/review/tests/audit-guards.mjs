// SPDX-License-Identifier: MIT
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {audit} from '../../scripts/audit-wasm.mjs';
const raw=fs.readFileSync(new URL('../../artifacts/continuation-probe.wasm',import.meta.url));
const transformed=fs.readFileSync(new URL('../../artifacts/continuation-probe.asyncify.wasm',import.meta.url));
const tests=[];
function test(name,fn){try{fn();tests.push({name,ok:true});}catch(e){tests.push({name,ok:false,error:String(e)});}}
test('private-raw-module-accepted',()=>assert.equal(audit(raw).privateMemory,true));
test('transformed-module-accepted',()=>assert.equal(audit(transformed,{asyncify:true}).privateMemory,true));
test('uninstrumented-Asyncify-rejected',()=>assert.throws(()=>audit(raw,{asyncify:true}),/Uninstrumented/));
test('wrong-JSPI-artifact-rejected',()=>assert.throws(()=>audit(transformed),/Unexpected Asyncify/));
test('embedded-shared-memory-rejected',()=>{
 const bytes=Uint8Array.from([0,97,115,109,1,0,0,0,5,4,1,3,1,1]);
 assert.equal(WebAssembly.validate(bytes),true);
 assert.throws(()=>audit(bytes,{raw:false}),/Shared/);
});
test('malformed-wasm-rejected',()=>assert.throws(()=>audit(new Uint8Array(3)),/Invalid/));
test('missing-memory-rejected',()=>assert.throws(()=>audit(Uint8Array.from([0,97,115,109,1,0,0,0]),{raw:false}),/No private/));
const record={scope:'Static WebAssembly binary/ABI audit, not instantiation or media',tests,total:tests.length,passed:tests.filter(t=>t.ok).length};
console.log(JSON.stringify(record,null,2));if(record.total!==record.passed)process.exitCode=1;
