// SPDX-License-Identifier: Apache-2.0
// Same-player Canvas2D/no-draw ablation: decode, audio and mpv clock stay alive.
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {serve} from './head-to-head/server.mjs';
const root=path.resolve(import.meta.dirname,'..');
const assets=path.resolve(process.env.ASSETS??'build/hybrid-presentation/assets-20260923');
const out=path.resolve(process.env.OUT??`results/hybrid-presentation/paired-${Date.now()}`);
const name=process.env.CASE??'h264-ac3',sequence=(process.env.SEQUENCE??'production,canvas-minimal,production').split(',');
const seconds=Number(process.env.SECONDS??8),warmup=Number(process.env.WARMUP??5);
const entry=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')))[name];
await fs.mkdir(out,{recursive:true});
const harness=path.join(out,'harness');await fs.mkdir(harness);
for(const file of ['harness.html','adapters.mjs','component-trials.mjs'])await fs.copyFile(path.join(root,'tests/head-to-head',file),path.join(harness,file));
const adapter=path.join(harness,'adapters.mjs');
await fs.writeFile(adapter,(await fs.readFile(adapter,'utf8')).replace('if(c.componentTrial)window.componentPlayer=player;','window.__presentationPlayer=player;'));
const result={name,sequence,seconds,warmup,phases:[]};const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
const server=await serve(assets,harness,path.join(out,'requests.jsonl'));let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});result.browser=browser.version();
 const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});const page=await context.newPage();
 await page.goto(server.origin+'/harness/harness.html');await page.waitForFunction(()=>window.api);
 await page.evaluate(()=>{globalThis.__hybridPresentationArm='production';});
 await page.evaluate(c=>api.start(c),{id:'demuxe.auto.'+name,player:'demuxe',lane:'auto',fixture:name,...entry});
 await page.waitForFunction(()=>api.snapshot().position>.4&&api.snapshot().diagnostics?.backend?.decoder==='webcodecs');
 await page.waitForTimeout(warmup*1000);
 const cdp=await browser.newBrowserCDPSession();
 const sample=async()=>({at:Date.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo,state:await page.evaluate(()=>({...api.snapshot(),audioOutput:window.__presentationPlayer?.current?.backend?.audioDiagnostics?.()}))});
 for(const arm of sequence){
  await page.evaluate(value=>window.__presentationPlayer.current.backend.worker.postMessage({type:'presentation-arm',arm:value}),arm);
  await page.waitForTimeout(250);
  const first=await sample();await page.waitForTimeout(seconds*1000);const last=await sample();
  const elapsed=(last.at-first.at)/1000,before=new Map(first.processes.map(p=>[p.id,p]));
  if(last.processes.some(p=>!before.has(p.id)))throw Error('Chrome process turnover');
  const processCPU=last.processes.map(p=>({type:p.type,oneCorePercent:100*(p.cpuTime-before.get(p.id).cpuTime)/elapsed}));
  const a=first.state.diagnostics.backend,b=last.state.diagnostics.backend;
  const phase={arm,elapsed,processCPU,totalCPU:processCPU.reduce((n,p)=>n+p.oneCorePercent,0),
    positionAdvance:last.state.position-first.state.position,
    decodeCalls:b.decoderStats.submitted-a.decoderStats.submitted,
    produced:b.decoderStats.frames-a.decoderStats.frames,
    frames:b.presentation.drawn-a.presentation.drawn,
    drawMs:b.presentation.costs.drawMs-a.presentation.costs.drawMs,
    selectMs:b.presentation.costs.selectMs-a.presentation.costs.selectMs,
    retained:b.presentation.retained,pending:b.presentation.pending,
    audioFrames:last.state.audioOutput.mediaFrames-first.state.audioOutput.mediaFrames,
    underruns:last.state.audioOutput.underruns-first.state.audioOutput.underruns};
  result.phases.push(phase);await save();console.log(name,arm,phase.totalCPU.toFixed(1),processCPU.map(p=>p.type+':'+p.oneCorePercent.toFixed(1)).join(','));
  if(Math.abs(phase.positionAdvance-elapsed)>1||phase.decodeCalls<elapsed*25||phase.frames<elapsed*25||phase.underruns)throw Error('Phase playback failed');
 }
 result.cleanup=await page.evaluate(()=>api.stop());await context.close();
}catch(error){result.error=String(error.stack??error);}finally{await browser?.close();await server.close();await save();}
