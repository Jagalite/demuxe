import {StreamingController} from './streaming-controller.js';
const qualityControl=new StreamingController({status:()=>JSON.parse(engine.ccall('web_quality_status','string',[],[])),request:(source,request,representation)=>engine.ccall('web_quality_request','number',['number','number','number'],[source,request,representation])});
let audioChannels=2;
import {drawRetainedVideo} from './retained-video.js';
let videoTrack;
let minFramePts=-Infinity;
import {SubtitleOverlay} from './subtitle-overlay.js';
const subtitles=new SubtitleOverlay();let frameGeneration=-1,minGeneration=-1;
const skipCanvas=true;const quality=new URL(self.location.href).searchParams.get('quality')==='1';const mode=new URL(self.location.href).searchParams.get('mode');
let canvasSubmissions=0;
let selectedSerial=0,heldFrame,heldQuality,closingFrames=false,awaitingResetFrame=false,presentationFloor=-1;
const frames=new Map(),pendingFrames=new Map(),presentationTimers=new Set();
const presentation={position:null,received:0,closed:0,drawn:0,redraws:0,peakRetained:0,peakPending:0,missing:0,lateMs:[],pts:[],pixelChecks:[]};
function closeOwned(frame){frame.close();presentation.closed++;}
function cleanupFrames(){presentation.position=null;closingFrames=true;for(const timer of presentationTimers)clearTimeout(timer);presentationTimers.clear();for(const frame of frames.values())closeOwned(frame);frames.clear();if(heldFrame)closeOwned(heldFrame);heldFrame=null;heldQuality=null;pendingFrames.clear();}
function resetPresentation(generation){
 cleanupFrames();closingFrames=false;minFramePts=-Infinity;
 frameGeneration=minGeneration=presentationFloor=generation;awaitingResetFrame=true;subtitles.clear();
}
function receiveFrame(message){
 presentation.received++;
 if(message.pts<minFramePts&&!pendingFrames.has(Math.round(message.pts))){closeOwned(message.retainedFrame);return;}
 if(message.generation<minGeneration){closeOwned(message.retainedFrame);return;}
 // A decoder configuration boundary does not retire mpv's selected output.
 // Already transferred old-generation frames may still have presentation timers.
 // Source replacement and seeks explicitly clear those frames before advancing
 // minGeneration; ordinary reconfiguration preserves them and active subtitles.
 if(message.generation!==frameGeneration){frameGeneration=message.generation;minGeneration=frameGeneration;}
 if(pendingTarget!==null&&message.pts/1e6<pendingTarget-.15){closeOwned(message.retainedFrame);return;}
 if(closingFrames){closeOwned(message.retainedFrame);return;}
 const key=Math.round(message.pts);
 if(frames.has(key)){closeOwned(message.retainedFrame);throw Error('Duplicate retained frame timestamp');}
 if(frames.size+(heldFrame?1:0)>=16){tick();if(key<minFramePts&&!pendingFrames.has(key)){closeOwned(message.retainedFrame);return;}if(frames.size+(heldFrame?1:0)>=16){closeOwned(message.retainedFrame);throw Error('Retained frame bound exceeded');}}
 frames.set(key,message.retainedFrame);presentation.peakRetained=Math.max(presentation.peakRetained,frames.size+(heldFrame?1:0));
 if(frames.size>16)throw Error('Retained frame bound exceeded');
 presentReady(key);
 if(awaitingResetFrame)presentSelected();
}
function acknowledgeQuality(tag){
 if(!tag)return;
 engine.ccall('web_quality_presented',null,['number','number','number'],[tag.source||ioSession,tag.source?tag.request:-1,tag.representation]);
}
function presentReady(key){
 const request=pendingFrames.get(key);if(!request||request.scheduled||!frames.has(key))return;
 request.scheduled=true;
 const draw=()=>{
  if(closingFrames)return;
  const frame=frames.get(key);if(!frame)throw Error('Scheduled retained frame missing');
  frames.delete(key);pendingFrames.delete(key);
  if(heldFrame)closeOwned(heldFrame);heldFrame=frame;heldQuality=request.quality;
  drawRetainedVideo(context,frame,canvas,videoTrack);
  subtitles.draw(context,request.overlay);
  acknowledgeQuality(request.quality);
  presentation.position=key/1e6;
  presentation.drawn++;canvasSubmissions++;
  if(presentation.lateMs.length<10000)presentation.lateMs.push(performance.now()-request.deadline);
  if(presentation.pts.length<10000)presentation.pts.push(key);
  if(quality&&presentation.pixelChecks.length<2&&presentation.drawn%60===0){
   const pixels=context.getImageData(0,0,64,64).data;
   presentation.pixelChecks.push({pts:key,min:Math.min(...pixels.filter((_,i)=>i%4!==3)),max:Math.max(...pixels.filter((_,i)=>i%4!==3))});
  }
  engine._web_presented();
 };
 const delay=request.deadline-performance.now();
 if(delay<=0)draw();else{const timer=setTimeout(()=>{presentationTimers.delete(timer);draw();},delay);presentationTimers.add(timer);}
}
function presentSelected(){
 const serial=engine._web_selected_serial();if(serial===selectedSerial&&!awaitingResetFrame)return;
 const key=Math.round(engine._web_selected_pts()*1e6);
 const selectedQuality=JSON.parse(engine.ccall('web_quality_selected','string',[],[]));
 if((selectedQuality?.generation??-1)<presentationFloor)return;
 // The decoder reset and the VO selection travel on different threads. Do not
 // mistake the previous VO selection for new output, or skip a paused seek's
 // only new frame because native selection raced ahead of this reset message.
 if(awaitingResetFrame&&!frames.has(key))return;
 awaitingResetFrame=false;selectedSerial=serial;minFramePts=Math.max(minFramePts,key);
 for(const [pts,frame] of frames)if(pts<minFramePts&&!pendingFrames.has(pts)){closeOwned(frame);frames.delete(pts);}
 const overlay=subtitles.read(engine);
 if(engine._web_selected_redraw()&&heldFrame&&Math.round(heldFrame.timestamp)===key){drawRetainedVideo(context,heldFrame,canvas,videoTrack);subtitles.draw(context,overlay);presentation.redraws++;acknowledgeQuality(heldQuality);engine._web_presented();return;}
 if(key<0)return;
 if(pendingFrames.has(key))return;
 pendingFrames.set(key,{overlay,quality:selectedQuality,deadline:performance.now()+engine._web_selected_delay(),scheduled:false});
 presentation.peakPending=Math.max(presentation.peakPending,pendingFrames.size);
 if(pendingFrames.size>8)throw Error('Pending presentation bound exceeded');
 presentReady(key);
 for(const [pts,request] of pendingFrames)if(performance.now()-request.deadline>500){presentation.missing++;throw Error(`Retained frame ${pts} did not arrive`);}
}
let decoderWorker,decoderStats;


