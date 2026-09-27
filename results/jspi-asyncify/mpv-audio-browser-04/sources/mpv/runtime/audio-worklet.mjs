// SPDX-License-Identifier: MIT
// Bounded private-memory transport. Only rendered frames advance consumption.
class PrivatePCM extends AudioWorkletProcessor {
 constructor(){
  super();this.epoch=-1;this.read=0;this.written=0;this.running=false;
  this.ring=new Float32Array(8192*2);this.underruns=0;this.stale=0;this.maxQueued=0;
  this.capture=[];this.captureSamples=0;this.record=false;
  this.port.onmessage=({data:d})=>{
   if(d.type==='connect'){this.link=d.port;this.link.onmessage=({data})=>this.receive(data);this.link.start();}
   if(d.type==='record'){this.record=true;this.capture=[];this.captureSamples=0;this.port.postMessage({type:'recording',id:d.id});}
   if(d.type==='inspect'){
    const pcm=new Float32Array(this.captureSamples);let at=0;for(const part of this.capture){pcm.set(part,at);at+=part.length;}
    this.port.postMessage({type:'inspection',id:d.id,epoch:this.epoch,read:this.read,written:this.written,underruns:this.underruns,stale:this.stale,maxQueued:this.maxQueued,pcm:pcm.buffer},[pcm.buffer]);
   }
  };
 }
 receive(d){
  if(d.type==='reset'){
   if(!Number.isInteger(d.epoch)||d.epoch<0||d.epoch>0xffffffff||(d.epoch&1)||d.epoch<=this.epoch){this.stale++;return;}
   this.epoch=d.epoch;this.read=this.written=0;this.running=false;
   this.link.postMessage({type:'resetAck',epoch:this.epoch});return;
  }
  if(d.epoch!==this.epoch){this.stale++;return;}
  if(d.type==='state'){this.running=d.running;return;}
  if(d.type==='pcm'){
   const pcm=new Float32Array(d.buffer),frames=pcm.length/2;
   if(!Number.isInteger(frames)||frames<1||frames>1024||d.start!==this.written||this.written-this.read+frames>8192){this.running=false;this.link.postMessage({type:'error',error:'Invalid PCM transport bounds'});return;}
   for(let i=0;i<frames;i++){const at=((this.written+i)%8192)*2;this.ring[at]=pcm[i*2];this.ring[at+1]=pcm[i*2+1];}
   this.written+=frames;this.maxQueued=Math.max(this.maxQueued,this.written-this.read);
  }
 }
 process(inputs,outputs){
  const output=outputs[0];if(output.length!==2)return true;
  const n=this.running?Math.min(output[0].length,this.written-this.read):0;
  for(let i=0;i<n;i++){const at=((this.read+i)%8192)*2;output[0][i]=this.ring[at];output[1][i]=this.ring[at+1];}
  if(this.running&&n<output[0].length)this.underruns++;
  if(n&&this.record){
   if(this.captureSamples+n*2>2000000){this.record=false;this.port.postMessage({type:'error',error:'Diagnostic capture budget exceeded'});}
   else{const part=new Float32Array(n*2);for(let i=0;i<n;i++){part[i*2]=output[0][i];part[i*2+1]=output[1][i];}this.capture.push(part);this.captureSamples+=part.length;}
  }
  this.read+=n;
  if(n)this.link.postMessage({type:'consumed',epoch:this.epoch,frames:this.read});
  return true;
 }
}
registerProcessor('demuxe-private-pcm',PrivatePCM);
