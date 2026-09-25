// SPDX-License-Identifier: Apache-2.0
// Local, test-only whole-browser CPU campaign. Ablations deliberately lose playback correctness.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {serve} from './head-to-head/server.mjs';

const repo=path.resolve(import.meta.dirname,'..');
const assets=path.resolve(process.env.ASSETS??'build/hybrid-cpu-attribution/assets-main-20260923');
const out=path.resolve(process.env.OUT??`results/hybrid-cpu-attribution/campaign-${Date.now()}`);
const variant=process.env.VARIANT??'baseline';
const cases=(process.env.CASES??'h264-ac3,h264-eac3,h264-dts,hevc10-ac3,hevc10-eac3,hevc10-dts').split(',');
const rounds=Number(process.env.ROUNDS??2),warmup=Number(process.env.WARMUP??4),seconds=Number(process.env.SECONDS??20);
if(!['baseline','instrumented','no-draw','low-diagnostics','audio-off','video-off','paired-draw','paired-simple-draw','paired-audio'].includes(variant))throw Error('Unknown variant');
await fs.mkdir(out,{recursive:true});
const catalogue=JSON.parse(await fs.readFile(path.join(assets,'fixtures/catalogue.json')));
const manifest=JSON.parse(await fs.readFile(path.join(assets,'manifest.json')));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const file of cases){const entry=catalogue[file];if(!entry?.file)throw Error('Missing fixture '+file);const source=path.join(assets,'fixtures',entry.file);if(sha(await fs.readFile(source))!==manifest.files['fixtures/'+entry.file].sha256)throw Error('Fixture hash drift '+file);}
const result={variant,assets,assetManifestSha256:sha(await fs.readFile(path.join(assets,'manifest.json'))),gitRevision:manifest.git_revision,
  host:{platform:os.platform(),release:os.release(),cpu:os.cpus()[0]?.model},protocol:{rounds,warmup,seconds,channel:'chrome',headed:true},trials:[]};
