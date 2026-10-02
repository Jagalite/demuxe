// SPDX-License-Identifier: Apache-2.0
import {runtimeWorker} from './generated/internal/runtime-worker.js';
import {SubtitleOverlay} from './subtitle-overlay.js';
let engine, io, closed=false, ioStats, fatal, lastTime=0,textPointer,timingPointer,selectedTrack=false;
let host,source,privateMpvSource,initialized=false;
let attachmentSequence=0,attachmentBytes=0,attachmentsDirectory=false;
const attachments=new Map();
class AttachmentRejected extends Error {}
const loading=new AbortController(),refreshes=new Map();
const invoke=(name,...args)=>host?host.call(name,...args):engine['_'+name](...args);
const service=()=>({avChains:0,heapBytes:engine.HEAPU8.byteLength,io:source?.reader.stats??ioStats,scheduler:{...scheduler},...(host?{privateRuntime:host.facts()}:{} )});
const overlay=new SubtitleOverlay();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=()=>{if(closed)throw Error('Subtitle service closed');if(fatal)throw fatal;};
let deadlineTimer=0,deadlineEpoch=0,lastTimingEpoch=-1;
// Keep the next visual boundary until a render or pump accounts for it.
// Rearming a timer after its target must not silently skip that transition.
let nextRenderBoundary=null;
// Only natural decoding from the beginning can establish a complete ASS
// timeline. EOF after a seek into the middle is not complete-track evidence.
let continuousFromStart=true;
const learnProfile=async()=>{
 if(continuousFromStart&&selectedTrack&&(await invoke('subtitle_service_ass_scan_needed')))
  (await invoke('subtitle_service_ass_scan_complete'));
};
const scheduler={stateUpdates:0,nativeUpdateCalls:0,fullRenders:0,deadlineWakes:0};
const cancelDeadline=()=>{clearTimeout(deadlineTimer);deadlineTimer=0;deadlineEpoch++;};
const timing=async seconds=>{
 const status=(await invoke('subtitle_service_next_raw_boundary',seconds,timingPointer,timingPointer+8));
 const view=new DataView(engine.HEAPU8.buffer,timingPointer,12);
 return {supported:status>=0,unstable:status===-2,next:status===1?view.getFloat64(0,true):null,epoch:view.getUint32(8,true)};
};
const visual=async seconds=>{
 const status=(await invoke('subtitle_service_visual_schedule',seconds,timingPointer,timingPointer+8));
 const view=new DataView(engine.HEAPU8.buffer,timingPointer,12);
 return {mode:status===1?'deadline':status===2?'animated':'fallback',unstable:status===-2,next:status>0&&view.getFloat64(0,true)>seconds?view.getFloat64(0,true):null,epoch:view.getUint32(8,true)};
};
const armDeadline=async(seconds,rate,running)=>{
 cancelDeadline();
 const snapshot=await visual(seconds+.0005);
 if(!running||snapshot.mode!=='deadline'||!(rate>0)||snapshot.next===null)return {...snapshot,timingEpoch:snapshot.epoch,epoch:deadlineEpoch};
 const epoch=deadlineEpoch,target=snapshot.next;
 const ms=Math.max(1,Math.ceil((target-seconds)*1000/rate)+2);
 deadlineTimer=setTimeout(()=>{
  if(closed||epoch!==deadlineEpoch)return;
  deadlineTimer=0;scheduler.deadlineWakes++;
  postMessage({type:'subtitleDeadline',epoch,target});
 },ms);
 return {...snapshot,timingEpoch:snapshot.epoch,epoch,next:target};
};
const seekDisplay=async seconds=>{
 const recovery=(await invoke('subtitle_service_bitmap_recovery_point',seconds));
 const start=recovery>=0&&recovery<seconds-.001?recovery:seconds;
 if((await invoke('subtitle_service_seek',start))<0)throw Error('Subtitle seek failed');
 continuousFromStart=start===0;
 await delay(30);
 if(start===seconds)return;
 (await invoke('subtitle_service_block',0));
 try{
  let ready=0;
  for(let i=0;i<400&&!ready;i++){
   check();ready=(await invoke('subtitle_service_update',seconds));scheduler.nativeUpdateCalls++;
   if(ready<0){ready=0;await delay(5);continue;}if(!ready)await delay(5);
  }
  if(!ready)throw Error('Subtitle packet deadline exceeded');
 }finally{(await invoke('subtitle_service_block',1));}
};
let chain=Promise.resolve();
onmessage=({data:d})=>{
 // Refresh replies must bypass the init/render chain waiting on that read.
 if(d.type==='refreshed'){const pending=refreshes.get(d.id);if(pending){refreshes.delete(d.id);clearTimeout(pending.timer);d.error?pending.reject(Error('Authorization refresh failed')):pending.resolve(d.update);}else if(!closed)io?.postMessage(d);return;}
 // Closing must wake a blocked demux read without waiting behind a render RPC.
 if(d.type==='close'){
  if(closed)return;closed=true;cancelDeadline();loading.abort();host?.source.cancelSource();source?.close();engine?._web_io_cancel?.();io?.postMessage({type:'close'});
  for(const pending of refreshes.values()){clearTimeout(pending.timer);pending.reject(Error('Subtitle service closed'));}refreshes.clear();
  void chain.finally(async()=>{
   let cleanup,error;
   try{
    // Give the pthread reader its cancellation turn before terminating its owner.
    if(!host)await delay(50);
    io?.terminate();if(textPointer)await invoke('free',textPointer);if(timingPointer)await invoke('free',timingPointer);
    if(engine)await invoke('subtitle_service_close');
    if(host){cleanup={live:await host.call('demuxe_source_live'),...host.facts()};}
    else {const deadline=performance.now()+2000;while(engine?.PThread?.runningWorkers.length&&performance.now()<deadline)await delay(10);}
   }catch(cause){error=String(cause);}
   finally{host?.dispose();engine?.PThread?.terminateAllThreads();if(!host)await delay(50);postMessage({type:'closed',cleanup,error});self.close();}
  });return;
 }
 chain=chain.then(async()=>{
  try {
   check();let result={};
   if(d.type==='init'){
    if(initialized)throw Error('Subtitle host already initialized');initialized=true;
    if(d.runtime&&d.runtime!=='pthread'){const privateModule=await import('./private-mpv.js');privateMpvSource=privateModule.privateMpvSource;host=await privateModule.privateMpv(d.runtime,'subtitles',{signal:loading.signal}).catch(error=>{throw Error('Private mpv initialization: '+error);});engine=host.module;}
    else {const {default:create}=await import('./engine-subtitles/service.mjs');engine=await create({print:()=>{},printErr:()=>{}});}
    check();
    engine.FS.mkdir('/fonts');
    for(const [i,font] of d.fonts.entries())engine.FS.writeFile('/fonts/'+i+'.ttf',new Uint8Array(font.bytes));
    if((await invoke('subtitle_service_create'))<0)throw Error('Subtitle service initialization failed');
    textPointer=await invoke('malloc',4096);if(!textPointer)throw Error('Subtitle text inspection buffer unavailable');
    timingPointer=await invoke('malloc',16);if(!timingPointer)throw Error('Subtitle timing buffer unavailable');
    if(host){
     const refresh=d.canRefresh?resource=>new Promise((resolve,reject)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>{refreshes.delete(id);reject(Error('Authorization refresh timed out'));},5000);refreshes.set(id,{resolve,reject,timer});postMessage({type:'refresh',id,resource});}):undefined;
     source=privateMpvSource(d,refresh);await source.open(host);check();
    }else {
    io=runtimeWorker(new URL('./io-worker.js',import.meta.url),{type:'module'});
    const info=await new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>reject(Error('Subtitle source open timed out')),20000);
     io.onmessage=({data:m})=>{
      if(m.type==='ready'){clearTimeout(timeout);resolve(m.info);}
      if(m.type==='stats')ioStats=m.stats;
      if(m.type==='refresh')postMessage(m);
      if(m.type==='error'){clearTimeout(timeout);fatal=Error(m.message);reject(fatal);}
     };
     io.onerror=e=>{clearTimeout(timeout);fatal=Error(e.message);reject(fatal);};
     // Playback and seeks keep reading for the lifetime of the service. Bound
     // memory here while normal decoding collects subtitle timing.
     io.postMessage({type:'init',memory:engine.HEAPU8.buffer,pointer:engine._web_io_ptr(),file:d.file,options:d.options,canRefresh:d.canRefresh,subtitleCacheBytes:4*1024*1024});
    });
    check();engine._web_io_configure(1,BigInt(info.size));
    }
    if((await invoke('subtitle_service_open'))<0)throw Error('Subtitle source open failed');
    let loaded=0;
    for(let i=0;i<2000&&!loaded;i++){check();loaded=(await invoke('subtitle_service_loaded'));if(loaded<0)throw Error('Subtitle source load failed');if(!loaded)await delay(10);}
    if(!loaded)throw Error('Subtitle metadata deadline exceeded');
    const tracks=[];
    for(let i=0;i<(await invoke('subtitle_service_track_count'));i++){
     const id=(await invoke('subtitle_service_track_id',i)),index=(await invoke('subtitle_service_track_index',i));
     if(id>0)tracks.push({id:String(index+1),mpvId:id,'ff-index':index,type:'sub'});
    }
    (await invoke('subtitle_service_block',1));result={tracks};
   }else if(d.type==='add'){
    if(!engine._subtitle_service_external_api||await invoke('subtitle_service_external_api')!==1)throw Error('Subtitle attachment interface mismatch; install matching mpv service assets');
    if(!['ass','ssa','srt','vtt'].includes(d.asset?.format)||!(d.asset.bytes instanceof ArrayBuffer))throw new AttachmentRejected('Invalid external subtitle attachment');
    const bytes=d.asset.bytes.byteLength;
    if(!bytes||bytes>8*1024*1024||attachments.size>=16||attachmentBytes+bytes>16*1024*1024)throw new AttachmentRejected('Subtitle budget exceeded');
    const path='/subtitles/'+(++attachmentSequence)+'.'+d.asset.format;
    if(!attachmentsDirectory){engine.FS.mkdir('/subtitles');attachmentsDirectory=true;}
    engine.FS.writeFile(path,new Uint8Array(d.asset.bytes));
    const encoded=new TextEncoder().encode(path+'\0'),pointer=await invoke('malloc',encoded.length);
    if(!pointer){engine.FS.unlink(path);throw Error('Subtitle attachment allocation failed');}
    let id;
    try{engine.HEAPU8.set(encoded,pointer);id=await invoke('subtitle_service_add',pointer);}
    finally{await invoke('free',pointer);}
    if(!(id>0)){engine.FS.unlink(path);throw new AttachmentRejected('Invalid external subtitle: mpv could not load attachment');}
    attachments.set(id,{path,bytes});attachmentBytes+=bytes;
    result={mpvId:id};
   }else if(d.type==='remove'){
    const attachment=attachments.get(d.trackId);if(!attachment)throw Error('Unknown external subtitle');
    if(await invoke('subtitle_service_remove',d.trackId)<0)throw Error('Subtitle attachment removal failed');
    engine.FS.unlink(attachment.path);attachmentBytes-=attachment.bytes;attachments.delete(d.trackId);
   }else if(d.type==='select'){
    cancelDeadline();lastTimingEpoch=-1;nextRenderBoundary=null;
    if(selectedTrack||lastTime!==0)continuousFromStart=false;
    if((await invoke('subtitle_service_select',d.trackId))<0)throw Error('Subtitle selection failed');selectedTrack=d.trackId>0;overlay.clear();lastTime=0;await delay(0);
   }else if(d.type==='seek'){
    cancelDeadline();lastTimingEpoch=-1;nextRenderBoundary=null;
    await seekDisplay(d.seconds);overlay.clear();lastTime=d.seconds;
   }else if(d.type==='timing'){
    if(!Number.isFinite(d.seconds))throw Error('Invalid subtitle timing position');
    const status=(await invoke('subtitle_service_next_raw_boundary',d.seconds,timingPointer,timingPointer+8));
    const view=new DataView(engine.HEAPU8.buffer,timingPointer,12);
    result={supported:status>=0,unstable:status===-2,next:status===1?view.getFloat64(0,true):null,epoch:view.getUint32(8,true),visual:await visual(d.seconds),avChains:(await invoke('subtitle_service_av_chains'))};
   }else if(d.type==='profile'){
    // Scheduling is advisory. Never seek/read the whole track to classify it
    // on the critical startup path; normal render/pump calls learn its state.
    await learnProfile();
    result={mode:selectedTrack?(await visual(lastTime)).mode:'fallback',avChains:(await invoke('subtitle_service_av_chains'))};
   }else if(d.type==='cancelDeadline'){
    cancelDeadline();result={epoch:deadlineEpoch};
   }else if(d.type==='pump'){
    if(!Number.isFinite(d.seconds))throw Error('Invalid subtitle clock position');
    if(!selectedTrack){cancelDeadline();result={mode:'fallback'};}
    else{
     const recoveredClock=!Number.isFinite(lastTime)||d.seconds<lastTime-.05||d.seconds>lastTime+1;
     if(recoveredClock){
      cancelDeadline();lastTimingEpoch=-1;nextRenderBoundary=null;
      await seekDisplay(d.seconds);overlay.clear();
     }
     lastTime=d.seconds;(await invoke('subtitle_service_block',0));let ready=0;
     for(let i=0;i<400&&!ready;i++){
      check();ready=(await invoke('subtitle_service_update',d.seconds));scheduler.nativeUpdateCalls++;
      if(ready<0){ready=0;await delay(5);continue;}if(!ready)await delay(5);
     }
     (await invoke('subtitle_service_block',1));if(!ready)throw Error('Subtitle packet deadline exceeded');
     scheduler.stateUpdates++;
     if((await invoke('subtitle_service_av_chains'))!==0)throw Error('Subtitle service unexpectedly allocated A/V decoding');
     await learnProfile();
     const schedule=await armDeadline(d.seconds,d.rate,d.running);
     const crossedBoundary=nextRenderBoundary!==null&&d.seconds>=nextRenderBoundary;
     if(crossedBoundary)nextRenderBoundary=null;
     const timingChanged=recoveredClock||crossedBoundary||lastTimingEpoch>=0&&schedule.timingEpoch!==lastTimingEpoch;
     lastTimingEpoch=schedule.timingEpoch;
     result={mode:schedule.mode,timingChanged,schedule,service:service()};
    }
   }else if(d.type==='render'){
    if(!Number.isFinite(d.seconds)||d.width<1||d.height<1||d.width>1920||d.height>1080)throw Error('Invalid subtitle render bounds');
    if(!selectedTrack){if((await invoke('subtitle_service_av_chains'))!==0)throw Error('Subtitle service unexpectedly allocated A/V decoding');postMessage({id:d.id,size:0,text:'',service:service()});return;}
    if(!Number.isFinite(lastTime)||d.seconds<lastTime-.05||d.seconds>lastTime+1){
     await seekDisplay(d.seconds);overlay.clear();
    }
    lastTime=d.seconds;(await invoke('subtitle_service_block',0));let ready=0;
    for(let i=0;i<400&&!ready;i++){
     // Packet acquisition can take many turns. Do not run libass and rebuild
     // the bitmap on every poll while the subtitle decoder is still waiting.
     check();ready=(await invoke('subtitle_service_update',d.seconds));scheduler.nativeUpdateCalls++;
     if(ready>0)ready=(await invoke('subtitle_service_render',d.seconds,d.width,d.height));
     if(ready<0){ready=0;await delay(5);continue;}if(!ready)await delay(5);
    }
    (await invoke('subtitle_service_block',1));if(!ready)throw Error('Subtitle packet deadline exceeded');
    scheduler.fullRenders++;
    if((await invoke('subtitle_service_av_chains'))!==0)throw Error('Subtitle service unexpectedly allocated A/V decoding');
    const previous=overlay.serial,snapshot=overlay.read(engine);
    let bitmap;
    if(d.force||previous!==overlay.serial){const canvas=new OffscreenCanvas(d.width,d.height);overlay.draw(canvas.getContext('2d'),snapshot);bitmap=canvas.transferToImageBitmap();}
    const textLength=(await invoke('subtitle_service_text',textPointer,4096));
    let text='';
    try{if(textLength>0)text=new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(engine.HEAPU8.subarray(textPointer,textPointer+textLength)));}
    catch{throw Error('Subtitle decode failed');}
    await learnProfile();
    const schedule=await armDeadline(d.seconds,d.rate,d.running);
    // Use the exact rendered time, without the timer query's look-ahead.
    const renderedTiming=await visual(d.seconds);
    nextRenderBoundary=renderedTiming.next;
    lastTimingEpoch=renderedTiming.epoch;
    postMessage({id:d.id,bitmap,unchanged:!bitmap,hasOverlay:!!snapshot.surface,size:bitmap?engine.HEAP32[(engine._web_subtitle_ptr()>>>2)+2]:0,text,mode:schedule.mode,schedule,service:service()},bitmap?[bitmap]:[]);return;
   }
   postMessage({id:d.id,...result});
  }catch(error){const failures=host?.source.drainFailures()??[];if(failures.length)error=Error('Source transport: '+failures.map(f=>String(f.cause??f.kind)).join('; '));if(host&&!(error instanceof AttachmentRejected))fatal=error;postMessage({id:d.id,error:String(error)});}
 });
};
