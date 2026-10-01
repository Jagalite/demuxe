// SPDX-License-Identifier: MIT
// Shared serialized Emscripten host contract; NOT a tested FFmpeg media engine.
// A rejected ccall is an unexpected runtime failure. Negative C results are not.
// A poisoned instance must be discarded, never retried with another backend.
import {SingleOwner} from './single-owner.mjs';
import {RangeSource} from '../../stage2/runtime/range-source.mjs';
const boundModules=new WeakSet();
export function createFFmpegBridge(Module, {timeoutMs=5000,shutdownTimeoutMs=5000}={}) {
  if(typeof Module?.ccall!=='function'||!(Module.HEAPU8?.buffer instanceof ArrayBuffer))
    throw Error('Private FFmpeg memory and ccall are required');
  if(boundModules.has(Module))throw Error('FFmpeg module already has an owner or requires discard');
  if(!Number.isInteger(shutdownTimeoutMs)||shutdownTimeoutMs<1||shutdownTimeoutMs>120000)
    throw Error('Invalid shutdown deadline');
  const owner=new SingleOwner(),source=new RangeSource(owner,{timeoutMs,maxPending:1});
  source.attach({get buffer(){return Module.HEAPU8.buffer;}});
  let handle=-1,state='ready',closing,fatal=null;
  boundModules.add(Module);
  Module.nonIsolatedRead=(ptr,count,offset)=>source.read(handle,ptr,count,offset);
  const operations=new Set(['rm_set_demuxer','rm_probe','rm_open','rm_start','rm_step','rm_close','rm_error',
    'rm_set_container','rm_duration','rm_video_codec','rm_audio_codec','rm_adapt_audio']);
  function poison(error) {
    if(fatal)return;
    fatal=error instanceof Error?error:Error(String(error));
    state='failed';source.close();owner.close(fatal);
    Module.nonIsolatedRead=()=>-1;
  }
  async function ccall(name,returnType,argTypes,args) {
    try{return await Module.ccall(name,returnType,argTypes,args,{async:true});}
    catch(error){poison(error);throw error;}
  }
  return {
    owner,source,
    get state(){return state;},
    get requiresDiscard(){return !!fatal;},
    setSource(reader){
      if(state!=='ready'||owner.active)throw Error('Cannot replace an active FFmpeg source; cancel and await first');
      // setSource validates before cancelling: invalid input preserves the old source.
      source.setSource(reader);
      if(handle>=0)source.closeHandle(handle);
      handle=source.open();
      if(handle<0)throw Error('Cannot open FFmpeg source');
    },
    call(name,returnType,argTypes,args){
      if(state!=='ready')return Promise.reject(fatal??Error('FFmpeg bridge is '+state));
      if(!operations.has(name))return Promise.reject(Error('Unadmitted FFmpeg API '+name));
      return owner.invoke(()=>ccall(name,returnType,argTypes,args));
    },
    cancel(){source.cancelSource();},
    destroy(){
      if(closing)return closing;
      if(!fatal)state='closing';
      source.cancelSource();
      closing=(async()=>{
        let timer;
        try{
          if(fatal)throw fatal;
          const work=(async()=>{
            await owner.idle();
            if(fatal)throw fatal;
            await owner.invoke(()=>ccall('rm_close',null,[],[]));
          })();
          await Promise.race([work,new Promise((_,reject)=>{
            timer=setTimeout(()=>{
              const error=Error('FFmpeg shutdown deadline exceeded; discard instance');
              poison(error);reject(error);
            },shutdownTimeoutMs);
          })]);
        } finally {
          clearTimeout(timer);if(handle>=0)source.closeHandle(handle);handle=-1;
          source.close();owner.close(fatal??undefined);Module.nonIsolatedRead=()=>-1;
          state=fatal?'failed':'closed';
          if(!fatal)boundModules.delete(Module);
        }
      })();return closing;
    },
  };
}
