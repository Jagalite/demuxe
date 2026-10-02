// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/progressive-mp4.js';
import {ProgressiveMP4,fragmentSamples} from '../../web/progressive-mp4.js';
const u32=value=>{const bytes=new Uint8Array(4);new DataView(bytes.buffer).setUint32(0,value);return bytes;};
const join=parts=>{const bytes=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}return bytes;};
const box=(type,...parts)=>{const bytes=join(parts);return join([u32(bytes.length+8),Uint8Array.from(type,letter=>letter.charCodeAt(0)),bytes]);};
function fixture(sizes=[3,5,2]){
 const trun=offset=>box('trun',u32(0x201),u32(sizes.length),u32(offset),...sizes.map(u32));
 const moof=offset=>box('moof',box('mfhd',u32(0),u32(1)),box('traf',box('tfhd',u32(0x020000),u32(1)),box('tfdt',u32(0),u32(0)),trun(offset)));
 const header=moof(moof(0).length+8),payload=Uint8Array.from({length:sizes.reduce((sum,size)=>sum+size,0)},(_,index)=>index+1),mdat=box('mdat',payload),bytes=join([header,mdat]);
 return{bytes,moof:header,mdat,metadata:header.length+8};
}
const f=fixture();
function machine(){let state=core.initialProgressiveMP4(0,1);const history=[],initial=state;const send=(fn,...args)=>{const previous=state,copy=structuredClone(state),result=fn(state,...args);assert.deepEqual(previous,copy);state=result.state??result;history.push([fn,args]);return result;};return{send,get state(){return state;},replay:()=>history.reduce((state,[fn,args])=>{const result=fn(state,...args);return result.state??result;},initial)};}

