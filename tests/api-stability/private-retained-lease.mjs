// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as presentationCore from '../../web/generated/internal/machine/private-retained-presentation.js';
import * as decoderCore from '../../web/generated/internal/machine/private-retained-decoder.js';
import {validDecoderFrameIdentity} from '../../web/generated/internal/machine/private-decoder-mailbox.js';
import {PrivateRetainedPresentation} from '../../web/private-mpv/retained-presentation.js';
import {PrivateRetainedDecoder} from '../../web/private-mpv/retained-decoder.js';
import {CooperativeDecoderMailbox} from '../../web/private-mpv/decoder-mailbox.js';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const frame=timestamp=>({timestamp,duration:33333,visibleRect:{width:320,height:180},colorSpace:{},closed:0,close(){this.closed++;this.onClose?.();}});

test('pure native final release closes only its exact queued generation and identity',()=>{
 let state=presentationCore.createPrivateRetainedPresentation();
 const first=presentationCore.admitRetainedFrame(state,100,7,41),second=presentationCore.admitRetainedFrame(first.state,200,7,42);state=second.state;
 for(const [generation,id] of [[6,41],[8,41],[7,99],[7,0],[7,NaN]])assert.equal(presentationCore.releaseRetainedNativeFrame(state,generation,id).state,state);
 const released=presentationCore.releaseRetainedNativeFrame(state,7,41);assert.deepEqual(released.close,[first.id]);assert.equal(released.state.frames[0].id,second.id);assert.equal(released.state.nativeReleased,1);assert.equal(state.frames.length,2);
 assert.equal(presentationCore.releaseRetainedNativeFrame(released.state,7,41).state,released.state);
});
test('pure native release preserves held, prepared and pending redraw output',()=>{
 const admitted=presentationCore.admitRetainedFrame(presentationCore.createPrivateRetainedPresentation(),1000000,7,41);
 const selected=presentationCore.selectRetainedFrame(admitted.state,{epoch:admitted.state.epoch,pts:1,delay:20,serial:4}).state;
 assert.equal(presentationCore.releaseRetainedNativeFrame(selected,7,41).state,selected);
 const armed=presentationCore.armRetainedDraw(selected,selected.preparing.id,100).state;
 assert.equal(presentationCore.releaseRetainedNativeFrame(armed,7,41).state,armed);assert.equal(armed.pending.due,120);
 assert.deepEqual(presentationCore.clearRetainedPresentation(armed).close,[admitted.id]);
});
test('pure lease identities reject collision and bounded-integer overflow without reuse',()=>{
 for(const pair of [[0,1],[1,0],[-1,1],[1,-1],[2147483648,1],[1,2147483648],[1,1.5]])assert.equal(validDecoderFrameIdentity(...pair),false);
 assert.equal(validDecoderFrameIdentity(2147483647,2147483647),true);
 const state=presentationCore.admitRetainedFrame(presentationCore.createPrivateRetainedPresentation(),0,7,41).state;
 assert.match(presentationCore.admitRetainedFrame(state,1,7,41).error,/identity collision/);
 let decoder=decoderCore.retireRetainedDecoder(decoderCore.initialRetainedDecoder()).state;
 const checked=decoderCore.checkRetainedConfiguration(decoder,decoder.generation),active=decoderCore.activateRetainedDecoder(checked.state,decoder.generation,checked.id);decoder={...active.state,frameSerial:2147483647};
 const exhausted=decoderCore.acceptRetainedDecoderFrame(decoder,active.scope);assert.equal(exhausted.id,null);assert.equal(exhausted.state.failed,true);assert.equal(exhausted.state.frames.length,0);
 assert.equal(decoderCore.activateRetainedDecoder({...checked.state,generation:2147483648},2147483648,checked.id).scope,null);
});
test('varied release seek replacement and selected-frame histories retire every owned identity once',()=>{
 let state=presentationCore.createPrivateRetainedPresentation();const admitted=new Set(),closed=new Set();
 const retire=ids=>{for(const id of ids){assert.ok(admitted.has(id));assert.equal(closed.has(id),false);closed.add(id);}};
 for(let generation=1;generation<=40;generation++){
  for(let i=1;i<=8;i++){const next=presentationCore.admitRetainedFrame(state,i*100000,generation,i);retire(next.close);state=next.state;admitted.add(next.id);}
  for(const id of [2,4,2,6]){const next=presentationCore.releaseRetainedNativeFrame(state,generation,id);state=next.state;retire(next.close);}
  const selected=presentationCore.selectRetainedFrame(state,{epoch:state.epoch,pts:.7,delay:0,serial:generation});state=selected.state;retire(selected.close);
  assert.equal(presentationCore.releaseRetainedNativeFrame(state,generation,7).state,state);
  const clear=presentationCore.clearRetainedPresentation(state,2,generation);state=clear.state;retire(clear.close);
  assert.equal(presentationCore.releaseRetainedNativeFrame(state,generation,8).state,state);
  state=presentationCore.clearRetainedPresentation(state).state;
 }
 assert.equal(admitted.size,320);assert.equal(closed.size,320);
});

