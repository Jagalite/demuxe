// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../../web/generated/internal/machine/private-retained-decoder.js';
import {PrivateRetainedDecoder} from '../../web/private-mpv/retained-decoder.js';
const accept=(s,g,pts=s.frameSerial+1)=>core.acceptRetainedDecoderFrame(s,g,pts);
function ready(previous=core.initialRetainedDecoder()){
 let state=core.retireRetainedDecoder(previous,true).state;const check=core.checkRetainedConfiguration(state,state.generation);state=check.state;return core.activateRetainedDecoder(state,state.generation,check.id);
}
test('configuration and callback scopes retire independently from monotonically allocated frames',()=>{
 const first=ready(),frame=accept(first.state,first.scope),next=ready(frame.state);
 assert.deepEqual(core.retireRetainedDecoder(frame.state).close,[frame.id]);assert.equal(accept(next.state,first.scope).id,null);
 assert.equal(core.activateRetainedDecoder(next.state,first.scope.generation).scope,null);assert.equal(core.failRetainedDecoder(next.state,first.scope),next.state);
 const current=accept(next.state,next.scope);assert.ok(current.id>frame.id);assert.equal(frame.state.frames.length,1);assert.ok(Object.isFrozen(current.state.frames));
});
test('only the latest support check can activate a configuration within one generation',()=>{
 let state=core.retireRetainedDecoder(core.initialRetainedDecoder(),true).state;const first=core.checkRetainedConfiguration(state,state.generation),second=core.checkRetainedConfiguration(first.state,state.generation);
 assert.equal(core.activateRetainedDecoder(second.state,state.generation,first.id).scope,null);assert.ok(core.activateRetainedDecoder(second.state,state.generation,second.id).scope);
});
test('decoder ownership stays at32 and packet admission includes retained browser outputs in its8 window',()=>{
 let {state,scope}=ready();for(let i=0;i<32;i++)state=accept(state,scope).state;
 const overflow=accept(state,scope);assert.equal(overflow.id,null);assert.equal(overflow.overflow,true);assert.equal(overflow.state.frames.length,32);assert.equal(overflow.state.stats.peakFrames,32);
 const packet={queuedPackets:0,size:3,timestamp:0,duration:0};assert.equal(core.retainedPacketPolicy(state,packet),'again');
 const base=ready();assert.equal(core.retainedPacketPolicy(base.state,{...packet,queuedPackets:8}),'again');assert.equal(core.retainedPacketPolicy(base.state,{...packet,queuedPackets:7}),'submit');
 for(const patch of [{size:0},{timestamp:NaN},{duration:-1}])assert.equal(core.retainedPacketPolicy(base.state,{...packet,...patch}),'invalid');
 assert.equal(core.retainedPacketPolicy(base.state,{...packet,size:0,queuedPackets:8}),'again','backpressure precedes packet validation');
});
test('full presenter reserves one capacity wait and never consumes a queued frame until explicit capacity release',()=>{
 const initial=ready(),admitted=accept(initial.state,initial.scope),blocked=core.receiveRetainedDecoderFrame(admitted.state,0,false);
 assert.ok(blocked.wait);assert.equal(blocked.id,null);assert.deepEqual(blocked.state.frames,[admitted.id]);assert.equal(blocked.state.stats.blockedReceives,1);
 const duplicate=core.receiveRetainedDecoderFrame(blocked.state,0,false);assert.equal(duplicate.state,blocked.state);assert.equal(duplicate.wait,blocked.wait);
 const cleared=core.releaseRetainedDecoderCapacity(blocked.state,blocked.wait),receive=core.receiveRetainedDecoderFrame(cleared,0,true);assert.equal(receive.id,admitted.id);assert.equal(receive.resumed,true);assert.equal(receive.state.frames.length,0);
 const delivered=core.deliveredRetainedFrame(receive.state,initial.scope,true);assert.equal(delivered.stats.delivered,1);assert.equal(delivered.stats.capacityResumes,1);
 const retired=core.retireRetainedDecoder(blocked.state).state;assert.equal(retired.wait,null);assert.equal(core.releaseRetainedDecoderCapacity(retired,blocked.wait),retired);
});
test('drain starts once, waits for browser completion and rejects old-generation flush and delivery',()=>{
 const initial=ready(),drain=core.drainRetainedDecoder(initial.state);assert.ok(drain.scope);assert.equal(core.drainRetainedDecoder(drain.state).scope,null);
 assert.equal(core.receiveRetainedDecoderFrame(drain.state,0,true).result,0);
 const flushed=core.flushedRetainedDecoder(drain.state,drain.scope);assert.equal(core.receiveRetainedDecoderFrame(flushed,0,true).result,-541478725);
 const retired=core.retireRetainedDecoder(flushed).state;assert.equal(core.flushedRetainedDecoder(retired,drain.scope),retired);assert.equal(core.deliveredRetainedFrame(retired,drain.scope,true),retired);
 const empty=ready();assert.equal(core.receiveRetainedDecoderFrame(empty.state,0,true).result,-6);assert.equal(core.receiveRetainedDecoderFrame(empty.state,8,true).result,0);
});
test('deferred VP9 configuration survives reset but explicit close retires its source policy',()=>{
 const initial=core.initialRetainedDecoder(),pending=core.pendingRetainedConfiguration(initial,0);assert.equal(pending.pending,true);assert.equal(core.retireRetainedDecoder(pending).state.pending,true);assert.equal(core.retireRetainedDecoder(pending,true).state.pending,false);
 const policy={kind:4,width:320,height:180,profile:-1,depth:0,inBandHEVC:false};assert.equal(core.retainedSourcePolicy(policy,320*180).pending,true);
 assert.match(core.retainedSourcePolicy({...policy,width:321},320*180).error,/dimensions/);assert.match(core.retainedSourcePolicy({...policy,kind:2,inBandHEVC:true},320*180).error,/HEVC/);
});
test('varied reset output and receive histories keep old state immutable and close each queued identity once',()=>{
 let state=core.initialRetainedDecoder();const closed=new Set(),accepted=new Set();
 for(let generation=0;generation<40;generation++){
  const activated=ready(state);state=activated.state;
  for(let i=0;i<(generation%12)+1;i++){const old=state,serialized=JSON.stringify(old),next=accept(state,activated.scope);assert.equal(JSON.stringify(old),serialized);state=next.state;accepted.add(next.id);}
  const received=core.receiveRetainedDecoderFrame(state,0,true);state=received.state;closed.add(received.id);
  const retired=core.retireRetainedDecoder(state);for(const id of retired.close){assert.equal(closed.has(id),false);closed.add(id);}state=retired.state;
 }
 assert.equal(accepted.size,closed.size);assert.equal(state.frames.length,0);assert.equal(state.wait,null);
});
class Decoder {
 static instances=[];static async isConfigSupported(){return {supported:true};}
 constructor(callbacks){this.callbacks=callbacks;this.decodeQueueSize=0;this.state='unconfigured';Decoder.instances.push(this);}
 addEventListener(){}configure(){this.state='configured';this.onConfigure?.();}decode(){}flush(){return Promise.resolve();}close(){this.state='closed';const callback=this.onClose;this.onClose=null;callback?.();}
}
const input=operation=>({operation,fields:[0,0,0,0,3,320,180,1,8,0,0,0,0,3,0,0],bytes:new Uint8Array([1,2,3]),timestamp:100000,duration:33333});
const signal=()=>new AbortController().signal;
const frame=()=>({visibleRect:{width:320,height:180},timestamp:100000,duration:33333,colorSpace:{},closed:0,close(){this.closed++;this.onClose?.();}});
const service=options=>new PrivateRetainedDecoder({Decoder,Chunk:class{constructor(value){Object.assign(this,value);}},...options});
const turn=()=>new Promise(resolve=>setImmediate(resolve));
test('actual decoder retirement detaches its old wrapper before a browser close reconfigures a successor',async()=>{
 const s=service();await s.execute(input(1),signal());const old=Decoder.instances.at(-1);let replacement;old.onClose=()=>{replacement=s.execute(input(6),signal());};s.cancel();await replacement;
 assert.equal(s.snapshot().active,true);assert.equal(s.snapshot().resets,1);assert.notEqual(Decoder.instances.at(-1),old);const output=frame();Decoder.instances.at(-1).callbacks.output(output);assert.equal((await s.execute(input(4),signal())).frame,output);output.close();s.cancel();
});
test('actual queued-frame close reentry cannot erase successor outputs',async()=>{
 const s=service();await s.execute(input(1),signal());const old=frame(),next=frame();Decoder.instances.at(-1).callbacks.output(old);let replacement;
 old.onClose=()=>{old.onClose=null;replacement=s.execute(input(6),signal());Decoder.instances.at(-1).callbacks.output(next);};s.cancel();await replacement;
 assert.equal(old.closed,1);assert.equal(next.closed,0);assert.equal(s.snapshot().queued,1);assert.equal((await s.execute(input(4),signal())).frame,next);next.close();s.cancel();
});
test('actual support completion after close cannot create a decoder or overwrite a later source',async()=>{
 let resolve;class Deferred extends Decoder{static isConfigSupported(){return new Promise(yes=>resolve=yes);}}
 const s=service({Decoder:Deferred}),opening=s.execute(input(1),signal());await turn();await s.execute(input(5),signal());resolve({supported:true});await assert.rejects(opening,/generation replaced/);assert.equal(s.snapshot().active,false);assert.equal(s.configuration,null);s.cancel();
});
test('actual blocked receive keeps its frame on signal abort and removes its capacity listener',async()=>{
 const s=service({canReceive:()=>false});await s.execute(input(1),signal());const output=frame();Decoder.instances.at(-1).callbacks.output(output);const controller=new AbortController(),receive=s.execute(input(4),controller.signal);await turn();assert.equal(s.machine.wait!==null,true);
 controller.abort(Error('caller retired'));await assert.rejects(receive,/caller retired/);assert.equal(s.machine.wait,null);assert.equal(s.capacityWait,null);assert.equal(output.closed,0);s.cancel();assert.equal(output.closed,1);
});
test('actual duplicate receive cannot cancel the original parked capacity waiter',async()=>{
 let capacity=false;const s=service({canReceive:()=>capacity});await s.execute(input(1),signal());const output=frame();Decoder.instances.at(-1).callbacks.output(output);const first=s.execute(input(4),signal());await turn();const wait=s.machine.wait;
 await assert.rejects(s.execute(input(4),signal()),/already waiting/);assert.equal(s.machine.wait,wait);capacity=true;s.capacityChanged();assert.equal((await first).frame,output);output.close();s.cancel();
});
test('actual reset rejects a suspended receive and a later capacity notification cannot revive it',async()=>{
 const s=service({canReceive:()=>false});await s.execute(input(1),signal());const output=frame();Decoder.instances.at(-1).callbacks.output(output);const received=s.execute(input(4),signal());await turn();const rejection=assert.rejects(received,/generation replaced/);await s.execute(input(6),signal());await rejection;s.capacityChanged();assert.equal(output.closed,1);assert.equal(s.machine.wait,null);assert.equal(s.snapshot().active,true);s.cancel();
});
test('actual decoder error releases a parked receive without consuming its frame',async()=>{
 const s=service({canReceive:()=>false});await s.execute(input(1),signal());const output=frame();Decoder.instances.at(-1).callbacks.output(output);const received=s.execute(input(4),signal());await turn();const error=Error('browser decode failed');Decoder.instances.at(-1).callbacks.error(error);await assert.rejects(received,value=>value===error);assert.equal(output.closed,0);assert.equal(s.capacityWait,null);s.cancel();assert.equal(output.closed,1);
});
