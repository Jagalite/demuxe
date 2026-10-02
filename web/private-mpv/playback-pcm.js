// SPDX-License-Identifier: MIT
// Native memory and copied samples stay here; immutable metadata owns the protocol.
import {createPrivatePCM,beginPrivatePCMPump,finishPrivatePCMPump,nextPrivatePCMStep,privatePCMFeedback,failPrivatePCM,beginPrivatePCMStop,settlePrivatePCMStop} from '../generated/internal/machine/private-pcm.js';
export class PrivatePCMTransport {
  constructor(engine,ptr,port,latencyUs,capacity=8192,channels=2){
    this.machine=createPrivatePCM('playback',capacity,channels);
    this.engine=engine;this.ptr=ptr;this.port=port;
    const h=this.header();h[6]=1;h[5]=latencyUs;
    port.onmessage=({data})=>this.feedback(data);port.start();
    this.timer=setInterval(()=>{try{this.pump();}catch(error){this.machine=failPrivatePCM(this.machine,String(error)).state;clearInterval(this.timer);}},4);
  }
  get capacity(){return this.machine.capacity;}get channels(){return this.machine.channels;}
  get epoch(){return this.machine.epoch;}get posted(){return this.machine.posted;}get ack(){return this.machine.ack;}
  get running(){return this.machine.running??undefined;}get error(){return this.machine.error;}
  get stopped(){return this.machine.phase!=='active';}
  get maxOutstanding(){return this.machine.maxOutstanding;}get feedbackCount(){return this.machine.feedbackCount;}get staleFeedback(){return this.machine.staleFeedback;}
  header(){return new Uint32Array(this.engine.raw.memory.buffer,this.ptr,8);}
  pump(){
    const admission=beginPrivatePCMPump(this.machine);this.machine=admission.state;if(!admission.accepted)return;
    try{
      for(;;){
        const h=this.header(),step=nextPrivatePCMStep(this.machine,{produced:h[0],consumed:h[1],epoch:h[3],nativeRunning:!!h[2],contextRunning:!!h[6],userPaused:false});this.machine=step.state;
        const effect=step.effect;
        if(effect.kind==='idle')return;
        if(effect.kind==='error')throw Error(effect.message);
        if(effect.kind==='reset'){this.port.postMessage({type:'reset',epoch:effect.epoch,capacity:effect.capacity,channels:effect.channels});return;}
        if(effect.kind==='state'){this.port.postMessage({type:'state',epoch:effect.epoch,running:effect.running});continue;}
        const pcm=new Float32Array(effect.frames*this.channels),ring=new Float32Array(this.engine.raw.memory.buffer,this.ptr+32,this.capacity*this.channels);
        for(let i=0;i<effect.frames;i++){const at=((effect.start+i)%this.capacity)*this.channels;for(let channel=0;channel<this.channels;channel++)pcm[i*this.channels+channel]=ring[at+channel];}
        this.port.postMessage({type:'pcm',epoch:effect.epoch,start:effect.start,buffer:pcm.buffer},[pcm.buffer]);
      }
    }catch(error){this.machine=failPrivatePCM(this.machine,String(error)).state;throw error;}
    finally{this.machine=finishPrivatePCMPump(this.machine);}
  }
  feedback(data){
    if(data.type==='stopped'){this.stopAck?.(data.id);return;}
    if(this.stopped||this.error!==null)return;
    if(data.type==='error'){this.machine=failPrivatePCM(this.machine,String(data.error)).state;return;}
    const h=this.header(),input=data.type==='resetAck'?{kind:'resetAck',epoch:data.epoch}:data.type==='consumed'?{kind:'consumed',epoch:data.epoch,frames:data.frames}:{kind:'other',epoch:data.epoch};
    const feedback=privatePCMFeedback(this.machine,input,h[3],h[1]);this.machine=feedback.state;
    if(feedback.error){this.machine=failPrivatePCM(this.machine,feedback.error).state;return;}
    if(feedback.write){h[7]=feedback.write.epoch;h[1]=feedback.write.consumed;}
    if(feedback.pump)this.pump();
  }
  snapshot(){return {capacity:this.capacity,channels:this.channels,maxOutstanding:this.maxOutstanding,feedbackCount:this.feedbackCount,staleFeedback:this.staleFeedback,error:this.error,header:Array.from(this.header())};}
  stop(){
    if(this.stopPromise)return this.stopPromise;
    const admission=beginPrivatePCMStop(this.machine,performance.now());this.machine=admission.state;
    let resolve,reject,timeout;
    const completion=new Promise((yes,no)=>{resolve=yes;reject=no;});
    this.stopPromise=completion.finally(()=>this.port.close());
    const settle=(input,error)=>{
      const result=settlePrivatePCMStop(this.machine,input);this.machine=result.state;if(result.outcome==='ignore')return false;
      clearTimeout(timeout);this.stopAck=undefined;result.outcome==='resolve'?resolve():reject(error);return true;
    };
    const expire=()=>{if(this.machine.phase!=='stopping')return;try{if(!settle({kind:'deadline',now:performance.now()},Error('Worklet stop deadline')))timeout=setTimeout(expire,Math.max(0,admission.deadline-performance.now()));}catch(error){settle({kind:'send-error'},error);}};
    this.stopAck=id=>settle({kind:'ack',id});
    clearInterval(this.timer);
    try{timeout=setTimeout(expire,Math.max(0,admission.deadline-performance.now()));this.port.postMessage({type:'stop',id:admission.id});}
    catch(error){settle({kind:'send-error'},error);}
    return this.stopPromise;
  }
}
