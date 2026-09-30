// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {embeddedRuntime,embeddedElements} from '../packages/bundler/embedded-runtime.mjs';
test('element registrations select live owners, fall back on disposal and reject foreign definitions',()=>{
 const original=globalThis.customElements,definitions=new Map();
 globalThis.customElements={get:name=>definitions.get(name),define:(name,constructor)=>definitions.set(name,constructor)};
 const key='demuxe-test-'+Date.now(),base='https://demuxe.invalid/'+key+'/';
 const runtime=id=>{const r=embeddedRuntime({},base,key+id,'unused');r.api={Player:class {constructor(container,options){this.owner=id;this.options=options;}}};return r;};
 const a=runtime('a'),b=runtime('b');
 try{
  const player={DemuxePlayerElement:class {}};
  const A=embeddedElements(a,player,key)('demuxe-test'),B=embeddedElements(b,player,key)('demuxe-test');
  assert.equal(A,B);const element=new A();
  assert.equal(a.createElementPlayer(element,null,null,{}).owner,'b');
  b.dispose();assert.equal(a.createElementPlayer(element,null,null,{}).owner,'a');
  a.dispose();assert.throws(()=>a.createElementPlayer(element,null,null,{}),/live embedded/);
  const c=runtime('c');try{
   assert.equal(embeddedElements(c,player,key)('demuxe-test'),A);
   const p=a.createElementPlayer(element,null,null,{});assert.equal(p.owner,'c');assert.equal(p.options.assetBase,base);
   definitions.set('foreign',class {});assert.throws(()=>embeddedElements(c,player,key)('foreign'),/another implementation/);
   c.dispose();assert.throws(()=>embeddedElements(c,player,key)('demuxe-test'),/disposed/);
  }finally{c.dispose();}
 }finally{a.dispose();b.dispose();delete globalThis[Symbol.for(key+'.elements')];if(original===undefined)delete globalThis.customElements;else globalThis.customElements=original;}
});
