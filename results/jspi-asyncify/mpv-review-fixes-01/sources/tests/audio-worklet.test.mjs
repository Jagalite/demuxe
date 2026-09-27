// SPDX-License-Identifier: MIT
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../runtime/audio-worklet.mjs',import.meta.url),'utf8');
function create(){
 let C;const feedback=[];
 vm.runInNewContext(source,{Float32Array,ArrayBuffer,AudioWorkletProcessor:class{constructor(){this.port={postMessage(){}};}},registerProcessor(name,c){C=c;}});
 const p=new C();p.link={postMessage:m=>feedback.push(m)};p.receive({type:'reset',epoch:2});
 return {p,feedback,render(){const output=[new Float32Array(128),new Float32Array(128)];p.process([], [output]);return output;}};
}
function chunk(p,start,frames=128,epoch=2){p.receive({type:'pcm',start,epoch,buffer:new Float32Array(frames*2).fill(.25).buffer});}
test('Only consumed audio advances feedback; pause and underrun emit silence',()=>{
 const {p,feedback,render}=create();chunk(p,0);render();assert.equal(p.read,0);
 p.receive({type:'state',epoch:2,running:true});assert.equal(render()[0][0],.25);assert.equal(p.read,128);
 assert.equal(feedback.at(-1).frames,128);assert.equal(render()[0][0],0);assert.equal(p.read,128);assert.equal(p.underruns,1);
});
test('Seek epoch discards queued old PCM and rejects stale data/state/reset',()=>{
 const {p,render}=create();chunk(p,0);p.receive({type:'reset',epoch:4});chunk(p,0,128,2);
 p.receive({type:'state',epoch:2,running:true});p.receive({type:'reset',epoch:2});
 assert.equal(p.written,0);assert.equal(p.epoch,4);assert.equal(p.stale,3);assert.equal(render()[0][0],0);
});
test('Queue capacity, sequence and chunk limits reject malformed traffic',()=>{
 for(const bad of ['overflow','sequence','chunk']){
  const {p,feedback}=create();
  if(bad==='overflow'){for(let i=0;i<8;i++)chunk(p,i*1024,1024);chunk(p,8192);}
  if(bad==='sequence')chunk(p,1);
  if(bad==='chunk')chunk(p,0,1025);
  assert.equal(feedback.at(-1).type,'error');assert.ok(p.written-p.read<=8192);assert.equal(p.running,false);
 }
});
test('Malformed epochs cannot replace a live queue',()=>{
 const {p}=create();chunk(p,0);
 for(const epoch of [NaN,-2,3,Infinity,0x100000000])p.receive({type:'reset',epoch});
 assert.equal(p.epoch,2);assert.equal(p.written,128);assert.equal(p.stale,5);
});

test('A protocol fault is terminal and cannot replay queued samples',()=>{
 const {p,render}=create();chunk(p,0);p.receive({type:'state',epoch:2,running:true});chunk(p,129);
 assert.ok(p.failed);p.receive({type:'state',epoch:2,running:true});p.receive({type:'reset',epoch:4});chunk(p,0,128,4);
 assert.equal(render()[0].some(x=>x!==0),false);assert.equal(p.read,0);
});
test('Explicit stop flushes data and acknowledges before teardown',()=>{
 const {p,render,feedback}=create();chunk(p,0);p.receive({type:'state',epoch:2,running:true});p.receive({type:'stop',id:7});
 assert.equal(feedback.at(-1).type,'stopped');assert.equal(feedback.at(-1).id,7);assert.equal(p.written,0);assert.equal(render()[0][0],0);
});
test('Malformed PCM does not throw from the port callback or resume playback',()=>{
 for(const buffer of [undefined,[],new ArrayBuffer(3),new Float32Array([NaN,0]).buffer]){
  const {p,render}=create();assert.doesNotThrow(()=>p.receive({type:'pcm',epoch:2,start:0,buffer}));
  assert.ok(p.failed);p.receive({type:'state',epoch:2,running:true});assert.equal(render()[0][0],0);
 }
});
