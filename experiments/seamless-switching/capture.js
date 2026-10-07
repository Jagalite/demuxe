// SPDX-License-Identifier: Apache-2.0
class Capture extends AudioWorkletProcessor {
 constructor(){super();this.buffer=new Float32Array(4800);this.offset=0;this.expectedFrame=null;}
 process(inputs,outputs){
  // A newly connected graph can skip between its initial processing quantum
  // and the running context clock. Never concatenate samples across that gap.
  if(this.expectedFrame!==currentFrame){
   if(this.expectedFrame!==null)this.port.postMessage({discontinuity:{expectedFrame:this.expectedFrame,actualFrame:currentFrame,discardedSamples:this.offset}});
   this.offset=0;this.start=currentFrame;
  }
  const input=inputs[0]?.[0],output=outputs[0]?.[0];
  if(output&&input)output.set(input);
  const n=output?.length??128;
  this.expectedFrame=currentFrame+n;
  for(let i=0;i<n;i++){
   this.buffer[this.offset++]=input?.[i]??0;
   if(this.offset===this.buffer.length){this.port.postMessage({frame:this.start,samples:this.buffer},[this.buffer.buffer]);this.buffer=new Float32Array(4800);this.offset=0;this.start=currentFrame+i+1;}
  }
  return true;
 }
}
registerProcessor('capture',Capture);
