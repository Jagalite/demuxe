// SPDX-License-Identifier: Apache-2.0
import {videoCodecConfig,vp9PacketConfig} from './video-codec-config.js';
import {WebCodecsVideoDecoder} from './external-video-decoder.js';
import {initialLegacyDecoderWorker,reduceLegacyDecoderWorker,admitLegacyDecoderWork,finishLegacyDecoderWork,legacyDecoderCurrent,admitLegacyDecoderFrame,takeLegacyDecoderFrame,legacyDecoderPacketAdmission,observeLegacyDecoderWait} from './generated/internal/machine/legacy-decoder-worker.js';
import {videoReorderDepth} from './generated/internal/machine/video-frame-order.js';
let control=initialLegacyDecoderWorker();
const transition=event=>{control=reduceLegacyDecoderWorker(control,event);};
let pendingConfiguration;
let packetPrefix;
// Dedicated service: native decoder pthread waits never block this event loop.
let memory,pointer,header,view,decoder,configuration,pumpTimer,pumpChannel;
const frames=new Map();
const closedFrames=new WeakSet();
const packetOffset=80,frameOffset=80+8*1024*1024;
// errno values are from the pinned Emscripten WASI ABI.
const AGAIN=-6,EOF=-541478725,IO=-29;
const stats={packetBytes:0,ownedPacketBytes:0,sharedPacketInputs:0,sharedPacketFallbacks:0,submitted:0,frames:0,receivedFrames:0,closedFrames:0,peakOutstanding:0,peakFrames:0,resets:0,errors:0,copyMs:0};
const color={bt709:1,bt470bg:5,smpte170m:6,bt2020:9,'bt2020-ncl':9,smpte2084:16,'iec61966-2-1':13};
function closeFrame(frame){if(closedFrames.has(frame))return;closedFrames.add(frame);frame.close();stats.closedFrames++;}
function clear(){
 transition({type:'reset'});const old=decoder;decoder=null;const retired=[...frames.values()];frames.clear();
 let failure;const clean=action=>{try{action();}catch(error){failure??=error;}};
 if(control.closed){
  if(header){const ticket=Atomics.load(header,0);if((ticket&3)===1){header[3]=IO;Atomics.store(header,0,ticket+1);Atomics.notify(header,0);}}
 }
 clean(()=>old?.destroy());for(const frame of retired)clean(()=>closeFrame(frame));
 if(failure)throw failure;
}

