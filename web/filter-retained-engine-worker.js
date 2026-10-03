// SPDX-License-Identifier: Apache-2.0
import {initialLegacyPlaybackWorker,reduceLegacyPlaybackWorker,legacySeekComplete,legacyPumpDelay,admitLegacyCommand,finishLegacyCommand,legacyCommandCurrent,armLegacyPump,takeLegacyPump,admitLegacySource,finishLegacySource,initialLegacyPCM,planLegacyPCM,commitLegacyPCM,admitLegacySnapshot,captureLegacySnapshot,finishLegacySnapshot} from './generated/internal/machine/legacy-playback-worker.js';
let control=initialLegacyPlaybackWorker();
let pcmControl=initialLegacyPCM();
const transition=event=>{control=reduceLegacyPlaybackWorker(control,event);};
import {preparedEngine} from './prepared-engine.js';
let audioChannels=2;
import {WebCodecsPresenter} from './video-presenter.js';
import {webgpuDiagnostics} from './webgpu/diagnostics.js';
let videoTrack;
import {SubtitleOverlay} from './subtitle-overlay.js';
const subtitles=new SubtitleOverlay();
const skipCanvas=true;const quality=new URL(import.meta.url).searchParams.get('quality')==='1';const mode=new URL(import.meta.url).searchParams.get('mode');
const audioOnly=new URL(import.meta.url).searchParams.get('audioOnly')==='1';
let canvasSubmissions=0;
let videoPresenter;
// Replace the retained worker's minFramePts through presentSelected policy block.
// Keep SubtitleOverlay, mode/quality/audioOnly, presenter handles and measurements.
import {initialLegacyRetainedPresentation,transitionLegacyRetainedPresentation,legacyRetainedNeedsPump,legacyRetainedRequestCurrent} from './generated/internal/machine/legacy-retained-presentation.js';
let retainedControl=initialLegacyRetainedPresentation();
const frames=new Map(),pendingFrames=new Map(),presentationTimers=new Map();
// Map values contain only physical handles: frames, captured overlays, timers.
let physicallyClosed=0;
const presentation={get position(){return retainedControl.position;},get received(){return retainedControl.received;},get closed(){return physicallyClosed;},get drawn(){return retainedControl.drawn;},get redraws(){return retainedControl.redraws;},get peakRetained(){return retainedControl.peakRetained;},get peakPending(){return retainedControl.peakPending;},get missing(){return retainedControl.missing;},lateMs:[],pts:[],pixelChecks:[]};
function closeOwned(frame){frame.close();physicallyClosed++;}
function retainedStep(input,acquire){
 const decision=transitionLegacyRetainedPresentation(retainedControl,input);retainedControl=decision.state;
 let failure;try{acquire?.(decision);}catch(error){failure=error;}
 for(const id of decision.cancel){const timer=presentationTimers.get(id);presentationTimers.delete(id);pendingFrames.delete(id);try{if(timer)clearTimeout(timer.handle);}catch(error){failure??=error;}}
 for(const id of decision.close){const frame=frames.get(id);frames.delete(id);try{if(frame)closeOwned(frame);}catch(error){failure??=error;}}
 if(failure)throw failure;return decision;
}
function cleanupFrames(target,closed=true){retainedStep({type:'reset',target,closed});}
function receiveFrame(message){
 if(legacyRetainedNeedsPump(retainedControl))tick();
 const beforeGeneration=retainedControl.generation;
 let transferred=false,decision;
 try{decision=retainedStep({type:'receive',pts:message.pts,generation:message.generation,pendingTarget:control.pendingTarget},result=>{if(result.accept!==undefined){frames.set(result.accept,message.retainedFrame);transferred=true;}});}
 finally{if(!transferred)closeOwned(message.retainedFrame);}
 if(decision.error)throw Error(decision.error);
 if(beforeGeneration!==retainedControl.generation)subtitles.clear();
 if(decision.accept!==undefined)presentReady(Math.round(message.pts));
}
function presentReady(key){
 const decision=retainedStep({type:'schedule',key}),request=decision.request;if(!request)return;
 const current=()=>legacyRetainedRequestCurrent(retainedControl,request.id,request.epoch);
 const draw=()=>{
  if(!current())return;
  const now=performance.now();if(!current())return;if(now<request.deadline){arm(request.deadline-now);return;}
  const overlay=pendingFrames.get(request.id);pendingFrames.delete(request.id);
  const result=retainedStep({type:'draw',id:request.id,epoch:request.epoch,now});
  if(result.error)throw Error(result.error);if(result.frame===undefined)return;
  const valid=()=>retainedControl.epoch===request.epoch&&!retainedControl.closed&&retainedControl.held?.id===result.frame;
  const frame=frames.get(result.frame);if(!frame||!valid())return;
  videoPresenter.draw(frame,videoTrack,overlay);if(!valid())return;
  if(context)subtitles.draw(context,overlay);if(!valid())return;
  const presented=retainedStep({type:'presented',id:result.drawing,epoch:request.epoch});if(!presented.accepted)return;
  canvasSubmissions++;
  if(presentation.lateMs.length<10000)presentation.lateMs.push(performance.now()-request.deadline);
  if(presentation.pts.length<10000)presentation.pts.push(key);
  if(context&&quality&&presentation.pixelChecks.length<2&&presentation.drawn%60===0){const pixels=context.getImageData(0,0,64,64).data;presentation.pixelChecks.push({pts:key,min:Math.min(...pixels.filter((_,i)=>i%4!==3)),max:Math.max(...pixels.filter((_,i)=>i%4!==3))});}
  if(valid())engine._web_presented();
 };
 const arm=delay=>{
  const registration={};presentationTimers.set(request.id,registration);
  let timer;try{timer=setTimeout(()=>{if(presentationTimers.get(request.id)!==registration)return;presentationTimers.delete(request.id);draw();},delay);registration.handle=timer;}catch(error){if(presentationTimers.get(request.id)===registration)presentationTimers.delete(request.id);if(current())try{cleanupFrames();}catch{}throw error;}
  if(presentationTimers.get(request.id)!==registration||!current()){clearTimeout(timer);if(presentationTimers.get(request.id)===registration)presentationTimers.delete(request.id);}
 };
 const delay=request.deadline-performance.now();if(!current())return;if(delay<=0)draw();else arm(delay);
}
function presentSelected(){
 const before=retainedControl,serial=engine._web_selected_serial(),key=Math.round(engine._web_selected_pts()*1e6),redraw=!!engine._web_selected_redraw(),delay=engine._web_selected_delay(),now=performance.now();
 if(before!==retainedControl)return;
 const overlay=subtitles.read(engine);if(before!==retainedControl)return;
 const decision=retainedStep({type:'select',serial,key,redraw,delay,now});if(decision.error)throw Error(decision.error);
 if(decision.redraw!==undefined){const valid=()=>retainedControl.epoch===decision.state.epoch&&retainedControl.held?.id===decision.redraw&&!retainedControl.closed;const frame=frames.get(decision.redraw);if(!frame||!valid())return;videoPresenter.draw(frame,videoTrack,overlay);if(!valid())return;if(context)subtitles.draw(context,overlay);if(!valid())return;const presented=retainedStep({type:'presented',id:decision.drawing,epoch:decision.state.epoch});if(presented.accepted&&valid())engine._web_presented();return;}
 if(decision.request){if(!legacyRetainedRequestCurrent(retainedControl,decision.request.id,decision.request.epoch))return;pendingFrames.set(decision.request.id,overlay);presentReady(key);}
 const checked=retainedStep({type:'check',now:performance.now()});if(checked.error)throw Error(checked.error);
}
let decoderWorker,decoderStats,webgpuService,decoderBackend='ffmpeg';


