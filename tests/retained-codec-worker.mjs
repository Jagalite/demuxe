// SPDX-License-Identifier: Apache-2.0
import {videoReorderDepth} from '../web/generated/internal/machine/video-frame-order.js';
import * as legacyDecoderPolicy from '../web/generated/internal/machine/legacy-decoder-worker.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {videoCodecConfig} from '../web/video-codec-config.js';
import {vp9PacketConfig} from '../web/video-codec-config.js';
import {WebCodecsVideoDecoder} from '../web/external-video-decoder.js';
test('real legacy AVC mailbox transfers increasing PTS and waits for flush before its short tail',async()=>{
 let raw,finishFlush;const messages=[],closed=[];
 class Decoder {
  static async isConfigSupported(){return {supported:true};}
  constructor(callbacks){raw=this;this.callbacks=callbacks;this.decodeQueueSize=0;this.state='unconfigured';}
  configure(){this.state='configured';}addEventListener(){}close(){this.state='closed';}
  flush(){return new Promise(resolve=>finishFlush=resolve);}
 }
 const memory=new SharedArrayBuffer(80+8*1024*1024+16),h=new Int32Array(memory,0,16);
 const context=vm.createContext({...legacyDecoderPolicy,videoReorderDepth,WebCodecsVideoDecoder,self:{},videoCodecConfig,VideoDecoder:Decoder,Uint8Array,Int32Array,DataView,Atomics,performance,postMessage:m=>messages.push(m),shared:memory});
 const code=(await readFile('web/retained-decoder-worker.js','utf8')).replace(/^import .*\n/gm,'');
 vm.runInContext(code+"\ntransition({type:'init',disabled:false,watchdog:true,faultAfter:0});memory=shared;pointer=0;header=new Int32Array(memory,0,16);view=new DataView(memory);",context);
 let serial=0;const request=async op=>{h[0]=++serial*4+1;h[2]=op;await context.pump();return h[3];};
 const description=Buffer.from('014d400affe10017674d400aeca146fc9808800000030080000018078912cb01000468ce0fc8','hex');
 h[4]=description.length;h[5]=160;h[6]=90;h[13]=1;new Uint8Array(memory,80,description.length).set(description);assert.equal(await request(1),0);
 const output=pts=>({timestamp:pts,duration:41667,visibleRect:{width:160,height:90},colorSpace:{},close(){closed.push(pts);}});
 for(const pts of [0,125000,42000,83000])raw.callbacks.output(output(pts));
 assert.equal(await request(4),1);assert.equal(await request(4),1);assert.equal(await request(3),0);assert.equal(await request(4),0);
 finishFlush();await Promise.resolve();await Promise.resolve();assert.equal(await request(4),1);assert.equal(await request(4),1);assert.equal(await request(4),-541478725);
 assert.deepEqual(messages.filter(m=>m.retainedFrame).map(m=>m.pts),[0,42000,83000,125000]);assert.deepEqual(closed,[0,42000,83000,125000]);
 const previous=raw;assert.equal(await request(6),0);raw.callbacks.output(output(0));assert.equal(await request(4),-6);assert.equal(await request(6),0);previous.callbacks.output(output(-1));assert.deepEqual(closed,[0,42000,83000,125000,0,-1]);
});
test('empty HEVC configuration is rejected before browser admission rather than failing at a tail seek',async()=>{
 const memory=new SharedArrayBuffer(80+65536),h=new Int32Array(memory,0,16),messages=[];
 let checked=0;
 const context=vm.createContext({...legacyDecoderPolicy,videoReorderDepth,WebCodecsVideoDecoder,self:{},videoCodecConfig,vp9PacketConfig,VideoDecoder:class{static async isConfigSupported(){checked++;return {supported:true};}},Uint8Array,Int32Array,DataView,Atomics,performance,postMessage:m=>messages.push(m),shared:memory});
 const code=(await readFile('web/retained-decoder-worker.js','utf8')).replace(/^import .*\n/gm,'');
 vm.runInContext(code+"\ntransition({type:'init',disabled:false,watchdog:true,faultAfter:0});"+'\nmemory=shared;pointer=0;header=new Int32Array(memory,0,16);view=new DataView(memory);',context);
 h[0]=5;h[2]=1;h[4]=23;h[5]=1920;h[6]=1080;h[13]=2;
 new Uint8Array(memory,80,23)[0]=1;
 await context.pump();assert.equal(h[3],-29);assert.equal(checked,0);
 assert.match(messages.find(m=>m.error).error,/Unsupported retained HEVC configuration/);
});
test('Rejected Hybrid configuration retains diagnostic fields without binary initialization data',async()=>{
 const messages=[];
 const memory=new SharedArrayBuffer(80+8*1024*1024+16),h=new Int32Array(memory,0,16);
 const context=vm.createContext({...legacyDecoderPolicy,videoReorderDepth,WebCodecsVideoDecoder,self:{},videoCodecConfig,vp9PacketConfig,VideoDecoder:class{static async isConfigSupported(config){return {supported:false,config};}},Uint8Array,Int32Array,DataView,Atomics,performance,postMessage:m=>messages.push(m),shared:memory});
 const code=(await readFile('web/retained-decoder-worker.js','utf8')).replace(/^import .*\n/gm,'');
 vm.runInContext(code+"\ntransition({type:'init',disabled:false,watchdog:true,faultAfter:0});"+'\nmemory=shared;pointer=0;header=new Int32Array(memory,0,16);view=new DataView(memory);',context);
 h[0]=5;h[2]=1;h[4]=38;h[5]=1920;h[6]=1080;h[13]=1;h[14]=110;h[15]=40;h[8]=10;
 new Uint8Array(memory,80,38).set(Buffer.from('016e0028ffe10017674d400aeca146fc9808800000030080000018078912cb01000468ce0fc8','hex'));
 await context.pump();
 assert.equal(h[3],-29);
 const error=messages.find(m=>m.error).error;
 for(const value of ['H.264 / AVC','avc1.6e0028','1920 × 1080','10-bit','110 / 40','38 bytes','no-preference','supported=false','without a specific rejection reason'])assert.ok(error.includes(value),value);
 const details=messages.find(m=>m.stats).stats.supportCheck;
 assert.equal(details.supported,false);assert.equal(details.requested.codec,'avc1.6e0028');assert.equal(details.requested.descriptionBytes,38);
 assert.equal(details.requested.description,undefined);assert.equal(details.recognized.description,undefined);
});
test('Deferred VP9 rejection reports profile and depth learned from the packet',async()=>{
 const messages=[];
 const memory=new SharedArrayBuffer(80+8*1024*1024+16),h=new Int32Array(memory,0,16);
 const context=vm.createContext({...legacyDecoderPolicy,videoReorderDepth,WebCodecsVideoDecoder,self:{},videoCodecConfig,vp9PacketConfig,VideoDecoder:class{static async isConfigSupported(config){return {supported:false,config};}},Uint8Array,Int32Array,DataView,Atomics,performance,postMessage:m=>messages.push(m),shared:memory});
 const code=(await readFile('web/retained-decoder-worker.js','utf8')).replace(/^import .*\n/gm,'');
 vm.runInContext(code+"\ntransition({type:'init',disabled:false,watchdog:true,faultAfter:0});"+'\nmemory=shared;pointer=0;header=new Int32Array(memory,0,16);view=new DataView(memory);',context);
 h[0]=5;h[2]=1;h[4]=0;h[5]=640;h[6]=360;h[13]=4;h[14]=-1;h[15]=10;h[8]=0;
 await context.pump();assert.equal(h[3],0);
 h[0]=9;h[2]=2;h[4]=5;
 new Uint8Array(memory,80,5).set([0x92,0x49,0x83,0x42,0x80]);
 await context.pump();assert.equal(h[3],-29);
 const error=messages.find(m=>m.error).error;
 assert.match(error,/vp09\.02\.10\.12/);assert.match(error,/12-bit/);assert.match(error,/2 \/ 10/);
});
test('Invisible packets do not exhaust a fictitious one-packet/one-frame credit',async()=>{
 let packets=0,closed=0;const messages=[];
 class Decoder {
  static async isConfigSupported(){return {supported:true};}
  constructor(callbacks){this.callbacks=callbacks;this.decodeQueueSize=0;this.state='unconfigured';}
  configure(){this.state='configured';}addEventListener(){}close(){this.state='closed';}
  decode(){if(++packets===9)this.callbacks.output({visibleRect:{width:640,height:360},format:'I420',colorSpace:{},timestamp:9,duration:1,close(){closed++;}});}
 }
 const memory=new SharedArrayBuffer(80+8*1024*1024+16),h=new Int32Array(memory,0,16);
 const context=vm.createContext({...legacyDecoderPolicy,videoReorderDepth,WebCodecsVideoDecoder,self:{},videoCodecConfig,VideoDecoder:Decoder,EncodedVideoChunk:class{constructor(data){Object.assign(this,data);}},Uint8Array,Int32Array,DataView,Atomics,performance,postMessage:m=>messages.push(m),shared:memory});
 const code=(await readFile('web/retained-decoder-worker.js','utf8')).replace(/^import .*\n/gm,'');vm.runInContext(code+"\ntransition({type:'init',disabled:false,watchdog:true,faultAfter:0});"+'\nmemory=shared;pointer=0;header=new Int32Array(memory,0,16);view=new DataView(memory);',context);
 let serial=0;const request=async op=>{h[0]=++serial*4+1;h[2]=op;await context.pump();assert.equal(h[0],serial*4+2);return h[3];};
 h[4]=0;h[5]=640;h[6]=360;h[13]=4;h[14]=0;h[15]=10;h[8]=8;assert.equal(await request(1),0);
 h[4]=1;h[7]=1;for(let i=0;i<9;i++)assert.equal(await request(2),0);
 assert.equal(await request(4),1);assert.equal(packets,9);assert.equal(closed,1);assert.equal(messages.filter(m=>m.retainedFrame).length,1);
});

