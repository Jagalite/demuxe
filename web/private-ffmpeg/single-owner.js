// SPDX-License-Identifier: MIT
import {initialFfmpegOwner,transitionFfmpegOwner} from '../generated/internal/machine/ffmpeg-owner.js';
// Serialized native execution. The composed or local core owns logical state;
// promises, continuation values and callbacks stay in these physical records.
export class SingleOwner {
  constructor({store}={}){this.store=store;if(!store)this.localState=initialFfmpegOwner();this.task=null;this.waiters=new Map();this.stopListeners=new Set();}
  get state(){return this.store?this.store.read():this.localState;}
  move(input){const decision=this.store?this.store.dispatch(input):transitionFfmpegOwner(this.localState,input);if(!this.store)this.localState=decision.state;return decision;}
  get active(){return this.task?.id===this.state.active?this.task:null;}
  get stopped(){return this.state.closed;}
  onStop(fn){if(this.stopped){fn();return()=>{};}this.stopListeners.add(fn);return()=>this.stopListeners.delete(fn);}
  cleanup(work){try{work();}catch(error){this.move({type:'cleanup-failed'});this.cleanupFailure??=error;}}
  invoke(thunk){
    const admitted=this.move({type:'begin'});if(!admitted.accepted)return Promise.reject(Error(admitted.reason==='closed'?'FFmpeg owner closed':'FFmpeg operation already active'));
    let resolve,reject;const result=new Promise((yes,no)=>{resolve=yes;reject=no;}),task={id:admitted.id,resumeAction:null,promise:result,resolve,reject};
    Object.defineProperty(task,'waiting',{get:()=>this.state.wait?.task===task.id});this.task=task;
    const finish=(success,value)=>{
      const current=this.state.active===task.id,decision=this.move({type:'complete',task:task.id});if(!decision.accepted)return;
      if(this.task===task)this.task=null;
      if(decision.retireWait!==undefined)this.retireWait(decision.retireWait,Error('FFmpeg operation completed before source wait'));
      if(current)(success?resolve:reject)(value);
    };
    let execution;try{execution=Promise.resolve(thunk());}catch(error){execution=Promise.reject(error);}execution.then(value=>finish(true,value),error=>finish(false,error));
    return result;
  }
  park(arm){
    const task=this.active;if(!task||this.stopped)throw Error('Read without an active FFmpeg owner');
    const admitted=this.move({type:'park',task:task.id});if(!admitted.accepted)throw Error('Overlapping source waits');
    let resolve,reject;const result=new Promise((yes,no)=>{resolve=yes;reject=no;}),waiter={id:admitted.id,task,resolve,reject,cleanup:()=>{}};
    Object.defineProperty(waiter,'done',{get:()=>this.state.wait?.id!==waiter.id||this.state.wait.phase!=='pending'});
    let cleanup=()=>{};Object.defineProperty(waiter,'cleanup',{get:()=>cleanup,set:value=>{if(waiter.done){cleanup=()=>{};this.cleanup(value);}else cleanup=value;}});this.waiters.set(waiter.id,waiter);
    try{arm(waiter);}catch(error){this.move({type:'settled',task:task.id,wait:waiter.id});this.retireWait(waiter.id,error);}
    return result;
  }
  retireWait(id,error){const waiter=this.waiters.get(id);if(!waiter)return;this.waiters.delete(id);const clean=waiter.cleanup;waiter.cleanup=()=>{};waiter.task.resumeAction=null;this.cleanup(()=>clean());waiter.reject(error);}
  readyWait(waiter,value){
    const decision=this.move({type:'ready',task:waiter.task.id,wait:waiter.id});if(!decision.accepted)return false;
    const clean=waiter.cleanup;waiter.cleanup=()=>{};
    try{clean();}catch(error){this.move({type:'cleanup-failed'});this.move({type:'settled',task:waiter.task.id,wait:waiter.id});this.retireWait(waiter.id,error);return false;}
    const deliver=()=>{
      const task=waiter.task;if(!this.move({type:'deliver',task:task.id,wait:waiter.id}).accepted)return;
      try{
        const action=task.resumeAction;task.resumeAction=null;const result=action?action():value;
        if(!this.move({type:'settled',task:task.id,wait:waiter.id}).accepted)return;
        this.waiters.delete(waiter.id);waiter.resolve(result);
      }catch(error){this.move({type:'settled',task:task.id,wait:waiter.id});this.retireWait(waiter.id,error);}
    };
    if(this.stopped||this.state.wait?.id!==waiter.id)return false;
    try{queueMicrotask(deliver);}catch(error){this.move({type:'settled',task:waiter.task.id,wait:waiter.id});this.retireWait(waiter.id,error);return false;}
    return true;
  }
  async idle(){const task=this.task;if(task)await task.promise.catch(()=>{});}
  close(reason=Error('FFmpeg owner closed')){
    const decision=this.move({type:'close'});if(!decision.accepted)return;
    const task=this.task,listeners=[...this.stopListeners];this.stopListeners.clear();
    if(decision.retireWait!==undefined)this.retireWait(decision.retireWait,reason);
    if(task&&decision.retireTask===task.id)task.reject(reason);
    for(const listener of listeners)this.cleanup(listener);
  }
}
