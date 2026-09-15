import test from 'node:test';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {StreamingPolicy}=await import(process.env.RUNTIME_PACKAGE?pathToFileURL(path.resolve(process.env.RUNTIME_PACKAGE,'web/streaming-policy.js')).href:'./files/web/streaming-policy.js');
const ladder = [500000,1100000,2500000].map((bitrate,index)=>({index,bitrate,width:[320,640,960][index],height:[180,360,540][index]}));
const sample = (serial,bps,networkMs=1000)=>({serial,eligible:true,bytes:bps*networkMs/8000,networkMs});
const state = {now:0,active:0,bufferSeconds:6};

test('manual policy never adapts, including during starvation',()=>{
 const p=new StreamingPolicy(ladder);p.sample(sample(1,12000000));
 assert.equal(p.decide({...state,starving:true}),null);
});
test('unknown forward buffer and cache/backpressure samples cannot justify an upswitch',()=>{
 const p=new StreamingPolicy(ladder,{mode:'auto'});
 for(const reason of ['cache','backpressure','timing-unavailable'])p.sample({...sample(p.lastSample+1,12000000),eligible:false,reason});
 assert.equal(p.samples,0);assert.equal(p.fast,null);
 p.sample(sample(4,12000000));p.sample(sample(5,12000000));
 assert.equal(p.decide({...state,bufferSeconds:null}),null);
 assert.equal(p.decide({...state,now:20000,bufferSeconds:null}),null);
});
test('upgrades require sustained headroom; deterioration and starvation downswitch promptly',()=>{
 const p=new StreamingPolicy(ladder,{mode:'auto'});
 p.sample(sample(1,12000000));p.sample(sample(2,12000000));
 assert.equal(p.decide(state),null);assert.equal(p.decide({...state,now:5999}),null);
 assert.equal(p.decide({...state,now:6000}).target,2);
 // A 2 Mbit/s segment takes four seconds; its duration gives it appropriate weight.
 p.sample(sample(3,2000000,4000));
 assert.equal(p.decide({...state,now:6500,active:2}).target,1);
 assert.equal(p.decide({...state,now:6600,active:1,starving:true}).target,0);
});
test('recovery from 2 to 8 Mbit/s remains slower than a downswitch',()=>{
 const p=new StreamingPolicy(ladder,{mode:'auto'});
 p.sample(sample(1,2000000));p.sample(sample(2,2000000));
 assert.equal(p.decide({...state,active:2}).target,1);
 for(let n=3;n<12;n++)p.sample(sample(n,8000000));
 assert.equal(p.decide({...state,now:1000,active:1}),null);
 assert.equal(p.decide({...state,now:7000,active:1}),null);
 assert.equal(p.decide({...state,now:8000,active:1}).target,2);
});
test('manual selection is authoritative after auto; paused playback does not adapt',()=>{
 const p=new StreamingPolicy(ladder,{mode:'auto'});p.sample(sample(1,12000000));p.sample(sample(2,12000000));
 assert.equal(p.decide({...state,paused:true}),null);
 p.configure({mode:'manual'});assert.equal(p.decide({...state,active:2,starving:true}),null);
});
test('ceilings and eligibility constrain decisions without inventing another track identity',()=>{
 const p=new StreamingPolicy(ladder,{mode:'auto',maxHeight:360});p.sample(sample(1,12000000));
 assert.equal(p.decide({...state,active:2}).target,1);
 const empty=new StreamingPolicy(ladder,{mode:'auto',maxBandwidth:1});
 assert.equal(empty.decide(state),null);
 const unsupported=new StreamingPolicy(ladder.map(r=>({...r,eligible:r.index!==2})),{mode:'auto'});
 assert.deepEqual(unsupported.eligible().map(r=>r.index),[0,1]);
});
test('a pending upswitch is retired when conditions collapse, even if current quality is already low',()=>{
 const p=new StreamingPolicy(ladder,{mode:'auto'});
 assert.equal(p.decide({...state,requested:2,preparing:2,starving:true}).target,0);
 assert.equal(p.decide({...state,requested:0,preparing:-1,starving:true}),null);
});
test('duplicate samples are ignored and a new source starts with no previous estimate',()=>{
 const p=new StreamingPolicy(ladder,{mode:'auto'});p.sample(sample(1,12000000));p.sample(sample(1,1));
 assert.equal(p.samples,1);assert.equal(p.fast,12000000);
 assert.equal(new StreamingPolicy(ladder,{mode:'auto'}).fast,null);
});
