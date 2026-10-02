// SPDX-License-Identifier: Apache-2.0
import {preparedEngine} from './prepared-engine.js';
import {videoCodecConfig,vp9RemuxConfig} from './video-codec-config.js';
import {remuxPackaging} from './remux-packaging.js';
import {hybridPreflight} from './hybrid-preflight.js';
import {ProgressiveMP4} from './progressive-mp4.js';
import {initialRemuxProducer,transitionRemuxProducer,remuxProducerCurrent,remuxProducerTail} from './generated/internal/machine/remux-producer.js';
let control=initialRemuxProducer(),owner,chunks=[],delivery,splitter,timing;
const stats={calls:0,remuxMs:0,generatedBytes:0,peakBatchBytes:0,heapBytes:0};
const transition=command=>{const decision=transitionRemuxProducer(control,command);control=decision.state;return decision;};
const current=operation=>remuxProducerCurrent(control,operation);
const assertCurrent=operation=>{if(!current(operation))throw new DOMException('Superseded','AbortError');};
const send=(operation,message,transfers)=>{assertCurrent(operation);postMessage(message,transfers);};
async function release(resource,closeNative=false){
 if(!resource)return;const errors=[],attempt=action=>{try{action();}catch(error){errors.push(error);}};
 if(resource.privateHost){attempt(()=>resource.privateHost.bridge.cancel());attempt(()=>resource.privateHost.reader.close());try{await resource.privateHost.bridge.destroy();}catch(error){errors.push(error);}}
 else if(closeNative)try{await resource.engine.ccall('rm_close',null,[],[]);}catch(error){errors.push(error);}
 if(errors.length)stats.cleanupFailures=(stats.cleanupFailures??0)+errors.length;
}
const call=async(operation,name,args=[],type='number')=>{
 assertCurrent(operation);const resource=owner,types=args.map(arg=>typeof arg==='string'?'string':'number');
 const result=await(resource.privateHost?resource.privateHost.bridge.call(name,type,types,args):resource.engine.ccall(name,type,types,args));assertCurrent(operation);if(owner!==resource)throw new DOMException('Superseded','AbortError');return result;
};
const checked=async(operation,name,args=[])=>{const n=await call(operation,name,args);if(n<0){const source=owner.privateHost?.bridge.source.drainFailures().map(f=>String(f.cause??f.kind)).join('; ');throw Error(source?'Source transport: '+source:`FFmpeg error ${n}: ${await call(operation,'rm_error',[],'string')}`);}return n;};
function takeBatch(operation,progressive=false,more){
 const batch=transition({type:'batch',operation,progressive,chunks:chunks.length,more});if(!batch.accepted)throw new DOMException('Superseded','AbortError');if(batch.error)throw Error(batch.error);
 const bytes=batch.bytes,retained=chunks;chunks=[];let buffer,parts;
 if(batch.mode!=='gather'){
  if(batch.mode==='separate')parts=retained.map(chunk=>chunk.buffer);
  stats.progressiveFragments=(stats.progressiveFragments||0)+(progressive?1:0);stats.separateFragments=(stats.separateFragments||0)+(parts?1:0);stats.progressiveCopiedBytes=(stats.progressiveCopiedBytes||0)+(delivery?.copiedBytes||0);buffer=new ArrayBuffer(0);
 }else{
  const sole=retained.length===1?retained[0]:null,reuse=sole&&sole.buffer instanceof ArrayBuffer&&sole.byteOffset===0&&sole.byteLength===sole.buffer.byteLength,output=reuse?sole:new Uint8Array(bytes);
  if(!reuse){let at=0;for(const chunk of retained){output.set(chunk,at);at+=chunk.length;}}
  stats.gatherCopiedBytes=(stats.gatherCopiedBytes||0)+(reuse?0:bytes);stats.reusedOwnedBatches=(stats.reusedOwnedBatches||0)+(reuse?1:0);buffer=output.buffer;
 }
 stats.generatedBytes+=bytes;stats.peakBatchBytes=Math.max(stats.peakBatchBytes,bytes);return {buffer,parts};
}
self.onmessage=async({data})=>{
 if(data.type==='close'){
  const decision=transition({type:'close'});if(!decision.accepted)return;const resource=owner;owner=null;chunks=[];delivery=splitter=timing=null;
  await release(resource,decision.closeNative);if(transition({type:'finish',operation:decision.operation}).accepted){postMessage({type:'closed'});close();}return;
 }
 const admitted=transition({type:'begin',kind:data.type,requestId:data.id,fragmentDelivery:data.fragmentDelivery});
 if(!admitted.accepted){if(admitted.error)postMessage({type:'error',message:admitted.error});return;}
 const operation=admitted.operation;
 try{
  const start=performance.now();
  if(data.type==='init'||data.type==='probe'){
   const runtime=data.runtime??'pthread';
   if(runtime==='asyncify')for(const name of ['Suspending','promising'])Object.defineProperty(WebAssembly,name,{value:undefined,configurable:false,writable:false});
   const printErr=message=>{if(control.epoch===operation.epoch&&!['closing','closed','failed'].includes(control.phase))postMessage({type:'log',message});};let resource;
   if(runtime==='pthread'){
    if(!globalThis.crossOriginIsolated)throw Error('Remux requires cross-origin isolation');
    const {default:createRemux}=await import(data.audioAdaptation?'./engine-adaptation/remux.mjs':'./engine-remux/remux.mjs');assertCurrent(operation);
    const engine=await createRemux({...preparedEngine(data.compiledWasm),printErr});resource={engine};
   }else{
    const {privateRemux}=await import('./private-remux.js');assertCurrent(operation);
    const privateHost=await privateRemux(runtime,{compiledWasm:data.compiledWasm,port:data.port,size:data.size,audioAdaptation:data.audioAdaptation,printErr});resource={engine:privateHost.engine,privateHost};
   }
   if(!current(operation)){await release(resource,true);return;}
   owner=resource;transition({type:'engine',operation});const engine=resource.engine;if(runtime==='pthread')engine.io=data.mailbox;
   const adaptationABI=()=>{if(engine.preparationInterface!==2)throw Error('Audio preparation initialization interface mismatch; install matching runtime assets');};
   engine.parseVP9=vp9RemuxConfig;engine.raps=[];engine.tracks=[];stats.transport=runtime;stats.sharedHeap=!(engine.HEAPU8.buffer instanceof ArrayBuffer);
   stats.crossOriginIsolated=globalThis.crossOriginIsolated;stats.sharedArrayBuffer=typeof SharedArrayBuffer;stats.jspiSuspending=typeof WebAssembly.Suspending;stats.jspiPromising=typeof WebAssembly.promising;stats.asset=resource.privateHost?.asset;
   if(data.type==='probe'){
    if(data.demuxer){
     if(typeof data.demuxer!=='string'||!/^[a-z0-9_]{1,64}$/.test(data.demuxer))throw Error('Invalid demuxer hint');
     if(typeof engine._rm_set_demuxer!=='function')throw Error('Source inspection assets do not support demuxer hints');
     await checked(operation,'rm_set_demuxer',[data.demuxer]);
    }
    if(data.audioAdaptation){await checked(operation,'rm_adapt_audio',[1]);adaptationABI();}
    await checked(operation,'rm_probe',[data.size]);const hybridRejection=await hybridPreflight(engine.tracks);assertCurrent(operation);
    const tracks=engine.tracks.map(({browserConfig,...track})=>{if(browserConfig)try{track.codecString=videoCodecConfig(browserConfig).configuration.codec;}catch{/* Preserve incomplete configuration as unknown. */}return track;});
    const duration=await call(operation,'rm_duration');send(operation,{type:'probed',tracks,hybridRejection,duration,format:engine.format,runtime:{...stats}});return;
   }
   engine.emit=chunk=>{
    const active=control.active;if(owner!==resource||!active||!['init','select-container','next'].includes(active.kind)||!current(active))throw new DOMException('Superseded','AbortError');
    const decision=transition({type:'bytes',operation:active,bytes:chunk.length});if(decision.error)throw Error(decision.error);
    if(delivery){delivery.push(chunk);assertCurrent(active);if(!delivery.active)chunks.push(chunk);else chunks=[];}else chunks.push(chunk);
   };
   if(data.audioAdaptation){if(!['flac','opus','flac24'].includes(data.audioAdaptation))throw Error('Unsupported adaptation profile');if(typeof engine._rm_adapt_audio!=='function')throw Error('Audio adaptation ABI unavailable');await checked(operation,'rm_adapt_audio',[data.audioAdaptation==='flac24'?3:data.audioAdaptation==='opus'?2:1]);adaptationABI();}
   await checked(operation,'rm_open',[data.size,data.videoTrack??-1,data.audioTrack??-1]);const reportedDuration=await call(operation,'rm_duration');
   const video=engine.videoConfig?videoCodecConfig({...engine.videoConfig,maxWidth:8192,maxHeight:8192}).configuration.codec:await call(operation,'rm_video_codec',[],'string'),audio=await call(operation,'rm_audio_codec',[],'string');
   const bounds=engine.trackBounds,target=data.target||0,policy=remuxProducerTail({adaptation:data.audioAdaptation,duration:reportedDuration,target,videoEnd:bounds?.videoEnd,audioEnd:bounds?.audioEnd,pcmAudio:engine.tracks.some(t=>t.selected&&t.type==='audio'&&['pcm_s16le','pcm_s24le'].includes(t.codec)),h264Video:engine.tracks.some(t=>t.selected&&t.type==='video'&&t.codec==='h264')});
   if(policy.error)throw Error(policy.error);
   if(policy.windowed){const {SplitMP4}=await import('./split-mp4.js');assertCurrent(operation);const acquired=new SplitMP4();assertCurrent(operation);splitter=acquired;engine.windowedTails=true;}
   const candidates=remuxPackaging(video,audio,engine.container),duration=policy.duration;
   const negotiated=transition({type:'negotiate',operation,value:{candidates,duration,target,decodeTarget:policy.decodeTarget,windowed:policy.windowed}});if(!negotiated.accepted)throw Error(negotiated.error??'Superseded');stats.remuxMs+=performance.now()-start;
   send(operation,{type:'negotiate',candidates,duration,windowed:policy.windowed,trackBounds:bounds,lanes:policy.windowed?[`video/mp4; codecs="${video}"`,`audio/mp4; codecs="${audio}"`]:undefined});
  }else if(data.type==='select-container'){
   const engine=owner.engine,decision=transition({type:'select',operation,container:data.container,preparationInterface:engine.preparationInterface});if(!decision.accepted)throw Error(decision.error??'Superseded');
   const {selected,negotiation:{duration,decodeTarget}}=decision;
   if(engine.preparationInterface===2&&selected.container!=='webm'){const {MP4VideoTiming}=await import('./split-mp4.js');assertCurrent(operation);const acquired=new MP4VideoTiming();assertCurrent(operation);timing=acquired;}
   await checked(operation,'rm_set_container',[selected.container==='webm'?1:0]);await checked(operation,'rm_start',[decodeTarget]);const {buffer}=takeBatch(operation);stats.remuxMs+=performance.now()-start;stats.heapBytes=engine.HEAPU8.byteLength;
   const presentationFrames=timing?.read(buffer),buffers=splitter?splitter.split(buffer):undefined;
   send(operation,{type:'ready',producedAt:performance.timeOrigin+performance.now(),presentationFrames,duration,mime:selected.mime,tracks:engine.tracks,buffer:buffers?undefined:buffer,buffers,stats:{...stats}},buffers??[buffer]);
  }else if(data.type==='next'){
   const engine=owner.engine;
   if(control.progressiveEnabled&&control.fragmentDelivery==='progressive')delivery=new ProgressiveMP4(chunk=>{const buffer=chunk.byteOffset===0&&chunk.byteLength===chunk.buffer.byteLength?chunk.buffer:chunk.slice().buffer;send(operation,{type:'fragment-part',producedAt:performance.timeOrigin+performance.now(),id:operation.requestId,buffer},[buffer]);});
   const more=await checked(operation,'rm_step'),progressive=delivery?.finish();assertCurrent(operation);const {parts,buffer}=takeBatch(operation,!!progressive,more);
   delivery=null;if(engine.adaptation)stats.adaptation={...engine.adaptation};stats.calls++;stats.remuxMs+=performance.now()-start;stats.heapBytes=engine.HEAPU8.byteLength;
   const frames=engine.videoFrames?.splice(0)??[],raps=engine.raps.splice(0),presentationFrames=timing?.read(buffer),buffers=splitter?splitter.split(buffer):undefined;
   send(operation,{type:'fragment',producedAt:performance.timeOrigin+performance.now(),id:operation.requestId,more,frames,presentationFrames,parts,progressive,buffer:buffers?undefined:buffer,buffers,raps,stats:{...stats}},parts??buffers??[buffer]);
  }
 }catch(error){
  if(transition({type:'failure',operation}).accepted){const resource=owner;owner=null;chunks=[];delivery=splitter=timing=null;void release(resource,true);if(control.epoch===operation.epoch&&control.phase==='failed')postMessage({type:'error',message:`${error.message||error}\n${error.stack||''}`});}
 }finally{transition({type:'finish',operation});}
};
