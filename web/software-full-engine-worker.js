// SPDX-License-Identifier: Apache-2.0
import {initialLegacyPlaybackWorker,reduceLegacyPlaybackWorker,legacySeekComplete,legacyPumpDelay,admitLegacyCommand,finishLegacyCommand,legacyCommandCurrent,armLegacyPump,takeLegacyPump,admitLegacySource,finishLegacySource,initialLegacyPCM,planLegacyPCM,commitLegacyPCM,admitLegacySnapshot,captureLegacySnapshot,finishLegacySnapshot} from './generated/internal/machine/legacy-playback-worker.js';
let control=initialLegacyPlaybackWorker();
let pcmControl=initialLegacyPCM();
const transition=event=>{control=reduceLegacyPlaybackWorker(control,event);};
import {preparedEngine} from './prepared-engine.js';
import {webgpuDiagnostics} from './webgpu/diagnostics.js';
import {mpvDecoderOptions} from './generated/internal/decode-policy.js';
import {initialLegacyAdaptiveDecode,transitionLegacyAdaptiveDecode} from './generated/internal/machine/legacy-adaptive-decode.js';
let adaptive;
let audioChannels=2;
let YUVPresenter,uploader;
let presenterPolicy='auto',activePresenter='pending',yuvRejectionReason=null;
const yuvRejections=['qualified','pixel-format','odd-source-dimensions','source-crop','rotation','color-matrix','color-range','chroma-location','transfer','color-primaries','plane-layout','source-color-metadata'];
function installPresenter(canvas,prior){
 uploader=new YUVPresenter(canvas);
 if(prior)uploader.stats={...prior,liveTextures:4,contextRestores:(prior.contextRestores||0)+1};
 uploader.onLost=()=>{transition({type:'gpu-lost'});internalCommand(['set','pause','yes'],()=>{});post({type:'output',data:{kind:'gpu-context-lost'}});};
 uploader.onRestore=()=>{if(control.closing)return;const old=uploader,stats={...old.stats};old.destroy(true);const intent=control.gpuPauseIntent;transition({type:'gpu-restored'});installPresenter(canvas,stats);internalCommand(['set','pause',intent?'yes':'no'],()=>{});transition({type:'invalidate'});schedulePump(0);post({type:'output',data:{kind:'gpu-context-restored'}});};
}
let decoderWorker,decoderStats;


let engine, canvas, context, timer, audio, pcm, nativeAudio;
let renderMs=0,copyMs=0,maxRenderMs=0;
let profileEnabled=false;
const emptyProfile=()=>({ticks:0,renderFrames:0,renderNulls:0,renderFrameMs:0,renderNullMs:0,audioMs:0,eventMs:0,imageMs:0,wasmCopyMs:0,alphaMs:0,putImageDataMs:0,presentedMs:0,imageAllocations:0,workerMessages:0,ioMessages:0,diagnosticsPosts:0,diagnosticsMs:0});
let profile=emptyProfile();
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
function commandReady(args){return new Promise((resolve,reject)=>internalCommand(args,resolve,reject));}
function considerAdaptive(now){
 if(!adaptive)return;
 const decision=transitionLegacyAdaptiveDecode(adaptive,{type:'sample',now,position:control.position,paused:control.paused,pendingTarget:control.pendingTarget});adaptive=decision.state;
 if(!decision.request)return;
 const {id,options}=decision.request;
 commandReady(['set','vd-lavc-o',options]).then(()=>{adaptive=transitionLegacyAdaptiveDecode(adaptive,{type:'finish',id,success:true}).state;},()=>{adaptive=transitionLegacyAdaptiveDecode(adaptive,{type:'finish',id,success:false}).state;});
}
const CAPACITY = 8192;

