// SPDX-License-Identifier: Apache-2.0
import {Player} from '/web/generated/index.js';
import {playWithGesture} from './gesture.js';
import {tracePreview} from './trace-preview.js';
export async function probe(){
 const result={config:{id:'adaptive-explicit-8mib'},frames:[],errors:[],trace:[]},stop=tracePreview(result.trace);
 let p;
 try{
  p=new Player(document.querySelector('#surface'),{mode:'native',automaticSelection:false,nativeRemux:'always',remuxRuntime:'off',buffering:{memoryBudget:8*1024*1024},preview:{debounceMs:0,bucketSeconds:0,timeoutMs:15000},startupEscalation:false,experimentalMpvSubtitles:false});
  p.addEventListener('error',e=>result.errors.push({message:e.detail?.message,code:e.detail?.code}));
  await p.openRemote({url:new URL('/media/4k.mp4',location.href).href,immutable:true});
  const started=performance.now();result.preview=await p.preview.getFrame({time:10,width:160,height:90});result.previewMs=performance.now()-started;result.previewDiagnostics=p.preview.diagnostics;
  const playbackStarted=performance.now();try{await playWithGesture(p);}catch(e){result.playError={message:e.message,code:e.code};}
  while(!result.errors.length&&!result.playError&&performance.now()-playbackStarted<8000)await new Promise(r=>setTimeout(r,100));
  result.playbackMs=performance.now()-playbackStarted;result.buffering=p.getBuffering();
  const settings=result.buffering.effective.settings,budgetErrors=result.trace.filter(e=>e.kind.endsWith('-error')&&/coded-data budget/.test(e.message??''));
  result.checks={previewRejected:result.preview===null,previewFailsPromptly:result.previewMs<8000,explicitBudgetFailure:budgetErrors.length>0,playbackFailsPromptly:result.playbackMs<8000&&(result.errors.length>0||!!result.playError),budgetRespected:settings.codedBudgetBytes===8*1024*1024&&settings.budgetGrowths===0};
  result.status=Object.values(result.checks).every(Boolean)?'pass':'fail';
 }catch(e){result.status='fail';result.failure=String(e.stack??e);}finally{await p?.destroy();stop();}
 return result;
}
