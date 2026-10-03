// SPDX-License-Identifier: Apache-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../../web/generated/internal/machine/private-worklet.js';
const script=fs.readFileSync(new URL('../../web/private-mpv/audio-worklet.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
const facts=value=>({object:true,type:'state',epoch:2,capacity:null,channels:null,running:false,buffer:false,bytes:0,finite:true,start:0,...value});
function fixture(source=script){
 let Processor;const messages=[],transport=[],port={onmessage:null,postMessage(value){messages.push(value);}},link={onmessage:null,closes:0,start(){},close(){this.closes++;},postMessage(value){transport.push(value);}};
 const context={...core,AudioWorkletProcessor:class{constructor(){this.port=port;}},registerProcessor(_name,Constructor){Processor=Constructor;},Float32Array,ArrayBuffer,Number,currentFrame:123};vm.runInNewContext(source,context);
 const processor=new Processor();return{processor,link,messages,transport,context,command(data){port.onmessage({data});},receive(data){processor.receive(data);},connect(){this.command({type:'connect',port:link});},reset(channels=2,capacity=8192,epoch=2){this.receive({type:'reset',epoch,capacity,channels});},append(values,start=processor.written,epoch=processor.epoch){this.receive({type:'pcm',epoch,start,buffer:Float32Array.from(values).buffer});},process(quantum=128,channels=processor.channels){const outputs=Array.from({length:channels},()=>new Float32Array(quantum).fill(99));assert.equal(processor.process([], [outputs]),true);return outputs;}};
}
function ready(channels=2){const f=fixture();f.connect();f.reset(channels);return f;}
test('pure worklet reset/connect ownership is immutable and validates exact protocol bounds',()=>{
 const initial=core.initialPrivateWorklet(),connected=core.connectPrivateWorklet(initial);assert.equal(connected.accepted,true);assert.equal(initial.connected,false);assert.equal(core.connectPrivateWorklet(connected.state).accepted,false);
 const reset=core.receivePrivateWorklet(connected.state,facts({type:'reset',channels:8,capacity:32768}),0,0);assert.equal(reset.effect,'reset');assert.equal(reset.state.channels,8);assert.equal(reset.state.epoch,2);assert.equal(connected.state.epoch,-1);
 for(const epoch of [1,2,-2,4294967296,NaN]){const ignored=core.receivePrivateWorklet(reset.state,facts({type:'reset',epoch}),0,0);assert.equal(ignored.effect,'none');assert.equal(ignored.state.stale,1);assert.equal(ignored.state.epoch,2);}
 for(const [key,value,error] of [['channels',1,'channel'],['capacity',1024,'capacity']]){const invalid=core.receivePrivateWorklet(reset.state,facts({type:'reset',epoch:4,[key]:value}),0,0);assert.equal(invalid.effect,'error');assert.match(invalid.state.error,new RegExp(error));}
});
test('pure message admission preserves buffer, finite sample, sequence and capacity rules',()=>{
 const state=core.receivePrivateWorklet(core.initialPrivateWorklet(),facts({type:'reset'}),0,0).state;
 const packet=facts({type:'pcm',buffer:true,bytes:1024*2*4,start:0});assert.equal(core.inspectPrivateWorkletPCM(state,packet),true);const good=core.receivePrivateWorklet(state,packet,0,0);assert.equal(good.frames,1024);assert.equal(good.state.maxQueued,1024);assert.equal(state.maxQueued,0);
 for(const delta of [{buffer:false},{bytes:0},{bytes:7},{bytes:8200},{finite:false},{start:1}])assert.equal(core.receivePrivateWorklet(state,{...packet,...delta},0,0).effect,'error');
 assert.equal(core.receivePrivateWorklet(state,{...packet,start:8192},0,8192).state.error,'Invalid PCM transport bounds');assert.equal(core.receivePrivateWorklet(state,{...packet,start:8192},1024,8192).effect,'append');
});
test('pure render and capture selectors return primitives and preserve state identity',()=>{
 let state=core.receivePrivateWorklet(core.initialPrivateWorklet(),facts({type:'reset'}),0,0).state;state=core.receivePrivateWorklet(state,facts({running:true}),0,512).state;const old=state;
 for(let i=0;i<10000;i++){assert.equal(core.privateWorkletFrames(state,0,512,128,2),128);assert.equal(core.privateWorkletFrames(state,0,512,128,6),-1);assert.equal(core.privateWorkletUnderrun(state,127,128),true);assert.equal(core.privateWorkletCaptureFits(state,1999744,128),true);assert.equal(core.privateWorkletCaptureFits(state,1999746,128),false);}
 assert.equal(state,old);assert.equal(core.privateWorkletFrames(state,500,512,128,2),12);
});
test('actual quantum copy preserves interleaved samples for stereo, 5.1 and 7.1',()=>{
 for(const channels of [2,6,8]){const f=ready(channels),samples=Array.from({length:3*channels},(_,i)=>i+.25);f.append(samples);const paused=f.process(4);assert.ok(paused.every(channel=>channel.every(sample=>sample===0)));assert.equal(f.processor.read,0);
 f.receive({type:'state',epoch:2,running:true});const state=f.processor.machine,out=f.process(4);for(let channel=0;channel<channels;channel++)assert.deepEqual([...out[channel]],[samples[channel],samples[channels+channel],samples[2*channels+channel],0]);assert.equal(f.processor.machine,state);assert.equal(f.processor.read,3);assert.equal(f.processor.underruns,1);assert.equal(f.transport.at(-1).frames,3);assert.equal(f.processor.underrunEvents[0].audioFrame,123);}
});
test('actual ring wrap copies only admitted data and preserves monotonic physical cursors',()=>{
 const f=ready();f.receive({type:'state',epoch:2,running:true});for(let batch=0;batch<10;batch++){const samples=Array.from({length:2048},(_,i)=>batch*2048+i);f.append(samples);for(let q=0;q<8;q++){const out=f.process();for(let i=0;i<128;i++){assert.equal(out[0][i],samples[q*256+i*2]);assert.equal(out[1][i],samples[q*256+i*2+1]);}}}assert.equal(f.processor.read,10240);assert.equal(f.processor.written,10240);assert.equal(f.processor.maxQueued,1024);assert.equal(f.processor.underruns,0);
});
test('stop clears physical cursors, keeps acknowledgments and ignores later payloads',()=>{
 const f=ready();f.append([1,2,3,4]);f.receive({type:'state',epoch:2,running:true});f.receive({type:'stop',id:9});assert.equal(f.processor.stopped,true);assert.equal(f.processor.read,0);assert.equal(f.processor.written,0);assert.equal(f.transport.at(-1).id,9);f.append([7,8]);f.receive({type:'reset',epoch:4});assert.equal(f.processor.epoch,2);assert.equal(f.processor.written,0);assert.ok(f.process().every(channel=>channel.every(sample=>sample===0)));f.receive({type:'stop',id:10});assert.equal(f.transport.at(-1).id,10);
});
test('worklet reset invalidates queued frames and separately acknowledges the new epoch',()=>{
 const f=ready();f.append([1,2]);f.receive({type:'state',epoch:2,running:true});f.reset(8,32768,4);assert.equal(f.processor.read,0);assert.equal(f.processor.written,0);assert.equal(f.processor.running,false);assert.equal(f.processor.ring.length,262144);f.receive({type:'state',epoch:2,running:true});assert.equal(f.processor.running,false);assert.equal(f.processor.stale,1);assert.equal(f.transport.at(-1).type,'resetAck');assert.equal(f.transport.at(-1).epoch,4);
});
test('invalid payloads fail once and never publish consumed or reset acknowledgment afterward',()=>{
 for(const invalid of [null,{type:'state',epoch:2,running:1},{type:'pcm',epoch:2,start:0,buffer:Float32Array.of(NaN,1).buffer},{type:'pcm',epoch:2,start:1,buffer:Float32Array.of(1,2).buffer}]){const f=ready();f.receive(invalid);assert.equal(f.processor.stopped,true);assert.ok(f.processor.failed);assert.equal(f.messages.at(-1).type,'error');const count=f.transport.length;f.receive({type:'reset',epoch:4});f.process();assert.equal(f.transport.length,count);assert.equal(f.processor.read,0);}
});
test('diagnostic capture retains exact samples and stops at its existing sample budget',()=>{
 const f=ready();f.command({type:'record',id:4});f.receive({type:'state',epoch:2,running:true});f.append([1,2,3,4]);f.process(2);assert.equal(f.processor.captureSamples,4);f.command({type:'inspect',id:5});assert.deepEqual([...new Float32Array(f.messages.at(-1).pcm)],[1,2,3,4]);f.processor.captureSamples=1999998;f.append([5,6]);f.process(1);assert.equal(f.processor.captureSamples,2000000);assert.equal(f.processor.record,true);f.append([7,8]);f.process(1);assert.equal(f.processor.record,false);assert.equal(f.processor.captureSamples,2000000);assert.equal(f.messages.at(-1).error,'Diagnostic capture budget exceeded');assert.equal(f.processor.read,4);
});
test('quantum diagnostics stay bounded and a mismatched output preserves caller samples',()=>{
 const f=ready();f.receive({type:'state',epoch:2,running:true});const state=f.processor.machine;for(let i=0;i<100;i++)f.process();assert.equal(f.processor.machine,state);assert.equal(f.processor.underruns,100);assert.equal(f.processor.underrunEvents.length,64);const mismatch=f.process(8,6);assert.ok(mismatch.every(channel=>channel.every(sample=>sample===99)));assert.equal(f.processor.underruns,100);
});
test('rejected additional connection releases its transferred port and retires message authority',()=>{
 const f=ready(),other={closed:0,close(){this.closed++;}};f.command({type:'connect',port:other});assert.equal(other.closed,1);assert.equal(f.processor.stopped,true);assert.equal(f.processor.failed,'Transport already connected or stopped');assert.equal(f.processor.link,f.link);
});

test('missing and throwing connection setup fail terminally and release acquired ports',()=>{
 for(const stage of ['missing','listener','start']){const f=fixture(),link={closes:0,postMessage(){},close(){this.closes++;},start(){if(stage==='start')throw Error('start failed');}};if(stage==='listener')Object.defineProperty(link,'onmessage',{set(){throw Error('listener failed');}});f.command({type:'connect',port:stage==='missing'?undefined:link});assert.equal(f.processor.stopped,true);assert.equal(f.processor.failed,'PCM transport connection failed');assert.equal(link.closes,stage==='missing'?0:1);assert.equal(f.messages.at(-1).type,'error');}
});
test('retirement during connection acquisition prevents subsequent port effects',()=>{
 for(const stage of ['port','listener','start']){const f=fixture();let started=0;const link={closes:0,postMessage(){},close(){this.closes++;},start(){started++;}},message={type:'connect',port:link};if(stage==='port')Object.defineProperty(message,'port',{get(){f.receive({type:'stop',id:1});return link;}});if(stage==='listener')Object.defineProperty(link,'onmessage',{set(){f.receive({type:'stop',id:1});}});if(stage==='start')Object.defineProperty(link,'start',{get(){f.receive({type:'stop',id:1});return()=>{started++;};}});f.command(message);assert.equal(link.closes,1);assert.equal(started,0);assert.equal(f.processor.stopped,true);}
});