async function watchdogHarness(){
 let now=0,instance,finishFlush;
 class Decoder{
  static async isConfigSupported(){return {supported:true};}
  constructor(callbacks){instance=this;this.callbacks=callbacks;this.decodeQueueSize=0;this.state='unconfigured';}
  configure(){this.state='configured';}addEventListener(){}close(){this.state='closed';}
  decode(){this.decodeQueueSize++;}flush(){return new Promise(resolve=>finishFlush=resolve);}
 }
 const memory=new SharedArrayBuffer(80+8*1024*1024+16),h=new Int32Array(memory,0,16),messages=[];
 const context=vm.createContext({...legacyDecoderPolicy,videoReorderDepth,WebCodecsVideoDecoder,self:{},videoCodecConfig,VideoDecoder:Decoder,EncodedVideoChunk:class{constructor(data){Object.assign(this,data);}},Uint8Array,Int32Array,DataView,Atomics,performance:{now:()=>now},postMessage:m=>messages.push(m),shared:memory});
 const code=(await readFile('web/retained-decoder-worker.js','utf8')).replace(/^import .*\n/gm,'');vm.runInContext(code+"\ntransition({type:'init',disabled:false,watchdog:true,faultAfter:0});"+'\nmemory=shared;pointer=0;header=new Int32Array(memory,0,16);view=new DataView(memory);',context);
 let serial=0;const request=async op=>{h[0]=++serial*4+1;h[2]=op;await context.pump();assert.equal(h[0],serial*4+2);return h[3];};
 h[4]=0;h[5]=640;h[6]=360;h[13]=4;h[14]=0;h[15]=10;h[8]=8;assert.equal(await request(1),0);h[4]=1;h[7]=1;
 return {request,messages,setWatchdog:enabled=>context.self.onmessage({data:{type:'watchdogs',decoderOutput:enabled}}),advance:ms=>now+=ms,decoder:()=>instance,flush:async()=>{finishFlush();await Promise.resolve();}};
}
test('decoder output watchdog can be disabled and re-enabled with a fresh budget',async()=>{
 const s=await watchdogHarness();for(let i=0;i<8;i++)await s.request(2);
 await s.request(4);s.advance(2500);s.setWatchdog(false);s.advance(10000);
 assert.equal(await s.request(4),0);assert.equal(s.messages.some(m=>m.error),false);
 s.setWatchdog(true);assert.equal(await s.request(4),0);s.advance(2999);assert.equal(await s.request(4),0);
 s.advance(2);assert.equal(await s.request(4),-29);assert.equal(s.messages.find(m=>m.error).decoderTimeout,true);
});
test('output watchdog excludes idle time before a new decode burst',async()=>{
 const s=await watchdogHarness();s.advance(10000);for(let i=0;i<8;i++)assert.equal(await s.request(2),0);
 assert.equal(await s.request(4),0,'new input has not had time to produce output');
 s.advance(2999);assert.equal(await s.request(4),0);
 s.advance(2);assert.equal(await s.request(4),-29,'a genuinely stalled output wait still fails');
 assert.equal(s.messages.find(m=>m.error).decoderTimeout,true);
 assert.equal(await s.request(4),-29);
 assert.equal(s.messages.filter(m=>m.error).at(-1).decoderTimeout,true,'repeated receives preserve the cause');
 assert.equal(await s.request(6),0);
 s.decoder().callbacks.error(Error('A separate decoder failure'));
 assert.equal(await s.request(4),-29);
 assert.equal(s.messages.filter(m=>m.error).at(-1).decoderTimeout,false,'reset clears the old timeout classification');
});
test('buffered frames and uncongested input do not consume the output watchdog budget',async()=>{
 const s=await watchdogHarness();await s.request(2);s.advance(10000);
 assert.equal(await s.request(4),-6);assert.equal(s.messages.some(m=>m.error),false);
 s.decoder().callbacks.output({visibleRect:{width:640,height:360},format:'I420',colorSpace:{},timestamp:1,duration:1,close(){}});
 s.advance(10000);assert.equal(await s.request(4),1);
 assert.equal(s.messages.some(m=>m.error),false);
});
test('drain after idle gets an output wait window and successful flush returns EOF',async()=>{
 const s=await watchdogHarness();await s.request(2);s.decoder().decodeQueueSize=0;s.advance(10000);
 assert.equal(await s.request(3),0);assert.equal(await s.request(4),0);
 await s.flush();s.advance(4000);assert.equal(await s.request(4),-541478725,'flush completion is not a watchdog failure when packets produce no visible frame');
});

