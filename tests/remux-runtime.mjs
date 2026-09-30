// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectRemuxRuntime,deployedRemuxRuntime} from '../web/generated/internal/remux-runtime.js';
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

test('modular auto runtime selection filters qualified deployed implementations only',()=>{
 const choose=(policy,isolated,available)=>deployedRemuxRuntime(selectRemuxRuntime({remuxRuntime:policy},{isolated,jspi:true}),r=>available.includes(r)).runtime;
 assert.equal(choose('auto',false,['asyncify']),'asyncify');
 assert.equal(choose('auto',true,['jspi','asyncify']),'jspi');
 assert.equal(choose('auto',true,['pthread','jspi']),'pthread');
 assert.equal(choose('on',true,['pthread','asyncify']),'asyncify');
 assert.equal(choose('jspi',false,['asyncify']),'jspi');
 assert.equal(choose('off',true,['asyncify']),'pthread');
 assert.equal(choose('auto',false,[]),'jspi');
});
