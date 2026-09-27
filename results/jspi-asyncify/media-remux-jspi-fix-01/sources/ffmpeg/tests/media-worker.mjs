// SPDX-License-Identifier: MIT
// Experimental component harness. No Player routing or production assets.
import {createFFmpegBridge} from '../runtime/ffmpeg-bridge.mjs';
import {vp9RemuxConfig} from '/frozen/video-codec-config.js';
let bridge,engine,busy=false;
const send=(type,data={})=>postMessage({type,...data});
self.onmessage=async({data})=>{
 if(data.type==='cancel'){bridge?.cancel();return;}
 if(busy){send('error',{error:'Concurrent harness operation'});return;}
 busy=true;
 try {
  const {runtime,engineURL,size,sourceURL,blobBytes,adapt=0,selectedAudio=-1,target=0,scenario='media'}=data;
  if(runtime==='asyncify')for(const name of ['Suspending','promising'])
   Object.defineProperty(WebAssembly,name,{value:undefined,configurable:false,writable:false});
  const {default:createEngine}=await import(engineURL);
  engine=await createEngine({printErr:message=>send('log',{message})});
  const responseHeaders=Object.fromEntries((await fetch(import.meta.url)).headers);
  const runtimeFacts={runtime,responseHeaders,crossOriginIsolated,sharedArrayBufferAvailable:typeof SharedArrayBuffer==='function',
   memoryType:engine.HEAPU8.buffer.constructor.name,jspiSuspending:typeof WebAssembly.Suspending==='function',
   jspiPromising:typeof WebAssembly.promising==='function'};
  if(runtime==='pthread'){
   if(!crossOriginIsolated||engine.HEAPU8.buffer instanceof ArrayBuffer)throw Error('Wrong pthread environment');
   engine.io=data.mailbox;
  }else{
   if(crossOriginIsolated||typeof SharedArrayBuffer!=='undefined'||!(engine.HEAPU8.buffer instanceof ArrayBuffer))
    throw Error('Wrong private-memory environment');
   bridge=createFFmpegBridge(engine,{timeoutMs:5000});
  }
  engine.tracks=[];engine.raps=[];engine.parseVP9=vp9RemuxConfig;
  let outputBytes=0,fragments=0;
  engine.emit=bytes=>{outputBytes+=bytes.length;if(outputBytes>64*1024*1024)throw Error('Harness output budget');
   fragments++;postMessage({type:'bytes',buffer:bytes.buffer},[bytes.buffer]);};
  let reads=0;
  const reader={size,read:async(offset,count,signal)=>{
   reads++;
   if(scenario==='cancel' || scenario==='reader-failure'){
    if(scenario==='reader-failure')throw Error('injected source failure');
    send('pending');
    return await new Promise((_,reject)=>{
     const abort=()=>reject(Error('observed pending read cancelled'));
     if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
    });
   }
   if(blobBytes)return new Uint8Array(blobBytes).slice(offset,offset+count);
   const response=await fetch(sourceURL,{headers:{Range:`bytes=${offset}-${offset+count-1}`},signal});
   if(response.status!==206||response.headers.get('Content-Range')!==`bytes ${offset}-${offset+count-1}/${size}`)
    throw Error('Invalid HTTP range response');
   const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==count)throw Error('Short HTTP response');
   return bytes;
  }};
  bridge?.setSource(blobBytes&&scenario==='media'?new Blob([blobBytes]):reader);
  const call=(name,returnType='number',types=[],args=[])=>bridge?bridge.call(name,returnType,types,args):engine.ccall(name,returnType,types,args);
  const checked=async(name,types=[],args=[])=>{
   const n=await call(name,'number',types,args);
   if(n<0)throw Error(`${name}: ${n}: ${await call('rm_error','string')}`);
   return n;
  };
  if(adapt)await checked('rm_adapt_audio',['number'],[adapt]);
  if(scenario==='cancel'||scenario==='reader-failure'){
   if(!bridge)throw Error('Fault scenarios require private bridge');
   const status=await call('rm_probe','number',['number'],[size]);
   const failures=bridge.source.drainFailures().map(({kind,cause})=>({kind,cause:String(cause?.message??cause??'')}));
   if(status>=0)throw Error('Expected source failure was accepted');
   if(scenario==='reader-failure'&&!failures.some(f=>f.cause==='injected source failure'))throw Error('Lost source error');
   const requiresDiscard=bridge.requiresDiscard;
   await bridge.destroy();
   send('done',{runtimeFacts,status,failures,reads,requiresDiscard,source:bridge.source.snapshot(),state:bridge.state});return;
  }
  await checked('rm_probe',['number'],[size]);
  const probe={tracks:structuredClone(engine.tracks),format:engine.format,duration:await call('rm_duration')};
  if(scenario==='replace'){
   if(!bridge||!data.replacementBytes)throw Error('Replacement fixture required');
   const generation=bridge.source.generation;
   await call('rm_close',null);bridge.setSource(new Blob([data.replacementBytes]));
   await checked('rm_probe',['number'],[data.replacementBytes.byteLength]);
   const replacement={tracks:structuredClone(engine.tracks),format:engine.format,duration:await call('rm_duration')};
   if(bridge.source.generation<=generation||probe.format===replacement.format)throw Error('Replacement did not change source');
   // Reopen the first source in the same instance, proving replacement is reversible.
   await call('rm_close',null);bridge.setSource(reader);
   await checked('rm_probe',['number'],[size]);
   if(JSON.stringify(engine.tracks)!==JSON.stringify(probe.tracks))throw Error('Original source failed after replacement');
   await bridge.destroy();send('done',{runtimeFacts,probe,replacement,generations:bridge.source.generation,
    source:bridge.source.snapshot(),state:bridge.state});return;
  }
  await checked('rm_open',['number','number','number'],[size,-1,selectedAudio]);
  const codecs={video:await call('rm_video_codec','string'),audio:await call('rm_audio_codec','string')};
  await checked('rm_set_container',['number'],[0]);
  if(scenario==='fatal-output'){
   if(!bridge)throw Error('Fatal scenario requires private bridge');
   const fatal=Error('injected output callback failure');engine.emit=()=>{throw fatal;};
   let failed=false;
   try{await checked('rm_start',['number'],[0]);}catch(error){if(error!==fatal)throw error;failed=true;}
   if(!failed||!bridge.requiresDiscard)throw Error('Unexpected callback failure did not poison instance');
   let retryRejected=false,closeRejected=false;
   try{await call('rm_step');}catch(error){retryRejected=error===fatal;}
   try{await bridge.destroy();}catch(error){closeRejected=error===fatal;}
   if(!retryRejected||!closeRejected)throw Error('Poisoned instance was entered again');
   send('done',{runtimeFacts,requiresDiscard:true,retryRejected,closeRejected,
    source:bridge.source.snapshot(),state:bridge.state});return;
  }
  await checked('rm_start',['number'],[target]);
  let steps=0;while(await checked('rm_step')){if(++steps>4096)throw Error('Harness step budget');}
  const adaptation=engine.adaptation?structuredClone(engine.adaptation):null;
  if(bridge)await bridge.destroy();else await call('rm_close',null);
  send('done',{runtimeFacts,probe,codecs,adaptation,outputBytes,fragments,steps,reads,
   source:bridge?.source.snapshot(),state:bridge?.state??'closed'});
 } catch(error) {
  const sourceFailures=bridge?.source.drainFailures().map(({kind,cause})=>({kind,cause:String(cause?.message??cause??'')}));
  try{if(bridge&&!bridge.requiresDiscard)await bridge.destroy();}catch{}
  send('error',{error:String(error.stack??error),sourceFailures,requiresDiscard:bridge?.requiresDiscard});
 } finally {busy=false;}
};
