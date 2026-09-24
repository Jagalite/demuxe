// SPDX-License-Identifier: Apache-2.0
// Matched old frame scheduler versus the production visual scheduler.
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const digest=data=>createHash('sha256').update(data).digest('hex');
const host='web/generated/internal/native-mpv-subtitles.js',source=await readFile(host,'utf8');
let replaced=0;
const old=source.replace(/this\.applyMode\((?:profile\.mode|result\.mode|mode)\);/g,()=>{replaced++;return "this.applyMode('fallback');";});
assert.equal(replaced,3,'baseline scheduler override changed');
const cases=process.env.CAMPAIGN==='readme'?
 [['srt','build/head-to-head/assets-component-isolation-01/fixtures/h264-srt/index.mkv',2],['mov_text','build/head-to-head/assets-component-isolation-01/fixtures/h264-movtext/index.mp4',2],['static-ass','build/head-to-head/assets-component-isolation-01/fixtures/h264-ass/index.mkv',2]]:
 process.env.CAMPAIGN==='bitmap-readme'?
 [['pgs','build/mpv-subtitle-service/generalization/h264-aac-pgs.mkv',2],['vobsub','build/mpv-subtitle-service/generalization/h264-aac-vobsub.mkv',2]]:
 [['srt','build/head-to-head/assets-component-isolation-01/fixtures/h264-srt/index.mkv',2],['mixed-ass','build/subtitle-mixed-animated.mkv',3.4],['pgs','build/mpv-subtitle-service/generalization/h264-aac-pgs.mkv',2],['vobsub','build/mpv-subtitle-service/generalization/h264-aac-vobsub.mkv',2]];
