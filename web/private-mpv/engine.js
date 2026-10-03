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
  const decoderImports=WebAssembly.Module.imports(compiled).filter(item=>item.module==='demuxe_decoder');
  if(decoderImports.length){
   const wakeup=()=>scheduler.wakeDecoder(()=>raw.web_decoder_wakeup);
   const service=decoderOptions.service??new PrivateRetainedDecoder({wakeup,maxPixels:decoderOptions.maxDecodePixels,canReceive:decoderOptions.canReceiveFrame});
   decoder=new CooperativeDecoderMailbox(scheduler,service,{onFrame:decoderOptions.onFrame,onReleaseFrame:decoderOptions.onReleaseFrame,retainedLease:decoderImports.some(item=>item.name==='demuxe_decoder_release_v1')});
  }
  let rejectInstantiation;
  const failedInstantiation=new Promise((_,reject)=>{rejectInstantiation=reject;});
  const module=await Promise.race([failedInstantiation,createModule({...options,instantiateWasm(imports,receive){
   try{
   imports.demuxe_coop=Object.fromEntries(Object.entries(scheduler.imports).map(([name,fn])=>['demuxe_coop_'+name,fn]));
   imports.demuxe_source=Object.fromEntries(Object.entries(source.imports).map(([name,fn])=>['demuxe_source_'+name,fn]));
   if(decoder)imports.demuxe_decoder={demuxe_decoder_request:decoder.imports.request,demuxe_decoder_release_v1:decoder.imports.release};
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
