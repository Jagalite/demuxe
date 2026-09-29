// SPDX-License-Identifier: Apache-2.0
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from './head-to-head/benchmark-browser.mjs';
const out=path.resolve(process.env.OUT??`results/selective-audio-scheduling/overhead-cost-${new Date().toISOString().replaceAll(':','-')}`);
await mkdir(out,{recursive:false});
const fixture='build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures/hevc10-ac3/index.mkv';
const file='web/filter-retained-engine-worker.js';
const original=await readFile(file,'utf8');
const body=original.replace('if(performance.now()>=nextDiagnostics){nextDiagnostics=performance.now()+200;', 'if(!globalThis.disableDiagnosticPush&&performance.now()>=nextDiagnostics){nextDiagnostics=performance.now()+200;');
assert.notEqual(body,original);
const hash=b=>createHash('sha256').update(b).digest('hex');
const result={purpose:'Screen latency polling and worker diagnostic message overhead independently; bracketing baseline, identical PCM pumping and sync',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),fixture,fixtureSHA256:hash(await readFile(fixture)),workerSHA256:hash(body),trials:[]};
await writeFile(out+'/harness.mjs',await readFile(new URL(import.meta.url)));await writeFile(out+'/worker.js',body);await writeFile(out+'/patch.diff',execFileSync('git',['diff']));
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2));
const server=await serve({mediaPaths:{movie:fixture}});let browser;
try{
 console.log('Waiting for Chrome startup task (150 seconds; tracing ends before CPU measurement).');
 const launch=await launchBenchmarkChrome({headless:false,startupGate:true});browser=launch.browser;result.browser=launch.identity;await save();console.log('Startup gate passed');
 const cdp=await browser.newBrowserCDPSession();
 for(const lane of ['baseline','no-latency-timer','no-diagnostic-push','baseline']){
  const served=[];
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(60000);
  try{
   await context.route('**/'+file+'*',route=>{served.push({file,url:route.request().url()});return route.fulfill({status:200,contentType:'text/javascript',headers:{'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin'},body});});
   await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();
   await page.evaluate(async()=>{
    const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));window.failures=[];player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));
    await player.open({url:'/media/movie',format:'file'});await player.play();await player.pause();await player.seek(3);await player.play();
   });
   const worker=page.workers().find(w=>w.url().includes('filter-retained-engine-worker'));
   assert.ok(worker);await worker.evaluate(off=>{globalThis.disableDiagnosticPush=off;},lane==='no-diagnostic-push');
   await page.evaluate(lane=>{const e=player.current.backend.mpvAudio.engine;window.overhead={timingCalls:0,diagnostics:0};const timing=e.sendTiming.bind(e);e.sendTiming=(...args)=>{overhead.timingCalls++;return timing(...args);};const recv=e.worker.onmessage;e.worker.onmessage=ev=>{if(ev.data.type==='diagnostics')overhead.diagnostics++;return recv(ev);};if(lane==='no-latency-timer'){clearInterval(e.timing);e.timing=undefined;}},lane);
   await delay(5000);
   const snapshot=()=>page.evaluate(()=>{const b=player.current.backend,a=b.mpvAudio,v=b.video,q=v.getVideoPlaybackQuality();return {overhead:{...overhead},latency:[a.engine.audioContext.baseLatency,a.engine.audioContext.outputLatency],plan:player.diagnostics.plan.id,position:player.state.currentTime,total:q.totalVideoFrames,dropped:q.droppedVideoFrames,visible:document.visibilityState,focused:document.hasFocus(),paused:v.paused,errors:failures,audio:{underruns:a.diagnostics.preEofUnderruns,error:a.diagnostics.errorMs,softCorrections:a.diagnostics.softCorrections,frames:Atomics.load(a.engine.audioHeader,5),videoTracks:a.diagnostics.mpvVideoTracks,pumpTicks:a.engine.diagnostics.pumpTicks},sampleRate:a.engine.audioContext.sampleRate,width:v.videoWidth,height:v.videoHeight};});
   const pids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id),counters=()=>JSON.parse(execFileSync('python3',['tests/audio-process-counters.py',...pids.map(String)],{encoding:'utf8'}));
   const nativeBefore=counters(),samples=await collectCpuWindow(cdp,snapshot,{seconds:10}),nativeAfter=counters(),cpu=summarizeCpu(samples);
   const first=samples[0].state,last=samples.at(-1).state;
   const trial={lane,served,cpu,nativeBefore,nativeAfter,samples,errors,frames:last.total-first.total,drops:last.dropped-first.dropped};
   trial.accepted=served.length>0&&JSON.stringify(first.latency)===JSON.stringify(last.latency)&&(lane!=='no-latency-timer'||last.overhead.timingCalls===first.overhead.timingCalls)&&(lane!=='no-diagnostic-push'||last.overhead.diagnostics===first.overhead.diagnostics)&&cpu.processIdsStable&&trial.frames>=29*cpu.wallSeconds&&trial.drops===0&&!errors.length&&samples.every(s=>s.state.plan==='native-video-mpv-audio'&&s.state.audio.videoTracks===0&&s.state.focused&&s.state.visible==='visible'&&!s.state.paused&&!s.state.errors.length)&&last.audio.underruns===first.audio.underruns&&Math.abs(last.audio.error)<100&&last.audio.frames>first.audio.frames;
   result.trials.push(trial);await save();console.log(JSON.stringify({lane,cpu:cpu.oneCorePercent,accepted:trial.accepted,frames:trial.frames,drops:trial.drops,timingCalls:last.overhead.timingCalls-first.overhead.timingCalls,diagnostics:last.overhead.diagnostics-first.overhead.diagnostics}));
  }finally{await context.close();await delay(2000);}
 }
 assert.ok(result.trials.every(t=>t.accepted),'Rejected CPU window');
}catch(error){result.error=String(error.stack);await save();throw error;}finally{await browser?.close();await server.close();}
console.log('Evidence:',out);