let engine, canvas, context, timer, audio, pcm, nativeAudio;
let renderMs=0,copyMs=0,maxRenderMs=0;
let rendered = 0, ticks = 0, presentedPosition=0, frameImage, measureOutput=false, wasWhite=false;
let ioWorker,ioStats,ioReady,ioClose,ioRetirement;
const internalCommands=new Map();
function internalCommand(args,done,reject){
 const admission=admitLegacyCommand(control);control=admission.state;
 if(admission.id===null)throw Error('Playback configuration capacity unavailable');
 const id=admission.id;internalCommands.set(id,{done,reject});
 try{submit(id,args);}catch(error){control=finishLegacyCommand(control,id);internalCommands.delete(id);throw error;}
}
function retireCommands(error){const pending=[...internalCommands.values()];internalCommands.clear();for(const value of pending)value.reject?.(error);}
const CAPACITY = 8192;

function schedulePump(delay=10){
 const previous=timer;timer=undefined;
 const admission=armLegacyPump(control);control=admission.state;
 try{clearTimeout(previous);}catch(error){transition({type:'fail'});retireCommands(error);throw error;}if(admission.id===null||control.timer!==admission.id||!engine)return;
 const id=admission.id;
 let acquired;
 try{acquired=setTimeout(()=>{
  if(control.timer!==id)return;
  control=takeLegacyPump(control,id);timer=undefined;
  schedulePump(legacyPumpDelay(control,performance.now(),retainedControl.pending.length>0,10));tick();
 },delay);}catch(error){transition({type:'fail'});retireCommands(error);throw error;}
 if(control.timer===id)timer=acquired;else clearTimeout(acquired);
}

