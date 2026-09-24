// SPDX-License-Identifier: Apache-2.0
import create from './engine-subtitles/service.mjs';
import {SubtitleOverlay} from './subtitle-overlay.js';
let engine, io, closed=false, ioStats, fatal, lastTime=0,textPointer,timingPointer,selectedTrack=false,sourceBytes=Infinity;
const overlay=new SubtitleOverlay();
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=()=>{if(closed)throw Error('Subtitle service closed');if(fatal)throw fatal;};
let deadlineTimer=0,deadlineEpoch=0,lastTimingEpoch=-1;
const scheduler={stateUpdates:0,nativeUpdateCalls:0,fullRenders:0,deadlineWakes:0};
const cancelDeadline=()=>{clearTimeout(deadlineTimer);deadlineTimer=0;deadlineEpoch++;};
const timing=seconds=>{
 const status=engine._subtitle_service_next_raw_boundary(seconds,timingPointer,timingPointer+8);
 const view=new DataView(engine.HEAPU8.buffer,timingPointer,12);
 return {supported:status>=0,unstable:status===-2,next:status===1?view.getFloat64(0,true):null,epoch:view.getUint32(8,true)};
};
const armDeadline=(seconds,rate,running,qualified)=>{
 cancelDeadline();
 if(!running||!qualified||!(rate>0))return {epoch:deadlineEpoch,next:null};
 const snapshot=timing(seconds+.0005);
 if(!snapshot.supported||snapshot.unstable||snapshot.next===null||snapshot.next<=seconds+.0005)return {epoch:deadlineEpoch,next:null};
 const epoch=deadlineEpoch,target=snapshot.next;
 const ms=Math.max(1,Math.ceil((target-seconds)*1000/rate)+2);
 deadlineTimer=setTimeout(()=>{
  if(closed||epoch!==deadlineEpoch)return;
  deadlineTimer=0;scheduler.deadlineWakes++;
  postMessage({type:'subtitleDeadline',epoch,target});
 },ms);
 return {epoch,next:target};
};
let chain=Promise.resolve();
onmessage=({data:d})=>{
 // Closing must wake a blocked demux read without waiting behind a render RPC.
 if(d.type==='close'){
  closed=true;cancelDeadline();engine?._web_io_cancel();io?.postMessage({type:'close'});
  void chain.finally(async()=>{
   await delay(50);io?.terminate();if(textPointer)engine?._free(textPointer);if(timingPointer)engine?._free(timingPointer);engine?._subtitle_service_close();
   const deadline=performance.now()+2000;
   while(engine?.PThread.runningWorkers.length&&performance.now()<deadline)await delay(10);
   engine?.PThread.terminateAllThreads();await delay(50);postMessage({type:'closed'});self.close();
  });return;
 }
 chain=chain.then(async()=>{
  try {
   check();let result={};
   if(d.type==='init'){
    engine=await create({print:()=>{},printErr:()=>{}});check();
    engine.FS.mkdir('/fonts');
    for(const [i,font] of d.fonts.entries())engine.FS.writeFile('/fonts/'+i+'.ttf',new Uint8Array(font.bytes));
    if(engine._subtitle_service_create()<0)throw Error('Subtitle service initialization failed');
    textPointer=engine._malloc(4096);if(!textPointer)throw Error('Subtitle text inspection buffer unavailable');
    timingPointer=engine._malloc(16);if(!timingPointer)throw Error('Subtitle timing buffer unavailable');
    io=new Worker(new URL('./io-worker.js',import.meta.url),{type:'module'});
    const info=await new Promise((resolve,reject)=>{
     const timeout=setTimeout(()=>reject(Error('Subtitle source open timed out')),20000);
     io.onmessage=({data:m})=>{
      if(m.type==='ready'){clearTimeout(timeout);resolve(m.info);}
      if(m.type==='stats')ioStats=m.stats;
      if(m.type==='error'){clearTimeout(timeout);fatal=Error(m.message);reject(fatal);}
     };
     io.onerror=e=>{clearTimeout(timeout);fatal=Error(e.message);reject(fatal);};
     io.postMessage({type:'init',memory:engine.HEAPU8.buffer,pointer:engine._web_io_ptr(),file:d.file,subtitleCacheBytes:4*1024*1024,subtitleMaxRequests:8192});
    });
    check();sourceBytes=Number(info.size);engine._web_io_configure(1,BigInt(info.size));
    if(engine._subtitle_service_open()<0)throw Error('Subtitle source open failed');
    let loaded=0;
    for(let i=0;i<2000&&!loaded;i++){check();loaded=engine._subtitle_service_loaded();if(loaded<0)throw Error('Subtitle source load failed');if(!loaded)await delay(10);}
    if(!loaded)throw Error('Subtitle metadata deadline exceeded');
    const tracks=[];
    for(let i=0;i<engine._subtitle_service_track_count();i++){
     const id=engine._subtitle_service_track_id(i),index=engine._subtitle_service_track_index(i);
     if(id>0)tracks.push({id:String(index+1),mpvId:id,'ff-index':index,type:'sub'});
    }
    engine._subtitle_service_block(1);result={tracks};
   }else if(d.type==='select'){
    cancelDeadline();lastTimingEpoch=-1;
    if(engine._subtitle_service_select(d.trackId)<0)throw Error('Subtitle selection failed');selectedTrack=d.trackId>0;overlay.clear();lastTime=0;await delay(0);
   }else if(d.type==='seek'){
    cancelDeadline();lastTimingEpoch=-1;
    if(engine._subtitle_service_seek(d.seconds)<0)throw Error('Subtitle seek failed');overlay.clear();lastTime=d.seconds;await delay(30);
   }else if(d.type==='timing'){
    if(!Number.isFinite(d.seconds))throw Error('Invalid subtitle timing position');
    const status=engine._subtitle_service_next_raw_boundary(d.seconds,timingPointer,timingPointer+8);
    const view=new DataView(engine.HEAPU8.buffer,timingPointer,12);
    result={supported:status>=0,unstable:status===-2,next:status===1?view.getFloat64(0,true):null,epoch:view.getUint32(8,true),avChains:engine._subtitle_service_av_chains()};
   }else if(d.type==='profile'){
    if(selectedTrack&&sourceBytes<=8*1024*1024&&engine._subtitle_service_ass_scan_needed()){
     const restore=lastTime;let moved=false,restoreFailed=false;
     engine._subtitle_service_block(0);
     try{
      if(engine._subtitle_service_seek(0)>=0){
       moved=true;await delay(30);let ready=0;
       for(let i=0;i<400&&!ready;i++){
        check();ready=engine._subtitle_service_update(1e9);scheduler.nativeUpdateCalls++;
        if(ready<0){ready=0;break;}if(!ready)await delay(5);
       }
       if(ready)engine._subtitle_service_ass_scan_complete();
      }
     }finally{
      try{if(moved){restoreFailed=engine._subtitle_service_seek(restore)<0;await delay(30);}}
      finally{engine._subtitle_service_block(1);}
     }
     if(restoreFailed)throw Error('Subtitle scan restore failed');
    }
    result={qualified:!!selectedTrack&&!!engine._subtitle_service_static_profile(),avChains:engine._subtitle_service_av_chains()};
   }else if(d.type==='cancelDeadline'){
    cancelDeadline();result={epoch:deadlineEpoch};
   }else if(d.type==='pump'){
    if(!Number.isFinite(d.seconds))throw Error('Invalid subtitle clock position');
    if(!selectedTrack){cancelDeadline();result={qualified:false};}
    else{
     if(!Number.isFinite(lastTime)||d.seconds<lastTime-.05||d.seconds>lastTime+1){
      cancelDeadline();lastTimingEpoch=-1;
      if(engine._subtitle_service_seek(d.seconds)<0)throw Error('Subtitle seek failed');
      overlay.clear();await delay(30);
     }
     lastTime=d.seconds;engine._subtitle_service_block(0);let ready=0;
     for(let i=0;i<400&&!ready;i++){
      check();ready=engine._subtitle_service_update(d.seconds);scheduler.nativeUpdateCalls++;
      if(ready<0){ready=0;await delay(5);continue;}if(!ready)await delay(5);
     }
     engine._subtitle_service_block(1);if(!ready)throw Error('Subtitle packet deadline exceeded');
     scheduler.stateUpdates++;
     if(engine._subtitle_service_av_chains()!==0)throw Error('Subtitle service unexpectedly allocated A/V decoding');
     const qualified=!!engine._subtitle_service_static_profile();
     const snapshot=qualified?timing(d.seconds):null;
     const timingChanged=!!snapshot&&lastTimingEpoch>=0&&snapshot.epoch!==lastTimingEpoch;
     if(snapshot)lastTimingEpoch=snapshot.epoch;
     const schedule=armDeadline(d.seconds,d.rate,d.running,qualified);
     result={qualified,timingChanged,schedule,service:{avChains:0,heapBytes:engine.HEAPU8.byteLength,io:ioStats,scheduler:{...scheduler}}};
    }
   }else if(d.type==='render'){
    if(!Number.isFinite(d.seconds)||d.width<1||d.height<1||d.width>1920||d.height>1080)throw Error('Invalid subtitle render bounds');
    if(!selectedTrack){if(engine._subtitle_service_av_chains()!==0)throw Error('Subtitle service unexpectedly allocated A/V decoding');postMessage({id:d.id,size:0,text:'',service:{avChains:0,heapBytes:engine.HEAPU8.byteLength,io:ioStats}});return;}
    if(!Number.isFinite(lastTime)||d.seconds<lastTime-.05||d.seconds>lastTime+1){
     if(engine._subtitle_service_seek(d.seconds)<0)throw Error('Subtitle seek failed');overlay.clear();await delay(30);
    }
    lastTime=d.seconds;engine._subtitle_service_block(0);let ready=0;
    for(let i=0;i<400&&!ready;i++){
     check();ready=engine._subtitle_service_render(d.seconds,d.width,d.height);
     if(ready<0){ready=0;await delay(5);continue;}if(!ready)await delay(5);
    }
    engine._subtitle_service_block(1);if(!ready)throw Error('Subtitle packet deadline exceeded');
    scheduler.fullRenders++;
    if(engine._subtitle_service_av_chains()!==0)throw Error('Subtitle service unexpectedly allocated A/V decoding');
    const previous=overlay.serial,snapshot=overlay.read(engine);
    let bitmap;
    if(d.force||previous!==overlay.serial){const canvas=new OffscreenCanvas(d.width,d.height);overlay.draw(canvas.getContext('2d'),snapshot);bitmap=canvas.transferToImageBitmap();}
    const textLength=engine._subtitle_service_text(textPointer,4096);
    let text='';
    try{if(textLength>0)text=new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(engine.HEAPU8.subarray(textPointer,textPointer+textLength)));}
    catch{throw Error('Subtitle decode failed');}
    const qualified=!!d.static&&!!engine._subtitle_service_static_profile();
    const schedule=armDeadline(d.seconds,d.rate,d.running,qualified);
    postMessage({id:d.id,bitmap,unchanged:!bitmap,hasOverlay:!!snapshot.surface,size:bitmap?engine.HEAP32[(engine._web_subtitle_ptr()>>>2)+2]:0,text,qualified,schedule,service:{avChains:0,heapBytes:engine.HEAPU8.byteLength,io:ioStats,scheduler:{...scheduler}}},bitmap?[bitmap]:[]);return;
   }
   postMessage({id:d.id,...result});
  }catch(error){postMessage({id:d.id,error:String(error)});}
 });
};
