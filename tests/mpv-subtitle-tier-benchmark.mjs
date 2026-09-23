// SPDX-License-Identifier: Apache-2.0
// Current-tree whole-player Hybrid versus automatic Native+mpv subtitle campaign.
import {chromium} from 'playwright';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';

const root='build/head-to-head/assets-component-isolation-01/fixtures';
const cases=['h264-srt','h264-ass'];
const output='results/head-to-head/mpv-subtitle-tier-20260923-06';
const assetRoot=process.env.DEMUXE_TEST_ASSET_ROOT??'.';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fixtures=Object.fromEntries(await Promise.all(cases.map(async name=>[name,{path:`${root}/${name}/index.mkv`,sha256:sha(await readFile(`${root}/${name}/index.mkv`))}])));
const runtime=Object.fromEntries(await Promise.all(['web/generated/unified-player.js','web/generated/internal/native-player.js','web/generated/internal/native-mpv-subtitles.js','web/mpv-subtitle-worker.js','web/engine-subtitles/service.mjs','web/engine-subtitles/service.wasm'].map(async name=>[name,sha(await readFile(`${assetRoot}/${name}`))])));
const report={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),createdAt:new Date().toISOString(),browser:null,fixtures,runtime,assetRoot,protocol:{pairs:3,order:'alternating',maxRetriesPerLane:3,retryOnly:'Native Remux substituted for Direct, or Chrome process set changed during steady samples',warmupSeconds:2,steadySeconds:8,steadySampleIntervalSeconds:1,chrome:'fresh headless Chrome for each trial',cpu:'CDP process-family CPU time divided by steady wall time, one-core percent; reject process churn',rss:'maximum of one-second summed Chrome process RSS samples; shared pages may double count',mainThread:'renderer CDP TaskDuration and ScriptDuration deltas',startup:'open through play and >0.5 second media progression',seek:'API seek completion to 10 and 1 seconds',eof:'playback ended event after seek to 35 seconds',limitations:'Single shared macOS host; no competitor campaign; browser GPU and OS media-service CPU outside CDP family. Trials are local synthetic stereo fixtures.'},trials:[]};
await mkdir(output,{recursive:true});
const save=()=>writeFile(`${output}/result.json`,JSON.stringify(report,null,2)+'\n');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const server=await serve({assetRoot});
let browser;
try{
  for(const name of cases)for(let pair=1;pair<=3;pair++)for(const lane of pair%2?['hybrid','native-mpv']:['native-mpv','hybrid']){
    let accepted=false;
    for(let retry=1;retry<=3&&!accepted;retry++){
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});
    report.browser=`Chrome ${browser.version()}`;
    const page=await browser.newPage({viewport:{width:960,height:540}});
    await page.goto(server.origin+'/experiment/page.html');
    const cdp=await browser.newBrowserCDPSession(),renderer=await page.context().newCDPSession(page);
    await renderer.send('Performance.enable');
    const sample=async()=>{
      const processes=(await cdp.send('SystemInfo.getProcessInfo')).processInfo;
      const metrics=Object.fromEntries((await renderer.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
      const rssRows=execFileSync('ps',['-o','pid=,rss=','-p',processes.map(p=>p.id).join(',')],{encoding:'utf8'}).trim().split('\n').map(line=>line.trim().split(/\s+/).map(Number));
      const rss=Object.fromEntries(rssRows.map(([pid,kib])=>[pid,kib]));
      return {wall:performance.now(),processes,metrics,rssKiB:Object.values(rss).reduce((a,b)=>a+b,0),rssByPid:rss,workers:page.workers().map(w=>w.url()),state:await page.evaluate(()=>window.player?{time:player.state.currentTime,ended:player.state.status==='ended',mode:player.state.activeMode,plan:player.diagnostics.plan?.id,selection:player.diagnostics.selection,backend:player.diagnostics.backend}:null)};
    };
    const delta=(a,b)=>b.processes.reduce((sum,p)=>sum+p.cpuTime-a.processes.find(q=>q.id===p.id).cpuTime,0);
    const trial={name,pair,lane,retry,passed:false};report.trials.push(trial);
    try{
      const start=performance.now();
      await page.evaluate(async lane=>{const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'),lane==='hybrid'?{mode:'hybrid'}:{});const input=document.createElement('input');input.type='file';input.id='media';document.body.append(input);},lane);
      await page.locator('#media').setInputFiles(fixtures[name].path);
      await page.evaluate(()=>player.open(document.querySelector('#media').files[0]));
      await page.evaluate(()=>player.play());
      await page.waitForFunction(()=>player.state.currentTime>.5,null,{timeout:15000});
      trial.startupMs=performance.now()-start;
      trial.open=await sample();
      assert.equal(trial.open.state.plan,lane==='hybrid'?'hybrid':'native-direct-mpv');
      await sleep(2000);const samples=[await sample()];
      for(let i=0;i<8;i++){await sleep(1000);samples.push(await sample());}
      const first=samples[0],last=samples.at(-1);
      const wall=(last.wall-first.wall)/1000;
      assert.ok(last.state.time-first.state.time>wall-1,'Steady playback stalled');
      assert.equal(last.state.backend.mpvSubtitles?.avChains??0,0);
      const ids=first.processes.map(p=>p.id).sort((a,b)=>a-b).join(',');
      for(const [index,entry] of samples.entries()){
        assert.equal(entry.processes.map(p=>p.id).sort((a,b)=>a-b).join(','),ids,`Chrome process set changed at steady sample ${index}`);
        assert.equal(Object.keys(entry.rssByPid).map(Number).sort((a,b)=>a-b).join(','),ids,`RSS missing a Chrome process at steady sample ${index}`);
      }
      trial.steadySamples=samples.map(entry=>({wall:entry.wall,processes:entry.processes.map(p=>({id:p.id,type:p.type,cpuTime:p.cpuTime,rssKiB:entry.rssByPid[p.id]})),rssKiB:entry.rssKiB,taskDuration:entry.metrics.TaskDuration,scriptDuration:entry.metrics.ScriptDuration}));
      trial.steady={wallSeconds:wall,cpuSeconds:delta(first,last),oneCorePercent:100*delta(first,last)/wall,peakSampledSummedRssKiB:Math.max(...samples.map(entry=>entry.rssKiB)),mainThreadTaskSeconds:last.metrics.TaskDuration-first.metrics.TaskDuration,mainThreadScriptSeconds:last.metrics.ScriptDuration-first.metrics.ScriptDuration,workers:last.workers,subtitleWasmHeapBytes:last.state.backend.mpvSubtitles?.heapBytes??null,route:last.state.plan};
      trial.seeks=[];
      for(const target of [10,1]){const began=performance.now();await page.evaluate(target=>player.seek(target),target);trial.seeks.push({target,wallMs:performance.now()-began,position:playerPosition(await sample())});}
      await page.evaluate(()=>player.seek(35));await page.evaluate(()=>player.play());
      await page.waitForFunction(()=>player.state.status==='ended',null,{timeout:12000});trial.eof=await sample();
      await page.evaluate(()=>player.destroy());
      for(let i=0;i<50&&page.workers().length;i++)await sleep(100);
      trial.remainingWorkers=page.workers().map(w=>w.url());
      assert.deepEqual(trial.remainingWorkers,[]);
      trial.passed=true;
    }catch(error){
      trial.error=String(error.stack??error);
      const retryable=(lane==='native-mpv'&&trial.open?.state?.plan==='native-remux-mpv')||/Chrome process set changed at steady sample|RSS missing a Chrome process at steady sample/.test(String(error));
      if(!retryable||retry===3)throw error;
      trial.excludedReason=lane==='native-mpv'&&trial.open?.state?.plan==='native-remux-mpv'?'Automatic route changed to Native Remux':'Chrome process membership changed during steady window';
      await page.evaluate(()=>window.player?.destroy()).catch(()=>{});
    }
    finally{await save();await browser.close();browser=null;}
    accepted=trial.passed;
    }
  }
  for(const [name,digest] of Object.entries(runtime))assert.equal(sha(await readFile(`${assetRoot}/${name}`)),digest,`Runtime changed during campaign: ${name}`);
  report.passed=true;
}catch(error){report.passed=false;report.error=String(error.stack??error);process.exitCode=1;}
finally{await browser?.close().catch(()=>{});await server.close();await save();}
function playerPosition(sample){return sample.state.time;}