const save=()=>fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
await save();
const harness=path.join(out,'harness');await fs.mkdir(harness);
for(const file of ['harness.html','adapters.mjs','component-trials.mjs'])await fs.copyFile(path.join(repo,'tests/head-to-head',file),path.join(harness,file));
const adapter=path.join(harness,'adapters.mjs');
await fs.writeFile(adapter,(await fs.readFile(adapter,'utf8')).replace('player=new Player(stage,','player=new Player(stage,').replace('if(c.componentTrial)window.componentPlayer=player;','window.__attributionPlayer=player;'));
const server=await serve(assets,harness,path.join(out,'requests.jsonl'));
try{
 for(let round=1;round<=rounds;round++)for(const name of cases){
  const entry=catalogue[name],record={name,round,variant,status:'running',samples:[]};result.trials.push(record);await save();
  let browser,page;
  try{
   browser=await chromium.launch({channel:'chrome',headless:false,args:['--autoplay-policy=no-user-gesture-required']});
   record.browser=browser.version();
   const context=await browser.newContext({viewport:{width:960,height:540},deviceScaleFactor:1});page=await context.newPage();
   page.on('pageerror',error=>(record.errors??=[]).push(String(error)));
   await page.goto(server.origin+'/harness/harness.html');await page.waitForFunction(()=>window.api);
   const config={id:'demuxe.auto.'+name,player:'demuxe',lane:'auto',fixture:name,...entry};
   await page.evaluate(c=>api.start(c),config);
   await page.waitForFunction(()=>{const s=api.snapshot();return s.position>.4&&s.diagnostics?.backend?.decoder==='webcodecs';},null,{timeout:15000});
   if(['audio-off','video-off'].includes(variant))await page.evaluate(async mode=>{const p=window.__attributionPlayer;if(!p)throw Error('Attribution player hook absent');await p.current.backend.command('set',mode==='audio-off'?'aid':'vid','no');},variant);
   await page.waitForTimeout(warmup*1000);
   const cdp=await browser.newBrowserCDPSession();record.gpu=(await cdp.send('SystemInfo.getInfo')).gpu?.devices?.map(d=>({vendorId:d.vendorId,deviceId:d.deviceId,deviceString:d.deviceString}));
   const sample=async()=>({at:Date.now(),processes:(await cdp.send('SystemInfo.getProcessInfo')).processInfo,state:await page.evaluate(()=>({
    ...api.snapshot(),audioOutput:window.__attributionPlayer?.current?.backend?.audioDiagnostics?.()
   }))});
   if(['paired-draw','paired-simple-draw','paired-audio'].includes(variant)){
    record.phases=[];
    const selectedAudio=variant==='paired-audio'?await page.evaluate(()=>api.snapshot().mediaTracks.find(t=>t.type==='audio'&&t.selected)?.id):null;
    if(variant==='paired-audio'&&!selectedAudio)throw Error('No selected audio track for paired ablation');
    for(const enabled of [true,false,true]){
     if(variant==='paired-draw')await page.evaluate(value=>window.__attributionPlayer.current.backend.worker.postMessage({type:'attribution-draw',enabled:value}),enabled);
     else if(variant==='paired-simple-draw')await page.evaluate(value=>window.__attributionPlayer.current.backend.worker.postMessage({type:'attribution-simple',enabled:!value}),enabled);
     else await page.evaluate(({enabled,selectedAudio})=>window.__attributionPlayer.current.backend.command('set','aid',enabled?selectedAudio:'no'),{enabled,selectedAudio});
     await page.waitForTimeout(variant==='paired-audio'?900:200);
     const begin=await sample();await page.waitForTimeout(seconds*1000);const end=await sample();
     const elapsed=(end.at-begin.at)/1000,before=new Map(begin.processes.map(p=>[p.id,p]));
     if(end.processes.some(p=>!before.has(p.id)))throw Error('Browser process turnover');
     const processCPU=end.processes.map(p=>({type:p.type,oneCorePercent:100*(p.cpuTime-before.get(p.id).cpuTime)/elapsed}));
     const startBackend=begin.state.diagnostics.backend,finishBackend=end.state.diagnostics.backend;
     record.phases.push({enabled,elapsed,oneCorePercent:processCPU.reduce((n,p)=>n+p.oneCorePercent,0),processCPU,
      advance:end.state.position-begin.state.position,decodeCalls:finishBackend.decoderStats.submitted-startBackend.decoderStats.submitted,
      framesDrawn:finishBackend.presentation.drawn-startBackend.presentation.drawn,
      audioFrames:end.state.audioOutput.mediaFrames-begin.state.audioOutput.mediaFrames,
      underruns:end.state.audioOutput.underruns-begin.state.audioOutput.underruns});
    }
    if(record.phases.some(p=>Math.abs(p.advance-p.elapsed)>1||p.decodeCalls<p.elapsed*28||p.underruns))throw Error('Paired draw cadence failed');
    if(variant==='paired-audio'&&(record.phases[1].audioFrames!==0||record.phases[0].audioFrames<300000||record.phases[2].audioFrames<300000))throw Error('Paired audio toggle failed');
    record.status='passed';await page.evaluate(()=>api.stop());await context.close();
    continue;
   }
   record.samples.push(await sample());
   for(let i=0;i<seconds;i+=2){await page.waitForTimeout(2000);record.samples.push(await sample());}
   const first=record.samples[0],last=record.samples.at(-1),elapsed=(last.at-first.at)/1000;
   const ids=s=>s.processes.map(p=>p.id).sort().join(',');
   if(record.samples.some(s=>ids(s)!==ids(first)))throw Error('Browser process turnover');
   const cpu=s=>s.processes.reduce((n,p)=>n+p.cpuTime,0);
   record.cpu={elapsed,cpuSeconds:cpu(last)-cpu(first),oneCorePercent:100*(cpu(last)-cpu(first))/elapsed};
   const beforeProcesses=new Map(first.processes.map(p=>[p.id,p]));
   record.processCPU=last.processes.map(p=>({type:p.type,id:p.id,oneCorePercent:100*(p.cpuTime-beforeProcesses.get(p.id).cpuTime)/elapsed}));
   record.advance=last.state.position-first.state.position;
   record.start=first.state;record.end=last.state;
   record.mpv=await page.evaluate(()=>{const backend=window.__attributionPlayer?.current?.backend;return {audioParams:backend?.properties?.get('audio-params')??null,audioOutParams:backend?.properties?.get('audio-out-params')??null,filters:backend?.properties?.get('af')??null};});
   if(variant==='baseline'&&(Math.abs(record.advance-elapsed)>1||last.state.route!=='hybrid'||last.state.diagnostics?.backend?.decoder!=='webcodecs'))throw Error('Playback/route failed qualification');
   if(record.errors?.length||last.state.errors.length)throw Error('Browser errors');
   record.status='passed';
   await page.evaluate(()=>api.stop());await context.close();
  }catch(error){record.status='failed';record.failure=String(error.stack??error);record.failureState=await page?.evaluate(()=>api.snapshot()).catch(()=>null);}
  finally{await browser?.close();delete record.samples;await save();console.log(name,round,variant,record.status,record.cpu?.oneCorePercent,record.failure?.split('\n')[0]);}
 }
}finally{await server.close();await save();}
