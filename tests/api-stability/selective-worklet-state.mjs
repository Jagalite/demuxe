// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {performance} from 'node:perf_hooks';
import * as core from '../../web/generated/internal/machine/selective-worklet.js';
const original=fs.readFileSync(new URL('./frozen/selective-worklet-before.txt',import.meta.url),'utf8');
const current=fs.readFileSync(new URL('../../web/selective-sync-worklet.js',import.meta.url),'utf8');
const candidate=process.env.DEMUXE_SELECTIVE_WORKLET_BASELINE?original:current;
function fixture(source=candidate,channels=2,capacity=512){
 let Processor;let typedArrays=0;const messages=[],port={onmessage:null,hook:null,postMessage(message){this.hook?.(message);messages.push({...message});}};
 const context={...core,AudioWorkletProcessor:class{constructor(){this.port=port;}},registerProcessor(_name,C){Processor=C;},Atomics,Float64Array:class extends Float64Array{constructor(...args){super(...args);typedArrays++;}},Int32Array:class extends Int32Array{constructor(...args){super(...args);typedArrays++;}},Float32Array:class extends Float32Array{constructor(...args){super(...args);typedArrays++;}},currentFrame:0,sampleRate:48000};
 vm.runInNewContext(source.replace(/^import .*;$/gm,''),context);
 const buffer=new SharedArrayBuffer(64+capacity*channels*4+capacity*16),processor=new Processor({processorOptions:{buffer,capacity,channels,measureOutput:false}});
 const h=processor.h;h[2]=1;h[3]=2;h[10]=1;h[12]=1;h[14]=2;
 const outputs=Array.from({length:channels},()=>new Float32Array(128));
 return{processor,h,port,messages,context,outputs,get typedArrays(){return typedArrays;},close(){port.onmessage({data:'close'});},step(){outputs.forEach(c=>c.fill(0));const result=processor.process([], [outputs]);context.currentFrame+=128;return{result,samples:outputs.map(c=>[...c]),header:[...h],messages:messages.splice(0)};},append(count,rate=1){let write=h[0]>>>0;const read=h[1]>>>0;count=Math.min(count,capacity-((write-read)>>>0));for(let i=0;i<count;i++){const at=((write+i)>>>0)%capacity;for(let c=0;c<channels;c++)processor.pcm[at*channels+c]=(write+i+c+1)/10000;processor.meta[at*2]=(write+i)/48000;processor.meta[at*2+1]=rate;}h[0]=(write+count)|0;}};
}
function ready(source=candidate,channels=2){const f=fixture(source,channels);f.step();f.step();return f;}
test('pure owner retains immutable constant-size state, generation boundary before epoch and terminal retirement',()=>{
 const initial=core.initialSelectiveWorklet(),generation=core.observeSelectiveWorklet(initial,1,2),epoch=core.observeSelectiveWorklet(generation,1,2);
 assert.equal(initial.generation,-1);assert.equal(generation.epoch,-1);assert.equal(epoch.epoch,2);assert.equal(core.observeSelectiveWorklet(epoch,1,2),epoch);assert.equal(Object.isFrozen(epoch),true);
 for(const failed of [false,true]){const retired=core.retireSelectiveWorklet(epoch,failed);assert.equal(core.observeSelectiveWorklet(retired,9,9),retired);assert.equal(core.retireSelectiveWorklet(retired),retired);assert.equal(core.selectiveWorkletCurrent(retired,1,2),false);assert.equal(Object.keys(retired).length,3);}
 let state=initial;for(let i=0;i<10000;i++){state=core.observeSelectiveWorklet(state,i,i);state=core.observeSelectiveWorklet(state,i,i);assert.equal(Object.keys(state).length,3);}
});
test('pure scalar cadence and admission match exact quantum and pulse boundaries',()=>{
 assert.equal(core.selectiveTimelineDue(1023,1024),false);assert.equal(core.selectiveTimelineDue(1024,1024),true);assert.equal(core.selectiveNextTimeline(1024),2048);
 assert.equal(core.selectivePulseDue(24000,0,48000),false);assert.equal(core.selectivePulseDue(24001,0,48000),true);
 assert.equal(core.selectiveWorkletFrames(0xfffffffe,2,128,512),4);
 for(const [gate,running,channels,epoch,permit,expected] of [[1,1,2,2,2,true],[0,1,2,2,2,false],[1,0,2,2,2,false],[1,1,0,2,2,false],[1,1,2,2,4,false]])assert.equal(core.selectiveWorkletCanConsume(gate,running,channels,epoch,permit),expected);
});
test('actual worklet matches frozen prior PCM, headers, cadence and messages over seeded mixed histories',()=>{
 for(const channels of [2,6,8])for(let seed=1;seed<=12;seed++){
  const before=ready(original,channels),after=ready(current,channels);let random=seed;
  for(let step=0;step<200;step++){
   random=(Math.imul(random,1664525)+1013904223)>>>0;const action=random%8;
   for(const f of [before,after]){
    if(action<3)f.append((random%128)+1,1+(random%3)*0.25);
    if(action===3)f.h[2]=1-f.h[2];
    if(action===4)f.h[12]=1-f.h[12];
    if(action===5){f.h[3]+=2;f.h[0]=0;f.h[14]=f.h[3];}
    if(action===6)f.h[10]++;
    if(action===7)f.h[14]=random%2?f.h[3]:f.h[3]-2;
   }
   assert.deepEqual(after.step(),before.step(),`channels=${channels} seed=${seed} step=${step}`);
  }
 }
});
test('actual close is terminal across headers, repeated close and later calls',()=>{
 const f=ready();f.append(128);f.close();const saved=[...f.h];assert.equal(f.step().result,false);assert.deepEqual([...f.h],saved);f.h[3]+=2;f.h[10]++;f.close();assert.equal(f.step().result,false);assert.equal(f.messages.length,0);
});
test('close during timeline publication prevents consumption and zeroes the pending output',()=>{
 const f=ready();f.append(128);f.port.hook=()=>f.close();const result=f.step();assert.equal(result.result,false);assert.equal(f.h[1],0);assert.equal(f.h[5],0);assert.ok(result.samples.every(c=>c.every(v=>v===0)));assert.equal(result.messages.length,1);assert.equal(f.step().result,false);
});
test('notification failure retires once without escaping the real process callback or consuming data',()=>{
 const f=ready();f.append(128);let calls=0;f.port.hook=()=>{calls++;throw Error('port failed');};let result;assert.doesNotThrow(()=>result=f.step());assert.equal(result.result,false);assert.equal(f.h[1],0);assert.equal(f.h[5],0);assert.equal(calls,1);assert.ok(result.samples.every(c=>c.every(v=>v===0)));assert.equal(f.step().result,false);
});
test('epoch change during rate notification suppresses obsolete timeline and zeroes copied samples',()=>{
 const f=ready();f.append(128);f.port.hook=()=>{f.h[3]+=2;};const result=f.step();assert.equal(result.result,true);assert.equal(result.messages.length,1);assert.equal(f.h[1],0);assert.equal(f.h[5],0);assert.ok(result.samples.every(c=>c.every(v=>v===0)));f.port.hook=null;f.h[14]=f.h[3];assert.equal(f.step().result,true);assert.equal(f.h[4],f.h[3]);
});
test('actual gate closure, forbidden epoch, EOF and short consumption preserve separate counters',()=>{
 const f=ready();f.append(3);f.h[14]=0;f.step();assert.equal(f.h[15],1);assert.equal(f.h[1],0);f.h[14]=2;f.h[7]=1;f.step();assert.equal(f.h[5],3);assert.equal(f.h[6],1);assert.equal(f.h[8],0);assert.equal(f.h[9],1);f.h[12]=0;f.step();assert.equal(f.h[9],2);assert.equal(f.h[5],3);
});
test('stable quanta create no core state, freezes or typed arrays for every supported layout',()=>{
 for(const channels of [2,6,8]){const f=ready(current,channels),state=f.processor.control,arrays=f.typedArrays;let freezes=0;const freeze=Object.freeze;Object.freeze=(value)=>{freezes++;return freeze(value);};try{for(let i=0;i<240000;i++){f.processor.process([], [f.outputs]);f.context.currentFrame+=128;}}finally{Object.freeze=freeze;}assert.equal(f.processor.control,state);assert.equal(freezes,0);assert.equal(f.typedArrays,arrays);}
});
if(process.env.DEMUXE_SELECTIVE_WORKLET_PROBE){test('synthetic steady quantum comparison receipt',()=>{
 const receipt={scope:'Node/V8 synthetic quantum loop; no browser realtime or player CPU qualification',layouts:[],histories:36,historySteps:7200};
 for(const channels of [2,6,8]){const result={channels,before:[],after:[]};for(let round=0;round<5;round++)for(const [name,source] of [['before',original],['after',current]]){const f=ready(source,channels);f.append(512);for(let i=0;i<2000;i++){f.h[0]=(f.h[1]+128)|0;f.processor.process([], [f.outputs]);f.context.currentFrame+=128;}f.port.postMessage=()=>{};const start=performance.now();for(let i=0;i<40000;i++){f.h[0]=(f.h[1]+128)|0;f.processor.process([], [f.outputs]);f.context.currentFrame+=128;}result[name].push((performance.now()-start)*1000/40000);}receipt.layouts.push(result);}
 fs.writeFileSync('/tmp/demuxe-selective-worklet-comparison.json',JSON.stringify(receipt,null,2));
});}

