// SPDX-License-Identifier: MIT
import {initialPrivateWorklet,failPrivateWorklet,connectPrivateWorklet,recordPrivateWorklet,stopPrivateWorkletRecording,inspectPrivateWorkletPCM,receivePrivateWorklet,privateWorkletFrames,privateWorkletUnderrun,privateWorkletCaptureFits,privateWorkletCaptureLimit} from '../generated/internal/machine/private-worklet.js';
// Bounded private-memory transport. Only rendered frames advance consumption.
// Ring/capture cursors and DSP counters stay physical; the quantum policy helpers
// return primitives and never replace state or allocate sample-sized structures.
class PrivatePCM extends AudioWorkletProcessor {
 constructor(){
  super();this.machine=initialPrivateWorklet();this.read=0;this.written=0;
  this.ring=new Float32Array(this.capacity*this.channels);this.underruns=0;this.underrunEvents=[];
  this.capture=null;this.captureLimit=privateWorkletCaptureLimit;this.captureSamples=0;
  this.port.onmessage=({data:d})=>{
   if(d.type==='connect'){
    const decision=connectPrivateWorklet(this.machine);this.machine=decision.state;
    if(!decision.accepted){try{d.port?.close();}finally{this.fail(decision.error);}return;}
    let link;const release=()=>{try{link?.close();}catch{}};
    try{link=d.port;if(this.stopped){release();return;}this.link=link;link.onmessage=({data})=>this.receive(data);if(this.stopped){release();return;}const start=link.start;if(this.stopped){release();return;}start.call(link);if(this.stopped)release();}
    catch{try{this.fail('PCM transport connection failed');}finally{release();}}
   }
   if(d.type==='record'){this.machine=recordPrivateWorklet(this.machine);this.capture=new Float32Array(this.captureLimit);this.captureSamples=0;this.port.postMessage({type:'recording',id:d.id});}
   if(d.type==='inspect'){
    const pcm=this.capture?this.capture.slice(0,this.captureSamples):new Float32Array(0);
    this.port.postMessage({type:'inspection',id:d.id,epoch:this.epoch,read:this.read,written:this.written,failed:this.failed,stopped:this.stopped,underruns:this.underruns,underrunEvents:this.underrunEvents,stale:this.stale,maxQueued:this.maxQueued,pcm:pcm.buffer},[pcm.buffer]);
   }
  };
 }
 get epoch(){return this.machine.epoch;}get capacity(){return this.machine.capacity;}get channels(){return this.machine.channels;}get running(){return this.machine.running;}get record(){return this.machine.recording;}get failed(){return this.machine.error;}get stopped(){return this.machine.phase!=='active';}get stale(){return this.machine.stale;}get maxQueued(){return this.machine.maxQueued;}
 fail(message){const decision=failPrivateWorklet(this.machine,message);this.machine=decision.state;if(decision.effect==='error')this.reportFailure();}
 reportFailure(){this.read=this.written=0;this.link?.postMessage({type:'error',error:this.failed,epoch:this.epoch});this.port.postMessage({type:'error',error:this.failed});}
 receive(d){
  const numeric=value=>typeof value==='number'?value:NaN,nullable=value=>value==null?null:numeric(value);
  const observedType=d?.type,type=typeof observedType==='string'?observedType:null,object=!!d&&typeof d==='object';
  // Browser messages are observed once; buffers remain outside the pure owner.
  const input={object,type,epoch:NaN,capacity:null,channels:null,running:null,buffer:false,bytes:0,finite:true,start:NaN};let buffer,pcm;
  if(type!=='stop'&&!this.stopped&&object){
   input.epoch=numeric(d.epoch);
   if(type==='reset'){input.capacity=nullable(d.capacity);input.channels=nullable(d.channels);}
   else if(input.epoch===this.epoch){
    if(type==='state'){const running=d.running;input.running=typeof running==='boolean'?running:null;}
    if(type==='pcm'){buffer=d.buffer;input.buffer=buffer instanceof ArrayBuffer;input.bytes=input.buffer?buffer.byteLength:0;input.start=numeric(d.start);}
   }
  }
  const previous=this.machine;
  if(inspectPrivateWorkletPCM(previous,input)){pcm=new Float32Array(buffer);input.finite=!pcm.some(x=>!Number.isFinite(x));}
  const decision=receivePrivateWorklet(this.machine,input,this.read,this.written);this.machine=decision.state;
  if(decision.effect==='error'){this.reportFailure();return;}
  if(decision.effect==='stop'){this.read=this.written=0;this.link?.postMessage({type:'stopped',id:d.id});return;}
  if(decision.effect==='reset'){if(previous.capacity!==this.capacity||previous.channels!==this.channels)this.ring=new Float32Array(this.capacity*this.channels);this.read=this.written=0;this.link.postMessage({type:'resetAck',epoch:this.epoch});return;}
  if(decision.effect==='append'){
   for(let i=0;i<decision.frames;i++){const at=((this.written+i)%this.capacity)*this.channels;for(let channel=0;channel<this.channels;channel++)this.ring[at+channel]=pcm[i*this.channels+channel];}
   this.written+=decision.frames;
  }
 }
 process(inputs,outputs){
  const state=this.machine,channels=state.channels,capacity=state.capacity,output=outputs[0],n=privateWorkletFrames(state,this.read,this.written,output[0]?.length??0,output.length);if(n<0)return true;
  for(const channel of output)channel.fill(0);
  for(let i=0;i<n;i++){const at=((this.read+i)%capacity)*channels;for(let channel=0;channel<channels;channel++)output[channel][i]=this.ring[at+channel];}
  if(privateWorkletUnderrun(this.machine,n,output[0].length)){
   this.underruns++;
   // Existing bounded physical device observations, including the final quantum.
   if(this.underrunEvents.length<64)this.underrunEvents.push({epoch:this.epoch,read:this.read,written:this.written,consumed:n,quantum:output[0].length,audioFrame:typeof currentFrame==='number'?currentFrame:null});
  }
  if(n&&this.record){
   if(!privateWorkletCaptureFits(state,this.captureSamples,n,this.captureLimit)){this.machine=stopPrivateWorkletRecording(this.machine);this.port.postMessage({type:'error',error:'Diagnostic capture budget exceeded'});}
   else{for(let i=0;i<n;i++)for(let channel=0;channel<this.channels;channel++)this.capture[this.captureSamples+i*this.channels+channel]=output[channel][i];this.captureSamples+=n*this.channels;}
  }
  this.read+=n;
  if(n)this.link.postMessage({type:'consumed',epoch:this.epoch,frames:this.read});
  return true;
 }
}
registerProcessor('demuxe-private-pcm',PrivatePCM);
