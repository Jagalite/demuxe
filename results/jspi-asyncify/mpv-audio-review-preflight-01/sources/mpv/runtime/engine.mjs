// SPDX-License-Identifier: MIT
import {CoopScheduler} from '../../runtime/scheduler.mjs';
import {RangeSource} from '../../stage2/runtime/range-source.mjs';

// The generated Emscripten glue must have neither JSPI nor Asyncify enabled.
// This adapter is the sole continuation owner; Asyncify is applied afterwards.
export async function createCooperativeEngine(createModule,wasmBytes,backend,options={}) {
 let host,raw;
 const hooks={
  enter(t,e){e.demuxe_context_enter(t.lo+64,t.hi,t.errno??0);},
  leave(t,e){t.errno=e.demuxe_context_errno();},
  idle(e){e.demuxe_context_enter(host.lo,host.hi,host.errno);},
 };
 const scheduler=new CoopScheduler({backend,contextHooks:hooks});
 const source=new RangeSource(scheduler);
 try {
  const compiled=new WebAssembly.Module(wasmBytes);
  let rejectInstantiation;
  const failedInstantiation=new Promise((_,reject)=>{rejectInstantiation=reject;});
  const module=await Promise.race([failedInstantiation,createModule({...options,instantiateWasm(imports,receive){
   try{
   imports.demuxe_coop=Object.fromEntries(Object.entries(scheduler.imports).map(([name,fn])=>['demuxe_coop_'+name,fn]));
   imports.demuxe_source=Object.fromEntries(Object.entries(source.imports).map(([name,fn])=>['demuxe_source_'+name,fn]));
   raw=new WebAssembly.Instance(compiled,imports).exports;
   receive({exports:raw},compiled);return raw;
   }catch(error){rejectInstantiation(error);return {};}
  }})]);
  host={lo:raw.demuxe_context_stack_end(),hi:raw.demuxe_context_stack_base(),errno:raw.demuxe_context_errno()};
  scheduler.attach(raw);source.attach(raw.memory);
  return {module,raw,scheduler,source,call:(name,...args)=>scheduler.run(raw[name],...args),
   dispose(){source.close();scheduler.close();}};
 } catch(error){scheduler.close(error);throw error;}
}
