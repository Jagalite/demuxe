// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectRemuxRuntime} from '../web/generated/internal/remux-runtime.js';
for(const isolated of [false,true])for(const jspi of [false,true]){
 const caps={isolated,jspi};
 test(`runtime selection: isolated=${isolated}, JSPI=${jspi}`,()=>{
  const select=policy=>selectRemuxRuntime(policy===undefined?{}:{remuxRuntime:policy},caps).runtime;
  assert.equal(select(),isolated?'pthread':jspi?'jspi':'asyncify');
  assert.equal(select('auto'),select());
  assert.equal(select('off'),'pthread');
  assert.equal(select('on'),jspi?'jspi':'asyncify');
  assert.equal(select('asyncify'),'asyncify');
  if(jspi)assert.equal(select('jspi'),'jspi');
  else assert.throws(()=>select('jspi'),{code:'UNSUPPORTED_FEATURE'});
 });
}
test('legacy options remain explicit and ambiguous/invalid settings fail',()=>{
 const caps={isolated:false,jspi:true};
 for(const runtime of ['pthread','jspi','asyncify'])assert.equal(selectRemuxRuntime({experimentalRemuxRuntime:runtime},caps).runtime,runtime);
 for(const value of ['pthread','asyctify','',true,false,1,null])assert.throws(()=>selectRemuxRuntime({remuxRuntime:value},caps),{code:'INVALID_ARGUMENT'});
 assert.throws(()=>selectRemuxRuntime({remuxRuntime:'auto',experimentalRemuxRuntime:'jspi'},caps),{code:'INVALID_ARGUMENT'});
 assert.throws(()=>selectRemuxRuntime({experimentalRemuxRuntime:'auto'},caps),{code:'INVALID_ARGUMENT'});
});