test('unsigned cursor wrap scans each retained rate and consumes the correct wrapped PCM',()=>{
 const f=ready();f.h[1]=-2;f.h[0]=-2;f.processor.scanned=0xfffffffe;f.append(4,1.5);const result=f.step();assert.equal(f.h[1],2);assert.equal(f.h[5],4);assert.equal(result.messages[0].kind,'rate-boundary');assert.equal(result.messages[0].audioFrame,256);assert.equal(result.messages[0].rate,1.5);assert.ok(result.samples[0].slice(0,4).every(v=>v!==0));
});
test('corrupt huge publication distance cannot create an unbounded metadata scan',()=>{
 const f=ready();f.append(512);f.h[0]=0x7fffffff;const result=f.step();assert.equal(f.h[1],128);assert.equal(f.h[5],128);assert.equal(result.messages.length,2);assert.equal(core.selectiveWorkletScanFrames(0,0x7fffffff,512),512);assert.equal(core.selectiveWorkletScanOffset(0xfffffffe,2,4),4);assert.equal(core.selectiveWorkletScanOffset(0xfffffffe,0xfffffff0,4),0);
});

test('pulse diagnostic retirement and identity changes cannot commit stale audio consumption',()=>{
 for(const event of ['close','epoch','generation','failure']){const f=ready();f.processor.measureOutput=true;f.append(128);f.processor.scannedRate=1;f.processor.scanned=128;f.processor.nextTimeline=Infinity;f.processor.pcm.fill(0.5);f.port.hook=message=>{assert.equal(message.kind,'click');if(event==='close')f.close();if(event==='epoch')f.h[3]+=2;if(event==='generation')f.h[10]++;if(event==='failure')throw Error('click failed');};const result=f.step();assert.equal(result.result,event==='epoch'||event==='generation');assert.equal(f.h[1],0);assert.equal(f.h[5],0);assert.ok(result.samples.every(c=>c.every(v=>v===0)));}
});
test('pulse diagnostics preserve strict half-second cadence, PCM and read acknowledgments',()=>{
 const f=ready();f.processor.measureOutput=true;f.append(128);f.processor.pcm.fill(0.5);let result=f.step();assert.equal(result.messages.filter(m=>m.kind==='click').length,1);assert.equal(f.h[5],128);assert.equal(f.h[11],1);assert.equal(f.h[13],2);const pulse=f.processor.lastPulse;f.context.currentFrame=pulse+24000;f.append(1);f.processor.pcm.fill(0.5);result=f.step();assert.equal(result.messages.filter(m=>m.kind==='click').length,0);f.context.currentFrame=pulse+24001;f.append(1);f.processor.pcm.fill(0.5);result=f.step();assert.equal(result.messages.filter(m=>m.kind==='click').length,1);assert.equal(f.h[5],130);
});
test('invalid output layouts retain constructor rejection and scalar admission',()=>{
 for(const channels of [0,1,3,4,7,9]){assert.equal(core.selectiveWorkletLayoutSupported(channels),false);assert.throws(()=>fixture(candidate,channels),/Unsupported PCM layout/);}for(const channels of [2,6,8])assert.equal(core.selectiveWorkletLayoutSupported(channels),true);
});

