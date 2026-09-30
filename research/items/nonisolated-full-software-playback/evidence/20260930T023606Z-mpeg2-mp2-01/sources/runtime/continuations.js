// SPDX-License-Identifier: MIT
// Experimental raw-Wasm continuation drivers. The Asyncify implementation uses
// actual Binaryen instrumentation, NOT Emscripten's singleton Asyncify runtime.
// Full Emscripten/libmpv integration is a separate, unqualified milestone.
export function createContinuationBackend(kind, scheduler) {
  if (kind === 'jspi') return new JspiContinuations(scheduler);
  if (kind === 'asyncify') return new AsyncifyContinuations(scheduler);
  throw Error('Unknown continuation backend: '+kind);
}

export class JspiContinuations {
  constructor(s) {
    if(typeof WebAssembly.Suspending!=='function'||typeof WebAssembly.promising!=='function')
      throw Error('JSPI unavailable');
    this.s=s;this.kind='jspi';
  }
  attach(e) {this.e=e;}
  wrapImport(_name,fn) {return new WebAssembly.Suspending(fn);}
  begin(t) {WebAssembly.promising(t.fn)(...t.args).then(v=>this.s.finish(t,null,v),e=>this.s.finish(t,e));}
  park(t) {
    const promise=new Promise(resolve=>{t.resume=resolve;});
    this.s.releaseSuspended(t);
    return promise;
  }
  resume(t,value) {const fn=t.resume;t.resume=null;fn(value);}
  snapshot() {return {kind:this.kind};}
}

export class AsyncifyContinuations {
  constructor(s) {this.s=s;this.kind='asyncify';this.maxSavedBytes=0;this.unwinds=0;this.rewinds=0;}
  attach(e) {
    for(const n of ['asyncify_start_unwind','asyncify_stop_unwind','asyncify_start_rewind',
      'asyncify_stop_rewind','asyncify_get_state','demuxe_asyncify_data',
      'demuxe_asyncify_base','demuxe_asyncify_end','demuxe_asyncify_count'])
      if(typeof e[n]!=='function')throw Error('Missing Asyncify export '+n);
    if(e.demuxe_asyncify_count()!==this.s.slots)throw Error('Asyncify slot ABI mismatch');
    if(e.asyncify_get_state()!==0)throw Error('Asyncify must start in normal state');
    this.e=e;
    const ranges=[];
    for(let i=0;i<this.s.slots;i++) {
      const data=e.demuxe_asyncify_data(i)>>>0,lo=e.demuxe_asyncify_base(i)>>>0,hi=e.demuxe_asyncify_end(i)>>>0;
      if(data%16||lo%16||hi%16||lo<data+32||hi<=lo||hi+32>e.memory.buffer.byteLength)
        throw Error('Invalid Asyncify stack bounds');
      if(ranges.some(r=>data<r.regionHi&&hi+32>r.regionLo))throw Error('Overlapping Asyncify stacks');
      if(this.s.cStacks.some(r=>data<r.hi&&hi+32>r.lo))
        throw Error('Asyncify saved stack overlaps C stack');
      if(this.s.hostSP>=data&&this.s.hostSP<=hi+32)
        throw Error('Asyncify saved stack overlaps host stack pointer');
      ranges.push(Object.freeze({data,lo,hi,regionLo:data,regionHi:hi+32}));
    }
    this.stacks=Object.freeze(ranges);
  }
  view() {return new DataView(this.e.memory.buffer);}
  wrapImport(name,fn) {
    return (...args)=>{
      const t=this.s.active,state=this.e.asyncify_get_state();
      if(!t)throw Error('Asyncify import without logical owner');
      if(state===2) {
        if(t.resumeSite!==name)throw Error('Asyncify rewind reached the wrong import');
        this.e.asyncify_stop_rewind();
        this.rewinds++;t.resumeSite=null;
        const value=t.continuationResult;t.continuationResult=undefined;
        return value;
      }
      if(state!==0)throw Error('Import reached during Asyncify unwind');
      const value=fn(...args);
      if(value&&typeof value.then==='function')throw Error('Promise bypassed the Asyncify scheduler');
      if(this.e.asyncify_get_state()===1)t.resumeSite=name;
      return value;
    };
  }
  prepare(t) {
    const e=this.e;
    t.asyncify=this.stacks[t.slot];
    const a=t.asyncify,u=new Uint8Array(e.memory.buffer);
    u.fill(0xb6,a.data+8,a.lo);u.fill(0xb6,a.hi,a.hi+32);
    this.view().setUint32(a.data,a.lo,true);this.view().setUint32(a.data+4,a.hi,true);
  }
  check(t) {
    const a=t.asyncify,p=this.view().getUint32(a.data,true),end=this.view().getUint32(a.data+4,true);
    if(p<a.lo||p>a.hi||end!==a.hi)throw Error('Asyncify saved-stack bounds violated');
    const u=new Uint8Array(this.e.memory.buffer);
    if(u.subarray(a.data+8,a.lo).some(x=>x!==0xb6)||u.subarray(a.hi,a.hi+32).some(x=>x!==0xb6))
      throw Error('Asyncify stack canary corrupted');
    this.maxSavedBytes=Math.max(this.maxSavedBytes,p-a.lo);
  }
  begin(t) {this.prepare(t);this.enter(t);}
  enter(t) {
    // Do not switch the C stack or let a different task run until this export
    // returns: Asyncify is still saving/reconstructing frames on that stack.
    const result=t.fn(...t.args),state=this.e.asyncify_get_state();
    if(state===1) {
      this.e.asyncify_stop_unwind();this.check(t);this.unwinds++;
      this.s.releaseSuspended(t);
    } else if(state===0) {
      this.check(t);this.s.finish(t,null,result);
    } else throw Error('Asyncify returned without completing rewind');
  }
  park(t) {
    if(!t.asyncify||this.e.asyncify_get_state()!==0)throw Error('Invalid Asyncify park state');
    const a=t.asyncify;this.view().setUint32(a.data,a.lo,true);
    this.e.asyncify_start_unwind(a.data);
    // This is a placeholder result while unwinding, NEVER a completed result.
    return 0;
  }
  resume(t,value) {
    if(this.e.asyncify_get_state()!==0||!t.resumeSite)throw Error('Invalid Asyncify resume');
    this.check(t);t.continuationResult=value;
    this.e.asyncify_start_rewind(t.asyncify.data);this.enter(t);
  }
  snapshot() {return {kind:this.kind,maxSavedBytes:this.maxSavedBytes,unwinds:this.unwinds,rewinds:this.rewinds};}
}