async function checkConfiguration(valid){
 // Keep only descriptive fields: initialization bytes can be large and are not
 // useful in a UI error. Retain the exact codec string passed to WebCodecs.
 const describe=config=>({codec:config.codec,codedWidth:config.codedWidth,codedHeight:config.codedHeight,descriptionBytes:config.description?.byteLength??0,hardwareAcceleration:config.hardwareAcceleration,optimizeForLatency:config.optimizeForLatency});
 const requested=describe(configuration);
 stats.supportCheck={requested,source:{...stats.input}};
 let support;
 try{support=await VideoDecoder.isConfigSupported(configuration);}
 catch(error){
  if(!valid())return false;
  stats.supportCheck.error=String(error);
  throw Error(`Browser decoder configuration check failed: ${String(error)}\nRequested configuration: ${JSON.stringify(requested)}`);
 }
 if(!valid())return false;
 stats.supportCheck.supported=support.supported;
 if(support.config)stats.supportCheck.recognized=describe(support.config);
 if(!support.supported){
  const family=({1:'H.264 / AVC',2:'H.265 / HEVC',3:'VP8',4:'VP9',5:'AV1'})[stats.input.kind]??'video';
  const depth=stats.input.depth>0?`${stats.input.depth}-bit`:'not reported by the source';
  const profile=stats.input.profile>=0?stats.input.profile:'unknown';
  const level=stats.input.level>=0?stats.input.level:'unknown';
  throw Error(`Unsupported browser configuration (${family}).\nCodec string: ${requested.codec}\nResolution: ${requested.codedWidth} × ${requested.codedHeight}\nSource bit depth: ${depth}\nSource profile / level IDs: ${profile} / ${level}\nDecoder initialization data: ${requested.descriptionBytes} bytes\nHardware acceleration policy: ${requested.hardwareAcceleration}\nWebCodecs reported supported=false without a specific rejection reason. These details do not establish whether browser support or demuxe's configuration mapping caused the rejection.`);
 }
 return true;
}
function configure(){
 const current=control.generation;
 const acquired=new WebCodecsVideoDecoder({Decoder:VideoDecoder,error:error=>{if(legacyDecoderCurrent(control,current)){transition({type:'failed',generation:current,error:String(error)});stats.errors++;postMessage({wakeup:true});}},output:frame=>{
  stats.receivedFrames++;
  // Read browser properties before capturing policy state: an injected decoder
  // can synchronously retire this generation from a frame accessor.
  let timestamp;
  try{timestamp=frame.timestamp;}catch(error){
   if(legacyDecoderCurrent(control,current)){transition({type:'failed',generation:current,error:String(error)});stats.errors++;}
   try{closeFrame(frame);}finally{if(legacyDecoderCurrent(control,current))postMessage({wakeup:true});}return;
  }
  const admission=admitLegacyDecoderFrame(control,current,timestamp);control=admission.state;
  if(admission.id===null){closeFrame(frame);if(admission.overflow){stats.errors++;if(legacyDecoderCurrent(control,current))postMessage({wakeup:true});}return;}
  frames.set(admission.id,frame);postMessage({wakeup:true});stats.peakFrames=Math.max(stats.peakFrames,control.frames.length);
 },dequeue:()=>{if(legacyDecoderCurrent(control,current))postMessage({wakeup:true});}});
 if(!legacyDecoderCurrent(control,current)){acquired.destroy();return;}
 decoder=acquired;transition({type:'configure',reorderDepth:stats.reorderDepth});acquired.configure(configuration);
}
self.onmessage=({data})=>{
 if(data.type==='watchdogs'){transition({type:'watchdog',enabled:data.decoderOutput!==false});postMessage({watchdog:control.watchdog});return;}
 if(data.type==='cancel'){
  if(control.closed)return;
  transition({type:'cancel'});let failure;try{clear();}catch(error){failure=error;}
  if(header){const ticket=Atomics.load(header,0);if((ticket&3)===1){header[3]=IO;Atomics.store(header,0,ticket+1);Atomics.notify(header,0);}}
  postMessage({stats:{...stats,outstanding:0,queued:0,active:false}});if(failure)postMessage({error:String(failure)});
  return;
 }
 if(control.initialized||control.closed){postMessage({error:'Decoder initialization unavailable'});return;}
 transition({type:'init',disabled:!!data.disabled,watchdog:data.decoderOutputWatchdog!==false,faultAfter:data.faultAfter??0});
 memory=data.memory;pointer=data.pointer;header=new Int32Array(memory,pointer,16);view=new DataView(memory,pointer);
 if(typeof Atomics.waitAsync==='function')void (async()=>{
  const channel=pumpChannel=new MessageChannel();
  const yieldTask=()=>new Promise(resolve=>{channel.port1.onmessage=resolve;channel.port2.postMessage(0);});
  for(;;){
   void pump();
   const state=Atomics.load(header,0);
   // The native thread can publish its next request before this load. Do not
   // wait for another notification when that request is already ready.
   if((state&3)===1&&!control.busy){await yieldTask();continue;}
   await Atomics.waitAsync(header,0,state,1000).value;
   await yieldTask();
  }
 })();
 else pumpTimer=setInterval(pump,1);
 postMessage({ready:true});
};
async function pump(){
 if(!header)return;
 const ticket=Atomics.load(header,0);if((ticket&3)!==1)return;
 // Cancellation retires decoding, but native destruction can still issue its
 // close request afterward. Keep this bounded responder until owner termination.
 if(control.closed){header[3]=header[2]===5?0:IO;Atomics.store(header,0,ticket+1);Atomics.notify(header,0);return;}
 if(control.busy){
  if(header[2]===5||header[2]===6){clear();header[3]=header[2]===5?0:IO;Atomics.store(header,0,ticket+1);Atomics.notify(header,0);}
  return;
 }
 const admission=admitLegacyDecoderWork(control,ticket);control=admission.state;if(admission.id===null)return;
 const lease=admission.id;let result=0;
 const operation=header[2],current=control.generation;
 const valid=()=>!control.closed&&control.busy?.id===lease&&Atomics.load(header,0)===ticket;
 try{
  if(operation===1){
   clear();if(control.disabled||typeof VideoDecoder==='undefined')throw Error('VideoDecoder unavailable');
   const size=header[4],w=header[5],h=header[6];
   if(size<0||size>65536)throw Error('Invalid decoder configuration size');
   const description=new Uint8Array(memory,pointer+packetOffset,size).slice();
   stats.input={kind:header[13]||1,width:w,height:h,profile:header[14],level:header[15],depth:header[8],descriptionBytes:size};
   // An empty hvcC relies on in-band parameter sets. Browser acceptance at
   // startup does not establish random-access decoding after reset: the
   // screened sources skip the requested tail frames. Keep this unqualified
   // configuration on Software until the bridge preserves that seek contract.
   if(stats.input.kind===2&&description.length>=23&&description[0]===1&&description[22]===0)
    throw Error('Unsupported retained HEVC configuration: in-band parameter sets require Software');
   pendingConfiguration=null;stats.reorderDepth=stats.input.kind===1?videoReorderDepth(stats.input.kind,description):null;
   if(stats.input.kind===4&&(stats.input.profile<0||!stats.input.depth)){
    pendingConfiguration={...stats.input,description};configuration=null;return;
   }
   const adapted=videoCodecConfig({...stats.input,description,depth:header[8]||8});
   configuration=adapted.configuration;packetPrefix=adapted.prefix;stats.codec=configuration.codec;
   if(!await checkConfiguration(valid)||!valid())return;
   configure();
  }else if(operation===5){clear();}
  else if(operation===6){clear();if(configuration)configure();stats.resets++;}
  else{
   if(control.failure)throw Error(control.failure);
   if(!decoder&&pendingConfiguration){
    if(operation===4){result=AGAIN;return;}
    if(operation!==2)throw Error('VP9 source ended before initialization');
    if(header[4]<1||header[4]>8*1024*1024)throw Error('Packet size limit');
    const bytes=new Uint8Array(memory,pointer+packetOffset,header[4]);
    const packetConfig=vp9PacketConfig(bytes);
    stats.input={...stats.input,...packetConfig};
    const adapted=videoCodecConfig({...pendingConfiguration,...packetConfig});
    configuration=adapted.configuration;packetPrefix=adapted.prefix;stats.codec=configuration.codec;
    if(!await checkConfiguration(valid)||!valid())return;
    configure();pendingConfiguration=null;
   }
   if(!decoder)throw Error('Decoder is closed');
   if(operation===2){
    if(!legacyDecoderPacketAdmission(control,decoder.queuedPackets))result=AGAIN;
    else{
     const size=header[4];if(size<1||size>8*1024*1024)throw Error('Packet size limit');
     let bytes=new Uint8Array(memory,pointer+packetOffset,size);stats.packetBytes+=size;
     if(!control.shared){bytes=bytes.slice();stats.ownedPacketBytes+=bytes.length;}
     if(control.needsKey&&header[7]&&packetPrefix?.length){const joined=new Uint8Array(packetPrefix.length+bytes.length);joined.set(packetPrefix);joined.set(bytes,packetPrefix.length);bytes=joined;stats.ownedPacketBytes+=joined.length;}
     const timestamp=view.getFloat64(64,true),duration=view.getFloat64(72,true);
     if(!Number.isSafeInteger(timestamp)||!Number.isSafeInteger(duration)||duration<0)throw Error(`Invalid timestamps: ${timestamp}, duration ${duration}`);
     const init={type:header[7]?'key':'delta',timestamp,...(duration?{duration}:{}),data:bytes};
     let chunk;
     // EncodedVideoChunk synchronously copies input when no transfer list is
     // supplied. The producer still owns this mailbox until pump acknowledges
     // it below. Never transfer or detach the shared Wasm heap.
     try{chunk=new EncodedVideoChunk(init);if(bytes.buffer===memory)stats.sharedPacketInputs++;}
     catch(error){
      if(error?.name!=='TypeError'||bytes.buffer!==memory)throw error;
      transition({type:'shared-unsupported'});stats.sharedPacketFallbacks++;
      bytes=bytes.slice();stats.ownedPacketBytes+=bytes.length;chunk=new EncodedVideoChunk({...init,data:bytes});
     }
     if(!decoder.submit(chunk)){result=AGAIN;return;}
     transition({type:'submitted'});stats.submitted++;stats.peakOutstanding=Math.max(stats.peakOutstanding,decoder.queuedPackets);
    }
   }else if(operation===3){
    if(control.draining){result=0;return;}transition({type:'drain'});const epoch=control.generation;
    decoder.drain().then(()=>{if(legacyDecoderCurrent(control,epoch)){transition({type:'flushed',generation:epoch});postMessage({wakeup:true});}},error=>{if(legacyDecoderCurrent(control,epoch)){transition({type:'failed',generation:epoch,error:String(error)});postMessage({wakeup:true});}});
   }else if(operation===4){
    if(control.faultAfter&&stats.frames>=control.faultAfter)throw Error('Injected decoder failure');
    const selected=takeLegacyDecoderFrame(control);control=selected.state;
    if(selected.id!==null){
     const frame=frames.get(selected.id);frames.delete(selected.id);
     try{
      const actualWidth=frame.visibleRect.width,actualHeight=frame.visibleRect.height;
      stats.actualWidth=actualWidth;stats.actualHeight=actualHeight;stats.pixelFormat=frame.format;
      const w=2,h=2;
      if(actualWidth<1||actualHeight<1||actualWidth>8192||actualHeight>8192||actualWidth*actualHeight>33554432||w<1||h<1||w>1920||h>1080||(w&1)||(h&1))throw Error('Unsupported decoded frame');
      const nv12=frame.format==='NV12';
      new Uint8Array(memory,pointer+frameOffset,6).set([16,16,16,16,128,128]);
      stats.placeholderFrames=(stats.placeholderFrames??0)+1;
      header[5]=w;header[6]=h;header[8]=+nv12;
      header[9]=color[frame.colorSpace.primaries]??2;header[10]=color[frame.colorSpace.transfer]??2;
      header[11]=color[frame.colorSpace.matrix]??2;header[12]=+!!frame.colorSpace.fullRange;
      view.setFloat64(64,frame.timestamp,true);view.setFloat64(72,frame.duration??0,true);
      postMessage({retainedFrame:frame,pts:frame.timestamp,generation:control.generation},[frame]);
      stats.transferredFrames=(stats.transferredFrames??0)+1;
      transition({type:'delivered'});stats.frames++;result=1;
     }finally{closeFrame(frame);}
    }else if(control.draining)result=control.flushed?EOF:0;
    else result=!legacyDecoderPacketAdmission(control,decoder.queuedPackets)?0:AGAIN;
    // Measure an actual blocked receive, not wall time since the last frame:
    // paused/idle periods and packet reordering do not spend the output budget.
    control=observeLegacyDecoderWait(control,decoder.queuedPackets,performance.now());
    if(control.decoderTimeout){
     stats.watchdog={waitingMs:Math.round(performance.now()-control.outputWaitSince),decodeQueueSize:decoder.queuedPackets,queuedFrames:control.frames.length,submitted:control.submitted,consumed:control.consumed,draining:control.draining,flushed:control.flushed,codec:configuration?.codec};
     // Missing output is inconclusive. Preserve timeout classification rather
     // than turning scheduling delays into cached codec rejections.
     throw Error(`Decoder output watchdog timed out: ${JSON.stringify(stats.watchdog)}`);
    }
   }else throw Error('Unknown decoder operation');
  }
 }catch(error){transition({type:'failed',generation:control.generation,error:String(error)});stats.errors++;result=IO;if(!control.closed)postMessage({error:String(error),decoderTimeout:control.decoderTimeout});}
 finally{
  if(valid()){header[3]=result;Atomics.store(header,0,ticket+1);Atomics.notify(header,0);}
  if(operation!==4||stats.frames%30===0)postMessage({stats:{...stats,outputWatchdogEnabled:control.watchdog,outstanding:decoder?.queuedPackets??0,queued:control.frames.length,active:!!decoder,decoderBackend:decoder?'webcodecs':'ffmpeg'}});
  control=finishLegacyDecoderWork(control,lease);
 }
}
