// SPDX-License-Identifier: Apache-2.0
// Diagnostic cadence control only; same captured bytes via file and MSE playback.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome,delay} from './head-to-head/benchmark-browser.mjs';
import {validateFrameWindow} from './head-to-head/performance-metrics.mjs';
const input=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
await fs.mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex');
const bytes=await fs.readFile(input);
await fs.writeFile(path.join(out,'captured.mp4'),bytes);
await fs.copyFile(import.meta.filename,path.join(out,'harness.mjs'));
await fs.writeFile(path.join(out,'harness.html'),'<!doctype html><style>body{margin:0;background:black}video{width:960px;height:540px;object-fit:contain}</style><video playsinline></video>');
const report={purpose:'Cadence diagnosis, not CPU publication',input,sha256:hash(bytes),startedAt:new Date().toISOString(),trials:[]};
const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
const server=await serve(out,out,path.join(out,'requests.jsonl'));let browser;
try{
 console.log('STARTUP_GATE');const launch=await launchBenchmarkChrome({headless:false,startupGate:true});browser=launch.browser;report.browser=launch.identity;console.log('GATE_COMPLETE');
 for(const mode of ['mse','file','file','mse']){
  const t={mode,media:[],errors:[]};report.trials.push(t);
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage(),cdp=await context.newCDPSession(page);
  page.on('pageerror',e=>t.errors.push(String(e)));
  for(const event of ['playerPropertiesChanged','playerEventsAdded','playerErrorsRaised'])cdp.on('Media.'+event,value=>t.media.push({event,value}));
  await cdp.send('Media.enable');
  try{
   await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();
   await page.evaluate(async mode=>{
    window.v=document.querySelector('video');window.frames=[];window.events=[];window.longTasks=[];
    new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push({at:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
    for(const type of ['waiting','stalled','playing','pause','error'])v.addEventListener(type,()=>events.push({type,at:performance.now(),time:v.currentTime}));
    const cb=(now,m)=>{frames.push({now,...m});v.requestVideoFrameCallback(cb);};v.requestVideoFrameCallback(cb);
    if(mode==='file')v.src='/harness/captured.mp4';
    else{
     const data=await(await fetch('/harness/captured.mp4')).arrayBuffer();
     const ms=new MediaSource();v.src=URL.createObjectURL(ms);
     await new Promise(resolve=>ms.addEventListener('sourceopen',resolve,{once:true}));
     const sb=ms.addSourceBuffer('video/mp4; codecs="hev1.2.4.L60.90,flac"');
     await new Promise((resolve,reject)=>{sb.addEventListener('updateend',resolve,{once:true});sb.addEventListener('error',()=>reject(Error('MSE append failed')),{once:true});sb.appendBuffer(data);});
     ms.endOfStream();
    }
    await v.play();
   },mode);
   await page.waitForFunction(()=>v.currentTime>1.25);await delay(5000);t.samples=[];
   const start=performance.now();
   for(let i=0;i<=10;i++){
    await delay(Math.max(0,start+i*2000-performance.now()));
    const state=await page.evaluate(()=>{const q=v.getVideoPlaybackQuality();return {position:v.currentTime,video:{total:q.totalVideoFrames,dropped:q.droppedVideoFrames},readyState:v.readyState,paused:v.paused,visible:document.visibilityState,focused:document.hasFocus(),rate:v.playbackRate,buffered:Array.from({length:v.buffered.length},(_,i)=>[v.buffered.start(i),v.buffered.end(i)]),at:performance.now(),callbacks:frames.length,longTasks:longTasks.length};});
    t.samples.push({at:performance.now(),state});
   }
   try{t.quality=validateFrameWindow(t.samples,{player:'video'},30);t.cadencePassed=true;}catch(e){t.cadencePassed=false;t.cadenceError=String(e);}
   t.events=await page.evaluate(()=>({frames,events,longTasks}));
   assert.ok(t.samples.every(s=>s.state.visible==='visible'&&s.state.focused&&s.state.readyState===4));
   assert.equal(page.workers().length,0);t.completed=true;
  }catch(e){t.error=String(e.stack??e);}
  finally{await context.close();await save();console.log(mode,JSON.stringify({cadence:t.cadencePassed,drops:t.samples?.at(-1).state.video.dropped-t.samples?.[0].state.video.dropped,error:t.error}));await delay(2000);}
 }
}finally{await browser?.close();await server.close();report.finishedAt=new Date().toISOString();await save();}
const files={};for(const name of await fs.readdir(out)){if(name!=='manifest.json')files[name]=hash(await fs.readFile(path.join(out,name)));}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({schema:1,sha256:files},null,2)+'\n');
