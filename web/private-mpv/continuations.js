// SPDX-License-Identifier: MIT
// Physical raw-Wasm continuation drivers. Protocol authority and counters are
// composed into the scheduler machine; saved native stacks and values stay here.
export function createContinuationBackend(kind, scheduler) {
  if (kind === 'jspi') return new JspiContinuations(scheduler);
  if (kind === 'asyncify') return new AsyncifyContinuations(scheduler);
  throw Error('Unknown continuation backend: '+kind);
}
function protocol(s,t,input,message) {
  if(!s.continuation({...input,id:t.id}))throw Error(message||'Invalid continuation protocol');
}
function current(s,t) {if(!s.continuationCurrent(t))throw Error('Continuation owner retired');}

export class JspiContinuations {
  constructor(s) {
    if(typeof WebAssembly.Suspending!=='function'||typeof WebAssembly.promising!=='function')
      throw Error('JSPI unavailable');
    this.s=s;this.kind='jspi';
  }
  attach(e) {this.e=e;}
  wrapImport(_name,fn) {return new WebAssembly.Suspending(fn);}
  begin(t) {
    protocol(this.s,t,{type:'begin'});
    const invoke=WebAssembly.promising(t.fn);current(this.s,t);
    invoke(...t.args).then(v=>this.s.finish(t,null,v),e=>this.s.finish(t,e));
  }
  park(t) {
    protocol(this.s,t,{type:'park'});
    const promise=new Promise(resolve=>{t.resume=resolve;});
    this.s.releaseSuspended(t);
    return promise;
  }
  resume(t,value) {
    protocol(this.s,t,{type:'resume'},'Invalid JSPI resume');
    const fn=t.resume;t.resume=null;fn(value);
  }
  snapshot() {return this.s.continuationSnapshot();}
}

