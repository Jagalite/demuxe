// SPDX-License-Identifier: Apache-2.0
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from './head-to-head/benchmark-browser.mjs';
const out=path.resolve(process.env.OUT??'results/audio-codec-path/20260926-02');
await writeFile(out+'/page.html','<div id="surface" style="width:960px;height:540px"></div>');
const server=await serve(path.resolve('build/head-to-head/assets-row-refresh-20260926-01'),out,out+'/requests.jsonl');
const result={purpose:'Same browser and ordinary software output path: MP3 versus AAC versus copied AC3 elementary stream. Diagnostic steady playback only.',trials:[]};
let browser;
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2));
try {
 console.log('STARTUP');const launch=await launchBenchmarkChrome({headless:false,startupGate:true});browser=launch.browser;result.browser=launch.identity;await save();console.log('READY');
 const cdp=await browser.newBrowserCDPSession();
 for(const [name,url] of [['mp3','/fixtures/audio-mp3/index.mp3'],['aac','/fixtures/audio-aac/index.m4a'],['ac3','/harness/audio.ac3']]){
  const context=await browser.newContext({viewport:{width:960,height:540}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(60000);
  try{
   await page.goto(server.origin+'/harness/page.html');await page.bringToFront();
   await page.evaluate(async url=>{
    const {Player}=await import('/demuxe/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{assetBase:'/demuxe/',mode:'software'});window.errors=[];player.addEventListener('error',e=>errors.push(String(e.detail)));
    await player.open({url,format:'file'});await player.play();window.engine=player.current.backend;
   },url);
   await delay(4000);
   const snapshot=()=>page.evaluate(()=>{const e=engine,h=e.audioHeader,w=new Float32Array(e.analyser.fftSize);e.analyser.getFloatTimeDomainData(w);return {mode:player.mode,position:player.currentTime,frames:Atomics.load(h,5),underruns:Atomics.load(h,6),sampleRate:e.audioContext.sampleRate,baseLatency:e.audioContext.baseLatency,outputLatency:e.audioContext.outputLatency,rms:Math.sqrt(w.reduce((s,x)=>s+x*x,0)/w.length),diagnostics:e.diagnostics,errors,visible:document.visibilityState,focused:document.hasFocus()};});
   const samples=await collectCpuWindow(cdp,snapshot,{seconds:10});const cpu=summarizeCpu(samples),first=samples[0].state,last=samples.at(-1).state;
   const trial={name,url,cpu,samples,errors};trial.accepted=cpu.processIdsStable&&samples.every(s=>s.state.mode==='software'&&s.state.rms>.01&&!s.state.errors.length&&s.state.focused&&s.state.visible==='visible')&&last.frames-first.frames>470000&&last.underruns===first.underruns&&!errors.length;result.trials.push(trial);await save();console.log(JSON.stringify({name,accepted:trial.accepted,cpu:cpu.oneCorePercent,roles:cpu.roles,frames:last.frames-first.frames,rms:last.rms}));
  }finally{await context.close();}
 }
}catch(error){result.error=String(error.stack);await save();throw error;}finally{await browser?.close();await server.close();}
