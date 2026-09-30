// SPDX-License-Identifier: Apache-2.0
// Diagnostic phase timings, not a controlled performance benchmark.
import {chromium,firefox} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const family=process.env.BROWSER||'chrome';
const out=`results/startup-presentation/${family}-${new Date().toISOString().replaceAll(':','-')}`;
await mkdir(out,{recursive:true});console.log(out);
const browser=await(family==='firefox'?firefox:chromium).launch({headless:true,...(family==='chrome'?{channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']}:{})});
const runs=[];
try{for(const file of (process.env.FILES||'/Volumes/seed2/Projects/startup-repro/stuck.mkv,/Volumes/seed2/Projects/startup-repro/no_audio.mkv').split(','))for(const url of (process.env.PAGES||'/examples/player-presentation.html,/').split(',')){
 const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(60000);
 const run={file,url,browser:browser.version(),baseURL:process.env.BASE_URL||'http://127.0.0.1:4179',prepared:!!process.env.PREPARED};runs.push(run);console.log('START',file,url);
 try{
  await page.goto((process.env.BASE_URL||'http://127.0.0.1:4179')+url);
  await page.evaluate(async()=>{window.viewer=document.querySelector('demuxe-player');window.p=await viewer.ready;window.trace=[];window.t0=performance.now();for(const type of ['inspectionchange','modechange','selectionchange','error'])p.addEventListener(type,e=>trace.push({ms:performance.now()-t0,type,detail:e.detail}));let last='';p.subscribe(s=>{const key=JSON.stringify([s.status,s.pendingOperation?.kind,s.activeMode]);if(key!==last){last=key;trace.push({ms:performance.now()-t0,type:'state',status:s.status,pending:s.pendingOperation,mode:s.activeMode});}});const input=document.createElement('input');input.type='file';input.id='diagnostic-file';document.body.append(input);});
  if(process.env.PREPARED)await page.evaluate(()=>p.preparationReady);
  await page.evaluate(async()=>{const {NativeMpvSubtitles}=await import('/web/generated/internal/native-mpv-subtitles.js');const request=NativeMpvSubtitles.prototype.request;NativeMpvSubtitles.prototype.request=async function(type,...args){const start=performance.now();try{return await request.call(this,type,...args);}finally{if(['init','select','profile'].includes(type))trace.push({type:'subtitle-rpc',request:type,ms:start-t0,duration:performance.now()-start});}};});
  await page.locator('#diagnostic-file').setInputFiles(file);
  if(process.env.READER_CHECK)run.reader=await page.evaluate(async()=>{
    const {LocalFileReader}=await import('/web/file-reader.js');const file=document.querySelector('#diagnostic-file').files[0],reader=new LocalFileReader(file,{cacheBytes:4*1024*1024});
    try{for(const offset of [0,65537,Math.floor(file.size/2),file.size-31]){const size=Math.min(262144,file.size-offset),actual=await reader.read(BigInt(offset),262144),expected=new Uint8Array(await file.slice(offset,offset+size).arrayBuffer());if(actual.length!==expected.length||actual.some((byte,i)=>byte!==expected[i]))throw Error('Reader bytes differ at '+offset);}
     const work=reader.read(123n,262144);reader.beginEpoch();let cancelled=false;try{await work;}catch(e){if(e.name!=='AbortError')throw e;cancelled=true;}if(!cancelled)throw Error('Read was not cancelled');await reader.read(123n,16);return {passed:true,stats:reader.stats};
    }finally{reader.close();}
   });

   if(process.env.READER_BENCH)run.readerComparison=await page.evaluate(()=>new Promise((resolve,reject)=>{const worker=new Worker('/web/reader-comparison.js',{type:'module'});worker.onmessage=({data})=>{worker.terminate();data.error?reject(Error(data.error)):resolve(data);};worker.onerror=e=>{worker.terminate();reject(Error(e.message));};worker.postMessage(document.querySelector('#diagnostic-file').files[0]);}));
  Object.assign(run,await page.evaluate(async()=>{t0=performance.now();trace=[];const start=performance.now();let openMs,playMs,error,progress;try{await Promise.race([(async()=>{await viewer.open(document.querySelector('#diagnostic-file').files[0]);openMs=performance.now()-start;await p.play();playMs=performance.now()-start;const initial=p.state.currentTime;await new Promise(resolve=>setTimeout(resolve,2000));progress={initial,current:p.state.currentTime,status:p.state.status};if(!(progress.current>initial+.5))throw Error('Playback did not advance after readiness: '+JSON.stringify(progress));})(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Diagnostic deadline 60s')),60000))]);}catch(e){error=String(e);}return {openMs,playMs,error,progress,trace,state:p.state,diagnostics:p.diagnostics,resources:performance.getEntriesByType('resource').filter(r=>r.startTime>=start).map(r=>({name:new URL(r.name).pathname,start:r.startTime-start,ms:r.duration,bytes:r.transferSize}))};}));
  if(process.env.LIFECYCLE)run.lifecycle=await page.evaluate(async()=>{
    const samples=[];await p.pause();for(const target of [5,1]){await p.seek(target);const text=await p.current.backend.mpvSubs?.currentText();samples.push({target,position:p.state.currentTime,text});if(Math.abs(p.state.currentTime-target)>.25)throw Error('Seek missed '+target);}
    await p.setPlaybackRate(1.25);await p.play();const before=p.state.currentTime;await new Promise(r=>setTimeout(r,1500));const after=p.state.currentTime;await p.pause();if(after<before+.5)throw Error('Resume did not advance');return {samples,before,after,rate:p.state.playbackRate,plan:p.diagnostics.plan.id};
   });

  console.log(JSON.stringify({file,url,openMs:run.openMs,playMs:run.playMs,error:run.error,progress:run.progress,plan:run.diagnostics?.plan?.id,trace:run.trace}));
 }catch(error){run.error=String(error);console.log('ERROR',run.error);}finally{await context.close();await writeFile(out+'/result.json',JSON.stringify({scope:'Current checkout diagnostic; fresh contexts, uncontrolled filesystem caches; no comparison to last night implied',runs},null,2));}
}}finally{await browser.close();}
if(runs.some(run=>run.error))process.exitCode=1;
