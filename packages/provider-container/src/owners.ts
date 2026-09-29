// SPDX-License-Identifier: Apache-2.0
import {PacketAudioDecoder} from '../../provider-audio/src/packet-decoder.js';
import type {AudioDecoderModule} from '../../provider-audio/src/packet-decoder.js';
import {PacketFlacEncoder} from '../../provider-audio/src/flac-encoder.js';
import type {FlacModule} from '../../provider-audio/src/flac-encoder.js';
import {repairMatroskaAudio} from './audio-repair.js';
import {remuxMatroska} from './remux.js';
import {ContainerProfileError} from './matroska.js';
type Engine = AudioDecoderModule & FlacModule;
type Deployment = {
 catalog: {providers: readonly {id:string;implementationIdentity:string}[]};
 assets: readonly {id:string;url:string}[];
 providerAssets: Readonly<Record<string,readonly string[]>>;
};
type PreparationContext = Readonly<{signal:AbortSignal;asset(id:string):Promise<ArrayBuffer>}>;
type Prepared = {state:'ready';dispose():void}|{state:'unavailable';reason:string};
/** Implementation owners for the maintained TS + audio packet compositions.
 * Importing this factory loads no Wasm. A single common module instance owns
 * both packet capabilities; fine builds use the same adapters and codec source.
 * Core supplies qualification, selection, verified acquisition and scope disposal.
 */
export function createComponentOwners(deployment:Deployment,base:URL) {
 const modules=new Map<string,Engine>(),compiled=new Set<string>(),resident=new Set<string>(),evaluated=new Set<string>(['ts-container']);
 let busy=false,scopeSignal:AbortSignal|undefined;
 const providerIds=['ts-container','audio-ac3','audio-dts','audio-flac','audio-common'];
 const owners=deployment.catalog.providers.filter(p=>providerIds.includes(p.id)).map(provider=>({
  id:provider.id,implementationIdentity:provider.implementationIdentity,
  async prepare(context:PreparationContext):Promise<Prepared>{
   const ids=deployment.providerAssets[provider.id]??[];
   if(provider.id==='ts-container'){
    scopeSignal=context.signal;
    for(const id of ids)await context.asset(id);
    resident.add(provider.id);context.signal.throwIfAborted();
    return {state:'ready',dispose(){resident.delete(provider.id);}};
   }
   const profile=provider.id.slice('audio-'.length),folder='web/providers/audio/'+profile+'/';
   const asset=(name:string)=>{
    const url=new URL(folder+name,base).href;
    const value=deployment.assets.find(a=>a.url===url&&ids.includes(a.id));if(!value)throw Error('Incomplete configured audio owner assets: '+provider.id);return value;
   };
   const wasmAsset=asset('module.wasm'),jsAsset=asset('module.mjs');
   const bytes=await context.asset(wasmAsset.id);await context.asset(jsAsset.id);resident.add(provider.id);
   context.signal.throwIfAborted();
   if(!WebAssembly.validate(bytes))return {state:'unavailable',reason:'Required Wasm features are unavailable'};
   const wasm=await WebAssembly.compile(bytes);compiled.add(provider.id);context.signal.throwIfAborted();
   // Browser JS modules use the deployment's normal immutable URL loading;
   // verified Wasm acquisition does not imply SRI for executed module scripts.
   const factory=(await import(jsAsset.url)).default;evaluated.add(provider.id);context.signal.throwIfAborted();
   const module:Engine=await factory({instantiateWasm(imports:WebAssembly.Imports,done:(instance:WebAssembly.Instance,module:WebAssembly.Module)=>void){
    const instance=new WebAssembly.Instance(wasm,imports);done(instance,wasm);return instance.exports;
   }});
   context.signal.throwIfAborted();modules.set(provider.id,module);
   return {state:'ready',dispose(){modules.delete(provider.id);compiled.delete(provider.id);resident.delete(provider.id);}};
  },
 }));
 return {
  owners,
  readiness(){return deployment.catalog.providers.filter(p=>providerIds.includes(p.id)).map(p=>({
   providerId:p.id,implementationIdentity:p.implementationIdentity,nativeConfiguration:'not-applicable' as const,
   bytes:resident.has(p.id)?'verified-resident' as const:'unknown' as const,
   javascript:evaluated.has(p.id)?'evaluated' as const:'not-evaluated' as const,
   wasm:p.id==='ts-container'?'not-applicable' as const:compiled.has(p.id)?'compiled' as const:'not-compiled' as const,
   instance:modules.has(p.id)?busy?'busy' as const:'idle-reusable' as const:'none' as const,
  }));},
  async executeCopy(file:Blob,signal:AbortSignal):Promise<Blob>{
   if(busy||!scopeSignal||!resident.has('ts-container'))throw Error('Container owner is unavailable');
   signal=AbortSignal.any([signal,scopeSignal]);signal.throwIfAborted();busy=true;
   try{return await remuxMatroska(file,signal);}finally{busy=false;}
  },
  async execute(file:Blob,codec:'ac3'|'eac3'|'dts-core',binding:'fine'|'common',signal:AbortSignal):Promise<Blob>{
   if(busy)throw Error('Component execution already active');
   if(binding!=='fine'&&binding!=='common')throw Error('Unknown maintained component binding');
   const decoderId=binding==='common'?'audio-common':codec==='dts-core'?'audio-dts':'audio-ac3';
   const encoderId=binding==='common'?'audio-common':'audio-flac';
   const decoder=modules.get(decoderId),encoder=modules.get(encoderId);
   if(!decoder||!encoder||!scopeSignal||!resident.has('ts-container'))throw Error('Selected component owners are not ready');
   signal=AbortSignal.any([signal,scopeSignal]);signal.throwIfAborted();
   busy=true;
   try{return await repairMatroskaAudio(file,{
    decoder(actual,abort){if(actual!==codec)throw new ContainerProfileError('Source codec differs from admitted recipe');return new PacketAudioDecoder(decoder,actual,abort);},
    encoder(channels,abort){return new PacketFlacEncoder(encoder,channels,abort);},
   },signal);}finally{busy=false;}
  },
 };
}
