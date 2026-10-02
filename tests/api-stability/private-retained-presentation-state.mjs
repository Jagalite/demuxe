// SPDX-License-Identifier: Apache-2.0
import {test} from 'node:test';import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/private-retained-presentation.js';
import {PrivateRetainedPresentation} from '../../web/private-mpv/retained-presentation.js';
const frame=timestamp=>({timestamp,closed:0,visibleRect:{x:0,y:0,width:320,height:180},close(){this.closed++;this.onClose?.();}});
function oracle(pts,delay=0,serial=1){const memory=new WebAssembly.Memory({initial:1}),view=new DataView(memory.buffer,128,32);view.setFloat64(0,pts,true);view.setFloat64(8,delay,true);view.setInt32(16,serial,true);view.setUint32(24,1024,true);new Int32Array(memory.buffer,1024,12).set([1,0,0,0,320,180,0,0,0,0,0,0]);return {raw:{memory},call:async()=>128};}
const context=draw=>({save(){},restore(){},fillRect(){},translate(){},rotate(){},drawImage:draw});
function select(state,input){const result=core.selectRetainedFrame(state,input);return result.frame===null?result:{...result,state:core.armRetainedDraw(result.state,result.state.preparing.id,input.now).state};}
function append(state,timestamp,generation=1){return core.admitRetainedFrame(state,timestamp,generation).state;}
test('pure generation transition retires prior frame IDs before accepting the new owner',()=>{
 const initial=core.createPrivateRetainedPresentation(),first=core.admitRetainedFrame(initial,10,1),next=core.admitRetainedFrame(first.state,10,2);
 assert.deepEqual(next.close,[first.id]);assert.notEqual(next.id,first.id);assert.equal(next.state.closed,1);assert.equal(next.state.received,2);assert.equal(first.state.frames.length,1);assert.equal(initial.frames.length,0);
 const late=core.admitRetainedFrame(next.state,20,1);assert.equal(late.closeInput,true);assert.equal(late.id,null);assert.equal(late.state.dropped,1);
});
test('pure frame admission enforces16 retained surfaces and leaves rejected input with its caller',()=>{
 let state=core.createPrivateRetainedPresentation();for(let i=0;i<16;i++)state=append(state,i);const rejected=core.admitRetainedFrame(state,16,1);
 assert.match(rejected.error,/frame budget/);assert.equal(rejected.closeInput,false);assert.equal(rejected.state.frames.length,16);assert.equal(rejected.state.peakFrames,16);
 assert.match(core.admitRetainedFrame(state,0,1).error,/collision/);assert.match(core.admitRetainedFrame(state,NaN,1).error,/timestamp/);
});
test('pure seek rejects both old decoder epochs and preroll outside the150ms window',()=>{
 let state=append(core.createPrivateRetainedPresentation(),0,1);state=core.clearRetainedPresentation(state,3,2).state;
 const old=core.admitRetainedFrame(state,3000000,2);assert.equal(old.closeInput,true);state=old.state;
 const before=core.admitRetainedFrame(state,2849999,3);assert.equal(before.closeInput,true);state=before.state;
 const boundary=core.admitRetainedFrame(state,2850000,3);assert.notEqual(boundary.id,null);assert.equal(boundary.state.seekTarget,3);
});
for(const offset of [-1,0,1])test('pure native PTS selection tolerates '+offset+' microseconds and preserves owned input',()=>{
 let state=append(core.createPrivateRetainedPresentation(),500000+offset),before=state;const selection=select(state,{epoch:state.epoch,pts:.5,delay:25,serial:7,now:100});
 assert.equal(selection.frame,state.frames[0].id);assert.equal(selection.state.pending.due,125);assert.equal(selection.state.awaiting,false);assert.equal(selection.state.seekTarget,null);assert.equal(before.held,null);assert.ok(Object.isFrozen(selection.state.pending));
});
test('pure selection ignores retired snapshots and distinguishes startup from missing active output',()=>{
 let state=core.createPrivateRetainedPresentation();assert.equal(select(state,{epoch:0,pts:1,delay:0,serial:1,now:0}).error,null);state=append(state,0);
 const selected=select(state,{epoch:state.epoch,pts:0,delay:0,serial:1,now:0});state=selected.state;
 assert.match(select(state,{epoch:state.epoch,pts:1,delay:0,serial:2,now:0}).error,/unavailable/);
 const cleared=core.clearRetainedPresentation(state).state;assert.equal(select(cleared,{epoch:state.epoch,pts:0,delay:0,serial:1,now:0}).state,cleared);
});
test('pure due time controls drawing and stale draw completion cannot touch replacement state',()=>{
 let state=append(core.createPrivateRetainedPresentation(),0);state=select(state,{epoch:state.epoch,pts:0,delay:50,serial:1,now:100}).state;
 assert.equal(core.beginRetainedDraw(state,149).pending,null);const begin=core.beginRetainedDraw(state,150);assert.ok(begin.pending);assert.equal(begin.state.pending,null);assert.equal(core.beginRetainedDraw(begin.state,151).pending,null);
 const next=core.clearRetainedPresentation(begin.state).state;assert.equal(core.finishRetainedDraw(next,state.epoch),next);assert.equal(core.finishRetainedDraw(begin.state,state.epoch).presented,1);
});
test('pure varied seek/select/clear histories close every accepted identity once',()=>{
 let state=core.createPrivateRetainedPresentation();const accepted=new Set(),closed=new Set();
 const retire=ids=>{for(const id of ids){assert.equal(closed.has(id),false);assert.ok(accepted.has(id));closed.add(id);}};
 for(let epoch=1;epoch<=30;epoch++){
  for(let at=0;at<8;at++){const next=core.admitRetainedFrame(state,at*100000,epoch);retire(next.close);state=next.state;if(next.id!==null)accepted.add(next.id);}
  const selection=select(state,{epoch:state.epoch,pts:.4,delay:0,serial:epoch,now:epoch});retire(selection.close);state=selection.state;
  const clear=core.clearRetainedPresentation(state);retire(clear.close);state=clear.state;assert.equal(state.frames.length,0);assert.equal(state.held,null);
 }
 assert.equal(accepted.size,closed.size);assert.equal(state.closed,accepted.size);
});
test('actual generation close callback can clear the newly admitted frame without reviving ownership',()=>{
 const p=new PrivateRetainedPresentation(),old=frame(0),next=frame(0);p.enqueue(old,1);old.onClose=()=>p.clear();p.enqueue(next,2);assert.equal(old.closed,1);assert.equal(next.closed,1);assert.equal(p.snapshot().queued,0);assert.equal(p.owned.size,0);
});
test('actual clear commits retirement before a closing frame synchronously reenters clear',()=>{
 const p=new PrivateRetainedPresentation(),first=frame(0),second=frame(1);p.enqueue(first,1);p.enqueue(second,1);first.onClose=()=>p.clear();p.clear();assert.equal(first.closed,1);assert.equal(second.closed,1);assert.equal(p.snapshot().closed,2);
});
test('actual canvas callback cannot finish an old draw after a reentrant seek',async()=>{
 const p=new PrivateRetainedPresentation({now:()=>100}),selected=frame(0);p.enqueue(selected,1);await p.select(oracle(0),{});const result=p.present(context(()=>p.clear(2)),{width:320,height:180});assert.equal(result,false);assert.equal(selected.closed,1);assert.equal(p.seekTarget,2);assert.equal(p.snapshot().presented,0);assert.equal(p.pending,null);
});
test('actual suspended snapshot cannot select a new source frame with identical PTS',async()=>{
 const p=new PrivateRetainedPresentation(),old=frame(0),next=frame(0),engine=oracle(0);let resolve;engine.call=()=>new Promise(yes=>resolve=yes);p.enqueue(old,1);const selection=p.select(engine,{});p.clear();p.enqueue(next,2);resolve(128);await selection;assert.equal(p.held,null);assert.equal(p.frames.get(0),next);assert.equal(p.snapshot().pending,0);p.clear();
});

