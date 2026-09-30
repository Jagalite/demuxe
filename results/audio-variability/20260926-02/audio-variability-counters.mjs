// SPDX-License-Identifier: Apache-2.0
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from './head-to-head/benchmark-browser.mjs';
const out=path.resolve(process.env.OUT??'results/audio-variability/20260926-02');
await writeFile(out+'/page.html','<div id="surface" style="width:960px;height:540px"></div>');
const server=await serve(path.resolve('build/head-to-head/assets-row-refresh-20260926-01'),out,out+'/requests.jsonl');
const result={purpose:'Fixed MP3 software path A/B/A: external single-thread CPU activity intervention. No profiles; diagnostic host-load sensitivity, not published CPU.',trials:[]};
let browser;
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2));
try {
 console.log('STARTUP');const launch=await launchBenchmarkChrome({headless:false,startupGate:true});browser=launch.browser;result.browser=launch.identity;await save();console.log('READY');
 const cdp=await browser.newBrowserCDPSession();
 for(const [name,url] of [['idle-before','/fixtures/audio-mp3/index.mp3'],['external-load','/fixtures/audio-mp3/index.mp3']]){
  const context=await browser.newContext({viewport:{width:960,height:540}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(60000);
  try{
   await page.goto(server.origin+'/harness/page.html');await page.bringToFront();
   await page.evaluate(async url=>{
    const {Player}=await import('/demuxe/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{assetBase:'/demuxe/',mode:'software'});window.errors=[];player.addEventListener('error',e=>errors.push(String(e.detail)));
    await player.open({url,format:'file'});await player.play();window.engine=player.current.backend;
   },url);
   await delay(4000);
   let load;const loadOutput=[];
   if(name==='external-load'){
    load=spawn(process.execPath,['-e',`const start=performance.now(),cpu=process.cpuUsage();let x=1;process.stdout.write('ready\\n');while(performance.now()-start<18000){for(let i=0;i<100000;i++)x=Math.imul(x^i,1664525)+1013904223|0;}console.log(JSON.stringify({x,wall:performance.now()-start,cpu:process.cpuUsage(cpu)}));`],{stdio:['ignore','pipe','pipe']});
    load.stdout.on('data',b=>loadOutput.push(String(b)));await delay(1000);
   }

   const snapshot=()=>page.evaluate(()=>{const e=engine,h=e.audioHeader,w=new Float32Array(e.analyser.fftSize);e.analyser.getFloatTimeDomainData(w);return {mode:player.mode,position:player.state.currentTime,frames:Atomics.load(h,5),underruns:Atomics.load(h,6),sampleRate:e.audioContext.sampleRate,baseLatency:e.audioContext.baseLatency,outputLatency:e.audioContext.outputLatency,rms:Math.sqrt(w.reduce((s,x)=>s+x*x,0)/w.length),diagnostics:e.diagnostics,errors,visible:document.visibilityState,focused:document.hasFocus()};});
   const pids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id);const counters=()=>JSON.parse(execFileSync('python3',['tests/audio-process-counters.py',...pids.map(String)],{encoding:'utf8'}));const nativeBefore=counters();
   const samples=await collectCpuWindow(cdp,snapshot,{seconds:10});const cpu=summarizeCpu(samples),first=samples[0].state,last=samples.at(-1).state;
   const nativeAfter=counters();
   const calibration=await page.evaluate(()=>{
    const runs=[];let x=12345;
    for(let j=0;j<12;j++){const start=performance.now();for(let i=0;i<1000000;i++)x=Math.imul(x^i,1664525)+1013904223|0;runs.push(performance.now()-start);}
    return {runs,checksum:x};
   });
   if(load){await new Promise(resolve=>load.once('exit',resolve));}
   const trial={name,url,cpu,samples,errors,calibration,nativeBefore,nativeAfter,externalLoad:loadOutput};trial.accepted=cpu.processIdsStable&&samples.every(s=>s.state.mode==='software'&&s.state.rms>.01&&!s.state.errors.length&&s.state.focused&&s.state.visible==='visible')&&last.frames-first.frames>470000&&last.underruns===first.underruns&&!errors.length;result.trials.push(trial);await save();console.log(JSON.stringify({name,accepted:trial.accepted,cpu:cpu.oneCorePercent,roles:cpu.roles,calibration,frames:last.frames-first.frames,rms:last.rms}));
  }finally{await context.close();}
 }
}catch(error){result.error=String(error.stack);await save();throw error;}finally{await browser?.close();await server.close();}
