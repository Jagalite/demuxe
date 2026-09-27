// SPDX-License-Identifier: MIT
import {createCooperativeEngine} from '../runtime/engine.mjs';
let engine,busy=false;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
self.onmessage=async({data:d})=>{
 if(d.type==='cancel'){engine?.source.cancelSource();return;}
 if(busy){postMessage({type:'error',error:'Concurrent service request'});return;}busy=true;
 let module,call;
 try{
  if(d.backend==='asyncify')for(const name of ['Suspending','promising'])Object.defineProperty(WebAssembly,name,{value:undefined});
  const {default:createModule}=await import(d.engineURL);
  if(d.backend==='pthread'){
   module=await createModule({print:()=>{},printErr:s=>postMessage({type:'log',message:s})});
   call=async(name,...args)=>module['_'+name](...args);
  }else{
   const wasm=await(await fetch(d.wasmURL)).arrayBuffer();
   engine=await createCooperativeEngine(createModule,wasm,d.backend,{print:()=>{},printErr:s=>postMessage({type:'log',message:s})});
   module=engine.module;call=engine.call;
  }
  const buffer=()=>engine?engine.raw.memory.buffer:module.HEAPU8.buffer;
  const facts={backend:d.backend,crossOriginIsolated,sharedArrayBufferAvailable:typeof SharedArrayBuffer==='function',memoryType:buffer().constructor.name,
   jspiSuspending:typeof WebAssembly.Suspending==='function',jspiPromising:typeof WebAssembly.promising==='function'};
  const isolated=d.backend==='pthread';
  if(crossOriginIsolated!==isolated||facts.sharedArrayBufferAvailable!==isolated||facts.memoryType!==(isolated?'SharedArrayBuffer':'ArrayBuffer'))throw Error('Wrong isolation environment');
  module.FS.mkdir('/fonts');
  if(d.fontBytes&&!d.attachmentOnly)module.FS.writeFile('/fonts/font.ttf',new Uint8Array(d.fontBytes));
  let reads=0;
  async function source(fixture){
   if(engine){
    engine.source.setSource({size:fixture.size,read:async(offset,count,signal)=>{
     reads++;
     if(d.scenario==='cancel'){
      postMessage({type:'pending'});
      return new Promise((_,reject)=>{const abort=()=>reject(Error('Cancelled pending source read'));if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});
     }
     const response=await fetch(fixture.url,{headers:{Range:`bytes=${offset}-${offset+count-1}`},signal});
     if(response.status!==206||response.headers.get('Content-Range')!==`bytes ${offset}-${offset+count-1}/${fixture.size}`)throw Error('Range response mismatch');
     const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==count)throw Error('Short range response');return bytes;
    }});
   }else{
    await call('web_io_configure',1,BigInt(fixture.size));
    postMessage({type:'mailbox',buffer:buffer(),pointer:await call('web_io_ptr'),fixture});
   }
  }
  async function checked(name,...args){const value=await call(name,...args);if(value<0)throw Error(name+' returned '+value);return value;}
  async function load(fixture){
   await checked('subtitle_service_create');await source(fixture);await checked('subtitle_service_open');
   let loaded=0;
   for(let i=0;i<1000&&!loaded;i++){loaded=await call('subtitle_service_loaded');if(loaded<0)throw Error('mpv load failed');if(!loaded)await pause(5);}
   if(!loaded)throw Error('Load deadline');
   const count=await checked('subtitle_service_track_count');let selected=-1;
   for(let i=0;i<count;i++){const id=await call('subtitle_service_track_id',i);if(id>0){selected=id;break;}}
   if(selected<0)throw Error('No subtitle track');await checked('subtitle_service_select',selected);await pause(20);
   if(await call('subtitle_service_av_chains')!==0)throw Error('Unexpected audio/video chain');
  }
  async function render(time){
   await call('subtitle_service_block',0);let ready=0;
   for(let i=0;i<600&&!ready;i++){const value=await call('subtitle_service_render',time,640,360);ready=value>0;if(!ready)await pause(5);}
   await call('subtitle_service_block',1);if(!ready)throw Error('Render deadline');
   const pointer=await call('web_subtitle_ptr'),header=Array.from(new Int32Array(buffer(),pointer,12));
   if(header[1]!==1||header[2]<=0||header[3]!==0||header[2]!==header[10]*header[11]*4)throw Error('No valid composed pixels: '+header);
   const pixels=new Uint8Array(buffer(),pointer+48,header[2]).slice();
   const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),x=>x.toString(16).padStart(2,'0')).join('');
   if(await call('subtitle_service_av_chains')!==0)throw Error('Unexpected audio/video chain');
   return {time,x:header[8],y:header[9],width:header[10],height:header[11],bytes:header[2],sha256:sha};
  }
  async function close(){
   await call('subtitle_service_close');
   if(engine){
    if(await call('demuxe_source_live')!==0)throw Error('C source handles leaked');
    const s=engine.scheduler.snapshot(),r=engine.source.snapshot();
    if(s.liveTasks||s.retainedTasks||s.timers||r.pending||r.handles||r.timers)throw Error('Service close leaked tasks or source state');
   }
  }
  let frames=[];
  if(d.scenario==='cancel'){
   await checked('subtitle_service_create');await source(d.fixture);await checked('subtitle_service_open');
   let failed=false;
   for(let i=0;i<1000&&!failed;i++){failed=(await call('subtitle_service_loaded'))<0;if(!failed)await pause(5);}
   if(!failed)throw Error('Cancellation did not end loading');await close();
  }else{
   await load(d.fixture);frames.push(await render(1));frames.push(await render(3));
   if(frames[0].sha256===frames[1].sha256)throw Error('Distinct cues rendered identically');
   await checked('subtitle_service_seek',0.5);await pause(30);const replay=await render(1);frames.push(replay);
   if(replay.sha256!==frames[0].sha256)throw Error('Backward seek failed to replay pixels');
   await close();
   // A second source and a second mpv client in the same Wasm instance.
   if(d.fontBytes)module.FS.writeFile('/fonts/font.ttf',new Uint8Array(d.fontBytes));
   await load(d.replacement);frames.push(await render(1));await close();
  }
  const cleanup=engine?{scheduler:engine.scheduler.snapshot(),source:engine.source.snapshot()}:null;
  engine?.dispose();module.PThread?.terminateAllThreads();
  postMessage({type:'done',passed:true,facts,frames,reads,cleanup});
 }catch(error){engine?.dispose();module?.PThread?.terminateAllThreads();postMessage({type:'error',error:String(error.stack??error),scheduler:engine?.scheduler.snapshot(),source:engine?.source.snapshot()});}
 finally{busy=false;}
};
