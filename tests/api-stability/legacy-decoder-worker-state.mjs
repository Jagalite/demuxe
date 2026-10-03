// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
import * as policy from '../../web/generated/internal/machine/legacy-decoder-worker.js';
const {initialLegacyDecoderWorker:initial,reduceLegacyDecoderWorker:reduce}=policy;
const initialized=()=>reduce(initial(),{type:'init',disabled:false,watchdog:true,faultAfter:0});
test('single native work receipt survives reset until physical async settlement',()=>{
 const first=policy.admitLegacyDecoderWork(initialized(),1);assert.equal(first.id,1);const reset=reduce(first.state,{type:'reset'});assert.equal(policy.admitLegacyDecoderWork(reset,5).id,null);assert.equal(policy.finishLegacyDecoderWork(reset,99),reset);assert.equal(policy.admitLegacyDecoderWork(policy.finishLegacyDecoderWork(reset,1),5).id,2);
});
test('frame receipts retain32 capacity and reject stale output without affecting successor',()=>{
 let state=reduce(initialized(),{type:'reset'});const old=state;for(let i=0;i<32;i++)state=policy.admitLegacyDecoderFrame(state,1).state;assert.equal(old.frames.length,0);assert.equal(policy.admitLegacyDecoderFrame(state,1).overflow,true);const next=reduce(state,{type:'reset'});assert.equal(policy.admitLegacyDecoderFrame(next,1).id,null);assert.equal(policy.admitLegacyDecoderFrame(next,2).id,33);
});
test('cancel is terminal, generation exhaustion cannot alias callbacks, drain only admits once',()=>{
 let state=initialized();state=reduce(state,{type:'drain'});assert.equal(reduce(state,{type:'drain'}),state);assert.equal(reduce(reduce(state,{type:'cancel'}),{type:'init',disabled:false,watchdog:true,faultAfter:0}).closed,true);assert.equal(reduce({...state,generation:0x7fffffff},{type:'reset'}).closed,true);
});
test('output watchdog charges only actual blocked receive and pause resets evidence',()=>{
 let state=reduce(initialized(),{type:'submitted'});state=policy.observeLegacyDecoderWait(state,8,10);assert.equal(state.outputWaitSince,10);assert.equal(policy.observeLegacyDecoderWait(state,8,3010).decoderTimeout,false);assert.equal(policy.observeLegacyDecoderWait(state,8,3011).decoderTimeout,true);assert.equal(policy.observeLegacyDecoderWait(state,0,1000).outputWaitSince,null);assert.equal(reduce(state,{type:'watchdog',enabled:false}).outputWaitSince,null);
});
const source=(await readFile(process.env.LEGACY_DECODER_SOURCE??new URL('../../web/retained-decoder-worker.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'');
function worker(){
 const memory=new SharedArrayBuffer(10*1024*1024),header=new Int32Array(memory,0,16),messages=[],decoders=[],timers=new Map();let serial=0,supportResolve;
 class Decoder {constructor(options){this.options=options;this.queuedPackets=0;this.destroyed=0;this.configured=0;decoders.push(this);}configure(){this.configured++;}destroy(){this.destroyed++;}submit(){return true;}drain(){return Promise.resolve();}}
 const context=vm.createContext({...policy,WebCodecsVideoDecoder:Decoder,videoCodecConfig:()=>({configuration:{codec:'avc1.640028'}}),VideoDecoder:{isConfigSupported:()=>new Promise(resolve=>supportResolve=resolve)},Int32Array,DataView,Uint8Array,Map,Set,WeakSet,performance:{now:()=>1000},Atomics:{load:Atomics.load,store:Atomics.store,notify:Atomics.notify},setInterval:callback=>{timers.set(++serial,callback);return serial;},clearInterval:id=>timers.delete(id),postMessage:message=>messages.push(message),self:{}});
 vm.runInContext(source,context);const send=data=>context.self.onmessage({data});send({memory,pointer:0});return {context,header,memory,messages,decoders,timers,send,run:code=>vm.runInContext(code,context),support(){supportResolve({supported:true});},request(operation,ticket=1){header[0]=ticket;header[2]=operation;header[4]=0;header[5]=1920;header[6]=1080;header[13]=1;return vm.runInContext('pump()',context);}};
}
test('worker duplicate init cannot allocate another polling loop',()=>{
 const w=worker();w.send({memory:w.memory,pointer:0});assert.equal(w.timers.size,1);assert.ok(w.messages.some(m=>m.error?.includes('initialization unavailable')));
});
test('cancel stops polling and pending support check cannot create late decoder',async()=>{
 const w=worker(),pending=w.request(1);w.send({type:'cancel'});w.support();await pending;assert.equal(w.timers.size,0);assert.equal(w.decoders.length,0);assert.equal(w.header[3],-29);
});
test('reset while configuration waits acknowledges reset and suppresses old configuration',async()=>{
 const w=worker(),pending=w.request(1);await w.request(5,5);w.support();await pending;assert.equal(w.decoders.length,0);assert.equal(w.header[0],6);assert.equal(w.header[3],0);
});
test('old decoder output after reset closes frame once and does not enter next generation',async()=>{
 const w=worker(),pending=w.request(1);w.support();await pending;const old=w.decoders[0];await w.request(5,5);let closed=0;const frame={close(){closed++;}};old.options.output(frame);old.options.output(frame);assert.equal(closed,1);assert.equal(w.run('control.frames.length'),0);
});