function mailbox(service,options={}){
 let wait;const scheduler={wrapImport:(_name,fn)=>fn,onStop:()=>()=>{},park(arm){wait={task:{},ready:false};arm(wait);return 'parked';},readyWait(entry){entry.ready=true;}};
 const memory=new WebAssembly.Memory({initial:130}),ptr=128,header=new Int32Array(memory.buffer,ptr,16);
 const box=new CooperativeDecoderMailbox(scheduler,service,{retainedLease:true,...options});box.attach(memory);
 return {box,memory,ptr,header,get wait(){return wait;},async receive(){assert.equal(box.request(ptr,4),'parked');await turn();assert.equal(wait.ready,true);return wait.task.resumeAction();}};
}
test('actual mailbox publishes identity after frame transfer and routes non-suspending release',async()=>{
 const output=frame(0),seen=[],h=mailbox({execute:async()=>({result:1,frame:output,generation:7,frameId:41}),cancel(){}},{onFrame:(...args)=>seen.push(args),onReleaseFrame:(...args)=>seen.push(args)});
 try{assert.equal(await h.receive(),1);assert.deepEqual(seen,[[output,7,41]]);assert.deepEqual([...h.header.slice(13,16)],[7,41,1]);assert.equal(h.box.imports.release(7,41),undefined);assert.deepEqual(seen[1],[7,41]);}finally{h.box.close();output.close();}
});
test('actual old-native mailbox ignores lease metadata and leaves reserved ABI fields unchanged',async()=>{
 const output=frame(0),seen=[],h=mailbox({execute:async()=>({result:1,frame:output,generation:7,frameId:41}),cancel(){}},{retainedLease:false,onFrame:(...args)=>seen.push(args),onReleaseFrame:()=>assert.fail('legacy release')});
 h.header.set([91,92,93],13);try{assert.equal(await h.receive(),1);assert.deepEqual(seen,[[output,7,null]]);assert.deepEqual([...h.header.slice(13,16)],[91,92,93]);h.box.imports.release(7,41);}finally{h.box.close();output.close();}
});
test('actual malformed native identity rejects output and closes the untransferred surface',async()=>{
 const output=frame(0),h=mailbox({execute:async()=>({result:1,frame:output,generation:7,frameId:2147483648}),cancel(){}},{onFrame:()=>assert.fail('invalid native publication')});
 try{assert.equal(await h.receive(),-29);assert.equal(output.closed,1);assert.match(h.box.snapshot().error,/native frame identity/);assert.equal(h.header[13],0);}finally{h.box.close();}
});
test('actual release after close and malformed native callbacks cannot touch presentation',()=>{
 const seen=[],h=mailbox({execute:async()=>({result:0}),cancel(){}},{onReleaseFrame:(...args)=>seen.push(args)});
 for(const pair of [[0,1],[1,-1],[1,2147483648],[NaN,1]])h.box.imports.release(...pair);assert.deepEqual(seen,[]);
 h.box.close();h.box.imports.release(7,41);assert.deepEqual(seen,[]);
});
test('actual throwing frame cleanup cannot unwind a native destructor or skip other retirement',()=>{
 const p=new PrivateRetainedPresentation(),output=frame(0);p.enqueue(output,7,41);output.onClose=()=>{throw Error('frame cleanup failed');};
 const h=mailbox({execute:async()=>({result:0}),cancel(){}},{onReleaseFrame:(generation,id)=>p.releaseNative(generation,id)});
 assert.doesNotThrow(()=>h.box.imports.release(7,41));assert.equal(output.closed,1);assert.equal(p.frames.size,0);assert.match(h.box.snapshot().error,/frame cleanup failed/);assert.equal(h.box.machine.failure,'presentation');h.box.close();
});
test('actual release cleanup reentry cannot duplicate-close the released frame or revive it',()=>{
 const p=new PrivateRetainedPresentation(),first=frame(0),second=frame(1);p.enqueue(first,7,41);p.enqueue(second,7,42);first.onClose=()=>{p.releaseNative(7,41);p.clear();};p.releaseNative(7,41);assert.equal(first.closed,1);assert.equal(second.closed,1);assert.equal(p.owned.size,0);
});

