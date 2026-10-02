// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/external-video-decoder.js';
import {WebCodecsVideoDecoder} from '../../web/external-video-decoder.js';

test('pure configuration reserves a successor before retiring the previous physical handle',()=>{
 const initial=core.initialExternalDecoder(),first=core.beginExternalDecoderConfiguration(initial),ready=core.acceptExternalDecoderConfiguration(first.state,first.lease),next=core.beginExternalDecoderConfiguration(ready);
 assert.equal(initial.current,null);assert.equal(first.state.current.phase,'acquiring');assert.equal(ready.current.phase,'configured');assert.equal(next.close,first.lease.id);assert.equal(core.externalDecoderCurrent(next.state,first.lease),false);
 assert.equal(core.acceptExternalDecoderConfiguration(next.state,first.lease),next.state);assert.equal(core.retireExternalDecoder(next.state,first.lease).state,next.state);
 assert.equal(core.externalDecoderCurrent(next.state,next.lease),true);assert.ok(Object.isFrozen(next.state.current));
});
test('pure submission preserves8-packet bound and rejects observations captured from retired handles',()=>{
 const active=core.beginExternalDecoderConfiguration(core.initialExternalDecoder());
 assert.equal(core.externalDecoderSubmission(active.state,active.lease,{present:true,closed:false,queued:7}),'submit');assert.equal(core.externalDecoderSubmission(active.state,active.lease,{present:true,closed:false,queued:8}),'again');
 const retired=core.retireExternalDecoder(active.state).state;assert.equal(core.externalDecoderSubmission(retired,active.lease,{present:true,closed:false,queued:0}),'closed');assert.equal(core.externalDecoderSubmission(active.state,active.lease,{present:true,closed:true,queued:0}),'closed');
});
test('varied configure failure destroy and callback histories never restore a retired lease',()=>{
 let state=core.initialExternalDecoder();const retired=[];
 for(let i=0;i<100;i++){
  const next=core.beginExternalDecoderConfiguration(state);state=next.state;
  for(const old of retired){assert.equal(core.externalDecoderCurrent(state,old),false);assert.equal(core.acceptExternalDecoderConfiguration(state,old),state);}
  if(i%3===0){state=core.retireExternalDecoder(state,next.lease).state;assert.equal(state.current,null);}else state=core.acceptExternalDecoderConfiguration(state,next.lease);
  retired.push(next.lease);
 }
 assert.equal(state.serial,100);assert.ok(state.generation>=200);assert.equal(new Set(retired.map(lease=>lease.id)).size,100);
});