test('pure selection cannot draw before overlay preparation arms the observed deadline',()=>{
 let state=append(core.createPrivateRetainedPresentation(),0);const selected=core.selectRetainedFrame(state,{epoch:state.epoch,pts:0,delay:25,serial:3});state=selected.state;assert.equal(core.beginRetainedDraw(state,1000).pending,null);
 const armed=core.armRetainedDraw(state,state.preparing.id,500);assert.equal(armed.state.pending.due,525);assert.equal(core.armRetainedDraw(armed.state,state.preparing.id,600).accepted,false);
});
test('actual frame cleanup failure still releases every other retired frame',()=>{
 const p=new PrivateRetainedPresentation(),first=frame(0),second=frame(1);p.enqueue(first,1);p.enqueue(second,1);first.onClose=()=>{throw Error('frame close failed');};assert.throws(()=>p.clear(),/frame close failed/);assert.equal(first.closed,1);assert.equal(second.closed,1);assert.equal(p.owned.size,0);assert.equal(p.frames.size,0);
});
test('actual reentrant present during selection cannot draw an unprepared replacement',async()=>{
 const p=new PrivateRetainedPresentation({now:()=>0}),old=frame(0),next=frame(1000000);p.enqueue(old,1);p.enqueue(next,1);await p.select(oracle(0),{});let result;old.onClose=()=>{result=p.present(context(()=>{throw Error('unprepared draw');}),{width:320,height:180});};await p.select(oracle(1),{});assert.equal(result,false);assert.equal(p.held,next);p.clear();
});
for(const reenter of [false,true])test('actual failed generation cleanup returns incoming ownership to caller'+(reenter?' after reentrant clear':''),()=>{
 const p=new PrivateRetainedPresentation(),old=frame(0),next=frame(0);p.enqueue(old,1);old.onClose=()=>{if(reenter)p.clear();throw Error('old frame cleanup failed');};
 assert.throws(()=>p.enqueue(next,2),/old frame cleanup failed/);assert.equal(next.closed,0,'a throwing enqueue must leave input owned by caller');next.close();p.clear();assert.equal(next.closed,1);assert.equal(p.owned.size,0);
});