test('packet ownership preserves prefixes and falls back once without transferring the heap',async()=>{
 const memory=new SharedArrayBuffer(80+8*1024*1024+16),h=new Int32Array(memory,0,16),seen=[];let sharedAttempts=0;
 class Chunk{
  constructor(init){
   assert.equal(init.transfer,undefined);
   if(init.data.buffer===memory){sharedAttempts++;throw new TypeError('Shared input unsupported by this test implementation');}
   this.bytes=Array.from(init.data);
  }
 }
 const decoder={queuedPackets:0,submit(chunk){seen.push(chunk.bytes);new Uint8Array(memory,80,3).fill(255);return true;}};
 const context=vm.createContext({...legacyDecoderPolicy,videoReorderDepth,WebCodecsVideoDecoder,self:{},videoCodecConfig,vp9PacketConfig,EncodedVideoChunk:Chunk,Uint8Array,Int32Array,DataView,Atomics,performance,postMessage(){},shared:memory,instance:decoder});
 const code=(await readFile('web/retained-decoder-worker.js','utf8')).replace(/^import .*\n/gm,'');
 vm.runInContext(code+"\ntransition({type:'init',disabled:false,watchdog:true,faultAfter:0});"+'\nmemory=shared;pointer=0;header=new Int32Array(memory,0,16);view=new DataView(memory);decoder=instance;packetPrefix=new Uint8Array([99]);',context);
 for(let i=0;i<3;i++){
  new Uint8Array(memory,80,3).set([1+i*3,2+i*3,3+i*3]);h[0]=(i+1)*4+1;h[2]=2;h[4]=3;h[7]=i===0?1:0;
  await context.pump();assert.equal(h[0],(i+1)*4+2);assert.equal(h[3],0);
 }
 assert.deepEqual(seen,[[99,1,2,3],[4,5,6],[7,8,9]]);assert.equal(sharedAttempts,1);assert.equal(memory.byteLength,80+8*1024*1024+16);
 const stats=vm.runInContext('({...stats})',context);assert.equal(stats.ownedPacketBytes,10);assert.equal(stats.sharedPacketFallbacks,1);
});
