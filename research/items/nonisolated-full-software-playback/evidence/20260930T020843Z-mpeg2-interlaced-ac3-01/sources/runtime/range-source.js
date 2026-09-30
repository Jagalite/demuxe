// SPDX-License-Identifier: MIT
// Finite source adapter for the experimental single-Worker mpv port.
// All writes to a suspended C destination happen on its owning task's resume.
export class RangeSource {
  constructor(scheduler, {timeoutMs=5000, maxPending=8, maxChunk=262144}={}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs<=0 || timeoutMs>60000)
      throw Error('Invalid range deadline');
    if(!Number.isInteger(maxPending)||maxPending<1||maxPending>64)throw Error('Invalid pending-read limit');
    if(!Number.isInteger(maxChunk)||maxChunk<1||maxChunk>262144)throw Error('Invalid read-chunk limit');
    this.scheduler=scheduler; this.timeoutMs=timeoutMs;
    this.maxPending=maxPending; this.maxChunk=maxChunk;
    this.source=null; this.generation=0; this.nextHandle=1; this.handles=new Map();
    this.requests=new Set(); this.closed=false; this.failures=[];
    this.stats={reads:0,bytes:0,copies:0,cancelled:0,timeouts:0,errors:0,
      lateCompletions:0,staleCommitsRejected:0,maxPending:0,abandonedRequests:0};
    this.unsubscribeStop=scheduler.onStop(()=>this.abandon());
    this.imports={
      open:()=>this.open(), size:id=>this.size(id), valid:id=>+this.valid(this.handles.get(id)),
      read:scheduler.wrapImport ? scheduler.wrapImport('demuxe_source.read',(id,ptr,count,offset)=>this.read(id,ptr,count,offset)) : ((id,ptr,count,offset)=>this.read(id,ptr,count,offset)),
      cancel:id=>this.cancelHandle(id), close:id=>this.closeHandle(id),
      cancel_all:()=>this.cancelSource(),
    };
  }
  attach(memory) {
    if (!(memory.buffer instanceof ArrayBuffer)) throw Error('Private memory required');
    this.memory=memory;
  }
  recordFailure(handle,kind,cause=null) {
    // Host-only error evidence: never put messages, URLs or credentials in snapshot().
    this.failures.push({handle:handle?.id??null,generation:handle?.source.generation??this.generation,kind,cause});
    if(this.failures.length>16)this.failures.shift();
  }
  drainFailures() {const failures=this.failures;this.failures=[];return failures;}
  setSource(reader) {
    if(this.closed||this.scheduler.stopped)throw Error('Source adapter closed');
    if(reader instanceof Blob) {
      const blob=reader;
      reader={size:blob.size, read:async (offset,count,signal)=>{
        if(signal.aborted)throw Error('aborted');
        return new Uint8Array(await blob.slice(offset,offset+count).arrayBuffer());
      }};
    }
    if(!reader || !Number.isSafeInteger(reader.size) || reader.size<0 || typeof reader.read!=='function')
      throw Error('A finite safely addressable source is required');
    this.cancelSource();
    this.source={reader,generation:++this.generation,cancelled:false};
    return this.generation;
  }
  open() {
    if(this.closed || !this.source || this.source.cancelled || this.handles.size>=64 || this.nextHandle>0x7fffffff)return -1;
    const id=this.nextHandle++;
    this.handles.set(id,{id,source:this.source,cancelled:false,closed:false});
    return id;
  }
  size(id) {return this.handles.get(id)?.source.reader.size ?? -1;}
  valid(handle) {return !!handle && !this.closed && !handle.closed && !handle.cancelled && !handle.source.cancelled && handle.source===this.source;}
  read(id,ptr,count,offset) {
    const h=this.handles.get(id); ptr=ptr>>>0;
    if(!this.valid(h) || !Number.isSafeInteger(offset) || offset<0 ||
       !Number.isInteger(count) || count<0 || count>this.maxChunk ||
       offset>h.source.reader.size || ptr>this.memory.buffer.byteLength-count) return -1;
    if(offset===h.source.reader.size || count===0)return 0;
    if(this.requests.size>=this.maxPending)return -1;
    count=Math.min(count,h.source.reader.size-offset);
    const controller=new AbortController();
    const r={h,ptr,count,offset,controller,done:false,settled:false,cancelled:false,timer:null};
    this.requests.add(r); this.stats.reads++;
    this.stats.maxPending=Math.max(this.stats.maxPending,this.requests.size);
    return this.scheduler.park(w=>{
      const finish=(value)=>{
        if(r.done || r.settled) {this.stats.lateCompletions++;return;}
        // Take bounded ownership of a successful result before another callback
        // can mutate or detach the reader's buffer. Never trust a numeric count.
        if(typeof value!=='number') {
          if(!(value instanceof Uint8Array)||!value.length||value.length>count) {
            this.stats.errors++;value=-1;
          } else {
            try { value=value.slice(); } catch { this.stats.errors++;value=-1; }
          }
        } else if(value!==-1) { this.stats.errors++;value=-1; }
        r.settled=true;
        if(r.timer!==null) {clearTimeout(r.timer);r.timer=null;}
        // Delivery is deliberately delayed until the scheduler restores the
        // C task. Cancellation can still revoke an already-ready result.
        w.task.resumeAction=()=>{
          try {
            if(!this.valid(h) || r.cancelled) {this.stats.staleCommitsRejected++;return -1;}
            if(typeof value==='number')return value;
            if(!(value instanceof Uint8Array) || !value.length || value.length>count) {
              this.stats.errors++;return -1; // premature EOF is an error for finite sources
            }
            const heap=new Uint8Array(this.memory.buffer); // re-acquire after memory.grow
            if(ptr>heap.byteLength-value.length) {this.stats.errors++;return -1;}
            heap.set(value,ptr);
            this.stats.copies++;this.stats.bytes+=value.length;
            return value.length;
          }finally {r.done=true;this.requests.delete(r);}
        };
        this.scheduler.readyWait(w,0);
      };
      r.abort=(timedOut=false)=>{
        if(r.done)return;
        if(!r.cancelled) {r.cancelled=true;this.stats.cancelled++;}
        if(timedOut){this.stats.timeouts++;this.recordFailure(h,'timeout');}
        controller.abort();finish(-1);
      };
      r.timer=setTimeout(()=>r.abort(true),this.timeoutMs);
      // Reader invocation occurs after park() has registered the continuation.
      Promise.resolve().then(()=>{
        if(!this.valid(h)||r.cancelled||r.done)return -1;
        return h.source.reader.read(offset,count,controller.signal);
      }).then(
        bytes=>finish(bytes),
        error=>{this.stats.errors++;this.recordFailure(h,'reader',error);finish(-1);});
    });
  }
  cancelHandle(id) {
    const h=this.handles.get(id);if(!h)return;
    h.cancelled=true;
    for(const r of this.requests)if(r.h===h)r.abort();
  }
  closeHandle(id) {
    const h=this.handles.get(id);if(!h)return;
    this.cancelHandle(id);h.closed=true;this.handles.delete(id);
  }
  cancelSource() {
    if(this.source)this.source.cancelled=true;
    for(const r of this.requests)r.abort();
  }
  abandon() {
    this.closed=true;this.source=null;
    for(const r of this.requests){
      r.done=true;r.cancelled=true;this.stats.abandonedRequests++;
      if(r.timer!==null){clearTimeout(r.timer);r.timer=null;}
      r.controller.abort();
    }
    this.requests.clear();this.handles.clear();this.failures=[];
  }
  close() {this.cancelSource();for(const id of [...this.handles.keys()])this.closeHandle(id);this.closed=true;this.source=null;}
  snapshot() {return {...this.stats,handles:this.handles.size,pending:this.requests.size,
    timers:[...this.requests].filter(x=>x.timer!==null).length};}
}
