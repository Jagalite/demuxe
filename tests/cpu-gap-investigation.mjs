// SPDX-License-Identifier: Apache-2.0
// Diagnostic instrumentation; these are not publication CPU windows.
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome} from './head-to-head/benchmark-browser.mjs';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const assets=resolve('build/head-to-head/assets-auto-main-a563f345-20260927-02');
const out=`results/cpu-gap-investigation/${new Date().toISOString().replaceAll(':','-')}`;await mkdir(out,{recursive:true});
const server=await serve(assets,resolve('tests/head-to-head'),out+'/requests.jsonl');
const {browser,identity}=await launchBenchmarkChrome({headless:false,startupGate:false});
const report={identity,assets,trials:[],note:'Cadence diagnostic with per-frame instrumentation; not CPU qualification'};
try{
for(const arm of JSON.parse(process.env.ARMS??'["plain-hls","demuxe-hls","plain-copy"]')){
 const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage();
 const trial={arm};report.trials.push(trial);
 try{
 await page.route('**/diagnostic.mp4',r=>r.fulfill({path:resolve('results/cpu-gap-investigation/hevc-copy.mp4'),contentType:'video/mp4'}));
 await page.route('**/fixtures/hls-hevc/*',async r=>{if(arm.includes('corrected'))await r.fulfill({path:resolve('results/cpu-gap-investigation/corrected-hls',new URL(r.request().url()).pathname.split('/').at(-1)),headers:{'Access-Control-Allow-Origin':'*'},contentType:r.request().url().endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp4'});else await r.continue();});
 await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();
 await page.evaluate(async arm=>{
  window.frameLog=[];window.dropLog=[];window.mediaEvents=[];
  const add=document.createElement.bind(document);
  document.createElement=(tag,...args)=>{const e=add(tag,...args);if(tag==='video'){
   window.video=e;let dropped=0;
   const frame=(now,m)=>{const q=e.getVideoPlaybackQuality();frameLog.push({now,media:m.mediaTime,frames:m.presentedFrames,total:q.totalVideoFrames,dropped:q.droppedVideoFrames});if(q.droppedVideoFrames!==dropped){dropLog.push({time:e.currentTime,media:m.mediaTime,from:dropped,to:q.droppedVideoFrames});dropped=q.droppedVideoFrames;}e.requestVideoFrameCallback(frame);};e.requestVideoFrameCallback(frame);
   for(const type of ['waiting','stalled','seeking','seeked','loadedmetadata'])e.addEventListener(type,()=>mediaEvents.push({type,time:e.currentTime}));
  }return e;};
  if(arm.startsWith('demuxe')){window.adapter=await import('/harness/adapters.mjs');await adapter.start({id:'diagnostic',player:'demuxe',lane:'auto',file:'hls-hevc/index.m3u8',streamFormat:'hls'});}
  else{const v=document.createElement('video');document.querySelector('#stage').append(v);v.src=arm==='plain-copy'?'/diagnostic.mp4':'/fixtures/hls-hevc/index.m3u8';await v.play();}
 },arm);
 await page.waitForFunction(()=>video.currentTime>=26,null,{timeout:45000});
 Object.assign(trial,await page.evaluate(()=>({frames:frameLog,drops:dropLog,events:mediaEvents,state:window.adapter?.snapshot(),quality:video.getVideoPlaybackQuality().toJSON?.()??{total:video.getVideoPlaybackQuality().totalVideoFrames,dropped:video.getVideoPlaybackQuality().droppedVideoFrames}})));
 console.log(arm,JSON.stringify(trial.drops));
 }catch(e){trial.error=String(e.stack);console.log(trial.error);}
 finally{await context.close();await writeFile(out+'/results.json',JSON.stringify(report,null,2));}
}
}finally{await browser.close();await server.close();console.log(out);}
