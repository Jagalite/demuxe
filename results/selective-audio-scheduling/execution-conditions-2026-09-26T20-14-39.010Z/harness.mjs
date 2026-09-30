// SPDX-License-Identifier: Apache-2.0
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawn,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {serve} from '../experiments/pipeline-qualification/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from './head-to-head/benchmark-browser.mjs';
const out=path.resolve(process.env.OUT??`results/selective-audio-scheduling/execution-conditions-${new Date().toISOString().replaceAll(':','-')}`);
await mkdir(out,{recursive:false});
const fixture='build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01/fixtures/hevc10-ac3/index.mkv';
const files=['web/generated/internal/native-mpv-audio.js','web/filter-retained-engine-worker.js'];
const bodies={baseline:{},patched:{}},hashes={baseline:{},patched:{}};
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const file of files){bodies.baseline[file]=execFileSync('git',['show','HEAD:'+file]);bodies.patched[file]=await readFile(file);for(const lane of Object.keys(bodies)){hashes[lane][file]=hash(bodies[lane][file]);await writeFile(path.join(out,lane+'-'+path.basename(file)),bodies[lane][file]);}}
const result={purpose:'Patched HEVC10 AC3: idle / external single-thread load / idle; scheduling sensitivity, not pinned cores or energy savings',head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),fixture,fixtureSHA256:hash(await readFile(fixture)),hashes,trials:[]};
await writeFile(out+'/harness.mjs',await readFile(new URL(import.meta.url)));
await writeFile(out+'/patch.diff',execFileSync('git',['diff','--',...files]));
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2));
const server=await serve({mediaPaths:{movie:fixture}});let browser;
try{
 console.log('Waiting for Chrome startup task (150 seconds; tracing ends before CPU measurement).');
 const launch=await launchBenchmarkChrome({headless:false,startupGate:true});browser=launch.browser;result.browser=launch.identity;await save();console.log('Startup gate passed');
 const cdp=await browser.newBrowserCDPSession();
 for(const condition of ['idle-before','external-load','idle-after']){
  const lane='patched';let load,loadDone;const loadOutput=[];
  const served=[];
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(60000);
  try{
   for(const file of files)await context.route('**/'+file+'*',route=>{served.push({file,url:route.request().url(),hash:hashes[lane][file]});return route.fulfill({status:200,contentType:'text/javascript',headers:{'Cross-Origin-Embedder-Policy':'require-corp','Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin'},body:bodies[lane][file]});});
   await page.goto(server.origin+'/experiment/page.html');await page.bringToFront();
   await page.evaluate(async()=>{
    const {Player}=await import('/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));window.failures=[];player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));
    await player.open({url:'/media/movie',format:'file'});await player.play();await player.pause();await player.seek(3);await player.play();
   });
   if(condition==='external-load'){
    load=spawn(process.execPath,['-e',`const start=performance.now(),cpu=process.cpuUsage();let x=1;console.log('ready');while(performance.now()-start<20000){for(let i=0;i<100000;i++)x=Math.imul(x^i,1664525)+1013904223|0;}console.log(JSON.stringify({x,wall:performance.now()-start,cpu:process.cpuUsage(cpu)}));`],{stdio:['ignore','pipe','pipe']});
    loadDone=new Promise((resolve,reject)=>{load.once('exit',resolve);load.once('error',reject);});load.stdout.on('data',b=>loadOutput.push(String(b)));load.stderr.on('data',b=>loadOutput.push(String(b)));
   }
   await delay(5000);
   const snapshot=()=>page.evaluate(()=>{const b=player.current.backend,a=b.mpvAudio,v=b.video,q=v.getVideoPlaybackQuality();return {plan:player.diagnostics.plan.id,position:player.state.currentTime,total:q.totalVideoFrames,dropped:q.droppedVideoFrames,visible:document.visibilityState,focused:document.hasFocus(),paused:v.paused,errors:failures,audio:{underruns:a.diagnostics.preEofUnderruns,error:a.diagnostics.errorMs,softCorrections:a.diagnostics.softCorrections,frames:Atomics.load(a.engine.audioHeader,5),videoTracks:a.diagnostics.mpvVideoTracks,pumpTicks:a.engine.diagnostics.pumpTicks},sampleRate:a.engine.audioContext.sampleRate,width:v.videoWidth,height:v.videoHeight};});
   const pids=(await cdp.send('SystemInfo.getProcessInfo')).processInfo.map(p=>p.id),counters=()=>JSON.parse(execFileSync('python3',['tests/audio-process-counters.py',...pids.map(String)],{encoding:'utf8'}));
   const nativeBefore=counters(),samples=await collectCpuWindow(cdp,snapshot,{seconds:10}),nativeAfter=counters(),cpu=summarizeCpu(samples);
   const first=samples[0].state,last=samples.at(-1).state;
   const trial={lane:condition,code:lane,externalLoad:loadOutput,served,cpu,nativeBefore,nativeAfter,samples,errors,frames:last.total-first.total,drops:last.dropped-first.dropped};
   trial.accepted=files.every(file=>served.some(s=>s.file===file))&&cpu.processIdsStable&&trial.frames>=29*cpu.wallSeconds&&trial.drops===0&&!errors.length&&samples.every(s=>s.state.plan==='native-video-mpv-audio'&&s.state.audio.videoTracks===0&&s.state.focused&&s.state.visible==='visible'&&!s.state.paused&&!s.state.errors.length)&&last.audio.underruns===first.audio.underruns&&Math.abs(last.audio.error)<100&&last.audio.frames>first.audio.frames;
   if(loadDone)await loadDone;result.trials.push(trial);await save();console.log(JSON.stringify({condition,cpu:cpu.oneCorePercent,accepted:trial.accepted,frames:trial.frames,drops:trial.drops,ticks:last.audio.pumpTicks-first.audio.pumpTicks}));
  }finally{if(load&&load.exitCode===null){load.kill();await loadDone.catch(()=>{});}await context.close();await delay(condition==='external-load'?10000:2000);}
 }
 assert.ok(result.trials.every(t=>t.accepted),'Rejected CPU window');
}catch(error){result.error=String(error.stack);await save();throw error;}finally{await browser?.close();await server.close();}
console.log('Evidence:',out);
