// SPDX-License-Identifier: MIT
import {Player} from '/web/generated/index.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),live=new Set(),NativeWorker=Worker;
globalThis.Worker=class extends NativeWorker{constructor(...args){super(...args);live.add(this);}terminate(){live.delete(this);return super.terminate();}};
window.faultCheck=async(kind,runtime='asyncify',mode='software')=>{
 const result={key:kind,runtime,mode,isolated:crossOriginIsolated,passed:false};const before=await(await fetch('/fault?kind='+kind)).json();
 const host=document.createElement('div');document.querySelector('main').replaceChildren(host);const player=new Player(host,{mode,remuxRuntime:runtime,assetBase:new URL('/',location.href).href,width:320,height:180});
 let backend;
 try{
  const opening=player.openRemote({url:new URL('/fixture/h264-ac3?range=normal',location.href).href}).then(()=>({opened:true}),e=>({code:e.code,message:e.message}));
  if(kind==='hold'){
   const start=performance.now();let status;
   do{await sleep(25);status=await(await fetch('/held-status')).json();}while(status.started===before.started&&performance.now()-start<25000);
   if(status.started===before.started||!status.active)throw Error('No pending native playback source read');
   const closing=performance.now();await player.destroy();result.closeMs=performance.now()-closing;result.open=await opening;
   for(let i=0;i<80;i++){result.held=await(await fetch('/held-status')).json();if(!result.held.active)break;await sleep(25);}
   if(result.closeMs>1500||!result.open.code||result.held.active)throw Error('Cancellation failed to revoke pending source ownership');
  }else{result.open=await opening;if(result.open.code!=='ASSET_LOAD_FAILED')throw Error('Asset fault classification: '+JSON.stringify(result.open));}
  backend=player.current?.backend;await player.destroy();await sleep(150);result.liveWorkers=live.size;result.surfaces=host.querySelectorAll('canvas,video,iframe').length;
  if(result.liveWorkers||result.surfaces)throw Error('Resources survived failed open');result.passed=true;
 }catch(error){result.error=String(error.stack??error);result.diagnostics=player.diagnostics;await player.destroy().catch(e=>result.cleanupError=String(e));result.liveWorkers=live.size;}
 await fetch('/fault?kind=none');await fetch('/result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});return result;
};
