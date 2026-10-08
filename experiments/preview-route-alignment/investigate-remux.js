// SPDX-License-Identifier: Apache-2.0
import {Player} from '/web/generated/index.js';
import {playWithGesture} from './gesture.js';
async function frameSummary(f){
 if(!f)return null;
 const image=await createImageBitmap(f.image.blob),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const context=canvas.getContext('2d');context.drawImage(image,0,0);image.close();
 const pixels=context.getImageData(8,8,16,16).data,rgb=[0,0,0];for(let i=0;i<pixels.length;i+=4)for(let c=0;c<3;c++)rgb[c]+=pixels[i+c];
 return {time:f.time,path:f.path,width:f.width,height:f.height,rgb:rgb.map(v=>Math.round(v/(pixels.length/4))),dataURL:canvas.toDataURL('image/png')};
}
export async function probe(config){
 const result={config,frames:[],samples:[],errors:[]};let p;const stopTrace=config.trace?await (await import('./trace-preview.js')).tracePreview(result.trace=[]):()=>{};
 try{
  p=new Player(document.querySelector('#surface'),{mode:'native',automaticSelection:false,nativeRemux:'always',remuxRuntime:config.runtime??'off',preview:config.preview?{debounceMs:0,bucketSeconds:0,timeoutMs:15000}:false,buffering:config.budget===undefined?undefined:{memoryBudget:config.budget*1024*1024},startupEscalation:false,experimentalMpvSubtitles:false});
  p.addEventListener('error',e=>result.errors.push({time:p.state.currentTime,message:e.detail?.message,code:e.detail?.code}));
  await p.openRemote({url:new URL('/media/4k.mp4',location.href).href,immutable:true});
  await playWithGesture(p);const start=performance.now();
  const preview=config.preview?(async()=>{while(p.state.currentTime<(config.previewStartSeconds??0)&&performance.now()-start<10000)await new Promise(r=>setTimeout(r,100));return p.preview.getFrame({time:10,width:160,height:90});})().then(async f=>{result.preview=await frameSummary(f);}).catch(e=>{result.preview={error:e.message,name:e.name};}):Promise.resolve();
  while(performance.now()-start<26000&&p.state.currentTime<23){
   result.samples.push({wallMs:performance.now()-start,time:p.state.currentTime,status:p.state.status,diagnostics:p.current.backend.diagnostics});
   if(result.errors.length)break;await new Promise(r=>setTimeout(r,200));
  }
  await preview;if(config.preview){await p.pause();await new Promise(r=>setTimeout(r,500));try{const f=await p.preview.getFrame({time:10,width:160,height:90});result.pausedPreview=await frameSummary(f);}catch(e){result.pausedPreview={error:e.message,name:e.name};}result.previewDiagnostics=p.preview.diagnostics;}result.finalTime=p.state.currentTime;result.buffering=p.getBuffering();result.playbackStatus=result.finalTime>23&&result.errors.length===0?'pass':'fail';result.status=result.playbackStatus==='pass'&&(!config.preview||(result.preview?.path&&result.pausedPreview?.path))?'pass':'fail';
 }catch(e){result.status='fail';result.failure=String(e.stack??e);}finally{await p?.destroy();stopTrace();}
 return result;
}
