import {createContinuationBackend} from './continuations.js';
import {initialCoopState,beginCoopAttachment,finishCoopAttachment,coopTask,coopCanCreate,createCoopTask,scheduleCoopPump,consumeCoopPump,startCoopTask,parkCoopTask,bindCoopWait,releaseCoopTask,settleCoopWait,coopConditionWaits,prepareCoopJoin,detachCoopTask,completeCoopTask,checkedCoopStack,closeCoopState,snapshotCoopState} from '../generated/internal/machine/private-scheduler.js';
/* SPDX-License-Identifier: MIT
 * One Worker owns physical Wasm stacks and continuation handles. Logical task,
 * wait, join and slot authority lives in the synchronous scheduler machine.
 * Fatal shutdown abandons suspended C frames; the Worker must be disposed.
 */
export class CoopScheduler {
  constructor({slots=24,maxRetainedTasks=256,unsafeSharedStack=false,contextHooks=null,backend='jspi'}={}){
    if(!Number.isInteger(slots)||slots<1||slots>256)throw Error('Invalid task stack capacity');
    if(!Number.isInteger(maxRetainedTasks)||maxRetainedTasks<slots||maxRetainedTasks>4096)throw Error('Invalid retained-task limit');
    this.machine=initialCoopState(slots,maxRetainedTasks);this.tasks=new Map();this.waiters=new Map();this.stopListeners=new Set();this.timers=new Set();
    this.continuations=createContinuationBackend(backend,this);this.contextHooks=contextHooks;this.unsafeSharedStack=unsafeSharedStack;this.timeoutCode=1;
    this.channel=new MessageChannel();this.channel.port1.onmessage=()=>{this.machine=consumeCoopPump(this.machine);this.pump();};
    this.imports={self:()=>this.self(),panic:(ptr,line)=>{throw Error(`Cooperative backend invariant: ${this.readString(ptr)} at threads-coop.c:${line}`);},wait:this.wrapImport('demuxe_coop.wait',(key,ms)=>this.wait(key,ms)),wake:(key,all)=>this.wake(key,!!all),waiters:key=>coopConditionWaits(this.machine,key,true).length,create:(fn,arg)=>this.create(this.e.demuxe_coop_invoke,[fn,arg],false)?.id??0,join:this.wrapImport('demuxe_coop.join',id=>this.join(id)),detach:id=>this.detach(id),name:ptr=>{this.self();this.active.name=this.readString(ptr);},yield:this.wrapImport('demuxe_coop.yield',()=>this.yield())};
  }
  get slots(){return this.machine.slots;}
  get maxRetainedTasks(){return this.machine.maxRetainedTasks;}
  get active(){return this.machine.active===null?null:this.tasks.get(this.machine.active)??null;}
  get stopped(){return this.machine.stopped;}
  get pendingPump(){return this.machine.pendingPump;}
  get stats(){return this.machine.stats;}
  get free(){return this.machine.free;}
  get nextId(){return this.machine.nextId;}
  get ready(){return this.machine.ready.map(id=>this.tasks.get(id)).filter(Boolean);}
  wrapImport(name,fn) {return this.continuations.wrapImport(name,fn);}
  attach(exports){
    const admitted=beginCoopAttachment(this.machine);this.machine=admitted.state;if(!admitted.accepted)throw Error('Scheduler already attached or closed');
    const current=()=>{if(this.stopped||this.machine.attachment!=='attaching')throw Error('Scheduler closed during attachment');};
    try{
      const memory=exports?.memory;current();const buffer=memory?.buffer;current();
      if(!(memory instanceof WebAssembly.Memory)||!(buffer instanceof ArrayBuffer))throw Error('A private, non-shared Wasm heap is required');
      const api={};
      for(const name of ['demuxe_coop_invoke','demuxe_coop_get_sp','demuxe_coop_set_sp','demuxe_coop_stack_base','demuxe_coop_stack_top','demuxe_coop_stack_count']){const value=exports[name];current();if(typeof value!=='function')throw Error('Missing scheduler export '+name);api[name]=value;}
      const count=api.demuxe_coop_stack_count.call(exports);current();if(count!==this.slots)throw Error('JS/C stack-slot ABI mismatch');
      const bytes=buffer.byteLength,hostSP=api.demuxe_coop_get_sp.call(exports)>>>0;current();if(!hostSP||hostSP%16||hostSP>bytes)throw Error('Invalid host stack pointer');
      const ranges=[];
      for(let slot=0;slot<this.slots;slot++){
        const lo=api.demuxe_coop_stack_base.call(exports,slot)>>>0;current();const hi=api.demuxe_coop_stack_top.call(exports,slot)>>>0;current();
        if(lo%16||hi%16||hi-lo<128||hi>bytes)throw Error('Invalid C-stack bounds');if(ranges.some(range=>lo<range.hi&&hi>range.lo))throw Error('Overlapping C stacks');if(hostSP>=lo&&hostSP<=hi)throw Error('C stack overlaps host stack pointer');ranges.push(Object.freeze({lo,hi}));
      }
      const entries=new Set(),keys=Object.keys(exports);current();for(const key of keys){const value=exports[key];current();if(typeof value==='function')entries.add(value);}
      this.cStacks=Object.freeze(ranges);this.e=exports;this.hostSP=hostSP;this.allowedEntries=entries;
      this.continuations.attach(exports);current();const accepted=finishCoopAttachment(this.machine);this.machine=accepted.state;if(!accepted.accepted)throw Error('Scheduler closed during attachment');
    }catch(error){
      this.e=undefined;this.cStacks=undefined;this.hostSP=undefined;this.allowedEntries=undefined;this.fail(error);throw error;
    }
  }
  onStop(fn){if(this.stopped){fn();return()=>{};}this.stopListeners.add(fn);return()=>this.stopListeners.delete(fn);}
  restoreHost(){if(!this.unsafeSharedStack)this.e.demuxe_coop_set_sp(this.hostSP);if(!this.stopped)this.contextHooks?.idle?.(this.e);}
  readString(ptr) {
    const u=new Uint8Array(this.e.memory.buffer);let end=ptr>>>0;ptr=end;
    while(end<u.length&&u[end]&&end-ptr<4096)end++;
    return new TextDecoder().decode(u.subarray(ptr,end));
  }
  self(){if(!this.active)throw Error('Wasm entry without a logical owner');return this.active.id;}
  create(fn,args,root){
    if(!coopCanCreate(this.machine))return null;
    if(this.machine.attachment!=='attached'||!this.e||typeof fn!=='function'||!this.allowedEntries.has(fn))throw Error('Invalid or unadmitted Wasm entry');
    const memory=this.e.memory.buffer;if(!coopCanCreate(this.machine))return null;
    const slot=this.machine.free[this.machine.free.length-1],{lo,hi}=this.cStacks[slot];
    if(lo%16||hi%16||hi-lo<128||hi>memory.byteLength)throw Error('Invalid C-stack bounds');
    const decision=createCoopTask(this.machine,root);this.machine=decision.state;if(!decision.task)return null;
    const id=decision.task.id;new Uint8Array(memory,lo,64).fill(0xa5);
    const t={id,lo,hi,sp:hi,fn,args};
    for(const key of ['slot','status','root','joined','detached'])Object.defineProperty(t,key,{get:()=>coopTask(this.machine,id)?.[key]??(key==='status'?'done':null)});
    if(root)t.promise=new Promise((resolve,reject)=>{t.resolve=resolve;t.reject=reject;});
    this.tasks.set(id,t);this.schedule();return t;
  }
  run(fn,...args){if(this.stopped)return Promise.reject(Error(this.failure||'Scheduler closed'));try{const task=this.create(fn,args,true);return task?task.promise:Promise.reject(Error('Coroutine capacity exceeded'));}catch(error){return Promise.reject(error);}}
  schedule(){const decision=scheduleCoopPump(this.machine);this.machine=decision.state;if(decision.send)try{this.channel.port2.postMessage(0);}catch(error){this.fail(error);}}
  stackCheck(t){const u=new Uint8Array(this.e.memory.buffer,t.lo,64);if(u.some(x=>x!==0xa5))throw Error(`stack canary corrupted in task ${t.id}`);if(t.sp<t.lo+64||t.sp>t.hi||t.sp%16)throw Error(`stack pointer out of bounds in task ${t.id}: ${t.sp}`);this.machine=checkedCoopStack(this.machine);}
  pump(){
    const decision=startCoopTask(this.machine);this.machine=decision.state;if(decision.id===null)return;const t=this.tasks.get(decision.id);
    try{
      if(!t)throw Error('Logical task has no continuation owner');
      if(!this.unsafeSharedStack)this.stackCheck(t);if(this.stopped)return;
      if(!this.unsafeSharedStack)this.e.demuxe_coop_set_sp(t.sp);if(this.stopped)return;
      this.contextHooks?.enter(t,this.e);if(this.stopped)return;
      if(decision.fresh)this.continuations.begin(t);
      else{const action=t.resumeAction;t.resumeAction=null;const value=action?action():t.resumeValue;if(!this.stopped)this.continuations.resume(t,value);}
    }catch(error){this.fail(error);}
  }
  finish(t,error,value){
    if(this.stopped)return;
    try{
      if(this.active!==t)throw Error('Task completion violated single-owner invariant');
      this.contextHooks?.leave(t,this.e);if(this.stopped)return;t.sp=this.e.demuxe_coop_get_sp()>>>0;
      if(!this.unsafeSharedStack)this.stackCheck(t);if(this.stopped)return;
      // Retain the physical owner while restoring the host stack: an idle hook
      // cannot recursively pump a different C stack before restoration returns.
      this.restoreHost();if(this.stopped)return;if(error){this.fail(error);return;}
      const decision=completeCoopTask(this.machine,t.id);this.machine=decision.state;if(!decision.accepted)throw Error('Task completion violated single-owner invariant');
      t.value=value;const wakes=decision.wake.map(id=>this.waiters.get(id)).filter(Boolean);
      for(const waiter of wakes){this.waiters.delete(waiter.id);waiter.task.resumeValue=0;}
      for(const id of decision.remove)this.tasks.delete(id);
      for(const waiter of wakes){waiter.cleanup();if(this.stopped)return;}
      t.resolve?.(value);this.schedule();
    }catch(failure){this.fail(failure);}
  }
  park(arm){
    const t=this.active;if(!t||this.stopped)throw Error('Suspend without active owner');
    this.contextHooks?.leave(t,this.e);if(this.stopped)throw Error('Scheduler closed');t.sp=this.e.demuxe_coop_get_sp()>>>0;
    if(!this.unsafeSharedStack)this.stackCheck(t);
    const decision=parkCoopTask(this.machine);this.machine=decision.state;if(!decision.wait)throw Error('Suspend without active owner');
    const w={id:decision.wait.id,task:t,cleanup:()=>{}};Object.defineProperty(w,'done',{get:()=>!this.machine.waits.some(wait=>wait.id===w.id)});this.waiters.set(w.id,w);
    const promise=this.continuations.park(t);
    if(!this.stopped)try{arm(w);}catch(error){this.fail(error);}
    this.schedule();return promise;
  }
  releaseSuspended(t){
    if(this.stopped)return;if(this.active!==t)throw Error('Suspension owner changed before export unwound');
    this.restoreHost();const decision=releaseCoopTask(this.machine,t.id);this.machine=decision.state;if(!decision.accepted&&!this.stopped)throw Error('Suspension owner changed before export unwound');
  }
  readyWait(w,value,kind='ready',now){
    const decision=settleCoopWait(this.machine,w.id,kind,now);this.machine=decision.state;if(decision.invalid)throw Error('Duplicate wake or bad task state');if(!decision.accepted)return false;
    this.waiters.delete(w.id);w.task.resumeValue=value;if(decision.remove!==null)this.tasks.delete(decision.remove);
    try{w.cleanup();}catch(error){this.fail(error);return false;}if(this.stopped)return false;this.schedule();return true;
  }
  wait(key,ms){
    if(!Number.isFinite(ms))throw Error('Invalid condition timeout');
    const deadline=ms>=0?performance.now()+ms:null;
    return this.park(w=>{
      this.machine=bindCoopWait(this.machine,w.id,{key,deadline});let registration=null;
      w.cleanup=()=>{const current=registration;registration=null;if(current?.handle!==undefined){clearTimeout(current.handle);this.timers.delete(current);}};
      if(deadline!==null){
        const arm=()=>{
          if(w.done||this.stopped)return;const current={handle:undefined};registration=current;
          const delay=Math.min(Math.max(deadline-performance.now(),1),2147483647);
          const acquired=setTimeout(()=>{
            this.timers.delete(current);if(registration!==current)return;registration=null;
            if(w.done||this.stopped)return;
            try{const now=performance.now();if(now<deadline){arm();return;}this.readyWait(w,this.timeoutCode,'timeout',now);}catch(error){this.fail(error);}
          },delay);current.handle=acquired;
          if(registration===current&&!w.done&&!this.stopped)this.timers.add(current);else try{clearTimeout(acquired);}catch(error){this.timers.add(current);throw error;}
        };arm();
      }
    });
  }
  wake(key,all){for(const id of coopConditionWaits(this.machine,key,all)){const waiter=this.waiters.get(id);if(waiter)this.readyWait(waiter,0,'signal');}}
  yield(){return this.park(waiter=>{queueMicrotask(()=>this.readyWait(waiter,0));});}
  suspend(promise){return this.park(waiter=>{Promise.resolve(promise).then(value=>this.readyWait(waiter,value),error=>this.fail(error));});}
  join(id){
    id=id>>>0;const decision=prepareCoopJoin(this.machine,id);this.machine=decision.state;if(decision.remove)this.tasks.delete(id);if(!decision.wait)return decision.code;
    return this.park(waiter=>{this.machine=bindCoopWait(this.machine,waiter.id,{join:id});});
  }
  detach(id){const decision=detachCoopTask(this.machine,id>>>0);this.machine=decision.state;if(decision.remove)this.tasks.delete(id>>>0);return decision.code;}
  fail(error){if(this.stopped)return;this.failure=String(error?.stack??error);this.close(error);}
  close(reason=new Error('Scheduler closed before completion')){
    if(this.stopped)return;const tasks=[...this.tasks.values()],waiters=[...this.waiters.values()];this.machine=closeCoopState(this.machine);this.tasks.clear();this.waiters.clear();
    const listeners=[...this.stopListeners];this.stopListeners.clear();for(const fn of listeners)try{fn();}catch{}
    for(const task of tasks){task.reject?.(reason);task.resume=null;task.resumeAction=null;}
    const clean=work=>{try{work();}catch(error){this.cleanupFailure??=error;}};
    for(const waiter of waiters)clean(()=>waiter.cleanup());
    for(const timer of this.timers)clean(()=>{clearTimeout(timer.handle);this.timers.delete(timer);});
    clean(()=>{this.channel.port1.onmessage=null;});clean(()=>this.channel.port1.close());clean(()=>this.channel.port2.close());
  }
  snapshot(){return {...snapshotCoopState(this.machine),continuations:this.continuations.snapshot(),timers:this.timers.size};}
}
