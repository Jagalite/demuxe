// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import {webCodecsDurationWorkaround} from '../web/generated/internal/machine/browser-compatibility.js';
const safari=version=>`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${version} Safari/605.1.15`;
test('Safari guard is bounded and leaves unknown and other-browser UAs unchanged',()=>{
 for(const version of ['17.6','18.6','26','26.0.1','26.4','26.5','26.5.1','26.5.2'])assert.equal(webCodecsDurationWorkaround(safari(version)),true);
 for(const ua of ['', 'Node.js/24',safari('26.5.3'),safari('26.6'),safari('27.2'),safari('0'),safari('26.5.2.1'),safari('26.5.2')+' Chrome/140.0.0.0',safari('26.5.2')+' CriOS/140.0.0.0',safari('26.5.2')+' FxiOS/140.0',safari('26.5.2').replace('Version/26.5.2 ','')])assert.equal(webCodecsDurationWorkaround(ua),false,ua);
 assert.ok(webCodecsDurationWorkaround(safari('26.5.2').replace('Macintosh; Intel Mac OS X 10_15_7','iPhone; CPU iPhone OS 26_5_2 like Mac OS X')));
});

import {WebCodecsVideoDecoder,externalFrameDuration} from '../web/external-video-decoder.js';
function fixture(version='26.5.2'){
 const raw=[],outputs=[],errors=[];
 class Decoder{constructor(callbacks){this.callbacks=callbacks;this.state='unconfigured';this.decodeQueueSize=0;this.packets=[];raw.push(this);}addEventListener(){}configure(){this.state='configured';}decode(packet){this.packets.push(packet);if(this.fail)throw Error('decode failed');}flush(){return Promise.resolve();}close(){this.state='closed';}}
 class Chunk{constructor(init){Object.assign(this,init);this.duration=init.duration??null;this.byteLength=init.data.length;}copyTo(target){target.set(this.data);}}
 class Frame{constructor(frame,init={}){this.timestamp=frame.timestamp;this.duration=init.duration??frame.duration;this.closed=0;}close(){this.closed++;}}
 const wrapper=new WebCodecsVideoDecoder({Decoder,Chunk,userAgent:safari(version),output:f=>outputs.push({frame:f,timestamp:f.timestamp,duration:externalFrameDuration(f)}),error:e=>errors.push(e)});wrapper.configure({codec:'avc1.42001e'});
 const packet=(timestamp,duration=33)=>new Chunk({type:'key',timestamp,duration,data:new Uint8Array([1,2,3])});
 const emit=timestamp=>{const f=new Frame({timestamp,duration:null});raw.at(-1).callbacks.output(f);return f;};
 return {wrapper,raw,outputs,errors,packet,emit};
}
test('older Safari gets duration-free chunks and correctly restored reordered and duplicate PTS frames',()=>{
 const f=fixture();for(const [pts,duration]of [[3,30],[1,10],[2,20],[2,21]])f.wrapper.submit(f.packet(pts,duration));
 assert.ok(f.raw[0].packets.every(p=>p.duration===null));assert.deepEqual([...f.raw[0].packets[0].data],[1,2,3]);
 for(const pts of [1,2,2,3])assert.equal(f.emit(pts).closed,0);
 assert.deepEqual(f.outputs.map(f=>[f.timestamp,f.duration]),[[1,10],[2,20],[2,21],[3,30]]);assert.equal(f.wrapper.durations.get(f.wrapper.machine.current.id).length,0);f.wrapper.destroy();assert.equal(f.wrapper.durations.size,0);
});
test('newer Safari keeps original chunk and frame objects',()=>{
 const f=fixture('27.2'),p=f.packet(1);assert.equal(f.wrapper.submit(p),true);assert.equal(f.raw[0].packets[0],p);const frame=f.emit(1);assert.equal(f.outputs[0].frame,frame);assert.equal(frame.closed,0);f.wrapper.destroy();
});
test('duration metadata is bounded and cleared by flush, decode errors, reset and reconfiguration',async()=>{
 const f=fixture();for(let i=0;i<256;i++)f.wrapper.submit(f.packet(i));assert.throws(()=>f.wrapper.submit(f.packet(257)),/metadata limit/);assert.equal(f.raw[0].packets.length,256);
 await f.wrapper.drain();assert.equal(f.wrapper.durations.get(f.wrapper.machine.current.id).length,0);
 f.raw[0].fail=true;assert.throws(()=>f.wrapper.submit(f.packet(9)),/decode failed/);assert.equal(f.wrapper.durations.get(f.wrapper.machine.current.id).length,0);f.raw[0].fail=false;
 f.wrapper.submit(f.packet(1,99));const old=f.raw[0];f.wrapper.reset();f.wrapper.configure({codec:'avc1.42001e'});f.wrapper.submit(f.packet(1,22));
 const stale={timestamp:1,closed:0,close(){this.closed++;}};old.callbacks.output(stale);assert.equal(stale.closed,1);f.emit(1);assert.equal(f.outputs.at(-1).duration,22);assert.equal(f.wrapper.durations.size,1);f.wrapper.destroy();
});
test('backpressure and absent durations never create metadata',()=>{
 const f=fixture();f.raw[0].decodeQueueSize=8;assert.equal(f.wrapper.submit(f.packet(1)),false);assert.equal(f.wrapper.durations.get(f.wrapper.machine.current.id).length,0);f.raw[0].decodeQueueSize=0;
 const p=f.packet(2,null);f.wrapper.submit(p);assert.equal(f.raw[0].packets[0],p);assert.equal(f.wrapper.durations.get(f.wrapper.machine.current.id).length,0);f.wrapper.destroy();
});

test('microsecond quantization recovers only an unambiguous duration and preserves the raw frame',()=>{
 const f=fixture();f.wrapper.submit(f.packet(1000,40));const frame=f.emit(999);assert.equal(f.outputs[0].frame,frame);assert.equal(f.outputs[0].duration,40);assert.equal(frame.timestamp,999);
 f.wrapper.submit(f.packet(2000,50));f.wrapper.submit(f.packet(2002,60));f.emit(2001);assert.equal(f.outputs.at(-1).duration,0,'do not guess between neighboring packets');f.wrapper.destroy();
});
test('late flush from a retired decoder cannot clear successor duration metadata',async()=>{
 const f=fixture();let resolve;f.raw[0].flush=()=>new Promise(yes=>resolve=yes);f.wrapper.submit(f.packet(1,90));const pending=f.wrapper.drain();f.wrapper.configure({codec:'next'});f.wrapper.submit(f.packet(1,20));resolve();await pending;f.emit(1);assert.equal(f.outputs.at(-1).duration,20);f.wrapper.destroy();
});
