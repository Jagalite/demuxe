// SPDX-License-Identifier: Apache-2.0
// Diagnostic sampling only; these instrumented runs are not CPU benchmarks.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
const out=path.resolve(process.env.OUT??`results/selective-audio-scheduling/pcm-profile-${new Date().toISOString().replaceAll(':','-')}`);
await mkdir(out,{recursive:false});
await writeFile(path.join(out,'page.html'),'<style>body{margin:0}#surface{width:960px;height:540px}video{width:100%;height:100%}</style><div id="surface"></div>');
const server=await serve({mediaPaths:{movie:'build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures/hevc10-ac3/index.mkv'}});
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
const cdp=await browser.newBrowserCDPSession();
let sequence=0;const pending=new Map();
cdp.on('Target.receivedMessageFromTarget',e=>{const m=JSON.parse(e.message),p=pending.get(e.sessionId+':'+m.id);if(p){pending.delete(e.sessionId+':'+m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}});
function send(sessionId,method,params={}){
 const id=++sequence,key=sessionId+':'+id;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(key);reject(Error('CDP timeout '+method));},15000);
  pending.set(key,{resolve,reject,timer});
  cdp.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method,params})}).catch(reject);
 });
}
const report={purpose:'Sampled JS/Wasm stacks; profiler time is not process CPU attribution',lanes:[]};
try{
 for(const lane of ['split']){
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage();
  await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();
  await page.evaluate(async lane=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));await player.open({url:'/media/movie',format:'file'});await player.play();if(lane==='video-remux'){const b=player.current.backend;await b.mpvAudio.destroy();b.mpvAudio=undefined;}},lane);
  await page.waitForTimeout(5000);
  const info=(await cdp.send('Target.getTargets')).targetInfos.filter(t=>['worker','page'].includes(t.type));
  const entry={lane,targets:[]};report.lanes.push(entry);
  for(const target of info){
   try {const {sessionId}=await cdp.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});
   await send(sessionId,'Profiler.enable');await send(sessionId,'Profiler.setSamplingInterval',{interval:1000});await send(sessionId,'Profiler.start');entry.targets.push({target,sessionId});}catch(e){(entry.errors??=[]).push({target,error:String(e)});}
  }
  await page.waitForTimeout(5000);
  await Promise.all(entry.targets.map(async t=>{t.profile=(await send(t.sessionId,'Profiler.stop')).profile;await cdp.send('Target.detachFromTarget',{sessionId:t.sessionId});}));
  entry.stateBeforeTrace=await page.evaluate(()=>player.diagnostics);
  await page.evaluate(async()=>{await player.pause();await player.seek(3);await player.play();});await page.waitForTimeout(2000);
  entry.processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
  const renderer=entry.processes.filter(p=>p.type==='renderer').sort((a,b)=>b.cpuTime-a.cpuTime)[0];entry.nativeRenderer=renderer;
  console.log('System Trace renderer',renderer.id);
  const trace=spawn('xcrun',['xctrace','record','--template','System Trace','--attach',String(renderer.id),'--time-limit','3s','--no-prompt','--output',out+'/renderer.trace'],{stdio:['ignore','pipe','pipe']});entry.traceLog=[];
  trace.stdout.on('data',b=>entry.traceLog.push(String(b)));trace.stderr.on('data',b=>entry.traceLog.push(String(b)));
  entry.traceExit=await new Promise((resolve,reject)=>{trace.once('exit',resolve);trace.once('error',reject);});

  entry.state=await page.evaluate(()=>player.diagnostics);
  await context.close();await writeFile(path.join(out,'profiles.json'),JSON.stringify(report,null,2));console.log('PROFILE',lane,entry.targets.length);
 }
}finally{await browser.close();await server.close();}
