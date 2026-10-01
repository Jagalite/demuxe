// SPDX-License-Identifier: MIT
import {CoopScheduler} from './scheduler.js';
import {RangeSource} from './range-source.js';
import {CooperativeDecoderMailbox} from './decoder-mailbox.js';
import {PrivateRetainedDecoder} from './retained-decoder.js';

// The generated Emscripten glue must have neither JSPI nor Asyncify enabled.
// This adapter is the sole continuation owner; Asyncify is applied afterwards.
export async function createCooperativeEngine(createModule,wasmBytes,backend,options={},decoderOptions={}) {
 let host,raw,decoder;
 const hooks={
  enter(t,e){e.demuxe_context_enter(t.lo+64,t.hi,t.errno??0);},
  leave(t,e){t.errno=e.demuxe_context_errno();},
  idle(e){e.demuxe_context_enter(host.lo,host.hi,host.errno);},
 };
 const scheduler=new CoopScheduler({backend,contextHooks:hooks});
 const source=new RangeSource(scheduler);
 try {
  const compiled=new WebAssembly.Module(wasmBytes);
  if(WebAssembly.Module.imports(compiled).some(item=>item.module==='demuxe_decoder')){
   let wakePending=false;
   const wakeup=()=>{
    if(wakePending||scheduler.stopped)return;wakePending=true;
    queueMicrotask(()=>{if(scheduler.stopped){wakePending=false;return;}
     void scheduler.run(raw.web_decoder_wakeup).catch(error=>scheduler.fail(error)).finally(()=>{wakePending=false;});
    });
   };
   const service=decoderOptions.service??new PrivateRetainedDecoder({wakeup,maxPixels:decoderOptions.maxDecodePixels});
   decoder=new CooperativeDecoderMailbox(scheduler,service,{onFrame:decoderOptions.onFrame});
  }
  let rejectInstantiation;
  const failedInstantiation=new Promise((_,reject)=>{rejectInstantiation=reject;});
  const module=await Promise.race([failedInstantiation,createModule({...options,instantiateWasm(imports,receive){
   try{
   imports.demuxe_coop=Object.fromEntries(Object.entries(scheduler.imports).map(([name,fn])=>['demuxe_coop_'+name,fn]));
   imports.demuxe_source=Object.fromEntries(Object.entries(source.imports).map(([name,fn])=>['demuxe_source_'+name,fn]));
   if(decoder)imports.demuxe_decoder={demuxe_decoder_request:decoder.imports.request};
   raw=new WebAssembly.Instance(compiled,imports).exports;
   receive({exports:raw},compiled);return raw;
   }catch(error){rejectInstantiation(error);return {};}
  }})]);
  host={lo:raw.demuxe_context_stack_end(),hi:raw.demuxe_context_stack_base(),errno:raw.demuxe_context_errno()};
  scheduler.attach(raw);source.attach(raw.memory);decoder?.attach(raw.memory);
  return {module,raw,scheduler,source,decoder,call:(name,...args)=>scheduler.run(raw[name],...args),
   dispose(){try{source.close();decoder?.close();}finally{scheduler.close();}}};
 } catch(error){scheduler.close(error);throw error;}
}
