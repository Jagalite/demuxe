// SPDX-License-Identifier: Apache-2.0
// Test-only same-browser presentation CPU campaign. All Hybrid arms keep mpv/WebCodecs/audio.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {serve} from './head-to-head/server.mjs';

const repo=path.resolve(import.meta.dirname,'..');
const assets=path.resolve(process.env.ASSETS??'build/hybrid-presentation/assets-20260923');
const out=path.resolve(process.env.OUT??`results/hybrid-presentation/campaign-${Date.now()}`);
const cases=(process.env.CASES??'h264-ac3').split(',');
const arms=(process.env.ARMS??'production,no-draw,canvas-minimal,webgl2,webgpu,native-video').split(',');
const rounds=Number(process.env.ROUNDS??1),warmup=Number(process.env.WARMUP??4),seconds=Number(process.env.SECONDS??9);
const catalogue=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')));
await fs.mkdir(out,{recursive:true});
const sha=p=>fs.readFile(p).then(bytes=>createHash('sha256').update(bytes).digest('hex'));
const result={gitRevision:'1519377384fffce83896a4da5c911a36013f9a3b',assets,
  hashes:{worker:await sha(path.join(assets,'demuxe/web/filter-retained-engine-worker.js')),
    presenter:await sha(path.join(assets,'demuxe/web/hybrid-presentation-gpu.mjs'))},
  host:{platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model},
  protocol:{rounds,warmup,seconds,headed:true,channel:'chrome'},trials:[]};
for(const name of cases)result.hashes[name]=await sha(path.join(assets,'fixtures',catalogue[name].file));
const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
await save();
const harness=path.join(out,'harness');await fs.mkdir(harness);
for(const file of ['harness.html','adapters.mjs','component-trials.mjs'])await fs.copyFile(path.join(repo,'tests/head-to-head',file),path.join(harness,file));
const adapter=path.join(harness,'adapters.mjs');
await fs.writeFile(adapter,(await fs.readFile(adapter,'utf8')).replace('if(c.componentTrial)window.componentPlayer=player;','window.__presentationPlayer=player;'));
const server=await serve(assets,harness,path.join(out,'requests.jsonl'));
let browser;
try{
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
 result.browser=browser.version();
 const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});
 const page=await context.newPage();
 const cdp=await browser.newBrowserCDPSession();
 result.gpu=(await cdp.send('SystemInfo.getInfo')).gpu?.devices?.map(d=>({vendorId:d.vendorId,deviceId:d.deviceId,deviceString:d.deviceString}));
 for(let round=0;round<rounds;round++)for(const name of cases){
  const order=round%2?arms.toReversed():arms;
  for(const arm of order){
   const record={name,arm,round:round+1,status:'running'};result.trials.push(record);await save();
   const errors=[];const onError=error=>errors.push(String(error));page.on('pageerror',onError);
   try{
    await page.goto(server.origin+'/harness/harness.html');
    await page.evaluate(value=>{globalThis.__hybridPresentationArm=value;},arm);
    await page.waitForFunction(()=>window.api);
    const entry=catalogue[name];
    const config=arm==='native-video'?{id:'video-only.'+name,player:'video',lane:'default',file:name==='h264-ac3'?'video-only-h264-ac3.mp4':name==='hevc10-eac3'?'video-only-hevc10-eac3.mp4':`video-only-${name}.mp4`,video:true,audio:false}:
      {id:'demuxe.auto.'+name,player:'demuxe',lane:'auto',fixture:name,...entry};
    await page.evaluate(c=>api.start(c),config);
    await page.waitForFunction(isNative=>{const s=api.snapshot();return s.position>.4&&(isNative||s.diagnostics?.backend?.decoder==='webcodecs');},arm==='native-video',{timeout:20000});
    await page.waitForTimeout(warmup*1000);
    const sample=async()=>({at:Date.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo,state:await page.evaluate(()=>({
      ...api.snapshot(),audioOutput:window.__presentationPlayer?.current?.backend?.audioDiagnostics?.()
    }))});
    const first=await sample();await page.waitForTimeout(seconds*1000);const last=await sample();
    await page.locator('#stage').screenshot({path:path.join(out,`${name}-${arm}-r${round+1}.png`)});
    const elapsed=(last.at-first.at)/1000,before=new Map(first.processes.map(p=>[p.id,p]));
    if(last.processes.some(p=>!before.has(p.id)))throw Error('Chrome process turnover');
    record.processCPU=last.processes.map(p=>({type:p.type,oneCorePercent:100*(p.cpuTime-before.get(p.id).cpuTime)/elapsed}));
    record.totalCPU=record.processCPU.reduce((n,p)=>n+p.oneCorePercent,0);
    record.elapsed=elapsed;record.advance=last.state.position-first.state.position;
    if(Math.abs(record.advance-elapsed)>1)throw Error('Playback cadence failed');
    if(arm==='native-video'){
      record.frames=last.state.video.total-first.state.video.total;
      record.drops=last.state.video.dropped-first.state.video.dropped;
      if(record.frames<elapsed*25)throw Error('Native video frame cadence failed');
    }else{
      const a=first.state.diagnostics.backend,b=last.state.diagnostics.backend;
      record.route=last.state.route;record.decoder=last.state.diagnostics.backend.decoder;
      record.decodeCalls=b.decoderStats.submitted-a.decoderStats.submitted;
      record.produced=b.decoderStats.frames-a.decoderStats.frames;
      record.frames=b.presentation.drawn-a.presentation.drawn;
      record.received=b.presentation.received-a.presentation.received;
      record.closed=b.presentation.closed-a.presentation.closed;
      record.redraws=b.presentation.redraws-a.presentation.redraws;
      record.peakRetained=b.presentation.peakRetained;record.peakPending=b.presentation.peakPending;
      record.presentationCalls=b.presentation.costs.drawCalls-a.presentation.costs.drawCalls;
      record.drawMs=b.presentation.costs.drawMs-a.presentation.costs.drawMs;
      record.selectMs=b.presentation.costs.selectMs-a.presentation.costs.selectMs;
      record.receiveMs=b.presentation.costs.receiveMs-a.presentation.costs.receiveMs;
      record.subtitleMs=b.presentation.costs.subtitleMs-a.presentation.costs.subtitleMs;
      record.audioFrames=last.state.audioOutput.mediaFrames-first.state.audioOutput.mediaFrames;
      record.underruns=last.state.audioOutput.underruns-first.state.audioOutput.underruns;
      record.lateMs=b.presentation.lateMs;
      record.pts=b.presentation.pts;
      record.drops=record.produced-record.frames;
      if(record.route!=='hybrid'||record.decoder!=='webcodecs'||record.decodeCalls<elapsed*25||record.frames<elapsed*25||record.underruns)throw Error('Hybrid route or playback cadence failed');
    }
    if(errors.length||last.state.errors.length)throw Error('Browser errors: '+errors.concat(last.state.errors).join('; '));
    record.status='passed';record.cleanup=await page.evaluate(()=>api.stop());
   }catch(error){record.status='failed';record.error=String(error.stack??error);record.failureState=await page.evaluate(()=>api.snapshot()).catch(()=>null);}
   finally{page.off('pageerror',onError);await save();console.log(name,arm,round+1,record.status,record.totalCPU?.toFixed(1),record.error?.split('\n')[0]);}
  }
 }
 await context.close();
}finally{await browser?.close();await server.close();await save();}
