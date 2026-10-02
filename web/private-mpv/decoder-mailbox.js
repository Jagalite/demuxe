// SPDX-License-Identifier: MIT
// Browser results remain physically owned here until the requesting native
// continuation is restored. The pure request lease owns publication authority.
import {initialDecoderMailbox,validDecoderRequest,validDecoderPacket,beginDecoderRequest,canSettleDecoderRequest,settleDecoderRequest,cancelDecoderRequest,retireDecoderMailbox,decoderCommitCurrent,decoderRequestResult,beginDecoderCommit,failDecoderCommit,failDecoderRelease,validDecoderFrameIdentity,finishDecoderCommit,validDecoderResponse} from '../generated/internal/machine/private-decoder-mailbox.js';
const IO=-29,PACKET_MAX=8*1024*1024;
export class CooperativeDecoderMailbox {
  constructor(scheduler,service,{timeoutMs=5000,onFrame=frame=>frame.close(),onReleaseFrame=()=>{},retainedLease=false,now=()=>performance.now(),setTimer=(callback,delay)=>globalThis.setTimeout(callback,delay),clearTimer=timer=>globalThis.clearTimeout(timer)}={}) {
    if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>60000)throw Error('Invalid decoder deadline');
    if(typeof service?.execute!=='function'||typeof service?.cancel!=='function')throw Error('Invalid decoder service');
    this.scheduler=scheduler;this.service=service;this.timeoutMs=timeoutMs;this.onFrame=onFrame;this.onReleaseFrame=onReleaseFrame;this.retainedLease=retainedLease;this.now=now;this.setTimer=setTimer;this.clearTimer=clearTimer;
    this.machine=initialDecoderMailbox();this.requestHandle=null;
    this.imports={request:scheduler.wrapImport('demuxe_decoder.request',(ptr,operation)=>this.request(ptr,operation)),release:(generation,id)=>this.releaseFrame(generation,id)};
    this.unsubscribe=scheduler.onStop(()=>this.close());
  }
  get closed(){return this.machine.closed;}get generation(){return this.machine.generation;}get stats(){return this.machine.stats;}
  get pending(){return this.machine.pending?.phase!=='done'?this.requestHandle:null;}
  releaseFrame(generation,id){
    if(this.closed||!this.retainedLease||!validDecoderFrameIdentity(generation,id))return;
    // Called synchronously by native final-unref. Never suspend, reenter native,
    // or throw through a native destructor; the host observes boundary failure.
    try{this.onReleaseFrame(generation,id);}catch(error){this.machine=failDecoderRelease(this.machine);this.error=String(error);}
  }
  attach(memory) {
    if(!(memory instanceof WebAssembly.Memory)||!(memory.buffer instanceof ArrayBuffer))throw Error('Private decoder memory required');
    if(this.memory&&this.memory!==memory&&this.pending)this.cancel();this.memory=memory;
  }
  clearDeadline(request){
    const timer=request.timer;request.timer=null;request.timerToken=null;
    if(timer!==null)try{this.clearTimer(timer);}catch(error){
      // A failed physical cancellation must not prevent signal/frame retirement
      // or the native wake. The detached token also fences any later callback.
      if(this.machine.pending?.id===request.id){this.machine=failDecoderCommit(this.machine,request.id,'boundary');this.error=String(error);}
    }
  }
  discard(request){const response=request.response;request.response=null;response?.frame?.close();}
  boundaryFailure(request,error){
    this.machine=failDecoderCommit(this.machine,request.id,'boundary');this.error=String(error);this.abort(request);
  }
  wake(request){
    if(!request.wait)return;
    try{this.scheduler.readyWait(request.wait,0);}catch(error){this.machine=failDecoderCommit(this.machine,request.id,'boundary');this.error=String(error);try{this.close();}finally{this.scheduler.fail?.(error);}}
  }
  deadline(request,delay){
    const token={};request.timerToken=token;
    try{
      const timer=this.setTimer(()=>{if(request.timerToken!==token)return;request.timer=null;request.timerToken=null;this.abort(request,true);},delay);
      if(request.timerToken===token)request.timer=timer;else this.clearTimer(timer);
    }catch(error){request.timerToken=null;this.boundaryFailure(request,error);}
  }
  abort(request,timeout=false){
    const decision=cancelDecoderRequest(this.machine,request.id,timeout,this.now());this.machine=decision.state;
    if(decision.remaining!==null){this.deadline(request,decision.remaining);return;}
    if(!decision.accepted)return;
    if(timeout)this.error='Retained decoder request deadline exceeded';
    this.clearDeadline(request);
    // Revoke result ownership before abort listeners or frame cleanup can reenter.
    const response=request.response;request.response=null;
    try{request.controller.abort();}finally{try{response?.frame?.close();}finally{if(decision.wake)this.wake(request);}}
  }
  capture(response){
    if(!response)throw Error('Invalid decoder result');
    const fields=response.fields,fieldsValid=fields===undefined||Array.isArray(fields),pixels=response.pixels;
    const captured={...response,fields:fieldsValid&&fields?fields.slice():fields,pixels:pixels instanceof Uint8Array?pixels.slice():pixels};
    if(!fieldsValid||!validDecoderResponse({result:captured.result,fields:captured.fields,timestamp:captured.timestamp,duration:captured.duration,pixels:!pixels?'none':pixels instanceof Uint8Array?'bytes':'invalid',pixelBytes:pixels?.length??0}))throw Error('Invalid decoder result');
    if(this.retainedLease&&captured.result>0&&(!captured.frame||!validDecoderFrameIdentity(captured.generation,captured.frameId)))throw Error('Invalid retained native frame identity');
    return captured;
  }
  settle(request,response,failed=false){
    if(!canSettleDecoderRequest(this.machine,request.id)){this.machine=settleDecoderRequest(this.machine,request.id,IO).state;response?.frame?.close();return;}
    let captured,valid=!failed;
    try{captured=this.capture(response);}catch(error){this.error=String(error);valid=false;const frame=response?.frame;response=null;frame?.close();captured={result:IO};}
    const decision=settleDecoderRequest(this.machine,request.id,captured.result,valid);this.machine=decision.state;
    if(!decision.accepted){captured.frame?.close();return;}
    if(!valid)captured.result=IO;request.response=captured;this.clearDeadline(request);this.wake(request);
  }
  resume(request){
    const decision=beginDecoderCommit(this.machine,request.id);this.machine=decision.state;if(!decision.accepted)return decision.result;
    let committed=false;
    try{
      if(!decoderCommitCurrent(this.machine,request.id)||request.controller.signal.aborted||this.memory!==request.memory)return decoderRequestResult(this.machine,request.id);
      const response=request.response??{result:IO};
      if(request.ptr>this.memory.buffer.byteLength-80||response.pixels&&request.ptr+80+PACKET_MAX>this.memory.buffer.byteLength-response.pixels.length)return IO;
      if(response.frame){
        const frame=response.frame;response.frame=null;
        try{this.onFrame(frame,response.generation,this.retainedLease?response.frameId:null);}catch(error){
          frame.close();this.machine=failDecoderCommit(this.machine,request.id,'presentation');this.error=String(error);
          if(decoderCommitCurrent(this.machine,request.id)&&this.memory===request.memory&&request.ptr<=this.memory.buffer.byteLength-80)new Int32Array(this.memory.buffer,request.ptr,16)[3]=IO;
          return IO;
        }
      }
      // The presentation callback may retire this request or grow native memory.
      // Reacquire and validate only after it has transferred frame ownership.
      if(!decoderCommitCurrent(this.machine,request.id)||request.controller.signal.aborted||this.memory!==request.memory)return decoderRequestResult(this.machine,request.id);
      const memory=this.memory.buffer;if(request.ptr>memory.byteLength-80||response.pixels&&request.ptr+80+PACKET_MAX>memory.byteLength-response.pixels.length)return IO;
      const fields=new Int32Array(memory,request.ptr,16),data=new DataView(memory,request.ptr,80);
      if(response.fields)fields.set(response.fields,5);
      if(this.retainedLease){fields[13]=response.frameId===undefined?0:response.generation;fields[14]=response.frameId??0;fields[15]=1;}
      if(response.timestamp!==undefined)data.setFloat64(64,response.timestamp,true);
      if(response.duration!==undefined)data.setFloat64(72,response.duration,true);
      if(response.pixels)new Uint8Array(memory,request.ptr+80+PACKET_MAX,response.pixels.length).set(response.pixels);
      fields[3]=response.result;committed=true;return response.result;
    }finally{
      this.machine=finishDecoderCommit(this.machine,request.id,committed);
      if(this.requestHandle===request)this.requestHandle=null;this.discard(request);
    }
  }
  request(ptr,operation) {
    ptr>>>=0;const memory=this.memory;
    if(this.closed||this.pending||!memory||!validDecoderRequest(ptr,operation,memory.buffer.byteLength))return IO;
    const header=new Int32Array(memory.buffer,ptr,16),view=new DataView(memory.buffer,ptr,80),size=operation===1||operation===2?header[4]:0;
    if(!validDecoderPacket(ptr,operation,memory.buffer.byteLength,size))return IO;
    const input={operation,fields:Array.from(header),timestamp:view.getFloat64(64,true),duration:view.getFloat64(72,true),bytes:new Uint8Array(memory.buffer,ptr+80,size).slice()};
    const decision=beginDecoderRequest(this.machine,this.now(),this.timeoutMs);this.machine=decision.state;if(decision.id===null)return IO;
    const request={id:decision.id,ptr,memory,controller:new AbortController(),timer:null,timerToken:null,response:null,wait:null};this.requestHandle=request;
    try{return this.scheduler.park(wait=>{
      request.wait=wait;wait.task.resumeAction=()=>this.resume(request);this.deadline(request,this.timeoutMs);
      if(!canSettleDecoderRequest(this.machine,request.id))return;
      Promise.resolve().then(()=>request.controller.signal.aborted?{result:IO}:this.service.execute(input,request.controller.signal)).then(response=>this.settle(request,response),()=>this.settle(request,{result:IO},true));
    });}catch(error){this.boundaryFailure(request,error);this.close();throw error;}
  }
  retire(close){
    const decision=retireDecoderMailbox(this.machine,close),request=this.requestHandle;this.machine=decision.state;
    if(close)this.requestHandle=null;
    const errors=[],cleanup=action=>{try{action();}catch(error){errors.push(error);}};
    if(request){cleanup(()=>this.clearDeadline(request));const response=request.response;request.response=null;cleanup(()=>request.controller.abort());cleanup(()=>response?.frame?.close());if(decision.wake)cleanup(()=>this.wake(request));}
    cleanup(()=>this.service.cancel());
    if(close){const unsubscribe=this.unsubscribe;this.unsubscribe=null;cleanup(()=>unsubscribe?.());}
    if(errors.length===1)throw errors[0];if(errors.length)throw new AggregateError(errors,'Decoder mailbox cleanup failed');
  }
  cancel(){this.retire(false);}
  close(){if(!this.closed)this.retire(true);}
  snapshot(){return {...this.machine.stats,error:this.error??null,pending:+!!this.pending,timers:+(this.pending?.timer!==null&&this.pending?.timer!==undefined),closed:this.closed};}
}
