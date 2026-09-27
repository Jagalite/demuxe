// SPDX-License-Identifier: Apache-2.0
// Diagnostic instrumentation, not CPU publication or a relaxed qualification gate.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from './head-to-head/benchmark-browser.mjs';
import {validateFrameWindow} from './head-to-head/performance-metrics.mjs';
import {markedImage} from './head-to-head/checks.mjs';
const assets=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
await fs.mkdir(out,{recursive:false});
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=await fs.readFile(path.join(assets,'manifest.json')),manifest=JSON.parse(manifestBytes);
for(const [name,record] of Object.entries(manifest.files))assert.equal(hash(await fs.readFile(path.join(assets,name))),record.sha256,name);
const catalogue=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')));
await fs.copyFile(import.meta.filename,path.join(out,'harness.mjs'));
await fs.copyFile(path.join(import.meta.dirname,'head-to-head/adapters.mjs'),path.join(out,'adapters.mjs'));
await fs.copyFile(path.join(import.meta.dirname,'head-to-head/harness.html'),path.join(out,'harness.html'));
await fs.writeFile(path.join(out,'assets-manifest.json'),manifestBytes);
const report={purpose:'Instrumented HEVC private-runtime diagnosis; not replacement CPU numbers',assetsSHA256:hash(manifestBytes),startedAt:new Date().toISOString(),trials:[]};
const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2)+'\n');
const server=await serve(assets,out,path.join(out,'requests.jsonl'));
let browser;
try{
 console.log('STARTUP_GATE');const launch=await launchBenchmarkChrome({headless:false,startupGate:true});browser=launch.browser;report.browser=launch.identity;await save();console.log('GATE_COMPLETE');
 const browserCDP=await browser.newBrowserCDPSession();report.system=await browserCDP.send('SystemInfo.getInfo');
 for(const [index,lane] of ['auto','jspi','asyncify','plain','plain','asyncify','jspi','auto'].entries()){
  const t={index,lane,startedAt:new Date().toISOString(),media:[],errors:[]};report.trials.push(t);
  const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1}),page=await context.newPage();page.setDefaultTimeout(20000);
  page.on('pageerror',e=>t.errors.push(String(e)));const cdp=await context.newCDPSession(page);
  for(const event of ['playersCreated','playerPropertiesChanged','playerEventsAdded','playerErrorsRaised'])cdp.on('Media.'+event,value=>t.media.push({event,at:Date.now(),value}));
  await cdp.send('Media.enable');
  try{
   await page.goto(server.origin+'/harness/harness.html'+(lane==='jspi'||lane==='asyncify'?'?isolation=off':''));await page.bringToFront();
   await page.evaluate(()=>{
    window.captured=[];window.longTasks=[];window.frameEvents=[];window.mediaEvents=[];
    const append=SourceBuffer.prototype.appendBuffer;
    SourceBuffer.prototype.appendBuffer=function(bytes){const view=bytes instanceof ArrayBuffer?new Uint8Array(bytes):new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.byteLength);captured.push(view.slice());return append.call(this,bytes);};
    new PerformanceObserver(list=>{for(const e of list.getEntries())longTasks.push({at:e.startTime,duration:e.duration});}).observe({type:'longtask',buffered:true});
   });
   const config={...catalogue['hevc10-ac3'],id:'diagnostic.'+index,fixture:'hevc10-ac3',player:lane==='plain'?'video':'demuxe',lane:lane==='plain'?'default':lane,correctness:false};
   if(lane==='plain')config.file='../harness/captured-auto.mp4';
   await page.evaluate(c=>api.start(c),config);await page.waitForFunction(()=>api.snapshot().position>.25);
   await page.evaluate(()=>{
    const video=document.querySelector('video');window.observedVideo=video;
    for(const type of ['waiting','stalled','playing','pause','ratechange','error','resize'])video.addEventListener(type,()=>mediaEvents.push({type,at:performance.now(),time:video.currentTime,readyState:video.readyState}));
    const frame=(now,m)=>{frameEvents.push({now,...m});window.frameToken=video.requestVideoFrameCallback(frame);};window.frameToken=video.requestVideoFrameCallback(frame);
   });
   const initial=await page.evaluate(()=>api.snapshot());t.initialMarker=markedImage(await page.screenshot(),initial.position);assert.ok(t.initialMarker.markerCorrect,'Initial marked image incorrect');
   await delay(5000);
   const snapshot=()=>page.evaluate(()=>{const s=api.snapshot(),v=observedVideo,r=v.getBoundingClientRect(),q=v.getVideoPlaybackQuality();return {...s,video:{time:v.currentTime,total:q.totalVideoFrames,dropped:q.droppedVideoFrames},telemetry:{at:performance.now(),readyState:v.readyState,buffered:Array.from({length:v.buffered.length},(_,i)=>[v.buffered.start(i),v.buffered.end(i)]),rect:{x:r.x,y:r.y,width:r.width,height:r.height},screen:{width:screen.width,height:screen.height,devicePixelRatio},visibility:document.visibilityState,focused:document.hasFocus(),longTasks:longTasks.length,frameCallbacks:frameEvents.length}};});
   t.samples=await collectCpuWindow(browserCDP,snapshot,{seconds:20});t.diagnosticCPU=summarizeCpu(t.samples);
   try{t.quality=validateFrameWindow(t.samples,config,30);t.cadencePassed=true;}catch(e){t.cadencePassed=false;t.cadenceError=String(e);}
   t.events=await page.evaluate(()=>({frames:frameEvents,longTasks,media:mediaEvents}));
   t.actualRuntime=t.samples.at(-1).state.diagnostics?.backend?.remux?.remux;
   if(lane!=='plain')assert.equal(t.actualRuntime?.transport,lane==='auto'?'pthread':lane);
   const endState=await page.evaluate(()=>api.snapshot());t.finalMarker=markedImage(await page.screenshot(),endState.position);assert.ok(t.finalMarker.markerCorrect,'Final marked image incorrect');
   assert.ok(t.samples.every(s=>s.state.visible&&s.state.focused&&!s.state.errors.length),'Foreground/playback error');
   await page.waitForFunction(()=>observedVideo.ended,null,{timeout:15000});
   if(lane!=='plain'&&index<3){
    const bytes=await page.evaluate(()=>{const n=captured.reduce((n,b)=>n+b.length,0),all=new Uint8Array(n);let at=0;for(const b of captured){all.set(b,at);at+=b.length;}let str='';for(let i=0;i<n;i+=8192)str+=String.fromCharCode(...all.subarray(i,i+8192));return btoa(str);});
    const data=Buffer.from(bytes,'base64');await fs.writeFile(path.join(out,'captured-'+lane+'.mp4'),data);t.capture={bytes:data.length,sha256:hash(data)};
   }
   t.cleanup=await page.evaluate(()=>api.stop());await delay(250);assert.equal(page.workers().length,0);
   t.completed=true;
  }catch(error){t.error=String(error.stack??error);}
  finally{await context.close();t.finishedAt=new Date().toISOString();await save();console.log(lane,index,JSON.stringify({completed:t.completed,cadence:t.cadencePassed,cpu:t.diagnosticCPU?.oneCorePercent,error:t.error}));await delay(2000);}
 }
 await browserCDP.detach();
}finally{await browser?.close();await server.close();report.finishedAt=new Date().toISOString();await save();}
const files={};for(const name of await fs.readdir(out)){if(name==='manifest.json')continue;files[name]=hash(await fs.readFile(path.join(out,name)));}
await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify({schema:1,sha256:files},null,2)+'\n');