export class AsyncifyContinuations {
  constructor(s) {this.s=s;this.kind='asyncify';}
  attach(e) {
    const admitted=()=>{if(this.s.stopped||this.s.machine.attachment!=='attaching')throw Error('Scheduler closed during Asyncify attachment');};
    const api={};
    for(const n of ['asyncify_start_unwind','asyncify_stop_unwind','asyncify_start_rewind',
      'asyncify_stop_rewind','asyncify_get_state','demuxe_asyncify_data',
      'demuxe_asyncify_base','demuxe_asyncify_end','demuxe_asyncify_count']) {
      const value=e[n];admitted();if(typeof value!=='function')throw Error('Missing Asyncify export '+n);api[n]=value;
    }
    const count=api.demuxe_asyncify_count.call(e);admitted();if(count!==this.s.slots)throw Error('Asyncify slot ABI mismatch');
    const state=api.asyncify_get_state.call(e);admitted();if(state!==0)throw Error('Asyncify must start in normal state');
    const ranges=[];
    for(let i=0;i<this.s.slots;i++) {
      const data=api.demuxe_asyncify_data.call(e,i)>>>0;admitted();
      const lo=api.demuxe_asyncify_base.call(e,i)>>>0;admitted();
      const hi=api.demuxe_asyncify_end.call(e,i)>>>0;admitted();
      const memory=e.memory;admitted();const buffer=memory.buffer;admitted();
      if(data%16||lo%16||hi%16||lo<data+32||hi<=lo||hi+32>buffer.byteLength)
        throw Error('Invalid Asyncify stack bounds');
      if(ranges.some(r=>data<r.regionHi&&hi+32>r.regionLo))throw Error('Overlapping Asyncify stacks');
      if(this.s.cStacks.some(r=>data<r.hi&&hi+32>r.lo))
        throw Error('Asyncify saved stack overlaps C stack');
      if(this.s.hostSP>=data&&this.s.hostSP<=hi+32)
        throw Error('Asyncify saved stack overlaps host stack pointer');
      ranges.push(Object.freeze({data,lo,hi,regionLo:data,regionHi:hi+32}));
    }
    admitted();this.e=e;this.stacks=Object.freeze(ranges);
  }
  view() {return new DataView(this.e.memory.buffer);}
  wrapImport(name,fn) {
    return (...args)=>{
      const t=this.s.active,state=this.e.asyncify_get_state();
      if(!t)throw Error('Asyncify import without logical owner');current(this.s,t);
      if(state===2) {
        protocol(this.s,t,{type:'rewind-import',site:name},'Asyncify rewind reached the wrong import');
        this.e.asyncify_stop_rewind();current(this.s,t);protocol(this.s,t,{type:'rewound'});
        const value=t.continuationResult;t.continuationResult=undefined;
        return value;
      }
      if(state!==0)throw Error('Import reached during Asyncify unwind');
      protocol(this.s,t,{type:'return'},'Asyncify import outside running continuation');
      const value=fn(...args);current(this.s,t);
      if(value&&typeof value.then==='function')throw Error('Promise bypassed the Asyncify scheduler');
      current(this.s,t);const stateAfter=this.e.asyncify_get_state();current(this.s,t);
      if(stateAfter===1)protocol(this.s,t,{type:'site',site:name},'Invalid Asyncify unwind site');
      return value;
    };
  }
  prepare(t) {
    const e=this.e;
    t.asyncify=this.stacks[t.slot];
    const a=t.asyncify,u=new Uint8Array(e.memory.buffer);current(this.s,t);
    u.fill(0xb6,a.data+8,a.lo);u.fill(0xb6,a.hi,a.hi+32);
    const view=this.view();current(this.s,t);view.setUint32(a.data,a.lo,true);view.setUint32(a.data+4,a.hi,true);
  }
  check(t) {
    const a=t.asyncify,view=this.view();current(this.s,t);
    const p=view.getUint32(a.data,true),end=view.getUint32(a.data+4,true);
    if(p<a.lo||p>a.hi||end!==a.hi)throw Error('Asyncify saved-stack bounds violated');
    const u=new Uint8Array(this.e.memory.buffer);current(this.s,t);
    if(u.subarray(a.data+8,a.lo).some(x=>x!==0xb6)||u.subarray(a.hi,a.hi+32).some(x=>x!==0xb6))
      throw Error('Asyncify stack canary corrupted');
    protocol(this.s,t,{type:'checked',savedBytes:p-a.lo});
  }
  begin(t) {protocol(this.s,t,{type:'begin'});this.prepare(t);this.enter(t);}
  enter(t) {
    // Keep the C stack owner until Binaryen finishes saving/reconstructing it.
    const result=t.fn(...t.args);current(this.s,t);
    const state=this.e.asyncify_get_state();current(this.s,t);
    if(state===1) {
      this.e.asyncify_stop_unwind();current(this.s,t);this.check(t);
      protocol(this.s,t,{type:'unwound'});this.s.releaseSuspended(t);
    } else if(state===0) {
      this.check(t);protocol(this.s,t,{type:'return'});this.s.finish(t,null,result);
    } else throw Error('Asyncify returned without completing rewind');
  }
  park(t) {
    const state=this.e.asyncify_get_state();current(this.s,t);
    if(!t.asyncify||state!==0)throw Error('Invalid Asyncify park state');
    protocol(this.s,t,{type:'park'},'Invalid Asyncify park state');
    const a=t.asyncify,view=this.view();current(this.s,t);view.setUint32(a.data,a.lo,true);
    this.e.asyncify_start_unwind(a.data);current(this.s,t);
    // Placeholder only: the native call is unwinding, not completed.
    return 0;
  }
  resume(t,value) {
    const state=this.e.asyncify_get_state();current(this.s,t);
    if(state!==0)throw Error('Invalid Asyncify resume');
    this.check(t);protocol(this.s,t,{type:'resume'},'Invalid Asyncify resume');
    t.continuationResult=value;
    this.e.asyncify_start_rewind(t.asyncify.data);current(this.s,t);this.enter(t);
  }
  snapshot() {return this.s.continuationSnapshot();}
}
