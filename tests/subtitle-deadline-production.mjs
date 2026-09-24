// SPDX-License-Identifier: Apache-2.0
// Focused production-service A/B: the baseline changes only the scheduler decision.
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const asset='web/generated/internal/native-mpv-subtitles.js';
const source=await readFile(asset,'utf8');
const old=source.replace(/this\.applyMode\((?:profile\.mode|result\.mode|mode)\);/g,"this.applyMode('fallback');");
assert.notEqual(old,source,'baseline scheduler hook changed');
const fixtureRoot='build/head-to-head/assets-component-isolation-01/fixtures';
const cases=[['h264-srt','index.mkv'],['h264-movtext','index.mp4'],['h264-ass','index.mkv']];
const fixtures=Object.fromEntries(await Promise.all(cases.map(async([name,file])=>[name,{path:`${fixtureRoot}/${name}/${file}`,sha256:createHash('sha256').update(await readFile(`${fixtureRoot}/${name}/${file}`)).digest('hex')}])));
const runtimeFiles=[asset,'web/mpv-subtitle-worker.js','web/engine-subtitles/service.mjs','web/engine-subtitles/service.wasm'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const runtime=Object.fromEntries(await Promise.all(runtimeFiles.map(async path=>[path,digest(await readFile(path))])));
const report={createdAt:new Date().toISOString(),browser:'',fixtures,runtime,baselineOverride:'force fallback frame mode; same production Wasm/worker',protocol:{steadySeconds:8,sampleIntervalSeconds:1,processMembership:'all nine steady samples; RSS must include every CDP process'},trials:[]};
const output='results/subtitle-deadline-production';
const pairStart=Number(process.env.PAIR_START??1),pairEnd=Number(process.env.PAIR_END??2);
assert.ok(pairStart>=1&&pairEnd>=pairStart&&pairEnd<=3);
const outputName=process.env.OUTPUT_NAME??'raw-process-gated';
assert.match(outputName,/^[a-z0-9-]+$/);
await mkdir(output,{recursive:true});
const save=()=>writeFile(`${output}/${outputName}.json`,JSON.stringify(report,null,2)+'\n');
const server=await serve();
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
 for(const [name] of cases.filter(([name])=>!process.env.TEST_CASE||name===process.env.TEST_CASE))for(const lane of ['direct','remux'].filter(lane=>!process.env.TEST_LANE||lane===process.env.TEST_LANE))for(let pair=pairStart;pair<=Math.min(pairEnd,lane==='remux'?2:3);pair++)for(const mode of pair%2?['old','new']:['new','old']){
  const trial={name,lane,pair,mode,passed:false};report.trials.push(trial);
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});report.browser=`Chrome ${browser.version()}`;
  const page=await browser.newPage({viewport:{width:960,height:540}});
  try{
   if(mode==='old')await page.route('**/web/generated/internal/native-mpv-subtitles.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:old}));
   await page.goto(server.origin+'/experiment/page.html');
   await page.evaluate(async lane=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),{nativeRemux:lane==='remux'?'always':'auto'});const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);},lane);
   await page.locator('#media').setInputFiles(fixtures[name].path);
   await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
   const initial=await page.evaluate(()=>({route:player.diagnostics.plan.id,scheduler:player.current.backend.mpvSubs?.stats.scheduler}));
   assert.equal(initial.route,lane==='direct'?'native-direct-mpv':'native-remux-mpv');
   assert.equal(initial.scheduler,mode==='new'?'deadline':'frame');
   await page.evaluate(()=>{const sub=player.current.backend.mpvSubs,s=sub.stats;let count=s.bitmapUpdates;window.subtitleBitmapTimes=[];Object.defineProperty(s,'bitmapUpdates',{get(){return count;},set(value){count=value;window.subtitleBitmapTimes.push({mediaTime:sub.video.currentTime,renderPts:s.position,count:value});}});});
   await page.evaluate(()=>player.play());await page.waitForFunction(()=>player.state.currentTime>2,null,{timeout:15000});
   trial.cueStart=await page.evaluate(()=>window.subtitleBitmapTimes.filter(t=>t.mediaTime>=.45&&t.mediaTime<1.5)[0]??null);
   const cdp=await browser.newBrowserCDPSession();
   const sample=async()=>{
    const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
    const rssRows=execFileSync('ps',['-o','pid=,rss=','-p',processes.map(p=>p.id).join(',')],{encoding:'utf8'}).trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number));
    const rssByPid=Object.fromEntries(rssRows.map(([pid,kib])=>[pid,kib]));
    const state=await page.evaluate(()=>({time:player.state.currentTime,status:player.state.status,route:player.diagnostics.plan.id,stats:player.current.backend.mpvSubs.stats,service:player.current.backend.mpvSubs.service}));
    return {wall:performance.now(),processes,rssByPid,state};
   };
   const samples=[await sample()];for(let i=0;i<8;i++){await sleep(1000);samples.push(await sample());}
   const first=samples[0],last=samples.at(-1),duration=(last.wall-first.wall)/1000;
   assert.ok(last.state.time-first.state.time>duration-1,`playback stalled: ${last.state.time-first.state.time}/${duration}`);
   assert.equal(last.state.route,initial.route);assert.equal(last.state.service.avChains,0);
   const cpu=type=>{
    const entries=last.processes.filter(p=>type==='total'||p.type===type);
    return 100*entries.reduce((sum,p)=>sum+p.cpuTime-(first.processes.find(q=>q.id===p.id)?.cpuTime??p.cpuTime),0)/duration;
   };
   const ids=first.processes.map(p=>p.id).sort((a,b)=>a-b).join(',');
   for(const [index,entry] of samples.entries()){
    assert.equal(entry.processes.map(p=>p.id).sort((a,b)=>a-b).join(','),ids,`Chrome process set changed at steady sample ${index}`);
    assert.equal(Object.keys(entry.rssByPid).map(Number).sort((a,b)=>a-b).join(','),ids,`RSS missing a Chrome process at steady sample ${index}`);
   }
   trial.steadySamples=samples.map(entry=>({wall:entry.wall,mediaTime:entry.state.time,processes:entry.processes.map(p=>({id:p.id,type:p.type,cpuTime:p.cpuTime,rssKiB:entry.rssByPid[p.id]}))}));
   const before=first.state.service.scheduler??{},after=last.state.service.scheduler??{};
   trial.measure={duration,route:initial.route,scheduler:initial.scheduler,fullRendersPerSecond:((after.fullRenders??0)-(before.fullRenders??0))/duration,stateUpdatesPerSecond:((after.stateUpdates??0)-(before.stateUpdates??0))/duration,rendererCpu:cpu('renderer'),totalChromeCpu:cpu('total'),workerCpu:null,mediaAdvance:last.state.time-first.state.time};
   await page.evaluate(()=>player.pause());await page.evaluate(()=>player.seek(1));await sleep(250);
   trial.cue=await page.evaluate(async()=>({text:await player.current.backend.mpvSubs.currentText(),avChains:player.current.backend.mpvSubs.service.avChains}));
   if(name!=='h264-ass')assert.equal(trial.cue.text,'DE MUXE TEST 123');
   assert.equal(trial.cue.avChains,0);
   await page.evaluate(()=>player.destroy());for(let i=0;i<50&&page.workers().length;i++)await sleep(100);assert.equal(page.workers().length,0);
   trial.passed=true;
  }catch(error){trial.error=String(error.stack??error);throw error;}
  finally{await save();await browser.close();browser=null;}
 }
 for(const [path,sha256] of Object.entries(runtime))assert.equal(digest(await readFile(path)),sha256,`runtime changed: ${path}`);
 report.passed=true;
}catch(error){report.passed=false;report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser?.close().catch(()=>{});await server.close();await save();}
