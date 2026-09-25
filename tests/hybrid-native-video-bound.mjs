// SPDX-License-Identifier: Apache-2.0
// Same-browser, test-only video-only media-element bound. It has no audio or A/V clock claim.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {chromium} from 'playwright';
import {serve} from './head-to-head/server.mjs';

const repo=path.resolve(import.meta.dirname,'..');
const assets=path.resolve(process.env.ASSETS??'build/hybrid-cpu-attribution/assets-native-video-bound-20260923');
const out=path.resolve(process.env.OUT??`results/hybrid-cpu-attribution/native-video-bound-${Date.now()}`);
const name=process.env.CASE??'h264-ac3';
const fixture=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')))[name];
if(!fixture)throw Error('Unknown fixture');
await fs.mkdir(out,{recursive:true});
const result={case:name,assets,host:{cpu:os.cpus()[0]?.model},phases:[]};
const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
const harness=path.join(out,'harness');await fs.mkdir(harness);
for(const file of ['harness.html','adapters.mjs','component-trials.mjs'])await fs.copyFile(path.join(repo,'tests/head-to-head',file),path.join(harness,file));
const server=await serve(assets,harness,path.join(out,'requests.jsonl'));
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
 result.browser=browser.version();
 const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
 const page=await context.newPage(),cdp=await browser.newBrowserCDPSession();
 for(const kind of ['hybrid','native-video','hybrid']){
  const phase={kind,status:'running'};result.phases.push(phase);await save();
  try{
   await page.goto(server.origin+'/harness/harness.html');await page.waitForFunction(()=>window.api);
   const config=kind==='hybrid'?{id:'demuxe.auto.'+name,player:'demuxe',lane:'auto',...fixture}:
    {id:'video-only.'+name,player:'video',lane:'default',file:`video-only-${name}.mp4`,video:true,audio:false};
   await page.evaluate(c=>api.start(c),config);
   await page.waitForFunction(()=>api.snapshot().position>.3);
   await page.waitForTimeout(5000);
   const sample=async()=>({at:Date.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo,state:await page.evaluate(()=>api.snapshot())});
   const first=await sample();await page.waitForTimeout(8000);const last=await sample();
   const elapsed=(last.at-first.at)/1000,before=new Map(first.processes.map(p=>[p.id,p]));
   if(last.processes.some(p=>!before.has(p.id)))throw Error('Process turnover');
   phase.processCPU=last.processes.map(p=>({type:p.type,oneCorePercent:100*(p.cpuTime-before.get(p.id).cpuTime)/elapsed}));
   phase.oneCorePercent=phase.processCPU.reduce((n,p)=>n+p.oneCorePercent,0);
   phase.elapsed=elapsed;phase.advance=last.state.position-first.state.position;
   if(Math.abs(phase.advance-elapsed)>1)throw Error('Playback cadence failed');
   if(kind==='hybrid'){
    phase.route=last.state.route;phase.decodeCalls=last.state.diagnostics.backend.decoderStats.submitted-first.state.diagnostics.backend.decoderStats.submitted;
    phase.draws=last.state.diagnostics.backend.presentation.drawn-first.state.diagnostics.backend.presentation.drawn;
    if(phase.route!=='hybrid'||phase.decodeCalls<elapsed*28||phase.draws<elapsed*28)throw Error('Hybrid video output failed');
   }else{
    phase.videoFrames=last.state.video.total-first.state.video.total;
    phase.dropped=last.state.video.dropped-first.state.video.dropped;
    if(phase.videoFrames<elapsed*28||phase.dropped>1)throw Error('Native video output failed');
   }
   phase.status='passed';phase.cleanup=await page.evaluate(()=>api.stop());
  }catch(error){phase.status='failed';phase.error=String(error.stack??error);break;}
  finally{await save();console.log(kind,phase.status,phase.oneCorePercent,phase.error?.split('\n')[0]);}
 }
 await context.close();
}finally{await browser?.close();await server.close();await save();}
