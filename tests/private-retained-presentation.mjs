// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrivateRetainedPresentation} from '../web/private-mpv/retained-presentation.js';
function oracle(pts,delay=0){
 const memory=new WebAssembly.Memory({initial:1}),view=new DataView(memory.buffer,128,32);
 view.setFloat64(0,pts,true);view.setFloat64(8,delay,true);view.setInt32(16,1,true);view.setUint32(24,1024,true);
 new Int32Array(memory.buffer,1024,12).set([1,0,0,0,320,180,0,0,0,0,0,0]);
 return {raw:{memory},call:async name=>{assert.equal(name,'web_selected_snapshot');return 128;}};
}
const frame=timestamp=>({timestamp,visibleRect:{x:0,y:0,width:320,height:180},closed:0,close(){this.closed++;}});
test('native selected PTS and deadline govern the actual retained frame',async()=>{
 let now=0;const presentation=new PrivateRetainedPresentation({now:()=>now}),early=frame(0),selected=frame(500000),later=frame(1000000),drawn=[];
 const context={save(){},restore(){},fillRect(){},translate(){},rotate(){},drawImage:f=>drawn.push(f)};
 presentation.enqueue(early,1);presentation.enqueue(selected,1);presentation.enqueue(later,1);
 await presentation.select(oracle(.5,1000),{});assert.equal(early.closed,1);
 assert.equal(presentation.present(context,{width:320,height:180}),false);assert.equal(drawn.length,0);
 now=1000;assert.equal(presentation.present(context,{width:320,height:180}),true);assert.deepEqual(drawn,[selected]);
 assert.equal(selected.closed,0);assert.equal(later.closed,0);presentation.clear();assert.equal(selected.closed,1);assert.equal(later.closed,1);
});
test('new decoder generation retires old frame ownership and ignores stale callbacks',()=>{
 const p=new PrivateRetainedPresentation(),old=frame(0),current=frame(0),late=frame(1);
 p.enqueue(old,1);p.enqueue(current,2);assert.equal(old.closed,1);p.enqueue(late,1);assert.equal(late.closed,1);
 assert.equal(p.snapshot().queued,1);p.clear();assert.equal(current.closed,1);
});
test('seek startup can await its first matching frame but active missing output fails',async()=>{
 const p=new PrivateRetainedPresentation();await p.select(oracle(.5),{});assert.equal(p.pending,undefined);
 const selected=frame(500000);p.enqueue(selected,1);await p.select(oracle(.5),{});
 await assert.rejects(p.select(oracle(1),{}),/Selected retained frame is unavailable/);p.clear();assert.equal(selected.closed,1);
});
test('retained collision rejection preserves existing ownership',()=>{
 const p=new PrivateRetainedPresentation(),first=frame(0),collision=frame(0);p.enqueue(first,1);
 assert.throws(()=>p.enqueue(collision,1),/timestamp collision/);assert.equal(first.closed,0);collision.close();p.clear();assert.equal(first.closed,1);
});
test('seek preroll surfaces are retired while native timing can advance',async()=>{
 const p=new PrivateRetainedPresentation();p.clear(2.5);
 const frames=Array.from({length:80},(_,i)=>frame(Math.round(i/30*1e6)));
 for(const f of frames)p.enqueue(f,2);
 assert.equal(p.frames.size,9);assert.equal(p.snapshot().closed,71);assert.equal(p.seekTarget,2.5);
 await p.select(oracle(2.5),{});assert.equal(p.held.timestamp,2500000);assert.equal(p.seekTarget,undefined);p.clear();assert.ok(frames.every(f=>f.closed===1));
});
test('old decoder frames cannot clear the seek filter before reset',async()=>{
 const p=new PrivateRetainedPresentation(),old=frame(6000000),late=frame(6000000);
 p.enqueue(old,1);p.clear(6);p.enqueue(late,1);await p.select(oracle(6),{});
 assert.equal(late.closed,1);assert.equal(p.seekTarget,6);
 const preroll=Array.from({length:180},(_,i)=>frame(Math.round(i/30*1e6)));
 for(const f of preroll)p.enqueue(f,2);
 assert.ok(p.frames.size<16);assert.equal(p.seekTarget,6);
 const selected=frame(6000000);p.enqueue(selected,2);await p.select(oracle(6),{});
 assert.equal(p.held,selected);assert.equal(p.seekTarget,undefined);p.clear();
 assert.ok([old,late,selected,...preroll].every(f=>f.closed===1));
});
test('a snapshot suspended across clear cannot select replacement frames with the same PTS',async()=>{
 const p=new PrivateRetainedPresentation(),old=frame(6000000),next=frame(6000000),engine=oracle(6);let finish;
 p.enqueue(old,1);engine.call=()=>new Promise(resolve=>finish=resolve);const selection=p.select(engine,{});
 p.clear(6);p.enqueue(next,2);finish(128);await selection;
 assert.equal(p.seekTarget,6);assert.equal(p.held,null);
 await p.select(oracle(6),{});assert.equal(p.held,next);p.clear();assert.equal(old.closed,1);assert.equal(next.closed,1);
});
test('seek uses the decoder epoch even when no frame from that epoch has arrived',()=>{
 const p=new PrivateRetainedPresentation();p.enqueue(frame(0),1);p.clear(6,2);
 const late=frame(6000000);p.enqueue(late,2);assert.equal(late.closed,1);assert.equal(p.seekTarget,6);
 const next=frame(6000000);p.enqueue(next,3);assert.equal(p.frames.get(6000000),next);p.clear();assert.equal(next.closed,1);
});
