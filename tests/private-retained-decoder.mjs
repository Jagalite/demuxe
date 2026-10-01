// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {PrivateRetainedDecoder} from '../web/private-mpv/retained-decoder.js';
class Decoder {
 static async isConfigSupported(configuration){return {supported:true,config:configuration};}
 constructor(callbacks){this.callbacks=callbacks;this.decodeQueueSize=0;this.state='unconfigured';Decoder.current=this;}
 addEventListener(){}
 configure(){this.state='configured';}
 decode(chunk){this.chunk=chunk;}
 flush(){return Promise.resolve();}
 close(){this.state='closed';}
}
const input=(operation)=>({operation,fields:[0,0,0,0,3,320,180,1,8,0,0,0,0,3,0,0],bytes:new Uint8Array([1,2,3]),timestamp:100000,duration:33333});
const frame=()=>({visibleRect:{width:320,height:180},timestamp:100000,duration:33333,colorSpace:{primaries:'bt709',transfer:'bt709',matrix:'bt709',fullRange:false},closed:0,close(){this.closed++;}});
const signal=()=>new AbortController().signal;
const service=()=>new PrivateRetainedDecoder({Decoder,Chunk:class{constructor(init){Object.assign(this,init);}}});
test('retained decode returns the actual frame with a native timing placeholder',async()=>{
 const s=service(),output=frame();
 try {
  await s.execute(input(1),signal());await s.execute(input(2),signal());Decoder.current.callbacks.output(output);
  const received=await s.execute(input(4),signal());assert.equal(received.frame,output);assert.equal(output.closed,0);
  assert.deepEqual([...received.pixels],[16,16,16,16,128,128]);assert.equal(received.timestamp,100000);assert.deepEqual(received.fields.slice(0,3),[2,2,0]);
  await s.execute(input(3),signal());await Promise.resolve();assert.equal((await s.execute(input(4),signal())).result,-541478725);
 } finally {output.close();s.cancel();}
});
test('reset discards queued frames and rejects callbacks from the old generation',async()=>{
 const s=service();await s.execute(input(1),signal());const old=Decoder.current,queued=frame(),late=frame();old.callbacks.output(queued);
 await s.execute(input(6),signal());assert.equal(queued.closed,1);old.callbacks.output(late);assert.equal(late.closed,1);
 assert.equal(s.snapshot().queued,0);assert.equal(s.snapshot().resets,1);s.cancel();
});
test('decoder queue overflow closes excess output and fails explicitly',async()=>{
 const s=service();await s.execute(input(1),signal());const outputs=Array.from({length:33},frame);
 for(const output of outputs)Decoder.current.callbacks.output(output);
 assert.equal(s.snapshot().queued,32);assert.equal(outputs[32].closed,1);
 await assert.rejects(s.execute(input(4),signal()),/queue limit/);s.cancel();assert.ok(outputs.every(f=>f.closed===1));
});
test('unsupported configuration and bad output cannot leak retained frames',async()=>{
 const s=service();await s.execute(input(1),signal());const bad=frame();bad.visibleRect.width=9000;Decoder.current.callbacks.output(bad);
 await assert.rejects(s.execute(input(4),signal()),/Invalid retained output/);assert.equal(bad.closed,1);s.cancel();
 class Unsupported extends Decoder{static async isConfigSupported(){return {supported:false};}}
 const rejected=new PrivateRetainedDecoder({Decoder:Unsupported});await assert.rejects(rejected.execute(input(1),signal()),/Unsupported retained browser/);assert.equal(rejected.snapshot().active,false);rejected.cancel();
});