class Decoder{
 static async isConfigSupported(config){return {supported:true,config};}
 constructor(callbacks){this.callbacks=callbacks;this.decodeQueueSize=0;this.state='unconfigured';Decoder.current=this;}
 addEventListener(){}configure(){this.state='configured';}decode(){}flush(){return Promise.resolve();}close(){this.state='closed';}
}
test('actual native release unblocks the parked17th receive without raising the16-frame cap',async()=>{
 const p=new PrivateRetainedPresentation({onCapacity:()=>service.capacityChanged()});
 const service=new PrivateRetainedDecoder({Decoder,Chunk:class{},canReceive:(output,generation)=>p.canReceive(output,generation)});
 const h=mailbox(service,{onFrame:(output,generation,id)=>p.enqueue(output,generation,id),onReleaseFrame:(generation,id)=>p.releaseNative(generation,id)}),outputs=[];
 try{
  await service.execute({operation:1,fields:[0,0,0,0,3,320,180,1,8,0,0,0,0,3,0,0],bytes:new Uint8Array([1,2,3]),timestamp:0,duration:33333},new AbortController().signal);
  for(let i=0;i<16;i++){const output=frame(i*33333);outputs.push(output);Decoder.current.callbacks.output(output);assert.equal(await h.receive(),1);}
  const next=frame(16*33333);outputs.push(next);Decoder.current.callbacks.output(next);assert.equal(h.box.request(h.ptr,4),'parked');await turn();assert.equal(h.wait.ready,false);assert.equal(service.snapshot().blockedReceives,1);
  h.box.imports.release(service.generation,1);await turn();assert.equal(h.wait.ready,true);assert.equal(h.wait.task.resumeAction(),1);assert.equal(outputs[0].closed,1);assert.equal(p.snapshot().queued,16);assert.equal(p.snapshot().nativeReleased,1);assert.equal(p.snapshot().peakFrames,16);assert.equal(service.snapshot().capacityResumes,1);
  h.box.imports.release(service.generation,1);assert.equal(outputs[0].closed,1);assert.equal(p.snapshot().queued,16);
 }finally{h.box.close();p.clear();}
 assert.equal(outputs.length,17);assert.ok(outputs.every(output=>output.closed===1));
});
test('actual native release after seek cannot close a successor with identical PTS',()=>{
 const p=new PrivateRetainedPresentation(),old=frame(100),next=frame(100);p.enqueue(old,7,41);p.clear();p.enqueue(next,8,41);p.releaseNative(7,41);assert.equal(old.closed,1);assert.equal(next.closed,0);p.releaseNative(8,41);assert.equal(next.closed,1);p.clear();assert.equal(next.closed,1);
});
test('actual native final free preserves the selected delayed draw until presentation clears it',async()=>{
 let now=0;const p=new PrivateRetainedPresentation({now:()=>now}),output=frame(1000000),memory=new WebAssembly.Memory({initial:1}),view=new DataView(memory.buffer,128,32);
 view.setFloat64(0,1,true);view.setFloat64(8,20,true);view.setInt32(16,1,true);view.setUint32(24,1024,true);new Int32Array(memory.buffer,1024,12).set([1,0,0,0,320,180,0,0,0,0,0,0]);
 p.enqueue(output,7,41);await p.select({raw:{memory},call:async()=>128},{});p.releaseNative(7,41);assert.equal(output.closed,0);assert.equal(p.held,output);assert.equal(p.snapshot().pending,1);
 const drawn=[],context={save(){},restore(){},fillRect(){},translate(){},rotate(){},drawImage(value){drawn.push(value);}};
 assert.equal(p.present(context,{width:320,height:180}),false);now=20;assert.equal(p.present(context,{width:320,height:180}),true);assert.deepEqual(drawn,[output]);p.clear();assert.equal(output.closed,1);
});
