// SPDX-License-Identifier: MIT
// Bounded private-memory transport. Only rendered frames advance consumption.
class PrivatePCM extends AudioWorkletProcessor {
 constructor(){
  super();this.epoch=-1;this.read=0;this.written=0;this.running=false;
  this.capacity=8192;this.channels=2;this.ring=new Float32Array(this.capacity*this.channels);this.underruns=0;this.underrunEvents=[];this.stale=0;this.maxQueued=0;
  this.capture=null;this.captureLimit=2000000;this.captureSamples=0;this.record=false;this.failed=null;this.stopped=false;
  this.port.onmessage=({data:d})=>{
   if(d.type==='connect'){if(this.link||this.stopped){d.port?.close();this.fail('Transport already connected or stopped');return;}this.link=d.port;this.link.onmessage=({data})=>this.receive(data);this.link.start();}
   if(d.type==='record'){this.record=true;this.capture=new Float32Array(this.captureLimit);this.captureSamples=0;this.port.postMessage({type:'recording',id:d.id});}
   if(d.type==='inspect'){
    const pcm=this.capture?this.capture.slice(0,this.captureSamples):new Float32Array(0);
    this.port.postMessage({type:'inspection',id:d.id,epoch:this.epoch,read:this.read,written:this.written,failed:this.failed,stopped:this.stopped,underruns:this.underruns,underrunEvents:this.underrunEvents,stale:this.stale,maxQueued:this.maxQueued,pcm:pcm.buffer},[pcm.buffer]);
   }
  };
 }
 fail(message){
  if(this.failed)return;this.failed=message;this.stopped=true;this.running=false;this.read=this.written=0;
  this.link?.postMessage({type:'error',error:message,epoch:this.epoch});
  this.port.postMessage({type:'error',error:message});
 }
 receive(d){
  if(d?.type==='stop'){this.stopped=true;this.running=false;this.read=this.written=0;this.link?.postMessage({type:'stopped',id:d.id});return;}
  if(this.stopped)return;
  if(!d||typeof d!=='object'){this.fail('Invalid PCM transport message');return;}
  if(d.type==='reset'){
   if(!Number.isInteger(d.epoch)||d.epoch<0||d.epoch>0xffffffff||(d.epoch&1)||d.epoch<=this.epoch){this.stale++;return;}
   const capacity=d.capacity??8192;
   if(![8192,32768].includes(capacity)){this.fail('Invalid PCM capacity');return;}
   const channels=d.channels??2;
   if(![2,6,8].includes(channels)){this.fail('Invalid PCM channel count');return;}
   if(capacity!==this.capacity||channels!==this.channels){this.capacity=capacity;this.channels=channels;this.ring=new Float32Array(capacity*channels);}
   this.epoch=d.epoch;this.read=this.written=0;this.running=false;
   this.link.postMessage({type:'resetAck',epoch:this.epoch});return;
  }
  if(d.epoch!==this.epoch){this.stale++;return;}
  if(d.type==='state'){if(typeof d.running!=='boolean'){this.fail('Invalid PCM running state');return;}this.running=d.running;return;}
  if(d.type==='pcm'){
   if(!(d.buffer instanceof ArrayBuffer)||d.buffer.byteLength%(this.channels*4)||d.buffer.byteLength<this.channels*4||d.buffer.byteLength>1024*this.channels*4){this.fail('Invalid PCM buffer');return;}
   const pcm=new Float32Array(d.buffer),frames=pcm.length/this.channels;
   if(pcm.some(x=>!Number.isFinite(x))){this.fail('Non-finite PCM sample');return;}
   if(!Number.isInteger(frames)||frames<1||frames>1024||d.start!==this.written||this.written-this.read+frames>this.capacity){this.fail('Invalid PCM transport bounds');return;}
   for(let i=0;i<frames;i++){const at=((this.written+i)%this.capacity)*this.channels;for(let channel=0;channel<this.channels;channel++)this.ring[at+channel]=pcm[i*this.channels+channel];}
   this.written+=frames;this.maxQueued=Math.max(this.maxQueued,this.written-this.read);
  }
 }
 process(inputs,outputs){
  const output=outputs[0];if(output.length!==this.channels)return true;
  for(const channel of output)channel.fill(0);
  const n=this.running?Math.min(output[0].length,this.written-this.read):0;
  for(let i=0;i<n;i++){const at=((this.read+i)%this.capacity)*this.channels;for(let channel=0;channel<this.channels;channel++)output[channel][i]=this.ring[at+channel];}
  if(this.running&&n<output[0].length){
   this.underruns++;
   // Retain bounded evidence distinguishing a real in-stream starvation from
   // the final partial device quantum. Counters remain cumulative and unchanged.
   if(this.underrunEvents.length<64)this.underrunEvents.push({epoch:this.epoch,read:this.read,written:this.written,consumed:n,quantum:output[0].length,audioFrame:typeof currentFrame==='number'?currentFrame:null});
  }
  if(n&&this.record){
   if(this.captureSamples+n*this.channels>this.captureLimit){this.record=false;this.port.postMessage({type:'error',error:'Diagnostic capture budget exceeded'});}
   else{for(let i=0;i<n;i++)for(let channel=0;channel<this.channels;channel++)this.capture[this.captureSamples+i*this.channels+channel]=output[channel][i];this.captureSamples+=n*this.channels;}
  }
  this.read+=n;
  if(n)this.link.postMessage({type:'consumed',epoch:this.epoch,frames:this.read});
  return true;
 }
}
registerProcessor('demuxe-private-pcm',PrivatePCM);
