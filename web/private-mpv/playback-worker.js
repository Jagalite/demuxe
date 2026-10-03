// SPDX-License-Identifier: MIT
// Experimental Backend transport. Qualification and admission are separate.
import {privateMpv, privateMpvSource} from '../private-mpv.js';
import {PrivatePlaybackHost} from './playback-host.js';
import {mpvDecoderOptions} from '../generated/internal/decode-policy.js';
import {admitPlaybackWorkerRPC,finishPlaybackWorkerRPC,createPrivatePlaybackWorker,playbackWorkerAccepts,admitPlaybackWorkerInit,playbackWorkerInitCurrent,finishPlaybackWorkerInit,receivePlaybackWorkerLoad,playbackWorkerLoadCurrent,beginPlaybackWorkerLoad,advancePlaybackWorkerLoad,retirePlaybackWorker,beginPlaybackWorkerClose,finishPlaybackWorkerClose,admitPlaybackWorkerCommand,admitPlaybackWorkerRefresh,settlePlaybackWorkerRequest,playbackWorkerSetting,beginPlaybackWorkerControl,openPlaybackWorkerPresentation,preparePlaybackWorkerCommand,beginPlaybackWorkerSeek,acceptPlaybackWorkerSubtitle,playbackWorkerSubtitleFits,beginPlaybackWorkerPump,playbackWorkerPumpCurrent,finishPlaybackWorkerPump,observePlaybackWorkerRestart,observePlaybackWorkerOutput,beginPlaybackWorkerCapture,finishPlaybackWorkerCapture,acknowledgePlaybackWorkerPicture,pausePlaybackWorkerPresentation,expirePlaybackWorkerPresentation,publishPlaybackWorkerOutput,publishPlaybackWorkerDiagnostics,configurePlaybackWorkerDecode,samplePlaybackWorkerAdaptive,settlePlaybackWorkerAdaptive} from '../generated/internal/machine/private-playback-worker.js';
import {PrivateRetainedPresentation} from './retained-presentation.js';
let engine,host,source,timer,retained,closePromise;
let chain=Promise.resolve(),lifecycle=createPrivatePlaybackWorker();
const loading=new AbortController(),commands=new Map(),refreshes=new Map(),presentations=new Map();
const describe=error=>String(error)+(error?.stack?'\n'+error.stack:'');
const post=value=>postMessage(value);
const replaced=()=>Object.assign(Error('Source replaced'),{code:'SOURCE_REPLACED'});
function rejectPending(error){
 const retired=[...commands.values(),...refreshes.values(),...presentations.values()];commands.clear();refreshes.clear();presentations.clear();
 let failed=false,failure;for(const pending of retired){try{clearTimeout(pending.timer);}catch(cause){if(!failed){failed=true;failure=cause;}}try{pending.reject(error);}catch(cause){if(!failed){failed=true;failure=cause;}}}
 if(failed)throw failure;
}
function assertInit(){if(!playbackWorkerInitCurrent(lifecycle))throw Error('Playback host closing');}
function assertLoad(id){if(!playbackWorkerLoadCurrent(lifecycle,id))throw replaced();}
function advanceLoad(id,input){const result=advancePlaybackWorkerLoad(lifecycle,id,input);lifecycle=result.state;if(!result.accepted)throw replaced();}
function retire(){
 const result=retirePlaybackWorker(lifecycle);lifecycle=result.state;if(!result.revoke)return;
 let failed=false,failure;const cleanup=effect=>{try{effect();}catch(error){if(!failed){failed=true;failure=error;}}};
 cleanup(()=>clearTimeout(timer));cleanup(()=>rejectPending(Error('Playback host closed')));cleanup(()=>loading.abort());cleanup(()=>source?.close());cleanup(()=>engine?.source.cancelSource());
 if(failed)throw failure;
}
function pendingRequest(kind,request,send){
 const map=kind==='command'?commands:refreshes,{id,deadline}=request;
 return new Promise((resolve,reject)=>{
  const pending={resolve,reject,timer:undefined};map.set(id,pending);
  const fail=(input,error)=>{const result=settlePlaybackWorkerRequest(lifecycle,kind,id,input);lifecycle=result.state;if(!result.accepted)return false;map.delete(id);clearTimeout(pending.timer);reject(error);return true;};
  const expire=()=>{if(map.get(id)!==pending)return;try{if(!fail({kind:'deadline',now:performance.now()},Error(kind==='command'?'Native command deadline':'Authorization refresh deadline')))pending.timer=setTimeout(expire,Math.max(0,deadline-performance.now()));}catch(error){fail({kind:'send-error'},error);}};
  try{pending.timer=setTimeout(expire,Math.max(0,deadline-performance.now()));if(map.get(id)===pending)send();}catch(error){fail({kind:'send-error'},error);}
 });
}
async function submit(args,seek,subtitle){
 const admission=admitPlaybackWorkerCommand(lifecycle,seek!==undefined,performance.now());lifecycle=admission.state;
 if(admission.error)throw admission.error==='Source replaced'?replaced():Error(admission.error);
 const {id,request}=admission,reply=pendingRequest('command',request,()=>{});void reply.catch(()=>{});
 if(!commands.has(request.id))return reply;
 // The pump settles native replies independently of the serialized RPC queue.
 try{if(subtitle)await host.addSubtitle(id,...subtitle);else if(seek===undefined)await host.command(id,...args);else await host.seek(id,seek);}
 catch(error){const result=settlePlaybackWorkerRequest(lifecycle,'command',request.id,{kind:'send-error'});lifecycle=result.state;const pending=commands.get(request.id);if(result.accepted&&pending){commands.delete(request.id);clearTimeout(pending.timer);pending.reject(error);}}
 return reply;
}
function requestRefresh(load,sourceGeneration,resource){
 const admission=admitPlaybackWorkerRefresh(lifecycle,load,performance.now());lifecycle=admission.state;if(!admission.request)return Promise.reject(replaced());
 return pendingRequest('refresh',admission.request,()=>post({type:'refresh',generation:sourceGeneration,refreshId:String(admission.request.id),resource}));
}
// Native pause acknowledgment precedes asynchronous capture and UI draw. Fence
// the last picture by identity, then hold unsolicited output until another
// explicit visual operation. Paused seeks and visual commands reopen delivery.
function pausePresentation(){
 const admission=pausePlaybackWorkerPresentation(lifecycle,host.draws,performance.now());lifecycle=admission.state;if(admission.error)return Promise.reject(Error(admission.error));if(!admission.fence)return Promise.resolve();
 const {id,deadline}=admission.fence;
 return new Promise((resolve,reject)=>{
  const pending={resolve,reject,timer:undefined};presentations.set(id,pending);
  const fail=(failed,error)=>{const result=expirePlaybackWorkerPresentation(lifecycle,id,performance.now(),failed);lifecycle=result.state;if(!result.accepted)return false;presentations.delete(id);clearTimeout(pending.timer);reject(error);return true;};
  const expire=()=>{if(presentations.get(id)!==pending)return;try{if(!fail(false,Error('Picture presentation deadline')))pending.timer=setTimeout(expire,Math.max(0,deadline-performance.now()));}catch(error){fail(true,error);}};
  try{pending.timer=setTimeout(expire,Math.max(0,deadline-performance.now()));}catch(error){fail(true,error);}
 });
}
async function considerAdaptive(now){
 const admission=samplePlaybackWorkerAdaptive(lifecycle,{now,position:Number(host.properties['time-pos'])||0,decoderDrops:Number(host.properties['decoder-frame-drop-count'])||0,presentationDrops:Number(host.properties['frame-drop-count'])||0,speed:Number(host.properties.speed)||1,avsync:Number(host.properties.avsync)||0,pausedForCache:!!host.properties['paused-for-cache']});lifecycle=admission.state;
 if(!admission.request)return;const {id,options}=admission.request;
 try{await submit(['set','vd-lavc-o',options]);const result=settlePlaybackWorkerAdaptive(lifecycle,id,true);lifecycle=result.state;}
 catch(error){const result=settlePlaybackWorkerAdaptive(lifecycle,id,false);lifecycle=result.state;if(result.accepted)await fail(error);}
}
async function diagnostics(force=false){
 if(!host)return;const decision=publishPlaybackWorkerDiagnostics(lifecycle,performance.now(),force);lifecycle=decision.state;if(!decision.accepted)return;
 const audio=host.audio?.snapshot?.();
 post({type:'diagnostics',generation:lifecycle.generation,data:{path:'wasm',decoder:retained?'webcodecs':'software',decoderBackend:retained?'webcodecs':'ffmpeg',runtime:engine.runtime,
  plan:retained?'hybrid-private':'software-private',decodePolicy:retained?undefined:lifecycle.decodePolicy,adaptiveFrameDrop:lifecycle.adaptiveFrameDrop,adaptiveReason:lifecycle.adaptiveReason,adaptiveSwitching:!!lifecycle.adaptiveRequest,presentation:retained?{position:host.properties['time-pos']}:undefined,retained:retained?.snapshot(),browserDecoder:engine.decoder?.service.snapshot(),decoderMailbox:engine.decoder?.snapshot(),rendered:host.draws,presentedPosition:host.properties['time-pos'],seeking:lifecycle.target!==null,
  heapBytes:engine.raw.memory.buffer.byteLength,audio,scheduler:engine.scheduler.snapshot(),io:engine.source.snapshot()}});
}
async function pump(){
 if(!host)return;const admission=beginPlaybackWorkerPump(lifecycle);lifecycle=admission.state;if(admission.id===null)return;const id=admission.id;
 try{
  const events=await host.pump(false,!lifecycle.picturePaused&&lifecycle.fences.length===0);if(!playbackWorkerPumpCurrent(lifecycle,id))return;
  for(const event of events){
   if(!playbackWorkerPumpCurrent(lifecycle,id))return;
   if(event.event==='command-reply'){
    const settled=settlePlaybackWorkerRequest(lifecycle,'command',event.id,{kind:'reply'});lifecycle=settled.state;const pending=commands.get(event.id);
    if(settled.accepted&&pending){commands.delete(event.id);clearTimeout(pending.timer);event.error&&event.error!=='success'?pending.reject(Error('Command rejected: '+event.error)):pending.resolve(event.result);}
   }
   if(event.event==='playback-restart')lifecycle=observePlaybackWorkerRestart(lifecycle);
   if(event.event==='property-change'&&event.name==='pause'&&!lifecycle.contextRunning)event.data=lifecycle.userPaused;
   if(event.event==='property-change'&&event.name==='track-list'&&Array.isArray(event.data))event.data=event.data.map(track=>({...track,id:String(track.id)}));
   post({type:'event',generation:lifecycle.generation,event});
   if(event.event==='end-file'&&event.reason==='error')throw Error('Private Software decode failed: '+(event.error??'end-file error'));
  }
  if(!playbackWorkerPumpCurrent(lifecycle,id))return;
  const hasVideo=!!host.properties['track-list']?.some(track=>track.type==='video'&&track.selected),audioReady=!hasVideo&&!!host.properties['track-list']?.some(track=>track.type==='audio'&&track.selected)&&!!host.properties['audio-codec-name'];
  lifecycle=observePlaybackWorkerOutput(lifecycle,{hasVideo,audioReady,position:Number(host.properties['time-pos']),draws:host.draws});
  const capture=beginPlaybackWorkerCapture(lifecycle,host.draws);lifecycle=capture.state;
  if(capture.picture){
   const bitmap=await host.serial(()=>createImageBitmap(host.canvas));const completion=finishPlaybackWorkerCapture(lifecycle,capture.picture.id);lifecycle=completion.state;
   if(!completion.picture){bitmap.close();return;}const {generation,id:pictureId,rendered}=completion.picture;try{postMessage({type:'picture',generation,pictureId,rendered,bitmap},[bitmap]);}catch(error){bitmap.close();throw error;}
  }
  if(!playbackWorkerPumpCurrent(lifecycle,id))return;
  const output=publishPlaybackWorkerOutput(lifecycle,host.draws);lifecycle=output.state;if(output.accepted)post({type:'output',generation:lifecycle.generation,position:host.properties['time-pos'],rendered:host.draws,seeking:lifecycle.target!==null});
  await diagnostics();if(playbackWorkerPumpCurrent(lifecycle,id))void considerAdaptive(performance.now());
 }catch(error){if(playbackWorkerPumpCurrent(lifecycle,id))await fail(error);return;}
 finally{const completion=finishPlaybackWorkerPump(lifecycle,id);lifecycle=completion.state;if(completion.schedule){try{timer=setTimeout(pump,8);}catch(error){void fail(error);}}}
}
function close(){
 if(closePromise)return closePromise;lifecycle=beginPlaybackWorkerClose(lifecycle);
 let resolve,reject;closePromise=new Promise((yes,no)=>{resolve=yes;reject=no;});
 // Shared completion and logical retirement precede abort/source callbacks.
 void(async()=>{let failed=false,failure,result;const record=error=>{if(!failed){failed=true;failure=error;}};try{retire();}catch(error){record(error);}try{result=host?await host.destroy():undefined;}catch(error){record(error);}finally{try{engine?.dispose();}catch(error){record(error);}lifecycle=finishPlaybackWorkerClose(lifecycle);}if(failed)throw failure;return result;})().then(resolve,reject);return closePromise;
}
async function fail(error){let cleanup,cleanupError;try{cleanup=await close();}catch(cause){cleanupError=describe(cause);}post({type:'fatal',error:describe(error),cleanup,cleanupError});}
function validateCommand(args) {
  if (!Array.isArray(args) || !args.length || args.length > 4 || args.some(arg => typeof arg !== 'string' || arg.includes('\0') || arg.length>16384)) throw Error('Invalid playback command');
  if (args[0] === 'set') {
    if(retained&&args[1]==='vf'&&args[2])throw Error('Private Hybrid video filters require Software');
    if (!['vd-lavc-o','cache','cache-secs','demuxer-max-bytes','demuxer-max-back-bytes','pause', 'volume', 'speed', 'aid', 'sid', 'sub-visibility', 'audio-delay', 'sub-delay', 'hr-seek-demuxer-offset','vf','af','sub-font-size','sub-color','sub-border-size','sub-font'].includes(args[1])) throw Error('Unsupported private playback property');
  } else if (!['expand-text', 'frame-step', 'frame-back-step', 'stop'].includes(args[0])) throw Error('Unsupported private playback command');
}
// Account copied command/attachment bytes; Blob/canvas/port identities are
// physical handles, not materialized media bytes. Traversal itself is bounded.
function rpcBytes(value){
 let bytes=0,nodes=0;const seen=new Set(),stack=[[value,0]];
 while(stack.length){const [item,depth]=stack.pop();if(++nodes>4096||depth>16)throw Error('Playback RPC envelope capacity');
  if(typeof item==='string'){bytes+=item.length*2;}else if(item&&typeof item==='object'&&!seen.has(item)){
   seen.add(item);bytes+=64;
   if(item instanceof ArrayBuffer||typeof SharedArrayBuffer!=='undefined'&&item instanceof SharedArrayBuffer)bytes+=item.byteLength;
   else if(ArrayBuffer.isView(item))stack.push([item.buffer,depth+1]);
   else if(!(typeof Blob!=='undefined'&&item instanceof Blob)&&!(typeof MessagePort!=='undefined'&&item instanceof MessagePort)&&!(typeof OffscreenCanvas!=='undefined'&&item instanceof OffscreenCanvas)){
    if(!Array.isArray(item)&&Object.prototype.toString.call(item)!=='[object Object]')throw Error('Unsupported playback RPC envelope');
    for(const key in item)if(Object.prototype.hasOwnProperty.call(item,key)){bytes+=key.length*2;stack.push([item[key],depth+1]);if(stack.length>4096)throw Error('Playback RPC envelope capacity');}
   }
  }
  if(bytes>64*1024*1024)throw Error('Playback RPC byte capacity');
 }return bytes;
}
onmessage = ({data}) => {
  if(data.op==='picture-presented'){const result=acknowledgePlaybackWorkerPicture(lifecycle,data.pictureId);lifecycle=result.state;for(const id of result.resolved){const pending=presentations.get(id);if(pending){presentations.delete(id);clearTimeout(pending.timer);pending.resolve();}}return;}
  if(data.op==='refreshed'){
    const id=Number(data.refreshId),result=settlePlaybackWorkerRequest(lifecycle,'refresh',id,{kind:'reply'});lifecycle=result.state;const pending=refreshes.get(id);
    if(result.accepted&&pending){refreshes.delete(id);clearTimeout(pending.timer);data.error?pending.reject(Error(data.error)):pending.resolve(data.update);}return;
  }
  let rpc;try{const admission=admitPlaybackWorkerRPC(lifecycle,rpcBytes(data),data.op==='close');lifecycle=admission.state;if(admission.id===undefined)throw Error(admission.error);rpc=admission.id;}catch(error){post({id:data.id,error:describe(error)});return;}
  let loadToken=lifecycle.loadSerial;
  try{if(data.op==='load'){const result=receivePlaybackWorkerLoad(lifecycle);lifecycle=result.state;loadToken=result.id;if(result.revoke){clearTimeout(timer);rejectPending(replaced());source?.close();engine?.source.cancelSource();}}
  if(data.op==='close')retire();}
  catch(error){lifecycle=finishPlaybackWorkerRPC(lifecycle,rpc);post({id:data.id,error:describe(error)});void fail(error);return;}
  chain = chain.then(async () => {
    if (!playbackWorkerAccepts(lifecycle,data.op)) throw Error('Playback host closed');
    let result;
    if (data.op === 'init') {
      const admission=admitPlaybackWorkerInit(lifecycle);lifecycle=admission.state;if(admission.error)throw Error(admission.error);
      if(data.mode!==undefined&&!['software','hybrid'].includes(data.mode))throw Error('Invalid private playback mode');
      if(data.mode==='hybrid')retained=new PrivateRetainedPresentation({onCapacity:()=>engine?.decoder?.service.capacityChanged?.()});
      const acquired = await privateMpv(data.runtime, 'playback', {signal: loading.signal,assets:data.playbackAssets,maxDecodePixels:data.maxDecodePixels,canReceiveFrame:(frame,epoch)=>!retained||retained.canReceive(frame,epoch),onFrame:(frame,epoch,id)=>retained?retained.enqueue(frame,epoch,id):frame.close(),onReleaseFrame:(epoch,id)=>retained?.releaseNative(epoch,id)});
      if(!playbackWorkerInitCurrent(lifecycle)){acquired.dispose();throw Error('Playback host closing');}engine=acquired;
      if(retained&&(!engine.decoder||!engine.raw.web_selected_snapshot))throw Error('Private Hybrid engine assets required');
      if (data.font) {engine.module.FS.mkdirTree('/fonts');engine.module.FS.writeFile('/fonts/DejaVuSans.ttf', new Uint8Array(data.font));}
      let fontBytes=0;
      if(!Array.isArray(data.fonts??[])||(data.fonts??[]).length>16)throw Error('Invalid font inventory');
      for(const font of data.fonts??[]){
        if(typeof font.name!=='string'||!/^[a-zA-Z0-9_.:-]{1,128}$/.test(font.name)||font.name==='.'||font.name==='..'||!(font.bytes instanceof ArrayBuffer))throw Error('Invalid font asset');
        fontBytes+=font.bytes.byteLength;if(fontBytes>32*1024*1024)throw Error('Font byte budget');
        engine.module.FS.mkdirTree('/fonts');engine.module.FS.writeFile('/fonts/'+font.name,new Uint8Array(font.bytes));
      }
      const configured = await engine.call('web_configure', data.maxDecodePixels ?? 8294400, data.maxAllocationBytes ?? 128 * 1024 * 1024);
      assertInit();
      if (configured < 0) throw Error('Invalid private decode limits');
      host = new PrivatePlaybackHost(engine, data.canvas, data.width, data.height, {fatalCommandErrors: false,retained,channels:data.channels??2});
      await host.create(new Blob([]), data.port, data.latencyUs);
      assertInit();
      if(!['exact','balanced','performance'].includes(data.decodeQuality??'exact')||data.adaptiveFrameDrop!==undefined&&typeof data.adaptiveFrameDrop!=='boolean')throw Error('Invalid private decode policy');
      lifecycle=configurePlaybackWorkerDecode(lifecycle,{codec:data.videoTrack?.codec,decodeQuality:data.decodeQuality??'exact',maxDecodePixels:data.maxDecodePixels??8294400},!!retained,!!data.adaptiveFrameDrop);
      const completion=finishPlaybackWorkerInit(lifecycle,!!data.contextRunning);lifecycle=completion.state;if(!completion.accepted)throw Error('Playback host closing');host.audio.header()[6]=+lifecycle.contextRunning;
      void pump();result=engine.facts();
    } else if (data.op === 'load') {
      if(typeof (data.demuxer??'')!=='string'||data.demuxer&&!/^[a-z0-9_]{1,64}$/.test(data.demuxer))throw Error('Invalid demuxer hint');
      const previousSubtitles=lifecycle.subtitleCount,admission=beginPlaybackWorkerLoad(lifecycle,loadToken,data.generation,!!source);lifecycle=admission.state;if(!admission.accepted)throw replaced();
      if(source){
        await host.serial(async()=>{await engine.call('web_destroy');host.setNativeDestroyed();});assertLoad(loadToken);
        const old=source;source=undefined;old.close();assertLoad(loadToken);advanceLoad(loadToken,'destroyed');
      }
      for(let i=0;i<previousSubtitles;i++){try{engine.module.FS.unlink('/subtitles/'+i);}catch{}}
      host.resetSource();retained?.clear(0);assertLoad(loadToken);
      const sourceGeneration=lifecycle.generation,refresh=data.canRefresh?resource=>requestRefresh(loadToken,sourceGeneration,resource):undefined;
      source = privateMpvSource(data, refresh);await source.open(engine);
      assertLoad(loadToken);advanceLoad(loadToken,'opened');
      if (!host.created) await host.create(engine.source.source.reader);

      assertLoad(loadToken);advanceLoad(loadToken,'created');host.audio.header()[6] = +lifecycle.contextRunning;
      engine.source.drainFailures();
      host.setSeekPreroll(data.duration);
      void pump();
      if(!retained)await submit(['set','vd-lavc-o',mpvDecoderOptions(lifecycle.decodePolicy)]);
      for (const [name,value] of lifecycle.settings){assertLoad(loadToken);await submit(['set',name,name==='pause'&&!lifecycle.contextRunning?'yes':value]);}
      await submit(['set','demuxer-lavf-format',data.demuxer??'']);
      await submit(['loadfile','brange://source']);advanceLoad(loadToken,'loaded');result={generation:lifecycle.generation};
    } else if (data.op === 'command') {
      validateCommand(data.args);
      lifecycle=preparePlaybackWorkerCommand(lifecycle,data.args);
      result = await submit(data.args);
    } else if(data.op==='snapshot'){
      result=await host.serial(async()=>({blob:await host.canvas.convertToBlob({type:'image/png'}),time:Number(host.properties['time-pos'])||0,width:host.width,height:host.height}));
    } else if(data.op==='subtitle'){
      const sub=data.subtitle;
      if(!sub||!['ass','ssa','srt','vtt'].includes(sub.format)||!(sub.bytes instanceof ArrayBuffer)||!playbackWorkerSubtitleFits(lifecycle,sub.bytes.byteLength))throw Error('Invalid subtitle asset or byte budget');
      if(typeof sub.label!=='string'||sub.label.includes('\0')||sub.label.length>4096||sub.language!==undefined&&(typeof sub.language!=='string'||sub.language.includes('\0')||sub.language.length>256))throw Error('Invalid subtitle metadata');
      lifecycle=openPlaybackWorkerPresentation(lifecycle);
      const path='/subtitles/'+lifecycle.subtitleCount;
      await host.serial(()=>{engine.module.FS.mkdirTree('/subtitles');engine.module.FS.writeFile(path,new Uint8Array(sub.bytes));});
      try{result=await submit([],undefined,[path,sub.label,sub.language??'',!!sub.select]);lifecycle=acceptPlaybackWorkerSubtitle(lifecycle,sub.bytes.byteLength);}
      catch(error){engine.module.FS.unlink(path);throw error;}
    } else if (data.op === 'pause') {
      const control=beginPlaybackWorkerControl(lifecycle,'pause',!!data.value);lifecycle=control.state;
      result=await submit(['set','pause',control.paused?'yes':'no']);if(lifecycle.userPaused)await pausePresentation();
    } else if(data.op==='context'){
      const control=beginPlaybackWorkerControl(lifecycle,'context',!!data.value);lifecycle=control.state;
      if(control.deviceFirst)host.audio.header()[6]=1;
      try{await submit(['set','pause',control.paused?'yes':'no']);}catch(error){if(error.code!=='SOURCE_REPLACED')throw error;}
      if(!playbackWorkerAccepts(lifecycle,data.op))throw Error('Playback host closed');host.audio.header()[6]=+lifecycle.contextRunning;
      host.audio.header()[5]=data.latencyUs??0;host.audio.pump();result=true;
    } else if (data.op === 'seek') {
      lifecycle=openPlaybackWorkerPresentation(lifecycle);
      retained?.clear(data.seconds,engine.decoder?.service.generation);
      lifecycle=beginPlaybackWorkerSeek(lifecycle,data.seconds,host.draws);result=await submit([],data.seconds);
    } else if (data.op === 'resize') {
      if (!Number.isInteger(data.width) || !Number.isInteger(data.height) || data.width < 1 || data.height < 1 || data.width > 1920 || data.height > 1080) throw Error('Invalid dimensions');
      lifecycle=openPlaybackWorkerPresentation(lifecycle);
      await host.serial(() => {host.width = host.canvas.width = data.width;host.height = host.canvas.height = data.height;});result = true;
    } else if (data.op === 'close') result = await close();
    else throw Error('Unknown private playback operation');
    if(!playbackWorkerAccepts(lifecycle,data.op))throw Error('Playback host closed');
    if(!['init','close','context'].includes(data.op)&&loadToken!==lifecycle.loadSerial)throw replaced();
    if(data.op==='load'&&!playbackWorkerLoadCurrent(lifecycle,loadToken))throw replaced();
    post({id:data.id,result});
  }).catch(error => {post({id: data.id, error: describe(error),code:data.op==='init'?'ASSET_LOAD_FAILED':undefined});if (data.op === 'init' || data.op === 'load' && loadToken===lifecycle.loadSerial&&playbackWorkerAccepts(lifecycle,'load')) void fail(error);}).finally(()=>{lifecycle=finishPlaybackWorkerRPC(lifecycle,rpc);});
};
