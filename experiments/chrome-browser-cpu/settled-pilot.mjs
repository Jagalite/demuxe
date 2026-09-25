// SPDX-License-Identifier: Apache-2.0
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from '../../tests/head-to-head/benchmark-browser.mjs';
import {serve} from '../../tests/head-to-head/server.mjs';
import {validateFrameWindow} from '../../tests/head-to-head/performance-metrics.mjs';
const out=path.resolve(process.argv[2]);await fs.mkdir(out,{recursive:false});
const assets=path.resolve('build/head-to-head/assets-release-supplement-20260925-04');
const result={startedAt:new Date().toISOString(),fixtureSHA256:createHash('sha256').update(await fs.readFile(path.join(assets,'fixtures/aac.mp4'))).digest('hex'),arms:[]};
const save=()=>fs.writeFile(path.join(out,'raw.json'),JSON.stringify(result,null,2));
const server=await serve(assets,path.resolve('tests/head-to-head'),path.join(out,'requests.jsonl'));
const {browser,identity}=await launchBenchmarkChrome();result.identity=identity;
const cdp=await browser.newBrowserCDPSession();const events=[];let completed;
cdp.on('Tracing.dataCollected',({value})=>{events.push(...value);completed??=value.find(e=>e.name==='ThreadPool_RunTask'&&e.ph==='X'&&e.args?.src_func==='MaybeMeasureTpmOperations');});
try{
 await cdp.send('Tracing.start',{categories:'toplevel,base',transferMode:'ReportEvents',bufferUsageReportingInterval:500});
 let context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});let page=await context.newPage();await page.goto('about:blank');await page.bringToFront();
 // Stop/read tracing periodically because Chrome may buffer events until tracing ends.
 const start=Date.now();
 await delay(150000);
 const done=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await done;
 await fs.writeFile(path.join(out,'startup-trace.json'),JSON.stringify({traceEvents:events}));
 if(!completed)throw Error('No completed MaybeMeasureTpmOperations event; playback gate remains closed');
 result.startup={waitSeconds:(Date.now()-start)/1000,completedTask:completed};await save();
 console.log('Startup task completion confirmed; tracing OFF. Measuring settled idle.');
 result.idleSamples=await collectCpuWindow(cdp,null,{seconds:20});result.idle=summarizeCpu(result.idleSamples);await context.close();await save();
 const orders=[['plain','auto'],['auto','plain'],['plain','auto']];
 for(let round=0;round<3;round++)for(const arm of orders[round]){
  const rec={round:round+1,arm,errors:[]};result.arms.push(rec);
  context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});page=await context.newPage();page.setDefaultTimeout(15000);
  const config={file:'aac.mp4',frameRate:30,video:true,audio:true,id:arm,fixture:'aac-mp4',player:arm==='plain'?'video':'demuxe',lane:arm==='plain'?'default':'auto'};
  const media=await context.newCDPSession(page);rec.mediaEvents=[];media.on('Media.playerPropertiesChanged',e=>rec.mediaEvents.push(e));await media.send('Media.enable');
  try{
   await page.goto(server.origin+'/harness/harness.html');await page.bringToFront();await page.waitForFunction(()=>window.api);await page.evaluate(c=>api.start(c),config);await page.waitForFunction(()=>api.snapshot().position>.25);
   console.log(`[${result.arms.length}/6] ${arm} round ${round+1}: warmup 5s, measurement 20s`);await delay(5000);
   rec.samples=await collectCpuWindow(cdp,()=>page.evaluate(()=>api.snapshot()),{seconds:20});rec.measurement=summarizeCpu(rec.samples);rec.quality=validateFrameWindow(rec.samples,config,30);
   const first=rec.samples[0],last=rec.samples.at(-1);rec.advance=last.state.position-first.state.position;rec.route=last.state.route;
   if(!rec.measurement.processIdsStable||Math.abs(rec.advance-rec.measurement.wallSeconds)>1||rec.samples.some(s=>!s.state.visible||!s.state.focused||s.state.errors.length)||arm==='auto'&&rec.samples.some(s=>s.state.route!=='native-direct'))throw Error('Process, progression, focus, errors, or route check failed');
   rec.accepted=true;
  }catch(e){rec.accepted=false;rec.errors.push(String(e));}
  finally{try{await page.evaluate(()=>api.stop());await context.close();}catch(e){rec.accepted=false;rec.errors.push('cleanup '+e);}await save();}
  console.log(`${arm}: accepted=${rec.accepted} whole=${rec.measurement?.oneCorePercent?.toFixed(2)} browser=${rec.measurement?.roles?.browser?.toFixed(2)}`);await delay(2000);
 }
}finally{await browser.close();await server.close();result.finishedAt=new Date().toISOString();await save();}