function schedulePump(delay=5){
 const previous=timer;timer=undefined;
 const admission=armLegacyPump(control);control=admission.state;
 try{clearTimeout(previous);}catch(error){transition({type:'fail'});retireCommands(error);throw error;}if(admission.id===null||control.timer!==admission.id||!engine)return;
 const id=admission.id;
 let acquired;
 try{acquired=setTimeout(()=>{
  if(control.timer!==id)return;
  control=takeLegacyPump(control,id);timer=undefined;
  schedulePump(legacyPumpDelay(control,performance.now(),false,5));tick();
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

async function openRemote(data){

  activePresenter=uploader?'pending':'rgb';yuvRejectionReason=uploader?null:(yuvRejectionReason??'forced-rgb');
  await closeIO();
      if(control.closing)throw Error('Player closed');
  const pointer=engine._web_io_ptr();
  ioWorker=new Worker(new URL('./io-worker.js',import.meta.url),{type:'module'});
  let info;try{info=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('Remote open timed out')),20000);
    ioWorker.onmessage=({data:message})=>{
      if(profileEnabled)profile.ioMessages++;
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
  const acknowledged=Atomics.load(audio,4),sampledWritten=Atomics.load(h,at);
  // A native reset can change the cursor after the first epoch sample.
  // Validate the snapshot before the pure capacity check interprets it.
  if(Atomics.load(h,at+3)!==nextEpoch)return;
  const plan=planLegacyPCM(pcmControl,nextEpoch,acknowledged,sampledWritten);pcmControl=plan.state;
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
  for (let i = 0; i < count; i++) {
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
    const audioStart=profileEnabled?performance.now():0;
    pumpAudio();
    if(profileEnabled)profile.audioMs+=performance.now()-audioStart;
    const eventStart=profileEnabled?performance.now():0;
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
      if(event.event==='property-change'&&adaptive)adaptive=transitionLegacyAdaptiveDecode(adaptive,{type:'observe',name:event.name,value:event.data,now:performance.now(),position:control.position}).state;
      if(event.event==='file-loaded'){
        // Configure from mpv's detected format before resolving the host's open.
        internalCommand(['expand-text','${file-format}'],format=>{
          transition({type:'format',format:String(format),software:true});
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
    if(profileEnabled)profile.eventMs+=performance.now()-eventStart;
    if(uploader?.lost)return;
    const renderStart=performance.now();
    const ptr = engine._web_render(canvas.width, canvas.height, +control.force);
    const renderDuration=performance.now()-renderStart;
    if(profileEnabled){profile.ticks++;profile[ptr?'renderFrames':'renderNulls']++;profile[ptr?'renderFrameMs':'renderNullMs']+=renderDuration;}
    transition({type:'rendered'});
    if (ptr && control.pendingTarget===null) {
      renderMs+=renderDuration;maxRenderMs=Math.max(maxRenderMs,renderDuration);const copyStart=performance.now();
      if(!uploader){
      const imageStart=profileEnabled?performance.now():0;
      if(!frameImage||frameImage.width!==canvas.width||frameImage.height!==canvas.height){frameImage=new ImageData(canvas.width,canvas.height);if(profileEnabled)profile.imageAllocations++;}
      if(profileEnabled)profile.imageMs+=performance.now()-imageStart;
      const wasmCopyStart=profileEnabled?performance.now():0;
      const bytes=frameImage.data;bytes.set(engine.HEAPU8.subarray(ptr,ptr+bytes.length));
      const alphaStart=profileEnabled?performance.now():0;
      if(profileEnabled)profile.wasmCopyMs+=alphaStart-wasmCopyStart;
      for (let i = 3; i < bytes.length; i += 4) bytes[i] = 255;
      const putStart=profileEnabled?performance.now():0;
      if(profileEnabled)profile.alphaMs+=putStart-alphaStart;
      context.putImageData(frameImage, 0, 0);
      if(profileEnabled)profile.putImageDataMs+=performance.now()-putStart;
      if(measureOutput){const at=(8*canvas.width+8)*4;const white=bytes[at]>225&&bytes[at+1]>225&&bytes[at+2]>225;if(white&&!wasWhite)post({type:'output',data:{kind:'flash',wallTime:performance.timeOrigin+performance.now(),position:control.position}});wasWhite=white;}
      }
      copyMs+=performance.now()-copyStart;const presentedStart=profileEnabled?performance.now():0;engine._web_presented();if(profileEnabled)profile.presentedMs+=performance.now()-presentedStart;
      rendered++;transition({type:'frame-presented'});presentedPosition=control.position;
      if(control.snapshot&&!control.snapshot.capturing){
        control=captureLegacySnapshot(control);const {id,source}=control.snapshot;
        const time=presentedPosition,width=canvas.width,height=canvas.height;
        const settled=(error,blob)=>{const result=finishLegacySnapshot(control,id,source);control=result.state;if(result.publish)post(error?{type:'error',id,message:String(error)}:{type:'event',event:{event:'command-reply',id,result:{blob,time,width,height}}});};
        try{Promise.resolve(canvas.convertToBlob({type:'image/jpeg',quality:.8})).then(blob=>settled(null,blob),error=>settled(error));}catch(error){settled(error);}
      }
    }
    ticks++;
    considerAdaptive(performance.now());
    if(performance.now()>=control.nextDiagnostics||(ptr&&control.sourceRendered<=5)){const diagnosticsStart=profileEnabled?performance.now():0;transition({type:'diagnostics',now:performance.now()});post({type:'diagnostics', data:{decodePolicy:adaptive?.policy,adaptiveFrameDrop:adaptive?.enabled,adaptiveReason:adaptive?.reason,adaptiveSwitching:!!adaptive?.switching,softwarePresenter:activePresenter,softwarePresenterPolicy:presenterPolicy,yuvRejectionReason,yuv:uploader?{...uploader.stats}:undefined,profile:profileEnabled?{...profile}:undefined,pumpTicks:ticks,rendered,renderMs,copyMs,maxRenderMs, heapBytes:engine.HEAPU8.byteLength, epoch:pcmControl.epoch, path:'wasm', decoder:decoderStats?.active?'webcodecs':'software',decoderBackend:decoderStats?.active?'webcodecs':'ffmpeg',webgpu:webgpuDiagnostics(),decoderStats, demuxFormat:control.demuxFormat,seekPrerollSeconds:control.seekPreroll,presentedPosition, ioPending:(Atomics.load(engine.HEAPU32,engine._web_io_ptr()>>>2)&7)===1, ioSerial:Atomics.load(engine.HEAPU32,(engine._web_io_ptr()>>>2)+1), interruptions:Atomics.load(engine.HEAPU32,(engine._web_io_ptr()>>>2)+14), io:ioStats, seeking:control.pendingTarget!==null, position:control.position, queuedFrames:(Atomics.load(audio,0)-Atomics.load(audio,1))>>>0}});if(profileEnabled){profile.diagnosticsPosts++;profile.diagnosticsMs+=performance.now()-diagnosticsStart;}}
  } catch (error) {transition({type:'fail'});retireCommands(Error('Playback pump failed'));clearInterval(timer);post({type:'error',message:String(error.stack || error)}); }
}
let receiveProviderModule;
self.onmessage = async ({data}) => {
  if(data.type==='provider-module'){receiveProviderModule?.(data);receiveProviderModule=undefined;return;}
  if(data.type==='watchdogs')return; // This public Software route has no external decoder watchdog.
  if(profileEnabled)profile.workerMessages++;
  let sourceLease;
  try {
    if(control.closing&&data.type!=='destroy')throw Error('Player closed');
    if(['open','open-file','open-remote','command','seek','subtitle','preview-snapshot','resize'].includes(data.type)&&!control.ready)throw Error('Player is not ready');
    if(data.type==='open'||data.type==='open-file'||data.type==='open-remote'){
      const admission=admitLegacySource(control);control=admission.state;sourceLease=admission.id;
      if(sourceLease===null)throw Error('Source operation unavailable');
      if(adaptive)adaptive=transitionLegacyAdaptiveDecode(adaptive,{type:'reset',now:performance.now(),position:0}).state;
    }
    if (data.type === 'init') {
      if(control.initialized||control.closing)throw Error('Player initialization unavailable');
      transition({type:'init'});
      if (data.disableBrowserCodecs) for (const name of ['VideoDecoder','AudioDecoder','VideoFrame']) Object.defineProperty(globalThis,name,{value:undefined, configurable:true});
      measureOutput=!!data.measureOutput;
      canvas = data.canvas;
      presenterPolicy=data.softwarePresenter??'auto';
      if(presenterPolicy!=='rgb'){
        ({WebGLYUVPresenter:YUVPresenter}=await import('./webgl-yuv-presenter.js'));
        try{installPresenter(canvas);}catch(error){
          if(!String(error).includes('WebGL2 unavailable'))throw error;
          context=canvas.getContext('2d',{alpha:false});activePresenter='rgb';yuvRejectionReason='webgl2-unavailable';
        }
      }else {context=canvas.getContext('2d',{alpha:false});activePresenter='rgb';yuvRejectionReason='forced-rgb';}
      audio = new Int32Array(data.audio, 0, 16);
      pcm = new Float32Array(data.audio, 64);
      if(data.decoder!=='software')throw Error('This build supports software decoding only');
      const createEngine=(await import(uploader?'./engine-software-yuv/player.mjs':'./engine-software-full/player.mjs')).default;
      const compiled = data.verifiedProviderAssets ? await new Promise((resolve,reject)=>{
        receiveProviderModule=result=>result.error?reject(Error(result.error)):resolve(result.module);
        post({type:'provider-module',path:`web/engine-software-${uploader?'yuv':'full'}/player.wasm`});
      }) : uploader||presenterPolicy==='rgb'?data.compiledWasm:undefined;
      if(control.closing)return;
      engine = await createEngine({...preparedEngine(compiled),printErr:message=>post({type:'log',message}),print:message=>post({type:'log',message})});
      if(uploader){engine.failOutput=message=>{transition({type:'fail'});retireCommands(Error('Playback pump failed'));post({type:'error',message});};engine.drawYUV=d=>{try{uploader.draw(engine,d);activePresenter='yuv';yuvRejectionReason=null;}catch(e){engine.failOutput(String(e));}};engine.drawRGB=(ptr,w,h,stride,pts,reason,rotate,swapped,separateOSD)=>{try{uploader.drawRGB(engine,ptr,w,h,stride,pts,rotate,swapped,separateOSD);activePresenter='rgb';yuvRejectionReason=yuvRejections[reason]??'unknown';}catch(e){engine.failOutput(String(e));}};}
      if (control.closing) {engine?.PThread?.terminateAllThreads();return;}
      engine.FS.mkdir('/fonts');
      engine.FS.writeFile('/fonts/DejaVuSans.ttf', new Uint8Array(data.font));
      for(const font of data.fonts??[])engine.FS.writeFile('/fonts/'+font.name,new Uint8Array(font.bytes));
      const fontSize=engine.FS.stat('/fonts/DejaVuSans.ttf').size;
      if(Number(fontSize) !== data.font.byteLength) throw new Error('Subtitle font write failed');
      if(data.decoder==='webcodecs'){
        decoderWorker=new Worker(new URL('./browser-decoder-worker.js',import.meta.url),{type:'module'});
        await new Promise((resolve,reject)=>{
          const deadline=setTimeout(()=>reject(Error('Decoder service initialization timed out')),5000);
          decoderWorker.onmessage=({data:message})=>{
            if(message.ready){clearTimeout(deadline);resolve();}
            if(message.stats)decoderStats=message.stats;
            if(message.wakeup&&!control.closing)engine._web_decoder_wakeup();
            if(message.error)post({type:'log',message:message.error});
          };
          decoderWorker.onerror=error=>{clearTimeout(deadline);reject(Error(error.message));};
          decoderWorker.postMessage({memory:engine.HEAPU8.buffer,pointer:engine._web_decoder_ptr(),disabled:data.disableBrowserCodecs,faultAfter:data.decoderFaultAfter});
        });
        if(control.closing)return;
        engine._web_decoder_enable(1);
      }
      if(control.closing)return;
      audioChannels=data.audioChannels??2;
      if(engine._web_audio_configure(audioChannels)<0)throw Error("Invalid output channel count");
      if(engine._web_configure(data.maxDecodePixels??8294400,data.maxAllocationBytes??134217728)<0)throw Error("Invalid decode resource limits");
      const result = engine._web_create(data.sampleRate);
      if (result < 0) throw new Error(`mpv initialization failed: ${result}`);
      nativeAudio = engine._web_audio_ptr();
      schedulePump();
      adaptive=initialLegacyAdaptiveDecode({codec:data.videoTrack?.codec,codedWidth:data.videoTrack?.width,codedHeight:data.videoTrack?.height,displayWidth:data.displayWidth,displayHeight:data.displayHeight,decodeQuality:data.decodeQuality??'exact',maxDecodePixels:data.maxDecodePixels??8294400},!!data.adaptiveFrameDrop,data.decodePolicy);
      // vd-lavc-o is sampled when mpv opens a decoder. Always retain max_pixels.
      await commandReady(['set','vd-lavc-o',mpvDecoderOptions(adaptive.policy)]);
      await commandReady(['set','vd-lavc-threads',String(adaptive.policy.threads)]);
      if(control.closing)return;transition({type:'ready'});
      post({type:'ready', browserCodecsAbsent:['VideoDecoder','AudioDecoder','VideoFrame'].every(name=>typeof globalThis[name]==='undefined')});
    } else if(data.type==='experimental-context-loss'&&uploader){const ext=uploader.gl.getExtension('WEBGL_lose_context');if(!ext)throw Error('Context loss test unavailable');ext.loseContext();setTimeout(()=>{if(!control.closing)ext.restoreContext();},250);
    } else if (data.type === 'profile') {
      profileEnabled=!!data.enabled;profile=emptyProfile();
    } else if (data.type === 'timing' && engine) {
      Atomics.store(engine.HEAPU32, (nativeAudio >>> 2) + 5, data.latencyUs);
      Atomics.store(engine.HEAPU32, (nativeAudio >>> 2) + 6, +data.running);
    } else if (data.type === 'open-remote' || data.type === 'open-file') {await openRemote(data);
    } else if(data.type==='refreshed'){ioWorker?.postMessage(data);
    } else if(data.type==='preview-snapshot'){
      const next=admitLegacySnapshot(control,data.id);if(next===control)throw Error('Snapshot unavailable');control=next;transition({type:'touch',now:performance.now()});schedulePump(0);
    } else if(data.type==='seek'){transition({type:'seek',target:data.seconds});Atomics.store(audio,2,0);submit(data.id,['seek',String(data.seconds),'absolute+exact']);
    } else if (data.type === 'open') {

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
    } else if (data.type === 'command') {if(uploader?.lost&&data.args[0]==='set'&&data.args[1]==='pause')transition({type:'gpu-intent',paused:data.args[2]==='yes'});submit(data.id,data.args);}
    else if (data.type === 'resize') {transition({type:'touch',now:performance.now()});schedulePump(0);canvas.width=data.width;canvas.height=data.height;transition({type:'invalidate'});}
    else if (data.type === 'destroy') {
      if(control.closing)return;
      let cleanupFailure;const clean=action=>{try{return action();}catch(error){cleanupFailure??=error;}};const cleanAsync=async action=>{try{await action();}catch(error){cleanupFailure??=error;}};
      transition({type:'close'});receiveProviderModule?.({error:'Player closed'});receiveProviderModule=undefined;if(adaptive)adaptive=transitionLegacyAdaptiveDecode(adaptive,{type:'retire'}).state;retireCommands(Error('Player closed'));
      internalCommands.clear();
      clean(()=>clearInterval(timer));
      if (audio) clean(()=>Atomics.store(audio,2,0));
      await cleanAsync(closeIO);
      clean(()=>decoderWorker?.postMessage({type:'cancel'}));
      clean(()=>engine?._web_destroy());if(uploader){clean(()=>uploader.destroy());post({type:'output',data:{kind:'yuv-cleanup',...uploader.stats}});}
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
      post({type:'destroyed',decoderStats});
      self.close();
    }
  } catch (error) {post({type:'error',id:data.id,message:String(error.stack || error)});}finally{if(sourceLease!==undefined&&sourceLease!==null)control=finishLegacySource(control,sourceLease);}
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
