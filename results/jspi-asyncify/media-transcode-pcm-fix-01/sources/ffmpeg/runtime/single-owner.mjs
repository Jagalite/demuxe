// SPDX-License-Identifier: MIT
// One in-flight FFmpeg operation, no logical pthreads or data-stack switching.
// Used with RangeSource's owned delivery contract. Reentry fails before Wasm.
export class SingleOwner {
  constructor(){this.active=null;this.stopped=false;this.stopListeners=new Set();}
  onStop(fn){if(this.stopped){fn();return ()=>{};}this.stopListeners.add(fn);return ()=>this.stopListeners.delete(fn);}
  invoke(thunk){
    if(this.stopped)return Promise.reject(Error('FFmpeg owner closed'));
    if(this.active)return Promise.reject(Error('FFmpeg operation already active'));
    let rejectStop;
    const stop=new Promise((_,reject)=>{rejectStop=reject;});
    const task={resumeAction:null,rejectStop};this.active=task;
    let execution;
    try{execution=Promise.resolve(thunk());}catch(error){execution=Promise.reject(error);}
    const result=Promise.race([execution,stop]);
    task.promise=result;
    return result.finally(()=>{if(this.active===task)this.active=null;});
  }
  park(arm){
    if(!this.active||this.stopped)throw Error('Read without an active FFmpeg owner');
    const task=this.active;
    if(task.waiting)throw Error('Overlapping source waits');
    task.waiting=true;
    return new Promise((resolve,reject)=>{
      const waiter={task,done:false,resolve,reject,cleanup:()=>{}};
      try{arm(waiter);}catch(error){task.waiting=false;reject(error);}
    });
  }
  readyWait(waiter,value){
    if(waiter.done||this.stopped)return false;waiter.done=true;waiter.cleanup();
    // Recheck source cancellation in resumeAction immediately before delivery.
    queueMicrotask(()=>{
      if(this.stopped)return;
      const task=waiter.task;
      try{
        if(this.active!==task)throw Error('FFmpeg source owner changed');
        const result=task.resumeAction?task.resumeAction():value;
        task.resumeAction=null;task.waiting=false;waiter.resolve(result);
      }catch(error){task.waiting=false;waiter.reject(error);}
    });return true;
  }
  async idle(){if(this.active)await this.active.promise.catch(()=>{});}
  close(reason=Error('FFmpeg owner closed')){
    if(this.stopped)return;this.stopped=true;
    for(const fn of this.stopListeners){try{fn();}catch{}}
    this.stopListeners.clear();
    this.active?.rejectStop(reason);this.active=null;
  }
}
