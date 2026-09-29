// SPDX-License-Identifier: Apache-2.0
// Test-only component isolation; synthetic output is not a production route.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {attachScheduledPCM} from './scheduled-pcm-prototype.mjs';
import {installAudioProbe} from './native-url-audio-probe.mjs';
import {markedAudio} from './head-to-head/checks.mjs';
import assert from 'node:assert/strict';
import {serve} from './head-to-head/server.mjs';
import {launchBenchmarkChrome,collectCpuWindow,summarizeCpu,delay} from './head-to-head/benchmark-browser.mjs';
const out=path.resolve(process.env.OUT??'results/hevc-scheduled-pcm/check-20260926-01');await mkdir(out,{recursive:false});
await writeFile(out+'/scheduled-pcm.mjs',await readFile(new URL('./scheduled-pcm-prototype.mjs',import.meta.url)));
const assets=path.resolve('build/head-to-head/assets-hevc10-ac3-bafdb3f3-20260926-01');
await writeFile(out+'/page.html','<style>body{margin:0;background:black}#surface{position:relative;width:960px;height:540px}video{width:100%;height:100%;object-fit:contain}</style><div id="surface"></div>');
const server=await serve(assets,out,out+'/requests.jsonl');
const result={purpose:'Real mpv PCM through scheduled native AudioBufferSource nodes versus selective AudioWorklet; same source position; no profiler; steady 1x only',trials:[]};
const save=()=>writeFile(out+'/result.json',JSON.stringify(result,null,2));
let browser;
try{
 console.log('STARTUP_GATE');const launch=await launchBenchmarkChrome({headless:false,startupGate:!process.env.CHECK_ONLY});browser=launch.browser;result.browser=launch.identity;await save();console.log('GATE_COMPLETE');
 const cdp=await browser.newBrowserCDPSession();
 for(const lane of (process.env.CHECK_ONLY?['scheduled']:['full','scheduled'])){
  const context=await browser.newContext({viewport:{width:960,height:540}}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(60000);
  try{
   if(process.env.CHECK_ONLY)await page.addInitScript(installAudioProbe);
   await page.goto(server.origin+'/harness/page.html');await page.bringToFront();
   await page.evaluate(async lane=>{
    const {Player}=await import('/demuxe/web/generated/index.js');window.player=new Player(document.querySelector('#surface'));window.failures=[];
    player.addEventListener('error',e=>failures.push(String(e.detail?.message??e.detail)));
    await player.open({url:'/fixtures/hevc10-ac3/index.mkv',format:'file'});await player.play();
    const b=player.current.backend,a=b.mpvAudio,e=a.engine;window.video=b.video;
    if(lane==='full'){await player.pause();await player.seek(3);await player.play();}
    if(lane==='scheduled'){await player.pause();await player.seek(3);const {attachScheduledPCM}=await import('/harness/scheduled-pcm.mjs');window.scheduled=await attachScheduledPCM(player);await player.play();}
    if(lane==='synthetic-pcm'){
     e.worker.terminate();e.workerOwner.remove();
     const source=`onmessage=({data:{buffer,sampleRate}})=>{const h=new Int32Array(buffer,0,16),pcm=new Float32Array(buffer,64,8192*2),meta=new Float64Array(buffer,64+8192*8,8192*2);let written=Atomics.load(h,0)>>>0,pts=meta[((written-1)%8192)*2]+1/sampleRate;const origin=pts,start=written;const fill=()=>{const read=Atomics.load(h,1)>>>0,room=8192-((written-read)>>>0);for(let i=0;i<room;i++){const t=origin+(written-start)/sampleRate,index=written%8192;pcm[index*2]=.125*Math.sin(t*440*2*Math.PI);pcm[index*2+1]=.125*Math.sin(t*880*2*Math.PI);meta[index*2]=t;meta[index*2+1]=1;written++;}Atomics.store(h,0,written);};fill();setInterval(fill,10);postMessage('ready');};`;
     window.producer=new Worker(URL.createObjectURL(new Blob([source],{type:'text/javascript'})));
     const ready=new Promise(r=>producer.onmessage=r);producer.postMessage({buffer:e.audioHeader.buffer,sampleRate:e.audioContext.sampleRate});await ready;
    }else if(lane==='video-only'){await a.destroy();b.mpvAudio=undefined;}
    window.lane=lane;
   },lane);
   await delay(5000);
   const snapshot=()=>page.evaluate(()=>{const b=player.current.backend,a=b.mpvAudio,q=video.getVideoPlaybackQuality();return {lane,scheduled:window.scheduled?.stats,position:video.currentTime,total:q.totalVideoFrames,dropped:q.droppedVideoFrames,visible:document.visibilityState,focused:document.hasFocus(),paused:video.paused,errors:failures,audio:a?{underruns:a.diagnostics.preEofUnderruns,error:a.diagnostics.errorMs,softCorrections:a.diagnostics.softCorrections,frames:Atomics.load(a.engine.audioHeader,5),videoTracks:a.diagnostics.mpvVideoTracks}:null};});
   if(process.env.CHECK_ONLY){const state=await snapshot(),audio=await page.evaluate(()=>urlAudioProbe.sample());assert.ok(markedAudio({audio}),'stereo markers');assert.deepEqual(state.scheduled.errors,[]);assert.ok(Math.abs(state.audio.error)<50);await delay(4000);const later=await snapshot();assert.deepEqual(later.scheduled.errors,[]);assert.ok(later.scheduled.consumed>state.scheduled.consumed);result.correctness={state,later,audio};console.log('CORRECT',JSON.stringify({sync:later.audio.error,stats:later.scheduled}));await save();continue;}
   const samples=await collectCpuWindow(cdp,snapshot,{seconds:12});const cpu=summarizeCpu(samples);const first=samples[0].state,last=samples.at(-1).state;
   const trial={lane,cpu,samples,errors,frames:last.total-first.total,drops:last.dropped-first.dropped};result.trials.push(trial);
   trial.accepted=(!last.scheduled||!last.scheduled.errors.length&&last.scheduled.underruns===0&&last.scheduled.maxAbsSyncMs<50)&&cpu.processIdsStable&&trial.frames>=29*cpu.wallSeconds&&trial.drops===0&&samples.every(s=>s.state.focused&&s.state.visible==='visible'&&!s.state.paused&&!s.state.errors.length)&&!errors.length&&(!last.audio||last.audio.underruns===first.audio.underruns&&Math.abs(last.audio.error)<100&&last.audio.frames>first.audio.frames);
   console.log('TRIAL',lane,JSON.stringify({cpu:cpu.oneCorePercent,roles:cpu.roles,accepted:trial.accepted,frames:trial.frames,drops:trial.drops}));await save();
  }finally{await context.close();}
 }
}catch(e){result.error=String(e.stack);await save();throw e;}finally{await browser?.close();await server.close();}
