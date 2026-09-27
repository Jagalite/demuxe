// SPDX-License-Identifier: MIT
import {createCooperativeEngine} from '../runtime/engine.mjs';
let engine,port,ptr,epoch=-1,posted=0,ack=false,timer,error,contextRunning=false,userPaused=true,lastRunning;
let maxOutstanding=0,feedbackCount=0,staleFeedback=0,pumping=false;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const header=()=>new Uint32Array(engine.raw.memory.buffer,ptr,8);
function pump(){
 if(!engine||!port||error||pumping)return;pumping=true;
 try{
  const h=header(),current=h[3];
  if(current&1)return;
  if(current!==epoch){epoch=current;posted=0;ack=false;lastRunning=undefined;port.postMessage({type:'reset',epoch});return;}
  if(!ack)return;
  const running=!!h[2]&&contextRunning&&!userPaused;
  if(lastRunning!==running){lastRunning=running;port.postMessage({type:'state',epoch,running});}
  if(h[0]<posted||posted<h[1]||h[0]-h[1]>8192)throw Error('Invalid producer/consumer counters');
  while(posted<h[0]){
   const n=Math.min(1024,h[0]-posted),pcm=new Float32Array(n*2),ring=new Float32Array(engine.raw.memory.buffer,ptr+32,8192*8);
   for(let i=0;i<n;i++){const at=((posted+i)%8192)*2;pcm[i*2]=ring[at];pcm[i*2+1]=ring[at+1];}
   port.postMessage({type:'pcm',epoch,start:posted,buffer:pcm.buffer},[pcm.buffer]);posted+=n;
   maxOutstanding=Math.max(maxOutstanding,posted-h[1]);
  }
 }catch(e){error=String(e.stack);postMessage({type:'transportError',error});}finally{pumping=false;}
}
function feedback(d){
 if(d.type==='error'){error=d.error;return;}
 const h=header();if(d.epoch!==epoch||d.epoch!==h[3]){staleFeedback++;return;}
 if(d.type==='resetAck'){ack=true;h[7]=epoch;h[1]=0;pump();}
 if(d.type==='consumed'){
  if(!Number.isInteger(d.frames)||d.frames<h[1]||d.frames>posted){error='Invalid consumption feedback';return;}
  h[7]=epoch;h[1]=d.frames;feedbackCount++;pump();
 }
}
async function invoke(name,...args){if(error)throw Error(error);return engine.call('private_audio_'+name,...args);}
async function checked(name,...args){const r=await invoke(name,...args);if(r<0)throw Error(name+' returned '+r);return r;}
let chain=Promise.resolve();
onmessage=({data:d})=>{chain=chain.then(async()=>{
 try{
  let result;
  if(d.op==='init'){
   if(d.backend==='asyncify')for(const name of ['Suspending','promising'])Object.defineProperty(WebAssembly,name,{value:undefined});
   const {default:createModule}=await import('/candidate/service.mjs');
   engine=await createCooperativeEngine(createModule,await(await fetch('/candidate/service'+(d.backend==='asyncify'?'.asyncify':'')+'.wasm')).arrayBuffer(),d.backend,{print:()=>{},printErr:s=>postMessage({type:'log',message:s})});
   ptr=await invoke('ptr');port=d.port;port.onmessage=({data})=>feedback(data);port.start();
   contextRunning=true;const h=header();h[6]=1;h[5]=0;
   await checked('create',d.rate);timer=setInterval(pump,4);
   result={crossOriginIsolated,sharedArrayBuffer:typeof SharedArrayBuffer,memory:engine.raw.memory.buffer.constructor.name,jspi:typeof WebAssembly.Suspending};
  }else if(d.op==='load'){
   if(d.replace){
    userPaused=true;pump();await invoke('close');pump();
    for(let i=0;i<200&&!ack;i++)await delay(5);
    if(!ack)throw Error('Replacement flush deadline');
    if(await engine.call('demuxe_source_live'))throw Error('Old source handle retained');
    await checked('create',48000);
   }
   engine.source.setSource({size:d.size,read:async(offset,count,signal)=>{
    const r=await fetch(d.url,{headers:{Range:`bytes=${offset}-${offset+count-1}`},signal});
    if(r.status!==206||r.headers.get('Content-Range')!==`bytes ${offset}-${offset+count-1}/${d.size}`)throw Error('Audio range response mismatch');
    const b=new Uint8Array(await r.arrayBuffer());if(b.length!==count)throw Error('Short audio read');return b;
   }});
   await checked('open');let loaded=0;
   for(let i=0;i<1000&&!loaded;i++){loaded=await checked('loaded');if(!loaded)await delay(5);}
   if(!loaded)throw Error('Load deadline');result=await invoke('chains');
  }else if(d.op==='pause'){
   if(d.value){userPaused=true;pump();}
   await checked('pause',d.value?1:0);userPaused=!!d.value;pump();result=true;
  }
  else if(d.op==='speed'){await checked('speed',d.value);result=true;}
  else if(d.op==='seek'){await checked('seek',d.value);pump();result=true;}
  else if(d.op==='context'){contextRunning=d.value;header()[6]=+d.value;pump();result=true;}
  else if(d.op==='status'){
   result={time:await invoke('time'),eof:await invoke('eof'),chains:await invoke('chains'),header:Array.from(header()),epoch,posted,ack,userPaused,maxOutstanding,feedbackCount,staleFeedback,error};
  }else if(d.op==='close'){
   clearInterval(timer);await invoke('close');pump();
   for(let i=0;i<200&&!ack;i++)await delay(5);
   if(!ack)throw Error('Worklet close flush deadline');
   const live=await engine.call('demuxe_source_live');
   result={live,scheduler:engine.scheduler.snapshot(),source:engine.source.snapshot(),maxOutstanding,feedbackCount,error};
   port.close();engine.dispose();engine=null;
  }else throw Error('Unknown audio operation');
  postMessage({id:d.id,result});
 }catch(e){clearInterval(timer);engine?.dispose();postMessage({id:d.id,error:String(e.stack)});}
});};