function releaseSeek(){if(legacySeekComplete(control)){transition({type:'seek-released'});post({type:'seek-complete',position:control.position});}}
async function closeIO(){
 if(ioRetirement)return ioRetirement;
 const old=ioWorker;if(!old)return;ioWorker=null;
 const native=engine;
 const retiring=Promise.resolve().then(async()=>{
  let deadline,resolveClosed;
  try{
   const closed=new Promise(resolve=>{resolveClosed=resolve;ioClose=resolve;});
   native._web_io_cancel();old.postMessage({type:'close'});
   deadline=setTimeout(resolveClosed,1500);await closed;
  }finally{
   if(ioClose===resolveClosed)ioClose=null;
   try{clearTimeout(deadline);}finally{old.terminate();}
  }
  native.ccall('web_io_root',null,['number','string'],[0,'']);
 });
 ioRetirement=retiring;
 try{await retiring;}finally{if(ioRetirement===retiring)ioRetirement=undefined;}
}

async function openRemote(data){cleanupFrames(undefined,false);subtitles.clear();

  await closeIO();
      if(control.closing)throw Error('Player closed');
  const pointer=engine._web_io_ptr();
  ioWorker=new Worker(new URL('./io-worker.js',import.meta.url),{type:'module'});
  let info;try{info=await new Promise((resolve,reject)=>{
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
  }catch(error){try{await closeIO();}catch{}throw error;}
  if(control.closing)throw Error('Player closed');
  engine._web_io_configure(control.source,BigInt(info.size));
  engine.ccall('web_io_root',null,['number','string'],[info.resource??0,info.url??'']);
  post({type:'source',info});submit(data.id,['loadfile','brange://source','replace']);
}
const post = message => self.postMessage(message);
function pumpAudio() {
  // Refresh views after every possible Wasm memory growth.
  const h = engine.HEAPU32;
  const at = nativeAudio >>> 2;
  const nextEpoch = Atomics.load(h, at + 3);
  const preserveFinal=audioOnly&&!!Atomics.load(audio,7)&&((Atomics.load(audio,0)-Atomics.load(audio,1))>>>0)>0;
  const acknowledged=Atomics.load(audio,4),sampledWritten=Atomics.load(h,at);
  // A native reset can change the cursor after the first epoch sample.
  // Validate the snapshot before the pure capacity check interprets it.
  if(Atomics.load(h,at+3)!==nextEpoch)return;
  const plan=planLegacyPCM(pcmControl,nextEpoch,acknowledged,sampledWritten,preserveFinal);pcmControl=plan.state;
  if(plan.kind==='wait')return;
  const epoch=pcmControl.epoch;
  if(plan.kind==='reset'){
    Atomics.store(audio, 2, 0);
    Atomics.store(audio, 0, 0);
    Atomics.store(audio, 3, epoch);
    return;
  }
  if (Atomics.load(audio, 4) !== epoch) return;
  const consumed = Atomics.load(audio, 1) >>> 0;
  Atomics.store(h, at + 7, 0);
  Atomics.store(h, at + 1, consumed);
  Atomics.store(h, at + 7, epoch);
  const written = Atomics.load(h, at);
  const count = (written - pcmControl.forwarded) >>> 0;
  if (Atomics.load(h, at + 3) !== epoch) return;
  if (count > CAPACITY) throw new Error('PCM capacity invariant violated');
  const source = (nativeAudio + 32) >>> 2;
  const metadata=audioOnly?new Float64Array(pcm.buffer,64+CAPACITY*audioChannels*4,CAPACITY*2):null;
  const nativeMetadata=audioOnly?new Float64Array(engine.HEAPU8.buffer,engine._web_sync_ptr(),CAPACITY*2):null;
  for (let i = 0; i < count; i++) {
    if(audioOnly){const index=(((pcmControl.forwarded+i)>>>0)%CAPACITY)*2;metadata[index]=nativeMetadata[index];metadata[index+1]=nativeMetadata[index+1];}
    const index = (((pcmControl.forwarded + i) >>> 0) % CAPACITY) * audioChannels;
    for(let c=0;c<audioChannels;c++)pcm[index+c]=engine.HEAPF32[source+index+c];
  }
  // A reset during the copy discards this batch before publishing it.
  if (Atomics.load(h, at + 3) !== epoch) return;
  pcmControl=commitLegacyPCM(pcmControl,epoch,written);
  Atomics.store(audio, 0, written);
  Atomics.store(audio, 2, control.pendingTarget===null?Atomics.load(h, at + 2):0);
}
function tick() {
  if(control.closing)return;
  try {
    pumpAudio();
    for (let i = 0; i < 64; i++) {
      const ptr = engine._web_event();
      if (!ptr) break;
      let event;try{event=JSON.parse(engine.UTF8ToString(ptr));}finally{engine._free(ptr);}
      if(event.event==='command-reply'&&internalCommands.has(event.id)){
        const current=legacyCommandCurrent(control,event.id);const command=internalCommands.get(event.id);internalCommands.delete(event.id);control=finishLegacyCommand(control,event.id);
        if(!current){command.reject?.(Error('Source replaced'));continue;}
        if(event.error){const error=Error(`Playback configuration failed: ${event.error}`);command.reject?.(error);throw error;}
        command.done(event.result);continue;
      }
      if(event.event==='property-change'&&event.name==='pause'){transition({type:'pause',paused:!!event.data,now:performance.now()});}
      if(event.event==='property-change'&&event.name==='track-list')videoTrack=event.data?.find(t=>t.type==='video'&&t.selected);
      if(event.event==='file-loaded'){
        // Configure from mpv's detected format before resolving the host's open.
        internalCommand(['expand-text','${file-format}'],format=>{
          transition({type:'format',format:String(format),software:false});
          internalCommand(['set','hr-seek-demuxer-offset',String(control.seekPreroll)],()=>post({type:'event',event}));
        });continue;
      }
      // Let mpv discard obsolete demux packets after this bounded read completes.
      // Interrupting stream_cb read_fn mid-packet returns a truncated packet to FFmpeg.
      // Source replacement/destroy still cancel I/O through closeIO().
      if(event.event==='property-change'&&event.name==='time-pos'){transition({type:'position',position:event.data});releaseSeek();}
      if(event.event==='playback-restart'){transition({type:'restart'});releaseSeek();}
      if(event.event==='log-message')post({type:'log',message:event.prefix+': '+event.text});
      post({type:'event', event});
    }
    if(audioOnly){ticks++;
      if(performance.now()>=control.nextDiagnostics){transition({type:'diagnostics',now:performance.now()});
        post({type:'diagnostics',data:{audioOnly:true,pumpTicks:ticks,decoder:'none',decoderBackend:'none',videoRenderCalls:0,videoDecoderWorker:false,visibleCanvas:false,presenter:null,io:ioStats,position:control.position,queuedFrames:Math.max(0,Atomics.load(audio,0)-Atomics.load(audio,1))}});}
      return;
    }
    const renderStart=performance.now();
    const ptr = engine._web_render(canvas.width, canvas.height, +control.force);
    const renderDuration=performance.now()-renderStart;
    transition({type:'rendered'});
    if (ptr && control.pendingTarget===null) {
      renderMs+=renderDuration;maxRenderMs=Math.max(maxRenderMs,renderDuration);const copyStart=performance.now();
      if(!skipCanvas){
      if(!frameImage||frameImage.width!==canvas.width||frameImage.height!==canvas.height)frameImage=new ImageData(canvas.width,canvas.height);
      const bytes=frameImage.data;bytes.set(engine.HEAPU8.subarray(ptr,ptr+bytes.length));
      for (let i = 3; i < bytes.length; i += 4) bytes[i] = 255;
      context.putImageData(frameImage, 0, 0);
      if(measureOutput){const at=(8*canvas.width+8)*4;const white=bytes[at]>225&&bytes[at+1]>225&&bytes[at+2]>225;if(white&&!wasWhite)post({type:'output',data:{kind:'flash',wallTime:performance.timeOrigin+performance.now(),position:control.position}});wasWhite=white;}
      copyMs+=performance.now()-copyStart;canvasSubmissions++;
      }
      presentSelected();
      rendered++;transition({type:'frame-presented'});presentedPosition=control.position;
    }
    ticks++;
    if (performance.now()>=control.nextDiagnostics || (ptr && control.sourceRendered <= 5)) {transition({type:'diagnostics',now:performance.now()});post({type:'diagnostics', data:{pumpTicks:ticks,subtitles:{...subtitles.stats},presentation:{...presentation,lateMs:presentation.lateMs.slice(-120),pts:presentation.pts.slice(-120),retained:retainedControl.frames.length+(retainedControl.held?1:0),pending:retainedControl.pending.length},mode,skipCanvas,canvasSubmissions,rendered,renderMs,copyMs,maxRenderMs, heapBytes:engine.HEAPU8.byteLength, epoch:pcmControl.epoch, path:'wasm', decoder:decoderBackend==='webgpu'?'webgpu':decoderStats?.active?'webcodecs':'software',decoderBackend:decoderBackend==='webgpu'?'webgpu':decoderStats?.active?'webcodecs':'ffmpeg',webgpu:webgpuDiagnostics(webgpuService?.runtime),decoderStats, demuxFormat:control.demuxFormat,seekPrerollSeconds:control.seekPreroll,presentedPosition, ioPending:(Atomics.load(engine.HEAPU32,engine._web_io_ptr()>>>2)&7)===1, ioSerial:Atomics.load(engine.HEAPU32,(engine._web_io_ptr()>>>2)+1), interruptions:Atomics.load(engine.HEAPU32,(engine._web_io_ptr()>>>2)+14), io:ioStats, seeking:control.pendingTarget!==null, position:control.position, queuedFrames:(Atomics.load(audio,0)-Atomics.load(audio,1))>>>0}});}
  } catch (error) { transition({type:'fail'});retireCommands(Error('Playback pump failed'));clearInterval(timer); post({type:'error',message:String(error.stack || error)}); }
}
self.onmessage = async ({data}) => {
  let sourceLease;
  try {
    if(control.closing&&data.type!=='destroy')throw Error('Player closed');
    if(['open','open-file','open-remote','command','seek','subtitle','preview-snapshot','resize'].includes(data.type)&&!control.ready)throw Error('Player is not ready');
    if(data.type==='open'||data.type==='open-file'||data.type==='open-remote'){
      const admission=admitLegacySource(control);control=admission.state;sourceLease=admission.id;
      if(sourceLease===null)throw Error('Source operation unavailable');
    }
    if(data.type==='watchdogs'){
      transition({type:'decoder-watchdog',enabled:data.decoderOutput!==false});
      decoderWorker?.postMessage({type:'watchdogs',decoderOutput:control.decoderOutputWatchdog});
      return;
    }
    if (data.type === 'init') {
      if(control.initialized||control.closing)throw Error('Player initialization unavailable');
      transition({type:'init'});
      transition({type:'decoder-watchdog',enabled:data.decoderOutputWatchdog!==false});
      if (data.disableBrowserCodecs) for (const name of ['VideoDecoder','AudioDecoder','VideoFrame']) Object.defineProperty(globalThis,name,{value:undefined, configurable:true});
      measureOutput=!!data.measureOutput;
      canvas = data.canvas;
      decoderBackend=audioOnly?'none':data.decoder==='webgpu'?'webgpu':data.decoder==='webcodecs'?'webcodecs':'ffmpeg';
      if(!audioOnly&&decoderBackend!=='webgpu'){
        context = canvas.getContext('2d', {alpha:false});
        videoPresenter=new WebCodecsPresenter(canvas,context);
      }
      audio = new Int32Array(data.audio, 0, 16);
      pcm = new Float32Array(data.audio, 64);
      const createEngine=(await import(audioOnly?'./engine-selective/player.mjs':data.decoder==='webcodecs'||data.decoder==='webgpu'?'./engine-hybrid/player.mjs':'./engine/player.mjs')).default;
      if(control.closing)return;
      engine = await createEngine({...preparedEngine(data.compiledWasm),printErr:message=>post({type:'log',message}),print:message=>post({type:'log',message})});
      if (control.closing) {engine?.PThread?.terminateAllThreads();return;}
      engine.FS.mkdir('/fonts');
      engine.FS.writeFile('/fonts/DejaVuSans.ttf', new Uint8Array(data.font));
      for(const font of data.fonts??[])engine.FS.writeFile('/fonts/'+font.name,new Uint8Array(font.bytes));
      const fontSize=engine.FS.stat('/fonts/DejaVuSans.ttf').size;
      if(Number(fontSize) !== data.font.byteLength) throw new Error('Subtitle font write failed');
      if(data.decoder==='webcodecs'&&!audioOnly){
        decoderWorker=new Worker(new URL('./retained-decoder-worker.js',import.meta.url),{type:'module'});
        await new Promise((resolve,reject)=>{
          let ready=false,failed=false;
          const deadline=setTimeout(()=>reject(Error('Decoder service initialization timed out')),5000);
          decoderWorker.onmessage=({data:message})=>{
            if(control.closing||failed){message.retainedFrame?.close();return;}
            if(message.retainedFrame){try{receiveFrame(message);}catch(error){cleanupFrames();transition({type:'fail'});retireCommands(Error('Playback pump failed'));clearInterval(timer);post({type:"error",message:String(error)});}}
            if(message.ready){ready=true;clearTimeout(deadline);resolve();}
            if(message.stats)decoderStats=message.stats;
            if(typeof message.watchdog==='boolean')decoderStats={...decoderStats,outputWatchdogEnabled:message.watchdog};
            if(message.wakeup&&!control.closing)engine._web_decoder_wakeup();
            if(message.error)post({type:'error',message:'Hybrid browser decoder: '+message.error,decoderTimeout:message.decoderTimeout===true});
          };
          const fail=event=>{
            if(control.closing||failed)return;
            failed=true;event.preventDefault?.();clearTimeout(deadline);
            const error=Error('Hybrid decoder worker failed: '+(event.message||event.type));
            if(!ready){reject(error);return;}
            // Rejecting the resolved startup promise would lose this crash.
            // An unknown worker failure must not be cached as codec rejection.
            transition({type:'fail'});retireCommands(Error('Playback pump failed'));clearInterval(timer);
            post({type:'error',message:error.message,assetFailure:true});
          };
          decoderWorker.onerror=fail;decoderWorker.onmessageerror=fail;
          decoderWorker.postMessage({memory:engine.HEAPU8.buffer,pointer:engine._web_decoder_ptr(),disabled:data.disableBrowserCodecs,faultAfter:data.decoderFaultAfter,decoderOutputWatchdog:control.decoderOutputWatchdog});
        });
        if(control.closing)return;
        engine._web_decoder_enable(2); // Retained frames cannot use software replay.
      }else if(data.decoder==='webgpu'&&!audioOnly){
        // Missing runtime modules are asset failures and remain terminal.
        const [{WebGPUMailboxService},{WebGPUPresenter},{webgpuDecoderSupported},{webgpuRequiredFeatures}]=await Promise.all([
          import('./webgpu/mailbox-service.js'),import('./webgpu/presenter.js'),
          import('./generated/internal/webgpu-codecs.js'),import('./webgpu/codecs/registry.js')]);
        if(control.closing)return;
        try{
          if(!webgpuDecoderSupported(data.videoTrack?.codec))throw Error('No qualified WebGPU codec adapter');
          webgpuService=new WebGPUMailboxService(engine,{decodeIntent:data.webgpuDecodeIntent,onFrame:message=>receiveFrame(message),
            onWakeup:()=>{if(!control.closing)engine._web_decoder_wakeup();},
            onError:(error,source)=>post({type:'error',message:'Hybrid WebGPU decoder: '+error,assetFailure:!!source?.assetFailure})});
          const service=webgpuService;
          await service.runtime.acquireDevice(webgpuRequiredFeatures(data.videoTrack.codec));
          if(control.closing||webgpuService!==service){await service.close();return;}
          videoPresenter=new WebGPUPresenter(canvas,service.runtime);
          engine._web_decoder_enable(3);
        }catch(error){await webgpuService?.close();const failure=Error('Hybrid WebGPU decoder: '+String(error));failure.decoderFailure=!error.assetFailure;failure.assetFailure=!!error.assetFailure;throw failure;}
      }
      if(control.closing)return;
      audioChannels=data.audioChannels??2;
      if(engine._web_audio_configure(audioChannels)<0)throw Error("Invalid output channel count");
      if(engine._web_configure(data.maxDecodePixels??8294400,data.maxAllocationBytes??134217728)<0)throw Error("Invalid decode resource limits");
      const result = engine._web_create(data.sampleRate);
      if (result < 0) throw new Error(`mpv initialization failed: ${result}`);
      engine._web_experiment_skip_render(mode!=='copy-render');
      nativeAudio = engine._web_audio_ptr();
      schedulePump();
      if(control.closing)return;transition({type:'ready'});
      post({type:'ready', browserCodecsAbsent:['VideoDecoder','AudioDecoder','VideoFrame'].every(name=>typeof globalThis[name]==='undefined')});
    } else if (data.type === 'timing' && engine) {
      Atomics.store(engine.HEAPU32, (nativeAudio >>> 2) + 5, data.latencyUs);
      Atomics.store(engine.HEAPU32, (nativeAudio >>> 2) + 6, +data.running);
    } else if (data.type === 'open-remote' || data.type === 'open-file') {await openRemote(data);
    } else if(data.type==='refreshed'){ioWorker?.postMessage(data);
    } else if(data.type==='seek'){cleanupFrames(data.seconds,false);subtitles.clear();transition({type:'seek',target:data.seconds});Atomics.store(audio,2,0);submit(data.id,['seek',String(data.seconds),'absolute+exact']);
    } else if (data.type === 'open') {cleanupFrames(undefined,false);subtitles.clear();

      await closeIO();
      if(control.closing)throw Error('Player closed');
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
      transition({type:'touch',now:performance.now()});schedulePump(0);
    } else if (data.type === 'command') submit(data.id,data.args);
    else if (data.type === 'resize') {transition({type:'touch',now:performance.now()});schedulePump(0);subtitles.clear();canvas.width=data.width;canvas.height=data.height;transition({type:'invalidate'});}
    else if (data.type === 'destroy') {
      if(control.closing)return;
      let cleanupFailure;const clean=action=>{try{return action();}catch(error){cleanupFailure??=error;}};const cleanAsync=async action=>{try{await action();}catch(error){cleanupFailure??=error;}};
      transition({type:'close'});retireCommands(Error('Player closed'));clean(()=>cleanupFrames());clean(()=>subtitles.clear());
      internalCommands.clear();
      clean(()=>clearInterval(timer));
      if (audio) clean(()=>Atomics.store(audio,2,0));
      await cleanAsync(closeIO);
      clean(()=>decoderWorker?.postMessage({type:'cancel'}));
      await cleanAsync(()=>webgpuService?.close());webgpuService=null;
      clean(()=>engine?._web_destroy());
      videoPresenter?.destroy();videoPresenter=null;
      // Native joins precede the queued pthread pool-return messages.
      const deadline=performance.now()+2000;
      while(engine?.PThread.runningWorkers.length&&performance.now()<deadline)
        await new Promise(resolve=>setTimeout(resolve,10));
      if(engine?.PThread.runningWorkers.length)cleanupFailure??=Error('Native thread cleanup did not settle');
      clean(()=>engine?.PThread.terminateAllThreads());
      clean(()=>decoderWorker?.terminate());decoderWorker=null;
      // Let child termination and queued cleanup run before closing their owner.
      await new Promise(resolve=>setTimeout(resolve,50));
      if(cleanupFailure)throw cleanupFailure;
      post({type:'destroyed',decoderStats,presentation:{...presentation,lateMs:[],pts:[],retained:retainedControl.frames.length+(retainedControl.held?1:0),pending:retainedControl.pending.length}});
      self.close();
    }
  } catch (error) {post({type:'error',id:data.id,message:String(error.stack || error),decoderFailure:!!error.decoderFailure,assetFailure:!!error.assetFailure});}finally{if(sourceLease!==undefined&&sourceLease!==null)control=finishLegacySource(control,sourceLease);}
};
function submit(id,args) {
  if (!engine || control.closing) throw new Error('Player is unavailable');
  if (args.length > 4 || !args.length) throw new Error('Invalid command arity');
  transition({type:'touch',now:performance.now()});schedulePump(0);
  if(control.closing||control.pumpFailed)throw Error('Player is unavailable');
  const padded = [...args];
  while (padded.length < 4) padded.push(null);
  const result = engine.ccall('web_command_args','number',['number','string','string','string','string'],[id,...padded]);
  if (result < 0) throw new Error(`mpv command failed: ${result}`);
}
