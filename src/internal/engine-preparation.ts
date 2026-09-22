// SPDX-License-Identifier: GPL-3.0-or-later
import type {PreparationComponent,PreparationOptions,PreparationAsset,PreparationReport,PreparationProgress} from '../types.js';
import {PlayerError} from './errors.js';
export function preparationComponents(value:PreparationOptions):PreparationComponent[]{
  if(value==='all')return ['inspector','hybrid','software'];
  if(!Array.isArray(value)||value.some(name=>!['inspector','hybrid','software'].includes(name)))throw new PlayerError('INVALID_ARGUMENT','prepare must be all or a list of inspector, hybrid, software');
  return [...new Set(value)] as PreparationComponent[];
}
/** Per-player, bounded immutable assets. No media, workers or audio devices. */
export class EnginePreparation {
  private controller=new AbortController();
  private pending=new Map<string,Promise<PreparationAsset>>();
  private modules=new Map<string,WebAssembly.Module>();
  private font?:ArrayBuffer;
  private phases=new Map<PreparationAsset['name'],PreparationProgress['status']>();
  constructor(private base:URL,private software='engine-software-full',private changed=()=>{}){}
  get progress():PreparationProgress[]{return [...this.phases].map(([name,status])=>({name,status}));}
  private phase(name:PreparationAsset['name'],status:PreparationProgress['status']){if(this.controller.signal.aborted)return;this.phases.set(name,status);this.changed();}
  module(name:string){return this.modules.get(name);}
  fontCopy(){return this.font?.slice(0);}
  async readyModule(name:string){
    await this.pending.get(name.startsWith('engine-remux')?'inspector':name==='engine-hybrid'?'hybrid':'software');
    return this.module(name);
  }
  async readyEngine(name:string){
    const [module]=await Promise.all([this.readyModule(name),this.pending.get('font')]);
    return {module,font:this.fontCopy()};
  }
  async warm(value:PreparationOptions):Promise<PreparationReport>{
    const names:Array<PreparationComponent|'font'>=preparationComponents(value),start=performance.now();
    if(names.some(name=>name==='hybrid'||name==='software'))names.push('font');
    for(const name of names)if(!this.phases.has(name))this.phases.set(name,'queued');
    const assets=await Promise.all(names.map(name=>{
      let pending=this.pending.get(name);
      if(!pending){pending=this.load(name);this.pending.set(name,pending);}
      return pending;
    }));
    return {milliseconds:performance.now()-start,assets};
  }
  private async load(name:PreparationComponent|'font'):Promise<PreparationAsset>{
    const start=performance.now(),controller=new AbortController(),parent=this.controller.signal;
    const abort=()=>controller.abort();parent.addEventListener('abort',abort,{once:true});if(parent.aborted)abort();
    const timer=setTimeout(abort,15000);let bytes=0;
    try{
      this.phase(name,'loading');
      const engine=name==='inspector'?(globalThis.crossOriginIsolated?'engine-remux':'engine-remux-jspi'):name==='hybrid'?'engine-hybrid':this.software;
      const path=name==='font'?'fixtures/DejaVuSans.ttf':`web/${engine}/${name==='inspector'?'remux':'player'}.wasm`;
      const response=await fetch(new URL(path,this.base),{signal:controller.signal,priority:'low'});
      if(!response.ok)throw Error(`Preparation asset unavailable: ${path} (${response.status})`);
      const limit=(name==='font'?8:32)*1024*1024;
      if(Number(response.headers.get('content-length'))>limit){await response.body?.cancel();throw Error('Preparation asset byte budget exceeded');}
      const reader=response.body?.getReader(),chunks:Uint8Array[]=[];
      if(!reader)throw Error('Preparation asset has no body');
      try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit){await reader.cancel();throw Error('Preparation asset byte budget exceeded');}chunks.push(value);}}
      finally{reader.releaseLock();}
      const data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}

      if(name==='font'){if(!controller.signal.aborted)this.font=data.buffer;}
      else{this.phase(name,'compiling');const module=await WebAssembly.compile(data);if(!controller.signal.aborted)this.modules.set(engine,module);}
      this.phase(name,controller.signal.aborted?'aborted':'ready');
      return {name,status:controller.signal.aborted?'aborted':'ready',bytes,milliseconds:performance.now()-start};
    }catch(error){this.phase(name,controller.signal.aborted?'aborted':'failed');return {name,status:controller.signal.aborted?'aborted':'failed',bytes,milliseconds:performance.now()-start,error:String(error)};}
    finally{clearTimeout(timer);parent.removeEventListener('abort',abort);}
  }
  destroy(){this.controller.abort();this.modules.clear();this.font=undefined;this.pending.clear();}
}