let engine, canvas, context, timer, audio, nativeAudio, epoch = -1;
let renderMs=0,copyMs=0,maxRenderMs=0;
let rendered = 0, sourceRendered = 0, ticks = 0, force = true, closing = false, presentedPosition=0, frameImage, measureOutput=false, wasWhite=false;
let ioWorker,ioStats,ioReady,ioClose,ioSession=0,pendingTarget=null,restarted=false,position=0;
let internalId=0x80000000,demuxFormat='',seekPrerollSeconds=0;
const internalCommands=new Map();
function internalCommand(args,done){const id=internalId++;internalCommands.set(id,done);submit(id,args);}
let paused=true, busyUntil=0, pumpFailed=false, nextDiagnostics=0;
function schedulePump(delay=10) {
  clearTimeout(timer);
  if(closing||pumpFailed||!engine)return;
  timer=setTimeout(()=>{
    tick();
    schedulePump(paused&&pendingTarget===null&&pendingFrames.size===0&&performance.now()>=busyUntil?100:10);
  },delay);
}

function releaseSeek(){if(pendingTarget!==null&&restarted&&Math.abs(position-pendingTarget)<0.15){pendingTarget=null;Atomics.store(audio,8,0);force=true;post({type:'seek-complete',position});}}
async function closeIO(){if(!ioWorker)return;const old=ioWorker;engine._web_io_cancel();await new Promise(resolve=>{ioClose=resolve;old.postMessage({type:'close'});setTimeout(resolve,1500);});old.terminate();ioWorker=null;ioClose=null;engine.ccall('web_io_root',null,['number','string','number'],[0,'',0]);}
async function openRemote(data){minFramePts=-Infinity;cleanupFrames();closingFrames=false;minGeneration=presentationFloor=frameGeneration+1;subtitles.clear();
  sourceRendered=0;
  await closeIO();ioStats=undefined;
  const pointer=engine._web_io_ptr();
  ioWorker=new Worker(new URL('./io-worker.js',import.meta.url),{type:'module'});
  const info=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Remote open timed out')),20000);
    ioWorker.onmessage=({data:message})=>{
      if(message.type==='ready'){clearTimeout(timeout);resolve(message.info);}
      else if(message.type==='error'){clearTimeout(timeout);reject(Error(message.message));post({type:'error',id:data.id,message:message.message});}
      else if(message.type==='stats')ioStats=message.stats;
      else if(message.type==='refresh')post({type:'refresh',id:message.id,resource:message.resource});
      else if(message.type==='closed')ioClose?.();
    };
    ioWorker.onerror=event=>{clearTimeout(timeout);reject(Error(event.message));};
    ioWorker.postMessage({type:'init',memory:engine.HEAPU8.buffer,pointer,options:data.options??{},file:data.file,canRefresh:data.canRefresh});
  });
  if(closing)throw Error('Player closed');
  engine._web_io_configure(++ioSession,BigInt(info.size));
  engine.ccall('web_io_root',null,['number','string','number'],[info.resource??0,info.url??'',info.seekable===false?0:1]);
  ioWorker.postMessage({type:'activate',session:ioSession});
  engine.ccall('web_quality_configure',null,['number','number'],[ioSession,data.options.streaming?.integrated?1:0]);
  qualityControl.reset(ioSession,data.options.streaming?.qualityPolicy);
  post({type:'source',info});
  // libass removes expired events after one minute of playback history. Clear
  // decoded cues on seeks so the owning demuxer repopulates the accepted window.
  const integrated=!!data.options.streaming?.integrated;
  internalCommand(['set','sub-ass-prune-delay',integrated?'60':'-1'],()=>
    internalCommand(['set','sub-clear-on-seek',integrated?'yes':'no'],()=>{
  internalCommand(['set','rebase-start-time',data.options.streaming?.integrated||data.options.streaming?.qualityPolicy?'no':'yes'],()=>internalCommand(['set','demuxer-readahead-secs',data.options.streaming?.qualityPolicy?.mode==='auto'?'6':'1'],()=>submit(data.id,['loadfile',`brange://source/${ioSession}`,'replace'])));
    }));
}
const post = message => self.postMessage(message);
let audioRelay;
async function startAudioRelay(buffer){
  audioRelay=new Worker(new URL('./audio-relay-worker.js',import.meta.url),{type:'module'});
  await new Promise((resolve,reject)=>{
    const deadline=setTimeout(()=>reject(Error('Audio relay initialization timed out')),5000);
    audioRelay.onmessage=({data})=>{if(data.type==='ready'){clearTimeout(deadline);resolve();}else if(data.type==='error'){clearTimeout(deadline);reject(Error(data.message));post({type:'error',message:data.message});}};
    audioRelay.onerror=event=>{clearTimeout(deadline);reject(Error(event.message));post({type:'error',message:'Audio relay failed'});};
    audioRelay.postMessage({type:'init',memory:engine.HEAPU8.buffer,pointer:nativeAudio,audio:buffer,channels:audioChannels});
  });
}
async function closeAudioRelay(){
  if(!audioRelay)return;
  const worker=audioRelay;audioRelay=null;
  try{await new Promise((resolve,reject)=>{
    const deadline=setTimeout(()=>reject(Error('Audio relay shutdown timed out')),1000);
    worker.onmessage=({data})=>{if(data.type==='closed'){clearTimeout(deadline);resolve();}};
    worker.postMessage({type:'close'});
  });}finally{worker.terminate();}
}
function pumpAudio(){
  // Command intent only. PCM and AO feedback continue independently of render
  // work, diagnostics serialization, and rendering-worker garbage collection.
  epoch=Atomics.load(audio,3);
  if(pendingTarget!==null)Atomics.store(audio,8,1);
}
function tick() {
  if (closing) return;
  try {
    pumpAudio();
    for (let i = 0; i < 64; i++) {
      const ptr = engine._web_event();
      if (!ptr) break;
      const event = JSON.parse(engine.UTF8ToString(ptr));
      qualityControl.event(event);
      engine._free(ptr);
      if(event.event==='command-reply'&&internalCommands.has(event.id)){
        const done=internalCommands.get(event.id);internalCommands.delete(event.id);
        if(event.error)throw Error(`Playback configuration failed: ${event.error}`);
        done(event.result);continue;
      }
      if(event.event==='property-change'&&event.name==='pause'){paused=!!event.data;busyUntil=performance.now()+300;}
      if(event.event==='property-change'&&event.name==='track-list')videoTrack=event.data?.find(t=>t.type==='video'&&t.selected);
      if(event.event==='file-loaded'){
        // Configure from mpv's detected format before resolving the host's open.
        internalCommand(['expand-text','${file-format}'],format=>{
          demuxFormat=String(format);seekPrerollSeconds=demuxFormat==='mpegts'?30:/^(mkv|matroska(?:,|$))/.test(demuxFormat)?0.5:0;
          internalCommand(['set','hr-seek-demuxer-offset',String(seekPrerollSeconds)],()=>post({type:'event',event}));
        });continue;
      }
      // Let mpv discard obsolete demux packets after this bounded read completes.
      // Interrupting stream_cb read_fn mid-packet returns a truncated packet to FFmpeg.
      // Source replacement/destroy still cancel I/O through closeIO().
      if(event.event==='property-change'&&event.name==='time-pos'){position=event.data;releaseSeek();}
      if(event.event==='playback-restart'){restarted=true;releaseSeek();}
      if(event.event==='log-message')post({type:'log',message:event.prefix+': '+event.text});
      post({type:'event', event});
    }
    const renderStart=performance.now();
    const ptr = engine._web_render(canvas.width, canvas.height, +force);
    const renderDuration=performance.now()-renderStart;
    force = false;
    if (ptr && pendingTarget===null) {
      renderMs+=renderDuration;maxRenderMs=Math.max(maxRenderMs,renderDuration);const copyStart=performance.now();
      if(!skipCanvas){
      if(!frameImage||frameImage.width!==canvas.width||frameImage.height!==canvas.height)frameImage=new ImageData(canvas.width,canvas.height);
      const bytes=frameImage.data;bytes.set(engine.HEAPU8.subarray(ptr,ptr+bytes.length));
      for (let i = 3; i < bytes.length; i += 4) bytes[i] = 255;
      context.putImageData(frameImage, 0, 0);
      if(measureOutput){const at=(8*canvas.width+8)*4;const white=bytes[at]>225&&bytes[at+1]>225&&bytes[at+2]>225;if(white&&!wasWhite)post({type:'output',data:{kind:'flash',wallTime:performance.timeOrigin+performance.now(),position}});wasWhite=white;}
      copyMs+=performance.now()-copyStart;canvasSubmissions++;
      }
      presentSelected();
      rendered++;sourceRendered++;presentedPosition=position;
    }
    ticks++;
    if (performance.now()>=nextDiagnostics || (ptr && sourceRendered <= 5)) {nextDiagnostics=performance.now()+200;post({type:'diagnostics', data:{pumpTicks:ticks,subtitles:{...subtitles.stats},presentation:{...presentation,lateMs:presentation.lateMs.slice(-120),pts:presentation.pts.slice(-120),retained:frames.size+(heldFrame?1:0),pending:pendingFrames.size},mode,skipCanvas,canvasSubmissions,rendered,renderMs,copyMs,maxRenderMs, heapBytes:engine.HEAPU8.byteLength, epoch, path:'wasm', decoder:decoderStats?.active?'webcodecs':'software',decoderStats, demuxFormat,seekPrerollSeconds,presentedPosition,adaptation:qualityControl.tick({io:ioStats,paused,decoderStatus:decoderStats}),quality:JSON.parse(engine.ccall('web_quality_status','string',[],[])), ioPending:(Atomics.load(engine.HEAPU32,engine._web_io_ptr()>>>2)&7)===1, ioSerial:Atomics.load(engine.HEAPU32,(engine._web_io_ptr()>>>2)+1), interruptions:Atomics.load(engine.HEAPU32,(engine._web_io_ptr()>>>2)+14), io:ioStats, seeking:pendingTarget!==null, position, queuedFrames:(Atomics.load(audio,0)-Atomics.load(audio,1))>>>0}});}
  } catch (error) { pumpFailed=true;clearInterval(timer); post({type:'error',message:String(error.stack || error)}); }
}
self.onmessage = async ({data}) => {
  if(data.type==='quality'){const result=engine?qualityControl.manual(data.source,data.request,data.representation):-1;post({type:'quality-result',id:data.id,result});return;}
  if(data.type==='quality-policy'){
    try{const result=qualityControl.configure(data.source,data.policy,data.representation);if(result<0)throw Error('Quality request rejected');
      const reply=()=>post({type:'event',event:{event:'command-reply',id:data.id}});
      if(data.policy.mode==='auto'){internalCommand(['set','demuxer-readahead-secs','6'],reply);schedulePump(0);}else reply();
    }catch(error){post({type:'event',event:{event:'command-reply',id:data.id,error:String(error.message)}});}
    return;
  }
  try {
    if (data.type === 'init') {
      if (data.disableBrowserCodecs) for (const name of ['VideoDecoder','AudioDecoder','VideoFrame']) Object.defineProperty(globalThis,name,{value:undefined, configurable:true});
      measureOutput=!!data.measureOutput;
      canvas = data.canvas;
      context = canvas.getContext('2d', {alpha:false});
      audio = new Int32Array(data.audio, 0, 16);
      const createEngine=(await import(data.decoder==='webcodecs'?'./engine-hybrid/player.mjs':'./engine/player.mjs')).default;
      engine = await createEngine({printErr:message=>post({type:'log',message}),print:message=>post({type:'log',message})});
      if (closing) return;
      engine.FS.mkdir('/fonts');
      engine.FS.writeFile('/fonts/DejaVuSans.ttf', new Uint8Array(data.font));
      for(const font of data.fonts??[])engine.FS.writeFile('/fonts/'+font.name,new Uint8Array(font.bytes));
      const fontSize=engine.FS.stat('/fonts/DejaVuSans.ttf').size;
      if(Number(fontSize) !== data.font.byteLength) throw new Error('Subtitle font write failed');
      if(data.decoder==='webcodecs'){
        decoderWorker=new Worker(new URL('./retained-decoder-worker.js',import.meta.url),{type:'module'});
        await new Promise((resolve,reject)=>{
          const deadline=setTimeout(()=>reject(Error('Decoder service initialization timed out')),5000);
          decoderWorker.onmessage=({data:message})=>{
            if(message.presentationReset)resetPresentation(message.generation);
            if(message.retainedFrame){try{receiveFrame(message);}catch(error){cleanupFrames();pumpFailed=true;clearInterval(timer);post({type:"error",message:String(error)});}}
            if(message.ready){clearTimeout(deadline);resolve();}
            if(message.stats)decoderStats=message.stats;
            if(message.wakeup&&!closing)engine._web_decoder_wakeup();
            if(message.error)post({type:'error',message:'Hybrid browser decoder: '+message.error});
          };
          decoderWorker.onerror=error=>{clearTimeout(deadline);reject(Error(error.message));};
          decoderWorker.postMessage({memory:engine.HEAPU8.buffer,pointer:engine._web_decoder_ptr(),disabled:data.disableBrowserCodecs,faultAfter:data.decoderFaultAfter});
        });
        engine._web_decoder_enable(2); // Retained frames cannot use software replay.
      }
      audioChannels=data.audioChannels??2;
      if(engine._web_audio_configure(audioChannels)<0)throw Error("Invalid output channel count");
      if(engine._web_configure(data.maxDecodePixels??8294400,data.maxAllocationBytes??134217728)<0)throw Error("Invalid decode resource limits");
      const result = engine._web_create(data.sampleRate);
      if (result < 0) throw new Error(`mpv initialization failed: ${result}`);
      engine._web_experiment_skip_render(mode!=='copy-render');
      nativeAudio = engine._web_audio_ptr();
      await startAudioRelay(data.audio);
      schedulePump();
      post({type:'ready', browserCodecsAbsent:['VideoDecoder','AudioDecoder','VideoFrame'].every(name=>typeof globalThis[name]==='undefined')});
    } else if (data.type === 'timing' && engine) {
      Atomics.store(engine.HEAPU32, (nativeAudio >>> 2) + 5, data.latencyUs);
      Atomics.store(engine.HEAPU32, (nativeAudio >>> 2) + 6, +data.running);
    } else if (data.type === 'open-remote' || data.type === 'open-file') {await openRemote(data);
    } else if(data.type==='refreshed'){ioWorker?.postMessage(data);
    } else if(data.type==='seek'){minFramePts=data.seconds*1e6-150000;cleanupFrames();closingFrames=false;minGeneration=presentationFloor=frameGeneration+1;subtitles.clear();sourceRendered=0;pendingTarget=data.seconds;restarted=false;Atomics.store(audio,8,1);Atomics.store(audio,2,0);submit(data.id,['seek',String(data.seconds),'absolute+exact']);
    } else if (data.type === 'open') {minFramePts=-Infinity;cleanupFrames();closingFrames=false;minGeneration=presentationFloor=frameGeneration+1;subtitles.clear();
      sourceRendered=0;
      await closeIO();
      if (data.bytes.byteLength > 32 * 1024 * 1024) throw new Error('M0 local fixture limit is 32 MiB');
      try {engine.FS.unlink('/media.mkv');} catch { /* First open. */ }
      engine.FS.writeFile('/media.mkv', new Uint8Array(data.bytes));
      if(Number(engine.FS.stat('/media.mkv').size) !== data.bytes.byteLength) throw new Error('Local media write failed');
      submit(data.id, ['loadfile','/media.mkv','replace']);
    } else if(data.type==='subtitle'){
      const path='/subtitle-'+data.id+'.'+data.format;
      engine.FS.writeFile(path,new Uint8Array(data.bytes));
      const result=engine.ccall('web_add_subtitle','number',['number','string','string','string','number'],[data.id,path,data.label??'',data.language??'',+data.select]);
      if(result<0)throw Error('Could not add subtitle: '+result);
      busyUntil=performance.now()+300;schedulePump(0);
    } else if (data.type === 'command') submit(data.id,data.args);
    else if (data.type === 'resize') {busyUntil=performance.now()+300;schedulePump(0);subtitles.clear();canvas.width=data.width;canvas.height=data.height;force=true;}
    else if (data.type === 'destroy') {
      closing = true;cleanupFrames();subtitles.clear();
      internalCommands.clear();
      clearInterval(timer);
      if (audio) {Atomics.store(audio,8,1);Atomics.store(audio,2,0);}
      await closeIO();
      await closeAudioRelay();
      decoderWorker?.postMessage({type:'cancel'});
      engine?._web_destroy();
      // Native joins precede the queued pthread pool-return messages.
      const deadline=performance.now()+2000;
      while(engine?.PThread.runningWorkers.length&&performance.now()<deadline)
        await new Promise(resolve=>setTimeout(resolve,10));
      if(engine?.PThread.runningWorkers.length)throw Error('Native thread cleanup did not settle');
      engine?.PThread.terminateAllThreads();
      decoderWorker?.terminate();decoderWorker=null;
      // Let child termination and queued cleanup run before closing their owner.
      await new Promise(resolve=>setTimeout(resolve,50));
      post({type:'destroyed',decoderStats,presentation:{...presentation,lateMs:[],pts:[],retained:frames.size+(heldFrame?1:0),pending:pendingFrames.size}});
      self.close();
    }
  } catch (error) {post({type:'error',id:data.id,message:String(error.stack || error)});}
};
function submit(id,args) {
  if (!engine || closing) throw new Error('Player is unavailable');
  if (args.length > 4 || !args.length) throw new Error('Invalid command arity');
  busyUntil=performance.now()+300;schedulePump(0);
  const padded = [...args];
  while (padded.length < 4) padded.push(null);
  const result = engine.ccall('web_command_args','number',['number','string','string','string','string'],[id,...padded]);
  if (result < 0) throw new Error(`mpv command failed: ${result}`);
}
