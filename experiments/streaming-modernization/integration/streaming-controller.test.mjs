// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {StreamingController}=await import(process.env.RUNTIME_PACKAGE?pathToFileURL(path.resolve(process.env.RUNTIME_PACKAGE,'web/streaming-controller.js')).href:'./files/web/streaming-controller.js');
const qualities=[500000,1100000,2500000].map((bitrate,index)=>({index,bitrate,width:320*(index+1),height:180*(index+1)}));
function setup(){
 const status={source:1,available:true,request:0,requested:-1,preparing:-1,demuxed:0,qualities};
 const requests=[];const c=new StreamingController({status:()=>({...status}),request:(source,request,representation)=>{
  if(source!==status.source||request<=status.request)return -1;
  requests.push({source,request,representation});status.request=request;status.requested=representation;return 0;
 }});c.reset(1,{mode:'auto'});return {c,status,requests};
}
const sample=serial=>({serial,eligible:true,bytes:1500000,networkMs:1000,completedAt:0});
const inputs={io:{networkSamples:[sample(1),sample(2)]},paused:false,now:0};
test('native source ownership rejects stale commands before policy changes',()=>{
 const {c,requests}=setup();assert.throws(()=>c.configure(2,{mode:'manual'},1));
 assert.equal(c.manual(2,1,1),-1);assert.equal(requests.length,0);assert.equal(c.options.mode,'auto');
});
test('seekable duration or byte counts cannot stand in for forward buffer',()=>{
 const {c,requests}=setup();c.event({event:'property-change',name:'demuxer-cache-state',data:{'fw-bytes':10000000,'seekable-ranges':[{start:0,end:100}]}});
 c.tick(inputs);c.tick({...inputs,now:10000});assert.equal(requests.length,0);
});
test('verified samples and mpv forward buffer produce one source-bound request',()=>{
 const {c,requests}=setup();c.event({event:'property-change',name:'demuxer-cache-state',data:{'cache-duration':6}});
 c.tick(inputs);c.tick({...inputs,now:6000});c.tick({...inputs,now:7000});
 assert.deepEqual(requests,[{source:1,request:1,representation:2}]);
});
test('manual intent turns auto off, without recreating a native source',()=>{
 const {c,requests,status}=setup();c.tick(inputs);assert.equal(c.manual(1,1,1),0);status.demuxed=1;
 c.event({event:'property-change',name:'paused-for-cache',data:true});c.tick({...inputs,now:1000});
 assert.equal(c.options.mode,'manual');assert.equal(requests.length,1);
});
test('new source clears health, estimates and request history',()=>{
 const {c,status}=setup();c.event({event:'property-change',name:'demuxer-cache-state',data:{'cache-duration':0,underrun:true}});c.tick(inputs);
 status.source=2;c.reset(2);const d=c.tick({paused:false,now:1000});
 assert.equal(c.cacheUnderrun,false);assert.equal(d.acceptedSamples,0);assert.equal(d.forwardBufferSeconds,null);
});
test('old network samples never justify a late upswitch after inactivity',()=>{
 const {c,requests}=setup();c.event({event:'property-change',name:'demuxer-cache-state',data:{'cache-duration':6}});
 c.tick({...inputs,now:16000});c.tick({...inputs,now:22000});assert.equal(requests.length,0);
});
test('invalid ceilings leave the accepted policy unchanged',()=>{
 const {c}=setup();c.tick(inputs);assert.throws(()=>c.configure(1,{mode:'auto',maxBandwidth:1}));
 assert.equal(c.options.mode,'auto');assert.equal(c.policy.eligible().length,3);
});
test('native rejection leaves the previously accepted automatic policy intact',()=>{
 const {c}=setup();c.tick(inputs);c.native.request=()=>-1;
 assert.equal(c.configure(1,{mode:'manual'},1),-1);assert.equal(c.options.mode,'auto');assert.equal(c.policy.options.mode,'auto');
});
test('observed frame dropping can downswitch even with good throughput',()=>{
 const {c,status,requests}=setup();status.demuxed=2;status.requested=2;c.tick(inputs);
 c.event({event:'property-change',name:'decoder-frame-drop-count',data:0});
 c.event({event:'property-change',name:'decoder-frame-drop-count',data:4});
 const d=c.tick({...inputs,now:2000});assert.equal(d.decoderHealthy,false);assert.equal(requests.at(-1).representation,0);
});
test('seek retirement drops do not masquerade as sustained decoder failure',()=>{
 const {c,status,requests}=setup();status.demuxed=2;status.requested=2;c.tick(inputs);
 c.event({event:'property-change',name:'frame-drop-count',data:0});c.event({event:'seek'});
 c.event({event:'property-change',name:'frame-drop-count',data:12});
 const d=c.tick({...inputs,now:2000});assert.equal(d.decoderHealthy,true);assert.equal(requests.length,0);
});
test('new decoder errors temporarily inhibit upswitching and reset with the source',()=>{
 const {c,status}=setup();c.tick({...inputs,decoderStatus:{errors:0}});
 assert.equal(c.tick({...inputs,now:2000,decoderStatus:{errors:1}}).decoderHealthy,false);
 assert.equal(c.tick({...inputs,now:8000,decoderStatus:{errors:1}}).decoderHealthy,true);
 status.source=2;c.reset(2);assert.equal(c.tick({paused:false,now:9000,decoderStatus:{errors:0}}).decoderHealthy,true);
});

test('terminal demux errors are polled only for the accepted source',()=>{
 const {c}=setup();const seen=[];c.native.error=source=>{seen.push(source);return source===1?-1094995529:0;};
 assert.throws(()=>c.checkFailure(),/Integrated streaming demux failed/);
 c.reset(2);assert.doesNotThrow(()=>c.checkFailure());
 c.reset(0);assert.doesNotThrow(()=>c.checkFailure());assert.deepEqual(seen,[1,2]);
});