const steadySeconds=Number(process.env.STEADY_SECONDS??8);
assert.ok(steadySeconds>=8&&steadySeconds<=20);
const fixtures=Object.fromEntries(await Promise.all(cases.map(async([name,path])=>[name,{path,sha256:digest(await readFile(path))}])));
const runtimePaths=[host,'web/mpv-subtitle-worker.js','web/engine-subtitles/service.mjs','web/engine-subtitles/service.wasm'];
const runtime=Object.fromEntries(await Promise.all(runtimePaths.map(async path=>[path,digest(await readFile(path))])));
const report={createdAt:new Date().toISOString(),fixtures,runtime,protocol:{steadySeconds,samples:steadySeconds+1,processMembership:'checked at each sample',modeIntervalMs:50,route:'native-direct-mpv'},trials:[]};
await mkdir('results/subtitle-visual-scheduling',{recursive:true});
const output=`results/subtitle-visual-scheduling/${process.env.CAMPAIGN==='readme'?'raw-readme-cpu':process.env.CAMPAIGN==='bitmap-readme'?'raw-bitmap-readme-cpu':'raw-cpu'}.json`,save=()=>writeFile(output,JSON.stringify(report,null,2)+'\n');
const server=await serve(),sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
 for(const [name] of cases.filter(([name])=>!process.env.SUBTITLE_CASE||process.env.SUBTITLE_CASE===name))for(let pair=Number(process.env.PAIR_START??1);pair<=Number(process.env.PAIRS??(process.env.CAMPAIGN==='readme'?3:2));pair++)for(const mode of pair%2?['old','new']:['new','old'])for(let attempt=1;attempt<=3;attempt++){
  const trial={name,pair,mode,attempt,passed:false};report.trials.push(trial);
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});report.browser=`Chrome ${browser.version()}`;
  const page=await browser.newPage({viewport:{width:960,height:540}});
  try{
   if(mode==='old')await page.route('**/web/generated/internal/native-mpv-subtitles.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:old}));
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async()=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);});
   await page.locator('#media').setInputFiles(fixtures[name].path);await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   assert.equal(await page.evaluate(()=>player.diagnostics.plan.id),'native-direct-mpv');
   const start=cases.find(c=>c[0]===name)[2];await page.evaluate(start=>player.seek(start),start);
   assert.equal(await page.evaluate(()=>player.current.backend.mpvSubs.stats.scheduler),mode==='old'?'frame':'deadline');
   await page.evaluate(()=>player.play());await page.waitForFunction(start=>player.state.currentTime>=start+1.1,start,{timeout:15000});await sleep(1000);
   await page.evaluate(()=>{window.modeSamples=[];window.modeSampler=setInterval(()=>window.modeSamples.push({wall:performance.now(),time:player.state.currentTime,mode:player.current.backend.mpvSubs.stats.scheduler}),50);});
   const cdp=await browser.newBrowserCDPSession();
   const sample=async()=>{
    const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
    const rows=execFileSync('ps',['-o','pid=,rss=','-p',processes.map(p=>p.id).join(',')],{encoding:'utf8'}).trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number));
    const rss=Object.fromEntries(rows.map(([pid,kib])=>[pid,kib]));
    const state=await page.evaluate(()=>({time:player.state.currentTime,status:player.state.status,route:player.diagnostics.plan.id,stats:player.current.backend.mpvSubs.stats,service:player.current.backend.mpvSubs.service}));
    return {wall:performance.now(),processes,rss,state};
   };
   const samples=[await sample()];for(let i=0;i<steadySeconds;i++){await sleep(1000);samples.push(await sample());}
   const first=samples[0],last=samples.at(-1),duration=(last.wall-first.wall)/1000;
   await page.evaluate(()=>clearInterval(window.modeSampler));
   assert.ok(last.state.time-first.state.time>duration-1,`${name} playback stalled`);
   assert.equal(last.state.route,'native-direct-mpv');assert.equal(last.state.service.avChains,0);
   const ids=first.processes.map(p=>p.id).sort((a,b)=>a-b).join(',');
   for(const [index,s] of samples.entries()){
    assert.equal(s.processes.map(p=>p.id).sort((a,b)=>a-b).join(','),ids,`process churn sample ${index}`);
    assert.equal(Object.keys(s.rss).map(Number).sort((a,b)=>a-b).join(','),ids,`RSS gap sample ${index}`);
   }
   const cpu=type=>100*last.processes.filter(p=>type==='total'||p.type===type).reduce((sum,p)=>sum+p.cpuTime-(first.processes.find(q=>q.id===p.id)?.cpuTime??p.cpuTime),0)/duration;
   const before=first.state.service.scheduler??{},after=last.state.service.scheduler??{};
   const modeSamples=await page.evaluate(()=>window.modeSamples);
   const counts=Object.fromEntries(['deadline','animated','frame'].map(m=>[m,modeSamples.filter(x=>x.mode===m).length]));
   trial.measure={duration,mediaAdvance:last.state.time-first.state.time,rendererCpu:cpu('renderer'),totalChromeCpu:cpu('total'),fullRendersPerSecond:((after.fullRenders??0)-(before.fullRenders??0))/duration,stateUpdatesPerSecond:((after.stateUpdates??0)-(before.stateUpdates??0))/duration,modeCounts:counts,modeSamples:modeSamples.length,startTime:first.state.time,endTime:last.state.time};
   await page.evaluate(()=>player.pause());await page.evaluate(()=>player.destroy());for(let i=0;i<50&&page.workers().length;i++)await sleep(100);assert.equal(page.workers().length,0);
   trial.passed=true;
  }catch(error){trial.error=String(error.stack??error);if(attempt>=3||!/process churn|RSS gap/.test(trial.error))throw error;}
  finally{await save();await browser.close();browser=null;}
  if(trial.passed)break;
 }
 for(const [path,hash] of Object.entries(runtime))assert.equal(digest(await readFile(path)),hash,`runtime drift ${path}`);
 report.passed=true;
}catch(error){report.passed=false;report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser?.close().catch(()=>{});await server.close();await save();}
