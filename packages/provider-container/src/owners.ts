// SPDX-License-Identifier: Apache-2.0
import {PacketAudioDecoder} from '../../provider-audio/src/packet-decoder.js';
import type {AudioDecoderModule,PacketAudioCodec,AudioDecoderConfiguration,AacProfile} from '../../provider-audio/src/packet-decoder.js';
import {PacketFlacEncoder} from '../../provider-audio/src/flac-encoder.js';
import type {FlacModule} from '../../provider-audio/src/flac-encoder.js';
import {repairMatroskaAudio,repairMatroskaAudioFragments} from './audio-repair.js';
import {repairOggAudio,repairOggAudioFragments} from './ogg-repair.js';
import {repairWavPackAudio,repairWavPackAudioFragments} from './wavpack-repair.js';
import {repairApeAudio,repairApeAudioFragments} from './ape-repair.js';
import {repairTtaAudio,repairTtaAudioFragments} from './tta-repair.js';
import {repairShortenAudio,repairShortenAudioFragments} from './shorten-repair.js';
import {repairG726Audio,repairG726AudioFragments} from './g726-repair.js';
import type {G726Codec,G726Bits} from './g726.js';
import {repairTelephonyAudio,repairTelephonyAudioFragments} from './telephony-repair.js';
import {repairAdpcmWaveAudio,repairAdpcmWaveAudioFragments} from './adpcm-repair.js';
import {repairTakAudio,repairTakAudioFragments} from './tak-repair.js';
import {remuxWebm} from './webm-remux.js';
import {remuxMatroska} from './remux.js';
import {ContainerProfileError} from './matroska.js';
import {PacketOpusEncoder} from '../../provider-audio/src/opus-encoder.js';
import type {OpusModule} from '../../provider-audio/src/opus-encoder.js';
type Engine = AudioDecoderModule & FlacModule & OpusModule;
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
 const modules=new Map<string,Engine>(),compiled=new Set<string>(),resident=new Set<string>(),evaluated=new Set<string>(['ts-container']),generations=new Map<string,symbol>();
 let busy=false,scopeSignal:AbortSignal|undefined;
 const providerIds=['ts-container','audio-ac3','audio-dts','audio-flac','audio-common','audio-truehd-mlp','audio-dts-hd','audio-aac','audio-opus-vorbis','audio-lossless','audio-mp3','audio-pcm','audio-opus-encoder','audio-legacy','audio-archive','audio-archive-more','audio-wma-advanced','audio-archive-next','audio-archive-historical','audio-adpcm-wave','audio-telephony','audio-adpcm-qt','audio-g726'];
 const owners=deployment.catalog.providers.filter(p=>providerIds.includes(p.id)).map(provider=>({
  id:provider.id,implementationIdentity:provider.implementationIdentity,
  async prepare(context:PreparationContext):Promise<Prepared>{
   const generation=Symbol(provider.id);generations.set(provider.id,generation);
   let ready=false;
   const superseded=()=>new DOMException('Provider preparation was superseded','AbortError');
   const current=()=>{if(generations.get(provider.id)!==generation)throw superseded();context.signal.throwIfAborted();};
   const cleanup=()=>{
    if(generations.get(provider.id)!==generation)return;
    generations.delete(provider.id);
    if(provider.id==='ts-container')scopeSignal=undefined;
    modules.delete(provider.id);compiled.delete(provider.id);resident.delete(provider.id);
   };
   // Superseding a prepared owner immediately withdraws its readiness. A stale
   // handle may still dispose, but it cannot erase this generation's state.
   modules.delete(provider.id);compiled.delete(provider.id);resident.delete(provider.id);
   if(provider.id==='ts-container')scopeSignal=undefined;
   try {
   const ids=deployment.providerAssets[provider.id]??[];
   if(provider.id==='ts-container'){
    current();await Promise.all(ids.map(id=>context.asset(id)));
    current();scopeSignal=context.signal;resident.add(provider.id);
    ready=true;return {state:'ready',dispose:cleanup};
   }
   const profile=provider.id.slice('audio-'.length),folder='web/providers/audio/'+profile+'/';
   const asset=(name:string)=>{
    const url=new URL(folder+name,base).href;
    const value=deployment.assets.find(a=>a.url===url&&ids.includes(a.id));if(!value)throw Error('Incomplete configured audio owner assets: '+provider.id);return value;
   };
   const wasmAsset=asset('module.wasm'),jsAsset=asset('module.mjs');
   current();const [bytes]=await Promise.all([context.asset(wasmAsset.id),context.asset(jsAsset.id)]);current();resident.add(provider.id);
   if(!WebAssembly.validate(bytes))return {state:'unavailable',reason:'Required Wasm features are unavailable'};
   const wasm=await WebAssembly.compile(bytes);current();compiled.add(provider.id);
   // Browser JS modules use the deployment's normal immutable URL loading;
   // verified Wasm acquisition does not imply SRI for executed module scripts.
   const factory=(await import(jsAsset.url)).default;evaluated.add(provider.id);current();
   const module:Engine=await factory({instantiateWasm(imports:WebAssembly.Imports,done:(instance:WebAssembly.Instance,module:WebAssembly.Module)=>void){
    current();const instance=new WebAssembly.Instance(wasm,imports);done(instance,wasm);return instance.exports;
   }});
   current();modules.set(provider.id,module);
   ready=true;return {state:'ready',dispose:cleanup};
   } catch(error){if(generations.get(provider.id)!==generation)throw superseded();throw error;}
   finally {if(!ready)cleanup();}
  },
 }));
 function preparation(codec:PacketAudioCodec,binding:'fine'|'common',signal:AbortSignal,channels:1|2|6|8,output:'flac'|'opus',container:'matroska'|'isobmff'|'wave-aiff'|'ogg'|'wavpack'|'ape'|'tta'|'tak'|'shorten'|'adpcm-wave'|'telephony'|'wave-g726'|'raw-g726',sampleRate:8000|16000|22050|32000|44100|48000|96000,aacProfile:AacProfile){
  if(busy)throw Error('Component execution already active');
  if(!['lc','he','he-v2','usac'].includes(aacProfile)||aacProfile!=='lc'&&(codec!=='aac'||container!=='isobmff'||(aacProfile==='usac'?output!=='flac'||!((channels===1&&sampleRate===48000)||(channels===2&&[32000,44100,48000].includes(sampleRate))):channels!==2||!(aacProfile==='he'?[48000]:[32000,44100]).includes(sampleRate))))throw new ContainerProfileError('Unqualified explicit AAC owner profile');
  if((codec==='pcm-u8'||codec==='pcm-s8')&&(container!=='wave-aiff'||![1,2].includes(channels)||![44100,48000,96000].includes(sampleRate)||output!=='flac'))throw new ContainerProfileError('Unqualified eight-bit PCM owner recipe');
  if(binding!=='fine'&&binding!=='common')throw Error('Unknown maintained component binding');
  if(binding==='common'&&(output!=='flac'||!['ac3','eac3','dts-core'].includes(codec)))throw new ContainerProfileError('Lossless codecs require their finite split binding');
  const qt=codec==='adpcm-ima-qt';if(qt&&(container!=='isobmff'||![44100,48000].includes(sampleRate)||![1,2].includes(channels)||output!=='flac'))throw new ContainerProfileError('Unqualified MOV IMA-QT owner recipe');
  const adpcm=codec==='adpcm-ms'||codec==='adpcm-ima-wav';
  if(adpcm&&(container!=='adpcm-wave'||![1,2].includes(channels)||![8000,16000,22050,32000,44100,48000].includes(sampleRate)||output!=='flac')||container==='adpcm-wave'&&!adpcm)throw new ContainerProfileError('Unqualified WAV ADPCM owner recipe');
  const g726=codec==='adpcm-g726'||codec==='adpcm-g726le';
  if(g726&&(!['wave-g726','raw-g726'].includes(container)||container==='wave-g726'&&codec!=='adpcm-g726'||sampleRate!==8000||channels!==1||output!=='flac')||['wave-g726','raw-g726'].includes(container)&&!g726)throw new ContainerProfileError('Unqualified G726 owner recipe');
  const telephony=['pcm-alaw','pcm-mulaw','gsm','gsm-ms'].includes(codec);
  if(telephony&&(container!=='telephony'||output!=='flac'||(codec==='gsm'||codec==='gsm-ms'?sampleRate!==8000||channels!==1:![8000,16000].includes(sampleRate)||![1,2].includes(channels)))||container==='telephony'&&!telephony)throw new ContainerProfileError('Unqualified telephony owner recipe');
  if(sampleRate<44100&&!adpcm&&!telephony&&!g726&&!(['mp2','wmav1','wmav2'].includes(codec))&&!(codec==='aac'&&aacProfile!=='lc'))throw new ContainerProfileError('Unqualified low-rate owner recipe');
  const decoderId=binding==='common'?'audio-common':codec==='dts-core'?'audio-dts':codec==='dts-hd'?'audio-dts-hd':codec==='truehd'||codec==='mlp'?'audio-truehd-mlp':codec==='aac'?'audio-aac':['opus','vorbis'].includes(codec)?'audio-opus-vorbis':['flac','alac'].includes(codec)?'audio-lossless':codec==='mp3'?'audio-mp3':qt?'audio-adpcm-qt':g726?'audio-g726':telephony?'audio-telephony':adpcm?'audio-adpcm-wave':codec==='shorten'?'audio-archive-historical':codec==='tak'?'audio-archive-next':codec==='tta'?'audio-archive-more':['ape','wavpack'].includes(codec)?'audio-archive':['mp1','mp2','wmav1','wmav2'].includes(codec)?'audio-legacy':codec.startsWith('pcm-')?'audio-pcm':'audio-ac3';
  const encoderId=binding==='common'?'audio-common':output==='opus'?'audio-opus-encoder':'audio-flac';
  const decoder=modules.get(decoderId),encoder=modules.get(encoderId);
  if(!decoder||!encoder||!scopeSignal||!resident.has('ts-container'))throw Error('Selected component owners are not ready');
  signal=AbortSignal.any([signal,scopeSignal]);signal.throwIfAborted();
  return {signal,components:{codec,channels,output,container,sampleRate,aacProfile,
   decoder(actual:PacketAudioCodec,abort:AbortSignal,configuration?:AudioDecoderConfiguration){if(actual!==codec)throw new ContainerProfileError('Source codec differs from admitted recipe');return new PacketAudioDecoder(decoder,actual,abort,configuration);},
   encoder(channels:number,abort:AbortSignal,rate=48000){return output==='opus'?new PacketOpusEncoder(encoder,channels,abort):new PacketFlacEncoder(encoder,channels,abort,0,rate);},
  }};
 }
 return {
  owners,
  allocatedWasmBytes(){return [...modules.values()].reduce((bytes,module)=>bytes+module.HEAPU8.byteLength,0);},
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
  async executeRawG726(file:Blob,codec:G726Codec,bits:G726Bits,signal:AbortSignal,sampleCount?:number):Promise<Blob>{
   if(!['adpcm-g726','adpcm-g726le'].includes(codec)||![2,3,4,5].includes(bits))throw new ContainerProfileError('Explicit raw G726 codec and coded width required');
   const prepared=preparation(codec,'fine',signal,1,'flac','raw-g726',8000,'lc');busy=true;
   try{return await repairG726Audio(file,{...prepared.components,codec,container:'raw-g726',sampleRate:8000,channels:1,codedBits:bits},prepared.signal,{codec,bitsPerSample:bits,sampleCount});}finally{busy=false;}
  },
  async *executeRawG726Fragments(file:Blob,codec:G726Codec,bits:G726Bits,signal:AbortSignal,sampleCount?:number):AsyncGenerator<Uint8Array>{
   if(!['adpcm-g726','adpcm-g726le'].includes(codec)||![2,3,4,5].includes(bits))throw new ContainerProfileError('Explicit raw G726 codec and coded width required');
   const prepared=preparation(codec,'fine',signal,1,'flac','raw-g726',8000,'lc');busy=true;
   try{yield* repairG726AudioFragments(file,{...prepared.components,codec,container:'raw-g726',sampleRate:8000,channels:1,codedBits:bits},prepared.signal,{codec,bitsPerSample:bits,sampleCount});}finally{busy=false;}
  },
  async executeWebmCopy(file:Blob,signal:AbortSignal):Promise<Blob>{
   if(busy||!scopeSignal||!resident.has('ts-container'))throw Error('Container owner is unavailable');
   signal=AbortSignal.any([signal,scopeSignal]);signal.throwIfAborted();busy=true;
   try{return await remuxWebm(file,signal);}finally{busy=false;}
  },
  async execute(file:Blob,codec:PacketAudioCodec,binding:'fine'|'common',signal:AbortSignal,channels:1|2|6|8=2,output:'flac'|'opus'='flac',container:'matroska'|'isobmff'|'wave-aiff'|'ogg'|'wavpack'|'ape'|'tta'|'tak'|'shorten'|'adpcm-wave'|'telephony'|'wave-g726'|'raw-g726'='matroska',sampleRate:8000|16000|22050|32000|44100|48000|96000=48000,aacProfile:AacProfile='lc'):Promise<Blob>{
   if(container==='raw-g726')throw new ContainerProfileError('Raw G726 requires explicit coded-width owner API');
   const prepared=preparation(codec,binding,signal,channels,output,container,sampleRate,aacProfile);busy=true;
   try{
    if(container==='wave-g726'){if(codec!=='adpcm-g726')throw new ContainerProfileError('Source codec differs from G726 WAV recipe');return await repairG726Audio(file,{...prepared.components,codec,container:'wave-g726',sampleRate:8000,channels:1},prepared.signal);}
    if(container==='telephony'){if(!['pcm-alaw','pcm-mulaw','gsm','gsm-ms'].includes(codec))throw new ContainerProfileError('Source codec differs from telephony recipe');return await repairTelephonyAudio(file,{...prepared.components,codec:codec as 'pcm-alaw'|'pcm-mulaw'|'gsm'|'gsm-ms',sampleRate:sampleRate as 8000|16000,container:'telephony'},prepared.signal);}
    if(container==='adpcm-wave'){if(codec!=='adpcm-ms'&&codec!=='adpcm-ima-wav')throw new ContainerProfileError('Source codec differs from ADPCM recipe');return await repairAdpcmWaveAudio(file,{...prepared.components,codec,container:'adpcm-wave'},prepared.signal);}
    if(container==='shorten'){if(codec!=='shorten')throw new ContainerProfileError('Source codec differs from Shorten recipe');if(output!=='flac')throw new ContainerProfileError('Standalone Shorten conversion requires FLAC output');return await repairShortenAudio(file,{...prepared.components,codec:'shorten',container:'shorten',output:'flac'},prepared.signal);}
    if(container==='tak'){if(output!=='flac')throw new ContainerProfileError('Standalone TAK conversion requires FLAC output');return await repairTakAudio(file,{...prepared.components,container:'tak',output:'flac'},prepared.signal);}
    if(container==='tta')return await repairTtaAudio(file,{...prepared.components,container:'tta'},prepared.signal);
    if(container==='wavpack')return await repairWavPackAudio(file,{...prepared.components,container:'wavpack'},prepared.signal);
    if(container==='ape'){if(output!=='flac')throw new ContainerProfileError('Standalone APE conversion requires FLAC output');return await repairApeAudio(file,{...prepared.components,container:'ape',output:'flac'},prepared.signal);}
    return await (container==='ogg'?repairOggAudio:repairMatroskaAudio)(file,prepared.components,prepared.signal);
   }finally{busy=false;}
  },
  async *executeFragments(file:Blob,codec:PacketAudioCodec,binding:'fine'|'common',signal:AbortSignal,channels:1|2|6|8=2,output:'flac'|'opus'='flac',container:'matroska'|'isobmff'|'wave-aiff'|'ogg'|'wavpack'|'ape'|'tta'|'tak'|'shorten'|'adpcm-wave'|'telephony'|'wave-g726'|'raw-g726'='matroska',sampleRate:8000|16000|22050|32000|44100|48000|96000=48000,aacProfile:AacProfile='lc'):AsyncGenerator<Uint8Array>{
   if(container==='raw-g726')throw new ContainerProfileError('Raw G726 requires explicit coded-width owner API');
   const prepared=preparation(codec,binding,signal,channels,output,container,sampleRate,aacProfile);busy=true;
   try{
    if(container==='wave-g726'){if(codec!=='adpcm-g726')throw new ContainerProfileError('Source codec differs from G726 WAV recipe');yield* repairG726AudioFragments(file,{...prepared.components,codec,container:'wave-g726',sampleRate:8000,channels:1},prepared.signal);}
    else if(container==='telephony'){if(!['pcm-alaw','pcm-mulaw','gsm','gsm-ms'].includes(codec))throw new ContainerProfileError('Source codec differs from telephony recipe');yield* repairTelephonyAudioFragments(file,{...prepared.components,codec:codec as 'pcm-alaw'|'pcm-mulaw'|'gsm'|'gsm-ms',sampleRate:sampleRate as 8000|16000,container:'telephony'},prepared.signal);}
    else if(container==='adpcm-wave'){if(codec!=='adpcm-ms'&&codec!=='adpcm-ima-wav')throw new ContainerProfileError('Source codec differs from ADPCM recipe');yield* repairAdpcmWaveAudioFragments(file,{...prepared.components,codec,container:'adpcm-wave'},prepared.signal);}
    else if(container==='shorten'){if(codec!=='shorten')throw new ContainerProfileError('Source codec differs from Shorten recipe');if(output!=='flac')throw new ContainerProfileError('Standalone Shorten conversion requires FLAC output');yield* repairShortenAudioFragments(file,{...prepared.components,codec:'shorten',container:'shorten',output:'flac'},prepared.signal);}
    else if(container==='tak'){if(output!=='flac')throw new ContainerProfileError('Standalone TAK conversion requires FLAC output');yield* repairTakAudioFragments(file,{...prepared.components,container:'tak',output:'flac'},prepared.signal);}
    else if(container==='tta')yield* repairTtaAudioFragments(file,{...prepared.components,container:'tta'},prepared.signal);
    else if(container==='wavpack')yield* repairWavPackAudioFragments(file,{...prepared.components,container:'wavpack'},prepared.signal);
    else if(container==='ape'){if(output!=='flac')throw new ContainerProfileError('Standalone APE conversion requires FLAC output');yield* repairApeAudioFragments(file,{...prepared.components,container:'ape',output:'flac'},prepared.signal);}
    else yield* (container==='ogg'?repairOggAudioFragments:repairMatroskaAudioFragments)(file,prepared.components,prepared.signal);
   }finally{busy=false;}
  },
 };
}
