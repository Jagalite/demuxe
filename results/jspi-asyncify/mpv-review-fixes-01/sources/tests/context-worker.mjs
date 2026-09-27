// SPDX-License-Identifier: MIT
import {createCooperativeEngine} from '../runtime/engine.mjs';
self.onmessage=async({data:{backend}})=>{
 let engine;
 try{
  if(backend==='asyncify')for(const name of ['Suspending','promising'])Object.defineProperty(WebAssembly,name,{value:undefined});
  const bytes=await(await fetch('/engine/probe'+(backend==='asyncify'?'.asyncify':'')+'.wasm')).arrayBuffer();
  const {default:createModule}=await import('/engine/probe.mjs');
  engine=await createCooperativeEngine(createModule,bytes,backend);
  if(crossOriginIsolated||typeof SharedArrayBuffer!=='undefined'||!(engine.raw.memory.buffer instanceof ArrayBuffer))throw Error('Wrong private environment');
  const results=[await engine.call('context_probe'),await engine.call('context_probe')];
  if(results.some(x=>x!==1))throw Error('C context oracle failed: '+results);
  const snapshot=engine.scheduler.snapshot();
  if(snapshot.liveTasks||snapshot.retainedTasks||snapshot.freeSlots!==24)throw Error('Leaked logical task');
  engine.dispose();postMessage({passed:true,backend,results,snapshot,crossOriginIsolated,memoryType:engine.raw.memory.buffer.constructor.name,
    sharedArrayBufferAvailable:typeof SharedArrayBuffer==='function',jspiSuspending:typeof WebAssembly.Suspending==='function'});
 }catch(error){engine?.dispose();postMessage({passed:false,backend,error:String(error.stack??error)});}
};
