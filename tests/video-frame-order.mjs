// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {videoReorderDepth,initialFrameOrder,admitOrderedFrame,takeOrderedFrame,orderedPacketLimit} from '../web/generated/internal/machine/video-frame-order.js';
import * as legacy from '../web/generated/internal/machine/legacy-decoder-worker.js';
import * as retained from '../web/generated/internal/machine/private-retained-decoder.js';
import {playerError} from '../web/generated/internal/errors.js';

// Independent syntax writer: include VUI/HRD/scaling-list branches which real
// fixtures rarely exercise. The small picture permits the full 16-frame DPB.
function sps({depth=2,buffering=4,profile=77,constraints=0,level=10,vui=true,restriction=true,extras=false,poc=0}={}){
 let data='';const bits=(v,n)=>{data+=v.toString(2).padStart(n,'0');},ue=v=>{const b=(v+1).toString(2);data+='0'.repeat(b.length-1)+b;};
 bits(profile,8);bits(constraints,8);bits(level,8);ue(0);
 if(profile===100){ue(1);ue(0);ue(0);bits(0,1);bits(+extras,1);if(extras)for(let i=0;i<8;i++){bits(1,1);for(let j=0;j<(i<6?16:64);j++)ue(0);}}
 ue(0);ue(poc);if(poc===0)ue(0);if(poc===1){bits(0,1);ue(0);ue(0);ue(2);ue(0);ue(0);}
 ue(1);bits(0,1);ue(0);ue(0);bits(1,1);bits(1,1);bits(0,1);bits(+vui,1);
 if(vui){
  bits(+extras,1);if(extras){bits(255,8);bits(1,16);bits(1,16);}
  bits(+extras,1);if(extras)bits(0,1);
  bits(+extras,1);if(extras){bits(5,3);bits(0,1);bits(1,1);bits(1,8);bits(1,8);bits(1,8);}
  bits(+extras,1);if(extras){ue(0);ue(0);}
  bits(+extras,1);if(extras){bits(1,32);bits(48,32);bits(1,1);}
  for(let i=0;i<2;i++){bits(+extras,1);if(extras){ue(0);bits(0,4);bits(0,4);ue(0);ue(0);bits(1,1);for(let j=0;j<4;j++)bits(23,5);}}
  if(extras)bits(0,1);bits(0,1);bits(+restriction,1);
  if(restriction){bits(1,1);ue(0);ue(0);ue(0);ue(0);ue(depth);ue(buffering);}
 }
 data+='1';data=data.padEnd(Math.ceil(data.length/8)*8,'0');const raw=Array.from({length:data.length/8},(_,i)=>parseInt(data.slice(i*8,i*8+8),2));
 const nal=[0x67];let zeros=0;for(const b of raw){if(zeros===2&&b<=3){nal.push(3);zeros=0;}nal.push(b);zeros=b===0?zeros+1:0;}return new Uint8Array(nal);
}
const avcc=(...units)=>new Uint8Array([1,77,0,10,255,224|units.length,...units.flatMap(n=>[n.length>>8,n.length&255,...n]),0]);
test('real failing Main-profile AVC SPS declares two reorder frames',()=>{
 const bytes=Buffer.from('014d400affe10017674d400aeca146fc9808800000030080000018078912cb01000468ce0fc8','hex');
 assert.equal(videoReorderDepth(1,bytes),2);
 assert.equal(videoReorderDepth(1,new Uint8Array([0,0,0,1,...bytes.subarray(8,31)])),2);
});
test('AVC metadata handles zero through sixteen, all SPS, high profile, HRD and POC branches',()=>{
 for(const depth of [0,1,2,4,8,16])for(const profile of [77,100])for(const poc of [0,1,2])assert.equal(videoReorderDepth(1,avcc(sps({depth,buffering:Math.max(1,depth),profile,poc,extras:true}))),depth);
 assert.equal(videoReorderDepth(1,avcc(sps({depth:1}),sps({depth:4}))),4);
});
test('missing VUI restriction follows the standard DPB inference, not a fixed two-frame guess',()=>{
 for(const options of [{vui:false},{restriction:false}]){
  assert.equal(videoReorderDepth(1,avcc(sps(options))),16);
  assert.equal(videoReorderDepth(1,avcc(sps({...options,profile:100,constraints:16}))),0);
 }
 for(const kind of [2,3,4,5])assert.equal(videoReorderDepth(kind,new Uint8Array()),0);
});
test('malformed, truncated and over-budget configuration fails closed',()=>{
 const valid=avcc(sps({extras:true}));for(let n=0;n<valid.length-1;n++)assert.throws(()=>videoReorderDepth(1,valid.slice(0,n)));
 for(const options of [{depth:5,buffering:4},{depth:17,buffering:17},{buffering:0},{level:255}])assert.throws(()=>videoReorderDepth(1,avcc(sps(options))));
 assert.throws(()=>videoReorderDepth(1,new Uint8Array(65537)));
 for(const depth of [-1,17,NaN,1.5])assert.throws(()=>initialFrameOrder(depth));
});
test('corrupt stream reorder metadata is a decoder failure, not a caller argument error',()=>{
 const malformed=[avcc(sps({depth:5,buffering:4})),avcc(new Uint8Array([0x67,0,0,3,4]))];
 for(const bytes of malformed){let error;try{videoReorderDepth(1,bytes);}catch(e){error=e;}assert.ok(error);assert.equal(playerError(error).code,'DECODE_FAILED');}
});
test('all bounded permutations preserve presentation order; flush releases every short tail',()=>{
 function* permutations(a){if(!a.length){yield [];return;}for(let i=0;i<a.length;i++)for(const tail of permutations(a.filter((_,j)=>j!==i)))yield [a[i],...tail];}
 for(let depth=0;depth<=5;depth++)for(const input of permutations(Array.from({length:depth+1},(_,i)=>i))){
  let state=initialFrameOrder(depth),output=[];const original=JSON.stringify(state);
  for(const pts of input){const admitted=admitOrderedFrame(state,pts+1,pts);assert.equal(admitted.error,undefined);state=admitted.state;const taken=takeOrderedFrame(state,false);state=taken.state;if(taken.id!==null)output.push(taken.id-1);}
  assert.equal(output.length,1);for(;;){const taken=takeOrderedFrame(state,true);state=taken.state;if(taken.id===null)break;output.push(taken.id-1);}
  assert.deepEqual(output,[...input].sort((a,b)=>a-b));assert.equal(original,JSON.stringify(initialFrameOrder(depth)));
 }
});
test('late, duplicate and unsafe timestamps fail without replacing the queue',()=>{
 let state=admitOrderedFrame(initialFrameOrder(2),1,125000).state;
 for(const pts of [125000,NaN,Infinity,1.5,Number.MAX_SAFE_INTEGER+1]){const r=admitOrderedFrame(state,2,pts);assert.ok(r.error);assert.equal(r.state,state);assert.equal(playerError(Error('Retained decoder: '+r.error)).code,'DECODE_FAILED');}
 state=takeOrderedFrame(state,true).state;assert.ok(admitOrderedFrame(state,2,42000).error);
 for(let i=0;i<32;i++)state=admitOrderedFrame(state,i+2,200000+i).state;assert.equal(state.frames.length,32);assert.match(admitOrderedFrame(state,99,300000).error,/limit/);
});
test('non-AVC FIFO preserves older seek preroll while zero-reorder AVC rejects late output',()=>{
 let state=initialFrameOrder(null);state=admitOrderedFrame(state,1,5000000).state;state=takeOrderedFrame(state,false).state;
 const preroll=admitOrderedFrame(state,2,1000000);assert.equal(preroll.error,undefined);assert.equal(takeOrderedFrame(preroll.state,false).id,2);
 state=initialFrameOrder(0);state=admitOrderedFrame(state,1,5000000).state;state=takeOrderedFrame(state,false).state;
 assert.ok(admitOrderedFrame(state,2,1000000).error);
});
test('legacy core holds draining tail until flush, resets timestamps, fences stale output and admits deepest SPS',()=>{
 let state=legacy.reduceLegacyDecoderWorker(legacy.initialLegacyDecoderWorker(),{type:'configure',reorderDepth:2});
 for(const pts of [0,125000,42000,83000])state=legacy.admitLegacyDecoderFrame(state,0,pts).state;
 const first=legacy.takeLegacyDecoderFrame(state);assert.equal(first.id,1);state=first.state;
 const second=legacy.takeLegacyDecoderFrame(state);assert.equal(second.id,3);state=legacy.reduceLegacyDecoderWorker(second.state,{type:'drain'});
 assert.equal(legacy.takeLegacyDecoderFrame(state).id,null);
 state=legacy.reduceLegacyDecoderWorker(state,{type:'flushed',generation:0});const third=legacy.takeLegacyDecoderFrame(state);assert.equal(third.id,4);assert.equal(legacy.takeLegacyDecoderFrame(third.state).id,2);
 state=legacy.reduceLegacyDecoderWorker(state,{type:'reset'});assert.equal(state.ordering.depth,2);assert.equal(state.ordering.last,null);assert.equal(legacy.admitLegacyDecoderFrame(state,0,-1).id,null);assert.ok(legacy.admitLegacyDecoderFrame(state,1,-1).id);
 state=legacy.reduceLegacyDecoderWorker(state,{type:'configure',reorderDepth:16});for(let i=0;i<16;i++)state=legacy.admitLegacyDecoderFrame(state,1,i).state;
 assert.equal(orderedPacketLimit(state.ordering),17);assert.equal(legacy.legacyDecoderPacketAdmission(state,0),true);assert.equal(legacy.takeLegacyDecoderFrame(state).id,null);state=legacy.admitLegacyDecoderFrame(state,1,16).state;assert.equal(legacy.legacyDecoderPacketAdmission(state,0),false);assert.ok(legacy.takeLegacyDecoderFrame(state).id);
});
test('private core shares reordering without allocating presenter capacity for held frames',()=>{
 let state=retained.retireRetainedDecoder(retained.initialRetainedDecoder()).state;const checked=retained.checkRetainedConfiguration(state,1,2),activated=retained.activateRetainedDecoder(checked.state,1,checked.id),scope=activated.scope;state=activated.state;
 state=retained.acceptRetainedDecoderFrame(state,scope,125000).state;assert.equal(retained.receiveRetainedDecoderFrame(state,0,false).wait,null);
 state=retained.drainRetainedDecoder(state).state;assert.equal(retained.receiveRetainedDecoderFrame(state,0,true).id,null);
 state=retained.acceptRetainedDecoderFrame(state,scope,42000).state;state=retained.flushedRetainedDecoder(state,scope);
 const blocked=retained.receiveRetainedDecoderFrame(state,0,false);assert.ok(blocked.wait);state=retained.releaseRetainedDecoderCapacity(blocked.state,blocked.wait);
 const first=retained.receiveRetainedDecoderFrame(state,0,true);assert.equal(first.id,2);const last=retained.receiveRetainedDecoderFrame(first.state,0,true);assert.equal(last.id,1);assert.equal(retained.receiveRetainedDecoderFrame(last.state,0,true).result,-541478725);
 const reset=retained.retireRetainedDecoder(last.state);assert.equal(reset.state.ordering.last,null);assert.equal(reset.state.ordering.depth,2);assert.equal(retained.flushedRetainedDecoder(reset.state,scope),reset.state);
});
