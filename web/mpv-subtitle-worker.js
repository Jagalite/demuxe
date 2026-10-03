// SPDX-License-Identifier: Apache-2.0
import {runtimeWorker} from './generated/internal/runtime-worker.js';
import {SubtitleOverlay} from './subtitle-overlay.js';
import {subtitleRawTiming,subtitleVisualTiming,subtitleRecoverClock,subtitleSeekStart,subtitleMayLearnProfile,changeSubtitleTimeline,cancelSubtitleDeadline,armSubtitleDeadline,subtitleDeadlineCurrent,settleSubtitleDeadline,completeSubtitlePump,admitSubtitleAttachment,commitSubtitleAttachment,subtitleAttachment,removeSubtitleAttachment,beginSubtitleOpenWait,settleSubtitleOpenWait,failSubtitleWorkerLifetime,initialSubtitleWorker,admitSubtitleWorker,startSubtitleWorker,finishSubtitleWorker,failSubtitleWorker,closeSubtitleWorker,closedSubtitleWorker,subtitleWorkerAlive,subtitleWorkerCurrent,admitSubtitleRefresh,subtitleRefreshCurrent,settleSubtitleRefresh} from './generated/internal/machine/subtitle-worker.js';
let control=initialSubtitleWorker();
let engine, io, ioStats, fatal,textPointer,timingPointer;
let host,source,releasedSource,privateMpvSource,ioOpening;
const releaseSource=()=>{const captured=source;if(!captured||releasedSource===captured)return;releasedSource=captured;captured.close();};
let attachmentsDirectory=false;
const attachmentFiles=new Set();
class AttachmentRejected extends Error {}
const loading=new AbortController(),refreshes=new Map();
const rawInvoke=(name,...args)=>host?host.call(name,...args):engine['_'+name](...args);
const invoke=async(request,name,...args)=>{check(request);const target=host??engine,method=target[host?'call':'_'+name];check(request);const result=await method.apply(target,host?[name,...args]:args);check(request);return result;};
// Allocation is registered by its caller before checking retirement, so a late
// native result remains reachable by cleanup.
const allocate=async(request,size)=>{check(request);const target=host??engine,method=target[host?'call':'_malloc'];check(request);return await method.apply(target,host?['malloc',size]:[size]);};
const send=(request,value,transfer=[])=>{check(request);postMessage(value,transfer);};
const service=()=>({avChains:0,heapBytes:engine.HEAPU8.byteLength,io:source?.reader.stats??ioStats,scheduler:{...control.timeline.scheduler},...(host?{privateRuntime:host.facts()}:{} )});
const overlay=new SubtitleOverlay();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=request=>{if(!subtitleWorkerCurrent(control,request))throw Error('Subtitle service closed');if(control.failed&&fatal)throw fatal;};
let deadlineTimer=null;
const learnProfile=async request=>{
 if(subtitleMayLearnProfile(control)&&(await invoke(request,'subtitle_service_ass_scan_needed')))
  (await invoke(request,'subtitle_service_ass_scan_complete'));
};
const change=(request,event)=>{control=changeSubtitleTimeline(control,request,event);};
const cancelDeadline=()=>{const timer=deadlineTimer;deadlineTimer=null;control=cancelSubtitleDeadline(control);if(timer?.handle!==undefined)clearTimeout(timer.handle);};
const timing=async(request,seconds)=>{
 const status=(await invoke(request,'subtitle_service_next_raw_boundary',seconds,timingPointer,timingPointer+8));
 check(request);const view=new DataView(engine.HEAPU8.buffer,timingPointer,12);
 return subtitleRawTiming(status,view.getFloat64(0,true),view.getUint32(8,true));
};
const visual=async(request,seconds)=>{
 const status=(await invoke(request,'subtitle_service_visual_schedule',seconds,timingPointer,timingPointer+8));
 check(request);const view=new DataView(engine.HEAPU8.buffer,timingPointer,12);
 return subtitleVisualTiming(status,view.getFloat64(0,true),view.getUint32(8,true),seconds);
};
const armDeadline=async(request,seconds,rate,running)=>{
 cancelDeadline();
 const snapshot=await visual(request,seconds+.0005);check(request);
 const now=performance.now();check(request);
 const decision=armSubtitleDeadline(control,request,snapshot,seconds,rate,running,now);control=decision.state;
 if(!decision.deadline)return decision.schedule;
 const deadline=decision.deadline;
 const arm=()=>{
  if(!subtitleDeadlineCurrent(control,deadline))return;
  const now=performance.now();if(!subtitleDeadlineCurrent(control,deadline))return;
  const record={handle:undefined};deadlineTimer=record;
  const acquired=setTimeout(()=>{
   if(deadlineTimer!==record)return;deadlineTimer=null;
   const now=performance.now(),settled=settleSubtitleDeadline(control,deadline,now);control=settled.state;
   if(settled.remaining!==undefined){arm();return;}
   if(settled.accepted)postMessage({type:'subtitleDeadline',epoch:deadline.epoch,target:deadline.target});
  },Math.max(1,deadline.due-now));record.handle=acquired;
  if(deadlineTimer!==record||!subtitleDeadlineCurrent(control,deadline))clearTimeout(acquired);
 };
 arm();check(request);return decision.schedule;
};
const seekDisplay=async(request,seconds)=>{
 const recovery=(await invoke(request,'subtitle_service_bitmap_recovery_point',seconds));
 const start=subtitleSeekStart(seconds,recovery);
 if((await invoke(request,'subtitle_service_seek',start))<0)throw Error('Subtitle seek failed');
 check(request);change(request,{type:'seeked',start});
 await delay(30);check(request);
 if(start===seconds)return;
 (await invoke(request,'subtitle_service_block',0));
 try{
  let ready=0;
  for(let i=0;i<400&&!ready;i++){
   check(request);ready=(await invoke(request,'subtitle_service_update',seconds));check(request);change(request,{type:'count',counter:'nativeUpdateCalls'});
   if(ready<0){ready=0;await delay(5);continue;}if(!ready)await delay(5);
  }
  if(!ready)throw Error('Subtitle packet deadline exceeded');
 }finally{await rawInvoke('subtitle_service_block',1);}
};
let chain=Promise.resolve();
function clearRefresh(record){const timer=record?.timer;if(timer?.handle!==undefined){const handle=timer.handle;timer.handle=undefined;clearTimeout(handle);}}
function completeRefresh(id,error,update,success=false){
 const decision=settleSubtitleRefresh(control,id);control=decision.state;if(!decision.request)return;
 const record=refreshes.get(id);refreshes.delete(id);if(!record)return;
 try{clearRefresh(record);}catch(cleanup){if(success){record.reject(cleanup);return;}}if(success&&!subtitleWorkerAlive(control,decision.request.epoch)){record.reject(Error('Subtitle service closed'));return;}success?record.resolve(update):record.reject(error);
}
function refreshAuthorization(epoch,resource){
 const now=performance.now(),decision=admitSubtitleRefresh(control,epoch,now);control=decision.state;if(!decision.request)return Promise.reject(Error(decision.error==='capacity'?'Subtitle authorization capacity exceeded':'Subtitle service closed'));
 const request=decision.request;return new Promise((resolve,reject)=>{
  const record={resolve,reject,timer:null};refreshes.set(request.id,record);
  const arm=()=>{
   if(!subtitleRefreshCurrent(control,request))return;const now=performance.now();if(!subtitleRefreshCurrent(control,request))return;
   const registration={handle:undefined};record.timer=registration;
   const acquired=setTimeout(()=>{
    if(record.timer!==registration)return;record.timer=null;if(!subtitleRefreshCurrent(control,request))return;
    try{const now=performance.now(),settlement=settleSubtitleRefresh(control,request.id,now);control=settlement.state;if(settlement.remaining!==undefined){arm();return;}if(settlement.request){refreshes.delete(request.id);reject(Error('Authorization refresh timed out'));}}
    catch(error){completeRefresh(request.id,error);}
   },Math.max(1,request.deadline-now));registration.handle=acquired;
   if(record.timer!==registration||!subtitleRefreshCurrent(control,request)){const handle=registration.handle;registration.handle=undefined;clearTimeout(handle);}
  };
  try{arm();if(subtitleRefreshCurrent(control,request))postMessage({type:'refresh',id:request.id,resource});}catch(error){completeRefresh(request.id,error);}
 });
}
function closeWorker(){
 const decision=closeSubtitleWorker(control);control=decision.state;if(!decision.accepted)return;
 let failed=false,failure;const attempt=work=>{try{work();}catch(error){if(!failed){failed=true;failure=error;}}};
 attempt(cancelDeadline);attempt(()=>loading.abort());attempt(()=>host?.source.cancelSource());attempt(releaseSource);attempt(()=>engine?._web_io_cancel?.());attempt(()=>io?.postMessage({type:'close'}));const opening=ioOpening;ioOpening=null;if(opening){attempt(()=>clearTimeout(opening.timer?.handle));opening.reject(Error('Subtitle service closed'));}
 const pending=[...refreshes.values()];refreshes.clear();for(const record of pending){attempt(()=>clearRefresh(record));record.reject(Error('Subtitle service closed'));}
 void chain.catch(()=>{}).then(async()=>{
  let cleanup;const release=async work=>{try{return await work();}catch(error){if(!failed){failed=true;failure=error;}}};
  if(!host)await release(()=>delay(50));
  await release(releaseSource);
  await release(()=>io?.terminate());
  if(textPointer){const pointer=textPointer;textPointer=0;await release(()=>rawInvoke('free',pointer));}
  if(timingPointer){const pointer=timingPointer;timingPointer=0;await release(()=>rawInvoke('free',pointer));}
  if(engine)await release(()=>rawInvoke('subtitle_service_close'));
  for(const path of attachmentFiles)await release(()=>{engine.FS.unlink(path);attachmentFiles.delete(path);});
  if(host)await release(async()=>{cleanup={live:await host.call('demuxe_source_live'),...host.facts()};});
  else await release(async()=>{const deadline=performance.now()+2000;while(engine?.PThread?.runningWorkers.length&&performance.now()<deadline)await delay(10);});
  await release(()=>host?.dispose());await release(()=>engine?.PThread?.terminateAllThreads());if(!host)await release(()=>delay(50));
  control=closedSubtitleWorker(control);await release(()=>postMessage({type:'closed',cleanup,error:failed?String(failure):undefined}));self.close();
 });
}
onmessage=({data:d})=>{
 if(!d||typeof d!=='object')return;const type=d.type;
 // Replies bypass queued work, since the active native read may be awaiting one.
 if(type==='refreshed'){if(refreshes.has(d.id))completeRefresh(d.id,d.error?Error('Authorization refresh failed'):null,d.update,!d.error);else if(control.phase==='active')io?.postMessage(d);return;}
 if(type==='close'){closeWorker();return;}
 const clientId=d.id??null,admission=admitSubtitleWorker(control,type,clientId);control=admission.state;if(!admission.request){if(admission.error&&control.phase==='active')postMessage({id:clientId,error:admission.error==='capacity'?'Subtitle request capacity exceeded':'Invalid subtitle request'});return;}const request=admission.request;
 chain=chain.then(async()=>{
  const started=startSubtitleWorker(control,request);control=started.state;if(!started.accepted)return;
  let outgoingBitmap;
  try {
   check(request);if(started.error)throw Error('Subtitle host already initialized');let result={};
   if(type==='init'){
    if(d.runtime&&d.runtime!=='pthread'){const privateModule=await import('./private-mpv.js');check(request);privateMpvSource=privateModule.privateMpvSource;host=await privateModule.privateMpv(d.runtime,'subtitles',{signal:loading.signal}).catch(error=>{throw Error('Private mpv initialization: '+error);});engine=host.module;}
    else {const {default:create}=await import('./engine-subtitles/service.mjs');check(request);engine=await create({print:()=>{},printErr:()=>{}});}
    check(request);
    engine.FS.mkdir('/fonts');
    for(const [i,font] of d.fonts.entries()){check(request);engine.FS.writeFile('/fonts/'+i+'.ttf',new Uint8Array(font.bytes));}check(request);
    if((await invoke(request,'subtitle_service_create'))<0)throw Error('Subtitle service initialization failed');
    textPointer=await allocate(request,4096);check(request);if(!textPointer)throw Error('Subtitle text inspection buffer unavailable');
    timingPointer=await allocate(request,16);check(request);if(!timingPointer)throw Error('Subtitle timing buffer unavailable');
    if(host){
     const refresh=d.canRefresh?resource=>refreshAuthorization(request.epoch,resource):undefined;
     source=privateMpvSource(d,refresh);check(request);await source.open(host);check(request);
    }else {
    io=runtimeWorker(new URL('./io-worker.js',import.meta.url),{type:'module'});check(request);
    const captured=io,info=await new Promise((resolve,reject)=>{
     const now=performance.now();check(request);control=beginSubtitleOpenWait(control,request,now);
     const record={resolve,reject,timer:null};ioOpening=record;
     const settle=(error,value)=>{const decision=settleSubtitleOpenWait(control,request.id);control=decision.state;if(!decision.accepted||ioOpening!==record)return;ioOpening=null;try{clearTimeout(record.timer?.handle);}catch(cleanup){if(!error)error=cleanup;}error?reject(error):resolve(value);};
     const arm=()=>{
      if(ioOpening!==record||!subtitleWorkerCurrent(control,request))return;const delay=Math.max(1,control.openWait.deadline-performance.now());if(ioOpening!==record||!subtitleWorkerCurrent(control,request))return;
      const timer={handle:undefined};record.timer=timer;const acquired=setTimeout(()=>{
       if(record.timer!==timer||ioOpening!==record)return;record.timer=null;
       try{const now=performance.now(),decision=settleSubtitleOpenWait(control,request.id,now);control=decision.state;if(decision.remaining!==undefined){arm();return;}if(decision.accepted){ioOpening=null;reject(Error('Subtitle source open timed out'));}}catch(error){settle(error);}
      },delay);timer.handle=acquired;if(ioOpening!==record||record.timer!==timer)clearTimeout(acquired);
     };
     try{captured.onmessage=({data:m})=>{
      if(!subtitleWorkerAlive(control,request.epoch)||io!==captured)return;
      if(m.type==='ready')settle(null,m.info);
      if(m.type==='stats')ioStats=m.stats;
      if(m.type==='refresh')postMessage(m);
      if(m.type==='error'){fatal=Error(m.message);control=failSubtitleWorkerLifetime(control,request.epoch);settle(fatal);}
     };check(request);
     captured.onerror=e=>{if(!subtitleWorkerAlive(control,request.epoch)||io!==captured)return;fatal=Error(e.message);control=failSubtitleWorkerLifetime(control,request.epoch);settle(fatal);};check(request);
     arm();check(request);captured.postMessage({type:'init',memory:engine.HEAPU8.buffer,pointer:engine._web_io_ptr(),file:d.file,options:d.options,canRefresh:d.canRefresh,subtitleCacheBytes:4*1024*1024});}catch(error){settle(error);}
    });
    check(request);engine._web_io_configure(1,BigInt(info.size));
    }
    if((await invoke(request,'subtitle_service_open'))<0)throw Error('Subtitle source open failed');
    let loaded=0;
    for(let i=0;i<2000&&!loaded;i++){check(request);loaded=(await invoke(request,'subtitle_service_loaded'));if(loaded<0)throw Error('Subtitle source load failed');if(!loaded)await delay(10);}
    if(!loaded)throw Error('Subtitle metadata deadline exceeded');
    const tracks=[];
    for(let i=0;i<(await invoke(request,'subtitle_service_track_count'));i++){
     const id=(await invoke(request,'subtitle_service_track_id',i)),index=(await invoke(request,'subtitle_service_track_index',i));
     if(id>0)tracks.push({id:String(index+1),mpvId:id,'ff-index':index,type:'sub'});
    }
    (await invoke(request,'subtitle_service_block',1));result={tracks};
   }else if(type==='add'){
    if(!engine._subtitle_service_external_api||await invoke(request,'subtitle_service_external_api')!==1)throw Error('Subtitle attachment interface mismatch; install matching mpv service assets');
    check(request);const asset=d.asset,format=asset?.format,buffer=asset?.bytes,bytes=buffer?.byteLength,isBuffer=buffer instanceof ArrayBuffer;check(request);
    const admission=admitSubtitleAttachment(control,request,format,bytes,isBuffer);control=admission.state;
    if(admission.error)throw new AttachmentRejected(admission.error==='invalid'?'Invalid external subtitle attachment':'Subtitle budget exceeded');
    const path=admission.path;
    let committed=false,nativeUncertain=false,failure;
    try{
     if(!attachmentsDirectory){engine.FS.mkdir('/subtitles');attachmentsDirectory=true;}
     check(request);attachmentFiles.add(path);engine.FS.writeFile(path,new Uint8Array(buffer));check(request);
     const encoded=new TextEncoder().encode(path+'\0'),pointer=await allocate(request,encoded.length);
     if(!pointer)throw Error('Subtitle attachment allocation failed');
     let id,invokeFailure;
     try{check(request);engine.HEAPU8.set(encoded,pointer);check(request);nativeUncertain=true;id=await invoke(request,'subtitle_service_add',pointer);if(Number.isSafeInteger(id)&&id<=0)nativeUncertain=false;}
     catch(error){invokeFailure={error};throw error;}
     finally{try{await rawInvoke('free',pointer);}catch(error){nativeUncertain=true;if(!invokeFailure)throw error;}}

     check(request);if(!Number.isSafeInteger(id)||id<=0||subtitleAttachment(control,id))throw new AttachmentRejected('Invalid external subtitle: mpv could not load attachment');
     control=commitSubtitleAttachment(control,request,id);committed=true;nativeUncertain=false;result={mpvId:id};
    }catch(error){failure={error};if(nativeUncertain){fatal=error;control=failSubtitleWorker(control,request);}throw error;
    }finally{
     if(!committed&&attachmentFiles.has(path))try{engine.FS.unlink(path);attachmentFiles.delete(path);}catch(error){fatal=failure?failure.error:error;control=failSubtitleWorker(control,request);if(!failure)throw error;}
    }
   }else if(type==='remove'){
    const trackId=d.trackId;check(request);const attachment=subtitleAttachment(control,trackId);if(!attachment)throw Error('Unknown external subtitle');
    let removed;
    try{removed=await invoke(request,'subtitle_service_remove',trackId);}catch(error){fatal=error;control=failSubtitleWorker(control,request);throw error;}
    if(removed<0)throw Error('Subtitle attachment removal failed');
    try{check(request);engine.FS.unlink(attachment.path);attachmentFiles.delete(attachment.path);check(request);control=removeSubtitleAttachment(control,request,trackId);}
    catch(error){fatal=error;control=failSubtitleWorker(control,request);throw error;}
   }else if(type==='select'){
    cancelDeadline();change(request,{type:'select-begin'});
    if((await invoke(request,'subtitle_service_select',d.trackId))<0)throw Error('Subtitle selection failed');check(request);change(request,{type:'selected',trackId:d.trackId});overlay.clear();await delay(0);
   }else if(type==='seek'){
    cancelDeadline();change(request,{type:'reset'});
    await seekDisplay(request,d.seconds);check(request);overlay.clear();check(request);change(request,{type:'time',seconds:d.seconds});
   }else if(type==='timing'){
    if(!Number.isFinite(d.seconds))throw Error('Invalid subtitle timing position');
    const status=(await invoke(request,'subtitle_service_next_raw_boundary',d.seconds,timingPointer,timingPointer+8));
    check(request);const view=new DataView(engine.HEAPU8.buffer,timingPointer,12);
    result={...subtitleRawTiming(status,view.getFloat64(0,true),view.getUint32(8,true)),visual:await visual(request,d.seconds),avChains:(await invoke(request,'subtitle_service_av_chains'))};
   }else if(type==='profile'){
    // Scheduling is advisory. Never seek/read the whole track to classify it
    // on the critical startup path; normal render/pump calls learn its state.
    await learnProfile(request);
    result={mode:control.timeline.selected?(await visual(request,control.timeline.lastTime)).mode:'fallback',avChains:(await invoke(request,'subtitle_service_av_chains'))};
   }else if(type==='cancelDeadline'){
    cancelDeadline();result={epoch:control.timeline.deadlineEpoch};
   }else if(type==='pump'){
    if(!Number.isFinite(d.seconds))throw Error('Invalid subtitle clock position');
    if(!control.timeline.selected){cancelDeadline();result={mode:'fallback'};}
    else{
     const recoveredClock=subtitleRecoverClock(control,d.seconds);
     if(recoveredClock){
      cancelDeadline();change(request,{type:'reset'});
      await seekDisplay(request,d.seconds);check(request);overlay.clear();check(request);
     }
     change(request,{type:'time',seconds:d.seconds});(await invoke(request,'subtitle_service_block',0));let ready=0;
     for(let i=0;i<400&&!ready;i++){
      check(request);ready=(await invoke(request,'subtitle_service_update',d.seconds));check(request);change(request,{type:'count',counter:'nativeUpdateCalls'});
      if(ready<0){ready=0;await delay(5);continue;}if(!ready)await delay(5);
     }
     (await invoke(request,'subtitle_service_block',1));if(!ready)throw Error('Subtitle packet deadline exceeded');
     check(request);change(request,{type:'count',counter:'stateUpdates'});
     if((await invoke(request,'subtitle_service_av_chains'))!==0)throw Error('Subtitle service unexpectedly allocated A/V decoding');
     await learnProfile(request);
     const schedule=await armDeadline(request,d.seconds,d.rate,d.running);check(request);
     const completed=completeSubtitlePump(control,request,d.seconds,schedule.timingEpoch,recoveredClock);control=completed.state;
     const timingChanged=completed.timingChanged;
     result={mode:schedule.mode,timingChanged,schedule,service:service()};
    }
   }else if(type==='render'){
    if(!Number.isFinite(d.seconds)||d.width<1||d.height<1||d.width>1920||d.height>1080)throw Error('Invalid subtitle render bounds');
    if(!control.timeline.selected){if((await invoke(request,'subtitle_service_av_chains'))!==0)throw Error('Subtitle service unexpectedly allocated A/V decoding');send(request,{id:request.clientId,size:0,text:'',service:service()});return;}
    if(subtitleRecoverClock(control,d.seconds)){
     await seekDisplay(request,d.seconds);check(request);overlay.clear();check(request);
    }
    change(request,{type:'time',seconds:d.seconds});(await invoke(request,'subtitle_service_block',0));let ready=0;
    for(let i=0;i<400&&!ready;i++){
     // Packet acquisition can take many turns. Do not run libass and rebuild
     // the bitmap on every poll while the subtitle decoder is still waiting.
     check(request);ready=(await invoke(request,'subtitle_service_update',d.seconds));check(request);change(request,{type:'count',counter:'nativeUpdateCalls'});
     if(ready>0)ready=(await invoke(request,'subtitle_service_render',d.seconds,d.width,d.height));
     if(ready<0){ready=0;await delay(5);continue;}if(!ready)await delay(5);
    }
    (await invoke(request,'subtitle_service_block',1));if(!ready)throw Error('Subtitle packet deadline exceeded');
    check(request);change(request,{type:'count',counter:'fullRenders'});
    if((await invoke(request,'subtitle_service_av_chains'))!==0)throw Error('Subtitle service unexpectedly allocated A/V decoding');
    check(request);const previous=overlay.serial,snapshot=overlay.read(engine);check(request);
    let bitmap;
    if(d.force||previous!==overlay.serial){const canvas=new OffscreenCanvas(d.width,d.height);check(request);overlay.draw(canvas.getContext('2d'),snapshot);check(request);bitmap=canvas.transferToImageBitmap();outgoingBitmap=bitmap;check(request);}
    const textLength=(await invoke(request,'subtitle_service_text',textPointer,4096));
    check(request);let text='';
    try{if(textLength>0)text=new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(engine.HEAPU8.subarray(textPointer,textPointer+textLength)));}
    catch{throw Error('Subtitle decode failed');}
    await learnProfile(request);
    const schedule=await armDeadline(request,d.seconds,d.rate,d.running);
    // Use the exact rendered time, without the timer query's look-ahead.
    const renderedTiming=await visual(request,d.seconds);check(request);
    change(request,{type:'rendered',next:renderedTiming.next,epoch:renderedTiming.epoch});
    send(request,{id:request.clientId,bitmap,unchanged:!bitmap,hasOverlay:!!snapshot.surface,size:bitmap?engine.HEAP32[(engine._web_subtitle_ptr()>>>2)+2]:0,text,mode:schedule.mode,schedule,service:service()},bitmap?[bitmap]:[]);outgoingBitmap=null;return;
   }
   send(request,{id:request.clientId,...result});
  }catch(error){try{if(subtitleWorkerCurrent(control,request)){const failures=host?.source.drainFailures()??[];if(failures.length)error=Error('Source transport: '+failures.map(f=>String(f.cause??f.kind)).join('; '));if(host&&!(error instanceof AttachmentRejected)){fatal=error;control=failSubtitleWorker(control,request);}if(subtitleWorkerCurrent(control,request))postMessage({id:request.clientId,error:String(error)});}}catch{}}
  finally{if(outgoingBitmap)try{outgoingBitmap.close();}catch{}control=finishSubtitleWorker(control,request);}
 });
};