function fixture(hooks={}){
 const raw=[],outputs=[],errors=[],dequeues=[];
 class Decoder{
  constructor(callbacks){this.callbacks=callbacks;this.listeners=new Map();this.decodeQueueSize=0;this.state='unconfigured';this.closes=0;this.configurations=[];this.packets=[];raw.push(this);hooks.construct?.(this);}
  addEventListener(name,fn){this.listeners.set(name,fn);hooks.listen?.(this);}
  configure(config){this.configurations.push(config);this.state='configured';hooks.configure?.(this,config);}
  decode(packet){this.packets.push(packet);this.decodeQueueSize++;hooks.decode?.(this);}
  flush(){return hooks.flush?.(this)??Promise.resolve();}
  close(){this.closes++;this.state='closed';hooks.close?.(this);}
 }
 const wrapper=new WebCodecsVideoDecoder({Decoder,output:value=>outputs.push(value),error:error=>errors.push(error),dequeue:()=>dequeues.push(true)});
 return {wrapper,raw,outputs,errors,dequeues,hooks};
}
const frame=()=>({closed:0,close(){this.closed++;}});
test('actual destroy detaches the old handle before close synchronously configures its successor',()=>{
 const f=fixture();f.wrapper.configure({codec:'old'});const old=f.raw[0];let once=true;f.hooks.close=()=>{if(once){once=false;f.wrapper.configure({codec:'next'});}};
 f.wrapper.destroy();assert.equal(old.closes,1);assert.equal(f.wrapper.decoder,f.raw[1]);assert.equal(f.wrapper.decoder.state,'configured');assert.equal(f.wrapper.handles.size,1);f.wrapper.destroy();assert.equal(f.raw[1].closes,1);
});
test('actual predecessor close reentry retires the outer configuration without erasing successor',()=>{
 const f=fixture();f.wrapper.configure({codec:'old'});let once=true;f.hooks.close=()=>{if(once){once=false;f.wrapper.configure({codec:'inner'});}};
 assert.throws(()=>f.wrapper.configure({codec:'outer'}),/retired/);assert.equal(f.raw.length,2);assert.equal(f.wrapper.decoder,f.raw[1]);assert.equal(f.raw[1].configurations[0].codec,'inner');assert.equal(f.raw[1].closes,0);f.wrapper.destroy();
});
test('actual constructor acquired after destroy closes once and never registers or configures',()=>{
 const f=fixture();f.hooks.construct=()=>f.wrapper.destroy();assert.throws(()=>f.wrapper.configure({codec:'old'}),/retired/);assert.equal(f.raw[0].closes,1);assert.equal(f.raw[0].listeners.size,0);assert.equal(f.raw[0].configurations.length,0);assert.equal(f.wrapper.decoder,null);assert.equal(f.wrapper.handles.size,0);
});
test('actual event registration failure closes the acquired browser decoder',()=>{
 const f=fixture({listen(){throw Error('listener registration failed');}});assert.throws(()=>f.wrapper.configure({codec:'vp9'}),/listener registration failed/);assert.equal(f.raw[0].closes,1);assert.equal(f.raw[0].configurations.length,0);assert.equal(f.wrapper.handles.size,0);assert.equal(f.wrapper.machine.current,null);
});
test('actual event registration retirement prevents configure from touching the closed decoder',()=>{
 const f=fixture();f.hooks.listen=()=>f.wrapper.destroy();assert.throws(()=>f.wrapper.configure({codec:'vp9'}),/retired/);assert.equal(f.raw[0].closes,1);assert.equal(f.raw[0].configurations.length,0);assert.equal(f.wrapper.decoder,null);
});
test('actual failed configure cannot destroy a successor installed by its browser callback',()=>{
 const f=fixture();let once=true;f.hooks.configure=()=>{if(once){once=false;f.wrapper.configure({codec:'successor'});throw Error('old configure failed');}};
 assert.throws(()=>f.wrapper.configure({codec:'old'}),/old configure failed/);assert.equal(f.raw[0].closes,1);assert.equal(f.raw[1].closes,0);assert.equal(f.wrapper.decoder,f.raw[1]);assert.equal(f.wrapper.decoder.configurations[0].codec,'successor');f.wrapper.destroy();
});
test('actual reset fences late output error and dequeue callbacks while closing stale frames',()=>{
 const f=fixture();f.wrapper.configure({codec:'old'});const old=f.raw[0];f.wrapper.reset();f.wrapper.configure({codec:'next'});const stale=frame(),current=frame();old.callbacks.output(stale);old.callbacks.error(Error('stale'));old.listeners.get('dequeue')();f.raw[1].callbacks.output(current);f.raw[1].listeners.get('dequeue')();assert.equal(stale.closed,1);assert.deepEqual(f.outputs,[current]);assert.deepEqual(f.errors,[]);assert.equal(f.dequeues.length,1);f.wrapper.destroy();current.close();
});
test('actual submission queue getter retirement cannot send a packet through the old handle',()=>{
 const f=fixture();f.wrapper.configure({codec:'old'});const old=f.raw[0];let once=true;Object.defineProperty(old,'decodeQueueSize',{get(){if(once){once=false;f.wrapper.configure({codec:'next'});}return 0;}});
 assert.throws(()=>f.wrapper.submit({}),/closed/);assert.equal(old.packets.length,0);assert.equal(f.raw[1].packets.length,0);assert.equal(f.wrapper.decoder,f.raw[1]);f.wrapper.destroy();
});
for(const method of ['decode','flush'])test('actual '+method+' method acquisition retirement prevents an obsolete browser call',()=>{
 const f=fixture();f.wrapper.configure({codec:'old'});const old=f.raw[0];let calls=0;Object.defineProperty(old,method,{get(){f.wrapper.destroy();return()=>{calls++;return Promise.resolve();};}});
 assert.throws(()=>method==='decode'?f.wrapper.submit({}):f.wrapper.drain(),/closed/);assert.equal(calls,0);assert.equal(old.closes,1);
});
test('actual drain preserves browser promise identity and submission preserves sync failures',async()=>{
 let resolve;const pending=new Promise(yes=>resolve=yes),f=fixture({flush:()=>pending});assert.throws(()=>f.wrapper.submit({}),/closed/);assert.throws(()=>f.wrapper.drain(),/closed/);f.wrapper.configure({codec:'vp9'});
 for(let i=0;i<8;i++)assert.equal(f.wrapper.submit({id:i}),true);assert.equal(f.wrapper.submit({}),false);assert.equal(f.wrapper.drain(),pending);f.wrapper.destroy();resolve();await pending;assert.equal(f.wrapper.decoder,null);
});
test('actual cleanup throw leaves logical ownership retired and permits a later configure',()=>{
 const f=fixture();f.wrapper.configure({codec:'old'});f.hooks.close=()=>{throw Error('close failed');};assert.throws(()=>f.wrapper.destroy(),/close failed/);assert.equal(f.wrapper.decoder,null);assert.equal(f.wrapper.handles.size,0);assert.equal(f.wrapper.machine.current,null);f.hooks.close=undefined;f.wrapper.configure({codec:'next'});assert.equal(f.wrapper.decoder.state,'configured');f.wrapper.destroy();
});
