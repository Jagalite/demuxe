// SPDX-License-Identifier: MIT
import {createPrivateRangeState,observePrivateRangeError,privateRangeHandle,validPrivateRangeHandle,installPrivateRangeSource,openPrivateRangeHandle,admitPrivateRangeRead,validPrivateRangeRead,settlePrivateRangeRead,cancelPrivateRangeRead,retirePrivateRangeHandle,retirePrivateRangeSource,planPrivateRangeCommit,finishPrivateRangeCommit} from '../generated/internal/machine/private-range-source.js';
// Bytes, readers and suspended native destinations stay in this effect adapter.
export class RangeSource {
  constructor(scheduler,{timeoutMs=5000,maxPending=8,maxChunk=262144}={}){
    if(!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>60000)throw Error('Invalid range deadline');
    if(!Number.isInteger(maxPending)||maxPending<1||maxPending>64)throw Error('Invalid pending-read limit');
    if(!Number.isInteger(maxChunk)||maxChunk<1||maxChunk>262144)throw Error('Invalid read-chunk limit');
    this.scheduler=scheduler;this.machine=createPrivateRangeState(timeoutMs,maxPending,maxChunk);
    this.reader=null;this.requests=new Map();this.failures=[];
    this.unsubscribeStop=scheduler.onStop(()=>this.abandon());
    this.imports={open:()=>this.open(),size:id=>this.size(id),valid:id=>+validPrivateRangeHandle(this.machine,id),read:scheduler.wrapImport?scheduler.wrapImport('demuxe_source.read',(id,ptr,count,offset)=>this.read(id,ptr,count,offset)):((id,ptr,count,offset)=>this.read(id,ptr,count,offset)),cancel:id=>this.cancelHandle(id),close:id=>this.closeHandle(id),cancel_all:()=>this.cancelSource()};
  }
  get generation(){return this.machine.generation;}
  get source(){const source=this.machine.source;return source?{reader:this.reader,generation:source.generation,cancelled:source.cancelled}:null;}
  get closed(){return this.machine.closed;}
  attach(memory){if(!(memory.buffer instanceof ArrayBuffer))throw Error('Private memory required');this.memory=memory;}
  recordFailure(handle,kind,cause=null){this.failures.push({handle:handle?.id??null,generation:handle?.generation??this.generation,kind,cause});if(this.failures.length>16)this.failures.shift();}
  drainFailures(){const failures=this.failures;this.failures=[];return failures;}
  setSource(reader){
    if(this.closed||this.scheduler.stopped)throw Error('Source adapter closed');
    if(reader instanceof Blob){const blob=reader;reader={size:blob.size,read:async(offset,count,signal)=>{if(signal.aborted)throw Error('aborted');return new Uint8Array(await blob.slice(offset,offset+count).arrayBuffer());}};}
    const size=reader?.size;if(!reader||!Number.isSafeInteger(size)||size<0||typeof reader.read!=='function')throw Error('A finite safely addressable source is required');
    const decision=installPrivateRangeSource(this.machine,size);this.machine=decision.state;if(decision.generation===null)throw Error('Source adapter closed');
    this.reader=reader;this.abortRequests(decision.cancel);return decision.generation;
  }
  open(){const decision=openPrivateRangeHandle(this.machine);this.machine=decision.state;return decision.id;}
  size(id){return privateRangeHandle(this.machine,id)?.size??-1;}
  valid(handle){return validPrivateRangeHandle(this.machine,typeof handle==='number'?handle:handle?.id);}
  read(id,ptr,count,offset){
    ptr=ptr>>>0;const input={handle:id,ptr,count,offset};if(!validPrivateRangeRead(this.machine,input))return -1;
    const memoryBytes=this.memory.buffer.byteLength,now=performance.now();
    const decision=admitPrivateRangeRead(this.machine,{...input,memoryBytes,now});this.machine=decision.state;
    if(!decision.request)return decision.result;
    const request=decision.request,h=privateRangeHandle(this.machine,id),reader=this.reader;let controller;
    try{controller=new AbortController();}catch(error){this.machine=finishPrivateRangeCommit(this.machine,request.id,{reason:'invalid',value:-1});throw error;}
    const live=this.machine.requests.find(item=>item.id===request.id);
    if(!live||live.cancelled||!validPrivateRangeHandle(this.machine,id)){this.machine=finishPrivateRangeCommit(this.machine,request.id,{reason:'failure',value:-1});controller.abort();return -1;}
    const r={id:request.id,reader,controller,timer:null};this.requests.set(r.id,r);
    const clearTimer=()=>{const timer=r.timer;r.timer=null;if(timer?.handle!==undefined)clearTimeout(timer.handle);};
    try{return this.scheduler.park(w=>{
      const finish=(value,readerError=false)=>{
        const pending=this.machine.requests.find(item=>item.id===r.id);let outcome=readerError?'reader-error':'failure';
        if(pending?.phase==='reading'&&!readerError&&typeof value!=='number'){
          if(!(value instanceof Uint8Array)||!value.length||value.length>request.count){outcome='invalid';value=-1;}
          else try{value=Uint8Array.prototype.slice.call(value);outcome='valid';}catch{outcome='invalid';value=-1;}
        }else if(pending?.phase==='reading'&&!readerError&&value!==-1){outcome='invalid';value=-1;}
        const settled=settlePrivateRangeRead(this.machine,r.id,outcome);this.machine=settled.state;if(!settled.accepted)return;
        try{clearTimer();}catch(error){this.recordFailure(h,'reader',error);this.machine=observePrivateRangeError(this.machine);value=-1;}
        // Cancellation remains authoritative until the owner actually resumes.
        w.task.resumeAction=()=>{
          let result={reason:'failure',value:-1};
          try{const heap=new Uint8Array(this.memory.buffer),plan=planPrivateRangeCommit(this.machine,r.id,value instanceof Uint8Array?value.length:null,heap.byteLength);result=plan;if(plan.reason==='copy')heap.set(value,request.ptr);return plan.value;}
          catch(error){result={reason:'invalid',value:-1};throw error;}
          finally{this.machine=finishPrivateRangeCommit(this.machine,r.id,result);this.requests.delete(r.id);}
        };
        try{this.scheduler.readyWait(w,0);}catch(error){
          this.machine=finishPrivateRangeCommit(this.machine,r.id,{reason:'invalid',value:-1});this.requests.delete(r.id);
          try{r.controller.abort();}finally{w.reject?.(error);this.scheduler.fail?.(error);}
        }
      };
      r.abort=()=>{const next=cancelPrivateRangeRead(this.machine,r.id);this.machine=next.state;if(!next.accepted)return;try{r.controller.abort();}finally{finish(-1);}};
      const timerFailure=error=>{this.recordFailure(h,'reader',error);const retired=cancelPrivateRangeRead(this.machine,r.id);this.machine=retired.state;try{r.controller.abort();}finally{finish(-1,true);}};
      const arm=()=>{
        const pending=this.machine.requests.find(item=>item.id===r.id);if(!pending||pending.phase!=='reading'||pending.cancelled)return;
        const registration={handle:undefined};r.timer=registration;
        const timer=setTimeout(()=>{
          if(r.timer!==registration)return;r.timer=null;
          try{
            const now=performance.now(),next=cancelPrivateRangeRead(this.machine,r.id,now);this.machine=next.state;
            if(next.remaining>0){arm();return;}if(!next.accepted)return;
            if(next.timedOut)this.recordFailure(h,'timeout');try{r.controller.abort();}finally{finish(-1);}
          }catch(error){timerFailure(error);}
        },Math.max(0,pending.deadline-performance.now()));
        registration.handle=timer;
        const live=this.machine.requests.find(item=>item.id===r.id);if(r.timer!==registration||live?.phase!=='reading'||live.cancelled){if(r.timer===registration)r.timer=null;clearTimeout(timer);}
      };
      try{arm();}catch(error){timerFailure(error);return;}
      Promise.resolve().then(()=>{
        const live=this.machine.requests.find(item=>item.id===r.id);
        if(!live||live.cancelled||!validPrivateRangeHandle(this.machine,id))return -1;
        return r.reader.read(request.offset,request.count,r.controller.signal);
      }).then(bytes=>finish(bytes),error=>{this.recordFailure(h,'reader',error);finish(-1,true);});
    });}catch(error){
      const retired=cancelPrivateRangeRead(this.machine,r.id);this.machine=retired.state;
      try{clearTimer();}finally{this.machine=finishPrivateRangeCommit(this.machine,r.id,{reason:'failure',value:-1});this.requests.delete(r.id);r.controller.abort();}throw error;
    }
  }
  abortRequests(ids){let failure;for(const id of ids){try{this.requests.get(id)?.abort?.();}catch(error){failure??=error;}}if(failure)throw failure;}
  cancelHandle(id){const next=retirePrivateRangeHandle(this.machine,id);this.machine=next.state;this.abortRequests(next.cancel);}
  closeHandle(id){const next=retirePrivateRangeHandle(this.machine,id,true);this.machine=next.state;this.abortRequests(next.cancel);}
  cancelSource(){const next=retirePrivateRangeSource(this.machine,'cancel');this.machine=next.state;this.abortRequests(next.cancel);}
  abandon(){
    const next=retirePrivateRangeSource(this.machine,'abandon');this.machine=next.state;this.reader=null;
    const requests=[...this.requests.values()];this.requests.clear();this.failures=[];
    let failure;for(const r of requests){const timer=r.timer;r.timer=null;try{if(timer?.handle!==undefined)clearTimeout(timer.handle);}catch(error){failure??=error;}try{r.controller.abort();}catch(error){failure??=error;}}if(failure)throw failure;
  }
  close(){const next=retirePrivateRangeSource(this.machine,'close');this.machine=next.state;this.reader=null;this.abortRequests(next.cancel);}
  snapshot(){return {...this.machine.stats,handles:this.machine.handles.length,pending:this.machine.requests.length,timers:[...this.requests.values()].filter(request=>request.timer!==null).length};}
}
