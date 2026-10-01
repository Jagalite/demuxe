import {createContinuationBackend} from './continuations.js';
/* SPDX-License-Identifier: MIT
 * Experimental logical mpv threads on one Worker. Not a POSIX implementation.
 * Every suspending import must use park()/suspend(): independent Promise resume
 * would bypass C-stack ownership. Fatal shutdown abandons the instance; it does
 * NOT unwind suspended C frames. The owner must dispose/terminate the Worker.
 */
export class CoopScheduler {
  constructor({slots=24, maxRetainedTasks=256, unsafeSharedStack=false, contextHooks=null, backend='jspi'}={}) {
    if(!Number.isInteger(slots)||slots<1||slots>256)throw Error('Invalid task stack capacity');
    if(!Number.isInteger(maxRetainedTasks)||maxRetainedTasks<slots||maxRetainedTasks>4096)
      throw Error('Invalid retained-task limit');
    this.continuations=createContinuationBackend(backend,this);
    this.contextHooks=contextHooks;this.slots=slots;this.maxRetainedTasks=maxRetainedTasks;
    this.tasks=new Map();this.ready=[];this.waits=new Map();this.active=null;
    this.free=Array.from({length:slots},(_,i)=>i);this.nextId=1;this.stopListeners=new Set();
    this.unsafeSharedStack=unsafeSharedStack;this.timeoutCode=1;
    this.pendingPump=false;this.stopped=false;this.timers=new Set();
    this.stats={created:0,completed:0,abandoned:0,suspensions:0,resumes:0,maxLive:0,
      timerWakes:0,signals:0,stackChecks:0};
    this.channel=new MessageChannel();
    this.channel.port1.onmessage=()=>{this.pendingPump=false;this.pump();};
    this.imports={
      self:()=>this.self(),
      panic:(ptr,line)=>{throw Error(`Cooperative backend invariant: ${this.readString(ptr)} at threads-coop.c:${line}`);},
      wait:this.wrapImport('demuxe_coop.wait',(key,ms)=>this.wait(key,ms)),
      wake:(key,all)=>this.wake(key,!!all),
      waiters:key=>(this.waits.get(key)?.size??0),
      create:(fn,arg)=>this.create(this.e.demuxe_coop_invoke,[fn,arg],false)?.id??0,
      join:this.wrapImport('demuxe_coop.join',id=>this.join(id)),
      detach:id=>this.detach(id),
      name:ptr=>{this.self();this.active.name=this.readString(ptr);},
      yield:this.wrapImport('demuxe_coop.yield',()=>this.yield()),
    };
  }
  wrapImport(name,fn) {return this.continuations.wrapImport(name,fn);}
  attach(exports) {
    if(this.e||this.stopped)throw Error('Scheduler already attached or closed');
    try {
      if(!(exports?.memory instanceof WebAssembly.Memory)||!(exports.memory.buffer instanceof ArrayBuffer))
        throw Error('A private, non-shared Wasm heap is required');
      for(const n of ['demuxe_coop_invoke','demuxe_coop_get_sp','demuxe_coop_set_sp',
        'demuxe_coop_stack_base','demuxe_coop_stack_top','demuxe_coop_stack_count'])
        if(typeof exports[n]!=='function')throw Error('Missing scheduler export '+n);
      if(exports.demuxe_coop_stack_count()!==this.slots)throw Error('JS/C stack-slot ABI mismatch');
      const bytes=exports.memory.buffer.byteLength,hostSP=exports.demuxe_coop_get_sp()>>>0;
      if(!hostSP||hostSP%16||hostSP>bytes)throw Error('Invalid host stack pointer');
      const ranges=[];
      for(let slot=0;slot<this.slots;slot++) {
        const lo=exports.demuxe_coop_stack_base(slot)>>>0,hi=exports.demuxe_coop_stack_top(slot)>>>0;
        if(lo%16||hi%16||hi-lo<128||hi>bytes)throw Error('Invalid C-stack bounds');
        if(ranges.some(r=>lo<r.hi&&hi>r.lo))throw Error('Overlapping C stacks');
        if(hostSP>=lo&&hostSP<=hi)throw Error('C stack overlaps host stack pointer');
        ranges.push(Object.freeze({lo,hi}));
      }
      this.cStacks=Object.freeze(ranges);
      this.e=exports;this.hostSP=hostSP;
      this.allowedEntries=new Set(Object.values(exports).filter(v=>typeof v==='function'));
      this.continuations.attach(exports);
    } catch(error) {
      // Partial initialization is terminal; do not leave a runnable half-loader
      // or an open MessageChannel behind after any ABI/layout rejection.
      this.fail(error);throw error;
    }
  }
  onStop(fn) {
    if(this.stopped){fn();return ()=>{};}
    this.stopListeners.add(fn);return ()=>this.stopListeners.delete(fn);
  }
  restoreHost() {
    if(!this.unsafeSharedStack)this.e.demuxe_coop_set_sp(this.hostSP);
    this.contextHooks?.idle?.(this.e);
  }
  readString(ptr) {
    const u=new Uint8Array(this.e.memory.buffer);let end=ptr>>>0;ptr=end;
    while(end<u.length&&u[end]&&end-ptr<4096)end++;
    return new TextDecoder().decode(u.subarray(ptr,end));
  }
  self() {if(!this.active)throw Error('Wasm entry without a logical owner');return this.active.id;}
  create(fn,args,root) {
    if(this.stopped||this.free.length===0||this.tasks.size>=this.maxRetainedTasks||this.nextId>0xffffffff)return null;
    if(!this.e||typeof fn!=='function'||!this.allowedEntries.has(fn))
      throw Error('Invalid or unadmitted Wasm entry');
    const slot=this.free[this.free.length-1],id=this.nextId;
    const {lo,hi}=this.cStacks[slot];
    if(lo%16||hi%16||hi-lo<128||hi>this.e.memory.buffer.byteLength)throw Error('Invalid C-stack bounds');
    new Uint8Array(this.e.memory.buffer,lo,64).fill(0xa5);
    this.free.pop();this.nextId++;
    const t={id,slot,lo,hi,sp:hi,status:'new',fn,args,root,joiners:[],detached:false,joined:false};
    if(root)t.promise=new Promise((resolve,reject)=>{t.resolve=resolve;t.reject=reject;});
    this.tasks.set(id,t);this.ready.push(t);this.stats.created++;
    this.stats.maxLive=Math.max(this.stats.maxLive,[...this.tasks.values()].filter(x=>x.status!=='done').length);
    this.schedule();return t;
  }
  run(fn,...args) {
    if(this.stopped)return Promise.reject(Error(this.failure||'Scheduler closed'));
    try{const t=this.create(fn,args,true);return t?t.promise:Promise.reject(Error('Coroutine capacity exceeded'));}
    catch(error){return Promise.reject(error);}
  }
  schedule() {
    if(!this.pendingPump&&!this.stopped){this.pendingPump=true;this.channel.port2.postMessage(0);}
  }
  stackCheck(t) {
    const u=new Uint8Array(this.e.memory.buffer,t.lo,64);
    if(u.some(x=>x!==0xa5))throw Error(`stack canary corrupted in task ${t.id}`);
    if(t.sp<t.lo+64||t.sp>t.hi||t.sp%16)throw Error(`stack pointer out of bounds in task ${t.id}: ${t.sp}`);
    this.stats.stackChecks++;
  }
  pump() {
    if(this.active||this.stopped)return;
    let t;while((t=this.ready.shift())&&t.status!=='new'&&t.status!=='ready'){}
    if(!t)return;
    try {
      this.active=t;if(!this.unsafeSharedStack)this.stackCheck(t);
      if(!this.unsafeSharedStack)this.e.demuxe_coop_set_sp(t.sp);
      this.contextHooks?.enter(t,this.e);
      if(t.status==='new') {
        t.status='running';
        this.continuations.begin(t);
      } else {
        t.status='running';this.stats.resumes++;
        const value=t.resumeAction?t.resumeAction():t.resumeValue;
        t.resumeAction=null;this.continuations.resume(t,value);
      }
    }catch(error){this.fail(error);}
  }
  finish(t,error,value) {
    if(this.stopped)return;
    try {
      if(this.active!==t)throw Error('Task completion violated single-owner invariant');
      this.contextHooks?.leave(t,this.e);t.sp=this.e.demuxe_coop_get_sp()>>>0;
      if(!this.unsafeSharedStack)this.stackCheck(t);
      this.active=null;this.restoreHost();
      if(error){this.fail(error);return;}
      t.status='done';t.value=value;this.stats.completed++;this.free.push(t.slot);t.slot=null;
      for(const waiter of t.joiners)this.readyWait(waiter,0);
      t.joiners=[];
      if(t.root){t.resolve(value);this.tasks.delete(t.id);}else if(t.detached)this.tasks.delete(t.id);
      this.schedule();
    }catch(e){this.fail(e);}
  }
  park(arm) {
    const t=this.active;if(!t||this.stopped)throw Error('Suspend without active owner');
    this.contextHooks?.leave(t,this.e);t.sp=this.e.demuxe_coop_get_sp()>>>0;
    if(!this.unsafeSharedStack)this.stackCheck(t);
    t.status='waiting';this.stats.suspensions++;
    const p=this.continuations.park(t);
    const w={task:t,done:false,cleanup:()=>{}};
    try{arm(w);}catch(error){this.fail(error);}
    this.schedule();return p;
  }
  releaseSuspended(t) {
    if(this.stopped)return;
    if(this.active!==t)throw Error('Suspension owner changed before export unwound');
    // park() schedules only AFTER its waiter/cancellation hooks are armed.
    // Asyncify returns here after unwind; that scheduled message cannot have
    // executed yet, because the Wasm export still owned this JS turn.
    this.active=null;this.restoreHost();
  }
  readyWait(w,value) {
    if(w.done||this.stopped)return false;
    w.done=true;w.cleanup();const t=w.task;
    if(t.status!=='waiting')throw Error('Duplicate wake or bad task state');
    t.resumeValue=value;t.status='ready';this.ready.push(t);this.schedule();return true;
  }
  wait(key,ms) {
    if(!Number.isFinite(ms))throw Error('Invalid condition timeout');
    return this.park(w=>{
      let set=this.waits.get(key);if(!set)this.waits.set(key,set=new Set());set.add(w);
      let timer=null;
      w.cleanup=()=>{set.delete(w);if(set.size===0)this.waits.delete(key);
        if(timer!==null){clearTimeout(timer);this.timers.delete(timer);}};
      if(ms>=0){
        const deadline=performance.now()+ms;
        const tick=()=>{
          if(timer!==null)this.timers.delete(timer);
          if(w.done||this.stopped)return;
          const left=deadline-performance.now();
          if(left>0){timer=setTimeout(tick,Math.min(Math.max(left,1),2147483647));this.timers.add(timer);return;}
          this.stats.timerWakes++;this.readyWait(w,this.timeoutCode);
        };
        timer=setTimeout(tick,Math.min(Math.max(ms,1),2147483647));this.timers.add(timer);
      }
    });
  }
  wake(key,all) {
    const set=this.waits.get(key);if(!set)return;
    for(const w of [...set]){this.stats.signals++;this.readyWait(w,0);if(!all)break;}
  }
  yield() {return this.park(w=>{queueMicrotask(()=>this.readyWait(w,0));});}
  suspend(promise) {
    return this.park(w=>{Promise.resolve(promise).then(v=>this.readyWait(w,v),e=>this.fail(e));});
  }
  join(id) {
    id=id>>>0;
    const t=this.tasks.get(id),me=this.active;
    if(!t||t.root||t.detached||t.joined)return 1;
    if(t===me)return 2;
    t.joined=true;
    if(t.status==='done'){this.tasks.delete(id);return 0;}
    return this.park(w=>{t.joiners.push(w);w.cleanup=()=>this.tasks.delete(id);});
  }
  detach(id) {
    id=id>>>0;
    const t=this.tasks.get(id);if(!t||t.root||t.detached||t.joined)return 1;
    t.detached=true;if(t.status==='done')this.tasks.delete(id);return 0;
  }
  fail(error) {
    if(this.stopped)return;this.failure=String(error?.stack??error);this.close(error);
  }
  close(reason=new Error('Scheduler closed before completion')) {
    if(this.stopped)return;this.stopped=true;this.pendingPump=false;
    for(const fn of this.stopListeners){try{fn();}catch{/* shutdown is terminal */}}
    this.stopListeners.clear();
    for(const t of this.tasks.values()){
      if(t.status!=='done')this.stats.abandoned++;
      if(t.root)t.reject(reason);
      t.resume=null;t.resumeAction=null;t.joiners=[];
    }
    for(const timer of this.timers)clearTimeout(timer);
    this.timers.clear();this.waits.clear();this.ready=[];this.tasks.clear();this.active=null;
    // Do not reuse any stack after abandoned continuations. This instance is dead.
    this.free=[];this.channel.port1.onmessage=null;this.channel.port1.close();this.channel.port2.close();
  }
  snapshot() {
    return {...this.stats,continuations:this.continuations.snapshot(),liveTasks:[...this.tasks.values()].filter(t=>t.status!=='done').length,
      retainedTasks:this.tasks.size,waitKeys:this.waits.size,timers:this.timers.size,
      freeSlots:this.free.length,stopped:this.stopped};
  }
}
