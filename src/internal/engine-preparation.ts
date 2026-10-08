// SPDX-License-Identifier: Apache-2.0
import type {PreparationComponent,PreparationOptions,PreparationAsset,PreparationReport,PreparationProgress} from '../types.js';
import type {ProviderRuntimeAssets} from './provider-runtime.js';
import {PlayerError} from './errors.js';
import {createPreparation,admitPreparation,preparationEngine,stepPreparation,completePreparation,retirePreparation,preparationProgress,preparationAsset} from './machine/engine-preparation.js';
import type {PreparationName,PreparationEnvironment} from './machine/engine-preparation.js';
export function preparationComponents(value:PreparationOptions):PreparationComponent[]{
  if(value==='all')return ['inspector','hybrid','software'];
  if(!Array.isArray(value)||value.some(name=>!['inspector','hybrid','software'].includes(name)))throw new PlayerError('INVALID_ARGUMENT','prepare must be all or a list of inspector, hybrid, software');
  return [...new Set(value)] as PreparationComponent[];
}
/** Per-player, bounded immutable assets. No media, workers or audio devices. */
export class EnginePreparation {
  private controller=new AbortController();
  private state=createPreparation();
  private pending=new Map<string,Promise<PreparationAsset>>();
  private modules=new Map<string,WebAssembly.Module>();
  private font?:ArrayBuffer;
  constructor(private base:URL,private software='engine-software-full',private changed=()=>{},private remuxRuntime:'pthread'|'jspi'|'asyncify'='pthread',private providerAssets?:ProviderRuntimeAssets){}
  private environment():PreparationEnvironment{return {software:this.software,runtime:this.remuxRuntime,isolated:!!globalThis.crossOriginIsolated,providerAssets:!!this.providerAssets,
    privatePlayback:this.remuxRuntime!=='pthread'&&this.providerAssets?.has?.(`web/engine-mpv-playback-${this.remuxRuntime}/player.wasm`)===true};}
  get progress():PreparationProgress[]{return preparationProgress(this.state);}
  private phase(name:PreparationName,phase:'loading'|'compiling'){
    const step=stepPreparation(this.state,name,{kind:'phase',phase});this.state=step.state;if(step.effect==='notify')this.changed();
  }
  module(name:string){return this.modules.get(name);}
  fontCopy(){return this.font?.slice(0);}
  async readyModule(name:string){
    await this.pending.get(name==='engine-remux'?'inspector':name==='engine-hybrid'?'hybrid':'software');
    return this.module(preparationEngine(name,this.environment()));
  }
  async readyEngine(name:string){
    const [module]=await Promise.all([this.readyModule(name),this.pending.get('font')]);
    return {module,font:this.fontCopy()};
  }
  async warm(value:PreparationOptions):Promise<PreparationReport>{
    const components=preparationComponents(value),start=performance.now();
    const admission=admitPreparation(this.state,components,this.environment(),start);this.state=admission.state;
    if(admission.aborted)return {milliseconds:performance.now()-start,assets:admission.aborted.map(asset=>({...asset}))};
    const jobs=admission.start.map(name=>{
      let resolve!:(asset:PreparationAsset)=>void,reject!:(error:unknown)=>void;
      const pending=new Promise<PreparationAsset>((yes,no)=>{resolve=yes;reject=no;});this.pending.set(name,pending);
      return {name,resolve,reject};
    });
    // All shared completions exist before loading publishes a synchronous update.
    const waiting=admission.names.map(name=>this.pending.get(name)!);
    for(const job of jobs)void this.load(job.name).then(job.resolve,job.reject);
    const assets=await Promise.all(waiting);
    return {milliseconds:performance.now()-start,assets};
  }
  private async load(name:PreparationName):Promise<PreparationAsset>{
    const job=this.state.jobs.find(job=>job.name===name)!,controller=new AbortController(),parent=this.controller.signal;
    const abort=()=>controller.abort();parent.addEventListener('abort',abort,{once:true});if(parent.aborted)abort();
    let timer:ReturnType<typeof setTimeout>;
    const expire=()=>{const step=stepPreparation(this.state,name,{kind:'deadline',now:performance.now()});this.state=step.state;
      if(step.effect==='abort')abort();else if(!controller.signal.aborted)timer=setTimeout(expire,Math.max(0,job.deadline-performance.now()));};
    timer=setTimeout(expire,Math.max(0,job.deadline-performance.now()));
    let error:string|undefined,module:WebAssembly.Module|undefined,data:Uint8Array<ArrayBuffer>|undefined;
    try{
      if(this.state.retired)throw new DOMException('Preparation destroyed','AbortError');
      if(!job.isolated)throw Error('Wasm preparation requires cross-origin isolation');
      this.phase(name,'loading');
      if(this.providerAssets){data=new Uint8Array(await this.providerAssets.bytes(job.path));this.state=stepPreparation(this.state,name,{kind:'bytes',bytes:data.byteLength}).state;}
      else{
        const response=await fetch(new URL(job.path,this.base),{signal:controller.signal,priority:'low'});
        if(!response.ok)throw Error(`Preparation asset unavailable: ${job.path} (${response.status})`);
        const declared=stepPreparation(this.state,name,{kind:'bytes',bytes:Number(response.headers.get('content-length')),declared:true});this.state=declared.state;
        if(declared.effect==='overflow'){await response.body?.cancel();throw Error('Preparation asset byte budget exceeded');}
        const reader=response.body?.getReader(),chunks:Uint8Array[]=[];
        if(!reader)throw Error('Preparation asset has no body');
        try{while(true){const {value,done}=await reader.read();if(done)break;const chunk=stepPreparation(this.state,name,{kind:'bytes',bytes:value.byteLength});this.state=chunk.state;
          if(chunk.effect==='overflow'){await reader.cancel();throw Error('Preparation asset byte budget exceeded');}chunks.push(value);}}
        finally{reader.releaseLock();}
        data=new Uint8Array(this.state.jobs.find(job=>job.name===name)!.bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
      }
      if(name!=='font'){this.phase(name,'compiling');module=await (this.providerAssets?this.providerAssets.module(job.path):WebAssembly.compile(data));}
    }catch(cause){error=String(cause);}
    finally{clearTimeout(timer);parent.removeEventListener('abort',abort);}
    const completion=completePreparation(this.state,name,performance.now(),error);this.state=completion.state;
    if(completion.publish){if(name==='font')this.font=data!.buffer;else this.modules.set(job.engine,module!);}
    if(completion.notify)this.changed();
    return {...preparationAsset(this.state,name)};
  }
  destroy(){this.state=retirePreparation(this.state);this.controller.abort();this.modules.clear();this.font=undefined;this.pending.clear();}
}