// Real decoder service + cooperative mailbox + presenter. The scheduler test
// double exposes native resume explicitly; no browser/native output claim.
import {PrivateRetainedDecoder} from '../../web/private-mpv/retained-decoder.js';
import {CooperativeDecoderMailbox} from '../../web/private-mpv/decoder-mailbox.js';
class Decoder {
 static async isConfigSupported(config){return {supported:true,config};}
 constructor(callbacks){this.callbacks=callbacks;this.decodeQueueSize=0;this.state='unconfigured';Decoder.current=this;}
 addEventListener(){}configure(){this.state='configured';}decode(){}flush(){return Promise.resolve();}close(){this.state='closed';}
}
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function pipeline(){
 let wait,wakes=0;const memory=new WebAssembly.Memory({initial:130}),ptr=128,header=new Int32Array(memory.buffer,ptr,16);header[4]=0;
 const presentation=new PrivateRetainedPresentation({now:()=>0,onCapacity:()=>service.capacityChanged()});
 const service=new PrivateRetainedDecoder({Decoder,Chunk:class{},wakeup:()=>wakes++,canReceive:(frame,generation)=>presentation.canReceive(frame,generation)});
 const scheduler={wrapImport:(_name,fn)=>fn,onStop:()=>()=>{},park(arm){wait={task:{},ready:false};arm(wait);return 'parked';},readyWait(current){current.ready=true;}};
 const mailbox=new CooperativeDecoderMailbox(scheduler,service,{onFrame:(frame,generation)=>presentation.enqueue(frame,generation)});mailbox.attach(memory);
 const input={operation:1,fields:[0,0,0,0,3,320,180,1,8,0,0,0,0,3,0,0],bytes:new Uint8Array([1,2,3]),timestamp:0,duration:33333};
 return{presentation,service,mailbox,get wakes(){return wakes;},get wait(){return wait;},async init(){await service.execute(input,new AbortController().signal);},beginReceive(){assert.equal(mailbox.request(ptr,4),'parked');},async finishReceive(){await turn();assert.equal(wait.ready,true,'an admissible result must release the parked native task');return wait.task.resumeAction();},async receive(){this.beginReceive();return this.finishReceive();},output(timestamp){const output=frame(timestamp);output.duration=33333;output.colorSpace={};Decoder.current.callbacks.output(output);return output;},close(){mailbox.close();presentation.clear();}};
}
test('actual decoder backpressure parks native receive, preserves the17th frame and wakes when selection frees capacity',async()=>{
 const p=pipeline();await p.init();const outputs=[];
 try{
  for(let i=0;i<16;i++){outputs.push(p.output(i*100000));assert.equal(await p.receive(),1);}
  const blocked=p.output(1600000);outputs.push(blocked);p.beginReceive();await turn();
  for(let retry=0;retry<3;retry++){p.service.capacityChanged();await turn();assert.equal(p.wait.ready,false);}
  assert.equal(p.service.snapshot().blockedReceives,1);assert.equal(p.service.snapshot().maxConsecutiveBlockedReceives,1);assert.equal(p.mailbox.snapshot().pending,1);assert.equal(p.mailbox.snapshot().timers,1);assert.equal(p.presentation.snapshot().queued,16);assert.equal(p.service.snapshot().queued,1);assert.equal(blocked.closed,0);assert.equal(p.mailbox.snapshot().errors,0);
  // A selected native timestamp already delivered to the native filter frees
  // ownership independently of the blocked receive, so no new frame is needed.
  await p.presentation.select(oracle(.1),{});assert.equal(p.presentation.held,outputs[1]);assert.equal(outputs[0].closed,1);
  assert.equal(await p.finishReceive(),1);assert.equal(p.service.snapshot().queued,0);assert.equal(p.service.snapshot().capacityResumes,1);assert.equal(p.presentation.snapshot().peakFrames,16);assert.equal(p.presentation.frames.get(1600000),blocked);assert.equal(p.mailbox.snapshot().errors,0);
 }finally{p.close();}assert.ok(outputs.every(output=>output.closed===1));
});
test('actual full presenter still consumes retired seek preroll without deadlocking its capacity',async()=>{
 const p=pipeline();await p.init();const outputs=[];
 try{
  p.presentation.clear(5,0);
  for(let i=0;i<16;i++){outputs.push(p.output(5000000+i*100000));assert.equal(await p.receive(),1);}
  const preroll=p.output(1000000);outputs.push(preroll);assert.equal(await p.receive(),1);assert.equal(preroll.closed,1);assert.equal(p.presentation.snapshot().queued,16);assert.equal(p.mailbox.snapshot().errors,0);
 }finally{p.close();}assert.ok(outputs.every(output=>output.closed===1));
});
test('actual pressure followed by decoder reset retires queued frames and ignores late browser callbacks',async()=>{
 const p=pipeline();await p.init();const outputs=[];let late;
 try{
  for(let i=0;i<16;i++){outputs.push(p.output(i*100000));assert.equal(await p.receive(),1);}
  const blocked=p.output(2000000);outputs.push(blocked);p.beginReceive();await turn();assert.equal(p.wait.ready,false);const old=Decoder.current;
  p.mailbox.cancel();assert.equal(await p.finishReceive(),-29);p.presentation.clear(3,p.service.generation);await p.service.execute({operation:6},new AbortController().signal);assert.equal(blocked.closed,1);
  late=frame(3000000);old.callbacks.output(late);assert.equal(late.closed,1);
  const current=p.output(3000000);outputs.push(current);assert.equal(await p.receive(),1);await p.presentation.select(oracle(3),{});assert.equal(p.presentation.held,current);
 }finally{p.close();}assert.ok(outputs.every(output=>output.closed===1));assert.equal(late.closed,1);
});
test('pure pressure admission retains bounded capacity while allowing discardable or invalid input to settle',()=>{
 let state=core.createPrivateRetainedPresentation();for(let i=0;i<16;i++)state=append(state,i,1);
 assert.equal(core.canReceiveRetainedFrame(state,16,1),false);assert.equal(core.canReceiveRetainedFrame(state,16,2),true);assert.equal(core.canReceiveRetainedFrame(state,16,0),true);assert.equal(core.canReceiveRetainedFrame(state,0,1),true);assert.equal(core.canReceiveRetainedFrame(state,NaN,1),true);
});