test('fragment parser produces exact sample ends without mutating input bytes',()=>{
 const before=f.moof.slice();assert.deepEqual(fragmentSamples(f.moof,f.mdat.length),[11,16,18]);assert.deepEqual(f.moof,before);
 const bad=f.moof.slice(),run=Buffer.from(bad).indexOf('trun');new DataView(bad.buffer).setInt32(run+12,f.moof.length+9);assert.throws(()=>fragmentSamples(bad,f.mdat.length),/Sample bounds|Noncontiguous/);
});
test('fragment parser retains explicit sample and shape limits',()=>{
 const bad=f.moof.slice(),run=Buffer.from(bad).indexOf('trun');new DataView(bad.buffer).setUint32(run+8,65537);assert.throws(()=>fragmentSamples(bad,f.mdat.length),/Sample run/);assert.throws(()=>fragmentSamples(f.moof,7),/Fragment shape/);assert.throws(()=>fragmentSamples(f.moof,f.mdat.length+1),/Incomplete sample map/);
});
test('pure admission waits for bounded headers and reserves exact metadata before delivery',()=>{
 const m=machine();m.send(core.appendProgressiveMP4,7);assert.equal(m.send(core.inspectProgressiveMP4,f.bytes.subarray(0,7)).emit,0);m.send(core.appendProgressiveMP4,f.metadata-5);
 assert.equal(m.send(core.inspectProgressiveMP4,f.bytes.subarray(0,8)).required,f.metadata);
 const admitted=m.send(core.inspectProgressiveMP4,f.bytes.subarray(0,f.metadata));assert.equal(admitted.emit,f.metadata);assert.equal(m.state.length,2);assert.equal(m.state.position,8);assert.deepEqual(m.state.ends,[11,16,18]);assert.equal(m.state.parts,1);
 assert.equal(m.send(core.advanceProgressiveMP4).emit,0);m.send(core.appendProgressiveMP4,1);assert.equal(m.send(core.advanceProgressiveMP4).emit,3);assert.equal(m.state.position,11);assert.equal(m.state.length,0);assert.equal(m.state.emittedBytes,f.metadata+3);assert.throws(()=>core.finishProgressiveMP4(m.state,new Uint8Array()),/Truncated/);assert.deepEqual(m.replay(),m.state);
});
test('complete batches and unqualified box shapes retain all bytes for gather delivery',()=>{
 for(const bytes of [f.bytes,Uint8Array.from([0,0,0,8,102,114,101,101])]){const p=new ProgressiveMP4(()=>assert.fail('unqualified output emitted'),{minimum:0,batch:1});p.push(bytes);assert.equal(p.finish(),false);assert.equal(p.rejected,true);assert.equal(p.length,bytes.length);assert.equal(p.emittedBytes,0);assert.equal(p.copiedBytes,0);assert.deepEqual(join(p.chunks),bytes);}
});
test('batch minimum defers partial samples but always releases the exact final sample',()=>{
 const output=[],p=new ProgressiveMP4(bytes=>output.push(bytes),{minimum:0,batch:6});p.push(f.bytes.slice(0,f.metadata));p.push(f.bytes.slice(f.metadata,f.metadata+3));assert.deepEqual(output.map(bytes=>bytes.length),[f.metadata]);p.push(f.bytes.slice(f.metadata+3,f.metadata+8));assert.deepEqual(output.map(bytes=>bytes.length),[f.metadata,8]);p.push(f.bytes.slice(-2));assert.deepEqual(output.map(bytes=>bytes.length),[f.metadata,8,2]);assert.equal(p.finish(),true);assert.deepEqual(join(output),f.bytes);
});
test('oversized metadata and media declarations reject admission before output',()=>{
 for(const size of [7,262145]){const bytes=f.bytes.slice(0,8);new DataView(bytes.buffer).setUint32(0,size);const p=new ProgressiveMP4(()=>assert.fail(),{minimum:0});p.push(bytes);assert.equal(p.rejected,true);}
 const bytes=f.bytes.slice(0,f.metadata);new DataView(bytes.buffer).setUint32(f.moof.length,8*1024*1024+1);const p=new ProgressiveMP4(()=>assert.fail(),{minimum:0});p.push(bytes);assert.equal(p.rejected,true);
});
test('sample progress commits before an emit callback recursively pushes the next sample',()=>{
 const output=[];let injected=false,p;p=new ProgressiveMP4(bytes=>{output.push(bytes);if(bytes.length===3&&!injected){injected=true;assert.equal(p.position,11);p.push(f.bytes.slice(f.metadata+3,f.metadata+8));}},{minimum:0,batch:1});p.push(f.bytes.slice(0,f.metadata));p.push(f.bytes.slice(f.metadata,f.metadata+3));p.push(f.bytes.slice(-2));assert.equal(p.finish(),true);assert.deepEqual(output.map(bytes=>bytes.length),[f.metadata,3,5,2]);assert.deepEqual(join(output),f.bytes);assert.equal(p.received,p.emittedBytes);assert.equal(p.length,0);
});
test('final sample callback can inspect completed state and finish without duplicate output',()=>{
 const output=[];let p,finished=false;p=new ProgressiveMP4(bytes=>{output.push(bytes);if(bytes.length===10){assert.equal(p.position,18);assert.equal(p.length,0);assert.equal(p.finish(),true);finished=true;}},{minimum:0,batch:1});p.push(f.bytes.slice(0,f.metadata));p.push(f.bytes.slice(f.metadata));assert.equal(finished,true);assert.equal(p.finish(),true);assert.deepEqual(join(output),f.bytes);assert.equal(p.parts,2);
});
test('callback failure preserves original exception and prevents subsequent delivery',()=>{
 const error=Error('consumer stopped'),output=[];const p=new ProgressiveMP4(bytes=>{output.push(bytes);if(bytes.length===3)throw error;},{minimum:0,batch:1});p.push(f.bytes.slice(0,f.metadata));assert.throws(()=>p.push(f.bytes.slice(f.metadata,f.metadata+3)),value=>value===error);assert.equal(p.position,11);assert.equal(p.emittedBytes,f.metadata+3);assert.equal(p.machine.phase,'failed');assert.throws(()=>p.push(f.bytes.slice(-2)),value=>value===error);assert.throws(()=>p.finish(),value=>value===error);assert.equal(output.length,2);
});
test('varied chunk histories preserve every admitted byte and exact gather fallback',()=>{
 for(const [size,admitted]of [[1,true],[2,true],[3,true],[7,true],[11,true],[13,true],[17,false],[31,false],[114,false]]){const output=[],p=new ProgressiveMP4(bytes=>output.push(bytes),{minimum:0,batch:1});for(let at=0;at<f.bytes.length;at+=size){p.push(f.bytes.slice(at,at+size));assert.equal(p.received,p.length+p.emittedBytes);assert.doesNotThrow(()=>structuredClone(p.machine));}assert.equal(p.finish(),admitted,`chunk ${size}`);assert.deepEqual(admitted?join(output):join(p.chunks),f.bytes);}
});
test('finish validates and transfers an allowed trailer exactly once',()=>{
 const output=[],p=new ProgressiveMP4(bytes=>output.push(bytes),{minimum:0,batch:1}),tail=box('mfra');p.push(f.bytes.slice(0,f.metadata));p.push(f.bytes.slice(f.metadata));p.push(tail);assert.equal(p.finish(),true);assert.equal(p.finish(),true);assert.deepEqual(join(output),join([f.bytes,tail]));assert.equal(p.parts,3);
});
test('admitted stream byte budget includes headers and remains explicit at the boundary',()=>{
 const m=machine();m.send(core.appendProgressiveMP4,f.metadata);m.send(core.inspectProgressiveMP4,f.bytes.subarray(0,f.metadata));const atLimit=core.appendProgressiveMP4(m.state,8*1024*1024-m.state.received);assert.equal(core.progressiveMP4BudgetError(atLimit),null);assert.equal(core.progressiveMP4BudgetError(core.appendProgressiveMP4(atLimit,1)),'Progressive fragment budget');
});