test('notification reentrancy revokes gate, running and permitted epoch before PCM publication',()=>{
 for(const pulse of [false,true])for(const index of [12,2,14]){
  const f=ready();f.append(128);f.processor.pcm.fill(0.5);
  if(pulse){f.processor.measureOutput=true;f.processor.scannedRate=1;f.processor.scanned=128;f.processor.nextTimeline=Infinity;}
  f.port.hook=()=>{f.h[index]=0;};const result=f.step();
  assert.equal(result.result,true);assert.equal(f.h[1],0);assert.equal(f.h[5],0);
  assert.equal(result.messages.length,1);assert.ok(result.samples.every(c=>c.every(v=>v===0)),`pulse=${pulse} header=${index}`);
 }
});
test('wrapped PCM slots match unsigned metadata slots for a non-power-of-two ring',()=>{
 const f=fixture(candidate,2,510);f.step();f.step();f.h[1]=-2;f.h[0]=-2;f.processor.scanned=0xfffffffe;
 f.append(4);const positions=[0xfffffffe,0xffffffff,0,1];
 for(let i=0;i<positions.length;i++){const slot=positions[i]%510;f.processor.pcm[slot*2]=i+1;f.processor.pcm[slot*2+1]=i+11;}
 const result=f.step();assert.deepEqual(result.samples[0].slice(0,4),[1,2,3,4]);assert.deepEqual(result.samples[1].slice(0,4),[11,12,13,14]);assert.equal(f.h[1],2);
});
